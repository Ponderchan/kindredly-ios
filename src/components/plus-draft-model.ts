import type { Draft } from "../lib/drafts";

/* THE + OFFERS YOUR DRAFT — ITS RULES (owner's audit, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   WHY. An unsent letter is kept as a draft (lib/drafts), but the only ways
   back to it were Me → letters → Drafts and Settings → Unsent letters. A
   reader with a half-written letter pressed the + and was handed a blank
   page. So when at least one draft exists, the + tray (NativeTabBar, the
   owner's P2) grows one more row above Letter: "Continue your draft", with
   the draft's own first words under it, and it opens the composer on that
   draft exactly as the drafts page does (/compose?draft=<id>).

   Pure: no React, no React Native, no i18n, so
   `node src/components/plus-draft-model.test.ts` locks the rules:

   - WHICH DRAFT: the one touched last (its `date`, an ISO string), whatever
     order the list is in — saveDraft puts a new draft first but updates an
     old one in place, so the first in the list is not always the newest.
     With equal dates the earlier in the list wins (lib/drafts' own order).
   - ITS WORDS: the letter's text on one line (every run of spaces and line
     breaks is one space), cut at DRAFT_WORDS_MAX characters on a word's
     edge with an ellipsis; Swift truncates what doesn't fit the row, and
     VoiceOver reads this much and no more. A draft with no letter text but
     a question (compose's ask) shows the question. With neither, "" — the
     holder then says ml.draftEmpty, My letters' own line for it. Drafts
     are text only (a recording or a photo doesn't survive as a draft), so
     there is no other case.
   - THE COUNT at the row's end: nothing for one draft, the number for
     several ("3"). The newest still opens.
   - WHERE A ROW GOES (plusRoute), ONE RULE FOR THE DAY'S COUNT: with no
     letters left today the Letter row goes to the paywall (the compose
     page's own cap link), and so does the draft row — a draft is not a way
     around the daily count. The composer keeps its own guard as well (its
     cap panel, and the server's bump-letters before the send), so the
     drafts page opening a draft at zero is still safe; this only keeps the
     + from offering a door the Letter row beside it has closed. Note is
     never capped.
   - Anything the stored list holds that isn't a draft (no id) is skipped:
     the list is parsed JSON, not a checked shape. */

/** what the tray reports for the draft row (KPublishAction.draft in ios/Portable/KPlusPanel.swift) */
export const PLUS_DRAFT_KEY = "draft";
/** what it reports for the letter row */
export const PLUS_LETTER_KEY = "letter";

/** where Letter, and a draft, go with no letters left today: the compose page's own cap link */
export const PLUS_PAYWALL = "/paywall?src=daily_cap";

/** the most of a draft's words the row is sent (and VoiceOver reads) */
export const DRAFT_WORDS_MAX = 80;

export type PlusDraft = {
  /** the draft the row opens */
  id: string;
  /** its first words on one line; "" when it has none */
  words: string;
  /** how many drafts there are in all */
  count: number;
};

/** A text's first words on one line: spaces and line breaks collapsed, cut at `max` characters
    (whole ones: an emoji is never split) on a word's edge when there is one near, then "…". */
export function firstWords(text: unknown, max: number = DRAFT_WORDS_MAX): string {
  if (typeof text !== "string") return "";
  const line = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(line);
  if (chars.length <= max) return line;
  let cut = chars.slice(0, max).join("");
  // back to the last whole word, unless that throws away most of the line (one long word, or
  // a language written without spaces)
  const space = cut.lastIndexOf(" ");
  if (space >= cut.length * 0.6) cut = cut.slice(0, space);
  return `${cut.trimEnd()}…`;
}

/** The draft the + offers: the one touched last, with its first words and how many there are.
    null with no drafts (the tray is then exactly the two rows it was). */
export function plusDraft(drafts: readonly Draft[] | null | undefined): PlusDraft | null {
  if (!Array.isArray(drafts)) return null;
  const real = (drafts as readonly unknown[]).filter((d): d is Draft => !!d && typeof d === "object" && typeof (d as Draft).id === "string" && (d as Draft).id !== "");
  if (real.length === 0) return null;
  const when = (d: Draft) => (typeof d.date === "string" ? d.date : "");
  let newest = real[0];
  for (const d of real) if (when(d) > when(newest)) newest = d;
  return { id: newest.id, words: firstWords(newest.body) || firstWords(newest.ask), count: real.length };
}

/** The figure at the row's end: nothing for one draft, the number for several. */
export function plusDraftCount(count: number): string {
  return count > 1 ? String(Math.floor(count)) : "";
}

/** Where a row of the + goes, or null for nowhere (a key nobody knows, or a draft row with no
    draft behind it). `left` is the free plan's letters left today (null: no count — First Class,
    a guest, or one that couldn't be read); `routes` is the holder's own table for the rest. */
export function plusRoute(key: string, p: { left: number | null; draftId: string | null; routes: Readonly<Record<string, string>> }): string | null {
  const isDraft = key === PLUS_DRAFT_KEY;
  if (isDraft && !p.draftId) return null;
  // one rule for the day's count: none left closes every way into a letter from here
  if ((isDraft || key === PLUS_LETTER_KEY) && p.left === 0) return PLUS_PAYWALL;
  // the drafts page's own route and param (app/drafts.tsx, letters-model)
  if (isDraft) return `/compose?draft=${encodeURIComponent(p.draftId as string)}`;
  return p.routes[key] ?? null;
}
