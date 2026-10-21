/**
 * JEV (TypeSafe AI "System One") — fast typed decisions instead of generated text.
 * Every call is optional: on missing key or any failure it returns null and callers fall back to heuristics.
 */

import { recordJev } from "./usage";

const URL = "https://api.typesafe.ai/v1/systemone";

export type JevQuestion =
  | { type: "noul"; instructions: string; criteria?: { true?: string; false?: string } }
  | { type: "choice"; instructions: string; criteria: Record<string, string | null> }
  | { type: "score"; instructions: string; criteria: string[] };

export type JevAnswer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; confidence: number; probabilities: Record<string, number> }
  | { type: "score"; score: number; confidence: number; probabilities: Record<string, number> };

export async function jev(
  key: string,
  state: string,
  questions: Record<string, JevQuestion>,
  timeoutMs = 8000,
): Promise<Record<string, JevAnswer> | null> {
  if (!key) return null;
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "jev-latest", state: state.slice(0, 12000), questions }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn("[jev]", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return null;
    }
    const data = (await res.json()) as { answers?: Record<string, JevAnswer>; usage?: { input_tokens?: number; prompt_tokens?: number } };
    // The token count when JEV reports it; otherwise about 4 characters per token of what was sent
    recordJev(data.usage?.input_tokens ?? data.usage?.prompt_tokens ?? Math.ceil((state.slice(0, 12000).length + JSON.stringify(questions).length) / 4));
    return data.answers ?? null;
  } catch (err) {
    console.warn("[jev] failed:", (err as Error).message);
    return null;
  }
}

export function noul(answers: Record<string, JevAnswer> | null, name: string): number | null {
  const a = answers?.[name];
  return a?.type === "noul" ? a.noul : null;
}

export function choice(answers: Record<string, JevAnswer> | null, name: string) {
  const a = answers?.[name];
  return a?.type === "choice" ? a : null;
}

export async function checkJevKey(key: string) {
  const res = await fetch("https://api.typesafe.ai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(8000),
  });
  return res.ok;
}
