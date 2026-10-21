"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Search, Trash2, Upload } from "lucide-react";
import { searchImages, setSlideImage } from "@/lib/client/actions";
import { addExtraImage } from "@/lib/client/edits";
import { fileToDataUrl } from "@/lib/client/files";
import { LAYOUTS } from "@/lib/layouts";
import type { ImageRef } from "@/lib/types";
import { useCarousel } from "@/store/carousel";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";
import { Modal } from "./Modal";
import { styleShowsPhoto } from "./slides/styles";
import { cx, Spinner } from "./ui";

const SOURCE_LABEL: Record<ImageRef["source"], string> = {
  unsplash: "Unsplash",
  pixabay: "Pixabay",
  wikipedia: "Wikipédia",
  wikimedia: "Wikimedia",
  upload: "Upload",
};

export function ImagePicker() {
  const slideId = useUI((s) => s.imagePickerFor);
  const mode = useUI((s) => s.imagePickerMode);
  const close = () => useUI.getState().openImagePicker(null);
  return (
    <Modal open={!!slideId} onClose={close} title={mode === "extra" ? "Inserir imagem no slide" : "Imagem do slide"}>
      {slideId && <PickerBody key={`${slideId}:${mode}`} slideId={slideId} extra={mode === "extra"} onDone={close} />}
    </Modal>
  );
}

/** extra: the picture goes on top of the slide as a free element instead of replacing its photo */
function PickerBody({ slideId, extra, onDone }: { slideId: string; extra: boolean; onDone: () => void }) {
  const slide = useCarousel((s) => s.carousel?.slides.find((x) => x.id === slideId));
  const style = useSettings((s) => s.style);
  const hasPixabay = useSettings((s) => !!s.keys.pixabay?.trim());
  // Versus slides have one photo per side
  const [slot, setSlot] = useState<1 | 2>(1);
  // Objects with no background (Pixabay PNGs), for added pictures
  const [cutouts, setCutouts] = useState(false);
  const slotQuery = slot === 2 ? slide?.imageQuery2 : slide?.imageQuery;
  const slotCandidates = slot === 2 ? slide?.imageCandidates2 : slide?.imageCandidates;
  const firstQuery = extra ? slide?.cutoutQuery || slotQuery?.query || "" : slotQuery?.entity || slotQuery?.query || "";
  const [query, setQuery] = useState(firstQuery);
  const [results, setResults] = useState<ImageRef[] | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const candidates = results ?? (extra ? [] : (slotCandidates ?? []));
  const current = extra ? null : slot === 2 ? slide?.image2 : slide?.image;
  const optional = slide ? LAYOUTS[slide.layout].image === "optional" || styleShowsPhoto(style, slide.layout) : false;

  useEffect(() => {
    // Switching side (or opening): start from that photo's own search
    if (extra) {
      if (firstQuery) runSearch(firstQuery);
      return;
    }
    const q = slotQuery?.entity || slotQuery?.query || "";
    setQuery(q);
    setResults(null);
    if (slide && !slotCandidates?.length && q) runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  const runSearch = async (q: string, onlyCutouts = cutouts) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      setResults(await searchImages(q.trim(), onlyCutouts));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const choose = (img: ImageRef | null) => {
    if (extra) {
      if (img) addExtraImage(slideId, img);
      onDone();
      return;
    }
    setSlideImage(slideId, img, slot);
    useCarousel.getState().editSlide(
      slideId,
      (s) => {
        if (slot === 2) {
          if (results?.length) s.imageCandidates2 = results;
          return;
        }
        if (results?.length) s.imageCandidates = results;
        if (img && !s.imageQuery) s.imageQuery = { query, entity: null };
        if (!img) s.imageQuery = null;
      },
      false,
    );
    onDone();
  };

  return (
    <div className="flex flex-col min-h-0">
      {!extra && slide?.layout === "versus" && (
        <div className="mx-6 mb-3 grid grid-cols-2 gap-1 rounded-xl bg-ink/[0.04] p-1">
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              onClick={() => setSlot(n)}
              className={cx("h-9 truncate rounded-lg px-2 text-[13.5px] font-medium transition", slot === n ? "bg-white shadow-sm" : "text-muted hover:text-ink")}
            >
              {(n === 1 ? slide.left.name : slide.right.name).replace(/\*\*/g, "") || (n === 1 ? "Esquerda" : "Direita")}
            </button>
          ))}
        </div>
      )}
      {extra && hasPixabay && (
        <div className="mx-6 mb-3 grid grid-cols-2 gap-1 rounded-xl bg-ink/[0.04] p-1">
          {[false, true].map((only) => (
            <button
              key={String(only)}
              onClick={() => {
                setCutouts(only);
                runSearch(query, only);
              }}
              className={cx("h-9 truncate rounded-lg px-2 text-[13.5px] font-medium transition", cutouts === only ? "bg-white shadow-sm" : "text-muted hover:text-ink")}
            >
              {only ? "Sem fundo (PNG)" : "Fotos"}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="px-6"
      >
        <div className="flex items-center gap-2 rounded-2xl bg-ink/[0.04] px-4 focus-within:ring-2 focus-within:ring-ink/70 transition">
          <Search size={17} className="text-muted shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={cutouts ? "Buscar objetos sem fundo (em inglês funciona melhor)" : "Buscar fotos"}
            className="flex-1 h-12 bg-transparent outline-none text-[15px]"
          />
          {loading && <Spinner className="text-muted" />}
        </div>
      </form>

      <div className="mt-4 px-6 pb-4 overflow-y-auto no-scrollbar">
        {candidates.length ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {candidates.map((c, i) => {
              const on = current?.id === c.id;
              return (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1, transition: { delay: Math.min(i, 12) * 0.025 } }}
                  onClick={() => choose({ ...c, pos: undefined })}
                  title={c.credit ?? c.alt}
                  className={cx(
                    "group relative aspect-[4/5] overflow-hidden rounded-xl ring-offset-2 transition",
                    cutouts ? "bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:16px_16px]" : "bg-ink/[0.05]",
                    on ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-ink/30",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.thumb}
                    alt={c.alt}
                    loading="lazy"
                    className={cx("h-full w-full transition duration-300 group-hover:scale-[1.04]", cutouts ? "object-contain p-2" : "object-cover")}
                  />
                  <span className="absolute left-1.5 bottom-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {SOURCE_LABEL[c.source]}
                  </span>
                  {on && (
                    <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-white">
                      <Check size={14} />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="grid h-40 place-items-center text-[14px] text-muted">
            {loading ? "Buscando imagens…" : results ? "Nenhuma imagem encontrada. Tente outras palavras." : "Busque uma imagem ou envie do computador."}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-6 py-4">
        <button
          onClick={() => fileInput.current?.click()}
          className="h-10 px-4 rounded-full bg-ink/[0.05] hover:bg-ink/[0.09] text-[14px] font-medium flex items-center gap-2 transition"
        >
          <Upload size={16} />
          Enviar do computador
        </button>
        {!extra && optional && current && (
          <button onClick={() => choose(null)} className="h-10 px-4 rounded-full text-[14px] font-medium text-[#d92d20] hover:bg-[#d92d20]/[0.07] flex items-center gap-2 transition">
            <Trash2 size={16} />
            Remover
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            // PNGs keep their transparency
            const url = await fileToDataUrl(file, { max: 1600, type: /png|webp|gif/.test(file.type) ? "image/png" : "image/jpeg" });
            choose({ id: `up_${Date.now()}`, source: "upload", url, thumb: url, alt: file.name, credit: null });
          }}
        />
      </div>
    </div>
  );
}
