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
  /** Admin-only — non-admin nhận empty array */
  expenses: OperatingExpense[];
  /** Admin-only — non-admin nhận empty array */
  payments: ProjectPayment[];
  /** Admin-only — non-admin nhận empty array */
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
        // 1. /api/me — biết isAdmin trước khi quyết định fetch endpoint nào.
        const me = await fetchJson<MeResponse>("/api/me");
        if (!me.ok) {
          if (me.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error(`HTTP ${me.status} khi gọi /api/me`);
        }

        // 2. Parallel-fetch các tài nguyên (admin-only endpoints chỉ gọi khi
        //    user là admin — non-admin sẽ có array rỗng).
        const [
          profiles,
          projects,
          phases,
          allocations,
        ] = await Promise.all([
          fetchJson<Profile[]>("/api/profiles"),
          fetchJson<Project[]>("/api/projects"),
          fetchJson<ProjectPhase[]>("/api/project-phases"),
          fetchJson<Allocation[]>("/api/allocations"),
        ]);

        // Nếu một resource bất kỳ trả 401 → session hết hạn giữa flow.
        for (const r of [profiles, projects, phases, allocations]) {
          if (!r.ok && r.status === 401) {
            router.push("/login");
            return;
          }
        }

        let expenses: FetchResult<OperatingExpense[]> = { ok: true, data: [] };
        let payments: FetchResult<ProjectPayment[]> = { ok: true, data: [] };
        let salaryHistory: FetchResult<SalaryHistory[]> = {
          ok: true,
          data: [],
        };
        if (me.data.isAdmin) {
          [expenses, payments, salaryHistory] = await Promise.all([
            fetchJson<OperatingExpense[]>("/api/operating-expenses"),
            fetchJson<ProjectPayment[]>("/api/project-payments"),
            fetchJson<SalaryHistory[]>("/api/salary-history"),
          ]);
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
