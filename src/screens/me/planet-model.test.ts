/* Behaviour lock for the courier's planet on Me (screens/me/planet-model): what she is doing
   on the planet, the letters behind the stamps (an old stamp never moves), the shelf's six and
   their weekly turnover (what she wears keeps its place; the one she wears comes off), what a tap
   on a look does, the Stamps tile and her card's words.
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/screens/me/planet-model.test.ts
   The model imports nothing at runtime, so no stubs are needed. Every line prints ok/FAIL and the
   process exits non-zero if any fail. */

import {
  FIGURE_UNKNOWN,
  PLANET_LETTERS,
  SAMPLE_STAMPS,
  SHELF_CATALOGUE,
  SHELF_FC_DRESS,
  SHELF_FC_SKINS,
  SHELF_PLACES,
  TRANSIT_SLIP,
  buildMePlanet,
  buildPlanetPage,
  buildCover,
  buildFlightLog,
  buildHerBadge,
  buildShelf,
  buildStampsTile,
  letterRows,
  planetFigures,
  planetLetters,
  planetSlips,
  planetNapping,
  planetWrenState,
  shelfFeatured,
  shelfSlots,
  shelfTap,
  shelfWeek,
  type PageLetterSource,
  type PlanetLetterSource,
  type ShelfFacts,
} from "./planet-model.ts";

let failed = 0;
function ok(name: string, cond: boolean, detail = ""): void {
  if (!cond) failed++;
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${cond || !detail ? "" : ` — ${detail}`}`);
}
const eq = (name: string, got: unknown, want: unknown) => ok(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}(${Object.values(vars).join(",")})` : key);
const fmt = { t, upper: (s: string) => s.toUpperCase(), wren: "Pip" };

/* ── what she is doing ── */
eq("exploring: on the way", planetWrenState("exploring", false), "out");
eq("delivery: waiting at their door", planetWrenState("delivery", false), "waiting");
eq("bringing: back with a reply", planetWrenState("bringing", false), "back");
eq("home: at home", planetWrenState("home", false), "home");
eq("unsent: at home", planetWrenState("unsent", false), "home");
eq("her day off wins over where she is", planetWrenState("delivery", true), "dayOff");
ok("at home with letters behind her she naps", planetNapping("home"));
ok("with an empty bag she waits awake", !planetNapping("unsent"));

/* ── the letters behind the stamps ── */
const letter = (id: string, date: string, o: Partial<PlanetLetterSource> = {}): PlanetLetterSource => ({ kind: "letter", id, date, stamp: "crush", reads: 0, answers: [], ...o });
const lf = { day: (iso: string) => `D${iso.slice(8, 10)}`, hexOf: (id: string) => `#${id}` };
{
  const cards = [letter("b", "2026-11-02"), letter("c", "2026-11-03", { reads: 4, answers: [{}] }), letter("a", "2026-11-01", { stamp: null }), { ...letter("d", "2026-11-04"), kind: "draft" as const }];
  const ls = planetLetters(cards, null, lf);
  eq("newest first, drafts left out", ls.map((l) => l.id), ["c", "b", "a"]);
  eq("the first letter ever is ordinal 1", ls.map((l) => l.ordinal), [3, 2, 1]);
  eq("reads, the postmark, the day", [ls[0].reads, ls[0].answered, ls[0].day], [4, true, "D03"]);
  eq("no stamp: no id and no colour", [ls[2].stamp, ls[2].hex], ["", ""]);
  const more = planetLetters([letter("e", "2026-11-05"), ...cards], null, lf);
  eq("a new letter never moves an old stamp", more.filter((l) => l.id !== "e").map((l) => l.ordinal), [3, 2, 1]);
  eq("the ordinals count down from the total when the list is only its newest", planetLetters(cards, 250, lf).map((l) => l.ordinal), [250, 249, 248]);
  eq("not read yet: no letters", planetLetters(null, 12, lf), []);
  const many = Array.from({ length: 80 }, (_, i) => letter(`l${i}`, `2026-01-${String(i + 1).padStart(2, "0")}`));
  eq("no more than the planet can place", planetLetters(many, null, lf).length, PLANET_LETTERS);
}

/* ── the shelf ── */
const base: ShelfFacts = { skin: "sticker", dress: "none", premium: false, kindreds: 0, hatchSkin: null, week: 0 };
const ids = (f: ShelfFacts) => shelfSlots(f).map((x) => x.id);
const slot = (f: ShelfFacts, id: string) => shelfSlots(f).find((x) => x.id === id);
{
  const s = shelfSlots(base);
  eq("six looks: two free pieces, Moss, two First Class colours, a First Class piece", s.map((x) => x.id), ["dress:beanie", "dress:scarf", "skin:moss", "skin:peach", "skin:ink", "dress:phones"]);
  eq("a free reader with no kindred: only the free pieces are open", s.map((x) => x.open), [true, true, false, false, false, false]);
  eq("Moss is dim, the paid three wear the lock", s.map((x) => [x.dim, x.firstClass]), [[false, false], [false, false], [true, false], [false, true], [false, true], [false, true]]);
  eq("each look is this slot's thing on what she has", s.map((x) => `${x.look.skin}/${x.look.dress}`), ["sticker/beanie", "sticker/scarf", "moss/none", "peach/none", "ink/none", "sticker/phones"]);
  eq("the next week the groups turn, Moss stays", ids({ ...base, week: 1 }), ["dress:scarf", "dress:beanie", "skin:moss", "skin:ink", "skin:plush", "dress:flower"]);
  const seen = new Set<string>();
  for (let w = 0; w < 12; w++) shelfSlots({ ...base, week: w }).forEach((x) => seen.add(x.id));
  ok("over the weeks every First Class look takes its turn", SHELF_FC_SKINS.every((k) => seen.has(`skin:${k}`)) && SHELF_FC_DRESS.every((k) => seen.has(`dress:${k}`)));
  eq("a negative week still picks", shelfSlots({ ...base, week: -1 }).length, 6);
  eq("the places: three anyone can have, three First Class", [SHELF_PLACES.freeDress + SHELF_PLACES.kindredSkin, SHELF_PLACES.paidSkin + SHELF_PLACES.paidDress], [3, 3]);
}
{
  const s = shelfSlots({ ...base, dress: "scarf", week: 0 });
  ok("what she wears is on the shelf, ticked, whatever the week", [0, 1, 2, 3, 4, 5, 6, 7].every((w) => slot({ ...base, dress: "scarf", week: w }, "dress:scarf")?.worn === true), s.map((x) => x.id));
  // put a look on and it stays under the thumb: the slots don't move, only the tick does
  const bare = ids({ ...base, week: 0 });
  const second = bare[1];
  const after = ids({ ...base, week: 0, dress: second.slice("dress:".length) as ShelfFacts["dress"] });
  eq("a look put on stays where it was tapped (a second tap there takes it off)", after, bare);
  eq("…and that second tap takes it off", shelfTap(second, { ...base, week: 0, dress: second.slice("dress:".length) as ShelfFacts["dress"] }), { do: "dress", value: "none" });
  const member: ShelfFacts = { ...base, premium: true, skin: "plush", dress: "shades", week: 0 };
  eq("a member's worn colour and piece are on the shelf, ticked", [ids(member).includes("skin:plush"), slot(member, "skin:plush")?.worn, ids(member)[5], slot(member, "dress:shades")?.worn], [true, true, "dress:shades", true]);
  eq("a member: no locks", shelfSlots(member).map((x) => x.firstClass), [false, false, false, false, false, false]);
  eq("Moss opens with the first kindred, not with First Class", [slot({ ...base, premium: true }, "skin:moss")?.open, slot({ ...base, kindreds: 1 }, "skin:moss")?.open], [false, true]);
  eq("kindreds not read yet: Moss is not offered as hers", slot({ ...base, kindreds: null }, "skin:moss")?.open, false);
  eq("the coat she hatched in is hers without First Class", slot({ ...base, hatchSkin: "peach", week: 0 }, "skin:peach")?.open, true);
  eq("in a season its looks take the free places", ids({ ...base, season: ["witch", "ghost"], week: 1 }).slice(0, 2).sort(), ["dress:ghost", "dress:witch"]);
  eq("a season with one look: it leads, an every-day piece beside it", ids({ ...base, season: ["ghost"], week: 0 }).slice(0, 2), ["dress:ghost", "dress:beanie"]);
  ok("a seasonal look she still wears stays on the shelf after the season", ids({ ...base, dress: "witch" }).slice(0, 2).includes("dress:witch"));
  ok("out of its season, and not on her, a seasonal look is not offered", !ids(base).includes("dress:witch"));
  eq("a season look this build can't draw is skipped", ids({ ...base, season: ["cape"], week: 0 })[0], "dress:beanie");
}
/* which ones stand there is not fixed: the table, the phone's own taps, the catalogue */
{
  eq("a look the table puts forward leads its group", [ids({ ...base, featured: ["shades", "plush"] })[5], ids({ ...base, featured: ["shades", "plush"] })[3]], ["dress:shades", "skin:plush"]);
  eq("what this phone reaches for most comes first", ids({ ...base, heat: { party: 3, flower: 9, ink: 2 } }).slice(3), ["skin:ink", "skin:peach", "dress:flower"]);
  eq("put forward beats reached for", ids({ ...base, featured: ["party"], heat: { flower: 9 } })[5], "dress:party");
  eq("in season beats put forward", ids({ ...base, season: ["ghost"], featured: ["scarf"] }).slice(0, 2), ["dress:ghost", "dress:scarf"]);
  eq("what she wears is never pushed off: it takes its group's last place", ids({ ...base, dress: "beanie", season: ["ghost"], featured: ["scarf"], heat: { scarf: 50 } }).slice(0, 2), ["dress:ghost", "dress:beanie"]);
  eq("a lapsed member's paid piece still on her: open, no lock, a tap takes it off", [slot({ ...base, dress: "phones", premium: false }, "dress:phones")?.open, slot({ ...base, dress: "phones", premium: false }, "dress:phones")?.firstClass, shelfTap("dress:phones", { ...base, dress: "phones", premium: false })], [true, false, { do: "dress", value: "none" }]);
  eq("a count that isn't a number is no heat", ids({ ...base, heat: { flower: Number.NaN, party: -4 } as Record<string, number> })[5], "dress:phones");
  eq("the table's rows: only shelf.* set true, bare ids", shelfFeatured({ "shelf.phones": true, "shelf.peach": false, "shelf.": true, halloween: true, "shelf.ink": true }), ["ink", "phones"]);
  eq("no table yet: nothing put forward", shelfFeatured(null), []);
  // a look added to the wardrobe is a candidate with nothing more
  const small: ShelfFacts = { ...base, catalogue: { dress: [{ id: "flower", free: true }, { id: "shades", free: false }], skins: [{ id: "moss", lock: "milestone" }, { id: "ink", lock: "plus" }] } };
  eq("the candidates are the catalogue passed in (fewer than the places: fewer looks)", ids(small), ["dress:flower", "skin:moss", "skin:ink", "dress:shades"]);
  eq("with no catalogue passed, this build's own", SHELF_CATALOGUE.dress.filter((d) => !d.seasonal).length + SHELF_CATALOGUE.skins.length, 11);
}

/* ── a tap on a look ── */
eq("a free piece: she wears it", shelfTap("dress:beanie", base), { do: "dress", value: "beanie" });
eq("the piece she wears comes off", shelfTap("dress:beanie", { ...base, dress: "beanie" }), { do: "dress", value: "none" });
eq("a paid piece, not a member: First Class", shelfTap("dress:phones", base), { do: "firstClass" });
eq("a paid piece, a member: she wears it", shelfTap("dress:phones", { ...base, premium: true }), { do: "dress", value: "phones" });
eq("Moss before the first kindred: her wardrobe", shelfTap("skin:moss", base), { do: "wardrobe" });
eq("Moss after it: she wears it", shelfTap("skin:moss", { ...base, kindreds: 2 }), { do: "skin", value: "moss" });
eq("the colour she wears comes off: back to Sky", shelfTap("skin:moss", { ...base, kindreds: 2, skin: "moss" }), { do: "skin", value: "sticker" });
eq("a paid colour, not a member: First Class", shelfTap("skin:peach", base), { do: "firstClass" });
eq("a look the shelf doesn't hold this week: nothing", shelfTap("skin:plush", base), null);

/* ── the shelf's words ── */
{
  const s = buildShelf({ ...base, dress: "beanie" }, fmt);
  eq("names are the catalogue's, upper-cased", s.map((x) => x.name), ["WS.ACC.BEANIE", "WS.ACC.SCARF", "SKIN.MOSS.NAME", "SKIN.PEACH.NAME", "SKIN.INK.NAME", "WS.ACC.PHONES"]);
  eq("VoiceOver: a look that isn't hers says locked", s.map((x) => x.a11y), ["ws.acc.beanie", "ws.acc.scarf", "skin.moss.name, m4.a11y.locked", "skin.peach.name, m4.a11y.locked", "skin.ink.name, m4.a11y.locked", "ws.acc.phones, m4.a11y.locked"]);
  eq("VoiceOver: what a tap does", s.map((x) => x.hint), ["planet.a11y.takeOff", "planet.a11y.wear", "m4.a11y.opensWardrobe(Pip)", "m4.a11y.opensFc", "m4.a11y.opensFc", "m4.a11y.opensFc"]);
  eq("a look that is hers and off: wear", buildShelf({ ...base, kindreds: 1 }, fmt)[2].hint, "planet.a11y.wear");
}

/* ── the Stamps tile ── */
{
  const src = { count: "7 USED", cells: [{ id: "crush", hex: "#F00" }, { id: "lost", hex: "#0F0" }, { id: "boo", hex: "#00F" }], madeShow: true, madeQuota: "2 OF 3 FREE", emptyTitle: "Snap a moment.", emptyText: "none yet", made: [{ id: "c:1", note: "" }, { id: "c:2", note: "checking…" }] };
  const tile = buildStampsTile(src, fmt);
  eq("what you made first (only the ones that passed), then what you used, three at most", tile.fan.map((x) => x.id), ["c:1", "crush", "lost"]);
  eq("its words", [tile.label, tile.title, tile.caption, tile.make], ["ME.SEG.STAMPS", "Snap a moment.", "7 USED", true]);
  const closed = buildStampsTile({ ...src, madeShow: false, cells: [] }, fmt);
  eq("the press not open, nothing used: no blank stamp, the plain line, no count", [closed.make, closed.title, closed.caption], [false, "none yet", "2 OF 3 FREE"]);
  eq("none of your own: three of the app's stamps as samples, never a blank tile", closed.fan.map((x) => x.id), [...SAMPLE_STAMPS]);
  eq("one of your own is enough: no samples beside it", buildStampsTile({ ...src, made: [], cells: [src.cells[0]] }, fmt).fan.map((x) => x.id), ["crush"]);
}

/* ── her card ── */
{
  const courier = { chip: "YOUR COURIER", dayOffTag: "DAY OFF", playing: false, name: "Pip", time: "2H AGO", line: "line", aside: "aside", cta: "Open" };
  const stamps = { count: "", cells: [], madeShow: false, madeQuota: "", emptyTitle: "", emptyText: "", made: [] };
  const mf = { ...fmt, ago: (at: number) => `ago(${at})`, notesUnit: "notes" };
  const noLog = { transit: null, out: null, say: false };
  const stat = (count: string, unit: string) => ({ count, unit, a11y: `${count} ${unit}`, hint: `opens ${unit}` });
  const cover = { letters: stat("14", "letters"), kindreds: stat("2", "kindreds"), notes: 9, mark: "he" as const, sign: "scorpio", day: 12, door: { state: "progress" as const, have: 4, need: 10 }, month: "NOV" };
  const facts = { courier, where: "exploring" as const, dayOff: false, a11y: "sentence", log: noLog, cover, letters: [], shelf: base, stamps, stage: "fledge" as const, wilt: true };
  const v = buildMePlanet(facts, mf);
  eq("on the way, hungry: she flies, greyed", [v.state, v.look.wilt, v.look.stage], ["out", true, "fledge"]);
  eq("the card's chip and button are the courier card's", [v.chip, v.cta], ["YOUR COURIER", "Open"]);
  eq("the log is named after her, in capitals", v.log.title, "PIP · wren.log");
  eq("the tiles' chips: WRITING AURA, WRITING REPORT", [v.auraChip, v.reportChip], ["ap.title", "PLANET.TILE.REPORT"]);

  /* her badge and her journey */
  eq("growing: her day, no tag, the journey named after her", [v.her.name, v.her.day, v.her.tag, v.her.journeyTitle], ["Pip", "me.dayN(12)", "", "wren.journey(PIP)"]);
  eq("the four stops: behind her done, hers now, ahead later", v.her.stops.map((x) => `${x.id}:${x.state}`), ["egg:done", "hatch:done", "fledge:now", "wren:later"]);
  eq("the stops are named in capitals; the last is grown", v.her.stops.map((x) => x.name), ["WREN.NAME.EGG", "WREN.NAME.HATCH", "WREN.NAME.FLEDGE", "WREN.NAME.GROWN"]);
  eq("the next stop and what it takes", v.her.next, "WREN.NAME.GROWN — WREN.MILESTONE.WREN");
  const grown = buildHerBadge("Pip", "YOUR COURIER", "wren", 40, fmt);
  eq("grown: the tag says so and the journey folds away", [grown.tag, grown.journeyTitle, grown.stops.length, grown.next], ["WREN.NAME.GROWN", "", 0, ""]);
  eq("before the stats are in there is no day", buildHerBadge("Pip", "YOUR COURIER", "hatch", null, fmt).day, "");
  eq("an egg has everything ahead of it", buildHerBadge("Pip", "c", "egg", 1, fmt).stops.map((x) => x.state), ["now", "later", "later", "later"]);
  eq("VoiceOver: her name, the chip, the day, her stage, what is next", v.her.a11y, "Pip. YOUR COURIER. me.dayN(12). wren.name.fledge. WREN.NAME.GROWN — WREN.MILESTONE.WREN");

  /* the cover: its two ways in, you under it, the report's tile */
  eq("the letters way in is the header's own number", v.lettersEntry, { count: "14", a11y: "14 letters", hint: "opens letters" });
  const tile = { label: "STAMPS", title: "", caption: "7 USED", fan: [], make: false, a11y: "", hint: "opens the album" };
  const c0 = buildCover(cover, { ...tile, make: true }, mf);
  eq("no stamp of your own yet, the press open to you: the stamps way in shows a plus", [c0.stampsEntry.count, c0.stampsEntry.a11y], ["+", "me.seg.stamps, cs2.me.makeOne"]);
  const closed = buildCover(cover, tile, mf);
  eq("no press on this build: no plus to promise, nothing shown", [closed.stampsEntry.count, closed.stampsEntry.a11y], ["", "me.seg.stamps"]);
  const c7 = buildCover(cover, tile, mf, 3);
  eq("the stamps way in counts the stamps you made, not the ones you used", [c7.stampsEntry.count, c7.stampsEntry.a11y, c7.stampsEntry.hint], ["3", "me.seg.stamps, 3", "opens the album"]);
  eq("no letters yet: the postbox shows no number", buildCover({ ...cover, letters: { count: "0", unit: "letters", a11y: "0 letters", hint: "" } }, tile, mf).lettersEntry.count, "");
  eq("letters not counted yet: no number either", buildCover({ ...cover, letters: { count: "–", unit: "letters", a11y: "letters", hint: "" } }, tile, mf).lettersEntry.count, "");
  eq("you: his mark, the sign as its emoji and its name", [v.me.mark, v.me.sign, v.me.signName, v.me.signA11y], ["he", "♏️", "zd.scorpio", "pr.he, zd.scorpio"]);
  eq("two numbers: kindreds as the header words them, then notes", v.me.stats.map((x) => `${x.key}:${x.count}:${x.unit}`), ["kindreds:2:kindreds", "notes:9:notes"]);
  eq("notes not counted yet: a dash, never a zero", buildCover({ ...cover, notes: null }, tile, mf).me.stats[1].count, "–");
  eq("no mark and no birthday: nothing to show", [buildCover({ ...cover, mark: null, sign: null }, tile, mf).me.mark, buildCover({ ...cover, mark: null, sign: null }, tile, mf).me.sign], ["", ""]);
  eq("the report on its way: how many pieces of how many", v.reportTile, { state: "progress", have: 4, need: 10, tag: "" });
  eq("the first report: NO. 1", buildCover({ ...cover, door: { state: "ready", kind: "first" } }, tile, mf).reportTile, { state: "ready", have: 0, need: 0, tag: "NO. 1" });
  eq("a month's report: the month", buildCover({ ...cover, door: { state: "ready", kind: "monthly" } }, tile, mf).reportTile.tag, "NOV");
  eq("read, or locked: the month, dimmed by its state", [buildCover({ ...cover, door: { state: "done" } }, tile, mf).reportTile.state, buildCover({ ...cover, door: { state: "locked" } }, tile, mf).reportTile.state], ["done", "locked"]);
  eq("no door: no tile to draw", buildCover({ ...cover, door: null }, tile, mf).reportTile.state, "none");

  /* her flight log */
  const slip = ["left", "door", "waiting"];
  const log = (where: Parameters<typeof buildFlightLog>[1], f: Partial<typeof noLog> & { transit?: { rows: string[]; back: boolean } | null; out?: { at: number; reads: number } | null }) =>
    buildFlightLog({ ...noLog, ...f }, where, courier, mf);
  eq("at their door: her page's slip, the last row (waiting) not yet", [log("delivery", { transit: { rows: slip, back: false } }).rows, log("delivery", { transit: { rows: slip, back: false } }).done], [slip, 2]);
  eq("back with the reply: all three rows have happened", log("bringing", { transit: { rows: slip, back: true } }).done, 3);
  const out = log("exploring", { out: { at: 7, reads: 3 } });
  eq("out with a letter: when it left (as how long ago), the desks, waiting", out.rows, ["wren.slip.left(AGO(7))", "LA.OUT.READSN(3)", "wren.slip.waiting"]);
  eq("…and the lamp is on the desks row", out.done, 2);
  eq("one reader: the singular line", log("exploring", { out: { at: 7, reads: 1 } }).rows[1], "LA.OUT.READS1");
  eq("no reader yet: it says so", log("exploring", { out: { at: 7, reads: 0 } }).rows[1], "LA.OUT.READS0");
  eq("out, the letters not read yet: only what is known", [log("exploring", {}).rows, log("exploring", {}).done], [["wren.slip.waiting"], 1]);
  eq("at home: nothing in transit, nothing happened", [log("home", { out: { at: 7, reads: 3 } }).rows, log("home", {}).done], [["wren.slip.nothing", "wren.slip.write"], 0]);
  eq("a slip with no run to go with it is not shown", log("home", { transit: { rows: slip, back: false } }).rows, ["wren.slip.nothing", "wren.slip.write"]);
  eq("her own line only when it has to be said", [log("home", {}).note, log("home", { say: true }).note], ["", "line"]);
  eq("VoiceOver: her name, the log, her line, the rows", log("exploring", { out: { at: 7, reads: 3 }, say: true }).a11y, "Pip, wren.log. line. wren.slip.left(AGO(7)). LA.OUT.READSN(3). wren.slip.waiting");
  eq("the hint is drawn in capitals; Track is the courier page's word", [v.hint, v.track], ["PLANET.HINT.SPIN", "wren.trackShort"]);
  const off = buildMePlanet({ ...facts, dayOff: true, courier: { ...courier, playing: true, time: "DAY OFF", cta: "Play" } }, mf);
  eq("her day off: the chip says so, she isn't greyed, the button plays", [off.state, off.chip, off.look.wilt, off.cta], ["dayOff", "DAY OFF", false, "Play"]);
}

/* ── the week ── */
{
  const monday = Date.UTC(2026, 10, 9); // Monday 9 November 2026
  eq("a week runs Monday to Sunday (UTC)", [shelfWeek(monday) - shelfWeek(monday - 1), shelfWeek(monday + 6 * 86_400_000 + 86_399_000) - shelfWeek(monday)], [1, 0]);
}

/* ── the planet page ── */
{
  const pf = { ...fmt, day: (iso: string) => `D${iso.slice(8, 10)}`, stampName: (id: string) => (id === "crush" ? "Crush" : "") };
  const page = (id: string, date: string, o: Partial<PageLetterSource> = {}): PageLetterSource => ({ kind: "letter", id, date, stamp: "crush", reads: 0, answers: [], body: ` opening of ${id}. `, status: { kind: "quiet" }, ...o });
  const cards = [
    page("c", "2026-11-03", { reads: 4, answers: [{}], status: { kind: "replied", who: "Noa", more: 2 } }),
    page("b", "2026-11-02", { reads: 1, answers: [{}], status: { kind: "answered", n: 1 } }),
    page("a", "2026-11-01", { stamp: null }),
    { ...page("d", "2026-11-04"), kind: "draft" as const },
  ];
  const letters = planetLetters(cards, null, lf);

  eq("a quiet letter nobody has read: when it left, and that it waits", letterRows(cards[2], pf), { rows: ["wren.slip.left(D01)", "wren.slip.waiting"], lamp: -1 });
  eq("one reader: the singular line, a lamp before it; answered", letterRows(cards[1], pf), { rows: ["wren.slip.left(D02)", "LA.OUT.READS1", "ml.answered"], lamp: 1 });
  eq("several readers, a named reply and more", letterRows(cards[0], pf), { rows: ["wren.slip.left(D03)", "LA.OUT.READSN(4)", "ML.REPLIEDMORE(NOA,2)"], lamp: 1 });
  eq("a named reply alone", letterRows({ ...cards[0], status: { kind: "replied", who: "Noa", more: 0 } }, pf).rows[2], "ML.REPLIED(NOA)");

  const plain = planetSlips(cards, letters, null, pf);
  eq("one slip a letter, newest first, drafts left out", plain.slips.map((x) => x.id), ["c", "b", "a"]);
  eq("the page opens on the newest letter", plain.open, "c");
  eq("a slip's head is the day and the stamp's name; none without a stamp", plain.slips.map((x) => x.head), ["D03 · CRUSH", "D02 · CRUSH", "D01"]);
  eq("its body is how the letter opens, trimmed", plain.slips[0].body, "opening of c.");
  eq("no run: no button", plain.slips.map((x) => x.cta), ["", "", ""]);

  const back = planetSlips(cards, letters, { rows: ["R1", "R2", "R3"], thread: "th9", letter: "b", back: true }, pf);
  eq("back with a reply to your letter: its slip takes her page's rows and the door", [back.slips[1].rows, back.slips[1].cta, back.slips[1].thread, back.slips[1].lamp], [["R1", "R2", "R3"], "wren.slip.go", "th9", -1]);
  eq("and the page opens on it, not on the newest", back.open, "b");
  eq("the other slips are untouched", [back.slips[0].cta, back.slips[2].rows.length], ["", 2]);

  const wait = planetSlips(cards, letters, { rows: ["R1", "R2", "R3"], thread: "th9", letter: "b", back: false }, pf);
  eq("waiting at their door: the rows, no button yet", [wait.slips[1].rows.length, wait.slips[1].cta, wait.open], [3, "", "b"]);

  const other = planetSlips(cards, letters, { rows: ["R1", "R2", "R3"], thread: "th7", letter: "", back: true }, pf);
  eq("a reply to someone else's letter: a slip of its own, first, with no stamp", [other.slips[0].id, other.slips[0].letter, other.slips[0].stamp, other.slips[0].cta, other.slips.length], [TRANSIT_SLIP, "", "", "wren.slip.go", 4]);
  eq("and the page opens on it", other.open, TRANSIT_SLIP);
  eq("nothing sent, nothing carried: no slip", planetSlips([], [], null, pf), { slips: [], open: "" });

  const figs = (where: Parameters<typeof planetFigures>[0]["where"], o: Partial<Parameters<typeof planetFigures>[0]> = {}) => planetFigures({ where, quiet: 3, atDoors: 2, carried: 12, desks: 48, ...o }, pf).map((x) => x.value);
  eq("on the way: your unanswered letters", figs("exploring"), ["3", "12", "48"]);
  eq("waiting: the doors she waits at", figs("delivery"), ["2", "12", "48"]);
  eq("waiting is never zero doors", figs("delivery", { atDoors: 0 })[0], "1");
  eq("home, back, an empty bag: nothing on the way", [figs("home")[0], figs("bringing")[0], figs("unsent")[0]], ["0", "0", "0"]);
  eq("not read yet: a dash, never a made-up 0", figs("exploring", { quiet: null, carried: null, desks: null }), [FIGURE_UNKNOWN, FIGURE_UNKNOWN, FIGURE_UNKNOWN]);
  eq("ON DESKS carries the lamp", planetFigures({ where: "home", quiet: 0, atDoors: 0, carried: 1, desks: 1 }, pf).map((x) => x.lamp), [false, false, true]);

  const courier = { chip: "YOUR COURIER", dayOffTag: "DAY OFF", playing: false, name: "Pip", time: "2H AGO", line: "line", aside: "aside", cta: "Open" };
  const look = { skin: "moss" as const, dress: "scarf" as const, stage: "wren" as const, wilt: false };
  const v = buildPlanetPage({ courier, where: "bringing", dayOff: false, a11y: "sentence", cards, letters, total: null, transit: { rows: ["R1", "R2", "R3"], thread: "th9", letter: "b", back: true }, atDoors: 0, look }, pf);
  eq("the page: she is back, it opens on the answered letter", [v.state, v.open], ["back", "b"]);
  eq("its figures count the read letters", v.figures.map((x) => x.value), ["0", "3", "5"]);
  eq("the hint names both gestures; My letters carries the count", [v.hint, v.myLetters, v.myLettersCount, v.track], ["PLANET.HINT.SPIN · PLANET.HINT.ZOOM", "ml.title", "3", "WREN.TRACKSHORT"]);
  const cold = buildPlanetPage({ courier, where: "exploring", dayOff: false, a11y: "", cards: null, letters: [], total: null, transit: null, atDoors: 0, look }, pf);
  eq("before the letters are read: dashes, no count, the two waiting rows", [cold.figures.map((x) => x.value), cold.myLettersCount, cold.slips.length, cold.emptyRows], [[FIGURE_UNKNOWN, FIGURE_UNKNOWN, FIGURE_UNKNOWN], "", 0, ["wren.slip.nothing", "wren.slip.write"]]);
  eq("the total wins when the list is only its newest", buildPlanetPage({ courier, where: "home", dayOff: false, a11y: "", cards, letters, total: 250, transit: null, atDoors: 0, look }, pf).figures[1].value, "250");
}

console.log(failed ? `\n${failed} FAILED` : "\nall ok");
process.exit(failed ? 1 : 0);
