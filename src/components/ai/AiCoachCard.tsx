"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AiAction, AiCoachResult, AiMood } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import {
  Bot,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const STEPS = [
  "Đọc dữ liệu team…",
  "Tính lực chiến & tải…",
  "DeepSeek đang suy luận…",
  "Đóng gói gợi ý…",
];

export function AiCoachCard({
  result,
  loading,
  error,
  title = "AI Coach",
  onRegenerate,
  className,
}: {
  result: AiCoachResult | null;
  loading: boolean;
  error?: string | null;
  title?: string;
  onRegenerate?: () => void;
  className?: string;
}) {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading) {
      setStep(0);
      return;
    }
    setStep(0);
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, [loading]);

  if (!loading && !result && !error) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl ring-1 ring-border/60",
        "bg-gradient-to-br from-teal-500/[0.07] via-background to-cyan-500/[0.06]",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-teal-500/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl"
      />

      <div className="relative p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/15 text-teal-700 ring-1 ring-teal-500/25 dark:text-teal-300">
              <Bot size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">
                {title}
              </div>
              <div className="text-[10px] text-muted-foreground">
                DeepSeek · không dùng dữ liệu lương
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {result && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={async () => {
                  const text = formatAdviceText(result);
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  toast.success("Đã copy gợi ý");
                  window.setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? (
                  <Check className="!size-3.5" />
                ) : (
                  <Copy className="!size-3.5" />
                )}
                Copy
              </Button>
            )}
            {onRegenerate && (
              <Button
                size="sm"
                variant="secondary"
                className="h-8"
                disabled={loading}
                onClick={onRegenerate}
              >
                {loading ? (
                  <Loader2 className="!size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="!size-3.5" />
                )}
                Làm lại
              </Button>
            )}
          </div>
        </div>

        {loading && !result && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles size={14} className="animate-pulse text-teal-500" />
              <span className="animate-pulse">{STEPS[step]}</span>
            </div>
            <div className="grid gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-muted/50"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-300">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex flex-wrap items-start gap-4">
              <ScoreRing score={result.score} mood={result.mood} />
              <div className="min-w-0 flex-1">
                <h4 className="font-display text-lg font-semibold tracking-tight">
                  {result.headline}
                </h4>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {result.summary}
                </p>
                {result.tags && result.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {result.insights.length > 0 && (
              <ul className="space-y-1.5 rounded-xl bg-background/70 p-3 ring-1 ring-border/50">
                {result.insights.map((ins, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm leading-snug text-foreground/90"
                  >
                    <Zap
                      size={14}
                      className="mt-0.5 shrink-0 text-amber-500"
                    />
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
            )}

            {result.actions.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Việc nên làm
                </div>
                <div className="grid gap-2">
                  {result.actions.map((a, i) => (
                    <ActionRow key={i} action={a} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreRing({ score, mood }: { score: number; mood: AiMood }) {
  const color =
    mood === "critical"
      ? "#f43f5e"
      : mood === "warn"
        ? "#f59e0b"
        : mood === "strong"
          ? "#0ea5e9"
          : mood === "ok"
            ? "#10b981"
            : "#94a3b8";
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, score) / 100) * c;

  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/40"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-semibold tnum leading-none">
          {score}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
          score
        </span>
      </div>
    </div>
  );
}

function ActionRow({ action, index }: { action: AiAction; index: number }) {
  const pri =
    action.priority === "high"
      ? {
          badge: "destructive" as const,
          label: "Cao",
          ring: "ring-rose-500/20",
        }
      : action.priority === "low"
        ? {
            badge: "secondary" as const,
            label: "Thấp",
            ring: "ring-border/50",
          }
        : {
            badge: "warning" as const,
            label: "TB",
            ring: "ring-amber-500/20",
          };

  return (
    <div
      className={cn(
        "rounded-xl bg-background/80 p-3 ring-1 transition hover:bg-background",
        pri.ring
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-2.5">
        <Badge variant={pri.badge} className="mt-0.5 shrink-0 text-[10px]">
          {pri.label}
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-snug">{action.title}</div>
          {action.detail && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {action.detail}
            </p>
          )}
          {(action.person || action.role) && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] text-teal-800 ring-1 ring-teal-500/20 dark:text-teal-200">
              <UserRound size={11} />
              <span className="font-medium">
                {action.person ?? "Ứng viên"}
              </span>
              {action.role && (
                <span className="text-muted-foreground">· {action.role}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatAdviceText(r: AiCoachResult): string {
  const lines = [
    r.headline,
    `Score: ${r.score}`,
    "",
    r.summary,
    "",
    ...r.insights.map((i) => `• ${i}`),
    "",
    "Việc nên làm:",
    ...r.actions.map(
      (a, i) =>
        `${i + 1}. [${a.priority}] ${a.title}${
          a.person ? ` → ${a.person}` : ""
        }\n   ${a.detail}`
    ),
  ];
  return lines.join("\n");
}

/** Hook gọi AI coach endpoint */
export function useAiCoach(endpoint: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiCoachResult | null>(null);

  async function run(body: Record<string, unknown> = {}) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        result?: AiCoachResult;
        message?: string;
      } | null;
      if (!res.ok) {
        throw new Error(json?.message ?? `HTTP ${res.status}`);
      }
      if (!json?.result) throw new Error("AI không trả kết quả.");
      setResult(json.result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi AI";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, result, run, setResult };
}
