"use client";

/** Pieces shared by the base layouts and the per-style compositions */

import type { CSSProperties, ElementType, ReactElement, ReactNode } from "react";
import { ArrowDownLeft, ArrowDownRight, Bookmark, Heart, MessageCircle, Send, UserPlus, type LucideIcon } from "lucide-react";
import type { CtaAction, LayoutId, Slide } from "@/lib/types";
import { handleOf } from "@/store/settings";
import { fs, sizeFor, useSlide, useSlideOf } from "./context";
import { Block, EditableText } from "./parts";

export const display = "display";

export type LayoutComponent = () => ReactElement;
export type LayoutMap = Partial<Record<LayoutId, LayoutComponent>>;

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export const pad2 = (n: number) => String(n).padStart(2, "0");

interface TxtProps {
  path: string;
  /** Block id for drag/scale overrides; defaults to the path */
  id?: string;
  as?: ElementType;
  className?: string;
  size: number;
  style?: CSSProperties;
  blockClass?: string;
  blockStyle?: CSSProperties;
}

/** One editable field in its own draggable block */
export function Txt({ path, id = path, as, className, size, style, blockClass, blockStyle }: TxtProps) {
  return (
    <Block id={id} className={blockClass} style={blockStyle}>
      <EditableText path={path} as={as} className={className} style={{ fontSize: fs(size), ...style }} />
    </Block>
  );
}

/** Shared title style for most layouts */
export function Title({ path = "title", text, max = 76, mb = 52 }: { path?: string; text: string; max?: number; mb?: number }) {
  const size = sizeFor(text, [[28, max], [50, max - 10], [80, max - 18]], max - 24);
  return (
    <Block id={path} style={{ marginBottom: mb }}>
      <EditableText path={path} as="h2" className={display} style={{ fontSize: fs(size), fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.025em" }} />
    </Block>
  );
}

/** Room for a photo while one is loading; none when the search found nothing relevant */
export const wantsPhoto = (s: Slide) =>
  !!s.image || (!!s.imageQuery && !s.noPhoto && s.imageStatus !== "done" && s.imageStatus !== "error");

export const initials = (name: string) =>
  (name ?? "")
    .replace(/\*\*/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** Image credit as a caption outside the photo (respects the "image credit" toggle) */
export function Caption({ slot = 1, className, style }: { slot?: 1 | 2; className?: string; style?: CSSProperties }) {
  const { slide, display: prefs } = useSlide();
  const img = slot === 2 ? slide.image2 : slide.image;
  if (!prefs.imageCredit || !img?.credit) return null;
  return (
    <div className={cx("photo-caption", className)} style={style}>
      {img.credit}
    </div>
  );
}

/* ───────────── Call to action ───────────── */

export const CTA_ICON: Record<CtaAction, LucideIcon> = {
  save: Bookmark,
  like: Heart,
  comment: MessageCircle,
  share: Send,
  follow: UserPlus,
};

/**
 * Where Instagram puts the button the reader should tap, right below the post:
 * save on the right, comment and share on the left. Like is a double tap on the post itself.
 */
export const CTA_POINTER: Partial<Record<CtaAction, "left" | "right">> = { save: "right", comment: "left", share: "left" };

export function useCta() {
  const ctx = useSlideOf("cta");
  // "Em resumo" can be switched off; then the call to action takes the whole slide
  const summary = ctx.display.summary ? ctx.s.takeaway : "";
  return {
    ...ctx,
    summary,
    follow: ctx.s.action === "follow",
    pointer: CTA_POINTER[ctx.s.action],
    handle: handleOf(ctx.profile),
    /** Title size, bigger when there is no summary above it */
    titleSize: (px: number) => (summary ? px : Math.round(px * 1.24)),
  };
}

export function Avatar({ size }: { size: number }) {
  const { profile } = useSlide();
  const handle = handleOf(profile);
  return profile.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.avatar} alt="" style={{ width: size, height: size }} />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.44 }}>{(profile.name || handle.slice(1) || "?").slice(0, 1).toUpperCase()}</span>
  );
}

/** The action's icon (a filled heart with "2x" for the double tap) */
export function CtaGlyph({ size, strokeWidth = 2.1 }: { size: number; strokeWidth?: number }) {
  const { s } = useSlideOf("cta");
  const Icon = CTA_ICON[s.action] ?? Bookmark;
  return (
    <span className="cta-glyph">
      <Icon size={size} strokeWidth={strokeWidth} fill={s.action === "like" ? "currentColor" : "none"} />
      {s.action === "like" && <span className="cta-badge">2x</span>}
    </span>
  );
}

/** Arrow toward the button the reader should tap below the post */
export function CtaPointer({ size = 124, strokeWidth = 2.4, className, children }: { size?: number; strokeWidth?: number; className?: string; children?: ReactNode }) {
  const { pointer } = useCta();
  if (!pointer) return null;
  return (
    <div className={cx("cta-pointer", `cta-pointer-${pointer}`, className)}>
      {children ?? (pointer === "right" ? <ArrowDownRight size={size} strokeWidth={strokeWidth} /> : <ArrowDownLeft size={size} strokeWidth={strokeWidth} />)}
    </div>
  );
}

/** Avatar and @ under the CTA (not on "follow", where the profile is the visual) */
export function Signoff({ size = 44 }: { size?: number }) {
  const { follow, handle } = useCta();
  if (follow) return null;
  return (
    <div className="cta-signoff">
      <Avatar size={size} />
      <span>{handle}</span>
    </div>
  );
}

/** Avatar with name and @ for the "follow" CTA */
export function FollowCard({ size = 150, className }: { size?: number; className?: string }) {
  const { profile, handle } = useCta();
  return (
    <div className={cx("cta-profile", className)}>
      <div className="cta-avatar">
        <Avatar size={size} />
      </div>
      <div>
        {profile.name && <div className="cta-name">{profile.name}</div>}
        <div className="cta-handle">{handle}</div>
      </div>
    </div>
  );
}
