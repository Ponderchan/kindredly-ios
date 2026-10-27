/* Behaviour lock for the courier card's model (components/courier-card-model): the hour's sky,
   her place on the arc, her picture, and the words the SwiftUI card on Me draws ("couriercard"),
   which must be the React Native card's (components/CourierCard, framed).
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/components/courier-card-model.test.ts
   A load hook adds ".ts" to the extensionless relative imports Metro wants. Every line prints
   ok/FAIL and the process exits non-zero if any fail. */

import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const M = await import("./courier-card-model.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}(${Object.entries(v).map(([a, b]) => `${a}=${b}`).join(",")})` : k);
const ago = (at: number | null) => (at == null ? "fl.now" : `ago:${at}`);
const W = { t, ago };
type Facts = Parameters<typeof M.courierCardModel>[0];
const base: Facts = {
  wren: "Pip",
  state: "home",
  stage: "wren",
  stateMood: "content",
  entry: { line: "home with nothing to carry", sub: "the kettle's on", at: 1000 },
  hunger: null,
  playing: false,
  best: 0,
  hour: 12,
};
const card = (o: Partial<Facts> = {}) => M.courierCardModel({ ...base, ...o }, W);

/* ── the hour ── */
ok("5–9 is morning", M.daylight(5) === "morning" && M.daylight(9) === "morning");
ok("10–16 is day", M.daylight(10) === "day" && M.daylight(16) === "day");
ok("17–19 is evening", M.daylight(17) === "evening" && M.daylight(19) === "evening");
ok("20–4 is night", M.daylight(20) === "night" && M.daylight(0) === "night" && M.daylight(4) === "night");
ok("the card paints the hour it is given", card({ hour: 21 }).daylight === "night" && card({ hour: 7 }).daylight === "morning");
{
  const night = card({ hour: 22 }).palette;
  ok("night: no sun, no cloud (empty strings for Swift)", night.sun === "" && night.cloud === "");
  ok("night: moon, stars, lit windows", night.moon && night.stars && night.lit);
  ok("night: the sky is the V10 indigo", night.sky0 === "#1E1B35" && night.sky1 === "#2E2A6B");
  const day = card({ hour: 12 }).palette;
  ok("day: a high sun at (.82, .16), a white cloud", day.sun === "#FFD54A" && day.sunX === 0.82 && day.sunY === 0.16 && day.cloud === "#FFFFFF");
  ok("day: no moon, no stars, windows dark", !day.moon && !day.stars && !day.lit);
  ok("evening: windows lit, amber sun", card({ hour: 18 }).palette.lit && card({ hour: 18 }).palette.sun === "#FF9A57");
  ok("every palette entry reaches the record", Object.values(M.PALETTE).every((P) => {
    const r = M.courierPaletteRecord(P);
    return r.text === P.text && r.scrim === P.scrim && r.button === P.button && r.buttonText === P.buttonText && r.sea === P.sea && r.land === P.land && r.forest === P.forest && r.rock === P.rock && r.ink === P.ink && r.chip === P.chip && r.chipText === P.chipText;
  }));
}

/* ── where she is ── */
ok("unsent and home sit by your window", card({ state: "unsent" }).at === 0.06 && card({ state: "home" }).at === 0.06);
ok("exploring is mid-arc, delivery near theirs, bringing on the way back", card({ state: "exploring" }).at === 0.5 && card({ state: "delivery" }).at === 0.72 && card({ state: "bringing" }).at === 0.3);
ok("flying: exploring, delivery, bringing", card({ state: "exploring" }).flying && card({ state: "delivery" }).flying && card({ state: "bringing" }).flying);
ok("not flying: home, unsent", !card({ state: "home" }).flying && !card({ state: "unsent" }).flying);
{
  const p = M.onArc(0.5, 100, 300, 120, 4);
  ok("the arc's midpoint is centred, halfway up to its control", p.x === 200 && p.y === 62);
  const e = M.onArc(0, 100, 300, 120, 4);
  ok("the arc starts at your window", e.x === 100 && e.y === 120);
}

/* ── her picture ── */
ok("on the sill: her stage and her whereabouts' face", card({ state: "home", stage: "fledge", stateMood: "content" }).pose === "card-fledge-content");
ok("hungry: hunger's face wins", card({ hunger: { line: "l", sub: "s", mood: "sleepy", wilt: false } }).pose === "card-wren-sleepy");
ok("flying: the fly drawing at her stage, whatever the face", card({ state: "delivery", stage: "hatch", stateMood: "curious" }).pose === "card-fly-hatch");
ok("day off: the cover's own picture", card({ playing: true, stage: "wren" }).pose === "card-dayoff-wren" && card({ playing: true, stage: "egg" }).pose === "card-dayoff-egg");
ok("starving wilts her", card({ hunger: { line: "l", sub: "s", mood: "worry", wilt: true } }).wilt);
ok("not hungry: no wilt", !card().wilt);
ok("the day-off cover never wilts (React Native draws it without)", !card({ playing: true, hunger: { line: "l", sub: "s", mood: "worry", wilt: true } }).wilt);
{
  // the poses the model names are the ones lib/bird-images registers (read as text: it imports React Native)
  const src = readFileSync(new URL("../lib/bird-images.ts", import.meta.url), "utf8");
  ok("bird-images declares the three card pose shapes", src.includes("`card-${WrenStage}-${WrenMood}` | `card-fly-${WrenStage}` | `card-dayoff-${WrenStage}`"));
  ok("bird-images draws the card at 50 and the cover at 44", /\{ size: 50, mood, stage \}/.test(src) && /size: 44, mood: "happy", fly: true, stage, letter: false/.test(src));
  ok("BirdSnapshots passes the letter pin to WrenBird", readFileSync(new URL("./BirdSnapshots.tsx", import.meta.url), "utf8").includes("letter={p.letter}"));
}

/* ── the words ── */
{
  const c = card();
  ok("the chip is YOUR COURIER, upper-cased", c.chip === "ME.SEC.COURIER");
  ok("YOU and SOMEWHERE under the windows", c.you === "me.route.you" && c.somewhere === "me.route.somewhere");
  ok("her name and the entry's time", c.name === "Pip" && c.time === "ago:1000");
  ok("her line and its aside", c.line === "home with nothing to carry" && c.aside === "the kettle's on");
  ok("the button opens her room", c.cta === "me.open");
  ok("a 'right now' line has no time to count", card({ entry: { line: "x", sub: null, at: null } }).time === "fl.now");
  ok("no aside: empty", card({ entry: { line: "x", sub: null, at: 1 } }).aside === "");
}
{
  const h = card({ hunger: { line: "nothing to carry for four days", sub: "one letter would do it", mood: "sleepy", wilt: false } });
  ok("hungry: hunger's line and aside", h.line === "nothing to carry for four days" && h.aside === "one letter would do it");
  ok("hungry: the time is still the entry's", h.time === "ago:1000");
}
{
  const d = card({ playing: true, best: 0 });
  ok("day off: the course's line, the invitation, DAY OFF for the time", d.line === "ff.dayoff.line" && d.aside === "ff.dayoff.sub" && d.time === "ff.dayoff.tag");
  ok("day off: Play", d.cta === "ff.play" && d.dayOffTag === "ff.dayoff.tag");
  ok("day off with a best run: the rematch", card({ playing: true, best: 12 }).aside === "ff.dayoff.subBest(n=12)");
  ok("day off while a letter is out: the carrying line", card({ playing: true, state: "delivery" }).line === "ff.dayoff.lineCarrying");
}

/* ── the Swift card keeps the React Native card's numbers ── */
{
  const swift = readFileSync(new URL("../../modules/kindredly-ui/ios/Portable/Me/KCourierCard.swift", import.meta.url), "utf8");
  ok("Swift: the scene is 236 tall with a 92 band", swift.includes(`sceneHeight: CGFloat = ${M.SCENE_H}`) && swift.includes(`bandHeight: CGFloat = ${M.BAND_H}`));
  ok("Swift: the globe's top, radius and shoulders", swift.includes(`globeTop: CGFloat = ${M.GLOBE.top}`) && swift.includes(`globeRadius: CGFloat = ${M.GLOBE.r}`) && swift.includes(`globeShoulder: CGFloat = ${M.GLOBE.shoulder}`));
}

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
