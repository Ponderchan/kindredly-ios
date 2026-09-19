/* The five languages that arrived after the first four (fr/de/it/ja/ko).
   Run:
     npx tsx src/lib/writing-engine/tests/unread-languages.test.ts
   Covers: resolution (script, markers, UI language, plain-Latin English)
   and that every read language locks the dictionary-fed dimensions on real
   writing. (The no-dictionary rule — hasDictionary false → those dimensions
   never lock — has nothing to fire on while all nine are read; it stays in
   hatch-engine for the tenth.) English under an English UI is untouched
   (the snapshot test guards the numbers). */

import { scoreNine } from "../../hatch-engine.ts";
import { setEngineLanguage } from "../app-language.ts";
import { resolveLanguage } from "../resolve-language.ts";
import type { ReaderLanguage } from "../types.ts";

let fail = 0;
const ok = (cond: boolean, label: string) => {
  if (!cond) fail++;
  console.log(`${cond ? "ok  " : "FAIL"}  ${label}`);
};

const FR = ["Je ne sais pas vraiment ce que je veux, mais je continue à écrire, parce que c'est peut-être la seule chose qui tient.", "Il pleuvait ce matin, et j'ai pensé à toi sans raison. Enfin, si — mais je ne dirai pas laquelle.", "Bref. On verra.", "Les rues étaient vides, et je me suis dit que c'était très bien comme ça, honnêtement..."];
const DE = ["Ich weiß nicht, ob das irgendwie Sinn ergibt, aber ich schreibe es trotzdem auf, weil es sonst niemand hört.", "Heute Morgen hat es geregnet und ich habe an dich gedacht, ohne Grund. Vielleicht doch mit Grund.", "Eigentlich egal.", "Die Straßen waren leer — und das war schön, ehrlich gesagt..."];
const IT = ["Non so davvero cosa voglio, però continuo a scrivere, perché forse è l'unica cosa che tiene.", "Stamattina pioveva e ho pensato a te senza motivo. Anzi, un motivo c'era, ma non lo dico.", "Boh. Vedremo.", "Le strade erano vuote, e mi sono detto che andava molto bene così, sinceramente..."];
const JA = ["自分が何を望んでいるのか、たぶんまだよくわからない。でも書き続けている。それだけが残っている気がするから。", "今朝は雨で、理由もなく君のことを考えた。いや、理由はあったかもしれない。", "まあ、いいか。", "通りは空っぽで、それが正直言って気持ちよかった…"];
const KO = ["내가 뭘 원하는지 아직 잘 모르겠어. 그래도 계속 쓰고 있어. 그것만 남은 것 같아서.", "오늘 아침엔 비가 왔고, 이유 없이 네 생각이 났어. 아니, 이유는 있었을지도.", "뭐, 됐어.", "거리는 텅 비어 있었고, 솔직히 그게 좋았어…"];
const EN = ["I don't really know what I want, but I keep writing, because maybe it's the only thing that holds.", "It rained this morning and I thought of you for no reason. Well — for one reason, but I won't say which.", "Anyway. We'll see.", "The streets were empty and I decided that was fine, honestly..."];
const ES = ["No sé muy bien qué quiero, pero sigo escribiendo, porque quizás es lo único que aguanta.", "Llovía esta mañana y pensé en ti sin razón. Bueno, sí — pero no diré cuál.", "En fin. Ya veremos.", "Las calles estaban vacías y decidí que estaba bien así, la verdad..."];

const NEUTRAL = ["sentence", "rhythm", "punctuation"];

function lockedKeys(ui: ReaderLanguage, thoughts: string[]) {
  setEngineLanguage(ui);
  return scoreNine(thoughts).filter((d) => d.locked).map((d) => d.key as string);
}
function resolved(ui: ReaderLanguage, thoughts: string[]) {
  setEngineLanguage(ui);
  return resolveLanguage(thoughts.join("\n"));
}

console.log("── resolution ──");
ok(resolved("fr", FR) === "fr", "French under a French UI → fr");
ok(resolved("en", FR) === "fr", "French under an English UI → fr (three markers outvote the UI)");
ok(resolved("en", JA) === "ja", "Japanese under an English UI → ja (script)");
ok(resolved("en", KO) === "ko", "Korean under an English UI → ko (script)");
ok(resolved("ko", JA) === "ja", "Japanese under a Korean UI → ja");
ok(resolved("fr", EN) === "en", "English under a French UI → en (plain Latin, no markers)");
ok(resolved("fr", ES) === "es", "Spanish under a French UI → es");
ok(resolved("en", EN) === "en", "English under an English UI → en");
ok(resolved("en", ["We meet at 5pm EST, non-stop until eight — et cetera."]) === "en", "one stray marker does not move an English UI");
ok(resolved("en", ES) === "es", "Spanish under an English UI → es (was read as English before)");

console.log("── locks: read ──");
for (const [name, ui, thoughts] of [["fr", "fr", FR], ["de", "de", DE], ["it", "it", IT], ["ja", "ja", JA], ["ko", "ko", KO], ["fr under en", "en", FR], ["de under it", "it", DE], ["ja under en", "en", JA], ["ko under fr", "fr", KO]] as [string, ReaderLanguage, string[]][]) {
  const l = lockedKeys(ui, thoughts);
  ok(["emotion", "perspective", "structure"].every((k) => l.includes(k)), `[${name}] the dictionary-fed dimensions lock (${l.join(",")})`);
  ok(NEUTRAL.every((k) => l.includes(k)), `[${name}] sentence, rhythm, punctuation lock`);
}
console.log(fail ? `\n${fail} FAILED` : "\nALL PASS");
if (fail) process.exit(1);
