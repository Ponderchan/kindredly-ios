import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MONO, PFM } from "../theme/post";
import { useLetterFamily, useP, useTheme } from "../lib/theme";
import { AvatarImage } from "./AvatarImage";
import { ritualDoneAt } from "./IntroductionRitual";
import { CeremonyRitual } from "./IntroductionRitualNative";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useSignatureHold } from "./SignatureHold";
import type { SignedPair } from "../lib/signed-sides";
import { dShort } from "../lib/format";
import { stickerName } from "../lib/sticker-copy";
import type { ThreadMessage } from "../lib/db";
import { roadFact, type KindredNotice } from "../lib/kindred-read";
import { t, useLang } from "../lib/i18n";
import { dismissKeyboard } from "../lib/keyboard";
import { WrenBird } from "./WrenBird";
import "../data/strings-step5-chat"; // in.meFallback, in.knowYouUnsigned
import "../data/strings-identity2"; // id2.in.*, id2.rp.signature
import "../data/strings-a11y-chat"; // in.a11yOff

/* Wren's introduction — the ceremony that replaces the reveal toast.
   ────────────────────────────────────────────────────────────────────────
   Two signatures met, and the biggest moment in the product used to be a
   toast: "you're no longer strangers." A toast is how a system reports;
   this is a thing that happened between three parties — two people and
   the bird who carried every letter — so it arrives as what it is: a
   letter from her.

   She's the one character who has known you both all along, so she does
   the introducing. Her voice is the serif italic she always speaks in;
   the NAME is set in the letter face, because a name is a thing a person
   gave. The face above it is the same mosaic you watched come into view,
   finally next to what it was becoming.

   The sheet is a page of the theme: its ground and type come from it, and
   the one button is the 10a main action — the theme's ind with its label
   in the page colour (the 10a colour for type on an ind fill), corners 14.

   10a (step 5): no rule under the header (the owner took the rules away;
   the ground does the separating), mono on the 9/10/11 sizes, the × named
   for VoiceOver. Whoever arrives after the second signature gets this —
   the room runs it too now (useCeremony), so the one who signed FIRST
   sees it; the callers pass the reader's own pen name ("" when they have
   none) and the day the names met (revealed_at), never today. Without a pen
   name the ritual labels their face with a lower-case "you" in their
   language (in.meFallback) and the line under it has its own sentence
   (in.knowYouUnsigned): a "you" dropped into in.knowYou takes the wrong case
   in German, Italian or Korean ("dich" in the sentence, "du" on the label).

   IDENTITY ON (Phase 2, `signed`): the ritual wipes the frosted windows
   clear and draws both signatures in (IntroductionRitual), and the words
   around it follow what was actually SIGNED — the line under it is
   in.knowYou with my pen name as they received it, TALK TO says theirs.
   VoiceOver hears the whole ritual as one sentence: who signed as whom,
   both ways, and since when (id2.in.a11y / a11yMine + the chip). Once it
   is done their signature can be held (450ms) for Report this signature /
   Block — and VoiceOver has the same two as actions on that sentence; the
   card is drawn inside this sheet (SignatureHold), and a block closes the
   ceremony for Kindreds (`report.onBlocked`). Under Reduce Motion the end
   state cross-fades in, done by 1600, and the "noticed" line waits for
   whichever ritual is showing (ritualDoneAt). `signed` absent: today's
   ritual and words, exactly.

   SWIFT (owner, 2026-10-26; 1.0.7): with `signed`, the ritual itself is
   drawn by SwiftUI behind the "ceremony" switch (CeremonyRitual in
   IntroductionRitualNative), on the same clock; this sheet, its words, its
   button and the Report / Block card stay React Native either way, and
   VoiceOver also hears the sentence announced once the ritual is done. */
export function Introduction({
  open,
  wren,
  otherSeed,
  otherFace,
  otherName,
  otherArchetype,
  myName,
  road = [],
  mySeed = "me",
  myFace = null,
  notice = null,
  since = new Date().toISOString(),
  stamp = null,
  signed = null,
  report,
  reducedMotion,
  onClose,
  onTalk,
}: {
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
}) {
  useLang(); // repaint when the reader changes language
  /* it rises on its own (the second signature landing, a room opened after the reveal), not from a
     tap that already let go of the keyboard: put it away, whoever holds it (lib/keyboard) */
  useEffect(() => {
    if (open) dismissKeyboard();
  }, [open]);
  const P = useP();
  // Wren's words here are content: the reader's Letter font (her two lines in its italic)
  const face = useLetterFamily();
  const wrenFace = useLetterFamily(true);
  const tk = useTheme().t;
  const insets = useSafeAreaInsets();
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
  const theirName = signed ? signed.theirs.name : otherName;
  const meName = signed ? signed.mine.name : myName;
  const ritualA11y = signed
    ? [
        t("id2.in.a11y", { name: signed.theirs.courier, pen: signed.theirs.name }),
        t("id2.in.a11yMine", { name: signed.mine.courier, pen: signed.mine.name || t("in.meFallback") }),
        t("in.sinceChip", { date: dShort(since).toUpperCase() }),
      ].join(" ")
    : /* the mosaic ritual (no signatures: the switch off, or names traded before it) is one
         sentence too, not the jumping counts, ten envelopes' dates and a half-typed name */
      [
        road.length ? t("in.a11yOff", { n: road.length, name: otherName }) : otherName,
        t("in.sinceChip", { date: dShort(since).toUpperCase() }),
      ]
        .filter(Boolean)
        .join(" ");
  const holdable = !!signed && done && hold.can;
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12 }}>
          {/* the sheet's title, as every secondary title: System 500 17, centred (the ✕'s width
              mirrored on the left keeps it on the middle) */}
          <View style={{ width: 24 }} />
          <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, fontWeight: "500", textAlign: "center", color: P.ink }}>
            {t("intro.carriedBy", { name: wren })}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")} style={{ width: 24, alignItems: "flex-end" }}>
            <Text style={{ ...PFM.mono, fontSize: 16, color: P.ink40 }}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 30, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <WrenBird size={44} mood="content" stage="wren" />

          <Text style={{ ...wrenFace, fontSize: 16.5, lineHeight: 26, color: P.ink60, marginTop: 18 }}>
            {t("intro.body")}
          </Text>

          {/* THE RITUAL — four beats: the ten letters stamped in order, the
              mosaic flying into a postmark, the name typed into it by •>,
              and both faces resolving side by side. Identity on: the road,
              the frost wiped clear, the courier names struck, the two
              signatures drawn in, the bump — one VoiceOver sentence. */}
          <View
            style={{ marginTop: 22, marginBottom: 4 }}
            {...(ritualA11y
              ? {
                  accessible: true,
                  accessibilityLabel: ritualA11y,
                  accessibilityActions: holdable ? hold.actions : undefined,
                  onAccessibilityAction: hold.onAction,
                }
              : null)}
          >
            {/* Swift where it can be (the "ceremony" switch, both sides signed), else React Native's */}
            <CeremonyRitual
              road={road}
              otherSeed={otherSeed}
              otherFace={otherFace}
              otherName={otherName}
              mySeed={mySeed}
              myFace={myFace}
              myName={myName || t("in.meFallback")}
              since={since}
              stamp={stamp}
              notice={notice}
              signed={signed}
              still={still}
              holdable={holdable}
              onHoldTheirs={hold.open}
              announce={ritualA11y}
            />
          </View>

          {/* what she noticed — a label you both wear, or their strongest;
              and when five letters were too few for any label, what the
              road itself says. Counted, never generated. */}
          {(() => {
            const fact = notice ? null : roadFact(road);
            if (!notice && !fact) return null;
            const line = notice
              ? notice.shared
                ? t("in.both", { label: stickerName(notice.stickerId), n: notice.supporting, m: notice.eligible })
                : t("in.theirs", { name: theirName, label: stickerName(notice.stickerId), n: notice.supporting, m: notice.eligible })
              : fact!.nightTheirs > 0
                ? t("in.roadNight", { n: fact!.letters, d: fact!.days, k: fact!.nightTheirs })
                : t("in.roadWait", { n: fact!.letters, d: fact!.days, g: fact!.longestWaitDays });
            return (
              <Animated.View entering={FadeIn.duration(500).delay(doneAt)} style={{ marginTop: 10, alignItems: "center", paddingHorizontal: 8 }}>
                <Text style={{ ...PFM.monoSemi, fontSize: MONO.label, letterSpacing: MONO.label * 0.16, color: P.pen }}>{t("in.noticed", { wren: wren.toUpperCase() })}</Text>
                <Text style={{ ...face, fontSize: 14, lineHeight: 20, color: P.ink60, marginTop: 6, textAlign: "center" }}>{line}</Text>
              </Animated.View>
            );
          })()}

          <Text style={{ ...wrenFace, fontSize: 16.5, lineHeight: 26, color: P.ink60, marginTop: 26 }}>
            {meName ? t("in.knowYou", { name: meName }) : t("in.knowYouUnsigned")}
          </Text>
        </ScrollView>

        {/* Report this signature / Block, under their held signature — inside this sheet */}
        {signed ? hold.sheet : null}

        <View style={{ paddingHorizontal: 22, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
          <Pressable
            onPress={onTalk}
            accessibilityRole="button"
            style={({ pressed }) => ({ backgroundColor: tk.ind, borderRadius: 14, paddingVertical: 15, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", letterSpacing: 0.4, color: tk.bg }}>
              {t("in.talkTo", { name: theirName })}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
