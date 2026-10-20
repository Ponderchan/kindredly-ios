/* The sparkle deck's words and cards (strings-sparkle.ts, sparkle-deck.ts; sparkle contract §6):
   all nine string blocks carry the same keys, none is empty, nothing outside sp.* lives here, the
   contract's keys are all there and the English is the contract's word for word, nothing is left
   in English, and every {var} sits in every language exactly where the English has it. The deck:
   every language has 60 This-or-That pairs and 4 lines per sky, nothing empty, no prompt twice,
   the two options differ, and every length is inside the contract (q ≤ 60, a/b ≤ 16 — ja/ko ≤ 8 —
   and ≤ 40 for the server; sky lines ≤ 48). Not wired to a runner; run by hand from the repo root
   with plain node (Node 22.18+ strips the types):
     node src/data/strings-sparkle.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("./strings-sparkle.ts");
const { PICKS, WAVE_LINES } = await import("./sparkle-deck.ts");
const blocks = (globalThis as any).__blocks as Record<string, string>[];
const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"] as const;
const SKIES = ["dawn", "day", "dusk", "night"] as const;

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};
const len = (s: string) => [...s].length;

/* the contract's English (§6b), word for word */
const CONTRACT: Record<string, string> = {
  "sp.deck.title": "Openers",
  "sp.deck.a11y": "Openers",
  "sp.deck.shuffle": "Shuffle",
  "sp.deck.close": "Close",
  "sp.deck.send": "Send",
  "sp.deck.another": "Another",
  "sp.deck.wave": "Wave",
  "sp.deck.tot": "This or That",
  "sp.deck.pickHint": "Pick yours, then send.",
  "sp.deck.waved": "Waved",
  "sp.deck.waiting": "{n} waiting",
  "sp.deck.capStatus": "Three are waiting for {name}. Let them pick first.",
  "sp.deck.waveA11y": "Wave. Sends your sky: {sky}. \"{line}\"",
  "sp.deck.pickA11y": "This or That. {prompt} {a} or {b}.",
  "sp.pick.label": "This or That",
  "sp.pick.youAsked": "You asked",
  "sp.pick.theyAsked": "{name} asked",
  "sp.pick.hint": "Pick one. You'll both see the answers at the same time.",
  "sp.pick.waiting": "Waiting for {name} to pick. You'll both see at once.",
  "sp.pick.sending": "Sending your pick…",
  "sp.pick.closed": "This room is closed.",
  "sp.pick.you": "You",
  "sp.pick.both": "Both of you",
  "sp.pick.same.1": "Same!",
  "sp.pick.same.2": "Great minds.",
  "sp.pick.same.3": "Same pick. Of course.",
  "sp.pick.diff.1": "Opposites. Discuss.",
  "sp.pick.diff.2": "Split decision. Explain yourselves.",
  "sp.pick.diff.3": "Different picks. Now it gets interesting.",
  "sp.pick.a11yChoice": "{choice}",
  "sp.pick.a11yPicked": "{choice}, picked by {who}",
  "sp.pick.fallback": "This or That: {prompt} ({a} or {b})",
  "sp.sky.dawn": "Dawn",
  "sp.sky.day": "Day",
  "sp.sky.dusk": "Dusk",
  "sp.sky.night": "Night",
  "sp.wave.back": "Wave Back",
  "sp.wave.backA11y": "Wave back with your sky",
  "sp.wave.yourSky": "Your sky",
  "sp.wave.theirSky": "{name}'s sky",
  "sp.wave.a11yMine": "You waved. {sky} sky. {line}",
  "sp.wave.a11yTheirs": "{name} waved. {sky} sky. {line}",
};

/* keys that are the same text in every language by nature */
const SAME_OK = new Set(["sp.pick.a11yChoice"]);

/* ── the strings ── */
ok("nine blocks", blocks?.length === 9);
const en = blocks[0];
const keys = Object.keys(en);
ok(`every key is sp.* (${keys.length})`, keys.every((k) => k.startsWith("sp.")));
const WANTED = Object.keys(CONTRACT);
ok("the contract's keys", WANTED.every((k) => k in en) && keys.length === WANTED.length, WANTED.filter((k) => !(k in en)).join(" "));
const vars = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort().join(" ");
blocks.forEach((b, i) => {
  const lang = LANGS[i];
  const missing = keys.filter((k) => !(k in b));
  const extra = Object.keys(b).filter((k) => !(k in en));
  ok(`${lang}: same keys`, missing.length === 0 && extra.length === 0, [...missing, ...extra].join(" "));
  const empty = keys.filter((k) => !String(b[k] ?? "").trim());
  ok(`${lang}: nothing empty`, empty.length === 0, empty.join(" "));
  const badVars = keys.filter((k) => vars(b[k] ?? "") !== vars(en[k]));
  ok(`${lang}: {vars} where English has them, nothing else`, badVars.length === 0, badVars.join(" "));
  if (i > 0) {
    const same = keys.filter((k) => b[k] === en[k] && !SAME_OK.has(k));
    ok(`${lang}: nothing left in English`, same.length === 0, same.join(" "));
    const caps = keys.filter((k) => /[A-ZÀ-Ý]{4,}/.test((b[k] ?? "").replace(/\{\w+\}/g, "")));
    ok(`${lang}: no ALL CAPS in the copy (TS upper-cases labels)`, caps.length === 0, caps.join(" "));
  }
});
const off = WANTED.filter((k) => en[k] !== CONTRACT[k]);
ok("the contract's English, word for word", off.length === 0, off.join(" "));

/* ── the deck ── */
ok("PICKS has the nine languages", LANGS.every((l) => l in PICKS) && Object.keys(PICKS).length === 9);
ok("WAVE_LINES has the nine languages", LANGS.every((l) => l in WAVE_LINES) && Object.keys(WAVE_LINES).length === 9);
for (const lang of LANGS) {
  const picks = PICKS[lang] ?? [];
  ok(`${lang}: 60 pairs`, picks.length === 60, String(picks.length));
  const emptyP = picks.filter((p) => !p.q?.trim() || !p.a?.trim() || !p.b?.trim());
  ok(`${lang}: no empty pair`, emptyP.length === 0, emptyP.map((p) => p.q).join(" | "));
  const trimmed = picks.filter((p) => [p.q, p.a, p.b].some((s) => s !== s.trim()));
  ok(`${lang}: no stray spaces`, trimmed.length === 0, trimmed.map((p) => p.q).join(" | "));
  const qs = picks.map((p) => p.q.toLocaleLowerCase(lang));
  const dupes = qs.filter((q, i) => qs.indexOf(q) !== i);
  ok(`${lang}: no prompt twice`, dupes.length === 0, dupes.join(" | "));
  const same = picks.filter((p) => p.a.toLocaleLowerCase(lang) === p.b.toLocaleLowerCase(lang));
  ok(`${lang}: the two options differ`, same.length === 0, same.map((p) => p.q).join(" | "));
  const longQ = picks.filter((p) => len(p.q) > 60);
  ok(`${lang}: q ≤ 60`, longQ.length === 0, longQ.map((p) => p.q).join(" | "));
  const cap = lang === "ja" || lang === "ko" ? 8 : 16;
  const longO = picks.flatMap((p) => [p.a, p.b]).filter((s) => len(s) > cap);
  ok(`${lang}: options ≤ ${cap}`, longO.length === 0, longO.join(" | "));
  const qmark = picks.filter((p) => !/[?？]$/.test(p.q));
  ok(`${lang}: every prompt is a question`, qmark.length === 0, qmark.map((p) => p.q).join(" | "));

  const sky = WAVE_LINES[lang];
  for (const s of SKIES) {
    const lines = sky?.[s] ?? [];
    ok(`${lang}/${s}: 4 lines`, lines.length === 4, String(lines.length));
    const bad = lines.filter((l) => !l.trim() || len(l) > 48);
    ok(`${lang}/${s}: none empty, ≤ 48`, bad.length === 0, bad.join(" | "));
    ok(`${lang}/${s}: no line twice`, new Set(lines).size === lines.length);
    const digits = lines.filter((l) => /[0-9０-９]/.test(l));
    ok(`${lang}/${s}: no clock times`, digits.length === 0, digits.join(" | "));
  }
  if (lang !== "en") {
    const copied = picks.filter((p, i) => p.q === PICKS.en[i]?.q);
    ok(`${lang}: not the English list`, copied.length === 0, copied.map((p) => p.q).join(" | "));
  }
}

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
