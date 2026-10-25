// Illustrative demo metadata for the Dig prototype — not verified catalog data.
import type { MusicEntity, MusicRelationship } from "@/types/music";

export interface MockDataset {
  entities: MusicEntity[];
  relationships: MusicRelationship[];
}

const demo = { provenance: "demo" as const };

export const mockMusic: MockDataset = {
  entities: [
    // ── Labels ──────────────────────────────────────────────────────────
    { ...demo, id: "label:strictly-rhythm", name: "Strictly Rhythm", type: "label", metadata: { founded: 1989, location: "New York" } },
    { ...demo, id: "label:defected", name: "Defected Records", type: "label", metadata: { founded: 1999, location: "London" } },
    { ...demo, id: "label:roule", name: "Roulé", type: "label", metadata: { founded: 1995, location: "Paris" } },
    { ...demo, id: "label:crydamoure", name: "Crydamoure", type: "label", metadata: { founded: 1997, location: "Paris" } },
    { ...demo, id: "label:locked-on", name: "Locked On", type: "label", metadata: { founded: 1996, location: "London" } },

    // ── Artists ─────────────────────────────────────────────────────────
    { ...demo, id: "artist:hardrive", name: "Hardrive", type: "artist", metadata: { location: "New York" } },
    { ...demo, id: "artist:armand-van-helden", name: "Armand Van Helden", type: "artist", metadata: { location: "Boston", aliases: ["AVH"] } },
    { ...demo, id: "artist:barbara-tucker", name: "Barbara Tucker", type: "artist", metadata: { location: "New York" } },
    { ...demo, id: "artist:dj-sneak", name: "DJ Sneak", type: "artist", metadata: { location: "Chicago", aliases: ["Carlos Sosa"] } },
    { ...demo, id: "artist:todd-edwards", name: "Todd Edwards", type: "artist", metadata: { location: "New Jersey", aliases: ["The Messenger", "The Sample Choir"] } },
    { ...demo, id: "artist:thomas-bangalter", name: "Thomas Bangalter", type: "artist", metadata: { location: "Paris" } },
    { ...demo, id: "artist:roy-davis-jr", name: "Roy Davis Jr.", type: "artist", metadata: { location: "Chicago", aliases: ["Roy Davis Jr"] } },
    { ...demo, id: "artist:artful-dodger", name: "Artful Dodger", type: "artist", metadata: { location: "Southampton" } },
    { ...demo, id: "artist:mk", name: "MK", type: "artist", metadata: { realName: "Marc Kinchen", location: "Detroit", aliases: ["Marc Kinchen"] } },
    { ...demo, id: "artist:masters-at-work", name: "Masters at Work", type: "artist", metadata: { location: "New York", aliases: ["MAW", "KenLou"] } },
    { ...demo, id: "artist:stardust", name: "Stardust", type: "artist", metadata: { location: "Paris" } },
    { ...demo, id: "artist:le-knight-club", name: "Le Knight Club", type: "artist", metadata: { location: "Paris" } },
    { ...demo, id: "artist:louie-vega", name: "Louie Vega", type: "artist", metadata: { realName: "Luis Ferdinand Vega Jr.", location: "New York" } },
    { ...demo, id: "artist:kenny-dope", name: "Kenny Dope", type: "artist", metadata: { realName: "Kenneth Gonzalez", location: "New York" } },
    { ...demo, id: "artist:craig-david", name: "Craig David", type: "artist", metadata: { location: "Southampton" } },
    { ...demo, id: "artist:river-ocean", name: "River Ocean", type: "artist", metadata: { location: "New York" } },
    { ...demo, id: "artist:george-morel", name: "George Morel", type: "artist", metadata: { location: "New York" } },
    { ...demo, id: "artist:reel-2-real", name: "Reel 2 Real", type: "artist", metadata: { location: "New York" } },
    { ...demo, id: "artist:roger-sanchez", name: "Roger Sanchez", type: "artist", metadata: { location: "New York", aliases: ["S-Man", "Logic"] } },
    { ...demo, id: "artist:pete-heller", name: "Pete Heller", type: "artist", metadata: { location: "London" } },
    { ...demo, id: "artist:boris-dlugosch", name: "Boris Dlugosch", type: "artist", metadata: { location: "Hamburg" } },
    { ...demo, id: "artist:hyper-go-go", name: "Hyper Go Go", type: "artist", metadata: { location: "Essex" } },
    { ...demo, id: "artist:kings-of-tomorrow", name: "Kings of Tomorrow", type: "artist", metadata: { location: "New York", aliases: ["KOT", "Sandy Rivera"] } },
    { ...demo, id: "artist:fish-go-deep", name: "Fish Go Deep", type: "artist", metadata: { location: "Cork" } },

    // ── Releases — Strictly Rhythm ──────────────────────────────────────
    { ...demo, id: "release:deep-inside", name: "Deep Inside", type: "release", metadata: { year: 1993, catalogNumber: "SR12150" } },
    { ...demo, id: "release:beautiful-people", name: "Beautiful People", type: "release", metadata: { year: 1994, catalogNumber: "SR12199" } },
    { ...demo, id: "release:i-get-lifted", name: "I Get Lifted", type: "release", metadata: { year: 1994, catalogNumber: "SRB002" } },
    { ...demo, id: "release:stay-together", name: "Stay Together", type: "release", metadata: { year: 1995, catalogNumber: "SR12333" } },
    { ...demo, id: "release:witch-doktor", name: "Witch Doktor", type: "release", metadata: { year: 1994, catalogNumber: "EP5" } },
    { ...demo, id: "release:i-cant-get-no-sleep", name: "I Can't Get No Sleep", type: "release", metadata: { year: 1993, catalogNumber: "AMPM073" } },
    { ...demo, id: "release:work", name: "Work", type: "release", metadata: { year: 1992, catalogNumber: "MAW816" } },
    { ...demo, id: "release:love-and-happiness", name: "Love & Happiness (Yemaya y Ochún)", type: "release", metadata: { year: 1994, catalogNumber: "SR12204" } },
    { ...demo, id: "release:the-warning", name: "The Warning", type: "release", metadata: { year: 1994, catalogNumber: "SR12198" } },
    { ...demo, id: "release:lets-groove", name: "Let's Groove", type: "release", metadata: { year: 1993, catalogNumber: "SR12200" } },
    { ...demo, id: "release:i-like-to-move-it", name: "I Like to Move It", type: "release", metadata: { year: 1993, catalogNumber: "SR12192" } },
    { ...demo, id: "release:big-love", name: "Big Love", type: "release", metadata: { year: 1999, catalogNumber: "SR12599" } },
    { ...demo, id: "release:hold-your-head-up-high", name: "Hold Your Head Up High", type: "release", metadata: { year: 1997, catalogNumber: "SR12519" } },
    { ...demo, id: "release:high", name: "High", type: "release", metadata: { year: 1996, catalogNumber: "SR12397" } },
    { ...demo, id: "release:you-cant-hide-from-your-bud", name: "You Can't Hide From Your Bud", type: "release", metadata: { year: 1997, catalogNumber: "SRCLASS01" } },

    // ── Releases — Defected ─────────────────────────────────────────────
    { ...demo, id: "release:finally", name: "Finally", type: "release", metadata: { year: 2001, catalogNumber: "DFTD012" } },
    { ...demo, id: "release:the-cure-and-the-cause", name: "The Cure & The Cause", type: "release", metadata: { year: 2006, catalogNumber: "DFTD141" } },
    { ...demo, id: "release:always", name: "Always", type: "release", metadata: { year: 2003, catalogNumber: "DFTD094" } },
    { ...demo, id: "release:gabriel", name: "Gabriel", type: "release", metadata: { year: 2000, catalogNumber: "DFTD034" } },

    // ── Releases — Roulé ────────────────────────────────────────────────
    { ...demo, id: "release:music-sounds-better-with-you", name: "Music Sounds Better With You", type: "release", metadata: { year: 1998, catalogNumber: "ROULE305" } },
    { ...demo, id: "release:spinal-scratch", name: "Spinal Scratch", type: "release", metadata: { year: 1996, catalogNumber: "ROULE302" } },

    // ── Releases — Crydamoure ───────────────────────────────────────────
    { ...demo, id: "release:hysteria", name: "Hysteria", type: "release", metadata: { year: 1999, catalogNumber: "CRYDA005" } },

    // ── Releases — Locked On ────────────────────────────────────────────
    { ...demo, id: "release:re-rewind", name: "Re-Rewind (The Crowd Say Bo Selecta)", type: "release", metadata: { year: 1999, catalogNumber: "LOK009" } },
    { ...demo, id: "release:moving-too-fast", name: "Moving Too Fast", type: "release", metadata: { year: 2000, catalogNumber: "LOK014" } },
    { ...demo, id: "release:saved-my-life", name: "Saved My Life", type: "release", metadata: { year: 2000, catalogNumber: "LOK012" } },
  ],

  relationships: [
    // released_on: release -> label
    { id: "rel:release:deep-inside->label:strictly-rhythm-released_on", source: "release:deep-inside", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:beautiful-people->label:strictly-rhythm-released_on", source: "release:beautiful-people", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:i-get-lifted->label:strictly-rhythm-released_on", source: "release:i-get-lifted", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:stay-together->label:strictly-rhythm-released_on", source: "release:stay-together", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:witch-doktor->label:strictly-rhythm-released_on", source: "release:witch-doktor", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:i-cant-get-no-sleep->label:strictly-rhythm-released_on", source: "release:i-cant-get-no-sleep", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:work->label:strictly-rhythm-released_on", source: "release:work", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:love-and-happiness->label:strictly-rhythm-released_on", source: "release:love-and-happiness", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:the-warning->label:strictly-rhythm-released_on", source: "release:the-warning", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:lets-groove->label:strictly-rhythm-released_on", source: "release:lets-groove", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:i-like-to-move-it->label:strictly-rhythm-released_on", source: "release:i-like-to-move-it", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:big-love->label:strictly-rhythm-released_on", source: "release:big-love", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:hold-your-head-up-high->label:strictly-rhythm-released_on", source: "release:hold-your-head-up-high", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:high->label:strictly-rhythm-released_on", source: "release:high", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:you-cant-hide-from-your-bud->label:strictly-rhythm-released_on", source: "release:you-cant-hide-from-your-bud", target: "label:strictly-rhythm", type: "released_on" },
    { id: "rel:release:finally->label:defected-released_on", source: "release:finally", target: "label:defected", type: "released_on" },
    { id: "rel:release:the-cure-and-the-cause->label:defected-released_on", source: "release:the-cure-and-the-cause", target: "label:defected", type: "released_on" },
    { id: "rel:release:always->label:defected-released_on", source: "release:always", target: "label:defected", type: "released_on" },
    { id: "rel:release:gabriel->label:defected-released_on", source: "release:gabriel", target: "label:defected", type: "released_on" },
    { id: "rel:release:music-sounds-better-with-you->label:roule-released_on", source: "release:music-sounds-better-with-you", target: "label:roule", type: "released_on" },
    { id: "rel:release:spinal-scratch->label:roule-released_on", source: "release:spinal-scratch", target: "label:roule", type: "released_on" },
    { id: "rel:release:hysteria->label:crydamoure-released_on", source: "release:hysteria", target: "label:crydamoure", type: "released_on" },
    { id: "rel:release:re-rewind->label:locked-on-released_on", source: "release:re-rewind", target: "label:locked-on", type: "released_on" },
    { id: "rel:release:moving-too-fast->label:locked-on-released_on", source: "release:moving-too-fast", target: "label:locked-on", type: "released_on" },
    { id: "rel:release:saved-my-life->label:locked-on-released_on", source: "release:saved-my-life", target: "label:locked-on", type: "released_on" },

    // performed_by: release -> artist
    { id: "rel:release:deep-inside->artist:hardrive-performed_by", source: "release:deep-inside", target: "artist:hardrive", type: "performed_by" },
    { id: "rel:release:beautiful-people->artist:barbara-tucker-performed_by", source: "release:beautiful-people", target: "artist:barbara-tucker", type: "performed_by" },
    { id: "rel:release:i-get-lifted->artist:barbara-tucker-performed_by", source: "release:i-get-lifted", target: "artist:barbara-tucker", type: "performed_by" },
    { id: "rel:release:stay-together->artist:barbara-tucker-performed_by", source: "release:stay-together", target: "artist:barbara-tucker", type: "performed_by" },
    { id: "rel:release:witch-doktor->artist:armand-van-helden-performed_by", source: "release:witch-doktor", target: "artist:armand-van-helden", type: "performed_by" },
    { id: "rel:release:i-cant-get-no-sleep->artist:masters-at-work-performed_by", source: "release:i-cant-get-no-sleep", target: "artist:masters-at-work", type: "performed_by" },
    { id: "rel:release:work->artist:masters-at-work-performed_by", source: "release:work", target: "artist:masters-at-work", type: "performed_by" },
    { id: "rel:release:love-and-happiness->artist:river-ocean-performed_by", source: "release:love-and-happiness", target: "artist:river-ocean", type: "performed_by" },
    { id: "rel:release:the-warning->artist:roger-sanchez-performed_by", source: "release:the-warning", target: "artist:roger-sanchez", type: "performed_by" },
    { id: "rel:release:lets-groove->artist:george-morel-performed_by", source: "release:lets-groove", target: "artist:george-morel", type: "performed_by" },
    { id: "rel:release:i-like-to-move-it->artist:reel-2-real-performed_by", source: "release:i-like-to-move-it", target: "artist:reel-2-real", type: "performed_by" },
    { id: "rel:release:big-love->artist:pete-heller-performed_by", source: "release:big-love", target: "artist:pete-heller", type: "performed_by" },
    { id: "rel:release:hold-your-head-up-high->artist:boris-dlugosch-performed_by", source: "release:hold-your-head-up-high", target: "artist:boris-dlugosch", type: "performed_by" },
    { id: "rel:release:high->artist:hyper-go-go-performed_by", source: "release:high", target: "artist:hyper-go-go", type: "performed_by" },
    { id: "rel:release:you-cant-hide-from-your-bud->artist:dj-sneak-performed_by", source: "release:you-cant-hide-from-your-bud", target: "artist:dj-sneak", type: "performed_by" },
    { id: "rel:release:finally->artist:kings-of-tomorrow-performed_by", source: "release:finally", target: "artist:kings-of-tomorrow", type: "performed_by" },
    { id: "rel:release:the-cure-and-the-cause->artist:fish-go-deep-performed_by", source: "release:the-cure-and-the-cause", target: "artist:fish-go-deep", type: "performed_by" },
    { id: "rel:release:always->artist:mk-performed_by", source: "release:always", target: "artist:mk", type: "performed_by" },
    { id: "rel:release:gabriel->artist:roy-davis-jr-performed_by", source: "release:gabriel", target: "artist:roy-davis-jr", type: "performed_by" },
    { id: "rel:release:music-sounds-better-with-you->artist:stardust-performed_by", source: "release:music-sounds-better-with-you", target: "artist:stardust", type: "performed_by" },
    { id: "rel:release:spinal-scratch->artist:thomas-bangalter-performed_by", source: "release:spinal-scratch", target: "artist:thomas-bangalter", type: "performed_by" },
    { id: "rel:release:hysteria->artist:le-knight-club-performed_by", source: "release:hysteria", target: "artist:le-knight-club", type: "performed_by" },
    { id: "rel:release:re-rewind->artist:artful-dodger-performed_by", source: "release:re-rewind", target: "artist:artful-dodger", type: "performed_by" },
    { id: "rel:release:re-rewind->artist:craig-david-performed_by", source: "release:re-rewind", target: "artist:craig-david", type: "performed_by" },
    { id: "rel:release:moving-too-fast->artist:artful-dodger-performed_by", source: "release:moving-too-fast", target: "artist:artful-dodger", type: "performed_by" },
    { id: "rel:release:saved-my-life->artist:todd-edwards-performed_by", source: "release:saved-my-life", target: "artist:todd-edwards", type: "performed_by" },

    // produced_by / remixed_by: release -> artist
    { id: "rel:release:deep-inside->artist:louie-vega-produced_by", source: "release:deep-inside", target: "artist:louie-vega", type: "produced_by" },
    { id: "rel:release:i-cant-get-no-sleep->artist:kenny-dope-produced_by", source: "release:i-cant-get-no-sleep", target: "artist:kenny-dope", type: "produced_by" },
    { id: "rel:release:work->artist:louie-vega-produced_by", source: "release:work", target: "artist:louie-vega", type: "produced_by" },
    { id: "rel:release:music-sounds-better-with-you->artist:thomas-bangalter-produced_by", source: "release:music-sounds-better-with-you", target: "artist:thomas-bangalter", type: "produced_by" },
    { id: "rel:release:i-get-lifted->artist:mk-remixed_by", source: "release:i-get-lifted", target: "artist:mk", type: "remixed_by" },
    { id: "rel:release:moving-too-fast->artist:todd-edwards-remixed_by", source: "release:moving-too-fast", target: "artist:todd-edwards", type: "remixed_by" },
    { id: "rel:release:beautiful-people->artist:louie-vega-remixed_by", source: "release:beautiful-people", target: "artist:louie-vega", type: "remixed_by" },
  ],
};
