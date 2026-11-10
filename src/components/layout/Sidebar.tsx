"use client";

import { Bookmark, Compass, History, Search } from "lucide-react";
import { ENTITY_COLORS } from "@/components/graph/graphStyles";
import { CrateList, type CrateListProps } from "@/components/crates/CrateList";
import type { GraphMode } from "@/lib/graphServiceRegistry";
import type { MusicEntity } from "@/types/music";

export const DEMO_GENRES = ["House", "UK Garage", "French House", "Disco"];

const MODE_CAPTIONS: Record<GraphMode, string> = {
  demo: "Illustrative demo data",
  live: "Live metadata from MusicBrainz",
};

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted">
      {children}
    </kbd>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted/80">
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
          className={`flex-1 rounded px-3 py-1.5 text-xs capitalize transition-colors duration-150 ${
            mode === m
              ? "bg-surface-2 text-text"
              : "text-muted hover:text-text"
          }`}
        >
          {m === "demo" ? "Demo" : "Live"}
        </button>
      ))}
    </div>
  );
}

interface SidebarProps {
  recent: MusicEntity[];
  onSelectRecent(id: string): void;
  onSearchClick(): void;
  activeGenres: ReadonlySet<string>;
  onToggleGenre(genre: string): void;
  mode: GraphMode;
  onModeChange(mode: GraphMode): void;
  /** chips to render — demo list in demo mode, Discogs-derived in live */
  genres: string[];
  /** small grey suffix on the Genres header, e.g. "(demo only)" */
  genreCaption?: string;
  /** shown when `genres` is empty */
  genreEmptyText?: string;
  crateList: CrateListProps;
}

export function Sidebar({
  recent,
  onSelectRecent,
  onSearchClick,
  activeGenres,
  onToggleGenre,
  mode,
  onModeChange,
  genres,
  genreCaption,
  genreEmptyText,
  crateList,
}: SidebarProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface">
      {/* brand */}
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/15 text-accent">
          <Compass size={16} strokeWidth={2.25} />
        </div>
        <div>
          <div className="text-[15px] font-semibold leading-tight tracking-tight">
            Dig
          </div>
          <div className="text-[11px] text-muted">Follow the sound.</div>
        </div>
      </div>

      {/* search trigger */}
      <div className="px-3">
        <button
          type="button"
          onClick={onSearchClick}
          className="flex w-full items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm text-muted transition-colors duration-150 hover:border-muted/40 hover:text-text"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Search</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      {/* nav */}
      <nav className="px-3 pt-4 text-sm">
        <SectionLabel>Explore</SectionLabel>
        <div className="px-1 pb-1">
          <ModeSwitch mode={mode} onModeChange={onModeChange} />
          <div className="px-2 pt-1.5 text-[11px] text-muted/80">
            {MODE_CAPTIONS[mode]}
          </div>
        </div>
        <div className="mt-2">
          <div className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted/80">
            <Bookmark size={11} /> Crates
          </div>
          <CrateList {...crateList} />
        </div>
      </nav>

      {/* recently explored */}
      <div className="px-4 pt-5">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted/80">
          <History size={11} /> Recently Explored
        </div>
        {recent.length === 0 && (
          <div className="text-xs text-muted/70">Nothing yet</div>
        )}
        {recent.map((entity) => (
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
        ))}
      </div>

      {/* genre filters */}
      <div className="px-4 py-5">
        <div className="mb-2 flex items-baseline gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted/80">
          Genres
          {genreCaption && (
            <span className="normal-case tracking-normal text-muted/60">
              {genreCaption}
            </span>
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
    </div>
  );
}
