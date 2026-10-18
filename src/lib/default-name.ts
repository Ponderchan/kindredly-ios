/* DEFAULT NAMES FOR STRANGERS ("Postmark names", v1).
   ────────────────────────────────────────────────────────────────────────
   Spec: .claude/ui10a-research/identity/default-names-strategy.md (§1 template,
   §2 caps, §3 algorithm). Pure and import-light so plain node can test it
   (src/lib/default-name.test.ts). NOT wired into any screen yet.

   A stranger's default name is a POSTMARK (when or where the letter came from)
   plus a KEEPSAKE (a small object you could keep): "Sunday Kite", "雨のランタン",
   "Dedal de lluvia". It is derived from their user id and never describes them.

   THE INDICES ARE LANGUAGE-FREE. One FNV-1a (mosaic.ts hashStr, never forked)
   over "name:" + salt + ":" + uid gives p = top 6 bits (64 postmarks) and
   k = next 7 bits (128 keepsakes). The salt goes FIRST: with it last, the top
   bits barely move between salts (§3.2). Every language has the same list
   sizes, so the salt that keeps one reader's list unique holds in all nine.

   THE WORDS ARE NOT. Each language has its own independent lists
   (src/data/default-names/<lang>.ts, generated from the native finals by
   scripts/gen-default-names.mjs); slot 17 is not a translation of anything.
   Prepositions, articles, Fugen and の live inside the postmark item, so the
   template below only concatenates:
     en, ko      postmark + " " + keepsake        Sunday Kite · 새벽 우산
     de, ja      postmark + keepsake              Regenkiesel · 雨のランタン
     es pt fr it keepsake + " " + postmark phrase  Dedal de lluvia · Ruban d’été
     id          keepsake + " " + postmark        Peniti Halte
   A pair on the language's blocklist (too long, or unsafe in that language)
   moves its postmark to (p+1) mod 64 until the pair is allowed. The keepsake
   never moves, so keepsake uniqueness survives the shift.

   Channel "name:"+salt+":"+uid → default-name indices. (mosaic.ts keeps the
   registry of hash channels; list it there when this is wired.) */

import type { Lang } from "./i18n";
import { hashStr } from "./mosaic";
import de from "../data/default-names/de";
import en from "../data/default-names/en";
import es from "../data/default-names/es";
import fr from "../data/default-names/fr";
import id from "../data/default-names/id";
import it from "../data/default-names/it";
import ja from "../data/default-names/ja";
import ko from "../data/default-names/ko";
import pt from "../data/default-names/pt";

/** One language's frozen lists: 64 postmarks, 128 keepsakes, blocked [p, k] pairs, and (ja) kana readings. */
export type DefaultNameList = {
  post: readonly string[];
  keep: readonly string[];
  block: readonly (readonly [number, number])[];
  readings?: Readonly<Record<string, string>>;
};

export const POSTMARKS = 64;
export const KEEPSAKES = 128;

export const DEFAULT_NAME_LISTS: Readonly<Record<Lang, DefaultNameList>> = { en, es, pt, id, fr, de, it, ja, ko };

/** Languages whose name reads keepsake first. */
const KEEPSAKE_FIRST: ReadonlySet<Lang> = new Set<Lang>(["es", "pt", "fr", "it", "id"]);
/** Languages that join the two items with nothing (de compounds; ja's の is inside the postmark). */
const NO_SPACE: ReadonlySet<Lang> = new Set<Lang>(["de", "ja"]);

/** Raw, language-free slot of a uid at a salt (§3.2). */
export function nameIdx(uid: string, salt = 0): { p: number; k: number } {
  const h = hashStr("name:" + salt + ":" + uid);
  return { p: h >>> 26, k: (h >>> 19) & 127 };
}

const blockSets = new Map<Lang, Set<number>>();
function blocked(lang: Lang): Set<number> {
  let s = blockSets.get(lang);
  if (!s) {
    s = new Set(DEFAULT_NAME_LISTS[lang].block.map(([p, k]) => p * KEEPSAKES + k));
    blockSets.set(lang, s);
  }
  return s;
}

/** The postmark actually shown for (p, k) in a language: p, or the next allowed one (mod 64). */
export function allowedPostmark(lang: Lang, p: number, k: number): number {
  const b = blocked(lang);
  for (let i = 0; i < POSTMARKS; i++) {
    const q = (p + i) % POSTMARKS;
    if (!b.has(q * KEEPSAKES + k)) return q;
  }
  return p; // unreachable: the build gate keeps >= 48 usable postmarks per keepsake
}

/** The string for a slot, by the language's template (§1). Does not apply the blocklist. */
export function pairName(lang: Lang, p: number, k: number): string {
  const l = DEFAULT_NAME_LISTS[lang];
  const post = l.post[p];
  const keep = l.keep[k];
  const sep = NO_SPACE.has(lang) ? "" : " ";
  return KEEPSAKE_FIRST.has(lang) ? keep + sep + post : post + sep + keep;
}

/** A stranger's default name in a language, or null for a missing id (a deleted account reads ld.unsigned). */
export function defaultName(uid: string | null, lang: Lang, salt = 0): string | null {
  if (!uid) return null;
  const { p, k } = nameIdx(uid, salt);
  return pairName(lang, allowedPostmark(lang, p, k), k);
}

/* COLLISIONS WITHIN ONE READER: earlier-met keeps it (§3.4). `taken` holds the raw
   slots of everyone already named, in the order they were met. Prefer a salt that
   gives a new keepsake AND a new postmark, then any new keepsake, then any new full
   slot. The searches past the first are wider than §3.4's 16/64 so that a long list
   really does not repeat a keepsake until all 128 are used (with 16 tries, a list
   of ~100 repeats one about a third of the time). Raw slots, not shown ones, so the
   salt is the same in every language. */
const PREFER_TRIES = 16;
const WIDE_TRIES = 1024;

/** The salt for a newcomer given the raw slots already taken in this reader's list. */
export function resolveSalt(uid: string, taken: ReadonlyArray<{ p: number; k: number }>): number {
  const takenK = new Set(taken.map((t) => t.k));
  const takenP = new Set(taken.map((t) => t.p));
  const takenPK = new Set(taken.map((t) => t.p * KEEPSAKES + t.k));
  for (let s = 0; s < PREFER_TRIES; s++) {
    const { p, k } = nameIdx(uid, s);
    if (!takenK.has(k) && !takenP.has(p)) return s;
  }
  for (let s = 0; s < WIDE_TRIES; s++) {
    if (!takenK.has(nameIdx(uid, s).k)) return s;
  }
  for (let s = 0; s < WIDE_TRIES; s++) {
    const { p, k } = nameIdx(uid, s);
    if (!takenPK.has(p * KEEPSAKES + k)) return s;
  }
  return 0;
}

/** Default names for one reader's strangers, in the order they were met. Salts are bumped so that
    keepsakes don't repeat within the list (until all 128 are used) and no two strangers share a slot.
    The same uid twice gets the same name; a missing id gets null. */
export function defaultNamesFor(uids: ReadonlyArray<string | null>, lang: Lang): (string | null)[] {
  const taken: { p: number; k: number }[] = [];
  const seen = new Map<string, string>();
  return uids.map((uid) => {
    if (!uid) return null;
    const known = seen.get(uid);
    if (known !== undefined) return known;
    const salt = resolveSalt(uid, taken);
    taken.push(nameIdx(uid, salt));
    const name = defaultName(uid, lang, salt) as string;
    seen.set(uid, name);
    return name;
  });
}
