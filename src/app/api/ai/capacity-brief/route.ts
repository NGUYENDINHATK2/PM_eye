import { PRIVATE_CACHE_HEADERS, requireRole } from "@/lib/api-auth";
import {
  CAPACITY_BRIEF_SYSTEM,
  buildCapacityBriefContext,
} from "@/lib/ai/capacity-context";
import {
  deepseekChat,
  isDeepSeekConfigured,
  parseAiJson,
} from "@/lib/ai/deepseek";
import { normalizeAiCoach } from "@/lib/ai/types";
import type { Allocation, Profile, Project } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
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

  const [profilesRes, allocRes, projectsRes] = await Promise.all([
    ctx.admin.from("profiles").select("*").eq("is_active", true),
    ctx.admin.from("allocations").select("*"),
    ctx.admin.from("projects").select("*"),
  ]);

  if (profilesRes.error || allocRes.error || projectsRes.error) {
    return NextResponse.json(
      {
        error: "db_error",
        message:
          profilesRes.error?.message ??
          allocRes.error?.message ??
          projectsRes.error?.message,
      },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  let profiles = (profilesRes.data ?? []).map((p) => ({
    ...(p as Profile),
    base_salary: 0,
  }));
  let allocations = (allocRes.data ?? []) as Allocation[];
  let projects = (projectsRes.data ?? []) as Project[];

  // PM: chỉ thấy người / dự án liên quan
  if (ctx.role === "pm") {
    projects = projects.filter((p) => p.manager_id === ctx.user.id);
    const pids = new Set(projects.map((p) => p.id));
    allocations = allocations.filter((a) => pids.has(a.project_id));
    const uids = new Set(allocations.map((a) => a.user_id));
    uids.add(ctx.user.id);
    profiles = profiles.filter((p) => uids.has(p.id));
  }

  const context = buildCapacityBriefContext({
    profiles,
    allocations,
    projects,
  });

  try {
    const raw = await deepseekChat({
      json: true,
      temperature: 0.3,
      maxTokens: 1400,
      messages: [
        { role: "system", content: CAPACITY_BRIEF_SYSTEM },
        {
          role: "user",
          content: `Phân tích capacity và trả JSON:\n${JSON.stringify(context)}`,
        },
      ],
    });

    const result = normalizeAiCoach(parseAiJson(raw));
    return NextResponse.json(
      { result, meta: { totals: context.totals } },
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
