import type { MusicEntity } from "./music";

export interface Crate {
  /** `crate:{uuid}` */
  id: string;
  /** trimmed, 1–80 chars */
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface CrateSummary extends Crate {
  itemCount: number;
}

export interface CrateItem {
  crateId: string;
  /** MusicEntity.id, e.g. `mb:label:{uuid}` or `label:strictly-rhythm` */
  entityId: string;
  /** snapshot saved at add-time — source of truth for list display */
  entity: MusicEntity;
  addedAt: number;
}

export interface CrateDetail extends Crate {
  /** ordered by addedAt asc */
  items: CrateItem[];
}
