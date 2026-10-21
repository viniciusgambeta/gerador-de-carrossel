"use client";

/**
 * Neo Brutalista (design system "Neo Brutalist"): everything is a card with a 2px-style ink border
 * and a solid offset shadow. The cover is a course card, explanations are highlighted notices,
 * numbers carry a seal, list items are stacked cards. One dominant color and one accent per slide.
 */

import type { CSSProperties } from "react";
import { Info } from "lucide-react";
import { fs, sizeFor, useSlideOf } from "../context";
import { CHROME_TEXT } from "../i18n";
import { Caption, CtaGlyph, CtaPointer, FollowCard, Signoff, Txt, display, initials, pad2, useCta, wantsPhoto, type LayoutMap } from "../kit";
import { Block, EditableText, Emoji, FitBox, Photo } from "../parts";

const page = (top = 150, bottom = 150, extra?: CSSProperties): CSSProperties => ({ top, bottom, left: 80, right: 88, ...extra });
const bold: CSSProperties = { fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.03em" };

function Cover() {
  const { s, total, safeBottom } = useSlideOf("cover");
  const size = sizeFor(s.title, [[40, 76], [70, 66], [100, 58]], 50);
  return (
    <div className="nb-card nb-course" style={{ position: "absolute", top: 140, left: 80, right: 88, bottom: safeBottom }}>
      <div className="nb-course-photo">
        <Photo className="absolute inset-0" credit="bottom" />
      </div>
      <FitBox style={{ top: 560, bottom: 36, left: 40, right: 40, justifyContent: "flex-start" }}>
        <div className="nb-chips" style={{ marginBottom: 24 }}>
          <Txt path="kicker" className="nb-chip nb-chip-accent" size={22} />
          <span className="nb-chip">{pad2(total)} slides</span>
        </div>
        <Txt path="title" as="h1" className={display} size={size} style={bold} />
        <Txt path="subtitle" size={28} style={{ lineHeight: 1.5, color: "var(--card-muted)" }} blockStyle={{ marginTop: 18 }} />
      </FitBox>
    </div>
  );
}

function Text() {
  const { s } = useSlideOf("text");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.title, [[30, photo ? 62 : 76], [60, photo ? 54 : 66]], photo ? 46 : 54);
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      {photo && (
        <div className="nb-card nb-photo-flow">
          <Photo className="absolute inset-0" credit="bottom" />
        </div>
      )}
      <Txt path="title" as="h2" className={display} size={size} style={bold} />
      <Block id="body" style={{ marginTop: 34 }}>
        <div className="nb-card nb-notice">
          <div className="nb-notice-head">
            <span className="nb-notice-icon">
              <Info size={34} strokeWidth={2.4} />
            </span>
            <EditableText path="kicker" style={{ fontSize: fs(24), fontWeight: 700 }} />
          </div>
          <EditableText path="body" as="p" style={{ fontSize: fs(photo ? 30 : 33), lineHeight: 1.5, marginTop: 16 }} />
        </div>
      </Block>
    </FitBox>
  );
}

function Quote() {
  const { s } = useSlideOf("quote");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.quote, [[70, 60], [120, 52], [180, 45]], 40);
  return (
    <>
      {photo && (
        <div className="nb-card nb-portrait" style={{ top: 140, right: 88, width: 380, height: 420 }}>
          <Photo className="absolute inset-0" credit={false} defaultPos={{ x: 50, y: 25 }} />
        </div>
      )}
      <FitBox style={page(photo ? 480 : 150, 150, { justifyContent: photo ? "flex-start" : "center" })}>
        <Block id="quote">
          <div className="nb-card nb-quote">
            <span className="nb-quote-mark">“</span>
            <EditableText path="quote" className={display} style={{ fontSize: fs(size), fontWeight: 600, lineHeight: 1.18, letterSpacing: "-0.02em" }} />
          </div>
        </Block>
        <Block id="author" className="nb-byline" style={{ marginTop: 34 }}>
          {!photo && <span className="nb-initials">{initials(s.author) || "?"}</span>}
          <div>
            <EditableText path="author" style={{ fontSize: fs(32), fontWeight: 700, lineHeight: 1.2 }} />
            <EditableText path="role" className="nb-chip" style={{ fontSize: fs(21), marginTop: 10 }} />
          </div>
        </Block>
        <Caption className="nb-caption" />
      </FitBox>
    </>
  );
}

function Statement() {
  const { s } = useSlideOf("statement");
  const size = sizeFor(s.text, [[50, 86], [80, 74], [120, 64], [170, 54]], 48);
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      <Block id="text">
        <div className="nb-card nb-big">
          {s.emoji && (
            <span className="nb-badge">
              <Emoji path="emoji" size={64} />
            </span>
          )}
          <EditableText path="text" as="p" className={display} style={{ fontSize: fs(size), ...bold, lineHeight: 1.06 }} />
        </div>
      </Block>
    </FitBox>
  );
}

function Stat() {
  const { s } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 220], [5, 176], [7, 140], [10, 108], [14, 84]], 70);
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      <div className="nb-card nb-stat">
        <Txt path="kicker" className="nb-seal" size={22} blockClass="nb-seal-slot" />
        <Txt path="value" className="nb-number" size={valueSize} style={{ lineHeight: 0.95 }} />
        {s.share !== null && (
          <div className="nb-meter" style={{ marginTop: 32 }}>
            <div style={{ width: `${Math.max(2, s.share)}%` }} />
          </div>
        )}
        <Txt path="label" className={display} size={sizeFor(s.label, [[40, 48], [80, 40]], 34)} style={{ ...bold, lineHeight: 1.12 }} blockStyle={{ marginTop: 32 }} />
        <Txt path="context" size={28} style={{ lineHeight: 1.5, color: "var(--card-muted)" }} blockStyle={{ marginTop: 12 }} />
      </div>
    </FitBox>
  );
}

function List() {
  const { s } = useSlideOf("list");
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 70], [70, 60]], 52)} style={bold} blockStyle={{ marginBottom: 40 }} />
      <Block id="items" className="nb-stack">
        {s.items.map((_, i) => (
          <div key={i} className="nb-card nb-item">
            <span className="nb-index">{pad2(i + 1)}</span>
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(32), lineHeight: 1.36, fontWeight: 500 }} />
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
      <FitBox style={page(140, follow ? 110 : 210, { justifyContent: "center" })}>
        {summary && (
          <Block id="takeaway" style={{ marginBottom: 56 }}>
            <div className="nb-card nb-summary">
              <span className="nb-chip nb-chip-accent" style={{ fontSize: fs(22) }}>
                {t.summary}:
              </span>
              <EditableText path="takeaway" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 34], [220, 30]], 27)), lineHeight: 1.5, marginTop: 18 }} />
            </div>
          </Block>
        )}
        {follow ? (
          <Block id="visual" style={{ marginBottom: 30 }}>
            <FollowCard />
          </Block>
        ) : (
          <Block id="visual">
            <div className="nb-card nb-action">
              <span className="nb-action-icon">
                <CtaGlyph size={50} strokeWidth={2.4} />
              </span>
              <EditableText path="title" as="h2" className={display} style={{ fontSize: fs(titleSize(sizeFor(s.title, [[30, 56], [50, 48]], 42))), ...bold, lineHeight: 1.06 }} />
            </div>
          </Block>
        )}
        {follow && <Txt path="title" as="h2" className={display} size={titleSize(sizeFor(s.title, [[30, 70], [50, 60]], 52))} style={bold} />}
        <Txt path="subtitle" size={30} style={{ lineHeight: 1.45, color: "var(--muted)" }} blockStyle={{ marginTop: 26 }} />
      </FitBox>
      <CtaPointer size={124} strokeWidth={3} />
      <Signoff />
    </>
  );
}

export const brutalistLayouts: LayoutMap = {
  cover: Cover,
  text: Text,
  quote: Quote,
  statement: Statement,
  stat: Stat,
  list: List,
  cta: Cta,
};
