import type { ThreadDetail, ThreadMessage } from "../../lib/db";
import type { TFn } from "../../lib/format";
import type { ThreadDetailStatus } from "../../lib/thread-detail-core";
import { LETTER_MAX, REPLY_MIN, letterTier, weightedCount } from "../../lib/weighted-count";
import { translateCode } from "../../components/10a/kit";
import { developFor } from "../../lib/mosaic";
import type { StrangerWho, WhoBook } from "../../lib/stranger-who";
import { OPENING_KEY, conversation, isOpening } from "./build-items";

/* THE ONE-LETTER READER'S RULES, WITHOUT REACT (10a step 5, slice chat-rn).
   ────────────────────────────────────────────────────────────────────────
   thread/[id] stays React Native (owner): one letter, full page, in the
   10a letter card and the reader's Letter font. What it shows is decided
   here, as plain functions, so `node src/screens/chat/reader.test.ts`
   holds the four known bugs fixed:

   · KNOWN 2 — the voice opening. A thread opened by replying to a voice
     letter starts with that reply, so the old `conv.length === 1` test
     hid the voice card almost at once. Whenever the opening is a voice
     letter (detail.openingMedia) it plays — as the hero and among the
     earlier letters.
   · KNOWN 3 — a hard-coded "AUG 11" stood in for the opening's date. The
     opening's own date is detail.openingAt (0020, threads.letter); never
     detail.since, the first reply's date (critic: it would stamp the
     reply's day on the stranger's letter). No date known: no date shown.
   · KNOWN 4 — a deleted correspondent. Every ghost got the same
     "No. ####" (postNo(null)), the composer stayed open and the send
     failure blamed the moment. Now: UNSIGNED, the veil (a null seed),
     ACCOUNT CLOSED (threadState with gone) and ch.gone where the composer
     was — readable, not actionable. A thread the server calls missing is
     closed the same way, in place.
   · The hero is the letter that was tapped: ?m=<message id | "opening">,
     with ?i= (an index) kept for older links, else their latest, else the
     newest.

   WHO WROTE IT (identity Phase 1): a pen pal is named by the screen's book
   (lib/stranger-who, ReaderFormat.who). Switch off, or no book: their
   number, exactly as before. Switch on: the courier name in the postmark
   and on each letter's signature, the frost, the ♀/♂ mark and the star
   sign beside the name in the header (correspondentWho), the reply bar
   addressed to the courier name, and the reply hint in its new words
   (no gendered pronoun for the person).

   Also: translate is offered only on their words in another language
   (critic: it was offered on my own letters and on English to English),
   never on a voice card; the reply hint says over-the-limit in red or
   where the reply goes. Every word comes from the caller's t() and every
   date from its formatters (build-items' rule), so nothing here loads
   i18n. */

/** The reader's letters: the opening (words, or a voice letter), then the messages. */
export const readerLetters = (d: ThreadDetail | null): ThreadMessage[] => conversation(d);

/** A letter's key in the reader's link: its id, or "opening". */
export function letterLinkKey(m: ThreadMessage): string {
  if (m.id) return m.id;
  return isOpening(m) ? OPENING_KEY : "";
}

/** Which letter is the hero: ?m= (an id or "opening"), else ?i= (an index), else their latest,
    else the newest. -1 for none (nothing loaded). */
export function heroIndex(conv: readonly ThreadMessage[], q: { m?: string | null; i?: string | null }): number {
  if (!conv.length) return -1;
  if (q.m) {
    const at = q.m === OPENING_KEY ? conv.findIndex((x) => isOpening(x)) : conv.findIndex((x) => x.id === q.m);
    if (at >= 0) return at;
  }
  const asked = q.i != null && q.i !== "" ? Number(q.i) : NaN;
  if (Number.isInteger(asked) && asked >= 0 && asked < conv.length) return asked;
  for (let k = conv.length - 1; k >= 0; k--) if (!conv[k].mine) return k;
  return conv.length - 1;
}

/** The opening is a voice letter here (known bug 2): wherever it shows, it plays. */
export const isVoiceLetter = (m: ThreadMessage | null | undefined, d: ThreadDetail | null): boolean => !!m && !!d?.openingMedia && isOpening(m);

/** Their side has no one behind it: the account is gone (0009), or the id never arrived. */
export const isUnsigned = (d: ThreadDetail | null): boolean => !d || !!d.gone || !d.other;

export type ReaderFormat = {
  t: TFn;
  locale: string;
  /** the rubber-stamp date: "OCT.14", "14.OKT" (lib/format postmark) */
  postmark: (iso: string) => string;
  /** a pen pal's number for an id, upper-case and compact ("NO.7273"; lib/format penPalName) */
  penPal: (other: string) => string;
  /** who strangers are (lib/who useWhoBook); absent or switched off = the number, as before */
  who?: WhoBook;
};

/** What they are called here: their name once traded, UNSIGNED for a deleted account, else
    their number (switch on, the courier name). Upper-case: it is set in mono. */
export function correspondentLabel(d: ThreadDetail, f: ReaderFormat): string {
  if (d.revealed && !d.gone) return (d.otherName || f.t("cm.kindred")).toLocaleUpperCase(f.locale);
  if (isUnsigned(d)) return f.t("ld.unsigned");
  return f.who?.identity ? f.who.name(d.other, { upper: true, compact: true }) : f.penPal(d.other);
}

/** The pen pal in the header, as the book gives them (the face slot, the name, the mark and the
    sign, VoiceOver's words): null once names are traded (a kindred's own face and name), and null
    without a book. A deleted account is UNSIGNED behind the veil. Switch off, the mosaic develops
    with their letters, as the header always drew it. */
export function correspondentWho(d: ThreadDetail | null, f: Pick<ReaderFormat, "who">): StrangerWho | null {
  if (!d || !f.who || (d.revealed && !d.gone)) return null;
  return f.who.who(isUnsigned(d) ? null : d.other, { develop: developFor(d.otherCount) });
}

/** Who signed a letter: YOU, or them as correspondentLabel says. */
export const signatureOf = (m: ThreadMessage, d: ThreadDetail, f: ReaderFormat): string => (m.mine ? f.t("ui.you") : correspondentLabel(d, f));

/** A letter's date: its own; the opening's own (openingAt, never since — known bug 3); "" when
    none is known. */
export function letterDate(m: ThreadMessage, d: ThreadDetail, f: Pick<ReaderFormat, "postmark">): string {
  if (isOpening(m)) return d.openingAt ? f.postmark(d.openingAt) : "";
  return m.date ? f.postmark(m.date) : "";
}

/** The postmark over the hero: "OCT.14 · NO.7273", "OCT.14 · YOU", or just who wrote it when no
    date is known. */
export function postmarkLine(m: ThreadMessage, d: ThreadDetail, f: ReaderFormat): string {
  return [letterDate(m, d, f), signatureOf(m, d, f)].filter((s) => !!s).join(" · ");
}

/** The header's title: how many letters the thread holds. */
export const readerTitle = (n: number, t: TFn): string => (n === 1 ? t("th.inThreadOne", { n }) : t("th.inThreadMany", { n }));

/** The hero's type: the letter tiers (a telegram centred, a letter, a long one), on the words
    being shown (the translation when it is on). */
export const heroTier = (shown: string): { size: number; line: number; center: boolean } => letterTier(weightedCount(shown || ""));

/** Translate is offered on their words in another language, never on mine, never on a voice
    card, never on an empty letter (critic: it showed on everything). */
export function offersTranslate(m: ThreadMessage | null | undefined, d: ThreadDetail | null, canTranslate: (body: string) => boolean): boolean {
  if (!m || m.mine || isVoiceLetter(m, d)) return false;
  const body = m.body.trim();
  return !!body && canTranslate(body);
}

/** The capsule's language code: their language → yours ("ES→EN"), turned round once
    translated; "" when their language can't be told (the capsule shows its words alone). */
export function capsuleCode(from: string | null, to: string, translated: boolean): string {
  if (!from || from === to) return "";
  return translateCode(from, to, translated);
}

/** Something can still be sent here: someone is on the other side and the server knows the
    thread (readable, not actionable — owner). */
export function canWriteHere(d: ThreadDetail | null, status: ThreadDetailStatus): boolean {
  return !!d && !isUnsigned(d) && status !== "missing";
}

/** The line where the composer was, when it can't be: ch.gone for a deleted account, the closed
    line for a thread the server calls missing; "" while it can be written in (or nothing is
    known yet). */
export function closedLine(d: ThreadDetail | null, status: ThreadDetailStatus, t: TFn): string {
  if (d && (d.gone || !d.other)) return t("ch.gone");
  if (status === "missing") return t("fail.closed.body");
  return "";
}

/** The reply's words may go: 2..1000 weighted, not while one is going. */
export function replyCanSend(text: string, sending: boolean): boolean {
  const w = weightedCount(text);
  return w >= REPLY_MIN && w <= LETTER_MAX && !sending;
}

/** The hint under the reply strip (H:125): over the limit in red, else where the reply goes (switch
    on: the id.th.* words, which never give the person a gender — pt said "PARA ELA"). */
export function replyHint(text: string, revealed: boolean, t: TFn, identity = false): { text: string; alarm: boolean } {
  const over = weightedCount(text) - LETTER_MAX;
  if (over > 0) return { text: t("th.over", { n: over }), alarm: true };
  const key = revealed ? "th.goesStraight" : "th.replyGoesStraight";
  return { text: t(identity ? "id." + key : key), alarm: false };
}

/** The reply strip's placeholder: their name once traded, else "write back to them" — or, with the
    switch on (`who`), "write back to Sunday Kite…", as the desk addresses it, in a language that has
    that line (`has`, i18n hasString: ld.writeBackTo is English-only for now; elsewhere the reader's
    own "write back to them" stays, as on the desk). */
export function replyPlaceholder(d: ThreadDetail | null, t: TFn, who?: WhoBook, has?: (key: string) => boolean): string {
  if (d?.revealed && !d.gone) return t("th.sayTo", { name: d.otherName || t("cm.kindred") });
  if (who?.identity && d && !isUnsigned(d) && (has?.("ld.writeBackTo") ?? true)) return t("ld.writeBackTo", { name: who.name(d.other) });
  return t("th.writeBackThem");
}

/** Where Dynamic Type's accessibility sizes begin, as React Native's fontScale reads them (AX1 is
    about 1.6 on iOS; xxxLarge 1.35 is the last size the one-line rows still hold). */
export const AX_FONT_SCALE = 1.35;

/** At accessibility sizes the head row's postmark and state wrap instead of truncating, and the
    kindred page's facts stack label over value (review: design-7). */
export const largeType = (fontScale: number): boolean => fontScale > AX_FONT_SCALE;
