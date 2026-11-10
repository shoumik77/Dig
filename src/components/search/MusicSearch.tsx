"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { graphService, type GraphService } from "@/lib/graphService";
import { GraphServiceError } from "@/lib/graphErrors";
import type { GraphMode } from "@/lib/graphServiceRegistry";
import { ENTITY_COLORS, ENTITY_LABELS } from "@/components/graph/graphStyles";
import type { EntityType, MusicEntity } from "@/types/music";
import type { SearchResults } from "@/types/graph";

interface MusicSearchProps {
  onSelect(id: string): void;
  service?: GraphService;
  mode?: GraphMode;
}

type GroupLabel = "Labels" | "Artists" | "Groups" | "Releases" | "Recordings";

interface Row {
  entity: MusicEntity;
  group: GroupLabel;
}

const EMPTY: SearchResults = {
  label: [],
  artist: [],
  "release-group": [],
  release: [],
  recording: [],
};

const CATEGORIES: {
  type: EntityType;
  label: GroupLabel;
}[] = [
  { type: "label", label: "Labels" },
  { type: "artist", label: "Artists" },
  { type: "release-group", label: "Groups" },
  { type: "release", label: "Releases" },
  { type: "recording", label: "Recordings" },
];

const MIN_LIVE_CHARS = 2;

function errorMessage(err: unknown): string {
  if (err instanceof GraphServiceError) {
    if (err.kind === "rate_limited") {
      return "MusicBrainz is busy — try again in a moment";
    }
    if (
      err.kind === "network" ||
      err.kind === "upstream" ||
      err.kind === "timeout"
    ) {
      return "Couldn't reach MusicBrainz";
    }
  }
  return "Search failed";
}

export function MusicSearch({
  onSelect,
  service = graphService,
  mode = "demo",
}: MusicSearchProps) {
  const live = mode === "live";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<EntityType>("label");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const rows: Row[] = CATEGORIES.flatMap((c) =>
    results[c.type].map((entity) => ({ entity, group: c.label }))
  );

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(
      () => {
        if (!q || (live && q.length < MIN_LIVE_CHARS)) {
          setResults(EMPTY);
          setLoading(false);
          setError(null);
          setSearched(false);
          return;
        }
        const id = ++requestId.current;
        setLoading(true);
        setError(null);
        setOpen(true);
        void service
          .searchEntities(q, live ? { type: category } : undefined)
          .then((r) => {
            if (id !== requestId.current) return;
            setResults(r);
            setLoading(false);
            setError(null);
            setSearched(true);
            setHighlight(0);
            setOpen(true);
          })
          .catch((err: unknown) => {
            if (id !== requestId.current) return;
            setResults(EMPTY);
            setLoading(false);
            setError(errorMessage(err));
            setSearched(true);
          });
      },
      q ? (live ? 300 : 120) : 0
    );
    return () => clearTimeout(timer);
  }, [query, category, service, live, retryTick]);

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
    (document.activeElement as HTMLElement | null)?.blur();
  }

  function moveCategory(dir: 1 | -1) {
    const i = CATEGORIES.findIndex((c) => c.type === category);
    setCategory(
      CATEGORIES[(i + dir + CATEGORIES.length) % CATEGORIES.length].type
    );
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (live && open && e.key === "ArrowLeft") {
      e.preventDefault();
      moveCategory(-1);
      return;
    }
    if (live && open && e.key === "ArrowRight") {
      e.preventDefault();
      moveCategory(1);
      return;
    }
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

  const trimmed = query.trim();
  const showDropdown = open && trimmed.length > 0;
  const tooShort = live && trimmed.length > 0 && trimmed.length < MIN_LIVE_CHARS;
  const groups: GroupLabel[] = live
    ? [CATEGORIES.find((c) => c.type === category)!.label]
    : CATEGORIES.map((c) => c.label);

  return (
    <div ref={rootRef} className="relative w-80 max-w-full">
      <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface/85 px-3 backdrop-blur-sm transition-colors duration-150 focus-within:border-accent/50">
        <Search size={14} className="shrink-0 text-muted/70" />
        <input
          id="dig-search-input"
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => rows.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={live ? "Search MusicBrainz…" : "Search labels, artists, releases…"}
          className="w-full bg-transparent text-sm text-text placeholder-muted/70 outline-none"
          aria-label="Search music entities"
        />
        <kbd className="hidden shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted sm:block">
          ⌘K
        </kbd>
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-[360px] overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-2xl shadow-black/40">
          {live && (
            <div className="flex gap-1 border-b border-border px-2 pb-2 pt-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.type}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setCategory(c.type)}
                  aria-pressed={category === c.type}
                  className={`rounded px-2 py-1 text-[11px] transition-colors duration-150 ${
                    category === c.type
                      ? "bg-surface-2 text-text"
                      : "text-muted hover:bg-surface-2 hover:text-text"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {tooShort && (
            <div className="px-3 py-2 text-sm text-muted/70">
              Type at least {MIN_LIVE_CHARS} characters
            </div>
          )}

          {!tooShort && loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted/70">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" />
              Searching MusicBrainz…
            </div>
          )}

          {!tooShort && !loading && error && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="text-muted">{error}</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setRetryTick((t) => t + 1)}
                className="flex items-center gap-1 rounded border border-border px-2 py-0.5 text-xs text-muted hover:bg-surface-2"
              >
                <RotateCcw size={11} /> Retry
              </button>
            </div>
          )}

          {!tooShort && !loading && !error && rows.length === 0 && searched && (
            <div className="px-3 py-2 text-sm text-muted/70">
              {live
                ? `No ${CATEGORIES.find((c) => c.type === category)!.label.toLowerCase()} found for “${trimmed}”`
                : `No results for “${trimmed}”`}
            </div>
          )}

          {!tooShort &&
            groups.map((group) => {
              const groupRows = rows.filter((r) => r.group === group);
              if (groupRows.length === 0) return null;
              return (
                <div key={group}>
                  <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted/70">
                    {group}
                  </div>
                  {groupRows.map((row) => {
                    const index = rows.indexOf(row);
                    const entity = row.entity;
                    return (
                      <button
                        key={row.entity.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          choose(entity);
                        }}
                        onMouseEnter={() => setHighlight(index)}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors duration-150 ${
                          index === highlight
                            ? "bg-surface-2 text-text"
                            : "text-muted"
                        }`}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: ENTITY_COLORS[row.entity.type] }}
                        />
                        <span className="truncate">{row.entity.name}</span>
                        <span className="ml-auto shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted/70">
                          {ENTITY_LABELS[row.entity.type]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}

          {live && (
            <div className="border-t border-border px-3 pb-1 pt-2 text-[10px] text-muted/70">
              Results from MusicBrainz
            </div>
          )}
        </div>
      )}
    </div>
  );
}
