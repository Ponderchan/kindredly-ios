/* The seasons' words (strings-season.ts) and the seasonal stamps' words (stamps.ts): all nine
   blocks carry the same keys, none is empty, every look a season offers is named, the marker is
   in capitals where the language has case and short enough for the tray's head, nothing is left
   in English except what a language really says in English; and the three Halloween stamps and
   their category carry a name and a prompt in all ten stamp languages. Not wired to a runner; run
   by hand from the repo root with plain node (Node 22.18+ strips the types):
     node src/data/strings-season.test.ts
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

await import("./strings-season.ts");
const blocks = (globalThis as any).__blocks as Record<string, string>[];
const { SEASONS } = await import("../lib/season-core.ts");
const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

ok("nine blocks, en es pt id fr de it ja ko", blocks.length === 9);
const en = blocks[0];
const keys = Object.keys(en).sort().join();
LANGS.forEach((lang, i) => {
  const b = blocks[i] ?? {};
  ok(`${lang}: the same keys as en`, Object.keys(b).sort().join() === keys);
  ok(`${lang}: none empty`, Object.values(b).every((v) => typeof v === "string" && v.trim().length > 0));
  ok(`${lang}: only ws.acc.* and season.* keys`, Object.keys(b).every((k) => /^(ws\.acc\.|season\.)/.test(k)));
});

/* every look a season offers has a name */
const looks = SEASONS.flatMap((s) => s.looks);
ok("every seasonal look is named", looks.every((id) => typeof en[`ws.acc.${id}`] === "string"));

/* the marker: capitals where the language has case, short */
blocks.forEach((b, i) => {
  const m = b["season.tray.mark"];
  ok(`${LANGS[i]}: the marker is in capitals`, m === m.toUpperCase());
  ok(`${LANGS[i]}: the marker is short (≤ 12)`, [...m].length <= 12, m);
});

/* nothing left in English (the en words never reappear in another block) */
const SAME_OK = new Set<string>(); // none: every language has its own word for each
blocks.slice(1).forEach((b, i) => {
  const left = Object.keys(b).filter((k) => !SAME_OK.has(k) && b[k] === en[k]);
  ok(`${LANGS[i + 1]}: nothing left in English`, left.length === 0, left.join());
});

/* the stamps' own words (stamps.ts, read as text: it imports i18n) */
const text = readFileSync(new URL("./stamps.ts", import.meta.url), "utf8");
const STAMP_LANGS = ["en", "zh", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];
const locOf = (line: string, field: "name" | "prompt"): Record<string, string> | null => {
  const m = line.match(new RegExp(`${field}: (\\{[^}]*\\})`));
  if (!m) return null;
  try {
    return JSON.parse(m[1].replace(/(\w+): "/g, '"$1": "'));
  } catch {
    return null;
  }
};
// the seasons' stamps. The birthday stamp shares the category (owner's audit, 2026-11-10) but is no season's, and
// its name and prompt are English only until they are written natively: lib/birthday-stamp-core.test.ts has it
const seasonalLines = text.split("\n").filter((l) => /cat: "seasonal"/.test(l) && !/\{ id: "birthday"/.test(l));
ok("stamps.ts: the three Halloween stamps", seasonalLines.map((l) => l.match(/id: "([\w-]+)"/)?.[1]).join() === "spooky-season,boo,trick-or-treat");
for (const line of seasonalLines) {
  const id = line.match(/id: "([\w-]+)"/)?.[1];
  for (const field of ["name", "prompt"] as const) {
    const loc = locOf(line, field);
    ok(`${id}: a ${field} in all ten languages`, !!loc && STAMP_LANGS.every((l) => typeof loc[l] === "string" && loc[l].trim().length > 0));
  }
  const p = locOf(line, "prompt");
  ok(`${id}: every prompt ends like a sentence`, !!p && STAMP_LANGS.every((l) => /[.。!！?？]$/.test(p[l])));
}
const catLine = text.split("\n").find((l) => /\{ id: "seasonal", emoji:/.test(l)) ?? "";
const cat = locOf(catLine, "name");
ok("the seasonal category is named in all ten", !!cat && STAMP_LANGS.every((l) => typeof cat[l] === "string" && cat[l].trim().length > 0));

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
process.exit(fails ? 1 : 0);
