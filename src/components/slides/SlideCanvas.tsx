"use client";

import { memo, useCallback, useMemo, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { contrast, slideTheme, themeVars } from "@/lib/color";
import { SLIDE_H, SLIDE_W } from "@/lib/constants";
import { hasFixedColors, type StyleId } from "@/lib/styles";
import type { Slide } from "@/lib/types";
import { useCarousel } from "@/store/carousel";
import { handleOf, useSettings } from "@/store/settings";
import { Connector, SAFE_BOTTOM_WITH_CONNECTOR } from "./connector";
import { SlideCtx, useSlide, type SlideCtxValue } from "./context";
import { Cutout, fillsWithIcon } from "./cutout";
import { StyleDecor } from "./decor";
import { Extras } from "./extras";
import { useGuides } from "./snap";
import { CHROME_TEXT } from "./i18n";
import { LAYOUT_COMPONENTS } from "./layouts";
import { STYLE_KITS } from "./styles";

export interface SlideSource {
  name: string;
  favicon: string | null;
}

interface Props {
  slide: Slide;
  index: number;
  total: number;
  source?: SlideSource | null;
  editable?: boolean;
  scale?: number;
  /** Preview a style other than the one in settings (style gallery) */
  styleOverride?: StyleId;
}

/** Content-only signature: re-run auto-fit when text, block sizes or removed blocks change. */
function fitKeyOf(slide: Slide, style: StyleId) {
  const { image, imageCandidates, imageStatus, image2, imageCandidates2, imageStatus2, busy, tried, overrides, extras, link, ...content } = slide;
  const sizes = Object.entries(overrides ?? {}).map(([k, o]) => `${k}:${o.scale}:${o.w ?? ""}:${o.h ?? ""}`);
  return JSON.stringify([content, sizes, !!image, imageStatus === "done", style]);
}

function SlideCanvasInner({ slide, index, total, source, editable = false, scale = 1, styleOverride }: Props) {
  const profile = useSettings((s) => s.profile);
  const language = useSettings((s) => s.language);
  const chosenStyle = useSettings((s) => s.style);
  const display = useSettings((s) => s.display);
  const connector = useSettings((s) => s.connector);
  const style = styleOverride ?? chosenStyle;
  const selected = useCarousel((s) => (editable ? s.selected : null));
  const theme = useMemo(
    () => slideTheme(slide.tone, profile.primary, profile.secondary, style),
    [slide.tone, profile.primary, profile.secondary, style],
  );
  const update = useCallback<SlideCtxValue["update"]>(
    (fn, history = true) => useCarousel.getState().editSlide(slide.id, fn, history),
    [slide.id],
  );
  const select = useCallback((id: string | null) => useCarousel.getState().select(id), []);
  const fitKey = useMemo(() => fitKeyOf(slide, style), [slide, style]);

  const ctx: SlideCtxValue = {
    slide,
    index,
    total,
    editable,
    scale,
    profile,
    theme,
    selected,
    fitKey,
    language,
    style,
    display,
    connector,
    safeBottom: connector === "none" ? 150 : SAFE_BOTTOM_WITH_CONNECTOR,
    select,
    update,
  };
  const kit = STYLE_KITS[style] ?? STYLE_KITS.modern;
  const Layout = kit.layouts[slide.layout] ?? LAYOUT_COMPONENTS[slide.layout];
  const photoBg =
    kit.photoBg?.[slide.layout] ??
    (slide.layout === "cover" || slide.layout === "image" || (slide.layout === "quote" && !!slide.image) || slide.layout === "versus");

  return (
    <SlideCtx.Provider value={ctx}>
      <div
        className={`slide${editable ? " is-editable" : ""}${slide.writing ? " is-writing" : ""}${photoBg ? " has-photo-bg" : ""}${connector !== "none" ? " has-connector" : ""}`}
        data-style={style}
        data-tone={slide.tone}
        // "light" ink means a dark background, whichever tone produced it
        data-ink={contrast(theme.fg, "#FFFFFF") < contrast(theme.fg, "#000000") ? "light" : "dark"}
        data-hl={theme.hlStyle}
        data-layout={slide.layout}
        data-photo={slide.image ? "" : undefined}
        data-cutout={slide.cutout && !photoBg ? "" : undefined}
        data-filler={fillsWithIcon(slide) && !photoBg ? "" : undefined}
        style={
          {
            width: SLIDE_W,
            height: SLIDE_H,
            ...themeVars(theme),
            // Design-system styles bring their own palette
            "--primary": hasFixedColors(style) ? theme.fg : profile.primary,
            "--secondary": hasFixedColors(style) ? theme.accent : profile.secondary,
            // Highlighter ink for the sketch style: the brand's second color when it is light enough
            "--marker": contrast(profile.secondary, "#111111") >= 7 ? profile.secondary : "#FFE45C",
            "--ui-scale": scale,
          } as CSSProperties
        }
        onPointerDown={editable ? () => select(null) : undefined}
      >
        <div className="slide-decor" />
        <StyleDecor photoBg={photoBg} />
        <Layout />
        {connector !== "none" && <Connector />}
        {/* Nothing goes over a full-bleed photo */}
        {!photoBg && <Cutout />}
        <Extras />
        <TopBar source={source} />
        {slide.layout !== "cta" && <Footer />}
        {editable && <SnapGuides slideId={slide.id} />}
      </div>
    </SlideCtx.Provider>
  );
}

export const SlideCanvas = memo(SlideCanvasInner);

const pad = (n: number) => String(n).padStart(2, "0");

/** Source of the news on the left, page number (or the brand logo on the cover) on the right */
function TopBar({ source }: { source?: SlideSource | null }) {
  const { index, total, slide, profile, display, style } = useSlide();
  const isCover = slide.layout === "cover";
  // Grid-minded styles count with two digits
  const padded = style === "swiss" || style === "tech" || style === "orbital" || style === "brutalist" || style === "manga";
  return (
    <div className="slide-top">
      {display.source && source?.name ? (
        <div className="slide-source">
          {source.favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={source.favicon} alt="" />
          )}
          <span>{source.name}</span>
        </div>
      ) : (
        <span />
      )}
      {isCover
        ? profile.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="slide-logo" src={profile.logo} alt="" />
          )
        : display.pageNumber && (
            <span className="slide-page">
              {padded ? pad(index + 1) : index + 1}
              <span className="slide-page-total">/{padded ? pad(total) : total}</span>
            </span>
          )}
    </div>
  );
}

function Footer() {
  const { profile, slide, index, total, language, display, connector } = useSlide();
  const isCover = slide.layout === "cover";
  const last = index === total - 1;
  const showAvatar = display.avatar && !!profile.avatar;
  return (
    <div className="slide-footer">
      {showAvatar || display.handle ? (
        <div className="slide-handle">
          {showAvatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar!} alt="" />
          )}
          {display.handle && <span>{handleOf(profile)}</span>}
        </div>
      ) : (
        <span />
      )}
      {/* The connector already leads to the next slide; the cover keeps its "swipe" hint */}
      {!last && (isCover || connector === "none") && (
        <div className="slide-next">
          {isCover && <span>{CHROME_TEXT[language].swipe}</span>}
          <ArrowRight size={isCover ? 30 : 28} strokeWidth={2.4} />
        </div>
      )}
    </div>
  );
}

const NO_LINES: number[] = [];

/** The alignment lines the dragged element locked onto */
function SnapGuides({ slideId }: { slideId: string }) {
  const xs = useGuides((g) => (g.slideId === slideId ? g.xs : NO_LINES));
  const ys = useGuides((g) => (g.slideId === slideId ? g.ys : NO_LINES));
  if (!xs.length && !ys.length) return null;
  return (
    <div className="snap-guides" aria-hidden>
      {xs.map((x) => (
        <i key={`x${x}`} className="snap-x" style={{ left: x }} />
      ))}
      {ys.map((y) => (
        <i key={`y${y}`} className="snap-y" style={{ top: y }} />
      ))}
    </div>
  );
}