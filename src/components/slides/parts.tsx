"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { parseRich, serializeRich } from "@/lib/richtext";
import { setBlockOverride } from "@/lib/client/edits";
import type { BlockOverride } from "@/lib/types";
import { getPath, setPath, useSlide } from "./context";
import { boxOf, dragWithSnap, reachFor, snapAxis, snapLines, trackDrag, useGuides } from "./snap";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ───────────── Rich text ───────────── */

export function Rich({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((seg, i) => {
        const lines = seg.text.split("\n");
        const body = lines.map((l, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {l}
          </Fragment>
        ));
        return seg.hl ? (
          <span key={i} className="hl" data-hl="1">
            {body}
          </span>
        ) : (
          <Fragment key={i}>{body}</Fragment>
        );
      })}
    </>
  );
}

/* ───────────── Editable text (double-click) ───────────── */

interface EditableProps {
  path: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

function placeCaret(el: HTMLElement, x: number, y: number) {
  const sel = window.getSelection();
  if (!sel) return;
  if (sel.rangeCount && el.contains(sel.anchorNode)) return; // keep the word the browser selected
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  let range: Range | null = null;
  if (doc.caretRangeFromPoint) range = doc.caretRangeFromPoint(x, y);
  else if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    if (p) {
      range = document.createRange();
      range.setStart(p.offsetNode, p.offset);
    }
  }
  if (!range || !el.contains(range.startContainer)) {
    range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

export function EditableText({ path, as: Tag = "div", className, style }: EditableProps) {
  const { slide, editable, update } = useSlide();
  const value = String(getPath(slide, path) ?? "");
  const ref = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState(false);
  // Remount after editing so React never reconciles DOM the browser changed
  const [version, setVersion] = useState(0);
  const clickAt = useRef<[number, number]>([0, 0]);
  const finished = useRef(false);

  useEffect(() => {
    if (!editing || !ref.current) return;
    finished.current = false;
    ref.current.focus({ preventScroll: true });
    placeCaret(ref.current, ...clickAt.current);
  }, [editing]);

  if (!value && !editing) return null;

  const finish = (save: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const el = ref.current;
    const next = el ? serializeRich(el) : value;
    setEditing(false);
    setVersion((v) => v + 1);
    if (save && next !== value) update((s) => setPath(s, path, next));
  };

  return (
    <Tag
      key={version}
      ref={ref}
      className={cx("editable", editing && "is-editing", className)}
      style={style}
      contentEditable={editing || undefined}
      suppressContentEditableWarning
      spellCheck={false}
      onDoubleClick={(e: React.MouseEvent) => {
        if (!editable || editing) return;
        e.stopPropagation();
        clickAt.current = [e.clientX, e.clientY];
        setEditing(true);
      }}
      onBlur={editing ? () => finish(true) : undefined}
      onKeyDown={
        editing
          ? (e: React.KeyboardEvent) => {
              e.stopPropagation();
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ref.current?.blur();
              } else if (e.key === "Escape") {
                e.preventDefault();
                finish(false);
              } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
                e.preventDefault();
                document.execCommand("bold");
              }
            }
          : undefined
      }
      onPaste={
        editing
          ? (e: React.ClipboardEvent) => {
              e.preventDefault();
              document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
            }
          : undefined
      }
    >
      <Rich text={value} />
    </Tag>
  );
}

/* ───────────── Draggable block ───────────── */

interface BlockProps {
  id: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const HANDLES: Handle[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const NO_OVERRIDE: BlockOverride = { x: 0, y: 0, scale: 1 };
const MIN_W = 80;
const MIN_H = 40;

/**
 * Anything the user can drag around a slide. Selected, it shows handles: the sides change the
 * box's width (text rewraps) or height (text shrinks to fit), the corners both. Edges and centers
 * snap to the slide and to the other blocks.
 */
export function Block({ id, className, style, children }: BlockProps) {
  const { slide, editable, scale, selected, select } = useSlide();
  const ov = slide.overrides?.[id] ?? NO_OVERRIDE;
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const hidden = !!slide.hidden?.includes(id);
  const pos = live ?? ov;

  // A box with a set height: the text inside shrinks until it fits
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty("--bfit");
    if (ov.h == null) return;
    // Bottom of the content itself (the selection handles poke out and must not count)
    const overflows = () => {
      let bottom = 0;
      for (const c of el.children) if (c instanceof HTMLElement && !c.classList.contains("bk-handle")) bottom = Math.max(bottom, c.offsetTop + c.offsetHeight);
      return bottom > el.clientHeight + 1;
    };
    const fit = () => {
      el.style.setProperty("--bfit", "1");
      let k = 1;
      for (let i = 0; i < 18 && overflows(); i++) {
        k *= 0.93;
        el.style.setProperty("--bfit", k.toFixed(3));
      }
    };
    fit();
    let raf = 0;
    const watch = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    });
    watch.observe(el);
    [...el.children].forEach((c) => watch.observe(c));
    return () => {
      cancelAnimationFrame(raf);
      watch.disconnect();
    };
  }, [ov.h, ov.w, hidden]);

  if (hidden) return null;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable || e.button !== 0 || !ref.current) return;
    if ((e.target as HTMLElement).closest('[contenteditable="true"], [data-nodrag]')) return;
    e.stopPropagation();
    dragWithSnap(e, ref.current, {
      slideId: slide.id,
      scale,
      from: { x: ov.x, y: ov.y },
      onMove: setLive,
      onEnd: (p, moved) => {
        if (moved) setBlockOverride(slide.id, id, p);
        select(id);
        setLive(null);
      },
    });
  };

  const startResize = (e: ReactPointerEvent, handle: Handle) => {
    const el = ref.current;
    const slideEl = el?.closest<HTMLElement>(".slide");
    if (!el || !slideEl || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const start = boxOf(slideEl, el);
    const w0 = el.offsetWidth;
    const h0 = el.offsetHeight;
    const lines = snapLines(slideEl, el);
    const reach = reachFor(scale);
    const horiz = handle.includes("e") || handle.includes("w");
    const vert = handle.includes("n") || handle.includes("s");
    let last: BlockOverride = ov;
    trackDrag(e, {
      move: (dx, dy, ev) => {
        const mx = dx / scale;
        const my = dy / scale;
        const snap = (v: number, axis: number[]) => (ev.altKey ? { shift: 0, at: [] as number[] } : snapAxis([v], axis, reach));
        let w = w0;
        let h = h0;
        let gx: number[] = [];
        let gy: number[] = [];
        if (handle.includes("e")) {
          const s = snap(start.r + mx, lines.xs);
          w = w0 + mx + s.shift;
          gx = s.at;
        } else if (handle.includes("w")) {
          const s = snap(start.l + mx, lines.xs);
          w = w0 - mx - s.shift;
          gx = s.at;
        }
        if (handle.includes("s")) {
          const s = snap(start.b + my, lines.ys);
          h = h0 + my + s.shift;
          gy = s.at;
        } else if (handle.includes("n")) {
          const s = snap(start.t + my, lines.ys);
          h = h0 - my - s.shift;
          gy = s.at;
        }
        w = Math.max(MIN_W, w);
        h = Math.max(MIN_H, h);
        if (horiz) Object.assign(el.style, { width: `${w}px`, maxWidth: "none", flex: "none" });
        if (vert) Object.assign(el.style, { height: `${h}px`, flex: "none" });
        // The layout may re-center the box sideways: keep the opposite side where it was. Vertically
        // the block stays in the flow of the slide, so the text around it moves along instead of overlapping.
        el.style.translate = `${ov.x}px ${ov.y}px`;
        const now = boxOf(slideEl, el);
        const x = horiz ? ov.x + (handle.includes("w") ? start.r - now.r : start.l - now.l) : ov.x;
        el.style.translate = `${x}px ${ov.y}px`;
        last = { ...ov, x: Math.round(x), ...(horiz ? { w } : {}), ...(vert ? { h } : {}) };
        useGuides.getState().show(slide.id, gx, gy);
      },
      end: (moved) => {
        if (moved) setBlockOverride(slide.id, id, last);
        select(id);
      },
    });
  };

  const isSelected = editable && selected === id;
  return (
    <div
      ref={ref}
      data-block={id}
      className={cx(
        "block",
        editable && "block-editable",
        isSelected && "is-selected",
        live && "is-dragging",
        ov.h != null && "block-sized",
        className,
      )}
      style={
        {
          ...style,
          translate: pos.x || pos.y ? `${pos.x}px ${pos.y}px` : undefined,
          "--fs": ov.scale !== 1 ? ov.scale : undefined,
          ...(ov.w != null ? { width: ov.w, maxWidth: "none", flex: "none" } : {}),
          ...(ov.h != null ? { height: ov.h, flex: "none" } : {}),
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
    >
      {children}
      {isSelected && !live && id !== "cutout" && HANDLES.map((h) => <i key={h} className={`bk-handle bk-${h}`} data-nodrag onPointerDown={(e) => startResize(e, h)} />)}
    </div>
  );
}
/* ───────────── Auto-fit container ───────────── */

/** Formats whose composition is set in stone (cover, final slide) never grow their text */
const NO_GROW = new Set(["cover", "cta", "image", "versus", "quote"]);

/**
 * Shrinks all text inside (via --fit) until nothing overflows; short text in a big empty box
 * grows a little instead of floating in white space.
 */
export function FitBox({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  const { fitKey, safeBottom, slide, style: look } = useSlide();
  const ref = useRef<HTMLDivElement>(null);
  // Boxes laid out against the slide's bottom area (bottom 100–260) keep clear of the connector's run;
  // boxes inside cards use small bottoms and stay as they are
  // (the final slide only gets the end of the line, at mid-height)
  const extra = slide.layout === "cta" ? 0 : safeBottom - 150;
  const b = style?.bottom;
  const bottom = typeof b === "number" ? (b >= 100 && b <= 260 ? b + extra : b) : style?.height === undefined ? 150 + extra : undefined;
  const grow = !NO_GROW.has(slide.layout) && !slide.cutout && look !== "minimal";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    /**
     * Height of the stacked blocks themselves. scrollHeight would also count glyphs that poke out of
     * their line boxes (tall handwriting fonts), which never goes away no matter how small the text gets.
     */
    const contentHeight = () => {
      const kids = [...el.children];
      if (!kids.length) return 0;
      const margin = (k: Element, side: "Top" | "Bottom") => parseFloat(getComputedStyle(k)[`margin${side}`]) || 0;
      // SVG children (hand-drawn arrows) have no offset box: measure them on screen, undoing the zoom
      const box = (k: Element) => {
        if (k instanceof HTMLElement) return { top: k.offsetTop, height: k.offsetHeight };
        const r = k.getBoundingClientRect();
        const p = el.getBoundingClientRect();
        const zoom = p.height / el.offsetHeight || 1;
        return { top: (r.top - p.top) / zoom, height: r.height / zoom };
      };
      const top = Math.min(...kids.map((k) => box(k).top - margin(k, "Top")));
      const bottom = Math.max(...kids.map((k) => box(k).top + box(k).height + margin(k, "Bottom")));
      return bottom - top;
    };
    const run = () => {
      let fit = 1;
      // Dragged blocks and hand-drawn tilts must not count as overflow
      el.classList.add("is-measuring");
      el.style.setProperty("--fit", "1");
      for (let i = 0; i < 14; i++) {
        if (contentHeight() <= el.clientHeight + 2 && el.scrollWidth <= el.clientWidth + 2) break;
        fit *= 0.93;
        el.style.setProperty("--fit", fit.toFixed(3));
      }
      // Main boxes only (tall ones) that are less than half full
      const filler = el.closest(".slide")?.hasAttribute("data-filler");
      if (grow && !filler && fit === 1 && el.clientHeight > 600 && contentHeight() < el.clientHeight * 0.5) {
        for (let i = 0; i < 6; i++) {
          const next = fit * 1.05;
          el.style.setProperty("--fit", next.toFixed(3));
          if (contentHeight() > el.clientHeight * 0.72 || el.scrollWidth > el.clientWidth + 2) {
            el.style.setProperty("--fit", fit.toFixed(3));
            break;
          }
          fit = next;
        }
      }
      el.classList.remove("is-measuring");
    };
    run();
    let alive = true;
    document.fonts?.ready.then(() => alive && run());
    // A style switch brings new fonts that load after the first measure
    const fonts = document.fonts;
    const again = () => alive && run();
    fonts?.addEventListener?.("loadingdone", again);
    return () => {
      alive = false;
      fonts?.removeEventListener?.("loadingdone", again);
    };
  }, [fitKey, bottom, grow]);

  return (
    <div ref={ref} className={cx("fitbox", className)} style={bottom === undefined ? style : { ...style, bottom }}>
      {children}
    </div>
  );
}

/* ───────────── Photo (drag to reframe) ───────────── */

interface PhotoProps {
  className?: string;
  style?: CSSProperties;
  pan?: boolean;
  credit?: "top" | "bottom" | "side" | false;
  /** Initial framing in %, e.g. higher up for portraits */
  defaultPos?: { x: number; y: number };
  /** 2 = the slide's second photo (versus) */
  slot?: 1 | 2;
}

export function Photo({ className, style, pan = true, credit = "top", defaultPos = { x: 50, y: 50 }, slot = 1 }: PhotoProps) {
  const { slide, editable, update, select, display } = useSlide();
  const img = slot === 2 ? (slide.image2 ?? null) : slide.image;
  const status = slot === 2 ? slide.imageStatus2 : slide.imageStatus;
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const pos = live ?? img?.pos ?? defaultPos;
  const loading = !img && (status === "loading" || status === "idle" || slide.writing);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable || !img || !pan || e.button !== 0) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const base = img.pos ?? defaultPos;
    let last = base;
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    trackDrag(e, {
      move: (dx, dy) => {
        last = { x: clamp(base.x - (dx / rect.width) * 140), y: clamp(base.y - (dy / rect.height) * 140) };
        setLive(last);
      },
      end: (moved) => {
        if (moved) {
          update((s) => {
            const target = slot === 2 ? s.image2 : s.image;
            if (target) target.pos = last;
          });
        } else select(null);
        setLive(null);
      },
    });
  };

  return (
    <div
      className={cx("photo", editable && img && pan && "photo-pan", className)}
      style={style}
      onPointerDown={onPointerDown}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.url} alt={img.alt} draggable={false} style={{ objectPosition: `${pos.x}% ${pos.y}%` }} />
      ) : (
        <div className="photo-fallback" />
      )}
      {loading && <div className="photo-loading" />}
      {img?.credit && credit && display.imageCredit && <span className={cx("photo-credit", `photo-credit-${credit}`)}>{img.credit}</span>}
    </div>
  );
}

export function Emoji({ path, size, className }: { path: string; size: number; className?: string }) {
  return <EditableText path={path} className={cx("emoji", className)} style={{ fontSize: `calc(${size}px * var(--fs, 1) * var(--fit, 1))` }} />;
}
