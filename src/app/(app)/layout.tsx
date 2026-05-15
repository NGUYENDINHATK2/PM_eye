import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={user.email ?? undefined} />
      <main
        className="flex-1 min-w-0 p-4 lg:p-6 w-full animate-fade-up"
        style={{ animationDuration: "0.35s" }}
      >
        {children}
      </main>
    </div>
  );
}
