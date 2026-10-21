"use client";

import { createContext, useContext } from "react";
import type { SlideTheme } from "@/lib/color";
import type { StyleId } from "@/lib/styles";
import type { ConnectorShape, DisplayPrefs, Language, LayoutId, Profile, Slide } from "@/lib/types";

export interface SlideCtxValue {
  slide: Slide;
  index: number;
  total: number;
  editable: boolean;
  /** Screen pixels per slide pixel */
  scale: number;
  profile: Profile;
  theme: SlideTheme;
  selected: string | null;
  fitKey: string;
  /** Carousel language, for the fixed words on slides ("Arraste", "Em resumo"…) */
  language: Language;
  style: StyleId;
  display: DisplayPrefs;
  connector: ConnectorShape;
  /** Distance from the bottom edge that content keeps clear (more when the connector runs there) */
  safeBottom: number;
  select: (block: string | null) => void;
  update: (fn: (s: Slide) => void, history?: boolean) => void;
}

export const SlideCtx = createContext<SlideCtxValue | null>(null);

export function useSlide() {
  const ctx = useContext(SlideCtx);
  if (!ctx) throw new Error("useSlide outside SlideCanvas");
  return ctx;
}

export function useSlideOf<L extends LayoutId>(_layout: L) {
  const ctx = useSlide();
  return { ...ctx, s: ctx.slide as Extract<Slide, { layout: L }> };
}

/**
 * Font size that follows the block's own scale (A-/A+), the slide auto-fit, the fit inside a box
 * the user gave a height (--bfit) and the style's type scale (--ts: handwriting needs bigger
 * letters than a grotesque, for instance).
 */
export const fs = (px: number) => `calc(${px}px * var(--fs, 1) * var(--fit, 1) * var(--bfit, 1) * var(--ts, 1))`;

/** Picks a size from [maxChars, size] steps */
export function sizeFor(text: string, steps: [number, number][], min: number) {
  const len = (text ?? "").replace(/\*\*/g, "").length;
  for (const [max, size] of steps) if (len <= max) return size;
  return min;
}

type Path = (string | number)[];
const split = (path: string): Path => path.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p));

export function getPath(obj: unknown, path: string): unknown {
  return split(path).reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string | number, unknown>)[k]), obj);
}

export function setPath(obj: unknown, path: string, value: unknown) {
  const keys = split(path);
  let o = obj as Record<string | number, unknown>;
  for (const k of keys.slice(0, -1)) o = o[k] as Record<string | number, unknown>;
  o[keys[keys.length - 1]] = value;
}
