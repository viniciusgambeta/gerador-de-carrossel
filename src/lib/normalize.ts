import { CTA_ACTIONS, MAX_SLIDES } from "./constants";
import { isIconName } from "./icons";
import type {
  ChartBar,
  CompareSide,
  CtaAction,
  CtaText,
  DuoSide,
  GridItem,
  IconItem,
  ImageQuery,
  Slide,
  SlideContent,
  Step,
  Tone,
} from "./types";

/**
 * Turns (possibly partial, streaming) model output into the slide model.
 * Every field gets a safe default so half-written slides can render.
 */

type Raw = Record<string, unknown> | null | undefined;

const s = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown) => (Array.isArray(v) ? (v as Raw[]) : []);
const tone = (v: unknown): Tone => (v === "dark" || v === "brand" ? v : "light");
/** Items used to carry an emoji; newer ones carry an icon name. Anything else (a stray word) is dropped */
const iconOf = (o: Raw) => {
  const v = (s(o?.icon) || s(o?.emoji)).trim();
  if (isIconName(v.toLowerCase())) return v.toLowerCase();
  return /\p{Extended_Pictographic}/u.test(v) ? v : "";
};

function iconItem(v: Raw): IconItem {
  return { icon: iconOf(v), text: s(v?.text) };
}

function gridItem(v: Raw): GridItem {
  return { icon: iconOf(v), title: s(v?.title), text: s(v?.text) };
}

function step(v: Raw): Step {
  return { title: s(v?.title), text: s(v?.text) };
}

function side(v: unknown): CompareSide {
  const o = (v ?? {}) as Raw;
  return { label: s(o?.label), icon: iconOf(o), points: list(o?.points).map((p) => s(p)) };
}

function duoSide(v: unknown): DuoSide {
  const o = (v ?? {}) as Raw;
  return { value: s(o?.value), label: s(o?.label), icon: iconOf(o) };
}

function bar(v: Raw): ChartBar {
  const value = typeof v?.value === "number" ? v.value : Number(String(v?.value ?? "").replace(",", "."));
  return { label: s(v?.label), value: Number.isFinite(value) ? value : 0, display: s(v?.display) };
}

export function imageQueryOf(v: unknown): ImageQuery | null {
  const o = v as Raw;
  const query = s(o?.query).trim();
  const entity = s(o?.entity).trim() || null;
  if (!query && !entity) return null;
  return { query, entity, broad: s(o?.broad).trim() || undefined };
}

export function contentOf(raw: Raw): SlideContent | null {
  if (!raw) return null;
  switch (raw.layout) {
    case "statement":
      return { layout: "statement", emoji: s(raw.emoji), text: s(raw.text) };
    case "text":
      return { layout: "text", kicker: s(raw.kicker), title: s(raw.title), body: s(raw.body) };
    case "stat": {
      const share = typeof raw.share === "number" && raw.share >= 0 && raw.share <= 100 ? raw.share : null;
      return { layout: "stat", kicker: s(raw.kicker), value: s(raw.value), label: s(raw.label), context: s(raw.context), share };
    }
    case "duo":
      return { layout: "duo", title: s(raw.title), left: duoSide(raw.left), right: duoSide(raw.right), note: s(raw.note) };
    case "quote":
      return { layout: "quote", quote: s(raw.quote), author: s(raw.author), role: s(raw.role) };
    case "profile":
      return { layout: "profile", name: s(raw.name), role: s(raw.role), text: s(raw.text) };
    case "explainer":
      return {
        layout: "explainer",
        kicker: s(raw.kicker),
        term: s(raw.term),
        definition: s(raw.definition),
        example: s(raw.example),
        icon: iconOf(raw),
      };
    case "qa":
      return { layout: "qa", question: s(raw.question), answer: s(raw.answer) };
    case "list":
      return { layout: "list", title: s(raw.title), items: list(raw.items).map(iconItem) };
    case "grid":
      return { layout: "grid", title: s(raw.title), items: list(raw.items).map(gridItem) };
    case "steps":
      return { layout: "steps", title: s(raw.title), steps: list(raw.steps).map(step) };
    case "timeline":
      return {
        layout: "timeline",
        title: s(raw.title),
        events: list(raw.events).map((e) => ({ when: s(e?.when), text: s(e?.text) })),
      };
    case "compare":
      return { layout: "compare", title: s(raw.title), left: side(raw.left), right: side(raw.right) };
    case "versus": {
      const l = (raw.left ?? {}) as Raw;
      const r = (raw.right ?? {}) as Raw;
      return {
        layout: "versus",
        title: s(raw.title),
        left: { name: s(l?.name), stance: s(l?.stance) },
        right: { name: s(r?.name), stance: s(r?.stance) },
        note: s(raw.note),
      };
    }
    case "chart":
      return { layout: "chart", title: s(raw.title), bars: list(raw.bars).map(bar), note: s(raw.note) };
    case "diagram":
      return { layout: "diagram", title: s(raw.title), nodes: list(raw.nodes).map(iconItem) };
    case "question":
      return { layout: "question", question: s(raw.question), hint: s(raw.hint) };
    case "image":
      return { layout: "image", caption: s(raw.caption) };
    default:
      return null;
  }
}

/** A proper name such as "Javier Milei" or "Luiz Inácio Lula da Silva" (not "especialista em energia") */
const PROPER_NAME = /^\p{Lu}[\p{L}'.-]+(\s+(da|de|do|dos|das|e|\p{Lu}[\p{L}'.-]+))+$/u;

/**
 * Photo searches requested by a slide: versus slides want one per side;
 * a quote from a named person gets their photo even if the model forgot to ask for it.
 */
export function imageQueriesOf(raw: Raw, content: SlideContent): [ImageQuery | null, ImageQuery | null] {
  if (content.layout === "versus") {
    const l = (raw?.left ?? {}) as Raw;
    const r = (raw?.right ?? {}) as Raw;
    const named = (o: Raw, name: string) => imageQueryOf(o?.image) ?? (name ? { query: "", entity: name.replace(/\*\*/g, "") } : null);
    return [named(l, content.left.name), named(r, content.right.name)];
  }
  const first = imageQueryOf(raw?.image);
  if (!first && content.layout === "quote" && PROPER_NAME.test(content.author.replace(/\*\*/g, "").trim())) {
    return [{ query: "", entity: content.author.replace(/\*\*/g, "").trim() }, null];
  }
  return [first, null];
}

/** Layouts that show a specific person or party: only their own photo will do, never a look-alike */
export const PEOPLE_LAYOUTS = new Set(["quote", "profile", "versus"]);

export function coverOf(raw: Raw): SlideContent {
  return { layout: "cover", kicker: s(raw?.kicker), title: s(raw?.title), subtitle: s(raw?.subtitle) };
}

const isAction = (v: unknown): v is CtaAction => (CTA_ACTIONS as readonly unknown[]).includes(v);

export function ctaOf(raw: Raw): SlideContent {
  const written = (raw?.options ?? {}) as Record<string, Raw>;
  const options: Partial<Record<CtaAction, CtaText>> = {};
  for (const a of CTA_ACTIONS) {
    const o = written[a];
    if (s(o?.title) || s(o?.subtitle)) options[a] = { title: s(o?.title), subtitle: s(o?.subtitle) };
  }
  const wanted = raw?.recommended ?? raw?.action;
  const action: CtaAction = isAction(wanted) ? wanted : "save";
  // Carousels made before the options existed carry a single title/subtitle
  if (!options[action] && (s(raw?.title) || s(raw?.subtitle))) options[action] = { title: s(raw?.title), subtitle: s(raw?.subtitle) };
  const current = options[action] ?? { title: "", subtitle: "" };
  return { layout: "cta", takeaway: s(raw?.takeaway), title: current.title, subtitle: current.subtitle, action, options };
}

export const rawTone = (raw: Raw) => tone(raw?.tone);

const EMOJI = /\p{Extended_Pictographic}️?/gu;

/** Interrogative openings: a title that starts like a question must end with "?" */
const QUESTION_START =
  /^(por que|porque|como|o que|quem|quando|onde|qual|quais|quanto|quantos|quantas|será que|e se|e agora|vale a pena|why|how|what|who|when|where|which|por qué|cómo|qué|quién|cuándo|dónde|cuál)\b/i;

export function fixQuestion(text: string) {
  const plain = text.replace(/\*\*/g, "").trim();
  if (!QUESTION_START.test(plain) || /[?.!:…]$/.test(plain) || plain.includes("\n")) return text;
  return `${text.trimEnd()}?`;
}

/** No dashes joining ideas: a spaced dash becomes a comma; number ranges keep a hyphen. */
export function noDashes(text: string) {
  return text
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1-$2")
    .replace(/^\s*[—–]\s*/, "")
    .replace(/\s*[—–]\s*$/, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*([,.:;!?])/g, "$1");
}

/** Instagram caption with a blank line between paragraphs (every line the model wrote is one) */
export function formatCaption(text: string) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n\n");
}

/** The final slide prints its own "Em resumo" label */
function stripSummaryLabel(text: string) {
  const rest = text.replace(/^\s*(\*\*)?(em resumo|resumindo|resumo|in short|en resumen)(\*\*)?\s*[:,.]?\s*/i, "");
  return rest === text ? text : rest.charAt(0).toUpperCase() + rest.slice(1);
}

/** Fields that hold words shown to the reader (everything else is ids, icons, numbers, images) */
const NOT_TEXT = new Set([
  "id",
  "layout",
  "tone",
  "icon",
  "emoji",
  "image",
  "imageQuery",
  "imageCandidates",
  "imageStatus",
  "image2",
  "imageQuery2",
  "imageCandidates2",
  "imageStatus2",
  "overrides",
  "tried",
  "action",
  "share",
  "value",
  "display",
]);

function mapText<T>(v: T, fn: (s: string) => string, key = ""): T {
  if (NOT_TEXT.has(key)) return v;
  if (typeof v === "string") return fn(v) as T;
  if (Array.isArray(v)) return v.map((x) => mapText(x, fn)) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapText(x, fn, k)])) as T;
  }
  return v;
}

/** Keeps the first slides and the closing one when the model wrote more than the maximum */
function capLength(slides: Slide[]) {
  const content = slides.filter((s) => s.layout !== "cover" && s.layout !== "cta");
  const room = MAX_SLIDES - (slides.length - content.length);
  if (content.length <= room) return slides;
  const keep = new Set([...content.slice(0, room - 1), content[content.length - 1]].map((s) => s.id));
  return slides.filter((s) => s.layout === "cover" || s.layout === "cta" || keep.has(s.id));
}

/** Deterministic clean-up once the model is done. */
export function finalizeSlides(slides: Slide[], opts: { sensitive: boolean }): Slide[] {
  const out = capLength(slides).map((sl) => {
    const clean = mapText(fixQuestions(fixContent(sl)), noDashes);
    return clean.layout === "cta" ? { ...clean, takeaway: stripSummaryLabel(clean.takeaway) } : clean;
  });

  // Rhythm: never the same background three times in a row
  for (let i = 2; i < out.length; i++) {
    const [a, b, c] = [out[i - 2], out[i - 1], out[i]];
    if (c.layout === "cta" || b.layout === "cover") continue;
    if (a.tone === b.tone && b.tone === c.tone) out[i - 1] = { ...b, tone: b.tone === "light" ? "dark" : "light" };
  }

  if (opts.sensitive) return out.map(stripEmoji);
  return out;
}

function fixQuestions(sl: Slide): Slide {
  switch (sl.layout) {
    case "cover":
    case "text":
    case "list":
    case "grid":
    case "steps":
    case "timeline":
    case "chart":
    case "diagram":
    case "duo":
    case "versus":
    case "compare":
      return { ...sl, title: fixQuestion(sl.title) };
    case "statement":
      return { ...sl, text: fixQuestion(sl.text) };
    case "qa":
    case "question":
      return { ...sl, question: fixQuestion(sl.question) };
    default:
      return sl;
  }
}

function fixContent(sl: Slide): Slide {
  switch (sl.layout) {
    case "list":
      return { ...sl, items: sl.items.filter((i) => i.text.trim()).slice(0, 5) };
    case "grid":
      return { ...sl, items: sl.items.filter((i) => i.title.trim() || i.text.trim()).slice(0, 4) };
    case "steps":
      return { ...sl, steps: sl.steps.filter((st) => st.title.trim() || st.text.trim()).slice(0, 5) };
    case "timeline":
      return { ...sl, events: sl.events.filter((e) => e.text.trim()).slice(0, 5) };
    case "diagram":
      return { ...sl, nodes: sl.nodes.filter((n) => n.text.trim()).slice(0, 4) };
    case "compare":
      return {
        ...sl,
        left: { ...sl.left, points: sl.left.points.filter(Boolean).slice(0, 3) },
        right: { ...sl.right, points: sl.right.points.filter(Boolean).slice(0, 3) },
      };
    case "chart": {
      const bars = sl.bars.filter((b) => b.label && Number.isFinite(b.value)).slice(0, 6);
      if (bars.length >= 2) return { ...sl, bars };
      // Not enough data for a chart: show the same facts as a list
      const { bars: _b, note: _n, ...rest } = sl;
      return {
        ...rest,
        layout: "list",
        items: sl.bars.map((b) => ({ icon: "chart", text: `${b.label}: **${b.display || b.value}**` })),
      } as Slide;
    }
    default:
      return sl;
  }
}

function stripEmoji(sl: Slide): Slide {
  const strip = (v: string) => v.replace(EMOJI, "").replace(/\s{2,}/g, " ").trim();
  switch (sl.layout) {
    case "statement":
      return { ...sl, emoji: "", text: strip(sl.text) };
    case "cover":
      return { ...sl, kicker: strip(sl.kicker) };
    default:
      return sl;
  }
}

/** Short id for client-side objects */
export const uid = () => Math.random().toString(36).slice(2, 10);
