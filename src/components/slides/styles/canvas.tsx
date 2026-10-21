"use client";

/**
 * Canvas (inspired by Figma's design system): the post being built in the editor. A dotted gray
 * canvas, square white frames with their names above, and the editor's own interface as the
 * decoration: selections with handles and live sizes, red spacing measures, a photo in crop mode,
 * the text toolbar, comment threads, the layers panel and collaborators' cursors.
 */

import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { handleOf } from "@/store/settings";
import { fs, sizeFor, useSlideOf } from "../context";
import { CHROME_TEXT } from "../i18n";
import { SlideIcon } from "../icons";
import { Caption, CtaGlyph, CtaPointer, FollowCard, Signoff, Txt, cx, display, initials, pad2, useCta, wantsPhoto, type LayoutMap } from "../kit";
import { Block, EditableText, Emoji, FitBox, Photo } from "../parts";

/** Multiplayer colors */
const PEOPLE = ["#9747FF", "#F24822", "#14AE5C", "#FF24BD"];
const M = 96;
const side = { left: M, right: M };
const heading: CSSProperties = { fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.035em" };
const muted: CSSProperties = { color: "var(--muted)", lineHeight: 1.5 };

/** The blue box and its four square handles */
function Handles() {
  return (
    <>
      <b className="cv-sel-box" />
      <i className="cv-h cv-h-tl" />
      <i className="cv-h cv-h-tr" />
      <i className="cv-h cv-h-bl" />
      <i className="cv-h cv-h-br" />
    </>
  );
}

/** Figma's selection: blue box, square handles and the layer's live size underneath ("" hides it) */
function Selection({ className, style, label, children }: { className?: string; style?: CSSProperties; label?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState("");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || label !== undefined) return;
    const read = () => setSize(`${Math.round(el.offsetWidth)} × ${Math.round(el.offsetHeight)}`);
    read();
    const watch = new ResizeObserver(read);
    watch.observe(el);
    return () => watch.disconnect();
  }, [label]);
  return (
    <div ref={ref} className={cx("cv-sel", className)} style={style}>
      {children}
      <Handles />
      {label !== "" && <span className="cv-badge">{label ?? size}</span>}
    </div>
  );
}

/** A frame on the canvas, with its name above the top-left corner */
function Frame({ name, selected, className, style, children }: { name: string; selected?: boolean; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cx("cv-frame", className)} style={style}>
      <span className="cv-frame-name">{name}</span>
      {children}
      {selected && <Handles />}
    </div>
  );
}

/** A collaborator's cursor with their name tag */
function Cursor({ name, color, style }: { name: string; color: string; style: CSSProperties }) {
  return (
    <div className="cv-cursor" style={style} aria-hidden>
      <svg viewBox="0 0 24 24" width={42} height={42} fill={color} stroke="#FFFFFF" strokeWidth={1.5} strokeLinejoin="round">
        <path d="M4 2.5 L4 19.5 L8.7 15.2 L11.7 21.5 L14.8 20 L11.9 13.9 L18.3 13.9 Z" />
      </svg>
      <span style={{ background: color }}>{name}</span>
    </div>
  );
}

/** Red spacing measure between two layers */
function Gap({ value }: { value: number }) {
  return (
    <div className="cv-gap" style={{ height: value }} aria-hidden>
      <i />
      <span>{value}</span>
    </div>
  );
}

/** A comment from the thread: the pin with the author's initials and the card beside it */
function Comment({ who, color, pin, time, className, style, children }: { who: string; color: string; pin?: string; time?: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cx("cv-comment", className)} style={style}>
      <span className="cv-pin" style={{ background: color }}>
        {pin ?? (initials(who.replace(/^@/, "")) || "?")}
      </span>
      <div className="cv-comment-card">
        <div className="cv-comment-head">
          <b>{who}</b>
          <span>{time ?? "agora"}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Cover() {
  const { s, profile } = useSlideOf("cover");
  const size = sizeFor(s.title, [[40, 92], [70, 80], [100, 70]], 60);
  return (
    <>
      {/* Crop mode: the whole picture dimmed, the part that stays in the frame bright */}
      <div className="cv-crop-ghost">
        <Photo className="absolute inset-0" credit={false} />
      </div>
      <Selection style={{ position: "absolute", top: 150, left: M, right: M, height: 480 }}>
        <div className="cv-crop">
          <Photo style={{ position: "absolute", top: -150, left: -M, width: 1080, height: 760 }} credit={false} />
        </div>
      </Selection>
      <Caption className="cv-caption" style={{ position: "absolute", top: 676, left: M, maxWidth: 300 }} />
      <Cursor name={handleOf(profile)} color={PEOPLE[0]} style={{ top: 560, right: 40 }} />
      <FitBox style={{ top: 720, ...side, justifyContent: "flex-end" }}>
        <Txt path="kicker" className="cv-component" size={24} blockStyle={{ marginBottom: 22 }} />
        <Txt path="title" as="h1" className={`${display} cv-typing`} size={size} style={heading} />
        <Txt path="subtitle" size={30} style={muted} blockStyle={{ marginTop: 22 }} />
      </FitBox>
    </>
  );
}

function Text() {
  const { s } = useSlideOf("text");
  if (wantsPhoto(s)) {
    // The picture as a selected layer, its fill settings floating over the corner
    return (
      <>
        <Frame name="imagem" style={{ position: "absolute", top: 176, left: M, right: M, height: 420 }}>
          <Selection style={{ position: "absolute", inset: 0 }}>
            <Photo className="absolute inset-0" credit={false} />
          </Selection>
        </Frame>
        <div className="cv-inspector" style={{ top: 470, right: 52 }} aria-hidden>
          <div className="cv-inspector-head">Preenchimento</div>
          <div className="cv-inspector-row">
            <i className="cv-swatch" />
            <span>Imagem</span>
            <em>100%</em>
          </div>
          <div className="cv-inspector-row">
            <span>Exposição</span>
            <em>+8</em>
          </div>
          <div className="cv-inspector-row">
            <span>Contraste</span>
            <em>+12</em>
          </div>
        </div>
        <Caption className="cv-caption" style={{ position: "absolute", top: 612, left: M, maxWidth: 330 }} />
        <FitBox style={{ top: 660, ...side, justifyContent: "flex-start" }}>
          <Txt path="kicker" className="cv-component" size={22} blockStyle={{ marginBottom: 18 }} />
          <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 58], [70, 50]], 44)} style={heading} />
          <Gap value={32} />
          <Txt path="body" as="p" size={30} style={muted} />
        </FitBox>
      </>
    );
  }
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <Txt path="kicker" className="cv-component" size={24} blockStyle={{ marginBottom: 26 }} />
      <Selection>
        <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[30, 76], [60, 66], [90, 58]], 52)} style={heading} />
      </Selection>
      <Gap value={72} />
      <Txt path="body" as="p" size={34} style={muted} />
    </FitBox>
  );
}

/** The term as a main component; the example comes as a comment on it */
function Explainer() {
  const { s, profile } = useSlideOf("explainer");
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <Frame name={`❖ ${s.kicker || "Componente"}`.replace(/\*\*/g, "")} className="cv-frame-component">
        <span className="cv-layer-icon">
          <SlideIcon name={s.icon} size={44} strokeWidth={1.8} />
        </span>
        <Txt path="term" as="h2" className={display} size={sizeFor(s.term, [[16, 92], [30, 76], [50, 62]], 54)} style={heading} blockStyle={{ marginTop: 26 }} />
        <Txt path="definition" size={33} style={{ lineHeight: 1.5 }} blockStyle={{ marginTop: 18 }} />
      </Frame>
      {s.example && (
        <Block id="example" style={{ marginTop: 40, marginLeft: 48 }}>
          <Comment who={handleOf(profile)} color={PEOPLE[1]}>
            <EditableText path="example" style={{ fontSize: fs(29), lineHeight: 1.5 }} />
          </Comment>
        </Block>
      )}
    </FitBox>
  );
}

function Quote() {
  const { s } = useSlideOf("quote");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.quote, [[70, 76], [120, 66], [180, 56]], 48);
  const first = (s.author ?? "").replace(/\*\*/g, "").split(/\s+/)[0] || "?";
  return (
    <>
      <FitBox style={{ ...side, justifyContent: "center" }}>
        <div className="cv-quote-mark">“</div>
        <Txt path="quote" className={`${display} cv-typing`} size={size} style={{ ...heading, fontWeight: 600, lineHeight: 1.16 }} blockClass="cv-textbox" />
        <Block id="author" className="cv-person" style={{ marginTop: 64 }}>
          <Selection className="cv-avatar-sel">
            <span className="cv-avatar">{photo ? <Photo className="absolute inset-0" credit={false} defaultPos={{ x: 50, y: 25 }} /> : initials(s.author) || "?"}</span>
          </Selection>
          <span style={{ minWidth: 0 }}>
            <EditableText path="author" style={{ fontSize: fs(32), fontWeight: 700, lineHeight: 1.2 }} />
            <EditableText path="role" style={{ fontSize: fs(25), ...muted, lineHeight: 1.35, marginTop: 4 }} />
          </span>
        </Block>
      </FitBox>
      <Cursor name={first} color={PEOPLE[2]} style={{ top: 168, right: 70 }} />
    </>
  );
}

/** A sentence in the middle of an edit: text toolbar above, selection on the highlight, caret at the end */
function Statement() {
  const { s, profile } = useSlideOf("statement");
  const size = sizeFor(s.text, [[50, 96], [80, 84], [120, 72], [170, 60]], 52);
  return (
    <>
      <FitBox style={{ ...side, justifyContent: "center" }}>
        <div className="cv-toolbar" aria-hidden>
          <span>Inter</span>
          <i />
          <span>Bold</span>
          <i />
          <span>{size}</span>
          <i />
          <b>B</b>
          <em>I</em>
          <u>U</u>
          <i />
          <span className="cv-toolbar-color" />
        </div>
        {s.emoji && (
          <Block id="emoji" style={{ marginTop: 40, alignSelf: "flex-start" }}>
            <Selection>
              <Emoji path="emoji" size={84} />
            </Selection>
          </Block>
        )}
        <Txt path="text" as="p" className={`${display} cv-typing`} size={size} style={{ ...heading, lineHeight: 1.04 }} blockClass="cv-textbox" blockStyle={{ marginTop: 46 }} />
      </FitBox>
      <Cursor name={handleOf(profile)} color={PEOPLE[3]} style={{ bottom: 320, right: 90 }} />
    </>
  );
}

function Stat() {
  const { s } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 280], [5, 220], [7, 176], [10, 136], [14, 106]], 86);
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <Txt path="kicker" className="cv-component" size={24} blockStyle={{ marginBottom: 26 }} />
      <Selection className="cv-hug">
        <Txt path="value" className={display} size={valueSize} style={{ fontWeight: 700, lineHeight: 0.9, letterSpacing: "-0.055em", color: "var(--accent)" }} />
      </Selection>
      {s.share !== null && (
        <div className="cv-meter" style={{ marginTop: 70 }}>
          <i style={{ width: `${Math.max(2, s.share)}%` }}>
            <span>{Math.round(s.share)}%</span>
          </i>
        </div>
      )}
      <Gap value={s.share !== null ? 40 : 64} />
      <Txt path="label" className={display} size={sizeFor(s.label, [[40, 46], [80, 40]], 34)} style={{ fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.015em" }} />
      <Txt path="context" size={29} style={muted} blockStyle={{ marginTop: 14 }} />
    </FitBox>
  );
}

/** Question and answer as a comment thread with its reply */
function QA() {
  const { s, profile } = useSlideOf("qa");
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <Block id="question">
        <Comment who="Leitor" color={PEOPLE[0]} pin="?" time="2 min">
          <EditableText path="question" className={display} style={{ fontSize: fs(sizeFor(s.question, [[40, 66], [80, 56]], 48)), ...heading, lineHeight: 1.15 }} />
        </Comment>
      </Block>
      <Block id="answer" style={{ marginTop: 34, marginLeft: 72 }}>
        <Comment who={handleOf(profile)} color="var(--accent)">
          <EditableText path="answer" style={{ fontSize: fs(sizeFor(s.answer, [[120, 37], [220, 33]], 29)), lineHeight: 1.55 }} />
        </Comment>
      </Block>
    </FitBox>
  );
}

const LAYER_GLYPHS = ["T", "#", "◇", "▢"];

/** The list as the layers panel, the first layer selected */
function List() {
  const { s } = useSlideOf("list");
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 64], [70, 56]], 48)} style={heading} blockStyle={{ marginBottom: 44 }} />
      <Block id="items" className="cv-panel">
        <div className="cv-panel-head">
          <b>Camadas</b>
          <span>{pad2(s.items.length)}</span>
        </div>
        {s.items.map((_, i) => (
          <div key={i} className={i === 0 ? "cv-layer cv-layer-on" : "cv-layer"}>
            <span className="cv-layer-glyph">{LAYER_GLYPHS[i % LAYER_GLYPHS.length]}</span>
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(34), lineHeight: 1.4 }} />
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

/** One frame per item, the second one selected */
function Grid() {
  const { s } = useSlideOf("grid");
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 62], [70, 54]], 48)} style={heading} blockStyle={{ marginBottom: 64 }} />
      <Block id="items" className="cv-grid">
        {s.items.map((it, i) => (
          <Frame key={i} name={`Frame ${i + 1}`} className="cv-cell" selected={i === 1}>
            <SlideIcon name={it.icon} size={42} strokeWidth={1.8} />
            <EditableText path={`items.${i}.title`} style={{ fontSize: fs(31), fontWeight: 700, lineHeight: 1.2, marginTop: 18 }} />
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(25), ...muted, lineHeight: 1.45, marginTop: 8 }} />
          </Frame>
        ))}
      </Block>
    </FitBox>
  );
}

/** Bars as rectangles: layer names above, widths measured, the tallest one selected */
function Chart() {
  const { s } = useSlideOf("chart");
  const max = Math.max(...s.bars.map((b) => Math.abs(b.value)), 0);
  return (
    <FitBox style={{ ...side, justifyContent: "center" }}>
      <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 62], [70, 54]], 48)} style={heading} blockStyle={{ marginBottom: 56 }} />
      <Block id="bars" className="cv-bars">
        {s.bars.map((b, i) => {
          const pct = max > 0 ? Math.max(8, (Math.abs(b.value) / max) * 100) : 8;
          const top = Math.abs(b.value) === max;
          const bar = <i className={top ? "cv-bar cv-bar-top" : "cv-bar"} />;
          return (
            <Fragment key={i}>
              <EditableText path={`bars.${i}.label`} className="cv-bar-name" style={{ fontSize: fs(24) }} />
              <div className="cv-bar-track">
                <div style={{ width: `${pct}%` }}>{top ? <Selection label="">{bar}</Selection> : bar}</div>
              </div>
              <EditableText path={`bars.${i}.display`} className={display} style={{ fontSize: fs(44), fontWeight: 700, letterSpacing: "-0.03em", whiteSpace: "nowrap", color: top ? "var(--accent)" : "var(--fg)" }} />
            </Fragment>
          );
        })}
      </Block>
      <Txt path="note" size={25} style={muted} blockStyle={{ marginTop: 44 }} />
    </FitBox>
  );
}

function Question() {
  const { s, profile } = useSlideOf("question");
  return (
    <>
      <FitBox style={{ ...side, justifyContent: "center" }}>
        <Txt path="question" as="h2" className={`${display} cv-typing`} size={sizeFor(s.question, [[40, 84], [80, 72], [130, 60]], 52)} style={heading} blockClass="cv-textbox" />
        <Txt path="hint" size={30} style={muted} blockStyle={{ marginTop: 40 }} />
      </FitBox>
      <Cursor name={handleOf(profile)} color={PEOPLE[1]} style={{ top: 170, right: 80 }} />
    </>
  );
}

function Cta() {
  const { s, language, follow, summary, titleSize, handle } = useCta();
  const t = CHROME_TEXT[language];
  return (
    <>
      <FitBox style={{ top: 140, bottom: follow ? 110 : 200, ...side, justifyContent: "center" }}>
        {summary && (
          <Block id="takeaway" style={{ marginBottom: 60 }}>
            <Comment who={handle} color="var(--accent)" time={t.summary}>
              <EditableText path="takeaway" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 32], [220, 28]], 25)), lineHeight: 1.5 }} />
            </Comment>
          </Block>
        )}
        <Block id="visual" style={{ marginBottom: 34 }}>
          {follow ? (
            <FollowCard />
          ) : (
            <span className="cv-button">
              <CtaGlyph size={50} strokeWidth={2} />
            </span>
          )}
        </Block>
        <Txt path="title" as="h2" className={`${display} cv-typing`} size={titleSize(sizeFor(s.title, [[30, 78], [50, 68]], 58))} style={heading} />
        <Txt path="subtitle" size={30} style={muted} blockStyle={{ marginTop: 20 }} />
      </FitBox>
      <CtaPointer size={110} strokeWidth={2} />
      <Signoff />
    </>
  );
}


export const canvasLayouts: LayoutMap = {
  cover: Cover,
  text: Text,
  explainer: Explainer,
  quote: Quote,
  statement: Statement,
  stat: Stat,
  qa: QA,
  list: List,
  grid: Grid,
  chart: Chart,
  question: Question,
  cta: Cta,
};
