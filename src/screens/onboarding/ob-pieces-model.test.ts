/* ob-pieces-model: what the Swift onboarding's last four pieces need, decided without React Native.
   Run by hand: node src/screens/onboarding/ob-pieces-model.test.ts */
import { CHICK_SHOT, RIG_LAYERS, RIG_SHOT, RUN_MOODS, motionRows, parseBurst, runLookSig, shotPlan } from "./ob-pieces-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

ok("nine moods, five resting parts", RUN_MOODS.length === 9 && RIG_LAYERS.length === 5);
ok("the chick is captured at its largest, the rig at the hatch's", CHICK_SHOT === 104 && RIG_SHOT === 148);

// the look: the run's form and mark, nothing else
const form = { bodyStretch: 1.1, eyeScale: 1, eyeSpread: 2, cheek: 1, crestLift: 0, beakScale: 1, tail: false };
ok("the same look, the same signature", runLookSig(form, "#4F8C5C") === runLookSig({ ...form }, "#4F8C5C"));
ok("another mark, another signature", runLookSig(form, "#4F8C5C") !== runLookSig(form, "#7C86B8"));
ok("another form, another signature", runLookSig(form, "#4F8C5C") !== runLookSig({ ...form, tail: true }, "#4F8C5C"));
ok("no form is a look too", typeof runLookSig(undefined, null) === "string" && runLookSig(undefined, null).length > 0);

// the plan: nothing before 8, the rig until 9, the chick from 8 to the end
const all = { chick: true, flight: true, hatch: true };
ok("before the stamp nothing is taken", ["doorstep", "egg", "letter"].every((s) => !shotPlan(s, all).birds && !shotPlan(s, all).rig));
ok("on 8 and 9 both", shotPlan("stamp", all).birds && shotPlan("stamp", all).rig && shotPlan("hatch", all).rig);
ok("after the hatch, no rig", !shotPlan("name", all).rig && !shotPlan("knock", all).rig);
ok("the chick to the end", ["name", "address", "flight", "knock"].every((s) => shotPlan(s, all).birds));
ok("a React Native piece needs no pictures", !shotPlan("name", { chick: false, flight: false, hatch: false }).birds && !shotPlan("hatch", { chick: true, flight: false, hatch: false }).rig);
ok("the flight alone still needs her", shotPlan("flight", { chick: false, flight: true, hatch: false }).birds);
ok("an unknown screen needs nothing", !shotPlan("nowhere", all).birds && !shotPlan("nowhere", all).rig);

// the motions: pickMotion's weights
const rows = motionRows(
  [
    { key: "rhythm", score: 100, locked: true },
    { key: "vocabulary", score: 0, locked: false },
    { key: "nothing", score: 50, locked: true },
  ],
  { rhythm: "hop", vocabulary: "peck" },
  { hop: 0.6, peck: 1.1 },
  { hop: "happy", peck: null },
);
ok("one row per known dimension", rows.length === 2);
ok("locked and full: (0.08 + 1) × 2.5", Math.abs(rows[0].w - 2.7) < 1e-9 && rows[0].m === "hop" && rows[0].s === 0.6 && rows[0].face === "happy");
ok("empty and unlocked: the floor", Math.abs(rows[1].w - 0.08) < 1e-9 && rows[1].face === "");
ok("a negative score is the floor", Math.abs(motionRows([{ key: "a", score: -5, locked: false }], { a: "wag" }, {}, {})[0].w - 0.08) < 1e-9);

// the burst
const b = parseBurst("160.5,402");
ok("the burst reads back", !!b && b.x === 160.5 && b.y === 402);
ok("a broken burst is null", parseBurst("x,1") === null && parseBurst("") === null);

if (fails) {
  console.log(`${fails} failed`);
  process.exit(1);
}
console.log("all ok");
