import { json, keysFrom } from "@/lib/server/http";
import { checkJevKey } from "@/lib/server/jev";
import { listModels } from "@/lib/server/openai";
import { instagramProfiles } from "@/lib/server/postproxy";

export const runtime = "nodejs";

/** Validates one API key; for OpenAI also returns the chat models the key can use. */
export async function POST(req: Request) {
  const keys = keysFrom(req);
  const { which } = (await req.json()) as { which: "openai" | "unsplash" | "pixabay" | "jev" | "postproxy" };
  try {
    if (which === "openai") {
      if (!keys.openai) return json({ ok: false });
      const models = await listModels(keys.openai);
      return json({ ok: true, models });
    }
    if (which === "unsplash") {
      if (!keys.unsplash) return json({ ok: false });
      const res = await fetch("https://api.unsplash.com/search/photos?query=news&per_page=1", {
        headers: { Authorization: `Client-ID ${keys.unsplash}`, "Accept-Version": "v1" },
        signal: AbortSignal.timeout(8000),
      });
      return json({ ok: res.ok });
    }
    if (which === "pixabay") {
      if (!keys.pixabay) return json({ ok: false });
      const u = new URL("https://pixabay.com/api/");
      u.searchParams.set("key", keys.pixabay);
      u.searchParams.set("q", "news");
      u.searchParams.set("per_page", "3");
      const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
      return json({ ok: res.ok });
    }
    if (which === "postproxy") {
      if (!keys.postproxy) return json({ ok: false });
      // Valid key; also tells how many Instagram accounts are connected to it
      const profiles = await instagramProfiles(keys.postproxy);
      return json({ ok: true, instagram: profiles.length });
    }
    if (which === "jev") {
      if (!keys.jev) return json({ ok: false });
      return json({ ok: await checkJevKey(keys.jev) });
    }
    return json({ ok: false }, 400);
  } catch {
    return json({ ok: false });
  }
}
