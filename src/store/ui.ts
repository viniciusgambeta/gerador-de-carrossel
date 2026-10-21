"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SettingsField = "openai" | "unsplash" | "pixabay" | "jev" | "postproxy" | "handle" | null;

export interface Toast {
  id: number;
  message: string;
  tone: "default" | "error" | "success";
  action?: { label: string; run: () => void };
}

interface UIState {
  settingsOpen: boolean;
  settingsFocus: SettingsField;
  toasts: Toast[];
  /** slides (by id) currently rendered for export, with progress */
  exporting: { ids: string[]; done: number } | null;
  imagePickerFor: string | null;
  /** "slide": the slide's own photo; "extra": a picture added on top */
  imagePickerMode: "slide" | "extra";
  captionOpen: boolean;
  hintSeen: boolean;
  /** The "your adjustments are remembered" notice was shown */
  memoryHintSeen: boolean;
  publishOpen: boolean;
  /** Link the user tried before adding the OpenAI key; resumes when settings close */
  pendingUrl: { url: string; key: string } | null;
  setPendingUrl: (url: string | null, key?: string) => void;
  openSettings: (focus?: SettingsField) => void;
  closeSettings: () => void;
  toast: (message: string, opts?: Partial<Omit<Toast, "id" | "message">>) => void;
  dismiss: (id: number) => void;
  setExporting: (e: UIState["exporting"]) => void;
  openImagePicker: (slideId: string | null, mode?: "slide" | "extra") => void;
  setCaptionOpen: (open: boolean) => void;
  markHintSeen: () => void;
  markMemoryHintSeen: () => void;
  setPublishOpen: (open: boolean) => void;
}

let toastId = 0;

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      settingsOpen: false,
      settingsFocus: null,
      toasts: [],
      exporting: null,
      imagePickerFor: null,
      imagePickerMode: "slide",
      captionOpen: false,
      hintSeen: false,
      memoryHintSeen: false,
      publishOpen: false,
      pendingUrl: null,
      setPendingUrl: (url, key = "") => set({ pendingUrl: url ? { url, key } : null }),
      openSettings: (focus = null) => set({ settingsOpen: true, settingsFocus: focus }),
      closeSettings: () => set({ settingsOpen: false, settingsFocus: null }),
      toast: (message, opts) => {
        const id = ++toastId;
        set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, tone: "default", ...opts }] }));
        setTimeout(() => get().dismiss(id), opts?.action ? 6000 : 3800);
      },
      dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      setExporting: (exporting) => set({ exporting }),
      openImagePicker: (imagePickerFor, imagePickerMode = "slide") => set({ imagePickerFor, imagePickerMode }),
      setCaptionOpen: (captionOpen) => set({ captionOpen }),
      markHintSeen: () => set({ hintSeen: true }),
      markMemoryHintSeen: () => set({ memoryHintSeen: true }),
      setPublishOpen: (publishOpen) => set({ publishOpen }),
    }),
    { name: "carrossel:ui", partialize: (s) => ({ hintSeen: s.hintSeen, memoryHintSeen: s.memoryHintSeen }) },
  ),
);

export const toast = (...args: Parameters<UIState["toast"]>) => useUI.getState().toast(...args);
