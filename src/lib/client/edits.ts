"use client";

/** Hand edits on a slide: block position/size/font, removed blocks and added pictures */

import { useCarousel } from "@/store/carousel";
import { useSettings } from "@/store/settings";
import { toast, useUI } from "@/store/ui";
import type { BlockOverride, ExtraImage, ImageRef, LayoutId } from "../types";

const store = () => useCarousel.getState();
const DEFAULT: BlockOverride = { x: 0, y: 0, scale: 1 };

const isDefault = (o: BlockOverride) => !o.x && !o.y && o.scale === 1 && o.w == null && o.h == null;

/** Without undefined keys, so it persists and compares cleanly */
function clean(o: BlockOverride): BlockOverride {
  const out: BlockOverride = { x: o.x, y: o.y, scale: o.scale };
  if (o.w != null) out.w = Math.round(o.w);
  if (o.h != null) out.h = Math.round(o.h);
  return out;
}

/**
 * Moves, resizes or rescales a block (null puts it back as designed). The adjustment is also
 * remembered for the same format in the same style, so the next carousels start with it.
 */
export function setBlockOverride(slideId: string, blockId: string, patch: Partial<BlockOverride> | null) {
  const slide = store().carousel?.slides.find((s) => s.id === slideId);
  if (!slide) return;
  const next = patch ? clean({ ...DEFAULT, ...slide.overrides?.[blockId], ...patch }) : null;
  const keep = next && !isDefault(next) ? next : null;
  store().editSlide(slideId, (s) => {
    const all = { ...(s.overrides ?? {}) };
    if (keep) all[blockId] = keep;
    else delete all[blockId];
    s.overrides = all;
  });
  const settings = useSettings.getState();
  if (!settings.rememberLayout) return;
  const firstTime = !Object.keys(settings.layoutMemory).length;
  settings.rememberBlock(slide.layout, blockId, keep);
  if (firstTime && keep && !useUI.getState().memoryHintSeen) {
    useUI.getState().markMemoryHintSeen();
    toast("Ajuste guardado: os próximos carrosséis neste estilo já começam assim", {
      action: { label: "Configurar", run: () => useUI.getState().openSettings() },
    });
  }
}

/** The adjustments remembered for a format in the current style (copied, ready to go on a new slide) */
export function rememberedOverrides(layout: LayoutId): Record<string, BlockOverride> | undefined {
  const { rememberLayout, layoutMemory, style } = useSettings.getState();
  const saved = rememberLayout ? layoutMemory[`${style}:${layout}`] : undefined;
  return saved && Object.keys(saved).length ? structuredClone(saved) : undefined;
}

export function hideBlock(slideId: string, blockId: string) {
  store().editSlide(slideId, (s) => {
    s.hidden = [...new Set([...(s.hidden ?? []), blockId])];
  });
  store().select(null);
  toast("Bloco removido", { action: { label: "Desfazer", run: () => store().undo() } });
}

export function restoreBlocks(slideId: string) {
  store().editSlide(slideId, (s) => {
    s.hidden = [];
  });
}

/** Width/height of a picture, loading it when the source did not say */
async function ratioOf(image: ImageRef): Promise<number> {
  if (image.width && image.height) return image.width / image.height;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
    img.onerror = () => resolve(1);
    img.src = image.url;
  });
}

/** Places a picture in the middle of the slide, selected so it can be moved and resized right away */
export async function addExtraImage(slideId: string, image: ImageRef) {
  const ratio = await ratioOf(image);
  const w = ratio >= 1 ? 560 : Math.round(460 * ratio + 120);
  const id = `x${Date.now().toString(36)}`;
  const extra: ExtraImage = { id, image, x: Math.round((1080 - w) / 2), y: Math.round((1350 - w / ratio) / 2), w, ratio };
  store().editSlide(slideId, (s) => {
    s.extras = [...(s.extras ?? []), extra];
  });
  store().select(`extra:${id}`);
}

export function updateExtra(slideId: string, id: string, patch: Partial<Omit<ExtraImage, "id">>) {
  store().editSlide(slideId, (s) => {
    const e = s.extras?.find((x) => x.id === id);
    if (e) Object.assign(e, patch);
  });
}

export function removeExtra(slideId: string, id: string) {
  store().editSlide(slideId, (s) => {
    s.extras = (s.extras ?? []).filter((x) => x.id !== id);
  });
  store().select(null);
  toast("Imagem removida", { action: { label: "Desfazer", run: () => store().undo() } });
}
