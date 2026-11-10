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
  "flex h-8 w-8 items-center justify-center text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text first:rounded-t-md last:rounded-b-md";

export function GraphControls({ onZoomIn, onZoomOut, onFit, onReset }: GraphControlsProps) {
  return (
    <>
      <div className="absolute bottom-4 left-4 rounded-md border border-border bg-surface/85 px-3 py-2 text-[11px] text-muted backdrop-blur-sm">
        {(
          [
            "label",
            "artist",
            "release-group",
            "release",
            "recording",
          ] as EntityType[]
        ).map((t) => (
          <div key={t} className="flex items-center gap-2 py-px">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: ENTITY_COLORS[t] }}
            />
            {ENTITY_LABELS[t]}
          </div>
        ))}
        <div className="mt-1.5 border-t border-border pt-1.5 text-[10px] text-muted/70">
          Dashed outline = more connections to load
        </div>
      </div>
      <div className="absolute bottom-4 right-4 flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border bg-surface/85 backdrop-blur-sm">
        <button type="button" className={buttonClass} onClick={onZoomIn} aria-label="Zoom in">
          <Plus size={15} />
        </button>
        <button type="button" className={buttonClass} onClick={onZoomOut} aria-label="Zoom out">
          <Minus size={15} />
        </button>
        <button type="button" className={buttonClass} onClick={onFit} aria-label="Fit graph">
          <Maximize2 size={15} />
        </button>
        <button type="button" className={buttonClass} onClick={onReset} aria-label="Reset graph">
          <RotateCcw size={15} />
        </button>
      </div>
    </>
  );
}
