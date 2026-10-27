import type { Draft } from "../../lib/drafts";

/* UNSENT, AS DATA (2026-10-27): the letters you started and didn't send
   (app/drafts.tsx).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — the date and the stamp lookup
   come in through `fmt`, so `node src/screens/drafts/drafts-model.test.ts`
   locks the rules. DraftsNative turns this into the Swift page
   (KDraftsView); the React Native page, the "drafts" switch's fallback,
   does the same inline:

   - the count at the bar's right: two digits once loaded, "··" before;
   - each draft in the order lib/drafts keeps them, its date in capitals,
     its words trimmed;
   - its stamp only when it is one this app knows or a photo stamp (an id
     from nowhere draws nothing, as the page draws nothing), with its
     colour for the Swift fallback frame;
   - what VoiceOver says for a card: "<DATE>. <words>". */

export type DraftsFormat = {
  /** the long date (lib/format dLong) */
  day: (iso: string) => string;
  /** the stamp's colour when the app knows it ("#RRGGBB"), null when it doesn't */
  stampHex: (id: string) => string | null;
  /** a photo stamp's id ("c:<uuid>") */
  isPhotoStamp: (id: string) => boolean;
};

export type DraftCard = {
  id: string;
  /** "OCTOBER 27, 2026" */
  date: string;
  words: string;
  /** "" when the card shows no stamp */
  stamp: string;
  /** a known stamp's colour, "" otherwise */
  stampHex: string;
  a11y: string;
};

export const draftsCount = (loaded: boolean, n: number): string => (loaded ? String(n).padStart(2, "0") : "··");

export function draftCards(drafts: readonly Draft[], fmt: DraftsFormat): DraftCard[] {
  return drafts.map((d) => {
    const date = fmt.day(d.date).toUpperCase();
    const words = d.body.trim();
    const hex = d.stamp ? fmt.stampHex(d.stamp) : null;
    const shows = !!d.stamp && (hex != null || fmt.isPhotoStamp(d.stamp));
    return { id: d.id, date, words, stamp: shows ? d.stamp : "", stampHex: hex ?? "", a11y: `${date}. ${words}` };
  });
}
