/* The wrapped report's words (strings-wrapped.ts): all nine blocks carry the same keys, none is
   empty, each keeps exactly the {vars} its English has, and every #tag fits a sticker (≤ 16).
   Not wired to a runner; run by hand from the repo root with plain node (Node 22.18+):
     node src/data/strings-wrapped.test.ts
   i18n is swapped for a recorder. Every line prints ok/FAIL; the process exits non-zero on any. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-wrapped.ts");
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
ok(`every key is rw.* (${keys.length})`, keys.length > 150 && keys.every((k) => k.startsWith("rw.")));
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
blocks.forEach((b, i) => {
  const lang = LANGS[i];
  const missing = keys.filter((k) => !(k in b));
  const extra = Object.keys(b).filter((k) => !(k in en));
  ok(`${lang}: same keys`, !missing.length && !extra.length, [...missing, ...extra].join(" "));
  ok(`${lang}: none empty`, keys.every((k) => (b[k] ?? "").trim().length > 0));
  const bad = keys.filter((k) => k in b && vars(b[k]) !== vars(en[k]));
  ok(`${lang}: same {vars}`, !bad.length, bad.join(" "));
  const long = keys.filter((k) => k.startsWith("rw.tag.") && k.endsWith(".t") && [...b[k]].length > 16);
  ok(`${lang}: tags fit a sticker`, !long.length, long.map((k) => b[k]).join(" | "));
  ok(`${lang}: rw.case`, b["rw.case"] === "lower" || b["rw.case"] === "as-is");
});

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
process.exit(fails ? 1 : 0);
