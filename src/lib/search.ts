import type { MockDataset } from "@/data/mockMusic";
import type { MusicEntity } from "@/types/music";
import type { SearchResults } from "@/types/graph";

function haystacks(entity: MusicEntity): string[] {
  const aliases = entity.metadata?.aliases ?? [];
  return [entity.name, ...aliases].map((s) => s.toLowerCase());
}

function rank(entity: MusicEntity, query: string): number {
  // lower rank sorts first: name prefix < alias prefix < substring anywhere
  const name = entity.name.toLowerCase();
  if (name.startsWith(query)) return 0;
  if ((entity.metadata?.aliases ?? []).some((a) => a.toLowerCase().startsWith(query))) return 1;
  return 2;
}

export function searchEntities(data: MockDataset, query: string): SearchResults {
  const q = query.trim().toLowerCase();
  const results: SearchResults = { labels: [], artists: [], releases: [] };
  if (!q) return results;

  const matches = data.entities
    .filter((e) => haystacks(e).some((h) => h.includes(q)))
    .sort((a, b) => rank(a, q) - rank(b, q) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  for (const e of matches) {
    if (e.type === "label") results.labels.push(e);
    else if (e.type === "artist") results.artists.push(e);
    else results.releases.push(e);
  }
  return results;
}
