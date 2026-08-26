/* Multilingual hatch behaviour. Run:
     npx tsx src/lib/writing-engine/tests/hatch-multilingual.test.ts
   Covers: English archetype lock (regression), cross-language comparability
   (same style → same coordinate side + same born type), and born types. */

import { hatch, scoreNine, matchArchetype } from "../../hatch-engine.ts";
import { setEngineLanguage } from "../app-language.ts";
import type { SupportedLanguage } from "../types.ts";

let fail = 0;
const ok = (cond: boolean, label: string) => {
  if (!cond) fail++;
  console.log(`${cond ? "ok  " : "FAIL"}  ${label}`);
};
const CLOCK = new Date(2026, 0, 1, 14, 0, 0);
const dimOf = (thoughts: string[], key: string) => scoreNine(thoughts).find((d) => d.key === key)!.score;

// ── English archetype lock (4 unchanged; quirky shifted by the documented
//    feelingEnd bug fix from unsent-editor → soft-cartographer) ──
console.log("── English archetype lock ──");
setEngineLanguage("en");
const EN_EXPECT: [string, string[], string][] = [
  ["short_direct", ["went to work.", "came home.", "slept."], "soft-cartographer"],
  ["heavy_emotion", ["i'm so tired and i miss her.", "i feel empty and scared honestly.", "i hate that i still care."], "blunt-valentine"],
];
for (const [name, thoughts, want] of EN_EXPECT) {
  const got = matchArchetype(scoreNine(thoughts), CLOCK).id;
  ok(got === want, `[en] ${name} → ${got} (want ${want})`);
}

// ── cross-language comparability ──
// parallel short (direct) and long (layered) samples in all four languages.
const SHORT: Record<SupportedLanguage, string[]> = {
  en: ["went to work.", "came home.", "slept."],
  es: ["fui al trabajo.", "volví a casa.", "dormí."],
  pt: ["fui trabalhar.", "voltei pra casa.", "dormi."],
  id: ["pergi kerja.", "pulang ke rumah.", "terus tidur."],
};
const LONG: Record<SupportedLanguage, string[]> = {
  en: [
    "i keep thinking about the way the light came through the kitchen window this morning, how it made the dust look like it was floating on purpose.",
    "there's a kind of quiet that only happens before anyone else is awake, and i've started waking early just to sit inside it.",
  ],
  es: [
    "sigo pensando en cómo entraba la luz por la ventana de la cocina esta mañana, en cómo hacía que el polvo pareciera flotar a propósito.",
    "hay una clase de silencio que solo pasa antes de que alguien más despierte, y he empezado a levantarme temprano solo para quedarme dentro de él.",
  ],
  pt: [
    "eu fico pensando no jeito que a luz entrava pela janela da cozinha hoje de manhã, em como fazia a poeira parecer que flutuava de propósito.",
    "existe um tipo de silêncio que só acontece antes de qualquer pessoa acordar, e eu comecei a acordar cedo só pra ficar dentro dele.",
  ],
  id: [
    "aku terus memikirkan cara cahaya masuk lewat jendela dapur pagi ini, bagaimana ia membuat debu terlihat seolah melayang dengan sengaja.",
    "ada semacam keheningan yang hanya terjadi sebelum orang lain terbangun, dan aku mulai bangun pagi hanya untuk duduk di dalamnya.",
  ],
};

console.log("\n── comparability: short sentences read shorter than long, in every language ──");
const langs: SupportedLanguage[] = ["en", "es", "pt", "id"];
for (const l of langs) {
  setEngineLanguage(l);
  const s = dimOf(SHORT[l], "sentence");
  const long = dimOf(LONG[l], "sentence");
  ok(s < long, `[${l}] sentence(short)=${s} < sentence(long)=${long}`);
}

console.log("\n── normalization: the SAME style gets the SAME born type across languages ──");
const shortBorn = langs.map((l) => {
  setEngineLanguage(l);
  return hatch(SHORT[l], CLOCK).born.bornType;
});
const longBorn = langs.map((l) => {
  setEngineLanguage(l);
  return hatch(LONG[l], CLOCK).born.bornType;
});
console.log("  short born:", shortBorn.join(", "), " | long born:", longBorn.join(", "));
ok(new Set(shortBorn).size === 1, `short samples all share one born type (${shortBorn[0]})`);
ok(new Set(longBorn).size === 1, `long samples all share one born type (${longBorn[0]})`);
ok(shortBorn[0] !== longBorn[0], `short (${shortBorn[0]}) and long (${longBorn[0]}) born types differ`);

console.log("\n" + (fail ? `FAILED ${fail} case(s)` : "ALL PASS"));
process.exit(fail ? 1 : 0);
