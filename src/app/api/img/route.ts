import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PROXY_HOSTS } from "@/lib/server/images";

export const runtime = "nodejs";

// Pixabay links expire after a day and must not be hotlinked: the first request keeps a copy here
const KEEP_HOSTS = new Set(["pixabay.com", "cdn.pixabay.com"]);
const KEEP_DIR = path.join(process.cwd(), ".cache", "images");

const headers = (type: string) => ({ "Content-Type": type, "Cache-Control": "public, max-age=604800, immutable" });

/**
 * Same-origin image proxy so slides can be exported to PNG without CORS taint.
 * Restricted to the image providers we use.
 */
export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("u");
  let url: URL;
  try {
    url = new URL(target ?? "");
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (url.protocol !== "https:" || !PROXY_HOSTS.includes(url.hostname)) return new Response("host not allowed", { status: 403 });

  const keep = KEEP_HOSTS.has(url.hostname);
  const file = keep ? path.join(KEEP_DIR, createHash("sha1").update(url.toString()).digest("hex")) : "";
  if (keep) {
    const kept = await readFile(file).catch(() => null);
    if (kept) return new Response(kept, { headers: headers((await readFile(`${file}.type`, "utf8").catch(() => "")) || "image/jpeg") });
  }

  const upstream = await fetch(url, {
    headers: { "User-Agent": "GeradorCarrossel/0.1 (local news carousel tool)" },
    signal: AbortSignal.timeout(20000),
  }).catch(() => null);
  if (!upstream?.ok || !upstream.body) return new Response("upstream error", { status: 502 });
  const type = upstream.headers.get("content-type") ?? "image/jpeg";

  if (keep) {
    const body = Buffer.from(await upstream.arrayBuffer());
    await mkdir(KEEP_DIR, { recursive: true })
      .then(() => Promise.all([writeFile(file, body), writeFile(`${file}.type`, type)]))
      .catch(() => {});
    return new Response(body, { headers: headers(type) });
  }
  return new Response(upstream.body, { headers: headers(type) });
}
