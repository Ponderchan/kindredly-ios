/* The hatchling's proportions come out of the corpus that hatched her.
   Run: npx tsx src/lib/writing-engine/tests/hatchling-form.test.ts

   The property under test is the one the design exists for: two readers who
   write differently must not hatch the same chick. So this asserts DISTINCTNESS
   across representative corpora, not specific numbers — the numbers are free to
   move as the engine is tuned, the sameness is not. */

import { scoreNine } from "../../hatch-engine.ts";
import { hatchlingForm, NEUTRAL, type HatchlingForm } from "../../hatchling-form.ts";
import { setEngineLanguage } from "../app-language.ts";

let fail = 0;
const ok = (c: boolean, label: string) => {
  if (!c) fail++;
  console.log(`${c ? "ok  " : "FAIL"}  ${label}`);
};

setEngineLanguage("en");

const CORPORA: [string, string[]][] = [
  ["short/direct", ["went to work.", "came home.", "slept."]],
  ["long/inward", [
    "i keep thinking about the way the light came through the kitchen window this morning, how it made the dust look like it was floating on purpose.",
    "there's a kind of quiet that only happens before anyone else is awake, and i've started waking early just to sit inside it.",
  ]],
  ["explicit feeling", ["i'm so tired and i miss her.", "i feel empty and scared honestly.", "i hate that i still care."]],
  ["implicit/concrete", ["the second cup stayed on the table all night.", "i left the porch light on again.", "her coat is still on the hook."]],
  ["punctuation-heavy", ["what?! i can't believe it — really?!", "omg!!! that was SO good!!", "wait... what?? no way!!!"]],
];

const forms = CORPORA.map(([n, t]) => [n, hatchlingForm(scoreNine(t))] as [string, HatchlingForm]);

console.log("── every corpus hatches a different chick ──");
const sig = (f: HatchlingForm) =>
  [f.bodyStretch, f.crestLift, f.eyeScale, f.eyeSpread, f.cheek, f.beakScale, f.tail]
    .map((v) => (typeof v === "number" ? v.toFixed(2) : String(v)))
    .join("|");
const seen = new Map<string, string>();
for (const [name, f] of forms) {
  const s = sig(f);
  ok(!seen.has(s), `${name} is not identical to ${seen.get(s) ?? "any earlier corpus"}`);
  seen.set(s, name);
}

console.log("\n── every axis actually moves across the set ──");
const AXES: (keyof HatchlingForm)[] = ["bodyStretch", "crestLift", "eyeScale", "eyeSpread", "cheek", "beakScale", "tail"];
for (const a of AXES) {
  const vals = new Set(forms.map(([, f]) => String(f[a])));
  ok(vals.size > 1, `${a} takes ${vals.size} distinct values (a dead axis is a wasted part)`);
}

console.log("\n── nothing deforms past the bounds a face can survive ──");
for (const [name, f] of forms) {
  ok(f.bodyStretch > 0.8 && f.bodyStretch < 1.25, `${name}: body ${f.bodyStretch.toFixed(2)} stays in range`);
  ok(f.eyeScale > 0.7 && f.eyeScale < 1.35, `${name}: eyes ${f.eyeScale.toFixed(2)} stay in range`);
  ok(Math.abs(f.eyeSpread) <= 6, `${name}: eye spread ${f.eyeSpread.toFixed(1)} stays in range`);
  ok(f.cheek >= 0 && f.cheek <= 2, `${name}: cheek ${f.cheek.toFixed(2)} stays in range`);
}

console.log("\n── an empty read falls back to the neutral chick ──");
ok(sig(hatchlingForm(null)) === sig(NEUTRAL), "null dims → NEUTRAL");
ok(sig(hatchlingForm([])) === sig(NEUTRAL), "empty dims → NEUTRAL");

console.log("\n" + (fail ? `FAILED ${fail} case(s)` : "ALL PASS"));
process.exit(fail ? 1 : 0);
