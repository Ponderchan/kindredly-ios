import { useWindowDimensions } from "react-native";
import { t, useLang } from "../../lib/i18n";
import { useScreenInsets } from "../../lib/screen-insets";
import { Toast } from "../../components/ui";
import { LeaveSheet } from "../../components/LeaveSheet";
import { SignUpSheet } from "../../components/SignUpSheet";
import { ReportSheet } from "../../components/ReportMenu";
import { deskGeometry } from "./today-cards";
import { LetterReader } from "./LetterReader";
import { TodayWardrobeSlip } from "./WardrobeSlip";
import type { TodayModel } from "./useTodayDesk";

/* WHAT SITS OVER THE DESK, WHOEVER DRAWS IT (10a step 5). The same React
   Native overlays above the SwiftUI Host and above the React Native
   fallback, so the two can't say different things:

   - "Reply sent." (2.2s), 12 above the control band (the design's place,
     clear of NEXT and REPLY), on the theme's ink;
   - the pouch-full sheet (five in flight: "I'll wait." is the only way
     out), window-level so the floating tab bar can't cover it (inside the
     unfolded reader, the reader draws it);
   - the guest sheet a reply raises, which sends THAT letter once signed in;
   - the report card and the block question (lib/report-flow), the card
     dropping where a card's ⋯ sits (56 under the card's top);
   - the unfolded letter (LetterReader);
   - the new onboarding's first-arrival wardrobe slip ("Otis wants a look
     →", WardrobeSlip), only while its flag is up, under the reader.
   Every one is raised through blurThen in the model, so a Swift field lets
   go before it appears (the slip raises nothing until it is tapped). */
export function TodayOverlays({ model }: { model: TodayModel }) {
  useLang();
  const insets = useScreenInsets();
  const { height: hostH } = useWindowDimensions();
  const { view, act, sheets } = model;
  // the desk's one geometry (TodayNative and TodayRN place the card and the band by it too)
  const { cardTop, controlTop } = deskGeometry({ hostH, safeTop: insets.top, tabBarRoom: insets.tabBarRoom });
  return (
    <>
      {view.toast && <Toast msg={t("ld.toast.thread")} bottom={hostH - controlTop + 12} />}

      {/* while the reader is open it draws this sheet itself: a second Modal
          can't be presented over its page sheet (LetterReader) */}
      <LeaveSheet
        modal
        open={sheets.flightFull && view.readerId == null}
        title={t("ld.flightFull.title")}
        body={t("ld.flightFull.body")}
        actions={[{ label: t("ld.flightFull.ok"), kind: "primary", onPress: act.closeFlightSheet }]}
        /* "I'll wait." IS the way out of this one; a KEEP WRITING row under it
           would answer a question this sheet never asks */
        cancelLabel={null}
        onCancel={act.closeFlightSheet}
      />

      <SignUpSheet modal open={sheets.needsAccount} reason={t("ld.signup.reason")} onClose={act.closeSignUp} onSignedIn={act.signedIn} />

      {/* the card drops beside a card's ⋯: under the plate and the docket */}
      <ReportSheet flow={model.report} top={cardTop + 56} />

      <TodayWardrobeSlip model={model} />

      <LetterReader model={model} />
    </>
  );
}
