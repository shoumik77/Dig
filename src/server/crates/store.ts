import "server-only";
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { GraphServiceError } from "@/lib/graphErrors";
import type {
  Crate,
  CrateDetail,
  CrateItem,
  CrateSummary,
} from "@/types/crate";
import { ENTITY_TYPES, type MusicEntity } from "@/types/music";
import { getDb } from "./db";
import { MAX_CRATE_NAME_LENGTH, MAX_ENTITY_ID_LENGTH } from "./config";

interface CrateRow {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

interface ItemRow {
  crate_id: string;
  entity_id: string;
  entity_json: string;
  added_at: number;
}

function toCrate(row: CrateRow): Crate {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toItem(row: ItemRow): CrateItem {
  return {
    crateId: row.crate_id,
    entityId: row.entity_id,
    entity: JSON.parse(row.entity_json) as MusicEntity,
    addedAt: row.added_at,
  };
}

export function assertCrateName(name: unknown): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed || trimmed.length > MAX_CRATE_NAME_LENGTH) {
    throw new GraphServiceError(
      "invalid",
      `Crate name must be 1-${MAX_CRATE_NAME_LENGTH} characters`
    );
  }
  return trimmed;
}

export function assertEntity(entity: unknown): MusicEntity {
  const e = entity as MusicEntity | null;
  if (
    !e ||
    typeof e.id !== "string" ||
    !e.id ||
    e.id.length > MAX_ENTITY_ID_LENGTH ||
    typeof e.name !== "string" ||
    !e.name ||
    !ENTITY_TYPES.includes(e.type) ||
    (e.provenance !== "demo" && e.provenance !== "verified")
  ) {
    throw new GraphServiceError("invalid", "Invalid entity");
  }
  return e;
}

export interface CrateStore {
  list(): CrateSummary[];
  create(name: unknown): Crate;
  getDetail(id: string): CrateDetail;
  rename(id: string, name: unknown): Crate;
  remove(id: string): { id: string };
  saveItem(crateId: string, entity: unknown): CrateItem;
  removeItem(crateId: string, entityId: string): { entityId: string };
}

export function createCrateStore(db?: Database.Database): CrateStore {
  const d = () => db ?? getDb();

  function mustGet(id: string): CrateRow {
    const row = d()
      .prepare("SELECT * FROM crates WHERE id = ?")
      .get(id) as CrateRow | undefined;
    if (!row) throw new GraphServiceError("not_found", "Crate not found");
    return row;
  }

  function touch(id: string, now: number) {
    d().prepare("UPDATE crates SET updated_at = ? WHERE id = ?").run(now, id);
  }

  return {
    list() {
      const rows = d()
        .prepare(
          `SELECT c.*, COUNT(i.entity_id) AS item_count
           FROM crates c LEFT JOIN crate_items i ON i.crate_id = c.id
           GROUP BY c.id ORDER BY c.created_at ASC, c.id ASC`
        )
        .all() as (CrateRow & { item_count: number })[];
      return rows.map((r) => ({ ...toCrate(r), itemCount: r.item_count }));
    },

    create(name) {
      const clean = assertCrateName(name);
      const now = Date.now();
      const crate: Crate = {
        id: `crate:${randomUUID()}`,
        name: clean,
        createdAt: now,
        updatedAt: now,
      };
      d()
        .prepare(
          "INSERT INTO crates (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)"
        )
        .run(crate.id, crate.name, crate.createdAt, crate.updatedAt);
      return crate;
    },

    getDetail(id) {
      const crate = toCrate(mustGet(id));
      const items = (
        d()
          .prepare(
            "SELECT * FROM crate_items WHERE crate_id = ? ORDER BY added_at ASC, entity_id ASC"
          )
          .all(id) as ItemRow[]
      ).map(toItem);
      return { ...crate, items };
    },

    rename(id, name) {
      const clean = assertCrateName(name);
      mustGet(id);
      const now = Date.now();
      d()
        .prepare("UPDATE crates SET name = ?, updated_at = ? WHERE id = ?")
        .run(clean, now, id);
      return toCrate(mustGet(id));
    },

    remove(id) {
      mustGet(id);
      d().prepare("DELETE FROM crates WHERE id = ?").run(id);
      return { id };
    },

    saveItem(crateId, entity) {
      mustGet(crateId);
      const e = assertEntity(entity);
      const now = Date.now();
      d()
        .prepare(
          `INSERT INTO crate_items (crate_id, entity_id, entity_json, added_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (crate_id, entity_id)
           DO UPDATE SET entity_json = excluded.entity_json, added_at = excluded.added_at`
        )
        .run(crateId, e.id, JSON.stringify(e), now);
      touch(crateId, now);
      return {
        crateId,
        entityId: e.id,
        entity: e,
        addedAt: now,
      };
    },

    removeItem(crateId, entityId) {
      mustGet(crateId);
      const res = d()
        .prepare(
          "DELETE FROM crate_items WHERE crate_id = ? AND entity_id = ?"
        )
        .run(crateId, entityId);
      if (res.changes === 0) {
        throw new GraphServiceError("not_found", "Item not found");
      }
      touch(crateId, Date.now());
      return { entityId };
    },
  };
}

export const crateStore = createCrateStore();
