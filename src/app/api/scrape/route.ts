import { errorResponse, json, keysFrom } from "@/lib/server/http";
import { scrapeArticle } from "@/lib/server/scrape";
import { withUsage } from "@/lib/server/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = withUsage(async (req) => {
  try {
    const { url } = (await req.json()) as { url: string };
    const article = await scrapeArticle(url, keysFrom(req).jev);
    return json(article);
  } catch (err) {
    return errorResponse(err);
  }
});
