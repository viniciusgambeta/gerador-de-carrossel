import { ApiError } from "./http";
import { recordOpenAI } from "./usage";

const URL = "https://api.openai.com/v1/chat/completions";

interface ChatOptions {
  key: string;
  model: string;
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  /** Reasoning models only: more effort = better writing, slower */
  effort?: "low" | "medium";
  signal?: AbortSignal;
}

const isReasoningModel = (model: string) => /^(gpt-5|o\d)/i.test(model);

function buildBody(o: ChatOptions, stream: boolean, dropped: Set<string>) {
  const body: Record<string, unknown> = {
    model: o.model,
    messages: [
      { role: "system", content: o.system },
      { role: "user", content: o.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: o.schemaName, strict: true, schema: o.schema },
    },
  };
  if (stream) {
    body.stream = true;
    // The last chunk then carries the token count, for the cost estimate
    body.stream_options = { include_usage: true };
  }
  if (isReasoningModel(o.model)) {
    if (!dropped.has("reasoning_effort")) body.reasoning_effort = o.effort ?? "low";
  } else if (!dropped.has("temperature")) {
    body.temperature = 0.7;
  }
  return body;
}

function friendly(status: number, message: string, model: string): ApiError {
  if (status === 401) return new ApiError(401, "Chave da OpenAI inválida. Confira nas configurações.", "openai_key");
  if (status === 404 || /model.*(not exist|not found|does not have access)/i.test(message))
    return new ApiError(400, `O modelo "${model}" não está disponível na sua conta OpenAI.`, "openai_model");
  if (status === 429)
    return new ApiError(429, /quota|billing/i.test(message) ? "Sua conta OpenAI está sem créditos." : "Muitas requisições à OpenAI. Aguarde alguns segundos.");
  return new ApiError(502, `OpenAI: ${message.slice(0, 200)}`);
}

/** POST with automatic retry when the chosen model rejects an optional parameter. */
async function post(o: ChatOptions, stream: boolean): Promise<Response> {
  const dropped = new Set<string>();
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${o.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildBody(o, stream, dropped)),
      signal: o.signal,
    });
    if (res.ok) return res;
    const raw = await res.text();
    let err: { message?: string; param?: string } | undefined;
    try {
      err = JSON.parse(raw).error;
    } catch {}
    const message = err?.message ?? raw;
    if (res.status === 400) {
      const param = ["reasoning_effort", "temperature"].find((p) => err?.param === p || message.includes(p));
      if (param && !dropped.has(param)) {
        dropped.add(param);
        continue;
      }
    }
    throw friendly(res.status, message, o.model);
  }
  throw new ApiError(502, "OpenAI recusou a requisição.");
}

/** Opens a streaming completion. Errors (bad key, model…) throw before any byte is returned. */
export async function openChatStream(o: ChatOptions): Promise<AsyncGenerator<string>> {
  const res = await post(o, true);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  async function* chunks() {
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        let delta: { content?: string; refusal?: string } | undefined;
        try {
          const parsed = JSON.parse(data);
          if (parsed.usage) recordOpenAI(o.model, parsed.usage);
          delta = parsed.choices?.[0]?.delta;
        } catch {
          continue;
        }
        if (delta?.refusal) throw new ApiError(422, "A IA se recusou a processar esta notícia.");
        if (delta?.content) yield delta.content;
      }
    }
  }
  return chunks();
}

export async function chatJSON<T>(o: ChatOptions): Promise<T> {
  const res = await post(o, false);
  const data = await res.json();
  recordOpenAI(o.model, data.usage);
  const msg = data.choices?.[0]?.message;
  if (msg?.refusal) throw new ApiError(422, "A IA se recusou a processar esta notícia.");
  try {
    return JSON.parse(msg?.content ?? "") as T;
  } catch {
    throw new ApiError(502, "A IA devolveu uma resposta incompleta. Tente de novo.");
  }
}

export async function listModels(key: string): Promise<string[]> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw friendly(res.status, await res.text(), "");
  const data = (await res.json()) as { data: { id: string }[] };
  return data.data
    .map((m) => m.id)
    .filter((id) => /^(gpt-|o\d|chatgpt)/.test(id) && !/(audio|realtime|transcribe|tts|image|search|instruct|codex)/.test(id))
    .sort();
}
