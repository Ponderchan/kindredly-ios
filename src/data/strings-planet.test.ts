/* The courier's planet's words (strings-planet.ts) and the plain "on the way" lines that ship
   with it (strings.ts fl.exploring*, fl.night.flying*): all nine blocks carry the same keys, none
   is empty, nothing is left in English, the labels drawn in capitals are short enough for where
   they sit, and none of the "on the way" lines goes back to the windows and sills the owner could
   not read. Not wired to a runner; run by hand from the repo root with plain node (Node 22.18+
   strips the types):
     node src/data/strings-planet.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
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

await import("./strings-planet.ts");
const blocks = (globalThis as any).__blocks as Record<string, string>[];
const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];
const CJK = new Set(["ja", "ko"]);

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};
const len = (s: string) => [...s].length;

ok("nine blocks, en es pt id fr de it ja ko", blocks.length === 9);
const en = blocks[0];
const keys = Object.keys(en).sort().join();
LANGS.forEach((lang, i) => {
  const b = blocks[i] ?? {};
  ok(`${lang}: the same keys as en`, Object.keys(b).sort().join() === keys);
  ok(`${lang}: none empty`, Object.values(b).every((v) => typeof v === "string" && v.trim().length > 0));
  ok(`${lang}: only planet.* keys`, Object.keys(b).every((k) => k.startsWith("planet.")));
});

/* nothing left in English */
blocks.slice(1).forEach((b, i) => {
  const left = Object.keys(b).filter((k) => b[k] === en[k]);
  ok(`${LANGS[i + 1]}: nothing left in English`, left.length === 0, left.join());
});

/* what is drawn in capitals has to fit where it sits */
blocks.forEach((b, i) => {
  const lang = LANGS[i];
  // the two hints share one line on the planet page: "DRAG TO SPIN · PINCH TO ZOOM"
  const hint = `${b["planet.hint.spin"]} · ${b["planet.hint.zoom"]}`;
  ok(`${lang}: the two hints fit one line (≤ ${CJK.has(lang) ? 20 : 40})`, len(hint) <= (CJK.has(lang) ? 20 : 40), hint);
  // a figure's label sits under a number in a tile a third of the page wide (it may shrink to 60%)
  for (const k of ["planet.page.way", "planet.page.carried", "planet.page.desks"]) {
    ok(`${lang}: ${k} is a short label (≤ ${CJK.has(lang) ? 8 : 14})`, len(b[k]) <= (CJK.has(lang) ? 8 : 14), b[k]);
    ok(`${lang}: ${k} is not a sentence`, !/[.。!！?？]$/.test(b[k]), b[k]);
  }
});

/* the "on the way" lines in strings.ts: nine blocks, each plain */
const text = readFileSync(new URL("./strings.ts", import.meta.url), "utf8");
const valuesOf = (key: string): string[] => {
  const out: string[] = [];
  const re = new RegExp(`^\\s*"${key.replace(/\./g, "\\.")}": (".*"),?\\s*$`, "gm");
  for (const m of text.matchAll(re)) out.push(JSON.parse(m[1]));
  return out;
};
const WAY = ["fl.exploring", "fl.exploring.notime", "fl.exploring.sub", "fl.night.flying", "fl.night.flying.sub"];
// the images the old lines were made of, in each language's own words for them
const OLD = /window|sill|hunting|ventana|alféizar|janela|parapeito|jendela|fenêtre|rebord|fenster|sims|finestra|davanzale|窓|창/i;
for (const key of WAY) {
  const vs = valuesOf(key);
  ok(`${key}: in all nine blocks`, vs.length === 9, String(vs.length));
  vs.forEach((v, i) => {
    ok(`${LANGS[i]}: ${key} has no window or sill in it`, !OLD.test(v), v);
    ok(`${LANGS[i]}: ${key} is not empty`, v.trim().length > 0);
  });
  vs.slice(1).forEach((v, i) => ok(`${LANGS[i + 1]}: ${key} is not the English`, v !== vs[0], v));
}
// the line with a time and the one without say the same thing now
{
  const a = valuesOf("fl.exploring");
  const b = valuesOf("fl.exploring.notime");
  ok("with or without a time, the same plain line", a.length === 9 && a.every((v, i) => v === b[i]));
  ok("the plain line carries no {time}", a.every((v) => !v.includes("{time}")));
}

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
process.exit(fails ? 1 : 0);
