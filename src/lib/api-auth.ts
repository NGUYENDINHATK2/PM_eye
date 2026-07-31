import {
  canViewMoney,
  canViewSalary,
  isAppRole,
  roleFromUser,
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

async function loadProfile(
  admin: ReturnType<typeof createAdminClient>,
  userClient: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ profile: Profile | null; err?: string }> {
  // 1) service role
  const byAdmin = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (byAdmin.data) {
    return { profile: byAdmin.data as Profile };
  }

  // 2) RPC security definer (không phụ thuộc column GRANT)
  const rpc = await userClient.rpc("get_my_profile");
  if (rpc.data && typeof rpc.data === "object") {
    return { profile: rpc.data as Profile };
  }

  // 3) select trực tiếp (policy id = auth.uid())
  const byUser = await userClient
    .from("profiles")
    .select(
      "id, full_name, email, job_role, app_role, start_date, is_active, avatar_url, created_at"
    )
    .eq("id", userId)
    .maybeSingle();
  if (byUser.data) {
    return {
      profile: { ...(byUser.data as Profile), base_salary: 0 },
    };
  }

  const err =
    byAdmin.error?.message ||
    rpc.error?.message ||
    byUser.error?.message ||
    undefined;
  return { profile: null, err };
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

  let { profile, err: loadErr } = await loadProfile(admin, supabase, user.id);

  if (!profile) {
    // Auto-provision nếu suy được role / user đầu tiên
    let bootstrapRole = roleFromUser(user, null);
    if (!bootstrapRole) {
      const { count } = await admin
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if ((count ?? 0) === 0) bootstrapRole = "admin";
    }
    // Hard fallback: nếu ADMIN_EMAILS khớp hoặc email đã biết là admin seed
    if (!bootstrapRole && user.email) {
      const allow = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (allow.includes(user.email.toLowerCase())) bootstrapRole = "admin";
    }

    if (bootstrapRole) {
      const fullName =
        (user.user_metadata as { full_name?: string } | undefined)?.full_name ||
        user.email?.split("@")[0] ||
        "Admin";

      const { data: created, error: createErr } = await admin
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? null,
            full_name: fullName,
            job_role: "BU Lead",
            app_role: bootstrapRole,
            base_salary: 0,
            is_active: true,
          },
          { onConflict: "id" }
        )
        .select("*")
        .single();

      if (!createErr && created) {
        profile = created as Profile;
        await admin.auth.admin.updateUserById(user.id, {
          app_metadata: { ...(user.app_metadata ?? {}), role: bootstrapRole },
        });
      } else {
        return NextResponse.json(
          {
            error: "db_error",
            message:
              "Không tạo/đọc được profile. Chạy supabase/fix_403_profile.sql trên SQL Editor. " +
              (createErr?.message || loadErr || ""),
            debug: { userId: user.id, email: user.email },
          },
          { status: 500 }
        );
      }
    }
  }

  if (!profile) {
    return NextResponse.json(
      {
        error: "forbidden",
        message:
          "Chưa đọc được profile. Chạy fix_403_profile.sql trên Supabase, set ADMIN_EMAILS đúng email login, Redeploy Vercel, rồi logout/login.",
        debug: {
          userId: user.id,
          email: user.email,
          loadErr: loadErr ?? null,
          jwtRole: (user.app_metadata as { role?: string } | undefined)?.role ?? null,
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

  const role = roleFromUser(user, profile.app_role);
  if (!role) {
    // Profile có app_role trong DB nhưng JWT/allowlist miss — tin profile
    if (isAppRole(profile.app_role)) {
      return {
        user,
        role: profile.app_role,
        profile,
        isAdmin: profile.app_role === "admin",
        supabase,
        admin,
      };
    }
    return NextResponse.json(
      {
        error: "forbidden",
        message: "Tài khoản chưa được gán quyền (app_role).",
        debug: { profileAppRole: profile.app_role },
      },
      { status: 403 }
    );
  }

  return {
    user,
    role,
    profile: { ...profile, app_role: role },
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
