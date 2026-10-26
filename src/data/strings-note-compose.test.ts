/* The Notes composer's new words (strings-note-compose.ts): all nine blocks carry the same keys,
   none is empty or carries a {var}, nothing outside nc.* lives here, and nothing is left in English
   except the words a phone in that language really uses (Video, Foto…). Not wired to a runner; run
   by hand from the repo root with plain node (Node 22.18+ strips the types):
     node src/data/strings-note-compose.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-note-compose.ts");
const blocks = (globalThis as any).__blocks as Record<string, string>[];
const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];
/* the same word as English on purpose: what a phone in that language calls it */
const LOANS: Record<string, string[]> = { fr: ["nc.photo"], de: ["nc.video"], it: ["nc.video"], id: ["nc.video"] };

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

ok("nine blocks", blocks?.length === 9);
const en = blocks[0];
const keys = Object.keys(en);
ok("eight keys", keys.length === 8);
ok("only nc.* keys", keys.every((k) => k.startsWith("nc.")));
blocks.forEach((b, i) => {
  const lang = LANGS[i];
  const bk = Object.keys(b);
  ok(`${lang}: same keys as en`, bk.length === keys.length && keys.every((k) => k in b), keys.filter((k) => !(k in b)).join(" "));
  const empty = keys.filter((k) => !String(b[k] ?? "").trim() || b[k] !== b[k].trim());
  ok(`${lang}: nothing empty or padded`, empty.length === 0, empty.join(" "));
  ok(`${lang}: no {vars}`, keys.every((k) => !/\{\w+\}/.test(b[k] ?? "")));
  if (i > 0) {
    const same = keys.filter((k) => b[k] === en[k] && !(LOANS[lang] ?? []).includes(k));
    ok(`${lang}: nothing left in English`, same.length === 0, same.join(" "));
  }
});
ok("the owner's English", en["nc.sealed"] === "Sealed. Just for you.");

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
