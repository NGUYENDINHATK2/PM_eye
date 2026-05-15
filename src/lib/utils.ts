import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize a date string (date or ISO timestamp) to YYYY-MM-DD
 * for <input type="date"> defaultValue.
 */
export function toDateInput(s?: string | null): string {
  if (!s) return "";
  return s.slice(0, 10);
}

/**
 * Convert raw Supabase error message to a friendly Vietnamese hint.
 * Special-cases the "column does not exist" case which means missing migration.
 */
export function humanizeSupabaseError(msg: string): string {
  if (!msg) return "Lỗi không xác định.";
  // Missing column → migration chưa chạy
  const colMatch = msg.match(/column "?([\w.]+)"? .*does not exist|Could not find the '([\w]+)' column/i);
  if (colMatch) {
    const col = colMatch[1] ?? colMatch[2];
    return `Thiếu cột "${col}" trên Supabase. Bạn cần chạy migration SQL trong supabase/migrations/ trên Supabase SQL Editor trước.`;
  }
  if (/relation .* does not exist/i.test(msg)) {
    return `Thiếu bảng trên Supabase. Chạy file supabase/schema.sql trên SQL Editor để khởi tạo.`;
  }
  if (/violates foreign key/i.test(msg)) {
    return "Bản ghi tham chiếu không tồn tại (có thể dự án/nhân sự đã xoá). Reload trang thử lại.";
  }
  if (/violates check constraint/i.test(msg)) {
    return "Giá trị nhập không hợp lệ (vd: % phải từ 0 đến 1).";
  }
  if (/duplicate key|unique constraint/i.test(msg)) {
    return "Bản ghi này đã tồn tại.";
  }
  if (/permission denied|row-level security/i.test(msg)) {
    return "Không có quyền (RLS). Đảm bảo bạn đã đăng nhập và policy đúng.";
  }
  return msg;
}

export function formatCurrency(n: number, currency = "VND") {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

export function formatPercent(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `T${parseInt(m)}/${y.slice(2)}`;
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/**
 * Parse một date-only string `YYYY-MM-DD` từ DB sang Date ở local timezone.
 *
 * Vì sao cần: `new Date('2026-05-16')` parse là UTC midnight, ở ICT (+7) sẽ
 * thành 07:00 sáng — lệch một múi giờ. Khi so sánh với `new Date()` (local
 * time) sẽ gây off-by-one ở rìa ngày. Hàm này luôn parse về local midnight.
 *
 * @param endOfDay nếu true → set giờ về 23:59:59.999 (dùng cho end_date inclusive)
 */
export function parseLocalDate(s: string, endOfDay = false): Date {
  // Lấy 10 ký tự đầu để xử lý cả 'YYYY-MM-DD' và 'YYYY-MM-DDTHH:mm:ssZ'
  const [yy, mm, dd] = s.slice(0, 10).split("-").map(Number);
  const d = new Date(yy, (mm ?? 1) - 1, dd ?? 1);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

export function rangeOverlapDays(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}
