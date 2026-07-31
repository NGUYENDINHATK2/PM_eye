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

// re-export for convenience
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
  /** Service role — dùng khi cần đọc lương / bypass column grants */
  admin: ReturnType<typeof createAdminClient>;
};

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

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        error: "misconfigured",
        message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server.",
      },
      { status: 500 }
    );
  }

  const { data: profileRow } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileRow as Profile | null;
  if (!profile || !profile.is_active) {
    return NextResponse.json(
      {
        error: "forbidden",
        message: "Tài khoản chưa có profile hoặc đã bị vô hiệu.",
      },
      { status: 403 }
    );
  }

  const role = roleFromUser(user, profile.app_role);
  if (!role) {
    return NextResponse.json(
      {
        error: "forbidden",
        message: "Tài khoản chưa được gán quyền (app_role).",
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

/** @deprecated — dùng requireRole('admin') */
export async function requireApiAdmin(): Promise<
  AuthedContext | NextResponse
> {
  return requireRole("admin");
}

/** Legacy helper — JWT / ADMIN_EMAILS */
export function isAppAdmin(user: User | null | undefined): boolean {
  return roleFromUser(user) === "admin";
}

export const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, must-revalidate",
};
