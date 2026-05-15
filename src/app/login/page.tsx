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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
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
      title: "P&L thật cho dự án",
      desc: "Doanh thu vs chi phí, margin trên từng dự án — biết ngay lời/lỗ.",
    },
    {
      icon: Users,
      title: "Capacity team trực quan",
      desc: "Heatmap 6 tháng tới — ai burn, ai rảnh, role nào sắp full.",
    },
    {
      icon: Activity,
      title: "Dòng tiền & cảnh báo",
      desc: "Burnout, vượt budget, payments quá hạn — sếp hỏi gì cũng có đáp án.",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Animated aurora background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-40 -left-32 w-[600px] h-[600px] bg-indigo-500/30 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -right-32 w-[600px] h-[600px] bg-sky-500/25 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(99 102 241) 1px, transparent 1px), linear-gradient(90deg, rgb(99 102 241) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse at center, black, transparent 80%)",
          }}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-6xl grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-center">
          {/* ===== LEFT — Hero / brand ===== */}
          <div className="hidden lg:block animate-fade-up">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 blur-lg opacity-70 rounded-2xl animate-float" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 flex items-center justify-center text-white shadow-xl">
                  <Sparkles size={22} strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <div className="font-bold text-2xl tracking-tight">
                  PM<span className="gradient-text">_Eye</span>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                  Project · People · P&L
                </div>
              </div>
            </div>

            {/* Hero title */}
            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.05]">
              Nhìn 1 phát biết
              <br />
              <span className="gradient-text">team đang lời hay lỗ.</span>
            </h1>
            <p className="text-base text-muted-foreground mt-5 max-w-md leading-relaxed">
              Tool nội bộ cho trưởng phòng kinh doanh quản lý dự án IT — doanh
              thu, chi phí, margin, capacity team. Đủ data để bạn pitch sếp.
            </p>

            {/* Feature bullets */}
            <div className="mt-10 space-y-4 max-w-md">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="flex items-start gap-3 animate-fade-up"
                  style={{ animationDelay: `${(i + 1) * 100}ms` }}
                >
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-card border ring-1 ring-black/5 dark:ring-white/10 shadow-sm flex items-center justify-center">
                    <f.icon size={16} className="text-indigo-500" />
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

            {/* Tech badges */}
            <div className="mt-12 flex items-center gap-4 text-[11px] text-muted-foreground">
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

          {/* ===== RIGHT — Login card ===== */}
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-fade-up" style={{ animationDelay: "100ms" }}>
            {/* Mobile-only logo */}
            <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 blur-md opacity-60 rounded-2xl" />
                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 flex items-center justify-center text-white shadow-lg">
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

            <div className="relative rounded-2xl bg-card/80 backdrop-blur-xl border ring-1 ring-black/5 dark:ring-white/10 shadow-[0_24px_56px_-12px_rgb(0_0_0_/_0.3)] p-7">
              {/* top gradient line */}
              <div className="absolute top-0 left-7 right-7 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

              {/* Mode segmented */}
              <div className="inline-flex rounded-lg border bg-muted/40 p-1 mb-6">
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setError(null);
                    }}
                    className={`px-4 h-8 rounded-md text-xs font-medium transition ${
                      mode === m
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
                  </button>
                ))}
              </div>

              <h2 className="text-2xl font-semibold tracking-tight">
                {mode === "signin"
                  ? "Chào mừng quay lại 👋"
                  : "Tạo tài khoản mới"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                {mode === "signin"
                  ? "Đăng nhập để vào dashboard quản lý."
                  : "Đăng ký tài khoản admin cho phòng ban."}
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                    {mode === "signin" && (
                      <button
                        type="button"
                        className="text-[11px] text-muted-foreground hover:text-foreground transition"
                        onClick={() =>
                          setError(
                            "Liên hệ admin nội bộ để reset mật khẩu — chưa hỗ trợ tự reset."
                          )
                        }
                      >
                        Quên mật khẩu?
                      </button>
                    )}
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
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                      className="h-11 pr-11"
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
                  {mode === "signup" && (
                    <p className="text-[10px] text-muted-foreground">
                      Tối thiểu 6 ký tự.
                    </p>
                  )}
                </div>

                {error && (
                  <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/20 px-3 py-2.5 rounded-lg flex items-start gap-2 animate-fade-up">
                    <span className="text-rose-500 shrink-0">⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="brand"
                  size="lg"
                  disabled={loading}
                  className="w-full h-11 group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-center text-[11px] text-muted-foreground mt-6">
                {mode === "signin" ? (
                  <>
                    Chưa có tài khoản?{" "}
                    <button
                      onClick={() => setMode("signup")}
                      className="text-indigo-500 hover:underline font-medium"
                    >
                      Đăng ký ngay
                    </button>
                  </>
                ) : (
                  <>
                    Đã có tài khoản?{" "}
                    <button
                      onClick={() => setMode("signin")}
                      className="text-indigo-500 hover:underline font-medium"
                    >
                      Đăng nhập
                    </button>
                  </>
                )}
              </p>
            </div>

            <p className="text-center text-[10px] text-muted-foreground/70 mt-6 tracking-wide">
              Internal tool · Built with Next.js · Supabase · shadcn/ui
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
