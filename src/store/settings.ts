"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_MODEL } from "@/lib/constants";
import { toStyleId, type StyleId } from "@/lib/styles";
import type { ApiKeys, BlockOverride, ConnectorShape, DisplayPrefs, Language, LayoutId, Profile, Quality } from "@/lib/types";

/** Block adjustments by "style:layout", then block id */
export type LayoutMemory = Record<string, Record<string, BlockOverride>>;

interface SettingsState {
  profile: Profile;
  keys: ApiKeys;
  model: string;
  language: Language;
  quality: Quality;
  style: StyleId;
  display: DisplayPrefs;
  connector: ConnectorShape;
  /** New carousels start with the positions, sizes and fonts the user last set, per style and format */
  rememberLayout: boolean;
  layoutMemory: LayoutMemory;
  setRememberLayout: (on: boolean) => void;
  /** Stores (or, with null, forgets) one block's adjustment for a format in the current style */
  rememberBlock: (layout: LayoutId, block: string, ov: BlockOverride | null) => void;
  forgetLayouts: (style?: StyleId) => void;
  setStyle: (s: StyleId) => void;
  setDisplay: (d: Partial<DisplayPrefs>) => void;
  setConnector: (c: ConnectorShape) => void;
  setProfile: (p: Partial<Profile>) => void;
  setKeys: (k: Partial<ApiKeys>) => void;
  setModel: (m: string) => void;
  setLanguage: (l: Language) => void;
  setQuality: (q: Quality) => void;
}

export const PALETTES: { name: string; primary: string; secondary: string }[] = [
  { name: "Elétrico", primary: "#1F4BFF", secondary: "#FFC93C" },
  { name: "Urgente", primary: "#E5262D", secondary: "#FFE14D" },
  { name: "Floresta", primary: "#0B7A55", secondary: "#C8F560" },
  { name: "Uva", primary: "#6B2BD9", secondary: "#FF8AD8" },
  { name: "Laranja", primary: "#FF5B14", secondary: "#2B1C6E" },
  { name: "Grafite", primary: "#141414", secondary: "#D7FF3A" },
];

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      profile: {
        name: "",
        handle: "",
        avatar: null,
        logo: null,
        primary: PALETTES[0].primary,
        secondary: PALETTES[0].secondary,
      },
      keys: { openai: "", unsplash: "", pixabay: "", jev: "", postproxy: "" },
      model: DEFAULT_MODEL,
      language: "pt-BR",
      quality: "best",
      style: "modern",
      display: { imageCredit: true, source: true, handle: true, avatar: true, pageNumber: true, summary: true },
      connector: "curved",
      rememberLayout: true,
      layoutMemory: {},
      setRememberLayout: (rememberLayout) => set({ rememberLayout }),
      rememberBlock: (layout, block, ov) =>
        set((s) => {
          const key = `${s.style}:${layout}`;
          const blocks = { ...s.layoutMemory[key] };
          if (ov) blocks[block] = ov;
          else delete blocks[block];
          const layoutMemory = { ...s.layoutMemory, [key]: blocks };
          if (!Object.keys(blocks).length) delete layoutMemory[key];
          return { layoutMemory };
        }),
      forgetLayouts: (style) =>
        set((s) => ({
          layoutMemory: style ? Object.fromEntries(Object.entries(s.layoutMemory).filter(([k]) => !k.startsWith(`${style}:`))) : {},
        })),
      setStyle: (style) => set({ style }),
      setDisplay: (d) => set((s) => ({ display: { ...s.display, ...d } })),
      setConnector: (connector) => set({ connector }),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setKeys: (k) => set((s) => ({ keys: { ...s.keys, ...k } })),
      setModel: (model) => set({ model }),
      setLanguage: (language) => set({ language }),
      setQuality: (quality) => set({ quality }),
    }),
    {
      name: "carrossel:settings",
      version: 2,
      // v2: Pexels (no longer issuing keys) replaced by Unsplash
      migrate: (persisted, version) => {
        const s = persisted as SettingsState & { keys: Partial<ApiKeys> & { pexels?: string } };
        if (version < 2) s.keys = { openai: s.keys?.openai ?? "", unsplash: "", pixabay: "", jev: s.keys?.jev ?? "", postproxy: "" };
        return s;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        const { connector: wasOn, ...display } = { ...current.display, ...p.display } as DisplayPrefs & { connector?: boolean };
        // New display options start with their default; renamed styles map to their successor;
        // the connector used to be an on/off switch
        return {
          ...current,
          ...p,
          keys: { ...current.keys, ...p.keys },
          display,
          connector: p.connector ?? (wasOn === false ? "none" : current.connector),
          style: toStyleId(p.style ?? current.style),
        };
      },
    },
  ),
);

export const handleOf = (p: Profile) => (p.handle ? `@${p.handle.replace(/^@/, "")}` : "@seuperfil");
