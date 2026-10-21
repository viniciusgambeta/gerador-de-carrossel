"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Globe, X } from "lucide-react";
import { cancelGeneration } from "@/lib/client/actions";
import { costOf, hasUsage } from "@/lib/pricing";
import { hostOf } from "@/lib/prompts";
import { useCarousel } from "@/store/carousel";
import { useUI } from "@/store/ui";
import { CarouselView } from "./CarouselView";
import { SlideToolbar } from "./SlideToolbar";
import { Spinner } from "./ui";

export function Editor() {
  const status = useCarousel((s) => s.status);
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      className="flex-1 flex flex-col items-center"
    >
      <SourcePill />
      <CarouselView />
      <div className="relative h-[112px] w-full flex flex-col items-center justify-start pt-1">
        <AnimatePresence mode="wait">{status === "ready" ? <SlideToolbar key="tools" /> : <GenerationStatus key="status" />}</AnimatePresence>
      </div>
      <AnimatePresence>{status === "ready" && <CostEstimate />}</AnimatePresence>
    </motion.section>
  );
}

const usd = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: v < 0.01 ? 4 : 3, maximumFractionDigits: v < 0.01 ? 4 : 3 });
const thousands = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(n));

/** What generating this carousel cost, at list prices (OpenAI + JEV); details on hover */
function CostEstimate() {
  const usage = useCarousel((s) => s.carousel?.usage);
  if (!usage || !hasUsage(usage)) return null;
  const cost = costOf(usage);
  const lines = [
    ...Object.entries(usage.openai).map(
      ([model, t]) => `OpenAI ${model}: ${thousands(t.input + t.cached)} tokens de entrada, ${thousands(t.output)} de saída`,
    ),
    usage.jev ? `JEV: ${thousands(usage.jev)} tokens (${usd(cost.jev)})` : "",
    cost.unpriced.length ? `Sem preço conhecido para ${cost.unpriced.join(", ")}: fora da conta` : "",
    "Preços de tabela da OpenAI e da TypeSafe, sem impostos. Inclui fotos e “Outro formato”.",
  ].filter(Boolean);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.4 } }}
      exit={{ opacity: 0 }}
      title={lines.join("\n")}
      className="fixed bottom-3 right-4 z-10 cursor-default select-none text-[11px] tabular-nums text-muted/70 hover:text-muted transition-colors"
    >
      Custo estimado ≈ {usd(cost.total)}
    </motion.div>
  );
}

function SourcePill() {
  const article = useCarousel((s) => s.carousel?.article);
  const url = useCarousel((s) => s.sourceUrl);
  return (
    <motion.a
      layout
      href={article?.url ?? url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1 mb-4 max-w-[min(560px,90vw)] flex items-center gap-2 rounded-full bg-white/70 ring-1 ring-line px-3.5 py-1.5 text-[13px] text-muted hover:text-ink transition"
    >
      <Globe size={13} className="shrink-0" />
      <span className="font-medium text-ink/70 shrink-0">{hostOf(article?.url ?? url)}</span>
      {article?.title ? (
        <>
          <span className="opacity-40">·</span>
          <span className="truncate">{article.title}</span>
        </>
      ) : (
        <span className="h-3 w-40 rounded-full shimmer" />
      )}
    </motion.a>
  );
}

function GenerationStatus() {
  const status = useCarousel((s) => s.status);
  const count = useCarousel((s) => s.carousel?.slides.length ?? 0);
  const label =
    status === "scraping"
      ? "Lendo a notícia"
      : count === 0
        ? "Planejando a narrativa"
        : count === 1
          ? "Escrevendo a capa"
          : `Escrevendo o slide ${count}`;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3 rounded-full bg-white ring-1 ring-line pl-4 pr-1.5 py-1.5 shadow-sm">
        <Spinner className="text-ink/60" />
        <AnimatePresence mode="wait">
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="text-[14px] font-medium"
          >
            {label}…
          </motion.span>
        </AnimatePresence>
        <button
          onClick={() => {
            cancelGeneration();
            useUI.getState().toast("Geração cancelada");
          }}
          aria-label="Cancelar"
          className="h-8 w-8 grid place-items-center rounded-full text-muted hover:text-ink hover:bg-ink/[0.06] transition"
        >
          <X size={15} />
        </button>
      </div>
      <AnimatePresence>{count === 0 && <PlanningBar key="bar" />}</AnimatePresence>
    </motion.div>
  );
}

/**
 * Reading the article and planning the story give no real progress to show: the bar fills quickly
 * for a few seconds, then creeps between 90% and 97% until the first slide arrives.
 */
function PlanningBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      const t = (performance.now() - start) / 1000;
      setProgress(t < 12 ? 90 * (1 - Math.pow(1 - t / 12, 2.4)) : 90 + 7 * (1 - Math.exp(-(t - 12) / 30)));
    }, 150);
    return () => window.clearInterval(id);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, delay: 0.25 } }}
      className="h-1 w-56 overflow-hidden rounded-full bg-ink/[0.08]"
      role="progressbar"
      aria-label="Preparando o carrossel"
    >
      <motion.div className="h-full rounded-full bg-ink/70" animate={{ width: `${progress}%` }} exit={{ width: "100%" }} transition={{ ease: "easeOut", duration: 0.3 }} />
    </motion.div>
  );
}
