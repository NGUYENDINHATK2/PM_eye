"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Eye, Loader2 } from "lucide-react";
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-sky-500 blur-md opacity-60 rounded-2xl" />
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-lg">
              <Eye size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div className="font-semibold text-lg tracking-tight">PM_Eye</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Project · People · P&L
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-border/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {mode === "signin" ? "Chào mừng quay lại" : "Tạo tài khoản"}
            </CardTitle>
            <CardDescription>
              Tool quản lý nội bộ — chỉ tài khoản admin được vào.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@cong-ty.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="text-xs text-rose-600 bg-rose-500/10 ring-1 ring-rose-500/20 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="brand"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="animate-spin" />}
                {mode === "signin" ? "Đăng nhập" : "Đăng ký"}
              </Button>
            </form>

            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground w-full text-center transition"
            >
              {mode === "signin"
                ? "Chưa có tài khoản? Đăng ký"
                : "Đã có tài khoản? Đăng nhập"}
            </button>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Powered by Next.js · Supabase · shadcn/ui
        </p>
      </div>
    </div>
  );
}
