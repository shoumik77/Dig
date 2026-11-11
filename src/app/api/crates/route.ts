import { crateStore } from "@/server/crates/store";
import { fromError, ok, readJson } from "./_lib/respond";

export function GET() {
  try {
    return ok(crateStore.list());
  } catch (err) {
    return fromError(err);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as { name?: unknown };
    return ok(crateStore.create(body?.name));
  } catch (err) {
    return fromError(err);
  }
}
