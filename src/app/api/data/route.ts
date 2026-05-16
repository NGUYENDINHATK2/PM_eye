import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * @deprecated — bulk endpoint cũ gây lộ dữ liệu nhạy cảm.
 * Đã thay bằng các per-resource endpoints:
 *   /api/me, /api/profiles, /api/projects, /api/project-phases,
 *   /api/allocations, /api/operating-expenses (admin),
 *   /api/project-payments (admin), /api/salary-history (admin)
 *
 * Trả 410 Gone để báo client cập nhật.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "gone",
      message:
        "Endpoint /api/data đã bị deprecate. Dùng /api/profiles, /api/projects, /api/allocations, /api/me, …",
    },
    {
      status: 410,
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
