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
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  const features = [
    {
      icon: TrendingUp,
      title: "P&L thật cho từng dự án",
      desc: "Doanh thu vs chi phí, margin trên từng dự án — lời/lỗ rõ ràng.",
      color: "from-violet-500 to-fuchsia-500",
    },
    {
      icon: Users,
      title: "Capacity team trực quan",
      desc: "Heatmap 6 tháng tới — ai burn, ai rảnh, role nào sắp full.",
      color: "from-cyan-500 to-sky-500",
    },
    {
      icon: Activity,
      title: "Dòng tiền & cảnh báo",
      desc: "Burnout, vượt budget, payments quá hạn — đã có sẵn câu trả lời.",
      color: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Cosmic background — purely decorative */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {/* Stars */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `
              radial-gradient(1px 1px at 10% 15%, white, transparent 50%),
              radial-gradient(1.5px 1.5px at 25% 75%, hsl(var(--cyan)), transparent 50%),
              radial-gradient(1px 1px at 45% 35%, white, transparent 50%),
              radial-gradient(1px 1px at 60% 85%, hsl(var(--violet)), transparent 50%),
              radial-gradient(1.5px 1.5px at 80% 25%, hsl(var(--fuchsia)), transparent 50%),
              radial-gradient(1px 1px at 90% 65%, white, transparent 50%),
              radial-gradient(1px 1px at 15% 55%, white, transparent 50%),
              radial-gradient(1px 1px at 70% 45%, white, transparent 50%)
            `,
          }}
        />
        {/* Nebula orbs */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-violet-500/30 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-cyan-500/25 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "3s" }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--violet)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--violet)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at center, black, transparent 80%)",
          }}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-6xl grid lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-14 items-center">
          {/* ===== LEFT — hero ===== */}
          <div className="hidden lg:block animate-fade-up">
            <div className="flex items-center gap-3 mb-12">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 blur-lg opacity-70 rounded-2xl animate-float" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 flex items-center justify-center text-white shadow-xl">
                  <Sparkles size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <div className="font-bold text-2xl tracking-tight">
                  PM<span className="gradient-text">_Eye</span>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-[0.25em] font-semibold">
                  Project · People · P&L
                </div>
              </div>
            </div>

            <div className="mb-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass text-[11px] font-semibold text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Internal · v1.0
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.05] mt-5">
              Nhìn 1 phát biết
              <br />
              <span className="gradient-text-cosmic">team đang lời hay lỗ.</span>
            </h1>
            <p className="text-base text-muted-foreground mt-5 max-w-md leading-relaxed">
              Tool quản lý dự án IT cho trưởng phòng kinh doanh — doanh thu, chi
              phí, margin, capacity team. Đủ data để pitch sếp.
            </p>

            <div className="mt-10 space-y-3 max-w-md">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="flex items-start gap-3 p-3 rounded-2xl liquid-glass animate-fade-up"
                  style={{ animationDelay: `${(i + 1) * 120}ms` }}
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
                <CheckCircle2 size={11} className="text-emerald-500" />
                Next.js 15
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-500" />
                Supabase
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-500" />
                shadcn/ui
              </span>
            </div>
          </div>

          {/* ===== RIGHT — login card ===== */}
          <div
            className="w-full max-w-md mx-auto lg:mx-0 animate-fade-up"
            style={{ animationDelay: "150ms" }}
          >
            {/* Mobile-only logo */}
            <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 blur-md opacity-60 rounded-2xl" />
                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 flex items-center justify-center text-white shadow-lg">
                  <Sparkles size={20} strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <div className="font-semibold text-lg tracking-tight">
                  PM<span className="gradient-text">_Eye</span>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Project · People · P&L
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Outer gradient glow */}
              <div className="absolute -inset-px bg-gradient-to-br from-violet-500/40 via-fuchsia-500/30 to-cyan-500/40 rounded-[18px] blur-md opacity-60" />

              <div className="relative liquid-glass rounded-2xl p-7 sm:p-8">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Chào mừng trở lại 👋
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Đăng nhập để vào dashboard quản lý.
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
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Mật khẩu</Label>
                      <button
                        type="button"
                        className="text-[11px] text-muted-foreground hover:text-foreground transition"
                        onClick={() =>
                          setError(
                            "Liên hệ admin nội bộ để reset mật khẩu."
                          )
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
                        className="h-11 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
                        aria-label={
                          showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20 px-3 py-2.5 rounded-lg flex items-start gap-2 animate-fade-up">
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
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        Đăng nhập
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
            </div>

            <p className="text-center text-[10px] text-muted-foreground/70 mt-6 tracking-wide">
              © PM_Eye · Built with Next.js · Supabase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
