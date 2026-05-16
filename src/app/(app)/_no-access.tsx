"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export function NoAccess({ email }: { email: string | null }) {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl card-premium p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20 flex items-center justify-center mb-4">
          <ShieldAlert size={22} className="text-rose-500" />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Không có quyền truy cập
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Tài khoản của bạn chưa được cấp quyền admin cho PM_Eye.
          {email && (
            <>
              <br />
              Liên hệ admin nội bộ để cấp quyền cho email{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </>
          )}
        </p>
        <Button
          variant="outline"
          onClick={signOut}
          className="mt-6 w-full"
        >
          Đăng xuất
        </Button>
      </div>
    </div>
  );
}
