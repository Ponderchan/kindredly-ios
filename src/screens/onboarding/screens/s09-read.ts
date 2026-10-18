import { useMemo } from "react";
import type { WrenMood } from "../../../components/WrenBird";
import { hatch, type HatchResult } from "../../../lib/hatch-engine";
import { hatchlingForm, type HatchlingForm } from "../../../lib/hatchling-form";
import { getLang, t } from "../../../lib/i18n";
import { readMood } from "../../../lib/wren-read";

/* WHAT THE EGG READ IN YOUR LETTER (screens 9–13).
   ────────────────────────────────────────────────────────────────────────
   The bird is written, not chosen: the hatch engine reads the one letter
   you wrote on 7 (lib/hatch-engine hatch([letter])) and that read decides
   its proportions (lib/hatchling-form), what it does on its own (the
   dims, for HatchlingRig's idle motions) and its face at rest (lib/
   wren-read readMood). finish() reads the same letter the same way when it
   saves the bird, so the chick on 9, 10, 11, 12 and 13 is the chick that
   lives on Today. Pure and cheap; memoised per letter. */

/** the dimensions shown as a phrase rather than a label (the old run's list, kept) */
const SEALED = new Set(["rhythm", "vocabulary", "perspective", "emotion", "function", "punctuation", "structure", "sentence", "quirks"]);

export type HatchRead = { read: HatchResult; form: HatchlingForm; mood: WrenMood; dimPhrase: string };

export function useHatchRead(letter: string): HatchRead {
  return useMemo(() => {
    const read = hatch([letter]);
    const d0 = read.dims[0];
    return {
      read,
      form: hatchlingForm(read.dims),
      mood: readMood(letter),
      // what it caught first, as words in a sentence (ob.born.word's {dim}), never a tag
      dimPhrase: d0 ? (SEALED.has(d0.key) ? t(`ob.sealed.${d0.key}`) : d0.label.toLowerCase()) : t("ob.sealed.rhythm"),
    };
  }, [letter]);
}

/* THE OLD RUN'S TWO-PART LINES, AS ONE. The kept keys come in halves for the old run's serif
   with an italic second half ("Something" / "hatched.", "{name}'s" / "first flight."); the new
   run sets them in one weight, so they are joined — with a space, except in Japanese, which
   writes them together (何かが孵った。, Otisの初飛行。). */
export function keptLine(plain: string, em: string, vars?: Record<string, string>): string {
  return `${t(plain, vars)}${getLang() === "ja" ? "" : " "}${t(em, vars)}`;
}
