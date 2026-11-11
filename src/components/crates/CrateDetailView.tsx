"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import {
  artworkUrl,
  crateTagline,
  entityMetaLine,
  initialsOf,
  relativeTime,
} from "@/lib/entityDisplay";
import { ENTITY_COLORS, ENTITY_LABELS } from "@/components/graph/graphStyles";
import { CrateCollage } from "./CrateCollage";
import type { CrateDetail, CrateItem } from "@/types/crate";
import type { MusicEntity } from "@/types/music";

interface CrateDetailViewProps {
  crateId: string;
  demo: boolean;
  getDetail(id: string): Promise<CrateDetail | undefined>;
  /** seed the graph from the crate's first item and go explore */
  onExploreCrate(entity: MusicEntity): void;
  /** open a single find in the explorer */
  onOpenItem(item: CrateItem): void;
  onRemoveItem(crateId: string, entityId: string): Promise<unknown>;
}

function ItemThumb({ entity }: { entity: MusicEntity }) {
  const image = artworkUrl(entity);
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        className={`h-12 w-12 shrink-0 object-cover outline-1 -outline-offset-1 outline-white/10 ${
          entity.type === "artist" ? "rounded-full" : "rounded-sm"
        }`}
      />
    );
  }
  if (entity.type === "label") {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-cream text-sm font-semibold text-bg">
        {initialsOf(entity.name)}
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{
        borderColor: `${ENTITY_COLORS[entity.type]}55`,
        color: ENTITY_COLORS[entity.type],
      }}
      className={`flex h-12 w-12 shrink-0 items-center justify-center border bg-surface-2 text-xs font-medium ${
        entity.type === "artist" ? "rounded-full" : "rounded-sm"
      }`}
    >
      {initialsOf(entity.name)}
    </span>
  );
}

export function CrateDetailView({
  crateId,
  demo,
  getDetail,
  onExploreCrate,
  onOpenItem,
  onRemoveItem,
}: CrateDetailViewProps) {
  const [detail, setDetail] = useState<CrateDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void getDetail(crateId).then((d) => {
      if (cancelled) return;
      if (d) setDetail(d);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [crateId, getDetail, reloadKey]);

  async function removeItem(entityId: string) {
    await onRemoveItem(crateId, entityId);
    setReloadKey((k) => k + 1);
  }

  if (!detail) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted/70">
        {failed ? "Couldn't load this crate" : "Loading…"}
      </div>
    );
  }

  const entities = detail.items.map((i) => i.entity);
  const first = detail.items[0];

  return (
    <div className="flex h-full gap-8 overflow-y-auto overscroll-contain px-8 pb-10 pt-2 max-lg:flex-col">
      {/* left: collage + manifesto */}
      <div className="w-full shrink-0 lg:w-[300px]">
        <div className="flex items-center justify-center rounded-lg bg-surface py-8">
          <CrateCollage entities={entities} size={120} />
        </div>
        <div className="mt-5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted/70">
          {detail.name}
        </div>
        <h3 className="mt-1 text-[22px] font-semibold leading-snug tracking-tight text-text">
          {crateTagline(detail.id)}
        </h3>
        <div className="mt-2 text-xs text-muted">
          {detail.items.length} finds
        </div>
        {first && (
          <button
            type="button"
            onClick={() => onExploreCrate(first.entity)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition-colors duration-150 hover:bg-accent/85 enabled:active:scale-[0.96] motion-safe:transition-transform"
          >
            Explore these connections <ArrowUpRight size={14} />
          </button>
        )}
        <div className="mt-3 text-[11px] text-muted/70">
          Only you · {demo ? "Illustrative collection" : "Saved collection"}
        </div>
      </div>

      {/* right: finds table */}
      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-[1fr_160px_130px_24px] gap-3 border-b border-transparent pb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted/70 max-md:grid-cols-[1fr_90px_24px]">
          <span>Find</span>
          <span className="max-md:hidden">Type / Origin</span>
          <span className="max-md:hidden">Added</span>
          <span />
        </div>
        {detail.items.length === 0 && (
          <div className="py-8 text-sm text-muted/70">
            Empty crate — save entities from the details panel.
          </div>
        )}
        <div className="divide-y divide-border/60">
          {detail.items.map((item) => (
            <div
              key={item.entityId}
              className="group grid grid-cols-[1fr_160px_130px_24px] items-center gap-3 py-3 max-md:grid-cols-[1fr_90px_24px]"
            >
              <button
                type="button"
                onClick={() => onOpenItem(item)}
                className="flex min-w-0 items-center gap-3 text-left"
              >
                <ItemThumb entity={item.entity} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-text">
                    {item.entity.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {entityMetaLine(item.entity).split("·").slice(1).join("·").trim() ||
                      ENTITY_LABELS[item.entity.type]}
                  </span>
                </span>
              </button>
              <span className="text-xs text-muted max-md:hidden">
                {ENTITY_LABELS[item.entity.type]}
              </span>
              <span className="text-xs text-muted max-md:hidden">
                {relativeTime(item.addedAt)}
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenItem(item)}
                  aria-label={`Explore ${item.entity.name}`}
                  className="rounded p-1 text-muted/70 transition-colors duration-150 hover:text-text"
                >
                  <ArrowUpRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void removeItem(item.entityId)}
                  aria-label={`Remove ${item.entity.name}`}
                  className="rounded p-1 text-muted/50 opacity-0 transition-opacity duration-150 hover:text-text group-hover:opacity-100"
                >
                  <X size={13} />
                </button>
              </span>
            </div>
          ))}
        </div>
        {demo && detail.items.length > 0 && (
          <div className="pt-8 text-center text-[11px] text-muted/70">
            Showing a curated preview of this demo collection.
          </div>
        )}
      </div>
    </div>
  );
}
