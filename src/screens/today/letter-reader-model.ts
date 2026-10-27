/* THE UNFOLDED LETTER, AS DATA (the rules both of its renderers draw from).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — every word comes in already
   translated, so
     node src/screens/today/letter-reader-model.test.ts
   locks the rules. LetterReader (React Native, the "letterreader" switch's
   fallback) and LetterReaderNative (SwiftUI, KLetterReaderView) both read
   the letter, its docket's VoiceOver line, the reply bar's placeholder and
   hint, and what a send does, from here. */

/** What the reader needs of a desk card (today-cards CardVM). */
export type ReaderCard = {
  isVoice: boolean;
  /** the voice letter's caption ("" for the default one) */
  caption: string;
  /** the text the card shows: the translation when it is on */
  body: string;
  /** "SEP.23 · NO.7273" (the identity switch off) */
  postmark: string;
  /** "SEP.23" */
  when: string;
  /** "write back to No. 7273…", or "" */
  replyPlaceholder: string;
  who: { spoken: string };
};

/** The letter as the reader shows it: what the card showed (the translation, if it was turned on);
    a voice letter shows its caption. */
export function readerText(card: Pick<ReaderCard, "isVoice" | "caption" | "body">): string {
  return card.isVoice ? card.caption : card.body;
}

/** The docket as VoiceOver reads it: with the identity switch on, the writer and the date as one
    element ("Sunday Kite, she, Gemini. SEP.23"); off, the postmark line as it is written. */
export function readerDocketA11y(card: Pick<ReaderCard, "postmark" | "when" | "who">, identity: boolean): string {
  return identity ? `${card.who.spoken}. ${card.when}` : card.postmark;
}

/** The reply bar's placeholder: the letter's own ("write back to No. 7273…"), else the desk's. */
export function readerPlaceholder(card: Pick<ReaderCard, "replyPlaceholder">, fallback: string): string {
  return card.replyPlaceholder || fallback;
}

/** The desk's reply hint in the bar's capitals, in the reader's locale (the headwind line is
    written in lower case for its other places). */
export function readerHint(hint: string, locale: string): string {
  return hint.toLocaleUpperCase(locale);
}

/** A send from the reader closes it (the letter is answered: Wren takes it off the band and
    "Reply sent." shows on the desk) — unless the pouch is full, where SEND only explains and the
    reader stays under the sheet that says why. */
export function readerClosesOnSend(state: { pouchFull: boolean }): boolean {
  return !state.pouchFull;
}
