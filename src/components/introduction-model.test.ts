/* Behaviour lock for the introduction's shared rules (components/introduction-model): the mosaic
   ritual's clock, the burst's throws and the sheet's words, the same for the React Native sheet
   and the SwiftUI one ("introritual"). Not wired to a runner; run by hand from the repo root with
   plain node (types stripped by Node itself; the hook below adds ".ts" to the app's
   extensionless imports):
     node src/components/introduction-model.test.ts */

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const M = await import("./introduction-model.ts");
const { inkedCells, hashStr } = await import("../lib/mosaic.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/* ── the clock: the numbers React Native's ritual has always used ── */
ok("road 380, step 240, fly 620", M.T_ROAD === 380 && M.T_STEP === 240 && M.T_FLY === 620);
ok("burst 3700, slap 4220, name 4740", M.T_BURST === 3700 && M.T_SLAP === 4220 && M.T_NAME === 4740);
ok("bump 6240, notice 7340, done 8040", M.T_BUMP === 6240 && M.T_NOTICE === 7340 && M.T_RITUAL_DONE === 8040);
{
  const b = M.typedNameBeats(5, 1000);
  ok("the caret comes at the beat", b.caret === 1000);
  ok("letter 1 lands 240 + 95 after it", b.letter(1) === 1335);
  ok("the last letter, the jolt 80 after, the caret gone 600 after", b.last === 1715 && b.jolt === 1795 && b.caretOff === 2315);
}
ok("a short name is done at 8040", M.mosaicRitualEnd(6) === M.T_RITUAL_DONE);
ok("a long name typing past 8040 moves the end", M.mosaicRitualEnd(40) === M.T_NAME + 240 + 40 * 95 + 600);
ok("typed steps are the prefixes React Native shows", JSON.stringify(M.typedSteps("MIRA")) === JSON.stringify(["M", "MI", "MIR", "MIRA"]));
ok("no name, no steps", M.typedSteps("").length === 0);

/* ── the burst ── */
{
  const seed = "preview-other-3360";
  const scraps = M.burstScraps(seed);
  const cells = Array.from(inkedCells(seed));
  ok("one scrap per inked cell, in inkedCells' order", scraps.length === cells.length && scraps.every((s, i) => `${s.r},${s.c}` === cells[i]));
  ok("the grid is 59 across", near(M.SCRAP_GRID, 59));
  const s0 = scraps[0];
  const h = hashStr("scrap-0");
  ok("the throw is React Native's", near(s0.dist, 70 + (h % 50)) && near(s0.spin, (h % 2 ? 1 : -1) * (180 + (h % 180))));
  ok("a scrap sits on its own cell, from the grid's middle", scraps.every((s) => near(s.x0, s.c * 12.5 - 29.5 + 4.5) && near(s.y0, s.r * 12.5 - 29.5 + 4.5)));
  ok("the throw's direction is outward plus up to ±20°", near(s0.ang, Math.atan2(s0.y0, s0.x0 || 0.01) + (((h % 40) - 20) * Math.PI) / 180));
  ok("the middle column never throws straight up (x0 || 0.01)", scraps.filter((s) => s.c === 2).every((s) => Number.isFinite(s.ang)));
  ok("the same seed throws the same way", JSON.stringify(M.burstScraps(seed)) === JSON.stringify(scraps));
}

/* ── the words ── */
const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(",")})` : key);
const deps = { t, day: (iso: string) => `d:${iso.slice(5, 10)}`, stickerName: (id: string) => `S:${id}` };
const base = { wren: "Pip", otherName: "Marlow", myName: "fern", signed: null, roadLetters: 10, since: "2026-09-18T10:00:00Z", notice: null, fact: null };
{
  const w = M.introductionWords(base, deps);
  ok("title and close", w.title === "intro.carriedBy(name=Pip)" && w.close === "wren.trackClose");
  ok("the chip is the day, in capitals", w.chip === "in.sinceChip(date=D:09-18)");
  ok("mosaic: one sentence, the road and the chip", w.ritualA11y === "in.a11yOff(n=10,name=Marlow) in.sinceChip(date=D:09-18)");
  ok("no road: the name, then the chip", M.introductionWords({ ...base, roadLetters: 0 }, deps).ritualA11y === "Marlow in.sinceChip(date=D:09-18)");
  ok("nothing noticed and no fact: no line", w.noticedLine === "");
  ok("noticed head in capitals", w.noticedHead === "in.noticed(wren=PIP)");
  ok("knowYou with my name, unsigned without", w.knowYou === "in.knowYou(name=fern)" && M.introductionWords({ ...base, myName: "" }, deps).knowYou === "in.knowYouUnsigned");
  ok("TALK TO their name", w.talkTo === "in.talkTo(name=Marlow)");
}
{
  const notice = { stickerId: "straight_shooter", shared: true, supporting: 4, eligible: 5 };
  ok("a label both wear", M.introductionWords({ ...base, notice }, deps).noticedLine === "in.both(label=S:straight_shooter,n=4,m=5)");
  ok("their strongest, by the name signed", M.introductionWords({ ...base, notice: { ...notice, shared: false } }, deps).noticedLine === "in.theirs(name=Marlow,label=S:straight_shooter,n=4,m=5)");
  const fact = { letters: 10, days: 23, nightTheirs: 2, longestWaitDays: 4 };
  ok("a label beats the road's fact", M.introductionWords({ ...base, notice, fact }, deps).noticedLine.startsWith("in.both"));
  ok("letters after dark", M.introductionWords({ ...base, fact }, deps).noticedLine === "in.roadNight(n=10,d=23,k=2)");
  ok("else the longest wait", M.introductionWords({ ...base, fact: { ...fact, nightTheirs: 0 } }, deps).noticedLine === "in.roadWait(n=10,d=23,g=4)");
}
{
  const signed = { theirs: { courier: "Sunday Kite", name: "Mira" }, mine: { courier: "Quiet Fern", name: "" } };
  const w = M.introductionWords({ ...base, signed, notice: { stickerId: "x", shared: false, supporting: 1, eligible: 2 } }, deps);
  ok("signed: TALK TO the name they signed", w.talkTo === "in.talkTo(name=Mira)" && w.theirName === "Mira");
  ok("signed: theirs says the signed name", w.noticedLine === "in.theirs(name=Mira,label=S:x,n=1,m=2)");
  ok("signed: I signed nothing, so the unsigned line", w.knowYou === "in.knowYouUnsigned" && w.meName === "");
  ok("signed: the sentence names both, my side falls back", w.ritualA11y === "id2.in.a11y(name=Sunday Kite,pen=Mira) id2.in.a11yMine(name=Quiet Fern,pen=in.meFallback) in.sinceChip(date=D:09-18)");
}

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
