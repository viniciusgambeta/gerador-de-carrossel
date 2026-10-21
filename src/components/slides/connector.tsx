"use client";

/**
 * A line that runs through the whole carousel. On each slide it comes in through the left edge,
 * goes down the left margin, along a run under the content, up the right margin and out through
 * the right edge at the height where the next slide picks it up, so the slides join up when swiped.
 *
 * The user picks the shape (straight, curved corners, organic) and can drag the crossings and the
 * run in the editor; a crossing belongs to the slide on its left, so both neighbours always agree.
 * Each style draws the stroke its own way (color, width, dashes, end marks, nodes).
 */

import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { SLIDE_H, SLIDE_W } from "@/lib/constants";
import type { StyleId } from "@/lib/styles";
import type { ConnectorShape } from "@/lib/types";
import { useCarousel } from "@/store/carousel";
import { useSlide } from "./context";

type Pt = [number, number];
type Cap = "dot" | "ring" | "square" | "arrow";

/** Content keeps this far from the bottom edge while the connector is on (150 without it) */
export const SAFE_BOTTOM_WITH_CONNECTOR = 252;
/** Default height of the run: midway between the content and the footer */
const RUN = 1176;

interface Stroke {
  width: number;
  color: string;
  dash?: string;
  cap?: "round" | "butt";
  start: Cap;
  end: Cap;
  /** x of the left and right margins the line travels in */
  lx: number;
  rx: number;
  /** Small circles where the line turns */
  nodes?: boolean;
  /** Ink outline under the line, with a solid offset shadow */
  outline?: boolean;
  /** Drawn by hand: a little shaky, with a loop when organic */
  hand?: boolean;
  className?: string;
}

const ACCENT = "var(--accent)";
const INK = "var(--fg)";
const M = { lx: 56, rx: 1024 };

const STROKES: Record<StyleId, Stroke> = {
  modern: { ...M, width: 7, color: ACCENT, cap: "round", start: "dot", end: "arrow" },
  minimal: { lx: 64, rx: 1016, width: 2, color: INK, cap: "round", start: "ring", end: "dot" },
  sketch: { lx: 34, rx: 1042, width: 5, color: INK, cap: "round", start: "dot", end: "arrow", hand: true },
  newspaper: { lx: 36, rx: 1044, width: 6, color: INK, dash: "0 14", cap: "round", start: "square", end: "square" },
  collage: { ...M, width: 7, color: ACCENT, dash: "24 14", cap: "round", start: "dot", end: "arrow", className: "cn-lift" },
  swiss: { lx: 48, rx: 1032, width: 14, color: ACCENT, cap: "butt", start: "square", end: "square" },
  tech: { ...M, width: 4, color: ACCENT, cap: "round", start: "ring", end: "ring", nodes: true, className: "cn-glow" },
  orbital: { lx: 40, rx: 1040, width: 2.5, color: ACCENT, dash: "12 7", cap: "butt", start: "ring", end: "ring", nodes: true },
  manga: { lx: 40, rx: 1040, width: 8, color: INK, cap: "butt", start: "square", end: "arrow" },
  mde: { ...M, width: 6, color: ACCENT, cap: "round", start: "dot", end: "dot" },
  brutalist: { ...M, width: 10, color: ACCENT, cap: "round", start: "square", end: "arrow", outline: true },
  canvas: { ...M, width: 4, color: ACCENT, cap: "round", start: "ring", end: "arrow" },
};

/** Default heights where the line crosses from one slide to the next (0 = along the run) */
const CROSSINGS = [0, 780, 0, 540, 980, 0, 660, 1080, 460];
/** Into the last slide (CTA) it arrives mid-height and ends right away, clear of its arrows */
const INTO_LAST = 700;

const clampY = (y: number) => Math.max(170, Math.min(1290, Math.round(y)));
const clampX = (x: number) => Math.max(30, Math.min(900, Math.round(x)));

function defaultCrossing(boundary: number, total: number) {
  if (boundary === total - 2) return INTO_LAST;
  return CROSSINGS[boundary % CROSSINGS.length] || RUN;
}

const n = (v: number) => Math.round(v * 10) / 10;
const at = (p: Pt) => `${n(p[0])} ${n(p[1])}`;
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const len = (v: Pt) => Math.hypot(v[0], v[1]);

/* ───────────── Shapes ───────────── */

/**
 * Turning points of the straight route: edge → left margin → run → right margin → edge.
 * The first slide starts wherever the user put the start point and drops down to the run.
 */
function route(yIn: number | null, yOut: number | null, run: number, { lx, rx }: Stroke, start: Pt): Pt[] {
  const pts: Pt[] = [];
  if (yIn === null) pts.push(start, [start[0], run]);
  else if (yOut === null) return [[0, yIn], [lx + 28, yIn]];
  else pts.push([0, yIn], [lx, yIn], [lx, run]);
  if (yOut !== null) pts.push([rx, run], [rx, yOut], [SLIDE_W, yOut]);
  return pts.filter((p, i, all) => {
    const a = all[i - 1];
    const b = all[i + 1];
    if (a && a[0] === p[0] && a[1] === p[1]) return false;
    return !(a && b && ((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1])));
  });
}

/** Where each turn starts and ends when its corner is cut or rounded */
function corners(pts: Pt[], radius: number) {
  return pts.slice(1, -1).map((p, k) => {
    const i = k + 1;
    const a = pts[i - 1];
    const b = pts[i + 1];
    const la = len(sub(p, a));
    const lb = len(sub(b, p));
    // A run that touches an end of the line can be used whole, a shared run only by half
    const r = Math.min(radius, i === 1 ? la : la / 2, i === pts.length - 2 ? lb : lb / 2);
    const ua = sub(p, a).map((v) => v / la) as Pt;
    const ub = sub(b, p).map((v) => v / lb) as Pt;
    return { p, p1: [p[0] - ua[0] * r, p[1] - ua[1] * r] as Pt, p2: [p[0] + ub[0] * r, p[1] + ub[1] * r] as Pt };
  });
}

/** Points for the organic shape; the first and last are off-slide guides that keep the edges level */
function flowPoints(yIn: number | null, yOut: number | null, run: number, { lx, rx }: Stroke, seed: number, start: Pt): Pt[] {
  if (yIn !== null && yOut === null) return [[-90, yIn], [0, yIn], [lx + 14, yIn + 2], [lx + 28, yIn], [lx + 120, yIn]];
  const pts: Pt[] = [];
  if (yIn === null) {
    const [sx, sy] = start;
    pts.push([sx - 60, sy], start);
    if (Math.abs(sy - run) > 20) pts.push([sx + 16, sy + (run - sy) * 0.55], [sx + 170, run]);
  } else pts.push([-90, yIn], [0, yIn], [lx + 16, yIn + (run - yIn) * 0.55], [lx + 170, run]);
  // The run sways gently, a different way on each slide
  const x0 = pts[pts.length - 1][0];
  const x1 = rx - 170;
  const sway = seed % 2 ? 18 : -18;
  for (let k = 1; k <= 3; k++) pts.push([x0 + ((x1 - x0) * k) / 4, run + (k % 2 ? sway : -sway)]);
  pts.push([x1, run], [rx - 16, (yOut ?? run) + (run - (yOut ?? run)) * 0.55], [SLIDE_W, yOut ?? run], [SLIDE_W + 90, yOut ?? run]);
  return pts;
}

/** Smooth curve through points (Catmull-Rom); `skipEnds` leaves the off-slide guides out */
function smooth(pts: Pt[], skipEnds: boolean) {
  const from = skipEnds ? 1 : 0;
  const to = skipEnds ? pts.length - 2 : pts.length - 1;
  let d = `M${at(pts[from])}`;
  for (let i = from; i < to; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${at(c1)} ${at(c2)} ${at(p2)}`;
  }
  return d;
}

/** Hand-drawn: sample the line, shake it a little (never at the edges), curl a loop into the run */
function handDrawn(pts: Pt[], radius: number, run: number, loop: boolean, seed: number) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280) * 2 - 1;
  const samples: Pt[] = [pts[0]];
  const line = (a: Pt, b: Pt) => {
    const steps = Math.max(1, Math.round(len(sub(b, a)) / 70));
    for (let i = 1; i <= steps; i++) samples.push([a[0] + ((b[0] - a[0]) * i) / steps, a[1] + ((b[1] - a[1]) * i) / steps]);
  };
  const loopX = 560 + (seed % 2 ? 90 : -90);
  let looped = false;
  const runLine = (a: Pt, b: Pt) => {
    if (!loop || looped || a[1] !== run || b[1] !== run || a[0] > loopX - 60 || b[0] < loopX + 64) return line(a, b);
    looped = true;
    line(a, [loopX - 60, run]);
    samples.push([loopX, run + 4], [loopX + 40, run + 30], [loopX + 34, run + 70], [loopX - 2, run + 82], [loopX - 34, run + 58], [loopX - 26, run + 22], [loopX + 14, run + 6], [loopX + 64, run]);
    line([loopX + 64, run], b);
  };
  let from = pts[0];
  for (const { p, p1, p2 } of corners(pts, radius)) {
    runLine(from, p1);
    for (const t of [0.3, 0.7]) {
      const u = 1 - t;
      samples.push([u * u * p1[0] + 2 * u * t * p[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * p[1] + t * t * p2[1]]);
    }
    samples.push(p2);
    from = p2;
  }
  runLine(from, pts[pts.length - 1]);
  const shaken = samples.map((p, i) => (i < 2 || i > samples.length - 3 ? p : ([p[0] + rnd() * 3.5, p[1] + rnd() * 3.5] as Pt)));
  return smooth(shaken, false);
}

function geometric(pts: Pt[], shape: ConnectorShape, radius: number) {
  let d = `M${at(pts[0])}`;
  for (const { p, p1, p2 } of corners(pts, radius)) {
    if (shape === "straight") d += ` L${at(p)}`;
    else d += ` L${at(p1)} Q${at(p)} ${at(p2)}`;
  }
  return d + ` L${at(pts[pts.length - 1])}`;
}

/* ───────────── Drawing ───────────── */

function CapMark({ kind, p, from, stroke }: { kind: Cap; p: Pt; from: Pt; stroke: Stroke }) {
  const w = stroke.width;
  if (kind === "dot") return <circle cx={p[0]} cy={p[1]} r={Math.max(7, w * 1.9)} fill={stroke.color} />;
  if (kind === "ring") return <circle cx={p[0]} cy={p[1]} r={Math.max(9, w * 2.6)} fill="var(--bg)" stroke={stroke.color} strokeWidth={Math.max(2, w)} />;
  if (kind === "square") {
    const s = Math.max(14, w * 2.4);
    return <rect x={p[0] - s / 2} y={p[1] - s / 2} width={s} height={s} fill={stroke.color} />;
  }
  const a = Math.atan2(p[1] - from[1], p[0] - from[0]);
  const l = Math.max(22, w * 3.4);
  const wing = (sign: number): Pt => [p[0] - l * Math.cos(a + sign * 0.7), p[1] - l * Math.sin(a + sign * 0.7)];
  return (
    <path
      d={`M${at(wing(1))} L${at(p)} L${at(wing(-1))}`}
      fill="none"
      stroke={stroke.color}
      strokeWidth={Math.max(3, w)}
      strokeLinecap={stroke.cap === "butt" ? "square" : "round"}
      strokeLinejoin="round"
    />
  );
}

type Handle = "in" | "out" | "run" | "start";

export function Connector() {
  const { slide, index, total, style, connector: shape, editable, scale } = useSlide();
  const prev = useCarousel((s) => (index > 0 ? s.carousel?.slides[index - 1] : undefined));
  const [live, setLive] = useState<{ handle: Handle; x: number; y: number } | null>(null);
  if (total < 2 || shape === "none") return null;

  const stroke = STROKES[style] ?? STROKES.modern;
  const pick = (h: Handle, y: number) => (live?.handle === h ? live.y : y);
  const yIn = index > 0 ? pick("in", prev?.link?.out ?? defaultCrossing(index - 1, total)) : null;
  const yOut = index < total - 1 ? pick("out", slide.link?.out ?? defaultCrossing(index, total)) : null;
  const run = pick("run", slide.link?.run ?? RUN);
  const last = yOut === null && yIn !== null;
  // The first slide's line starts wherever the user dropped the start point (on the run by default)
  const saved = slide.link?.start;
  const start: Pt = live?.handle === "start" ? [live.x, live.y] : saved ? [saved.x, saved.y] : [stroke.lx + 44, run];

  const pts = route(yIn, yOut, run, stroke, start);
  const radius = shape === "straight" ? 0 : 90;
  let d: string;
  if (shape === "organic" && !stroke.hand) d = smooth(flowPoints(yIn, yOut, run, stroke, index + 1, start), true);
  else if (stroke.hand) d = handDrawn(pts, shape === "straight" ? 8 : radius, run, shape === "organic", index + 1);
  else d = geometric(pts, shape, radius);

  const first = pts[0];
  const end = pts[pts.length - 1];
  const line = { fill: "none", strokeLinecap: stroke.cap ?? "round", strokeLinejoin: shape === "straight" ? "miter" : "round" } as const;

  /**
   * Dragging a handle moves that height (the start point moves freely); the crossing on the left
   * belongs to the previous slide
   */
  const drag = (h: Handle, x0: number, y0: number) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let x = x0;
    let y = y0;
    const move = (ev: PointerEvent) => {
      y = clampY(y0 + (ev.clientY - sy) / scale);
      if (h === "start") x = clampX(x0 + (ev.clientX - sx) / scale);
      setLive({ handle: h, x, y });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setLive(null);
      if (y === y0 && x === x0) return;
      const target = h === "in" ? prev?.id : slide.id;
      if (!target) return;
      useCarousel.getState().editSlide(target, (s) => {
        s.link = h === "start" ? { ...s.link, start: { x, y } } : { ...s.link, [h === "run" ? "run" : "out"]: y };
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  /** Double-click puts a handle back where it was */
  const reset = (h: Handle) => () => {
    const target = h === "in" ? prev?.id : slide.id;
    if (!target) return;
    useCarousel.getState().editSlide(target, (s) => {
      const link = { ...s.link };
      delete link[h === "run" ? "run" : h === "start" ? "start" : "out"];
      s.link = link;
    });
  };

  const handles: { h: Handle; x: number; y: number }[] = editable
    ? [
        ...(index === 0 ? [{ h: "start" as const, x: start[0], y: start[1] }] : []),
        ...(yIn !== null ? [{ h: "in" as const, x: 22, y: yIn }] : []),
        ...(!last ? [{ h: "run" as const, x: SLIDE_W / 2, y: run }] : []),
        ...(yOut !== null ? [{ h: "out" as const, x: SLIDE_W - 22, y: yOut }] : []),
      ]
    : [];

  return (
    <svg className={`connector ${stroke.className ?? ""}`} viewBox={`0 0 ${SLIDE_W} ${SLIDE_H}`} width={SLIDE_W} height={SLIDE_H} aria-hidden>
      {stroke.outline && (
        <>
          <path d={d} {...line} stroke={INK} strokeWidth={stroke.width + 8} transform="translate(6 6)" />
          <path d={d} {...line} stroke={INK} strokeWidth={stroke.width + 8} />
        </>
      )}
      <path d={d} {...line} stroke={stroke.color} strokeWidth={stroke.width} strokeDasharray={stroke.dash} />
      {stroke.nodes &&
        shape !== "organic" &&
        pts.slice(1, -1).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={stroke.width + 5} fill="var(--bg)" stroke={stroke.color} strokeWidth={stroke.width} />)}
      {index === 0 && <CapMark kind={stroke.start} p={first} from={pts[1] ?? [first[0] + 1, first[1]]} stroke={stroke} />}
      {index === total - 1 && <CapMark kind={stroke.end} p={end} from={pts[pts.length - 2] ?? [end[0] - 1, end[1]]} stroke={stroke} />}
      {/* About 13 screen pixels whatever the zoom */}
      {handles.map(({ h, x, y }) => (
        <g key={h} className={`cn-handle${h === "start" ? " cn-handle-free" : ""}`} onPointerDown={drag(h, x, y)} onDoubleClick={reset(h)}>
          <title>
            {h === "start" ? "Arraste para escolher onde a linha começa" : "Arraste para ajustar a linha"}; clique duas vezes para voltar ao original
          </title>
          <circle cx={x} cy={y} r={13 / Math.max(scale, 0.1)} />
          {h !== "start" && <path d={`M${x} ${y - 5 / Math.max(scale, 0.1)} V${y + 5 / Math.max(scale, 0.1)}`} />}
        </g>
      ))}
    </svg>
  );
}
