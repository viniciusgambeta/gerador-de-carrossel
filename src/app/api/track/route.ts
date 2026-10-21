import { json, keysFrom } from "@/lib/server/http";

export const runtime = "nodejs";

/** Unsplash guidelines: ping each photo's download endpoint when it is actually used (exported). */
export async function POST(req: Request) {
  const { unsplash } = keysFrom(req);
  const { urls } = (await req.json()) as { urls: string[] };
  if (!unsplash || !Array.isArray(urls)) return json({ ok: false });
  const valid = urls.filter((u) => typeof u === "string" && u.startsWith("https://api.unsplash.com/")).slice(0, 30);
  await Promise.all(
    valid.map((u) =>
      fetch(u, { headers: { Authorization: `Client-ID ${unsplash}` }, signal: AbortSignal.timeout(8000) }).catch(() => null),
    ),
  );
  return json({ ok: true });
}
