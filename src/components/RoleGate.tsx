"use client";

import { useAppData } from "@/lib/hooks/useAppData";
import type { AppRole } from "@/types/database";
import { ReactNode } from "react";

/** Ẩn children nếu role không nằm trong allowlist. */
export function RoleGate({
  allow,
  children,
  fallback = null,
}: {
  allow: AppRole | AppRole[] | ((role: AppRole) => boolean);
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { data } = useAppData();
  const role = data?.user.role;
  if (!role) return fallback;

  const ok =
    typeof allow === "function"
      ? allow(role)
      : Array.isArray(allow)
        ? allow.includes(role)
        : allow === role;

  return ok ? <>{children}</> : <>{fallback}</>;
}

export function MoneyGate({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { data } = useAppData();
  if (!data?.user.canViewMoney) return <>{fallback}</>;
  return <>{children}</>;
}

export function SalaryGate({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { data } = useAppData();
  if (!data?.user.canViewSalary) return <>{fallback}</>;
  return <>{children}</>;
}
