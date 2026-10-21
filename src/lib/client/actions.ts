"use client";

import { Allow, parse as parsePartial } from "partial-json";
import { CTA_ACTIONS, STREAM_ERROR, STREAM_USAGE } from "../constants";
import { ICON_NAMES } from "../icons";
import { CTA_DEFAULTS } from "@/components/slides/i18n";
import { CONTENT_LAYOUTS, LAYOUTS, slideToText, supportsImage } from "../layouts";
import { contentOf, coverOf, ctaOf, finalizeSlides, formatCaption, imageQueriesOf, imageQueryOf, noDashes, PEOPLE_LAYOUTS, rawTone, uid } from "../normalize";
import type { Article, Carousel, ImageRef, Slide, SlideContent, SlideMeta, Tone } from "../types";
import { useCarousel } from "@/store/carousel";
import { useSettings } from "@/store/settings";
import { toast, useUI } from "@/store/ui";
import { apiHeaders, ClientError, isAbort, post, toError } from "./api";
import { rememberedOverrides } from "./edits";
import { recordUsage, takePendingUsage } from "./usage";

let controller: AbortController | null = null;
const imageRequests = new Set<string>();

const store = () => useCarousel.getState();

function handleError(err: unknown, url?: string) {
  if (isAbort(err)) return;
  const e = err as ClientError;
  if (e.code === "missing_openai_key" || e.code === "openai_key") {
    if (url) useUI.getState().setPendingUrl(url, useSettings.getState().keys.openai);
    useUI.getState().openSettings("openai");
  }
  toast(e.message || "Algo deu errado.", { tone: "error" });
}

/* ───────────────────────── Generation ───────────────────────── */

export async function generate(url: string) {
  const settings = useSettings.getState();
  if (!settings.keys.openai.trim()) {
    useUI.getState().setPendingUrl(url);
    useUI.getState().openSettings("openai");
    toast("Adicione sua chave da OpenAI para começar.");
    return;
  }
  useUI.getState().setPendingUrl(null);

  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  imageRequests.clear();
  store().begin(url);

  let article: Article;
  try {
    article = await post<Article>("/api/scrape", { url }, signal);
  } catch (err) {
    if (!isAbort(err)) store().goHome();
    return handleError(err, url);
  }
  if (signal.aborted) return;

  const carousel: Carousel = {
    id: uid(),
    createdAt: Date.now(),
    article,
    topic: "",
    story: [],
    caption: "",
    slides: [],
    // Reading the article (JEV) already cost something
    usage: takePendingUsage(),
  };
  store().setCarousel(carousel);
  store().setStatus("writing");

  let text = "";
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ article, language: settings.language }),
      signal,
    });
    if (!res.ok) throw await toError(res);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let lastPaint = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      const errAt = text.indexOf(STREAM_ERROR);
      if (errAt >= 0) throw new ClientError(text.slice(errAt + STREAM_ERROR.length));
      if (text.includes(STREAM_USAGE)) break;
      const now = performance.now();
      if (now - lastPaint > 60) {
        lastPaint = now;
        applyDraft(text, false);
      }
    }
    // The tokens used come after the JSON, once the stream is over
    const usageAt = text.indexOf(STREAM_USAGE);
    if (usageAt >= 0) {
      let rest = text.slice(usageAt + STREAM_USAGE.length);
      text = text.slice(0, usageAt);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        rest += decoder.decode(value, { stream: true });
      }
      try {
        recordUsage(JSON.parse(rest));
      } catch {}
    }
    applyDraft(text, true);
  } catch (err) {
    if (isAbort(err)) return;
    // Keep whatever was written if it is already useful
    if ((store().carousel?.slides.length ?? 0) >= 3) {
      applyDraft(text, true);
    } else {
      store().goHome();
    }
    handleError(err, url);
  }
}

export function cancelGeneration() {
  controller?.abort();
  controller = null;
  store().goHome();
}

function parseDraft(text: string, done: boolean): Record<string, unknown> | null {
  if (!text.trim()) return null;
  try {
    return done ? JSON.parse(text) : parsePartial(text, Allow.ALL);
  } catch {
    try {
      return parsePartial(text, Allow.ALL);
    } catch {
      return null;
    }
  }
}

function meta(id: string, tone: Tone, imageQuery: SlideMeta["imageQuery"], imageQuery2: SlideMeta["imageQuery"] = null): SlideMeta {
  return {
    id,
    tone,
    image: null,
    imageQuery,
    imageStatus: imageQuery ? "idle" : undefined,
    ...(imageQuery2 ? { image2: null, imageQuery2, imageStatus2: "idle" as const } : {}),
  };
}

/** Slot 2 is the second photo of two-subject layouts (versus) */
export type ImageSlot = 1 | 2;
const slotKey = (id: string, slot: ImageSlot) => (slot === 2 ? `${id}#2` : id);

function readSlot(s: Slide, slot: ImageSlot) {
  return slot === 2
    ? { image: s.image2 ?? null, query: s.imageQuery2 ?? null, candidates: s.imageCandidates2, status: s.imageStatus2 }
    : { image: s.image, query: s.imageQuery, candidates: s.imageCandidates, status: s.imageStatus };
}

function writeSlot(
  s: Slide,
  slot: ImageSlot,
  patch: { image?: ImageRef | null; candidates?: ImageRef[]; status?: SlideMeta["imageStatus"] },
) {
  if (slot === 2) {
    if ("image" in patch) s.image2 = patch.image;
    if (patch.candidates) s.imageCandidates2 = patch.candidates;
    if (patch.status) s.imageStatus2 = patch.status;
  } else {
    if ("image" in patch) s.image = patch.image ?? null;
    if (patch.candidates) s.imageCandidates = patch.candidates;
    if (patch.status) s.imageStatus = patch.status;
  }
}

/** Rebuilds the slide list from the (partial) JSON, keeping state already attached to each slide. */
function applyDraft(text: string, done: boolean) {
  const raw = parseDraft(text, done);
  const current = store().carousel;
  if (!raw || !current) return;

  const prevById = new Map(current.slides.map((s) => [s.id, s]));
  const slides: Slide[] = [];
  const merge = (fresh: Slide) => {
    const prev = prevById.get(fresh.id);
    // A new slide starts with the adjustments the user made to this format before
    if (!prev) return void slides.push({ ...fresh, overrides: rememberedOverrides(fresh.layout) });
    const merged: Slide = {
      ...fresh,
      image: prev.image,
      imageCandidates: prev.imageCandidates,
      imageStatus: prev.imageStatus ?? fresh.imageStatus,
      image2: prev.image2 ?? fresh.image2,
      imageCandidates2: prev.imageCandidates2,
      imageStatus2: prev.imageStatus2 ?? fresh.imageStatus2,
      cutout: prev.cutout,
      cutoutStatus: prev.cutoutStatus,
      link: prev.link,
      overrides: prev.overrides,
      noPhoto: prev.noPhoto,
    };
    slides.push(prev.noPhoto ? withoutPhoto(merged) : merged);
  };

  const cover = raw.cover as Record<string, unknown> | undefined;
  if (cover && typeof cover.title === "string" && cover.title) {
    const complete = done || "slides" in raw;
    merge({
      ...meta("cover", "dark", imageQueryOf(cover.image) ?? { query: "news", entity: null }),
      ...coverOf(cover),
      writing: !complete,
    } as Slide);
  }

  const rawSlides = Array.isArray(raw.slides) ? (raw.slides as Record<string, unknown>[]) : [];
  const allComplete = done || "cta" in raw;
  rawSlides.forEach((r, i) => {
    const content = contentOf(r);
    if (!content) return;
    const complete = allComplete || i < rawSlides.length - 1;
    const [iq, iq2] = supportsImage(content.layout) ? imageQueriesOf(r, content) : [null, null];
    merge({ ...meta(`s${i}`, rawTone(r), iq, iq2), cutoutQuery: cutoutOf(r), fillIcon: fillIconOf(r, content.layout), ...content, writing: !complete } as Slide);
  });

  let next: Carousel = {
    ...current,
    slides,
    topic: String(raw.topic ?? ""),
    story: Array.isArray(raw.story) ? raw.story.filter((b): b is string => typeof b === "string") : [],
    caption: done ? formatCaption(noDashes(String(raw.caption ?? ""))) : String(raw.caption ?? ""),
  };

  if (done) {
    const cta = raw.cta as Record<string, unknown> | undefined;
    slides.push({
      ...meta("cta", "brand", null),
      ...ctaOf(cta ?? { takeaway: "", title: "Gostou? **Siga** para mais", subtitle: "Notícias explicadas em poucos slides." }),
      overrides: rememberedOverrides("cta"),
    } as Slide);
    next = { ...next, slides: finalizeSlides(slides, { sensitive: current.article.analysis.sensitive }) };
  }

  const s = store();
  s.setCarousel(next);
  if (s.follow && slides.length) s.setActive(slides.length - 1, false);

  // Fetch images as soon as each slide is complete
  next.slides.forEach((sl) => {
    if (sl.writing) return;
    if (sl.imageQuery && !sl.image && !imageRequests.has(sl.id)) loadImage(sl.id);
    if (sl.imageQuery2 && !sl.image2 && !imageRequests.has(slotKey(sl.id, 2))) loadImage(sl.id, 2);
    if (wantsCutout(sl) && !imageRequests.has(cutoutKey(sl.id))) loadCutout(sl.id);
  });

  if (done) {
    s.setStatus("ready");
    if (s.follow) setTimeout(() => store().setActive(0, false), 450);
  }
}

/* ───────────────────────── Images ───────────────────────── */

// Image searches hit rate-limited public APIs: two at a time, in the order slides were written
let imageActive = 0;
const imageQueue: (() => void)[] = [];
async function imageSlot<T>(run: () => Promise<T>): Promise<T> {
  while (imageActive >= 2) await new Promise<void>((r) => imageQueue.push(r));
  imageActive++;
  try {
    return await run();
  } finally {
    imageActive--;
    imageQueue.shift()?.();
  }
}

/** A photo slide without a relevant photo becomes a statement with the same sentence. */
function withoutPhoto(s: Slide): Slide {
  if (s.layout !== "image") return s;
  const { caption, ...rest } = s;
  return { ...rest, layout: "statement", emoji: "", text: caption } as Slide;
}

export async function loadImage(slideId: string, slot: ImageSlot = 1) {
  const c = store().carousel;
  const slide = c?.slides.find((s) => s.id === slideId);
  const query = slide && readSlot(slide, slot).query;
  if (!c || !slide || !query) return;
  imageRequests.add(slotKey(slideId, slot));
  store().editSlide(slideId, (s) => writeSlot(s, slot, { status: "loading" }), false);
  try {
    const { candidates, match } = await imageSlot(() =>
      post<{ candidates: ImageRef[]; match: boolean }>("/api/images", {
        ...query,
        category: c.article.analysis.category ?? c.topic,
        headline: c.article.title,
        slideText: slideToText(slide),
        entityOnly: PEOPLE_LAYOUTS.has(slide.layout),
      }),
    );
    // Avoid repeating a photo already used elsewhere in the carousel
    const used = new Set(
      store().carousel?.slides.flatMap((s) => [s.id === slideId && slot === 1 ? null : s.image?.id, s.id === slideId && slot === 2 ? null : s.image2?.id]),
    );
    const pick = candidates.find((x) => !used.has(x.id)) ?? candidates[0] ?? null;
    // The cover always needs a background; other slides only get a photo that really fits
    const usable = match || slide.layout === "cover" ? pick : null;

    store().edit((d) => {
      const i = d.slides.findIndex((s) => s.id === slideId);
      if (i < 0) return;
      const s = d.slides[i];
      writeSlot(s, slot, { candidates, status: "done" });
      if (!readSlot(s, slot).image) writeSlot(s, slot, { image: usable });
      if (slot === 1 && !s.image) {
        s.noPhoto = true;
        d.slides[i] = withoutPhoto(s);
      }
    }, false);
  } catch {
    store().editSlide(slideId, (s) => writeSlot(s, slot, { status: "error" }), false);
  }
}

/* Cut-out objects (Pixabay, transparent PNG): only with a Pixabay key, only on slides without a photo */

const cutoutKey = (id: string) => `${id}:cutout`;

function cutoutOf(raw: Record<string, unknown>) {
  const q = typeof raw.cutout === "string" ? raw.cutout.trim() : "";
  return q && q.length <= 40 ? q : null;
}

/** The slide's symbol icon (layouts that draw their own icons keep it in their content instead) */
function fillIconOf(raw: Record<string, unknown>, layout: string) {
  if (layout === "explainer" || layout === "qa") return null;
  // A plain string in the schema (see schema.ts): only names from the list count
  const name = typeof raw.icon === "string" ? raw.icon.trim().toLowerCase() : "";
  return (ICON_NAMES as readonly string[]).includes(name) ? name : null;
}

const wantsCutout = (s: Slide) =>
  !!s.cutoutQuery && !s.cutout && s.cutoutStatus !== "done" && !s.image && !s.imageQuery && !!useSettings.getState().keys.pixabay?.trim();

export async function loadCutout(slideId: string) {
  const slide = store().carousel?.slides.find((s) => s.id === slideId);
  if (!slide?.cutoutQuery) return;
  imageRequests.add(cutoutKey(slideId));
  store().editSlide(slideId, (s) => void (s.cutoutStatus = "loading"), false);
  try {
    const { cutout } = await imageSlot(() => post<{ cutout: ImageRef | null }>("/api/images", { query: slide.cutoutQuery, cutout: true }));
    store().editSlide(slideId, (s) => {
      s.cutout = cutout;
      s.cutoutStatus = "done";
    }, false);
  } catch {
    store().editSlide(slideId, (s) => void (s.cutoutStatus = "done"), false);
  }
}

/** Takes the object (or the symbol icon) off the slide */
export function removeCutout(slideId: string) {
  store().editSlide(slideId, (s) => {
    s.cutout = null;
    s.cutoutQuery = null;
    s.fillIcon = null;
  });
}

/** Manual search (image picker); `cutouts` looks only for objects with no background (Pixabay) */
export async function searchImages(query: string, cutouts = false): Promise<ImageRef[]> {
  const { candidates } = await post<{ candidates: ImageRef[] }>("/api/images", cutouts ? { query, cutouts: true } : { query, manual: true });
  return candidates;
}

export function setSlideImage(slideId: string, image: ImageRef | null, slot: ImageSlot = 1) {
  store().editSlide(slideId, (s) => writeSlot(s, slot, { image, status: "done" }));
}

/** After reopening a saved carousel, finish image loads that were interrupted. */
export function resumeSaved() {
  store().resume();
  const c = store().carousel;
  c?.slides.forEach((s) => {
    for (const slot of [1, 2] as const) {
      const { image, query, status } = readSlot(s, slot);
      if (status === "loading") store().editSlide(s.id, (d) => writeSlot(d, slot, { status: "idle" }), false);
      if (query && !image) loadImage(s.id, slot);
    }
    if (s.cutoutStatus === "loading") store().editSlide(s.id, (d) => void (d.cutoutStatus = undefined), false);
    if (wantsCutout({ ...s, cutoutStatus: undefined })) loadCutout(s.id);
  });
}

/* ───────────────────────── Slide actions ───────────────────────── */

export async function reformatSlide(slideId: string) {
  const c = store().carousel;
  if (!c) return;
  const idx = c.slides.findIndex((s) => s.id === slideId);
  const slide = c.slides[idx];
  if (!slide || slide.layout === "cover" || slide.layout === "cta" || slide.busy) return;

  let tried = [...new Set([...(slide.tried ?? []), slide.layout])];
  if (CONTENT_LAYOUTS.every((l) => tried.includes(l))) tried = [slide.layout];

  store().editSlide(slideId, (s) => void (s.busy = true), false);
  try {
    const { slide: raw } = await post<{ slide: Record<string, unknown> }>("/api/reformat", {
      article: c.article,
      language: useSettings.getState().language,
      outline: c.slides.map(slideToText),
      index: idx,
      tried,
    });
    const content = contentOf(raw) as SlideContent | null;
    if (!content) throw new ClientError("A IA não conseguiu outro formato. Tente de novo.");
    const [iq, iq2] = supportsImage(content.layout) ? imageQueriesOf(raw, content) : [null, null];
    // Required-photo layouts reuse the current photo; optional ones only when the model asked for a photo.
    // A person or party needs their own photo, so those always search again.
    const wantsImage = LAYOUTS[content.layout].image === "required" || !!iq;
    const keep = wantsImage && !PEOPLE_LAYOUTS.has(content.layout) ? slide.image : null;

    // Undo should go back to the slide as it was before the click
    store().editSlide(slideId, (s) => void (s.busy = false), false);
    store().edit((draft) => {
      const i = draft.slides.findIndex((s) => s.id === slideId);
      if (i < 0) return;
      const old = draft.slides[i];
      const [fixed] = finalizeSlides(
        [
          {
            id: old.id,
            tone: old.tone,
            image: keep,
            imageQuery: iq ?? (keep ? old.imageQuery : null),
            imageCandidates: keep ? old.imageCandidates : undefined,
            imageStatus: keep ? "done" : iq ? "idle" : undefined,
            ...(iq2 ? { image2: null, imageQuery2: iq2, imageStatus2: "idle" } : {}),
            // The object stays while the slide has no photo
            ...(keep || iq ? {} : { cutout: old.cutout, cutoutQuery: old.cutoutQuery, cutoutStatus: old.cutoutStatus }),
            link: old.link,
            extras: old.extras,
            overrides: rememberedOverrides(content.layout),
            fillIcon: fillIconOf(raw, content.layout),
            tried: [...tried, content.layout],
            ...content,
          } as Slide,
        ],
        { sensitive: c.article.analysis.sensitive },
      );
      draft.slides[i] = fixed;
    });
    const updated = store().carousel?.slides.find((s) => s.id === slideId);
    for (const slot of [1, 2] as const) {
      if (updated && readSlot(updated, slot).query && !readSlot(updated, slot).image) {
        imageRequests.delete(slotKey(slideId, slot));
        loadImage(slideId, slot);
      }
    }
  } catch (err) {
    store().editSlide(slideId, (s) => void (s.busy = false), false);
    handleError(err);
  }
}

/** Next call to action (save → like → comment → share → follow), with the texts the model wrote for it */
export function cycleCta(slideId: string) {
  const language = useSettings.getState().language;
  store().editSlide(slideId, (s) => {
    if (s.layout !== "cta") return;
    const next = CTA_ACTIONS[(CTA_ACTIONS.indexOf(s.action) + 1) % CTA_ACTIONS.length];
    // Keep edits made to the current texts
    s.options = { ...(s.options ?? {}), [s.action]: { title: s.title, subtitle: s.subtitle } };
    const text = s.options[next] ?? CTA_DEFAULTS[language][next];
    s.action = next;
    s.title = text.title;
    s.subtitle = text.subtitle;
  });
}

const TONES: Tone[] = ["light", "dark", "brand"];

export function cycleTone(slideId: string) {
  store().editSlide(slideId, (s) => {
    s.tone = TONES[(TONES.indexOf(s.tone) + 1) % TONES.length];
  });
}

export function deleteSlide(slideId: string) {
  const c = store().carousel;
  if (!c || c.slides.length <= 2) return;
  const idx = c.slides.findIndex((s) => s.id === slideId);
  store().edit((d) => {
    d.slides = d.slides.filter((s) => s.id !== slideId);
  });
  store().setActive(Math.min(idx, c.slides.length - 2), false);
  toast("Slide excluído", { action: { label: "Desfazer", run: () => store().undo() } });
}

export function duplicateSlide(slideId: string) {
  const c = store().carousel;
  const idx = c?.slides.findIndex((s) => s.id === slideId) ?? -1;
  if (!c || idx < 0) return;
  store().edit((d) => {
    const copy = { ...JSON.parse(JSON.stringify(d.slides[idx])), id: `${slideId}_${uid()}` } as Slide;
    d.slides.splice(idx + 1, 0, copy);
  });
  store().setActive(idx + 1, false);
}

export function moveSlide(slideId: string, dir: -1 | 1) {
  const c = store().carousel;
  const idx = c?.slides.findIndex((s) => s.id === slideId) ?? -1;
  const to = idx + dir;
  if (!c || idx < 0 || to < 0 || to >= c.slides.length) return;
  store().edit((d) => {
    const [s] = d.slides.splice(idx, 1);
    d.slides.splice(to, 0, s);
  });
  store().setActive(to, false);
}
