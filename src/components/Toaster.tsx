"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useUI } from "@/store/ui";

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.16 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex max-w-[92vw] items-center gap-3 rounded-full bg-ink py-2.5 pl-4 pr-2.5 text-[14px] text-white shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5)]"
          >
            {t.tone === "error" && <AlertCircle size={16} className="shrink-0 text-[#ff8a75]" />}
            {t.tone === "success" && <CheckCircle2 size={16} className="shrink-0 text-[#7ee2a8]" />}
            <span className="pr-1.5">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.run();
                  dismiss(t.id);
                }}
                className="rounded-full bg-white/12 px-3 py-1 text-[13px] font-semibold hover:bg-white/20 transition"
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
