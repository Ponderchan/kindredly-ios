// node scripts/gen-identity-vectors.mjs           write design/identity/*.vectors.json (refuses to overwrite)
// node scripts/gen-identity-vectors.mjs --force   overwrite them (a deliberate v2 only)
//
// THE SHARED VECTORS FOR IDENTITY PHASE 1, WRITTEN ONCE. Three files the app's tests and the
// web's tests must both reproduce exactly, so a stranger has one window, one name and one sign on
// the phone and on the web:
//   design/identity/frost.v1.vectors.json           FROST v1 specs: 32 ids × light and dark
//                                                    (src/lib/frost.ts ↔ web app/engine/frost.js)
//   design/identity/stranger-names.v1.vectors.json  courier names: 81 single names (every language,
//                                                    salts 0–3, every language's blocklist shift),
//                                                    reader's lists with forced exact repeats, and
//                                                    desk names (src/lib/stranger-name.ts ↔ web
//                                                    app/engine/names-core.js), plus the sha256 of
//                                                    the lists file they were made from
//   design/identity/zodiac.v1.vectors.json          the sign of every day of a leap year
//                                                    (src/lib/zodiac.ts ↔ web app/engine/zodiac.js)
// They are made from the app's TypeScript as it stands, ONCE: after that they are the contract.
// The files' sha256 are locked in both suites too, so regenerating them quietly fails a test; a
// real change (FROST v2, a list replaced in a slot) runs this with --force and re-locks both suites.
//
// Plain node: the TS is loaded with Node's own type stripping, and a resolve hook adds ".ts" to
// the app's extensionless relative imports.
import { registerHooks } from "node:module";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../design/identity");
const FORCE = process.argv.includes("--force");
const lib = (f) => pathToFileURL(resolve(HERE, "../src/lib", f)).href;

const { frostSpec } = await import(lib("frost.ts"));
const { defaultName, nameIdx, DEFAULT_NAME_LISTS, KEEPSAKES } = await import(lib("default-name.ts"));
const { strangerNamer } = await import(lib("stranger-name.ts"));
const { zodiacOf } = await import(lib("zodiac.ts"));

const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];

/* deterministic uuid-shaped ids (xorshift32), the same generator as default-name.test.ts */
function uidGen(seed) {
  let x = seed >>> 0 || 1;
  const next = () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x;
  };
  const hex = (n) => next().toString(16).padStart(8, "0").slice(0, n);
  return () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(8)}${hex(4)}`;
}

/* ── frost ── */
const frostIds = ["00000000-0000-4000-8000-000000000000", "7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6d", "step5-a1", "demo-mira"];
{
  const g = uidGen(34);
  while (frostIds.length < 32) frostIds.push(g());
}
const frost = {
  v: 1,
  about: "FROST v1 (kindredly-ios src/lib/frost.ts, web app/engine/frost.js): frostSpec(uid, dark) for 32 ids on a light and a dark theme, and null for a missing id. Written once by scripts/gen-identity-vectors.mjs; both test suites must reproduce every spec exactly.",
  missing: frostSpec(null),
  cases: frostIds.flatMap((uid) => [false, true].map((dark) => ({ uid, dark, spec: frostSpec(uid, dark) }))),
};

/* ── names ── */
const listsPath = resolve(HERE, "../src/data/stranger-names.v1.json");
const listsSha256 = createHash("sha256").update(readFileSync(listsPath)).digest("hex");

const single = [];
{
  const g = uidGen(60);
  for (let i = 0; i < 54; i++) {
    const uid = i === 0 ? "00000000-0000-4000-8000-000000000000" : g();
    const lang = LANGS[i % LANGS.length];
    const salt = Math.floor(i / LANGS.length) % 4;
    single.push({ uid, lang, salt, name: defaultName(uid, lang, salt) });
  }
  // every language with a blocklist: an id whose raw pair is blocked, so the shift is locked too
  const g2 = uidGen(61);
  for (const lang of LANGS) {
    const b = new Set(DEFAULT_NAME_LISTS[lang].block.map(([p, k]) => p * KEEPSAKES + k));
    if (!b.size) continue;
    for (let tries = 0; tries < 200000; tries++) {
      const uid = g2();
      const { p, k } = nameIdx(uid, 0);
      if (b.has(p * KEEPSAKES + k)) {
        single.push({ uid, lang, salt: 0, name: defaultName(uid, lang, 0), blockedRaw: [p, k] });
        break;
      }
    }
  }
  // and a few ids at salts 1…15
  const g3 = uidGen(62);
  for (let i = 0; i < 18; i++) {
    const uid = g3();
    const lang = LANGS[(i * 4) % LANGS.length];
    const salt = 1 + (i % 15);
    single.push({ uid, lang, salt, name: defaultName(uid, lang, salt) });
  }
}

/* two ids with the same whole name at salt 0 in a language (birthday search) */
function collision(lang, seed) {
  const g = uidGen(seed);
  const seen = new Map();
  for (let i = 0; i < 400000; i++) {
    const uid = g();
    const n = defaultName(uid, lang, 0);
    if (seen.has(n)) return [seen.get(n), uid, n];
    seen.set(n, uid);
  }
  throw new Error("no collision found for " + lang);
}

const t0 = Date.parse("2026-09-01T10:00:00Z");
const day = 86400000;
const lists = [];
const desk = [];
{
  // a long random list in three languages: created_at shuffled, two ties broken by id, one missing
  const g = uidGen(70);
  const threads = Array.from({ length: 30 }, (_, i) => ({
    id: "th-" + String((i * 7919) % 1000).padStart(3, "0"),
    createdAt: i === 4 ? null : new Date(t0 + ((i * 37) % 30) * day + (i === 9 || i === 10 ? 0 : i) * 1000).toISOString(),
    other: i === 12 ? null : g(),
  }));
  threads[10].createdAt = threads[9].createdAt; // a tie: the id decides
  for (const lang of ["en", "ja", "de"]) {
    const nm = strangerNamer(threads, lang);
    lists.push({ lang, threads, names: threads.map((t) => nm.name(t.other, { unsigned: "UNSIGNED" })), salts: threads.map((t) => (t.other ? nm.salt(t.other) : null)) });
  }
  // forced exact repeats: the later-met of each pair must move off salt 0; given in reverse order
  for (const [lang, seed] of [["en", 71], ["ja", 72], ["ko", 73], ["es", 74]]) {
    const [first, second, shared] = collision(lang, seed);
    const filler = uidGen(seed + 100);
    const threads = [
      { id: "z-late", createdAt: new Date(t0 + 5 * day).toISOString(), other: second },
      { id: "a-mid", createdAt: new Date(t0 + 2 * day).toISOString(), other: filler() },
      { id: "m-early", createdAt: new Date(t0).toISOString(), other: first },
      { id: "b-gone", createdAt: new Date(t0 + day).toISOString(), other: null },
    ];
    const nm = strangerNamer(threads, lang);
    lists.push({ lang, shared, threads, names: threads.map((t) => nm.name(t.other, { unsigned: "UNSIGNED" })), salts: threads.map((t) => (t.other ? nm.salt(t.other) : null)) });
    // a desk letter whose salt-0 name repeats someone in the list: named as the newest pen pal
    const deskList = [{ id: "only", createdAt: new Date(t0).toISOString(), other: first }];
    const dn = strangerNamer(deskList, lang);
    desk.push({ lang, threads: deskList, uid: second, salt: dn.salt(second), name: dn.name(second, { unsigned: "UNSIGNED" }) });
  }
}

const names = {
  v: 1,
  about: "Courier names (kindredly-ios src/lib/stranger-name.ts + default-name.ts, web app/engine/names-core.js). single: defaultName(uid, lang, salt). lists: strangerNamer(threads, lang) names and salts for each thread in input order (UNSIGNED for a missing side). desk: a stranger not in the list, named as the newest pen pal. Made from the lists file whose sha256 is listsSha256. Written once by scripts/gen-identity-vectors.mjs.",
  listsSha256,
  single,
  lists,
  desk,
};

/* ── zodiac: every day of a leap year ── */
const days = [];
for (let m = 1; m <= 12; m++) {
  const n = new Date(Date.UTC(2024, m, 0)).getUTCDate();
  for (let d = 1; d <= n; d++) days.push([m, d, zodiacOf(m, d)]);
}
const zodiac = {
  v: 1,
  about: "zodiacOf(month, day) for every day of a leap year (kindredly-ios src/lib/zodiac.ts, web app/engine/zodiac.js, and the CASE in web migration 0034). Written once by scripts/gen-identity-vectors.mjs.",
  days,
};

mkdirSync(OUT, { recursive: true });
const write = (file, obj) => {
  const path = resolve(OUT, file);
  if (existsSync(path) && !FORCE) {
    console.log(`kept        ${path} (exists; --force to overwrite)`);
    return;
  }
  const text = JSON.stringify(obj, null, 1) + "\n";
  writeFileSync(path, text);
  console.log(`wrote       ${path}  sha256 ${createHash("sha256").update(text).digest("hex")}`);
};
write("frost.v1.vectors.json", frost);
write("stranger-names.v1.vectors.json", names);
write("zodiac.v1.vectors.json", zodiac);
