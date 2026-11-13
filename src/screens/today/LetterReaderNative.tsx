import { useEffect, useMemo, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KIsland, useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KLetterReaderView, type KLetterReaderCommands, type KLetterReaderStrings } from "../../../modules/kindredly-ui/src/TodayOverlays";
import { SurfaceHost } from "../../components/NativeSurface";
import { LeaveSheet } from "../../components/LeaveSheet";
import { INFLIGHT_CYCLE_MS, LetterInFlight } from "../../components/LetterInFlight";
import { isKindredlyUIViewAvailable, type KLetterInFlightData } from "../../../modules/kindredly-ui";
import { useNativeSurface } from "../../lib/surfaces";
import { useBirdImageRefs } from "../../lib/bird-images";
import { useSwiftPiece } from "../me/me-pieces";
import { Toast } from "../../components/ui";
import { useLetterFont, useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { localeTag, sinceShort } from "../../lib/format";
import { useIdentityOn } from "../../lib/identity";
import { keepStampFlow, reportStampFlow } from "../../lib/custom-stamps";
import type { PoolLetter } from "../../lib/db";
import type { CardVM } from "./today-cards";
import { readerClosesOnSend, readerDocketA11y, readerHint, readerPlaceholder, readerText } from "./letter-reader-model";
import { nativeCard } from "./TodayNative";
import type { TodayModel } from "./useTodayDesk";
import "../../data/strings-today3d"; // rd.expandA11y, rd.collapseA11y: the reply box's words

/* THE UNFOLDED LETTER IN SWIFTUI (the "letterreader" switch; LetterReader
   picks it inside its React Native page sheet). One Host that keeps the
   keyboard's safe area (SurfaceHost field), holding KLetterReaderView
   (Portable/Today/KLetterReaderScreen.swift), with what stays React Native
   over it in the same sheet: the pouch-full sheet (LeaveSheet, drawn in the
   reader's own tree because a second window-level Modal can't be presented
   over this page sheet) and the stamp's toast. This file only turns the
   model into the view's props and commands, as the React Native reader
   reads it:

   - the card is the desk's (TodayNative nativeCard, with the identity
     switch as the cards read it), so the docket keeps the face, the name
     and the stamp it had a moment ago; the letter, the VoiceOver docket,
     the placeholder and the hint come from letter-reader-model;
   - the field is uncontrolled: its words come back on every edit
     (changeDraft), and it is seeded with this letter's draft as the view
     attaches (the React Native bar's initialText) — never an echo, so a
     Japanese or Korean composition is never written over;
   - the send key and the hint go by the composer command on every change;
   - SEND: the reader closes with it (the letter is answered) unless the
     pouch is full, where it only explains (the sheet below) and stays;
   - a stranger's photo stamp, held: keep or report it (lib/custom-stamps),
     said in a toast (not for a dev sample: the flows still run, quietly);
   - a reply still in the air from the desk: LetterInFlight in the
     "inflight" island takes the foot (Wren keeps her die-cut outline there,
     so she is never redrawn in Swift); behind the "inflight" switch the
     reader draws the crossing itself (KLetterInFlight) with her snapshots,
     and the island stays empty. */

export function LetterReaderNative({ model, letter, card }: { model: TodayModel; letter: PoolLetter; card: CardVM }) {
  const lang = useLang();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const identity = useIdentityOn();
  const { view, act } = model;
  const letterId = letter.id;

  // the send key and the hint for this letter's draft (the reader's letter may not be the desk's)
  const state = model.replyFor(letterId);
  // as Today's reply box: only a hint about this send (pouch full, over the limit, headwind), never the
  // resting "REPLY AND A THREAD OPENS" lines — the box's header names who you reply to (pre-1.0.9
  // sweep, 2026-11-13: the long letter's box still showed them under the new box)
  const hint = state.notice ? readerHint(state.hint, localeTag()) : "";

  const ref = useRef<KScreenHandle>(null);
  const draftFor = model.draftFor;
  const composer = { sendState: state.sendState, hint, hintWarn: state.hintWarn };
  const latest = useRef(composer);
  latest.current = composer;
  const commands = useKCommands<KLetterReaderCommands>(ref, {
    blurOnUnmount: true,
    // a new view starts with an empty field and no composer: TS is where the words survive
    onViewAttach: () => {
      commands.send("setText", { target: "reply", value: draftFor(letterId) });
      commands.send("composer", latest.current);
    },
  });
  useEffect(() => {
    commands.send("composer", { sendState: state.sendState, hint, hintWarn: state.hintWarn });
  }, [state.sendState, hint, state.hintWarn, commands]);

  // the pouch-full sheet comes up over the letter: the field lets go first, so the keyboard can't cover it
  const flightFull = model.sheets.flightFull;
  useEffect(() => {
    if (flightFull) commands.send("blur", {});
  }, [flightFull, commands]);

  /* a stranger's photo stamp, held: kept or reported, said in a toast */
  const [stampLine, setStampLine] = useState("");
  useEffect(() => {
    if (!stampLine) return;
    const tm = setTimeout(() => setStampLine(""), 2600);
    return () => clearTimeout(tm);
  }, [stampLine]);

  const s = view.strings;
  const nativeCardRecord = useMemo(() => nativeCard(card, identity), [card, identity]);
  const strings = useMemo<KLetterReaderStrings>(
    () => ({
      foldBack: t("ld.foldBack"),
      writeBack: t("ld.writeBack"),
      placeholder: readerPlaceholder(card, s.placeholder),
      send: s.send,
      emoji: s.emoji,
      // the reply box is Today's (KReplyBox): its own words
      expandA11y: t("rd.expandA11y"),
      collapseA11y: t("rd.collapseA11y"),
      voiceLetter: t("ld.voiceLetter"),
    }),
    // lang: the two reader words are t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card.replyPlaceholder, s.placeholder, s.send, s.emoji, lang],
  );
  const written = `${t("ld.written")} ${sinceShort(letter.created_at)}`;
  const rev = useRev(nativeCardRecord, strings);

  /* the crossing in Swift ("inflight", me-pieces useSwiftPiece: the switch, the marker view, the
     crash breadcrumb armed while it shows): LetterInFlight's words and her two snapshots, the
     island left empty; off, null and the island draws it as before. Her pictures are asked for
     while the reader is open with the switch on, so they are there before a send (a crossing is
     under a second); until her flying one has landed the island still draws it. */
  const crossingSwift = useSwiftPiece("inflight", view.sending);
  const crossingWarm = useNativeSurface("inflight") && isKindredlyUIViewAvailable("KLetterInFlightView");
  const crossingBirds = useBirdImageRefs<"inflightFly34" | "inflightStill26">(crossingWarm ? ["inflightFly34", "inflightStill26"] : []);
  const flyBird = crossingBirds.inflightFly34 ?? null;
  const stillBird = crossingBirds.inflightStill26 ?? null;
  const inflight = useMemo<KLetterInFlightData | null>(
    () =>
      crossingSwift && flyBird
        ? {
            to: view.flyTo ?? "",
            slow: view.slow ? t("net.slow").toLocaleUpperCase(localeTag()) : "",
            onItsWay: t("ld.onItsWay"),
            cycleMs: INFLIGHT_CYCLE_MS,
            bird: flyBird,
            stillBird,
          }
        : null,
    // lang: the words are t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [crossingSwift, view.flyTo, view.slow, flyBird, stillBird, lang],
  );

  const onSend = (text: string) => {
    /* once it's gone the letter is answered, so the reader closes with it
       (Wren takes it and "Reply sent." shows on the desk). A full pouch only
       explains, and the reader stays: the sheet that explains is drawn in
       here, below */
    if (readerClosesOnSend(model.replyFor(letterId))) act.closeReader();
    act.send(letterId, text);
  };
  const onStamp = (action: "keep" | "report") => {
    if (!card.stampId.startsWith("c:")) return;
    const flow = action === "keep" ? keepStampFlow(card.stampId, { letter: letterId }) : reportStampFlow(card.stampId, letterId);
    void flow.then((line) => {
      if (line && !card.demo) setStampLine(line);
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <SurfaceHost field>
        <KLetterReaderView
          ref={commands.ref}
          theme={theme}
          letterFont={letterFont}
          insets={{ top: insets.top, bottom: insets.bottom, tabBarRoom: 0 }}
          rev={rev}
          card={nativeCardRecord}
          text={readerText(card)}
          written={written}
          docketA11y={readerDocketA11y(card, identity)}
          sending={view.sending}
          inflight={inflight}
          strings={strings}
          onClose={act.closeReader}
          onChange={(text) => act.changeDraft(letterId, text)}
          onSend={onSend}
          onStamp={onStamp}
        >
          {/* the foot's width (the sheet less its 12 each side): the crossing measures its route from it */}
          <KIsland name="inflight" style={{ width: width - 24 }}>
            {view.sending && !inflight ? <LetterInFlight to={view.flyTo} slow={view.slow} /> : null}
          </KIsland>
        </KLetterReaderView>
      </SurfaceHost>

      {/* THE POUCH IS FULL, said over the letter, in the reader's own tree (see LetterReader) */}
      <LeaveSheet
        open={model.sheets.flightFull}
        title={t("ld.flightFull.title")}
        body={t("ld.flightFull.body")}
        actions={[{ label: t("ld.flightFull.ok"), kind: "primary", onPress: act.closeFlightSheet }]}
        cancelLabel={null}
        onCancel={act.closeFlightSheet}
      />
      {stampLine ? <Toast msg={stampLine} bottom={Math.max(insets.bottom, 12) + 90} /> : null}
    </View>
  );
}
