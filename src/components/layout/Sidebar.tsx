"use client";

import { ArrowRight, Bookmark, History, Plus, X } from "lucide-react";
import { ENTITY_COLORS } from "@/components/graph/graphStyles";
import type { GraphMode } from "@/lib/graphServiceRegistry";
import type { CrateSummary } from "@/types/crate";
import type { MusicEntity } from "@/types/music";

export const DEMO_GENRES = ["House", "UK Garage", "French House", "Disco"];

const MODE_CAPTIONS: Record<GraphMode, string> = {
  demo: "Illustrative demo data",
  live: "Live metadata from MusicBrainz",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted/80">
      {children}
    </div>
  );
}

export function ModeSwitch({
  mode,
  onModeChange,
}: {
  mode: GraphMode;
  onModeChange(mode: GraphMode): void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Data source"
      className="flex gap-0.5 rounded-md border border-border bg-bg p-0.5"
    >
      {(["demo", "live"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => onModeChange(m)}
          className={`flex-1 rounded px-3 py-1.5 text-xs capitalize transition-colors duration-150 enabled:active:scale-[0.96] motion-safe:transition-transform ${
            mode === m ? "bg-surface-2 text-text" : "text-muted hover:text-text"
          }`}
        >
          {m === "demo" ? "Demo" : "Live"}
        </button>
      ))}
    </div>
  );
}

interface NavDrawerProps {
  mode: GraphMode;
  onModeChange(mode: GraphMode): void;
  /** chips to render — demo list in demo mode, Discogs-derived in live */
  genres: string[];
  activeGenres: ReadonlySet<string>;
  onToggleGenre(genre: string): void;
  /** small grey suffix on the Genres header, e.g. "(demo only)" */
  genreCaption?: string;
  /** shown when `genres` is empty */
  genreEmptyText?: string;
  crates: CrateSummary[];
  onOpenCrates(): void;
  onOpenCrate(id: string): void;
  onCreateCrate(): void;
  recent: MusicEntity[];
  onSelectRecent(id: string): void;
  onClose(): void;
}

/** Content of the expanded rail drawer — mode, genres, crates, recents. */
export function NavDrawer({
  mode,
  onModeChange,
  genres,
  activeGenres,
  onToggleGenre,
  genreCaption,
  genreEmptyText,
  crates,
  onOpenCrates,
  onOpenCrate,
  onCreateCrate,
  recent,
  onSelectRecent,
  onClose,
}: NavDrawerProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <span className="text-sm font-semibold tracking-tight">Menu</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="rounded p-1.5 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
        >
          <X size={15} />
        </button>
      </div>

      <div className="px-4 pt-4">
        <div className="mb-2">
          <SectionLabel>Data source</SectionLabel>
        </div>
        <ModeSwitch mode={mode} onModeChange={onModeChange} />
        <div className="px-1 pt-1.5 text-[11px] text-muted/80">
          {MODE_CAPTIONS[mode]}
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="mb-2 flex items-baseline gap-1.5">
          <SectionLabel>Genres</SectionLabel>
          {genreCaption && (
            <span className="text-[10px] text-muted/60">{genreCaption}</span>
          )}
        </div>
        {genres.length === 0 ? (
          genreEmptyText && (
            <div className="text-xs text-muted/70">{genreEmptyText}</div>
          )
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {genres.map((genre) => {
              const active = activeGenres.has(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => onToggleGenre(genre)}
                  aria-pressed={active}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 ${
                    active
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-border text-muted hover:border-muted/40 hover:text-text"
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 pt-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bookmark size={11} className="text-muted/80" />
            <SectionLabel>Crates</SectionLabel>
          </div>
          <button
            type="button"
            onClick={onCreateCrate}
            aria-label="New crate"
            className="rounded p-1 text-muted/80 transition-colors duration-150 hover:text-text"
          >
            <Plus size={13} />
          </button>
        </div>
        {crates.length === 0 ? (
          <div className="text-xs text-muted/70">
            No crates yet — save entities from the details panel
          </div>
        ) : (
          <>
            {crates.slice(0, 5).map((crate) => (
              <button
                key={crate.id}
                type="button"
                onClick={() => onOpenCrate(crate.id)}
                className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left text-sm text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
              >
                <span className="truncate">{crate.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted/70">
                  {crate.itemCount}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={onOpenCrates}
              className="mt-1 flex items-center gap-1 px-1 py-1 text-xs text-muted/80 transition-colors duration-150 hover:text-text"
            >
              All crates <ArrowRight size={11} />
            </button>
          </>
        )}
      </div>

      <div className="px-4 py-5">
        <div className="mb-1.5 flex items-center gap-1.5">
          <History size={11} className="text-muted/80" />
          <SectionLabel>Recently Explored</SectionLabel>
        </div>
        {recent.length === 0 ? (
          <div className="text-xs text-muted/70">Nothing yet</div>
        ) : (
          recent.map((entity) => (
            <button
              key={entity.id}
              type="button"
              onClick={() => onSelectRecent(entity.id)}
              className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: ENTITY_COLORS[entity.type] }}
              />
              <span className="truncate">{entity.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
