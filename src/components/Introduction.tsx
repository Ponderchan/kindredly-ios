import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { MONO, PFM } from "../theme/post";
import { useLetterFamily, useP, useTheme } from "../lib/theme";
import { CeremonyRitual } from "./IntroductionRitualNative";
import { IntroductionSwift } from "./IntroductionNative";
import { NativeSurface } from "./NativeSurface";
import { useIntroduction, type IntroductionProps } from "./useIntroduction";
import { t, useLang } from "../lib/i18n";
import { dismissKeyboard } from "../lib/keyboard";
import { nativeOn } from "../lib/surfaces";
import { isKindredlyUIViewAvailable } from "../../modules/kindredly-ui";
import { WrenBird } from "./WrenBird";
import "../data/strings-step5-chat"; // in.meFallback, in.knowYouUnsigned

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
   IntroductionRitualNative), on the same clock, and VoiceOver also hears
   the sentence announced once the ritual is done.

   THE WHOLE SHEET IN SWIFT (2026-10-27, behind "introritual", OFF by
   default): the same page sheet (this Modal) holds one SwiftUI Host
   (IntroductionNative → KIntroductionView) that draws the header, her
   letter, the ritual — the mosaic one redrawn in SwiftUI on the very same
   clock (introduction-model), the signed one the ceremony's KIntroRitual —
   what she noticed, the line under it and TALK TO. The words, the clock,
   the faces, Reduce Motion, the hold and its Report / Block card (still
   React Native, over the Host) are this file's, shared by both bodies
   (useIntroduction). It is chosen as the sheet opens and kept until it
   closes (NativeSurface, mount mode: the switch, the binary having the
   view, the crash breadcrumb, a JS error), and a signed ritual takes the
   Swift sheet only while the "ceremony" switch would have drawn it in
   Swift too. Off, or any of that: this sheet, exactly as before
   (IntroductionRN). What the ritual records as seen (the once-per-phone
   ledger) is useCeremony's, before either draws. */
export function Introduction(props: IntroductionProps) {
  useLang(); // repaint when the reader changes language
  const { open, onClose } = props;
  /* it rises on its own (the second signature landing, a room opened after the reveal), not from a
     tap that already let go of the keyboard: put it away, whoever holds it (lib/keyboard) */
  useEffect(() => {
    if (open) dismissKeyboard();
  }, [open]);
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <IntroductionSheet {...props} />
    </Modal>
  );
}

/* What the Modal holds: mounted as it opens, gone once it has closed, so the choice below is made
   once per showing. The clock starts here, before the Swift path's breadcrumb is written. */
function IntroductionSheet(props: IntroductionProps) {
  const [startAt] = useState(() => Date.now());
  // off (the default), this is the React Native sheet with nothing in front of it
  const [swiftOn] = useState(() => nativeOn("introritual"));
  // the signed ritual in Swift is the ceremony's; with that switch off it stays React Native
  const [ceremonyOn] = useState(() => nativeOn("ceremony") && isKindredlyUIViewAvailable("KIntroRitualView"));
  const P = useP();
  if (!swiftOn || (props.signed && !ceremonyOn)) return <IntroductionRN {...props} />;
  return (
    <NativeSurface
      surface="introritual"
      view="KIntroductionView"
      mode="mount"
      native={() => <IntroductionSwift {...props} startAt={startAt} />}
      fallback={() => <IntroductionRN {...props} />}
      // the sheet's own page while the phone's answers are read (a frame or two)
      pending={() => <View style={{ flex: 1, backgroundColor: P.paper }} />}
    />
  );
}

/** The React Native sheet's body: exactly the introduction as it was before the Swift sheet. */
function IntroductionRN(props: IntroductionProps) {
  useLang();
  const { wren, otherSeed, otherFace, otherName, myName, road = [], mySeed = "me", myFace = null, notice = null, since = new Date().toISOString(), stamp = null, signed = null, onClose, onTalk } = props;
  const P = useP();
  // Wren's words here are content: the reader's Letter font (her two lines in its italic)
  const face = useLetterFamily();
  const wrenFace = useLetterFamily(true);
  const tk = useTheme().t;
  const insets = useSafeAreaInsets();
  const { still, doneAt, hold, holdable, words } = useIntroduction(props);
  const ritualA11y = words.ritualA11y;
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12 }}>
        {/* the sheet's title, as every secondary title: System 500 17, centred (the ✕'s width
            mirrored on the left keeps it on the middle) */}
        <View style={{ width: 24 }} />
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, fontWeight: "500", textAlign: "center", color: P.ink }}>
          {words.title}
        </Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={words.close} style={{ width: 24, alignItems: "flex-end" }}>
          <Text style={{ ...PFM.mono, fontSize: 16, color: P.ink40 }}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingTop: 30, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <WrenBird size={44} mood="content" stage="wren" />

        <Text style={{ ...wrenFace, fontSize: 16.5, lineHeight: 26, color: P.ink60, marginTop: 18 }}>{words.body}</Text>

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
        {words.noticedLine ? (
          <Animated.View entering={FadeIn.duration(500).delay(doneAt)} style={{ marginTop: 10, alignItems: "center", paddingHorizontal: 8 }}>
            <Text style={{ ...PFM.monoSemi, fontSize: MONO.label, letterSpacing: MONO.label * 0.16, color: P.pen }}>{words.noticedHead}</Text>
            <Text style={{ ...face, fontSize: 14, lineHeight: 20, color: P.ink60, marginTop: 6, textAlign: "center" }}>{words.noticedLine}</Text>
          </Animated.View>
        ) : null}

        <Text style={{ ...wrenFace, fontSize: 16.5, lineHeight: 26, color: P.ink60, marginTop: 26 }}>{words.knowYou}</Text>
      </ScrollView>

      {/* Report this signature / Block, under their held signature — inside this sheet */}
      {signed ? hold.sheet : null}

      <View style={{ paddingHorizontal: 22, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
        <Pressable
          onPress={onTalk}
          accessibilityRole="button"
          style={({ pressed }) => ({ backgroundColor: tk.ind, borderRadius: 14, paddingVertical: 15, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", letterSpacing: 0.4, color: tk.bg }}>{words.talkTo}</Text>
        </Pressable>
      </View>
    </View>
  );
}
