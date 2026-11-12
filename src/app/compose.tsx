import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { KScreenHandle } from "../../modules/kindredly-ui";
import { NativeSurface } from "../components/NativeSurface";
import { LetterTravel, LetterTravelWarm } from "../components/LetterTravel";
import { LeaveSheet, type LeaveAction } from "../components/LeaveSheet";
import { SignUpSheet } from "../components/SignUpSheet";
import { useTheme } from "../lib/theme";
import { useAuth } from "../lib/auth";
import { swiftReadsFold, useFoldFrame } from "../lib/fold";
import { useCornerKey } from "../lib/corner-key";
import { useNativeSurface } from "../lib/surfaces";
import { useEntitlement } from "../lib/entitlement";
import { useWrenName } from "../lib/wren-name";
import { t } from "../lib/i18n";
import { useComposeState, type ComposeParams } from "../screens/compose/useComposeState";
import { ComposeNative } from "../screens/compose/ComposeNative";
import { ComposeRN } from "../screens/compose/ComposeRN";
import "../data/strings-step5-compose";
import { DeckInsets } from "../components/DeckInsets";

/* WRITING TO A STRANGER (10a step 5). A full page that rises from the
   bottom (the root stack: slide_from_bottom, and no edge swipe — the
   guarded ✕ is its one way out, so words are never lost to a stray swipe).

   This route only chooses who draws the page and holds what sits above it.
   The state (screens/compose: useComposeState over the pure compose-model)
   knows everything — the words, the stamp, the trays, the key, the counts,
   the quota, the drafts, the send — and both renderers draw it:
   - ComposeNative: SwiftUI, one Host for the page (KComposeView), Wren and
     the Recorder as islands;
   - ComposeRN: the React Native page, the remote switch's fallback.
   NativeSurface picks between them ("compose" in app_surfaces, the binary
   having the view, no JS error, no crash strikes) once, at mount: a page
   holding someone's words never swaps renderer under them.

   THE COURIER FLIES ABOVE A PAGE THAT STAYS. LetterTravel used to replace
   the page while a letter went; every failure (her gate, the daily cap, an
   expired session, the network) then brought back a page rebuilt from
   nothing — an uncontrolled Swift editor would come back empty while TS
   still held the letter. Now the flight is an overlay on the theme's
   ground, and the page under it keeps its words, its focus state and its
   scroll; it is only uncovered again.

   Params: draft (resume one), seed (the words a sealed page decided to
   send, journal/[id]), stamp (preselected: an official id, or a photo
   stamp "c:<uuid>" from the album's Write with it), morning (the courier's
   morning words), demo (store mode). morning has no in-app caller and is
   kept for deep links. */
/* on a small laptop the page ends at the bend: its foot keeps the bend's gap, not the home
   indicator's inset (components/DeckInsets) */
export default function Compose() {
  return (
    <DeckInsets>
      <ComposePage />
    </DeckInsets>
  );
}

function ComposePage() {
  const params = useLocalSearchParams<ComposeParams>();
  const { t: tk } = useTheme();
  const { premium, settled } = useEntitlement();
  const { user, isGuest } = useAuth();
  const wren = useWrenName();
  // the Swift page's view: blurred before every sheet, Alert and push
  const viewRef = useRef<KScreenHandle>(null);

  // a folding phone's inner screen, with the Swift page drawing: the stamps have the left page
  const frame = useFoldFrame();
  const spread = useNativeSurface("compose") && !!frame.pages && swiftReadsFold();
  const state = useComposeState({
    params,
    env: { premium, premiumSettled: settled, isGuest, signedIn: !!user, wren, stampsAlways: spread },
    target: viewRef,
    tk,
  });
  const { act } = state;
  // a folding phone: the band's corner key is this page's own guarded ✕ (lib/corner-key)
  useCornerKey({ kind: "close", label: t("wren.trackClose"), onPress: act.close });

  const leaveActions: LeaveAction[] = [
    ...(state.leaveCanSave ? [{ label: t("cp.leave.draft"), kind: "primary" as const, onPress: act.saveAndLeave }] : []),
    { label: t("cp.leave.discard"), kind: "destructive", onPress: act.discard },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <NativeSurface
        surface="compose"
        view="KComposeView"
        mode="mount"
        native={() => <ComposeNative state={state} viewRef={viewRef} />}
        fallback={() => <ComposeRN state={state} />}
      />

      {/* her flying snapshot kept ready while the page is open (the Swift send-off draws it) */}
      <LetterTravelWarm />

      {/* the courier takes the letter and flies — over the page, which stays */}
      {state.step === "sending" && (
        <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { backgroundColor: tk.bg }]}>
          <LetterTravel
            ready={state.done}
            onDone={act.travelDone}
            title={state.isMorning ? t("cp.morningTitle") : undefined}
            note={state.isMorning ? t("cp.morningNote") : undefined}
          />
        </View>
      )}

      <SignUpSheet open={state.needsAccount} reason={t("cp.signup.reason")} onClose={act.closeSignUp} onSignedIn={act.signedIn} />

      <LeaveSheet
        open={state.leaving}
        title={t("cp.leave.title")}
        body={t("cp.leave.body")}
        actions={leaveActions}
        onCancel={act.keepWriting}
      />
    </View>
  );
}
