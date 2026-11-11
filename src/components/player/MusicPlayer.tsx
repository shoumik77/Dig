"use client";

import { Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { artworkUrl, initialsOf } from "@/lib/entityDisplay";
import { ENTITY_COLORS } from "@/components/graph/graphStyles";
import type { GraphState } from "@/lib/graphState";
import type { MusicEntity } from "@/types/music";

interface MusicPlayerProps {
  state: GraphState;
  entity: MusicEntity | null;
}

export function MusicPlayer({ state, entity }: MusicPlayerProps) {
  const release = entity?.type === "release" ? entity : null;
  let artistName = "—";
  if (release) {
    for (const rel of Object.values(state.edges)) {
      if (
        rel.source === release.id &&
        rel.type === "performed_by" &&
        state.nodes[rel.target]
      ) {
        artistName = state.nodes[rel.target].name;
        break;
      }
    }
  }

  const image = release ? artworkUrl(release) : undefined;
  const thumb = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt=""
      referrerPolicy="no-referrer"
      className="h-full w-full rounded object-cover outline-1 -outline-offset-1 outline-white/10"
    />
  ) : (
    <span
      className="flex h-full w-full items-center justify-center rounded border text-sm font-medium"
      style={{
        borderColor: `${ENTITY_COLORS.release}55`,
        color: ENTITY_COLORS.release,
        backgroundColor: "#1c1c1f",
      }}
    >
      {release ? initialsOf(release.name) : "—"}
    </span>
  );

  return (
    <>
      {/* desktop bar */}
      <div className="hidden h-20 items-center gap-4 border-t border-border bg-[#141414] px-4 lg:flex">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-12 w-12 shrink-0">{thumb}</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-text">
              {release ? release.name : "Nothing selected"}
            </div>
            <div className="truncate text-xs text-muted/80">
              {release ? artistName : "—"}
            </div>
          </div>
          <span className="ml-3 hidden shrink-0 rounded border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-muted md:inline">
            Preview · Playback unavailable
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4 text-muted">
            <button type="button" disabled aria-label="Previous" className="cursor-not-allowed opacity-60">
              <SkipBack size={15} />
            </button>
            <button type="button" disabled aria-label="Play" className="cursor-not-allowed opacity-60">
              <Play size={16} />
            </button>
            <button type="button" disabled aria-label="Next" className="cursor-not-allowed opacity-60">
              <SkipForward size={15} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] tabular-nums text-muted/70">
            <span>0:00</span>
            <div className="h-px w-44 bg-border" />
            <span>--:--</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 text-muted/80">
          <Volume2 size={15} />
          <input
            type="range"
            disabled
            aria-label="Volume"
            className="w-24 cursor-not-allowed opacity-50"
          />
        </div>
      </div>

      {/* mobile compact row — sits above the bottom tab bar */}
      <div className="flex items-center gap-3 border-t border-border bg-[#141414] px-3 py-2.5 lg:hidden">
        <div className="h-10 w-10 shrink-0">{thumb}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-text">
            {release ? release.name : "Nothing selected"}
          </div>
          <div className="truncate text-[11px] text-muted/80">
            Preview · playback unavailable
          </div>
        </div>
        <button type="button" disabled aria-label="Play" className="cursor-not-allowed text-muted opacity-60">
          <Play size={18} />
        </button>
      </div>
    </>
  );
}
