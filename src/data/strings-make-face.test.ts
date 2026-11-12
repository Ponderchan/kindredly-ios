/* Make your own face's words (strings-make-face.ts): all nine blocks carry the same keys, none is
   empty or padded or carries a {var}, nothing outside mf.* lives here, nothing is left in English,
   Wren's quoted lines open and close with the language's own marks, and the tags that sit in mono
   under a 46pt circle stay short. Not wired to a runner; run by hand from the repo root with plain
   node (Node 22.18+ strips the types):
     node src/data/strings-make-face.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-make-face.ts");
const blocks = (globalThis as any).__blocks as Record<string, string>[];
const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];
/* Wren's lines in quotes: the marks each language opens and closes them with */
const QUOTES: Record<string, [string, string]> = {
  en: ["“", "”"], es: ["“", "”"], pt: ["“", "”"], id: ["“", "”"], fr: ["« ", " »"], de: ["„", "“"], it: ["«", "»"], ja: ["「", "」"], ko: ["“", "”"],
};
const QUOTED = ["mf.intro.line", "mf.result.line", "mf.done.line", "mf.reject.noFace.line", "mf.reject.many.line", "mf.reject.minor.line", "mf.reject.unsafe.line", "mf.reject.words.line", "mf.failed.line"];
/* the mono tags under the Edit profile ＋ (46pt) and the result's lock: at most this many characters */
const SHORT: Record<string, number> = { "mf.tag.once": 18, "mf.tag.first": 12, "mf.result.lock": 10, "mf.tag.yours": 12 };

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

ok("nine blocks", blocks?.length === 9);
const en = blocks[0];
const keys = Object.keys(en);
// 92 at first; the knock card, the banner and Edit profile's note since (2026-10-31, 11-09)
ok("a hundred and four keys", keys.length === 104, String(keys.length));
ok("only mf.* keys", keys.every((k) => k.startsWith("mf.")));
ok("four generating lines", ["mf.gen.1", "mf.gen.2", "mf.gen.3", "mf.gen.4"].every((k) => k in en));
ok("thirteen chips in three groups", keys.filter((k) => k.startsWith("mf.chip.")).length === 13 && keys.filter((k) => k.startsWith("mf.chips.")).length === 3);
blocks.forEach((b, i) => {
  const lang = LANGS[i];
  const bk = Object.keys(b);
  ok(`${lang}: same keys as en`, bk.length === keys.length && keys.every((k) => k in b), keys.filter((k) => !(k in b)).join(" "));
  const empty = keys.filter((k) => !String(b[k] ?? "").trim() || b[k] !== b[k].trim());
  ok(`${lang}: nothing empty or padded`, empty.length === 0, empty.join(" "));
  ok(`${lang}: no {vars}`, keys.every((k) => !/\{\w+\}/.test(b[k] ?? "")));
  const [open, close] = QUOTES[lang];
  const badQuotes = QUOTED.filter((k) => !b[k]?.startsWith(open) || !b[k]?.endsWith(close));
  ok(`${lang}: Wren's lines in the language's quotes`, badQuotes.length === 0, badQuotes.join(" "));
  const unquoted = keys.filter((k) => !QUOTED.includes(k) && /^[“„«「]/.test(b[k] ?? ""));
  ok(`${lang}: only Wren's lines are quoted`, unquoted.length === 0, unquoted.join(" "));
  const long = Object.entries(SHORT).filter(([k, n]) => [...(b[k] ?? "")].length > n);
  ok(`${lang}: the small tags stay short`, long.length === 0, long.map(([k]) => `${k}=${b[k]}`).join(" "));
  if (i > 0) {
    const same = keys.filter((k) => b[k] === en[k]);
    ok(`${lang}: nothing left in English`, same.length === 0, same.join(" "));
  }
});

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
