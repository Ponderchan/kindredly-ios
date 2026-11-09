/* Behaviour lock for Free Flight's Swift records (screens/courier/free-flight-model): the course's
   height (WrenHome playH), the hour's sky as the React Native game paints it, her stage and the
   words with their two holes. Not wired to a runner; run by hand from the repo root:
     node src/screens/courier/free-flight-model.test.ts
   The model imports nothing at runtime. Every line prints ok/FAIL; a failure exits non-zero. */

import { FLIGHT_MOODS, FLIGHT_TOP, flightStage, flightStrings, freeFlightData, playHeight } from "./free-flight-model.ts";
import type { Palette } from "../../components/courier-card-model";

let failed = 0;
const check = (name: string, ok: boolean) => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
};

// the course: 280…360, the window less 290
check("playH: a small phone floors at 280", playHeight(568) === 280);
check("playH: a mid phone is the window less 290", playHeight(640) === 350);
check("playH: a tall phone caps at 360", playHeight(932) === 360);

check("stage: an egg has no game", flightStage("egg") === null);
check("stage: the others are their own", flightStage("hatch") === "hatch" && flightStage("fledge") === "fledge" && flightStage("wren") === "wren");
check("moods: curious, happy, worry", FLIGHT_MOODS.join(",") === "curious,happy,worry");

// the words: a fake t that echoes the key and fills vars as i18n's t does
const t = (key: string, vars?: Record<string, string | number>) => {
  const s: Record<string, string> = { "ff.title": "Free Flight", "ff.takeoff": "Type {letter} to take off", "ff.best": "BEST {n}" };
  const base = s[key] ?? key;
  return vars ? base.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : base;
};
const words = flightStrings(t);
check("strings: the title is upper-cased", words.title === "FREE FLIGHT");
check("strings: takeoff keeps {letter} for Swift", words.takeoff === "Type {letter} to take off");
check("strings: best keeps {n} for Swift", words.best === "BEST {n}");
check("strings: every key is the game's", words.again === "ff.again" && words.anyKey === "ff.anyKey" && words.statPace === "ff.statPace" && words.done === "ff.done");

const day: Palette = { text: "#1E1B35", scrim: "#ADDBB5", button: "#1F5C33", buttonText: "#FFFFFF", land: "#9CD48C", forest: "#3F8F52", rock: "#8E9AA6", sea: "#6FB6E8", sky: ["#BFE3F8", "#E3F3FB"], ink: "#1F5C33", chip: "#1F5C33", chipText: "#FFFFFF", sun: "#FFD54A", sunAt: [0.82, 0.16], moon: false, stars: false, lit: false, cloud: "#FFFFFF" };
const night: Palette = { text: "#FFFFFF", scrim: "#2B2660", button: "#FFFFFF", buttonText: "#1E1B35", land: "#2F5148", forest: "#1B3530", rock: "#3A3F5C", sea: "#1F2E5E", sky: ["#1E1B35", "#2E2A6B"], ink: "#DAD6F2", chip: "#FFFFFF", chipText: "#1E1B35", sun: null, sunAt: [0.84, 0.18], moon: true, stars: true, lit: true, cloud: null };
const bird = { uri: "file:///tmp/a.png", key: "k" };

const d = freeFlightData({ hour: "day", palette: day, winH: 844, best: 7, birds: { happy: bird }, strings: words });
check("day: the pillars edged in the chip", d.pillarInk === "#1F5C33" && d.scrim === "#ADDBB5");
check("day: the ground in land and forest", d.land === "#9CD48C" && d.forest === "#3F8F52");
check("day: the sun, no moon, no stars", d.sun === "#FFD54A" && !d.moon && !d.stars && !d.night);
check("day: the header's 44 and the course height", d.top === FLIGHT_TOP && d.top === 44 && d.height === 360);
check("day: faces not yet captured are null", d.happy === bird && d.curious === null && d.worry === null);
check("day: the best as given", d.best === 7);

const n = freeFlightData({ hour: "night", palette: night, winH: 600, best: -3, birds: {}, strings: words });
check("night: the pillars edged in lilac", n.pillarInk === "#DAD6F2");
check("night: no sun, the moon and stars", n.sun === "" && n.moon && n.stars && n.night);
check("night: the sky's two stops", n.sky0 === "#1E1B35" && n.sky1 === "#2E2A6B");
check("night: a bad best reads as none", n.best === 0);
check("night: a short window", n.height === 310);

if (failed) {
  console.log(`${failed} failed`);
  process.exit(1);
}
console.log("all ok");
