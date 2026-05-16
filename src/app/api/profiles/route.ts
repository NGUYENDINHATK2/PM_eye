import { PRIVATE_CACHE_HEADERS, requireApiUser } from "@/lib/api-auth";
import type { Profile } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/profiles
 * Trả danh sách nhân sự. Với non-admin: redact `base_salary` (set = 0).
 */
export async function GET() {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  const profiles = (data ?? []) as Profile[];
  const redacted = ctx.isAdmin
    ? profiles
    : profiles.map((p) => ({ ...p, base_salary: 0 }));

  return NextResponse.json(redacted, { headers: PRIVATE_CACHE_HEADERS });
}
