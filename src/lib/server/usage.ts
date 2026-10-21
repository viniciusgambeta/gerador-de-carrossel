import { AsyncLocalStorage } from "node:async_hooks";
import { emptyUsage, hasUsage, mergeUsage } from "../pricing";
import type { Usage } from "../types";

/**
 * Tokens spent while handling one request. OpenAI and JEV calls add to whatever meter the
 * request runs under, so nothing has to pass it along; the client adds it up per carousel.
 */
const meter = new AsyncLocalStorage<{ usage: Usage }>();

/** OpenAI's `usage` object (Chat Completions) */
export function recordOpenAI(model: string, u: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } | undefined) {
  const box = meter.getStore();
  if (!box || !u) return;
  const cached = u.prompt_tokens_details?.cached_tokens ?? 0;
  box.usage = mergeUsage(box.usage, {
    openai: { [model]: { input: Math.max(0, (u.prompt_tokens ?? 0) - cached), cached, output: u.completion_tokens ?? 0 } },
    jev: 0,
  });
}

export function recordJev(tokens: number) {
  const box = meter.getStore();
  if (box && tokens > 0) box.usage = mergeUsage(box.usage, { openai: {}, jev: tokens });
}

export function currentUsage(): Usage | null {
  return meter.getStore()?.usage ?? null;
}

/** Runs a route handler under a fresh meter and reports what it spent in the `x-usage` header */
export function withUsage(handler: (req: Request) => Promise<Response>) {
  return (req: Request) =>
    meter.run({ usage: emptyUsage() }, async () => {
      const res = await handler(req);
      const usage = currentUsage();
      if (hasUsage(usage)) res.headers.set("x-usage", JSON.stringify(usage));
      return res;
    });
}

/** For streamed responses, where headers leave before the tokens are counted */
export function runMetered<T>(fn: () => T): T {
  return meter.run({ usage: emptyUsage() }, fn);
}
