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
   page, not on a row you are scanning.

   KIND AND TONE KEY (step 5). Screens used to tell the brass moment apart
   by comparing the tone's hex, and a SwiftUI screen can't paint a static
   hex anyway: in Midnight the ink is light. So the state also says WHAT
   it is (kind) and which theme colour it wears (toneKey: ind → the
   theme's ind, brass → KBrand brassSeal, mute → the theme's mute). `tone`
   stays for the callers that still paint the static P. */

/** Which of the six answers this is. */
export type ThreadStateKind = "gone" | "swapNames" | "theyWentFirst" | "youWentFirst" | "yourTurn" | "theirTurn";
/** The colour a state wears, as a theme role: ind (the theme's ind), brass (KBrand brassSeal), mute (the theme's mute). */
export type ThreadToneKey = "ind" | "brass" | "mute";

export interface ThreadState {
  /** the sentence, from t() — already upper-case in every language */
  label: string;
  /** static hex for callers still on the static P; new code uses toneKey */
  tone: string;
  /** the theme role to paint the label in */
  toneKey: ThreadToneKey;
  kind: ThreadStateKind;
  /** it is on you — worth a mark on the tab bar and the top of the list */
  needsYou: boolean;
}

/** The facts threadState() reads off a thread. */
export interface ThreadStateFacts {
  mine: number;
  theirs: number;
  revealed: boolean;
  lastSenderMe: boolean;
  iSigned?: boolean;
  theirSigned?: boolean;
  gone?: boolean;
}

/** Per kind: its i18n key, its theme tone and whether it is on you. */
export const THREAD_STATE: Record<ThreadStateKind, { labelKey: string; toneKey: ThreadToneKey; needsYou: boolean }> = {
  gone: { labelKey: "kd.accountClosed", toneKey: "mute", needsYou: false },
  swapNames: { labelKey: "state.swapNames", toneKey: "brass", needsYou: true },
  theyWentFirst: { labelKey: "state.theyWentFirst", toneKey: "brass", needsYou: true },
  youWentFirst: { labelKey: "state.youWentFirst", toneKey: "mute", needsYou: false },
  yourTurn: { labelKey: "state.yourTurn", toneKey: "ind", needsYou: true },
  theirTurn: { labelKey: "state.waitingThem", toneKey: "mute", needsYou: false },
};

const STATIC_TONE: Record<ThreadToneKey, string> = { ind: P.pen, brass: P.brassSeal, mute: P.ink40 };

/** Which state a thread is in — pure, no copy and no colour. */
export function threadStateKind(t: ThreadStateFacts): ThreadStateKind {
  /* they closed their account (0009 nulls their side): readable, never owed —
     the composer is closed, so a turn that can't be taken is not a turn */
  if (t.gone) return "gone";
  /* step 5 — five letters each way, so names may be traded. Only while
     they still can be: once you know each other this question is answered
     and asking it again would be noise. */
  if (!t.revealed && t.mine >= 5 && t.theirs >= 5) {
    /* "went first" rather than "has enclosed their name": the same fact,
       said as courage instead of as a step in a process. Whoever signs
       first is taking the risk, and the copy should know that. */
    if (t.theirSigned) return "theyWentFirst";
    if (t.iSigned) return "youWentFirst";
    return "swapNames";
  }

  /* steps 3, 4 and 6 — whose letter is owed. This applies to kindreds too.
     A first pass returned null the moment a thread was revealed, on the
     theory that the name says everything; it also meant the people you
     care about MOST lost their turn indicator — never sorted to the top,
     never marked, never counted in "waiting on you". Names change what
     you call someone, not whether they are owed a letter. */
  return t.lastSenderMe ? "theirTurn" : "yourTurn";
}

/** The state with its sentence and tone. Never null today; the type keeps the old callers' null checks valid. */
export function threadState(t: ThreadStateFacts): ThreadState | null {
  const kind = threadStateKind(t);
  const s = THREAD_STATE[kind];
  return { label: say(s.labelKey), tone: STATIC_TONE[s.toneKey], toneKey: s.toneKey, kind, needsYou: s.needsYou };
}
