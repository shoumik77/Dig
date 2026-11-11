"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, ExternalLink, Plus, X } from "lucide-react";
import type { GraphState } from "@/lib/graphState";
import { getExpansion, hasMore, isExpanded } from "@/lib/graphState";
import { ENTITY_COLORS, ENTITY_LABELS } from "@/components/graph/graphStyles";
import { SaveToCrateMenu } from "@/components/crates/SaveToCrateMenu";
import {
  artworkUrl,
  entityMetaLine,
  formatLength,
  initialsOf,
} from "@/lib/entityDisplay";
import type { Crate, CrateSummary } from "@/types/crate";
import type {
  EntityType,
  MusicEntity,
  MusicRelationship,
  ReleaseTrack,
} from "@/types/music";

interface EntityDetailsProps {
  state: GraphState;
  entity: MusicEntity | null;
  onSelectNode(id: string): void;
  /** select + pan the canvas to the node */
  onSelectAndCenter(id: string): void;
  onExpand(id: string): void;
  onLoadMore(id: string): void;
  onClose(): void;
  capabilities?: { discogs: boolean };
  crates?: CrateSummary[];
  /** crateIds already known to contain `entity` */
  savedCrateIds?: ReadonlySet<string>;
  onSaveToCrate?(crateId: string, entity: MusicEntity): Promise<boolean>;
  onCreateCrate?(name: string): Promise<Crate | undefined>;
}

const TYPE_TAGLINES: Record<EntityType, string> = {
  label: "A label on the map. Follow the records that shaped the floor.",
  artist: "A name behind the sound. Follow the records and labels around it.",
  "release-group": "A record in the web. Follow its connections to keep digging.",
  release: "A record in the web. Follow its connections to keep digging.",
  recording: "A track in the web. Follow it back to the record.",
};

function neighbors(
  state: GraphState,
  id: string
): { rel: MusicRelationship; other: MusicEntity }[] {
  const out: { rel: MusicRelationship; other: MusicEntity }[] = [];
  for (const rel of Object.values(state.edges)) {
    const otherId =
      rel.source === id ? rel.target : rel.target === id ? rel.source : null;
    if (!otherId) continue;
    const other = state.nodes[otherId];
    if (other) out.push({ rel, other });
  }
  return out;
}

function Artwork({
  entity,
  size,
  className = "",
}: {
  entity: MusicEntity;
  size: number;
  className?: string;
}) {
  const image = artworkUrl(entity);
  const round = entity.type === "artist" ? "rounded-full" : "rounded-md";
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={entity.name}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
        className={`shrink-0 object-cover outline-1 -outline-offset-1 outline-white/10 ${round} ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderColor: `${ENTITY_COLORS[entity.type]}66`,
        color: ENTITY_COLORS[entity.type],
      }}
      className={`flex shrink-0 items-center justify-center border bg-surface-2 text-xl font-medium ${round} ${className}`}
    >
      {initialsOf(entity.name)}
    </span>
  );
}

function RowThumb({ entity, onClick }: { entity: MusicEntity; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left transition-colors duration-150 hover:bg-surface-2/60"
    >
      <Artwork entity={entity} size={44} className="rounded" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-text">
          {entity.name}
        </span>
        <span className="block truncate text-xs text-muted">
          {entityMetaLine(entity).split("·").slice(1).join("·").trim() ||
            ENTITY_LABELS[entity.type]}
        </span>
      </span>
      <ArrowUpRight
        size={14}
        className="shrink-0 text-muted/60 transition-colors duration-150 group-hover:text-text"
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted/70">
      {children}
    </div>
  );
}

export function EntityDetails({
  state,
  entity,
  onSelectNode,
  onSelectAndCenter,
  onExpand,
  onLoadMore,
  onClose,
  capabilities,
  crates,
  savedCrateIds,
  onSaveToCrate,
  onCreateCrate,
}: EntityDetailsProps) {
  const reduceMotion = useReducedMotion();

  if (!entity) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted/70">
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

  const meta = (entity.metadata ?? {}) as Record<string, unknown>;
  const discogs = entity.enrichment?.discogs;
  const verified = entity.provenance === "verified";
  const discogsEnabled = capabilities?.discogs === true;
  const enrichFetched = entity.enrichment !== undefined;
  const discogsLoading =
    discogsEnabled && verified && !enrichFetched && entity.type !== "recording";

  const tracks =
    (entity.type === "release"
      ? (meta.tracks as ReleaseTrack[] | undefined)
      : undefined) ?? [];

  const nearby = neighbors(state, entity.id);
  const byType = (t: EntityType) =>
    nearby.filter((n) => n.other.type === t).map((n) => n.other);

  const labelNeighbors = byType("label");
  const artistNeighbors = byType("artist");
  const releaseNeighbors = nearby
    .filter((n) => n.other.type === "release" || n.other.type === "release-group")
    .map((n) => n.other);
  const genreChips = [
    ...new Set([
      ...((meta.genres as string[] | undefined) ?? []),
      ...(discogs?.genres ?? []),
      ...(discogs?.styles ?? []),
    ]),
  ].slice(0, 5);

  // "strongest connection" for the primary CTA
  const followTarget: MusicEntity | null = (() => {
    if (entity.type === "release" || entity.type === "release-group") {
      return (
        nearby.find((n) => n.other.type === "artist")?.other ??
        labelNeighbors[0] ??
        null
      );
    }
    if (entity.type === "recording") return releaseNeighbors[0] ?? null;
    return null;
  })();

  const ctaLabel = (() => {
    if (entity.type === "label") return "Explore label";
    if (entity.type === "release" || entity.type === "release-group")
      return followTarget ? `Follow ${followTarget.type === "artist" ? "the artist" : "the label"}` : null;
    if (entity.type === "recording") return followTarget ? "Open release" : null;
    return null;
  })();

  function runCta() {
    if (entity!.type === "label") {
      onExpand(entity!.id);
      onSelectAndCenter(entity!.id);
    } else if (followTarget) {
      onSelectAndCenter(followTarget.id);
    }
  }

  const labelCardCaption = [meta.location, meta.founded]
    .filter(Boolean)
    .join(" / ");
  const releaseYearish = meta.year ?? meta.date ?? meta.firstReleaseDate;
  const releaseYear =
    releaseYearish != null ? String(releaseYearish).slice(0, 4) : null;
  const releaseFormatLine = [meta.format, meta.country]
    .filter(Boolean)
    .join(" · ");

  const eyebrow =
    entity.type === "release" && meta.catalogNumber
      ? `${ENTITY_LABELS[entity.type].toUpperCase()} / ${String(meta.catalogNumber).toUpperCase()}`
      : ENTITY_LABELS[entity.type].toUpperCase();

  const subtitle = (() => {
    const location =
      (meta.location as string | undefined) ??
      (meta.country as string | undefined);
    switch (entity.type) {
      case "label": {
        const founded = meta.founded ?? meta.foundedDate;
        const place = [meta.location, meta.country].filter(Boolean).join(", ");
        return [place || null, founded && `Founded ${founded}`]
          .filter(Boolean)
          .join(" · ");
      }
      case "artist":
        return [location, (meta.artistType as string | undefined) ?? "DJ / Producer"]
          .filter(Boolean)
          .join(" · ");
      case "release":
      case "release-group":
        return (
          (meta.artistCredit as string | undefined) ??
          artistNeighbors[0]?.name ??
          ""
        );
      case "recording":
        return (meta.artistCredit as string | undefined) ?? "";
    }
  })();

  const description =
    discogs?.profile ??
    (meta.disambiguation as string | undefined) ??
    TYPE_TAGLINES[entity.type];

  const keepDigging = Object.values(state.nodes)
    .filter(
      (n) =>
        n.id !== entity.id &&
        (n.type === "release" || n.type === "release-group")
    )
    .slice(0, 6);

  return (
    <motion.div
      key={entity.id}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex h-full flex-col overflow-y-auto overscroll-contain bg-surface"
    >
      {/* eyebrow + close */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted/80">
          {eyebrow}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded-md border border-border p-1.5 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
        >
          <X size={13} />
        </button>
      </div>

      {/* artwork block */}
      <div className="px-4 pt-3">
        {entity.type === "label" && !artworkUrl(entity) ? (
          <div className="flex min-h-[130px] w-full flex-col justify-center rounded-md bg-cream px-5 py-4 text-bg">
            <span className="text-[26px] font-bold uppercase leading-[1.05] tracking-tight">
              {entity.name}
            </span>
            {labelCardCaption && (
              <span className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em]">
                {labelCardCaption}
              </span>
            )}
          </div>
        ) : entity.type === "release" || entity.type === "release-group" ? (
          <div className="flex gap-4">
            <Artwork entity={entity} size={150} />
            <div className="flex min-w-0 flex-col justify-center gap-1.5">
              {releaseYear && (
                <span className="text-2xl font-semibold tabular-nums text-text">
                  {releaseYear}
                </span>
              )}
              {labelNeighbors[0] && (
                <span className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                  {labelNeighbors[0].name}
                </span>
              )}
              {releaseFormatLine && (
                <span className="text-xs text-muted">{releaseFormatLine}</span>
              )}
              {genreChips.length > 0 && (
                <span className="text-xs text-muted">
                  {genreChips.slice(0, 2).join(" / ")}
                </span>
              )}
            </div>
          </div>
        ) : entity.type === "artist" ? (
          <div className="flex items-center gap-4">
            <Artwork entity={entity} size={104} />
            <div className="min-w-0">
              <h2 className="text-[26px] font-semibold leading-tight tracking-tight">
                {entity.name}
              </h2>
              {subtitle && (
                <div className="mt-1 text-sm text-muted">{subtitle}</div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* name + description */}
      <div className="px-4 pt-4">
        {entity.type !== "artist" && (
          <>
            <h2 className="text-[26px] font-semibold leading-tight tracking-tight">
              {entity.name}
            </h2>
            {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
          </>
        )}
        <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>

        {genreChips.length > 0 && entity.type !== "release" && entity.type !== "release-group" && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {genreChips.map((g) => (
              <span
                key={g}
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {discogsLoading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted/70">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" />
            Loading Discogs…
          </div>
        )}
      </div>

      {/* actions */}
      <div className="flex gap-2 px-4 pt-4">
        {onSaveToCrate && onCreateCrate ? (
          <SaveToCrateMenu
            entity={entity}
            crates={crates ?? []}
            savedCrateIds={savedCrateIds}
            onSave={onSaveToCrate}
            onCreateCrate={onCreateCrate}
          />
        ) : (
          <button
            type="button"
            disabled
            title="Crates unavailable"
            className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium text-muted/70 opacity-50"
          >
            <Plus size={14} /> Save to crate
          </button>
        )}
        {ctaLabel && (
          <button
            type="button"
            onClick={runCta}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-bg transition-colors duration-150 hover:bg-accent/85 enabled:active:scale-[0.96] motion-safe:transition-transform"
          >
            {ctaLabel} <ArrowUpRight size={14} />
          </button>
        )}
      </div>

      {/* per-type sections */}
      <div className="mt-4 flex flex-col gap-5 px-4 pb-4">
        {/* label → featured releases + artists */}
        {entity.type === "label" && releaseNeighbors.length > 0 && (
          <section>
            <SectionLabel>Featured releases</SectionLabel>
            <div className="mt-2 flex flex-col">
              {releaseNeighbors.slice(0, 4).map((r) => (
                <RowThumb key={r.id} entity={r} onClick={() => onSelectNode(r.id)} />
              ))}
            </div>
            {artistNeighbors.length > 0 && (
              <div className="mt-2 text-[11px] text-muted/80">
                Artists · {artistNeighbors.slice(0, 4).map((a) => a.name).join(", ")}
              </div>
            )}
          </section>
        )}

        {/* release → tracklist */}
        {tracks.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between">
              <SectionLabel>Tracks</SectionLabel>
              <span className="text-[9px] uppercase tracking-[0.14em] text-muted/60">
                Preview unavailable
              </span>
            </div>
            <div className="mt-1 divide-y divide-border/60">
              {tracks.map((track) => {
                const inGraph = Boolean(state.nodes[track.recordingId]);
                const row = (
                  <>
                    <span className="w-8 shrink-0 text-muted/70">
                      {track.number ?? track.position}
                    </span>
                    <span className="flex-1 truncate">{track.title}</span>
                    <span className="shrink-0 tabular-nums text-muted/70">
                      {track.lengthMs != null ? formatLength(track.lengthMs) : "—"}
                    </span>
                  </>
                );
                const cls =
                  "flex w-full items-baseline gap-2 px-1 py-2 text-left text-sm";
                return inGraph ? (
                  <button
                    key={`${track.medium ?? 0}:${track.position}`}
                    type="button"
                    onClick={() => onSelectNode(track.recordingId)}
                    className={`${cls} text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text`}
                  >
                    {row}
                  </button>
                ) : (
                  <div
                    key={`${track.medium ?? 0}:${track.position}`}
                    className={`${cls} text-muted`}
                  >
                    {row}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* release → keep digging */}
        {(entity.type === "release" || entity.type === "release-group") &&
          keepDigging.length > 0 && (
            <section>
              <SectionLabel>Keep digging</SectionLabel>
              <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
                {keepDigging.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectNode(r.id)}
                    title={r.name}
                    className="shrink-0 transition-transform duration-150 enabled:active:scale-[0.96] motion-safe:hover:scale-[1.03]"
                  >
                    <Artwork entity={r} size={72} />
                  </button>
                ))}
              </div>
            </section>
          )}

        {/* artist → associated labels + selected discography */}
        {entity.type === "artist" && (
          <>
            {labelNeighbors.length > 0 && (
              <section>
                <SectionLabel>Associated labels</SectionLabel>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {labelNeighbors.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => onSelectNode(l.id)}
                      className="flex items-center gap-1 text-sm font-medium text-text transition-colors duration-150 hover:text-accent"
                    >
                      {l.name} <ArrowUpRight size={12} className="text-muted" />
                    </button>
                  ))}
                </div>
              </section>
            )}
            {releaseNeighbors.length > 0 && (
              <section>
                <SectionLabel>Selected discography</SectionLabel>
                <div className="mt-2 flex flex-col">
                  {releaseNeighbors.slice(0, 5).map((r) => (
                    <RowThumb
                      key={r.id}
                      entity={r}
                      onClick={() => onSelectNode(r.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* recording → appears on */}
        {entity.type === "recording" && releaseNeighbors.length > 0 && (
          <section>
            <SectionLabel>Appears on</SectionLabel>
            <div className="mt-2 flex flex-col">
              {releaseNeighbors.slice(0, 4).map((r) => (
                <RowThumb key={r.id} entity={r} onClick={() => onSelectNode(r.id)} />
              ))}
            </div>
          </section>
        )}

        {/* other connections (anything not covered above) */}
        {entity.type !== "recording" && nearby.length > 0 && (
          <section>
            <SectionLabel>Connections</SectionLabel>
            <div className="mt-1 flex flex-col">
              {nearby
                .filter(
                  (n) =>
                    !(entity.type === "label" && n.other.type !== "label") &&
                    !(
                      entity.type === "release" &&
                      tracks.length > 0 &&
                      n.other.type === "recording"
                    )
                )
                .slice(0, 8)
                .map(({ rel, other }) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onSelectNode(other.id)}
                    className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: ENTITY_COLORS[other.type] }}
                    />
                    <span className="truncate">{other.name}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted/60">
                      {ENTITY_LABELS[other.type]}
                    </span>
                  </button>
                ))}
            </div>
            {expansion && expansion.total > 0 && (
              <div className="mt-1 px-1 text-[11px] text-muted/70">
                Showing {expansion.loaded} of {expansion.total} connections
              </div>
            )}
          </section>
        )}

        {/* Discogs extras: videos + community */}
        {discogs && (discogs.videos?.length || discogs.community) && (
          <section>
            <SectionLabel>From Discogs</SectionLabel>
            {discogs.community && (
              <div className="mt-1.5 text-xs text-muted/80">
                {discogs.community.have} have · {discogs.community.want} want
              </div>
            )}
            {discogs.videos?.map((v) => (
              <a
                key={v.url}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-baseline gap-2 text-sm text-muted transition-colors duration-150 hover:text-text"
              >
                <span className="flex-1 truncate">{v.title}</span>
                {v.durationSec != null && (
                  <span className="shrink-0 text-xs text-muted/70">
                    {formatLength(v.durationSec * 1000)}
                  </span>
                )}
                <ExternalLink size={11} className="shrink-0 self-center text-muted/70" />
              </a>
            ))}
          </section>
        )}

        {/* expansion controls + source captions */}
        <section className="border-t border-border pt-3">
          {failed && (
            <div className="mb-3 flex items-center justify-between gap-2 text-xs text-red-300/80">
              <span>Couldn&rsquo;t load connections from {providerLabel}</span>
              <button
                type="button"
                onClick={() =>
                  expansion?.nextCursor ? onLoadMore(entity.id) : onExpand(entity.id)
                }
                className="rounded border border-border px-2 py-0.5 text-[11px] text-text transition-colors duration-150 hover:bg-surface-2"
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
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Loading…" : "Expand"}
            </button>
            {more && (
              <button
                type="button"
                onClick={() => onLoadMore(entity.id)}
                disabled={loading}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text disabled:opacity-50"
              >
                {loading ? "Loading…" : `Load more (${remaining} remaining)`}
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted/60">
            {entity.provenance === "demo" ? (
              <span>Illustrative demo data</span>
            ) : (
              <span>
                Metadata retrieved from MusicBrainz. Artist credits are credits,
                not production or remix claims.
              </span>
            )}
            {verified && entity.source && (
              <a
                href={entity.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 transition-colors duration-150 hover:bg-surface-2 hover:text-text"
              >
                MusicBrainz <ExternalLink size={9} />
              </a>
            )}
            {discogs && (
              <a
                href={discogs.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 transition-colors duration-150 hover:bg-surface-2 hover:text-text"
              >
                Discogs <ExternalLink size={9} />
              </a>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
