"use client";

import { useEffect } from "react";
import { Copy } from "lucide-react";
import { formatCaption } from "@/lib/normalize";
import { useCarousel } from "@/store/carousel";
import { toast, useUI } from "@/store/ui";
import { Modal } from "./Modal";

export function CaptionSheet() {
  const open = useUI((s) => s.captionOpen);
  const setOpen = useUI((s) => s.setCaptionOpen);
  const caption = useCarousel((s) => s.carousel?.caption ?? "");

  // Captions written before paragraphs got a blank line between them are spaced out once, on opening
  useEffect(() => {
    if (!open) return;
    const c = useCarousel.getState().carousel?.caption ?? "";
    if (c && !c.includes("\n\n") && c.includes("\n")) useCarousel.getState().edit((d) => void (d.caption = formatCaption(c)), false);
  }, [open]);

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Legenda do post">
      <div className="px-6 pb-2">
        <textarea
          value={caption}
          onChange={(e) => useCarousel.getState().edit((c) => void (c.caption = e.target.value), false)}
          rows={11}
          className="w-full resize-none rounded-2xl bg-ink/[0.04] p-4 text-[15px] leading-relaxed outline-none focus:ring-2 focus:ring-ink/70 transition"
        />
      </div>
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-[12.5px] text-muted tabular-nums">{caption.length} / 2.200</span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(caption).catch(() => {});
            toast("Legenda copiada", { tone: "success" });
            setOpen(false);
          }}
          className="h-10 px-4 rounded-full bg-ink text-white text-[14px] font-medium flex items-center gap-2 hover:bg-ink/85 transition"
        >
          <Copy size={16} />
          Copiar
        </button>
      </div>
    </Modal>
  );
}
