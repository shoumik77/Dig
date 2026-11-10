"use client";

import { useState, type FormEvent } from "react";
import {
  Bookmark,
  Check,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { ENTITY_COLORS } from "@/components/graph/graphStyles";
import type { Crate, CrateItem, CrateSummary } from "@/types/crate";

export interface CrateListProps {
  crates: CrateSummary[];
  loading: boolean;
  error: string | null;
  openCrateId: string | null;
  items: CrateItem[];
  onToggleCrate(id: string): void;
  onCreateCrate(name: string): Promise<Crate | undefined>;
  onRenameCrate(id: string, name: string): void;
  onDeleteCrate(id: string): void;
  onOpenItem(item: CrateItem): void;
  onRemoveItem(crateId: string, entityId: string): void;
}

const iconBtn =
  "shrink-0 rounded p-0.5 text-muted/70 opacity-0 transition-opacity duration-150 hover:text-text group-hover:opacity-100";

export function CrateList({
  crates,
  loading,
  error,
  openCrateId,
  items,
  onToggleCrate,
  onCreateCrate,
  onRenameCrate,
  onDeleteCrate,
  onOpenItem,
  onRemoveItem,
}: CrateListProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

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

  function startRename(crate: CrateSummary) {
    setRenamingId(crate.id);
    setRenameDraft(crate.name);
  }

  function submitRename(e: FormEvent, id: string) {
    e.preventDefault();
    const name = renameDraft.trim();
    if (name) onRenameCrate(id, name);
    setRenamingId(null);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 rounded px-3 py-2 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
      >
        <Bookmark size={15} /> Saved Crates
        <span className="ml-auto text-xs">{crates.length}</span>
        <ChevronDown
          size={13}
          className={`text-muted/70 transition-transform duration-150 ${expanded ? "" : "-rotate-90"}`}
        />
      </button>

      {expanded && (
        <div className="px-1 pb-1">
          <form
            onSubmit={submitCreate}
            className="flex items-center gap-1 px-2 py-1"
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
              disabled={!draft.trim() || creating}
              aria-label="Create crate"
              className="shrink-0 rounded border border-border p-1 text-muted transition-colors duration-150 hover:bg-surface-2 disabled:opacity-40"
            >
              <Plus size={13} />
            </button>
          </form>

          {error && (
            <div className="px-2 py-1 text-xs text-red-300/80">{error}</div>
          )}

          {loading && crates.length === 0 ? (
            <div className="px-2 py-1 text-xs text-muted/60">Loading…</div>
          ) : crates.length === 0 ? (
            <div className="px-2 py-1 text-xs text-muted/60">
              No crates yet — save entities from the details panel
            </div>
          ) : (
            crates.map((crate) => {
              const open = openCrateId === crate.id;
              return (
                <div key={crate.id}>
                  <div className="group flex items-center rounded px-1 py-1 text-sm text-muted transition-colors duration-150 hover:bg-surface-2">
                    {renamingId === crate.id ? (
                      <form
                        onSubmit={(e) => submitRename(e, crate.id)}
                        className="flex min-w-0 flex-1 items-center gap-1"
                      >
                        <input
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Escape" && setRenamingId(null)
                          }
                          onBlur={() => setRenamingId(null)}
                          maxLength={80}
                          autoFocus
                          aria-label="Rename crate"
                          className="min-w-0 flex-1 rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-text outline-none focus:border-accent"
                        />
                        <button
                          type="submit"
                          aria-label="Confirm rename"
                          className="shrink-0 rounded p-0.5 text-muted hover:text-text"
                        >
                          <Check size={12} />
                        </button>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onToggleCrate(crate.id)}
                          aria-expanded={open}
                          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                        >
                          <ChevronDown
                            size={12}
                            className={`shrink-0 text-muted/70 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
                          />
                          <span className="truncate">{crate.name}</span>
                          <span className="ml-auto shrink-0 text-xs text-muted/70">
                            {crate.itemCount}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => startRename(crate)}
                          aria-label={`Rename ${crate.name}`}
                          className={iconBtn}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCrate(crate.id)}
                          aria-label={`Delete ${crate.name}`}
                          className={`${iconBtn} hover:text-red-300`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>

                  {open && (
                    <div className="mb-1 ml-3 border-l border-border pl-1">
                      {items.length === 0 ? (
                        <div className="px-2 py-1 text-xs text-muted/60">
                          Empty crate
                        </div>
                      ) : (
                        items.map((item) => (
                          <div
                            key={item.entityId}
                            className="group flex items-center rounded hover:bg-surface-2"
                          >
                            <button
                              type="button"
                              onClick={() => onOpenItem(item)}
                              className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left text-[13px] text-muted transition-colors duration-150 hover:text-text"
                            >
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{
                                  backgroundColor:
                                    ENTITY_COLORS[item.entity.type],
                                }}
                              />
                              <span className="truncate">
                                {item.entity.name}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onRemoveItem(item.crateId, item.entityId)
                              }
                              aria-label={`Remove ${item.entity.name}`}
                              className={iconBtn}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
