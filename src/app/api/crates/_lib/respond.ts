import { GraphServiceError } from "@/lib/graphErrors";
import {
  fail as baseFail,
  ok as baseOk,
  STATUS_BY_KIND,
} from "../../_lib/respond";

export function ok(data: unknown): Response {
  return baseOk(data, { headers: { "Cache-Control": "no-store" } });
}

// Store errors carry fixed, controlled messages — safe to forward, unlike
// upstream errors which may embed URLs.
export function fromError(err: unknown): Response {
  if (err instanceof GraphServiceError && STATUS_BY_KIND[err.kind]) {
    return baseFail(STATUS_BY_KIND[err.kind], err.kind, err.message);
  }
  return baseFail(500, "upstream", "Internal error");
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new GraphServiceError("invalid", "Invalid JSON body");
  }
}
