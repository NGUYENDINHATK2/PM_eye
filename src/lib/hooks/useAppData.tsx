"use client";

import type { AppRole } from "@/types/database";
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
  useTransition,
} from "react";

const STALE_AFTER_MS = 60_000;

export type AppData = {
  user: {
    email: string | null;
    role: AppRole;
    isAdmin: boolean;
    canViewSalary: boolean;
    canViewMoney: boolean;
  };
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
  refreshing: boolean;
  error: string | null;
  refresh: (opts?: { force?: boolean }) => Promise<void>;
  mutate: (patch: Partial<AppData> | ((prev: AppData) => AppData)) => void;
};

const AppDataContext = createContext<Ctx | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const lastFetchRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;

  const fetchData = useCallback(
    async (opts?: { force?: boolean }) => {
      if (inFlightRef.current) return inFlightRef.current;

      const hasCache = !!dataRef.current;
      const elapsed = Date.now() - lastFetchRef.current;
      if (!opts?.force && hasCache && elapsed < STALE_AFTER_MS) {
        return;
      }

      const run = async () => {
        try {
          if (hasCache) setRefreshing(true);
          else setLoading(true);

          const res = await fetch("/api/bootstrap", { cache: "no-store" });

          if (res.status === 401) {
            router.push("/login");
            return;
          }
          if (res.status === 403) {
            const body = (await res.json().catch(() => null)) as {
              message?: string;
            } | null;
            throw new Error(
              body?.message ?? "Không có quyền truy cập (403)."
            );
          }
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as {
              message?: string;
            } | null;
            throw new Error(body?.message ?? `HTTP ${res.status}`);
          }

          const payload = (await res.json()) as AppData;
          startTransition(() => {
            setData(payload);
            setError(null);
          });
          lastFetchRef.current = Date.now();
        } catch (e) {
          if (!dataRef.current) {
            setError(e instanceof Error ? e.message : "Lỗi không xác định");
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
          inFlightRef.current = null;
        }
      };

      inFlightRef.current = run();
      return inFlightRef.current;
    },
    [router]
  );

  const mutate = useCallback(
    (patch: Partial<AppData> | ((prev: AppData) => AppData)) => {
      setData((prev) => {
        if (!prev) return prev;
        return typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      });
    },
    []
  );

  useEffect(() => {
    fetchData({ force: true });
  }, [fetchData]);

  useEffect(() => {
    const onFocus = () => {
      const elapsed = Date.now() - lastFetchRef.current;
      if (elapsed > STALE_AFTER_MS) {
        void fetchData();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchData]);

  return (
    <AppDataContext.Provider
      value={{ data, loading, refreshing, error, refresh: fetchData, mutate }}
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
