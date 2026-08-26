/* Behaviour lock for multilingual journal theme detection. Run by hand:
     node --experimental-strip-types  (won't resolve extensionless imports)
   so use:  npx tsx src/lib/writing-engine/tests/journal-themes.test.ts
   Prints ok/FAIL per case; exits non-zero if any fail. */

import { detectThemes } from "../journal-sparks/detect-themes.ts";
import type { JournalTheme, SupportedLanguage } from "../types.ts";

let fail = 0;
/** the strongest detected theme must be `want`, in the right language */
const top = (text: string, lang: SupportedLanguage, want: JournalTheme) => {
  const r = detectThemes(text, { writingLang: lang });
  const got = r.themes[0]?.theme ?? "(none)";
  const ok = got === want && r.language === lang;
  if (!ok) fail++;
  console.log(`${ok ? "ok  " : "FAIL"}  [${lang}] "${text.slice(0, 40)}"  → ${got} (want ${want})`);
};

console.log("── English (regression) ──");
top("i really miss her, i keep missing the way things were", "en", "missing_someone");
top("work again, my boss set another deadline, back to the office", "en", "work");
top("mom called, dad too, the whole family", "en", "family");
top("i went home, the house was quiet, my room felt small", "en", "home");

console.log("\n── Spanish ──");
top("extraño mucho a mi abuela, la extraño cada día", "es", "missing_someone");
top("otra vez el trabajo, mi jefe y otra reunión en la oficina", "es", "work");
top("mi mamá llamó, y mi papá, toda la familia", "es", "family");
top("volví a casa, la casa estaba en silencio, mi cuarto", "es", "home");

console.log("\n── Portuguese ──");
top("sinto tanta saudade dela, saudade de tudo", "pt", "missing_someone");
top("trabalho de novo, meu chefe marcou outra reunião no escritório", "pt", "work");
top("minha mãe ligou, e meu pai, a família toda", "pt", "family");
top("voltei pra casa, a casa estava quieta, meu quarto", "pt", "home");

console.log("\n── Indonesian ──");
top("aku kangen banget sama dia, kangen semuanya", "id", "missing_someone");
top("kerja lagi, bos ku ngasih deadline, balik ke kantor", "id", "work");
top("ibu telepon, bapak juga, keluarga semua", "id", "family");
top("aku pulang ke rumah, rumahnya sepi, kamar ku", "id", "home");

console.log("\n" + (fail ? `FAILED ${fail} case(s)` : "ALL PASS"));
process.exit(fail ? 1 : 0);
