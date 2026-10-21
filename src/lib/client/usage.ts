"use client";

import { hasUsage, mergeUsage } from "../pricing";
import type { Usage } from "../types";
import { useCarousel } from "@/store/carousel";

/** Spent before the carousel exists (reading the article); handed over when it is created */
let pending: Usage | null = null;

export function recordUsage(u: Usage | null | undefined) {
  if (!hasUsage(u)) return;
  const s = useCarousel.getState();
  if (s.carousel && s.carousel.id !== "demo") s.addUsage(u!);
  else if (!s.carousel) pending = mergeUsage(pending, u);
}

export function takePendingUsage(): Usage | undefined {
  const u = pending ?? undefined;
  pending = null;
  return u;
}

export function usageFromHeader(res: Response): Usage | null {
  const raw = res.headers.get("x-usage");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Usage;
  } catch {
    return null;
  }
}
