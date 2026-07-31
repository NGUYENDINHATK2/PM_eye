import { PRIVATE_CACHE_HEADERS, requireRole } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Member không xem expenses */
export async function GET() {
  const ctx = await requireRole(["admin", "manager", "pm"]);
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

  return NextResponse.json(data ?? [], { headers: PRIVATE_CACHE_HEADERS });
}
