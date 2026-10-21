"use client";

/**
 * MDE (design system "Me dá um Exemplo"): a streaming catalog's promo voice. Photos take the
 * background under a deep purple gradient, titles are heavy and condensed, coral marks the one
 * thing to look at, and emoji (not icons) give each point its face.
 */

import { Fragment, type CSSProperties } from "react";
import { CircleHelp } from "lucide-react";
import { useCarousel } from "@/store/carousel";
import { fs, sizeFor, useSlideOf } from "../context";
import { emojiFor } from "../emoji";
import { CHROME_TEXT } from "../i18n";
import { Caption, CtaGlyph, CtaPointer, FollowCard, Signoff, Title, Txt, display, useCta, wantsPhoto, type LayoutMap } from "../kit";
import { Block, EditableText, FitBox, Photo } from "../parts";

const condensed = "display mde-condensed";
const heading: CSSProperties = { fontWeight: 600, lineHeight: 1.18, letterSpacing: "-0.035em" };
const side = { left: 72, right: 72 };

/** Full-bleed photo under the catalog's purple gradient */
function Backdrop({ pos }: { pos?: { x: number; y: number } }) {
  return (
    <>
      <Photo className="absolute inset-0" credit="side" defaultPos={pos} />
      <div className="mde-hero-shade" />
    </>
  );
}

function Cover() {
  const { s } = useSlideOf("cover");
  const size = sizeFor(s.title, [[40, 128], [70, 112], [100, 96]], 84);
  return (
    <>
      <Backdrop />
      <FitBox style={{ top: 420, ...side, justifyContent: "flex-end" }}>
        <Txt path="kicker" className="mde-tag" size={24} blockStyle={{ marginBottom: 30, alignSelf: "flex-start" }} />
        <Txt path="title" as="h1" className={condensed} size={size} style={{ lineHeight: 0.92 }} />
        <Txt path="subtitle" size={32} style={{ lineHeight: 1.55, color: "var(--muted)", maxWidth: 880 }} blockStyle={{ marginTop: 26 }} />
      </FitBox>
    </>
  );
}

function Text() {
  const { s } = useSlideOf("text");
  if (wantsPhoto(s)) {
    // The photo takes the whole top; the title sits on its gradient, the explanation below
    return (
      <>
        <div className="mde-top-photo">
          <Photo className="absolute inset-0" credit="side" />
          <div className="mde-top-shade" />
        </div>
        <FitBox style={{ top: 360, height: 430, ...side, justifyContent: "flex-end" }}>
          <Txt path="kicker" className="mde-tag" size={22} blockStyle={{ marginBottom: 22, alignSelf: "flex-start" }} />
          <Txt path="title" as="h2" className={condensed} size={sizeFor(s.title, [[40, 86], [70, 74]], 64)} style={{ lineHeight: 0.96 }} />
        </FitBox>
        <FitBox style={{ top: 820, ...side, justifyContent: "flex-start" }}>
          <Txt path="body" as="p" size={32} style={{ lineHeight: 1.65, color: "var(--muted)" }} />
        </FitBox>
      </>
    );
  }
  return (
    <>
      <Txt path="kicker" className="mde-tag" size={22} blockClass="mde-tag-slot mde-tag-page" />
      <FitBox style={{ top: 230, ...side, justifyContent: "center" }}>
        <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[30, 76], [60, 66], [90, 58]], 52)} style={heading} />
        <Txt path="body" as="p" size={34} style={{ lineHeight: 1.75, color: "var(--muted)" }} blockStyle={{ marginTop: 26 }} />
      </FitBox>
    </>
  );
}

/** "O que é": an emoji, the term and its meaning, then an arrow down to the example in coral */
function Explainer() {
  const { s } = useSlideOf("explainer");
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <div className="mde-card">
        <span className="mde-emoji">{emojiFor(s.icon, "💡")}</span>
        <Txt path="kicker" className="mde-label" size={24} blockStyle={{ marginTop: 26 }} />
        <Txt path="term" as="h2" className={condensed} size={sizeFor(s.term, [[16, 112], [30, 92], [50, 76]], 64)} style={{ lineHeight: 0.95 }} blockStyle={{ marginTop: 8 }} />
        <Txt path="definition" size={34} style={{ lineHeight: 1.55 }} blockStyle={{ marginTop: 22 }} />
      </div>
      {s.example && (
        <>
          <svg className="mde-arrow" viewBox="0 0 80 110" width={64} height={88} fill="none" stroke="var(--accent)" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M30 6 C14 38 20 66 40 94" />
            <path d="M22 82 L41 96 L52 74" />
          </svg>
          <Block id="example">
            <div className="mde-example">
              <EditableText path="example" style={{ fontSize: fs(31), lineHeight: 1.5, fontWeight: 500 }} />
            </div>
          </Block>
        </>
      )}
    </FitBox>
  );
}

function Quote() {
  const { s } = useSlideOf("quote");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.quote, [[70, 72], [120, 62], [180, 54]], 46);
  return (
    <>
      {photo ? <Backdrop pos={{ x: 50, y: 22 }} /> : <div className="mde-quote-glow" />}
      <FitBox style={{ top: photo ? 520 : 150, ...side, justifyContent: photo ? "flex-end" : "center" }}>
        <div className="mde-quote-mark">“</div>
        <Txt path="quote" className={display} size={size} style={{ ...heading, lineHeight: 1.16 }} />
        <Block id="author" className="mde-byline" style={{ marginTop: 34 }}>
          <EditableText path="author" style={{ fontSize: fs(32), fontWeight: 700, lineHeight: 1.25 }} />
          <EditableText path="role" style={{ fontSize: fs(25), color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }} />
        </Block>
      </FitBox>
    </>
  );
}

/** A photo behind the sentence, like a promo frame: its own, or else the story's cover */
function Statement() {
  const { s } = useSlideOf("statement");
  const cover = useCarousel((st) => st.carousel?.slides[0]?.image ?? null);
  const bg = s.image ? "own" : cover ? "cover" : null;
  const size = sizeFor(s.text, [[50, 92], [80, 80], [120, 70], [170, 60]], 52);
  return (
    <>
      {bg === "own" && <Photo className="absolute inset-0" credit="side" />}
      {bg === "cover" && cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="mde-bg-photo" src={cover.url} alt="" style={{ objectPosition: cover.pos ? `${cover.pos.x}% ${cover.pos.y}%` : undefined }} />
      )}
      {bg && <div className="mde-hero-shade mde-hero-shade-full" />}
      <FitBox style={{ ...side, justifyContent: bg ? "flex-end" : "center" }}>
        <Txt path="text" as="p" className={condensed} size={size} style={{ lineHeight: 0.98 }} />
      </FitBox>
    </>
  );
}

function Stat() {
  const { s } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 300], [5, 240], [7, 190], [10, 150], [14, 116]], 96);
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <div className="mde-card">
        <Txt path="kicker" className="mde-tag mde-tag-inline" size={22} blockStyle={{ alignSelf: "flex-start" }} />
        <Txt path="value" className={condensed} size={valueSize} style={{ lineHeight: 0.9, color: "var(--accent)" }} blockStyle={{ marginTop: 26 }} />
        {s.share !== null && (
          <div className="mde-progress mde-progress-real" style={{ marginTop: 30 }}>
            <div style={{ width: `${Math.max(2, s.share)}%` }} />
          </div>
        )}
        <Txt path="label" className={display} size={sizeFor(s.label, [[40, 46], [80, 40]], 34)} style={heading} blockStyle={{ marginTop: 30 }} />
        <Txt path="context" size={28} style={{ lineHeight: 1.7, color: "var(--muted)" }} blockStyle={{ marginTop: 12 }} />
      </div>
    </FitBox>
  );
}

/** The question with its mark above, a huge soft "?" behind, the answer below */
function QA() {
  const { s } = useSlideOf("qa");
  return (
    <>
      <div className="mde-big-question" aria-hidden>
        ?
      </div>
      <FitBox style={{ ...side, justifyContent: "center" }}>
        <span className="mde-qmark">
          <CircleHelp size={64} strokeWidth={2} />
        </span>
        <Txt path="question" as="h2" className={display} size={sizeFor(s.question, [[40, 72], [80, 60]], 50)} style={heading} blockStyle={{ marginTop: 30 }} />
        <Txt path="answer" size={sizeFor(s.answer, [[120, 38], [220, 34]], 30)} style={{ lineHeight: 1.6, color: "var(--muted)" }} blockStyle={{ marginTop: 30 }} />
      </FitBox>
    </>
  );
}

function Grid() {
  const { s } = useSlideOf("grid");
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <Title text={s.title} max={66} mb={40} />
      <Block id="items" className="mde-grid">
        {s.items.map((it, i) => (
          <div key={i} className="mde-cell">
            <span className="mde-cell-emoji">{emojiFor(it.icon)}</span>
            <EditableText path={`items.${i}.title`} style={{ fontSize: fs(34), fontWeight: 700, lineHeight: 1.15, marginTop: 18 }} />
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(26), lineHeight: 1.5, color: "var(--muted)", marginTop: 8 }} />
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

function List() {
  const { s } = useSlideOf("list");
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 66], [70, 58]], 50)} style={heading} blockStyle={{ marginBottom: 40 }} />
      <Block id="items" className="mde-rows">
        {s.items.map((it, i) => (
          <div key={i} className="mde-row">
            <span className="mde-row-emoji">{it.icon ? emojiFor(it.icon) : i + 1}</span>
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(31), lineHeight: 1.45 }} />
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

function Compare() {
  const { s } = useSlideOf("compare");
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      {s.title && <Title text={s.title} max={66} mb={44} />}
      <Block id="sides" className="mde-compare">
        {(["left", "right"] as const).map((k) => (
          <div key={k} className={k === "right" ? "mde-side mde-side-hot" : "mde-side"}>
            <span className="mde-cell-emoji">{emojiFor(s[k].icon, k === "left" ? "⏪" : "⏩")}</span>
            <EditableText path={`${k}.label`} className={condensed} style={{ fontSize: fs(54), lineHeight: 0.95, marginTop: 16 }} />
            <div className="mde-side-points">
              {s[k].points.map((_, i) => (
                <EditableText key={i} path={`${k}.points.${i}`} style={{ fontSize: fs(28), lineHeight: 1.4 }} />
              ))}
            </div>
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

/** Two columns, both reading from the left, split by a rule with the VS on it */
function Versus() {
  const { s } = useSlideOf("versus");
  return (
    <FitBox style={{ top: 140, ...side, justifyContent: "center" }}>
      <Txt path="title" as="h2" className={condensed} size={sizeFor(s.title, [[40, 84], [70, 72]], 62)} style={{ lineHeight: 0.96 }} blockStyle={{ marginBottom: 40 }} />
      <Block id="sides" className="mde-versus">
        {(["left", "right"] as const).map((k, i) => (
          <div key={k} className="mde-vs-col">
            <div className="mde-vs-photo">
              <Photo className="absolute inset-0" slot={i === 0 ? 1 : 2} credit={false} defaultPos={{ x: 50, y: 25 }} />
            </div>
            <Caption slot={i === 0 ? 1 : 2} className="mde-vs-credit" />
            <EditableText path={`${k}.name`} className={condensed} style={{ fontSize: fs(56), lineHeight: 0.95, marginTop: 20 }} />
            <EditableText path={`${k}.stance`} style={{ fontSize: fs(28), lineHeight: 1.45, color: "var(--muted)", marginTop: 10 }} />
          </div>
        ))}
        <span className="mde-vs-rule">
          <b>VS</b>
        </span>
      </Block>
      <Txt path="note" size={25} style={{ lineHeight: 1.5, color: "var(--muted)" }} blockStyle={{ marginTop: 30 }} />
    </FitBox>
  );
}

/** Bars with their label inside, the biggest one in coral */
function Chart() {
  const { s } = useSlideOf("chart");
  const max = Math.max(...s.bars.map((b) => Math.abs(b.value)), 0);
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <Title text={s.title} max={64} mb={48} />
      <Block id="bars" className="mde-bars">
        {s.bars.map((b, i) => {
          const pct = max > 0 ? Math.max(24, (Math.abs(b.value) / max) * 100) : 24;
          const top = Math.abs(b.value) === max;
          return (
            <Fragment key={i}>
              <div className={top ? "mde-bar mde-bar-top" : "mde-bar"} style={{ width: `${pct}%` }}>
                <EditableText path={`bars.${i}.label`} style={{ fontSize: fs(28), fontWeight: 700, whiteSpace: "nowrap" }} />
              </div>
              <EditableText path={`bars.${i}.display`} className={condensed} style={{ fontSize: fs(56), lineHeight: 1, color: top ? "var(--accent)" : "var(--fg)", whiteSpace: "nowrap" }} />
            </Fragment>
          );
        })}
      </Block>
      <Txt path="note" size={26} style={{ color: "var(--muted)" }} blockStyle={{ marginTop: 40 }} />
    </FitBox>
  );
}

function Diagram() {
  const { s } = useSlideOf("diagram");
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <Title text={s.title} max={64} mb={40} />
      <Block id="nodes" className="mde-flow">
        {s.nodes.map((n, i) => (
          <div key={i} className={i === s.nodes.length - 1 && s.nodes.length > 1 ? "mde-node mde-node-hot" : "mde-node"}>
            <span className="mde-row-emoji">{emojiFor(n.icon, "➡️")}</span>
            <EditableText path={`nodes.${i}.text`} style={{ fontSize: fs(31), lineHeight: 1.4, fontWeight: 600 }} />
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
      <FitBox style={{ top: 140, bottom: follow ? 110 : 200, ...side, justifyContent: "center" }}>
        {summary && (
          <Block id="takeaway" style={{ marginBottom: 56 }}>
            <div className="mde-card">
              <div className="mde-label" style={{ fontSize: fs(22) }}>
                {t.summary}:
              </div>
              <EditableText path="takeaway" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 34], [220, 30]], 27)), lineHeight: 1.7, marginTop: 14 }} />
            </div>
          </Block>
        )}
        <Block id="visual" style={{ marginBottom: 32 }}>
          {follow ? (
            <FollowCard />
          ) : (
            <span className="mde-tile mde-tile-accent">
              <CtaGlyph size={50} strokeWidth={2} />
            </span>
          )}
        </Block>
        <Txt path="title" as="h2" className={condensed} size={titleSize(sizeFor(s.title, [[30, 96], [50, 84]], 72))} style={{ lineHeight: 0.95 }} />
        <Txt path="subtitle" size={31} style={{ lineHeight: 1.6, color: "var(--muted)" }} blockStyle={{ marginTop: 20 }} />
      </FitBox>
      <CtaPointer size={116} strokeWidth={2.2} />
      <Signoff />
    </>
  );
}

export const mdeLayouts: LayoutMap = {
  cover: Cover,
  text: Text,
  explainer: Explainer,
  quote: Quote,
  statement: Statement,
  stat: Stat,
  qa: QA,
  grid: Grid,
  list: List,
  compare: Compare,
  versus: Versus,
  chart: Chart,
  diagram: Diagram,
  cta: Cta,
};
