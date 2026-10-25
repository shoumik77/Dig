"use client";

import { useEffect, useRef, useState } from "react";
import { Disc3, Menu } from "lucide-react";
import { useDigGraph } from "@/hooks/useDigGraph";
import { MusicGraph, type MusicGraphHandle } from "@/components/graph/MusicGraph";
import { GraphControls } from "@/components/graph/GraphControls";
import { MusicSearch } from "@/components/search/MusicSearch";
import { EntityDetails } from "@/components/details/EntityDetails";
import { MusicPlayer } from "@/components/player/MusicPlayer";
import { Sidebar } from "@/components/layout/Sidebar";
import { ENTITY_COLORS } from "@/components/graph/graphStyles";
import type { MusicEntity } from "@/types/music";

const MAX_RECENT = 5;

export function AppShell() {
  const { state, selectNode, expand, loadMore, startFrom, reset, select } =
    useDigGraph();
  const graphRef = useRef<MusicGraphHandle>(null);
  const [recent, setRecent] = useState<MusicEntity[]>([]);
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const selectedEntity = state.selectedId
    ? (state.nodes[state.selectedId] ?? null)
    : null;

  function pushRecent(id: string) {
    const entity = stateRef.current.nodes[id];
    if (!entity) return;
    setRecent((prev) =>
      [entity, ...prev.filter((e) => e.id !== entity.id)].slice(0, MAX_RECENT)
    );
  }

  function handleSelectNode(id: string) {
    selectNode(id);
    pushRecent(id);
  }

  async function handleStartFrom(id: string) {
    await startFrom(id);
    pushRecent(id);
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

  const sidebar = (
    <Sidebar
      recent={recent}
      onSelectRecent={handleSelectNode}
      onSearchClick={focusSearch}
      activeGenres={activeGenres}
      onToggleGenre={toggleGenre}
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
        <MusicSearch onSelect={(id) => void handleStartFrom(id)} />
      </div>
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
          className="rounded p-1.5 text-zinc-300 hover:bg-surface-2"
        >
          <Menu size={18} />
        </button>
        <Disc3 size={18} style={{ color: ENTITY_COLORS.label }} />
        <span className="text-sm font-semibold">Dig</span>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_1fr_340px]">
        {/* sidebar: column on lg+, overlay drawer below */}
        <aside className="hidden border-r border-border lg:block">{sidebar}</aside>
        {drawerOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-64 border-r border-border shadow-xl">
              {sidebar}
            </div>
          </div>
        )}

        {/* graph canvas */}
        <main className="min-h-0">{graph}</main>

        {/* details: column on lg+, bottom sheet below */}
        <aside className="hidden border-l border-border bg-surface lg:block">
          {details}
        </aside>
        {selectedEntity && (
          <div className="fixed inset-x-0 bottom-20 z-30 max-h-[55vh] translate-y-0 overflow-hidden border-t border-border bg-surface shadow-2xl transition-transform duration-150 lg:hidden">
            {details}
          </div>
        )}
      </div>

      <MusicPlayer state={state} entity={selectedEntity} />
    </div>
  );
}
