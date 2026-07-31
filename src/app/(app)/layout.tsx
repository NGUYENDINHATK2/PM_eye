import { AppShell } from "@/components/AppShell";
import { roleFromUser } from "@/lib/rbac";
import { AppDataProvider } from "@/lib/hooks/useAppData";
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

  const role = roleFromUser(user);
  if (!role) {
    return <NoAccess email={user.email ?? null} />;
  }

  return (
    <AppDataProvider>
      <AppShell userEmail={user.email ?? undefined} appRole={role}>
        {children}
      </AppShell>
    </AppDataProvider>
  );
}
