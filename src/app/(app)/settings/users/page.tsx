"use client";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useAppData } from "@/lib/hooks/useAppData";
import { UsersAdminClient } from "./UsersAdminClient";

export default function UsersSettingsPage() {
  const { data, loading } = useAppData();
  if (loading && !data) return <PageSkeleton variant="table" />;
  if (!data) return null;
  if (!data.user.isAdmin) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Chỉ admin được quản lý tài khoản.
      </div>
    );
  }
  return <UsersAdminClient />;
}
