import type { StyleId } from "@/lib/styles";
import type { LayoutId } from "@/lib/types";
import type { LayoutMap } from "../kit";
import { brutalistLayouts } from "./brutalist";
import { canvasLayouts } from "./canvas";
import { collageLayouts } from "./collage";
import { mangaLayouts } from "./manga";
import { mdeLayouts } from "./mde";
import { minimalLayouts } from "./minimal";
import { newspaperLayouts } from "./newspaper";
import { orbitalLayouts } from "./orbital";
import { sketchLayouts } from "./sketch";
import { swissLayouts } from "./swiss";
import { techLayouts } from "./tech";

interface StyleKit {
  /** Compositions that replace the base layout of the same format */
  layouts: LayoutMap;
  /** Formats whose photo does (or no longer does) run under the chrome */
  photoBg?: Partial<Record<LayoutId, boolean>>;
  /** Formats that show a photo in this style although the base layout has none (the user can pick it) */
  photoIn?: LayoutId[];
}

// Most styles frame the cover and quote photos instead of running them full bleed
const framed = { cover: false, quote: false };

export const STYLE_KITS: Record<StyleId, StyleKit> = {
  modern: { layouts: {} },
  minimal: { layouts: minimalLayouts, photoBg: { quote: false } },
  sketch: { layouts: sketchLayouts, photoBg: framed },
  newspaper: { layouts: newspaperLayouts, photoBg: framed },
  collage: { layouts: collageLayouts, photoBg: framed },
  swiss: { layouts: swissLayouts, photoBg: { quote: false } },
  tech: { layouts: techLayouts, photoBg: framed },
  orbital: { layouts: orbitalLayouts, photoBg: framed },
  manga: { layouts: mangaLayouts, photoBg: framed },
  // Statements run over the story's cover photo
  mde: { layouts: mdeLayouts, photoBg: { versus: false, statement: true }, photoIn: ["statement"] },
  brutalist: { layouts: brutalistLayouts, photoBg: framed },
  canvas: { layouts: canvasLayouts, photoBg: framed },
};

/** Whether the user can pick a photo for this format in this style */
export const styleShowsPhoto = (style: StyleId, layout: LayoutId) => !!STYLE_KITS[style]?.photoIn?.includes(layout);