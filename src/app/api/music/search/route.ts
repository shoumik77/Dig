import { musicBrainzServerService } from "@/server/musicbrainz/service";
import { fail, fromError, ok, parseEntityType, parseLimit, parseQuery } from "../_lib/respond";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = parseQuery(url.searchParams.get("q"));
  if (!q) {
    return fail(400, "invalid", "Query parameter 'q' is required (1-200 chars)");
  }
  const type = parseEntityType(url.searchParams.get("type"));
  if (!type) {
    return fail(400, "invalid", "Query parameter 'type' must be label|artist|release");
  }
  const limit = parseLimit(url.searchParams.get("limit"));
  try {
    return ok(await musicBrainzServerService.search(q, type, limit));
  } catch (err) {
    return fromError(err);
  }
}
