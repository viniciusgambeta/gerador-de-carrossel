import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import { ApiError } from "./http";
import { choice, jev, noul } from "./jev";
import type { Article, ArticleAnalysis } from "../types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const MIN_TEXT = 500;

type Extracted = Omit<Article, "analysis" | "url" | "favicon"> & { url?: string; iconUrl?: string | null };

const PRIVATE_HOST = /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$)/;

/** The site's icon as a data: URL (so it also renders in exported PNGs). */
async function fetchFavicon(iconUrl: string | null | undefined, pageUrl: string): Promise<string | null> {
  const host = new URL(pageUrl).hostname;
  const tries = [iconUrl, `https://www.google.com/s2/favicons?domain=${host}&sz=128`].filter((u): u is string => !!u);
  for (const u of tries) {
    try {
      const target = new URL(u);
      if (!/^https?:$/.test(target.protocol) || PRIVATE_HOST.test(target.hostname)) continue;
      const res = await fetch(target, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(5000) });
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!res.ok || !type.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100 || buf.length > 150_000) continue;
      return `data:${type};base64,${buf.toString("base64")}`;
    } catch {}
  }
  return null;
}

export async function scrapeArticle(rawUrl: string, jevKey: string): Promise<Article> {
  const url = validateUrl(rawUrl);

  let best: Extracted | null = null;
  let directError: unknown = null;
  try {
    const { html, finalUrl } = await fetchHtml(url);
    best = { ...extract(html, finalUrl), url: finalUrl };
  } catch (err) {
    directError = err;
  }

  let analysis = best && best.text.length >= MIN_TEXT ? await analyze(best, jevKey) : null;

  // Paywall, consent wall, JS-only page or blocked request → try the reader service
  const looksWrong = analysis && analysis.isArticle !== null && analysis.isArticle < 0.3;
  if (!best || best.text.length < MIN_TEXT || looksWrong) {
    try {
      const viaReader = await readerFallback(url);
      if (viaReader.text.length > (best?.text.length ?? 0) || looksWrong) {
        best = { ...viaReader, title: viaReader.title || best?.title || "", siteName: best?.siteName || viaReader.siteName };
        analysis = await analyze(best, jevKey);
      }
    } catch (err) {
      console.warn("[scrape] reader fallback failed:", (err as Error).message);
    }
  }

  if (!best || best.text.length < 200) {
    if (directError instanceof ApiError) throw directError;
    throw new ApiError(422, "Não consegui ler o texto dessa notícia. Tente outro link.");
  }

  const finalUrl = best.url ?? url;
  const [finalAnalysis, favicon] = await Promise.all([analysis ?? analyze(best, jevKey), fetchFavicon(best.iconUrl, finalUrl)]);
  analysis = finalAnalysis;
  return {
    url: finalUrl,
    favicon,
    title: best.title,
    description: best.description,
    siteName: best.siteName,
    author: best.author,
    publishedAt: best.publishedAt,
    lang: best.lang,
    text: best.text,
    via: best.via,
    analysis: { sensitive: analysis.sensitive, category: analysis.category },
  };
}

function validateUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new ApiError(400, "Esse link não parece válido.");
  }
  if (!/^https?:$/.test(u.protocol)) throw new ApiError(400, "Use um link http(s).");
  if (PRIVATE_HOST.test(u.hostname)) throw new ApiError(400, "Esse link não é público.");
  return u.toString();
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new ApiError(res.status === 404 ? 404 : 502, `O site da notícia respondeu com erro ${res.status}.`);
  const type = res.headers.get("content-type") ?? "";
  if (type && !/html|xml/i.test(type)) throw new ApiError(415, "Esse link não parece ser uma página de notícia.");

  const buf = Buffer.from(await res.arrayBuffer());
  let charset = /charset=["']?([\w-]+)/i.exec(type)?.[1];
  if (!charset) charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(buf.subarray(0, 4096).toString("latin1"))?.[1];
  let html: string;
  try {
    html = new TextDecoder((charset ?? "utf-8").toLowerCase()).decode(buf);
  } catch {
    html = buf.toString("utf8");
  }
  return { html, finalUrl: res.url || url };
}

function extract(html: string, url: string): Extracted {
  const dom = new JSDOM(html, { url, virtualConsole: new VirtualConsole() });
  const doc = dom.window.document;
  const meta = (...selectors: string[]) => {
    for (const s of selectors) {
      const v = doc.querySelector(s)?.getAttribute("content")?.trim();
      if (v) return v;
    }
    return "";
  };

  const ld = readJsonLd(doc);
  const parsed = new Readability(doc.cloneNode(true) as Document, { charThreshold: 300 }).parse();
  const readable = parsed?.content ? htmlToText(parsed.content) : "";
  const ldBody = ld?.articleBody ? clean(ld.articleBody) : "";

  // JSON-LD articleBody is authored clean text; prefer it when it is substantial
  const useLd = ldBody.length >= MIN_TEXT && ldBody.length >= readable.length * 0.6;
  const siteName = meta('meta[property="og:site_name"]') || ld?.publisher || parsed?.siteName || "";

  // Prefer the high-resolution touch icon, then the largest declared icon
  const icons = [...doc.querySelectorAll("link[rel][href]")].filter((l) => /icon/i.test(l.getAttribute("rel") ?? ""));
  const iconScore = (l: Element) =>
    (/apple-touch/i.test(l.getAttribute("rel") ?? "") ? 1000 : 0) + (parseInt(l.getAttribute("sizes") ?? "", 10) || 16);
  const bestIcon = icons.sort((a, b) => iconScore(b) - iconScore(a))[0];
  let iconUrl: string | null = null;
  try {
    iconUrl = bestIcon ? new URL(bestIcon.getAttribute("href")!, url).toString() : null;
  } catch {}
  const rawTitle = clean(meta('meta[property="og:title"]', 'meta[name="twitter:title"]') || ld?.headline || parsed?.title || doc.title);
  return {
    title: stripSiteSuffix(rawTitle, siteName),
    description: clean(meta('meta[property="og:description"]', 'meta[name="description"]') || ld?.description || ""),
    siteName,
    author: ld?.author || parsed?.byline || meta('meta[name="author"]'),
    publishedAt: ld?.datePublished || meta('meta[property="article:published_time"]', 'meta[name="date"]') || parsed?.publishedTime || "",
    lang: doc.documentElement.getAttribute("lang") || parsed?.lang || "",
    text: useLd ? ldBody : readable,
    via: useLd ? "jsonld" : "direct",
    iconUrl,
  };
}

/** "Headline | Site" → "Headline" */
function stripSiteSuffix(title: string, siteName: string) {
  if (!siteName) return title;
  const escaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = title.replace(new RegExp(`\\s*[|\\-–—:·]\\s*${escaped}\\s*$`, "i"), "").trim();
  return stripped.length > 10 ? stripped : title;
}

interface LdArticle {
  headline?: string;
  description?: string;
  articleBody?: string;
  datePublished?: string;
  author?: string;
  publisher?: string;
}

function readJsonLd(doc: Document): LdArticle | null {
  const nodes: Record<string, unknown>[] = [];
  const collect = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      nodes.push(o);
      if (o["@graph"]) collect(o["@graph"]);
    }
  };
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      collect(JSON.parse(s.textContent ?? ""));
    } catch {}
  });
  const isArticle = (o: Record<string, unknown>) => {
    const t = ([] as unknown[]).concat(o["@type"] ?? []).join(" ");
    return /(NewsArticle|Article|BlogPosting|Report)/.test(t);
  };
  const a = nodes.find((o) => isArticle(o) && o.articleBody) ?? nodes.find(isArticle);
  if (!a) return null;
  const name = (v: unknown): string => {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.map(name).filter(Boolean).join(", ");
    return String((v as Record<string, unknown>).name ?? "");
  };
  return {
    headline: name(a.headline),
    description: name(a.description),
    articleBody: name(a.articleBody),
    datePublished: name(a.datePublished),
    author: name(a.author),
    publisher: name(a.publisher),
  };
}

const NOISE =
  /^(leia (também|mais)|veja (também|mais)|saiba mais|publicidade|continua (após|depois) (a|da) publicidade|assine|clique aqui|siga (o|a|nosso)|receba (as )?notícias|compartilhe|ouça|related|advertisement|read more|sign up)/i;

function htmlToText(html: string) {
  const frag = JSDOM.fragment(`<div>${html}</div>`);
  frag.querySelectorAll("script,style,noscript,iframe,figure,figcaption,aside,form,button,svg").forEach((n) => n.remove());
  const doc = frag.ownerDocument;
  frag.querySelectorAll("br").forEach((n) => n.replaceWith(doc.createTextNode("\n")));
  frag
    .querySelectorAll("p,div,h1,h2,h3,h4,h5,h6,li,blockquote,section,article,header,tr,pre")
    .forEach((n) => n.after(doc.createTextNode("\n\n")));
  return clean(frag.textContent ?? "");
}

function clean(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !NOISE.test(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readerFallback(url: string): Promise<Extracted> {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`reader ${res.status}`);
  const md = await res.text();
  const title = /^Title:\s*(.+)$/m.exec(md)?.[1]?.trim() ?? "";
  const published = /^Published Time:\s*(.+)$/m.exec(md)?.[1]?.trim() ?? "";
  const body = md.split(/^Markdown Content:\s*$/m)[1] ?? md;
  const text = clean(
    body
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^[-*_]{3,}$/gm, "")
      .replace(/[*_`>]/g, ""),
  );
  return {
    title,
    description: "",
    siteName: "",
    author: "",
    publishedAt: published,
    lang: "",
    text,
    via: "reader",
  };
}

const SENSITIVE =
  /\b(mort[eoa]s?|morre[ur]?|faleci|assassin|homic[ií]dio|tragédia|trágic|vítimas?|acidente|desastre|chacina|massacre|estupro|abuso|suic[ií]d|atentado|guerra|bombardeio|enchente|terremoto|câncer|killed|dead|death|victims?|shooting|disaster)\w*/i;

async function analyze(a: Extracted, jevKey: string): Promise<ArticleAnalysis & { isArticle: number | null }> {
  const answers = await jev(jevKey, `HEADLINE: ${a.title}\n\n${a.text.slice(0, 5000)}`, {
    is_article: {
      type: "noul",
      instructions:
        "Is this the actual body text of a news article or report (not a paywall notice, cookie/consent wall, login page, error page or a list of headlines)?",
    },
    sensitive: {
      type: "noul",
      instructions:
        "Is this story about death, violence, crime victims, disasters, serious illness, abuse, war or another tragic subject that calls for a sober tone?",
    },
    category: {
      type: "choice",
      instructions: "Which newsroom section does this story belong to?",
      criteria: {
        politics: "Politics and government",
        economy: "Economy, business, markets, personal finance",
        tech: "Technology, internet, AI, gadgets",
        science: "Science, environment, climate, space",
        health: "Health and medicine",
        sports: "Sports",
        culture: "Entertainment, culture, celebrities, arts",
        world: "International affairs",
        security: "Crime, police, public safety",
        general: "Other / general news",
      },
    },
  });

  const s = noul(answers, "sensitive");
  return {
    isArticle: noul(answers, "is_article"),
    sensitive: s !== null ? s > 0.6 : SENSITIVE.test(`${a.title}\n${a.text.slice(0, 1200)}`),
    category: choice(answers, "category")?.choice ?? null,
  };
}
