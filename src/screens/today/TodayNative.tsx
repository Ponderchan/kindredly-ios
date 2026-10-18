import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useNavigation } from "expo-router";
import { useKCommands, useRev } from "../../../modules/kindredly-ui";
import {
  KTodayView,
  type KTodayCard,
  type KTodayCommands,
  type KTodayStrings,
  type KTodayWindow,
  type KTodayWren,
  type KTodayWrenLetter,
} from "../../../modules/kindredly-ui/src/Today";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets, useTabBarAway } from "../../lib/screen-insets";
import { playbackCommandArgs } from "../../lib/voice-playback";
import type { CardVM } from "./today-cards";
import { useTodayBirds } from "./today-birds";
import type { TodayModel } from "./useTodayDesk";

/* THE TODAY TAB IN SWIFTUI (Today 3d × 25b): one Host for the whole desk
   (SurfaceHost field: flex 1, the container safe area ignored but the
   keyboard's kept, so the reply strip rides the keyboard natively; light or
   dark from the theme; the crash breadcrumb's layout report), holding
   KTodayView. The reading desk, the quiet day, the day's end, the first load
   and the offline cold start all live in this one Host, so "Reply sent.",
   the plate and the band survive the last reply.

   This file only turns the model (useTodayDesk, the same one the React
   Native fallback draws) into the Swift props and commands:
   - props, which change rarely: the phase, NEXT's number, the cards
     (memoised apart from the drafts, with a rev, so typing never re-sends
     fifteen letters), the plate's lock, her first-arrival line, her letter
     and the window for the day's end, her five pictures (her own look, from
     BirdSnapshots: useTodayBirds, wilted while she's starving), her yawn
     hours, the + panel, whether the band steps aside, and Wren on the band
     (her resting face, the serial that sends her off with a reply, the
     reader being open, her VoiceOver name);
   - commands, for everything that changes often: the composer (the send
     key and the hint, per keystroke), the seed of the bound letter's draft
     (setText, only when the bound letter changes or the reader closes —
     never an echo, so a Japanese or Korean composition is never written
     over), the one voice player's transitions, and the blur a tab re-press
     sends;
   - events back to the model: a pass, bring back, REPLY opening the field,
     the window (her game, through the router), the reply's edits and sends,
     a card's actions;
   - and the field's focus to the tab bar: writing back (the chat composers'
     A1, owner 2026-10-18) is the field having the keyboard, and while it
     does the floating tab bar slides away (useTabBarAway), since the
     keyboard and the reply bar have the foot of the screen. The rest of
     that moment is Swift's own: the band fades, the card shrinks, the bar
     rises (KTodayDesk). The keyboard's done, a tap on the dimmed desk or a
     send let go of the field, and the bar comes back.
   No islands: Wren is Swift's, drawn from her pictures. A reply in the air
   is hers to carry too: she takes the letter off the band and comes back
   (KWireWren), so there is no React Native fly-by over this Host (the old
   LetterInFlight would have been a second bird). */

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
    replyPlaceholder: c.replyPlaceholder,
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
  const navigation = useNavigation();
  const { view, act } = model;

  // writing back: the field has the keyboard, so the tab bar steps away (another Host)
  const [replying, setReplying] = useState(false);
  useTabBarAway(replying);

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

  // the field takes the bound letter's draft when the letter on screen changes, or the reader closes (it may have written in it)
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

  // pressing Today again while on it only drops the keyboard (NativeTabBar emits tabPress): there is no first letter to go back to
  useEffect(() => {
    const nav = navigation as unknown as Nav;
    if (!nav.addListener) return;
    return nav.addListener("tabPress", () => {
      if (nav.isFocused?.()) commands.send("blur", {});
    });
  }, [navigation, commands]);

  /* ── props ── */
  const cards = useMemo(() => view.cards.map(nativeCard), [view.cards]);
  const rev = useRev(cards);
  const s = view.strings;
  const strings = useSame<KTodayStrings>({
    title: s.title,
    next: s.next,
    reply: s.reply,
    replyA11y: s.replyA11y,
    unfold: s.unfold,
    unfoldA11y: s.unfoldA11y,
    voiceLetter: s.voiceLetter,
    more: s.more,
    nextA11y: s.nextA11y,
    bringBack: s.bringBack,
    play: s.play,
    pause: s.pause,
    send: s.send,
    placeholder: s.placeholder,
    emoji: s.emoji,
    offlineTitle: s.offlineTitle,
    offlineBody: s.offlineBody,
    loadingA11y: s.loadingA11y,
  });
  const wrenLetter = useSame<KTodayWrenLetter>(view.wrenLetter);
  const flightWindow = useSame<KTodayWindow>(view.window);
  const birds = useTodayBirds({ wilt: view.wren.wilt, stage: view.wren.stage });
  const wren = useSame<KTodayWren>({ rest: view.wren.rest, carry: view.wren.carry, reader: view.readerId != null, a11y: view.wren.a11y, name: view.wren.name });

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
          phase={view.phase}
          left={view.left}
          leftA11y={view.leftA11y}
          cards={cards}
          titleLocked={view.titleLocked}
          freshUnfold={view.freshUnfold}
          arrivalLine={view.arrival.open ? view.arrival.line : ""}
          wrenLetter={wrenLetter}
          window={flightWindow}
          birds={birds}
          night={view.night}
          plus={view.plus}
          hideBand={view.hideBand}
          wren={wren}
          onPass={act.pass}
          onBringBack={act.bringBack}
          onReplyOpen={act.replyOpen}
          onWindow={act.window}
          onReplyChange={act.changeDraft}
          onReplySend={act.send}
          onReplyFocus={setReplying}
          onCardAction={act.cardAction}
        />
      </SurfaceHost>
    </View>
  );
}
