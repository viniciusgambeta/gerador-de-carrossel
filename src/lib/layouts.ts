import type { ContentLayoutId, LayoutId, Slide } from "./types";
import { stripRich } from "./richtext";

interface LayoutInfo {
  label: string;
  /** When to use it (and when not): read by the generative model and by JEV when choosing a format */
  guide: string;
  image: "none" | "optional" | "required";
}

export const LAYOUTS: Record<LayoutId, LayoutInfo> = {
  cover: { label: "Capa", guide: "Cover with photo and headline.", image: "required" },
  text: {
    label: "Título + explicação",
    guide:
      "The workhorse for explaining: a title that states the point + a body (1-3 sentences) that explains it with the concrete detail. Optional photo on top when a real photo helps. Use whenever an idea needs a few sentences to be understood.",
    image: "optional",
  },
  statement: {
    label: "Frase de impacto",
    guide:
      "One strong sentence in giant type, optional emoji. For the turning point, the key conclusion or the most surprising fact. Not for ideas that need explaining.",
    image: "none",
  },
  stat: {
    label: "Número em destaque",
    guide:
      "ONE number that is meaningful on its own (amount, percentage, count, date), in digits, with a label saying in plain words what it measures. NEVER two numbers in one value. share = 0-100 only when the number is a part of a whole (e.g. 30% of the population), else null.",
    image: "none",
  },
  duo: {
    label: "Dois números",
    guide:
      "Two numbers side by side that the reader must compare: two groups, before/after, increase vs decrease, two scenarios. Each side: a short punchy value in digits ('+21%', '-17%', '40 mi') + a plain-language label + icon. The title leads into the comparison.",
    image: "none",
  },
  compare: {
    label: "Comparação",
    guide: "Two situations side by side, each with 1-3 short points: before vs after, A vs B, pros vs cons, promise vs reality. For contrasts made of words, not of numbers.",
    image: "none",
  },
  versus: {
    label: "Versus",
    guide:
      "Two parties in conflict, dispute or rivalry (two leaders, countries, companies, teams, institutions), shown like a fight poster with their photos: each side's name and what it wants, says or defends (one short sentence). The title frames the clash. Use whenever the story is a confrontation between two sides.",
    image: "required",
  },
  quote: {
    label: "Citação",
    guide:
      "A verbatim quote from a person in the article, with name and role. Never invent or paraphrase quotes. If the speaker is a public figure, image.entity = their exact name so the slide shows their photo.",
    image: "optional",
  },
  profile: {
    label: "Perfil",
    guide:
      "A person (or organization) central to the story, with their photo: name, role, and what they did or why they matter here. Needs image.entity with their exact name.",
    image: "required",
  },
  explainer: {
    label: "O que é",
    guide:
      "Explains a term, concept, law or acronym the average reader may not know (e.g. 'idade biológica', 'Selic', 'radioterapia'): the term, a plain-language definition and, when possible, a concrete example.",
    image: "none",
  },
  qa: {
    label: "Pergunta e resposta",
    guide:
      "A question the reader would naturally ask at this point ('E isso vale para quem?', 'Por que isso acontece?') answered right away in 1-3 sentences. Very didactic.",
    image: "none",
  },
  list: {
    label: "Lista",
    guide: "3 to 5 items of the same kind, each a short complete sentence with an icon: what changes, who is affected, what to do.",
    image: "none",
  },
  grid: {
    label: "Grade de ícones",
    guide: "Exactly 4 facts or aspects of equal weight, each with an icon, a 1-3 word title and one short line. Good for an overview of key points.",
    image: "none",
  },
  steps: {
    label: "Passo a passo",
    guide: "3 to 5 numbered steps of a process or procedure (how something works, how to do something), each with a short title and one line.",
    image: "none",
  },
  timeline: {
    label: "Linha do tempo",
    guide: "3 to 5 events in chronological order, each with a date/period label: how it happened, or what comes next. Needs real dates or periods.",
    image: "none",
  },
  chart: {
    label: "Gráfico",
    guide: "3 to 5 comparable numbers from the article in the same unit, shown as bars. Only with real numbers; for just two numbers use 'duo'.",
    image: "none",
  },
  diagram: {
    label: "Causa e efeito",
    guide: "A chain of 3-4 steps where each one causes the next (cause → consequence → result). Each node is a short complete sentence with an icon.",
    image: "none",
  },
  question: {
    label: "Pergunta-gancho",
    guide: "A question that creates curiosity and is answered on the NEXT slide. Pattern break; at most once per carousel.",
    image: "none",
  },
  image: {
    label: "Foto",
    guide:
      "A full-bleed photo with a one-sentence caption that continues the story. Only when a real photo can literally show a specific person, place or scene central to the story.",
    image: "required",
  },
  cta: { label: "Chamada final", guide: "Call to action.", image: "none" },
};

export const CONTENT_LAYOUTS: ContentLayoutId[] = [
  "text",
  "statement",
  "stat",
  "duo",
  "compare",
  "versus",
  "quote",
  "profile",
  "explainer",
  "qa",
  "list",
  "grid",
  "steps",
  "timeline",
  "chart",
  "diagram",
  "question",
  "image",
];

export function supportsImage(layout: LayoutId) {
  return LAYOUTS[layout].image !== "none";
}

/** Plain-text rendering of a slide, for prompts and JEV state */
export function slideToText(s: Slide): string {
  const t = (() => {
    switch (s.layout) {
      case "cover":
        return [s.kicker, s.title, s.subtitle];
      case "statement":
        return [s.text];
      case "text":
        return [s.kicker, s.title, s.body];
      case "stat":
        return [s.kicker, `${s.value} — ${s.label}`, s.context];
      case "duo":
        return [s.title, `${s.left.value}: ${s.left.label}`, `${s.right.value}: ${s.right.label}`, s.note];
      case "quote":
        return [`"${s.quote}"`, `${s.author}${s.role ? `, ${s.role}` : ""}`];
      case "profile":
        return [`${s.name} (${s.role})`, s.text];
      case "explainer":
        return [`${s.term}: ${s.definition}`, s.example];
      case "qa":
        return [s.question, s.answer];
      case "list":
        return [s.title, ...s.items.map((i) => `- ${i.text}`)];
      case "grid":
        return [s.title, ...s.items.map((i) => `- ${i.title}: ${i.text}`)];
      case "steps":
        return [s.title, ...s.steps.map((st, i) => `${i + 1}. ${st.title}: ${st.text}`)];
      case "timeline":
        return [s.title, ...s.events.map((e) => `- ${e.when}: ${e.text}`)];
      case "compare":
        return [
          s.title,
          `${s.left.label}: ${s.left.points.join("; ")}`,
          `${s.right.label}: ${s.right.points.join("; ")}`,
        ];
      case "versus":
        return [s.title, `${s.left.name}: ${s.left.stance}`, `${s.right.name}: ${s.right.stance}`, s.note];
      case "chart":
        return [s.title, ...s.bars.map((b) => `- ${b.label}: ${b.display}`), s.note];
      case "diagram":
        return [s.title, s.nodes.map((n) => n.text).join(" → ")];
      case "question":
        return [s.question, s.hint];
      case "image":
        return [s.caption];
      case "cta":
        return [s.takeaway, s.title, s.subtitle];
    }
  })();
  return stripRich(t.filter(Boolean).join("\n"));
}
