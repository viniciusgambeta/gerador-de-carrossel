/**
 * Post styles. Each one has its own compositions for the main formats (components/slides/styles),
 * its own typography and decorations (app/slide-styles/*.css). Colors come from the user's palette,
 * except for the styles built on a design system, which bring that system's own palette.
 */
export const STYLES = [
  {
    id: "modern",
    name: "Moderno",
    description: "Tipografia forte, cards arredondados e fotos em tela cheia.",
  },
  {
    id: "minimal",
    name: "Minimalista",
    description: "Muito respiro, letras finas, fios no lugar de caixas e fotos pequenas.",
  },
  {
    id: "sketch",
    name: "Rabisco",
    description: "Caderno, letra à mão, polaroides, balões, post-its e setas desenhadas.",
  },
  {
    id: "newspaper",
    name: "Jornal",
    description: "Primeira página: manchete serifada, colunas, capitular e fotos em P&B.",
  },
  {
    id: "collage",
    name: "Colagem",
    description: "Recortes de papel, fita adesiva, adesivos, retícula e letras misturadas.",
  },
  {
    id: "swiss",
    name: "Suíço",
    description: "Grid à mostra, composição assimétrica, números gigantes e fotos sangradas.",
  },
  {
    id: "tech",
    name: "Interface",
    description: "Janelas, balões de chat, widgets e notificações, com brilho no escuro.",
  },
  {
    id: "orbital",
    name: "Orbital",
    description: "Design system Orbital Command: telemetria, retículas de mira e órbitas.",
    fixedColors: true,
  },
  {
    id: "manga",
    name: "Mangá",
    description: "Design system Manga Ink: quadros, retícula, balões e linhas de impacto.",
    fixedColors: true,
  },
  {
    id: "mde",
    name: "MDE",
    description: "Design system MDE: fotos em destaque sob degradê roxo, coral, emojis e título condensado.",
    fixedColors: true,
  },
  {
    id: "brutalist",
    name: "Neo Brutalista",
    description: "Design system Neo Brutalist: cards com borda, sombra sólida e selos.",
    fixedColors: true,
  },
  {
    id: "canvas",
    name: "Canvas",
    description: "Inspirado no Figma: o post montado na tela do editor, com frames, seleções, medidas e painéis.",
    fixedColors: true,
  },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];

export const isStyleId = (v: unknown): v is StyleId => STYLES.some((s) => s.id === v);

/** Styles built on a design system keep that system's palette instead of the user's */
export const hasFixedColors = (id: StyleId) => STYLES.some((s) => s.id === id && "fixedColors" in s);

/** Styles that were replaced keep the closest look */
const RENAMED: Record<string, StyleId> = { neon: "tech", brutal: "brutalist", playlist: "tech", stay: "modern" };

export const toStyleId = (v: unknown): StyleId => (isStyleId(v) ? v : (RENAMED[String(v)] ?? "modern"));
