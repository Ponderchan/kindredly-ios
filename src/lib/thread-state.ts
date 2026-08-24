import { P } from "../theme/post";

/* WHAT THIS CORRESPONDENCE NEEDS FROM YOU — one sentence, one place.
   ────────────────────────────────────────────────────────────────────────
   The product is six steps: read a stranger's letter · write back and a
   private line opens · they answer · you write to each other · at five
   letters each you may trade names · once you have, they're a kindred.

   The screens had drifted to twelve different sentences for those six
   steps — the row said one thing, the header another, the plate a third,
   all about the same state. Every string below is used verbatim wherever
   this state is shown, so there is one vocabulary to learn instead of one
   per screen. Anything that is not an answer to "what do I do now?" (how
   well you know them, how far they've come into view) belongs on their
   page, not on a row you are scanning. */

export interface ThreadState {
  label: string;
  tone: string;
  /** it is on you — worth a mark on the tab bar and the top of the list */
  needsYou: boolean;
}

export function threadState(t: {
  mine: number;
  theirs: number;
  revealed: boolean;
  lastSenderMe: boolean;
  iSigned?: boolean;
  theirSigned?: boolean;
}): ThreadState | null {
  // step 6 — you know each other. The name says it; nothing else is needed.
  if (t.revealed) return null;

  // step 5 — five letters each way, so names may be traded
  if (t.mine >= 5 && t.theirs >= 5) {
    if (t.theirSigned) return { label: "THEY'VE PUT THEIR NAME IN", tone: P.brassSeal, needsYou: true };
    if (t.iSigned) return { label: "WAITING ON THEIR NAME", tone: P.ink40, needsYou: false };
    return { label: "YOU CAN TRADE NAMES", tone: P.brassSeal, needsYou: true };
  }

  // steps 3 and 4 — whose letter is owed
  return t.lastSenderMe
    ? { label: "WAITING ON THEM", tone: P.ink40, needsYou: false }
    : { label: "YOUR TURN", tone: P.pen, needsYou: true };
}
