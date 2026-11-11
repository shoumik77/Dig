"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { createCrateService } from "@/lib/crateService";
import { crateTagline } from "@/lib/entityDisplay";
import { CrateCollage } from "./CrateCollage";
import type { CrateSummary } from "@/types/crate";
import type { MusicEntity } from "@/types/music";

interface CratesViewProps {
  crates: CrateSummary[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  onOpenCrate(id: string): void;
  onCreateCrate(name: string): Promise<unknown>;
}

/** "Your taste. Collected." — grid of personal crates. */
export function CratesView({
  crates,
  loading,
  error,
  demo,
  onOpenCrate,
  onCreateCrate,
}: CratesViewProps) {
  const service = useMemo(() => createCrateService(), []);
  const [previews, setPreviews] = useState<Record<string, MusicEntity[]>>({});
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);

  // fetch a few items per crate for the artwork collages
  useEffect(() => {
    let cancelled = false;
    const missing = crates.filter((c) => !(c.id in previews) && c.itemCount > 0);
    if (missing.length === 0) return;
    void Promise.all(
      missing.map((c) =>
        service
          .getDetail(c.id)
          .then((d): [string, MusicEntity[]] => [
            c.id,
            d.items.map((i) => i.entity),
          ])
          .catch((): [string, MusicEntity[]] => [c.id, []])
      )
    ).then((entries) => {
      if (cancelled) return;
      setPreviews((prev) => {
        const next = { ...prev };
        for (const [id, items] of entries) next[id] = items;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [crates, previews, service]);

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      if (await onCreateCrate(name)) setDraft("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain px-8 pb-10">
      <div className="flex items-baseline justify-between pt-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted/80">
          Your collections
        </span>
        <span className="text-xs text-muted">
          {crates.length} personal crate{crates.length === 1 ? "" : "s"}
        </span>
      </div>

      {error && <div className="mt-4 text-sm text-red-300/80">{error}</div>}
      {loading && crates.length === 0 && (
        <div className="mt-10 text-sm text-muted/70">Loading crates…</div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
        {crates.map((crate) => (
          <button
            key={crate.id}
            type="button"
            onClick={() => onOpenCrate(crate.id)}
            className="group flex flex-col items-start text-left"
          >
            <div className="flex w-full items-center justify-center rounded-lg bg-surface py-8 transition-colors duration-150 group-hover:bg-surface-2/70">
              <CrateCollage entities={previews[crate.id] ?? []} size={110} />
            </div>
            <div className="mt-4 flex w-full items-baseline justify-between">
              <span className="text-[22px] font-semibold tracking-tight text-text">
                {crate.name}
              </span>
              <ArrowUpRight
                size={18}
                className="text-muted/70 transition-colors duration-150 group-hover:text-text"
              />
            </div>
            <span className="mt-1 text-xs text-muted">
              {crate.itemCount} finds
            </span>
            <span className="mt-2 text-sm text-muted/90">
              {crateTagline(crate.id)}
            </span>
          </button>
        ))}

        {/* new crate card */}
        <form
          onSubmit={submitCreate}
          className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center"
        >
          <span className="text-sm text-muted">Start a new crate</span>
          <div className="flex w-full max-w-[220px] items-center gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Name it…"
              maxLength={80}
              aria-label="New crate name"
              className="min-w-0 flex-1 rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-text placeholder-muted/70 outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!draft.trim() || creating}
              aria-label="Create crate"
              className="shrink-0 rounded border border-border p-1.5 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </div>
        </form>
      </div>

      <div className="mt-auto border-t border-border pt-6 text-center sm:text-left">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted/70">
          A collection is a point of view.
        </div>
        <div className="mt-2 text-[22px] font-semibold tracking-tight text-text">
          Keep what moves you. Follow it somewhere new.
        </div>
        {demo && (
          <div className="mt-3 text-[11px] text-muted/70">
            Showing a curated preview of this demo collection.
          </div>
        )}
      </div>
    </div>
  );
}
