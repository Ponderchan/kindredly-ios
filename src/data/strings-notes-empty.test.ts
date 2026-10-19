/* The Notes E1 words (strings-notes-empty.ts): all nine blocks carry the same keys, none is empty,
   nothing outside ne.* lives here, the contract's keys are all there, the English is the owner's
   word for word, and nothing is left in English. Not wired to a runner; run by hand from the repo
   root with plain node (Node 22.18+ strips the types):
     node src/data/strings-notes-empty.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-notes-empty.ts");
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
ok(`every key is ne.* (${keys.length})`, keys.every((k) => k.startsWith("ne.")));
const GROUPS = ["calm", "happy", "tired", "low"];
const WANTED = ["ne.title", "ne.wren", "ne.a11yCard", ...GROUPS.map((g) => `ne.line.${g}`), ...GROUPS.map((g) => `ne.ask.${g}`)];
ok("the contract's keys", WANTED.every((k) => k in en) && keys.length === WANTED.length, WANTED.filter((k) => !(k in en)).join(" "));
blocks.forEach((b, i) => {
  const lang = LANGS[i];
  const missing = keys.filter((k) => !(k in b));
  const extra = Object.keys(b).filter((k) => !(k in en));
  ok(`${lang}: same keys`, missing.length === 0 && extra.length === 0, [...missing, ...extra].join(" "));
  const empty = keys.filter((k) => !String(b[k] ?? "").trim());
  ok(`${lang}: nothing empty`, empty.length === 0, empty.join(" "));
  ok(`${lang}: no {vars}`, keys.every((k) => !/\{\w+\}/.test(b[k] ?? "")));
  if (i > 0) {
    const same = keys.filter((k) => b[k] === en[k]);
    ok(`${lang}: nothing left in English`, same.length === 0, same.join(" "));
  }
});
/* the owner's English, word for word */
const OWNER: Record<string, string> = {
  "ne.title": "how was today, honestly?",
  "ne.line.calm": "calm.",
  "ne.line.happy": "good day.",
  "ne.line.tired": "tired.",
  "ne.line.low": "low.",
  "ne.ask.calm": "what made it so?",
  "ne.ask.happy": "what was the best bit?",
  "ne.ask.tired": "from what, though?",
  "ne.ask.low": "no need to explain. just a line.",
  "ne.wren": "first one down. same time tomorrow?",
};
const off = Object.keys(OWNER).filter((k) => en[k] !== OWNER[k]);
ok("the owner's English, word for word", off.length === 0, off.join(" "));

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
