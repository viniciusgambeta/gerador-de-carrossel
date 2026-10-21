"use client";

/**
 * Rabisco: a notebook page. Photos are taped polaroids, quotes are speech balloons,
 * numbers get circled by hand, lists are ticked off and key points live on post-its.
 */

import type { CSSProperties, ReactNode } from "react";
import { fs, sizeFor, useSlideOf } from "../context";
import { CHROME_TEXT } from "../i18n";
import { SlideIcon } from "../icons";
import { Caption, CtaGlyph, CtaPointer, FollowCard, Signoff, Title, Txt, display, initials, useCta, wantsPhoto, type LayoutMap } from "../kit";
import { Balloon } from "../balloon";
import { Block, EditableText, Emoji, FitBox, Photo } from "../parts";

/** Wobbly loop drawn around a word or number (stretches to fit) */
export function HandCircle({ className }: { className?: string }) {
  return (
    <svg className={`sk-circle ${className ?? ""}`} viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden>
      <path
        d="M24 56 C16 26 82 8 146 12 C192 16 202 54 178 78 C146 102 56 100 26 80 C8 66 26 36 76 28"
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Curly arrow; points left, flip it with CSS for the other side */
function CurlArrow({ style, className }: { style?: CSSProperties; className?: string }) {
  return (
    <svg className={`sk-curl ${className ?? ""}`} viewBox="0 0 180 110" width={150} height={92} style={style} aria-hidden>
      <path d="M172 20 C130 6 96 30 110 58 C122 82 152 66 134 46 C110 22 56 50 18 84" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
      <path d="M40 86 L16 86 L22 62" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tape({ style, clear }: { style?: CSSProperties; clear?: boolean }) {
  return <div className={clear ? "sk-tape sk-tape-clear" : "sk-tape"} style={style} />;
}

/** A taped polaroid; the bottom strip holds a handwritten caption */
function Polaroid({ style, rotate, children, pos }: { style: CSSProperties; rotate: number; children?: ReactNode; pos?: { x: number; y: number } }) {
  return (
    <div className="sk-polaroid" style={{ ...style, rotate: `${rotate}deg` }}>
      <Photo className="sk-polaroid-photo" credit={false} defaultPos={pos} />
      <div className="sk-polaroid-strip">
        {children}
        <Caption className="sk-polaroid-credit" />
      </div>
      <Tape style={{ top: -26, left: "50%", translate: "-50% 0", rotate: `${-rotate * 1.6 - 3}deg` }} />
    </div>
  );
}

/** A print stuck on the page, crooked and running off the edge; the note and title are written below it */
function Cover() {
  const { s } = useSlideOf("cover");
  const size = sizeFor(s.title, [[40, 102], [70, 90], [100, 80]], 70);
  return (
    <>
      <div className="sk-snap" style={{ top: -80, left: 110, width: 1100, height: 680, rotate: "-7deg" }}>
        <Photo className="sk-snap-photo" credit={false} />
      </div>
      <Tape clear style={{ top: 528, left: 66, width: 210, height: 64, rotate: "28deg" }} />
      <Tape clear style={{ top: 36, left: 58, width: 170, height: 60, rotate: "-38deg" }} />
      <Caption className="sk-snap-credit" style={{ position: "absolute", top: 650, right: 96, maxWidth: 520, textAlign: "right" }} />
      <FitBox style={{ top: 712, justifyContent: "flex-start" }}>
        {s.kicker && (
          <div className="sk-kicker-note">
            <Txt path="kicker" className="sk-hand sk-hand-accent" size={48} />
            <CurlArrow className="sk-curl-photo" />
          </div>
        )}
        <Txt path="title" as="h1" className={display} size={size} style={{ lineHeight: 1.02 }} blockStyle={{ marginTop: 10 }} />
        <Txt path="subtitle" size={33} style={{ lineHeight: 1.38, color: "var(--muted)" }} blockStyle={{ marginTop: 20 }} />
      </FitBox>
    </>
  );
}

function Quote() {
  const { s, safeBottom } = useSlideOf("quote");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.quote, [[70, 76], [120, 66], [180, 58]], 50);
  const lift = safeBottom - 150;
  return (
    <>
      <FitBox style={{ top: 176, height: 560 - lift, justifyContent: "flex-end" }}>
        <Block id="quote">
          <Balloon variant="hand" tail="left">
            <EditableText path="quote" className={display} style={{ fontSize: fs(size), lineHeight: 1.06 }} />
          </Balloon>
        </Block>
      </FitBox>
      {photo ? (
        <Polaroid style={{ left: 130, bottom: 170 + lift, width: 330, height: 390 }} rotate={-4} pos={{ x: 50, y: 25 }} />
      ) : (
        <div className="sk-face" style={{ left: 150, bottom: 260 + lift }}>
          {initials(s.author) || "?"}
        </div>
      )}
      <FitBox style={{ top: 800 - lift, bottom: 170, left: photo ? 520 : 400, justifyContent: "center" }}>
        <CurlArrow style={{ marginBottom: 6 }} />
        <Txt path="author" className={display} size={58} style={{ lineHeight: 1 }} />
        <Txt path="role" size={28} style={{ lineHeight: 1.3, color: "var(--muted)" }} blockStyle={{ marginTop: 8 }} />
      </FitBox>
    </>
  );
}

function Statement() {
  const { s } = useSlideOf("statement");
  const size = sizeFor(s.text, [[50, 96], [80, 84], [120, 72], [170, 62]], 54);
  return (
    <FitBox style={{ justifyContent: "center", alignItems: "center" }}>
      {s.emoji && (
        <Block id="emoji" style={{ marginBottom: 36 }}>
          <Emoji path="emoji" size={110} />
        </Block>
      )}
      <Block id="text">
        <div className="sk-postit">
          <Tape style={{ top: -28, left: "50%", translate: "-50% 0", rotate: "3deg" }} />
          <EditableText path="text" as="p" className={display} style={{ fontSize: fs(size), lineHeight: 1.04 }} />
        </div>
      </Block>
    </FitBox>
  );
}

function Stat() {
  const { s } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 260], [5, 210], [7, 170], [10, 130], [14, 104]], 84);
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Txt path="kicker" className="kicker" size={26} blockStyle={{ marginBottom: 18 }} />
      <Block id="value">
        <div className="sk-circled">
          <EditableText path="value" className={display} style={{ fontSize: fs(valueSize), lineHeight: 0.95, color: "var(--accent)" }} />
          <HandCircle />
        </div>
      </Block>
      {s.share !== null && (
        <div className="stat-bar" style={{ marginTop: 40 }}>
          <div style={{ width: `${Math.max(2, s.share)}%` }} />
        </div>
      )}
      <div className="sk-label-row">
        <CurlArrow className="sk-curl-up" />
        <Txt path="label" className={display} size={sizeFor(s.label, [[40, 62], [80, 52]], 46)} style={{ lineHeight: 1.05 }} />
      </div>
      <Txt path="context" size={32} style={{ lineHeight: 1.4, color: "var(--muted)" }} blockStyle={{ marginTop: 18 }} />
    </FitBox>
  );
}

function List() {
  const { s } = useSlideOf("list");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={84} mb={46} />
      <Block id="items" className="sk-checklist">
        {s.items.map((_, i) => (
          <div key={i} className="sk-check-row">
            <svg className="sk-box" viewBox="0 0 64 64" aria-hidden>
              <path d="M8 12 C24 8 40 10 52 9 C54 24 52 40 53 53 C38 55 22 52 9 54 C8 40 10 24 8 12" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
              <path d="M16 32 C20 36 25 42 28 47 C34 32 44 16 60 2" fill="none" stroke="var(--accent)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(37), lineHeight: 1.28 }} />
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

function Grid() {
  const { s } = useSlideOf("grid");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={80} mb={56} />
      <Block id="items" className="sk-postits">
        {s.items.map((it, i) => (
          <div key={i} className={`sk-note sk-note-${i % 4}`}>
            <SlideIcon name={it.icon} size={44} strokeWidth={2.2} />
            <EditableText path={`items.${i}.title`} className={display} style={{ fontSize: fs(44), lineHeight: 1, marginTop: 12 }} />
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(25), lineHeight: 1.32, marginTop: 8 }} />
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

/** Hand-drawn arrow toward the save / comment button under the post */
function DrawnPointer() {
  return (
    <svg viewBox="0 0 150 150" width={130} height={130} aria-hidden>
      <path d="M14 16 C64 20 112 58 126 124" fill="none" stroke="currentColor" strokeWidth={7} strokeLinecap="round" />
      <path d="M94 110 C106 116 116 122 128 128 C132 114 136 102 140 88" fill="none" stroke="currentColor" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cta() {
  const { s, language, follow, summary, titleSize } = useCta();
  const t = CHROME_TEXT[language];
  return (
    <>
      <FitBox style={{ top: 140, bottom: follow ? 110 : 200, justifyContent: "center" }}>
        {summary && (
          <Block id="takeaway" style={{ marginBottom: 70 }}>
            <div className="cta-summary">
              <div className="kicker" style={{ fontSize: fs(24) }}>
                {t.summary}:
              </div>
              <EditableText path="takeaway" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 40], [220, 35]], 31)), lineHeight: 1.36, marginTop: 10 }} />
            </div>
          </Block>
        )}
        <Block id="visual" style={{ marginBottom: 40 }}>
          {follow ? (
            <FollowCard />
          ) : (
            <div className="sk-circled sk-cta-icon">
              <CtaGlyph size={60} strokeWidth={2.2} />
              <HandCircle />
            </div>
          )}
        </Block>
        <Txt path="title" as="h2" className={display} size={titleSize(sizeFor(s.title, [[30, 92], [50, 80]], 68))} style={{ lineHeight: 1 }} />
        <Txt path="subtitle" size={34} style={{ lineHeight: 1.34, color: "var(--muted)" }} blockStyle={{ marginTop: 18 }} />
      </FitBox>
      <CtaPointer className="sk-pointer">
        <DrawnPointer />
      </CtaPointer>
      <Signoff />
    </>
  );
}

export const sketchLayouts: LayoutMap = {
  cover: Cover,
  quote: Quote,
  statement: Statement,
  stat: Stat,
  list: List,
  grid: Grid,
  cta: Cta,
};
