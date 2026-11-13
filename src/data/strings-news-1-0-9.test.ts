/* The words of the 1.0.9 what's-new reel and its card (strings-news-1-0-9.ts): every block that
   has been written carries the same keys as the English, none is empty, nothing is left in
   English, there are no placeholders (nothing fills them), no exclamation marks, and every line
   fits where the reel sets it (news-reel/v1-0-9: a caption on one line, bubbles of two lines at
   most, the card's paragraph). Wren is "her", never "he". The limits are characters of Latin
   script; Japanese and Korean take about 0.6 of them.
   Not wired to a runner; run by hand from the repo root with plain node (Node 22.18+ strips the
   types itself):
     node src/data/strings-news-1-0-9.test.ts
   A block left as {} (not written yet: it falls back to English) is reported as PENDING. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];
const CJK = new Set(["ja", "ko"]);
await import("./strings-news-1-0-9.ts");
const blocks = LANGS.map((_, i) => ((globalThis as any).__blocks as (Record<string, string> | undefined)[])[i] ?? {});

/* where each line is set, and the room it has (Latin characters) */
const FIT: Record<string, number> = {
  "nw109.oneMore": 22, // the big caption, one line (it shrinks to 0.6 at most)
  "nw109.card9": 40, // a letter's opening, two lines in the letter font
  "nw109.card10": 40,
  "nw109.seeYou": 24, // her bubble under the night
  "nw109.lights": 56, // the caption under the planet, two lines
  "nw109.icon1": 18, // her first bubble under the icon, one line
  "nw109.icon2": 64, // her second, two lines
  "nw109.card.title": 40,
  "nw109.card.body": 330,
  "nw109.card.cta": 26,
};

let fails = 0;
let pending = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};
const len = (s: string) => [...s].length;
const en = blocks[0];
const keys = Object.keys(en).sort();

ok("the English block has exactly the reel's keys", keys.join() === Object.keys(FIT).sort().join(), keys.join(" "));

blocks.forEach((block, i) => {
  const lang = LANGS[i];
  if (!Object.keys(block).length) {
    console.log(`PENDING ${lang}: not written yet (English shows)`);
    pending++;
    return;
  }
  ok(`${lang}: the same keys as English`, Object.keys(block).sort().join() === keys.join(), keys.filter((k) => !(k in block)).concat(Object.keys(block).filter((k) => !(k in en))).join(" "));
  ok(`${lang}: nothing empty`, keys.every((k) => (block[k] ?? "").trim().length > 0));
  ok(`${lang}: no placeholders (nothing fills them)`, keys.every((k) => !/\{\w+\}/.test(block[k] ?? "")), keys.filter((k) => /\{\w+\}/.test(block[k] ?? "")).join(" "));
  ok(`${lang}: no exclamation marks`, keys.every((k) => !/[!！]/.test(block[k] ?? "")), keys.filter((k) => /[!！]/.test(block[k] ?? "")).join(" "));
  const room = (k: string) => (CJK.has(lang) ? Math.ceil(FIT[k] * 0.6) : FIT[k]);
  const long = keys.filter((k) => len(block[k] ?? "") > room(k));
  ok(`${lang}: every line fits where the reel sets it`, long.length === 0, long.map((k) => `${k}=${len(block[k])}/${room(k)}`).join(" "));
  if (i > 0) {
    const same = keys.filter((k) => block[k] === en[k]);
    ok(`${lang}: nothing left in English`, same.length === 0, same.join(" "));
  }
});
ok("en: she is 'her', never 'he' or 'his'", !keys.some((k) => /\b(he|his|him)\b/i.test(en[k])));
ok("en: the card's paragraph says ten, 8:00 and her planet", /Ten letters/.test(en["nw109.card.body"]) && /8:00/.test(en["nw109.card.body"]) && /planet/.test(en["nw109.card.body"]));

console.log(fails ? `\n${fails} FAILED` : `\nall passed${pending ? ` (${pending} blocks pending)` : ""}`);
if (fails) process.exit(1);
