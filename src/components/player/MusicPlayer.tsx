"use client";

import { Disc3, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
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

  return (
    <div className="flex h-20 items-center gap-4 border-t border-border bg-surface px-4">
      {/* track */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-border bg-surface-2 text-zinc-500">
          <Disc3 size={20} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-zinc-100">
            {release ? release.name : "Nothing selected"}
          </div>
          <div className="truncate text-xs text-zinc-500">
            {release ? artistName : "—"}
          </div>
        </div>
        <span className="ml-2 hidden shrink-0 rounded border border-label/40 px-2 py-0.5 text-[10px] text-label sm:inline">
          Prototype — playback not available
        </span>
      </div>

      {/* controls */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3 text-zinc-500">
          <button type="button" disabled aria-disabled="true" aria-label="Previous" className="cursor-not-allowed opacity-50">
            <SkipBack size={16} />
          </button>
          <button type="button" disabled aria-disabled="true" aria-label="Play" className="cursor-not-allowed rounded-full border border-border p-2 opacity-50">
            <Play size={16} />
          </button>
          <button type="button" disabled aria-disabled="true" aria-label="Next" className="cursor-not-allowed opacity-50">
            <SkipForward size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span>0:00</span>
          <div className="h-1 w-32 rounded-full bg-border" />
          <span>--:--</span>
        </div>
      </div>

      {/* volume */}
      <div className="hidden flex-1 items-center justify-end gap-2 text-zinc-500 sm:flex">
        <Volume2 size={15} />
        <input
          type="range"
          disabled
          aria-disabled="true"
          aria-label="Volume"
          className="w-20 cursor-not-allowed opacity-50"
        />
      </div>
    </div>
  );
}
