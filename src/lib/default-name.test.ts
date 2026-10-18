/* Default names for strangers (lib/default-name), v1. Not wired to a runner; run from the
   repo root with a TS resolver that adds the .ts extension, e.g.
     node --import <scratchpad>/ts-register.mjs src/lib/default-name.test.ts
   The vectors below lock the v1 lists and maths. A word replaced in its slot, or a pair
   blocked, changes some of them on purpose: bump v and re-lock (strategy §3.5). */

import type { Lang } from "./i18n";
import {
  DEFAULT_NAME_LISTS,
  KEEPSAKES,
  POSTMARKS,
  allowedPostmark,
  defaultName,
  defaultNamesFor,
  nameIdx,
  pairName,
  resolveSalt,
} from "./default-name";

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  — " + extra));
  if (!cond) fails++;
};

const LANGS: Lang[] = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];

/* deterministic uuid-shaped ids (xorshift32), so every run tests the same strangers */
function uidGen(seed: number) {
  let x = seed >>> 0 || 1;
  const next = () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x;
  };
  const hex = (n: number) => next().toString(16).padStart(8, "0").slice(0, n);
  return () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(8)}${hex(4)}`;
}

/* §2 whole-name caps, per language */
const chars = (s: string) => [...s].length;
const CAP: Record<Lang, (s: string) => boolean> = {
  en: (s) => chars(s) <= 15,
  id: (s) => chars(s) <= 16,
  de: (s) => chars(s) <= 14 && !/\s/.test(s),
  es: (s) => chars(s) <= 18,
  pt: (s) => chars(s) <= 17,
  fr: (s) => chars(s) <= 18,
  it: (s) => chars(s) <= 18,
  ja: (s) => chars(s) <= 7,
  ko: (s) => /^[가-힣]+ [가-힣]+$/.test(s) && chars(s.replace(" ", "")) <= 6,
};

/* ── stability: the language-free indices and one name per language ── */
const IDX: [string, number, number, number][] = [
  ["7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6d", 0, 14, 91],
  ["7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6d", 1, 18, 102],
  ["7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6d", 7, 35, 63],
  ["00000000-0000-4000-8000-000000000000", 0, 14, 95],
  ["00000000-0000-4000-8000-000000000000", 1, 32, 39],
  ["a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", 0, 10, 42],
  ["a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", 7, 3, 124],
];
ok(
  "stable: nameIdx vectors",
  IDX.every(([u, s, p, k]) => {
    const r = nameIdx(u, s);
    return r.p === p && r.k === k;
  }),
);
const NAMES: [string, number, Lang, string][] = [
  ["7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6d", 0, "en", "Rainy Barcode"],
  ["00000000-0000-4000-8000-000000000000", 1, "es", "Retama de nube"],
  ["a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", 2, "pt", "Leque de neblina"],
  ["7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6d", 3, "id", "Teropong Garasi"],
  ["00000000-0000-4000-8000-000000000000", 0, "fr", "Notice de juillet"],
  ["a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", 1, "de", "Tagesteelicht"],
  ["7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6d", 2, "it", "Chiave di luglio"],
  ["00000000-0000-4000-8000-000000000000", 3, "ja", "月末の蔵書票"],
  ["a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", 0, "ko", "오후 사진첩"],
];
for (const [u, s, lang, want] of NAMES) {
  const got = defaultName(u, lang, s);
  ok(`stable: ${lang} vector`, got === want, `got ${got}`);
}
ok("stable: salt defaults to 0", defaultName(NAMES[0][0], "en") === defaultName(NAMES[0][0], "en", 0));
{
  const gen = uidGen(7);
  const ids = Array.from({ length: 500 }, gen);
  ok("stable: same uid, salt and language give the same name", ids.every((u) => LANGS.every((l) => defaultName(u, l, 3) === defaultName(u, l, 3))));
}
ok("null or empty uid → null", defaultName(null, "en") === null && defaultName("", "ja") === null);

/* ── the lists: 64/128, unique, in both lists never, blocks in range ── */
for (const lang of LANGS) {
  const l = DEFAULT_NAME_LISTS[lang];
  ok(`${lang}: 64 postmarks, all different`, l.post.length === POSTMARKS && new Set(l.post).size === POSTMARKS);
  ok(`${lang}: 128 keepsakes, all different`, l.keep.length === KEEPSAKES && new Set(l.keep).size === KEEPSAKES);
  ok(`${lang}: no word in both lists`, l.post.every((w) => !l.keep.includes(w)));
  const b = new Set(l.block.map(([p, k]) => p * KEEPSAKES + k));
  ok(`${lang}: blocked pairs in range, < 5%`, l.block.every(([p, k]) => p >= 0 && p < POSTMARKS && k >= 0 && k < KEEPSAKES) && b.size < 0.05 * POSTMARKS * KEEPSAKES);
  let minUsable = POSTMARKS;
  for (let k = 0; k < KEEPSAKES; k++) {
    let u = 0;
    for (let p = 0; p < POSTMARKS; p++) if (!b.has(p * KEEPSAKES + k)) u++;
    minUsable = Math.min(minUsable, u);
  }
  ok(`${lang}: every keepsake keeps >= 48 usable postmarks`, minUsable >= 48, `min ${minUsable}`);

  /* every allowed pair within §2 */
  const over: string[] = [];
  for (let p = 0; p < POSTMARKS; p++)
    for (let k = 0; k < KEEPSAKES; k++) if (!b.has(p * KEEPSAKES + k) && !CAP[lang](pairName(lang, p, k))) over.push(pairName(lang, p, k));
  ok(`${lang}: every allowed pair within the §2 cap`, over.length === 0, over.slice(0, 3).join(" · "));
}
ok("ja: every item has a kana reading", [...DEFAULT_NAME_LISTS.ja.post, ...DEFAULT_NAME_LISTS.ja.keep].every((w) => !!DEFAULT_NAME_LISTS.ja.readings?.[w]));
ok("templates: en/id Title Case with a space", /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(pairName("en", 0, 0)) && /^[A-Z]\S* [A-Z]\S*$/.test(pairName("id", 0, 0)));
ok("templates: de is one word, ja joins with の, ko with one space", !/\s/.test(pairName("de", 0, 0)) && pairName("ja", 0, 0).includes("の") && pairName("ko", 0, 0).split(" ").length === 2);
ok("templates: es/pt/fr/it keepsake first", (["es", "pt", "fr", "it"] as Lang[]).every((l) => pairName(l, 5, 9).startsWith(DEFAULT_NAME_LISTS[l].keep[9] + " ")));

/* ── blocked pairs are skipped: the postmark moves to the next allowed one, the keepsake stays ── */
for (const lang of LANGS) {
  const l = DEFAULT_NAME_LISTS[lang];
  const b = new Set(l.block.map(([p, k]) => p * KEEPSAKES + k));
  const blockedNames = new Set(l.block.map(([p, k]) => pairName(lang, p, k)));
  const gen = uidGen(1000 + LANGS.indexOf(lang));
  let hits = 0;
  let good = true;
  for (let i = 0; i < 20000; i++) {
    const u = gen();
    const { p, k } = nameIdx(u);
    const name = defaultName(u, lang) as string;
    if (blockedNames.has(name)) good = false;
    if (b.has(p * KEEPSAKES + k)) {
      hits++;
      let q = p;
      while (b.has(q * KEEPSAKES + k)) q = (q + 1) % POSTMARKS;
      if (name !== pairName(lang, q, k) || allowedPostmark(lang, p, k) !== q) good = false;
    } else if (name !== pairName(lang, p, k)) good = false;
  }
  const expectHits = l.block.length > 0;
  ok(`${lang}: blocked pairs skipped (${hits} of 20000 ids landed on one)`, good && (!expectHits || hits > 0));
}

/* ── one reader's list: keepsakes don't repeat ── */
{
  const gen = uidGen(42);
  let allDistinct = true;
  for (let list = 0; list < 200; list++) {
    const ids = Array.from({ length: 30 }, gen);
    const salts = saltsOf(ids);
    if (new Set(ids.map((u, i) => nameIdx(u, salts[i]).k)).size !== ids.length) allDistinct = false;
    for (const lang of LANGS) {
      const names = defaultNamesFor(ids, lang) as string[];
      const keepWords = names.map((_, i) => DEFAULT_NAME_LISTS[lang].keep[nameIdx(ids[i], salts[i]).k]);
      if (new Set(names).size !== ids.length || new Set(keepWords).size !== ids.length) allDistinct = false;
    }
  }
  ok("200 lists of 30 random ids: no keepsake repeats within a list", allDistinct);
}
function saltsOf(ids: string[]): number[] {
  const taken: { p: number; k: number }[] = [];
  return ids.map((u) => {
    const s = resolveSalt(u, taken);
    taken.push(nameIdx(u, s));
    return s;
  });
}
{
  /* 200 strangers for one reader: only 128 keepsakes exist, so the first 128 are all different
     keepsakes and all 200 names are different strings, in every language */
  const ids = Array.from({ length: 200 }, uidGen(2026));
  const salts = saltsOf(ids);
  const slots = ids.map((u, i) => nameIdx(u, salts[i]));
  ok("200 random ids: the first 128 get 128 different keepsakes", new Set(slots.slice(0, 128).map((s) => s.k)).size === 128);
  for (const lang of LANGS) {
    const names = defaultNamesFor(ids, lang);
    ok(`${lang}: 200 random ids → 200 different names`, new Set(names).size === 200 && names.every((n) => typeof n === "string"));
  }
  const noSalt = new Set(ids.slice(0, 30).map((u) => nameIdx(u).k)).size;
  console.log(`     (without the salt, 30 of these ids would share keepsakes: ${30 - noSalt} repeats)`);
}
ok("defaultNamesFor: same uid twice → same name; null → null", (() => {
  const r = defaultNamesFor(["x-1", null, "x-2", "x-1"], "en");
  return r[0] === r[3] && r[1] === null && r[0] !== r[2];
})());
ok("salt is language-free: one list, same keepsake slots in every language", (() => {
  const ids = Array.from({ length: 40 }, uidGen(9));
  const s = saltsOf(ids);
  return LANGS.every((lang) => {
    const names = defaultNamesFor(ids, lang);
    return names.every((n, i) => n === defaultName(ids[i], lang, s[i]));
  });
})());

/* ── samples ── */
{
  const gen = uidGen(5);
  const ids = Array.from({ length: 5 }, gen);
  for (const lang of LANGS) console.log(`     ${lang}: ` + (defaultNamesFor(ids, lang) as string[]).join(" · "));
}

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
