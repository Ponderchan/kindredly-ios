import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActionSheetIOS,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type KeyboardEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
  type WithTimingConfig,
} from "react-native-reanimated";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "expo-router";
import * as Haptics from "expo-haptics";
import { MONO, PFM, letterFitLines, letterFitSize } from "../../theme/post";
import { BRAND, THEMES, type ThemeKey } from "../../theme/themes";
import { useLetterFamily, useLetterFont, useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { useScreenInsets, useTabBarAway } from "../../lib/screen-insets";
import { dismissKeyboard } from "../../lib/keyboard";
import { localeTag } from "../../lib/format";
import { playbackPosition } from "../../lib/voice-playback";
import type { PoolLetter } from "../../lib/db";
import { MosaicId } from "../../components/MosaicId";
import { WhoFaceView } from "../../components/Frost";
import { WhoName } from "../../components/WhoName";
import { useIdentityOn } from "../../lib/identity";
import { Stamp } from "../../components/Stamp";
import { STAMP_LADDER } from "../../lib/stamp-frame";
import { AudioCardView } from "../../components/AudioCard";
import { SignalChip } from "../../components/SignalChip";
import { WrenBird, type WrenMood } from "../../components/WrenBird";
import { LangPair } from "../../components/LangPair";
import { InkPanel, LineIcon, REPLY_BAR, ReplyBar, StickerBox, TopicTag, type ReplyBarHandle } from "../../components/10a";
import { barBottomGap } from "../../components/NativeTabBar";
import {
  BAND,
  CONTROL_H,
  REPLY_GAP,
  deskGeometry,
  langPair,
  overflows,
  replyBody,
  replyCardHeight,
  type CardVM,
  type DeskPhase,
  type WindowVM,
  type WrenLetterVM,
} from "./today-cards";
import type { TodayModel, TodayStrings } from "./useTodayDesk";
import "../../data/strings-today3d";

/* THE TODAY TAB IN REACT NATIVE (Today 3d × 25b) — the remote switch's
   fallback. The same model as the SwiftUI desk (useTodayDesk over the pure
   today-cards), the same states, drawn more plainly:

   - one card under the title, in the card slot the one geometry gives
     (deskGeometry: the toast and the report card in TodayOverlays sit by
     it too). Pull it up (an RNGH pan: up follows the finger, down gives a
     quarter, it fades by .35 over 110) or press NEXT and it is passed: it
     goes out up and the next comes in from below, the model told at once
     (act.pass), the card going out kept as it was drawn. Bring back (the
     ⋯) plays it in reverse; a letter that leaves under the thumb
     (answered, blocked, taken back) goes out up as a pass does. No
     re-entry while a card moves. The title stays the page title through
     the pull and after a pass (owner, 10-20: no postmark morph).
   - the band under it (the owner's 2026-10-16 pick, image 2 of his option
     sheet): NEXT on a translucent disc with the letters left today, REPLY
     on ink, and Wren (her own look: WrenBird reads her skin, accessory and
     stage; wilted while she's starving) standing on the page ground
     between them at 36, her feet level with the discs' foot. She rests
     content, or sleepy in her night hours (the model's wren.rest), and
     reacts as the Swift desk's Wren does, more plainly: she leans toward a
     card pulled up and back from one pulled down, leans in curious while a
     long letter unfolds (until the reader closes), is curious after a pass
     and delighted while you write, hops when tapped (a light haptic,
     delighted for a moment), and takes each reply off the band herself:
     up and out with a small envelope, back onto her spot 2.5 s later (the
     send's only bird). Reduce Motion: the faces change, nothing moves.
   - WRITING BACK (the chat composers' A1, owner 2026-10-18: "the chat
     after tapping REPLY follows the prototype"; KTodayDesk's moment, drawn
     the same way). At rest there is no reply bar on Today, only the band
     and the tab bar. REPLY (or the card's VoiceOver "Write back") gives the
     field the keyboard, and that is reply mode:
       · the band (NEXT, REPLY) and Wren on it fade to nothing in place and
         take no touches (the prototype's opacity 0 + pointer-events none;
         they used to slide down 160 under the keyboard);
       · the tab bar slides away (useTabBarAway: another view, the layout
         moves it — the Swift bar or PostTabBar);
       · the card shrinks with the keyboard, its top where it was, its foot
         CARD_AIR over the hint (today-cards replyCardHeight, from the
         keyboard's overlap and the hint and bar as drawn: 548 → 272 in the
         prototype, never under REPLY_CARD_MIN), and its letter drops to the
         compact size at once (replyBody: the telegram's 30 → 20), folding
         with UNFOLD ↓ when it still doesn't fit;
       · the reply bar (components/10a ReplyBar — the reply arrow, the
         field, the emoji key, the send disc — the same object as the
         pen-pal chat's) rises from just under the screen's edge to 12 over
         the keyboard, its hint (in capitals) 6 over it; it is bound to the
         card on screen (each letter keeps its own words; Return is a new
         line);
       · a scrim dims the desk.
     The keyboard's done, a tap on the scrim, VoiceOver's escape or a send
     end it the same way: the field lets go and everything goes back (the
     bar down and away, the card back to its height, the band in, the tab
     bar up). After a send the band stays out while the letter goes (the
     model's hideBand), as Wren takes it off her spot. With a hardware
     keyboard (no overlap) it is still reply mode: the bar sits on the tab
     bar's own line (barBottomGap), and the card shrinks only if the bar
     would reach it. Reduce Motion: the bar and the band fade where they
     stand, the card's change of size is a short ease.
   - done: the buttons go, Wren fades from the ground into her window, and
     her letter comes up in the card's place (her counted note, the bag with
     three sealed envelopes and when it opens, the countdown). The window offers a lap of her
     game when she can play, else when she's back. Opening into a finished
     desk draws it at rest.
   - the first arrival: her line in a bubble over her head while the first
     three letters are up; the first card unfolds.
   - the + panel: the band, Wren and the window step aside, the card steps
     back a little.
   LetterReader and TodayOverlays are shared with the SwiftUI desk (the
   route draws them over either).

   VoiceOver gets what the Swift card gives it: the card is one element
   whose moves are actions (write back, translate, unfold or play / pause,
   the ⋯'s items, next letter), focus follows a pass, her letter is one
   element and the bag another, escape puts the keyboard away. Reduce
   Motion: the card still follows the finger; a pass, a bring back and the
   day's end are short fades, and nothing loops. */

/* ── motion (KTodayMotion's numbers) ── */
const CARD_OUT_MS = 300;
const REDUCED_MS = 200;
const CARD_OUT: WithTimingConfig = { duration: CARD_OUT_MS, easing: Easing.bezier(0.4, 0, 0.7, 1) };
const CARD_OUT_FADE: WithTimingConfig = { duration: 240, easing: Easing.bezier(0.4, 0, 0.7, 1) };
const CARD_IN: WithTimingConfig = { duration: 340, easing: Easing.bezier(0.3, 1, 0.3, 1) };
const SPRING_BACK: WithTimingConfig = { duration: 300, easing: Easing.bezier(0.3, 1, 0.3, 1) };
const BAND_FADE: WithTimingConfig = { duration: 300, easing: Easing.out(Easing.ease) };
/** the keyboard's own length, for what moves with it while writing back: the card's height, the reply bar rising */
const BAND_SLIDE: WithTimingConfig = { duration: 350, easing: Easing.inOut(Easing.ease) };
/** the reply bar coming into sight and going (its slide is BAND_SLIDE) */
const BAR_FADE: WithTimingConfig = { duration: 200, easing: Easing.out(Easing.ease) };
const BAND_DROP: WithTimingConfig = { duration: 350, easing: Easing.inOut(Easing.ease) };
const WINDOW_IN: WithTimingConfig = { duration: 450, easing: Easing.out(Easing.ease) };
const STEP_BACK: WithTimingConfig = { duration: 400, easing: Easing.bezier(0.3, 1, 0.3, 1) };
const REDUCED: WithTimingConfig = { duration: REDUCED_MS, easing: Easing.inOut(Easing.ease) };
/** the next card comes in this long after the one going out starts */
const SWAP_MS = 300;
/** no new pass until the transition is over */
const BUSY_MS = 640;
const BUSY_REDUCED_MS = 220;
/** a pass the model didn't take springs back after this */
const UNTAKEN_MS = 600;
/** she stays curious this long after a pass (not the last) */
const CURIOUS_MS = 1200;
/** VoiceOver's focus goes to the new card once it is on screen */
const FOCUS_MS = 400;

/* ── her reactions (KWireWren's numbers) ── */
/** she takes a reply up and out of sight in this long (climbing first, speeding up) */
const ERRAND_OUT_MS = 900;
/** and comes back in this long after take-off */
const ERRAND_AWAY_MS = 2500;
/** dropping onto her spot (slowing to land) */
const LANDING_MS = 700;
const TAKE_OFF: WithTimingConfig = { duration: ERRAND_OUT_MS, easing: Easing.bezier(0.45, 0, 0.8, 0.6) };
const LANDING: WithTimingConfig = { duration: LANDING_MS, easing: Easing.bezier(0.2, 0.6, 0.35, 1) };
/** how far past the edges the errand takes her */
const ERRAND_BEYOND = 60;
const ERRAND_ABOVE = 80;
/** delighted this long after a tap */
const HOP_FACE_MS = 600;
/** the unfold's lean waits this long for the reader before she straightens up */
const LEAN_WAIT_MS = 1500;
/** back from a lean */
const LEAN_BACK: WithTimingConfig = { duration: 250, easing: Easing.out(Easing.ease) };

/* ── the pull (the Swift deck's numbers) ── */
const PULL = 110;
const PULL_DOWN = 0.25;
const PULL_FADE = 0.35;
const CURIOUS_AT = 0.08;

/* ── the band (KBandLayout's numbers; band-local points, origin = the band's top-left, 68 tall) ── */
const DISC = 52;
const LABEL_GAP = 7;
/** two discs spaced evenly across the width (122.33 / 270.67 at 393) */
const nextX = (w: number) => (w - 2 * DISC) / 3 + DISC / 2;
const replyX = (w: number) => w - nextX(w);
/** Wren on the ground between the buttons, at 36: her feet (.9 of her frame) level with the discs' foot */
const GROUND_SIZE = 36;
const GROUND_Y = DISC - GROUND_SIZE * 0.4;
const groundCentre = (w: number) => ({ x: w / 2, y: GROUND_Y });
/** the window: 64 tall, its foot 2 above the band's */
const WINDOW_H = 64;
const WINDOW_TOP = CONTROL_H - 2 - WINDOW_H;
/** Wren in the window: her centre, band-local, at 34 (53 in, 33 under the window's top) */
const NEST_SIZE = 34;
const NEST = { x: 53, y: WINDOW_TOP + 33 };
/** the arrival bubble's tail tip, band-local: its box sits 6 over her head, the tail reaches down 5 */
const BUBBLE_TIP = GROUND_Y - GROUND_SIZE / 2 - 6 + 5;


/* the first of what she brought back opens the way your letter folded, in reverse */
const UNFOLD = { scaleY: 0.55, opacity: 0.5, delay: 140, duration: 520 };

/** a value that moves to `target` with `config` whenever it changes (and starts there) */
function useTo(target: number, config: WithTimingConfig): SharedValue<number> {
  const sv = useSharedValue(target);
  const configRef = useRef(config);
  configRef.current = config;
  useEffect(() => {
    sv.value = withTiming(target, configRef.current);
  }, [target, sv]);
  return sv;
}

/* ── the day's end: KDayFlow's timeline, in React Native ── */

type Face = "idle" | "curious" | "delight" | "sleepy" | "fly";
type Flow = {
  /** nothing of the day's end has happened: the desk is being read */
  reading: boolean;
  /** the day ended while the desk was on screen (what comes in, comes in moving) */
  playing: boolean;
  /** NEXT and REPLY are up */
  band: boolean;
  /** her letter is in the card's place */
  letter: boolean;
  /** where she is: on the ground between the buttons, in the air, in her window */
  wren: "ground" | "away" | "window";
  window: boolean;
  /** her flap and the window's pipes run */
  looping: boolean;
  /** her face, over the desk's rules */
  face: Face | null;
};
const READING: Flow = { reading: true, playing: false, band: true, letter: false, wren: "ground", window: false, looping: false, face: null };
const restFlow = (canPlay: boolean, reduce: boolean, playing = false): Flow => ({
  reading: false,
  playing,
  band: false,
  letter: true,
  wren: "window",
  window: true,
  looping: canPlay && !reduce,
  face: canPlay ? "fly" : "idle",
});

/**
 * The desk becoming done while on screen plays the ground band's timeline
 * (KDayFlow; t = 0 is the last card's release): her face at once (a yawn
 * in her night hours), at 300 the buttons gone, her letter coming up and
 * Wren leaving the ground, at 700 the window and Wren in it, at 1300 her
 * flap when she can play. Opening in done draws it at rest; leaving done
 * (the day turned at eight) goes back to reading.
 */
function useDayFlow({ phase, night, canPlay, reduce }: { phase: DeskPhase; night: boolean; canPlay: boolean; reduce: boolean }): Flow {
  const [flow, setFlow] = useState<Flow>(() => (phase === "done" ? restFlow(canPlay, reduce) : READING));
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const facts = useRef({ night, canPlay, reduce });
  facts.current = { night, canPlay, reduce };
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  useEffect(() => {
    const f = flowRef.current;
    if (phase === "done" && f.reading) {
      clear();
      const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
      const { night: n, reduce: r } = facts.current;
      setFlow({ ...READING, reading: false, playing: true, face: n ? "sleepy" : "idle" });
      if (r) {
        at(300, () => setFlow(restFlow(facts.current.canPlay, true, true)));
        return;
      }
      at(300, () => setFlow((s) => ({ ...s, band: false, letter: true, wren: "away", face: "fly" })));
      at(700, () => setFlow((s) => ({ ...s, window: true, wren: "window" })));
      at(1300, () => {
        const c = facts.current.canPlay;
        setFlow((s) => ({ ...s, looping: c && !facts.current.reduce, face: c ? "fly" : "idle" }));
      });
    } else if (phase !== "done" && !f.reading) {
      clear();
      setFlow(READING);
    }
  }, [phase]);

  // at rest, she follows whether she can play (hungry, hatched)
  useEffect(() => {
    setFlow((s) => (s.reading || !s.window ? s : { ...s, looping: canPlay && !reduce, face: canPlay ? "fly" : "idle" }));
  }, [canPlay, reduce]);

  return flow;
}

/* ── she takes the letter ── */

type Errand = {
  /** out, away or coming back: the fly face, no hops, no bubble */
  away: boolean;
  /** the reply's envelope at her feet (on the way out) */
  carrying: boolean;
  /** off the band (true) or on her way back to it (false) */
  out: boolean;
  /** which way: up past the top right going, from past the top left coming back */
  side: 1 | -1;
  /** Reduce Motion: faded out with the letter */
  gone: boolean;
};
const HOME: Errand = { away: false, carrying: false, out: false, side: 1, gone: false };

/**
 * Each time the model's carry moves (a reply left the phone) she takes the
 * letter: the fly face and a small envelope, up and out past the top right,
 * round to the other side out of sight, and 2.5 s after take-off back in
 * from the top left onto her spot. Reduce Motion: the fly face with the
 * envelope, a fade out, and back. Once the day is ending the flow has her
 * (she leaves the ground with it); she is home again for the next day.
 */
function useErrand({ carry, reading, reduce }: { carry: number; reading: boolean; reduce: boolean }): Errand {
  const [errand, setErrand] = useState<Errand>(HOME);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);
  const facts = useRef({ reading, reduce });
  facts.current = { reading, reduce };
  const lastCarry = useRef(carry);

  useEffect(() => {
    const before = lastCarry.current;
    lastCarry.current = carry;
    if (carry <= before || !facts.current.reading) return;
    clear();
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    if (facts.current.reduce) {
      setErrand({ ...HOME, away: true, carrying: true });
      at(600, () => setErrand((e) => ({ ...e, gone: true })));
      at(ERRAND_AWAY_MS, () => setErrand(HOME));
      return;
    }
    setErrand({ away: true, carrying: true, out: true, side: 1, gone: false });
    // out of sight: round to the other side, where she comes back from
    at(ERRAND_OUT_MS, () => setErrand((e) => ({ ...e, carrying: false, side: -1 })));
    at(ERRAND_AWAY_MS, () => setErrand((e) => ({ ...e, out: false })));
    at(ERRAND_AWAY_MS + LANDING_MS, () => setErrand(HOME));
  }, [carry]);

  useEffect(() => {
    if (reading) return;
    clear();
    setErrand(HOME);
  }, [reading]);

  return errand;
}

/* ── the deck: which card is on screen, and how it got there ── */

type Enter = { kind: "none" | "below" | "above" | "fresh"; delay: number };
type Leaving = { key: number; card: CardVM; letter: PoolLetter | null; dir: "up" | "down"; y: number; opacity: number };
type DeckState = {
  /** the card on screen (the model's first unpassed letter) */
  id: string | null;
  enter: Enter;
  /** the card going out, kept as it was drawn */
  leaving: Leaving | null;
  serial: number;
  /** a transition is running: no new pass */
  busy: boolean;
  /** VoiceOver's focus follows (a pass, a bring back, a letter that left) */
  focus: boolean;
};
type Shown = { card: CardVM; letter: PoolLetter | null };

/**
 * What a change of the card on screen means (by id; the model wins):
 * the pass this deck released (out up from where the finger left it, the
 * next in from below), a bring back (a letter is first again and the shown
 * one is behind it — only a bring back puts one before it, the desk's deal
 * keeps its head — so a pass made before a relaunch comes back the same
 * way: out down, in from above), the shown
 * letter leaving (answered, blocked, taken back: out up, then the next),
 * or anything else (the next comes in). The first card after loading
 * comes in, or unfolds on her first return.
 */
function nextDeck(
  d: DeckState,
  a: { shownId: string | null; ids: readonly string[]; last: Shown | null; release: { id: string; y: number; opacity: number } | null; fresh: boolean },
): DeckState {
  const prevId = d.id;
  const serial = d.serial + 1;
  const base = { id: a.shownId, serial, busy: true };
  const last = a.last && a.last.card.id === prevId ? a.last : null;
  const leave = (dir: "up" | "down", y = 0, opacity = 1): Leaving | null => (last ? { key: serial, card: last.card, letter: last.letter, dir, y, opacity } : null);
  if (prevId == null) return { ...base, enter: { kind: a.fresh ? "fresh" : "below", delay: 0 }, leaving: d.leaving, focus: false };
  if (a.release && a.release.id === prevId) return { ...base, enter: { kind: "below", delay: SWAP_MS }, leaving: leave("up", a.release.y, a.release.opacity), focus: true };
  const prevAt = a.ids.indexOf(prevId);
  if (a.shownId != null && prevAt >= 1) return { ...base, enter: { kind: "above", delay: SWAP_MS }, leaving: leave("down"), focus: true };
  if (prevAt < 0) return { ...base, enter: { kind: "below", delay: SWAP_MS }, leaving: leave("up"), focus: true };
  return { ...base, enter: { kind: "below", delay: 0 }, leaving: null, focus: false };
}

/* ── the tab ── */

type Nav = { addListener?: (type: string, cb: () => void) => () => void; isFocused?: () => boolean };

export function TodayRN({ model }: { model: TodayModel }) {
  useLang();
  const { t: tk, dark, key: themeKey } = useTheme();
  const { view, act } = model;
  const insets = useScreenInsets();
  const win = useWindowDimensions();
  const navigation = useNavigation();
  const reduce = useReducedMotion();
  const strip = useRef<ReplyBarHandle>(null);
  const cardEl = useRef<View | null>(null);

  /* the Host's size: the root's own layout (the dev page gives it less than the window) */
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const W = size?.w ?? win.width;
  const H = size?.h ?? win.height;
  const geo = deskGeometry({ hostH: H, safeTop: insets.top, tabBarRoom: insets.tabBarRoom });

  /* ── the keyboard ──
     `kb` is the software keyboard's overlap at the root's bottom (0 while it is down, and with a
     hardware keyboard, which has none): reckoned as the bar's KeyboardAvoidingView reckons it (its
     frame's foot less the keyboard's top; the root starts at the window's top on the tab and on the
     dev page), so the card shrinks by exactly what lifts the bar. */
  const [typing, setTyping] = useState(false);
  const [kb, setKb] = useState(0);
  const hostH = useRef(H);
  hostH.current = H;
  useEffect(() => {
    const at = (e: KeyboardEvent) => {
      const top = e.endCoordinates.screenY;
      // a screenY of 0 is Prefer Cross-Fade Transitions' report: the avoiding view adds nothing then either
      setKb(top > 0 ? Math.max(0, Math.round(hostH.current - top)) : 0);
    };
    const s = Keyboard.addListener("keyboardWillShow", at);
    const c = Keyboard.addListener("keyboardWillChangeFrame", at);
    const h = Keyboard.addListener("keyboardWillHide", () => setKb(0));
    // a blur that never arrived (the field unmounted as it let go) still ends the writing
    const d = Keyboard.addListener("keyboardDidHide", () => {
      setKb(0);
      if (!strip.current?.isFocused()) setTyping(false);
    });
    return () => {
      s.remove();
      c.remove();
      h.remove();
      d.remove();
    };
  }, []);
  const putAway = useCallback(() => {
    strip.current?.blur();
    dismissKeyboard();
  }, []);
  // pressing Today again while on it only drops the keyboard: there is no first letter to go back to
  useEffect(() => {
    const nav = navigation as unknown as Nav;
    if (!nav.addListener) return;
    return nav.addListener("tabPress", () => {
      if (nav.isFocused?.()) putAway();
    });
  }, [navigation, putAway]);

  /* ── the day's end ── */
  const flow = useDayFlow({ phase: view.phase, night: view.night, canPlay: view.window.canPlay, reduce });

  /* ── the deck ── */
  const cards = view.cards;
  const shown = cards[0] ?? null;
  const shownId = shown?.id ?? null;
  const lastRef = useRef<Shown | null>(null);
  const releaseRef = useRef<{ id: string; y: number; opacity: number } | null>(null);
  const [deck, setDeck] = useState<DeckState>(() => ({
    id: shownId,
    enter: { kind: shownId && view.freshUnfold ? "fresh" : "none", delay: 0 },
    leaving: null,
    serial: 0,
    busy: false,
    focus: false,
  }));
  if (deck.id !== shownId) {
    // the card on screen changed: decided while rendering, so the card that comes in mounts with its motion
    setDeck(nextDeck(deck, { shownId, ids: cards.map((c) => c.id), last: lastRef.current, release: releaseRef.current, fresh: view.freshUnfold }));
  }
  // the card as last drawn, for the next transition to take out
  useLayoutEffect(() => {
    lastRef.current = shown ? { card: shown, letter: view.feed.find((l) => l.id === shown.id) ?? null } : null;
  });

  const dragY = useSharedValue(0);
  const dragP = useSharedValue(0);
  const curiousSV = useSharedValue(false);

  // a transition took the pull with it: the new card starts at rest
  useLayoutEffect(() => {
    if (deck.serial === 0) return;
    releaseRef.current = null;
    dragY.value = 0;
    dragP.value = 0;
  }, [deck.serial, dragY, dragP]);
  useEffect(() => {
    if (!deck.busy) return;
    const s = deck.serial;
    const id = setTimeout(() => setDeck((d) => (d.serial === s ? { ...d, busy: false } : d)), reduce ? BUSY_REDUCED_MS : BUSY_MS);
    return () => clearTimeout(id);
  }, [deck.serial, deck.busy, reduce]);
  useEffect(() => {
    if (!deck.focus) return;
    const id = setTimeout(() => {
      if (cardEl.current) AccessibilityInfo.sendAccessibilityEvent(cardEl.current, "focus");
    }, FOCUS_MS);
    return () => clearTimeout(id);
  }, [deck.serial, deck.focus]);
  const leaveDone = useCallback((key: number) => setDeck((d) => (d.leaving?.key === key ? { ...d, leaving: null } : d)), []);

  /* ── her face and her reactions ── */
  const [dragCurious, setDragCurious] = useState(false);
  const [passCurious, setPassCurious] = useState(false);
  const curiousTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* a tap: she hops (its serial) and is delighted for a moment */
  const [hop, setHop] = useState(0);
  const [hopping, setHopping] = useState(false);
  const hopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* a long letter unfolding: she leans in, curious, until the reader closes */
  const [unfoldLean, setUnfoldLean] = useState(false);
  const leanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (curiousTimer.current) clearTimeout(curiousTimer.current);
      if (hopTimer.current) clearTimeout(hopTimer.current);
      if (leanTimer.current) clearTimeout(leanTimer.current);
    },
    [],
  );
  const readerOpen = view.readerId != null;
  const readerOpenRef = useRef(readerOpen);
  readerOpenRef.current = readerOpen;
  useEffect(() => {
    // the reader closed (or the day moved on): she straightens up
    if (!readerOpen) setUnfoldLean(false);
  }, [readerOpen]);
  const errand = useErrand({ carry: view.wren.carry, reading: flow.reading, reduce });
  useEffect(() => {
    if (!flow.reading || errand.away) {
      setUnfoldLean(false);
      setHopping(false);
    }
  }, [flow.reading, errand.away]);
  const current = view.current;
  /* writing: the field has the keyboard, and is still there (a send, the day's end or the letter leaving takes it away) */
  const stripShown = !!current && !view.sending && view.phase === "reading";
  const writing = typing && stripShown;
  // writing back is reply mode: the tab bar steps away (another view: the layout moves it) and comes back with the band
  useTabBarAway(writing);
  const face: Face =
    flow.face ?? (errand.away ? "fly" : hopping || writing ? "delight" : unfoldLean || dragCurious || passCurious ? "curious" : view.wren.rest);
  const perchFly = view.wren.stage != null && view.wren.stage !== "wren";

  const plusClosed = view.plus === "closed";
  const deckEnabled = view.phase === "reading" && !writing && plusClosed && !view.hideBand && !deck.busy && flow.reading;
  const enabledRef = useRef(deckEnabled);
  enabledRef.current = deckEnabled;
  const shownRef = useRef(shownId);
  shownRef.current = shownId;
  const countRef = useRef(cards.length);
  countRef.current = cards.length;

  const springBack = useCallback(() => {
    dragY.value = withTiming(0, SPRING_BACK);
    dragP.value = withTiming(0, SPRING_BACK);
  }, [dragY, dragP]);

  /* A PASS: the pull let go past the line, NEXT, or VoiceOver's "Next
     letter". The model is told at once (NEXT's number, the reply's binding,
     done all follow it); the card going out is kept as it was drawn. */
  const releaseImpl = useRef<(y: number, opacity: number) => void>(() => {});
  releaseImpl.current = (y, opacity) => {
    const id = shownRef.current;
    if (!id || !enabledRef.current) {
      springBack();
      return;
    }
    releaseRef.current = { id, y, opacity };
    if (countRef.current > 1) {
      setPassCurious(true);
      if (curiousTimer.current) clearTimeout(curiousTimer.current);
      curiousTimer.current = setTimeout(() => setPassCurious(false), CURIOUS_MS);
    }
    act.pass(id);
    setTimeout(() => {
      if (releaseRef.current?.id !== id) return;
      releaseRef.current = null;
      springBack();
    }, UNTAKEN_MS);
  };
  const onRelease = useCallback((y: number, opacity: number) => releaseImpl.current(y, opacity), []);
  const next = useCallback(() => releaseImpl.current(0, 1), []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(deckEnabled)
        .activeOffsetY([-10, 10])
        .onUpdate((e) => {
          const dy = e.translationY;
          dragY.value = dy < 0 ? dy : dy * PULL_DOWN;
          const p = Math.min(1, Math.max(0, -dy / PULL));
          dragP.value = p;
          const c = p > CURIOUS_AT;
          if (c !== curiousSV.value) {
            curiousSV.value = c;
            runOnJS(setDragCurious)(c);
          }
        })
        .onEnd((_e, success) => {
          if (success && dragP.value >= 1) {
            runOnJS(onRelease)(dragY.value, 1 - PULL_FADE * dragP.value);
          } else {
            dragY.value = withTiming(0, SPRING_BACK);
            dragP.value = withTiming(0, SPRING_BACK);
          }
          if (curiousSV.value) {
            curiousSV.value = false;
            runOnJS(setDragCurious)(false);
          }
        }),
    [deckEnabled, onRelease, dragY, dragP, curiousSV],
  );

  /* REPLY: the field bound to the card on screen takes the keyboard (that is reading it: the receipt goes now) */
  const reply = useCallback(() => {
    const id = shownRef.current;
    if (!id || !enabledRef.current) return;
    strip.current?.focus();
    act.replyOpen(id);
  }, [act]);

  /* the ⋯: Bring back (when offered), Report, Block, never mind */
  const openMenu = useCallback(
    (card: CardVM) => {
      const items = [...card.menu.filter((m) => m.key === "bringBack"), ...card.menu.filter((m) => m.key !== "bringBack")];
      if (items.length === 0) return;
      if (Platform.OS !== "ios") {
        act.openMenu(card.id);
        return;
      }
      const destructive = items.findIndex((m) => m.destructive);
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...items.map((m) => m.title), t("rp.menu.never")], cancelButtonIndex: items.length, destructiveButtonIndex: destructive >= 0 ? destructive : undefined },
        (i) => {
          const m = items[i];
          if (!m) return;
          if (m.key === "bringBack") act.bringBack();
          else if (m.key === "report" || m.key === "block") act.cardAction(card.id, m.key);
        },
      );
    },
    [act],
  );
  /* UNFOLD: she leans in, curious, as the reader is asked for (never waited for); no reader after all, she straightens up */
  const leanIn = useCallback(() => {
    setUnfoldLean(true);
    if (leanTimer.current) clearTimeout(leanTimer.current);
    leanTimer.current = setTimeout(() => {
      if (!readerOpenRef.current) setUnfoldLean(false);
    }, LEAN_WAIT_MS);
  }, []);
  const cardActionByName = useCallback(
    (id: string, name: string) => {
      if (name === "reply") reply();
      else if (name === "next") next();
      else if (name === "bringBack") act.bringBack();
      else if (name === "translate" || name === "unfold" || name === "voice" || name === "report" || name === "block") {
        if (name === "unfold") leanIn();
        act.cardAction(id, name);
      }
    },
    [act, reply, next, leanIn],
  );

  /* ── the card slot steps back for the + panel ── */
  const stepY = useTo(view.plus === "sheet" ? -10 : 0, STEP_BACK);
  const stepS = useTo(view.plus === "sheet" ? 0.98 : view.plus === "pop" ? 0.97 : 1, STEP_BACK);
  const slotStyle = useAnimatedStyle(() => ({ transform: [{ translateY: stepY.value }, { scale: stepS.value }] }));

  /* ── who shows ── */
  const bandHidden = view.hideBand || !plusClosed;
  // she steps aside for the reader and the + panel; a reply in the air is hers to carry
  const groundShown = flow.wren === "ground" && plusClosed && !(readerOpen && flow.reading);
  const nestShown = flow.wren === "window" && plusClosed;
  const windowShown = flow.window && plusClosed;
  const bubbleShown = view.arrival.open && view.arrival.line !== "" && groundShown && !writing && !errand.away;
  /* a tap on her: 8 up and back with a light haptic, delighted for a moment (not while writing, away, or once the day is ending) */
  const tappable = groundShown && flow.reading && flow.face == null && !writing && !errand.away;
  const onHop = useCallback(() => {
    setHop((n) => n + 1);
    setHopping(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (hopTimer.current) clearTimeout(hopTimer.current);
    hopTimer.current = setTimeout(() => setHopping(false), HOP_FACE_MS);
  }, []);
  const replyState = view.reply.state;
  const stripKey = current ? `${current.id}:${view.draftEpoch}` : "";
  useEffect(() => {
    // a new letter's field (or none) starts without the keyboard
    setTyping(false);
  }, [stripKey, stripShown]);

  /* ── reply mode's room (KReplyStage in Swift) ──
     The hint and the bar as drawn (the bar grows to four lines, the hint wraps to two; the bar's
     hard shadow hangs outside), measured; until then one line of hint over the resting bar. */
  const [stripH, setStripH] = useState<number>(REPLY_BAR.minHeight + REPLY_BAR.hintGap + 13);
  // with no software keyboard (a hardware one) the bar stands on the tab bar's own line: it is away
  const bottomGap = barBottomGap(insets.bottom);
  // 12 over the software keyboard (the avoiding view stands the bar on it); on the tab bar's line with none
  const barGap = Math.max(REPLY_GAP, bottomGap - kb);
  // the card's height while writing back, or null when it needn't shrink (a hardware keyboard's bar under its foot)
  const replyH = writing ? replyCardHeight(geo, { hostH: H, keyboard: kb, strip: stripH, bottomGap }) : null;
  // the letter at the compact size: only while the card is shrunk (it comes and goes at once, as in Swift)
  const compact = replyH != null;
  const slotTarget = replyH ?? geo.cardH;
  /* the slot's height: the keyboard's length while it is the reply that changes it (shrinking, and
     growing back once the field lets go), a short ease under Reduce Motion; anything else (the
     root's first measure, a rotation) at once */
  const slotH = useSharedValue(slotTarget);
  const wasWriting = useRef(writing);
  useEffect(() => {
    const animate = writing || wasWriting.current;
    wasWriting.current = writing;
    slotH.value = animate ? withTiming(slotTarget, reduce ? REDUCED : BAND_SLIDE) : slotTarget;
  }, [slotTarget, writing, reduce, slotH]);
  /* the bar: up from just under the screen's edge with the keyboard (its own height, its gap and the
     hard shadow's 2 beyond the edge), down and away with it; a fade alone under Reduce Motion */
  const barY = useTo(writing || reduce ? 0 : stripH + barGap + REPLY_BAR.shadow + 8, BAND_SLIDE);
  const barO = useTo(writing ? 1 : 0, reduce ? REDUCED : BAR_FADE);
  const barStyle = useAnimatedStyle(() => ({ opacity: barO.value, transform: [{ translateY: barY.value }] }));
  const slotHeight = useAnimatedStyle(() => ({ height: slotH.value }));

  const scrim = dark ? "rgba(0,0,0,0.35)" : "rgba(30,27,53,0.18)";
  const ground = groundCentre(W);

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Ground w={W} h={H} color={groundBase(themeKey)} />

      {/* the card slot: placed by its top, so while writing back it shrinks from its foot */}
      <Animated.View style={[{ position: "absolute", left: 16, right: 16, top: geo.cardTop }, slotHeight, slotStyle]}>
        {(view.phase === "loading" || view.phase === "offline") && !deck.leaving && <StatusCard kind={view.phase} strings={view.strings} />}
        {view.phase === "reading" && shown && (
          <GestureDetector gesture={pan}>
            <MovingCard key={`${shown.id}:${deck.serial}`} enter={deck.enter} reduce={reduce} still={deck.busy} dragY={dragY} dragP={dragP}>
              <CardFace
                card={shown}
                letter={view.feed.find((l) => l.id === shown.id) ?? null}
                model={model}
                compact={compact}
                onAction={(name) => cardActionByName(shown.id, name)}
                onMenu={() => openMenu(shown)}
                cardRef={(el) => {
                  cardEl.current = el;
                }}
              />
            </MovingCard>
          </GestureDetector>
        )}
        {deck.leaving && (
          <LeavingCard key={`out:${deck.leaving.key}`} leaving={deck.leaving} reduce={reduce} onDone={leaveDone}>
            <CardFace card={deck.leaving.card} letter={deck.leaving.letter} model={model} still />
          </LeavingCard>
        )}
        {flow.letter && <WrenLetterRN letter={view.wrenLetter} animateIn={flow.playing} reduce={reduce} wilt={view.wren.wilt} />}
      </Animated.View>

      <HeaderRN title={view.strings.title} safeTop={insets.top} />

      <BandRN
        width={W}
        top={geo.controlTop}
        left={view.left}
        leftA11y={view.leftA11y}
        strings={view.strings}
        ready={view.phase === "reading" || view.phase === "done"}
        hidden={bandHidden}
        typing={writing}
        flow={flow}
        reduce={reduce}
        dark={dark}
        onNext={next}
        onReply={reply}
      />

      <FlightWindowRN model={view.window} top={geo.controlTop + WINDOW_TOP} shown={windowShown} looping={flow.looping} reduce={reduce} onTap={act.window} />

      {/* Wren on the ground between the buttons */}
      <GroundWren
        x={ground.x}
        y={geo.controlTop + ground.y}
        width={W}
        shown={groundShown}
        typing={writing && !errand.away}
        face={face}
        wilt={view.wren.wilt}
        perchFly={perchFly}
        errand={errand}
        reduce={reduce}
        dragP={dragP}
        dragY={dragY}
        leanFull={unfoldLean}
        hop={hop}
        tappable={tappable}
        onTap={onHop}
        a11y={view.wren.a11y}
        name={view.wren.name}
      />
      {/* Wren in her window */}
      <NestWren x={NEST.x} y={geo.controlTop + NEST.y} shown={nestShown} looping={flow.looping} face={face} wilt={view.wren.wilt} perchFly={perchFly} reduce={reduce} />

      {/* her first-arrival line, over her head */}
      {bubbleShown && <ArrivalBubble line={view.arrival.line} bottom={H - (geo.controlTop + BUBBLE_TIP)} />}

      {/* while you write: the desk dims, a tap on it puts the keyboard away */}
      {writing && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={putAway} accessible={false} importantForAccessibility="no" />
        </Animated.View>
      )}

      {/* the reply bar, bound to the letter on screen: always mounted for it (the field must be there to
          take the keyboard), waiting under the screen's edge, risen on the keyboard while writing back */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={{ flex: 1 }} pointerEvents="box-none" />
        {current && stripShown ? (
          <Animated.View
            collapsable={false}
            pointerEvents={writing ? "auto" : "none"}
            accessibilityElementsHidden={!writing}
            importantForAccessibility={writing ? "auto" : "no-hide-descendants"}
            // VoiceOver's escape (the two-finger scrub) puts the keyboard away without sending
            onAccessibilityEscape={writing ? putAway : undefined}
            // the hint and the bar as drawn: the card's room, and how far under the edge the bar waits
            onLayout={(e) => {
              const h = Math.round(e.nativeEvent.layout.height);
              setStripH((was) => (Math.abs(was - h) > 0.5 ? h : was));
            }}
            style={[{ paddingHorizontal: 16, marginBottom: barGap }, barStyle]}
          >
            <ReplyBar
              // each letter keeps its own words; a draft written in the reader comes back with it
              key={stripKey}
              ref={strip}
              placeholder={shown?.id === current.id && shown.replyPlaceholder ? shown.replyPlaceholder : view.strings.placeholder}
              // in capitals, as the prototype sets it (the headwind line is lower case elsewhere); the
              // bar only shows with the keyboard, so its hint is up whenever it is
              hint={replyState.hint.toLocaleUpperCase(localeTag())}
              hintWarn={replyState.hintWarn}
              showsHint
              sendLabel={view.strings.send}
              emojiLabel={view.strings.emoji}
              initialText={model.draftFor(current.id)}
              canSend={replyState.ok && !view.sending}
              held={replyState.pouchFull}
              returnSends={false}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              onChangeText={(v) => act.changeDraft(current.id, v)}
              // the words stay until the letter leaves the desk (a failed send keeps them)
              onSend={(v) => {
                act.send(current.id, v);
                return false;
              }}
              // the bar's hard shadow hangs 2 to the right
              style={{ marginRight: REPLY_BAR.shadow }}
            />
          </Animated.View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

/* ── the page's ground: a faint radial wash at the bottom, so the glass reads ── */

/** the ground's centre colour, as KTodayGround.base: the design's #DCD9F3 on
    Classic (Lavender's lav; Classic's lav2 is half as deep against white
    and the glass vanished on it), the theme's own lav elsewhere */
function groundBase(key: ThemeKey): string {
  return key === "classic" ? THEMES.lavender.lav : THEMES[key].lav;
}

function Ground({ w, h, color }: { w: number; h: number; color: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id="todayGround" cx={w / 2} cy={h} rx={1.2 * w} ry={0.6 * h} fx={w / 2} fy={h} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill="url(#todayGround)" />
      </Svg>
    </View>
  );
}

/* ── the title: the main tabs' page title (System 700 22, leading), as Notes,
   Kindreds and Me; it no longer shrinks into a centred postmark with the
   pull or once a letter has been passed (owner, 10-20) ── */

function HeaderRN({ title, safeTop }: { title: string; safeTop: number }) {
  const { t: tk } = useTheme();
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: safeTop + BAND, backgroundColor: tk.bg }}>
      <View style={{ position: "absolute", top: safeTop, left: 0, right: 0, height: BAND, paddingHorizontal: 22, flexDirection: "row", alignItems: "center" }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          accessibilityRole="header"
          style={{ flexShrink: 1, fontWeight: "700", fontSize: 22, color: tk.ink }}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

/* ── a card moving: the one on screen (in, and the pull), and the one going out ── */

function MovingCard({ enter, reduce, still, dragY, dragP, children }: { enter: Enter; reduce: boolean; /** a transition is running: no taps */ still: boolean; dragY: SharedValue<number>; dragP: SharedValue<number>; children: ReactNode }) {
  const moving = enter.kind !== "none";
  const fresh = enter.kind === "fresh" && !reduce;
  const y = useSharedValue(!moving || reduce || fresh ? 0 : enter.kind === "above" ? -120 : 70);
  const s = useSharedValue(!moving || reduce || fresh ? 1 : enter.kind === "above" ? 0.97 : 0.98);
  const sy = useSharedValue(fresh ? UNFOLD.scaleY : 1);
  const o = useSharedValue(!moving ? 1 : fresh ? UNFOLD.opacity : 0);
  useEffect(() => {
    if (!moving) return;
    if (reduce) {
      o.value = withTiming(1, REDUCED);
      return;
    }
    if (fresh) {
      const cfg = { duration: UNFOLD.duration, easing: Easing.out(Easing.cubic) };
      sy.value = withDelay(UNFOLD.delay, withTiming(1, cfg));
      o.value = withDelay(UNFOLD.delay, withTiming(1, cfg));
      return;
    }
    y.value = withDelay(enter.delay, withTiming(0, CARD_IN));
    s.value = withDelay(enter.delay, withTiming(1, CARD_IN));
    o.value = withDelay(enter.delay, withTiming(1, CARD_IN));
    // its motion is decided once, at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: o.value * (1 - PULL_FADE * dragP.value),
    transform: [{ translateY: y.value + dragY.value }, { scale: s.value }, { scaleY: sy.value }],
  }));
  return (
    <Animated.View pointerEvents={still ? "none" : "auto"} style={[StyleSheet.absoluteFill, style]}>
      {children}
    </Animated.View>
  );
}

function LeavingCard({ leaving, reduce, onDone, children }: { leaving: Leaving; reduce: boolean; onDone: (key: number) => void; children: ReactNode }) {
  const y = useSharedValue(leaving.y);
  const s = useSharedValue(1);
  const o = useSharedValue(leaving.opacity);
  useEffect(() => {
    if (reduce) {
      o.value = withTiming(0, REDUCED);
    } else {
      const up = leaving.dir === "up";
      y.value = withTiming(up ? -120 : 70, CARD_OUT);
      s.value = withTiming(up ? 0.97 : 0.98, CARD_OUT);
      o.value = withTiming(0, CARD_OUT_FADE);
    }
    const id = setTimeout(() => onDone(leaving.key), (reduce ? REDUCED_MS : CARD_OUT_MS) + 20);
    return () => clearTimeout(id);
    // its motion is decided once, at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }, { scale: s.value }] }));
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, style]}>
      {children}
    </Animated.View>
  );
}

/* ── the first load, and an offline cold start with nothing kept ── */

function StatusCard({ kind, strings }: { kind: "loading" | "offline"; strings: TodayStrings }) {
  const { t: tk } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
      <InkPanel variant="me" style={{ flex: 1 }} contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {kind === "loading" ? (
          <View accessible accessibilityLabel={strings.loadingA11y} style={StyleSheet.absoluteFill} />
        ) : (
          <View accessible>
            <Text style={{ fontSize: 20, fontWeight: "600", color: tk.ink, textAlign: "center" }}>{strings.offlineTitle}</Text>
            <Text style={{ fontSize: 18, fontWeight: "400", lineHeight: 25, color: tk.sub, textAlign: "center", marginTop: 10 }}>{strings.offlineBody}</Text>
          </View>
        )}
      </InkPanel>
    </Animated.View>
  );
}

/* ── one letter, the card ── */

/* THE STAMP THEY PASTED (stamps v2, owner 2026-10-18): top-right of the
   card head, where the 34 box with the 28 art used to be, at the ladder's
   todayCard, 40×48 (it was 50×60 until the owner found it outweighed the
   letter) — delivered mail, so it tilts by the letter's id (the
   same tilt the sender's phone and the web give it). No box round it: a
   stamp is never framed twice. No postmark (the owner took it off). */
const CARD_STAMP = STAMP_LADDER.todayCard;

/* WHO WROTE IT (identity Phase 1; identity-plan §9 with the owner's
   2026-10-18 changes; KLetterCard's docket in SwiftUI). The card's `who`
   (lib/stranger-who, through today-cards) decides everything; this only
   lays it out, and only once the identity switch is on:

     ▢  Sunday Kite ♀ ♊                 [stamp]  ···
        SEP.23

   · the 40pt square face slot (corners at 25%): their frosted window
     (components/Frost), or for a deleted account the flat veil tile;
   · the courier name in system 600 17 on one line (the 165pt render gate
     means it fits; on the narrowest phones the glyphs wrap to a second
     line rather than the name being cut), the ♀/♂ mark 6pt after it and
     the star sign 4pt after that, both ink glyphs in sub
     (components/WhoName); under it the date alone in mono 500 11 in sub;
   · the stamp at the ladder's todayCard (40×48), no postmark; the ⋯ as
     three plain dots in sub on a 44 target, no circle.
   VoiceOver reads the card as one element, so the a11yLabel already opens
   "Sunday Kite, she, Gemini. SEP.23." and the row's parts are not read.
   Switch off, the docket below it is exactly today's: the mosaic and the
   postmark "SEP.23 · NO.7273". */
const WHO_FACE = 40;

function CardFace({
  card,
  letter,
  model,
  onAction,
  onMenu,
  cardRef,
  still = false,
  compact = false,
}: {
  card: CardVM;
  letter: PoolLetter | null;
  model: TodayModel;
  /** writing back and the slot has shrunk for the keyboard: the letter at the compact size (replyBody) */
  compact?: boolean;
  /** a VoiceOver action or a tap on the card, by name (reply, next, translate, unfold, voice, report, block, bringBack) */
  onAction?: (name: string) => void;
  onMenu?: () => void;
  /** the card's one VoiceOver element, so focus can be sent to it */
  cardRef?: (el: View | null) => void;
  /** the card going out: drawn, not touched */
  still?: boolean;
}) {
  const { t: tk } = useTheme();
  const face = useLetterFamily();
  const italic = useLetterFamily(true);
  const s = model.view.strings;
  const win = useWindowDimensions();
  // the identity switch (the table's row, or the dev preview): the header in its new shape
  const identity = useIdentityOn();
  // the voice action says what a press does now: pause while this letter plays
  const playing = model.voice.state?.key === card.id && !!model.voice.state?.playing;
  const [frameH, setFrameH] = useState(0);
  const [textH, setTextH] = useState(0);
  /* the letter's tier, or while writing back no more than 20, its leading scaled with it (30/40 →
     20/26.7; the long letter's 18/29 keeps its own): the shrunk card still shows its head and a few
     lines, folded as below (KCardText.compact) */
  const body = compact ? replyBody({ size: card.bodySize, line: card.bodyLine }) : { size: card.bodySize, line: card.bodyLine };
  // the slot's gutters (32), the card's padding (32) and the body's (8)
  const folded = !card.isVoice && overflows({ text: card.body, size: body.size, line: body.line, width: win.width - 72, frameH, textH });
  const text = { fontSize: body.size, lineHeight: body.line, color: tk.ink, textAlign: card.bodyCenter ? ("center" as const) : ("auto" as const) };
  const act = (name: string) => onAction?.(name);

  return (
    <InkPanel variant="me" style={{ flex: 1 }} contentStyle={{ flex: 1 }}>
      <View
        ref={cardRef}
        accessible={!still}
        accessibilityLabel={card.a11yLabel}
        accessibilityActions={[
          { name: "reply", label: s.replyA11y },
          ...(card.capsule.kind === "translate" && card.capsule.enabled ? [{ name: "translate", label: card.capsule.label }] : []),
          ...(card.isVoice ? (card.voiceReady ? [{ name: "voice", label: playing ? s.pause : s.play }] : []) : [{ name: "unfold", label: s.unfoldA11y }]),
          ...card.menu.map((m) => ({ name: m.key, label: m.title })),
          // the pull, without a pull (as the Swift card offers it)
          { name: "next", label: s.nextA11y },
        ]}
        onAccessibilityAction={(e) => act(e.nativeEvent.actionName)}
        style={{ flex: 1 }}
      >
        {/* the docket: their face, when and who on the left, the stamp they pasted, the ⋯ */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {identity ? (
            <>
              <WhoFaceView face={card.who.face} size={WHO_FACE} />
              <View style={{ flex: 1, gap: 2 }}>
                <WhoName name={card.who.name} marks={card.who} style={{ fontSize: 17, fontWeight: "600", color: tk.ink }} />
                <Text numberOfLines={1} style={{ ...PFM.monoMed, fontSize: MONO.title, letterSpacing: 0.88, color: tk.sub }}>
                  {card.when}
                </Text>
              </View>
            </>
          ) : (
            <>
              <MosaicId seed={letter?.author ?? null} cell={4.8} gap={1} />
              <Text numberOfLines={1} style={{ flex: 1, ...PFM.monoMed, fontSize: 12, letterSpacing: 0.96, color: tk.sub }}>
                {card.postmark}
              </Text>
            </>
          )}
          <Stamp id={card.stampId} width={CARD_STAMP.w} delivered letterId={card.id} />
          {/* THE POOL IS WHERE REPORT MATTERS MOST: always reachable */}
          {card.menu.length > 0 && (
            // three dots in sub, no ring (the owner, 2026-10-18: the 34 circle beside the stamp was
            // heavy for what it is), laid out at the dots' 22 with a 44 target round them (KLetterCard)
            <Pressable
              onPress={onMenu}
              disabled={still}
              hitSlop={11}
              accessibilityRole="button"
              accessibilityLabel={s.more}
              style={{ width: 22, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <LineIcon name="more" size={22} color={tk.sub} />
            </Pressable>
          )}
        </View>

        {/* A CARD IS ALWAYS ONE SCREEN: a long letter folds, never scrolls in place */}
        <View style={{ flex: 1, overflow: "hidden", justifyContent: folded ? "flex-start" : "center", paddingHorizontal: 4, paddingVertical: 10 }} onLayout={(ev) => setFrameH(ev.nativeEvent.layout.height - 20)}>
          {/* a folded letter is laid out at its whole length, from the top, and the frame clips it:
              in the frame's flow Yoga would measure it at most the frame's height (overflow hidden),
              and TextKit then cuts the last line mid-word ("coffee wh"), plainest in the card shrunk
              for the reply. Out of the flow (as its twin is) nothing limits it */}
          {card.isVoice ? (
            <VoiceBlockRN card={card} letter={letter} model={model} italic={italic} still={still} />
          ) : (
            <Text style={[text, face, folded ? { position: "absolute", left: 4, right: 4, top: 10 } : null]}>{card.body}</Text>
          )}
          {/* the twin — unconstrained, invisible, measured once per text */}
          {!card.isVoice && (
            <Text pointerEvents="none" onLayout={(ev) => setTextH(ev.nativeEvent.layout.height)} style={[text, face, { position: "absolute", left: 4, right: 4, top: 10, opacity: 0, zIndex: -1 }]}>
              {card.body}
            </Text>
          )}
          {/* A LONG LETTER FADES into its own page colour: 64, or half the letter's room when that is
              less (the card shrunk for the keyboard on an iPhone SE): the last lines, never the first */}
          {folded && (
            <LinearGradient
              pointerEvents="none"
              colors={[`${tk.sf}00`, tk.sf]}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: frameH > 0 ? Math.min(64, frameH / 2) : 64 }}
            />
          )}
        </View>
        {folded && (
          <Pressable disabled={still} onPress={() => act("unfold")} hitSlop={10} style={({ pressed }) => ({ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12, marginTop: 2, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontWeight: "600", fontSize: 14, color: tk.ind }}>{s.unfold}</Text>
          </Pressable>
        )}

        {/* the stamp's topic, and the one capsule (translation wins): the language pair, the
            owner's B1 back on the card (2026-10-16) — the lit side is the one you are reading */}
        {(card.topic !== "" || card.capsule.kind !== "none") && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8, marginRight: 3 }}>
            {card.topic !== "" ? <TopicTag name={card.topic} colorHex={card.stampHex} /> : <View />}
            {card.capsule.kind === "translate" ? (
              <LangPair {...langPair(card.capsule.code)} busy={!card.capsule.enabled} onPress={() => act("translate")} />
            ) : card.capsule.kind === "signal" ? (
              <SignalChip label={card.capsule.label} glyph={card.capsule.glyph} />
            ) : null}
          </View>
        )}
      </View>
    </InkPanel>
  );
}

/* a voice letter: the label, the row drawn from the desk's one player, the caption */
function VoiceBlockRN({ card, letter, model, italic, still }: { card: CardVM; letter: PoolLetter | null; model: TodayModel; italic: { fontFamily: string; fontStyle: "normal" | "italic" }; still: boolean }) {
  const { t: tk } = useTheme();
  const st = model.voice.state;
  const mine = st?.key === card.id;
  const playing = !!(mine && st?.playing);
  // while it plays the row moves on by itself (the player only reports transitions)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!playing || still) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [playing, still]);
  const unavailable = still || !card.voiceReady || (mine && !!st?.failed);
  return (
    <View>
      <Text style={{ ...PFM.monoSemi, fontSize: MONO.title, letterSpacing: 1.5, color: tk.ind, marginBottom: 14 }}>{model.view.strings.voiceLetter}</Text>
      <View pointerEvents={unavailable ? "none" : "auto"} style={{ opacity: !still && unavailable ? 0.45 : 1 }}>
        <AudioCardView
          playing={playing}
          positionS={mine ? playbackPosition(st, now) : 0}
          durationS={mine && st ? st.durationS : letter?.duration_s ?? 0}
          onToggle={() => model.act.cardAction(card.id, "voice")}
          system
          playLabel={model.view.strings.play}
          pauseLabel={model.view.strings.pause}
        />
      </View>
      {card.caption !== "" && <Text style={[{ fontSize: 15, lineHeight: 24, color: tk.sub, marginTop: 16 }, italic]}>{card.caption}</Text>}
    </View>
  );
}

/* ── the control band: NEXT on glass, REPLY on ink (Wren between them is GroundWren's) ── */

function BandRN({
  width,
  top,
  left,
  leftA11y,
  strings,
  ready,
  hidden,
  typing,
  flow,
  reduce,
  dark,
  onNext,
  onReply,
}: {
  width: number;
  top: number;
  left: number;
  leftA11y: string;
  strings: TodayStrings;
  /** loading / offline: the buttons wait at .4, NEXT's disc empty */
  ready: boolean;
  /** a send in flight, the reader open, the + panel: the whole band steps aside */
  hidden: boolean;
  /** writing back (the chat composers' A1): the same, in place — opacity 0, no touches; it used to
      slide down 160 under the keyboard */
  typing: boolean;
  flow: Flow;
  reduce: boolean;
  dark: boolean;
  onNext: () => void;
  onReply: () => void;
}) {
  const { t: tk } = useTheme();

  // stepped aside (hidden) or writing back (typing): out of sight and out of reach, where it stands
  const away = hidden || typing;
  const bandO = useTo(away ? 0 : 1, BAND_FADE);
  const btnO = useTo(flow.band ? 1 : 0, reduce ? REDUCED : BAND_FADE);
  const btnY = useTo(flow.band ? 0 : 12, reduce ? REDUCED : BAND_DROP);

  const bandMotion = useAnimatedStyle(() => ({ opacity: bandO.value }));
  const btnStyle = useAnimatedStyle(() => ({ opacity: btnO.value, transform: [{ translateY: btnY.value }] }));

  const nx = nextX(width);
  const rx = replyX(width);
  const live = ready && flow.band;
  const glass = dark
    ? { backgroundColor: "rgba(26,24,48,0.5)", borderColor: "rgba(255,255,255,0.18)", shadowColor: "#000000", shadowOpacity: 0.5 }
    : { backgroundColor: "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.75)", shadowColor: "#1E1B35", shadowOpacity: 0.35 };
  // the buttons' captions: System 500 11, as the Swift band's (owner, 10-20)
  const label = { fontWeight: "500" as const, fontSize: 11, letterSpacing: 0.22 };

  return (
    <Animated.View
      pointerEvents={away ? "none" : "box-none"}
      accessibilityElementsHidden={away}
      importantForAccessibility={away ? "no-hide-descendants" : "auto"}
      style={[{ position: "absolute", left: 0, right: 0, top, height: CONTROL_H }, bandMotion]}
    >
      <Animated.View pointerEvents={live ? "box-none" : "none"} style={[StyleSheet.absoluteFill, btnStyle]}>
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0.4 }]}>
          {/* NEXT: the letters left today, on glass */}
          <Pressable
            onPress={onNext}
            disabled={!live}
            accessibilityRole="button"
            accessibilityLabel={leftA11y}
            style={({ pressed }) => [
              {
                position: "absolute",
                left: nx - DISC / 2,
                top: 0,
                width: DISC,
                height: DISC,
                borderRadius: DISC / 2,
                borderWidth: 1,
                alignItems: "center",
                justifyContent: "center",
                shadowOffset: { width: 0, height: 6 },
                shadowRadius: 9,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
              glass,
            ]}
          >
            <Text maxFontSizeMultiplier={1} style={{ ...PFM.monoSemi, fontSize: 16, color: tk.ink }}>
              {ready ? String(left) : ""}
            </Text>
          </Pressable>
          <Text
            maxFontSizeMultiplier={1}
            numberOfLines={1}
            importantForAccessibility="no"
            accessibilityElementsHidden
            style={[label, { position: "absolute", left: nx - 50, width: 100, top: DISC + LABEL_GAP, textAlign: "center", color: tk.mute }]}
          >
            {strings.next}
          </Text>

          {/* REPLY: the envelope on ink */}
          <Pressable
            onPress={onReply}
            disabled={!live}
            accessibilityRole="button"
            accessibilityLabel={strings.replyA11y}
            style={({ pressed }) => ({
              position: "absolute",
              left: rx - DISC / 2,
              top: 0,
              width: DISC,
              height: DISC,
              borderRadius: DISC / 2,
              backgroundColor: tk.ink,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Path d="M3 6h18v12H3z M3 7l9 7 9-7" fill="none" stroke={tk.bg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Text
            maxFontSizeMultiplier={1}
            numberOfLines={1}
            importantForAccessibility="no"
            accessibilityElementsHidden
            style={[label, { position: "absolute", left: rx - 50, width: 100, top: DISC + LABEL_GAP, textAlign: "center", color: tk.ink }]}
          >
            {strings.reply}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/* ── Wren: on the ground, in the window ── */

/** her own look (WrenBird reads her skin, accessory and stage), one face at a time, crossfading */
function WrenFace({ face, size, wilt, perchFly }: { face: Face; size: number; wilt: boolean; perchFly: boolean }) {
  const fly = face === "fly";
  const mood: WrenMood = face === "curious" ? "curious" : face === "delight" ? "delight" : face === "sleepy" ? "sleepy" : "content";
  // the flying art is the grown bird's: a chick takes off in her perch, tilted
  const tilt = fly && perchFly;
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View key={face} entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, tilt ? { transform: [{ rotate: "-12deg" }] } : null]}>
        <WrenBird size={size} mood={mood} pose={fly && !perchFly ? "fly" : "perch"} wilt={wilt} />
      </Animated.View>
    </View>
  );
}

/**
 * Her standing between the buttons, at 36: gone (a fade, in place) when the
 * band is and while you write back (the chat composers' A1; not while she is
 * away: a reply she takes off comes into sight on her spot as she lifts off
 * with it, while the band is still out). The lean follows the pull (toward
 * a card pulled up, −16° × p and up to 1.1; back from one pulled down, +8°
 * × the pull; all the way while a letter unfolds), from her feet; a tap
 * hops her 8 up and back; an errand carries her off past the top right and
 * back from the top left (climbing first, veering late), the envelope at
 * her feet on the way out. Reduce Motion: no hop, no unfold lean, no
 * errand flight (a fade instead); the drag's lean is the finger's, as the
 * card's is.
 */
function GroundWren({
  x,
  y,
  width,
  shown,
  typing,
  face,
  wilt,
  perchFly,
  errand,
  reduce,
  dragP,
  dragY,
  leanFull,
  hop,
  tappable,
  onTap,
  a11y,
  name,
}: {
  x: number;
  y: number;
  width: number;
  shown: boolean;
  typing: boolean;
  face: Face;
  wilt: boolean;
  perchFly: boolean;
  errand: Errand;
  reduce: boolean;
  dragP: SharedValue<number>;
  dragY: SharedValue<number>;
  leanFull: boolean;
  hop: number;
  tappable: boolean;
  onTap: () => void;
  a11y: string;
  name: string;
}) {
  // out with the band while the reader writes back, in place (the band's own fade; she used to slide down 160 with it)
  const o = useTo(shown && !typing ? 1 : 0, BAND_FADE);
  // the unfold's lean is hers, not the finger's: under Reduce Motion only her face changes
  const lean = useTo(leanFull && !reduce ? 1 : 0, LEAN_BACK);
  const away = useTo(errand.gone ? 0 : 1, REDUCED);
  const ep = useSharedValue(0);
  useEffect(() => {
    ep.value = reduce ? 0 : withTiming(errand.out ? 1 : 0, errand.out ? TAKE_OFF : LANDING);
  }, [errand.out, reduce, ep]);
  const hy = useSharedValue(0);
  useEffect(() => {
    if (hop === 0 || reduce) return;
    hy.value = withSequence(withTiming(-8, { duration: 140, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) }));
  }, [hop, reduce, hy]);
  // where the errand takes her, from her spot: out of sight past the edge she's flying toward
  const outX = errand.side > 0 ? width + ERRAND_BEYOND - x : -ERRAND_BEYOND - x;
  const outY = -ERRAND_ABOVE - y;
  const style = useAnimatedStyle(() => {
    const k = ep.value;
    const p = Math.max(lean.value, dragP.value);
    const q = Math.min(1, Math.max(0, dragY.value / (PULL * PULL_DOWN)));
    return {
      opacity: o.value * away.value,
      transform: [
        { translateX: outX * k * k },
        { translateY: outY * k + hy.value },
        { rotate: `${-16 * p + 8 * q}deg` },
        { scale: 1 + 0.1 * p },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents={tappable ? "box-none" : "none"}
      style={[{ position: "absolute", left: x - GROUND_SIZE / 2, top: y - GROUND_SIZE / 2, transformOrigin: "50% 90%" }, style]}
    >
      <Pressable
        onPress={onTap}
        disabled={!tappable}
        hitSlop={6}
        accessible={tappable}
        accessibilityElementsHidden={!tappable}
        importantForAccessibility={tappable ? "yes" : "no-hide-descendants"}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityValue={{ text: name }}
      >
        <WrenFace face={face} size={GROUND_SIZE} wilt={wilt} perchFly={perchFly} />
        {/* the reply she takes off the band (LetterInFlight's envelope) */}
        {errand.carrying && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ position: "absolute", left: (GROUND_SIZE - 15) / 2, top: GROUND_SIZE * 0.82 }}>
            <Envelope />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** the little envelope she carries: 15 × 11 on the card face, a 1pt ink outline and the flap's V */
function Envelope() {
  const { t: tk } = useTheme();
  return (
    <Svg width={15} height={11} viewBox="0 0 15 11">
      <Rect x={0.6} y={0.6} width={13.8} height={9.8} rx={1} fill={tk.sf} stroke={tk.ink} strokeWidth={1} />
      <Path d="M0.6 1.4 L7.5 6.4 L14.4 1.4" fill="none" stroke={tk.ink} strokeWidth={1} />
    </Svg>
  );
}

function NestWren({ x, y, shown, looping, face, wilt, perchFly, reduce }: { x: number; y: number; shown: boolean; looping: boolean; face: Face; wilt: boolean; perchFly: boolean; reduce: boolean }) {
  const o = useTo(shown ? 1 : 0, reduce ? REDUCED : WINDOW_IN);
  const fy = useSharedValue(0);
  const rot = useSharedValue(0);
  useEffect(() => {
    if (!looping) {
      cancelAnimation(fy);
      cancelAnimation(rot);
      fy.value = withTiming(0, { duration: 200 });
      rot.value = withTiming(0, { duration: 200 });
      return;
    }
    // kfly: up 7 and back, −4° → 6° → −4°, 1.1 s, ease-in-out
    const half = { duration: 550, easing: Easing.inOut(Easing.ease) };
    rot.value = -4;
    fy.value = withRepeat(withSequence(withTiming(-7, half), withTiming(0, half)), -1, false);
    rot.value = withRepeat(withSequence(withTiming(6, half), withTiming(-4, half)), -1, false);
  }, [looping, fy, rot]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: fy.value }, { rotate: `${rot.value}deg` }] }));
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: "absolute", left: x - NEST_SIZE / 2, top: y - NEST_SIZE / 2 }, style]}>
      <WrenFace face={face} size={NEST_SIZE} wilt={wilt} perchFly={perchFly} />
    </Animated.View>
  );
}

/* ── her first-arrival line, in a bubble over her head ── */

const BUBBLE_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.7 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
})
  .duration(300)
  .delay(400);

function ArrivalBubble({ line, bottom }: { line: string; bottom: number }) {
  const { t: tk } = useTheme();
  const key = useLetterFont();
  const italic = useLetterFamily(true);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom, alignItems: "center" }}>
      <Animated.View entering={BUBBLE_IN} exiting={FadeOut.duration(250)} style={{ maxWidth: 232, alignItems: "center", transformOrigin: "bottom" }}>
        <StickerBox fill={tk.sf} stroke={tk.ln} lineWidth={2} radius={16} shadow={tk.ln} offset={3} faceStyle={{ paddingVertical: 10, paddingHorizontal: 14 }}>
          {/* her line, in the reader's Letter font (italic where it has one); a roomier face gets a fourth line */}
          <Text accessible numberOfLines={letterFitLines(key, 3)} style={[{ fontSize: 15, lineHeight: 19.5, color: tk.ink }, italic]}>
            {line}
          </Text>
        </StickerBox>
        {/* the tail, pointing down at her */}
        <Svg width={10} height={7} viewBox="0 0 10 7" style={{ marginTop: -2 }}>
          <Path d="M0 0 L5 7 L10 0" fill={tk.sf} stroke={tk.ln} strokeWidth={2} strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/* ── her letter, when the desk is done ── */

const CHIP_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.8 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(300);

function WrenLetterRN({ letter, animateIn, reduce, wilt }: { letter: WrenLetterVM; animateIn: boolean; reduce: boolean; wilt: boolean }) {
  const { t: tk, dark } = useTheme();
  const letterKey = useLetterFont();
  const letterFace = useLetterFamily();
  const moving = animateIn && !reduce;
  const y = useSharedValue(moving ? 70 : 0);
  const s = useSharedValue(moving ? 0.98 : 1);
  const o = useSharedValue(animateIn ? 0 : 1);
  const bounce = useSharedValue(0);
  const jigR = useSharedValue(0);
  const jigX = useSharedValue(0);
  const [chip, setChip] = useState(0);
  const [notYet, setNotYet] = useState(0);
  const [bagRoom, setBagRoom] = useState(0);
  const upper = useRef<View>(null);

  useEffect(() => {
    if (!animateIn) return;
    if (reduce) o.value = withTiming(1, REDUCED);
    else {
      y.value = withTiming(0, CARD_IN);
      s.value = withTiming(1, CARD_IN);
      o.value = withTiming(1, CARD_IN);
    }
    // VoiceOver goes to her letter once it is up
    const id = setTimeout(() => {
      if (upper.current) AccessibilityInfo.sendAccessibilityEvent(upper.current, "focus");
    }, FOCUS_MS);
    return () => clearTimeout(id);
    // it comes in once, at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!chip) return;
    const id = setTimeout(() => setChip(0), 1600);
    return () => clearTimeout(id);
  }, [chip]);
  useEffect(() => {
    if (!notYet) return;
    const id = setTimeout(() => setNotYet(0), 1500);
    return () => clearTimeout(id);
  }, [notYet]);

  // the letter bounces (y 0 → −30 → 7 → 0 over .6 s) and THAT'S ALL FOR TODAY shows under it
  const tapLetter = () => {
    if (!reduce) {
      const step = (to: number, ms: number) => withTiming(to, { duration: ms, easing: Easing.bezier(0.3, 0.9, 0.3, 1) });
      bounce.value = withSequence(step(-30, 210), step(7, 210), step(0, 180));
    }
    setChip((n) => n + 1);
  };
  // the bag jiggles (.45 s) and says NOT YET · the countdown; its tap stays its own
  const tapBag = () => {
    if (!reduce) {
      const step = { duration: 90 };
      jigR.value = withSequence(withTiming(-3, step), withTiming(3, step), withTiming(-2, step), withTiming(2, step), withTiming(0, step));
      jigX.value = withSequence(withTiming(-5, step), withTiming(5, step), withTiming(-3, step), withTiming(2, step), withTiming(0, step));
    }
    setNotYet((n) => n + 1);
  };

  const cardStyle = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value + bounce.value }, { scale: s.value }] }));
  const bagStyle = useAnimatedStyle(() => ({ transform: [{ translateX: jigX.value }, { rotate: `${jigR.value}deg` }] }));
  // her lines in the reader's Letter font, a step smaller in a roomier one (no ViewThatFits here)
  const lineSize = letterFitSize(letterKey, 20);
  const lineStyle = [{ fontSize: lineSize, lineHeight: Math.round(lineSize * 1.3), color: tk.ink }, letterFace];
  const mono = (size: number, tracking: number) => ({ ...PFM.monoSemi, fontSize: size, letterSpacing: size * tracking });
  // the bag takes what is left (14 above, 8 below) and stands aside under 96
  const bagH = bagRoom - 14 - 8;
  const footValue = [letter.foot, letter.countdown].filter((x) => x !== "").join(" ");

  return (
    <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
      <StickerBox fill={tk.sf} stroke={tk.ln} lineWidth={2.5} radius={24} shadow={tk.ln} offset={5} style={{ flex: 1 }} faceStyle={{ flex: 1, paddingHorizontal: 18, paddingBottom: 12 }}>
        {/* the letter: her counted note, one element for VoiceOver */}
        <Pressable ref={upper} onPress={tapLetter} accessible accessibilityLabel={letter.a11y} accessibilityValue={{ text: [...letter.lines, footValue].filter((x) => x !== "").join("\n") }}>
          {/* the punched holes */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 8, paddingHorizontal: 4 }}>
            {Array.from({ length: 14 }, (_, i) => (
              <View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: tk.ink, opacity: 0.9 }} />
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[mono(10, 0.16), { color: tk.mute }]}>
                {letter.from}
              </Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[mono(12, 0.08), { color: tk.ink }]}>
                {letter.stamp}
              </Text>
            </View>
            {/* her stamp: her own picture, turned 4° */}
            <View style={{ width: 46, height: 56, borderRadius: 4, borderWidth: 2.5, borderStyle: "dotted", borderColor: tk.ln, backgroundColor: tk.soft, alignItems: "center", justifyContent: "center", transform: [{ rotate: "4deg" }] }}>
              <WrenBird size={32} mood="content" wilt={wilt} />
            </View>
          </View>
          <View style={{ marginTop: 10, gap: 8 }}>
            {letter.lines.map((l, i) => (
              <Text key={i} style={lineStyle}>
                {l}
              </Text>
            ))}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text numberOfLines={1} style={lineStyle}>
                {letter.sign}
              </Text>
              <Svg width={20} height={16} viewBox="0 0 22 18">
                <Path d="M11 17V6 M11 9L4 2 M11 9l7-7 M11 11l-5-2 M11 11l5-2" fill="none" stroke={tk.ink} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </View>
          </View>
        </Pressable>

        {/* tomorrow's bag: three sealed envelopes, when it opens, no number */}
        <View style={{ flex: 1 }} onLayout={(e) => setBagRoom(e.nativeEvent.layout.height)}>
          {bagH >= 96 && (
            <Animated.View style={[{ flex: 1, marginTop: 14, marginHorizontal: 56, marginBottom: 8 }, bagStyle]}>
              <Pressable onPress={tapBag} accessible accessibilityRole="button" accessibilityLabel={[letter.bag, letter.countdown].filter((x) => x !== "").join(" ")} style={{ flex: 1 }}>
                <Bag fill={dark ? tk.soft2 : tk.soft} dropIn={animateIn && !reduce} />
                <View pointerEvents="none" style={{ position: "absolute", top: -15, left: -40, right: -40, alignItems: "center" }}>
                  <View style={{ height: 28, paddingHorizontal: 12, borderRadius: 14, borderWidth: 2.5, borderColor: tk.ln, backgroundColor: tk.sf, justifyContent: "center" }}>
                    <Text numberOfLines={1} style={[mono(10, 0.14), { color: tk.ink }]}>
                      {letter.bag}
                    </Text>
                  </View>
                </View>
                {notYet > 0 && (
                  <View pointerEvents="none" style={{ position: "absolute", bottom: 20, left: -40, right: -40, alignItems: "center" }}>
                    <Animated.View key={notYet} entering={reduce ? FadeIn.duration(200) : CHIP_IN} exiting={FadeOut.duration(200)} style={{ backgroundColor: tk.ink, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 11 }}>
                      <Text numberOfLines={1} style={{ fontWeight: "600", fontSize: 12, color: tk.bg }}>
                        {letter.notYet}
                      </Text>
                    </Animated.View>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          )}
        </View>

        {/* the foot: when she's back (read with the letter) */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, borderTopWidth: 2, borderTopColor: tk.ln, paddingTop: 9 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[mono(11, 0.12), { color: tk.ink, flexShrink: 1 }]}>
            {letter.foot}
          </Text>
          <Text numberOfLines={1} style={[mono(11, 0.12), { color: tk.ind }]}>
            {letter.countdown}
          </Text>
        </View>
      </StickerBox>

      {/* THAT'S ALL FOR TODAY, under the card for a moment */}
      {chip > 0 && (
        <View pointerEvents="none" style={{ position: "absolute", bottom: -16, left: 0, right: 0, alignItems: "center" }}>
          <Animated.View key={chip} entering={reduce ? FadeIn.duration(200) : CHIP_IN} exiting={FadeOut.duration(200)} style={{ backgroundColor: tk.ink, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14 }}>
            <Text numberOfLines={1} style={{ fontWeight: "600", fontSize: 13, color: tk.bg }}>
              {letter.chip}
            </Text>
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

/* the bag's envelopes (design 25b): resting spots (left, top, turn) in the
   design's 205-wide bag; the cluster moves sideways with the bag's width.
   Three, always: a picture of "some", never a count (the design's 1→5
   WAITING was invented; owner 2026-10-19). */
const ENVELOPES: readonly { x: number; y: number; r: number }[] = [
  { x: 14, y: 26, r: -8 },
  { x: 78, y: 36, r: 6 },
  { x: 44, y: 62, r: -3 },
];
const DESIGN_BAG_W = 205;
/** the first drop (once the letter has risen) and the gap between drops */
const DROP_FIRST = 350;
const DROP_GAP = 350;
const DROP = { duration: 600, easing: Easing.bezier(0.3, 1.1, 0.4, 1) };

/** the bag: rounded at the top, deep at the bottom, three sealed envelopes inside */
function Bag({ fill, dropIn }: { fill: string; dropIn: boolean }) {
  const { t: tk } = useTheme();
  const [w, setW] = useState(0);
  const radii = { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 96, borderBottomRightRadius: 96 };
  const shift = Math.max(0, (w - DESIGN_BAG_W) / 2);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {/* the ground, and the envelopes inside the 2.5 outline, clipped by the bag */}
      <View style={[StyleSheet.absoluteFill, radii, { backgroundColor: fill, overflow: "hidden" }]}>
        {w > 0 && ENVELOPES.map((e, i) => <BagEnvelope key={i} left={2.5 + shift + e.x} top={2.5 + e.y} turn={e.r} delay={dropIn ? DROP_FIRST + DROP_GAP * i : -1} />)}
      </View>
      <View style={[StyleSheet.absoluteFill, radii, { borderWidth: 2.5, borderColor: tk.ln }]} />
    </View>
  );
}

/** one sealed envelope: a 52 × 36 white card, 2 outline, corners of 4, a V
    flap and an 11 wax-gold dot, in the brand ink on white in every theme
    (Midnight's pale ln would vanish on the white). With a delay ≥ 0 it drops
    in (kdrop: from 70 up and nothing, .6 s, there by 55%); otherwise it is
    simply there. */
function BagEnvelope({ left, top, turn, delay }: { left: number; top: number; turn: number; delay: number }) {
  const y = useSharedValue(delay >= 0 ? -70 : 0);
  const o = useSharedValue(delay >= 0 ? 0 : 1);
  useEffect(() => {
    if (delay < 0) return;
    y.value = withDelay(delay, withTiming(0, DROP));
    o.value = withDelay(delay, withTiming(1, { duration: 330, easing: Easing.linear }));
    // it drops once, at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }, { rotate: `${turn}deg` }] }));
  return (
    <Animated.View style={[{ position: "absolute", left, top, width: 52, height: 36, borderRadius: 4, borderWidth: 2, borderColor: BRAND.inkOnBrand, backgroundColor: BRAND.paperWhite }, style]}>
      <Svg width={48} height={32} viewBox="0 0 58 38" style={{ position: "absolute", left: 0, top: 0 }}>
        <Path d="M1 1l28 18L57 1" fill="none" stroke={BRAND.inkOnBrand} strokeWidth={2.4} strokeLinejoin="round" />
      </Svg>
      <View style={{ position: "absolute", left: 24 - 5.5, top: 8, width: 11, height: 11, borderRadius: 5.5, backgroundColor: BRAND.waxGold, borderWidth: 1.5, borderColor: BRAND.inkOnBrand }} />
    </Animated.View>
  );
}

/* ── the window to her game ── */

const PIPES: readonly { x: number; top: number; bottom: number }[] = [
  { x: 56, top: 12, bottom: 22 },
  { x: 108, top: 22, bottom: 12 },
  { x: 160, top: 12, bottom: 22 },
  { x: 212, top: 22, bottom: 12 },
];
const STARS: readonly [number, number, number][] = [
  [14, 9, 0.7],
  [48, 18, 0.5],
  [84, 8, 0.6],
  [94, 40, 0.4],
];

function FlightWindowRN({ model, top, shown, looping, reduce, onTap }: { model: WindowVM; top: number; shown: boolean; looping: boolean; reduce: boolean; onTap: () => void }) {
  const { t: tk } = useTheme();
  const sky = model.sky;
  const o = useTo(shown ? 1 : 0, reduce ? REDUCED : WINDOW_IN);
  const y = useTo(shown ? 0 : 10, reduce ? REDUCED : WINDOW_IN);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  // the pipes run with her flap, when she can play
  const tx = useSharedValue(0);
  const running = looping && model.canPlay && !reduce && shown;
  useEffect(() => {
    if (!running) {
      cancelAnimation(tx);
      tx.value = 0;
      return;
    }
    tx.value = 0;
    tx.value = withRepeat(withTiming(-104, { duration: 2600, easing: Easing.linear }), -1, false);
  }, [running, tx]);
  const pipesStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const divider = sky.night ? "rgba(255,255,255,0.12)" : "rgba(30,27,53,0.12)";

  const body = (
    <StickerBox fill={sky.bottom} stroke={tk.ln} lineWidth={2} radius={20} shadow={tk.ln} offset={3} style={{ flex: 1 }} faceStyle={{ flex: 1, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 10, paddingRight: 8 }}>
      <LinearGradient pointerEvents="none" colors={[sky.top, sky.bottom]} style={StyleSheet.absoluteFill} />
      {/* the scene: her sky, the pillars; her spot is left for her */}
      <View style={{ width: 104, alignSelf: "stretch", overflow: "hidden", borderRightWidth: 1.5, borderRightColor: divider }}>
        {sky.stars && STARS.map(([x, sy, op], i) => <View key={i} style={{ position: "absolute", left: x, top: sy, width: 2, height: 2, borderRadius: 1, backgroundColor: "#FFFFFF", opacity: op }} />)}
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, width: 208 }, pipesStyle]}>
          {PIPES.map((p) => (
            <View key={p.x} style={{ position: "absolute", left: p.x, top: 0, bottom: 0, width: 10 }}>
              <View style={{ position: "absolute", top: 0, left: 0, width: 10, height: p.top, backgroundColor: sky.pillarFill, borderWidth: 1.5, borderTopWidth: 0, borderColor: sky.pillarInk, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
              <View style={{ position: "absolute", bottom: 0, left: 0, width: 10, height: p.bottom, backgroundColor: sky.pillarFill, borderWidth: 1.5, borderBottomWidth: 0, borderColor: sky.pillarInk, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
            </View>
          ))}
        </Animated.View>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.2, color: sky.text, opacity: 0.62 }}>
          {model.eyebrow}
        </Text>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 15, fontWeight: "600", color: sky.text, marginTop: 3 }}>
          {model.line}
        </Text>
      </View>
      {model.canPlay && (
        <StickerBox fill={BRAND.lime} stroke={tk.ln} lineWidth={2} radius={20} shadow={tk.ln} offset={2} style={{ width: 40, height: 40, marginRight: 2 }} faceStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Svg width={12} height={14} viewBox="0 0 12 14" style={{ marginLeft: 2 }}>
            <Path d="M1 1l10 6-10 6z" fill={BRAND.inkOnBrand} />
          </Svg>
        </StickerBox>
      )}
    </StickerBox>
  );

  return (
    <Animated.View pointerEvents={shown ? "box-none" : "none"} style={[{ position: "absolute", left: 16, right: 16, top, height: WINDOW_H }, style]}>
      {model.canPlay ? (
        <Pressable onPress={onTap} accessibilityRole="button" accessibilityLabel={model.a11yLabel} accessibilityHint={model.a11yHint || undefined} style={{ flex: 1 }}>
          {body}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={model.a11yLabel} style={{ flex: 1 }}>
          {body}
        </View>
      )}
    </Animated.View>
  );
}
