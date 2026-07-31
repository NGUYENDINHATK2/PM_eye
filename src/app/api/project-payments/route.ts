import { PRIVATE_CACHE_HEADERS, requireRole } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireRole(["admin", "manager", "pm"]);
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.supabase
    .from("project_payments")
    .select("*")
    .order("due_date");

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  return NextResponse.json(data ?? [], { headers: PRIVATE_CACHE_HEADERS });
}
