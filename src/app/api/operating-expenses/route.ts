import { PRIVATE_CACHE_HEADERS, requireApiAdmin } from "@/lib/api-auth";
import type { OperatingExpense } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/operating-expenses — admin only.
 * Non-admin sẽ nhận 403; client xử lý bằng cách show empty/locked state.
 */
export async function GET() {
  const ctx = await requireApiAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.supabase
    .from("operating_expenses")
    .select("*")
    .order("spent_date", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  return NextResponse.json((data ?? []) as OperatingExpense[], {
    headers: PRIVATE_CACHE_HEADERS,
  });
}
