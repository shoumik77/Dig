"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Archive, Compass, Search } from "lucide-react";
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
import { DEMO_GENRES, NavDrawer } from "@/components/layout/Sidebar";
import { Rail } from "@/components/layout/Rail";
import { CratesView } from "@/components/crates/CratesView";
import { CrateDetailView } from "@/components/crates/CrateDetailView";
import { useCrates } from "@/hooks/useCrates";
import { ENTITY_LABELS } from "@/components/graph/graphStyles";
import type { CrateItem } from "@/types/crate";
import type { EntityType, MusicEntity } from "@/types/music";

const MAX_RECENT = 5;

type View = { name: "explore" } | { name: "crates" } | { name: "crate"; id: string };
type TypeFilter = "all" | "release" | "artist" | "label";

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All connections" },
  { id: "release", label: "Releases" },
  { id: "artist", label: "Artists" },
  { id: "label", label: "Labels" },
];

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function AppShell() {
  const [mode, setMode] = useState<GraphMode>("demo");
  const service = useMemo(() => getGraphService(mode), [mode]);
  const {
    state,
    selectNode,
    expand,
    loadMore,
    startFrom,
    startFromEntity,
    reset,
    select,
  } = useDigGraph(service, { selectInitialRoot: false });
  const crates = useCrates();
  const graphRef = useRef<MusicGraphHandle>(null);
  const [view, setView] = useState<View>({ name: "explore" });
  const [recent, setRecent] = useState<MusicEntity[]>([]);
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zoomPct, setZoomPct] = useState(100);
  const [capabilities, setCapabilities] = useState({ discogs: false });
  const reduceMotion = useReducedMotion();
  const pendingEntityRef = useRef<MusicEntity | null>(null);

  const demo = mode === "demo";

  // global ⌘K / Ctrl+K opens search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
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

  // a crate item that needed a provider switch is applied after the new
  // service's own init settles (next macrotask)
  useEffect(() => {
    if (!pendingEntityRef.current) return;
    const entity = pendingEntityRef.current;
    pendingEntityRef.current = null;
    const t = setTimeout(() => void startFromEntity(entity), 0);
    return () => clearTimeout(t);
  }, [service, startFromEntity]);

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
      setView,
      setTypeFilter,
      openSearch: () => setSearchOpen(true),
      closeSearch: () => setSearchOpen(false),
      selectAndCenter: (id: string) => {
        selectNode(id);
        requestAnimationFrame(() => graphRef.current?.center(id));
      },
    };
  }, [state, mode, selectNode, loadMore, reset, startFrom, startFromEntity, expand, select]);

  const selectedEntity = state.selectedId
    ? (state.nodes[state.selectedId] ?? null)
    : null;

  // breadcrumb: type-plural crumb for labels/artists ("Explore / Labels /
  // Strictly Rhythm"), trail names for releases ("Explore / Strictly
  // Rhythm / Hardrive / Deep Inside")
  const breadcrumb = useMemo(() => {
    if (!state.selectedId || !selectedEntity) return null;
    if (
      selectedEntity.type === "label" ||
      selectedEntity.type === "artist"
    ) {
      return `${ENTITY_LABELS[selectedEntity.type]}s / ${selectedEntity.name}`;
    }
    const names: string[] = [];
    let cur: string | undefined = state.selectedId;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const entity: MusicEntity | undefined = state.nodes[cur];
      if (entity) names.unshift(entity.name);
      cur = state.parentOf[cur];
    }
    return names.join(" / ");
  }, [state.selectedId, state.nodes, state.parentOf, selectedEntity]);

  const visibleTypes = useMemo<ReadonlySet<EntityType> | null>(() => {
    if (typeFilter === "all") return null;
    if (typeFilter === "release")
      return new Set<EntityType>(["release", "release-group"]);
    return new Set<EntityType>([typeFilter]);
  }, [typeFilter]);

  // editorial eyebrow derived from the root/selected scene where cheap
  const rootEntity = state.rootId ? state.nodes[state.rootId] : undefined;
  const sceneMeta = (e?: MusicEntity) =>
    (e?.metadata ?? {}) as { location?: string; genres?: string[] };
  const scenePlace = (
    sceneMeta(rootEntity).location ??
    sceneMeta(selectedEntity ?? undefined).location ??
    "New York"
  ).toUpperCase();
  const sceneGenre = (
    sceneMeta(selectedEntity ?? undefined).genres?.[0] ??
    sceneMeta(rootEntity).genres?.[0] ??
    "House"
  ).toUpperCase();

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

  function handleSelectAndCenter(id: string) {
    selectNode(id);
    pushRecent(id);
    requestAnimationFrame(() => graphRef.current?.center(id));
  }

  async function handleStartFrom(id: string) {
    await startFrom(id);
    pushRecent(id);
    setView({ name: "explore" });
  }

  /** open a saved entity as the graph root — switching provider if needed */
  function openEntityAsRoot(entity: MusicEntity) {
    const needsMode: GraphMode = entity.id.startsWith("mb:") ? "live" : "demo";
    setView({ name: "explore" });
    if (needsMode !== mode) {
      pendingEntityRef.current = entity;
      setMode(needsMode);
    } else {
      void startFromEntity(entity);
    }
    pushRecentEntity(entity);
  }

  function handleOpenCrateItem(item: CrateItem) {
    openEntityAsRoot(item.entity);
  }

  function toggleGenre(genre: string) {
    setActiveGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  }

  function handleModeChange(next: GraphMode) {
    if (next === mode) return;
    setMode(next);
    // ids and genre filters from the other provider are meaningless
    setRecent([]);
    if (next === "live") setActiveGenres(new Set());
  }

  // ── header copy ─────────────────────────────────────────────────────
  const heading =
    view.name === "crates"
      ? "Your taste. Collected."
      : view.name === "crate"
        ? (crates.crates.find((c) => c.id === view.id)?.name ?? "Crate")
        : (selectedEntity?.name ?? "Explore the sound.");

  const subline =
    view.name === "crates"
      ? "Records, artists, and labels you want to come back to."
      : view.name === "crate"
        ? `My crates / ${heading}`
        : selectedEntity && breadcrumb
          ? `Explore / ${breadcrumb}`
          : "Follow the connections between artists, records, and labels.";

  const searchField = (
    <button
      type="button"
      onClick={() => setSearchOpen(true)}
      className="flex h-[42px] w-full items-center gap-2.5 rounded-md border border-border bg-surface px-3.5 text-sm text-muted transition-colors duration-150 hover:border-muted/40"
    >
      <Search size={14} className="shrink-0" />
      <span className="flex-1 text-left">
        Search artists, labels, releases
      </span>
      <kbd className="shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted">
        ⌘K
      </kbd>
    </button>
  );

  const details = (
    <EntityDetails
      state={state}
      entity={selectedEntity}
      onSelectNode={handleSelectNode}
      onSelectAndCenter={handleSelectAndCenter}
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

  const canvasCaption = selectedEntity
    ? "Follow a record. Find a whole scene."
    : "One label. A thousand rabbit holes.";
  const canvasEyebrow = selectedEntity
    ? `YOUR TRAIL / ${scenePlace} ${sceneGenre}`
    : `A WAY IN / ${scenePlace} AFTER DARK`;

  const explore = (
    <div className="flex h-full min-h-0">
      {/* canvas */}
      <div className="relative min-w-0 flex-1">
        <MusicGraph
          ref={graphRef}
          state={state}
          onNodeTap={handleSelectNode}
          onBackgroundTap={() => select(null)}
          activeGenres={activeGenres}
          visibleTypes={visibleTypes}
          onZoomChange={setZoomPct}
        />

        {/* editorial overlay — top left */}
        <div className="pointer-events-none absolute left-4 top-4 z-10 lg:left-6 lg:top-5">
          <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted/80">
            {canvasEyebrow}
          </div>
          <div className="mt-1.5 text-[15px] font-medium text-text">
            {canvasCaption}
          </div>
        </div>

        {/* editorial overlay — bottom left */}
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 lg:left-6">
          {!selectedEntity && (
            <>
              <div className="hidden text-[15px] font-medium text-text sm:block">
                Go deeper, not louder.
              </div>
              <div className="mt-1 hidden text-xs text-muted sm:block">
                Select a record to follow its connections →
              </div>
            </>
          )}
          <div className={`${selectedEntity ? "" : "mt-4 "}text-[11px] text-muted/70`}>
            <span className="hidden sm:inline">Drag to explore · Scroll to zoom</span>
            <span className="sm:hidden">Pinch to zoom · Drag to explore</span>
          </div>
        </div>

        {/* live-mode empty state, mapped into the canvas captions */}
        {!demo && state.rootId === null && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 z-10 text-center">
            <div className="text-[15px] text-muted">
              Search MusicBrainz to start digging
            </div>
            <div className="mt-1.5 text-xs text-muted/70">
              Try a label like Strictly Rhythm, Locked On, or Roulé.
            </div>
          </div>
        )}

        {/* legend + zoom controls — bottom right */}
        <div className="absolute bottom-4 right-4 z-10 lg:right-6">
          <GraphControls
            zoomPct={zoomPct}
            onZoomIn={() => graphRef.current?.zoomIn()}
            onZoomOut={() => graphRef.current?.zoomOut()}
            onFit={() => graphRef.current?.fit()}
          />
        </div>
      </div>

      {/* docked details panel — desktop */}
      {selectedEntity && (
        <aside className="hidden w-[344px] shrink-0 border-l border-border bg-surface lg:block">
          {details}
        </aside>
      )}
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      <div className="flex min-h-0 flex-1">
        {/* left rail — desktop */}
        <div className="hidden lg:block">
          <Rail
            section={view.name === "explore" ? "explore" : "crates"}
            onExplore={() => setView({ name: "explore" })}
            onSearch={() => setSearchOpen(true)}
            onCrates={() => setView({ name: "crates" })}
            onRecents={() => setDrawerOpen(true)}
            onExpand={() => setDrawerOpen(true)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* top bar — desktop */}
          <header className="relative hidden h-14 shrink-0 items-center border-b border-border px-6 lg:flex">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Follow the sound.
            </span>
            <div className="absolute left-1/2 w-[360px] -translate-x-1/2">
              {searchField}
            </div>
            <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.16em] text-muted/80">
              {demo ? "Illustrative demo" : "Live metadata"}
            </span>
          </header>

          {/* mobile header */}
          <header className="shrink-0 border-b border-border px-4 pb-4 pt-4 lg:hidden">
            <div className="flex items-center justify-between">
              <span className="text-[26px] font-semibold italic tracking-tight">
                dig.
              </span>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Open search"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted transition-colors duration-150 hover:text-text"
              >
                <Search size={16} />
              </button>
            </div>
            <h1 className="mt-3 text-[28px] font-semibold tracking-tight">
              {heading}
            </h1>
            <div className="mt-1 text-sm text-muted">
              {view.name === "explore"
                ? `A way in / ${titleCase(scenePlace)} ${titleCase(sceneGenre)}`
                : subline}
            </div>
          </header>

          {/* page header — desktop */}
          <div className="hidden shrink-0 border-b border-border px-8 pb-5 pt-7 lg:block">
            <div className="flex items-end justify-between gap-6">
              <div className="min-w-0">
                <h1 className="truncate text-[40px] font-semibold leading-[1.05] tracking-tight">
                  {heading}
                </h1>
                <div className="mt-2.5 text-sm text-muted">{subline}</div>
              </div>
              {view.name === "explore" && (
                <div className="flex shrink-0 items-center gap-1 pb-1">
                  {TYPE_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTypeFilter(f.id)}
                      aria-pressed={typeFilter === f.id}
                      className={`rounded-md px-3.5 py-1.5 text-sm transition-colors duration-150 ${
                        typeFilter === f.id
                          ? "border border-border bg-surface-2 text-text"
                          : "border border-transparent text-muted hover:text-text"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {demo && (
              <div className="mt-4 text-[11px] text-muted/70">
                Representative artwork &amp; metadata · not live product data
              </div>
            )}
          </div>

          {/* content */}
          <main className="min-h-0 flex-1">
            {view.name === "explore" ? (
              explore
            ) : view.name === "crates" ? (
              <CratesView
                crates={crates.crates}
                loading={crates.loading}
                error={crates.error}
                demo={demo}
                onOpenCrate={(id) => setView({ name: "crate", id })}
                onCreateCrate={(name) => crates.create(name)}
              />
            ) : (
              <CrateDetailView
                key={view.id}
                crateId={view.id}
                demo={demo}
                getDetail={crates.getDetail}
                onExploreCrate={openEntityAsRoot}
                onOpenItem={handleOpenCrateItem}
                onRemoveItem={(crateId, entityId) =>
                  crates.unsave(crateId, entityId)
                }
              />
            )}
          </main>
        </div>
      </div>

      {/* expanded nav drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.15 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { x: -24, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 w-72 border-r border-border shadow-xl"
            >
              <NavDrawer
                mode={mode}
                onModeChange={handleModeChange}
                genres={demo ? DEMO_GENRES : liveGenres}
                activeGenres={activeGenres}
                onToggleGenre={toggleGenre}
                genreCaption={
                  demo
                    ? "(demo only)"
                    : capabilities.discogs
                      ? "(from Discogs)"
                      : "(Discogs token not set)"
                }
                genreEmptyText={
                  !demo && capabilities.discogs
                    ? "Select nodes to load genres from Discogs"
                    : undefined
                }
                crates={crates.crates}
                onOpenCrates={() => {
                  setDrawerOpen(false);
                  setView({ name: "crates" });
                }}
                onOpenCrate={(id) => {
                  setDrawerOpen(false);
                  setView({ name: "crate", id });
                }}
                onCreateCrate={() => {
                  setDrawerOpen(false);
                  setView({ name: "crates" });
                }}
                recent={recent}
                onSelectRecent={(id) => {
                  setDrawerOpen(false);
                  handleSelectNode(id);
                }}
                onClose={() => setDrawerOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* details bottom sheet — mobile */}
      <AnimatePresence>
        {selectedEntity && view.name === "explore" && (
          <motion.div
            initial={reduceMotion ? false : { y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: 32, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-[118px] z-30 max-h-[58vh] overflow-hidden overscroll-contain rounded-t-2xl border-t border-border bg-surface shadow-2xl lg:hidden"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
            {details}
          </motion.div>
        )}
      </AnimatePresence>

      {/* search modal */}
      <MusicSearch
        key={mode}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        service={service}
        mode={mode}
        recent={recent}
        onSelect={(id) => void handleStartFrom(id)}
        onPickRecent={(id) => {
          setSearchOpen(false);
          const entity = recent.find((r) => r.id === id);
          if (entity) openEntityAsRoot(entity);
        }}
      />

      <MusicPlayer state={state} entity={selectedEntity} />

      {/* bottom tab bar — mobile */}
      <nav
        aria-label="Primary"
        className="flex shrink-0 items-stretch justify-around border-t border-border bg-bg lg:hidden"
      >
        {(
          [
            { id: "explore", label: "Explore", icon: Compass },
            { id: "search", label: "Search", icon: Search },
            { id: "crates", label: "My crates", icon: Archive },
          ] as const
        ).map((tab) => {
          const active =
            tab.id === "explore"
              ? view.name === "explore"
              : tab.id === "crates"
                ? view.name !== "explore"
                : false;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (tab.id === "search") setSearchOpen(true);
                else if (tab.id === "crates") setView({ name: "crates" });
                else setView({ name: "explore" });
              }}
              className={`flex-1 py-3.5 text-sm transition-colors duration-150 ${
                active ? "font-medium text-accent" : "text-muted"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
