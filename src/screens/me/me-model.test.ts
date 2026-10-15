/* Behaviour lock for the Me tab's model (screens/me/me-model): the pen
   name, the figures (a dash until read, never a made-up 0), the segments,
   the Aura card's counts and art, the stamps by date, the keepsakes block,
   the First Class copy (the owner's, never "More Kindreds"), the courier
   card's VoiceOver sentence and where each tap goes — the rules both
   renderers draw, so a remote flip between SwiftUI and React Native never
   changes what the reader sees.
   Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/me/me-model.test.ts
   The model imports nothing at runtime, so no stubs are needed. Every line
   prints ok/FAIL and the process exits non-zero if any fail. */

import {
  FIRST_CLASS_SEGMENT,
  KEEPSAKE_TILES,
  ME_ROUTES,
  SEGMENTS,
  UNKNOWN,
  auraCaption,
  auraCtaHref,
  auraMeter,
  buildAuraCard,
  buildFirstClass,
  buildKeepsakes,
  buildMeView,
  buildProfile,
  buildStamps,
  courierA11y,
  courierHref,
  pad3,
  penName,
  sceneId,
  segmentIndex,
  segmentLabels,
  statHref,
  type AuraFacts,
  type MeFacts,
  type MeFormat,
} from "./me-model.ts";
import type { Rung } from "../../lib/aura-ladder";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

/* a t() that shows which key and which values it was asked for, so a test
   can tell "me.a11y.letters{n:12}" from "me.a11y.lettersOne" */
const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}{${Object.entries(v).map(([a, b]) => `${a}:${b}`).join(",")}}` : k);
const fmt: MeFormat = { t, dateShort: (d) => `d(${typeof d === "number" ? new Date(d).toISOString().slice(0, 10) : d.slice(0, 10)})`, upper: (s) => s.toUpperCase() };

/* ── the pen name ── */
ok("a handle is the name", penName("maynaa", fmt) === "maynaa");
ok("no handle → set.you, never a literal 'You'", penName(null, fmt) === "set.you" && penName(undefined, fmt) === "set.you");
ok("a blank handle counts as none", penName("   ", fmt) === "set.you");
ok("a handle keeps its own case, trimmed", penName("  Wren's friend ", fmt) === "Wren's friend");

/* ── the profile ── */
{
  const p = buildProfile({ handle: "sss", createdAt: "2026-07-27T10:00:00Z", cofounderNo: 7, letters: 12, kindreds: 4 }, fmt);
  ok("JOINED carries the capitalised short date", p.joined === "me.joined{date:D(2026-07-27)}");
  ok("the cofounder mark pads to three", p.cofounder === "cf.no{n:007}");
  ok("the number rides along for the React Native mark", p.cofounderNo === 7);
  ok("pad3 pads and never cuts", pad3(7) === "007" && pad3(47) === "047" && pad3(1234) === "1234");
  ok("two figures, letters then kindreds", p.stats.length === 2 && p.stats[0].key === "letters" && p.stats[1].key === "kindreds");
  ok("the figures are counts", p.stats[0].count === "12" && p.stats[1].count === "4");
  ok("letters' glyph is the envelope, kindreds' the bubbles", p.stats[0].glyph === "envelope" && p.stats[1].glyph === "bubbles");
  ok("units", p.stats[0].unit === "me.lettersLabel" && p.stats[1].unit === "me.kindredLabel");
  ok("VoiceOver reads counts", p.stats[0].a11y === "me.a11y.letters{n:12}" && p.stats[1].a11y === "me.a11y.kindreds{n:4}");
  ok("the pencil is labelled", p.editLabel === "me.edit");
}
{
  const p = buildProfile({ handle: "", createdAt: null, cofounderNo: null, letters: null, kindreds: null }, fmt);
  ok("a guest has no JOINED line", p.joined === "");
  ok("no cofounder → no mark", p.cofounder === "" && p.cofounderNo === null);
  ok("cofounder No. 0 is still a mark", buildProfile({ handle: "", createdAt: null, cofounderNo: 0, letters: 0, kindreds: 0 }, fmt).cofounder === "cf.no{n:000}");
  ok("unread figures are a dash, not 0", p.stats[0].count === UNKNOWN && p.stats[1].count === UNKNOWN);
  ok("an unread figure's VoiceOver is the unit alone", p.stats[0].a11y === "me.lettersLabel" && p.stats[1].a11y === "me.kindredLabel");
}
{
  const one = buildProfile({ handle: "x", createdAt: null, cofounderNo: null, letters: 1, kindreds: 1 }, fmt);
  ok("one kindred is KINDRED", one.stats[1].unit === "me.kindredLabelOne");
  ok("one of each reads in the singular", one.stats[0].a11y === "me.a11y.lettersOne" && one.stats[1].a11y === "me.a11y.kindredsOne");
  const zero = buildProfile({ handle: "x", createdAt: null, cofounderNo: null, letters: 0, kindreds: 0 }, fmt);
  ok("a read zero is 0 (it was counted)", zero.stats[0].count === "0" && zero.stats[1].count === "0");
  ok("zero kindreds is KINDREDS", zero.stats[1].unit === "me.kindredLabel");
}

/* ── the segments ── */
ok("four segments in the mock's order", SEGMENTS.join() === "courier,aura,stamps,firstClass");
ok("First Class is the gold one, fourth", FIRST_CLASS_SEGMENT === 3 && SEGMENTS[FIRST_CLASS_SEGMENT] === "firstClass");
ok("labels: three new keys, First Class reused", segmentLabels(fmt).join() === "me.seg.courier,me.seg.aura,me.seg.stamps,set.member.first");
ok("segmentIndex keeps a good index", segmentIndex(2) === 2 && segmentIndex(0) === 0 && segmentIndex(3) === 3);
ok("segmentIndex sends junk to Courier", segmentIndex(4) === 0 && segmentIndex(-1) === 0 && segmentIndex(1.5) === 0 && segmentIndex("2") === 0 && segmentIndex(undefined) === 0 && segmentIndex(NaN) === 0);

/* ── the Aura card ── */
const rung = (p: Partial<Rung> & Pick<Rung, "level">): Rung => ({
  fidelity: p.level >= 5 ? "colour" : p.level >= 3 ? "sketch" : p.level === 2 ? "pencil" : "lines",
  letters: 0,
  stuck: 0,
  changing: 0,
  ticks: 0,
  slips: null,
  ...p,
});
const facts = (r: Rung, extra: Partial<AuraFacts> = {}): AuraFacts => ({ rung: r, titleName: null, title: null, chips: [], ...extra });

ok("no aura yet → no card (the skeleton)", buildAuraCard(null, fmt) === null);
{
  const c = buildAuraCard(facts(rung({ level: 0 })), fmt)!;
  ok("rung 0: FROM YOUR FIRST LINES", c.from === "ap.from.first");
  ok("rung 0: the what-your-writing-says title", c.title === "ap.what");
  ok("rung 0: write your first letter, to compose", c.cta === "ap.cta.empty" && c.ctaTo === "compose");
  ok("rung 0: five empty ticks", c.meter.kind === "ticks" && c.meter.total === 5 && c.meter.filled === 0 && c.meter.slips === null);
  ok("rung 0: 0 of 3 letters", c.caption === "ap.prog.letters{n:0,m:3}");
  ok("rung 0: no share", c.share === false);
  ok("the label is YOUR WRITING AURA", c.label === "ac.yourAuraTitle");
  ok("rung 0: the generic desk at its own fidelity", c.art.sceneId === null && c.art.fidelity === "lines");
}
{
  const c = buildAuraCard(facts(rung({ level: 1, letters: 1 })), fmt)!;
  ok("one letter: FROM YOUR FIRST LETTER", c.from === "ap.from.one");
  ok("one letter: another letter, to compose", c.cta === "ap.cta.another" && c.ctaTo === "compose");
  ok("one letter: one tick lit", c.meter.filled === 1);
}
{
  const c = buildAuraCard(facts(rung({ level: 2, letters: 4 })), fmt)!;
  ok("rung 2: FROM YOUR 4 LETTERS", c.from === "ap.from.n{n:4}");
  ok("rung 2: n of 5 letters", c.caption === "ap.prog.letters{n:4,m:5}");
  ok("rung 2: still to compose", c.ctaTo === "compose");
  ok("rung 2: pencil desk", c.art.fidelity === "pencil" && c.art.sceneId === null);
}
{
  const c = buildAuraCard(facts(rung({ level: 2, letters: 9 })), fmt)!;
  ok("past five with nothing held says so", c.caption === "ap.prog.notYet{n:9}");
  ok("ticks never pass five", c.meter.filled === 5 && c.meter.total === 5);
}
{
  const c = buildAuraCard(
    facts(rung({ level: 3, letters: 8, stuck: 1, slips: { n: 3, of: 5 } }), {
      title: { noun: "observer", adjective: null },
      chips: [
        { id: "a", name: "Regular", emerging: false },
        { id: "b", name: "Streaker", emerging: true },
        { id: "c", name: "Marathoner", emerging: false },
        { id: "d", name: "Fourth", emerging: false },
      ],
    }),
    fmt,
  )!;
  ok("rung 3: three slots, one held, the slips", c.meter.kind === "slots" && c.meter.total === 3 && c.meter.filled === 1 && c.meter.slips?.n === 3 && c.meter.slips?.of === 5);
  ok("rung 3: 1 of 3 labels held", c.caption === "ap.prog.stuck{n:1}");
  ok("rung 3: see your labels, in the aura room", c.cta === "ap.cta.labels" && c.ctaTo === "aura");
  ok("at most three labels, emerging kept", c.chips.length === 3 && c.chips[1].emerging === true && c.chips[0].emerging === false);
  ok("a noun known: its scene as a sketch, 'quiet' standing in for the adjective", c.art.sceneId === "quiet-observer" && c.art.fidelity === "sketch");
  ok("not named yet: no share, the generic title", c.share === false && c.title === "ap.what");
}
{
  const c = buildAuraCard(facts(rung({ level: 4, letters: 11, stuck: 0 })), fmt)!;
  ok("a stage with nothing held says what was read", c.caption === "ap.prog.forming{n:11}");
}
{
  const c = buildAuraCard(facts(rung({ level: 5, letters: 14, stuck: 3 }), { titleName: "The Quiet Observer", title: { noun: "observer", adjective: "late_night" } }), fmt)!;
  ok("named: the title's own name", c.title === "The Quiet Observer");
  ok("named: FROM 14 LETTERS", c.from === "ap.from.named{n:14}");
  ok("named: 3 labels add up to this", c.caption === "ap.prog.addUp");
  ok("named: the full picture, share shows", c.cta === "ap.cta.full" && c.share === true && c.shareLabel === "ac.shareSm");
  ok("named: the scene in colour, underscores to dashes", c.art.sceneId === "late-night-observer" && c.art.fidelity === "colour");
  ok("named but no name string: falls back, never blank", buildAuraCard(facts(rung({ level: 5, letters: 14 }), { titleName: "" }), fmt)!.title === "ap.what");
}
{
  ok("rung 6, one changing", auraCaption(rung({ level: 6, changing: 1 }), fmt) === "ap.prog.changing{n:1}");
  ok("rung 6, two changing", auraCaption(rung({ level: 6, changing: 2 }), fmt) === "ap.prog.changingMany{n:2}");
  ok("slots never pass three", auraMeter(rung({ level: 4, stuck: 5 })).filled === 3);
  ok("sceneId", sceneId(null, "deep_diver") === "quiet-deep-diver" && sceneId("quick", "observer") === "quick-observer");
}

/* ── the Stamps card ── */
{
  const s = buildStamps(
    [
      { id: "never-told", at: "2026-10-12T08:00:00Z", name: "Never told", hex: "#E0483C" },
      { id: "made-my-day", at: null, name: "Made my day", hex: "" },
      { id: "never-told", at: "2026-09-01T08:00:00Z", name: "Never told", hex: "#E0483C" },
      { id: "", at: null, name: "", hex: "" },
      { id: "unknown-id", at: "2026-08-01T00:00:00Z", name: "", hex: "" },
    ],
    fmt,
  );
  ok("each stamp once, in the order given (newest first), blanks skipped", s.cells.map((c) => c.id).join() === "never-told,made-my-day,unknown-id");
  ok("a cell carries its last-use date, capitalised", s.cells[0].date === "D(2026-10-12)");
  ok("no date kept → no date drawn", s.cells[1].date === "");
  ok("VoiceOver: the name and the date", s.cells[0].a11y === "Never told, D(2026-10-12)" && s.cells[1].a11y === "Made my day");
  ok("an unnamed stamp reads as its date alone", s.cells[2].a11y === "D(2026-08-01)");
  ok("the count is what is drawn", s.count === "me.stamps.count{n:3}");
  ok("the colour rides along for the tile fallback", s.cells[0].hex === "#E0483C" && s.cells[1].hex === "");
  ok("not empty", s.empty === false);
  ok("YOUR STAMPS", s.label === "me.stamps.title");
}
{
  const s = buildStamps([], fmt);
  ok("no stamps: the empty card with Write a letter", s.empty && s.cells.length === 0 && s.emptyText === "me.stamps.empty" && s.emptyCta === "ml.write" && s.count === "me.stamps.count{n:0}");
}

/* ── the keepsakes block ── */
{
  const k = buildKeepsakes(
    [
      { id: "first-reply", name: "First Reply", fresh: true, known: true },
      { id: "retired", name: "Old", fresh: false, known: false },
      { id: "first-flight", name: "First Flight", fresh: false, known: true },
      { id: "night-flight", name: "Night Flight", fresh: false, known: true },
    ],
    "Wren",
    fmt,
  );
  ok("always two tiles", k.tiles.length === KEEPSAKE_TILES);
  ok("the latest two the catalog can draw", k.tiles[0]?.id === "first-reply" && k.tiles[1]?.id === "first-flight");
  ok("NEW rides on the tile", k.tiles[0]?.fresh === true && k.tiles[1]?.fresh === false);
  ok("the count is what the catalog knows", k.count === "me.keepsakes.count{n:3}");
  ok("KEEPSAKES in capitals", k.header === "KA.TITLE");
  ok("the note names her", k.note === "me.keepsakes.note{wren:Wren}");
  ok("VoiceOver reads the header and the count", k.a11y === "ka.title, me.keepsakes.count{n:3}");
}
{
  const k = buildKeepsakes([{ id: "first-flight", name: "First Flight", fresh: false, known: true }], "Pip", fmt);
  ok("one keepsake: one tile and one dashed", k.tiles[0]?.id === "first-flight" && k.tiles[1] === null);
  const none = buildKeepsakes([], "Pip", fmt);
  ok("none: two dashed tiles, 0 SO FAR", none.tiles.every((x) => x === null) && none.count === "me.keepsakes.count{n:0}");
}

/* ── First Class ── */
{
  const f = buildFirstClass({ premium: false, cofounderNo: null, wren: "Pip" }, fmt);
  ok("free: the owner's headline", f.headline === "fc.stubHead");
  ok("free: the owner's two lines, her name in the second", f.sub === "fc.stubSub1\nfc.stubSub2{wren:Pip}");
  ok("free: never 'More Kindreds' or 'a monthly reading'", !/kindreds|monthly/i.test(f.sub + f.headline));
  ok("free: See First Class →", f.cta === "fc.stubCta →");
  ok("free: 1ST from the strings, not a literal", f.stampLabel === "fc.firstMark");
  ok("free: the curious bird", f.pose === "fcFree");
  ok("eyebrow FIRST CLASS", f.eyebrow === "me.firstClass");
  const m = buildFirstClass({ premium: true, cofounderNo: null, wren: "Pip" }, fmt);
  ok("member: their own words", m.headline === "fc.paidHead" && m.sub === "fc.paidSub" && m.cta === "fc.paidCta →");
  ok("member: MEMBER on the stamp, the delighted bird", m.stampLabel === "fc.member" && m.pose === "fcMember");
  const c = buildFirstClass({ premium: true, cofounderNo: 7, wren: "Pip" }, fmt);
  ok("cofounder: the founding line with their number", c.headline === "me.fc.founding{n:7}");
  ok("a cofounder number without the entitlement is still the free card", buildFirstClass({ premium: false, cofounderNo: 7, wren: "Pip" }, fmt).headline === "fc.stubHead");
}

/* ── the courier card ── */
{
  const a = courierA11y({ wren: "Pip", dayOff: false, carrying: false, best: 0, ago: "3H AGO", line: "dropped your reply at maynaa's sill.", sub: "just got here." }, fmt);
  ok("her name, the time, her line, the aside, then what the tap does", a === "Pip, 3H AGO. dropped your reply at maynaa's sill. just got here. me.open");
  const noSub = courierA11y({ wren: "Pip", dayOff: false, carrying: false, best: 0, ago: "", line: "home.", sub: "" }, fmt);
  ok("no time and no aside: nothing dangling", noSub === "Pip. home. me.open");
  const off = courierA11y({ wren: "Pip", dayOff: true, carrying: false, best: 0, ago: "1H AGO", line: "ignored on a day off", sub: "" }, fmt);
  ok("day off: DAY OFF, her day-off line, PLAY (the tap opens the game)", off === "Pip, ff.dayoff.tag. ff.dayoff.line. ff.dayoff.sub. ff.play");
  const offBest = courierA11y({ wren: "Pip", dayOff: true, carrying: true, best: 12, ago: "", line: "", sub: "" }, fmt);
  ok("day off, carrying, with a best", offBest === "Pip, ff.dayoff.tag. ff.dayoff.lineCarrying. ff.dayoff.subBest{n:12}. ff.play");
  ok("the tap: the game on her day off, else her room", courierHref(true) === "/courier?play=1" && courierHref(false) === "/courier");
}

/* ── the whole view ── */
{
  const f: MeFacts = {
    profile: { handle: null, createdAt: "2026-07-27T00:00:00Z", cofounderNo: null, letters: null, kindreds: 2 },
    aura: null,
    stamps: [],
    keepsakes: [],
    firstClass: { premium: false, cofounderNo: null, wren: "Pip" },
    courier: { wren: "Pip", dayOff: false, carrying: false, best: 0, ago: "", line: "home", sub: "" },
  };
  const v = buildMeView(f, fmt);
  ok("ME", v.title === "me.header");
  ok("the bar's pen name is the profile's name", v.penName === v.profile.name && v.penName === "set.you");
  ok("the sliders button is labelled", v.settingsLabel === "me.settingsA11y");
  ok("four segment labels", v.segments.length === 4);
  ok("no aura yet: null", v.aura === null);
  ok("the keepsakes note names the courier", v.keepsakes.note === "me.keepsakes.note{wren:Pip}");
  ok("the courier sentence", v.courierA11y === "Pip. home. me.open");
}

/* ── where taps go ── */
ok("the sliders push the Me stack's settings", ME_ROUTES.settings === "/me/settings");
ok("the pencil pushes the Me stack's edit page", ME_ROUTES.editProfile === "/me/edit-profile");
ok("stat cells", statHref("letters") === "/my-letters" && statHref("kindreds") === "/my-kindreds");
ok("aura CTA", auraCtaHref("compose") === "/compose" && auraCtaHref("aura") === "/aura");
ok("a keepsake tile", ME_ROUTES.keepsake("first-flight") === "/keepsake/first-flight");
ok("First Class from the Me row", ME_ROUTES.paywall === "/paywall?src=me_row");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
if (fails) process.exit(1);
