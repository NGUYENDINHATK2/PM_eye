"use client";

import type {
  Allocation,
  OperatingExpense,
  Profile,
  Project,
  ProjectPayment,
  ProjectPhase,
  SalaryHistory,
} from "@/types/database";
import { useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Chỉ refetch on focus nếu dữ liệu cũ hơn ngưỡng này
const STALE_AFTER_MS = 60_000; // 60 giây

export type AppData = {
  user: { email: string | null };
  profiles: Profile[];
  projects: Project[];
  phases: ProjectPhase[];
  allocations: Allocation[];
  expenses: OperatingExpense[];
  payments: ProjectPayment[];
  salaryHistory: SalaryHistory[];
};

type Ctx = {
  data: AppData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const AppDataContext = createContext<Ctx | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const fetchData = useCallback(async () => {
    // Dedup: nếu đang có request đang chạy, return promise đó (tránh double-fetch)
    if (inFlightRef.current) return inFlightRef.current;

    const run = async () => {
      try {
        const res = await fetch("/api/data", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const json: AppData = await res.json();
        setData(json);
        setError(null);
        lastFetchRef.current = Date.now();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi không xác định");
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    };

    inFlightRef.current = run();
    return inFlightRef.current;
  }, [router]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on focus chỉ khi data đã stale (> STALE_AFTER_MS từ lần fetch trước)
  useEffect(() => {
    const onFocus = () => {
      const elapsed = Date.now() - lastFetchRef.current;
      if (elapsed > STALE_AFTER_MS) {
        fetchData();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchData]);

  return (
    <AppDataContext.Provider
      value={{ data, loading, error, refresh: fetchData }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): Ctx {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used inside <AppDataProvider>");
  }
  return ctx;
}
