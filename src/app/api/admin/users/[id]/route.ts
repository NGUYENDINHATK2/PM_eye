import { PRIVATE_CACHE_HEADERS, requireRole } from "@/lib/api-auth";
import {
  clampPower,
  defaultPowerForLevel,
  isDevLevel,
} from "@/lib/levels";
import { isAppRole } from "@/lib/rbac";
import type { AppRole, DevLevel } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PatchBody = {
  full_name?: string;
  job_role?: string;
  app_role?: AppRole;
  level?: DevLevel;
  power_score?: number;
  is_active?: boolean;
  base_salary?: number;
  password?: string;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole("admin");
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const body = (await req.json()) as PatchBody;

  if (body.app_role !== undefined && !isAppRole(body.app_role)) {
    return NextResponse.json(
      { error: "bad_request", message: "app_role không hợp lệ." },
      { status: 400 }
    );
  }

  const authPatch: {
    app_metadata?: { role: AppRole };
    password?: string;
    ban_duration?: string;
  } = {};

  if (body.app_role) {
    authPatch.app_metadata = { role: body.app_role };
  }
  if (body.password && body.password.length >= 6) {
    authPatch.password = body.password;
  }
  if (body.is_active === false) {
    authPatch.ban_duration = "876000h"; // ~100 years
  }
  if (body.is_active === true) {
    authPatch.ban_duration = "none";
  }

  if (Object.keys(authPatch).length > 0) {
    const { error: authErr } = await ctx.admin.auth.admin.updateUserById(
      id,
      authPatch
    );
    if (authErr) {
      return NextResponse.json(
        { error: "auth_error", message: authErr.message },
        { status: 400 }
      );
    }
  }

  const profilePatch: Record<string, unknown> = {};
  if (body.full_name !== undefined) profilePatch.full_name = body.full_name;
  if (body.job_role !== undefined) profilePatch.job_role = body.job_role;
  if (body.app_role !== undefined) profilePatch.app_role = body.app_role;
  if (body.is_active !== undefined) profilePatch.is_active = body.is_active;
  if (body.base_salary !== undefined) profilePatch.base_salary = body.base_salary;
  if (body.level !== undefined) {
    if (!isDevLevel(body.level)) {
      return NextResponse.json(
        { error: "bad_request", message: "level không hợp lệ." },
        { status: 400 }
      );
    }
    profilePatch.level = body.level;
    if (body.power_score === undefined) {
      profilePatch.power_score = defaultPowerForLevel(body.level);
    }
  }
  if (body.power_score !== undefined) {
    profilePatch.power_score = clampPower(Number(body.power_score));
  }

  if (Object.keys(profilePatch).length > 0) {
    const { data, error } = await ctx.admin
      .from("profiles")
      .update(profilePatch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      return NextResponse.json(
        { error: "db_error", message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { user: data },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  }

  return NextResponse.json({ ok: true }, { headers: PRIVATE_CACHE_HEADERS });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole("admin");
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  if (id === ctx.user.id) {
    return NextResponse.json(
      { error: "bad_request", message: "Không thể xóa chính mình." },
      { status: 400 }
    );
  }

  const { error } = await ctx.admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json(
      { error: "auth_error", message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true }, { headers: PRIVATE_CACHE_HEADERS });
}
