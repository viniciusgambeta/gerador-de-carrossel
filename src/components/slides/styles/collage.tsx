"use client";

/**
 * Colagem: everything is cut out and stuck on. Torn photos held by tape, paper strips with
 * typewriter text, label-maker tags, starburst stickers, halftone dots, mixed typefaces.
 */

import type { CSSProperties, ReactNode } from "react";
import { fs, sizeFor, useSlideOf } from "../context";
import { CHROME_TEXT } from "../i18n";
import { CtaGlyph, CtaPointer, FollowCard, Signoff, Title, Txt, display, useCta, wantsPhoto, type LayoutMap } from "../kit";
import { Block, EditableText, Emoji, FitBox, Photo } from "../parts";

/** Jagged polygon for torn paper edges, the same for the same seed */
export function torn(seed: number, depth = 1.6) {
  let x = (seed * 7919 + 104729) % 233280;
  const rnd = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  const pts: string[] = [];
  for (let p = 0; p <= 100; p += 4) pts.push(`${p}% ${(rnd() * depth).toFixed(2)}%`);
  for (let p = 6; p <= 94; p += 8) pts.push(`${(100 - rnd() * depth * 0.5).toFixed(2)}% ${p}%`);
  for (let p = 100; p >= 0; p -= 4) pts.push(`${p}% ${(100 - rnd() * depth).toFixed(2)}%`);
  for (let p = 94; p >= 6; p -= 8) pts.push(`${(rnd() * depth * 0.5).toFixed(2)}% ${p}%`);
  return `polygon(${pts.join(", ")})`;
}

const BURST = Array.from({ length: 40 }, (_, i) => {
  const a = (i / 40) * Math.PI * 2;
  const r = i % 2 ? 40 : 50;
  return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
}).join(" ");

export function Burst({ className, style, children }: { className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div className={`cl-burst ${className ?? ""}`} style={style}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <polygon points={BURST} />
      </svg>
      <div className="cl-burst-body">{children}</div>
    </div>
  );
}

function Tape({ style }: { style?: CSSProperties }) {
  return <div className="cl-tape" style={style} />;
}

/** A torn, taped photo; `flow` puts it in the text flow instead of absolutely */
function TornPhoto({ seed, style, rotate, flow, bw, pos }: { seed: number; style?: CSSProperties; rotate: number; flow?: boolean; bw?: boolean; pos?: { x: number; y: number } }) {
  return (
    <div className={`cl-frame${flow ? " cl-frame-flow" : ""}`} style={{ ...style, rotate: `${rotate}deg` }}>
      <div className={`cl-torn${bw ? " cl-bw" : ""}`} style={{ clipPath: torn(seed) }}>
        <Photo className="cl-photo" credit="bottom" defaultPos={pos} />
      </div>
      <Tape style={{ top: -24, left: "12%", rotate: "-9deg" }} />
      <Tape style={{ bottom: -20, right: "10%", rotate: "7deg" }} />
    </div>
  );
}

/** A torn photo running off the page; the headline is cut out in paper strips stuck over its edge */
function Cover() {
  const { s } = useSlideOf("cover");
  const size = sizeFor(s.title, [[40, 104], [70, 92], [100, 80]], 70);
  return (
    <>
      <div className="cl-halftone cl-halftone-round" style={{ top: 330, right: -120, width: 620, height: 620 }} />
      <TornPhoto seed={1} style={{ top: -70, left: -60, right: 80, height: 660 }} rotate={-3.5} />
      <FitBox style={{ top: 440, justifyContent: "flex-end" }}>
        <Txt path="kicker" className="cl-label cl-label-accent" size={28} blockStyle={{ marginBottom: 22, alignSelf: "flex-start" }} />
        <Block id="title">
          <EditableText path="title" as="h1" className={`${display} cl-title-strips`} style={{ fontSize: fs(size) }} />
        </Block>
        <Txt path="subtitle" className="cl-paper" size={28} style={{ lineHeight: 1.4 }} blockStyle={{ marginTop: 26, alignSelf: "flex-start", maxWidth: 860 }} />
      </FitBox>
    </>
  );
}

function Text() {
  const { s, index } = useSlideOf("text");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.title, [[30, photo ? 62 : 76], [60, photo ? 54 : 66]], photo ? 46 : 54);
  return (
    <>
      {!photo && <div className="cl-halftone" style={{ bottom: 90, right: -100, width: 480, height: 480 }} />}
      <FitBox style={{ justifyContent: "center" }}>
        {photo && <TornPhoto seed={index + 3} rotate={index % 2 ? 1.5 : -1.5} flow />}
        <Txt path="kicker" className="cl-label" size={24} blockStyle={{ marginBottom: 22 }} />
        <Txt path="title" as="h2" className={display} size={size} style={{ lineHeight: 1.08 }} />
        <Txt path="body" as="p" className="cl-paper" size={photo ? 29 : 33} style={{ lineHeight: 1.45 }} blockStyle={{ marginTop: 30 }} />
      </FitBox>
    </>
  );
}

function Quote() {
  const { s } = useSlideOf("quote");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.quote, [[70, 66], [120, 58], [180, 50]], 44);
  return (
    <>
      {photo && (
        <>
          <div className="cl-halftone cl-halftone-round" style={{ top: 100, right: 40, width: 580, height: 580 }} />
          <TornPhoto seed={7} style={{ top: 150, right: 110, width: 470, height: 560 }} rotate={3} bw pos={{ x: 50, y: 25 }} />
        </>
      )}
      <div className="cl-quote-mark" style={{ top: photo ? 110 : 130, left: 60 }}>
        “
      </div>
      <FitBox style={{ top: photo ? 740 : 420, bottom: 150, justifyContent: photo ? "flex-start" : "center" }}>
        <Block id="quote">
          <EditableText path="quote" as="span" className="cl-quote" style={{ fontSize: fs(size) }} />
        </Block>
        <Block id="author" style={{ marginTop: 36, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <EditableText path="author" className="cl-label" style={{ fontSize: fs(28) }} />
          <EditableText path="role" className="cl-label cl-label-accent" style={{ fontSize: fs(22) }} />
        </Block>
      </FitBox>
    </>
  );
}

function Statement() {
  const { s, index } = useSlideOf("statement");
  const size = sizeFor(s.text, [[50, 84], [80, 72], [120, 62], [170, 54]], 48);
  return (
    <FitBox style={{ justifyContent: "center" }}>
      {s.emoji && (
        <Block id="emoji" style={{ marginBottom: -30, zIndex: 2, alignSelf: "flex-end" }}>
          <Burst className="cl-burst-small">
            <Emoji path="emoji" size={96} />
          </Burst>
        </Block>
      )}
      <Block id="text">
        <div className="cl-sheet-wrap">
          <div className="cl-sheet" style={{ clipPath: torn(index + 11, 1.2) }}>
            <EditableText path="text" as="p" className={display} style={{ fontSize: fs(size), lineHeight: 1.1 }} />
          </div>
        </div>
      </Block>
    </FitBox>
  );
}

function Stat() {
  const { s } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 190], [5, 160], [7, 128], [10, 100], [14, 80]], 66);
  return (
    <>
      <div className="cl-halftone" style={{ top: 120, left: -80, width: 420, height: 420 }} />
      <FitBox style={{ justifyContent: "center", alignItems: "flex-start" }}>
        <Txt path="kicker" className="cl-label" size={24} blockStyle={{ marginBottom: 30 }} />
        <Block id="value">
          <Burst>
            <EditableText path="value" className={display} style={{ fontSize: fs(valueSize), lineHeight: 0.95 }} />
          </Burst>
        </Block>
        {s.share !== null && (
          <div className="cl-meter" style={{ marginTop: 34 }}>
            <div style={{ width: `${Math.max(2, s.share)}%` }} />
          </div>
        )}
        <Txt path="label" className={display} size={sizeFor(s.label, [[40, 54], [80, 46]], 40)} style={{ lineHeight: 1.1 }} blockStyle={{ marginTop: 34 }} />
        <Txt path="context" className="cl-paper" size={28} style={{ lineHeight: 1.45 }} blockStyle={{ marginTop: 22 }} />
      </FitBox>
    </>
  );
}

function List() {
  const { s } = useSlideOf("list");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={72} mb={44} />
      <Block id="items" className="cl-strips">
        {s.items.map((_, i) => (
          <div key={i} className="cl-strip-row" style={{ clipPath: torn(i + 20, 4), rotate: `${i % 2 ? 0.8 : -0.9}deg` }}>
            <span className="cl-num">{i + 1}</span>
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(32), lineHeight: 1.32 }} />
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

function Cta() {
  const { s, language, follow, summary, titleSize } = useCta();
  const t = CHROME_TEXT[language];
  return (
    <>
      <FitBox style={{ top: 140, bottom: follow ? 110 : 200, justifyContent: "center" }}>
        {summary && (
          <Block id="takeaway" style={{ marginBottom: 66 }}>
            <div className="cl-index-card">
              <Tape style={{ top: -24, left: "44%", rotate: "-4deg" }} />
              <div className="cl-label" style={{ fontSize: fs(22) }}>
                {t.summary}:
              </div>
              <EditableText path="takeaway" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 36], [220, 31]], 28)), lineHeight: 1.5, marginTop: 18 }} />
            </div>
          </Block>
        )}
        <Block id="visual" style={{ marginBottom: 34 }}>
          {follow ? (
            <FollowCard />
          ) : (
            <Burst className="cl-burst-icon">
              <CtaGlyph size={62} strokeWidth={2.4} />
            </Burst>
          )}
        </Block>
        <Txt path="title" as="h2" className={display} size={titleSize(sizeFor(s.title, [[30, 76], [50, 66]], 56))} style={{ lineHeight: 1.06 }} />
        <Txt path="subtitle" className="cl-paper" size={28} style={{ lineHeight: 1.4 }} blockStyle={{ marginTop: 22, alignSelf: "flex-start" }} />
      </FitBox>
      <CtaPointer size={130} strokeWidth={3} className="cl-pointer" />
      <Signoff />
    </>
  );
}

export const collageLayouts: LayoutMap = {
  cover: Cover,
  text: Text,
  quote: Quote,
  statement: Statement,
  stat: Stat,
  list: List,
  cta: Cta,
};
