"use client";

import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { ENTITY_COLORS, ENTITY_LABELS } from "./graphStyles";
import type { EntityType } from "@/types/music";

interface GraphControlsProps {
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
  onReset(): void;
}

const buttonClass =
  "flex h-8 w-8 items-center justify-center border border-border bg-surface text-zinc-300 transition-colors duration-150 hover:bg-surface-2 hover:text-zinc-100";

export function GraphControls({ onZoomIn, onZoomOut, onFit, onReset }: GraphControlsProps) {
  return (
    <>
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 rounded bg-surface/90 px-3 py-2 text-xs text-zinc-400 border border-border">
        {(["label", "artist", "release"] as EntityType[]).map((t) => (
          <div key={t} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: ENTITY_COLORS[t] }}
            />
            {ENTITY_LABELS[t]}
          </div>
        ))}
        <div className="mt-1 border-t border-border pt-1.5 text-[10px] text-zinc-500">
          Dashed outline = more connections to load
        </div>
      </div>
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button type="button" className={buttonClass} onClick={onZoomIn} aria-label="Zoom in">
          <Plus size={16} />
        </button>
        <button type="button" className={buttonClass} onClick={onZoomOut} aria-label="Zoom out">
          <Minus size={16} />
        </button>
        <button type="button" className={buttonClass} onClick={onFit} aria-label="Fit graph">
          <Maximize2 size={16} />
        </button>
        <button type="button" className={buttonClass} onClick={onReset} aria-label="Reset graph">
          <RotateCcw size={16} />
        </button>
      </div>
    </>
  );
}
