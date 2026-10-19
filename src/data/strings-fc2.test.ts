/* The FC2 words (strings-fc2.ts): all nine blocks carry the same keys, none is empty, each
   translation keeps exactly the {vars} its English has, and nothing outside fc2.* lives here.
   Not wired to a runner; run by hand from the repo root with plain node (Node 22.18+ strips the
   types):
     node src/data/strings-fc2.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL
   and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-fc2.ts");
const blocks = (globalThis as any).__blocks as Record<string, string>[];
const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

ok("nine blocks", blocks?.length === 9);
const en = blocks[0];
const keys = Object.keys(en);
ok(`every key is fc2.* (${keys.length})`, keys.every((k) => k.startsWith("fc2.")));
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
/* words that may read the same as English in some languages (brand marks, numbers) */
const MAY_MATCH = /^(fc2\.rc\.stClass|fc2\.rc\.stCofounder|fc2\.rc\.stCofounderPending|fc2\.rc\.stFirst)$/;
blocks.forEach((b, i) => {
  const lang = LANGS[i];
  const missing = keys.filter((k) => !(k in b));
  const extra = Object.keys(b).filter((k) => !(k in en));
  ok(`${lang}: same keys`, missing.length === 0 && extra.length === 0, [...missing, ...extra].join(" "));
  const empty = keys.filter((k) => !String(b[k] ?? "").trim());
  ok(`${lang}: nothing empty`, empty.length === 0, empty.join(" "));
  const bad = keys.filter((k) => k in b && vars(b[k]) !== vars(en[k]));
  ok(`${lang}: the same {vars} as English`, bad.length === 0, bad.join(" "));
  if (i > 0) {
    const same = keys.filter((k) => b[k] === en[k] && !MAY_MATCH.test(k));
    ok(`${lang}: nothing left in English`, same.length === 0, same.join(" "));
  }
});

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
