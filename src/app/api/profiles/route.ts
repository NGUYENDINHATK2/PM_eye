import {
  PRIVATE_CACHE_HEADERS,
  requireApiUser,
  requireRole,
} from "@/lib/api-auth";
import {
  clampPower,
  defaultPowerForLevel,
  isDevLevel,
} from "@/lib/levels";
import { canViewSalary, stripProfileSalary } from "@/lib/rbac";
import { scopeProfiles } from "@/lib/scope-query";
import type { Allocation, Profile, Project } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/profiles — scoped theo role + strip lương */
export async function GET() {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;

  const [profilesRes, allocRes, projectsRes] = await Promise.all([
    ctx.admin.from("profiles").select("*").order("created_at", { ascending: false }),
    ctx.admin.from("allocations").select("*"),
    ctx.admin.from("projects").select("*"),
  ]);

  if (profilesRes.error) {
    return NextResponse.json(
      { error: "db_error", message: profilesRes.error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  const scoped = scopeProfiles(
    (profilesRes.data ?? []) as Profile[],
    ctx.role,
    ctx.user.id,
    (allocRes.data ?? []) as Allocation[],
    (projectsRes.data ?? []) as Project[]
  ).map((p) => stripProfileSalary(p, ctx.role));

  return NextResponse.json(scoped, { headers: PRIVATE_CACHE_HEADERS });
}

/** PATCH — manager sửa hồ sơ; chỉ admin sửa lương / app_role */
export async function PATCH(req: Request) {
  const ctx = await requireRole(["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = (await req.json()) as Partial<Profile> & { id: string };
  if (!body.id) {
    return NextResponse.json(
      { error: "bad_request", message: "Thiếu id." },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.full_name !== undefined) patch.full_name = body.full_name;
  if (body.email !== undefined) patch.email = body.email;
  if (body.job_role !== undefined) patch.job_role = body.job_role;
  if (body.start_date !== undefined) patch.start_date = body.start_date;
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  if (body.avatar_url !== undefined) patch.avatar_url = body.avatar_url;

  if (body.level !== undefined) {
    if (!isDevLevel(body.level)) {
      return NextResponse.json(
        { error: "bad_request", message: "level không hợp lệ." },
        { status: 400 }
      );
    }
    patch.level = body.level;
    // Nếu không gửi power_score riêng → gợi ý theo level
    if (body.power_score === undefined) {
      patch.power_score = defaultPowerForLevel(body.level);
    }
  }
  if (body.power_score !== undefined) {
    patch.power_score = clampPower(Number(body.power_score));
  }

  if (body.base_salary !== undefined) {
    if (!canViewSalary(ctx.role)) {
      return NextResponse.json(
        { error: "forbidden", message: "Chỉ admin được sửa lương." },
        { status: 403 }
      );
    }
    patch.base_salary = body.base_salary;
  }

  if (body.app_role !== undefined) {
    if (ctx.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "Chỉ admin được đổi app_role." },
        { status: 403 }
      );
    }
    patch.app_role = body.app_role;
  }

  const { data, error } = await ctx.admin
    .from("profiles")
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

  return NextResponse.json(stripProfileSalary(data as Profile, ctx.role), {
    headers: PRIVATE_CACHE_HEADERS,
  });
}
