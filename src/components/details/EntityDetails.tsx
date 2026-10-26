"use client";

import { useState } from "react";
import { Bookmark, ExternalLink, X } from "lucide-react";
import type { GraphState } from "@/lib/graphState";
import { getExpansion, hasMore, isExpanded } from "@/lib/graphState";
import { ENTITY_COLORS, ENTITY_LABELS } from "@/components/graph/graphStyles";
import type {
  MusicEntity,
  MusicRelationship,
  RelationshipType,
} from "@/types/music";

interface EntityDetailsProps {
  state: GraphState;
  entity: MusicEntity | null;
  onSelectNode(id: string): void;
  onExpand(id: string): void;
  onLoadMore(id: string): void;
  onClose(): void;
}

interface MetaField {
  label: string;
  get(meta: Record<string, unknown>): unknown;
  demoOnly?: boolean;
}

const META_FIELDS: Record<MusicEntity["type"], MetaField[]> = {
  label: [
    { label: "Country", get: (m) => m.country },
    { label: "Founded", get: (m) => m.foundedDate ?? m.founded },
    { label: "Location", get: (m) => m.location, demoOnly: true },
    { label: "Genres", get: (m) => m.genres, demoOnly: true },
    { label: "Description", get: (m) => m.disambiguation },
    { label: "Also known as", get: (m) => m.aliases },
  ],
  artist: [
    { label: "Country", get: (m) => m.country },
    { label: "Type", get: (m) => m.artistType },
    { label: "Location", get: (m) => m.location, demoOnly: true },
    { label: "Real name", get: (m) => m.realName, demoOnly: true },
    { label: "Description", get: (m) => m.disambiguation },
    { label: "Also known as", get: (m) => m.aliases },
  ],
  release: [
    { label: "Date", get: (m) => m.date ?? m.year },
    { label: "Country", get: (m) => m.country },
    { label: "Catalogue no.", get: (m) => m.catalogNumber },
    { label: "Format", get: (m) => m.format },
    { label: "Status", get: (m) => m.status },
    { label: "Credited artists", get: (m) => m.artistCredit },
  ],
};

/** Human label for a relationship group as seen from `entity`'s perspective. */
function groupLabel(type: RelationshipType, outgoing: boolean): string {
  switch (type) {
    case "released_on":
      return outgoing ? "Released on" : "Releases";
    case "performed_by":
      return outgoing ? "Performed by" : "Appears on";
    case "produced_by":
      return outgoing ? "Produced by" : "Produced";
    case "remixed_by":
      return outgoing ? "Remixed by" : "Remixed";
    case "credited_to":
      return outgoing ? "Credited to" : "Credited on";
  }
}


export function EntityDetails({
  state,
  entity,
  onSelectNode,
  onExpand,
  onLoadMore,
  onClose,
}: EntityDetailsProps) {
  const [crateHint, setCrateHint] = useState(false);

  if (!entity) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-zinc-500">
        Select a node to see details
      </div>
    );
  }

  const expansion = getExpansion(state, entity.id);
  const expanded = isExpanded(state, entity.id);
  const more = hasMore(state, entity.id);
  const loading = expansion?.status === "loading";
  const failed = expansion?.status === "error";
  const remaining = expansion
    ? Math.max(0, expansion.total - expansion.loaded)
    : 0;
  const providerLabel =
    entity.provenance === "verified" ? "MusicBrainz" : "demo data";

  // group touching relationships by (type, direction)
  const groups = new Map<string, { label: string; items: { rel: MusicRelationship; other: MusicEntity }[] }>();
  for (const rel of Object.values(state.edges)) {
    const outgoing = rel.source === entity.id;
    const incoming = rel.target === entity.id;
    if (!outgoing && !incoming) continue;
    const otherId = outgoing ? rel.target : rel.source;
    const other = state.nodes[otherId];
    if (!other) continue;
    const key = `${rel.type}:${outgoing ? "out" : "in"}`;
    const group = groups.get(key) ?? {
      label: groupLabel(rel.type, outgoing),
      items: [],
    };
    group.items.push({ rel, other });
    groups.set(key, group);
  }
  const connectionGroups = [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  const verified = entity.provenance === "verified";
  const meta = (entity.metadata ?? {}) as Record<string, unknown>;
  const metaFields = META_FIELDS[entity.type].filter(
    (f) => !(f.demoOnly && verified)
  );

  function metaValue(v: unknown): string | null {
    if (v === undefined || v === null || v === "") return null;
    if (Array.isArray(v)) return v.length ? v.join(", ") : null;
    return String(v);
  }

  function flashCrateHint() {
    setCrateHint(true);
    setTimeout(() => setCrateHint(false), 1500);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <div>
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
            style={{
              color: ENTITY_COLORS[entity.type],
              backgroundColor: `${ENTITY_COLORS[entity.type]}1f`,
            }}
          >
            {ENTITY_LABELS[entity.type]}
          </span>
          <h2 className="mt-2 text-lg font-semibold leading-tight">{entity.name}</h2>
          {entity.provenance === "demo" && (
            <span className="mt-1 inline-block rounded border border-border px-1.5 py-0.5 text-[10px] text-zinc-500">
              Demo data
            </span>
          )}
          {verified && entity.source && (
            <a
              href={entity.source.url}
              target="_blank"
              rel="noopener noreferrer"
              title="View on MusicBrainz"
              className="mt-1 inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-zinc-400 transition-colors duration-150 hover:bg-surface-2 hover:text-zinc-200"
            >
              MusicBrainz <ExternalLink size={9} />
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded p-1 text-zinc-500 transition-colors duration-150 hover:bg-surface-2 hover:text-zinc-200"
        >
          <X size={16} />
        </button>
      </div>

      {/* metadata */}
      <dl className="border-t border-border px-4 py-3">
        {metaFields.map((field) => {
          const value = metaValue(field.get(meta));
          return (
            <div key={field.label} className="mb-1.5 flex gap-2 text-sm">
              <dt className="w-24 shrink-0 text-zinc-500">{field.label}</dt>
              {value !== null ? (
                <dd className="text-zinc-200">{value}</dd>
              ) : (
                <dd className="italic text-zinc-600">Not available</dd>
              )}
            </div>
          );
        })}
      </dl>
      {verified && (
        <div className="border-t border-border px-4 py-2 text-[10px] text-zinc-500">
          Metadata retrieved from MusicBrainz. Artist credits are credits, not
          production or remix claims.
        </div>
      )}

      {/* connections */}
      {connectionGroups.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          {connectionGroups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                {group.label}
              </div>
              {group.items.map(({ rel, other }) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => onSelectNode(other.id)}
                  className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm text-zinc-300 transition-colors duration-150 hover:bg-surface-2 hover:text-zinc-100"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: ENTITY_COLORS[other.type] }}
                  />
                  <span className="truncate">{other.name}</span>
                </button>
              ))}
            </div>
          ))}
          {expansion && expansion.total > 0 && (
            <div className="mt-1 text-[11px] text-zinc-500">
              Showing {expansion.loaded} of {expansion.total} connections
            </div>
          )}
        </div>
      )}

      {/* actions */}
      <div className="mt-auto border-t border-border p-4">
        {failed && (
          <div className="mb-3 flex items-center justify-between gap-2 text-xs text-red-300/80">
            <span>Couldn&rsquo;t load connections from {providerLabel}</span>
            <button
              type="button"
              onClick={() =>
                expansion?.nextCursor
                  ? onLoadMore(entity.id)
                  : onExpand(entity.id)
              }
              className="rounded border border-border px-2 py-0.5 text-[11px] text-zinc-200 transition-colors duration-150 hover:bg-surface-2"
            >
              Retry
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onExpand(entity.id)}
            disabled={loading || (expanded && !failed)}
            className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors duration-150 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Loading…" : "Expand"}
          </button>
          {more && (
            <button
              type="button"
              onClick={() => onLoadMore(entity.id)}
              disabled={loading}
              className="rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-zinc-200 transition-colors duration-150 hover:bg-border disabled:opacity-50"
            >
              {loading ? "Loading…" : `Load more (${remaining} remaining)`}
            </button>
          )}
          <button
            type="button"
            onClick={flashCrateHint}
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-sm text-zinc-300 transition-colors duration-150 hover:bg-surface-2"
          >
            <Bookmark size={14} /> Save to Crate
          </button>
          <button
            type="button"
            disabled
            title="Listening links coming soon"
            className="flex cursor-not-allowed items-center gap-1.5 rounded border border-border px-3 py-1.5 text-sm text-zinc-500 opacity-50"
          >
            <ExternalLink size={14} /> Listen
          </button>
        </div>
        {crateHint && (
          <div className="mt-2 text-xs text-zinc-400">Coming soon</div>
        )}
      </div>
    </div>
  );
}
