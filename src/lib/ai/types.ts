export type AiMood = "critical" | "warn" | "ok" | "strong" | "neutral";

export type AiAction = {
  priority: "high" | "med" | "low";
  title: string;
  detail: string;
  /** Tên người gợi ý (nếu có) */
  person?: string | null;
  /** Role gợi ý */
  role?: string | null;
};

export type AiCoachResult = {
  headline: string;
  /** 0–100 sức khỏe / độ sẵn sàng */
  score: number;
  mood: AiMood;
  summary: string;
  insights: string[];
  actions: AiAction[];
  /** Tag ngắn: "Thiếu Senior", "Over load"… */
  tags?: string[];
};

export function normalizeAiCoach(raw: unknown): AiCoachResult {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const moodRaw = String(o.mood ?? "neutral");
  const mood: AiMood = (
    ["critical", "warn", "ok", "strong", "neutral"] as const
  ).includes(moodRaw as AiMood)
    ? (moodRaw as AiMood)
    : "neutral";

  const actionsIn = Array.isArray(o.actions) ? o.actions : [];
  const actions: AiAction[] = actionsIn.slice(0, 6).map((a) => {
    const x = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
    const pr = String(x.priority ?? "med");
    return {
      priority: pr === "high" || pr === "low" ? pr : "med",
      title: String(x.title ?? "Gợi ý").slice(0, 120),
      detail: String(x.detail ?? "").slice(0, 400),
      person: x.person != null ? String(x.person).slice(0, 80) : null,
      role: x.role != null ? String(x.role).slice(0, 40) : null,
    };
  });

  const insights = (Array.isArray(o.insights) ? o.insights : [])
    .map((s) => String(s).slice(0, 220))
    .filter(Boolean)
    .slice(0, 6);

  const tags = (Array.isArray(o.tags) ? o.tags : [])
    .map((s) => String(s).slice(0, 32))
    .filter(Boolean)
    .slice(0, 5);

  let score = Number(o.score);
  if (!Number.isFinite(score)) score = 50;
  score = Math.min(100, Math.max(0, Math.round(score)));

  return {
    headline: String(o.headline ?? "Phân tích AI").slice(0, 140),
    score,
    mood,
    summary: String(o.summary ?? "").slice(0, 500),
    insights,
    actions,
    tags,
  };
}
