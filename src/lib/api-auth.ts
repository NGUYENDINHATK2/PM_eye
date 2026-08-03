import {
  canViewMoney,
  canViewSalary,
  isAppRole,
  roleFromUser,
  stripProfileSalary,
} from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type { AppRole };
export {
  canViewMoney,
  canViewSalary,
  roleFromUser,
  isAppRole,
} from "@/lib/rbac";

export type AuthedContext = {
  user: User;
  role: AppRole;
  profile: Profile;
  isAdmin: boolean;
  supabase: Awaited<ReturnType<typeof createClient>>;
  admin: ReturnType<typeof createAdminClient>;
};

function isPlaceholderKey(key: string | undefined): boolean {
  if (!key) return true;
  const k = key.toLowerCase();
  return (
    k.includes("your-") ||
    k.includes("xxx") ||
    k.includes("example") ||
    k.includes("placeholder")
  );
}

function asProfile(data: unknown): Profile | null {
  if (!data || typeof data !== "object") return null;
  const p = data as Partial<Profile>;
  if (typeof p.id !== "string" || !isAppRole(p.app_role)) return null;
  return p as Profile;
}

async function loadProfile(
  admin: ReturnType<typeof createAdminClient>,
  userClient: Awaited<ReturnType<typeof createClient>>,
  user: User
): Promise<{ profile: Profile | null; err?: string; via?: string }> {
  const errors: string[] = [];

  // 1) RPC security definer — không phụ thuộc GRANT trên bảng profiles
  const rpcAdmin = await admin.rpc("get_or_create_profile", {
    p_user_id: user.id,
  });
  const fromRpcAdmin = asProfile(rpcAdmin.data);
  if (fromRpcAdmin) {
    return { profile: fromRpcAdmin, via: "rpc_admin" };
  }
  if (rpcAdmin.error) errors.push(`rpc_admin: ${rpcAdmin.error.message}`);

  const rpcUser = await userClient.rpc("get_or_create_profile", {
    p_user_id: user.id,
  });
  const fromRpcUser = asProfile(rpcUser.data);
  if (fromRpcUser) {
    return { profile: fromRpcUser, via: "rpc_user" };
  }
  if (rpcUser.error) errors.push(`rpc_user: ${rpcUser.error.message}`);

  // 2) service role select *
  const byAdmin = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (byAdmin.data) {
    return { profile: byAdmin.data as Profile, via: "admin_select" };
  }
  if (byAdmin.error) errors.push(`admin_select: ${byAdmin.error.message}`);

  // 3) theo email (phòng id lệch)
  if (user.email) {
    const byEmail = await admin
      .from("profiles")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();
    if (byEmail.data) {
      return { profile: byEmail.data as Profile, via: "admin_email" };
    }
    if (byEmail.error) errors.push(`admin_email: ${byEmail.error.message}`);
  }

  // 4) authenticated select (không lấy base_salary)
  const byUser = await userClient
    .from("profiles")
    .select(
      "id, full_name, email, job_role, app_role, start_date, is_active, avatar_url, created_at"
    )
    .eq("id", user.id)
    .maybeSingle();
  if (byUser.data && isAppRole(byUser.data.app_role)) {
    return {
      profile: { ...(byUser.data as Profile), base_salary: 0 },
      via: "user_select",
    };
  }
  if (byUser.error) errors.push(`user_select: ${byUser.error.message}`);

  return {
    profile: null,
    err: errors.join(" | ") || undefined,
  };
}

export async function requireApiUser(): Promise<
  AuthedContext | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "unauthenticated", message: "Bạn cần đăng nhập." },
      { status: 401 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (isPlaceholderKey(serviceKey)) {
    return NextResponse.json(
      {
        error: "misconfigured",
        message:
          "SUPABASE_SERVICE_ROLE_KEY thiếu hoặc vẫn là placeholder. Set key thật trên Vercel rồi Redeploy.",
      },
      { status: 500 }
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        error: "misconfigured",
        message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server (Vercel env).",
      },
      { status: 500 }
    );
  }

  let { profile, err: loadErr, via } = await loadProfile(admin, supabase, user);

  // Auto-provision qua admin upsert nếu RPC chưa có / thất bại
  if (!profile) {
    let bootstrapRole = roleFromUser(user, null);
    if (!bootstrapRole) {
      const allow = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (user.email && allow.includes(user.email.toLowerCase())) {
        bootstrapRole = "admin";
      }
    }
    // Vẫn chưa có role → mặc định member để không kẹt 403; seed_admin sẽ set admin trong DB
    if (!bootstrapRole) bootstrapRole = "member";

    const fullName =
      (user.user_metadata as { full_name?: string } | undefined)?.full_name ||
      user.email?.split("@")[0] ||
      "User";

    const { data: created, error: createErr } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: fullName,
          job_role: bootstrapRole === "admin" ? "BU Lead" : "Member",
          app_role: bootstrapRole,
          level: "Junior",
          power_score: 50,
          base_salary: 0,
          is_active: true,
        },
        { onConflict: "id" }
      )
      .select(
        "id, full_name, email, job_role, app_role, level, power_score, start_date, is_active, avatar_url, created_at, base_salary"
      )
      .maybeSingle();

    if (!createErr && created) {
      profile = created as Profile;
      via = "upsert";
      if (bootstrapRole === "admin" || isAppRole(created.app_role)) {
        await admin.auth.admin.updateUserById(user.id, {
          app_metadata: {
            ...(user.app_metadata ?? {}),
            role: created.app_role,
          },
        });
      }
    } else {
      return NextResponse.json(
        {
          error: "db_error",
          message:
            "Không đọc/tạo được profile. Chạy lại supabase/seed_admin.sql trên SQL Editor. " +
            (createErr?.message || loadErr || ""),
          debug: {
            userId: user.id,
            email: user.email,
            loadErr: loadErr ?? null,
            createErr: createErr?.message ?? null,
          },
        },
        { status: 500 }
      );
    }
  }

  if (!profile) {
    return NextResponse.json(
      {
        error: "forbidden",
        message:
          "Chưa đọc được profile. Chạy supabase/seed_admin.sql, kiểm tra ADMIN_EMAILS + SUPABASE_SERVICE_ROLE_KEY trên Vercel, Redeploy, logout/login.",
        debug: {
          userId: user.id,
          email: user.email,
          loadErr: loadErr ?? null,
          jwtRole:
            (user.app_metadata as { role?: string } | undefined)?.role ?? null,
          adminEmailsSet: Boolean(process.env.ADMIN_EMAILS?.trim()),
        },
      },
      { status: 403 }
    );
  }

  if (!profile.is_active) {
    return NextResponse.json(
      {
        error: "forbidden",
        message: "Tài khoản đã bị vô hiệu (is_active=false).",
      },
      { status: 403 }
    );
  }

  // Ưu tiên app_role trong DB (đã seed admin)
  const role =
    (isAppRole(profile.app_role) ? profile.app_role : null) ||
    roleFromUser(user, profile.app_role);

  if (!role) {
    return NextResponse.json(
      {
        error: "forbidden",
        message: "Tài khoản chưa được gán quyền (app_role).",
        debug: { profileAppRole: profile.app_role, via: via ?? null },
      },
      { status: 403 }
    );
  }

  const safeProfile = stripProfileSalary(
    { ...profile, app_role: role },
    role
  );

  return {
    user,
    role,
    profile: safeProfile,
    isAdmin: role === "admin",
    supabase,
    admin,
  };
}

export async function requireRole(
  allowed: AppRole | AppRole[]
): Promise<AuthedContext | NextResponse> {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;
  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (!list.includes(ctx.role)) {
    return NextResponse.json(
      {
        error: "forbidden",
        message: "Bạn không có quyền thực hiện thao tác này.",
      },
      { status: 403 }
    );
  }
  return ctx;
}

export async function requireApiAdmin(): Promise<
  AuthedContext | NextResponse
> {
  return requireRole("admin");
}

export function isAppAdmin(user: User | null | undefined): boolean {
  return roleFromUser(user) === "admin";
}

export const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, must-revalidate",
};
