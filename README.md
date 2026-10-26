# Dig

**Follow the sound.**

Dig is an interactive music-discovery prototype: a crate-digger's graph of record
labels, artists, and releases. Start at a label, pull a thread through its
releases to the artists behind them, and keep going. It is built to help people
find real music made by real artists — nothing here is generated, and nothing
will be.

Dig has two modes, switchable in the sidebar or the mobile top bar:

- **Demo** — an illustrative in-memory dataset (house/garage labels, artists,
  releases), fully offline.
- **Live** — real metadata retrieved from [MusicBrainz](https://musicbrainz.org)
  through the app's own API routes.

## Setup

```bash
npm i
cp .env.example .env.local   # optional — defaults work
npm run dev      # http://localhost:3000
npm test         # vitest (node environment)
npm run lint     # eslint
npm run build    # production build
```

Requires Node 20.19+ or 22.13+ (developed on Node 22).

## How it works

```
Dig UI (AppShell) ── mode: demo | live
    │
    ▼
GraphService (provider-agnostic interface)
    ├── MockGraphService            (in-memory demo dataset)
    └── MusicBrainzGraphService     (browser → /api/music/*)
                │
                ▼
        Next.js Route Handlers      src/app/api/music/*
                │
                ▼
        MusicBrainz server service  src/server/musicbrainz/service.ts
          normalize.ts · client.ts · scheduler.ts · cache.ts
                │
                ▼
        MusicBrainz WS/2 (fixed origin, 1 req/s, cached)
```

```
src/
├── app/
│   ├── layout.tsx, page.tsx, globals.css (Tailwind v4 @theme tokens)
│   └── api/music/    Route Handlers: search/, entities/[type]/[id]/,
│                     entities/[type]/[id]/connections/, _lib/respond.ts
├── components/
│   ├── graph/      MusicGraph.tsx (Cytoscape lifecycle + incremental sync),
│   │               GraphControls.tsx, graphStyles.ts, placement.ts (pure)
│   ├── layout/     AppShell.tsx (owns state, demo/live mode), Sidebar.tsx
│   ├── search/     MusicSearch.tsx
│   ├── details/    EntityDetails.tsx
│   └── player/     MusicPlayer.tsx (non-functional placeholder)
├── data/           mockMusic.ts
├── hooks/          useDigGraph.ts (thin wrapper over the controller)
├── lib/            graphService.ts, graphState.ts (pure reducer),
│                   graphController.ts (async orchestration), graphErrors.ts,
│                   mbIds.ts, musicBrainzGraphService.ts,
│                   graphServiceRegistry.ts, search.ts
├── server/
│   └── musicbrainz/  config.ts, client.ts, scheduler.ts, cache.ts,
│                     normalize.ts, service.ts, types.ts, __fixtures__/
└── types/          music.ts, graph.ts
test/
└── stubs/          server-only stub for vitest
```

### Data flow

`GraphService` (async interface, two providers) → `createGraphController`
(framework-free: awaits service calls, dispatches actions, drops stale
responses via a request token, dedupes in-flight expands per id) →
`useDigGraph` (thin React wrapper) → `graphReducer` (pure state:
nodes/edges/expansions/selection, no I/O) → `MusicGraph` (diffs state into a
long-lived Cytoscape instance via `cy.add`/`cy.remove`/`cy.batch` — the graph
is never rebuilt).

The reducer is unchanged from the demo except two actions: `EXPAND_FAIL`
(marks an expansion `error`, preserving counts) and `CLEAR` (empties the
graph — live mode starts empty).

**The browser never calls MusicBrainz directly.** Live mode goes through
`/api/music/*` route handlers, which enforce the rate limit, cache, and a
fixed upstream origin — the API is not a general URL proxy.

### Demo vs Live

Use the **Demo | Live** switch in the sidebar (or the mobile top bar).

- Demo loads the Strictly Rhythm label and its fictional-but-plausible
  neighbourhood instantly. Entities carry `provenance: "demo"`.
- Live starts empty with a prompt; nothing is fetched until you search.
  The search box gets category tabs (Labels / Artists / Releases), a 300 ms
  debounce, a 2-character minimum, and loading/empty/error rows with retry.
  Selecting a result makes it the graph root; expanding nodes walks real
  MusicBrainz data.
- Live entities carry `provenance: "verified"`, meaning **retrieved from
  MusicBrainz** — not independently fact-checked. Each gets a "MusicBrainz"
  badge linking back to the source entity page.
- Genre chips are demo-only (MusicBrainz labels carry no usable genre tags
  here) and are disabled in Live mode.

## API routes

| Endpoint | Params | Returns |
| --- | --- | --- |
| `GET /api/music/search` | `q` (1–200 chars, required), `type` = `label\|artist\|release` (required), `limit` (clamp 1–25, default 12) | `SearchResults` |
| `GET /api/music/entities/{type}/{mbid}` | — | `MusicEntity` |
| `GET /api/music/entities/{type}/{mbid}/connections` | `cursor` (optional, `{mbid}:{offset}` — scoped to that entity), `limit` (clamp 1–25) | `ConnectionsPage` |

Envelope: `{ ok: true, data }` or `{ ok: false, error: { kind, message, retryAfterMs? } }`.
Status mapping: 400 `invalid`, 404 `not_found`, 429 `rate_limited` (with a
`Retry-After` header), 502 `upstream`/`network`, 504 `timeout`. Unknown errors
become a generic 500 — upstream URLs and internals are never forwarded.
Successful responses send `Cache-Control: private, max-age=60`.

## Entity IDs & relationships

Live ids look like `mb:label:{mbid}`, `mb:artist:{mbid}`, `mb:release:{mbid}`;
demo ids are `label:strictly-rhythm` etc. Canonical stored edge directions:

- `released_on`: release → label
- `credited_to`: release → artist

Edge ids are `rel:{source}->{target}-{type}`, and traversal works in both
directions (expanding a label shows its releases; expanding a release shows
its label and artists).

**Artist credits vs production credits:** `credited_to` reflects MusicBrainz
`artist-credit` — "credited as", not a producer/remixer/sample claim. The
demo-only `performed_by`/`produced_by`/`remixed_by` edges remain illustrative.
Text-only credits without a MusicBrainz ID produce no node.

## Pagination

Pages are 12 items. For label/artist expansion the cursor is `{mbid}:{offset}`
and the offset advances by the **actual returned count**; `loaded` in state is
a cursor position, not a count of new edges. Release expansion is single-page
(everything arrives in one lookup; a cursor is rejected).

## Rate limiting & caching (Live mode)

All upstream calls pass through a single in-process FIFO scheduler:
at most one dispatch per second, identical in-flight URLs deduped,
`AbortController` timeout at 10 s, 429/503 retried up to 3 times honoring
`Retry-After` (seconds or HTTP-date, capped at 30 s) or 1 s/2 s/4 s backoff,
other 4xx never retried, queue capped at 50 (overflow → `rate_limited` →
HTTP 429 to the client). Successful responses are cached in a 500-entry LRU
with a 10-minute TTL (configurable).

> **Deployment caveat:** the limiter is per Node process. On multi-instance or
> serverless deployments it does **not** coordinate across instances and would
> exceed MusicBrainz's 1 req/s budget — Live mode should not be enabled in
> such a deployment until a shared limiter (e.g. a single coordinating
> service) is provided.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `MUSICBRAINZ_USER_AGENT` | `Dig/0.2.0 (https://github.com/shoumik77/Dig)` | Identifies Dig to MusicBrainz (their API policy requires a UA with contact info) |
| `MUSICBRAINZ_CACHE_TTL_MS` | `600000` | TTL for cached upstream responses, ms |

## Decisions & tradeoffs

- **Pure reducer** for graph state: fully unit-testable, no React/cytoscape
  coupling. The framework-free controller owns all asynchrony.
- **Async-shaped services**: `GraphService` is a single interface over the
  mock dataset and the MusicBrainz routes; provider switching is a memoized
  `getGraphService(mode)` call.
- **Offset cursors**: the mock uses string offsets; live uses
  `{mbid}:{offset}` bounded to the entity — neither leaks an opaque token.
- **`loaded` is a cursor position**: how many connections of that node have
  been fetched, regardless of whether their edges were already merged via
  another node's page. Nodes and edges are deduped by id, and metadata
  shallow-merges so a sparse copy never erases richer fields.
- **Server-only upstream**: `import "server-only"` on the client/service
  modules keeps the scheduler and cache out of the browser bundle and off
  client code paths.
- **Tailwind v4** design tokens live in `globals.css` `@theme`; entity colours
  are shared between CSS and Cytoscape via `ENTITY_COLORS`.
- **The player is a placeholder** — controls are disabled and labelled
  "Prototype — playback not available". No fake playback anywhere.

## Data & attribution

- Demo entities carry `provenance: "demo"`. The labels, artists, and releases
  are real and the relationships are plausible, but this is illustrative demo
  metadata — **not verified catalog data**.
- Live metadata is provided by
  [MusicBrainz](https://musicbrainz.org). MusicBrainz core data is released
  under CC0; some supplementary data (including some annotations and
  relationships) is under CC BY-NC-SA 3.0. Review the
  [MusicBrainz database download notes](https://musicbrainz.org/doc/MusicBrainz_Database/Download)
  and the API usage policy before commercial use.

## Tests

`npm test` — Vitest, node environment, no live network (fixtures under
`src/server/musicbrainz/__fixtures__/` are real MusicBrainz responses trimmed
to a few items each).

- `graphService`: both-direction connections, unknown ids, exact page size,
  cursor walks with no overlap, stable ordering, type-filtered search
- `graphState`: init/expand/LOAD_MORE semantics, duplicate prevention,
  `parentOf` first-writer-wins, `EXPAND_FAIL`/`CLEAR`, metadata merge
- `graphController`: async expansion, in-flight dedupe (including
  React-batched same-tick calls), stale-response dropping on
  reset/clear/startFrom/service-swap, failure → error + retry
- `musicbrainz/cache`, `scheduler` (spacing, dedupe, retries, `Retry-After`,
  timeout, exhaustion, queue overflow), `client` (URLs, Lucene escaping,
  cache hits)
- `normalize`, `mbIds`, server `service`, route handlers
  (400/404/429/500/502 mapping, limit clamping)
- `musicBrainzGraphService` (envelope → `GraphServiceError` mapping),
  `placement`, `search`

## Known limitations

- Ring placement can overlap in dense regions; collision nudging only mitigates.
- Live mode has no genre filter (MusicBrainz labels carry no usable genre
  tags here).
- No release-group or recording entities yet; search returns the top 10 per
  category.
- Saved Crates, the player, and persistence are visual placeholders.
- The rate limiter is single-process only — see the deployment caveat above.

## Future work

- Shared rate limiter/cache across instances (e.g. Redis) before multi-instance
  deployment of Live mode
- Release groups, recordings, and explicit producer/remixer relationships
  from MusicBrainz relationship data
- Persisted graphs / saved crates
- Real playback links per release
