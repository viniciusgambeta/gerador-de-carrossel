"use client";

import { SLIDE_H, SLIDE_W } from "../constants";
import { useCarousel } from "@/store/carousel";
import { toast, useUI } from "@/store/ui";
import { apiHeaders } from "./api";
import { downloadBlob, slugify } from "./files";

const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

async function waitForStage(timeout = 3000): Promise<HTMLElement> {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    const el = document.getElementById("export-stage");
    if (el) return el;
    await frame();
  }
  throw new Error("export stage not mounted");
}

async function imagesReady(root: HTMLElement) {
  const imgs = [...root.querySelectorAll("img")];
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? img.decode().catch(() => {})
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
            setTimeout(resolve, 8000);
          }),
    ),
  );
}

/**
 * html-to-image freezes every element's measured height and renders text slightly smaller
 * (to avoid overflow), so a line that wrapped on screen may not wrap in the image and leave
 * an empty line. Text blocks get their height back as "auto" so the layout re-centers them.
 */
const CONTENT_SIZED = ["editable", "block", "list-row", "timeline-item", "compare-card", "diagram-node"];

function withFlexibleTextHeights<T>(run: () => Promise<T>): Promise<T> {
  const original = window.getComputedStyle;
  window.getComputedStyle = function (el: Element, pseudo?: string | null) {
    const style = original.call(window, el, pseudo);
    // Boxes the user gave a height keep it
    const isText = !pseudo && CONTENT_SIZED.some((c) => el.classList?.contains(c)) && !el.classList?.contains("block-sized");
    return new Proxy(style, {
      get(target, prop) {
        if (prop === "getPropertyValue") {
          return (name: string) => {
            if (isText && (name === "height" || name === "block-size")) return "auto";
            return target.getPropertyValue(name);
          };
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  } as typeof window.getComputedStyle;
  return run().finally(() => {
    window.getComputedStyle = original;
  });
}

type Format = "png" | "jpeg";

/** Renders the slides (in carousel order) at 1080×1350, through the off-screen export stage */
export async function renderSlides(ids: string[], format: Format = "png"): Promise<{ name: string; blob: Blob }[]> {
  const ui = useUI.getState();
  if (ui.exporting) throw new Error("busy");
  useCarousel.getState().select(null);
  ui.setExporting({ ids, done: 0 });
  try {
    const stage = await waitForStage();
    await frame();
    await frame();
    await document.fonts.ready;
    await imagesReady(stage);

    const { toBlob, getFontEmbedCSS } = await import("html-to-image");
    const nodes = [...stage.querySelectorAll<HTMLElement>("[data-export]")];
    const fontEmbedCSS = await getFontEmbedCSS(nodes[0]);
    const files: { name: string; blob: Blob }[] = [];
    for (const [i, node] of nodes.entries()) {
      const target = node.firstElementChild as HTMLElement;
      const blob = await withFlexibleTextHeights(() =>
        // includeQueryParams: every photo goes through /api/img?u=…, so the query is what tells them apart
        toBlob(target, {
          width: SLIDE_W,
          height: SLIDE_H,
          pixelRatio: 1,
          fontEmbedCSS,
          cacheBust: false,
          includeQueryParams: true,
          ...(format === "jpeg" ? { type: "image/jpeg", quality: 0.93 } : {}),
        }),
      );
      if (!blob) throw new Error("empty image");
      files.push({ name: `${String(node.dataset.export).padStart(2, "0")}.${format === "jpeg" ? "jpg" : "png"}`, blob });
      useUI.getState().setExporting({ ids, done: i + 1 });
    }
    return files;
  } finally {
    useUI.getState().setExporting(null);
  }
}

/** Unsplash guidelines: report the photos that were actually used */
export function trackUsedPhotos(ids: string[]) {
  const carousel = useCarousel.getState().carousel;
  const track = (carousel?.slides ?? [])
    .filter((s) => ids.includes(s.id))
    .flatMap((s) => [s.image?.track, s.image2?.track, ...(s.extras ?? []).map((x) => x.image.track)])
    .filter((u): u is string => !!u);
  if (track.length) fetch("/api/track", { method: "POST", headers: apiHeaders(), body: JSON.stringify({ urls: track }) }).catch(() => {});
}

/** Downloads slides as 1080×1350 PNGs. One slide → .png, several → .zip */
export async function exportCarousel(ids?: string[]) {
  const carousel = useCarousel.getState().carousel;
  if (!carousel || useUI.getState().exporting) return;
  const list = ids ?? carousel.slides.map((s) => s.id);
  try {
    const files = await renderSlides(list);
    const base = slugify(carousel.article.title) || "carrossel";
    if (files.length === 1) {
      downloadBlob(files[0].blob, `${base}-${files[0].name}`);
    } else {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      files.forEach((f) => zip.file(f.name, f.blob));
      downloadBlob(await zip.generateAsync({ type: "blob" }), `${base}.zip`);
    }
    toast(files.length === 1 ? "Slide baixado" : `${files.length} slides baixados`, { tone: "success" });
    trackUsedPhotos(list);
  } catch (err) {
    console.error(err);
    toast("Não consegui gerar as imagens. Tente de novo.", { tone: "error" });
  }
}