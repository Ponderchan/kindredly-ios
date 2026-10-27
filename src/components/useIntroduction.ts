import { useEffect, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";
import { ritualDoneAt } from "./IntroductionRitual";
import { introductionWords, type IntroductionWords } from "./introduction-model";
import { useSignatureHold, type SignatureHold } from "./SignatureHold";
import type { SignedPair } from "../lib/signed-sides";
import { dShort } from "../lib/format";
import { stickerName } from "../lib/sticker-copy";
import type { ThreadMessage } from "../lib/db";
import { roadFact, type KindredNotice } from "../lib/kindred-read";
import { t } from "../lib/i18n";
import "../data/strings-step5-chat"; // in.meFallback, in.knowYouUnsigned
import "../data/strings-identity2"; // id2.in.*, id2.rp.signature
import "../data/strings-a11y-chat"; // in.a11yOff

/* WHAT BOTH INTRODUCTION SHEETS SHARE (components/Introduction: the React Native body, and
   IntroductionNative: the SwiftUI one behind "introritual"): Reduce Motion, when the ritual is
   done (and their signature may be held), the hold and its Report / Block card, and every word
   (introduction-model). One hook, so the two sheets can't say or time anything differently. */

export type IntroductionProps = {
  open: boolean;
  wren: string;
  otherSeed: string;
  otherFace?: string | null;
  otherName: string;
  /** the read of their writing — the part a name could never have said */
  otherArchetype?: string | null;
  /** the reader's own pen name, or "" when they have none */
  myName: string;
  /** the letters that bought this, oldest first — five each way */
  road?: ThreadMessage[];
  mySeed?: string;
  myFace?: string | null;
  /** what Wren noticed about the two of you — counted from their letters */
  notice?: KindredNotice | null;
  /** the day the names met */
  since?: string;
  /** the stamp the correspondence opened under */
  stamp?: string | null;
  /** identity on: what each side signed (lib/signed-sides); null/absent = today's mosaic ritual */
  signed?: SignedPair | null;
  /** identity on: who a held signature is reported about, and where a block goes */
  report?: { threadId?: string | null; targetUser?: string | null; onBlocked?: () => void };
  /** dev preview only: force Reduce Motion on or off (else the system's setting) */
  reducedMotion?: boolean;
  onClose: () => void;
  /** the exit isn't "dismiss" — it's the door into the room */
  onTalk: () => void;
};

export type IntroductionCore = {
  /** Reduce Motion (the dev preview's override, else the system's) */
  still: boolean;
  /** when the ritual showing is done: the "noticed" line fades in then */
  doneAt: number;
  hold: SignatureHold;
  /** the signed ritual is done and their signature may be held */
  holdable: boolean;
  words: IntroductionWords;
};

export function useIntroduction(props: IntroductionProps): IntroductionCore {
  const { open, wren, otherName, myName, road = [], notice = null, since = new Date().toISOString(), signed = null, report, reducedMotion } = props;
  const systemStill = useReducedMotion();
  const still = reducedMotion ?? systemStill;
  const doneAt = ritualDoneAt(!!signed, still);
  /* the signed ritual's end state, when their signature may be held (and VoiceOver offers it) */
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDone(false);
    if (!open || !signed) return;
    const id = setTimeout(() => setDone(true), doneAt);
    return () => clearTimeout(id);
  }, [open, signed, doneAt]);
  const hold = useSignatureHold({
    threadId: report?.threadId,
    targetUser: signed ? report?.targetUser : null,
    onBlocked: report?.onBlocked,
    inSheet: true,
  });
  // what was signed, when it was: the line under the ritual and TALK TO follow it
  const words = introductionWords(
    { wren, otherName, myName, signed, roadLetters: road.length, since, notice, fact: notice ? null : roadFact(road) },
    { t, day: dShort, stickerName },
  );
  const holdable = !!signed && done && hold.can;
  return { still, doneAt, hold, holdable, words };
}
