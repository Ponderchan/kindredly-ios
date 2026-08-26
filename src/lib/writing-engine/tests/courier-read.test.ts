/* Behaviour lock for multilingual courier-read (mood). Not wired to a runner
   (the host can't run the RN toolchain); run by hand from the repo root:
     node --experimental-strip-types src/lib/writing-engine/tests/courier-read.test.ts
   Prints ok/FAIL per case; exits non-zero if any fail. */

import { courierRead } from "../courier-read/mood-signals.ts";
import type { SupportedLanguage } from "../types.ts";

let fail = 0;
const is = (text: string, lang: SupportedLanguage, want: string, enough = true) => {
  const r = courierRead(text, enough, { writingLang: lang });
  const ok = r.mood === want && r.language === lang;
  if (!ok) fail++;
  console.log(`${ok ? "ok  " : "FAIL"}  [${lang}] "${text.slice(0, 34)}"  → ${r.mood} (want ${want})  conf=${r.confidence.toFixed(2)}`);
};

console.log("── English (regression: same moods as the old regex) ──");
is("", "en", "listen");
is("i'm so tired and alone tonight", "en", "worry");
is("i miss her so much", "en", "worry");
is("so happy today, finally!!", "en", "delight");
is("haha that was great", "en", "delight");
is("what should i even do here?", "en", "curious");
is("i don't know... maybe", "en", "think"); // ellipsis, no affect word — matches the old English behaviour exactly
is("went to the shop and came back", "en", "happy");
is("just a line", "en", "happy");

console.log("\n── Spanish ──");
is("estoy muy triste y sola esta noche", "es", "worry");
is("la extraño demasiado", "es", "worry");
is("qué feliz estoy hoy, por fin jaja", "es", "delight");
is("jajaja qué bueno", "es", "delight");
is("¿qué debería hacer?", "es", "curious");
is("fui a la tienda y volví", "es", "happy");

console.log("\n── Portuguese ──");
is("tô tão cansado e sozinho hoje", "pt", "worry");
is("sinto muita saudade dela", "pt", "worry");
is("que feliz eu tô, finalmente kkkk", "pt", "delight");
is("kkkkk que coisa boa", "pt", "delight");
is("o que eu faço agora?", "pt", "curious");
is("fui na loja e voltei", "pt", "happy");

console.log("\n── Indonesian ──");
is("aku sedih banget dan sendirian malam ini", "id", "worry");
is("aku kangen dia banget", "id", "worry");
is("seneng banget hari ini akhirnya wkwk", "id", "delight");
is("wkwkwk lucu banget", "id", "delight");
is("aku harus gimana ya?", "id", "curious");
is("tadi ke toko terus pulang", "id", "happy");

console.log("\n" + (fail ? `FAILED ${fail} case(s)` : "ALL PASS"));
process.exit(fail ? 1 : 0);
