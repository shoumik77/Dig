import { crateStore } from "@/server/crates/store";
import { fromError, ok, readJson } from "../_lib/respond";

interface Ctx {
  params: Promise<{ crateId: string }>;
}

export async function GET(_request: Request, ctx: Ctx) {
  const { crateId } = await ctx.params;
  try {
    return ok(crateStore.getDetail(crateId));
  } catch (err) {
    return fromError(err);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { crateId } = await ctx.params;
  try {
    const body = (await readJson(request)) as { name?: unknown };
    return ok(crateStore.rename(crateId, body?.name));
  } catch (err) {
    return fromError(err);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { crateId } = await ctx.params;
  try {
    return ok(crateStore.remove(crateId));
  } catch (err) {
    return fromError(err);
  }
}
