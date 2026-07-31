import { PRIVATE_CACHE_HEADERS, requireRole } from "@/lib/api-auth";
import { APP_ROLES, isAppRole, roleLabel } from "@/lib/rbac";
import type { AppRole, Profile } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/admin/users — danh sách tài khoản + role */
export async function GET() {
  const ctx = await requireRole("admin");
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  const users = ((data ?? []) as Profile[]).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    job_role: p.job_role,
    app_role: p.app_role,
    app_role_label: roleLabel(p.app_role),
    is_active: p.is_active,
    base_salary: p.base_salary,
    start_date: p.start_date,
    created_at: p.created_at,
  }));

  return NextResponse.json(
    { users, roles: APP_ROLES },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}

type CreateBody = {
  email: string;
  password: string;
  full_name: string;
  job_role?: string;
  app_role: AppRole;
  base_salary?: number;
  start_date?: string;
};

/** POST /api/admin/users — tạo auth user + profile + JWT role */
export async function POST(req: Request) {
  const ctx = await requireRole("admin");
  if (ctx instanceof NextResponse) return ctx;

  const body = (await req.json()) as CreateBody;
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const full_name = (body.full_name ?? "").trim();
  const app_role = body.app_role;

  if (!email || !password || password.length < 6 || !full_name) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Cần email, mật khẩu (≥6), họ tên.",
      },
      { status: 400 }
    );
  }
  if (!isAppRole(app_role)) {
    return NextResponse.json(
      { error: "bad_request", message: "app_role không hợp lệ." },
      { status: 400 }
    );
  }

  const { data: created, error: createErr } =
    await ctx.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: app_role },
      user_metadata: {
        full_name,
        job_role: body.job_role ?? "Other",
        base_salary: String(body.base_salary ?? 0),
      },
    });

  if (createErr || !created.user) {
    return NextResponse.json(
      {
        error: "auth_error",
        message: createErr?.message ?? "Không tạo được user.",
      },
      { status: 400 }
    );
  }

  const userId = created.user.id;

  // Trigger có thể đã insert profile — upsert để chắc chắn đúng field
  const { data: profile, error: upsertErr } = await ctx.admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name,
        job_role: body.job_role ?? "Other",
        app_role,
        base_salary: Number(body.base_salary ?? 0),
        start_date: body.start_date ?? new Date().toISOString().slice(0, 10),
        is_active: true,
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (upsertErr) {
    return NextResponse.json(
      {
        error: "db_error",
        message:
          "Đã tạo auth user nhưng không ghi được profile: " + upsertErr.message,
      },
      { status: 500 }
    );
  }

  if (Number(body.base_salary ?? 0) > 0) {
    await ctx.admin.from("salary_history").insert({
      profile_id: userId,
      monthly_amount: Number(body.base_salary),
      effective_from: body.start_date ?? new Date().toISOString().slice(0, 10),
      note: "Mức lương ban đầu",
    });
  }

  return NextResponse.json(
    { user: profile },
    { status: 201, headers: PRIVATE_CACHE_HEADERS }
  );
}
