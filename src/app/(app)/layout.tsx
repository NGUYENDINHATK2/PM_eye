import { Sidebar } from "@/components/Sidebar";
import { TopProgressBar } from "@/components/TopProgressBar";
import { AppDataProvider } from "@/lib/hooks/useAppData";
import { isAppAdmin } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NoAccess } from "./_no-access";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Chặn ngay từ layout — non-admin không vào được dashboard ngay cả khi đã
  // đăng nhập. Họ thấy trang "Không có quyền" + nút đăng xuất, không có
  // request data nào được gọi.
  if (!isAppAdmin(user)) {
    return <NoAccess email={user.email ?? null} />;
  }

  return (
    <AppDataProvider>
      <div className="flex min-h-screen">
        <TopProgressBar />
        <Sidebar userEmail={user.email ?? undefined} />
        <main
          className="flex-1 min-w-0 p-4 lg:p-6 w-full max-w-full overflow-x-hidden animate-fade-up"
          style={{ animationDuration: "0.35s" }}
        >
          {children}
        </main>
      </div>
    </AppDataProvider>
  );
}
