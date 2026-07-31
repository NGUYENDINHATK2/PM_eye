"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) {
    return "Email hoặc mật khẩu không đúng. Kiểm tra lại rồi thử.";
  }
  if (m.includes("email not confirmed")) {
    return "Email chưa được xác nhận. Liên hệ admin để auto-confirm tài khoản.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Thử quá nhiều lần. Đợi vài phút rồi đăng nhập lại.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Không kết nối được máy chủ. Kiểm tra mạng hoặc cấu hình Supabase.";
  }
  return message;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(mapAuthError(authError.message));
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError("Đăng nhập thành công nhưng chưa nhận được session. Thử lại.");
        setLoading(false);
        return;
      }

      // Hard navigation — đảm bảo cookie session có trước khi middleware chạy.
      // router.push + refresh dễ race → loop /login hoặc trắng màn hình.
      window.location.assign("/");
    } catch (err) {
      setError(
        mapAuthError(err instanceof Error ? err.message : "Lỗi không xác định")
      );
      setLoading(false);
    }
  }

  const features = [
    {
      icon: TrendingUp,
      title: "P&L rõ từng dự án",
      desc: "Doanh thu, chi phí, margin — lời/lỗ theo từng portfolio.",
      color: "from-teal-500 to-cyan-600",
    },
    {
      icon: Users,
      title: "Capacity team trực quan",
      desc: "Heatmap 6 tháng — ai burn, ai rảnh, role nào sắp full.",
      color: "from-sky-500 to-teal-500",
    },
    {
      icon: Activity,
      title: "Cảnh báo chủ động",
      desc: "Burnout, vượt budget, thiếu role — có sẵn câu trả lời.",
      color: "from-emerald-500 to-teal-600",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-[560px] h-[560px] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--teal) / 0.18), transparent 65%)",
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[560px] h-[560px] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--sky) / 0.14), transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at center, black, transparent 80%)",
          }}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-6xl grid lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-14 items-center">
          <div className="hidden lg:block animate-fade-up">
            <div className="flex items-center gap-3 mb-12">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--teal)), hsl(var(--sky)))",
                  boxShadow: "0 8px 24px -6px hsl(var(--teal) / 0.45)",
                }}
              >
                <Eye size={22} strokeWidth={2.4} />
              </div>
              <div>
                <div className="font-display font-bold text-2xl tracking-tight">
                  PM<span className="gradient-text">_Eye</span>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-[0.20em] font-semibold mt-0.5">
                  Project · People · P&amp;L
                </div>
              </div>
            </div>

            <div className="mb-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[11px] font-medium text-muted-foreground">
                <span className="status-dot" />
                Ops console · v2
              </span>
            </div>

            <h1 className="font-display text-4xl xl:text-[52px] font-semibold tracking-tight leading-[1.05] mt-5">
              Nhìn một chỗ —
              <br />
              <span className="gradient-text">team đang lời hay lỗ.</span>
            </h1>
            <p className="text-base text-muted-foreground mt-5 max-w-md leading-relaxed">
              Capacity, burn chi phí, sức khỏe dự án. Số liệu để điều chỉnh
              staffing và báo cáo — gọn trong một dashboard.
            </p>

            <div className="mt-10 space-y-3 max-w-md">
              {features.map((f, i) => (
                <div
                  key={f.title}
                    className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/80 p-3 ring-1 ring-border/30 card-premium animate-fade-up"
                  style={{ animationDelay: `${(i + 1) * 100}ms` }}
                >
                  <div
                    className={`w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-md`}
                  >
                    <f.icon size={16} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{f.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {f.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={11} className="text-teal-600" />
                Admin-only
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-teal-600" />
                Realtime capacity
              </span>
            </div>
          </div>

          <div
            className="w-full max-w-md mx-auto lg:mx-0 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--teal)), hsl(var(--sky)))",
                }}
              >
                <Eye size={20} strokeWidth={2.4} />
              </div>
              <div>
                <div className="font-display font-semibold text-lg tracking-tight">
                  PM<span className="gradient-text">_Eye</span>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Project · People · P&amp;L
                </div>
              </div>
            </div>

            <div className="card-premium rounded-2xl p-7 ring-1 ring-border/50 sm:p-8">
              <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 ring-1 ring-teal-500/15 dark:text-teal-300">
                <span className="status-dot" />
                Secure access
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
                Đăng nhập
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Vào console quản lý dự án &amp; nhân sự.
              </p>

              <form onSubmit={onSubmit} className="mt-7 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@cong-ty.com"
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                    className="h-11 rounded-xl border-border/70 bg-background/80 ring-1 ring-transparent transition focus-visible:ring-teal-500/25"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-foreground transition"
                      onClick={() =>
                        setError("Liên hệ admin nội bộ để reset mật khẩu.")
                      }
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={loading}
                      className="h-11 rounded-xl border-border/70 bg-background/80 pr-11 ring-1 ring-transparent transition focus-visible:ring-teal-500/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20 px-3 py-2.5 rounded-lg flex items-start gap-2 animate-fade-up"
                  >
                    <span className="text-rose-500 shrink-0">⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="w-full h-11 group btn-liquid border-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Đang đăng nhập...
                    </>
                  ) : (
                    <>
                      Vào dashboard
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-center text-[11px] text-muted-foreground mt-6">
                Tool nội bộ — chỉ admin được cấp tài khoản.
              </p>
            </div>

            <p className="text-center text-[10px] text-muted-foreground/70 mt-6 tracking-wide">
              © PM_Eye · Next.js · Supabase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
