"use client";

/**
 * Jornal: a front page. Headline across the top, photo with caption beside a text column,
 * drop caps, columns for longer text, pull quotes between heavy rules.
 */

import type { CSSProperties } from "react";
import { fs, sizeFor, useSlideOf } from "../context";
import { CHROME_TEXT } from "../i18n";
import { Caption, CtaGlyph, CtaPointer, FollowCard, Signoff, Txt, cx, display, useCta, wantsPhoto, type LayoutMap } from "../kit";
import { Block, EditableText, FitBox, Photo } from "../parts";

const page = (top = 150, bottom = 140, extra?: CSSProperties): CSSProperties => ({ top, bottom, left: 72, right: 72, ...extra });

function Figure({ className, pos }: { className?: string; pos?: { x: number; y: number } }) {
  return (
    <figure className={cx("np-figure", className)}>
      <Photo className="np-photo" credit={false} defaultPos={pos} />
      <Caption className="np-caption" />
    </figure>
  );
}

/** Front page: section tag, headline across the page, the deck between rules, then the photo of the day */
function Cover() {
  const { s } = useSlideOf("cover");
  const size = sizeFor(s.title, [[40, 104], [70, 88], [100, 76]], 66);
  return (
    <FitBox style={page(150, 140, { justifyContent: "flex-start", alignItems: "center", textAlign: "center" })}>
      <Txt path="kicker" className="np-flag" size={24} blockStyle={{ marginBottom: 22 }} />
      <Txt path="title" as="h1" className={display} size={size} style={{ fontWeight: 900, lineHeight: 0.98, letterSpacing: "-0.02em" }} />
      <Block id="subtitle" className="np-deck">
        <EditableText path="subtitle" className="serif" style={{ fontSize: fs(32), fontStyle: "italic", lineHeight: 1.35 }} />
      </Block>
      <Figure className="np-figure-front" />
    </FitBox>
  );
}

function Text() {
  const { s } = useSlideOf("text");
  const photo = wantsPhoto(s);
  const long = (s.body ?? "").replace(/\*\*/g, "").length > 150;
  const size = sizeFor(s.title, [[40, photo ? 62 : 78], [70, photo ? 54 : 66]], photo ? 48 : 56);
  return (
    <FitBox style={page(150, 140, { justifyContent: photo ? "flex-start" : "center" })}>
      {photo && <Figure className="np-figure-wide" />}
      <Txt path="kicker" className="np-kicker" size={24} blockStyle={{ marginBottom: 16 }} />
      <Txt path="title" as="h2" className={display} size={size} style={{ fontWeight: 800, lineHeight: 1.04 }} />
      <div className="np-rule np-rule-thin" style={{ margin: "28px 0" }} />
      <Txt path="body" as="p" className={cx("np-dropcap", long && "np-columns")} size={photo ? 30 : 34} style={{ lineHeight: 1.45 }} />
    </FitBox>
  );
}

function Quote() {
  const { s } = useSlideOf("quote");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.quote, [[70, photo ? 60 : 70], [120, photo ? 52 : 62], [180, photo ? 46 : 54]], 42);
  return (
    <FitBox style={page(160, 150, { justifyContent: "center" })}>
      <div className="np-pull">
        <div className={photo ? "np-pull-grid" : undefined}>
          <div>
            <div className="np-pull-mark">“</div>
            <Txt path="quote" className="serif" size={size} style={{ fontStyle: "italic", lineHeight: 1.14 }} />
            <Block id="author" style={{ marginTop: 40 }}>
              <EditableText path="author" className="np-byline" style={{ fontSize: fs(26) }} />
              <EditableText path="role" style={{ fontSize: fs(26), fontStyle: "italic", color: "var(--muted)", marginTop: 6 }} />
            </Block>
          </div>
          {photo && <Figure className="np-portrait" pos={{ x: 50, y: 25 }} />}
        </div>
      </div>
    </FitBox>
  );
}

function Statement() {
  const { s } = useSlideOf("statement");
  const size = sizeFor(s.text, [[50, 92], [80, 80], [120, 68], [170, 58]], 50);
  return (
    <FitBox style={page(150, 150, { justifyContent: "center", textAlign: "center" })}>
      <div className="np-double" />
      <Txt path="text" as="p" className={display} size={size} style={{ fontStyle: "italic", fontWeight: 700, lineHeight: 1.1 }} blockStyle={{ margin: "64px 0 48px" }} />
      <div className="np-dinkus">✻ ✻ ✻</div>
      <div className="np-double" style={{ marginTop: 48 }} />
    </FitBox>
  );
}

function Stat() {
  const { s } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 260], [5, 210], [7, 170], [10, 130], [14, 100]], 84);
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      <div className="np-box">
        <Txt path="kicker" className="np-kicker" size={24} blockStyle={{ marginBottom: 20 }} />
        <Txt path="value" className={display} size={valueSize} style={{ fontWeight: 900, lineHeight: 0.92, letterSpacing: "-0.03em" }} />
        {s.share !== null && (
          <div className="stat-bar" style={{ marginTop: 36 }}>
            <div style={{ width: `${Math.max(2, s.share)}%` }} />
          </div>
        )}
        <div className="np-rule np-rule-thin" style={{ margin: "34px 0 26px" }} />
        <Txt path="label" className={display} size={sizeFor(s.label, [[40, 52], [80, 44]], 38)} style={{ fontStyle: "italic", fontWeight: 700, lineHeight: 1.15 }} />
        <Txt path="context" size={30} style={{ lineHeight: 1.45, color: "var(--muted)" }} blockStyle={{ marginTop: 16 }} />
      </div>
    </FitBox>
  );
}

function List() {
  const { s } = useSlideOf("list");
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 72], [70, 62]], 54)} style={{ fontWeight: 800, lineHeight: 1.05 }} />
      <div className="np-rule" style={{ margin: "30px 0 6px" }} />
      <Block id="items">
        {s.items.map((_, i) => (
          <div key={i} className="np-item">
            <span className="np-num">{i + 1}</span>
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(34), lineHeight: 1.36 }} />
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
      <FitBox style={page(150, follow ? 120 : 200, { justifyContent: "center" })}>
        {summary && (
          <Block id="takeaway" className="np-summary" style={{ marginBottom: 64 }}>
            <div className="np-kicker" style={{ fontSize: fs(24) }}>
              {t.summary}:
            </div>
            <EditableText path="takeaway" className="np-dropcap" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 38], [220, 33]], 30)), lineHeight: 1.45, marginTop: 18 }} />
          </Block>
        )}
        <Block id="visual" style={{ marginBottom: 34 }}>
          {follow ? (
            <FollowCard size={130} />
          ) : (
            <span className="np-icon">
              <CtaGlyph size={50} strokeWidth={1.7} />
            </span>
          )}
        </Block>
        <Txt path="title" as="h2" className={display} size={titleSize(sizeFor(s.title, [[30, 80], [50, 70]], 60))} style={{ fontStyle: "italic", fontWeight: 800, lineHeight: 1.04 }} />
        <Txt path="subtitle" size={32} style={{ fontStyle: "italic", lineHeight: 1.4, color: "var(--muted)" }} blockStyle={{ marginTop: 18 }} />
      </FitBox>
      <CtaPointer size={110} strokeWidth={1.8} />
      <Signoff />
    </>
  );
}

export const newspaperLayouts: LayoutMap = {
  cover: Cover,
  text: Text,
  quote: Quote,
  statement: Statement,
  stat: Stat,
  list: List,
  cta: Cta,
};
