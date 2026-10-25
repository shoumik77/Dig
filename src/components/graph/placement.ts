// Deterministic ring placement for newly revealed nodes — pure.
export interface Position {
  x: number;
  y: number;
}

export interface RingPositionsOptions {
  center: Position;
  count: number;
  ring: number;
  existing: Position[];
  seed: string;
}

const BASE_RADIUS = 160;
const RING_STEP = 110;
const COLLISION_DISTANCE = 40;
const COLLISION_DISTANCE_SQ = COLLISION_DISTANCE * COLLISION_DISTANCE;
const MAX_NUDGE_ITERATIONS = 8;
const NUDGE_STEP = 12;

export function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function isFree(position: Position, existing: Position[]): boolean {
  return !existing.some((p) => {
    const dx = p.x - position.x;
    const dy = p.y - position.y;
    return dx * dx + dy * dy < COLLISION_DISTANCE_SQ;
  });
}

export function ringPositions({
  center,
  count,
  ring,
  existing,
  seed,
}: RingPositionsOptions): Position[] {
  if (count <= 0) return [];

  const radius = BASE_RADIUS + ring * RING_STEP;
  const offset = ((hashString(seed) % 360) * Math.PI) / 180;
  const claimed: Position[] = [...existing];
  const positions: Position[] = [];

  for (let i = 0; i < count; i++) {
    const angle = offset + (i * 2 * Math.PI) / count;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const position = { x: center.x + radius * cos, y: center.y + radius * sin };

    let r = radius;
    for (let n = 0; n < MAX_NUDGE_ITERATIONS && !isFree(position, claimed); n++) {
      r += NUDGE_STEP;
      position.x = center.x + r * cos;
      position.y = center.y + r * sin;
    }

    positions.push(position);
    claimed.push(position);
  }

  return positions;
}
