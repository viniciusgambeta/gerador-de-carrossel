"use client";

/**
 * Magnetic alignment while the user drags or resizes something on a slide: edges and centers
 * pull toward the slide's middle and margins and toward the edges and centers of every other
 * element, and the lines they lock onto are drawn across the slide. Alt drags freely.
 */

import type { PointerEvent as ReactPointerEvent } from "react";
import { create } from "zustand";
import { SLIDE_H, SLIDE_W } from "@/lib/constants";

interface GuidesState {
  slideId: string | null;
  xs: number[];
  ys: number[];
  show: (slideId: string, xs: number[], ys: number[]) => void;
  clear: () => void;
}

/** Lines currently locked onto, in slide pixels */
export const useGuides = create<GuidesState>()((set) => ({
  slideId: null,
  xs: [],
  ys: [],
  show: (slideId, xs, ys) => set({ slideId, xs, ys }),
  clear: () => set({ slideId: null, xs: [], ys: [] }),
}));

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** Screen pixels the pull reaches */
const REACH = 7;

/** Where an element sits on the slide, in slide pixels (whatever the on-screen zoom) */
export function boxOf(slide: HTMLElement, el: Element): Box {
  const s = slide.getBoundingClientRect();
  const zoom = s.width / SLIDE_W || 1;
  const r = el.getBoundingClientRect();
  return { l: (r.left - s.left) / zoom, t: (r.top - s.top) / zoom, r: (r.right - s.left) / zoom, b: (r.bottom - s.top) / zoom };
}

/** Lines worth aligning to: the slide's edges, middle and margins, and every other element's edges and center */
export function snapLines(slide: HTMLElement, self: Element) {
  const xs = [0, 80, SLIDE_W / 2, SLIDE_W - 80, SLIDE_W];
  const ys = [0, SLIDE_H / 2, SLIDE_H];
  slide.querySelectorAll("[data-block], [data-extra]").forEach((el) => {
    if (el === self || el.contains(self) || self.contains(el)) return;
    const b = boxOf(slide, el);
    if (b.r - b.l < 1 || b.b - b.t < 1) return;
    xs.push(b.l, (b.l + b.r) / 2, b.r);
    ys.push(b.t, (b.t + b.b) / 2, b.b);
  });
  return { xs, ys };
}

/** Shift that lands the closest of `values` on one of `lines` (0 when none is within reach), and the lines it lands on */
export function snapAxis(values: number[], lines: number[], reach: number) {
  let best: number | null = null;
  for (const v of values)
    for (const l of lines) {
      const d = l - v;
      if (Math.abs(d) <= reach && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
  if (best === null) return { shift: 0, at: [] as number[] };
  const shift = best;
  const at = [...new Set(lines.filter((l) => values.some((v) => Math.abs(v + shift - l) < 0.5)))];
  return { shift, at };
}

/** Pull reach in slide pixels for the current zoom */
export const reachFor = (scale: number) => REACH / (scale || 1);

/**
 * Tracks a drag from a pointerdown without capturing the pointer up front,
 * so a plain click / double-click still reaches the element under the cursor.
 */
export function trackDrag(
  e: ReactPointerEvent,
  handlers: { move: (dx: number, dy: number, ev: PointerEvent) => void; end: (moved: boolean) => void },
) {
  const sx = e.clientX;
  const sy = e.clientY;
  let moved = false;
  const onMove = (ev: PointerEvent) => {
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
    if (!moved) window.getSelection()?.removeAllRanges();
    moved = true;
    handlers.move(ev.clientX - sx, ev.clientY - sy, ev);
  };
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    useGuides.getState().clear();
    handlers.end(moved);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

/**
 * Drags an element (block or picture) by its translate/position, snapping its edges and center.
 * `from` is the element's current offset; `onMove` receives the snapped offset.
 */
export function dragWithSnap(
  e: ReactPointerEvent,
  el: HTMLElement,
  opts: { slideId: string; scale: number; from: { x: number; y: number }; onMove: (p: { x: number; y: number }) => void; onEnd: (p: { x: number; y: number }, moved: boolean) => void },
) {
  const slide = el.closest<HTMLElement>(".slide");
  if (!slide) return;
  const lines = snapLines(slide, el);
  const start = boxOf(slide, el);
  const reach = reachFor(opts.scale);
  let last = opts.from;
  trackDrag(e, {
    move: (dx, dy, ev) => {
      const mx = dx / opts.scale;
      const my = dy / opts.scale;
      const free = ev.altKey;
      const sx = free ? { shift: 0, at: [] } : snapAxis([start.l + mx, (start.l + start.r) / 2 + mx, start.r + mx], lines.xs, reach);
      const sy = free ? { shift: 0, at: [] } : snapAxis([start.t + my, (start.t + start.b) / 2 + my, start.b + my], lines.ys, reach);
      last = { x: Math.round(opts.from.x + mx + sx.shift), y: Math.round(opts.from.y + my + sy.shift) };
      opts.onMove(last);
      useGuides.getState().show(opts.slideId, sx.at, sy.at);
    },
    end: (moved) => opts.onEnd(last, moved),
  });
}
