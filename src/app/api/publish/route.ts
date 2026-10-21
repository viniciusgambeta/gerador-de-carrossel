import { ApiError, errorResponse, json, keysFrom } from "@/lib/server/http";
import { createInstagramPost, getPost, instagramProfiles } from "@/lib/server/postproxy";

export const runtime = "nodejs";

/** Instagram allows up to 10 pictures per carousel through Postproxy */
const MAX_IMAGES = 10;
const MAX_BYTES = 8 * 1024 * 1024;

/** GET ?profiles: the connected Instagram accounts. GET ?id=…: status of a post sent before. */
export async function GET(req: Request) {
  try {
    const { postproxy } = keysFrom(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) return json(await getPost(postproxy, id));
    return json({ profiles: await instagramProfiles(postproxy) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Multipart: caption, profile, scheduledAt (ISO, optional), firstComment (optional), images[] (JPEG, in order) */
export async function POST(req: Request) {
  try {
    const { postproxy } = keysFrom(req);
    const form = await req.formData();
    const images = form.getAll("images").filter((f): f is File => f instanceof File);
    if (!images.length) throw new ApiError(400, "Nenhum slide para publicar.");
    if (images.length > MAX_IMAGES) throw new ApiError(400, `O Instagram aceita até ${MAX_IMAGES} imagens por carrossel.`);
    if (images.some((f) => f.size > MAX_BYTES)) throw new ApiError(400, "Uma das imagens passou de 8 MB.");
    const caption = String(form.get("caption") ?? "").slice(0, 2200);
    const scheduledAt = String(form.get("scheduledAt") ?? "") || null;
    if (scheduledAt && !(Date.parse(scheduledAt) > Date.now())) throw new ApiError(400, "Escolha um horário no futuro para agendar.");
    const post = await createInstagramPost(postproxy, {
      caption,
      profile: String(form.get("profile") ?? "") || "instagram",
      scheduledAt,
      firstComment: String(form.get("firstComment") ?? "") || null,
      images,
    });
    return json(post);
  } catch (err) {
    return errorResponse(err);
  }
}
