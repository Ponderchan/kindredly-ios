/* The letter-paper words (strings-papers.ts): all nine blocks carry the same keys, none is empty,
   nothing outside pp.* lives here, the contract's keys (§8) are all there, the English is the
   contract's word for word, nothing is left in English (except the trade names Kraft and Riso where
   a language keeps them), First Class is named as strings.ts names it in each language, and {name}
   sits in every language exactly where the English has it (no other {vars}). Not wired to a runner;
   run by hand from the repo root with plain node (Node 22.18+ strips the types):
     node src/data/strings-papers.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-papers.ts");
const blocks = (globalThis as any).__blocks as Record<string, string>[];
const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

/* the contract's English (§8), word for word */
const CONTRACT: Record<string, string> = {
  "pp.name.plain": "Plain",
  "pp.name.grid": "Grid",
  "pp.name.kraft": "Kraft",
  "pp.name.airmail": "Airmail",
  "pp.name.receipt": "Receipt",
  "pp.name.sticky": "Sticky",
  "pp.name.riso": "Riso",
  "pp.strip.head": "PAPER · {name}",
  "pp.strip.fc": "· FIRST CLASS",
  "pp.strip.kindred": "· FIRST KINDRED",
  "pp.strip.done": "Done",
  "pp.badge.fc": "1ST",
  "pp.key.fc": "Send on First Class Paper →",
  "pp.key.fc.narrow": "First Class →",
  "pp.key.locked": "Opens with Your First Kindred",
  "pp.key.locked.narrow": "Locked",
  "pp.a11y.key": "Letter paper",
  "pp.a11y.paper": "{name} paper",
  "pp.a11y.fc": "First Class",
  "pp.a11y.locked": "Opens with your first kindred",
  "pp.a11y.upgrade": "Opens First Class",
  "pp.a11y.onPaper": "Written on {name} paper.",
  "pp.next": "Next",
  "pp.reply": "Reply",
};

/* trade names a language may keep as they are */
const SAME_OK = new Set(["pp.name.kraft", "pp.name.riso"]);

/* First Class as strings.ts names it (me.firstClass / fc.paidHead) */
const FC: Record<string, string> = {
  en: "First Class", es: "Primera Clase", pt: "Primeira Classe", id: "Kelas Utama", fr: "Première classe",
  de: "Erste Klasse", it: "Prima classe", ja: "ファーストクラス", ko: "퍼스트 클래스",
};
const FC_KEYS = ["pp.strip.fc", "pp.key.fc", "pp.key.fc.narrow", "pp.a11y.fc", "pp.a11y.upgrade"];

ok("nine blocks", blocks?.length === 9);
const en = blocks[0];
const keys = Object.keys(en);
ok(`every key is pp.* (${keys.length})`, keys.every((k) => k.startsWith("pp.")));
const WANTED = Object.keys(CONTRACT);
ok("the contract's keys", WANTED.every((k) => k in en) && keys.length === WANTED.length, WANTED.filter((k) => !(k in en)).join(" "));
const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(" ");
blocks.forEach((b, i) => {
  const lang = LANGS[i];
  const missing = keys.filter((k) => !(k in b));
  const extra = Object.keys(b).filter((k) => !(k in en));
  ok(`${lang}: same keys`, missing.length === 0 && extra.length === 0, [...missing, ...extra].join(" "));
  const empty = keys.filter((k) => !String(b[k] ?? "").trim());
  ok(`${lang}: nothing empty`, empty.length === 0, empty.join(" "));
  const badVars = keys.filter((k) => vars(b[k] ?? "") !== vars(en[k]));
  ok(`${lang}: {name} where English has it, nothing else`, badVars.length === 0, badVars.join(" "));
  const fcName = FC[lang].toLocaleUpperCase(lang);
  // a German compound hyphenates it (ERSTE-KLASSE-PAPIER), so hyphens count as spaces here
  const badFc = FC_KEYS.filter((k) => !String(b[k] ?? "").replace(/-/g, " ").toLocaleUpperCase(lang).includes(fcName));
  ok(`${lang}: First Class named "${FC[lang]}"`, badFc.length === 0, badFc.join(" "));
  if (i > 0) {
    const same = keys.filter((k) => b[k] === en[k] && !SAME_OK.has(k));
    ok(`${lang}: nothing left in English`, same.length === 0, same.join(" "));
    const english = keys.filter((k) => /\b(FIRST|CLASS|PAPER|KINDRED|LOCKED|DONE|OPENS|SEND)\b/i.test(b[k] ?? ""));
    ok(`${lang}: no English words in the strings`, english.length === 0, english.join(" "));
  }
});
const off = WANTED.filter((k) => en[k] !== CONTRACT[k]);
ok("the contract's English, word for word", off.length === 0, off.join(" "));

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
