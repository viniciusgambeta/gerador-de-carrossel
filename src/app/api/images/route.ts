import { errorResponse, json, keysFrom } from "@/lib/server/http";
import { findCutout, findImages, searchAll, searchPixabay } from "@/lib/server/images";
import { withUsage } from "@/lib/server/usage";

export const runtime = "nodejs";

interface Body {
  query: string;
  entity?: string | null;
  broad?: string;
  category?: string | null;
  headline?: string;
  slideText?: string;
  /** Manual search from the image picker: every source, no cascade */
  manual?: boolean;
  /** Only the named entity's own photo (people, parties in a conflict) */
  entityOnly?: boolean;
  /** An object with no background (Pixabay), to place next to the text */
  cutout?: boolean;
  /** Every object with no background for the query (image picker) */
  cutouts?: boolean;
}

export const POST = withUsage(async (req) => {
  try {
    const keys = keysFrom(req);
    const stockKeys = { unsplash: keys.unsplash, pixabay: keys.pixabay };
    const b = (await req.json()) as Body;
    if (b.cutout) return json({ cutout: await findCutout(keys.pixabay, b.query?.trim() ?? "") });
    if (b.cutouts) return json({ candidates: await searchPixabay(keys.pixabay, b.query?.trim() ?? "", { cutout: true, perPage: 24 }).catch(() => []), match: true });
    if (b.manual) return json({ candidates: await searchAll(b.query?.trim() ?? "", stockKeys), match: true });

    const result = await findImages({
      query: b.query?.trim() ?? "",
      entity: b.entity?.trim() || null,
      broad: b.broad,
      category: b.category,
      headline: b.headline ?? "",
      slideText: b.slideText ?? "",
      stockKeys,
      jevKey: keys.jev,
      entityOnly: b.entityOnly,
    });
    return json(result);
  } catch (err) {
    return errorResponse(err);
  }
});
