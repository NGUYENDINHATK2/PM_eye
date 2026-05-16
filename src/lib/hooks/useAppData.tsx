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

const STALE_AFTER_MS = 60_000;

export type AppData = {
  user: { email: string | null; isAdmin: boolean };
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

type MeResponse = { email: string | null; id: string; isAdmin: boolean };
type FetchResult<T> = { ok: true; data: T } | { ok: false; status: number };

async function fetchJson<T>(url: string): Promise<FetchResult<T>> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, data: (await res.json()) as T };
}

function take<T>(r: FetchResult<T>, fallback: T): T {
  return r.ok ? r.data : fallback;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const fetchData = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;

    const run = async () => {
      try {
        // Provider chỉ mount khi user là admin (gate ở app/(app)/layout.tsx).
        // Parallel-fetch tất cả resource.
        const [
          me,
          profiles,
          projects,
          phases,
          allocations,
          expenses,
          payments,
          salaryHistory,
        ] = await Promise.all([
          fetchJson<MeResponse>("/api/me"),
          fetchJson<Profile[]>("/api/profiles"),
          fetchJson<Project[]>("/api/projects"),
          fetchJson<ProjectPhase[]>("/api/project-phases"),
          fetchJson<Allocation[]>("/api/allocations"),
          fetchJson<OperatingExpense[]>("/api/operating-expenses"),
          fetchJson<ProjectPayment[]>("/api/project-payments"),
          fetchJson<SalaryHistory[]>("/api/salary-history"),
        ]);

        // Bất kỳ resource trả 401 → session hết hạn.
        const allResults = [
          me,
          profiles,
          projects,
          phases,
          allocations,
          expenses,
          payments,
          salaryHistory,
        ];
        for (const r of allResults) {
          if (!r.ok && r.status === 401) {
            router.push("/login");
            return;
          }
          // 403 trên data endpoint = user mất quyền admin giữa session →
          // đuổi về layout để hiển thị "Không có quyền".
          if (!r.ok && r.status === 403) {
            router.refresh();
            return;
          }
        }

        if (!me.ok) {
          throw new Error(`HTTP ${me.status} khi gọi /api/me`);
        }

        setData({
          user: { email: me.data.email, isAdmin: me.data.isAdmin },
          profiles: take(profiles, []),
          projects: take(projects, []),
          phases: take(phases, []),
          allocations: take(allocations, []),
          expenses: take(expenses, []),
          payments: take(payments, []),
          salaryHistory: take(salaryHistory, []),
        });
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
