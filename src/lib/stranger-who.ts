import type { Lang } from "./i18n";
import type { Mark, Marks } from "./identity-core";
import { frostSpec, type FrostSpec } from "./frost";
import { mosaicMask } from "./mosaic";
import { strangerName, type StrangerNamer } from "./stranger-name";
import { zodiacKey, type Zodiac } from "./zodiac";

/* WHO A STRANGER IS, ON EVERY SCREEN, FROM ONE PLACE (identity Phase 1).
   ────────────────────────────────────────────────────────────────────────
   Every screen that shows a pen pal or a desk letter's writer asks this
   file what to call them, what face to draw and what to say beside the
   name: the Today card's header, the Kindreds rows, the folded row and the
   orbit, the pen-pal chat's header and its letter cards, the readers, the
   blocked list, and the courier's lines that name someone (flight log,
   hunger, her slips). One book, built once per screen, answers them all,
   so two screens can never call the same person two different things.

   THE SWITCH DECIDES EVERYTHING. The book is made with the identity switch
   as the caller read it (lib/identity useIdentityOn: app_surfaces
   ('identity', '*', true), or the dev preview):
     OFF  exactly today. The name is the caller's own penPalName ("No.
          4481", with the same upper / compact options), the face is the
          FACE v1 mosaic developed as far as the caller says, no mark, no
          sign, and VoiceOver hears the name alone. Nothing here may change
          a single character of what a screen showed before the switch;
          the tests of every model prove it on their own old expectations.
     ON   the courier name the reader's courier gave them, in the reader's
          language (lib/stranger-name: salt 0, or 1…15 on an exact repeat
          inside the reader's own list, threads oldest first); the frosted
          window (lib/frost FROST v1, Midnight's tones on a dark theme)
          that never develops; the ♀/♂ mark and the star sign the identity
          client answered (lib/identity useMarks / peekMarks); and
          VoiceOver hears "Sunday Kite, she, Gemini".
   A deleted account has no one behind it either way: UNSIGNED (the
   caller's t("ld.unsigned")) and the veil, no mark, no sign.

   MARKS ARRIVE LATE, AND THAT IS FINE. marks_for answers asynchronously
   (and not at all before the owner runs 0034), so a screen first draws a
   stranger with no mark and no sign and redraws when the answer lands.
   Only the two small glyphs appear; the name, the face and the layout are
   already final, so nothing jumps but the glyphs themselves.

   "WAS No. 4481" (plan §1 2a). For fourteen days from this device's first
   launch with the switch on, a pen pal whose thread was opened before that
   launch carries their old number on their Kindreds row, so nobody wakes
   up to a list of strangers they don't recognise. A thread opened after it
   never had a number, and says nothing.

   NEVER A FILTER, NEVER THE LOCK SCREEN. Nothing may sort, hide or choose
   anyone by the mark or the sign. Push, the Live Activity and share cards
   never ask this book anything: they keep their generic words.

   Pure: every word comes in through the caller's t() and penPal(), so the
   models' node tests run it as it is. */

/** What a stranger's face slot draws: today's mosaic (switch off), the frosted window (on), or the veil (no one). */
export type WhoFace = { kind: "mosaic"; mask: number } | { kind: "frost"; spec: FrostSpec } | { kind: "veil" };

/** The mark and the sign beside a stranger's name, with what VoiceOver says for each ("" for none). */
export type WhoMarks = {
  /** the she/he mark (an ink glyph in sub, 6pt after the name); null when off, unknown, they, unset or opted out */
  mark: Mark | null;
  /** VoiceOver's word for the mark ("she", "ella", "女性"); "" for none */
  markLabel: string;
  /** the star sign (a line glyph 4pt after the mark, or where the mark would be); null when off, unknown or opted out */
  sign: Zodiac | null;
  /** VoiceOver's name for the sign ("Gemini"); "" for none */
  signLabel: string;
};

/** A stranger as a screen draws them. */
export type StrangerWho = WhoMarks & {
  /** off: "No. 7273" (penPalName with the caller's options); on: "Sunday Kite"; a deleted account: UNSIGNED */
  name: string;
  face: WhoFace;
  /** what VoiceOver says for them: off, the name; on, "Sunday Kite, she, Gemini" */
  spoken: string;
};

/** No mark, no sign: the switch off, an answer not in yet, they / unset, opted out, blocked. */
export const NO_WHO_MARKS: WhoMarks = Object.freeze({ mark: null, markLabel: "", sign: null, signLabel: "" });

/** How long a pre-switch pen pal keeps "was No. 4481" on their row, from this device's first launch with the switch on. */
export const WAS_DAYS = 14;
const DAY = 864e5;

/** The i18n key of the mark's VoiceOver word (strings-identity). */
export const markKey = (m: Mark): string => "id.mark." + m;

type TFn = (key: string, vars?: Record<string, string | number>) => string;
/** The two options every label has: capitals for mono, and the postmark's no-space "NO.4481" (off only). */
export type NameOpts = { upper?: boolean; compact?: boolean };

/** Everything a book needs. Only `identity`, `t`, `penPal` and `lang` are required. */
export type WhoBookInput = {
  /** the identity switch, as the caller read it */
  identity: boolean;
  t: TFn;
  /** today's label, used whenever the switch is off: lib/format penPalName (a missing id → UNSIGNED) */
  penPal: (uid: string | null | undefined, o: NameOpts) => string;
  /** the reader's language, for the courier names */
  lang: Lang;
  /** the reader's list, resolved once (strangerNamer(threads, lang)); without one every name is salt 0 */
  namer?: StrangerNamer | null;
  /** the locale for capitals; defaults to the runtime's */
  locale?: string;
  /** the identity client's answer per uid (useMarks' lookup); without one, no marks */
  marks?: ((uid: string) => Marks) | null;
  /** a dark theme (Midnight): the frost's dark tones */
  dark?: boolean;
  /** this device's first launch with the switch on (ms); null = not yet known (no "was" lines) */
  firstOnAt?: number | null;
};

/** What a "was No." or a name needs to know about a thread. */
export type WhoThread = {
  other: string | null | undefined;
  revealed?: boolean;
  otherName?: string | null;
  gone?: boolean;
  /** threads.created_at (ms); missing = from before the list carried it, so from before the switch */
  createdAt?: number | null;
};

/** The one place a screen asks who a stranger is. Build it once per screen (useWhoBook) and hand it to the models. */
export type WhoBook = {
  /** the switch this book was made with */
  identity: boolean;
  /** a stranger's name alone: off, penPal with these options; on, the courier name (capitals if `upper`); no id, UNSIGNED */
  name: (uid: string | null | undefined, o?: NameOpts) => string;
  /** the mark and the sign with their VoiceOver words; NO_WHO_MARKS when off, unknown or nothing to show */
  marks: (uid: string | null | undefined) => WhoMarks;
  /** the frosted window's spec when on (null when off, or for no one) */
  frost: (uid: string | null | undefined) => FrostSpec | null;
  /** the face slot: off, the mosaic at `develop` (default 1, fully in); on, the frost; no id, the veil */
  face: (uid: string | null | undefined, o?: { develop?: number }) => WhoFace;
  /** all of it, for one stranger */
  who: (uid: string | null | undefined, o?: NameOpts & { develop?: number }) => StrangerWho;
  /** what VoiceOver says for a name with its mark and sign: "Sunday Kite, she, Gemini" (off: the name) */
  spoken: (w: Pick<StrangerWho, "name" | "markLabel" | "signLabel">) => string;
  /** "was No. 4481" for a pen pal from before the switch, within WAS_DAYS of this device's first launch with it on; else "" */
  was: (th: WhoThread, now?: number) => string;
  /** the courier's lines (flight log, hunger, her slips): a kindred by their pen name, a stranger by name(other) */
  threadName: (th: WhoThread) => string;
};

/**
 * A book of who strangers are for one reader, one language and one switch.
 * Cheap to build; the frost specs it hands out are kept, so a list asking
 * twice gets the same object back (memoised Swift props stay put).
 */
export function whoBook(i: WhoBookInput): WhoBook {
  const on = i.identity;
  const unsigned = i.t("ld.unsigned");
  const frosts = new Map<string, FrostSpec | null>();

  const name = (uid: string | null | undefined, o: NameOpts = {}): string => {
    if (!on) return i.penPal(uid, { upper: !!o.upper, compact: !!o.compact });
    if (!uid) return unsigned;
    const opts = { unsigned, upper: o.upper, locale: i.locale };
    return i.namer ? i.namer.name(uid, opts) : strangerName(uid, { ...opts, lang: i.lang });
  };

  const marks = (uid: string | null | undefined): WhoMarks => {
    if (!on || !uid || !i.marks) return NO_WHO_MARKS;
    const m = i.marks(uid);
    if (!m.mark && !m.sign) return NO_WHO_MARKS;
    return { mark: m.mark, markLabel: m.mark ? i.t(markKey(m.mark)) : "", sign: m.sign, signLabel: m.sign ? i.t(zodiacKey(m.sign)) : "" };
  };

  const frost = (uid: string | null | undefined): FrostSpec | null => {
    if (!on || !uid) return null;
    let s = frosts.get(uid);
    if (s === undefined) {
      s = frostSpec(uid, !!i.dark);
      frosts.set(uid, s);
    }
    return s;
  };

  const face = (uid: string | null | undefined, o: { develop?: number } = {}): WhoFace => {
    if (!uid) return { kind: "veil" };
    if (!on) return { kind: "mosaic", mask: mosaicMask(uid, o.develop ?? 1) };
    const spec = frost(uid);
    return spec ? { kind: "frost", spec } : { kind: "veil" };
  };

  const spoken = (w: Pick<StrangerWho, "name" | "markLabel" | "signLabel">): string =>
    on ? [w.name, w.markLabel, w.signLabel].filter(Boolean).join(", ") : w.name;

  const who = (uid: string | null | undefined, o: NameOpts & { develop?: number } = {}): StrangerWho => {
    const n = name(uid, o);
    const mk = marks(uid);
    return { name: n, ...mk, face: face(uid, o), spoken: spoken({ name: n, markLabel: mk.markLabel, signLabel: mk.signLabel }) };
  };

  const was = (th: WhoThread, now: number = Date.now()): string => {
    const since = i.firstOnAt;
    if (!on || since == null || th.revealed || th.gone || !th.other) return "";
    if (now - since >= WAS_DAYS * DAY || now < since) return "";
    // a thread opened after the first launch with names never wore a number
    if (th.createdAt != null && th.createdAt >= since) return "";
    return i.t("id.was", { no: i.penPal(th.other, {}) });
  };

  const threadName = (th: WhoThread): string => (th.revealed && th.otherName ? th.otherName : name(th.gone ? null : th.other));

  return { identity: on, name, marks, frost, face, who, spoken, was, threadName };
}
