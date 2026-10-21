"use client";

/**
 * Interface: the news told through screens. Photos open in windows, quotes arrive as chat
 * messages, numbers sit in dashboard widgets, lists stack like notifications.
 */

import type { CSSProperties, ReactNode } from "react";
import { Activity } from "lucide-react";
import { handleOf } from "@/store/settings";
import { fs, sizeFor, useSlideOf } from "../context";
import { CHROME_TEXT } from "../i18n";
import { SlideIcon } from "../icons";
import { Caption, CtaGlyph, CtaPointer, FollowCard, Signoff, Title, Txt, cx, display, initials, pad2, useCta, wantsPhoto, type LayoutMap } from "../kit";
import { Block, EditableText, Emoji, FitBox, Photo } from "../parts";

export function Win({ label, className, style, children }: { label?: ReactNode; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cx("ui-win", className)} style={style}>
      <div className="ui-bar">
        <i />
        <i />
        <i />
        {label && <span>{label}</span>}
      </div>
      <div className="ui-body">{children}</div>
    </div>
  );
}

function Cover() {
  const { s, index } = useSlideOf("cover");
  const size = sizeFor(s.title, [[40, 88], [70, 76], [100, 66]], 58);
  return (
    <>
      <Win label={`${pad2(index + 1)}.jpg`} className="ui-photo-win" style={{ position: "absolute", top: 140, left: 80, right: 80, height: 610 }}>
        <Photo className="absolute inset-0" credit="bottom" />
      </Win>
      <FitBox style={{ top: 800, bottom: 150, justifyContent: "flex-start" }}>
        <Txt path="kicker" className="ui-chip" size={24} blockStyle={{ marginBottom: 26 }} />
        <Txt path="title" as="h1" className={`${display} ui-cursor`} size={size} style={{ fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.03em" }} />
        <Txt path="subtitle" size={31} style={{ lineHeight: 1.4, color: "var(--muted)" }} blockStyle={{ marginTop: 22 }} />
      </FitBox>
    </>
  );
}

function Text() {
  const { s, index } = useSlideOf("text");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.title, [[30, photo ? 62 : 74], [60, photo ? 54 : 64]], photo ? 46 : 54);
  return (
    <FitBox style={{ justifyContent: "center" }}>
      {photo && (
        <Win label={`${pad2(index + 1)}.jpg`} className="ui-photo-win ui-photo-flow">
          <Photo className="absolute inset-0" credit="bottom" />
        </Win>
      )}
      <Txt path="kicker" className="ui-chip" size={22} blockStyle={{ marginBottom: 22 }} />
      <Txt path="title" as="h2" className={display} size={size} style={{ fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.03em" }} />
      <Block id="body" style={{ marginTop: 34 }}>
        <div className="ui-card">
          <EditableText path="body" as="p" style={{ fontSize: fs(photo ? 30 : 34), lineHeight: 1.45 }} />
        </div>
      </Block>
    </FitBox>
  );
}

function Quote() {
  const { s } = useSlideOf("quote");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.quote, [[70, 62], [120, 54], [180, 47]], 41);
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Block id="author" className="ui-person">
        <div className="ui-avatar">
          {photo ? <Photo className="absolute inset-0" credit={false} defaultPos={{ x: 50, y: 25 }} /> : <span>{initials(s.author) || "?"}</span>}
          <i className="ui-online" />
        </div>
        <div style={{ minWidth: 0 }}>
          <EditableText path="author" style={{ fontSize: fs(38), fontWeight: 700, lineHeight: 1.15 }} />
          <EditableText path="role" className="ui-mono" style={{ fontSize: fs(23), color: "var(--muted)", marginTop: 8 }} />
        </div>
      </Block>
      <Block id="quote" style={{ marginTop: 36 }}>
        <div className="ui-bubble">
          <EditableText path="quote" className={display} style={{ fontSize: fs(size), fontWeight: 500, lineHeight: 1.22, letterSpacing: "-0.015em" }} />
        </div>
      </Block>
      <div className="ui-typing">
        <i />
        <i />
        <i />
      </div>
      <Caption className="ui-mono ui-caption" />
    </FitBox>
  );
}

function Statement() {
  const { s, profile } = useSlideOf("statement");
  const size = sizeFor(s.text, [[50, 76], [80, 66], [120, 58], [170, 50]], 44);
  return (
    <FitBox style={{ justifyContent: "center" }}>
      {s.emoji && (
        <Block id="emoji" style={{ marginBottom: 34 }}>
          <Emoji path="emoji" size={96} />
        </Block>
      )}
      <Block id="text">
        <Win label={handleOf(profile)} className="ui-term">
          <div className="ui-term-line">
            <span className="ui-prompt">&gt;</span>
            <EditableText path="text" as="p" className={`${display} ui-cursor`} style={{ fontSize: fs(size), fontWeight: 600, lineHeight: 1.12, letterSpacing: "-0.02em" }} />
          </div>
        </Win>
      </Block>
    </FitBox>
  );
}

function Stat() {
  const { s } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 250], [5, 200], [7, 160], [10, 124], [14, 96]], 80);
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <div className="ui-widget">
        <div className="ui-widget-head">
          <Txt path="kicker" className="ui-mono" size={23} />
          <span className="ui-widget-icon">
            <Activity size={30} strokeWidth={2} />
          </span>
        </div>
        <Txt path="value" className={`${display} ui-glow`} size={valueSize} style={{ fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.04em", color: "var(--accent)" }} blockStyle={{ marginTop: 22 }} />
        {s.share !== null && (
          <div className="ui-progress" style={{ marginTop: 34 }}>
            <div style={{ width: `${Math.max(2, s.share)}%` }} />
          </div>
        )}
        <Txt path="label" className={display} size={sizeFor(s.label, [[40, 46], [80, 40]], 34)} style={{ fontWeight: 600, lineHeight: 1.15 }} blockStyle={{ marginTop: 32 }} />
        <Txt path="context" size={28} style={{ lineHeight: 1.45, color: "var(--muted)" }} blockStyle={{ marginTop: 14 }} />
      </div>
    </FitBox>
  );
}

function List() {
  const { s } = useSlideOf("list");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={70} mb={44} />
      <Block id="items" className="ui-stack">
        {s.items.map((it, i) => (
          <div key={i} className="ui-toast">
            <span className="ui-app-icon">{it.icon ? <SlideIcon name={it.icon} size={40} /> : <b>{i + 1}</b>}</span>
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(32), lineHeight: 1.32, fontWeight: 500 }} />
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
          <Block id="takeaway" style={{ marginBottom: 56 }}>
            <Win label={t.summary} className="ui-summary">
              <EditableText path="takeaway" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 36], [220, 31]], 28)), lineHeight: 1.45 }} />
            </Win>
          </Block>
        )}
        {follow ? (
          <Block id="visual" style={{ marginBottom: 34 }}>
            <FollowCard />
          </Block>
        ) : (
          <Block id="visual">
            <div className="ui-toast ui-cta-toast">
              <span className="ui-app-icon">
                <CtaGlyph size={46} />
              </span>
              <div style={{ minWidth: 0 }}>
                <EditableText path="title" as="h2" className={display} style={{ fontSize: fs(titleSize(sizeFor(s.title, [[30, 58], [50, 50]], 44))), fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em" }} />
                <EditableText path="subtitle" style={{ fontSize: fs(28), lineHeight: 1.38, color: "var(--muted)", marginTop: 10 }} />
              </div>
            </div>
          </Block>
        )}
        {follow && (
          <>
            <Txt path="title" as="h2" className={display} size={titleSize(sizeFor(s.title, [[30, 74], [50, 64]], 54))} style={{ fontWeight: 700, lineHeight: 1.05 }} />
            <Txt path="subtitle" size={32} style={{ lineHeight: 1.38, color: "var(--muted)" }} blockStyle={{ marginTop: 18 }} />
          </>
        )}
      </FitBox>
      <CtaPointer size={120} strokeWidth={2.4} className="ui-pointer" />
      <Signoff />
    </>
  );
}

export const techLayouts: LayoutMap = {
  cover: Cover,
  text: Text,
  quote: Quote,
  statement: Statement,
  stat: Stat,
  list: List,
  cta: Cta,
};
