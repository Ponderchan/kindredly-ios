/* The words of Today's end-of-day pages (strings-after.ts) and the courier's facts
   (strings-after-facts.ts, after-facts.ts): every block that has been written carries the same
   keys as the English, none is empty, the placeholders survive, the labels drawn in capitals fit
   where they sit, the courier is "her", and there is a fact and a foot for every number with a
   source for each, short enough for the note and the receipt.
   Not wired to a runner; run by hand from the repo root with plain node (Node 22.18+ strips the
   types itself):
     node src/data/strings-after.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL and
   the process exits non-zero if any fail. A block left as {} (not written yet: it falls back to
   English) is reported as PENDING, not as a failure. */

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];
const CJK = new Set(["ja", "ko"]);
const grab = async (file: string): Promise<Record<string, string>[]> => {
  await import(file);
  const got = ((globalThis as any).__blocks as (Record<string, string> | undefined)[]).slice();
  return LANGS.map((_, i) => got[i] ?? {});
};
const ui = await grab("./strings-after.ts");
const facts = await grab("./strings-after-facts.ts");
const { AFTER_FACT_COUNT, AFTER_FACT_SOURCES } = await import("./after-facts.ts");

let fails = 0;
let pending = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};
const len = (s: string) => [...s].length;
const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

/* what is drawn in capitals on one line, and the room it has (Latin characters; CJK takes about half) */
const FIT: Record<string, number> = {
  "af.strip.eyebrow": 30,
  "af.box.hint": 24,
  "af.box.slot": 40,
  "af.box.slotOpening": 40,
  "af.box.closed": 12,
  "af.box.back": 22,
  "af.box.pull": 8,
  "af.box.lift": 8,
  "af.thing.fact": 34,
  "af.thing.line": 22,
  "af.keep": 10,
  "af.kept": 12,
  "af.keepStub": 20,
  "af.rc.shop": 20,
  "af.rc.courier": 22,
  "af.rc.read": 18,
  "af.rc.replied": 18,
  "af.rc.stay": 18,
  "af.rc.next": 18,
  "af.rc.printing": 16,
  "af.rc.tear": 18,
  "af.rc.share.day": 20,
  "af.rc.share.week": 20,
  "af.bed.snack": 12,
  "af.bed.pat": 12,
  "af.bed.lights": 14,
  "af.bed.snack.sub": 18,
  "af.bed.pat.sub": 18,
  "af.bed.lights.sub": 18,
  "af.bed.snack.done": 14,
  "af.bed.pat.done": 14,
  "af.bed.lights.done": 14,
  "af.bed.locked": 18,
  "af.bed.sleepTag": 38,
  "af.bed.streak.N": 24,
  "af.bed.makes": 22,
  "af.bed.week": 22,
  "af.bed.seeYou": 22,
  "af.bed.next": 16,
};
// with a name of four letters and the largest numbers
const filled = (s: string) => s.replace("{name}", "Pond").replace("{n}", "15").replace("{t}", "8:00 AM");

const enUi = ui[0];
const uiKeys = Object.keys(enUi).sort();
ok("the English block has every key the pages read", uiKeys.length >= 60 && Object.keys(FIT).every((k) => k in enUi));

ui.forEach((block, i) => {
  const lang = LANGS[i];
  if (!Object.keys(block).length) {
    console.log(`PENDING ${lang}: the pages' words are not written yet (English shows)`);
    pending++;
    return;
  }
  ok(`${lang}: the same keys as English`, Object.keys(block).sort().join() === uiKeys.join(), uiKeys.filter((k) => !(k in block)).concat(Object.keys(block).filter((k) => !(k in enUi))).join(" "));
  ok(`${lang}: nothing empty`, uiKeys.every((k) => (block[k] ?? "").trim().length > 0), uiKeys.filter((k) => !(block[k] ?? "").trim()).join(" "));
  ok(`${lang}: the placeholders survive`, uiKeys.every((k) => holes(block[k] ?? "") === holes(enUi[k])), uiKeys.filter((k) => holes(block[k] ?? "") !== holes(enUi[k])).join(" "));
  const tooLong = Object.keys(FIT).filter((k) => len(filled(block[k] ?? "")) > (CJK.has(lang) ? Math.ceil(FIT[k] * 0.6) : FIT[k]));
  ok(`${lang}: the labels fit where they sit`, tooLong.length === 0, tooLong.map((k) => `${k}=${len(filled(block[k]))}`).join(" "));
  if (i > 0) {
    const same = uiKeys.filter((k) => block[k] === enUi[k] && !["af.quote", "af.sleepTalk", "af.rc.shop"].includes(k));
    ok(`${lang}: nothing left in English`, same.length <= 2, same.join(" "));
  }
});
ok("en: she is 'her', never 'his' or 'he'", !uiKeys.some((k) => /\b(he|his|him)\b/i.test(enUi[k])), uiKeys.filter((k) => /\b(he|his|him)\b/i.test(enUi[k])).join(" "));

/* ── the facts ── */
ok("sixty facts to start, a source for each", AFTER_FACT_COUNT === 60 && AFTER_FACT_SOURCES.every((s: string) => /^https:\/\/\S+$/.test(s)));
const nos = Array.from({ length: AFTER_FACT_COUNT }, (_, i) => i + 1);
facts.forEach((block, i) => {
  const lang = LANGS[i];
  if (!Object.keys(block).length) {
    console.log(`PENDING ${lang}: the facts are not written yet (English shows)`);
    pending++;
    return;
  }
  const missing = nos.filter((n) => !(block[`af.fact.${n}`] ?? "").trim() || !(block[`af.fact.${n}.foot`] ?? "").trim());
  ok(`${lang}: a fact and a foot for every number, and no others`, missing.length === 0 && Object.keys(block).length === AFTER_FACT_COUNT * 2, missing.join(" "));
  const cap = CJK.has(lang) ? 80 : 140;
  const long = nos.filter((n) => len(block[`af.fact.${n}`] ?? "") > cap);
  ok(`${lang}: each fact fits the note (${cap} characters)`, long.length === 0, long.map((n) => `${n}=${len(block[`af.fact.${n}`])}`).join(" "));
  const longFoot = nos.filter((n) => len(block[`af.fact.${n}.foot`] ?? "") > (CJK.has(lang) ? 20 : 30));
  ok(`${lang}: each foot fits one line`, longFoot.length === 0, longFoot.join(" "));
  // the numbers a fact turns on are the same in every language (digits only: a spelled-out number is the writer's choice)
  if (i > 0) {
    const digits = (s: string) => (s.match(/\d[\d.,]*\d|\d/g) ?? []).map((d) => d.replace(/[.,\s]/g, "")).filter((d) => d.length >= 3).sort().join();
    const off = nos.filter((n) => digits(block[`af.fact.${n}`] ?? "") !== digits(facts[0][`af.fact.${n}`]));
    ok(`${lang}: the years and large numbers match the English`, off.length === 0, off.join(" "));
  }
});

console.log(fails ? `\n${fails} FAILED` : `\nall passed${pending ? ` (${pending} blocks pending)` : ""}`);
if (fails) process.exit(1);
