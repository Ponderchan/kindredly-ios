import { t, useLang } from "../../lib/i18n";
import { useScreenInsets } from "../../lib/screen-insets";
import { Toast } from "../../components/ui";
import { LeaveSheet } from "../../components/LeaveSheet";
import { SignUpSheet } from "../../components/SignUpSheet";
import { ReportSheet } from "../../components/ReportMenu";
import { BAND, CONTENT_TOP, PILL_H } from "./today-cards";
import { LetterReader } from "./LetterReader";
import type { TodayModel } from "./useTodayDesk";

/* WHAT SITS OVER THE DESK, WHOEVER DRAWS IT (10a step 5). The same React
   Native overlays above the SwiftUI Host and above the React Native
   fallback, so the two can't say different things:

   - "Reply sent." (2.2s), just above where the pill rests (bottomRoom +
     the pill + 16, the mock's place), on the theme's ink;
   - the pouch-full sheet (five in flight: "I'll wait." is the only way
     out), window-level so the floating tab bar can't cover it (inside the
     unfolded reader, the reader draws it);
   - the guest sheet a reply raises, which sends THAT letter once signed in;
   - the report card and the block question (lib/report-flow), the card
     dropping where a card's ⋯ sits;
   - the unfolded letter (LetterReader).
   Every one is raised through blurThen in the model, so a Swift field lets
   go before it appears. */
export function TodayOverlays({ model }: { model: TodayModel }) {
  useLang();
  const insets = useScreenInsets();
  const { view, act, sheets } = model;
  const bottomRoom = insets.tabBarRoom + 6;
  return (
    <>
      {view.toast && <Toast msg={t("ld.toast.thread")} bottom={bottomRoom + PILL_H + 16} />}

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

      {/* the card drops beside a card's ⋯: under the plate, the snap line and the docket */}
      <ReportSheet flow={model.report} top={insets.top + BAND + CONTENT_TOP + 56} />

      <LetterReader model={model} />
    </>
  );
}
