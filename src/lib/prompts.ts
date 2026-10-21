import { MAX_SLIDES, MIN_SLIDES } from "./constants";
import { CONTENT_LAYOUTS, LAYOUTS } from "./layouts";
import { ICON_NAMES } from "./icons";
import type { Article, ContentLayoutId, Language } from "./types";

const LANGUAGE_NAME: Record<Language, string> = {
  "pt-BR": "Brazilian Portuguese (pt-BR), casual and natural, like a friend who explains the news well",
  en: "English, casual and natural",
  es: "Spanish, casual and natural",
};

const MAX_ARTICLE_CHARS = 14000;

function layoutGuide(layouts: ContentLayoutId[]) {
  return layouts.map((l) => `  - "${l}" (${LAYOUTS[l].label}): ${LAYOUTS[l].guide}`).join("\n");
}

function editorRules(language: Language, sensitive: boolean) {
  return `
OUTPUT LANGUAGE: ${LANGUAGE_NAME[language]}. Image search fields stay in English.

FACTS
- Facts ONLY from the article. Never invent numbers, names, dates or quotes. Quotes must be verbatim (you may cut them).

VOICE: ONE CONTINUOUS, CASUAL, DIDACTIC TEXT (most important)
- The whole carousel is ONE text split across slides. Read only the visible texts in order: it must sound like a friend explaining the news in a single, well-connected conversation, never like separate cards or headlines.
- Casual and warm, but accurate. Talk to the reader ("você") when natural. Short sentences. "!" and "?!" are welcome where there is surprise.
- Every slide picks up where the previous one stopped: answers its question, gives the cause, shows the consequence or adds the next step. Titles often open with a connector ("Até aqui,", "Só que", "E aí vem a parte curiosa:", "Na prática,", "Resultado:", "Mas atenção:") or end with ":" to lead into the slide's content.
- Explain, don't just announce: write for someone who has NOT read the article. When a technical term appears, explain it right there in plain words (or give it an "explainer" slide).
- Titles are complete, natural sentences, never labels or headline fragments.
  Style examples from another story (imitate the tone, not the content):
    weak "Aparência e risco de morte, estudo em radioterapia" → strong "E quanto a idade estimada influenciou no risco de morte?!"
    weak "Hábitos ligados à aparência mais envelhecida" → strong "Foram mapeados alguns hábitos ligados à aparência mais velha:"
    weak "O modelo se comporta bem em fotos variadas" → strong "Até aqui, o modelo se comportou bem com fotos variadas!"
    weak "Uma IA que lê o rosto do paciente" → strong "Tudo começa com uma única foto do rosto do paciente."
- A question ALWAYS ends with "?" (or "?!"). Do not start a statement with "Como", "Por que", "O que", "Quem", "Qual" unless it is a real question.
- NEVER use dashes (— or –) to join ideas. Use a period, a comma or a colon instead.
- Numbers ALWAYS in digits, never spelled out ("21%", "5 anos", "40 milhões", "R$ 2,3 bi"). In value fields keep them short and punchy ("+21%", "-17%", "40 mi"); the label explains in plain words what the number means. One number per value. No ≥ or ≤.
- Be specific to this story (names, places, numbers, consequences). Banned filler: "Entenda", "Fique por dentro", "Confira", "Isso muda tudo", "Saiba mais".
- Highlight with **double asterisks** the 1-3 key words of EVERY text block: titles AND body texts, answers, definitions, captions. Never a whole sentence.
${
  sensitive
    ? "- THIS IS A SENSITIVE STORY (death, violence, tragedy or similar): keep it warm but sober and respectful, no emojis (use \"\" for emoji fields), no jokes, no hype words, no exclamation marks.\n"
    : "- Emojis only where they add warmth (statement emoji, a cover kicker); item visuals use icons.\n"
}
FORMATS: pick, for each beat, the format that EXPLAINS it best. Never force a visual format whose requirements are not met; "text" and "qa" are excellent when an idea needs explaining.
${layoutGuide(CONTENT_LAYOUTS)}
- Variety comes from fitting each beat, not from a quota: never the same layout twice in a row and at most twice in the whole carousel (text up to 3 times).
- Counts: list 3-5 items, grid exactly 4, steps 3-5, timeline 3-5 events, diagram 3-4 nodes, chart 3-5 bars (value = plain number, display = formatted like "R$ 2,3 bi" or "47%"), compare 1-3 points per side.
- Icons: pick, for each item, the icon whose meaning matches it (avoid repeating the same icon in one slide), from: ${ICON_NAMES.join(", ")}.
- "tone" is the slide background: "light", "dark" or "brand". Alternate for rhythm; never the same tone 3 times in a row; "brand" for the 1-2 most important slides.

IMAGES
- Images go on: cover (always), "text" (optional photo), "quote" (optional photo of the speaker), "profile" and "image".
- image.entity = exact proper name, as on Wikipedia, of the person/place/organization/event to show, or null when nothing specific needs to be shown.
- People: a quote from a public figure ALWAYS gets image.entity = the speaker's exact name (their photo becomes the slide background). Versus sides ALWAYS get image.entity = each side's exact name.
- image.query = 2-5 concrete English words describing a photographable scene that illustrates THIS slide ("nurses in hospital corridor", "oil refinery at night").
- image.broad = 1-2 English words, a generic concept that surely has photos ("hospital", "oil industry", "money").
- icon (text, statement, stat, question) = the icon that best symbolizes the slide, one of the icon names above written exactly as listed; it is drawn large in free space when the slide has no photo.
- cutout = on 2 or 3 slides WITHOUT a photo at most, one concrete physical object that would look good as a cut-out sticker next to the text, in 1-3 English words ("solar panel", "piggy bank", "light bulb", "gavel"). Only when the slide is about something you can hold or point at; null on every other slide. Never people, body parts, logos, brands, flags, maps or anything with text.`.trim();
}

export function generatePrompt(article: Article, language: Language) {
  const system = `
You are the senior editor of a news brand on Instagram, loved for explaining complex news in a light, clear way. You turn one news article into a carousel that reads like ONE short, well-told text: people stop at the cover, swipe slide after slide without noticing the cuts, and finish understanding the story and why it matters to them.

${editorRules(language, article.analysis.sensitive)}

HOW TO BUILD IT (fill the fields in this order)
1. topic: the newsroom section in 1-2 words.
2. story: FIRST write the explanation as one connected, casual mini-text, one beat per content slide. Between ${MIN_SLIDES - 2} and ${MAX_SLIDES - 2} beats (the whole carousel, with cover and final slide, has ${MIN_SLIDES} to ${MAX_SLIDES} slides): few for simple news, never pad. Each beat is 1-2 plain sentences that a layperson understands, and each one continues the previous.
   Arc: what happened → the detail that makes it matter → why it happened / context (explain any concept the reader needs) → consequences and who is affected → what happens next / what it means for the reader.
3. cover: opens the story. title = a clear, informative and intriguing rewrite of the headline (max ~14 words), never false; if it is a question, it ends with "?". kicker = 1-2 word label ("URGENTE", "SAÚDE", "ENTENDA O CASO" or the subject). subtitle = one sentence saying why this matters to the reader.
4. slides: exactly one slide per story beat, in the same order, each in the format that explains that beat best. The first slide continues straight from the cover; the last one closes the loop.
5. cta (final slide):
   - takeaway = the whole story summed up in one or two plain sentences, with the 2-3 most important terms in **bold**. It is printed under an "Em resumo:" label, so never start it with "Em resumo", "Resumindo" or similar.
   - options = the final call to action written for EACH action, all tied to this story (the user can switch between them):
     save: invite to save the post to read again ("**Salve** este post para…"), the slide shows an arrow to the save button;
     like: invite to double-tap if it surprised/helped them ("Toque **duas vezes** se…");
     comment: ask the reader a real, specific question about the story that invites opinions;
     share: invite to send it to someone specific who should know ("**Envie** para aquela pessoa que…");
     follow: invite to follow for more news explained like this.
     Each with title (max ~10 words, with **highlight**) and a very short subtitle (max ~8 words).
   - recommended = the action that fits this story best: "save" for useful/explanatory content, "share" for news people send to friends, "comment" for divisive topics, "like" for light or positive news, "follow" otherwise.
6. caption: Instagram caption in the output language, in the same casual voice: a hook line, 2-4 short lines explaining the story, a question that invites comments, "Fonte: <source name>", then 4-6 relevant hashtags. Each of these parts is its own paragraph, separated by a blank line.`.trim();

  return { system, user: articleBlock(article) };
}

export function reformatPrompt(opts: {
  article: Article;
  language: Language;
  target: ContentLayoutId;
  /** Every slide of the carousel as text, in order */
  outline: string[];
  /** Index of the slide being rewritten inside outline */
  index: number;
}) {
  const { article, language, target, outline, index } = opts;
  const system = `
You are the senior editor of a news brand on Instagram, loved for explaining complex news in a light, clear way. You are rewriting ONE slide of an existing news carousel into a different format, presenting the same information from a fresh angle and making it as clear as possible.

${editorRules(language, article.analysis.sensitive)}

TARGET FORMAT: "${target}" — ${LAYOUTS[target].guide}
- The new slide must read as the natural continuation of the slide before it and lead into the slide after it, in the same casual voice. Do not repeat what the other slides already say.
- You may bring in other facts from the article if they make this format work better.`.trim();

  const sequence = outline
    .map((text, i) => `${i === index ? ">>> SLIDE TO REWRITE" : `Slide ${i + 1}`}:\n${text || "(empty)"}`)
    .join("\n\n");
  const user = `CAROUSEL IN ORDER:\n\n${sequence}\n\n${articleBlock(article, 9000)}`;
  return { system, user };
}

function articleBlock(article: Article, max = MAX_ARTICLE_CHARS) {
  return `ARTICLE
Source: ${article.siteName || hostOf(article.url)}
${article.publishedAt ? `Published: ${article.publishedAt}\n` : ""}Headline: ${article.title}
${article.description ? `Standfirst: ${article.description}\n` : ""}
${article.text.slice(0, max)}`;
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
