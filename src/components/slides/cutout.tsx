"use client";

/**
 * Something to fill the free room next to the text: an object with no background (Pixabay PNG)
 * or, without one, the slide's symbol icon drawn large. It never covers the text: after the slide
 * lays out it measures where the text ended up. On numbers and cliffhanger questions the object sits
 * in the bottom-right corner, over the connector line, as big as the text around it allows; elsewhere
 * it takes the largest free band above or below the text. Each style dresses it its way (CSS).
 */

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { removeCutout } from "@/lib/client/actions";
import { SLIDE_H, SLIDE_W } from "@/lib/constants";
import type { Slide } from "@/lib/types";
import { useSlide } from "./context";
import { SlideIcon } from "./icons";
import { Block } from "./parts";

/** Free area starts under the top chrome */
const TOP = 150;
const GAP = 34;

const SIZES = { object: { min: 170, max: 400 }, icon: { min: 210, max: 300 } };
/** Corner placement: right edge, sizes tried from big to small */
const CORNER_RIGHT = SLIDE_W - 46;
const CORNER_SIZES = [560, 520, 480, 440, 410, 380, 350, 320, 290, 260, 230, 200];

/** Layouts whose text stays centered and whose object goes to the bottom-right corner */
export const CORNER_LAYOUTS = new Set(["stat", "question"]);

/** The symbol icon shows when there is no photo and no object (a statement with an emoji has its own) */
export const fillsWithIcon = (s: Slide) =>
  !!s.fillIcon && !s.cutout && !s.image && s.layout !== "qa" && !(s.layout === "statement" && s.emoji);

type Rect = { l: number; t: number; r: number; b: number };

/**
 * Everything the object must not cover, in slide pixels: each line of text, plus bars, pictures and
 * small painted pieces. Wide cards that hold text are left out: their lines already count, so the
 * object may rest on a card's empty corner.
 */
function obstacles(slide: HTMLElement): Rect[] {
  const s = slide.getBoundingClientRect();
  const zoom = s.height / SLIDE_H || 1;
  const out: Rect[] = [];
  const add = (r: DOMRect) => r.width && r.height && out.push({ l: (r.left - s.left) / zoom, t: (r.top - s.top) / zoom, r: (r.right - s.left) / zoom, b: (r.bottom - s.top) / zoom });
  slide.querySelectorAll(".fitbox").forEach((box) => {
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) add(r);
    }
    box.querySelectorAll<HTMLElement | SVGElement>("*").forEach((el) => {
      if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) return;
      const cs = getComputedStyle(el);
      const painted =
        el instanceof SVGSVGElement || el.tagName === "IMG" || cs.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(cs.borderTopWidth) > 0 || cs.backgroundImage !== "none";
      if (!painted) return;
      const r = el.getBoundingClientRect();
      if (el.textContent?.trim() && r.width / zoom > 360) return;
      add(r);
    });
  });
  return out;
}

/** Vertical extent of everything inside the slide's fit boxes, in slide pixels */
function textBounds(slide: HTMLElement) {
  const s = slide.getBoundingClientRect();
  const zoom = s.height / SLIDE_H || 1;
  let top = Infinity;
  let bottom = -Infinity;
  slide.querySelectorAll(".fitbox").forEach((box) => {
    for (const k of box.children) {
      const r = k.getBoundingClientRect();
      if (!r.height) continue;
      top = Math.min(top, (r.top - s.top) / zoom);
      bottom = Math.max(bottom, (r.bottom - s.top) / zoom);
    }
  });
  return top === Infinity ? null : { top, bottom };
}

type Bounds = { l: number; t: number; r: number; b: number };
const BOUNDS = new Map<string, Bounds>();

/** Where the visible part of a transparent PNG is, as fractions of the picture (stock PNGs carry wide empty margins) */
function useVisibleBounds(url: string | undefined) {
  const [bounds, setBounds] = useState<Bounds | null>(url ? (BOUNDS.get(url) ?? null) : null);
  useEffect(() => {
    if (!url) return setBounds(null);
    const known = BOUNDS.get(url);
    if (known) return setBounds(known);
    let alive = true;
    const pic = new Image();
    pic.crossOrigin = "anonymous";
    pic.onload = () => {
      const S = 160;
      const k = S / Math.max(pic.naturalWidth, pic.naturalHeight);
      const w = Math.max(1, Math.round(pic.naturalWidth * k));
      const h = Math.max(1, Math.round(pic.naturalHeight * k));
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const g = cv.getContext("2d", { willReadFrequently: true });
      if (!g) return;
      g.drawImage(pic, 0, 0, w, h);
      let data: Uint8ClampedArray;
      try {
        data = g.getImageData(0, 0, w, h).data;
      } catch {
        return; // a picture from another origin cannot be read; it shows as it is
      }
      let l = w, t = h, r = -1, b = -1;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (data[(y * w + x) * 4 + 3] > 24) {
            if (x < l) l = x;
            if (x > r) r = x;
            if (y < t) t = y;
            if (y > b) b = y;
          }
      const found = r < 0 ? { l: 0, t: 0, r: 1, b: 1 } : { l: l / w, t: t / h, r: (r + 1) / w, b: (b + 1) / h };
      BOUNDS.set(url, found);
      if (alive) setBounds(found);
    };
    pic.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return bounds;
}

/** The picture scaled so its visible part fills the box: anchored to the bottom-right corner, or centered */
function fillBox(bounds: Bounds | null, box: number, natural: { w: number; h: number }, corner: boolean): CSSProperties | undefined {
  if (!bounds) return undefined;
  const vw = (bounds.r - bounds.l) * natural.w;
  const vh = (bounds.b - bounds.t) * natural.h;
  if (vw <= 0 || vh <= 0) return undefined;
  const k = Math.min(box / vw, box / vh);
  const w = natural.w * k;
  const h = natural.h * k;
  const left = corner ? box - bounds.r * w : (box - vw * k) / 2 - bounds.l * w;
  const top = corner ? box - bounds.b * h : (box - vh * k) / 2 - bounds.t * h;
  return {
    position: "absolute",
    left,
    top,
    width: w,
    height: h,
    maxWidth: "none",
    objectFit: "fill",
    transformOrigin: `${((bounds.l + bounds.r) / 2) * 100}% ${((bounds.t + bounds.b) / 2) * 100}%`,
  };
}

export function Cutout() {
  const { slide, editable, index, fitKey, safeBottom } = useSlide();
  const img = slide.cutout;
  const icon = fillsWithIcon(slide) ? slide.fillIcon! : null;
  const kind = img ? "object" : "icon";
  const corner = CORNER_LAYOUTS.has(slide.layout);
  const { min, max } = SIZES[kind];
  const BOTTOM = SLIDE_H - safeBottom - 10;
  // In the corner the object stands over the connector's run, just above the footer
  const cornerBottom = SLIDE_H - 96;
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; size: number; left?: number } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const bounds = useVisibleBounds(img?.url);

  useLayoutEffect(() => {
    const el = ref.current?.closest<HTMLElement>(".slide");
    if ((!img && !icon) || !el) return;
    const measure = () => {
      if (corner) {
        const walls = obstacles(el);
        const pad = 18;
        const size = CORNER_SIZES.find((s) => {
          const box = { l: CORNER_RIGHT - s - pad, t: cornerBottom - s - pad, r: CORNER_RIGHT, b: cornerBottom };
          return !walls.some((w) => w.l < box.r && w.r > box.l && w.t < box.b && w.b > box.t);
        });
        return setPlace(size ? { top: cornerBottom - size, size, left: CORNER_RIGHT - size } : null);
      }
      const b = textBounds(el);
      if (!b) return setPlace(null);
      const below = BOTTOM - b.bottom - GAP;
      const above = b.top - TOP - GAP;
      const room = Math.max(below, above);
      if (room < min) return setPlace(null);
      const size = Math.min(max, room);
      setPlace(below >= above ? { top: b.bottom + GAP + (below - size) / 2, size } : { top: TOP + (above - size) / 2, size });
    };
    measure();
    // Runs after the fit boxes, which re-measure themselves when fonts arrive
    let alive = true;
    const again = () => alive && measure();
    document.fonts?.ready.then(again);
    document.fonts?.addEventListener?.("loadingdone", again);
    return () => {
      alive = false;
      document.fonts?.removeEventListener?.("loadingdone", again);
    };
  }, [img, icon, fitKey, BOTTOM, min, max, corner, cornerBottom]);

  if (!img && !icon) return null;
  const scale = slide.overrides?.cutout?.scale ?? 1;
  const size = (place?.size ?? min) * scale;
  const side = corner ? "corner" : index % 2 ? "left" : "right";
  return (
    <div
      ref={ref}
      className={`cutout cutout-${kind} cutout-${side}`}
      style={{ top: place?.top ?? TOP, left: place?.left, width: size, height: size, visibility: place ? undefined : "hidden" }}
    >
      <Block id="cutout">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.url}
            alt={img.alt}
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={natural ? fillBox(bounds, size, natural, corner) : undefined}
          />
        ) : (
          <span className="filler-icon">
            <SlideIcon name={icon!} size={Math.round(size * 0.46)} strokeWidth={1.6} />
          </span>
        )}
      </Block>
      {editable && (
        <button className="cutout-remove" onPointerDown={(e) => e.stopPropagation()} onClick={() => removeCutout(slide.id)} aria-label="Remover">
          <X size={18} strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
}
