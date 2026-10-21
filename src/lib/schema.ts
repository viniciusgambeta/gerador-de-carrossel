import { ICON_NAMES } from "./icons";
import type { ContentLayoutId } from "./types";

/** JSON Schemas for OpenAI Structured Outputs (strict mode: every key required, no extras). */

type Schema = Record<string, unknown>;

const str: Schema = { type: "string" };
const nstr: Schema = { type: ["string", "null"] };
const num: Schema = { type: "number" };
const arr = (items: Schema): Schema => ({ type: "array", items });
const lay = (id: string): Schema => ({ type: "string", enum: [id] });
const tone: Schema = { type: "string", enum: ["light", "dark", "brand"] };

function obj(properties: Record<string, Schema>): Schema {
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
}

const imageQuery = obj({
  entity: {
    type: ["string", "null"],
    description: "Exact proper name (as on Wikipedia) of the person/place/organization/event to show, or null",
  },
  query: { type: "string", description: "2-5 concrete English words describing a photographable scene for this slide" },
  broad: { type: "string", description: "1-2 English words: a generic concept that surely has photos" },
});
const optionalImage: Schema = { anyOf: [imageQuery, { type: "null" }] };
/** An object on a transparent background, placed next to the text (Pixabay) */
const cutout: Schema = { type: ["string", "null"], description: "1-3 English words naming a concrete object, or null" };
/**
 * Structured outputs allow at most 1000 enum values per schema, and every use of the icon list
 * counts its 77 names again. Icons drawn next to items keep the enum; the slide's symbol icon
 * (only a filler, checked against the list on the client) is a plain string.
 */
const icon: Schema = { type: "string", enum: [...ICON_NAMES] };
const slideIcon: Schema = { type: "string", description: "Name of the icon that best symbolizes the slide, from the icon list" };
const iconItem = obj({ icon, text: str });
const side = obj({ label: str, icon, points: arr(str) });
const duoSide = obj({ value: str, label: str, icon });
const versusSide = obj({
  name: str,
  stance: { type: "string", description: "What this side wants, says or defends, in one short sentence" },
  image: imageQuery,
});

export const SLIDE_SCHEMAS: Record<ContentLayoutId, Schema> = {
  text: obj({ layout: lay("text"), tone, kicker: nstr, title: str, body: str, image: optionalImage, cutout, icon: slideIcon }),
  statement: obj({ layout: lay("statement"), tone, emoji: nstr, text: str, cutout, icon: slideIcon }),
  stat: obj({
    layout: lay("stat"),
    tone,
    kicker: nstr,
    value: str,
    label: str,
    context: nstr,
    share: { type: ["number", "null"], description: "0-100 only when the value is a part of a whole, else null" },
    cutout,
    icon: slideIcon,
  }),
  duo: obj({ layout: lay("duo"), tone, title: str, left: duoSide, right: duoSide, note: nstr }),
  compare: obj({ layout: lay("compare"), tone, title: nstr, left: side, right: side }),
  versus: obj({ layout: lay("versus"), tone, title: str, left: versusSide, right: versusSide, note: nstr }),
  quote: obj({ layout: lay("quote"), tone, quote: str, author: str, role: nstr, image: optionalImage }),
  profile: obj({ layout: lay("profile"), tone, name: str, role: str, text: str, image: imageQuery }),
  explainer: obj({ layout: lay("explainer"), tone, kicker: nstr, term: str, definition: str, example: nstr, icon, cutout }),
  qa: obj({ layout: lay("qa"), tone, question: str, answer: str, cutout }),
  list: obj({ layout: lay("list"), tone, title: str, items: arr(iconItem) }),
  grid: obj({ layout: lay("grid"), tone, title: str, items: arr(obj({ icon, title: str, text: str })) }),
  steps: obj({ layout: lay("steps"), tone, title: str, steps: arr(obj({ title: str, text: str })) }),
  timeline: obj({ layout: lay("timeline"), tone, title: str, events: arr(obj({ when: str, text: str })) }),
  chart: obj({
    layout: lay("chart"),
    tone,
    title: str,
    bars: arr(obj({ label: str, value: num, display: str })),
    note: nstr,
  }),
  diagram: obj({ layout: lay("diagram"), tone, title: str, nodes: arr(iconItem) }),
  question: obj({ layout: lay("question"), tone, question: str, hint: nstr, cutout, icon: slideIcon }),
  image: obj({ layout: lay("image"), tone, caption: str, image: imageQuery }),
};

/**
 * Key order matters: the model writes the connected story first and then the slides from it;
 * the client renders the stream in this order (cover first, caption last).
 */
export const CAROUSEL_SCHEMA: Schema = obj({
  topic: str,
  story: {
    type: "array",
    items: str,
    description: "The carousel as one connected mini-story: one beat (1-2 sentences) per content slide, in order",
  },
  cover: obj({ kicker: str, title: str, subtitle: str, image: imageQuery }),
  slides: arr({ anyOf: Object.values(SLIDE_SCHEMAS) }),
  cta: obj({
    takeaway: {
      type: "string",
      description: "The whole story summed up in one or two plain sentences, key terms in **bold**, without a 'Em resumo' prefix",
    },
    recommended: { type: "string", enum: ["save", "like", "comment", "share", "follow"] },
    options: obj({
      save: obj({ title: str, subtitle: str }),
      like: obj({ title: str, subtitle: str }),
      comment: obj({ title: str, subtitle: str }),
      share: obj({ title: str, subtitle: str }),
      follow: obj({ title: str, subtitle: str }),
    }),
  }),
  caption: str,
});

export function reformatSchema(layout: ContentLayoutId): Schema {
  return obj({ slide: SLIDE_SCHEMAS[layout] });
}
