import { jev } from "./jev";
import type { ImageRef } from "../types";

// Wikimedia throttles anonymous clients less when the User-Agent carries contact info (set WIKIMEDIA_CONTACT)
const UA = `GeradorCarrossel/0.2 (${process.env.WIKIMEDIA_CONTACT || "local news carousel tool"})`;
export const PROXY_HOSTS = ["upload.wikimedia.org", "thumb.wikimedia.org", "images.unsplash.com", "pixabay.com", "cdn.pixabay.com"];

// Wikimedia only renders thumbnails at standard widths (330, 500, 960, 1280, 1920…)
const WIKI_FULL_WIDTH = 1280;
const WIKI_THUMB_WIDTH = 330;

export const proxied = (url: string) => `/api/img?u=${encodeURIComponent(url)}`;

/* ───────────── Polite fetching: cache + Wikimedia queue ───────────── */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cache = new Map<string, { t: number; v: unknown }>();
const CACHE_TTL = 30 * 60 * 1000;

function remember<T>(key: string, v: T) {
  if (cache.size > 400) cache.delete(cache.keys().next().value!);
  cache.set(key, { t: Date.now(), v });
  return v;
}
function recall<T>(key: string, ttl = CACHE_TTL): T | undefined {
  const hit = cache.get(key);
  return hit && Date.now() - hit.t < ttl ? (hit.v as T) : undefined;
}

/** Limits concurrency and spaces requests out; a 429 pauses everyone behind it. */
function makeGate(concurrency: number, spacingMs: number) {
  let active = 0;
  let nextSlot = 0;
  const waiting: (() => void)[] = [];
  return {
    async acquire() {
      while (active >= concurrency) await new Promise<void>((r) => waiting.push(r));
      active++;
      const wait = Math.max(0, nextSlot - Date.now());
      nextSlot = Date.now() + wait + spacingMs;
      if (wait) await sleep(wait);
    },
    release() {
      active--;
      waiting.shift()?.();
    },
    pause(ms: number) {
      nextSlot = Math.max(nextSlot, Date.now() + ms);
    },
  };
}

// Wikimedia throttles full-text search hard (~1/s per IP); plain lookups by title are cheap
const searchGate = { name: "search", ...makeGate(1, 1100) };
const lookupGate = { name: "lookup", ...makeGate(2, 150) };
type Gate = typeof searchGate;

async function wikiJson<T>(url: URL, gate: Gate): Promise<T | null> {
  const key = url.toString();
  const cached = recall<T>(key);
  if (cached) return cached;
  for (let attempt = 0; attempt < 3; attempt++) {
    await gate.acquire();
    let res: Response | null = null;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
    } catch {
      res = null;
    } finally {
      gate.release();
    }
    if (res?.ok) return remember(key, (await res.json()) as T);
    if (res && res.status !== 429 && res.status < 500) return null;
    const retryAfter = Number(res?.headers.get("retry-after")) || 0;
    console.warn(`[wikimedia ${gate.name}] ${res?.status ?? "network error"} at ${new Date().toISOString().slice(11, 19)}, retrying`);
    gate.pause(retryAfter ? Math.min(retryAfter, 5) * 1000 : 2500 * (attempt + 1));
  }
  return null;
}

/* ───────────── Text matching ───────────── */

const STOPWORDS = new Set(
  (
    "the and for with from into over under this that these those their there about after before between " +
    "photo image picture view file jpg jpeg png " +
    "dos das com para por pela pelo uma umas uns que como sobre entre sem sob nos nas num numa mais menos"
  ).split(" "),
);

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}

function matches(wanted: string[], text: string) {
  const have = new Set(tokens(text));
  return wanted.filter((t) => have.has(t)).length;
}

/**
 * How many words of a proper name must appear for a result to count as that entity.
 * Strict on short names ("Banco Central do Brasil" must not match "Banco do Brasil").
 */
const entityMin = (wanted: string[]) => (wanted.length <= 3 ? Math.max(1, wanted.length) : wanted.length - 1);

const NSFW = /\b(nude|naked|nudity|sex|sexual|porn|erotic|genital|penis|vagina|masturbat|topless|fetish|lingerie|nsfw)/i;
const JUNK =
  /(logo|coat of arms|bras[aã]o|flag of|bandeira|map of|mapa|locator|signature|assinatura|diagram|chart|graph|icon|seal of|selo|poster|cover art|screenshot|infographic|svg)/i;

const safe = (c: ImageRef) => !NSFW.test(c.alt);

/**
 * Archive photos of some random named person ("Jane Doe at Some Summit 2014", selfies, portraits).
 * Fine when that person is the subject; misleading as a generic illustration.
 */
const PERSON_PHOTO = /\b(portrait|headshot|selfie|retrato|researcher|chairman|ceo|director|speaker)\b/i;
const NAMED_AT_EVENT = /^(\p{Lu}[\p{L}'.-]+\s){1,3}(at|in|during|speaking|em|no|na)\s/u;
const notAPerson = (c: ImageRef) => !PERSON_PHOTO.test(c.alt) && !NAMED_AT_EVENT.test(c.alt);

/* ───────────── Unsplash (optional key) ───────────── */

export async function searchUnsplash(key: string, query: string, perPage = 10): Promise<ImageRef[]> {
  if (!key || !query) return [];
  const u = new URL("https://api.unsplash.com/search/photos");
  u.searchParams.set("query", query);
  u.searchParams.set("per_page", String(perPage));
  u.searchParams.set("content_filter", "high");
  // Demo keys allow ~50 requests/hour: never ask twice for the same search
  const cached = recall<ImageRef[]>(`unsplash:${u}`);
  if (cached) return cached;
  const res = await fetch(u, {
    headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    console.warn("[unsplash]", res.status);
    return [];
  }
  type Photo = {
    id: string;
    alt_description?: string | null;
    description?: string | null;
    urls: { raw: string; small: string };
    user: { name: string };
    links: { download_location: string };
    tags?: { title: string }[];
  };
  const data = (await res.json()) as { results: Photo[] };
  const photos = data.results
    .map((p) => ({
      id: `us_${p.id}`,
      source: "unsplash" as const,
      url: proxied(`${p.urls.raw}&w=1400&q=80&fm=jpg&fit=max`),
      thumb: p.urls.small,
      alt: [p.alt_description, p.description, p.tags?.map((t) => t.title).join(", ")].filter(Boolean).join(" — ") || query,
      credit: `Foto: ${p.user.name} / Unsplash`,
      track: p.links.download_location,
    }))
    .filter(safe);
  return remember(`unsplash:${u}`, photos);
}

/* ───────────── Pixabay (optional key) ───────────── */

// Pixabay asks clients to cache every search for 24 hours
const PIXABAY_TTL = 24 * 60 * 60 * 1000;

/**
 * Photos, or with `cutout` objects on a transparent background (PNG) to place over a slide.
 * Image URLs expire after a day, so the proxy keeps its own copy (see /api/img).
 */
export async function searchPixabay(key: string, query: string, opts: { perPage?: number; cutout?: boolean } = {}): Promise<ImageRef[]> {
  if (!key || !query) return [];
  const perPage = Math.max(3, opts.perPage ?? 10);
  const cacheKey = `pixabay:${opts.cutout ? "cutout" : "photo"}:${perPage}:${query.toLowerCase()}`;
  const cached = recall<ImageRef[]>(cacheKey, PIXABAY_TTL);
  if (cached) return cached;
  const u = new URL("https://pixabay.com/api/");
  u.searchParams.set("key", key);
  u.searchParams.set("q", query.slice(0, 100));
  u.searchParams.set("safesearch", "true");
  u.searchParams.set("per_page", String(perPage));
  if (opts.cutout) u.searchParams.set("colors", "transparent");
  else {
    u.searchParams.set("image_type", "photo");
    u.searchParams.set("min_width", "1000");
  }
  const res = await fetch(u, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!res?.ok) {
    console.warn("[pixabay]", res?.status ?? "network error");
    return [];
  }
  type Hit = { id: number; tags: string; previewURL: string; webformatURL: string; largeImageURL: string; user: string; imageWidth: number; imageHeight: number };
  const data = (await res.json()) as { hits: Hit[] };
  const images = data.hits
    .map((h) => ({
      id: `px_${h.id}`,
      source: "pixabay" as const,
      url: proxied(h.largeImageURL || h.webformatURL),
      thumb: proxied(h.webformatURL.replace("_640", "_340")),
      alt: h.tags || query,
      credit: `${opts.cutout ? "Imagem" : "Foto"}: ${h.user} / Pixabay`,
      width: h.imageWidth,
      height: h.imageHeight,
    }))
    .filter(safe);
  return remember(cacheKey, images);
}

/** The best transparent object for a slide: tags must mention the object, people and text art are out */
export async function findCutout(key: string, query: string): Promise<ImageRef | null> {
  const wanted = tokens(query);
  if (!key || !wanted.length) return null;
  const found = await searchPixabay(key, query, { cutout: true, perPage: 20 }).catch(() => []);
  const fits = found.filter((c) => matches(wanted, c.alt) >= Math.min(wanted.length, 2) && !/\b(man|woman|people|person|girl|boy|text|letter|logo|word)\b/i.test(c.alt));
  return fits[0] ?? null;
}

/* ───────────── Wikimedia Commons ───────────── */

type CommonsInfo = {
  url: string;
  thumburl?: string;
  width: number;
  height: number;
  mime: string;
  extmetadata?: Record<string, { value: string }>;
};
type CommonsPage = { title: string; index?: number; imageinfo?: CommonsInfo[] };

function stripHtml(s: string) {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Turns a Commons file page into a candidate; null when it is not a usable photo. */
function fromCommons(p: CommonsPage, source: "wikimedia" | "wikipedia", label?: string): ImageRef | null {
  const info = p.imageinfo?.[0];
  if (!info || !/image\/(jpeg|webp)/.test(info.mime)) return null;
  if (info.width < 600 || info.height < 400) return null;
  const meta = info.extmetadata ?? {};
  const name = p.title.replace(/^File:/, "").replace(/\.\w+$/, "").replace(/_/g, " ");
  const description = stripHtml(meta.ImageDescription?.value ?? meta.ObjectName?.value ?? "");
  const artist = stripHtml(meta.Artist?.value ?? "").slice(0, 60);
  const license = stripHtml(meta.LicenseShortName?.value ?? "");
  const full = info.thumburl ?? info.url;
  const alt = [label, name, description].filter(Boolean).join(" — ").slice(0, 260);
  return {
    id: `wm_${p.title}`,
    source,
    url: proxied(full),
    thumb: full.replace(/\/\d+px-/, `/${WIKI_THUMB_WIDTH}px-`),
    alt,
    credit: `Foto: ${artist || "Wikimedia Commons"}${artist ? " / Wikimedia Commons" : ""}${license ? ` (${license})` : ""}`,
  };
}

async function commonsQuery(params: Record<string, string>, gate: Gate): Promise<CommonsPage[]> {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  const all: Record<string, string> = {
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(WIKI_FULL_WIDTH),
    iiextmetadatafilter: "Artist|LicenseShortName|ImageDescription|ObjectName",
    origin: "*",
    ...params,
  };
  Object.entries(all).forEach(([k, v]) => u.searchParams.set(k, v));
  const data = await wikiJson<{ query?: { pages: Record<string, CommonsPage> } }>(u, gate);
  return Object.values(data?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

export async function searchCommons(query: string, limit = 12): Promise<ImageRef[]> {
  if (!query) return [];
  const pages = await commonsQuery(
    { generator: "search", gsrsearch: `${query} filetype:bitmap`, gsrnamespace: "6", gsrlimit: String(limit) },
    searchGate,
  );
  const allowJunk = JUNK.test(query);
  return pages
    .filter((p) => allowJunk || !JUNK.test(p.title))
    .map((p) => fromCommons(p, "wikimedia"))
    .filter((c): c is ImageRef => !!c && safe(c));
}

/* ───────────── Wikipedia lead images ───────────── */

type WikiPage = { title: string; index?: number; pageimage?: string; pageprops?: { disambiguation?: string } };
/** src/width come from the REST summary, used when the credits lookup is throttled */
type LeadHit = { article: string; file: string; src?: string; width?: number };

/** upload.wikimedia.org original → standard-width thumbnail */
function commonsThumb(src: string, width: number, originalWidth = Infinity) {
  if (originalWidth <= width) return src;
  const m = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/)(\w\/\w\w\/)(.+)$/.exec(src);
  return m ? `${m[1]}thumb/${m[2]}${m[3]}/${width}px-${m[3]}` : src;
}

function leadHits(pages: WikiPage[], wanted: string[], minMatch: number): LeadHit[] {
  return pages
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .filter((p) => p.pageimage && !p.pageprops?.disambiguation && matches(wanted, p.title) >= minMatch)
    .filter((p) => /\.(jpe?g|webp)$/i.test(p.pageimage!) && !JUNK.test(p.pageimage!))
    .map((p) => ({ article: p.title, file: `File:${p.pageimage}` }));
}

/** Resolves lead-image files on Commons (with credits). Non-free local files simply don't resolve. */
async function leadImages(hits: LeadHit[]): Promise<ImageRef[]> {
  const unique = hits.filter((h, i) => hits.findIndex((x) => x.file === h.file) === i).slice(0, 8);
  if (!unique.length) return [];
  const pages = await commonsQuery({ titles: unique.map((h) => h.file).join("|") }, lookupGate);
  if (!pages.length) {
    // Credits lookup throttled: still use the photos the CDN already gave us
    return unique
      .filter((h) => h.src)
      .map((h) => ({
        id: `wm_${h.file}`,
        source: "wikipedia" as const,
        url: proxied(commonsThumb(h.src!, WIKI_FULL_WIDTH, h.width)),
        thumb: commonsThumb(h.src!, WIKI_THUMB_WIDTH, h.width),
        alt: `${h.article} — ${h.file.replace(/^File:/, "").replace(/\.\w+$/, "").replace(/_/g, " ")}`,
        credit: "Foto: Wikimedia Commons",
      }))
      .filter(safe);
  }
  return unique
    .map((h) => {
      const page = pages.find((p) => p.title.replace(/_/g, " ") === h.file.replace(/_/g, " "));
      return page ? fromCommons(page, "wikipedia", h.article) : null;
    })
    .filter((c): c is ImageRef => !!c && safe(c));
}

function wikiUrl(lang: string, params: Record<string, string>) {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  const all = { action: "query", format: "json", prop: "pageimages|pageprops", piprop: "name", ppprop: "disambiguation", origin: "*", ...params };
  Object.entries(all).forEach(([k, v]) => u.searchParams.set(k, v));
  return u;
}

/**
 * Lead photo of Wikipedia articles with exactly these titles (redirects followed): the portrait of
 * a person, the facade of a place, a representative photo of a concept. Uses the CDN-cached REST
 * summary endpoint, so it does not count against the throttled Action API.
 */
export async function wikipediaByTitle(titles: string[], langs: ("en" | "pt")[]): Promise<ImageRef[]> {
  const list = titles.map((t) => t.trim()).filter(Boolean);
  if (!list.length) return [];
  const lookups = langs.flatMap((lang) => list.map((title) => ({ lang, title })));
  const found = await Promise.all(
    lookups.map(async ({ lang, title }): Promise<LeadHit | null> => {
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}?redirect=true`;
      type Summary = { type?: string; title?: string; originalimage?: { source: string; width: number } };
      let data = recall<Summary | null>(url);
      if (data === undefined) {
        const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) }).catch(() => null);
        data = res?.ok ? ((await res.json()) as Summary) : null;
        // Remember answers, including "no such article", but not transient failures
        if (res?.ok || res?.status === 404) remember(url, data);
      }
      const src = data?.originalimage?.source?.split("?")[0];
      // Only free files hosted on Commons (non-free logos/posters live under /wikipedia/en/)
      if (!data || data.type === "disambiguation" || !src?.includes("/wikipedia/commons/")) return null;
      const file = decodeURIComponent(src.split("/").pop() ?? "");
      if (!/\.(jpe?g|webp)$/i.test(file) || JUNK.test(file)) return null;
      return { article: data.title ?? title, file: `File:${file}`, src, width: data.originalimage?.width };
    }),
  );
  return leadImages(found.filter((h): h is LeadHit => !!h));
}

/** Lead photos of the articles a full-text search finds (slower, throttled by Wikimedia). */
export async function searchWikipedia(query: string, lang: "en" | "pt", limit: number, minMatch: number) {
  if (!query) return [];
  const data = await wikiJson<{ query?: { pages: Record<string, WikiPage> } }>(
    wikiUrl(lang, { generator: "search", gsrsearch: query, gsrlimit: String(limit) }),
    searchGate,
  );
  return leadImages(leadHits(Object.values(data?.query?.pages ?? {}), tokens(query), minMatch));
}

/* ───────────── Search cascade ───────────── */

/** Last resort per newsroom section: Wikipedia articles whose lead photo is a safe generic illustration. */
const SECTION_FALLBACK: Record<string, string[]> = {
  politics: ["Parliament", "Legislature"],
  economy: ["Money", "Stock exchange"],
  tech: ["Data center", "Computer"],
  science: ["Laboratory"],
  health: ["Hospital", "Physician"],
  sports: ["Stadium", "Association football"],
  culture: ["Concert"],
  world: ["Diplomacy", "Headquarters of the United Nations"],
  security: ["Police", "Police car"],
  general: ["Newspaper"],
};

interface Step {
  kind: "entity" | "scene" | "broad" | "section";
  q: string;
}

const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export interface StockKeys {
  unsplash: string;
  pixabay: string;
}

/** Stock photo banks: Unsplash first, Pixabay to fill in */
async function searchStock(keys: StockKeys, q: string): Promise<ImageRef[]> {
  const unsplash = await searchUnsplash(keys.unsplash, q).catch(() => []);
  if (unsplash.length >= 3 || !keys.pixabay) return unsplash;
  return [...unsplash, ...(await searchPixabay(keys.pixabay, q).catch(() => []))];
}

async function searchStep(step: Step, keys: StockKeys): Promise<ImageRef[]> {
  const wanted = tokens(step.q);
  const none = () => [] as ImageRef[];

  switch (step.kind) {
    case "entity": {
      // Exact Wikipedia article first; full-text searches only when it misses
      const min = entityMin(wanted);
      const byTitle = await wikipediaByTitle([step.q], ["en", "pt"]).catch(none);
      if (byTitle.length) return byTitle;
      const searched = await searchWikipedia(step.q, "en", 3, min).catch(none);
      if (searched.length) return searched;
      return (await searchCommons(step.q).catch(none)).filter((c) => matches(wanted, c.alt) >= min);
    }
    case "scene": {
      const stock = await searchStock(keys, step.q);
      if (stock.length >= 3) return stock;
      // Text-matched archive results must share most of the scene's words, not just one
      const need = Math.min(2, wanted.length);
      const commons = (await searchCommons(step.q).catch(none))
        .filter((c) => matches(wanted, c.alt) >= need && notAPerson(c))
        .sort((a, b) => matches(wanted, b.alt) - matches(wanted, a.alt));
      return [...stock, ...commons];
    }
    case "broad": {
      // Curated sources first: the photo banks, then the lead photo of Wikipedia articles on the concept
      const [stock, wiki] = await Promise.all([searchStock(keys, step.q), wikipediaByTitle([sentenceCase(step.q)], ["en"]).catch(none)]);
      if (stock.length || wiki.length) return [...stock, ...wiki];
      const searched = await searchWikipedia(step.q, "en", 5, 1).catch(none);
      if (searched.length) return searched;
      return (await searchCommons(step.q).catch(none)).filter((c) => matches(wanted, c.alt) >= 1 && notAPerson(c));
    }
    case "section":
      return wikipediaByTitle(SECTION_FALLBACK[step.q] ?? SECTION_FALLBACK.general, ["en"]).catch(none);
  }
}

interface PickContext {
  headline: string;
  slideText: string;
}

/** Splits candidates into those that fit the slide and the rest (JEV when available). */
async function judge(cands: ImageRef[], step: Step, ctx: PickContext, jevKey: string) {
  const pool = cands.slice(0, 16);
  const criteria: Record<string, string> = Object.fromEntries(
    pool.map((c, i) => [`img${i}`, `${c.source === "unsplash" || c.source === "pixabay" ? "Stock photo" : "Archive photo"}: ${c.alt.slice(0, 220)}`]),
  );
  criteria.none = "None of these photos clearly shows what the slide is about";
  const answers = await jev(jevKey, `NEWS HEADLINE: ${ctx.headline}\nSLIDE TEXT: ${ctx.slideText}\nWANTED IMAGE: ${step.q}`, {
    best: {
      type: "choice",
      instructions:
        "Which photo best illustrates this slide of a news carousel? Prefer photos that actually show the specific person, place or object named. Choose 'none' if every photo is unrelated or misleading.",
      criteria,
    },
  });
  const a = answers?.best;
  if (a?.type !== "choice") return { fit: cands, unfit: [] as ImageRef[] };
  const none = a.probabilities.none ?? 0;
  const scored = pool.map((c, i) => ({ c, p: a.probabilities[`img${i}`] ?? 0 })).sort((x, y) => y.p - x.p);
  return {
    fit: scored.filter((s) => s.p > none).map((s) => s.c),
    unfit: [...scored.filter((s) => s.p <= none).map((s) => s.c), ...cands.slice(16)],
  };
}

export interface FindResult {
  candidates: ImageRef[];
  /** false when nothing relevant was found and the candidates are only loose options */
  match: boolean;
}

/**
 * Tries the most specific search first (the named entity), then the slide's scene,
 * then a broad concept and finally the newsroom section, until something relevant shows up.
 */
export async function findImages(opts: {
  query: string;
  entity: string | null;
  broad?: string;
  category?: string | null;
  headline: string;
  slideText: string;
  stockKeys: StockKeys;
  jevKey: string;
  /** A specific person or party: their own photo or nothing, never a generic one */
  entityOnly?: boolean;
}): Promise<FindResult> {
  const steps: Step[] = [];
  const add = (kind: Step["kind"], q?: string | null) => {
    const v = q?.trim();
    if (v && !steps.some((s) => s.q.toLowerCase() === v.toLowerCase())) steps.push({ kind, q: v });
  };
  add("entity", opts.entity);
  if (!opts.entityOnly) {
    add("scene", opts.query);
    add("broad", opts.broad);
    add("section", sectionKey(opts.category));
  }

  const fit: ImageRef[] = [];
  const loose: ImageRef[] = [];
  // When Wikimedia is throttling, stop digging and fall back to the always-available section photo
  const deadline = Date.now() + 20000;
  for (const step of steps) {
    if (Date.now() > deadline && step.kind !== "section") continue;
    const found = await searchStep(step, opts.stockKeys);
    if (!found.length) continue;
    const judged = await judge(found, step, opts, opts.jevKey);
    fit.push(...judged.fit);
    loose.push(...judged.unfit);
    if (fit.length) break;
  }
  const seen = new Set<string>();
  const candidates = [...fit, ...loose].filter((c) => !seen.has(c.id) && seen.add(c.id)).slice(0, 18);
  return { candidates, match: fit.length > 0 };
}

/** JEV section ids, or the model's topic in Portuguese/English, to a fallback key. */
function sectionKey(category?: string | null) {
  const c = (category ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (SECTION_FALLBACK[c]) return c;
  const map: [RegExp, string][] = [
    [/politic|eleic|governo|congresso/, "politics"],
    [/econom|financ|mercado|negocio|business/, "economy"],
    [/tecnolog|tech|ciberseg|internet|digital/, "tech"],
    [/cienc|scien|clima|ambient|espaco/, "science"],
    [/saude|health|medic/, "health"],
    [/esport|sport|futebol/, "sports"],
    [/cultur|entreten|cinema|music|arte/, "culture"],
    [/mundo|internac|world|global/, "world"],
    [/seguran|polici|crime|justica/, "security"],
  ];
  return map.find(([re]) => re.test(c))?.[1] ?? "general";
}

/** Manual search from the image picker: every source, no cascade. */
export async function searchAll(query: string, keys: StockKeys): Promise<ImageRef[]> {
  const [unsplash, pixabay, wiki, commons] = await Promise.all([
    searchUnsplash(keys.unsplash, query, 12).catch(() => []),
    searchPixabay(keys.pixabay, query, { perPage: 12 }).catch(() => []),
    searchWikipedia(query, "pt", 4, 1).catch(() => []),
    searchCommons(query, 16).catch(() => []),
  ]);
  const seen = new Set<string>();
  return [...unsplash, ...pixabay, ...wiki, ...commons].filter((c) => !seen.has(c.id) && seen.add(c.id));
}
