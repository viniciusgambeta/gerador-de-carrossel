import { errorResponse, json, keysFrom, requireOpenAI } from "@/lib/server/http";
import { chatJSON } from "@/lib/server/openai";
import { choice, jev } from "@/lib/server/jev";
import { withUsage } from "@/lib/server/usage";
import { CONTENT_LAYOUTS, LAYOUTS } from "@/lib/layouts";
import { reformatPrompt } from "@/lib/prompts";
import { reformatSchema } from "@/lib/schema";
import type { Article, ContentLayoutId, Language, LayoutId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 90;

interface Body {
  article: Article;
  language: Language;
  /** Every slide as plain text, in order */
  outline: string[];
  /** Position of the slide being reformatted */
  index: number;
  /** Layouts already shown for this slide (current one included) */
  tried: LayoutId[];
}

/** Fallback order when JEV is not configured: the most "different" formats first. */
const ROTATION: ContentLayoutId[] = [
  "qa",
  "text",
  "explainer",
  "grid",
  "statement",
  "list",
  "duo",
  "diagram",
  "steps",
  "compare",
  "stat",
  "timeline",
  "profile",
  "quote",
  "chart",
  "question",
  "image",
];

const countNumbers = (s: string) => (s.match(/\d+(?:[.,]\d+)?\s?(%|mil|mi|bi|milhões|bilhões)?/g) ?? []).length;
const hasQuote = (s: string) => /[“"«][^”"»]{25,}[”"»]/.test(s);

export const POST = withUsage(async (req) => {
  try {
    const keys = keysFrom(req);
    requireOpenAI(keys.openai);
    const b = (await req.json()) as Body;
    const current = b.outline[b.index] ?? "";

    // Cheap deterministic filter: drop formats the content cannot support
    const pool = `${current}\n${b.article.text.slice(0, 6000)}`;
    let candidates = CONTENT_LAYOUTS.filter((l) => !b.tried.includes(l)).filter((l) => {
      if (l === "chart") return countNumbers(pool) >= 3;
      if (l === "duo") return countNumbers(pool) >= 2;
      if (l === "stat") return countNumbers(pool) >= 1;
      if (l === "quote") return hasQuote(pool);
      // A cliffhanger only works mid-story, and a full-bleed photo needs a visual subject: rarely right on demand
      if (l === "question" || l === "image") return false;
      return true;
    });
    if (!candidates.length) candidates = CONTENT_LAYOUTS.filter((l) => l !== b.tried.at(-1));

    // JEV picks the format that best presents this content
    const answers = await jev(
      keys.jev,
      `SLIDE CONTENT:\n${current}\n\nSTORY: ${b.article.title}\n${b.article.text.slice(0, 2500)}`,
      {
        format: {
          type: "choice",
          instructions:
            "Which slide format would present this slide's information in the clearest and most engaging way for an Instagram news carousel, given what the story offers?",
          criteria: Object.fromEntries(candidates.map((l) => [l, LAYOUTS[l].guide])),
        },
      },
    );
    const picked = choice(answers, "format")?.choice as ContentLayoutId | undefined;
    const target =
      picked && candidates.includes(picked) ? picked : (ROTATION.find((l) => candidates.includes(l)) ?? candidates[0]);

    const { system, user } = reformatPrompt({
      article: b.article,
      language: b.language ?? "pt-BR",
      target,
      outline: b.outline,
      index: b.index,
    });
    const result = await chatJSON<{ slide: unknown }>({
      key: keys.openai,
      model: keys.model,
      system,
      user,
      schemaName: "slide",
      schema: reformatSchema(target),
      effort: keys.effort,
      signal: req.signal,
    });
    return json({ slide: result.slide });
  } catch (err) {
    return errorResponse(err);
  }
});
