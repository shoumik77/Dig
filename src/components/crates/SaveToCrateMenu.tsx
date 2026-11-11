"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookmarkCheck, Check, Plus, X } from "lucide-react";
import { ENTITY_LABELS } from "@/components/graph/graphStyles";
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
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const alreadySaved = (savedCrateIds?.size ?? 0) > 0;
  const pickedCrate = crates.find((c) => c.id === picked) ?? null;

  function close() {
    setOpen(false);
    setPicked(null);
    setSavedNote(null);
  }

  function flashSaved(name: string) {
    setSavedNote(name);
    setPicked(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSavedNote(null);
      close();
    }, 1400);
  }

  async function confirm() {
    if (!pickedCrate || busy) return;
    setBusy(true);
    try {
      if (await onSave(pickedCrate.id, entity)) flashSaved(pickedCrate.name);
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
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium text-text transition-colors duration-150 hover:bg-border/60 enabled:active:scale-[0.96] motion-safe:transition-transform"
      >
        {alreadySaved ? <BookmarkCheck size={14} /> : <Plus size={14} />}
        {alreadySaved ? "Saved" : "Save to crate"}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.15 }}
              className="fixed inset-0 z-40 max-sm:bg-black/60"
              onClick={close}
            />
            <motion.div
              role="dialog"
              aria-label="Save to a crate"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-x-3 bottom-3 z-50 max-h-[70vh] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface-2 p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-full sm:left-0 sm:mb-2 sm:w-64 sm:max-h-none sm:rounded-lg sm:p-2"
            >
              {/* header — mobile sheet shows entity context */}
              <div className="flex items-start justify-between gap-2 px-1 pb-2 sm:pb-1">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text sm:text-[10px] sm:font-medium sm:uppercase sm:tracking-wider sm:text-muted/70">
                    Save to a crate
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted sm:hidden">
                    {entity.name} · {ENTITY_LABELS[entity.type]}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="rounded-md border border-border p-1.5 text-muted transition-colors duration-150 hover:text-text"
                >
                  <X size={13} />
                </button>
              </div>

              {savedNote ? (
                <div className="flex items-center gap-1.5 px-1 py-2 text-xs text-text">
                  <Check size={12} className="text-accent" />
                  Saved to <span className="truncate font-medium">{savedNote}</span>
                </div>
              ) : (
                <>
                  <div className="px-1 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted/70 sm:pt-1">
                    Your crates
                  </div>
                  {crates.length === 0 && (
                    <div className="px-1 py-1 text-xs text-muted/70">
                      No crates yet
                    </div>
                  )}
                  <div className="max-h-44 overflow-y-auto overscroll-contain">
                    {crates.map((crate) => {
                      const has = savedCrateIds?.has(crate.id) ?? false;
                      const isPicked = picked === crate.id;
                      return (
                        <button
                          key={crate.id}
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setPicked((p) => (p === crate.id ? null : crate.id))
                          }
                          aria-pressed={isPicked}
                          className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2.5 text-left transition-colors duration-150 disabled:opacity-50 sm:rounded sm:border-transparent sm:px-1.5 sm:py-1.5 ${
                            isPicked
                              ? "border-border bg-surface"
                              : "border-transparent hover:bg-surface"
                          }`}
                        >
                          <span
                            className={`h-8 w-8 shrink-0 rounded bg-surface sm:h-5 sm:w-5 sm:rounded-sm ${
                              has ? "outline-1 outline-accent/60" : ""
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-text">
                              {crate.name}
                            </span>
                            <span className="block text-xs text-muted/70">
                              {crate.itemCount} finds
                              {has ? " · saved" : ""}
                            </span>
                          </span>
                          <Plus
                            size={14}
                            className={`shrink-0 ${isPicked ? "text-accent" : "text-muted/70"}`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {pickedCrate ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void confirm()}
                      className="mt-2 flex w-full items-center justify-center rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-bg transition-colors duration-150 hover:bg-accent/85 enabled:active:scale-[0.96] disabled:opacity-50 motion-safe:transition-transform"
                    >
                      {busy ? "Saving…" : `Save to ${pickedCrate.name}`}
                    </button>
                  ) : (
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
                        className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1.5 text-xs text-text placeholder-muted/70 outline-none focus:border-accent"
                      />
                      <button
                        type="submit"
                        disabled={!draft.trim() || busy}
                        aria-label="Create crate and save"
                        className="shrink-0 rounded border border-border p-1.5 text-muted transition-colors duration-150 hover:bg-surface disabled:opacity-40"
                      >
                        <Plus size={13} />
                      </button>
                    </form>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
