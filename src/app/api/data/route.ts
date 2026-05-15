import { fetchAll } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Universal data endpoint — trả về toàn bộ data app cần để render.
 * Client components fetch endpoint này thay vì gọi fetchAll() trực tiếp.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchAll();
    return NextResponse.json({
      user: { email: user.email ?? null },
      ...data,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
