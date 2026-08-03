import { PRIVATE_CACHE_HEADERS, requireRole } from "@/lib/api-auth";
import type { ProjectRisk, RiskKind, RiskSeverity, RiskStatus } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await requireRole(["admin", "manager", "pm", "member"]);
  if (ctx instanceof NextResponse) return ctx;

  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "bad_request", message: "Thiếu projectId" },
      { status: 400 }
    );
  }

  const { data, error } = await ctx.admin
    .from("project_risks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    const missing = /relation .*project_risks.* does not exist|could not find the table/i.test(
      error.message
    );
    if (missing) {
      return NextResponse.json(
        { risks: [] as ProjectRisk[], missingTable: true },
        { headers: PRIVATE_CACHE_HEADERS }
      );
    }
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { risks: (data ?? []) as ProjectRisk[] },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}

export async function POST(req: Request) {
  const ctx = await requireRole(["admin", "manager", "pm"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = (await req.json().catch(() => ({}))) as {
    project_id?: string;
    title?: string;
    kind?: RiskKind;
    severity?: RiskSeverity;
    owner_id?: string | null;
    note?: string | null;
  };

  if (!body.project_id || !body.title?.trim()) {
    return NextResponse.json(
      { error: "bad_request", message: "Thiếu project_id hoặc title" },
      { status: 400 }
    );
  }

  const { data, error } = await ctx.admin
    .from("project_risks")
    .insert({
      project_id: body.project_id,
      title: body.title.trim(),
      kind: body.kind === "blocker" ? "blocker" : "risk",
      severity:
        body.severity === "critical" || body.severity === "info"
          ? body.severity
          : "warn",
      status: "open" satisfies RiskStatus,
      owner_id: body.owner_id || null,
      note: body.note?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { risk: data as ProjectRisk },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}

export async function PATCH(req: Request) {
  const ctx = await requireRole(["admin", "manager", "pm"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: RiskStatus;
    title?: string;
    severity?: RiskSeverity;
    kind?: RiskKind;
    owner_id?: string | null;
    note?: string | null;
  };

  if (!body.id) {
    return NextResponse.json(
      { error: "bad_request", message: "Thiếu id" },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.status === "open" || body.status === "done") patch.status = body.status;
  if (body.title != null) patch.title = body.title.trim();
  if (body.severity) patch.severity = body.severity;
  if (body.kind) patch.kind = body.kind;
  if (body.owner_id !== undefined) patch.owner_id = body.owner_id;
  if (body.note !== undefined) patch.note = body.note;

  const { data, error } = await ctx.admin
    .from("project_risks")
    .update(patch)
    .eq("id", body.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { risk: data as ProjectRisk },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}

export async function DELETE(req: Request) {
  const ctx = await requireRole(["admin", "manager", "pm"]);
  if (ctx instanceof NextResponse) return ctx;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "bad_request", message: "Thiếu id" },
      { status: 400 }
    );
  }

  const { error } = await ctx.admin.from("project_risks").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { headers: PRIVATE_CACHE_HEADERS });
}
