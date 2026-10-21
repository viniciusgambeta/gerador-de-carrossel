"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Check, ExternalLink, Eye, EyeOff, ImagePlus, Trash2, X } from "lucide-react";
import { generate } from "@/lib/client/actions";
import { apiHeaders } from "@/lib/client/api";
import { useCarousel } from "@/store/carousel";
import { fileToDataUrl } from "@/lib/client/files";
import { hasFixedColors, STYLES } from "@/lib/styles";
import type { ConnectorShape, DisplayPrefs, Language, Slide } from "@/lib/types";
import { PALETTES, useSettings } from "@/store/settings";
import { useUI, type SettingsField } from "@/store/ui";
import { SlideCanvas } from "./slides/SlideCanvas";
import { cx, Spinner } from "./ui";

export function SettingsDrawer() {
  const open = useUI((s) => s.settingsOpen);
  const closeSettings = useUI((s) => s.closeSettings);

  // Closing with a new key in place resumes the link the user had pasted
  const close = useCallback(() => {
    closeSettings();
    const pending = useUI.getState().pendingUrl;
    const key = useSettings.getState().keys.openai.trim();
    if (pending && key && key !== pending.key && useCarousel.getState().status === "idle") generate(pending.url);
  }, [closeSettings]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, close]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-[440px] flex-col bg-white shadow-[0_0_80px_-20px_rgba(0,0,0,0.35)]"
          >
            <div className="flex h-16 shrink-0 items-center justify-between px-6">
              <h2 className="text-[17px] font-semibold tracking-tight">Configurações</h2>
              <button onClick={close} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-ink/[0.06] hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <Tabs />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const TABS = [
  { id: "profile", label: "Perfil" },
  { id: "style", label: "Estilo" },
  { id: "visual", label: "Visual" },
  { id: "keys", label: "Chaves" },
  { id: "generation", label: "Geração" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const tabForFocus = (focus: SettingsField): TabId | null =>
  focus === "openai" || focus === "unsplash" || focus === "pixabay" || focus === "jev" || focus === "postproxy" ? "keys" : focus === "handle" ? "profile" : null;

function Tabs() {
  const focus = useUI((s) => s.settingsFocus);
  const missingKey = useSettings((s) => !s.keys.openai.trim());
  const [tab, setTab] = useState<TabId>(() => tabForFocus(focus) ?? (missingKey ? "keys" : "profile"));

  useEffect(() => {
    const t = tabForFocus(focus);
    if (t) setTab(t);
  }, [focus]);

  return (
    <>
      <div className="shrink-0 px-4 pb-3">
        <div className="flex gap-1 rounded-xl bg-ink/[0.04] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx("relative h-9 flex-1 rounded-lg text-[13px] font-medium transition", tab === t.id ? "text-ink" : "text-muted hover:text-ink")}
            >
              {tab === t.id && (
                <motion.span layoutId="settings-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
              )}
              <span className="relative">{t.label}</span>
              {t.id === "keys" && missingKey && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#ff4d2e]" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="space-y-10">
            {tab === "profile" && <ProfileSection />}
            {tab === "style" && <StyleSection />}
            {tab === "visual" && (
              <>
                <ColorSection />
                <DisplaySection />
              </>
            )}
            {tab === "keys" && <KeysSection />}
            {tab === "generation" && <AdvancedSection />}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="shrink-0 border-t border-line px-6 py-3.5 text-[12px] text-muted flex items-center gap-1.5">
        <Check size={13} /> Salvo automaticamente, só neste navegador.
      </div>
    </>
  );
}

/* ───────────── Style gallery ───────────── */

// A quote shows each style's composition best (balloon, pull quote, chat, transmission…)
const STYLE_SAMPLE: Slide = {
  id: "style-sample",
  layout: "quote",
  tone: "light",
  image: null,
  imageQuery: null,
  quote: "A virada não veio das grandes usinas, veio dos **telhados**.",
  author: "Especialista em energia",
  role: "Exemplo de citação",
};

function StyleSection() {
  const current = useSettings((s) => s.style);
  const setStyle = useSettings((s) => s.setStyle);
  const w = 176;
  return (
    <Section title="Estilo do post">
      <div className="grid grid-cols-2 gap-3">
        {STYLES.map((st) => {
          const on = st.id === current;
          return (
            <button
              key={st.id}
              onClick={() => setStyle(st.id)}
              className={cx("group rounded-2xl p-2 text-left transition", on ? "bg-ink/[0.05] ring-2 ring-ink" : "ring-1 ring-line hover:bg-ink/[0.03]")}
            >
              <div className="overflow-hidden rounded-xl" style={{ width: "100%", aspectRatio: "4 / 5" }}>
                <div style={{ width: 1080, height: 1350, transform: `scale(${w / 1080})`, transformOrigin: "0 0" }}>
                  <SlideCanvas slide={STYLE_SAMPLE} index={2} total={9} styleOverride={st.id} />
                </div>
              </div>
              <div className="px-1 pb-1 pt-2.5">
                <div className="flex items-center gap-1.5 text-[14px] font-semibold">
                  {st.name}
                  {on && <Check size={14} />}
                </div>
                <div className="mt-0.5 text-[12px] leading-snug text-muted">{st.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/* ───────────── What the slides show ───────────── */

const DISPLAY_OPTIONS: { key: keyof DisplayPrefs; label: string; hint?: string }[] = [
  { key: "source", label: "Fonte da notícia", hint: "Favicon e nome do site no canto superior" },
  { key: "pageNumber", label: "Numeração", hint: "Número da página no canto superior" },
  { key: "handle", label: "Assinatura", hint: "Seu @ no rodapé" },
  { key: "avatar", label: "Avatar", hint: "Sua foto no rodapé" },
  { key: "summary", label: "“Em resumo” no último slide", hint: "Sem ele, a chamada final ganha o slide inteiro" },
  { key: "imageCredit", label: "Crédito das fotos", hint: "As licenças do Wikimedia, do Unsplash e do Pixabay pedem ou recomendam o crédito" },
];

function DisplaySection() {
  const display = useSettings((s) => s.display);
  const setDisplay = useSettings((s) => s.setDisplay);
  return (
    <>
      <Section title="Mostrar nos slides">
        <div className="divide-y divide-line rounded-2xl ring-1 ring-line">
          {DISPLAY_OPTIONS.map((o) => (
            <label key={o.key} className="flex cursor-pointer items-center gap-3 px-4 py-3">
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-medium">{o.label}</span>
                {o.hint && <span className="block text-[12px] leading-snug text-muted">{o.hint}</span>}
              </span>
              <Switch checked={display[o.key]} onChange={(v) => setDisplay({ [o.key]: v })} />
            </label>
          ))}
        </div>
      </Section>
      <ConnectorSection />
      <MemorySection />
    </>
  );
}

/* ───────────── Remembered adjustments ───────────── */

function MemorySection() {
  const on = useSettings((s) => s.rememberLayout);
  const setOn = useSettings((s) => s.setRememberLayout);
  const style = useSettings((s) => s.style);
  const memory = useSettings((s) => s.layoutMemory);
  const forget = useSettings((s) => s.forgetLayouts);
  const name = STYLES.find((s) => s.id === style)?.name ?? style;
  const inStyle = Object.keys(memory).filter((k) => k.startsWith(`${style}:`)).length;
  const total = Object.keys(memory).length;
  return (
    <Section title="Seus ajustes de layout">
      <div className="rounded-2xl ring-1 ring-line">
        <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-medium">Lembrar nos próximos carrosséis</span>
            <span className="block text-[12px] leading-snug text-muted">
              Posição, tamanho e fonte que você ajustar num formato (capa, citação, lista…) viram o ponto de partida desse formato no mesmo estilo
            </span>
          </span>
          <Switch checked={on} onChange={setOn} />
        </label>
        {total > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px]">
            <span className="text-muted">
              {inStyle ? `${inStyle} ${inStyle === 1 ? "formato ajustado" : "formatos ajustados"} no estilo ${name}` : `Nenhum ajuste no estilo ${name}`}
            </span>
            <span className="flex shrink-0 gap-1">
              {inStyle > 0 && (
                <button onClick={() => forget(style)} className="rounded-full px-3 py-1.5 font-medium hover:bg-ink/[0.05] transition">
                  Esquecer deste estilo
                </button>
              )}
              {total > inStyle && (
                <button onClick={() => forget()} className="rounded-full px-3 py-1.5 font-medium text-[#d92d20] hover:bg-[#d92d20]/[0.07] transition">
                  Esquecer todos
                </button>
              )}
            </span>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ───────────── Connector shape ───────────── */

const CONNECTORS: { id: ConnectorShape; label: string; path: string }[] = [
  { id: "none", label: "Nenhum", path: "" },
  { id: "straight", label: "Reto", path: "M2 10 H12 V30 H52 V14 H62" },
  { id: "curved", label: "Curvas", path: "M2 10 H6 Q12 10 12 16 V24 Q12 30 18 30 H46 Q52 30 52 24 V20 Q52 14 58 14 H62" },
  { id: "organic", label: "Orgânico", path: "M2 10 C14 10 8 28 22 29 C32 30 36 24 44 27 C54 31 50 14 62 14" },
];

function ConnectorSection() {
  const connector = useSettings((s) => s.connector);
  const setConnector = useSettings((s) => s.setConnector);
  return (
    <Section title="Conector entre slides">
      <div className="grid grid-cols-4 gap-2">
        {CONNECTORS.map((c) => {
          const on = c.id === connector;
          return (
            <button
              key={c.id}
              onClick={() => setConnector(c.id)}
              className={cx("rounded-xl px-2 pb-2 pt-3 text-[12px] font-medium transition", on ? "bg-ink/[0.05] ring-2 ring-ink" : "ring-1 ring-line hover:bg-ink/[0.03]")}
            >
              <svg viewBox="0 0 64 40" className="mx-auto h-8 w-14" aria-hidden>
                <rect x="0.5" y="0.5" width="63" height="39" rx="5" fill="none" stroke="currentColor" strokeOpacity="0.12" />
                {c.path ? (
                  <path d={c.path} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M24 14 L40 26 M40 14 L24 26" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
              <span className="mt-1.5 block">{c.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        A linha passa de um slide para o outro no traço de cada estilo. No editor, arraste as bolinhas da linha para mudar a altura em que ela cruza
        de um slide para o outro ou por onde corre embaixo; clique duas vezes para voltar ao original.
      </p>
    </Section>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx("relative h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-ink" : "bg-ink/15")}
    >
      <motion.span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
        animate={{ left: checked ? 18 : 2 }}
        transition={{ type: "spring", stiffness: 600, damping: 36 }}
      />
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">{title}</h3>
      {children}
    </section>
  );
}

const field =
  "h-11 w-full rounded-xl bg-ink/[0.04] px-3.5 text-[15px] outline-none ring-0 transition focus:bg-white focus:ring-2 focus:ring-ink/70 placeholder:text-ink/35";

/* ───────────── Profile ───────────── */

function ProfileSection() {
  const profile = useSettings((s) => s.profile);
  const setProfile = useSettings((s) => s.setProfile);
  const focus = useUI((s) => s.settingsFocus);
  const avatarInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  return (
    <Section title="Perfil">
      <div className="flex items-center gap-4">
        <button
          onClick={() => avatarInput.current?.click()}
          className="group relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full bg-ink/[0.05] ring-1 ring-line"
          aria-label="Foto do perfil"
        >
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <Camera size={22} className="m-auto text-muted" />
          )}
          <span className="absolute inset-0 grid place-items-center bg-ink/40 text-white opacity-0 transition group-hover:opacity-100">
            <Camera size={18} />
          </span>
        </button>
        <div className="flex-1 space-y-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-muted">@</span>
            <input
              autoFocus={focus === "handle"}
              value={profile.handle.replace(/^@/, "")}
              onChange={(e) => setProfile({ handle: e.target.value.replace(/[^\w.]/g, "") })}
              placeholder="seuperfil"
              className={cx(field, "pl-8")}
            />
          </div>
          <input value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} placeholder="Nome (opcional)" className={field} />
        </div>
      </div>
      <input
        ref={avatarInput}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setProfile({ avatar: await fileToDataUrl(f, { max: 320, square: true }) });
          e.target.value = "";
        }}
      />

      <div className="mt-3">
        {profile.logo ? (
          <div className="flex items-center justify-between rounded-xl bg-ink/[0.04] px-3.5 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.logo} alt="Logo" className="h-8 max-w-[200px] object-contain" />
            <div className="flex items-center gap-1">
              <button onClick={() => logoInput.current?.click()} className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium hover:bg-ink/[0.06]">
                Trocar
              </button>
              <button onClick={() => setProfile({ logo: null })} aria-label="Remover logo" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-ink/[0.06] hover:text-ink">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => logoInput.current?.click()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 text-[14px] text-muted transition hover:border-ink/40 hover:text-ink"
          >
            <ImagePlus size={16} /> Adicionar logo (opcional)
          </button>
        )}
        <input
          ref={logoInput}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setProfile({ logo: await fileToDataUrl(f, { max: 600, type: "image/png" }) });
            e.target.value = "";
          }}
        />
      </div>
    </Section>
  );
}

/* ───────────── Colors ───────────── */

const PREVIEW: Slide[] = [
  { id: "p1", layout: "statement", tone: "brand", image: null, imageQuery: null, emoji: "", text: "Uma frase de **impacto**" },
  { id: "p2", layout: "stat", tone: "dark", image: null, imageQuery: null, kicker: "", value: "47%", label: "dos leitores", context: "", share: 47 },
  {
    id: "p3",
    layout: "list",
    tone: "light",
    image: null,
    imageQuery: null,
    title: "O que **muda**",
    items: [
      { icon: "energy", text: "Primeiro ponto" },
      { icon: "target", text: "Segundo ponto" },
    ],
  },
];

function ColorSection() {
  const { primary, secondary } = useSettings((s) => s.profile);
  const setProfile = useSettings((s) => s.setProfile);
  const style = useSettings((s) => s.style);
  const previewW = 108;

  return (
    <Section title="Cores">
      {hasFixedColors(style) && (
        <p className="-mt-1 mb-3 text-[12px] leading-relaxed text-muted">
          O estilo {STYLES.find((s) => s.id === style)?.name} segue o próprio design system e usa as cores dele. Estas valem para os outros estilos.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {PALETTES.map((p) => {
          const on = p.primary.toLowerCase() === primary.toLowerCase() && p.secondary.toLowerCase() === secondary.toLowerCase();
          return (
            <button
              key={p.name}
              onClick={() => setProfile({ primary: p.primary, secondary: p.secondary })}
              title={p.name}
              className={cx("flex h-9 overflow-hidden rounded-full ring-offset-2 transition", on ? "ring-2 ring-ink" : "ring-1 ring-line hover:scale-105")}
            >
              <span className="w-6" style={{ background: p.primary }} />
              <span className="w-4" style={{ background: p.secondary }} />
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ColorInput label="Principal" value={primary} onChange={(v) => setProfile({ primary: v })} />
        <ColorInput label="Destaque" value={secondary} onChange={(v) => setProfile({ secondary: v })} />
      </div>

      <div className="mt-4 flex justify-between gap-2">
        {PREVIEW.map((s, i) => (
          <div key={s.id} className="overflow-hidden rounded-[10px] ring-1 ring-line" style={{ width: previewW, height: previewW * 1.25 }}>
            <div style={{ transform: `scale(${previewW / 1080})`, transformOrigin: "0 0" }}>
              <SlideCanvas slide={s} index={i + 1} total={5} />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <label className="flex h-11 items-center gap-2.5 rounded-xl bg-ink/[0.04] pl-1.5 pr-3 focus-within:ring-2 focus-within:ring-ink/70">
      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] leading-none text-muted">{label}</span>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
          }}
          className="w-full bg-transparent text-[14px] font-medium uppercase outline-none tabular-nums"
        />
      </span>
    </label>
  );
}

/* ───────────── API keys ───────────── */

type KeyName = "openai" | "unsplash" | "pixabay" | "jev" | "postproxy";

const KEYS: { name: KeyName; label: string; hint: string; link: string; required?: boolean }[] = [
  { name: "openai", label: "OpenAI", hint: "Escreve os slides", link: "https://platform.openai.com/api-keys", required: true },
  { name: "unsplash", label: "Unsplash", hint: "Access Key: fotos profissionais", link: "https://unsplash.com/oauth/applications" },
  { name: "pixabay", label: "Pixabay", hint: "Fotos e objetos sem fundo (PNG) para os slides", link: "https://pixabay.com/api/docs/" },
  { name: "jev", label: "JEV (TypeSafe)", hint: "Decisões rápidas: escolhe fotos e formatos", link: "https://console.typesafe.ai" },
  { name: "postproxy", label: "Postproxy", hint: "Publica ou agenda o carrossel no seu Instagram", link: "https://postproxy.dev" },
];

function KeysSection() {
  return (
    <Section title="Chaves de API">
      <div className="space-y-3">
        {KEYS.map((k) => (
          <KeyField key={k.name} {...k} />
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        Sem Unsplash e Pixabay, as fotos vêm da Wikipédia e do Wikimedia Commons. O Pixabay também traz objetos sem fundo que entram em
        alguns slides. Sem JEV, as escolhas usam regras simples. Com a Postproxy (e o Instagram conectado nela), o botão Publicar envia ou
        agenda o post sem precisar baixar.
      </p>
    </Section>
  );
}

type CheckState = "idle" | "checking" | "ok" | "bad";

export const modelsCache: { list: string[] } = { list: [] };

function KeyField({ name, label, hint, link, required }: (typeof KEYS)[number]) {
  const value = useSettings((s) => s.keys[name]);
  const setKeys = useSettings((s) => s.setKeys);
  const focus = useUI((s) => s.settingsFocus);
  const [show, setShow] = useState(false);
  const [state, setState] = useState<CheckState>("idle");
  const input = useRef<HTMLInputElement>(null);
  const highlight = focus === (name as SettingsField);

  useEffect(() => {
    if (highlight) setTimeout(() => input.current?.focus(), 250);
  }, [highlight]);

  useEffect(() => {
    if (!value.trim()) {
      setState("idle");
      return;
    }
    setState("checking");
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/check", { method: "POST", headers: apiHeaders(), body: JSON.stringify({ which: name }), signal: ctrl.signal });
        const data = (await res.json()) as { ok: boolean; models?: string[] };
        if (data.models) modelsCache.list = data.models;
        setState(data.ok ? "ok" : "bad");
      } catch {
        if (!ctrl.signal.aborted) setState("bad");
      }
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value, name]);

  return (
    <div className={cx("rounded-2xl p-3 transition", highlight ? "bg-[#fff6e5] ring-2 ring-[#ffb020]" : "bg-ink/[0.03]")}>
      <div className="mb-2 flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold">{label}</span>
          {required && <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">obrigatória</span>}
          <Status state={state} />
        </div>
        <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px] text-muted hover:text-ink">
          Obter chave <ExternalLink size={11} />
        </a>
      </div>
      <div className="relative">
        <input
          ref={input}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setKeys({ [name]: e.target.value.trim() })}
          placeholder={hint}
          autoComplete="off"
          spellCheck={false}
          className={cx(field, "bg-white pr-11 font-mono text-[13px] placeholder:font-sans placeholder:text-[14px]")}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Ocultar" : "Mostrar"}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function Status({ state }: { state: CheckState }) {
  if (state === "idle") return null;
  if (state === "checking") return <Spinner className="h-3.5 w-3.5 text-muted" />;
  return (
    <span className={cx("flex items-center gap-1 text-[12px] font-medium", state === "ok" ? "text-[#0f9d58]" : "text-[#d92d20]")}>
      <span className={cx("h-1.5 w-1.5 rounded-full", state === "ok" ? "bg-[#0f9d58]" : "bg-[#d92d20]")} />
      {state === "ok" ? "conectada" : "inválida"}
    </span>
  );
}

/* ───────────── Advanced ───────────── */

const LANGS: { id: Language; label: string }[] = [
  { id: "pt-BR", label: "Português" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
];

const SUGGESTED_MODELS = ["gpt-5-mini", "gpt-5", "gpt-4.1-mini", "gpt-4.1"];

function AdvancedSection() {
  const model = useSettings((s) => s.model);
  const setModel = useSettings((s) => s.setModel);
  const language = useSettings((s) => s.language);
  const setLanguage = useSettings((s) => s.setLanguage);
  const quality = useSettings((s) => s.quality);
  const setQuality = useSettings((s) => s.setQuality);
  const models = modelsCache.list.length ? modelsCache.list : SUGGESTED_MODELS;

  return (
    <Section title="Geração">
      <label className="mb-1.5 block px-0.5 text-[13px] font-medium">Texto</label>
      <div className="mb-1.5 grid grid-cols-2 gap-1 rounded-xl bg-ink/[0.04] p-1">
        {(
          [
            ["best", "Caprichado"],
            ["fast", "Rápido"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setQuality(id)}
            className={cx("h-9 rounded-lg text-[13.5px] font-medium transition", quality === id ? "bg-white shadow-sm" : "text-muted hover:text-ink")}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mb-5 px-0.5 text-[12px] text-muted">
        {quality === "best" ? "A IA pensa mais antes de escrever: textos melhores, um pouco mais lento." : "Resposta mais rápida, texto mais simples."}
      </p>

      <label className="mb-1.5 block px-0.5 text-[13px] font-medium">Modelo da OpenAI</label>
      <input list="openai-models" value={model} onChange={(e) => setModel(e.target.value)} className={cx(field, "font-mono text-[14px]")} />
      <datalist id="openai-models">
        {models.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <label className="mb-1.5 mt-5 block px-0.5 text-[13px] font-medium">Idioma do carrossel</label>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink/[0.04] p-1">
        {LANGS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLanguage(l.id)}
            className={cx("h-9 rounded-lg text-[13.5px] font-medium transition", language === l.id ? "bg-white shadow-sm" : "text-muted hover:text-ink")}
          >
            {l.label}
          </button>
        ))}
      </div>
    </Section>
  );
}
