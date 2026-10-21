"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AArrowDown,
  AArrowUp,
  ArrowLeftToLine,
  ArrowRightToLine,
  Check,
  Copy,
  Download,
  ImageIcon,
  ImagePlus,
  MoreHorizontal,
  RotateCcw,
  Shuffle,
  Trash2,
  Undo2,
  WrapText,
  X,
} from "lucide-react";
import { cycleCta, cycleTone, deleteSlide, duplicateSlide, moveSlide, reformatSlide } from "@/lib/client/actions";
import { hideBlock, removeExtra, restoreBlocks, setBlockOverride, updateExtra } from "@/lib/client/edits";
import { styleShowsPhoto } from "./slides/styles";
import { exportCarousel } from "@/lib/client/export";
import { slideTheme } from "@/lib/color";
import { LAYOUTS, supportsImage } from "@/lib/layouts";
import { activeSlide, useCarousel } from "@/store/carousel";
import { useSettings } from "@/store/settings";
import { useUI } from "@/store/ui";
import { cx, IconButton } from "./ui";

export function SlideToolbar() {
  const slide = useCarousel(activeSlide);
  const selected = useCarousel((s) => s.selected);
  if (!slide) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex flex-col items-center gap-3">
      <Dots />
      <AnimatePresence mode="wait" initial={false}>
        {selected?.startsWith("extra:") ? (
          <ExtraTools key="extra" slideId={slide.id} extraId={selected.slice(6)} />
        ) : selected ? (
          <BlockTools key="block" slideId={slide.id} block={selected} />
        ) : (
          <SlideTools key={slide.id} />
        )}
      </AnimatePresence>
      <EditHint />
    </motion.div>
  );
}

function Dots() {
  const total = useCarousel((s) => s.carousel?.slides.length ?? 0);
  const active = useCarousel((s) => s.active);
  const setActive = useCarousel((s) => s.setActive);
  return (
    <div className="flex items-center gap-1.5 h-4">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          aria-label={`Slide ${i + 1}`}
          onClick={() => setActive(i)}
          className={cx("h-1.5 rounded-full transition-all duration-300", i === active ? "w-5 bg-ink" : "w-1.5 bg-ink/20 hover:bg-ink/40")}
        />
      ))}
    </div>
  );
}

const pill = "flex items-center gap-0.5 rounded-full bg-white p-1 ring-1 ring-line shadow-[0_8px_30px_-12px_rgba(0,0,0,0.2)]";

function SlideTools() {
  const slide = useCarousel(activeSlide)!;
  const profile = useSettings((s) => s.profile);
  const style = useSettings((s) => s.style);
  const openImagePicker = useUI((s) => s.openImagePicker);
  const [menu, setMenu] = useState(false);
  const isFixed = slide.layout === "cover" || slide.layout === "cta";
  const canImage = supportsImage(slide.layout) || styleShowsPhoto(style, slide.layout);
  const theme = slideTheme(slide.tone, profile.primary, profile.secondary);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className={pill}>
      {!isFixed && (
        <button
          onClick={() => reformatSlide(slide.id)}
          disabled={slide.busy}
          className="group relative h-10 pl-3.5 pr-4 rounded-full bg-ink text-white text-[14px] font-medium flex items-center gap-2 hover:bg-ink/85 active:scale-[0.97] transition disabled:opacity-60"
        >
          <Shuffle size={16} />
          Outro formato
        </button>
      )}
      {slide.layout === "cta" && (
        <button
          onClick={() => cycleCta(slide.id)}
          className="group relative h-10 pl-3.5 pr-4 rounded-full bg-ink text-white text-[14px] font-medium flex items-center gap-2 hover:bg-ink/85 active:scale-[0.97] transition"
        >
          <Shuffle size={16} />
          Trocar CTA
        </button>
      )}
      {slide.layout === "cover" && <span className="px-3.5 text-[13px] font-medium text-muted">{LAYOUTS.cover.label}</span>}
      {canImage && (
        <IconButton label={slide.image ? "Trocar imagem" : "Adicionar imagem"} tipSide="top" onClick={() => openImagePicker(slide.id)}>
          <ImageIcon size={18} />
        </IconButton>
      )}
      <IconButton label="Inserir imagem" tipSide="top" onClick={() => openImagePicker(slide.id, "extra")}>
        <ImagePlus size={18} />
      </IconButton>
      <IconButton label="Mudar fundo" tipSide="top" onClick={() => cycleTone(slide.id)}>
        <span className="h-[18px] w-[18px] rounded-full ring-2 ring-ink/15" style={{ background: `linear-gradient(135deg, ${theme.bg} 50%, ${theme.accent} 50%)` }} />
      </IconButton>
      <div className="relative">
        <IconButton label="Mais" tipSide="top" active={menu} onClick={() => setMenu((m) => !m)}>
          <MoreHorizontal size={18} />
        </IconButton>
        <AnimatePresence>{menu && <MoreMenu onClose={() => setMenu(false)} />}</AnimatePresence>
      </div>
    </motion.div>
  );
}

function MoreMenu({ onClose }: { onClose: () => void }) {
  const slide = useCarousel(activeSlide)!;
  const active = useCarousel((s) => s.active);
  const total = useCarousel((s) => s.carousel?.slides.length ?? 0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const item = (label: string, Icon: typeof Copy, run: () => void, opts: { danger?: boolean; disabled?: boolean } = {}) => (
    <button
      disabled={opts.disabled}
      onClick={() => {
        run();
        onClose();
      }}
      className={cx(
        "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] transition disabled:opacity-35 disabled:pointer-events-none",
        opts.danger ? "text-[#d92d20] hover:bg-[#d92d20]/[0.07]" : "hover:bg-ink/[0.05]",
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.14 }}
      className="absolute bottom-full right-0 mb-2 w-56 rounded-2xl bg-white p-1.5 ring-1 ring-line shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] z-50 origin-bottom-right"
    >
      {item("Baixar este slide", Download, () => exportCarousel([slide.id]))}
      {item("Duplicar", Copy, () => duplicateSlide(slide.id))}
      {item("Mover para a esquerda", ArrowLeftToLine, () => moveSlide(slide.id, -1), { disabled: active === 0 })}
      {item("Mover para a direita", ArrowRightToLine, () => moveSlide(slide.id, 1), { disabled: active >= total - 1 })}
      {!!slide.hidden?.length && item("Restaurar textos removidos", Undo2, () => restoreBlocks(slide.id))}
      <div className="my-1 h-px bg-line" />
      {item("Excluir slide", Trash2, () => deleteSlide(slide.id), { danger: true, disabled: total <= 2 })}
    </motion.div>
  );
}

const FONT_STEP = 0.08;

function BlockTools({ slideId, block }: { slideId: string; block: string }) {
  const select = useCarousel((s) => s.select);
  const override = useCarousel((s) => s.carousel?.slides.find((x) => x.id === slideId)?.overrides?.[block]);
  const scale = override?.scale ?? 1;
  const changed = !!override && (override.x !== 0 || override.y !== 0 || override.scale !== 1 || override.w != null || override.h != null);
  const sized = override?.w != null || override?.h != null;
  const removable = block !== "cutout";

  const setScale = (next: number) => {
    setBlockOverride(slideId, block, { scale: Math.max(0.4, Math.min(2.6, Math.round(next * 100) / 100)) });
    select(block);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className={pill}>
      <IconButton label="Diminuir fonte (−)" tipSide="top" onClick={() => setScale(scale - FONT_STEP)}>
        <AArrowDown size={19} />
      </IconButton>
      <span className="w-12 text-center text-[13px] font-medium tabular-nums text-muted">{Math.round(scale * 100)}%</span>
      <IconButton label="Aumentar fonte (+)" tipSide="top" onClick={() => setScale(scale + FONT_STEP)}>
        <AArrowUp size={19} />
      </IconButton>
      <div className="mx-1 h-5 w-px bg-line" />
      <IconButton
        label="Tamanho automático"
        tipSide="top"
        disabled={!sized}
        onClick={() => {
          setBlockOverride(slideId, block, { w: undefined, h: undefined });
          select(block);
        }}
      >
        <WrapText size={17} />
      </IconButton>
      <IconButton
        label="Voltar ao original"
        tipSide="top"
        disabled={!changed}
        onClick={() => {
          setBlockOverride(slideId, block, null);
          select(block);
        }}
      >
        <RotateCcw size={17} />
      </IconButton>
      {removable && (
        <IconButton label="Remover do slide (Delete)" tipSide="top" onClick={() => hideBlock(slideId, block)}>
          <Trash2 size={17} />
        </IconButton>
      )}
      <button
        onClick={() => select(null)}
        className="ml-0.5 h-10 pl-3 pr-4 rounded-full bg-ink text-white text-[14px] font-medium flex items-center gap-1.5 hover:bg-ink/85 transition"
      >
        <Check size={16} />
        Pronto
      </button>
    </motion.div>
  );
}

function ExtraTools({ slideId, extraId }: { slideId: string; extraId: string }) {
  const select = useCarousel((s) => s.select);
  const extra = useCarousel((s) => s.carousel?.slides.find((x) => x.id === slideId)?.extras?.find((e) => e.id === extraId));
  if (!extra) return null;

  // Grows or shrinks around its center
  const resize = (factor: number) => {
    const w = Math.max(60, Math.min(2400, Math.round(extra.w * factor)));
    const h0 = extra.w / extra.ratio;
    updateExtra(slideId, extraId, { w, x: Math.round(extra.x - (w - extra.w) / 2), y: Math.round(extra.y - (w / extra.ratio - h0) / 2) });
    select(`extra:${extraId}`);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className={pill}>
      <IconButton label="Diminuir" tipSide="top" onClick={() => resize(1 / 1.12)}>
        <span className="text-[18px] leading-none">−</span>
      </IconButton>
      <span className="w-14 text-center text-[13px] font-medium tabular-nums text-muted">{extra.w}px</span>
      <IconButton label="Aumentar" tipSide="top" onClick={() => resize(1.12)}>
        <span className="text-[18px] leading-none">+</span>
      </IconButton>
      <div className="mx-1 h-5 w-px bg-line" />
      <IconButton label="Remover imagem (Delete)" tipSide="top" onClick={() => removeExtra(slideId, extraId)}>
        <Trash2 size={17} />
      </IconButton>
      <button
        onClick={() => select(null)}
        className="ml-0.5 h-10 pl-3 pr-4 rounded-full bg-ink text-white text-[14px] font-medium flex items-center gap-1.5 hover:bg-ink/85 transition"
      >
        <Check size={16} />
        Pronto
      </button>
    </motion.div>
  );
}
function EditHint() {
  const seen = useUI((s) => s.hintSeen);
  const markSeen = useUI((s) => s.markHintSeen);
  const edited = useCarousel((s) => s.past.length > 0);

  useEffect(() => {
    if (edited && !seen) markSeen();
  }, [edited, seen, markSeen]);

  return (
    <AnimatePresence>
      {!seen && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.8 } }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 text-[12.5px] text-muted"
        >
          <span>
            <b className="font-semibold text-ink/70">Clique</b> num texto para ajustar tamanho e fonte · <b className="font-semibold text-ink/70">duas vezes</b> para editar · <b className="font-semibold text-ink/70">arraste</b> para mover
          </span>
          <button onClick={markSeen} aria-label="Fechar dica" className="grid h-5 w-5 place-items-center rounded-full hover:bg-ink/[0.06]">
            <X size={12} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
