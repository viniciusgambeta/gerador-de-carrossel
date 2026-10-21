"use client";

/**
 * Minimalista: wide margins, light type anchored low, hairlines instead of boxes,
 * small photos set like prints on a wall. Bold only where the text is highlighted.
 */

import type { CSSProperties } from "react";
import { fs, sizeFor, useSlideOf } from "../context";
import { CHROME_TEXT } from "../i18n";
import { SlideIcon } from "../icons";
import { Caption, CtaGlyph, CtaPointer, FollowCard, Signoff, Txt, display, pad2, useCta, wantsPhoto, type LayoutMap } from "../kit";
import { Block, EditableText, Emoji, FitBox, Photo } from "../parts";

const M = 120;
const area = (top: number, bottom = 150, extra?: CSSProperties): CSSProperties => ({ top, bottom, left: M, right: M, ...extra });
const thin: CSSProperties = { fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.03em" };
const muted: CSSProperties = { color: "var(--muted)", lineHeight: 1.5 };

function Cover() {
  const { s } = useSlideOf("cover");
  const size = sizeFor(s.title, [[40, 78], [70, 68], [100, 60]], 54);
  return (
    <>
      <Photo className="min-photo" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 700 }} credit={false} />
      <Caption className="min-caption" style={{ position: "absolute", top: 716, left: M, right: M }} />
      <FitBox style={area(780, 150, { justifyContent: "flex-end" })}>
        <Txt path="kicker" className="min-label" size={22} blockStyle={{ marginBottom: 28 }} />
        <Txt path="title" as="h1" className={display} size={size} style={thin} />
        <Txt path="subtitle" size={30} style={muted} blockStyle={{ marginTop: 26 }} />
      </FitBox>
    </>
  );
}

function Text() {
  const { s } = useSlideOf("text");
  if (wantsPhoto(s)) {
    // A large print running off the right edge, the headline beside it, the explanation underneath
    const size = sizeFor(s.title, [[40, 56], [70, 50]], 44);
    return (
      <>
        <Photo className="min-photo" style={{ position: "absolute", top: 150, left: 540, width: 640, height: 600 }} credit={false} />
        <FitBox style={{ top: 150, height: 600, left: M, right: 1080 - 540 + 48, justifyContent: "flex-end" }}>
          <Txt path="kicker" className="min-label" size={20} blockStyle={{ marginBottom: 22 }} />
          <Txt path="title" as="h2" className={display} size={size} style={thin} />
        </FitBox>
        <Caption className="min-caption" style={{ position: "absolute", top: 764, left: 540, right: M }} />
        <FitBox style={area(830, 150, { justifyContent: "flex-start" })}>
          <Txt path="body" as="p" size={34} style={muted} />
        </FitBox>
      </>
    );
  }
  const size = sizeFor(s.title, [[30, 76], [60, 66], [90, 58]], 52);
  return (
    <FitBox style={area(150, 150, { justifyContent: "flex-end" })}>
      <Txt path="kicker" className="min-label" size={22} blockStyle={{ marginBottom: 30 }} />
      <Txt path="title" as="h2" className={display} size={size} style={thin} />
      <div className="min-rule" style={{ margin: "48px 0 40px" }} />
      <Txt path="body" as="p" size={36} style={muted} />
    </FitBox>
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
          <Photo className="min-photo" style={{ position: "absolute", top: 150, left: M, width: 280, height: 350 }} credit={false} defaultPos={{ x: 50, y: 25 }} />
          <Caption className="min-caption" style={{ position: "absolute", top: 470, left: M + 280 + 32, right: M }} />
        </>
      )}
      <FitBox style={area(photo ? 560 : 150, 150, { justifyContent: photo ? "flex-start" : "center" })}>
        <div className="min-quote-mark">“</div>
        <Txt path="quote" className={display} size={size} style={{ fontWeight: 300, lineHeight: 1.2, letterSpacing: "-0.02em" }} />
        <Block id="author" style={{ marginTop: 52, display: "flex", alignItems: "center", gap: 24 }}>
          <div className="min-rule" style={{ width: 48 }} />
          <div>
            <EditableText path="author" className="min-label min-label-plain" style={{ fontSize: fs(22) }} />
            <EditableText path="role" style={{ fontSize: fs(24), ...muted, marginTop: 6 }} />
          </div>
        </Block>
      </FitBox>
    </>
  );
}

function Statement() {
  const { s } = useSlideOf("statement");
  const size = sizeFor(s.text, [[50, 92], [80, 80], [120, 68], [170, 58]], 50);
  return (
    <FitBox style={area(150, 150, { justifyContent: "flex-end" })}>
      {s.emoji ? (
        <Block id="emoji" style={{ marginBottom: 40 }}>
          <Emoji path="emoji" size={72} />
        </Block>
      ) : (
        <div className="min-dot" style={{ marginBottom: 44 }} />
      )}
      <Txt path="text" as="p" className={display} size={size} style={{ ...thin, lineHeight: 1.08, letterSpacing: "-0.035em" }} />
    </FitBox>
  );
}

function Stat() {
  const { s } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 330], [5, 270], [7, 210], [10, 160], [14, 124]], 96);
  return (
    <FitBox style={area(150, 150, { justifyContent: "center" })}>
      <Txt path="kicker" className="min-label" size={22} blockStyle={{ marginBottom: 24 }} />
      <Txt path="value" className={`${display} min-thin`} size={valueSize} style={{ lineHeight: 0.92, letterSpacing: "-0.06em" }} />
      {s.share !== null && (
        <div className="min-bar" style={{ marginTop: 52 }}>
          <div style={{ width: `${Math.max(2, s.share)}%` }} />
        </div>
      )}
      <Txt path="label" className={display} size={sizeFor(s.label, [[40, 50], [80, 42]], 36)} style={{ fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.015em" }} blockStyle={{ marginTop: 52 }} />
      <Txt path="context" size={30} style={muted} blockStyle={{ marginTop: 20 }} />
    </FitBox>
  );
}

function Duo() {
  const { s } = useSlideOf("duo");
  const longest = Math.max(s.left.value.length, s.right.value.length);
  const valueSize = longest <= 4 ? 150 : longest <= 8 ? 112 : longest <= 12 ? 86 : 66;
  return (
    <FitBox style={area(150, 150, { justifyContent: "center" })}>
      <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 62], [70, 54]], 48)} style={thin} blockStyle={{ marginBottom: 70 }} />
      <Block id="sides" className="min-duo">
        {(["left", "right"] as const).map((k) => (
          <div key={k}>
            <EditableText path={`${k}.value`} className={`${display} min-thin`} style={{ fontSize: fs(valueSize), lineHeight: 0.95, letterSpacing: "-0.05em" }} />
            <EditableText path={`${k}.label`} style={{ fontSize: fs(29), ...muted, marginTop: 22 }} />
          </div>
        ))}
      </Block>
      <Txt path="note" size={26} style={muted} blockStyle={{ marginTop: 56 }} />
    </FitBox>
  );
}

function List() {
  const { s } = useSlideOf("list");
  return (
    <FitBox style={area(150, 150, { justifyContent: "center" })}>
      <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 64], [70, 56]], 50)} style={thin} blockStyle={{ marginBottom: 60 }} />
      <Block id="items" className="min-list">
        {s.items.map((_, i) => (
          <div key={i} className="min-row">
            <span className="min-index">{pad2(i + 1)}</span>
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(34), lineHeight: 1.38 }} />
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

function Grid() {
  const { s } = useSlideOf("grid");
  return (
    <FitBox style={area(150, 150, { justifyContent: "center" })}>
      <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 62], [70, 54]], 48)} style={thin} blockStyle={{ marginBottom: 60 }} />
      <Block id="items" className="min-grid">
        {s.items.map((it, i) => (
          <div key={i} className="min-cell">
            <SlideIcon name={it.icon} size={38} strokeWidth={1.4} />
            <EditableText path={`items.${i}.title`} style={{ fontSize: fs(31), fontWeight: 600, lineHeight: 1.2, marginTop: 24 }} />
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(26), ...muted, lineHeight: 1.45, marginTop: 10 }} />
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
      <FitBox style={area(150, 200, { justifyContent: "space-between" })}>
        {summary ? (
          <Block id="takeaway">
            <div className="min-label" style={{ fontSize: fs(22) }}>
              {t.summary}:
            </div>
            <EditableText path="takeaway" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 38], [220, 33]], 29)), lineHeight: 1.5, marginTop: 24 }} />
          </Block>
        ) : (
          <span />
        )}
        <div>
          <Block id="visual" style={{ marginBottom: 40 }}>
            {follow ? (
              <FollowCard size={110} className="min-follow" />
            ) : (
              <span className="min-cta-icon">
                <CtaGlyph size={50} strokeWidth={1.4} />
              </span>
            )}
          </Block>
          <Txt path="title" as="h2" className={display} size={titleSize(sizeFor(s.title, [[30, 76], [50, 66]], 56))} style={{ ...thin, lineHeight: 1.06 }} />
          <Txt path="subtitle" size={30} style={muted} blockStyle={{ marginTop: 22 }} />
        </div>
      </FitBox>
      <CtaPointer size={84} strokeWidth={1.3} />
      <Signoff size={38} />
    </>
  );
}

export const minimalLayouts: LayoutMap = {
  cover: Cover,
  text: Text,
  quote: Quote,
  statement: Statement,
  stat: Stat,
  duo: Duo,
  list: List,
  grid: Grid,
  cta: Cta,
};
