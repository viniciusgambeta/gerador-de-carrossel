"use client";

import { useSlide } from "./context";

/**
 * Hand-drawn doodles for the "Rabisco" style. Paths are deliberately wobbly;
 * one doodle per slide, picked by position so the carousel doesn't repeat itself.
 */
const DOODLES = [
  // star
  "M60 8 C64 30 70 44 92 50 C70 56 64 70 60 94 C55 70 48 57 26 51 C48 45 55 31 60 8 Z",
  // squiggle
  "M6 60 C22 30 34 30 42 58 C50 86 64 86 72 56 C80 28 94 30 110 58",
  // spiral
  "M60 60 C60 52 70 52 70 60 C70 72 52 74 50 60 C47 42 74 38 80 58 C86 80 56 92 42 76 C28 60 38 28 62 26",
  // burst lines
  "M60 10 L60 34 M24 24 L40 40 M10 60 L34 60 M96 24 L80 40 M110 60 L86 60",
];

function Doodle({ variant, style }: { variant: number; style: React.CSSProperties }) {
  return (
    <svg className="doodle" viewBox="0 0 120 120" width={150} height={150} style={style} aria-hidden>
      <path d={DOODLES[variant % DOODLES.length]} fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Curly hand-drawn arrow that points at the "next" corner */
function SketchArrow() {
  return (
    <svg className="doodle sketch-arrow" viewBox="0 0 200 120" width={170} height={102} aria-hidden>
      <path d="M8 30 C40 92 120 104 176 70" fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round" />
      <path d="M150 58 L180 68 L164 96" fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const MANGA_STRIPE = new Set(["statement", "stat", "text", "question", "explainer", "qa"]);

/** Formats that draw their own hand-made marks (polaroids, balloons, circles, post-its) */
const SKETCH_BUSY = new Set(["cover", "quote", "stat", "statement", "grid", "cta"]);

export function StyleDecor({ photoBg }: { photoBg: boolean }) {
  const { style, index, total, slide, connector } = useSlide();

  switch (style) {
    case "sketch": {
      if (photoBg) return null;
      const corners: React.CSSProperties[] = [
        { top: 120, right: 70, rotate: "12deg" },
        { bottom: 150, right: 90, rotate: "-8deg" },
        { top: 130, right: 110, rotate: "-14deg" },
      ];
      return (
        <>
          <div className="sketch-paper" />
          {!SKETCH_BUSY.has(slide.layout) && <Doodle variant={index} style={corners[index % corners.length]} />}
          {/* The connector takes over the "keep going" arrow */}
          {connector === "none" && index > 0 && index < total - 1 && index % 3 === 1 && <SketchArrow />}
        </>
      );
    }
    case "swiss":
      return <div className="swiss-grid" />;
    case "tech":
      return (
        <>
          <div className="tech-grid" />
          <div className="tech-glow" />
        </>
      );
    case "collage":
      return photoBg ? null : <div className="cl-texture" />;
    case "orbital":
      return <div className="ob-grid" />;
    case "manga":
      // The yellow stripe only now and then, on formats that leave the lower-left corner free
      return photoBg ? null : <div className={`mg-tone${index % 4 === 2 && MANGA_STRIPE.has(slide.layout) ? " mg-tone-stripe" : ""}`} />;
    case "mde":
      return <div className="mde-glow" />;
    case "brutalist":
      return photoBg ? null : <div className="nb-dots" />;
    case "canvas":
      return <div className="cv-dots" />;
    default:
      return null;
  }
}
