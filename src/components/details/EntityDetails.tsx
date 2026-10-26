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

const META_LABELS: Record<string, string> = {
  founded: "Founded",
  country: "Country",
  genres: "Genres",
  year: "Year",
  catalogNumber: "Catalogue no.",
  format: "Format",
  aliases: "Also known as",
  origin: "Origin",
  location: "Location",
  realName: "Real name",
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

function formatMeta(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
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
  const remaining = expansion ? expansion.total - expansion.loaded : 0;

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

  const metaEntries = Object.entries(entity.metadata ?? {}).filter(
    ([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)
  );

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
      {metaEntries.length > 0 && (
        <dl className="border-t border-border px-4 py-3">
          {metaEntries.map(([key, value]) => (
            <div key={key} className="mb-1.5 flex gap-2 text-sm">
              <dt className="w-24 shrink-0 text-zinc-500">
                {META_LABELS[key] ?? key}
              </dt>
              <dd className="text-zinc-200">{formatMeta(value)}</dd>
            </div>
          ))}
        </dl>
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
          {expansion && (
            <div className="mt-1 text-[11px] text-zinc-500">
              Showing {expansion.loaded} of {expansion.total} connections
            </div>
          )}
        </div>
      )}

      {/* actions */}
      <div className="mt-auto border-t border-border p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onExpand(entity.id)}
            disabled={expanded}
            className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors duration-150 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Expand
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
