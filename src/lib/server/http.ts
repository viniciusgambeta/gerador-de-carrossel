import type { ApiKeys } from "../types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) return json({ error: err.message, code: err.code }, err.status);
  if (err instanceof Error && err.name === "TimeoutError")
    return json({ error: "O serviço demorou demais para responder. Tente de novo." }, 504);
  console.error(err);
  return json({ error: "Algo deu errado. Tente de novo." }, 500);
}

export function keysFrom(req: Request): ApiKeys & { model: string; effort: "low" | "medium" } {
  const h = req.headers;
  return {
    effort: h.get("x-quality") === "fast" ? "low" : "medium",
    openai: h.get("x-openai-key")?.trim() ?? "",
    unsplash: h.get("x-unsplash-key")?.trim() ?? "",
    pixabay: h.get("x-pixabay-key")?.trim() ?? "",
    jev: h.get("x-jev-key")?.trim() ?? "",
    postproxy: h.get("x-postproxy-key")?.trim() ?? "",
    model: h.get("x-openai-model")?.trim() || "gpt-5-mini",
  };
}

export function requireOpenAI(key: string) {
  if (!key) throw new ApiError(401, "Adicione sua chave da OpenAI nas configurações.", "missing_openai_key");
}
