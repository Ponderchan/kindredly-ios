/* Behaviour lock for the courier's planet on Me (screens/me/planet-model): what she is doing
   on the planet, the letters behind the stamps (an old stamp never moves), the shelf's four and
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
  SHELF_FC_DRESS,
  SHELF_FC_SKINS,
  TRANSIT_SLIP,
  buildMePlanet,
  buildPlanetPage,
  buildShelf,
  buildStampsTile,
  letterRows,
  planetFigures,
  planetLetters,
  planetSlips,
  planetNapping,
  planetWrenState,
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
{
  const s = shelfSlots(base);
  eq("four looks: a free piece, Moss, a First Class colour, a First Class piece", s.map((x) => x.id), ["dress:beanie", "skin:moss", "skin:peach", "dress:phones"]);
  eq("a free reader with no kindred: only the free piece is open", s.map((x) => x.open), [true, false, false, false]);
  eq("Moss is dim, the paid two wear the lock", s.map((x) => [x.dim, x.firstClass]), [[false, false], [true, false], [false, true], [false, true]]);
  eq("each look is this slot's thing on what she has", s.map((x) => `${x.look.skin}/${x.look.dress}`), ["sticker/beanie", "moss/none", "peach/none", "sticker/phones"]);
  const w1 = shelfSlots({ ...base, week: 1 });
  eq("the next week the slots turn over, Moss stays", w1.map((x) => x.id), ["dress:scarf", "skin:moss", "skin:ink", "dress:flower"]);
  const seen = new Set<string>();
  for (let w = 0; w < 12; w++) shelfSlots({ ...base, week: w }).forEach((x) => seen.add(x.id));
  ok("over the weeks every First Class look takes its turn", SHELF_FC_SKINS.every((k) => seen.has(`skin:${k}`)) && SHELF_FC_DRESS.every((k) => seen.has(`dress:${k}`)));
  eq("a negative week still picks", shelfSlots({ ...base, week: -1 }).length, 4);
}
{
  const s = shelfSlots({ ...base, dress: "scarf", week: 0 });
  eq("what she wears keeps its place whatever the week", [s[0].id, s[0].worn], ["dress:scarf", true]);
  const p = shelfSlots({ ...base, premium: true, skin: "plush", dress: "shades", week: 0 });
  eq("a member's worn colour and piece keep theirs", [p[2].id, p[2].worn, p[3].id, p[3].worn], ["skin:plush", true, "dress:shades", true]);
  eq("a member: no locks", p.map((x) => x.firstClass), [false, false, false, false]);
  eq("Moss opens with the first kindred, not with First Class", [shelfSlots({ ...base, premium: true })[1].open, shelfSlots({ ...base, kindreds: 1 })[1].open], [false, true]);
  eq("kindreds not read yet: Moss is not offered as hers", shelfSlots({ ...base, kindreds: null })[1].open, false);
  eq("the coat she hatched in is hers without First Class", shelfSlots({ ...base, hatchSkin: "peach", week: 0 })[2].open, true);
  const season = shelfSlots({ ...base, season: ["witch", "ghost"], week: 1 });
  eq("in a season its looks take the free slot", season[0].id, "dress:ghost");
  eq("a seasonal look she still wears keeps the slot after the season", shelfSlots({ ...base, dress: "witch" })[0].id, "dress:witch");
  eq("a season look this build can't draw is skipped", shelfSlots({ ...base, season: ["cape"], week: 0 })[0].id, "dress:beanie");
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
eq("a look the shelf doesn't hold this week: nothing", shelfTap("skin:ink", base), null);

/* ── the shelf's words ── */
{
  const s = buildShelf({ ...base, dress: "beanie" }, fmt);
  eq("names are the catalogue's, upper-cased", s.map((x) => x.name), ["WS.ACC.BEANIE", "SKIN.MOSS.NAME", "SKIN.PEACH.NAME", "WS.ACC.PHONES"]);
  eq("VoiceOver: a look that isn't hers says locked", s.map((x) => x.a11y), ["ws.acc.beanie", "skin.moss.name, m4.a11y.locked", "skin.peach.name, m4.a11y.locked", "ws.acc.phones, m4.a11y.locked"]);
  eq("VoiceOver: what a tap does", s.map((x) => x.hint), ["planet.a11y.takeOff", "m4.a11y.opensWardrobe(Pip)", "m4.a11y.opensFc", "m4.a11y.opensFc"]);
  eq("a look that is hers and off: wear", buildShelf({ ...base, kindreds: 1 }, fmt)[1].hint, "planet.a11y.wear");
}

/* ── the Stamps tile ── */
{
  const src = { count: "7 USED", cells: [{ id: "crush", hex: "#F00" }, { id: "lost", hex: "#0F0" }, { id: "boo", hex: "#00F" }], madeShow: true, madeQuota: "2 OF 3 FREE", emptyTitle: "Snap a moment.", emptyText: "none yet", made: [{ id: "c:1", note: "" }, { id: "c:2", note: "checking…" }] };
  const tile = buildStampsTile(src, fmt);
  eq("what you made first (only the ones that passed), then what you used, three at most", tile.fan.map((x) => x.id), ["c:1", "crush", "lost"]);
  eq("its words", [tile.label, tile.title, tile.caption, tile.make], ["ME.SEG.STAMPS", "Snap a moment.", "7 USED", true]);
  const closed = buildStampsTile({ ...src, madeShow: false, cells: [] }, fmt);
  eq("the press not open, nothing used: no blank stamp, the plain line, no count", [closed.make, closed.title, closed.caption, closed.fan.length], [false, "none yet", "2 OF 3 FREE", 0]);
}

/* ── her card ── */
{
  const courier = { chip: "YOUR COURIER", dayOffTag: "DAY OFF", playing: false, name: "Pip", time: "2H AGO", line: "line", aside: "aside", cta: "Open" };
  const stamps = { count: "", cells: [], madeShow: false, madeQuota: "", emptyTitle: "", emptyText: "", made: [] };
  const facts = { courier, where: "exploring" as const, dayOff: false, a11y: "sentence", letters: [], shelf: base, stamps, stage: "fledge" as const, wilt: true };
  const v = buildMePlanet(facts, fmt);
  eq("on the way, hungry: she flies, greyed", [v.state, v.look.wilt, v.look.stage], ["out", true, "fledge"]);
  eq("the card's words are the courier card's", [v.chip, v.name, v.time, v.line, v.aside, v.cta], ["YOUR COURIER", "Pip", "2H AGO", "line", "aside", "Open"]);
  eq("the hint is drawn in capitals; Track is the courier page's word", [v.hint, v.track], ["PLANET.HINT.SPIN", "wren.trackShort"]);
  const off = buildMePlanet({ ...facts, dayOff: true, courier: { ...courier, playing: true, time: "DAY OFF", cta: "Play" } }, fmt);
  eq("her day off: the chip says so once, she isn't greyed, the button plays", [off.state, off.chip, off.time, off.look.wilt, off.cta], ["dayOff", "DAY OFF", "", false, "Play"]);
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
