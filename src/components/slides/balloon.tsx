"use client";

/**
 * Speech balloon drawn as one outline: the ellipse opens where the tail comes out, so the tail
 * joins the balloon with no line across it. The shape is computed from the balloon's measured
 * size and drawn a little larger than the text box, so no word ever touches the edge.
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Variant = "hand" | "ink";

/** Ellipse around the box (rx, ry as a share of half the box), open around `base` degrees for the tail */
function balloonPath(w: number, h: number, variant: Variant, tail: "left" | "right") {
  const cx = w / 2;
  const cy = h / 2;
  const rx = (w / 2) * 1.1;
  const ry = (h / 2) * 1.22;
  // 90° is straight down; the tail leaves from the lower left or lower right
  const base = tail === "left" ? 122 : 58;
  const half = variant === "hand" ? 9 : 8;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  // A hand-drawn outline breathes a little; an inked one stays true
  const wobble = (a: number) => (variant === "hand" ? 1 + 0.018 * Math.sin(3 * a + 1.3) + 0.01 * Math.sin(7 * a) : 1);
  const at = (deg: number): [number, number] => {
    const a = rad(deg);
    return [cx + rx * wobble(a) * Math.cos(a), cy + ry * wobble(a) * Math.sin(a)];
  };
  const steps = 96;
  const from = base + half;
  const sweep = 360 - 2 * half;
  const pts = Array.from({ length: steps + 1 }, (_, i) => at(from + (sweep * i) / steps));
  const tip: [number, number] = [cx + (tail === "left" ? -1 : 1) * rx * 0.62, cy + ry + Math.min(110, 40 + h * 0.18)];
  const f = (p: [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const end = pts[pts.length - 1];
  const start = pts[0];
  let d = `M${f(start)}`;
  for (const p of pts.slice(1)) d += ` L${f(p)}`;
  // Tail: out to the tip and back, slightly curved so it reads as drawn
  const bend = tail === "left" ? -14 : 14;
  d += ` Q${f([(end[0] + tip[0]) / 2 + bend, (end[1] + tip[1]) / 2])} ${f(tip)}`;
  d += ` Q${f([(start[0] + tip[0]) / 2 + bend, (start[1] + tip[1]) / 2])} ${f(start)} Z`;
  return d;
}

export function Balloon({ variant, tail = "left", className, children }: { variant: Variant; tail?: "left" | "right"; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // offset sizes ignore the zoom transform, so the path is in slide pixels
    const measure = () => setBox((b) => (b && b.w === el.offsetWidth && b.h === el.offsetHeight ? b : { w: el.offsetWidth, h: el.offsetHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={`balloon balloon-${variant} ${className ?? ""}`}>
      {box && (
        <svg className="balloon-shape" width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden>
          <path d={balloonPath(box.w, box.h, variant, tail)} />
        </svg>
      )}
      <div className="balloon-text">{children}</div>
    </div>
  );
}
