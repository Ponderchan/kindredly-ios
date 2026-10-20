/* The First Class rollout words (strings-fc-rollout.ts): all nine blocks carry the same keys, none
   is empty, nothing outside fcr.* lives here, the contract's keys are all there, the English is the
   owner's word for word, nothing is left in English, and {month} / {n} sit in every language exactly
   where the English has them (no other {vars}). Not wired to a runner; run by hand from the repo root
   with plain node (Node 22.18+ strips the types):
     node src/data/strings-fc-rollout.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-fc-rollout.ts");
const blocks = (globalThis as any).__blocks as Record<string, string>[];
const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

/* the owner's English, word for word */
const OWNER: Record<string, string> = {
  "fcr.courier.line": "the Post asked me to bring you a letter. it's on your sill",
  "fcr.courier.sub": "gold edges. fancy",
  "fcr.post": "THE POST",
  "fcr.env.a11y": "A gold-edged letter from the Post. Opens First Class.",
  "fcr.seat.timer": "YOUR WEEK · 48H",
  "fcr.seat.head": "7 days in a row. you've earned a seat.",
  "fcr.seat.perks": "Voice letters · wardrobe · all stamps",
  "fcr.open": "Open",
  "fcr.report.eyebrow": "YOUR {month} REPORT",
  "fcr.report.sealed": "SEALED",
  "fcr.report.head": "What {n} days of your letters add up to.",
  "fcr.report.cta": "Break the seal",
  "fcr.tab.a11y": "First Class. Opens what it carries.",
};

ok("nine blocks", blocks?.length === 9);
const en = blocks[0];
const keys = Object.keys(en);
ok(`every key is fcr.* (${keys.length})`, keys.every((k) => k.startsWith("fcr.")));
const WANTED = Object.keys(OWNER);
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
  ok(`${lang}: {month} / {n} where English has them, nothing else`, badVars.length === 0, badVars.join(" "));
  if (i > 0) {
    const same = keys.filter((k) => b[k] === en[k]);
    ok(`${lang}: nothing left in English`, same.length === 0, same.join(" "));
  }
});
const off = WANTED.filter((k) => en[k] !== OWNER[k]);
ok("the owner's English, word for word", off.length === 0, off.join(" "));

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
