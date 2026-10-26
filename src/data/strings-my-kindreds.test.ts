/* My kindreds' new line (strings-my-kindreds.ts): all nine blocks carry the same keys, none is
   empty, nothing is left in English, each says the five letters (in its own words), and none
   names Wren (the page's empty state doesn't speak as her). Not wired to a runner; run by hand from
   the repo root with plain node (Node 22.18+ strips the types):
     node src/data/strings-my-kindreds.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-my-kindreds.ts");
const blocks = (globalThis as any).__blocks as Record<string, string>[];
const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];
/* "five", as each language writes it in the line */
const FIVE: Record<string, RegExp> = { en: /five/, es: /cinco/, pt: /cinco/, id: /lima/, fr: /cinq/, de: /fünf/, it: /cinque/, ja: /5/, ko: /다섯/ };

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

ok("nine blocks, en es pt id fr de it ja ko", blocks.length === 9);
const en = blocks[0];
const keys = Object.keys(en).sort().join();
ok("en: the one key", keys === "mk.empty");
LANGS.forEach((lang, i) => {
  const b = blocks[i] ?? {};
  ok(`${lang}: the same keys as en`, Object.keys(b).sort().join() === keys);
  const v = b["mk.empty"] ?? "";
  ok(`${lang}: not empty`, v.trim().length > 0);
  ok(`${lang}: says the five letters`, FIVE[lang].test(v), v);
  ok(`${lang}: no placeholder, no Wren`, !/[{}]/.test(v) && !/Wren/.test(v), v);
  ok(`${lang}: one short paragraph (≤ 170)`, [...v].length <= 170, String([...v].length));
});
blocks.slice(1).forEach((b, i) => {
  const left = Object.keys(b).filter((k) => b[k] === en[k]);
  ok(`${LANGS[i + 1]}: nothing left in English`, left.length === 0, left.join());
});

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
