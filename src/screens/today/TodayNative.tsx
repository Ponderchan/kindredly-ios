import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useNavigation } from "expo-router";
import { useKCommands, useRev } from "../../../modules/kindredly-ui";
import {
  KTodayView,
  type KTodayCard,
  type KTodayCommands,
  type KTodayDeskTick,
  type KTodayStrings,
  type KTodayWindow,
  type KTodayWren,
  type KTodayWrenCard,
  type KTodayWrenLetter,
  todayDrawsWrenCard,
} from "../../../modules/kindredly-ui/src/Today";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets, useTabBarAway } from "../../lib/screen-insets";
import { useCornerKey } from "../../lib/corner-key";
import { t } from "../../lib/i18n";
import { useFoldFrame } from "../../lib/fold";
import { playbackCommandArgs } from "../../lib/voice-playback";
import { useIdentityOn } from "../../lib/identity";
import { keepStampFlow, reportStampFlow } from "../../lib/custom-stamps";
import { Toast } from "../../components/ui";
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
   - props, which change rarely: the phase, NEXT's number, Next's ring
     (the whole desk in reading order, each letter unread, read or
     replied, and the letter on screen's place), the cards
     (memoised apart from the drafts, with a rev, so typing never re-sends
     ten letters; each header from the card's `who` and `when` once the
     identity switch is on — courier names, frosted windows, ♀/♂ and star
     signs — and from its old postmark line while it is off, so off is the
     header exactly as it was), the plate's lock, her first-arrival line, her letter
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
   - owner's audit, 2026-11-10: `undoId`, the letter just passed while its
     Undo capsule is up (the model counts the five seconds; the capsule's tap
     is bring back), and the words of the sheet a card's face and name open
     (the Help page's own; its link comes back as the card action "help");
   - her birthday letter (owner's audit, 2026-11-10): this renderer tells the
     model whether it can draw it (act.wrenCardHost: this binary's KTodayView
     has the prop), and when the model then puts it up (view.wrenCard) sends
     it as `wrenCard` with her own picture (her delight face, as when she is
     tapped). Swift stands it before the cards; its pass and its REPLY (the
     card action "wren") come back through the same events as any card's;
   - and the field's focus to the tab bar: writing back (the chat composers'
     A1, owner 2026-10-18) is the field having the keyboard, and while it
     does the floating tab bar slides away (useTabBarAway), since the
     keyboard and the reply box have the foot of the screen. The rest of
     that moment is Swift's own: the band fades, the card shrinks, the box
     rises onto the keyboard and can grow into a full page (KTodayDesk,
     KReplyDock). The keyboard's done, a tap on the dimmed desk or a
     send let go of the field, and the bar comes back.
   No islands: Wren is Swift's, drawn from her pictures. A reply in the air
   is hers to carry too: she takes the letter off the band and comes back
   (KWireWren), so there is no React Native fly-by over this Host (the old
   LetterInFlight would have been a second bird). */

/** One card as the Swift view takes it. With the identity switch on the header is drawn from `who`
    and `when` (the identity-plan §9 header: the face slot, the name with its mark and sign, the date
    under it; a deleted account wears the flat veil tile). Switch off, `postmark` carries the docket
    line as it always read ("SEP.23 · NO.7273") and Swift draws the old header, the mosaic (or its
    veil) beside it: off is every surface exactly as it was. */
export function nativeCard(c: CardVM, identity: boolean): KTodayCard {
  const face = c.who.face;
  return {
    id: c.id,
    who: {
      name: c.who.name,
      mark: c.who.mark,
      sign: c.who.sign,
      face: face.kind === "veil" ? (identity ? "tile" : "veil") : face.kind,
      mask: face.kind === "mosaic" ? face.mask : 0,
      frost: face.kind === "frost" ? face.spec : null,
    },
    when: c.when,
    postmark: identity ? "" : c.postmark,
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
    replyingTo: c.replyingTo,
    paper: c.paper,
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

/** how long a letter asked for from the Kindreds tab may still open its reply (see the effect below) */
const ASK_FRESH_MS = 8000;

/** pageAfter: the after-fifteen page takes the day's end (useAfterFifteen handsOff) */
export function TodayNative({ model, pageAfter = false }: { model: TodayModel; pageAfter?: boolean }) {
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

  /* a folding phone's inner screen: while writing back the tab bar has stepped out of the band,
     and the only way out of the reply was a tap on the letter. The band's corner, where the +
     stood, holds a ✕ that puts the reply away (lib/corner-key; found walking the simulator). The
     outer screen keeps the phone's way: a tap on the dimmed page. */
  const twoPages = !!useFoldFrame().pages;
  useCornerKey(replying && twoPages ? { kind: "close", label: t("wren.trackClose"), onPress: () => commands.send("blur", {}) } : null);

  // the field takes the bound letter's draft when the letter on screen changes, or the reader closes (it may have written in it)
  useEffect(() => {
    commands.send("setText", { target: "reply", value: draftFor(boundId) });
  }, [boundId, view.draftEpoch, commands, draftFor]);

  // the send key and the hint, per keystroke; the reply box (owner, 2026-11-09) shows only a
  // hint about this send, so the two resting thread lines go as "" (its header names who you
  // reply to instead)
  const r = view.reply;
  const notice = r.state.notice ? r.state.hint : "";
  useEffect(() => {
    commands.send("composer", {
      letterId: r.letterId,
      sendState: r.state.sendState,
      hint: notice,
      hintWarn: r.state.hintWarn,
      preview: r.preview,
      sending: view.sending,
      sendSerial: view.answeredSerial,
    });
  }, [r.letterId, r.state.sendState, notice, r.state.hintWarn, r.preview, view.sending, view.answeredSerial, commands]);

  /* a letter asked for from the Kindreds tab ("Write back" on a line of it; lib/answer-request): the
     model has brought it to the front, and once it is the card on screen its reply opens, as REPLY
     does (the field takes the keyboard; Swift's own reply mode follows the focus). A beat first, so
     the tab has changed and the card has settled. Once per request, and only while it is fresh
     (ASK_FRESH_MS): a request this page never got to (her birthday letter was up, the desk was
     remounted later) must not open the keyboard out of nowhere. */
  const ask = view.answerAsk;
  const answeredAsk = useRef(0);
  const currentId = view.current?.id ?? "";
  useEffect(() => {
    if (!ask || ask.serial === answeredAsk.current || Date.now() - ask.at > ASK_FRESH_MS) return;
    if (view.phase !== "reading" || currentId !== ask.id) return;
    const tm = setTimeout(() => {
      answeredAsk.current = ask.serial;
      commands.send("focus", { target: "reply" });
    }, 420);
    return () => clearTimeout(tm);
  }, [ask, view.phase, currentId, commands]);

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

  /* a stranger's photo stamp, long-pressed on a card (custom stamps): keep it or report it, and
     say so in a toast above the band */
  const [stampToast, setStampToast] = useState("");
  useEffect(() => {
    if (!stampToast) return;
    const id = setTimeout(() => setStampToast(""), 2600);
    return () => clearTimeout(id);
  }, [stampToast]);
  const cardsRef = useRef(view.cards);
  cardsRef.current = view.cards;
  const onStampMenu = useMemo(
    () => (letterId: string, action: "keep" | "report") => {
      const card = cardsRef.current.find((c) => c.id === letterId);
      if (!card || card.demo || !card.stampId.startsWith("c:")) return;
      const flow = action === "keep" ? keepStampFlow(card.stampId, { letter: letterId }) : reportStampFlow(card.stampId, letterId);
      void flow.then((line) => line && setStampToast(line));
    },
    [],
  );

  /* ── props ── */
  // the identity switch, as the cards' book read it (lib/identity): which header Swift draws, and the deleted writer's veil
  const identity = useIdentityOn();
  const cards = useMemo(() => view.cards.map((c) => nativeCard(c, identity)), [view.cards, identity]);
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
    expandA11y: s.expandA11y,
    collapseA11y: s.collapseA11y,
    offlineTitle: s.offlineTitle,
    offlineBody: s.offlineBody,
    loadingA11y: s.loadingA11y,
    arrivalDismiss: s.arrivalDismiss,
    // owner's audit, 2026-11-10: the Undo capsule after Next, and the "who is this" sheet
    undo: s.undo,
    undoHint: s.undoHint,
    whoTitle: s.whoTitle,
    whoBody: s.whoBody,
    whoNextTitle: s.whoNextTitle,
    whoNextBody: s.whoNextBody,
    whoMore: s.whoMore,
    whoClose: s.whoClose,
  });
  const desk = useSame<KTodayDeskTick[]>(view.desk);
  const wrenLetter = useSame<KTodayWrenLetter>(view.wrenLetter);
  const flightWindow = useSame<KTodayWindow>(view.window);
  const birds = useTodayBirds({ wilt: view.wren.wilt, stage: view.wren.stage });
  const wren = useSame<KTodayWren>({ rest: view.wren.rest, carry: view.wren.carry, reader: view.readerId != null, a11y: view.wren.a11y, name: view.wren.name });

  /* her birthday letter: say once whether this binary's Swift desk can draw it (the model holds a
     birthday's desk at loading until a renderer has spoken, and offers the letter only to one that
     can); taken back when this renderer goes */
  const wrenCardHost = act.wrenCardHost;
  useEffect(() => {
    wrenCardHost(todayDrawsWrenCard());
    return () => wrenCardHost(null);
  }, [wrenCardHost]);
  const wc = view.wrenCard;
  // with the identity switch on the card draws the §9 header (her picture, her name, the date); off, the old docket line
  const wrenCard = useSame<KTodayWrenCard | null>(
    wc
      ? {
          id: wc.id,
          name: wc.name,
          when: wc.when,
          postmark: identity ? "" : wc.postmark,
          body: wc.body,
          sign: wc.sign,
          bodySize: wc.bodySize,
          bodyLine: wc.bodyLine,
          ends: wc.ends,
          a11yLabel: wc.a11yLabel,
          bird: birds.delight ?? birds.idle,
        }
      : null,
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
          phase={view.phase}
          left={view.left}
          leftA11y={view.leftA11y}
          desk={desk}
          deskAt={view.deskAt}
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
          pageAfter={pageAfter}
          wren={wren}
          undoId={view.undo}
          wrenCard={wrenCard}
          onPass={act.pass}
          onBringBack={act.bringBack}
          onReplyOpen={act.replyOpen}
          onWindow={act.window}
          onArrivalDismiss={act.dismissArrival}
          onReplyChange={act.changeDraft}
          onReplySend={act.send}
          onReplyFocus={setReplying}
          onCardAction={act.cardAction}
          onStampMenu={onStampMenu}
        />
      </SurfaceHost>
      {stampToast ? <Toast msg={stampToast} bottom={insets.tabBarRoom + 120} /> : null}
    </View>
  );
}
