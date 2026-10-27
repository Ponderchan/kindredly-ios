/* Behaviour lock for the Swift kindred page's words (screens/chat/kindred-page-view): which
   sections show, in which state, with which words. Not wired to a runner; run by hand from the
   repo root with plain node (it strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/chat/kindred-page-view.test.ts
   A load hook adds ".ts" to an extensionless relative import, in this process only. Every line
   prints ok/FAIL and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const V = await import("./kindred-page-view.ts");
const { demoDetail } = await import("../../data/demo.ts");
const { mosaicMask, developFor } = await import("../../lib/mosaic.ts");

type Detail = import("../../lib/db").ThreadDetail;
type Input = import("./kindred-page-view").KindredPageInput;
type Read = import("../../lib/correspondent").CorrespondentRead;
type Res = import("../../lib/correspondent").Resonance;
type Dim = import("../../lib/hatch-engine").DimScore;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(",")})` : key);
const copy = {
  t,
  locale: "en-US",
  dimLabel: (k: string) => `Dim ${k}`,
  dimLineThird: (d: Dim) => `line ${d.key}`,
  dimSealedThird: (k: string) => `Sealed ${k}`,
  archName: (id: string) => `Arch ${id}`,
  archDescThird: (id: string) => `desc ${id}`,
  dayLong: (iso: string) => `day(${iso.slice(0, 10)})`,
};

const kin: Detail = {
  stamp: "tiny-win",
  revealed: true,
  otherName: "Mira",
  other: "u-mira",
  myCount: 6,
  otherCount: 7,
  opening: "the opening",
  openingFromMe: false,
  since: "2026-09-01T10:00:00Z",
  messages: [],
};
const pal: Detail = { ...kin, revealed: false, otherName: "", other: "u-pal" };
const opening = { body: "the opening", mine: false, date: "" };

const input = (over: Partial<Input> = {}): Input => ({
  detail: kin,
  status: "ok",
  identity: false,
  read: null,
  res: null,
  began: { name: "Tiny win", id: "tiny-win" },
  letterId: "letter-1",
  opening,
  openingVoice: false,
  openingDuration: "0:35",
  openingLines: 5,
  hasFrost: false,
  canReport: true,
  holdable: true,
  firstMet: null,
  ...over,
});
const build = (over: Partial<Input> = {}) => V.buildKindredPageView(input(over), copy);

const dim = (key: string, score: number): Dim => ({ key, score, locked: true, icon: "", label: "", line: "", chip: "", sealed: "" }) as unknown as Dim;

/* ── the states ── */
ok("nothing yet: loading, the bar alone", (() => {
  const v = build({ detail: null, status: "loading" });
  return v.state === "loading" && v.title === "" && v.facts.length === 0 && v.talk === "";
})());
ok("nothing and offline: the offline line", build({ detail: null, status: "offline" }).state === "offline");
ok("nothing and missing: the closed line", build({ detail: null, status: "missing" }).state === "missing");
ok("a kept copy while offline is still the page", build({ status: "offline" }).state === "ready");

/* ── the header ── */
ok("title: A KINDRED / A VOICE YOU KNOW", build().title === "kd.kindred" && build({ detail: pal }).title === "kd.voiceKnown");
ok("the ⋯ only with someone to report", build().moreLabel === "rp.menu.a11y" && build({ canReport: false }).moreLabel === "");

/* ── the person ── */
{
  const v = build();
  ok("a kindred: their name, round", v.person.revealed && v.person.heading === "Mira" && v.face.shape === "round");
  ok("identity off: THE FACE YOU WATCHED ARRIVE, their whole mosaic", v.person.arrival === "kd.faceArrive" && v.person.arrivalMask === mosaicMask("u-mira", 1));
  ok("identity on: no arrival line", build({ identity: true }).person.arrival === "");
  ok("a kindred with no name falls back to cm.kindred", build({ detail: { ...kin, otherName: "" } }).person.heading === "cm.kindred");
}
{
  const read: Read = { stage: "recognizing", moments: 4, found: [], sealed: [], archetype: { id: "lantern", name: "", desc: "", aff: {} } };
  const v = build({ detail: pal, read });
  ok("before names: the archetype and its line", !v.person.revealed && v.person.heading === "Arch lantern" && v.person.sub === "desc lantern");
  const none = build({ detail: pal });
  ok("before names, no read yet: still a voice", none.person.heading === "kd.stillVoice" && none.person.sub === "kd.notEnough");
  ok("a pen pal with the switch off: the developing mosaic", none.face.shape === "mosaic" && none.face.mask === mosaicMask("u-pal", developFor(7)));
  ok("a pen pal with a window known: the frost", build({ detail: pal, identity: true, hasFrost: true }).face.shape === "frost");
  ok("a pen pal, the switch on, no window yet: the mosaic", build({ detail: pal, identity: true, hasFrost: false }).face.shape === "mosaic");
}
{
  const ghost = demoDetail("demo-gone-kindred") as Detail;
  ok("a closed account: the veil mosaic, the flat tile with the switch on", build({ detail: ghost }).face.shape === "veil" && build({ detail: ghost, identity: true }).face.shape === "tile");
  ok("a closed account: no TALK TO", build({ detail: ghost }).talk === "");
}

/* ── THE NAME THEY SIGNED ── */
{
  ok("identity off: no signature", !build().signed.show);
  ok("before names: no signature", !build({ detail: pal, identity: true }).signed.show);
  const typed = build({ identity: true, holdable: false });
  ok("typed: no path, the typed words", typed.signed.show && typed.signed.path === "" && typed.signed.a11y === "id2.kd.typedA11y(pen=Mira)");
  ok("not holdable: no hint", typed.signed.hint === "" && !typed.signed.holdable);
  const mira = demoDetail("demo-mira") as Detail;
  const drawn = build({ detail: mira, identity: true, firstMet: "SUNDAY KITE" });
  ok("drawn: the path and the drawn words", drawn.signed.path.startsWith("M") && drawn.signed.a11y.startsWith("id2.kd.drawnA11y("));
  ok("holdable: the hint", drawn.signed.holdable && drawn.signed.hint === "id2.kd.holdHint");
  ok("FIRST MET AS", drawn.signed.met === "id2.kd.firstMet(name=SUNDAY KITE)" && typed.signed.met === "");
  ok("the pad's box and baseline", drawn.signed.boxW === 1000 && drawn.signed.boxH === 320 && drawn.signed.baselineY === 230);
  ok("a CJK typed name stands upright", build({ identity: true, detail: { ...kin, otherName: "小林" } }).signed.typedUpright);
}

/* ── what their letters told you ── */
{
  ok("nothing found: no group", !build({ read: { stage: "found", moments: 0, found: [], sealed: [dim("rhythm", 10)], archetype: null } }).learned.show);
  const read: Read = { stage: "known", moments: 1, found: [dim("emotion", 70)], sealed: ["rhythm", "quirks", "sentence", "structure", "vocabulary"].map((k) => dim(k, 5)), archetype: null };
  const v = build({ read }).learned;
  ok("found: a line each, the label in capitals", v.show && v.dims.length === 1 && v.dims[0].label === "DIM EMOTION" && v.dims[0].line === "line emotion" && v.dims[0].score === 70);
  ok("one moment / many moments", v.moments === "kd.momentsOne(n=1)" && build({ read: { ...read, moments: 3 } }).learned.moments === "kd.momentsMany(n=3)");
  ok("the sealed: four at most, lower-cased", v.sealedLabel === "kd.keepWriting" && v.sealed === "□ sealed rhythm   □ sealed quirks   □ sealed sentence   □ sealed structure");
  ok("nothing sealed: no KEEP WRITING", build({ read: { ...read, sealed: [] } }).learned.sealedLabel === "");
}

/* ── how alike you write ── */
{
  ok("no resonance: no group", !build().resonance.show);
  const near = { key: "rhythm", label: "", mine: 40.4, theirs: 44.6, together: true } as Res["rows"][number];
  const far = { key: "quirks", label: "", mine: 10, theirs: 80, together: false } as Res["rows"][number];
  const v = build({ res: { score: 73, rows: [near, far], closest: near, furthest: far } }).resonance;
  ok("the score", v.show && v.score === "73%");
  ok("a row: capitals, both places, together said", v.rows[0].label === "DIM RHYTHM" && v.rows[0].a11y === "kd.resA11y(label=Dim rhythm,mine=40,theirs=45), kd.resTogether");
  ok("a row apart: no together", v.rows[1].a11y === "kd.resA11y(label=Dim quirks,mine=10,theirs=80)");
  ok("closest lower-cased, furthest as is", v.close === "kd.resClose(label=dim rhythm)" && v.far === "kd.resFar(label=Dim quirks)");
}

/* ── the facts ── */
{
  const f = build().facts;
  ok("since, letters, began under", f.map((x) => x.key).join(",") === "since,letters,began");
  ok("since in full", f[0].value === "day(2026-09-01)");
  ok("letters: n — mine · theirs", f[1].value === "kd.lettersVal(n=13,mine=6,theirs=7)");
  ok("began under: its name and the stamp, tilted by the letter", f[2].value === "Tiny win" && f[2].stamp === "tiny-win" && f[2].letterId === "letter-1");
  ok("no since: no row", build({ detail: { ...kin, since: null } }).facts.length === 2);
  ok("no stamp: a dash, nothing drawn", (() => {
    const b = build({ began: null }).facts[2];
    return b.value === "—" && b.stamp === "" && b.letterId === "";
  })());
}

/* ── where it began ── */
{
  const v = build().opening;
  ok("the opening, and who wrote it", v.show && v.body === "the opening" && v.who === "kd.theyFirst(name=MIRA)" && !v.voice && v.duration === "");
  ok("no opening, no card", !build({ opening: null }).opening.show);
  ok("a voice opening: the card and its length", (() => {
    const o = build({ openingVoice: true }).opening;
    return o.voice && o.duration === "0:35";
  })());
  ok("identity on: who began agrees with no name", build({ identity: true }).opening.who === "id.kd.theyFirst(name=MIRA)");
  ok("the line limit passes through", build({ openingLines: 6 }).opening.lines === 6);
}

/* ── TALK TO ── */
ok("TALK TO the kindred", build().talk === "kd.talkTo(name=Mira)");
ok("no door into a thread the server calls missing", build({ status: "missing" }).talk === "");

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
