"use client";

/**
 * Suíço: a six-column grid you can see. Photos bleed off the edges, type is set flush left and
 * big, text sits top and bottom with tension between, color only in blocks and numbers.
 */

import { fs, sizeFor, useSlideOf } from "../context";
import { CHROME_TEXT } from "../i18n";
import { CtaGlyph, CtaPointer, FollowCard, Signoff, Txt, display, useCta, wantsPhoto, type LayoutMap } from "../kit";
import { Block, EditableText, Emoji, FitBox, Photo } from "../parts";

/** One grid column: (1080 − 2 × 96) / 6 */
const COL = 148;
const tight = { fontWeight: 700, lineHeight: 0.96, letterSpacing: "-0.045em" } as const;

function Cover() {
  const { s } = useSlideOf("cover");
  const size = sizeFor(s.title, [[40, 104], [70, 90], [100, 78]], 66);
  return (
    <>
      <Photo className="absolute" style={{ top: 0, left: 0, right: 0, height: 640 }} credit="side" />
      <div className="sw-square" style={{ top: 640 - COL, left: 96 }} />
      <FitBox style={{ top: 700, bottom: 150, justifyContent: "flex-start" }}>
        <Txt path="title" as="h1" className={display} size={size} style={tight} />
        <div className="sw-cols" style={{ marginTop: 36 }}>
          <Txt path="kicker" className="sw-meta" size={24} />
          <Txt path="subtitle" size={30} style={{ lineHeight: 1.35 }} />
        </div>
      </FitBox>
    </>
  );
}

function Text() {
  const { s } = useSlideOf("text");
  if (wantsPhoto(s)) {
    // Photo bleeds down the right two columns; text holds the left four
    return (
      <>
        <Photo className="absolute" style={{ top: 0, bottom: 0, left: 96 + COL * 4, right: 0 }} credit="side" />
        <FitBox style={{ top: 150, bottom: 150, right: 1080 - (96 + COL * 4) + 40, justifyContent: "space-between" }}>
          <div>
            <Txt path="kicker" className="kicker" size={24} blockStyle={{ marginBottom: 26 }} />
            <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[40, 62], [70, 54]], 46)} style={tight} />
          </div>
          <Txt path="body" as="p" size={31} style={{ lineHeight: 1.4 }} blockClass="sw-rule-top" />
        </FitBox>
      </>
    );
  }
  return (
    <FitBox style={{ top: 150, bottom: 150, justifyContent: "space-between" }}>
      <div>
        <Txt path="kicker" className="kicker" size={24} blockStyle={{ marginBottom: 30 }} />
        <Txt path="title" as="h2" className={display} size={sizeFor(s.title, [[30, 96], [60, 82], [90, 70]], 60)} style={tight} />
      </div>
      <div className="sw-cols sw-rule-top">
        <div className="sw-bar" />
        <Txt path="body" as="p" size={34} style={{ lineHeight: 1.42 }} />
      </div>
    </FitBox>
  );
}

function Quote() {
  const { s } = useSlideOf("quote");
  const photo = wantsPhoto(s);
  const size = sizeFor(s.quote, [[70, 74], [120, 64], [180, 54]], 46);
  return (
    <>
      {photo && <Photo className="absolute" style={{ top: 0, right: 0, width: 96 + COL * 3, height: 660 }} credit="side" defaultPos={{ x: 50, y: 25 }} />}
      <div className="sw-quote-mark" style={{ top: photo ? 130 : 110, left: 82 }}>
        “
      </div>
      <FitBox style={{ top: photo ? 700 : 450, bottom: 150, justifyContent: "space-between" }}>
        <Txt path="quote" className={display} size={size} style={{ ...tight, lineHeight: 1.02, letterSpacing: "-0.035em" }} />
        <Block id="author" className="sw-cols sw-rule-top" style={{ marginTop: 40 }}>
          <EditableText path="author" style={{ fontSize: fs(28), fontWeight: 700, lineHeight: 1.25 }} />
          <EditableText path="role" style={{ fontSize: fs(28), lineHeight: 1.25, color: "var(--muted)" }} />
        </Block>
      </FitBox>
    </>
  );
}

function Statement() {
  const { s } = useSlideOf("statement");
  const size = sizeFor(s.text, [[50, 118], [80, 102], [120, 86], [170, 72]], 60);
  return (
    <FitBox style={{ top: 150, bottom: 150, justifyContent: "space-between" }}>
      <Txt path="text" as="p" className={display} size={size} style={tight} />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div className="sw-square sw-square-flow" />
        {s.emoji && (
          <Block id="emoji">
            <Emoji path="emoji" size={110} />
          </Block>
        )}
      </div>
    </FitBox>
  );
}

function Stat() {
  const { s } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 420], [5, 330], [7, 250], [10, 190], [14, 140]], 110);
  return (
    <FitBox style={{ top: 150, bottom: 150, left: 70, justifyContent: "space-between" }}>
      <Txt path="kicker" className="kicker" size={24} blockStyle={{ marginLeft: 26 }} />
      <div>
        <Txt path="value" className={display} size={valueSize} style={{ fontWeight: 700, lineHeight: 0.84, letterSpacing: "-0.07em", color: "var(--accent)" }} />
        {s.share !== null && (
          <div className="stat-bar" style={{ marginTop: 40, marginLeft: 26 }}>
            <div style={{ width: `${Math.max(2, s.share)}%` }} />
          </div>
        )}
      </div>
      <div className="sw-cols sw-rule-top" style={{ marginLeft: 26 }}>
        <Txt path="label" className={display} size={sizeFor(s.label, [[40, 44], [80, 38]], 34)} style={{ fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em" }} />
        <Txt path="context" size={29} style={{ lineHeight: 1.4, color: "var(--muted)" }} />
      </div>
    </FitBox>
  );
}

function Cta() {
  const { s, language, follow, summary, titleSize } = useCta();
  const t = CHROME_TEXT[language];
  return (
    <>
      <FitBox style={{ top: 150, bottom: follow ? 120 : 210, justifyContent: "space-between" }}>
        {summary ? (
          <Block id="takeaway" className="sw-cols sw-rule-top">
            <div className="sw-meta" style={{ fontSize: fs(24) }}>
              {t.summary}:
            </div>
            <EditableText path="takeaway" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 34], [220, 30]], 27)), lineHeight: 1.42 }} />
          </Block>
        ) : (
          <span />
        )}
        <div>
          <Block id="visual" style={{ marginBottom: 36 }}>
            {follow ? (
              <FollowCard size={120} />
            ) : (
              <span className="sw-cta-icon">
                <CtaGlyph size={64} strokeWidth={2.2} />
              </span>
            )}
          </Block>
          <Txt path="title" as="h2" className={display} size={titleSize(sizeFor(s.title, [[30, 100], [50, 86]], 72))} style={tight} />
          <Txt path="subtitle" size={30} style={{ lineHeight: 1.38, color: "var(--muted)" }} blockStyle={{ marginTop: 24, marginLeft: COL * 2 }} />
        </div>
      </FitBox>
      <CtaPointer size={140} strokeWidth={2.6} />
      <Signoff />
    </>
  );
}

export const swissLayouts: LayoutMap = {
  cover: Cover,
  text: Text,
  quote: Quote,
  statement: Statement,
  stat: Stat,
  cta: Cta,
};
