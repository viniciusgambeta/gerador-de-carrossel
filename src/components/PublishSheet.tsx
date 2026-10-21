"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Camera, Check, ExternalLink, Send } from "lucide-react";
import {
  fetchInstagramProfiles,
  instagramOutcome,
  MAX_INSTAGRAM_IMAGES,
  postStatus,
  publishToInstagram,
  type InstagramProfile,
} from "@/lib/client/publish";
import { SLIDE_W } from "@/lib/constants";
import { allSlides, useCarousel, useSlideSource } from "@/store/carousel";
import { useSettings } from "@/store/settings";
import { toast, useUI } from "@/store/ui";
import { Modal } from "./Modal";
import { SlideCanvas } from "./slides/SlideCanvas";
import { cx, Spinner } from "./ui";

export function PublishSheet() {
  const open = useUI((s) => s.publishOpen);
  const close = () => useUI.getState().setPublishOpen(false);
  return (
    <Modal open={open} onClose={close} title="Publicar no Instagram">
      {open && <PublishBody onDone={close} />}
    </Modal>
  );
}

type Phase = { kind: "idle" } | { kind: "sending" } | { kind: "waiting"; id: string } | { kind: "done"; text: string } | { kind: "error"; text: string };

/** Up to 10 slides: all of them, or the first ones plus the closing slide */
function defaultPick(ids: string[]) {
  if (ids.length <= MAX_INSTAGRAM_IMAGES) return ids;
  return [...ids.slice(0, MAX_INSTAGRAM_IMAGES - 1), ids[ids.length - 1]];
}

/** An hour from now, on the hour, as the value of a datetime-local input */
function nextHour() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

function PublishBody({ onDone }: { onDone: () => void }) {
  const hasKey = useSettings((s) => !!s.keys.postproxy?.trim());
  const slides = useCarousel(allSlides);
  const source = useSlideSource();
  const caption = useCarousel((s) => s.carousel?.caption ?? "");
  const exporting = useUI((s) => s.exporting);
  const [profiles, setProfiles] = useState<InstagramProfile[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState("");
  const [picked, setPicked] = useState<string[]>(() => defaultPick(slides.map((s) => s.id)));
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState(nextHour);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const busy = phase.kind === "sending" || phase.kind === "waiting";

  useEffect(() => {
    if (!hasKey) return;
    fetchInstagramProfiles()
      .then((list) => {
        setProfiles(list);
        setProfile(list.find((p) => p.status !== "expired")?.id ?? list[0]?.id ?? "");
      })
      .catch((err: Error) => setLoadError(err.message));
  }, [hasKey]);

  // A post sent for "now" takes a few seconds on Instagram's side: follow it until it lands
  useEffect(() => {
    if (phase.kind !== "waiting") return;
    let alive = true;
    let tries = 0;
    const tick = async () => {
      if (!alive) return;
      tries++;
      try {
        const out = instagramOutcome(await postStatus(phase.id));
        if (!alive) return;
        if (out.state === "published") return setPhase({ kind: "done", text: "Publicado no Instagram." });
        if (out.state === "failed") return setPhase({ kind: "error", text: out.error ? `O Instagram recusou: ${out.error}` : "O Instagram recusou o post." });
      } catch {}
      if (tries >= 40) return setPhase({ kind: "done", text: "Enviado. A Postproxy ainda está publicando; confira no painel dela em instantes." });
      setTimeout(tick, 3000);
    };
    const first = setTimeout(tick, 2500);
    return () => {
      alive = false;
      clearTimeout(first);
    };
  }, [phase]);

  const order = useMemo(() => slides.map((s) => s.id).filter((id) => picked.includes(id)), [slides, picked]);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_INSTAGRAM_IMAGES ? p : [...p, id]));

  const whenDate = new Date(when);
  const whenLabel = whenDate.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const valid = !!profile && order.length > 0 && (!schedule || whenDate.getTime() > Date.now() + 60_000);

  const submit = async () => {
    if (!valid || busy) return;
    setPhase({ kind: "sending" });
    try {
      const post = await publishToInstagram({ ids: order, caption, profile, scheduledAt: schedule ? whenDate.toISOString() : null });
      if (schedule) {
        setPhase({ kind: "done", text: `Agendado para ${whenLabel}.` });
        toast(`Post agendado para ${whenLabel}`, { tone: "success" });
        return;
      }
      const out = instagramOutcome(post);
      if (out.state === "published") setPhase({ kind: "done", text: "Publicado no Instagram." });
      else if (out.state === "failed") setPhase({ kind: "error", text: out.error ? `O Instagram recusou: ${out.error}` : "O Instagram recusou o post." });
      else setPhase({ kind: "waiting", id: post.id });
    } catch (err) {
      setPhase({ kind: "error", text: err instanceof Error ? err.message : "Não consegui enviar. Tente de novo." });
    }
  };

  if (!hasKey) {
    return (
      <div className="px-6 pb-6">
        <p className="text-[14.5px] leading-relaxed text-ink/80">
          Para publicar ou agendar direto daqui, conecte sua conta do Instagram na <b>Postproxy</b> e cole a chave de API dela nas configurações.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => {
              onDone();
              useUI.getState().openSettings("postproxy");
            }}
            className="h-10 px-4 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-ink/85 transition"
          >
            Adicionar chave da Postproxy
          </button>
          <a
            href="https://postproxy.dev"
            target="_blank"
            rel="noreferrer"
            className="h-10 px-4 rounded-full bg-ink/[0.05] hover:bg-ink/[0.09] text-[14px] font-medium flex items-center gap-2 transition"
          >
            Conhecer a Postproxy <ExternalLink size={14} />
          </a>
        </div>
      </div>
    );
  }

  const thumb = 74;
  return (
    <div className="flex min-h-0 flex-col">
      <div className="overflow-y-auto px-6 pb-4 space-y-6">
        {/* Account */}
        <section>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Conta</h3>
          {loadError ? (
            <p className="text-[13.5px] text-[#d92d20]">{loadError}</p>
          ) : !profiles ? (
            <div className="flex items-center gap-2 text-[13.5px] text-muted">
              <Spinner /> Buscando suas contas…
            </div>
          ) : !profiles.length ? (
            <p className="text-[13.5px] leading-relaxed text-muted">
              Nenhuma conta do Instagram conectada a esta chave. Conecte uma no painel da Postproxy e volte aqui.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProfile(p.id)}
                  className={cx(
                    "h-10 pl-3 pr-4 rounded-full text-[14px] font-medium flex items-center gap-2 transition",
                    profile === p.id ? "bg-ink text-white" : "bg-ink/[0.05] hover:bg-ink/[0.09]",
                  )}
                >
                  <Camera size={16} />
                  {p.name}
                  {p.status === "expired" && <span className="text-[11px] opacity-70">(reconectar)</span>}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Slides */}
        <section>
          <h3 className="mb-2 flex items-baseline justify-between text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
            Slides
            <span className="normal-case tracking-normal font-medium tabular-nums">
              {order.length} de até {MAX_INSTAGRAM_IMAGES}
            </span>
          </h3>
          {slides.length > MAX_INSTAGRAM_IMAGES && (
            <p className="mb-2 text-[12.5px] leading-snug text-muted">O Instagram aceita até {MAX_INSTAGRAM_IMAGES} imagens por carrossel. Toque para escolher quais vão.</p>
          )}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {slides.map((s, i) => {
              const n = order.indexOf(s.id);
              const on = n >= 0;
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  disabled={busy}
                  className={cx("relative shrink-0 overflow-hidden rounded-lg transition", on ? "ring-2 ring-ink" : "opacity-40 hover:opacity-70")}
                  style={{ width: thumb, height: thumb * 1.25 }}
                >
                  <div style={{ width: SLIDE_W, height: SLIDE_W * 1.25, transform: `scale(${thumb / SLIDE_W})`, transformOrigin: "0 0", pointerEvents: "none" }}>
                    <SlideCanvas slide={s} index={i} total={slides.length} source={source} />
                  </div>
                  {on && (
                    <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-semibold text-white tabular-nums">
                      {n + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Caption */}
        <section>
          <h3 className="mb-2 flex items-baseline justify-between text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
            Legenda
            <span className={cx("normal-case tracking-normal font-medium tabular-nums", caption.length > 2200 && "text-[#d92d20]")}>{caption.length} / 2.200</span>
          </h3>
          <textarea
            value={caption}
            disabled={busy}
            onChange={(e) => useCarousel.getState().edit((c) => void (c.caption = e.target.value), false)}
            rows={6}
            className="w-full resize-none rounded-2xl bg-ink/[0.04] p-4 text-[14.5px] leading-relaxed outline-none focus:ring-2 focus:ring-ink/70 transition"
          />
        </section>

        {/* When */}
        <section>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Quando</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink/[0.04] p-1">
              {[false, true].map((later) => (
                <button
                  key={String(later)}
                  disabled={busy}
                  onClick={() => setSchedule(later)}
                  className={cx("h-9 rounded-lg px-4 text-[13.5px] font-medium transition", schedule === later ? "bg-white shadow-sm" : "text-muted hover:text-ink")}
                >
                  {later ? "Agendar" : "Agora"}
                </button>
              ))}
            </div>
            {schedule && (
              <input
                type="datetime-local"
                value={when}
                disabled={busy}
                min={nextHour().slice(0, 11) + "00:00"}
                onChange={(e) => setWhen(e.target.value)}
                className="h-11 rounded-xl bg-ink/[0.04] px-3 text-[14px] outline-none focus:ring-2 focus:ring-ink/70"
              />
            )}
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
        <div className="min-w-0 text-[13px] leading-snug">
          {phase.kind === "sending" && (
            <span className="flex items-center gap-2 text-muted">
              <Spinner /> {exporting ? `Gerando imagens ${exporting.done}/${exporting.ids.length}…` : "Enviando para a Postproxy…"}
            </span>
          )}
          {phase.kind === "waiting" && (
            <span className="flex items-center gap-2 text-muted">
              <Spinner /> Publicando no Instagram…
            </span>
          )}
          {phase.kind === "done" && (
            <span className="flex items-center gap-1.5 font-medium text-[#12805c]">
              <Check size={15} /> {phase.text}
            </span>
          )}
          {phase.kind === "error" && <span className="text-[#d92d20]">{phase.text}</span>}
        </div>
        {phase.kind === "done" ? (
          <button onClick={onDone} className="h-10 shrink-0 px-5 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-ink/85 transition">
            Fechar
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!valid || busy || caption.length > 2200}
            className="h-10 shrink-0 pl-3.5 pr-4 rounded-full bg-ink text-white text-[14px] font-medium flex items-center gap-2 hover:bg-ink/85 active:scale-[0.97] transition disabled:opacity-40"
          >
            {schedule ? <CalendarClock size={16} /> : <Send size={15} />}
            {schedule ? `Agendar para ${whenLabel}` : "Publicar agora"}
          </button>
        )}
      </div>
    </div>
  );
}
