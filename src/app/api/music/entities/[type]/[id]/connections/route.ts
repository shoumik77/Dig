import { isValidMbid } from "@/lib/mbIds";
import { musicBrainzServerService } from "@/server/musicbrainz/service";
import { fail, fromError, ok, parseEntityType, parseLimit } from "../../../../_lib/respond";

interface Ctx {
  params: Promise<{ type: string; id: string }>;
}

export async function GET(request: Request, ctx: Ctx) {
  const { type: rawType, id } = await ctx.params;
  const type = parseEntityType(rawType);
  if (!type || !isValidMbid(id)) {
    return fail(400, "invalid", "Invalid entity type or MusicBrainz id");
  }
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = parseLimit(url.searchParams.get("limit"));
  try {
    const page = await musicBrainzServerService.getConnections(type, id, {
      cursor,
      limit,
    });
    return ok(page);
  } catch (err) {
    return fromError(err);
  }
}
