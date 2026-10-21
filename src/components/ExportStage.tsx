"use client";

import { createPortal } from "react-dom";
import { SLIDE_H, SLIDE_W } from "@/lib/constants";
import { allSlides, useCarousel, useSlideSource } from "@/store/carousel";
import { useUI } from "@/store/ui";
import { SlideCanvas } from "./slides/SlideCanvas";

/** Off-screen, full-size, non-editable copies of the slides being exported. */
export function ExportStage() {
  const exporting = useUI((s) => s.exporting);
  const slides = useCarousel(allSlides);
  const source = useSlideSource();
  if (!exporting) return null;
  return createPortal(
    <div id="export-stage" aria-hidden style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }}>
      {slides.map((slide, i) =>
        exporting.ids.includes(slide.id) ? (
          <div key={slide.id} data-export={i + 1} style={{ width: SLIDE_W, height: SLIDE_H }}>
            <SlideCanvas slide={slide} index={i} total={slides.length} source={source} />
          </div>
        ) : null,
      )}
    </div>,
    document.body,
  );
}
