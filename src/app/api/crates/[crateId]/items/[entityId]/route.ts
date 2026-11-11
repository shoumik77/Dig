import { crateStore } from "@/server/crates/store";
import { fromError, ok } from "../../../_lib/respond";

interface Ctx {
  params: Promise<{ crateId: string; entityId: string }>;
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { crateId, entityId } = await ctx.params;
  try {
    return ok(crateStore.removeItem(crateId, entityId));
  } catch (err) {
    return fromError(err);
  }
}
