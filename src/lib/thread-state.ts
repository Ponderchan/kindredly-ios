import { P } from "../theme/post";
// `t` is taken here — the thread itself is called t in this file
import { t as say } from "./i18n";

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
  gone?: boolean;
}): ThreadState | null {
  /* they closed their account (0009 nulls their side): readable, never owed —
     the composer is closed, so a turn that can't be taken is not a turn */
  if (t.gone) return { label: say("kd.accountClosed"), tone: P.ink40, needsYou: false };
  /* step 5 — five letters each way, so names may be traded. Only while
     they still can be: once you know each other this question is answered
     and asking it again would be noise. */
  if (!t.revealed && t.mine >= 5 && t.theirs >= 5) {
    /* "went first" rather than "has enclosed their name": the same fact,
       said as courage instead of as a step in a process. Whoever signs
       first is taking the risk, and the copy should know that. */
    if (t.theirSigned) return { label: say("state.theyWentFirst"), tone: P.brassSeal, needsYou: true };
    if (t.iSigned) return { label: say("state.youWentFirst"), tone: P.ink40, needsYou: false };
    return { label: say("state.swapNames"), tone: P.brassSeal, needsYou: true };
  }

  /* steps 3, 4 and 6 — whose letter is owed. This applies to kindreds too.
     A first pass returned null the moment a thread was revealed, on the
     theory that the name says everything; it also meant the people you
     care about MOST lost their turn indicator — never sorted to the top,
     never marked, never counted in "waiting on you". Names change what
     you call someone, not whether they are owed a letter. */
  return t.lastSenderMe
    ? { label: say("state.waitingThem"), tone: P.ink40, needsYou: false }
    : { label: say("state.yourTurn"), tone: P.pen, needsYou: true };
}
