"use client";

import { Bookmark, Compass, Disc3, History, Search } from "lucide-react";
import { ENTITY_COLORS } from "@/components/graph/graphStyles";
import type { MusicEntity } from "@/types/music";

const GENRES = ["House", "UK Garage", "French House", "Disco"];

interface SidebarProps {
  recent: MusicEntity[];
  onSelectRecent(id: string): void;
  onSearchClick(): void;
  activeGenres: ReadonlySet<string>;
  onToggleGenre(genre: string): void;
}

export function Sidebar({
  recent,
  onSelectRecent,
  onSearchClick,
  activeGenres,
  onToggleGenre,
}: SidebarProps) {
  return (
    <div className="flex h-full flex-col bg-surface">
      {/* brand */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <Disc3 size={22} style={{ color: ENTITY_COLORS.label }} />
        <div>
          <div className="text-base font-semibold leading-tight">Dig</div>
          <div className="text-[11px] text-zinc-500">Follow the sound.</div>
        </div>
      </div>

      {/* nav */}
      <nav className="border-b border-border px-2 py-2 text-sm">
        <div className="flex items-center gap-2 rounded bg-surface-2 px-3 py-2 text-zinc-100">
          <Compass size={15} className="text-zinc-400" /> Dig Mode
        </div>
        <button
          type="button"
          onClick={onSearchClick}
          className="flex w-full items-center gap-2 rounded px-3 py-2 text-zinc-400 transition-colors duration-150 hover:bg-surface-2 hover:text-zinc-100"
        >
          <Search size={15} /> Search
        </button>
        <div className="flex w-full items-center gap-2 rounded px-3 py-2 text-zinc-500">
          <Bookmark size={15} /> Saved Crates
          <span className="ml-auto text-xs">0</span>
          <span className="rounded border border-border px-1 py-0.5 text-[9px] uppercase text-zinc-500">
            Soon
          </span>
        </div>
      </nav>

      {/* recently explored */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          <History size={11} /> Recently Explored
        </div>
        {recent.length === 0 && (
          <div className="text-xs text-zinc-600">Nothing yet</div>
        )}
        {recent.map((entity) => (
          <button
            key={entity.id}
            type="button"
            onClick={() => onSelectRecent(entity.id)}
            className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm text-zinc-300 transition-colors duration-150 hover:bg-surface-2 hover:text-zinc-100"
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
      <div className="px-4 py-3">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Genres
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GENRES.map((genre) => {
            const active = activeGenres.has(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => onToggleGenre(genre)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 ${
                  active
                    ? "border-label text-label"
                    : "border-border text-zinc-400 hover:bg-surface-2 hover:text-zinc-200"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
