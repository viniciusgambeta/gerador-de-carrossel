"use client";

import { Fragment } from "react";
import { ArrowDown, CircleHelp } from "lucide-react";
import { alpha } from "@/lib/color";
import type { LayoutId } from "@/lib/types";
import { fs, sizeFor, useSlideOf } from "./context";
import { SlideIcon } from "./icons";
import { CtaGlyph, CtaPointer, FollowCard, Signoff, Title, display, initials, useCta, wantsPhoto, type LayoutComponent } from "./kit";
import { Block, EditableText, Emoji, FitBox, Photo } from "./parts";
import { CHROME_TEXT } from "./i18n";

/* ───────────── Cover ───────────── */

function Cover() {
  const { s, theme } = useSlideOf("cover");
  const titleSize = sizeFor(s.title, [[30, 108], [48, 96], [66, 86], [90, 74]], 64);
  return (
    <>
      <Photo className="absolute inset-0" credit="side" />
      <div
        className="photo-shade absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${theme.bg} 4%, ${alpha(theme.bg, 0.86)} 30%, ${alpha(theme.bg, 0.35)} 52%, ${alpha(theme.bg, 0)} 68%), linear-gradient(to bottom, ${alpha("#000000", 0.45)}, ${alpha("#000000", 0)} 16%)`,
        }}
      />
      <FitBox style={{ top: 460, bottom: 150, justifyContent: "flex-end" }}>
        <Block id="kicker" style={{ marginBottom: 32 }}>
          <EditableText path="kicker" className="kicker-pill" style={{ fontSize: fs(28) }} />
        </Block>
        <Block id="title">
          <EditableText path="title" as="h1" className={display} style={{ fontSize: fs(titleSize), fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em" }} />
        </Block>
        <Block id="subtitle" style={{ marginTop: 30 }}>
          <EditableText path="subtitle" style={{ fontSize: fs(38), fontWeight: 500, lineHeight: 1.3, opacity: 0.9, maxWidth: 880 }} />
        </Block>
      </FitBox>
    </>
  );
}

/* ───────────── Statement ───────────── */

function Statement() {
  const { s } = useSlideOf("statement");
  const size = sizeFor(s.text, [[50, 104], [80, 92], [120, 78], [170, 66]], 56);
  return (
    <FitBox style={{ justifyContent: "center" }}>
      {s.emoji && (
        <Block id="emoji" style={{ marginBottom: 44 }}>
          <Emoji path="emoji" size={140} />
        </Block>
      )}
      <Block id="text">
        <EditableText path="text" as="p" className={display} style={{ fontSize: fs(size), fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.028em" }} />
      </Block>
    </FitBox>
  );
}

/* ───────────── Text (+ optional photo) ───────────── */

function Text() {
  const { s } = useSlideOf("text");
  const withPhoto = wantsPhoto(s);
  const titleSize = sizeFor(s.title, [[30, withPhoto ? 70 : 86], [60, withPhoto ? 60 : 72]], withPhoto ? 52 : 60);
  // Photo and text form one vertically centered group; the photo takes the room the text leaves
  return (
    <FitBox style={{ justifyContent: "center" }}>
      {withPhoto && <Photo className="rounded-photo text-photo" credit="bottom" />}
      <Block id="kicker" style={{ marginBottom: 20 }}>
        <EditableText path="kicker" className="kicker" style={{ fontSize: fs(26) }} />
      </Block>
      <Block id="title">
        <EditableText path="title" as="h2" className={display} style={{ fontSize: fs(titleSize), fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.025em" }} />
      </Block>
      {!withPhoto && <div className="accent-rule" style={{ margin: "40px 0 36px" }} />}
      <Block id="body" style={{ marginTop: withPhoto ? 24 : 0 }}>
        <EditableText path="body" as="p" style={{ fontSize: fs(withPhoto ? 36 : 40), lineHeight: 1.38, opacity: 0.86 }} />
      </Block>
    </FitBox>
  );
}

/* ───────────── Stat ───────────── */

function Stat() {
  const { s } = useSlideOf("stat");
  const valueSize = sizeFor(s.value, [[3, 320], [5, 260], [7, 210], [10, 160], [14, 120]], 96);
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Block id="kicker" style={{ marginBottom: 16 }}>
        <EditableText path="kicker" className="kicker" style={{ fontSize: fs(26) }} />
      </Block>
      <Block id="value">
        <EditableText
          path="value"
          className={display}
          style={{ fontSize: fs(valueSize), fontWeight: 900, lineHeight: 0.92, letterSpacing: "-0.05em", color: "var(--accent)" }}
        />
      </Block>
      {s.share !== null && (
        <div className="stat-bar" style={{ marginTop: 44 }}>
          <div style={{ width: `${Math.max(2, s.share)}%` }} />
        </div>
      )}
      <Block id="label" style={{ marginTop: 40 }}>
        <EditableText path="label" className={display} style={{ fontSize: fs(sizeFor(s.label, [[40, 56], [80, 46]], 40)), fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em" }} />
      </Block>
      <Block id="context" style={{ marginTop: 24 }}>
        <EditableText path="context" style={{ fontSize: fs(34), lineHeight: 1.38, color: "var(--muted)" }} />
      </Block>
    </FitBox>
  );
}

/* ───────────── Duo: two numbers ───────────── */

function Duo() {
  const { s } = useSlideOf("duo");
  const longest = Math.max(s.left.value.length, s.right.value.length);
  const valueSize = longest <= 4 ? 128 : longest <= 8 ? 100 : longest <= 12 ? 78 : 62;
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={72} mb={56} />
      <Block id="sides" className="duo">
        {(["left", "right"] as const).map((k) => (
          <div key={k} className="duo-card">
            <div className="icon-bubble" style={{ width: 92, height: 92 }}>
              <SlideIcon name={s[k].icon} size={46} />
            </div>
            <EditableText
              path={`${k}.value`}
              className={display}
              style={{ fontSize: fs(valueSize), fontWeight: 900, lineHeight: 0.95, letterSpacing: "-0.04em", color: "var(--accent)", marginTop: 34 }}
            />
            <EditableText path={`${k}.label`} style={{ fontSize: fs(31), lineHeight: 1.32, marginTop: 18 }} />
          </div>
        ))}
      </Block>
      <Block id="note" style={{ marginTop: 40 }}>
        <EditableText path="note" style={{ fontSize: fs(28), lineHeight: 1.4, color: "var(--muted)" }} />
      </Block>
    </FitBox>
  );
}

/* ───────────── Quote ───────────── */

function Quote() {
  const { s, theme } = useSlideOf("quote");
  const size = sizeFor(s.quote, [[70, 86], [120, 74], [180, 62]], 52);
  const withPhoto = wantsPhoto(s);

  // A known speaker: their photo fills the slide and the quote sits over it
  if (withPhoto) {
    return (
      <>
        <Photo className="absolute inset-0" credit="side" defaultPos={{ x: 50, y: 22 }} />
        <div
          className="photo-shade absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to top, ${theme.bg} 0%, ${theme.bg} 30%, ${alpha(theme.bg, 0.82)} 46%, ${alpha(theme.bg, 0)} 72%), linear-gradient(to bottom, ${alpha("#000000", 0.45)}, ${alpha("#000000", 0)} 16%)`,
          }}
        />
        <FitBox style={{ top: 500, bottom: 150, justifyContent: "flex-end" }}>
          <div className="quote-mark-inline">“</div>
          <Block id="quote">
            <EditableText path="quote" className="serif" style={{ fontSize: fs(size - 4), lineHeight: 1.12, fontStyle: "italic" }} />
          </Block>
          <Block id="author" style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 26 }}>
            <div style={{ width: 64, height: 8, borderRadius: 8, background: "var(--accent)", flex: "none" }} />
            <div>
              <EditableText path="author" style={{ fontSize: fs(38), fontWeight: 800, lineHeight: 1.15 }} />
              <EditableText path="role" style={{ fontSize: fs(29), color: "var(--muted)", marginTop: 6, lineHeight: 1.3 }} />
            </div>
          </Block>
        </FitBox>
      </>
    );
  }

  return (
    <>
      <div className="quote-mark">“</div>
      <FitBox style={{ top: 330, justifyContent: "center" }}>
        <Block id="quote">
          <EditableText path="quote" className="serif" style={{ fontSize: fs(size), lineHeight: 1.12, fontStyle: "italic" }} />
        </Block>
        <Block id="author" style={{ marginTop: 56, display: "flex", alignItems: "center", gap: 30 }}>
          {s.image ? (
            <Photo className="quote-photo" pan={false} credit={false} defaultPos={{ x: 50, y: 30 }} />
          ) : (
            <div style={{ width: 72, height: 8, borderRadius: 8, background: "var(--accent)", flex: "none" }} />
          )}
          <div>
            <EditableText path="author" style={{ fontSize: fs(38), fontWeight: 800, lineHeight: 1.15 }} />
            <EditableText path="role" style={{ fontSize: fs(29), color: "var(--muted)", marginTop: 6, lineHeight: 1.3 }} />
          </div>
        </Block>
      </FitBox>
    </>
  );
}

/* ───────────── Profile: person or organization with photo ───────────── */

function Profile() {
  const { s } = useSlideOf("profile");
  return (
    <FitBox style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <Block id="photo">
        <div className="profile-ring">
          {s.image || s.imageStatus === "loading" || s.imageStatus === "idle" ? (
            <Photo className="profile-photo" credit={false} defaultPos={{ x: 50, y: 28 }} />
          ) : (
            <div className="profile-photo profile-initials">{initials(s.name)}</div>
          )}
        </div>
      </Block>
      <Block id="name" style={{ marginTop: 44 }}>
        <EditableText path="name" as="h2" className={display} style={{ fontSize: fs(sizeFor(s.name, [[18, 78], [30, 64]], 52)), fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.025em" }} />
      </Block>
      <Block id="role" style={{ marginTop: 14 }}>
        <EditableText path="role" className="kicker" style={{ fontSize: fs(26) }} />
      </Block>
      <Block id="text" style={{ marginTop: 34, maxWidth: 860 }}>
        <EditableText path="text" style={{ fontSize: fs(37), lineHeight: 1.38, opacity: 0.88 }} />
      </Block>
      {s.image?.credit && <div className="profile-credit">{s.image.credit}</div>}
    </FitBox>
  );
}

/* ───────────── Explainer: "o que é" ───────────── */

function Explainer() {
  const { s } = useSlideOf("explainer");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Block id="icon">
        <div className="icon-bubble is-solid" style={{ width: 132, height: 132 }}>
          <SlideIcon name={s.icon || "idea"} size={66} />
        </div>
      </Block>
      <Block id="kicker" style={{ marginTop: 44 }}>
        <EditableText path="kicker" className="kicker" style={{ fontSize: fs(26) }} />
      </Block>
      <Block id="term" style={{ marginTop: 12 }}>
        <EditableText path="term" as="h2" className={display} style={{ fontSize: fs(sizeFor(s.term, [[16, 100], [30, 82], [50, 68]], 58)), fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.03em" }} />
      </Block>
      <Block id="definition" style={{ marginTop: 30 }}>
        <EditableText path="definition" style={{ fontSize: fs(40), lineHeight: 1.38 }} />
      </Block>
      <Block id="example" style={{ marginTop: 40 }}>
        {s.example && (
          <div className="note-box">
            <EditableText path="example" style={{ fontSize: fs(31), lineHeight: 1.4 }} />
          </div>
        )}
      </Block>
    </FitBox>
  );
}

/* ───────────── Q&A ───────────── */

function QA() {
  const { s } = useSlideOf("qa");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Block id="question">
        <div className="qa-bubble">
          <span className="qa-icon">
            <CircleHelp size={52} strokeWidth={2.2} />
          </span>
          <EditableText path="question" className={display} style={{ fontSize: fs(sizeFor(s.question, [[40, 64], [80, 54]], 46)), fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em" }} />
        </div>
      </Block>
      <Block id="answer" style={{ marginTop: 56 }}>
        <div className="qa-answer">
          <EditableText path="answer" style={{ fontSize: fs(sizeFor(s.answer, [[120, 44], [220, 38]], 33)), lineHeight: 1.4 }} />
        </div>
      </Block>
    </FitBox>
  );
}

/* ───────────── List ───────────── */

function List() {
  const { s, style } = useSlideOf("list");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={74} />
      <Block id="items" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {s.items.map((it, i) => (
          <div key={i} className="list-row">
            {/* The Swiss style counts instead of drawing icons */}
            {style === "swiss" ? (
              <span className="list-index">{String(i + 1).padStart(2, "0")}</span>
            ) : (
              <div className="icon-bubble" style={{ width: 88, height: 88 }}>
                {it.icon ? <SlideIcon name={it.icon} size={44} /> : <span style={{ fontSize: fs(40), fontWeight: 900 }}>{i + 1}</span>}
              </div>
            )}
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(36), fontWeight: 600, lineHeight: 1.26 }} />
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

/* ───────────── Grid: 4 key points ───────────── */

function Grid() {
  const { s } = useSlideOf("grid");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={72} />
      <Block id="items" className="grid4">
        {s.items.map((it, i) => (
          <div key={i} className="grid-card">
            <div className="icon-bubble" style={{ width: 84, height: 84 }}>
              <SlideIcon name={it.icon} size={42} />
            </div>
            <EditableText path={`items.${i}.title`} className={display} style={{ fontSize: fs(36), fontWeight: 800, lineHeight: 1.1, marginTop: 26, letterSpacing: "-0.015em" }} />
            <EditableText path={`items.${i}.text`} style={{ fontSize: fs(28), lineHeight: 1.36, marginTop: 10, color: "var(--muted)" }} />
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

/* ───────────── Steps ───────────── */

function Steps() {
  const { s } = useSlideOf("steps");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={72} mb={56} />
      <Block id="steps" className="steps">
        {s.steps.map((st, i) => (
          <div key={i} className="step-row">
            <div className="step-num display">{i + 1}</div>
            <div style={{ paddingTop: 6 }}>
              <EditableText path={`steps.${i}.title`} className={display} style={{ fontSize: fs(38), fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.015em" }} />
              <EditableText path={`steps.${i}.text`} style={{ fontSize: fs(31), lineHeight: 1.36, marginTop: 8, color: "var(--muted)" }} />
            </div>
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

/* ───────────── Timeline ───────────── */

function Timeline() {
  const { s } = useSlideOf("timeline");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={72} mb={60} />
      <Block id="events" className="timeline">
        {s.events.map((e, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-dot" />
            <EditableText path={`events.${i}.when`} className="kicker" style={{ fontSize: fs(28) }} />
            <EditableText path={`events.${i}.text`} style={{ fontSize: fs(36), fontWeight: 500, lineHeight: 1.3, marginTop: 8 }} />
          </div>
        ))}
      </Block>
    </FitBox>
  );
}

/* ───────────── Compare ───────────── */

function Compare() {
  const { s } = useSlideOf("compare");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={72} mb={64} />
      <Block id="sides" className="compare">
        {(["left", "right"] as const).map((k) => {
          const side = s[k];
          return (
            <div key={k} className={k === "right" ? "compare-card on-accent" : "compare-card"}>
              {side.icon && <SlideIcon name={side.icon} size={64} />}
              <EditableText path={`${k}.label`} className={display} style={{ fontSize: fs(44), fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em" }} />
              <div className="compare-rule" />
              {side.points.map((_, i) => (
                <EditableText key={i} path={`${k}.points.${i}`} style={{ fontSize: fs(31), fontWeight: 500, lineHeight: 1.3 }} />
              ))}
            </div>
          );
        })}
        <div className="compare-vs">VS</div>
      </Block>
    </FitBox>
  );
}

/* ───────────── Versus: two sides in conflict ───────────── */

// The diagonal cut between the two photos, in slide pixels (stage is 1080 × 700)
const VS_TOP_X = 640;
const VS_BOTTOM_X = 518;
const VS_HEIGHT = 700;

function Versus() {
  const { s, theme, display: prefs } = useSlideOf("versus");
  const credits = [s.image?.credit, s.image2?.credit].filter(Boolean).join("  ·  ");
  return (
    <>
      <div className="vs-stage" style={{ height: VS_HEIGHT }}>
        <Photo className="vs-photo vs-left" credit={false} defaultPos={{ x: 50, y: 25 }} />
        <Photo className="vs-photo vs-right" slot={2} credit={false} defaultPos={{ x: 50, y: 25 }} />
        <div
          className="photo-shade absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to top, ${theme.bg} 0%, ${alpha(theme.bg, 0.7)} 16%, ${alpha(theme.bg, 0)} 42%), linear-gradient(to bottom, ${alpha("#000000", 0.45)}, ${alpha("#000000", 0)} 20%)`,
          }}
        />
        <svg className="vs-slash" viewBox={`0 0 1080 ${VS_HEIGHT}`} width={1080} height="100%" preserveAspectRatio="none">
          <line x1={VS_TOP_X} y1={0} x2={VS_BOTTOM_X} y2={VS_HEIGHT} stroke="currentColor" strokeWidth={12} />
        </svg>
        <div className="vs-badge display" style={{ left: (VS_TOP_X + VS_BOTTOM_X) / 2, top: VS_HEIGHT * 0.48 }}>
          VS
        </div>
        {prefs.imageCredit && credits && <div className="vs-credit">{credits}</div>}
      </div>
      <FitBox style={{ top: VS_HEIGHT + 10, bottom: 150, justifyContent: "flex-start" }}>
        <Title text={s.title} max={62} mb={34} />
        <Block id="sides" className="vs-sides">
          {(["left", "right"] as const).map((k) => (
            <div key={k} className={`vs-side vs-side-${k}`}>
              <EditableText path={`${k}.name`} className={display} style={{ fontSize: fs(40), fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em" }} />
              <EditableText path={`${k}.stance`} style={{ fontSize: fs(29), lineHeight: 1.32, marginTop: 10, color: "var(--muted)" }} />
            </div>
          ))}
        </Block>
        <Block id="note" style={{ marginTop: 24 }}>
          <EditableText path="note" style={{ fontSize: fs(26), lineHeight: 1.35, color: "var(--muted)" }} />
        </Block>
      </FitBox>
    </>
  );
}

/* ───────────── Chart ───────────── */

function Chart() {
  const { s } = useSlideOf("chart");
  const max = Math.max(...s.bars.map((b) => Math.abs(b.value)), 0);
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={68} mb={60} />
      <Block id="bars" style={{ display: "flex", flexDirection: "column", gap: 34 }}>
        {s.bars.map((b, i) => {
          const pct = max > 0 ? Math.max(5, (Math.abs(b.value) / max) * 100) : 5;
          const top = Math.abs(b.value) === max;
          return (
            <div key={i}>
              <EditableText path={`bars.${i}.label`} style={{ fontSize: fs(30), fontWeight: 600, color: "var(--muted)", marginBottom: 12 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
                <div style={{ flex: 1 }}>
                  <div className={top ? "bar bar-top" : "bar"} style={{ width: `${pct}%` }} />
                </div>
                <EditableText
                  path={`bars.${i}.display`}
                  className={display}
                  style={{ fontSize: fs(44), fontWeight: 800, whiteSpace: "nowrap", color: top ? "var(--accent)" : "var(--fg)", minWidth: 120 }}
                />
              </div>
            </div>
          );
        })}
      </Block>
      <Block id="note" style={{ marginTop: 48 }}>
        <EditableText path="note" style={{ fontSize: fs(28), color: "var(--muted)" }} />
      </Block>
    </FitBox>
  );
}

/* ───────────── Diagram: cause → effect ───────────── */

function Diagram() {
  const { s } = useSlideOf("diagram");
  return (
    <FitBox style={{ justifyContent: "center" }}>
      <Title text={s.title} max={68} />
      <Block id="nodes" style={{ display: "flex", flexDirection: "column" }}>
        {s.nodes.map((n, i) => {
          const last = i === s.nodes.length - 1 && s.nodes.length > 1;
          return (
            <Fragment key={i}>
              {i > 0 && (
                <div className="diagram-arrow">
                  <ArrowDown size={52} strokeWidth={2.6} />
                </div>
              )}
              <div className={last ? "diagram-node on-accent" : "diagram-node"}>
                {n.icon && (
                  <span className="diagram-icon">
                    <SlideIcon name={n.icon} size={48} />
                  </span>
                )}
                <EditableText path={`nodes.${i}.text`} style={{ fontSize: fs(35), fontWeight: 700, lineHeight: 1.24 }} />
              </div>
            </Fragment>
          );
        })}
      </Block>
    </FitBox>
  );
}

/* ───────────── Question (cliffhanger) ───────────── */

function Question() {
  const { s } = useSlideOf("question");
  const size = sizeFor(s.question, [[40, 108], [70, 92], [110, 78]], 64);
  return (
    <>
      <div className="question-mark display">?</div>
      <FitBox style={{ justifyContent: "center" }}>
        <Block id="question">
          <EditableText path="question" className={display} style={{ fontSize: fs(size), fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.03em" }} />
        </Block>
        <Block id="hint" style={{ marginTop: 44 }}>
          <EditableText path="hint" style={{ fontSize: fs(38), fontWeight: 500, lineHeight: 1.3, color: "var(--muted)" }} />
        </Block>
      </FitBox>
    </>
  );
}

/* ───────────── Photo ───────────── */

function ImageLayout() {
  const { s, theme } = useSlideOf("image");
  return (
    <>
      <Photo className="absolute inset-0" credit="side" />
      <div
        className="photo-shade absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${theme.bg} 2%, ${alpha(theme.bg, 0.78)} 28%, ${alpha(theme.bg, 0)} 56%), linear-gradient(to bottom, ${alpha("#000000", 0.45)}, ${alpha("#000000", 0)} 16%)`,
        }}
      />
      <FitBox style={{ top: 700, bottom: 150, justifyContent: "flex-end" }}>
        <Block id="caption">
          <EditableText path="caption" className={display} style={{ fontSize: fs(sizeFor(s.caption, [[50, 80], [90, 68]], 58)), fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.02em" }} />
        </Block>
      </FitBox>
    </>
  );
}

/* ───────────── Call to action ───────────── */

function Cta() {
  const { s, language, follow, summary, titleSize } = useCta();
  const t = CHROME_TEXT[language];
  return (
    <>
      <FitBox style={{ top: 140, bottom: follow ? 110 : 190, justifyContent: "center" }}>
        {summary && (
          <Block id="takeaway" style={{ marginBottom: 76 }}>
            <div className="cta-summary">
              <div className="kicker" style={{ fontSize: fs(24) }}>
                {t.summary}:
              </div>
              <EditableText path="takeaway" style={{ fontSize: fs(sizeFor(s.takeaway, [[120, 40], [220, 35]], 31)), lineHeight: 1.36, fontWeight: 500, marginTop: 14 }} />
            </div>
          </Block>
        )}
        <Block id="visual" style={{ marginBottom: 44 }}>
          {follow ? (
            <FollowCard />
          ) : (
            <div className="cta-icon">
              <CtaGlyph size={54} />
            </div>
          )}
        </Block>
        <Block id="title">
          <EditableText path="title" as="h2" className={display} style={{ fontSize: fs(titleSize(sizeFor(s.title, [[30, 84], [50, 72]], 62))), fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.028em" }} />
        </Block>
        <Block id="subtitle" style={{ marginTop: 22 }}>
          <EditableText path="subtitle" style={{ fontSize: fs(35), lineHeight: 1.34, color: "var(--muted)" }} />
        </Block>
      </FitBox>
      <CtaPointer />
      <Signoff />
    </>
  );
}

export const LAYOUT_COMPONENTS: Record<LayoutId, LayoutComponent> = {
  cover: Cover,
  statement: Statement,
  text: Text,
  stat: Stat,
  duo: Duo,
  quote: Quote,
  profile: Profile,
  explainer: Explainer,
  qa: QA,
  list: List,
  grid: Grid,
  steps: Steps,
  timeline: Timeline,
  compare: Compare,
  versus: Versus,
  chart: Chart,
  diagram: Diagram,
  question: Question,
  image: ImageLayout,
  cta: Cta,
};
