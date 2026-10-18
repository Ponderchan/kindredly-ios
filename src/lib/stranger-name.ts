/* WHAT A READER CALLS A STRANGER: the courier name (identity plan §3).
   ────────────────────────────────────────────────────────────────────────
   "Your courier names the strangers she brings you, in your language,
   because she doesn't know their names either." Once the identity switch
   is on, the "No. 4481" a pen pal used to wear becomes a name you can say:
   "Sunday Kite", "雨のランタン", "Dedal de lluvia". The words and the maths
   are lib/default-name's (64 postmarks × 128 keepsakes per language, one
   FNV-1a over "name:" + salt + ":" + uid); this file decides WHICH name a
   given reader sees, and gives the screens the same call shapes the old
   number had, so a call site swaps one function for another.

   SALT 0 FOR EVERYONE, so a name is a pure function of the uid and the
   reader's language: the same on the desk, in the chat, on the web and on
   the ghost desk, never stored, no backend.

   THE ONE EXCEPTION · an exact repeat inside one reader's list (§3.2).
     - The reader's threads are taken OLDEST FIRST (created_at, then id).
     - Each stranger tries salt 0; if that whole name, as shown in the
       reader's language, equals one an earlier pen pal already has, it
       tries salt 1, 2 … 15 until it doesn't. The earlier-met keeps it.
     - A repeated KEEPSAKE is fine ("Sunday Kite" and "Rainy Kite" are two
       people, with two different windows). Only a full repeat moves.
   About 0.5% of ten-person lists ever need it, so nearly every pen pal
   keeps the name the desk gave them. That is why this rule and not the
   strategy's wider keepsake-avoiding one (default-name's defaultNamesFor):
   that one renamed roughly a third of ten-person lists at the moment a
   thread opened, under the reader's eyes.

   A DESK LETTER IS NAMED AS THE NEWEST PEN PAL. A stranger who isn't in the
   list yet is checked against everyone in it, as if their thread had just
   opened — which is exactly the name they will have if you write back (a
   new thread is the newest), so the desk and the chat never disagree.

   Reproducible on any device from server data alone (the threads' ids and
   created_at). A thread that leaves the list (a block hides it; a deleted
   account's side is null and has no name) frees its name, so in the rare
   repeat case a later pen pal can fall back to salt 0. Revealed threads
   stay in the list: their courier name lives on as "FIRST MET AS …".

   THE WEB · app/engine/names-core.js is a line-for-line port of this file
   and of default-name's generator, reading the same lists from
   app/engine/stranger-names.v1.json — a byte-identical copy of this repo's
   src/data/stranger-names.v1.json, both written by
   scripts/gen-stranger-names-json.mjs from src/data/default-names. Both
   suites lock the file's sha256 and the vectors in
   design/identity/stranger-names.v1.vectors.json.

   Pure (no i18n import): the caller passes the language and the words for
   an empty side, so plain node can test it (src/lib/stranger-name.test.ts). */

import type { Lang } from "./i18n";
import { defaultName } from "./default-name";

/** The highest salt tried on an exact repeat (§3.2). */
export const MAX_SALT = 15;

/** What a thread contributes to the reader's list: its id, when it was opened, and the other person. */
export type ThreadOrderKey = {
  id: string;
  /** threads.created_at (since 0002). Missing sorts as the oldest, then by id. */
  createdAt: string | number | Date | null | undefined;
  /** the other side's uid; null when their account is gone (no name, takes no name) */
  other: string | null | undefined;
};

const timeOf = (v: ThreadOrderKey["createdAt"]): number => {
  if (v == null) return -Infinity;
  const n = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(n) ? n : -Infinity;
};

/** The reader's threads oldest first: created_at, then id (a new array; the input is untouched). */
export function orderThreads<T extends ThreadOrderKey>(threads: readonly T[]): T[] {
  return [...threads].sort((a, b) => {
    const d = timeOf(a.createdAt) - timeOf(b.createdAt);
    if (d !== 0 && !Number.isNaN(d)) return d < 0 ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** The first salt in 0…MAX_SALT whose name isn't in `taken`; 0 if all sixteen are (never seen in practice). */
function freeSalt(uid: string, lang: Lang, taken: ReadonlySet<string>): number {
  for (let s = 0; s <= MAX_SALT; s++) {
    if (!taken.has(defaultName(uid, lang, s) as string)) return s;
  }
  return 0;
}

/** Everything the screens ask of one reader's list, in one language. */
export type StrangerNamer = {
  /** the reader's language these names are in */
  lang: Lang;
  /** the salt for a uid: its own in the list, or, for someone not in it, the salt it would get as the newest */
  salt: (uid: string) => number;
  /** the courier name for a uid (see strangerName for the options); a missing uid → opts.unsigned */
  name: (uid: string | null | undefined, opts: NameOpts) => string;
};

/** How a name is written: `unsigned` for an empty side (t("ld.unsigned")), `upper` for mono labels. */
export type NameOpts = {
  /** the words for a deleted account's side: the caller's t("ld.unsigned") */
  unsigned: string;
  /** upper-case, for mono labels that were "NO.7273" (with `locale`, the reader's) */
  upper?: boolean;
  /** the locale for upper-casing; defaults to the runtime's */
  locale?: string;
};

/**
 * The reader's list, resolved once: every stranger's salt, threads oldest
 * first, salt 1…15 only on an exact repeat of a whole name in `lang`.
 * Build it where the threads are loaded and hand it down; it is cheap
 * (two hashes per pen pal) but there is no reason to rebuild it per row.
 */
export function strangerNamer(threads: readonly ThreadOrderKey[], lang: Lang): StrangerNamer {
  const salts = new Map<string, number>();
  const taken = new Set<string>();
  for (const th of orderThreads(threads)) {
    const uid = th.other;
    if (!uid || salts.has(uid)) continue; // a ghost has no name; one thread per pair since 0017
    const s = freeSalt(uid, lang, taken);
    salts.set(uid, s);
    taken.add(defaultName(uid, lang, s) as string);
  }
  const salt = (uid: string): number => salts.get(uid) ?? freeSalt(uid, lang, taken);
  return {
    lang,
    salt,
    name: (uid, opts) => (uid ? strangerName(uid, { ...opts, lang, salt: salt(uid) }) : opts.unsigned),
  };
}

/**
 * One stranger's courier name — the call shape of format's penPalName.
 * `salt` is 0 unless the reader's list says otherwise (strangerNamer); a
 * missing uid is a deleted account and reads `unsigned`.
 */
export function strangerName(other: string | null | undefined, opts: NameOpts & { lang: Lang; salt?: number }): string {
  if (!other) return opts.unsigned;
  const s = defaultName(other, opts.lang, opts.salt ?? 0) as string;
  return opts.upper ? s.toLocaleUpperCase(opts.locale) : s;
}
