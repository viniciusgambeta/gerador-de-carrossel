"use client";

/**
 * Orbital (design system "Orbital Command"): mission control. Photos are tracked through a
 * reticle, numbers live in telemetry panels with tabular figures, lists read as an event log
 * and quotes as an incoming transmission. Fine lines, 4px corners, no glow on text.
 */

import type { CSSProperties, ReactNode } from "react";
import { fs, sizeFor, useSlideOf } from "../context";
import { CHROME_TEXT } from "../i18n";
import { Caption, CtaGlyph, CtaPointer, FollowCard, Signoff, Title, Txt, cx, display, initials, pad2, useCta, wantsPhoto, type LayoutMap } from "../kit";
import { Block, EditableText, FitBox, Photo } from "../parts";

const page = (top = 150, bottom = 150, extra?: CSSProperties): CSSProperties => ({ top, bottom, left: 72, right: 72, ...extra });

function Panel({ label, meta, className, style, children }: { label?: ReactNode; meta?: ReactNode; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cx("ob-panel", className)} style={style}>
      <i className="ob-corner ob-tl" />
      <i className="ob-corner ob-tr" />
      <i className="ob-corner ob-bl" />
      <i className="ob-corner ob-br" />
      {(label || meta) && (
        <div className="ob-head">
          <span>{label}</span>
          <span>{meta}</span>
        </div>
      )}
      {children}
    </div>
  );
}

/** Crosshair, range rings and scale ticks over a photo */
function Reticle() {
  return (
    <div className="ob-reticle" aria-hidden>
      <svg viewBox="0 0 240 240" width={240} height={240}>
        <circle cx={120} cy={120} r={70} />
        <circle cx={120} cy={120} r={110} strokeDasharray="4 10" />
        <path d="M120 0 V86 M120 154 V240 M0 120 H86 M154 120 H240" />
      </svg>
    </div>
  );
}

export function Orbits({ style }: { style?: CSSProperties }) {
  return (
    <svg className="ob-orbits" viewBox="0 0 400 400" style={style} aria-hidden>
      <ellipse cx={200} cy={200} rx={190} ry={78} transform="rotate(-22 200 200)" vectorEffect="non-scaling-stroke" />
      <ellipse cx={200} cy={200} rx={150} ry={150} strokeDasharray="2 8" vectorEffect="non-scaling-stroke" />
      <ellipse cx={200} cy={200} rx={110} ry={46} transform="rotate(38 200 200)" vectorEffect="non-scaling-stroke" />
      <circle cx={200} cy={200} r={22} fill="rgb(82 214 232 / 0.12)" stroke="rgb(82 214 232 / 0.6)" vectorEffect="non-scaling-stroke" />
      <circle cx={374} cy={130} r={7} fill="var(--accent)" stroke="none" />
      <circle cx={112} cy={318} r={5} fill="var(--accent)" stroke="none" />
    </svg>
  );
}

const seq = (index: number, total: number) => `SEQ ${pad2(index + 1)}/${pad2(total)}`;

function Cover() {
  const { s, index, total } = useSlideOf("cover");
  const size = sizeFor(s.title, [[40, 84], [70, 72], [100, 62]], 54);
  return (
    <>
      <Panel label={`IMG ${pad2(index + 1)}`} meta={seq(index, total)} className="ob-photo-panel" style={{ position: "absolute", top: 140, left: 72, right: 72, height: 640 }}>
        <div className="ob-photo">
          <Photo className="absolute inset-0" credit="bottom" />
          <Reticle />
        </div>
      </Panel>
      <FitBox style={page(820, 150, { justifyContent: "flex-start" })}>
        <Txt path="kicker" className="ob-status" size={22} blockStyle={{ marginBottom: 22 }} />
        <Txt path="title" as="h1" className={display} size={size} style={{ fontWeight: 600, lineHeight: 1.06, letterSpacing: "-0.02em" }} />
        <Txt path="subtitle" size={30} style={{ lineHeight: 1.5, color: "var(--muted)" }} blockStyle={{ marginTop: 20 }} />
      </FitBox>
    </>
  );
}

function Text() {
  const { s, index, total } = useSlideOf("text");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.title, [[30, photo ? 60 : 72], [60, photo ? 52 : 62]], photo ? 46 : 54);
  return (
    <>
      {!photo && <Orbits style={{ top: 110, right: -150, width: 620, height: 620 }} />}
      <FitBox style={page(150, 150, { justifyContent: "center" })}>
        {photo && (
          <Panel label={`IMG ${pad2(index + 1)}`} meta={seq(index, total)} className="ob-photo-panel ob-photo-flow">
            <div className="ob-photo">
              <Photo className="absolute inset-0" credit="bottom" />
              <Reticle />
            </div>
          </Panel>
        )}
        <Txt path="kicker" className="ob-status" size={22} blockStyle={{ marginBottom: 20 }} />
        <Txt path="title" as="h2" className={display} size={size} style={{ fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.02em" }} />
        <Block id="body" style={{ marginTop: 32 }}>
          <Panel label="LOG" meta={photo ? undefined : seq(index, total)}>
            <EditableText path="body" as="p" style={{ fontSize: fs(photo ? 30 : 33), lineHeight: 1.55 }} />
          </Panel>
        </Block>
      </FitBox>
    </>
  );
}

function Quote() {
  const { s, index, total } = useSlideOf("quote");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.quote, [[70, 60], [120, 52], [180, 46]], 40);
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      <Block id="author" className="ob-quote-head">
        <div className="ob-target">
          {photo ? <Photo className="absolute inset-0" credit={false} defaultPos={{ x: 50, y: 25 }} /> : <span>{initials(s.author) || "?"}</span>}
          <svg viewBox="0 0 220 220" aria-hidden>
            <circle cx={110} cy={110} r={104} strokeDasharray="6 9" />
            <path d="M110 0 V22 M110 198 V220 M0 110 H22 M198 110 H220" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="ob-mono ob-dim" style={{ fontSize: fs(20) }}>
            SIG · {seq(index, total)}
          </div>
          <EditableText path="author" style={{ fontSize: fs(38), fontWeight: 600, lineHeight: 1.15, marginTop: 8 }} />
          <EditableText path="role" style={{ fontSize: fs(25), color: "var(--muted)", marginTop: 6, lineHeight: 1.35 }} />
        </div>
      </Block>
      <Block id="quote" style={{ marginTop: 40 }}>
        <Panel className="ob-quote">
          <EditableText path="quote" className={display} style={{ fontSize: fs(size), fontWeight: 500, lineHeight: 1.22, letterSpacing: "-0.01em" }} />
        </Panel>
      </Block>
      <Caption className="ob-mono ob-dim ob-caption" />
    </FitBox>
  );
}

function Statement() {
  const { s, index, total } = useSlideOf("statement");
  const size = sizeFor(s.text, [[50, 84], [80, 72], [120, 62], [170, 54]], 48);
  return (
    <>
      <Orbits style={{ top: 225, left: 90, width: 900, height: 900 }} />
      <FitBox style={page(150, 150, { justifyContent: "center", alignItems: "center", textAlign: "center" })}>
        <div className="ob-mono ob-dim" style={{ fontSize: fs(22), marginBottom: 34 }}>
          {seq(index, total)}
        </div>
        <Txt path="text" as="p" className={display} size={size} style={{ fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.025em" }} blockClass="ob-statement" />
      </FitBox>
    </>
  );
}

function Stat() {
  const { s, index, total } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 240], [5, 190], [7, 150], [10, 116], [14, 90]], 76);
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      <Panel label={<EditableText path="kicker" />} meta={seq(index, total)} className="ob-telemetry">
        <Txt path="value" className="ob-number" size={valueSize} style={{ lineHeight: 1, color: "var(--accent)" }} blockStyle={{ marginTop: 18 }} />
        {s.share !== null && (
          <div className="ob-gauge" style={{ marginTop: 36 }}>
            <div style={{ width: `${Math.max(2, s.share)}%` }} />
          </div>
        )}
        <Txt path="label" className={display} size={sizeFor(s.label, [[40, 48], [80, 40]], 34)} style={{ fontWeight: 600, lineHeight: 1.15 }} blockStyle={{ marginTop: 36 }} />
        <Txt path="context" size={28} style={{ lineHeight: 1.55, color: "var(--muted)" }} blockStyle={{ marginTop: 14 }} />
      </Panel>
    </FitBox>
  );
}

function List() {
  const { s } = useSlideOf("list");
  return (
    <FitBox style={page(150, 150, { justifyContent: "center" })}>
      <Title text={s.title} max={68} mb={40} />
      <Block id="items">
        <Panel label="LOG" meta={`N ${pad2(s.items.length)}`}>
          <div className="ob-events">
            {s.items.map((_, i) => (
              <div key={i} className="ob-event">
                <span className="ob-mono ob-dim">T+{pad2(i + 1)}</span>
                <i className="ob-dot" />
                <EditableText path={`items.${i}.text`} style={{ fontSize: fs(31), lineHeight: 1.42 }} />
              </div>
            ))}
          </div>
        </Panel>
      </Block>
    </FitBox>
  );
}

function Cta() {
  const { s, language, follow, summary, titleSize } = useCta();
  const t = CHROME_TEXT[language];
  return (
    <>
      <FitBox style={page(140, follow ? 110 : 200, { justifyContent: "center" })}>
        {summary && (
          <Block id="takeaway" style={{ marginBottom: 60 }}>
            <Panel label={`${t.summary}:`}>
              <EditableText path="takeaway" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 35], [220, 31]], 28)), lineHeight: 1.55 }} />
            </Panel>
          </Block>
        )}
        <Block id="visual" style={{ marginBottom: 34 }}>
          {follow ? (
            <FollowCard />
          ) : (
            <span className="ob-cta-icon">
              <CtaGlyph size={52} strokeWidth={1.8} />
            </span>
          )}
        </Block>
        <Txt path="title" as="h2" className={display} size={titleSize(sizeFor(s.title, [[30, 74], [50, 64]], 56))} style={{ fontWeight: 600, lineHeight: 1.06, letterSpacing: "-0.02em" }} />
        <Txt path="subtitle" size={30} style={{ lineHeight: 1.5, color: "var(--muted)" }} blockStyle={{ marginTop: 18 }} />
      </FitBox>
      <CtaPointer size={110} strokeWidth={1.8} />
      <Signoff />
    </>
  );
}

export const orbitalLayouts: LayoutMap = {
  cover: Cover,
  text: Text,
  quote: Quote,
  statement: Statement,
  stat: Stat,
  list: List,
  cta: Cta,
};
