"use client";

import { useSettings } from "@/store/settings";
import { recordUsage, usageFromHeader } from "./usage";

export class ClientError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export function apiHeaders(): Record<string, string> {
  const s = useSettings.getState();
  return {
    "Content-Type": "application/json",
    "x-openai-key": s.keys.openai.trim(),
    "x-openai-model": s.model.trim(),
    "x-quality": s.quality,
    "x-unsplash-key": s.keys.unsplash.trim(),
    "x-pixabay-key": (s.keys.pixabay ?? "").trim(),
    "x-jev-key": s.keys.jev.trim(),
    "x-postproxy-key": (s.keys.postproxy ?? "").trim(),
  };
}

export async function toError(res: Response) {
  let data: { error?: string; code?: string } | null = null;
  try {
    data = await res.json();
  } catch {}
  return new ClientError(data?.error ?? `Erro ${res.status}`, data?.code);
}

export async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: apiHeaders(), body: JSON.stringify(body), signal });
  recordUsage(usageFromHeader(res));
  if (!res.ok) throw await toError(res);
  return res.json() as Promise<T>;
}

export const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";
