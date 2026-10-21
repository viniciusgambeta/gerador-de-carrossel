import type { TokenCount, Usage } from "./types";

/**
 * USD per 1M tokens, standard tier: input, cached input, output.
 * OpenAI pricing page (developers.openai.com/api/docs/pricing), October 2026.
 * More specific names first: the first prefix that matches wins.
 */
const OPENAI: [prefix: string, input: number, cached: number, output: number][] = [
  ["gpt-5.5", 5, 0.5, 30],
  ["gpt-5.4-mini", 0.75, 0.075, 4.5],
  ["gpt-5.4-nano", 0.2, 0.02, 1.25],
  ["gpt-5.4", 2.5, 0.25, 15],
  ["gpt-5.2", 1.75, 0.175, 14],
  ["gpt-5.1", 1.25, 0.125, 10],
  ["gpt-5-mini", 0.25, 0.025, 2],
  ["gpt-5-nano", 0.05, 0.005, 0.4],
  ["gpt-5", 1.25, 0.125, 10],
  ["gpt-4.1-mini", 0.4, 0.1, 1.6],
  ["gpt-4.1-nano", 0.1, 0.025, 0.4],
  ["gpt-4.1", 2, 0.5, 8],
  ["gpt-4o-mini", 0.15, 0.075, 0.6],
  ["gpt-4o", 2.5, 1.25, 10],
  ["o4-mini", 1.1, 0.275, 4.4],
  ["o3", 2, 0.5, 8],
];

/** TypeSafe's published rate for JEV: input only, output is free */
const JEV_INPUT = 0.042;

export const emptyUsage = (): Usage => ({ openai: {}, jev: 0 });

export const hasUsage = (u: Usage | null | undefined) => !!u && (u.jev > 0 || Object.keys(u.openai).length > 0);

export function mergeUsage(a: Usage | null | undefined, b: Usage | null | undefined): Usage {
  const out: Usage = { openai: { ...(a?.openai ?? {}) }, jev: (a?.jev ?? 0) + (b?.jev ?? 0) };
  for (const [model, t] of Object.entries(b?.openai ?? {})) {
    const prev: TokenCount = out.openai[model] ?? { input: 0, cached: 0, output: 0 };
    out.openai[model] = { input: prev.input + t.input, cached: prev.cached + t.cached, output: prev.output + t.output };
  }
  return out;
}

const priceOf = (model: string) => OPENAI.find(([prefix]) => model.toLowerCase().startsWith(prefix));

export interface Cost {
  openai: number;
  jev: number;
  total: number;
  /** Models with no known price (their tokens are not in the total) */
  unpriced: string[];
}

export function costOf(u: Usage): Cost {
  let openai = 0;
  const unpriced: string[] = [];
  for (const [model, t] of Object.entries(u.openai)) {
    const p = priceOf(model);
    if (!p) unpriced.push(model);
    else openai += (t.input * p[1] + t.cached * p[2] + t.output * p[3]) / 1e6;
  }
  const jev = (u.jev * JEV_INPUT) / 1e6;
  return { openai, jev, total: openai + jev, unpriced };
}
