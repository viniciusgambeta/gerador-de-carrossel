"use client";

/**
 * Mangá (design system "Manga Ink"): each slide is a comic page. Photos become screentoned
 * panels cut by diagonal gutters, quotes are speech balloons pointing at the speaker, big
 * numbers explode in an impact burst, the summary is the author's note. Ink, paper, one yellow.
 */

import type { CSSProperties, ReactNode } from "react";
import { fs, sizeFor, useSlideOf } from "../context";
import { CHROME_TEXT } from "../i18n";
import { Avatar, CtaGlyph, CtaPointer, FollowCard, Signoff, Txt, cx, display, initials, pad2, useCta, wantsPhoto, type LayoutMap } from "../kit";
import { Balloon as InkBalloon } from "../balloon";
import { Block, EditableText, FitBox, Photo } from "../parts";

const page = (top = 150, bottom = 150, extra?: CSSProperties): CSSProperties => ({ top, bottom, left: 72, right: 72, ...extra });
const shout: CSSProperties = { fontWeight: 700, fontStyle: "italic", textTransform: "uppercase", lineHeight: 1.0, letterSpacing: "-0.04em" };

/** "0% 0%, 100% 0%" (clip-path) → "0,0 100,0" (SVG points) */
const toPoints = (clip: string) =>
  clip
    .split(",")
    .map((p) => p.trim().replace(/%/g, "").split(/\s+/).join(","))
    .join(" ");

/** Comic page cut into panels; shapes are polygons in % of the page */
function ComicPage({ cells, style }: { cells: { clip: string; className?: string; children?: ReactNode }[]; style: CSSProperties }) {
  return (
    <div className="mg-page" style={style}>
      {cells.map((c, i) => (
        <div key={i} className={cx("mg-cell", c.className)} style={{ clipPath: `polygon(${c.clip})` }}>
          {c.children}
        </div>
      ))}
      <svg className="mg-gutters" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {cells.map((c, i) => (
          <polygon key={i} points={toPoints(c.clip)} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  );
}

/** Inked speech balloon; the tail points down toward the speaker */
function Balloon({ className, tail = "left", children }: { className?: string; tail?: "left" | "right"; children: ReactNode }) {
  return (
    <InkBalloon variant="ink" tail={tail} className={cx("mg-balloon", className)}>
      {children}
    </InkBalloon>
  );
}

const IMPACT = Array.from({ length: 26 }, (_, i) => {
  const a = (i / 26) * Math.PI * 2;
  const r = i % 2 ? 34 + ((i * 7) % 5) : 48 + ((i * 3) % 3);
  return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
}).join(" ");

function Cover() {
  const { s, index } = useSlideOf("cover");
  const size = sizeFor(s.title, [[40, 86], [70, 74], [100, 64]], 56);
  return (
    <>
      <ComicPage
        style={{ top: 130, left: 60, right: 60, height: 670 }}
        cells={[
          { clip: "0% 0%, 100% 0%, 100% 63%, 0% 79%", children: <Photo className="mg-photo absolute inset-0" credit="bottom" /> },
          { clip: "0% 83.5%, 57% 73%, 57% 100%, 0% 100%", className: "mg-speed-cell" },
          {
            clip: "60.5% 72.4%, 100% 67%, 100% 100%, 60.5% 100%",
            className: "mg-yellow-cell",
            children: <span className="mg-chapter">#{pad2(index + 1)}</span>,
          },
        ]}
      />
      <FitBox style={page(850, 150, { justifyContent: "flex-start" })}>
        <Txt path="kicker" className="mg-caption" size={24} blockStyle={{ marginBottom: 22, alignSelf: "flex-start" }} />
        <Txt path="title" as="h1" className={display} size={size} style={shout} />
        <Txt path="subtitle" size={30} style={{ lineHeight: 1.45, color: "var(--muted)" }} blockStyle={{ marginTop: 18 }} />
      </FitBox>
    </>
  );
}

function Text() {
  const { s, index } = useSlideOf("text");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.title, [[30, photo ? 62 : 76], [60, photo ? 54 : 66]], photo ? 46 : 54);
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      {photo && (
        <div className="mg-frame mg-frame-flow" style={{ rotate: `${index % 2 ? 1.2 : -1.2}deg` }}>
          <Photo className="mg-photo absolute inset-0" credit="bottom" />
        </div>
      )}
      <Txt path="kicker" className="mg-caption" size={22} blockStyle={{ marginBottom: 20, alignSelf: "flex-start" }} />
      <Txt path="title" as="h2" className={display} size={size} style={shout} />
      <Block id="body" style={{ marginTop: 32 }}>
        <div className="mg-box">
          <EditableText path="body" as="p" style={{ fontSize: fs(photo ? 30 : 34), lineHeight: 1.5 }} />
        </div>
      </Block>
    </FitBox>
  );
}

function Quote() {
  const { s, safeBottom } = useSlideOf("quote");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.quote, [[70, 54], [120, 46], [180, 40]], 36);
  return (
    <>
      <div className={cx("mg-frame", !photo && "mg-speed-cell")} style={{ position: "absolute", left: 60, right: 60, bottom: safeBottom, height: 540, rotate: "-1deg" }}>
        {photo ? <Photo className="mg-photo absolute inset-0" credit="bottom" defaultPos={{ x: 50, y: 22 }} /> : <span className="mg-initials">{initials(s.author) || "?"}</span>}
        <Block id="author" className="mg-name">
          <EditableText path="author" style={{ fontSize: fs(30), fontWeight: 700, lineHeight: 1.1, textTransform: "uppercase" }} />
          <EditableText path="role" style={{ fontSize: fs(22), lineHeight: 1.3, marginTop: 4 }} />
        </Block>
      </div>
      <FitBox style={{ ...page(140), bottom: undefined, height: 1350 - 140 - safeBottom - 550, justifyContent: "flex-end", alignItems: "center" }}>
        <Block id="quote">
          <Balloon>
            <EditableText path="quote" className={display} style={{ fontSize: fs(size), fontWeight: 700, lineHeight: 1.12, textAlign: "center" }} />
          </Balloon>
        </Block>
      </FitBox>
    </>
  );
}

function Statement() {
  const { s } = useSlideOf("statement");
  const size = sizeFor(s.text, [[50, 82], [80, 70], [120, 60], [170, 52]], 46);
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      <Block id="text">
        <div className="mg-impact">
          <div className="mg-speed" />
          <div className="mg-impact-text">
            <EditableText path="text" as="p" className={display} style={{ fontSize: fs(size), ...shout, textAlign: "center" }} />
          </div>
        </div>
      </Block>
    </FitBox>
  );
}

function Stat() {
  const { s } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 200], [5, 160], [7, 128], [10, 100], [14, 80]], 66);
  return (
    <FitBox style={page(150, 150, { justifyContent: "center", alignItems: "center", textAlign: "center" })}>
      <Txt path="kicker" className="mg-caption" size={24} blockStyle={{ marginBottom: 26 }} />
      <Block id="value">
        <div className="mg-burst">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polygon points={IMPACT} vectorEffect="non-scaling-stroke" />
          </svg>
          <EditableText path="value" className={display} style={{ fontSize: fs(valueSize), ...shout, lineHeight: 0.95 }} />
        </div>
      </Block>
      {s.share !== null && (
        <div className="mg-meter" style={{ marginTop: 30 }}>
          <div style={{ width: `${Math.max(2, s.share)}%` }} />
        </div>
      )}
      <Txt path="label" className={display} size={sizeFor(s.label, [[40, 52], [80, 44]], 38)} style={{ ...shout, lineHeight: 1.08, letterSpacing: "-0.02em" }} blockStyle={{ marginTop: 30 }} />
      <Txt path="context" size={29} style={{ lineHeight: 1.45, color: "var(--muted)" }} blockStyle={{ marginTop: 16 }} />
    </FitBox>
  );
}

function List() {
  const { s } = useSlideOf("list");
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 70], [70, 60]], 52)} style={shout} blockStyle={{ marginBottom: 34 }} />
      <Block id="items" className="mg-episodes">
        {s.items.map((_, i) => (
          <div key={i} className="mg-episode">
            <span className="mg-ep-num">{pad2(i + 1)}</span>
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(33), lineHeight: 1.36 }} />
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

function Cta() {
  const { s, language, follow, handle, summary, titleSize } = useCta();
  const t = CHROME_TEXT[language];
  return (
    <>
      <FitBox style={page(140, follow ? 110 : 210, { justifyContent: "center" })}>
        {summary && (
          <Block id="takeaway" style={{ marginBottom: 56 }}>
            <div className="mg-note">
              <div className="mg-note-head">
                <span className="mg-note-avatar">
                  <Avatar size={70} />
                </span>
                <div>
                  <b>{handle}</b>
                  <span>{t.summary}:</span>
                </div>
              </div>
              <EditableText path="takeaway" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 34], [220, 30]], 27)), lineHeight: 1.5 }} />
            </div>
          </Block>
        )}
        {follow ? (
          <Block id="visual" style={{ marginBottom: 30 }}>
            <FollowCard />
          </Block>
        ) : (
          <Block id="visual">
            <Balloon className="mg-cta-balloon" tail="right">
              <span className="mg-cta-icon">
                <CtaGlyph size={50} strokeWidth={2.4} />
              </span>
              <EditableText path="title" as="h2" className={display} style={{ fontSize: fs(titleSize(sizeFor(s.title, [[30, 58], [50, 50]], 44))), ...shout, lineHeight: 1.04 }} />
            </Balloon>
          </Block>
        )}
        {follow && <Txt path="title" as="h2" className={display} size={titleSize(sizeFor(s.title, [[30, 70], [50, 60]], 52))} style={shout} />}
        {/* Clear of the balloon's tail */}
        <Txt path="subtitle" size={30} style={{ lineHeight: 1.45, color: "var(--muted)" }} blockStyle={{ marginTop: follow ? 18 : 130 }} />
      </FitBox>
      <CtaPointer size={130} strokeWidth={3} />
      <Signoff />
    </>
  );
}

export const mangaLayouts: LayoutMap = {
  cover: Cover,
  text: Text,
  quote: Quote,
  statement: Statement,
  stat: Stat,
  list: List,
  cta: Cta,
};
