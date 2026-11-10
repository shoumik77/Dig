import { getCapabilities } from "@/server/discogs/service";
import { ok } from "../_lib/respond";

export function GET() {
  return ok(getCapabilities(), {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
