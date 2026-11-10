import { crateStore } from "@/server/crates/store";
import { fromError, ok, readJson } from "../../_lib/respond";

interface Ctx {
  params: Promise<{ crateId: string }>;
}

export async function POST(request: Request, ctx: Ctx) {
  const { crateId } = await ctx.params;
  try {
    const body = (await readJson(request)) as { entity?: unknown };
    return ok(crateStore.saveItem(crateId, body?.entity));
  } catch (err) {
    return fromError(err);
  }
}
