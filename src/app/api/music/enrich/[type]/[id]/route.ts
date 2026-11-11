import { isValidMbid } from "@/lib/mbIds";
import { getEnrichment } from "@/server/discogs/service";
import { fail, fromError, ok, parseEntityType } from "../../../_lib/respond";

interface Ctx {
  params: Promise<{ type: string; id: string }>;
}

export async function GET(_request: Request, ctx: Ctx) {
  const { type: rawType, id } = await ctx.params;
  const type = parseEntityType(rawType);
  if (!type || !isValidMbid(id)) {
    return fail(400, "invalid", "Invalid entity type or MusicBrainz id");
  }
  // Recordings have no Discogs concept; callers can hit this uniformly.
  if (type === "recording") {
    return ok(null, { headers: { "Cache-Control": "private, max-age=300" } });
  }
  try {
    const data = await getEnrichment(`mb:${type}:${id}`);
    return ok(data, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    return fromError(err);
  }
}
