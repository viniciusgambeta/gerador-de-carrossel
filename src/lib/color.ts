import type { StyleId } from "./styles";
import type { Tone } from "./types";

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function alpha(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function luminance(hex: string) {
  const c = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const INK = "#111111";
const PAPER = "#FFFFFF";

/** 0 for grays, close to 1 for vivid colors */
function chroma(hex: string) {
  const c = hexToRgb(hex);
  return (Math.max(...c) - Math.min(...c)) / 255;
}

/** Tells apart by lightness or by hue: a lime next to white text is as distinct as a gray */
const distinctFrom = (c: string, fg: string) => contrast(c, fg) >= 1.6 || Math.abs(chroma(c) - chroma(fg)) >= 0.35;

export const readableOn = (bg: string) => (contrast(bg, INK) >= contrast(bg, PAPER) ? INK : PAPER);

function firstReadable(bg: string, candidates: string[], min: number, fallback: string) {
  return candidates.find((c) => contrast(c, bg) >= min) ?? fallback;
}

export interface SlideTheme {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  accentFg: string;
  surface: string;
  line: string;
  /** "text" = colored words, "marker" = highlighter stroke behind words */
  hlStyle: "text" | "marker";
}

/** Tokens taken from each design system (DESIGN.md files), one theme per tone */
const fixed = (bg: string, fg: string, accent: string, accentFg: string, surface: string, hlStyle: SlideTheme["hlStyle"], muted = alpha(fg, 0.7)): SlideTheme => ({
  bg,
  fg,
  muted,
  accent,
  accentFg,
  surface,
  line: alpha(fg, 0.18),
  hlStyle,
});

const DESIGN_SYSTEMS: Partial<Record<StyleId, Record<Tone, SlideTheme>>> = {
  // Orbital Command
  orbital: {
    light: fixed("#0B1628", "#E6F2FF", "#52D6E8", "#111111", "#101E32", "text", "#B0BDCC"),
    dark: fixed("#080F1D", "#E6F2FF", "#52D6E8", "#111111", "#101E32", "text", "#B0BDCC"),
    brand: fixed("#101E32", "#E6F2FF", "#52D6E8", "#111111", "#16273F", "text", "#B0BDCC"),
  },
  // Manga Ink
  manga: {
    light: fixed("#F7F5EF", "#171717", "#F6D647", "#111111", "#FFFFFF", "marker", "#515151"),
    dark: fixed("#171717", "#F7F5EF", "#F6D647", "#111111", "#262626", "marker"),
    brand: fixed("#F6D647", "#171717", "#FFFFFF", "#111111", "#FFFFFF", "marker", "#3A3A3A"),
  },
  // Me dá um Exemplo
  mde: {
    light: fixed("#1F1D2B", "#F4F4F9", "#FF7551", "#20191E", "#252332", "text", "#A5A8BC"),
    dark: fixed("#171521", "#F4F4F9", "#FF7551", "#20191E", "#242230", "text", "#A5A8BC"),
    brand: fixed("#FF7551", "#20191E", "#20191E", "#FF967B", "#FF967B", "marker", "#3D2A2A"),
  },
  // Inspired by Figma: the editor's canvas (light or dark UI), selection blue
  canvas: {
    light: fixed("#F5F5F5", "#1E1E1E", "#0D99FF", "#FFFFFF", "#FFFFFF", "text", "#757575"),
    dark: fixed("#1E1E1E", "#F5F5F5", "#0D99FF", "#FFFFFF", "#2C2C2C", "text", "#A0A0A0"),
    brand: fixed("#E5F4FF", "#1E1E1E", "#0D99FF", "#FFFFFF", "#FFFFFF", "text", "#5E6B78"),
  },
  // Neo Brutalist
  brutalist: {
    light: fixed("#FFF5DF", "#171717", "#E8FF68", "#111111", "#FFFFFF", "marker", "#515151"),
    dark: fixed("#171717", "#FFF5DF", "#E8FF68", "#111111", "#FFFFFF", "marker"),
    brand: fixed("#E8FF68", "#171717", "#FFFFFF", "#111111", "#FFFFFF", "marker", "#3A3A3A"),
  },
};

/** Background/ink per style and tone; the user's palette provides the accents */
export function slideTheme(tone: Tone, primary: string, secondary: string, style: StyleId = "modern"): SlideTheme {
  if (style === "modern") return modernTheme(tone, primary, secondary);
  const system = DESIGN_SYSTEMS[style];
  if (system) return system[tone];

  const surfaces = (bg: string, fg: string): Pick<SlideTheme, "muted" | "surface" | "line"> => ({
    muted: alpha(fg, 0.66),
    surface: readableOn(bg) === INK ? alpha("#000000", 0.05) : alpha("#FFFFFF", 0.08),
    line: alpha(fg, 0.16),
  });
  const build = (bg: string, fg: string, accents: string[], min = 3): SlideTheme => {
    // An accent that looks like the text color would make highlights vanish: fall back to the second brand color
    const onBg = bg === fg ? accents : [...accents, ...(readableOn(bg) === INK ? darkened(secondary) : lightened(secondary))];
    const distinct = onBg.filter((c) => distinctFrom(c, fg));
    const accent = firstReadable(bg, distinct, min, fg);
    return { bg, fg, accent, accentFg: readableOn(accent), hlStyle: "text", ...surfaces(bg, fg) };
  };
  const darkened = (c: string) => [c, mix(c, "#000000", 0.3), mix(c, "#000000", 0.55)];
  const lightened = (c: string) => [c, mix(c, "#FFFFFF", 0.35), mix(c, "#FFFFFF", 0.6)];

  switch (style) {
    case "minimal": {
      if (tone === "dark") return build("#121212", "#EDEBE6", [secondary, ...lightened(primary)]);
      // "brand" is only a whisper of the brand color
      const bg = tone === "brand" ? mix(primary, "#FFFFFF", 0.88) : "#F7F6F2";
      return build(bg, "#151515", darkened(primary));
    }
    case "sketch": {
      if (tone === "dark") return build("#22262B", "#F3EFE6", [secondary, ...lightened(primary)]);
      // "brand" is a sticky note tinted with the brand color
      const bg = tone === "brand" ? mix(primary, "#FFF8E7", 0.8) : "#FBF7EE";
      return build(bg, "#1E1D1B", darkened(primary));
    }
    case "newspaper": {
      if (tone === "dark") return build("#161513", "#EFEAE0", [...lightened(primary), secondary]);
      const bg = tone === "brand" ? "#E8DFCB" : "#F3EEE3";
      return build(bg, "#161513", darkened(primary), 4.5);
    }
    case "collage": {
      // The accent is mostly a fill here (stickers, paper labels), read through accentFg
      if (tone === "dark") return build("#1C1A17", "#F4EEE2", [secondary, ...lightened(primary)], 1.4);
      if (tone === "brand") return build(primary, readableOn(primary), [secondary, readableOn(primary) === INK ? "#FFFFFF" : INK], 1.4);
      return build("#ECE3CF", "#1A1814", [secondary, ...darkened(primary)], 1);
    }
    case "swiss": {
      if (tone === "dark") return build("#0A0A0A", "#FFFFFF", [secondary, ...lightened(primary)]);
      if (tone === "brand") return build(primary, readableOn(primary), [readableOn(primary)], 1);
      return build("#FFFFFF", "#0A0A0A", darkened(primary));
    }
    case "tech": {
      // Light slides are a light UI; dark and brand ones glow
      if (tone === "light") return build("#ECEFF3", "#0E1420", darkened(primary));
      const bg = tone === "brand" ? mix(primary, "#05060A", 0.78) : "#070A12";
      return build(bg, "#EAF0FF", [secondary, ...lightened(primary), "#7CF7FF"], 4.5);
    }
  }
  return modernTheme(tone, primary, secondary);
}

function modernTheme(tone: Tone, primary: string, secondary: string): SlideTheme {
  if (tone === "dark") {
    const bg = mix(primary, "#0B0C0F", 0.9);
    const fg = "#F5F4F0";
    const accent = firstReadable(bg, [secondary, primary, mix(primary, "#FFFFFF", 0.45)], 3, fg);
    return {
      bg,
      fg,
      muted: alpha(fg, 0.64),
      accent,
      accentFg: readableOn(accent),
      surface: alpha("#FFFFFF", 0.07),
      line: alpha("#FFFFFF", 0.14),
      hlStyle: "text",
    };
  }
  if (tone === "brand") {
    const bg = primary;
    const fg = readableOn(bg);
    const accent = firstReadable(bg, [secondary], 1.8, fg === PAPER ? INK : PAPER);
    return {
      bg,
      fg,
      muted: alpha(fg, 0.74),
      accent,
      accentFg: readableOn(accent),
      surface: alpha(fg, 0.1),
      line: alpha(fg, 0.2),
      hlStyle: "marker",
    };
  }
  const bg = "#F5F3EE";
  const fg = INK;
  const accent = firstReadable(bg, [primary, mix(primary, "#000000", 0.3), mix(primary, "#000000", 0.55)], 3, fg);
  return {
    bg,
    fg,
    muted: alpha(fg, 0.62),
    accent,
    accentFg: readableOn(accent),
    surface: "#FFFFFF",
    line: alpha(fg, 0.1),
    hlStyle: "text",
  };
}

export function themeVars(t: SlideTheme): Record<string, string> {
  return {
    "--bg": t.bg,
    "--fg": t.fg,
    "--muted": t.muted,
    "--accent": t.accent,
    "--accent-fg": t.accentFg,
    "--surface": t.surface,
    "--line": t.line,
  };
}
