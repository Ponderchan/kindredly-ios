/* Let it travel L6's words (strings-travel.ts): all nine blocks carry the same keys, none is
   empty, nothing is left in English, the CTA label is short enough for its capsule and isn't a
   sentence, and Wren's line ends like one. Not wired to a runner; run by hand from the repo root
   with plain node (Node 22.18+ strips the types):
     node src/data/strings-travel.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-travel.ts");
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
ok("en: the two keys", keys === "cp.l6.pickStamp,cp.l6.wrenPick");
LANGS.forEach((lang, i) => {
  const b = blocks[i] ?? {};
  ok(`${lang}: the same keys as en`, Object.keys(b).sort().join() === keys);
  ok(`${lang}: none empty`, Object.values(b).every((v) => typeof v === "string" && v.trim().length > 0));
  // the capsule never cuts its words: a short label, no full stop (it is a button)
  const label = b["cp.l6.pickStamp"] ?? "";
  ok(`${lang}: the CTA label is short (≤ 21)`, [...label].length <= 21, label);
  ok(`${lang}: the CTA label is a button, not a sentence`, !/[.。!！]$/.test(label), label);
  ok(`${lang}: Wren's line ends like a sentence`, /[.。!！?？]$/.test(b["cp.l6.wrenPick"] ?? ""));
});
blocks.slice(1).forEach((b, i) => {
  const left = Object.keys(b).filter((k) => b[k] === en[k]);
  ok(`${LANGS[i + 1]}: nothing left in English`, left.length === 0, left.join());
});

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
process.exit(fails ? 1 : 0);
