"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bookmark, BookmarkCheck, Check, Plus } from "lucide-react";
import type { Crate, CrateSummary } from "@/types/crate";
import type { MusicEntity } from "@/types/music";

interface SaveToCrateMenuProps {
  entity: MusicEntity;
  crates: CrateSummary[];
  /** crateIds already known to contain this entity */
  savedCrateIds?: ReadonlySet<string>;
  onSave(crateId: string, entity: MusicEntity): Promise<boolean>;
  onCreateCrate(name: string): Promise<Crate | undefined>;
}

export function SaveToCrateMenu({
  entity,
  crates,
  savedCrateIds,
  onSave,
  onCreateCrate,
}: SaveToCrateMenuProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const alreadySaved = (savedCrateIds?.size ?? 0) > 0;

  function flashSaved(name: string) {
    setSavedNote(name);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSavedNote(null);
      setOpen(false);
    }, 1400);
  }

  async function saveTo(crateId: string, name: string) {
    if (busy) return;
    setBusy(true);
    try {
      if (await onSave(crateId, entity)) flashSaved(name);
    } finally {
      setBusy(false);
    }
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const crate = await onCreateCrate(name);
      if (crate) {
        setDraft("");
        if (await onSave(crate.id, entity)) flashSaved(crate.name);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-sm text-muted transition-colors duration-150 hover:bg-surface-2"
      >
        {alreadySaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        {alreadySaved ? "Saved" : "Save to Crate"}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-60 rounded border border-border bg-surface-2 p-2 shadow-xl">
            <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted/70">
              Save to crate
            </div>
            {savedNote ? (
              <div className="flex items-center gap-1.5 px-1 py-2 text-xs text-text">
                <Check size={12} className="text-accent" />
                Saved to <span className="truncate font-medium">{savedNote}</span>
              </div>
            ) : (
              <>
                {crates.length === 0 && (
                  <div className="px-1 py-1 text-xs text-muted/70">
                    No crates yet
                  </div>
                )}
                <div className="max-h-40 overflow-y-auto">
                  {crates.map((crate) => {
                    const has = savedCrateIds?.has(crate.id) ?? false;
                    return (
                      <button
                        key={crate.id}
                        type="button"
                        disabled={busy}
                        onClick={() => void saveTo(crate.id, crate.name)}
                        className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left text-sm text-muted transition-colors duration-150 hover:bg-surface hover:text-text disabled:opacity-50"
                      >
                        <Bookmark
                          size={13}
                          className={has ? "shrink-0 text-accent" : "shrink-0 text-muted/70"}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {crate.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted/70">
                          {crate.itemCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <form
                  onSubmit={submitCreate}
                  className="mt-1 flex items-center gap-1 border-t border-border pt-2"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="New crate…"
                    maxLength={80}
                    aria-label="New crate name"
                    className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text placeholder-muted/70 outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || busy}
                    aria-label="Create crate and save"
                    className="shrink-0 rounded border border-border p-1 text-muted transition-colors duration-150 hover:bg-surface disabled:opacity-40"
                  >
                    <Plus size={13} />
                  </button>
                </form>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
