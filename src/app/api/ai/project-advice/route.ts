import { PRIVATE_CACHE_HEADERS, requireRole } from "@/lib/api-auth";
import {
  deepseekChat,
  isDeepSeekConfigured,
  parseAiJson,
} from "@/lib/ai/deepseek";
import {
  PROJECT_ADVICE_SYSTEM,
  buildProjectAdviceContext,
} from "@/lib/ai/project-context";
import { normalizeAiCoach } from "@/lib/ai/types";
import type {
  Allocation,
  Profile,
  Project,
  ProjectPhase,
} from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ctx = await requireRole(["admin", "manager", "pm"]);
  if (ctx instanceof NextResponse) return ctx;

  if (!isDeepSeekConfigured()) {
    return NextResponse.json(
      {
        error: "not_configured",
        message:
          "Chưa có DEEPSEEK_API_KEY. Thêm vào .env.local hoặc Vercel env rồi redeploy.",
      },
      { status: 503, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { projectId?: string };
  const projectId = body.projectId?.trim();
  if (!projectId) {
    return NextResponse.json(
      { error: "bad_request", message: "Thiếu projectId." },
      { status: 400 }
    );
  }

  const [projRes, phasesRes, allocRes, profilesRes] = await Promise.all([
    ctx.admin.from("projects").select("*").eq("id", projectId).maybeSingle(),
    ctx.admin.from("project_phases").select("*").eq("project_id", projectId),
    ctx.admin.from("allocations").select("*"),
    ctx.admin.from("profiles").select("*").eq("is_active", true),
  ]);

  if (projRes.error || !projRes.data) {
    return NextResponse.json(
      { error: "not_found", message: "Không tìm thấy dự án." },
      { status: 404 }
    );
  }

  const project = projRes.data as Project;
  if (ctx.role === "pm" && project.manager_id !== ctx.user.id) {
    return NextResponse.json(
      { error: "forbidden", message: "Bạn không phụ trách dự án này." },
      { status: 403 }
    );
  }

  const allAllocations = (allocRes.data ?? []) as Allocation[];
  const allocations = allAllocations.filter((a) => a.project_id === projectId);
  const phases = (phasesRes.data ?? []) as ProjectPhase[];
  const profiles = (profilesRes.data ?? []).map((p) => ({
    ...(p as Profile),
    base_salary: 0,
  }));

  const context = buildProjectAdviceContext({
    project,
    phases,
    allocations,
    allAllocations,
    profiles,
  });

  try {
    const raw = await deepseekChat({
      json: true,
      temperature: 0.3,
      maxTokens: 1600,
      messages: [
        { role: "system", content: PROJECT_ADVICE_SYSTEM },
        {
          role: "user",
          content: `Phân tích và trả JSON:\n${JSON.stringify(context)}`,
        },
      ],
    });

    const result = normalizeAiCoach(parseAiJson(raw));

    return NextResponse.json(
      { result, meta: { verdict: context.force_fit.verdict } },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: "ai_error",
        message: e instanceof Error ? e.message : "AI lỗi không xác định",
      },
      { status: 502, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}
