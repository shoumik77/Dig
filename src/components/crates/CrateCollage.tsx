"use client";

import { artworkUrl, initialsOf } from "@/lib/entityDisplay";
import { ENTITY_COLORS } from "@/components/graph/graphStyles";
import type { MusicEntity } from "@/types/music";

const TILT = ["-6deg", "3deg", "6deg"];
const OFFSET = ["-14%", "0%", "14%"];

function Tile({ entity, size }: { entity: MusicEntity; size: number }) {
  const image = artworkUrl(entity);
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
        className="rounded-sm object-cover outline-1 -outline-offset-1 outline-white/10"
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
      className="flex items-center justify-center rounded-sm border bg-surface-2 font-medium"
    >
      {initialsOf(entity.name)}
    </span>
  );
}

/** Fanned stack of up to 3 record tiles representing a crate. */
export function CrateCollage({
  entities,
  size = 120,
}: {
  entities: MusicEntity[];
  size?: number;
}) {
  const shown = entities.slice(0, 3);
  if (shown.length === 0) {
    return (
      <div
        style={{ width: size * 1.4, height: size }}
        className="flex items-center justify-center rounded-md border border-dashed border-border text-xs text-muted/60"
      >
        Empty crate
      </div>
    );
  }
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size * 1.6, height: size * 1.1 }}
    >
      {shown.map((entity, i) => (
        <div
          key={entity.id}
          className="absolute shadow-lg shadow-black/40 transition-transform duration-150"
          style={{
            transform: `translateX(${OFFSET[i]}) rotate(${TILT[i]})`,
            zIndex: shown.length - i,
          }}
        >
          <Tile entity={entity} size={size} />
        </div>
      ))}
    </div>
  );
}
