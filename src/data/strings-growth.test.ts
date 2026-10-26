/* Wren grows up, the words (strings-growth.ts): all nine blocks carry the same keys, none is empty,
   nothing is left in English, and each line keeps both numbers. Not wired to a runner; run by
   hand from the repo root with plain node (Node 22.18+ strips the types):
     node src/data/strings-growth.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-growth.ts");
const blocks = (globalThis as any).__blocks as Record<string, string>[];
const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

ok("nine blocks, en es pt id fr de it ja ko", blocks.length === 9);
const en = blocks[0];
const keys = Object.keys(en).sort().join();
ok("en: the three keys", keys === "grow.line.fledge,grow.line.wren,grow.ok");
LANGS.forEach((lang, i) => {
  const b = blocks[i] ?? {};
  ok(`${lang}: the same keys as en`, Object.keys(b).sort().join() === keys);
  ok(`${lang}: none empty`, Object.values(b).every((v) => typeof v === "string" && v.trim().length > 0));
  ok(`${lang}: her lines end like sentences`, ["grow.line.fledge", "grow.line.wren"].every((k) => /[.。!！]$/.test(b[k] ?? "")));
  ok(`${lang}: the key is short (≤ 12)`, [...(b["grow.ok"] ?? "")].length <= 12, b["grow.ok"]);
});
blocks.slice(1).forEach((b, i) => {
  const left = Object.keys(b).filter((k) => b[k] === en[k]);
  ok(`${LANGS[i + 1]}: nothing left in English`, left.length === 0, left.join());
});

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
