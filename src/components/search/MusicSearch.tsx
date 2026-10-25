"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { graphService, type GraphService } from "@/lib/graphService";
import { ENTITY_COLORS, ENTITY_LABELS } from "@/components/graph/graphStyles";
import type { MusicEntity } from "@/types/music";
import type { SearchResults } from "@/types/graph";

interface MusicSearchProps {
  onSelect(id: string): void;
  service?: GraphService;
}

interface Row {
  entity: MusicEntity;
  group: "Labels" | "Artists" | "Releases";
}

const EMPTY: SearchResults = { labels: [], artists: [], releases: [] };

export function MusicSearch({ onSelect, service = graphService }: MusicSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const rows: Row[] = [
    ...results.labels.map((entity) => ({ entity, group: "Labels" as const })),
    ...results.artists.map((entity) => ({ entity, group: "Artists" as const })),
    ...results.releases.map((entity) => ({ entity, group: "Releases" as const })),
  ];

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(
      () => {
        if (!q) {
          setResults(EMPTY);
          return;
        }
        void service.searchEntities(q).then((r) => {
          setResults(r);
          setHighlight(0);
          setOpen(true);
        });
      },
      q ? 120 : 0
    );
    return () => clearTimeout(timer);
  }, [query, service]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function choose(entity: MusicEntity) {
    onSelect(entity.id);
    setQuery("");
    setResults(EMPTY);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || rows.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + rows.length) % rows.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(rows[highlight].entity);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && query.trim().length > 0;
  const searched = query.trim().length > 0 && results !== EMPTY;

  return (
    <div ref={rootRef} className="relative w-80 max-w-full">
      <div className="flex items-center gap-2 rounded border border-border bg-surface px-3 h-9">
        <Search size={14} className="shrink-0 text-zinc-500" />
        <input
          id="dig-search-input"
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => rows.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search labels, artists, releases…"
          className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          aria-label="Search music entities"
        />
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[360px] overflow-y-auto rounded border border-border bg-surface py-1 shadow-lg">
          {rows.length === 0 && searched && (
            <div className="px-3 py-2 text-sm text-zinc-500">
              No results for “{query.trim()}”
            </div>
          )}
          {(["Labels", "Artists", "Releases"] as const).map((group) => {
            const groupRows = rows.filter((r) => r.group === group);
            if (groupRows.length === 0) return null;
            return (
              <div key={group}>
                <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {group}
                </div>
                {groupRows.map((row) => {
                  const index = rows.indexOf(row);
                  return (
                    <button
                      key={row.entity.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(row.entity)}
                      onMouseEnter={() => setHighlight(index)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors duration-150 ${
                        index === highlight
                          ? "bg-surface-2 text-zinc-100"
                          : "text-zinc-300"
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: ENTITY_COLORS[row.entity.type] }}
                      />
                      <span className="truncate">{row.entity.name}</span>
                      <span className="ml-auto shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-zinc-500">
                        {ENTITY_LABELS[row.entity.type]}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
