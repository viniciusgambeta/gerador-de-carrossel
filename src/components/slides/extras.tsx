"use client";

/** Pictures the user added on top of a slide: drag to move, corners to resize (keeping proportions) */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { updateExtra } from "@/lib/client/edits";
import type { ExtraImage } from "@/lib/types";
import { useSlide } from "./context";
import { cx } from "./kit";
import { dragWithSnap, reachFor, snapAxis, snapLines, trackDrag, useGuides } from "./snap";

const CORNERS = ["nw", "ne", "sw", "se"] as const;
const MIN_W = 60;

export function Extras() {
  const { slide } = useSlide();
  if (!slide.extras?.length) return null;
  return (
    <>
      {slide.extras.map((x) => (
        <Extra key={x.id} extra={x} />
      ))}
    </>
  );
}

function Extra({ extra }: { extra: ExtraImage }) {
  const { slide, editable, scale, selected, select, display } = useSlide();
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<{ x: number; y: number; w: number } | null>(null);
  const g = live ?? extra;
  const key = `extra:${extra.id}`;
  const isSelected = editable && selected === key;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable || e.button !== 0 || !ref.current) return;
    if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
    e.stopPropagation();
    dragWithSnap(e, ref.current, {
      slideId: slide.id,
      scale,
      from: { x: extra.x, y: extra.y },
      onMove: (p) => setLive({ ...p, w: extra.w }),
      onEnd: (p, moved) => {
        if (moved) updateExtra(slide.id, extra.id, p);
        select(key);
        setLive(null);
      },
    });
  };

  const startResize = (e: ReactPointerEvent, corner: (typeof CORNERS)[number]) => {
    const el = ref.current;
    const slideEl = el?.closest<HTMLElement>(".slide");
    if (!el || !slideEl || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const lines = snapLines(slideEl, el);
    const reach = reachFor(scale);
    const { x: x0, y: y0, w: w0, ratio } = extra;
    const right = x0 + w0;
    const bottom = y0 + w0 / ratio;
    const east = corner.includes("e");
    const south = corner.includes("s");
    let last = { x: x0, y: y0, w: w0 };
    trackDrag(e, {
      move: (dx, dy, ev) => {
        // Whichever direction pulls more decides the new width
        const byX = (east ? dx : -dx) / scale;
        const byY = ((south ? dy : -dy) / scale) * ratio;
        let w = w0 + (Math.abs(byX) >= Math.abs(byY) ? byX : byY);
        const edge = east ? x0 + w : right - w;
        const s = ev.altKey ? { shift: 0, at: [] as number[] } : snapAxis([edge], lines.xs, reach);
        w = Math.max(MIN_W, w + (east ? s.shift : -s.shift));
        const h = w / ratio;
        last = { x: Math.round(east ? x0 : right - w), y: Math.round(south ? y0 : bottom - h), w: Math.round(w) };
        setLive(last);
        useGuides.getState().show(slide.id, s.at, []);
      },
      end: (moved) => {
        if (moved) updateExtra(slide.id, extra.id, last);
        select(key);
        setLive(null);
      },
    });
  };

  return (
    <div
      ref={ref}
      data-extra={extra.id}
      className={cx("extra", editable && "extra-editable", isSelected && "is-selected", live && "is-dragging")}
      style={{ left: g.x, top: g.y, width: g.w, height: g.w / extra.ratio }}
      onPointerDown={onPointerDown}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={extra.image.url} alt={extra.image.alt} draggable={false} />
      {display.imageCredit && extra.image.credit && <span className="extra-credit">{extra.image.credit}</span>}
      {isSelected && !live && CORNERS.map((c) => <i key={c} className={`bk-handle bk-${c}`} data-nodrag onPointerDown={(e) => startResize(e, c)} />)}
    </div>
  );
}
