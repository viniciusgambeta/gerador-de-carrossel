"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "motion/react";
import { ArrowRight, ClipboardPaste, History, Link2 } from "lucide-react";
import { generate, resumeSaved } from "@/lib/client/actions";
import { useCarousel } from "@/store/carousel";
import { useSettings } from "@/store/settings";
import { toast, useUI } from "@/store/ui";

function normalizeUrl(input: string): string | null {
  let v = input.trim();
  if (!v || /\s/.test(v)) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

export function Home() {
  const [url, setUrl] = useState(() => useUI.getState().pendingUrl?.url ?? "");
  const saved = useCarousel((s) => s.saved);
  const input = useRef<HTMLInputElement>(null);
  const shake = useAnimationControls();

  useEffect(() => {
    input.current?.focus();
  }, []);

  const start = (value = url) => {
    const v = normalizeUrl(value);
    if (!v) {
      shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } });
      if (value.trim()) toast("Esse link não parece válido.");
      input.current?.focus();
      return;
    }
    generate(v);
  };

  // Pasting a link is enough: no extra click
  const startSoon = (v: string) => {
    setUrl(v);
    setTimeout(() => start(v), 320);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const v = normalizeUrl(text);
      if (v) startSoon(v);
      else {
        toast("Copie o link de uma notícia e tente de novo.");
        input.current?.focus();
      }
    } catch {
      input.current?.focus();
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -24, transition: { duration: 0.22 } }}
      className="relative flex-1 flex flex-col items-center justify-center px-5 pb-[12vh]"
    >
      <Glow />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center text-center"
      >
        <CardStack />
        <h1 className="mt-9 font-display text-[44px] leading-[1.02] sm:text-[64px] font-bold tracking-[-0.035em]">
          Notícia vira carrossel.
        </h1>
        <p className="mt-4 text-[17px] sm:text-[19px] text-muted max-w-md text-balance">Cole o link. A IA escreve, ilustra e monta os slides.</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
        className="relative mt-10 w-full max-w-[600px]"
      >
        <motion.div
          animate={shake}
          className="flex items-center rounded-[22px] bg-white ring-1 ring-line shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_60px_-28px_rgba(0,0,0,0.25)] focus-within:ring-2 focus-within:ring-ink/80 transition-shadow"
        >
          <Link2 size={20} className="ml-5 shrink-0 text-muted" />
          <input
            ref={input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              const v = normalizeUrl(e.clipboardData.getData("text"));
              if (v) {
                e.preventDefault();
                startSoon(v);
              }
            }}
            placeholder="Cole o link da notícia"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 min-w-0 h-[64px] px-3 bg-transparent outline-none text-[17px] placeholder:text-ink/35"
          />
          {url.trim() ? (
            <button
              type="submit"
              aria-label="Gerar carrossel"
              className="mr-2 h-12 w-12 shrink-0 rounded-2xl bg-ink text-white grid place-items-center hover:bg-ink/85 active:scale-95 transition"
            >
              <ArrowRight size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={pasteFromClipboard}
              className="mr-2 h-12 px-4 shrink-0 rounded-2xl bg-ink/[0.05] hover:bg-ink/[0.09] text-[14px] font-medium text-ink/80 flex items-center gap-2 transition"
            >
              <ClipboardPaste size={16} />
              Colar
            </button>
          )}
        </motion.div>
      </motion.form>

      {saved && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.35 } }}
          onClick={resumeSaved}
          className="relative mt-6 max-w-[90vw] flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] text-muted hover:text-ink hover:bg-ink/[0.04] transition"
        >
          <History size={14} className="shrink-0" />
          <span className="truncate">Continuar “{saved.slides[0] && "title" in saved.slides[0] ? stripStars(saved.slides[0].title) : saved.article.title}”</span>
        </motion.button>
      )}
    </motion.section>
  );
}

const stripStars = (s: string) => s.replace(/\*\*/g, "");

/** Three mini slides in the user's brand colors */
function CardStack() {
  const { primary, secondary } = useSettings((s) => s.profile);
  const cards = [
    { rotate: -12, x: -34, bg: "#ffffff", line: "#0c0c0d", accent: primary },
    { rotate: 10, x: 34, bg: "#141416", line: "#ffffff", accent: secondary },
    { rotate: 0, x: 0, bg: primary, line: "#ffffff", accent: secondary },
  ];
  return (
    <div className="relative h-[92px] w-[150px]">
      {cards.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20, rotate: 0, x: 0 }}
          animate={{ opacity: 1, y: [0, -4, 0], rotate: c.rotate, x: c.x }}
          transition={{
            opacity: { delay: 0.1 + i * 0.08 },
            rotate: { type: "spring", stiffness: 140, damping: 14, delay: 0.15 + i * 0.08 },
            x: { type: "spring", stiffness: 140, damping: 14, delay: 0.15 + i * 0.08 },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 },
          }}
          className="absolute left-1/2 top-0 -ml-[37px] h-[92px] w-[74px] rounded-[14px] p-2.5 flex flex-col justify-end gap-1.5 shadow-[0_14px_30px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5"
          style={{ background: c.bg }}
        >
          <div className="h-1.5 w-7 rounded-full" style={{ background: c.accent }} />
          <div className="h-1.5 w-full rounded-full opacity-90" style={{ background: c.line }} />
          <div className="h-1.5 w-2/3 rounded-full opacity-50" style={{ background: c.line }} />
        </motion.div>
      ))}
    </div>
  );
}

function Glow() {
  const { primary, secondary } = useSettings((s) => s.profile);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-[calc(50%-260px)] top-[30%] h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.16] blur-[110px]"
        style={{ background: primary }}
      />
      <div
        className="absolute left-[calc(50%+260px)] top-[44%] h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.2] blur-[110px]"
        style={{ background: secondary }}
      />
    </div>
  );
}
