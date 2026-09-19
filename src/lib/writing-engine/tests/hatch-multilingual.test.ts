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
// parallel short (direct) and long (layered) samples in all nine languages.
const SHORT: Record<SupportedLanguage, string[]> = {
  en: ["went to work.", "came home.", "slept."],
  es: ["fui al trabajo.", "volví a casa.", "dormí."],
  pt: ["fui trabalhar.", "voltei pra casa.", "dormi."],
  id: ["pergi kerja.", "pulang ke rumah.", "terus tidur."],
  fr: ["allé au travail.", "rentré à la maison.", "dormi."],
  de: ["zur arbeit gegangen.", "nach hause gekommen.", "geschlafen."],
  it: ["andato al lavoro.", "tornato a casa.", "dormito."],
  ja: ["仕事に行った。", "家に帰った。", "寝た。"],
  ko: ["출근했다.", "집에 왔다.", "잤다."],
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
  fr: [
    "je repense sans arrêt à la façon dont la lumière entrait par la fenêtre de la cuisine ce matin, à comment elle faisait flotter la poussière comme exprès.",
    "il y a une sorte de silence qui n'existe qu'avant que quelqu'un d'autre se réveille, et je me suis mis à me lever tôt juste pour m'asseoir dedans.",
  ],
  de: [
    "ich denke immer noch daran, wie das licht heute morgen durchs küchenfenster kam, wie es den staub aussehen ließ, als würde er absichtlich schweben.",
    "es gibt eine art von stille, die es nur gibt, bevor irgendjemand sonst wach ist, und ich habe angefangen, früh aufzustehen, nur um darin zu sitzen.",
  ],
  it: [
    "continuo a pensare a come entrava la luce dalla finestra della cucina stamattina, a come faceva sembrare la polvere sospesa apposta.",
    "c'è un tipo di silenzio che esiste solo prima che qualcun altro si svegli, e ho cominciato ad alzarmi presto solo per sedermi dentro.",
  ],
  ja: [
    "今朝、台所の窓から差し込んでいた光のことをずっと考えている。埃がわざと浮かんでいるように見えた、あの感じを。",
    "誰も起きていない時間にしかない静けさがあって、その中に座るためだけに早起きするようになった。",
  ],
  ko: [
    "오늘 아침 부엌 창으로 들어오던 빛을 계속 생각하고 있다. 먼지가 일부러 떠 있는 것처럼 보이게 하던 그 느낌을.",
    "아무도 깨어 있지 않을 때만 있는 고요함이 있어서, 그 안에 앉아 있으려고 일찍 일어나기 시작했다.",
  ],
};

console.log("\n── comparability: short sentences read shorter than long, in every language ──");
const langs: SupportedLanguage[] = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];
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
