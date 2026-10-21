import { ApiError } from "./http";

/**
 * Postproxy (postproxy.dev): publishes or schedules posts on the user's connected social accounts.
 * The user's own API key comes with each request; the slides go up as files (multipart).
 */

const BASE = "https://api.postproxy.dev/api";

export interface PostproxyProfile {
  id: string;
  name: string;
  platform: string;
  status: string;
}

export interface PostproxyPost {
  id: string;
  status: string;
  scheduled_at?: string | null;
  platforms?: { platform: string; status: string; error?: string | { message?: string } | null }[];
}

async function call<T>(key: string, path: string, init: RequestInit = {}): Promise<T> {
  if (!key) throw new ApiError(401, "Adicione sua chave da Postproxy nas configurações.", "missing_postproxy_key");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json", ...init.headers },
    signal: init.signal ?? AbortSignal.timeout(90_000),
  }).catch(() => null);
  if (!res) throw new ApiError(502, "Não consegui falar com a Postproxy. Tente de novo.");
  const data = (await res.json().catch(() => null)) as (T & { error?: string; errors?: unknown; message?: string }) | null;
  if (res.status === 401 || res.status === 403) throw new ApiError(401, "A Postproxy recusou a chave. Confira nas configurações.", "bad_postproxy_key");
  if (!res.ok || !data) {
    const detail = data?.error ?? data?.message ?? (data?.errors ? JSON.stringify(data.errors) : "");
    throw new ApiError(res.status >= 500 ? 502 : 400, `A Postproxy não aceitou o post${detail ? `: ${detail}` : "."}`);
  }
  return data;
}

/** Instagram accounts connected to the key's workspace */
export async function instagramProfiles(key: string): Promise<PostproxyProfile[]> {
  const data = await call<{ data?: PostproxyProfile[] } | PostproxyProfile[]>(key, "/profiles", { signal: AbortSignal.timeout(10_000) });
  const list = Array.isArray(data) ? data : (data.data ?? []);
  return list.filter((p) => p.platform === "instagram");
}

/** A feed post (carousel when there are several images), now or at `scheduledAt` (ISO, UTC) */
export async function createInstagramPost(
  key: string,
  opts: { caption: string; profile: string; scheduledAt?: string | null; firstComment?: string | null; images: File[] },
): Promise<PostproxyPost> {
  const form = new FormData();
  form.append("post[body]", opts.caption);
  if (opts.scheduledAt) form.append("post[scheduled_at]", opts.scheduledAt);
  form.append("profiles[]", opts.profile || "instagram");
  form.append("platforms[instagram][format]", "post");
  if (opts.firstComment) form.append("platforms[instagram][first_comment]", opts.firstComment);
  opts.images.forEach((img) => form.append("media[]", img, img.name));
  return call<PostproxyPost>(key, "/posts", { method: "POST", body: form });
}

export async function getPost(key: string, id: string): Promise<PostproxyPost> {
  return call<PostproxyPost>(key, `/posts/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(10_000) });
}
