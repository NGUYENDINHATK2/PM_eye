import { PRIVATE_CACHE_HEADERS, requireApiUser } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Trả thông tin user hiện tại + cờ admin để client gate UI.
 */
export async function GET() {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json(
    {
      email: ctx.user.email ?? null,
      id: ctx.user.id,
      isAdmin: ctx.isAdmin,
    },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}
