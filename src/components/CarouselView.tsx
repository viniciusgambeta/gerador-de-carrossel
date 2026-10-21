"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { SLIDE_W } from "@/lib/constants";
import { allSlides, useCarousel, useSlideSource } from "@/store/carousel";
import { SlideCanvas } from "./slides/SlideCanvas";
import { cx } from "./ui";

function useSlideSize() {
  const [size, setSize] = useState({ w: 400, h: 500, vw: 1200 });
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // header 64 + source pill 48 + dots/toolbar 150
      let h = Math.max(340, Math.min(vh - 64 - 48 - 150, 760));
      let w = h * 0.8;
      if (w > vw - 40) {
        w = vw - 40;
        h = w * 1.25;
      }
      setSize({ w: Math.round(w), h: Math.round(h), vw });
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return size;
}

export function CarouselView() {
  const slides = useCarousel(allSlides);
  const source = useSlideSource();
  const active = useCarousel((s) => s.active);
  const status = useCarousel((s) => s.status);
  const setActive = useCarousel((s) => s.setActive);
  const { w, h, vw } = useSlideSize();
  const scale = w / SLIDE_W;
  const gap = vw < 640 ? 14 : 28;
  const generating = status !== "ready";
  // While writing, a placeholder card shows where the next slide will appear
  const pending = generating && !slides.some((s) => s.writing);
  const count = slides.length + (pending ? 1 : 0);

  const xFor = (offset: number) => {
    if (offset === 0) return 0;
    const n = Math.abs(offset);
    return Math.sign(offset) * (0.94 * w + gap + (n - 1) * (0.88 * w + gap));
  };

  // Swipe on empty areas (blocks and photos capture their own drags)
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) setActive(active + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="relative w-full select-none" style={{ height: h }} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      {Array.from({ length: count }, (_, i) => {
        const slide = slides[i];
        const offset = i - active;
        const dist = Math.abs(offset);
        const isActive = offset === 0;
        return (
          <motion.div
            key={slide?.id ?? "pending"}
            initial={{ opacity: 0, scale: 0.86, x: xFor(offset) + 60 }}
            animate={{
              x: xFor(offset),
              scale: isActive ? 1 : 0.88,
              opacity: dist > 2 ? 0 : isActive ? 1 : dist === 1 ? 0.5 : 0.22,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 32, mass: 0.9 }}
            className={cx(
              "absolute top-0 left-1/2 rounded-[18px] overflow-hidden bg-white",
              isActive ? "shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.04)]" : "cursor-pointer",
            )}
            style={{ width: w, height: h, marginLeft: -w / 2, zIndex: 20 - dist, pointerEvents: dist > 2 ? "none" : "auto" }}
            onClick={isActive || !slide ? undefined : () => setActive(i)}
          >
            {slide ? (
              <div style={{ width: SLIDE_W, height: SLIDE_W * 1.25, transform: `scale(${scale})`, transformOrigin: "0 0", pointerEvents: isActive ? "auto" : "none" }}>
                <SlideCanvas
                  slide={slide}
                  index={i}
                  total={slides.length}
                  source={source}
                  editable={isActive && !generating && !slide.busy}
                  scale={scale}
                />
              </div>
            ) : (
              <PendingCard />
            )}
            <AnimatePresence>{slide?.busy && <BusyOverlay />}</AnimatePresence>
          </motion.div>
        );
      })}

      {!generating && (
        <>
          <NavButton side="left" disabled={active === 0} w={w} onClick={() => setActive(active - 1)} />
          <NavButton side="right" disabled={active >= slides.length - 1} w={w} onClick={() => setActive(active + 1)} />
        </>
      )}
    </div>
  );
}

function NavButton({ side, disabled, w, onClick }: { side: "left" | "right"; disabled: boolean; w: number; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Slide anterior" : "Próximo slide"}
      className="hidden md:grid absolute top-1/2 z-40 h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-[0_6px_20px_-6px_rgba(0,0,0,0.3)] ring-1 ring-line transition hover:scale-105 active:scale-95 disabled:opacity-0 disabled:pointer-events-none"
      style={side === "left" ? { left: `calc(50% - ${w / 2}px - 66px)` } : { left: `calc(50% + ${w / 2}px + 22px)` }}
    >
      <Icon size={20} />
    </button>
  );
}

function PendingCard() {
  return (
    <div className="absolute inset-0 shimmer flex flex-col justify-end gap-3 p-[9%]">
      <div className="h-3 w-1/4 rounded-full bg-ink/10" />
      <div className="h-6 w-4/5 rounded-full bg-ink/10" />
      <div className="h-6 w-3/5 rounded-full bg-ink/10" />
      <div className="mt-2 h-3 w-2/3 rounded-full bg-ink/[0.07]" />
    </div>
  );
}

function BusyOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 grid place-items-center bg-white/55 backdrop-blur-[6px]"
    >
      <div className="flex items-center gap-2.5 rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }} className="grid">
          <Shuffle size={15} />
        </motion.span>
        Criando outro formato…
      </div>
    </motion.div>
  );
}
