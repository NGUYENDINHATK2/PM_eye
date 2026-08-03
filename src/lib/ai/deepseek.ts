/**
 * DeepSeek chat (OpenAI-compatible) — SERVER ONLY.
 */

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function isDeepSeekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

function apiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Chưa cấu hình DEEPSEEK_API_KEY — thêm vào .env.local / Vercel env rồi redeploy."
    );
  }
  return key;
}

export async function deepseekChat(opts: {
  messages: DeepSeekMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Ép trả JSON object */
  json?: boolean;
}): Promise<string> {
  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: opts.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      messages: opts.messages,
      temperature: opts.temperature ?? 0.35,
      max_tokens: opts.maxTokens ?? 1600,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `DeepSeek lỗi ${res.status}: ${text.slice(0, 240) || res.statusText}`
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("DeepSeek không trả nội dung.");
  return content;
}

/** Parse JSON từ model — chịu được ```json fence. */
export function parseAiJson<T>(raw: string): T {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  return JSON.parse(text) as T;
}
