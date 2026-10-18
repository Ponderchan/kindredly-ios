/* Courier names for one reader (lib/stranger-name) and the lists file the web reads. Not wired
   to a runner; run by hand from the repo root with plain node (types stripped by Node itself;
   the hook below adds ".ts" to the app's extensionless imports):
     node src/lib/stranger-name.test.ts
   1. THE LISTS FILE. src/data/stranger-names.v1.json (scripts/gen-stranger-names-json.mjs) is
      byte-identical to the web's app/engine/stranger-names.v1.json; its sha256 is locked here and
      in the web's scripts/names-core.test.mjs, and its words, blocks and templates must be exactly
      the app's DEFAULT_NAME_LISTS and pairName().
   2. THE SHARED VECTORS. design/identity/stranger-names.v1.vectors.json (written once) — single
      names in every language, salts and blocklist shifts, reader's lists with forced exact
      repeats, desk names — reproduced here and by the web.
   3. THE RULE (§3.2): salt 0 for everyone; threads oldest first; 1…15 only on an exact repeat of
      a whole name; the earlier-met keeps it; a desk letter is named as the newest pen pal; a new
      thread never renames an older one. */

import { registerHooks } from "node:module";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

type Lang = "en" | "es" | "pt" | "id" | "fr" | "de" | "it" | "ja" | "ko";
const { DEFAULT_NAME_LISTS, defaultName, pairName, nameIdx } = await import("./default-name.ts");
const { MAX_SALT, orderThreads, strangerName, strangerNamer } = await import("./stranger-name.ts");

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  — " + extra));
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const LANGS: Lang[] = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];
const U = { unsigned: "UNSIGNED" };

/* ── 1. the lists file ── */
const LISTS_SHA256 = "537a70f2c1f2ce177c529833bbfbf36648d023e433fffaa5481cd81d69149224";
const ltext = readFileSync(new URL("../data/stranger-names.v1.json", import.meta.url), "utf8");
ok("lists file: sha256 locked (the web's copy must match it byte for byte)", createHash("sha256").update(ltext).digest("hex") === LISTS_SHA256);
const L = JSON.parse(ltext) as { v: number; P: number; K: number; langs: string[]; lists: Record<string, { order: string; sep: string; post: string[]; keep: string[]; block: number[][] }> };
ok("lists file: v1, 64 × 128, the nine languages in the app's order", L.v === 1 && L.P === 64 && L.K === 128 && L.langs.join() === LANGS.join());
for (const lang of LANGS) {
  const a = DEFAULT_NAME_LISTS[lang];
  const j = L.lists[lang];
  ok(`${lang}: words and blocks are exactly the app's`, same(j.post, a.post) && same(j.keep, a.keep) && same(j.block, a.block.map(([p, k]) => [p, k])));
  const viaJson = (p: number, k: number) => (j.order === "kp" ? j.keep[k] + j.sep + j.post[p] : j.post[p] + j.sep + j.keep[k]);
  let agree = true;
  for (let p = 0; p < 64; p += 7) for (let k = 0; k < 128; k += 5) if (viaJson(p, k) !== pairName(lang, p, k)) agree = false;
  ok(`${lang}: the file's template (${j.order}, ${JSON.stringify(j.sep)}) is pairName's`, agree);
}

/* ── 2. the shared vectors ── */
const VECTORS_SHA256 = "f691d612fe202e0c6ee48e5bdec212625b601b488991f51ed8fe0c88ec715806";
const vtext = readFileSync(new URL("../../design/identity/stranger-names.v1.vectors.json", import.meta.url), "utf8");
ok("vectors file: sha256 locked", createHash("sha256").update(vtext).digest("hex") === VECTORS_SHA256);
type Th = { id: string; createdAt: string | null; other: string | null };
const V = JSON.parse(vtext) as {
  listsSha256: string;
  single: { uid: string; lang: Lang; salt: number; name: string; blockedRaw?: [number, number] }[];
  lists: { lang: Lang; shared?: string; threads: Th[]; names: string[]; salts: (number | null)[] }[];
  desk: { lang: Lang; threads: Th[]; uid: string; salt: number; name: string }[];
};
ok("vectors were made from this lists file", V.listsSha256 === LISTS_SHA256);
ok("vectors: ≥ 60 single names, every language, salts 0–15", V.single.length >= 60 && LANGS.every((l) => V.single.some((s) => s.lang === l)) && new Set(V.single.map((s) => s.salt)).size >= 8);
{
  const bad = V.single.filter((s) => defaultName(s.uid, s.lang, s.salt) !== s.name || strangerName(s.uid, { ...U, lang: s.lang, salt: s.salt }) !== s.name);
  ok(`vectors: all ${V.single.length} single names reproduced`, bad.length === 0, bad.slice(0, 3).map((s) => `${s.lang}:${s.uid}`).join(", "));
  const shifted = V.single.filter((s) => s.blockedRaw);
  ok("vectors: a blocklist shift in every language is among them", LANGS.every((l) => shifted.some((s) => s.lang === l)) && shifted.every((s) => nameIdx(s.uid, 0).p === s.blockedRaw![0] && s.name !== pairName(s.lang, s.blockedRaw![0], s.blockedRaw![1])));
}
for (const v of V.lists) {
  const nm = strangerNamer(v.threads, v.lang);
  const names = v.threads.map((t) => nm.name(t.other, U));
  const salts = v.threads.map((t) => (t.other ? nm.salt(t.other) : null));
  ok(`vectors: ${v.lang} list of ${v.threads.length}${v.shared ? ` (forced repeat "${v.shared}")` : ""} reproduced`, same(names, v.names) && same(salts, v.salts));
}
ok("vectors: each forced repeat moved the LATER-met off salt 0", V.lists.filter((v) => v.shared).every((v) => {
  const order = orderThreads(v.threads);
  const holders = order.filter((t) => t.other && defaultName(t.other, v.lang, 0) === v.shared);
  const nm = strangerNamer(v.threads, v.lang);
  return holders.length === 2 && nm.salt(holders[0].other!) === 0 && nm.salt(holders[1].other!) > 0 && new Set(v.names.filter((n) => n !== "UNSIGNED")).size === v.names.filter((n) => n !== "UNSIGNED").length;
}));
for (const d of V.desk) {
  const nm = strangerNamer(d.threads, d.lang);
  ok(`vectors: ${d.lang} desk letter named as the newest pen pal (salt ${d.salt})`, nm.salt(d.uid) === d.salt && nm.name(d.uid, U) === d.name && d.salt > 0);
}

/* ── 3. the rule ── */
ok("salt 0 for a list of one, and for a stranger in an empty list", (() => {
  const nm = strangerNamer([], "en");
  return nm.salt("x-1") === 0 && nm.name("x-1", U) === defaultName("x-1", "en", 0);
})());
ok("a missing side reads the caller's words and takes no name", (() => {
  const nm = strangerNamer([{ id: "a", createdAt: 1, other: null }], "en");
  return nm.name(null, U) === "UNSIGNED" && nm.name(undefined, U) === "UNSIGNED" && strangerName(null, { ...U, lang: "ja" }) === "UNSIGNED";
})());
ok("orderThreads: created_at, then id; missing dates first; the input untouched", (() => {
  const input = [
    { id: "b", createdAt: "2026-09-03T00:00:00Z", other: "u3" },
    { id: "z", createdAt: "2026-09-01T00:00:00Z", other: "u1" },
    { id: "a", createdAt: "2026-09-01T00:00:00Z", other: "u2" },
    { id: "m", createdAt: null, other: "u0" },
    { id: "n", createdAt: new Date("2026-09-02T00:00:00Z"), other: "u4" },
    { id: "o", createdAt: Date.parse("2026-09-02T12:00:00Z"), other: "u5" },
    { id: "c", createdAt: "not a date", other: "u6" },
  ];
  const before = JSON.stringify(input);
  const order = orderThreads(input).map((t) => t.id).join("");
  return order === "cmazno" + "b" && JSON.stringify(input) === before;
})());
ok("upper: locale upper-case for mono labels", strangerName("7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6d", { ...U, lang: "en", upper: true }) === "RAINY BARCODE" && strangerName("7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6d", { ...U, lang: "de", upper: true, locale: "de-DE" }) === defaultName("7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6d", "de")!.toLocaleUpperCase("de-DE"));
ok("MAX_SALT is 15", MAX_SALT === 15);
{
  // 300 random lists of 40 in every language: no exact repeat anywhere, earliest-met never moves
  const gen = uidGen(4242);
  let noRepeat = true;
  let firstKeeps = true;
  let rare = 0;
  let total = 0;
  for (let n = 0; n < 300; n++) {
    const threads = Array.from({ length: 40 }, (_, i) => ({ id: "t" + i, createdAt: 1_700_000_000_000 + i * 1000, other: gen() }));
    for (const lang of LANGS) {
      const nm = strangerNamer(threads, lang);
      const names = threads.map((t) => nm.name(t.other, U));
      if (new Set(names).size !== names.length) noRepeat = false;
      if (nm.salt(threads[0].other) !== 0) firstKeeps = false;
      for (const t of threads) {
        total++;
        if (nm.salt(t.other) !== 0) rare++;
      }
    }
  }
  ok("300 lists of 40 × 9 languages: no whole name repeats within a list", noRepeat);
  ok("…the earliest-met always keeps salt 0", firstKeeps);
  ok(`…and almost everyone keeps salt 0 (${rare} of ${total} moved)`, rare / total < 0.01);
}
{
  // a new thread never renames an older one: names of a prefix are the same with or without the newcomers
  const gen = uidGen(99);
  let stable = true;
  for (let n = 0; n < 100; n++) {
    const threads = Array.from({ length: 30 }, (_, i) => ({ id: "t" + i, createdAt: i, other: gen() }));
    for (const lang of ["en", "ja", "es"] as Lang[]) {
      const short = strangerNamer(threads.slice(0, 20), lang);
      const long = strangerNamer(threads, lang);
      if (!threads.slice(0, 20).every((t) => short.name(t.other, U) === long.name(t.other, U))) stable = false;
      // and the desk name of the 21st, before its thread opened, is the name it then has
      if (short.name(threads[20].other, U) !== strangerNamer(threads.slice(0, 21), lang).name(threads[20].other, U)) stable = false;
    }
  }
  ok("a new pen pal never renames an older one, and keeps the name the desk gave them", stable);
}
ok("the same uid twice in a list (never, since 0017) keeps its first salt", (() => {
  const nm = strangerNamer([{ id: "a", createdAt: 1, other: "dup" }, { id: "b", createdAt: 2, other: "dup" }], "en");
  return nm.salt("dup") === 0;
})());

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);

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
