import { PRIVATE_CACHE_HEADERS, requireApiAdmin } from "@/lib/api-auth";
import type { ProjectPayment } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireApiAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.supabase
    .from("project_payments")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  return NextResponse.json((data ?? []) as ProjectPayment[], {
    headers: PRIVATE_CACHE_HEADERS,
  });
}
