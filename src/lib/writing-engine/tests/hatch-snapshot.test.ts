/* ENGLISH REGRESSION SNAPSHOT for the hatch engine.
   Run:  npx tsx src/lib/writing-engine/tests/hatch-snapshot.test.ts
   Prints the nine scores + archetype for fixed English samples. Capture this
   BEFORE the language-relative migration; re-run AFTER and diff. English is
   expected to be IDENTICAL (English baselines = the current constants); any
   change is an intentional, documented one. */

import { scoreNine, matchArchetype } from "../../hatch-engine.ts";

const SAMPLES: Record<string, string[]> = {
  short_direct: ["went to work.", "came home.", "slept."],
  long_layered: [
    "i keep thinking about the way the light came through the kitchen window this morning, how it made the dust look like it was floating on purpose.",
    "there's a kind of quiet that only happens before anyone else is awake, and i think i've started waking early just to sit inside it.",
    "maybe that's what i miss most, not a person exactly, just the hour that belonged to us.",
  ],
  heavy_emotion: ["i'm so tired and i miss her.", "i feel empty and scared honestly.", "i hate that i still care."],
  implicit: ["the second cup stayed on the table all night.", "i left the porch light on again.", "her coat is still on the hook."],
  quirky: ["idk... i just feel weird lol", "kinda tired kinda not, u know?", "anyway...... whatever haha"],
};

// fixed clock so the archetype's hour band is deterministic across runs
const CLOCK = new Date(2026, 0, 1, 14, 0, 0);

for (const [name, thoughts] of Object.entries(SAMPLES)) {
  const dims = scoreNine(thoughts);
  const arch = matchArchetype(dims, CLOCK);
  const row = dims.map((d) => `${d.key}:${d.score}${d.locked ? "*" : ""}`).join(" ");
  console.log(`\n[${name}]  → ${arch.id}`);
  console.log("  " + row);
}
console.log("\n(‘*’ = locked. Re-run after migration; English rows must match.)");
