import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

type CookieRecord = { name: string; value: string; options?: CookieOptions };

/**
 * Constant-time compare để tránh timing attack khi so password.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Lớp gate trước cả Supabase auth: HTTP Basic Auth.
 *
 * Bật bằng env `SITE_BASIC_AUTH=username:password`. Nếu env không có →
 * skip (cho local dev không phiền). Khi bật, mọi request (page + api)
 * đều phải nhập đúng cred mới đi tiếp; nếu sai/thiếu → trả 401 kèm
 * header `WWW-Authenticate: Basic` để browser pop dialog đăng nhập.
 *
 * Lưu ý: HTTPS bắt buộc (Vercel mặc định đã enforce). Đây không phải
 * thay thế Supabase auth, chỉ là rào chắn lớp ngoài cho team biết password.
 */
function basicAuthCheck(request: NextRequest): NextResponse | null {
  const expected = process.env.SITE_BASIC_AUTH;
  if (!expected) return null; // chưa cấu hình → bỏ qua

  const colonIdx = expected.indexOf(":");
  if (colonIdx <= 0) return null; // env sai format → bỏ qua, không khoá nhầm

  const header = request.headers.get("authorization") ?? "";
  if (header.toLowerCase().startsWith("basic ")) {
    const b64 = header.slice(6).trim();
    let decoded = "";
    try {
      decoded = atob(b64);
    } catch {
      decoded = "";
    }
    if (decoded && safeEqual(decoded, expected)) return null; // pass
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="PM_Eye", charset="UTF-8"',
      "Cache-Control": "private, no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function updateSession(request: NextRequest) {
  // Bước 1: Basic auth gate (nếu cấu hình). Block toàn site trước khi
  // Supabase auth chạy.
  const basicAuthBlock = basicAuthCheck(request);
  if (basicAuthBlock) return basicAuthBlock;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieRecord[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login");
  const isApi = path.startsWith("/api/");

  if (!user) {
    // API routes: trả 401 JSON, không redirect (client cần biết để xử lý).
    if (isApi) {
      return new NextResponse(
        JSON.stringify({
          error: "unauthenticated",
          message: "Bạn cần đăng nhập.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
          },
        }
      );
    }
    // Page routes: redirect như cũ (trừ trang login).
    if (!isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
