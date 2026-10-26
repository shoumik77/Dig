import { isValidMbid } from "@/lib/mbIds";
import { musicBrainzServerService } from "@/server/musicbrainz/service";
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
  try {
    const entity = await musicBrainzServerService.getEntity(type, id);
    if (!entity) return fail(404, "not_found", "Entity not found");
    return ok(entity);
  } catch (err) {
    return fromError(err);
  }
}
