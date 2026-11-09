/* The Today 3d × 25b words (strings-today3d.ts): all nine blocks carry the same keys, none is
   empty, the English is the committed English word for word, nothing is left in English (but for
   the few lines that are rightly the same in a language: the "— {initial}." signature in the
   Latin-script languages, and French NOTE), and every {var} sits in each language exactly where
   the English has it — except wl.sign, where ja/ko may sign with {name} instead of {initial}.
   Not wired to a runner; run by hand from the repo root with plain node (Node 22.18+ strips the
   types):
     node src/data/strings-today3d.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-today3d.ts");
const blocks = (globalThis as any).__blocks as Record<string, string>[];
const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

/* the English as committed, word for word */
const ENGLISH: Record<string, string> = {
  "ld.next": "NEXT",
  "ld.replyBtn": "REPLY",
  "ld.left.a11y.1": "Next letter. One left today.",
  "ld.left.a11y": "Next letter. {n} left today.",
  "ld.writeBackTo": "write back to {name}…",
  "rd.replyingTo": "Replying to {name}",
  "rd.expandA11y": "Expand to full screen",
  "rd.collapseA11y": "Back to the small box",
  "ld.bringBack": "Bring back the last letter",
  "ld.offlineDesk": "Your letters will be here when you're back online.",
  "ld.loading.a11y": "Today's letters are on their way.",
  "ld.countdown": "{h}H {m}M",
  "ld.notYet": "NOT YET",
  "wl.from": "FROM YOUR COURIER",
  "wl.count.0": "Nothing came past your desk today.",
  "wl.count.1": "That's one. I counted twice.",
  "wl.count.N": "That's {n}. I counted twice.",
  "wl.replied.1": "You wrote back to one.",
  "wl.replied.N": "You wrote back to {n}.",
  "wl.waiting.1": "One is still waiting on you. It'll keep.",
  "wl.waiting.N": "{n} are still waiting on you. They'll keep.",
  "wl.next": "I'm back with the next ones at {t}.",
  "wl.invite": "Go find one small thing worth putting in a letter — or come fly a lap with me.",
  "wl.invitePlain": "Go find one small thing worth putting in a letter.",
  "wl.sign": "— {initial}.",
  "wl.a11y": "A letter from {name}",
  "bag.opens": "OPENS AT {t}",
  "win.fly": "Fly a lap with {name}",
  "pub.ask": "“Who's this one for?”",
  "pub.letter": "Write a letter",
  "pub.letterSub": "{name} carries it to a stranger",
  "pub.left": "{n} LEFT",
  "pub.note": "Diary note",
  "pub.noteSub": "Stays with you · text, voice, photo",
  "pub.popLetter": "Letter",
  "pub.popNote": "Note",
};

/* lines allowed to read the same as the English */
const SAME_OK: Record<string, string[]> = {
  es: ["wl.sign"], pt: ["wl.sign"], id: ["wl.sign"], fr: ["wl.sign", "pub.popNote"],
  de: ["wl.sign"], it: ["wl.sign"], ja: [], ko: [],
};
/* the signature may use {name} in place of {initial} where there are no initials */
const SIGN_BY_NAME = ["ja", "ko"];

ok("nine blocks", blocks?.length === 9);
const en = blocks[0];
const keys = Object.keys(en);
const WANTED = Object.keys(ENGLISH);
ok(`the English keys (${keys.length})`, WANTED.every((k) => k in en) && keys.length === WANTED.length, WANTED.filter((k) => !(k in en)).join(" "));
const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(" ");
blocks.forEach((b, i) => {
  const lang = LANGS[i];
  const missing = keys.filter((k) => !(k in b));
  const extra = Object.keys(b).filter((k) => !(k in en));
  ok(`${lang}: same keys`, missing.length === 0 && extra.length === 0, [...missing, ...extra].join(" "));
  const empty = keys.filter((k) => !String(b[k] ?? "").trim());
  ok(`${lang}: nothing empty`, empty.length === 0, empty.join(" "));
  const badVars = keys.filter((k) => {
    if (k === "wl.sign" && SIGN_BY_NAME.includes(lang)) return !["{initial}", "{name}"].includes(vars(b[k] ?? ""));
    return vars(b[k] ?? "") !== vars(en[k]);
  });
  ok(`${lang}: {vars} where English has them, nothing else`, badVars.length === 0, badVars.join(" "));
  if (i > 0) {
    const same = keys.filter((k) => b[k] === en[k] && !SAME_OK[lang].includes(k));
    ok(`${lang}: nothing left in English`, same.length === 0, same.join(" "));
  }
});
const off = WANTED.filter((k) => en[k] !== ENGLISH[k]);
ok("the English, word for word", off.length === 0, off.join(" "));

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
