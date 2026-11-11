"use client";

import { Crosshair, Minus, Plus } from "lucide-react";
import { ENTITY_COLORS } from "./graphStyles";

interface GraphControlsProps {
  zoomPct: number;
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
}

const buttonClass =
  "flex h-9 w-9 items-center justify-center text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text";

function LegendGlyph({ kind }: { kind: "square" | "circle" | "rect" | "arrow" }) {
  const color =
    kind === "square"
      ? ENTITY_COLORS.release
      : kind === "circle"
        ? ENTITY_COLORS.artist
        : kind === "rect"
          ? ENTITY_COLORS.label
          : ENTITY_COLORS.recording;
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0">
      {kind === "square" && (
        <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill={color} />
      )}
      {kind === "circle" && <circle cx="6" cy="6" r="4.5" fill={color} />}
      {kind === "rect" && (
        <rect x="1" y="3" width="10" height="6" rx="1" fill={color} />
      )}
      {kind === "arrow" && (
        <path
          d="M2.5 10.5 9.5 3.5M9.5 3.5H5M9.5 3.5V8"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function GraphControls({ zoomPct, onZoomIn, onZoomOut, onFit }: GraphControlsProps) {
  return (
    <div className="flex items-center gap-4">
      {/* legend — mirrors the node shapes on the canvas */}
      <div className="hidden items-center gap-3 text-[10px] text-muted sm:flex">
        <span className="flex items-center gap-1.5">
          <LegendGlyph kind="square" /> Release
        </span>
        <span className="flex items-center gap-1.5">
          <LegendGlyph kind="circle" /> Artist
        </span>
        <span className="flex items-center gap-1.5">
          <LegendGlyph kind="rect" /> Label
        </span>
        <span className="flex items-center gap-1.5">
          <LegendGlyph kind="arrow" /> Recording
        </span>
      </div>

      <div className="flex divide-x divide-border overflow-hidden rounded-md border border-border bg-surface/85 backdrop-blur-sm">
        <button type="button" className={buttonClass} onClick={onZoomOut} aria-label="Zoom out">
          <Minus size={14} />
        </button>
        <button
          type="button"
          className={`${buttonClass} w-14 text-xs tabular-nums`}
          onClick={onFit}
          aria-label="Fit graph"
          title="Fit graph"
        >
          {zoomPct}%
        </button>
        <button type="button" className={buttonClass} onClick={onZoomIn} aria-label="Zoom in">
          <Plus size={14} />
        </button>
        <button type="button" className={buttonClass} onClick={onFit} aria-label="Center graph">
          <Crosshair size={14} />
        </button>
      </div>
    </div>
  );
}
