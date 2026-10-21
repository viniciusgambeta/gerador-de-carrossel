"use client";

import { AnimatePresence, motion } from "motion/react";
import { Download, Redo2, Send, Settings2, Type, Undo2 } from "lucide-react";
import { cancelGeneration } from "@/lib/client/actions";
import { exportCarousel } from "@/lib/client/export";
import { useCarousel } from "@/store/carousel";
import { useSettings } from "@/store/settings";
import { toast, useUI } from "@/store/ui";
import { IconButton, Logo, Spinner } from "./ui";

export function Header() {
  const status = useCarousel((s) => s.status);
  const missingKey = useSettings((s) => !s.keys.openai.trim());
  const openSettings = useUI((s) => s.openSettings);

  const goHome = () => {
    if (status === "scraping" || status === "writing") cancelGeneration();
    else useCarousel.getState().goHome();
  };

  return (
    <header className="relative z-30 h-16 shrink-0 px-3 sm:px-6 flex items-center justify-between">
      <button onClick={goHome} className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-ink/[0.04] transition">
        <Logo className="text-ink" />
        <span className="font-semibold tracking-tight text-[15px]">Carrossel</span>
      </button>

      <div className="flex items-center gap-1">
        <AnimatePresence>{status === "ready" && <EditorActions />}</AnimatePresence>
        <IconButton label="Configurações" onClick={() => openSettings()}>
          <Settings2 size={19} />
          {missingKey && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#ff4d2e] ring-2 ring-paper" />}
        </IconButton>
      </div>
    </header>
  );
}

function EditorActions() {
  const canUndo = useCarousel((s) => s.past.length > 0);
  const canRedo = useCarousel((s) => s.future.length > 0);
  const exporting = useUI((s) => s.exporting);
  const total = useCarousel((s) => s.carousel?.slides.length ?? 0);

  const copyCaption = async () => {
    const caption = useCarousel.getState().carousel?.caption ?? "";
    try {
      await navigator.clipboard.writeText(caption);
      toast("Legenda copiada", { tone: "success", action: { label: "Editar", run: () => useUI.getState().setCaptionOpen(true) } });
    } catch {
      useUI.getState().setCaptionOpen(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-center gap-1 mr-1"
    >
      <div className="hidden sm:flex items-center">
        <IconButton label="Desfazer (Ctrl+Z)" disabled={!canUndo} onClick={() => useCarousel.getState().undo()}>
          <Undo2 size={18} />
        </IconButton>
        <IconButton label="Refazer (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => useCarousel.getState().redo()}>
          <Redo2 size={18} />
        </IconButton>
        <div className="mx-2 h-5 w-px bg-line" />
      </div>
      <button
        onClick={copyCaption}
        className="h-10 px-3.5 rounded-full text-[14px] font-medium text-ink/80 hover:text-ink hover:bg-ink/[0.06] transition flex items-center gap-2"
      >
        <Type size={16} />
        <span className="hidden sm:inline">Copiar legenda</span>
      </button>
      <button
        onClick={() => useUI.getState().setPublishOpen(true)}
        disabled={!!exporting}
        className="h-10 px-3.5 rounded-full text-[14px] font-medium text-ink/80 hover:text-ink hover:bg-ink/[0.06] transition flex items-center gap-2 disabled:opacity-50"
      >
        <Send size={15} />
        <span className="hidden sm:inline">Publicar</span>
      </button>
      <button
        onClick={() => exportCarousel()}
        disabled={!!exporting}
        className="h-10 pl-3.5 pr-4 rounded-full bg-ink text-white text-[14px] font-medium flex items-center gap-2 hover:bg-ink/85 active:scale-[0.97] transition disabled:opacity-80"
      >
        {exporting ? <Spinner /> : <Download size={16} />}
        {exporting ? `${exporting.done}/${exporting.ids.length}` : <span>Baixar<span className="hidden sm:inline"> {total} slides</span></span>}
      </button>
    </motion.div>
  );
}
