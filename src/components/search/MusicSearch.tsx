"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, CornerDownLeft, History, Search } from "lucide-react";
import { graphService, type GraphService } from "@/lib/graphService";
import { GraphServiceError } from "@/lib/graphErrors";
import type { GraphMode } from "@/lib/graphServiceRegistry";
import { ENTITY_COLORS, ENTITY_LABELS } from "@/components/graph/graphStyles";
import { artworkUrl, entityMetaLine, initialsOf } from "@/lib/entityDisplay";
import type { EntityType, MusicEntity } from "@/types/music";
import type { SearchResults } from "@/types/graph";

interface MusicSearchProps {
  open: boolean;
  onClose(): void;
  onSelect(id: string): void;
  onPickRecent(id: string): void;
  recent: MusicEntity[];
  service?: GraphService;
  mode?: GraphMode;
}

type Tab = "all" | EntityType;

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "artist", label: "Artists" },
  { id: "label", label: "Labels" },
  { id: "release", label: "Releases" },
];

const EMPTY: SearchResults = {
  label: [],
  artist: [],
  "release-group": [],
  release: [],
  recording: [],
};

const MIN_LIVE_CHARS = 2;
const LIVE_ALL_TYPES: EntityType[] = ["label", "artist", "release"];

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

function ResultThumb({ entity }: { entity: MusicEntity }) {
  const image = artworkUrl(entity);
  if (entity.type === "label" && !image) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-cream text-sm font-semibold tracking-tight text-bg">
        {initialsOf(entity.name)}
      </span>
    );
  }
  const round = entity.type === "artist" ? "rounded-full" : "rounded-sm";
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        className={`h-11 w-11 shrink-0 object-cover outline-1 -outline-offset-1 outline-white/10 ${round}`}
      />
    );
  }
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center border bg-surface-2 text-xs font-medium ${round}`}
      style={{
        borderColor: `${ENTITY_COLORS[entity.type]}55`,
        color: ENTITY_COLORS[entity.type],
      }}
    >
      {initialsOf(entity.name)}
    </span>
  );
}

export function MusicSearch({
  open,
  onClose,
  onSelect,
  onPickRecent,
  recent,
  service = graphService,
  mode = "demo",
}: MusicSearchProps) {
  const live = mode === "live";
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  // focus the input after the panel mounts
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // merged row order: labels, artists, releases, then the rest
  const rows: MusicEntity[] =
    tab === "all"
      ? (
          ["label", "artist", "release", "release-group", "recording"] as const
        ).flatMap((t) => results[t]).slice(0, 9)
      : results[tab].slice(0, 12);

  useEffect(() => {
    if (!open) return;
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

        if (live && tab === "all") {
          // parallel label+artist+release searches, merging as they resolve
          let pending = LIVE_ALL_TYPES.length;
          for (const type of LIVE_ALL_TYPES) {
            void service
              .searchEntities(q, { type })
              .then((r) => {
                if (id !== requestId.current) return;
                setResults((prev) => ({ ...prev, [type]: r[type] }));
              })
              .catch((err: unknown) => {
                if (id !== requestId.current) return;
                setError((prev) => prev ?? errorMessage(err));
              })
              .finally(() => {
                if (id !== requestId.current) return;
                pending -= 1;
                if (pending === 0) {
                  setLoading(false);
                  setSearched(true);
                  setHighlight(0);
                }
              });
          }
          return;
        }

        void service
          .searchEntities(q, live ? { type: tab === "all" ? "label" : tab } : undefined)
          .then((r) => {
            if (id !== requestId.current) return;
            setResults(r);
            setLoading(false);
            setError(null);
            setSearched(true);
            setHighlight(0);
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
  }, [query, tab, service, live, open, retryTick]);

  // close on Escape even when the input isn't focused
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function choose(entity: MusicEntity) {
    onSelect(entity.id);
    setQuery("");
    setResults(EMPTY);
    onClose();
  }

  function moveTab(dir: 1 | -1) {
    const i = TABS.findIndex((t) => t.id === tab);
    setTab(TABS[(i + dir + TABS.length) % TABS.length].id);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveTab(-1);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveTab(1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (rows.length > 0) setHighlight((h) => (h + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rows.length > 0)
        setHighlight((h) => (h - 1 + rows.length) % rows.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[highlight]) choose(rows[highlight]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  const trimmed = query.trim();
  const tooShort = live && trimmed.length > 0 && trimmed.length < MIN_LIVE_CHARS;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-center p-4 pt-[10vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative flex max-h-[75vh] w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50"
          >
            {/* input row */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Search size={16} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  live ? "Search MusicBrainz…" : "Search artists, labels, releases"
                }
                className="min-w-0 flex-1 bg-transparent text-lg text-text placeholder-muted/60 outline-none"
                aria-label="Search music entities"
              />
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded border border-border bg-surface-2 px-2 py-1 font-mono text-[10px] text-muted transition-colors duration-150 hover:text-text"
              >
                esc
              </button>
            </div>

            {/* category tabs */}
            <div className="flex gap-2 border-b border-border px-4 py-3">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-pressed={tab === t.id}
                  className={`rounded-md px-4 py-1.5 text-sm transition-colors duration-150 enabled:active:scale-[0.96] motion-safe:transition-transform ${
                    tab === t.id
                      ? "bg-accent font-medium text-bg"
                      : "bg-surface-2 text-muted hover:text-text"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
              {tooShort && (
                <div className="px-3 py-2 text-sm text-muted/70">
                  Type at least {MIN_LIVE_CHARS} characters
                </div>
              )}

              {!tooShort && loading && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted/70">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" />
                  {live ? "Searching MusicBrainz…" : "Searching…"}
                </div>
              )}

              {!tooShort && !loading && error && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="text-muted">{error}</span>
                  <button
                    type="button"
                    onClick={() => setRetryTick((t) => t + 1)}
                    className="rounded border border-border px-2 py-0.5 text-xs text-muted hover:bg-surface-2"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!tooShort && !loading && !error && rows.length === 0 && searched && (
                <div className="px-3 py-2 text-sm text-muted/70">
                  No results for “{trimmed}”
                </div>
              )}

              {rows.length > 0 && (
                <>
                  <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted/70">
                    Top connections
                  </div>
                  {rows.map((entity, index) => {
                    const active = index === highlight;
                    return (
                      <button
                        key={entity.id}
                        type="button"
                        onClick={() => choose(entity)}
                        onMouseEnter={() => setHighlight(index)}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 ${
                          active
                            ? "border-border bg-surface-2/60"
                            : "border-transparent"
                        }`}
                      >
                        <ResultThumb entity={entity} />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-[15px] font-medium ${
                              active ? "text-accent" : "text-text"
                            }`}
                          >
                            {entity.name}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {entityMetaLine(entity)}
                          </span>
                        </span>
                        {active ? (
                          <CornerDownLeft size={15} className="shrink-0 text-muted" />
                        ) : (
                          <ArrowUpRight size={15} className="shrink-0 text-muted/60" />
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {recent.length > 0 && rows.length === 0 && (
                <>
                  <div className="px-3 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted/70">
                    Recent searches
                  </div>
                  {recent.map((entity) => (
                    <button
                      key={entity.id}
                      type="button"
                      onClick={() => onPickRecent(entity.id)}
                      className="flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-2/60"
                    >
                      <History size={14} className="shrink-0 text-muted/70" />
                      <span className="min-w-0 flex-1 truncate text-sm text-text">
                        {entity.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted/70">
                        {ENTITY_LABELS[entity.type]}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* footer */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[10px] text-muted/70">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="font-mono">↑↓</kbd> Navigate
                </span>
                <span>
                  <kbd className="font-mono">⏎</kbd> Explore
                </span>
                <span>
                  <kbd className="font-mono">esc</kbd> Close
                </span>
              </div>
              <span className="uppercase tracking-[0.12em]">
                {live ? "Live results" : "Demo results"}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
