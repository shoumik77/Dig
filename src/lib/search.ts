import type { MockDataset } from "@/data/mockMusic";
import type { MusicEntity } from "@/types/music";
import type { SearchResults } from "@/types/graph";

function aliasesOf(entity: MusicEntity): string[] {
  const meta = entity.metadata;
  return meta && "aliases" in meta ? (meta.aliases ?? []) : [];
}

function haystacks(entity: MusicEntity): string[] {
  return [entity.name, ...aliasesOf(entity)].map((s) => s.toLowerCase());
}

function rank(entity: MusicEntity, query: string): number {
  // lower rank sorts first: name prefix < alias prefix < substring anywhere
  const name = entity.name.toLowerCase();
  if (name.startsWith(query)) return 0;
  if (aliasesOf(entity).some((a) => a.toLowerCase().startsWith(query))) return 1;
  return 2;
}

function emptyResults(): SearchResults {
  return {
    label: [],
    artist: [],
    "release-group": [],
    release: [],
    recording: [],
  };
}

export function searchEntities(data: MockDataset, query: string): SearchResults {
  const q = query.trim().toLowerCase();
  const results = emptyResults();
  if (!q) return results;

  const matches = data.entities
    .filter((e) => haystacks(e).some((h) => h.includes(q)))
    .sort((a, b) => rank(a, q) - rank(b, q) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  for (const e of matches) {
    results[e.type].push(e);
  }
  return results;
}
