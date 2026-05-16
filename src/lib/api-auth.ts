import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

/**
 * Danh sách email admin. Lấy từ env var ADMIN_EMAILS (CSV).
 * Trên Supabase, có thể set thêm `app_metadata.role = 'admin'` trên auth.users.
 */
function adminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAppAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  // 1. Email allowlist (đơn giản, không cần touch DB)
  if (user.email && adminEmailSet().has(user.email.toLowerCase())) return true;
  // 2. Supabase app_metadata.role === 'admin' (set qua dashboard)
  const meta = user.app_metadata as { role?: string } | undefined;
  if (meta?.role === "admin") return true;
  return false;
}

export type AuthedContext = {
  user: User;
  isAdmin: boolean;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Lấy session cho API route. Trả về 401 JSON nếu chưa đăng nhập.
 * Không bao giờ redirect — route handler quyết định body & status.
 */
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
  return { user, isAdmin: isAppAdmin(user), supabase };
}

/**
 * Convenience: yêu cầu admin. Trả về 401 / 403 JSON nếu không đủ quyền.
 */
export async function requireApiAdmin(): Promise<
  AuthedContext | NextResponse
> {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;
  if (!ctx.isAdmin) {
    return NextResponse.json(
      {
        error: "forbidden",
        message: "Endpoint này chỉ dành cho admin.",
      },
      { status: 403 }
    );
  }
  return ctx;
}

/** Default cache headers cho mọi API response chứa dữ liệu nội bộ. */
export const PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store, must-revalidate",
};
