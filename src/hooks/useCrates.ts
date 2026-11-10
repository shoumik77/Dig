"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCrateService,
  type CrateService,
} from "@/lib/crateService";
import type {
  Crate,
  CrateDetail,
  CrateItem,
  CrateSummary,
} from "@/types/crate";
import type { MusicEntity } from "@/types/music";

const defaultService = createCrateService();

export interface UseCrates {
  crates: CrateSummary[];
  /** crate currently expanded in the sidebar, if any */
  openCrateId: string | null;
  /** items of the open crate */
  items: CrateItem[];
  /** entityId -> crateIds known to contain it (detail loads + mutations) */
  membership: ReadonlyMap<string, ReadonlySet<string>>;
  loading: boolean;
  error: string | null;
  toggle(id: string): void;
  refresh(): Promise<void>;
  create(name: string): Promise<Crate | undefined>;
  rename(id: string, name: string): Promise<boolean>;
  remove(id: string): Promise<boolean>;
  save(crateId: string, entity: MusicEntity): Promise<boolean>;
  unsave(crateId: string, entityId: string): Promise<boolean>;
}

function setIn(
  map: ReadonlyMap<string, ReadonlySet<string>>,
  entityId: string,
  crateId: string
) {
  const next = new Map(map);
  next.set(entityId, new Set([...(next.get(entityId) ?? []), crateId]));
  return next;
}

function removeIn(
  map: ReadonlyMap<string, ReadonlySet<string>>,
  entityId: string,
  crateId: string
) {
  const prev = map.get(entityId);
  if (!prev?.has(crateId)) return map;
  const next = new Map(map);
  const set = new Set(prev);
  set.delete(crateId);
  if (set.size > 0) next.set(entityId, set);
  else next.delete(entityId);
  return next;
}

function removeCrate(
  map: ReadonlyMap<string, ReadonlySet<string>>,
  crateId: string
) {
  const next = new Map(map);
  for (const [entityId, set] of next) {
    if (set.has(crateId)) {
      const s = new Set(set);
      s.delete(crateId);
      if (s.size > 0) next.set(entityId, s);
      else next.delete(entityId);
    }
  }
  return next;
}

function applyDetail(
  map: ReadonlyMap<string, ReadonlySet<string>>,
  detail: CrateDetail
) {
  let next = removeCrate(map, detail.id);
  for (const item of detail.items) {
    next = setIn(next, item.entityId, detail.id);
  }
  return next;
}

export function useCrates(service: CrateService = defaultService): UseCrates {
  const [crates, setCrates] = useState<CrateSummary[]>([]);
  const [openCrateId, setOpenCrateId] = useState<string | null>(null);
  const [items, setItems] = useState<CrateItem[]>([]);
  const [membership, setMembership] = useState<
    ReadonlyMap<string, ReadonlySet<string>>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const detailSeq = useRef(0);

  const report = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : "Something went wrong");
  }, []);

  const refresh = useCallback(async () => {
    try {
      setCrates(await service.list());
      setError(null);
    } catch (err) {
      report(err);
    } finally {
      setLoading(false);
    }
  }, [service, report]);

  const loadDetail = useCallback(
    async (crateId: string) => {
      const seq = ++detailSeq.current;
      try {
        const detail = await service.getDetail(crateId);
        if (seq !== detailSeq.current) return;
        setItems(detail.items);
        setMembership((prev) => applyDetail(prev, detail));
        setError(null);
      } catch (err) {
        if (seq === detailSeq.current) report(err);
      }
    },
    [service, report]
  );

  useEffect(() => {
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  function toggle(id: string) {
    if (openCrateId === id) {
      setOpenCrateId(null);
      setItems([]);
      return;
    }
    setOpenCrateId(id);
    setItems([]);
    void loadDetail(id);
  }

  async function create(name: string): Promise<Crate | undefined> {
    try {
      const crate = await service.create(name);
      await refresh();
      return crate;
    } catch (err) {
      report(err);
      return undefined;
    }
  }

  async function rename(id: string, name: string): Promise<boolean> {
    try {
      await service.rename(id, name);
      await refresh();
      return true;
    } catch (err) {
      report(err);
      return false;
    }
  }

  async function remove(id: string): Promise<boolean> {
    try {
      await service.remove(id);
      setMembership((prev) => removeCrate(prev, id));
      if (openCrateId === id) {
        setOpenCrateId(null);
        setItems([]);
      }
      await refresh();
      return true;
    } catch (err) {
      report(err);
      return false;
    }
  }

  async function save(crateId: string, entity: MusicEntity): Promise<boolean> {
    try {
      await service.saveItem(crateId, entity);
      setMembership((prev) => setIn(prev, entity.id, crateId));
      await refresh();
      if (openCrateId === crateId) await loadDetail(crateId);
      return true;
    } catch (err) {
      report(err);
      return false;
    }
  }

  async function unsave(crateId: string, entityId: string): Promise<boolean> {
    try {
      await service.removeItem(crateId, entityId);
      setMembership((prev) => removeIn(prev, entityId, crateId));
      await refresh();
      if (openCrateId === crateId) await loadDetail(crateId);
      return true;
    } catch (err) {
      report(err);
      return false;
    }
  }

  return {
    crates,
    openCrateId,
    items,
    membership,
    loading,
    error,
    toggle,
    refresh,
    create,
    rename,
    remove,
    save,
    unsave,
  };
}
