// Pure normalization from raw Discogs JSON to DiscogsEnrichment. No I/O.
import type { DiscogsEnrichment, DiscogsKind } from "@/types/music";
import type {
  DGArtist,
  DGArtistRef,
  DGCommunity,
  DGImage,
  DGLabel,
  DGMaster,
  DGRelease,
  DGTrack,
  DGVideo,
} from "./types";

const PROFILE_MAX = 600;

const YOUTUBE_RE = /^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i;

function dedupe(values: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function compact<T extends object>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out) as (keyof T)[]) {
    const v = out[k];
    if (v === undefined || v === null || v === "") delete out[k];
    if (Array.isArray(v) && v.length === 0) delete out[k];
  }
  return out;
}

/** Strip Discogs profile markup ([a=…], [l=…], [a123], [r=123], [url=…]…) to plain text. */
export function stripDiscogsMarkup(text: string): string {
  return text
    .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, "$2")
    .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, "$1")
    .replace(/\[[al]=([^\]]+)\]/gi, "$1")
    .replace(/\[[a-z]+=\d+\]/gi, "")
    .replace(/\[[a-z]+\d+\]/gi, "")
    .replace(/\[\/?[a-z]+\]/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncateProfile(text: string): string {
  const clean = stripDiscogsMarkup(text);
  if (clean.length <= PROFILE_MAX) return clean;
  const cut = clean.slice(0, PROFILE_MAX);
  const boundary = cut.lastIndexOf(" ");
  return `${cut.slice(0, boundary > 0 ? boundary : PROFILE_MAX).trimEnd()}…`;
}

function pickImage(images?: DGImage[]): DGImage | undefined {
  if (!images?.length) return undefined;
  return images.find((i) => i.type === "primary") ?? images[0];
}

function normalizeVideos(videos?: DGVideo[]) {
  const seen = new Set<string>();
  const out: { url: string; title: string; durationSec?: number }[] = [];
  for (const v of videos ?? []) {
    const url = v.uri;
    if (!url || !YOUTUBE_RE.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push(
      compact({
        url,
        title: v.title ?? url,
        durationSec:
          typeof v.duration === "number" ? v.duration : undefined,
      })
    );
  }
  return out.length ? out : undefined;
}

interface CreditAcc {
  name: string;
  role: string;
  discogsArtistId?: number;
  tracks?: string;
}

function normalizeCredits(
  extraartists?: DGArtistRef[],
  tracklist?: DGTrack[]
): CreditAcc[] | undefined {
  const acc = new Map<string, CreditAcc>();
  for (const c of extraartists ?? []) {
    if (!c.name || !c.role) continue;
    const key = `${c.name}¦${c.role}`;
    const existing = acc.get(key);
    const tracks = dedupe([existing?.tracks, c.tracks]).join(", ");
    acc.set(
      key,
      compact<CreditAcc>({
        name: c.name,
        role: c.role,
        discogsArtistId: c.id,
        tracks: tracks || undefined,
      })
    );
  }
  // roll up per-track credits (position → track list)
  const perTrack = new Map<string, Set<string>>();
  for (const t of tracklist ?? []) {
    for (const c of t.extraartists ?? []) {
      if (!c.name || !c.role || !t.position) continue;
      const key = `${c.name}¦${c.role}`;
      const set = perTrack.get(key) ?? new Set<string>();
      set.add(t.position);
      perTrack.set(key, set);
    }
  }
  for (const [key, positions] of perTrack) {
    const [name, role] = key.split("¦");
    const tracks = [...positions].sort().join(", ");
    const existing = acc.get(key);
    if (existing) {
      existing.tracks = dedupe([existing.tracks, tracks]).join(", ");
    } else {
      acc.set(key, { name, role, tracks });
    }
  }
  const out = [...acc.values()];
  return out.length ? out : undefined;
}

function normalizeFormats(
  formats?: { name?: string; qty?: string; descriptions?: string[] }[]
): string[] | undefined {
  const out = dedupe(
    (formats ?? []).map((f) =>
      [f.name, ...(f.descriptions ?? [])].filter(Boolean).join(", ")
    )
  );
  return out.length ? out : undefined;
}

function communityOf(c?: DGCommunity) {
  return c && (c.have != null || c.want != null)
    ? { have: c.have ?? 0, want: c.want ?? 0 }
    : undefined;
}

export function toEnrichment(
  kind: "release",
  raw: DGRelease
): DiscogsEnrichment;
export function toEnrichment(
  kind: "master",
  raw: DGMaster
): DiscogsEnrichment;
export function toEnrichment(
  kind: "artist",
  raw: DGArtist
): DiscogsEnrichment;
export function toEnrichment(
  kind: "label",
  raw: DGLabel
): DiscogsEnrichment;
export function toEnrichment(
  kind: DiscogsKind,
  raw: DGRelease | DGMaster | DGArtist | DGLabel
): DiscogsEnrichment {
  const r = raw as DGRelease & DGMaster & DGArtist & DGLabel;
  const image = pickImage(r.images);
  const enrichment = compact<DiscogsEnrichment>({
    kind,
    id: r.id,
    url: r.uri ?? `https://www.discogs.com/${kind}/${r.id}`,
    imageUrl: image?.uri,
    thumbUrl:
      (r as DGRelease).thumb ?? image?.uri150 ?? image?.uri,
    genres: dedupe(r.genres ?? []),
    styles: dedupe(r.styles ?? []),
    year: r.year ?? undefined,
    country: (r as DGRelease).country ?? undefined,
    formats: normalizeFormats((r as DGRelease).formats),
    credits: normalizeCredits(r.extraartists, r.tracklist),
    videos: normalizeVideos(r.videos),
    community: communityOf(r.community),
    numForSale:
      typeof r.num_for_sale === "number" && r.num_for_sale > 0
        ? r.num_for_sale
        : undefined,
    lowestPrice:
      typeof r.lowest_price === "number" && r.lowest_price > 0
        ? r.lowest_price
        : undefined,
    profile:
      kind === "artist" || kind === "label"
        ? r.profile
          ? truncateProfile(r.profile)
          : undefined
        : undefined,
    realName: (r as DGArtist).realname || undefined,
    urls: dedupe(r.urls ?? []),
  });
  return enrichment;
}
