"use client";

import { useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { useCarousel } from "@/store/carousel";
import { useUI } from "@/store/ui";
import { loadDemo } from "@/lib/demo";
import { hideBlock, removeExtra, setBlockOverride, updateExtra } from "@/lib/client/edits";
import { Header } from "./Header";
import { Home } from "./Home";
import { Editor } from "./Editor";
import { SettingsDrawer } from "./SettingsDrawer";
import { ImagePicker } from "./ImagePicker";
import { PublishSheet } from "./PublishSheet";
import { CaptionSheet } from "./CaptionSheet";
import { ExportStage } from "./ExportStage";
import { Toaster } from "./Toaster";

export default function App() {
  const view = useCarousel((s) => (s.status === "idle" ? "home" : "editor"));
  useShortcuts();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("demo")) loadDemo();
  }, []);

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">{view === "home" ? <Home key="home" /> : <Editor key="editor" />}</AnimatePresence>
      </main>
      <SettingsDrawer />
      <ImagePicker />
      <CaptionSheet />
      <PublishSheet />
      <ExportStage />
      <Toaster />
    </div>
  );
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const ui = useUI.getState();
      if (ui.settingsOpen || ui.imagePickerFor || ui.captionOpen || ui.publishOpen) return;
      const st = useCarousel.getState();
      if (st.status !== "ready" || !st.carousel) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        st.redo();
        return;
      }
      if (e.key === "Escape") {
        st.select(null);
        return;
      }
      const slide = st.carousel.slides[st.active];
      const extraId = st.selected?.startsWith("extra:") ? st.selected.slice(6) : null;
      const extra = extraId ? slide?.extras?.find((x) => x.id === extraId) : null;
      // Delete removes the selected text block or picture; + and − change the font size
      if (slide && st.selected && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        if (extraId) removeExtra(slide.id, extraId);
        else if (st.selected !== "cutout") hideBlock(slide.id, st.selected);
        return;
      }
      if (slide && st.selected && !extraId && !mod && (e.key === "+" || e.key === "=" || e.key === "-")) {
        e.preventDefault();
        const id = st.selected;
        const now = slide.overrides?.[id]?.scale ?? 1;
        setBlockOverride(slide.id, id, { scale: Math.max(0.4, Math.min(2.6, Math.round((now + (e.key === "-" ? -0.08 : 0.08)) * 100) / 100)) });
        st.select(id);
        return;
      }
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const dir = arrows[e.key];
      if (!dir) return;
      if (st.selected && slide) {
        // Nudge the selected block or picture
        e.preventDefault();
        const step = e.shiftKey ? 40 : 8;
        const id = st.selected;
        if (extra) updateExtra(slide.id, extra.id, { x: extra.x + dir[0] * step, y: extra.y + dir[1] * step });
        else {
          const o = slide.overrides?.[id] ?? { x: 0, y: 0, scale: 1 };
          setBlockOverride(slide.id, id, { x: o.x + dir[0] * step, y: o.y + dir[1] * step });
        }
        st.select(id);
        return;
      }
      if (dir[0]) {
        e.preventDefault();
        st.setActive(st.active + dir[0]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
