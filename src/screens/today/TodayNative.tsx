import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import Animated, { Keyframe } from "react-native-reanimated";
import { useIsFocused, useNavigation } from "expo-router";
import { RNHostView } from "@expo/ui/swift-ui";
import { KIsland, KSlot, useKCommands, useRev } from "../../../modules/kindredly-ui";
import { KTodayView, type KTodayArrival, type KTodayCard, type KTodayCommands, type KTodayStrings } from "../../../modules/kindredly-ui/src/Today";
import { SurfaceHost } from "../../components/NativeSurface";
import { CloseOfDay } from "../../components/CloseOfDay";
import { LetterInFlight } from "../../components/LetterInFlight";
import { WrenBird } from "../../components/WrenBird";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { playbackCommandArgs } from "../../lib/voice-playback";
import type { CardVM } from "./today-cards";
import type { TodayModel } from "./useTodayDesk";

/* THE TODAY TAB IN SWIFTUI (10a step 5): one Host for the whole desk
   (SurfaceHost field: flex 1, the container safe area ignored but the
   keyboard's kept, so the reply strip rides the keyboard natively; light or
   dark from the theme; the crash breadcrumb's layout report), holding
   KTodayView. The full desk, the quiet day and the first load all live in
   this one Host, so "Reply sent.", the plate, the strip and the scroll
   survive the last reply (critic: the old quiet branch unmounted
   everything, the toast included).

   This file only turns the model (useTodayDesk, the same one the React
   Native fallback draws) into the Swift props and commands:
   - props, which change rarely: the cards (memoised apart from the drafts,
     with a rev, so typing never re-sends fifteen letters), the plate and
     every fixed word, the arrival, whether the desk has loaded (the blind
     is the last page), whether the pill steps aside, and the anchor that
     comes with the cards after a letter leaves;
   - commands, for everything that changes often: the composer (the send
     key and the hint, per keystroke), the seed of the bound letter's draft
     (setText, only when the bound letter changes or the reader closes —
     never an echo, so a Japanese or Korean composition is never written
     over), the one voice player's transitions, scroll requests, the cord's
     lock;
   - three React Native islands (KSlot, in a fixed order, every render):
     her bird on the desk strip (22, the official look), her bird landing in
     the arrival (34, the LAND keyframe), and the close-of-day blind filling
     the stack's last page (its own cord gesture; RNGH pans work inside a
     Swift ScrollView, spike S2);
   - the send's fly-by (LetterInFlight) over the Host where the pill was.
   Re-pressing the tab goes to the first letter; the tabs layout's + sheet
   hides the pill (the model's pillHidden). */

/* she lands on the strip's line, as the old arrival had her */
const LAND = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -28 }] },
  72: { opacity: 1, transform: [{ translateY: 4 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }] },
})
  .duration(560)
  .delay(80);

/** One card as the Swift view takes it. */
export function nativeCard(c: CardVM): KTodayCard {
  return {
    id: c.id,
    postmark: c.postmark,
    mask: c.mask,
    ghost: c.ghost,
    stampId: c.stampId,
    stampHex: c.stampHex,
    stampName: c.stampName,
    topic: c.topic,
    topicWash: c.topicWash,
    topicInk: c.topicInk,
    topicLine: c.topicLine,
    body: c.body,
    bodySize: c.bodySize,
    bodyLine: c.bodyLine,
    bodyCenter: c.bodyCenter,
    isVoice: c.isVoice,
    voiceReady: c.voiceReady,
    caption: c.caption,
    durationLabel: c.durationLabel,
    capsule: c.capsule,
    menu: c.menu,
    a11yLabel: c.a11yLabel,
  };
}

/** The same value back while its content is the same (JSON), so an unchanged rebuild keeps its identity. */
function useSame<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

type Nav = { addListener?: (type: string, cb: () => void) => () => void; isFocused?: () => boolean };

export function TodayNative({ model }: { model: TodayModel }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const focused = useIsFocused();
  const navigation = useNavigation();
  const { view, act } = model;
  const bottomRoom = insets.tabBarRoom + 6;

  // the bound letter's draft, read at the moment the field needs it
  const boundId = view.reply.letterId;
  const boundRef = useRef(boundId);
  boundRef.current = boundId;
  const draftFor = model.draftFor;
  const commands = useKCommands<KTodayCommands>(model.viewRef, {
    blurOnUnmount: true,
    // a new or remounted view starts with an empty field: TS is where the words survive
    onViewAttach: () => commands.send("setText", { target: "reply", value: draftFor(boundRef.current) }),
  });

  // the field takes the bound letter's draft when the page changes, or the reader closes (it may have written in it)
  useEffect(() => {
    commands.send("setText", { target: "reply", value: draftFor(boundId) });
  }, [boundId, view.draftEpoch, commands, draftFor]);

  // the send key and the hint, per keystroke
  const r = view.reply;
  useEffect(() => {
    commands.send("composer", {
      letterId: r.letterId,
      sendState: r.state.sendState,
      hint: r.state.hint,
      hintWarn: r.state.hintWarn,
      preview: r.preview,
      sending: view.sending,
      sendSerial: view.answeredSerial,
    });
  }, [r.letterId, r.state.sendState, r.state.hint, r.state.hintWarn, r.preview, view.sending, view.answeredSerial, commands]);

  // the one voice player's transitions (never per tick: Swift runs the bars itself)
  const playback = model.voice.state;
  useEffect(() => {
    commands.send("playback", playbackCommandArgs(playback));
  }, [playback, commands]);

  // the envelope's tap, the day turning, re-pressing the tab
  const served = useRef(view.scroll.serial);
  useEffect(() => {
    if (view.scroll.serial === served.current) return;
    served.current = view.scroll.serial;
    commands.send("scrollTo", { key: view.scroll.target, animated: view.scroll.animated });
  }, [view.scroll, commands]);

  // the cord is held: the stack must not scroll under the pull
  useEffect(() => {
    commands.send("lock", { held: view.held });
  }, [view.held, commands]);

  // pressing Today again while on it goes to the first letter (NativeTabBar emits tabPress)
  useEffect(() => {
    const nav = navigation as unknown as Nav;
    if (!nav.addListener) return;
    return nav.addListener("tabPress", () => {
      if (nav.isFocused?.()) act.toTop();
    });
  }, [navigation, act]);

  /* ── props ── */
  const cards = useMemo(() => view.cards.map(nativeCard), [view.cards]);
  const rev = useRev(cards);
  const s = view.strings;
  const strings = useSame<KTodayStrings>({
    title: s.title,
    rightLabel: view.plateRight,
    deskStrip: view.deskStrip,
    pass: s.pass,
    reply: s.reply,
    replyA11y: s.replyA11y,
    unfold: s.unfold,
    unfoldA11y: s.unfoldA11y,
    voiceLetter: s.voiceLetter,
    more: s.more,
    next: s.next,
    previous: s.previous,
    play: s.play,
    pause: s.pause,
    placeholder: s.placeholder,
    send: s.send,
  });
  const arrival = useSame<KTodayArrival>(view.arrival);

  /* ── the islands: every one, every render, in this order ── */
  const showStrip = view.deskStrip !== "";
  const showArrival = view.arrival.open;
  // the blind's loops run only while it is near and the tab is in view
  const blindActive = focused && view.idx >= view.feed.length - 1;
  const { sealed, facts, loaded } = view;
  const islands = useMemo(
    () => [
      <KIsland key="deskBird" name="deskBird" style={{ width: 22, height: 22 }}>
        {showStrip ? <WrenBird size={22} mood="delight" skin="sticker" accessory="none" stage="wren" mark={null} /> : null}
      </KIsland>,
      <KIsland key="arrivalBird" name="arrivalBird" style={{ width: 34, height: 34 }}>
        {showArrival ? (
          <Animated.View entering={LAND}>
            <WrenBird size={34} mood="content" />
          </Animated.View>
        ) : null}
      </KIsland>,
      <KSlot key="endPage" name="endPage">
        {/* no matchContents: the island takes the page Swift gives it, and CloseOfDay fills it */}
        <RNHostView>
          <View style={{ flex: 1 }}>{loaded ? <CloseOfDay sealed={sealed} facts={facts} onSeal={act.seal} onGrab={act.grab} active={blindActive} /> : null}</View>
        </RNHostView>
      </KSlot>,
    ],
    [showStrip, showArrival, loaded, sealed, facts, act, blindActive],
  );

  return (
    <View style={{ flex: 1 }}>
      <SurfaceHost field>
        <KTodayView
          ref={commands.ref}
          theme={theme}
          letterFont={letterFont}
          insets={insets}
          rev={rev}
          strings={strings}
          arrival={arrival}
          cards={cards}
          freshUnfold={view.freshUnfold}
          endPage={view.loaded}
          pillHidden={view.pillHidden}
          anchor={view.anchor}
          onCardIndex={act.settle}
          onReplyChange={act.changeDraft}
          onReplySend={act.send}
          onCardAction={act.cardAction}
          onDeskStrip={act.openDeskStrip}
          onEnvelope={act.goto}
        >
          {islands}
        </KTodayView>
      </SurfaceHost>

      {/* the courier carries it: in the pill's place while the reply is in the air */}
      {view.sending && (
        <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: bottomRoom }}>
          <LetterInFlight to={view.flyTo} slow={view.slow} />
        </View>
      )}
    </View>
  );
}
