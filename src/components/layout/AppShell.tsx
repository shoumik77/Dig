"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Compass, Menu } from "lucide-react";
import { useDigGraph } from "@/hooks/useDigGraph";
import {
  getGraphService,
  type GraphMode,
} from "@/lib/graphServiceRegistry";
import { MusicGraph, type MusicGraphHandle } from "@/components/graph/MusicGraph";
import { GraphControls } from "@/components/graph/GraphControls";
import { MusicSearch } from "@/components/search/MusicSearch";
import { EntityDetails } from "@/components/details/EntityDetails";
import { MusicPlayer } from "@/components/player/MusicPlayer";
import { DEMO_GENRES, Sidebar, ModeSwitch } from "@/components/layout/Sidebar";
import { useCrates } from "@/hooks/useCrates";
import type { CrateItem } from "@/types/crate";
import type { MusicEntity } from "@/types/music";

const MAX_RECENT = 5;

export function AppShell() {
  const [mode, setMode] = useState<GraphMode>("demo");
  const service = useMemo(() => getGraphService(mode), [mode]);
  const { state, selectNode, expand, loadMore, startFrom, startFromEntity, reset, select } =
    useDigGraph(service);
  const crates = useCrates();
  const graphRef = useRef<MusicGraphHandle>(null);
  const [recent, setRecent] = useState<MusicEntity[]>([]);
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [capabilities, setCapabilities] = useState({ discogs: false });
  const reduceMotion = useReducedMotion();

  // global ⌘K / Ctrl+K focuses search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSearch();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    service
      .getCapabilities()
      .then((caps) => {
        if (!cancelled) setCapabilities(caps);
      })
      .catch(() => {
        if (!cancelled) setCapabilities({ discogs: false });
      });
    return () => {
      cancelled = true;
    };
  }, [service]);

  // genre chips: fixed list in demo; union of Discogs-enriched genres in live
  const liveGenres = useMemo(() => {
    const set = new Set<string>();
    for (const e of Object.values(state.nodes)) {
      for (const g of e.metadata?.genres ?? []) set.add(g);
    }
    return [...set].sort().slice(0, 24);
  }, [state.nodes]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // dev-only debug hooks for smoke testing; dead code in production builds
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as Record<string, unknown>).__digState = state;
    (window as unknown as Record<string, unknown>).__digMode = mode;
    (window as unknown as Record<string, unknown>).__digActions = {
      selectNode,
      loadMore,
      reset,
      startFrom,
      startFromEntity,
      expand,
      select,
      setMode,
    };
  }, [state, mode, selectNode, loadMore, reset, startFrom, startFromEntity, expand, select]);

  const selectedEntity = state.selectedId
    ? (state.nodes[state.selectedId] ?? null)
    : null;

  function pushRecentEntity(entity: MusicEntity) {
    setRecent((prev) =>
      [entity, ...prev.filter((e) => e.id !== entity.id)].slice(0, MAX_RECENT)
    );
  }

  function pushRecent(id: string) {
    const entity = stateRef.current.nodes[id];
    if (entity) pushRecentEntity(entity);
  }

  function handleSelectNode(id: string) {
    selectNode(id);
    pushRecent(id);
  }

  async function handleStartFrom(id: string) {
    await startFrom(id);
    pushRecent(id);
  }

  async function handleOpenCrateItem(item: CrateItem) {
    setDrawerOpen(false);
    await startFromEntity(item.entity);
    pushRecentEntity(item.entity);
  }

  function toggleGenre(genre: string) {
    setActiveGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  }

  function focusSearch() {
    setDrawerOpen(false);
    document.getElementById("dig-search-input")?.focus();
  }

  function handleModeChange(next: GraphMode) {
    if (next === mode) return;
    setMode(next);
    // ids and genre filters from the other provider are meaningless
    setRecent([]);
    if (next === "live") setActiveGenres(new Set());
  }

  const sidebar = (
    <Sidebar
      recent={recent}
      onSelectRecent={handleSelectNode}
      onSearchClick={focusSearch}
      activeGenres={activeGenres}
      onToggleGenre={toggleGenre}
      mode={mode}
      onModeChange={handleModeChange}
      genres={mode === "live" ? liveGenres : DEMO_GENRES}
      genreCaption={
        mode === "live"
          ? capabilities.discogs
            ? "(from Discogs)"
            : "(Discogs token not set)"
          : "(demo only)"
      }
      genreEmptyText={
        mode === "live" && capabilities.discogs
          ? "Select nodes to load genres from Discogs"
          : undefined
      }
      crateList={{
        crates: crates.crates,
        loading: crates.loading,
        error: crates.error,
        openCrateId: crates.openCrateId,
        items: crates.items,
        onToggleCrate: crates.toggle,
        onCreateCrate: (name) => crates.create(name),
        onRenameCrate: (id, name) => void crates.rename(id, name),
        onDeleteCrate: (id) => void crates.remove(id),
        onOpenItem: (item) => void handleOpenCrateItem(item),
        onRemoveItem: (crateId, entityId) => void crates.unsave(crateId, entityId),
      }}
    />
  );

  const details = (
    <EntityDetails
      state={state}
      entity={selectedEntity}
      onSelectNode={handleSelectNode}
      onExpand={(id) => void expand(id)}
      onLoadMore={(id) => void loadMore(id)}
      onClose={() => select(null)}
      capabilities={capabilities}
      crates={crates.crates}
      savedCrateIds={
        selectedEntity ? crates.membership.get(selectedEntity.id) : undefined
      }
      onSaveToCrate={(crateId, entity) => crates.save(crateId, entity)}
      onCreateCrate={(name) => crates.create(name)}
    />
  );

  const graph = (
    <div className="relative h-full min-h-0">
      <MusicGraph
        ref={graphRef}
        state={state}
        onNodeTap={handleSelectNode}
        onBackgroundTap={() => select(null)}
        activeGenres={activeGenres}
      />
      <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 lg:left-4 lg:translate-x-0">
        <MusicSearch
          key={mode}
          service={service}
          mode={mode}
          onSelect={(id) => void handleStartFrom(id)}
        />
      </div>
      {mode === "live" && state.rootId === null && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-0 text-center text-sm text-muted/70">
          <div>Search MusicBrainz to start digging</div>
          <div className="mt-1 text-xs text-muted/60">
            Try a label like Strictly Rhythm, Locked On, or Roulé.
          </div>
        </div>
      )}
      <GraphControls
        onZoomIn={() => graphRef.current?.zoomIn()}
        onZoomOut={() => graphRef.current?.zoomOut()}
        onFit={() => graphRef.current?.fit()}
        onReset={reset}
      />
    </div>
  );

  return (
    <div className="flex h-screen flex-col">
      {/* mobile top bar */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="rounded p-1.5 text-muted hover:bg-surface-2"
        >
          <Menu size={18} />
        </button>
        <span className="flex h-6 w-6 items-center justify-center rounded bg-accent/15 text-accent">
          <Compass size={13} strokeWidth={2.25} />
        </span>
        <span className="text-sm font-semibold tracking-tight">Dig</span>
        <div className="ml-auto w-36">
          <ModeSwitch mode={mode} onModeChange={handleModeChange} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] lg:grid-cols-[260px_1fr_340px]">
        {/* sidebar: column on lg+, overlay drawer below */}
        <aside className="hidden border-r border-border lg:block">{sidebar}</aside>
        <AnimatePresence>
          {drawerOpen && (
            <div className="fixed inset-0 z-30 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.15 }}
                className="absolute inset-0 bg-black/60"
                onClick={() => setDrawerOpen(false)}
              />
              <motion.div
                initial={reduceMotion ? false : { x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduceMotion ? undefined : { x: -24, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 w-64 border-r border-border shadow-xl"
              >
                {sidebar}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* graph canvas */}
        <main className="min-h-0">{graph}</main>

        {/* details: column on lg+, bottom sheet below */}
        <aside className="hidden border-l border-border bg-surface lg:block">
          {details}
        </aside>
        <AnimatePresence>
          {selectedEntity && (
            <motion.div
              initial={reduceMotion ? false : { y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduceMotion ? undefined : { y: 32, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-20 z-30 max-h-[55vh] overflow-hidden rounded-t-xl border-t border-border bg-surface shadow-2xl lg:hidden"
            >
              {details}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <MusicPlayer state={state} entity={selectedEntity} />
    </div>
  );
}
