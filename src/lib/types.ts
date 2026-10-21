export type Tone = "light" | "dark" | "brand";

export type LayoutId =
  | "cover"
  | "statement"
  | "text"
  | "stat"
  | "duo"
  | "quote"
  | "profile"
  | "explainer"
  | "qa"
  | "list"
  | "grid"
  | "steps"
  | "timeline"
  | "compare"
  | "versus"
  | "chart"
  | "diagram"
  | "question"
  | "image"
  | "cta";

export type ContentLayoutId = Exclude<LayoutId, "cover" | "cta">;

export type CtaAction = "save" | "like" | "comment" | "share" | "follow";

export interface CtaText {
  title: string;
  subtitle: string;
}

export interface ImageQuery {
  /** English, concrete scene for this slide */
  query: string;
  /** Proper name of a specific person/place/organization/event, as on Wikipedia */
  entity: string | null;
  /** English, 1-2 word generic concept used when the specific searches find nothing */
  broad?: string;
}

export interface ImageRef {
  id: string;
  source: "unsplash" | "pixabay" | "wikipedia" | "wikimedia" | "upload";
  /** Full-size, same-origin (proxied) so it can be exported */
  url: string;
  thumb: string;
  alt: string;
  credit: string | null;
  /** Unsplash asks apps to ping this URL when a photo is actually used */
  track?: string;
  /** Original size, when the source tells it */
  width?: number;
  height?: number;
  /** object-position in % */
  pos?: { x: number; y: number };
}

export interface BlockOverride {
  x: number;
  y: number;
  /** Font size factor (A−/A+) */
  scale: number;
  /** Box size the user dragged out, in slide pixels: text wraps to the width and shrinks to fit the height */
  w?: number;
  h?: number;
}

/** A picture the user placed on a slide, on top of the layout */
export interface ExtraImage {
  id: string;
  image: ImageRef;
  /** Top-left corner and width, in slide pixels; the height follows the picture's proportions */
  x: number;
  y: number;
  w: number;
  /** width / height */
  ratio: number;
}

/** `icon` is an icon name (lib/icons) — or an emoji in carousels made before icons existed */
export interface IconItem {
  icon: string;
  text: string;
}
export interface GridItem {
  icon: string;
  title: string;
  text: string;
}
export interface Step {
  title: string;
  text: string;
}
export interface TimelineEvent {
  when: string;
  text: string;
}
export interface CompareSide {
  label: string;
  icon: string;
  points: string[];
}
export interface VersusSide {
  name: string;
  stance: string;
}
export interface DuoSide {
  value: string;
  label: string;
  icon: string;
}
export interface ChartBar {
  label: string;
  value: number;
  display: string;
}

export type SlideContent =
  | { layout: "cover"; kicker: string; title: string; subtitle: string }
  | { layout: "statement"; emoji: string; text: string }
  | { layout: "text"; kicker: string; title: string; body: string }
  /** share: 0-100 only when the value is a part of a whole (draws a bar) */
  | { layout: "stat"; kicker: string; value: string; label: string; context: string; share: number | null }
  | { layout: "duo"; title: string; left: DuoSide; right: DuoSide; note: string }
  | { layout: "quote"; quote: string; author: string; role: string }
  | { layout: "profile"; name: string; role: string; text: string }
  | { layout: "explainer"; kicker: string; term: string; definition: string; example: string; icon: string }
  | { layout: "qa"; question: string; answer: string }
  | { layout: "list"; title: string; items: IconItem[] }
  | { layout: "grid"; title: string; items: GridItem[] }
  | { layout: "steps"; title: string; steps: Step[] }
  | { layout: "timeline"; title: string; events: TimelineEvent[] }
  | { layout: "compare"; title: string; left: CompareSide; right: CompareSide }
  /** Two parties in conflict; left photo in image, right photo in image2 */
  | { layout: "versus"; title: string; left: VersusSide; right: VersusSide; note: string }
  | { layout: "chart"; title: string; bars: ChartBar[]; note: string }
  | { layout: "diagram"; title: string; nodes: IconItem[] }
  | { layout: "question"; question: string; hint: string }
  | { layout: "image"; caption: string }
  /** title/subtitle are the texts of the current action; options keeps the texts of every action ("Trocar CTA") */
  | { layout: "cta"; takeaway: string; title: string; subtitle: string; action: CtaAction; options: Partial<Record<CtaAction, CtaText>> };

export interface SlideMeta {
  id: string;
  tone: Tone;
  image: ImageRef | null;
  imageQuery: ImageQuery | null;
  imageCandidates?: ImageRef[];
  imageStatus?: "idle" | "loading" | "done" | "error";
  overrides?: Record<string, BlockOverride>;
  /** Layouts already shown for this slide via "Outro formato" */
  tried?: LayoutId[];
  busy?: boolean;
  /** Still being streamed from the model */
  writing?: boolean;
  /** No relevant photo was found: photo layouts fall back to text */
  noPhoto?: boolean;
  /** Second photo, for layouts with two subjects (versus) */
  image2?: ImageRef | null;
  imageQuery2?: ImageQuery | null;
  imageCandidates2?: ImageRef[];
  imageStatus2?: "idle" | "loading" | "done" | "error";
  /** A concrete object (English) to show as a cut-out with no background, next to the text */
  cutoutQuery?: string | null;
  cutout?: ImageRef | null;
  cutoutStatus?: "loading" | "done";
  /** Icon that symbolizes the slide, drawn large in free room when there is no photo or object */
  fillIcon?: string | null;
  /**
   * Connector adjustments: height where the line leaves through the right edge, height of its
   * bottom run and, on the first slide, where the line starts
   */
  link?: { out?: number; run?: number; start?: { x: number; y: number } };
  /** Blocks the user removed from this slide */
  hidden?: string[];
  /** Pictures the user added */
  extras?: ExtraImage[];
}

/** What the slide chrome shows (Configurações → Visual) */
export interface DisplayPrefs {
  imageCredit: boolean;
  source: boolean;
  handle: boolean;
  avatar: boolean;
  pageNumber: boolean;
  /** "Em resumo" box on the last slide */
  summary: boolean;
}

/** Shape of the line that runs from slide to slide ("none" hides it) */
export type ConnectorShape = "none" | "straight" | "curved" | "organic";

export type Slide = SlideMeta & SlideContent;

export interface ArticleAnalysis {
  sensitive: boolean;
  category: string | null;
}

export interface Article {
  url: string;
  title: string;
  description: string;
  siteName: string;
  author: string;
  publishedAt: string;
  lang: string;
  text: string;
  /** data: URL of the site's icon, shown on every slide next to the source name */
  favicon: string | null;
  via: "direct" | "jsonld" | "reader";
  analysis: ArticleAnalysis;
}

export interface Carousel {
  id: string;
  createdAt: number;
  article: Article;
  topic: string;
  /** The connected narrative the slides were written from, one beat per content slide */
  story: string[];
  caption: string;
  slides: Slide[];
  /** Tokens spent on this carousel (generation, images, "Outro formato"), for the cost estimate */
  usage?: Usage;
}

export interface TokenCount {
  input: number;
  cached: number;
  output: number;
}

export interface Usage {
  /** Per OpenAI model */
  openai: Record<string, TokenCount>;
  /** JEV input tokens (its output is free) */
  jev: number;
}

export type Language = "pt-BR" | "en" | "es";

/** "best" gives the model more reasoning time (slower, better writing) */
export type Quality = "fast" | "best";

export interface Profile {
  name: string;
  handle: string;
  avatar: string | null;
  logo: string | null;
  primary: string;
  secondary: string;
}

export interface ApiKeys {
  openai: string;
  unsplash: string;
  pixabay: string;
  jev: string;
  /** Publishing/scheduling on Instagram (postproxy.dev) */
  postproxy: string;
}
