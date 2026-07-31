import { PRIVATE_CACHE_HEADERS, requireRole } from "@/lib/api-auth";
import type { SalaryHistory } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/salary-history — admin only */
export async function GET() {
  const ctx = await requireRole("admin");
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.admin
    .from("salary_history")
    .select("*")
    .order("effective_from", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  return NextResponse.json((data ?? []) as SalaryHistory[], {
    headers: PRIVATE_CACHE_HEADERS,
  });
}

export async function POST(req: Request) {
  const ctx = await requireRole("admin");
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json();
  const { data, error } = await ctx.admin
    .from("salary_history")
    .insert(body)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json(data, { headers: PRIVATE_CACHE_HEADERS });
}
