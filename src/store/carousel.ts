"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { produce } from "immer";
import { useMemo } from "react";
import { hostOf } from "@/lib/prompts";
import { mergeUsage } from "@/lib/pricing";
import type { Carousel, Slide, Usage } from "@/lib/types";

export type Status = "idle" | "scraping" | "writing" | "ready";

interface CarouselState {
  carousel: Carousel | null;
  /** Last finished carousel, persisted so the user can come back to it */
  saved: Carousel | null;
  status: Status;
  sourceUrl: string;
  active: number;
  /** While generating, keep the newest slide in view until the user navigates */
  follow: boolean;
  selected: string | null;
  past: Carousel[];
  future: Carousel[];

  begin: (url: string) => void;
  setStatus: (status: Status) => void;
  setCarousel: (c: Carousel | null) => void;
  edit: (fn: (c: Carousel) => void, history?: boolean) => void;
  editSlide: (id: string, fn: (s: Slide) => void, history?: boolean) => void;
  setActive: (i: number, byUser?: boolean) => void;
  select: (block: string | null) => void;
  undo: () => void;
  redo: () => void;
  /** Tokens spent on the current carousel (outside undo history) */
  addUsage: (u: Usage) => void;
  goHome: () => void;
  resume: () => void;
}

const HISTORY = 60;

/** The sample carousel (?demo) never replaces the user's last carousel */
const keep = (c: Carousel | null, current: Carousel | null) => (c && c.id !== "demo" ? c : current);

/** Images that finished loading after a snapshot was taken survive undo/redo, and so does the spending. */
function keepLoadedImages(target: Carousel, current: Carousel | null): Carousel {
  if (!current) return target;
  return produce(target, (draft) => {
    draft.usage = current.usage;
    draft.slides.forEach((s) => {
      const now = current.slides.find((c) => c.id === s.id);
      if (s.imageStatus === "loading" && now && now.imageStatus !== "loading") {
        s.image = now.image;
        s.imageCandidates = now.imageCandidates;
        s.imageStatus = now.imageStatus;
      }
      if (s.imageStatus2 === "loading" && now && now.imageStatus2 !== "loading") {
        s.image2 = now.image2;
        s.imageCandidates2 = now.imageCandidates2;
        s.imageStatus2 = now.imageStatus2;
      }
    });
  });
}

export const useCarousel = create<CarouselState>()(
  persist(
    (set, get) => ({
      carousel: null,
      saved: null,
      status: "idle",
      sourceUrl: "",
      active: 0,
      follow: true,
      selected: null,
      past: [],
      future: [],

      begin: (url) =>
        set({ status: "scraping", sourceUrl: url, carousel: null, active: 0, follow: true, selected: null, past: [], future: [] }),
      setStatus: (status) => set((s) => ({ status, saved: status === "ready" ? keep(s.carousel, s.saved) : s.saved })),
      setCarousel: (carousel) => set((s) => ({ carousel, saved: s.status === "ready" ? keep(carousel, s.saved) : s.saved })),

      edit: (fn, history = true) => {
        const { carousel, past, status } = get();
        if (!carousel) return;
        const next = produce(carousel, fn);
        if (next === carousel) return;
        set({
          carousel: next,
          past: history ? [...past, carousel].slice(-HISTORY) : past,
          future: history ? [] : get().future,
          saved: status === "ready" ? keep(next, get().saved) : get().saved,
        });
      },
      editSlide: (id, fn, history = true) =>
        get().edit((c) => {
          const slide = c.slides.find((s) => s.id === id);
          if (slide) fn(slide);
        }, history),

      setActive: (i, byUser = true) => {
        const n = get().carousel?.slides.length ?? 0;
        const active = Math.max(0, Math.min(i, Math.max(0, n - 1)));
        set((s) => ({ active, selected: null, follow: byUser ? false : s.follow }));
      },
      select: (selected) => set({ selected }),

      undo: () => {
        const { past, carousel, future, active } = get();
        const prev = past.at(-1);
        if (!prev || !carousel) return;
        const restored = keepLoadedImages(prev, carousel);
        set({
          carousel: restored,
          past: past.slice(0, -1),
          future: [carousel, ...future].slice(0, HISTORY),
          saved: keep(restored, get().saved),
          selected: null,
          active: Math.min(active, restored.slides.length - 1),
        });
      },
      redo: () => {
        const { past, carousel, future, active } = get();
        const next = future[0];
        if (!next || !carousel) return;
        const restored = keepLoadedImages(next, carousel);
        set({
          carousel: restored,
          past: [...past, carousel].slice(-HISTORY),
          future: future.slice(1),
          saved: keep(restored, get().saved),
          selected: null,
          active: Math.min(active, restored.slides.length - 1),
        });
      },

      addUsage: (u) =>
        set((s) => {
          if (!s.carousel) return {};
          const carousel = { ...s.carousel, usage: mergeUsage(s.carousel.usage, u) };
          return { carousel, saved: s.status === "ready" ? keep(carousel, s.saved) : s.saved };
        }),

      goHome: () => set({ status: "idle", carousel: null, selected: null, past: [], future: [] }),
      resume: () => {
        const saved = get().saved;
        if (saved) set({ carousel: saved, status: "ready", active: 0, follow: false, selected: null, past: [], future: [] });
      },
    }),
    { name: "carrossel:last", partialize: (s) => ({ saved: s.saved }) },
  ),
);

export const activeSlide = (s: CarouselState) => s.carousel?.slides[s.active] ?? null;

const NO_SLIDES: Slide[] = [];
export const allSlides = (s: CarouselState) => s.carousel?.slides ?? NO_SLIDES;

/** News source shown on top of every slide (stable object, safe to pass to memoized slides) */
export function useSlideSource() {
  const article = useCarousel((s) => s.carousel?.article);
  return useMemo(
    () => (article ? { name: article.siteName || hostOf(article.url), favicon: article.favicon ?? null } : null),
    [article],
  );
}
