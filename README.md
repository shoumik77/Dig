# Dig

**Follow the sound.**

Dig is an interactive music-discovery prototype: a crate-digger's graph of record
labels, artists, and releases. Start at a label, pull a thread through its
releases to the artists behind them, and keep going. It is built to help people
find real music made by real artists — nothing here is generated, and nothing
will be.

## Setup

```bash
npm i
npm run dev      # http://localhost:3000
npm test         # vitest (node environment)
npm run lint     # eslint
npm run build    # production build
```

Requires Node 20.19+ or 22.13+ (developed on Node 22).

## How it works

```
src/
├── app/            layout.tsx, page.tsx, globals.css (Tailwind v4 @theme tokens)
├── components/
│   ├── graph/      MusicGraph.tsx (Cytoscape lifecycle + incremental sync),
│   │               GraphControls.tsx, graphStyles.ts, placement.ts (pure)
│   ├── layout/     AppShell.tsx (owns state), Sidebar.tsx
│   ├── search/     MusicSearch.tsx
│   ├── details/    EntityDetails.tsx
│   └── player/     MusicPlayer.tsx (non-functional placeholder)
├── data/           mockMusic.ts
├── lib/            graphService.ts, graphState.ts (pure reducer), search.ts
├── hooks/          useDigGraph.ts (controller hook)
└── types/          music.ts, graph.ts
```

### Data flow

`graphService` (async interface, mock impl over in-memory data) →
`useDigGraph` (controller hook: awaits service calls, dispatches actions,
drops stale responses via a request token) → `graphReducer` (pure state:
nodes/edges/expansions/selection, no I/O) → `MusicGraph` (diffs state into a
long-lived Cytoscape instance via `cy.add`/`cy.remove`/`cy.batch` — the graph
is never rebuilt).

### Pagination

`getConnections(id, { cursor, limit })` returns a `ConnectionsPage` of 12.
`EXPAND` fetches page one; `LOAD_MORE` continues from `nextCursor`. Nodes that
still have connections to reveal get a dashed outline in the graph and a
"Load more (N remaining)" action in the details panel.

### Placement

New nodes are placed deterministically on a ring around the node that revealed
them (`ringPositions` in `placement.ts`): radius grows per page, angular offset
derives from a hash of the parent id, collisions are nudged outward. There is no
global force layout — existing positions and the viewport are preserved on
expand; `cy.fit` runs only on a fresh root and on reset.

## Decisions & tradeoffs

- **Pure reducer** for graph state: fully unit-testable, no React/cytoscape
  coupling. The controller hook owns all asynchrony.
- **Async-shaped mock service**: `graphService` returns promises matching a
  future FastAPI client; swapping backends changes one export.
- **Offset cursor** in the mock (`nextCursor` is a string offset); a real
  backend can substitute an opaque cursor with no API change.
- **`loaded` counts relationships**, not entities — each page's connections are
  deduped by edge id, so repeated `EXPAND` dispatches can't inflate the count.
- **Tailwind v4** design tokens live in `globals.css` `@theme`; entity colours
  are shared between CSS and Cytoscape via `ENTITY_COLORS`.
- **The player is a placeholder** — controls are disabled and labelled
  "Prototype — playback not available". No fake playback anywhere.

## Mock data disclaimer

All entities carry `provenance: "demo"`. The labels, artists, and releases are
real and the relationships are plausible, but this is illustrative demo
metadata — **not verified catalog data**.

## Tests

`npm test` — 27 tests covering:

- `graphService`: both-direction connections, unknown ids, exact page size,
  cursor walks with no overlap, stable ordering
- `graphState`: init/expand/LOAD_MORE semantics, duplicate prevention,
  `parentOf` first-writer-wins, RESET
- `placement`: determinism, distinct positions, ring growth, collision nudging
- `search`: case/alias/prefix ordering, grouping, empty query

## Known limitations

- Ring placement can overlap in dense regions; collision nudging only mitigates.
- Saved Crates, the genre filter, and the player are visual-only placeholders.
- No persistence, no audio, mock data only.

## Next steps

- Swap `graphService` for a FastAPI + Postgres/Neo4j backend
- Real catalog ingestion (MusicBrainz/Discogs)
- Track/sample entity types and richer edge types
- Saved crates with persistence
- Listening links per release
