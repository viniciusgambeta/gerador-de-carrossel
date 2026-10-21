"use client";

/** Publishing or scheduling the carousel on Instagram through the user's Postproxy account */

import { apiHeaders, toError } from "./api";
import { renderSlides, trackUsedPhotos } from "./export";

export const MAX_INSTAGRAM_IMAGES = 10;

export interface InstagramProfile {
  id: string;
  name: string;
  status: string;
}

export interface PublishedPost {
  id: string;
  status: string;
  scheduled_at?: string | null;
  platforms?: { platform: string; status: string; error?: string | { message?: string } | null }[];
}

/** Headers with the keys, for requests that are not JSON (the browser sets the multipart boundary) */
function keyHeaders() {
  const { "Content-Type": _json, ...rest } = apiHeaders();
  return rest;
}

export async function fetchInstagramProfiles(): Promise<InstagramProfile[]> {
  const res = await fetch("/api/publish?profiles=1", { headers: keyHeaders() });
  if (!res.ok) throw await toError(res);
  return ((await res.json()) as { profiles: InstagramProfile[] }).profiles;
}

/** Renders the chosen slides as JPEG (what Instagram takes) and sends them with the caption */
export async function publishToInstagram(opts: { ids: string[]; caption: string; profile: string; scheduledAt: string | null }): Promise<PublishedPost> {
  const files = await renderSlides(opts.ids, "jpeg");
  const form = new FormData();
  files.forEach((f) => form.append("images", new File([f.blob], f.name, { type: "image/jpeg" })));
  form.append("caption", opts.caption);
  form.append("profile", opts.profile);
  if (opts.scheduledAt) form.append("scheduledAt", opts.scheduledAt);
  const res = await fetch("/api/publish", { method: "POST", headers: keyHeaders(), body: form });
  if (!res.ok) throw await toError(res);
  trackUsedPhotos(opts.ids);
  return res.json();
}

export async function postStatus(id: string): Promise<PublishedPost> {
  const res = await fetch(`/api/publish?id=${encodeURIComponent(id)}`, { headers: keyHeaders() });
  if (!res.ok) throw await toError(res);
  return res.json();
}

/** Instagram's result for a post, once Postproxy knows it */
export function instagramOutcome(post: PublishedPost): { state: "pending" | "published" | "scheduled" | "failed"; error?: string } {
  const ig = post.platforms?.find((p) => p.platform === "instagram");
  if (ig?.status === "failed" || post.status === "media_processing_failed") {
    const e = ig?.error;
    return { state: "failed", error: typeof e === "string" ? e : (e?.message ?? undefined) };
  }
  if (ig?.status === "published") return { state: "published" };
  if (post.status === "scheduled" || post.scheduled_at) return { state: "scheduled" };
  return { state: "pending" };
}
