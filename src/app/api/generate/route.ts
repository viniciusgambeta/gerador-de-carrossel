import { errorResponse, keysFrom, requireOpenAI } from "@/lib/server/http";
import { openChatStream } from "@/lib/server/openai";
import { currentUsage, runMetered } from "@/lib/server/usage";
import { generatePrompt } from "@/lib/prompts";
import { CAROUSEL_SCHEMA } from "@/lib/schema";
import { STREAM_ERROR, STREAM_USAGE } from "@/lib/constants";
import type { Article, Language } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  return runMetered(async () => {
    try {
      const keys = keysFrom(req);
      requireOpenAI(keys.openai);
      const { article, language } = (await req.json()) as { article: Article; language: Language };
      const { system, user } = generatePrompt(article, language ?? "pt-BR");

      const chunks = await openChatStream({
        key: keys.openai,
        model: keys.model,
        system,
        user,
        schemaName: "carousel",
        schema: CAROUSEL_SCHEMA,
        effort: keys.effort,
        signal: req.signal,
      });

      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
            // Headers are long gone: the token count travels at the end of the text
            const usage = currentUsage();
            if (usage) controller.enqueue(encoder.encode(STREAM_USAGE + JSON.stringify(usage)));
          } catch (err) {
            if (!req.signal.aborted) controller.enqueue(encoder.encode(STREAM_ERROR + ((err as Error).message || "falha na geração")));
          }
          controller.close();
        },
      });
      return new Response(body, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
      });
    } catch (err) {
      return errorResponse(err);
    }
  });
}
