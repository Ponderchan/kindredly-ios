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
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
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
import Svg, { Defs, G, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "expo-router";
import { MONO, PF } from "../../theme/post";
import { BRAND, THEMES, type ThemeKey } from "../../theme/themes";
import { letterFamily, useLetterFamily, useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { useScreenInsets } from "../../lib/screen-insets";
import { dismissKeyboard } from "../../lib/keyboard";
import { playbackPosition } from "../../lib/voice-playback";
import type { PoolLetter } from "../../lib/db";
import { MosaicId } from "../../components/MosaicId";
import { StampTile } from "../../components/StampTile";
import { AudioCardView } from "../../components/AudioCard";
import { SignalChip } from "../../components/SignalChip";
import { LetterInFlight } from "../../components/LetterInFlight";
import { WrenBird, type WrenMood } from "../../components/WrenBird";
import { InkPanel, ReplyStrip, StickerBox, TopicTag, TranslateCapsule, type ReplyStripHandle } from "../../components/10a";
import { BAND, CONTROL_H, CONTROL_LIFT, deskGeometry, overflows, type CardVM, type DeskPhase, type WindowVM, type WrenLetterVM } from "./today-cards";
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
     re-entry while a card moves. The title follows the pull and locks
     once a letter has been passed (the model says so: it survives a
     relaunch).
   - the band under it: the dashed arc (react-native-svg), NEXT on a
     translucent disc with the letters left today, REPLY on ink. Wren (her
     own look: WrenBird reads her skin, accessory and stage) stands at the
     arc's top and changes face: curious on a pull or a pass, delighted
     while you write, sleepy if the day ends in her yawn hours. No
     per-frame lean.
   - REPLY raises the 10a reply strip on the keyboard, bound to the card on
     screen (each letter keeps its own words; Return is a new line), with
     the hint above it; the band steps down, a scrim dims the desk and a
     tap on it puts the keyboard away.
   - done: the arc is drawn solid, the buttons go, Wren fades from the arc
     into her window, and her letter comes up in the card's place (her
     counted note, the closed bag with when it opens, the countdown). The
     window offers a lap of her game when she can play, else when she's
     back. Opening into a finished desk draws it at rest.
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
const BAND_SLIDE: WithTimingConfig = { duration: 350, easing: Easing.inOut(Easing.ease) };
const BAND_DROP: WithTimingConfig = { duration: 350, easing: Easing.inOut(Easing.ease) };
const DASH_FADE: WithTimingConfig = { duration: 300, easing: Easing.out(Easing.ease) };
const ARC_DRAW: WithTimingConfig = { duration: 600, easing: Easing.bezier(0.4, 0, 0.3, 1) };
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

/* ── the pull (the Swift deck's numbers) ── */
const PULL = 110;
const PULL_DOWN = 0.25;
const PULL_FADE = 0.35;
const CURIOUS_AT = 0.08;

/* ── the band (KBandLayout; band-local points, origin = the band's top-left) ── */
const DISC = 58;
const LABEL_GAP = 7;
const nextX = (w: number) => (w - 116) / 3 + 29;
const replyX = (w: number) => w - nextX(w);
/** the arc from above NEXT to above REPLY: "M98 30 Q196 -14 295 30" at 393 */
function arcOf(w: number) {
  return { x0: nextX(w) - 23.33, y0: 30, cx: w / 2 - 0.5, cy: -14, x1: replyX(w) + 23.33, y1: 30 };
}
function arcLength(w: number): number {
  const a = arcOf(w);
  let len = 0;
  let px = a.x0;
  let py = a.y0;
  for (let i = 1; i <= 64; i++) {
    const s = i / 64;
    const x = (1 - s) * (1 - s) * a.x0 + 2 * (1 - s) * s * a.cx + s * s * a.x1;
    const y = (1 - s) * (1 - s) * a.y0 + 2 * (1 - s) * s * a.cy + s * s * a.y1;
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return len;
}
/** the arc is drawn this far into a taller Svg (it rises 14 above the band) */
const ARC_PAD = 20;
/** Wren on the arc: her centre, band-local, at 48 (design left 173, top 640) */
const WIRE_SIZE = 48;
const wireCentre = (w: number) => ({ x: w / 2 + 0.5, y: -8 });
/** Wren in the window: her centre, band-local, at 34 (design 36, 702) */
const NEST_SIZE = 34;
const NEST = { x: 53, y: 47 };
/** the window, under the band's top */
const WINDOW_TOP = 14;
const WINDOW_H = 64;
/** the arrival bubble's tail tip, band-local: its box sits 6 over her head (−38), the tail reaches down 5 */
const BUBBLE_TIP = -33;

const NEWSREADER = letterFamily("newsreader");
const NEWSREADER_ITALIC = letterFamily("newsreader", true);

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
  /** the arc is drawn solid */
  arc: boolean;
  /** the arc, drawn, has left with the buttons (t = 900): nothing of it over the window */
  arcAway: boolean;
  /** NEXT and REPLY are up */
  band: boolean;
  /** her letter is in the card's place */
  letter: boolean;
  /** where she is */
  wren: "wire" | "away" | "window";
  window: boolean;
  /** her flap and the window's pipes run */
  looping: boolean;
  /** her face, over the desk's rules */
  face: Face | null;
};
const READING: Flow = { reading: true, playing: false, arc: false, arcAway: false, band: true, letter: false, wren: "wire", window: false, looping: false, face: null };
const restFlow = (canPlay: boolean, reduce: boolean, playing = false): Flow => ({
  reading: false,
  playing,
  arc: true,
  arcAway: true,
  band: false,
  letter: true,
  wren: "window",
  window: true,
  looping: canPlay && !reduce,
  face: canPlay ? "fly" : "idle",
});

/**
 * The desk becoming done while on screen plays the design's timeline
 * (t = 0 is the last card's release): her face at once (a yawn in her
 * night hours), at 300 the arc drawn and the buttons gone, her letter
 * coming up and Wren leaving the arc, at 900 the drawn arc leaving as the
 * buttons did, at 1000 the window and Wren in it,
 * at 1600 her flap when she can play. Opening in done draws it at rest;
 * leaving done (the day turned at eight) goes back to reading.
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
      at(300, () => setFlow((s) => ({ ...s, arc: true, band: false, letter: true, wren: "away", face: "fly" })));
      at(900, () => setFlow((s) => ({ ...s, arcAway: true })));
      at(1000, () => setFlow((s) => ({ ...s, window: true, wren: "window" })));
      at(1600, () => {
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
  const strip = useRef<ReplyStripHandle>(null);
  const cardEl = useRef<View | null>(null);

  /* the Host's size: the root's own layout (the dev page gives it less than the window) */
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const W = size?.w ?? win.width;
  const H = size?.h ?? win.height;
  const geo = deskGeometry({ hostH: H, safeTop: insets.top, tabBarRoom: insets.tabBarRoom });

  /* ── the keyboard ── */
  const [typing, setTyping] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    const s = Keyboard.addListener("keyboardWillShow", () => setKbOpen(true));
    const h = Keyboard.addListener("keyboardWillHide", () => setKbOpen(false));
    // a blur that never arrived (the field unmounted as it let go) still ends the writing
    const d = Keyboard.addListener("keyboardDidHide", () => {
      if (!strip.current?.isFocused()) setTyping(false);
    });
    return () => {
      s.remove();
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
  const lock = useSharedValue(view.titleLocked ? 1 : 0);
  useEffect(() => {
    lock.value = withTiming(view.titleLocked ? 1 : 0, SPRING_BACK);
  }, [view.titleLocked, lock]);

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

  /* ── her face ── */
  const [dragCurious, setDragCurious] = useState(false);
  const [passCurious, setPassCurious] = useState(false);
  const curiousTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (curiousTimer.current) clearTimeout(curiousTimer.current);
    },
    [],
  );
  const current = view.current;
  /* writing: the field has the keyboard, and is still there (a send, the day's end or the letter leaving takes it away) */
  const stripShown = !!current && !view.sending && view.phase === "reading";
  const writing = typing && stripShown;
  const face: Face = flow.face ?? (writing ? "delight" : dragCurious || passCurious ? "curious" : "idle");
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
    // the title holds where the pull left it, then locks
    if (dragP.value > lock.value) lock.value = dragP.value;
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
  const cardActionByName = useCallback(
    (id: string, name: string) => {
      if (name === "reply") reply();
      else if (name === "next") next();
      else if (name === "bringBack") act.bringBack();
      else if (name === "translate" || name === "unfold" || name === "voice" || name === "report" || name === "block") act.cardAction(id, name);
    },
    [act, reply, next],
  );

  /* ── the card slot steps back for the + panel ── */
  const stepY = useTo(view.plus === "sheet" ? -10 : 0, STEP_BACK);
  const stepS = useTo(view.plus === "sheet" ? 0.98 : view.plus === "pop" ? 0.97 : 1, STEP_BACK);
  const slotStyle = useAnimatedStyle(() => ({ transform: [{ translateY: stepY.value }, { scale: stepS.value }] }));

  /* ── who shows ── */
  const bandHidden = view.hideBand || !plusClosed;
  const wireShown = flow.wren === "wire" && plusClosed && !(view.hideBand && flow.reading);
  const nestShown = flow.wren === "window" && plusClosed;
  const windowShown = flow.window && plusClosed;
  const bubbleShown = view.arrival.open && view.arrival.line !== "" && wireShown && !writing;
  const replyState = view.reply.state;
  const stripKey = current ? `${current.id}:${view.draftEpoch}` : "";
  useEffect(() => {
    // a new letter's field (or none) starts without the keyboard
    setTyping(false);
  }, [stripKey, stripShown]);

  const scrim = dark ? "rgba(0,0,0,0.35)" : "rgba(30,27,53,0.18)";
  const wire = wireCentre(W);

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Ground w={W} h={H} color={groundBase(themeKey)} />

      {/* the card slot */}
      <Animated.View style={[{ position: "absolute", left: 16, right: 16, top: geo.cardTop, height: geo.cardH }, slotStyle]}>
        {(view.phase === "loading" || view.phase === "offline") && !deck.leaving && <StatusCard kind={view.phase} strings={view.strings} />}
        {view.phase === "reading" && shown && (
          <GestureDetector gesture={pan}>
            <MovingCard key={`${shown.id}:${deck.serial}`} enter={deck.enter} reduce={reduce} still={deck.busy} dragY={dragY} dragP={dragP}>
              <CardFace
                card={shown}
                letter={view.feed.find((l) => l.id === shown.id) ?? null}
                model={model}
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

      <HeaderRN title={view.strings.title} safeTop={insets.top} width={W} lock={lock} dragP={dragP} />

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

      {/* Wren on the arc */}
      <WireWren x={wire.x} y={geo.controlTop + wire.y} shown={wireShown} typing={writing} face={face} wilt={view.wren.wilt} perchFly={perchFly} />
      {/* Wren in her window */}
      <NestWren x={NEST.x} y={geo.controlTop + NEST.y} shown={nestShown} looping={flow.looping} face={face} wilt={view.wren.wilt} perchFly={perchFly} reduce={reduce} />

      {/* her first-arrival line, over her head */}
      {bubbleShown && <ArrivalBubble line={view.arrival.line} bottom={H - (geo.controlTop + BUBBLE_TIP)} />}

      {/* the courier carries it: in the band's place while the reply is in the air */}
      {view.sending && (
        <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, top: geo.controlTop + 13 }}>
          <LetterInFlight to={view.flyTo} slow={view.slow} />
        </View>
      )}

      {/* while you write: the desk dims, a tap on it puts the keyboard away */}
      {writing && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={putAway} accessible={false} importantForAccessibility="no" />
        </Animated.View>
      )}

      {/* the reply strip, bound to the letter on screen: always mounted for it, shown on the keyboard */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={{ flex: 1 }} pointerEvents="box-none" />
        {current && stripShown ? (
          <View
            collapsable={false}
            pointerEvents={writing ? "auto" : "none"}
            accessibilityElementsHidden={!writing}
            importantForAccessibility={writing ? "auto" : "no-hide-descendants"}
            // VoiceOver's escape (the two-finger scrub) puts the keyboard away without sending
            onAccessibilityEscape={writing ? putAway : undefined}
            style={{ opacity: writing ? 1 : 0, paddingHorizontal: 16, marginBottom: kbOpen ? 12 : insets.tabBarRoom + CONTROL_LIFT }}
          >
            <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 1.4, color: replyState.hintWarn ? BRAND.postRed : tk.sub, marginLeft: 6, marginBottom: 6 }}>{replyState.hint}</Text>
            <ReplyStrip
              // each letter keeps its own words; a draft written in the reader comes back with it
              key={stripKey}
              ref={strip}
              placeholder={shown?.id === current.id && shown.replyPlaceholder ? shown.replyPlaceholder : view.strings.placeholder}
              sendLabel={view.strings.send}
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
              style={{ marginRight: 4 }}
            />
          </View>
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

/* ── the title: follows the pull, locks once a letter has been passed ── */

function HeaderRN({ title, safeTop, width, lock, dragP }: { title: string; safeTop: number; width: number; lock: SharedValue<number>; dragP: SharedValue<number> }) {
  const { t: tk } = useTheme();
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);
  // to the middle of the band, measured (AUJOURD'HUI is not TODAY)
  const shift = box ? width / 2 - (box.x + box.w / 2) : 0;
  const style = useAnimatedStyle(() => {
    const p = Math.max(lock.value, dragP.value);
    return { transform: [{ translateX: shift * p }, { translateY: -9 * p }, { scale: 1 - 0.5 * p }] };
  });
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: safeTop + BAND, backgroundColor: tk.bg }}>
      <View style={{ position: "absolute", top: safeTop, left: 0, right: 0, height: BAND, paddingHorizontal: 22, flexDirection: "row", alignItems: "center" }}>
        <Animated.Text
          onLayout={(e) => setBox({ x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width })}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          accessibilityRole="header"
          style={[{ flexShrink: 1, fontFamily: PF.letter, fontWeight: "600", fontSize: 22, letterSpacing: 0.88, color: tk.ink }, style]}
        >
          {title}
        </Animated.Text>
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
            <Text style={[{ fontSize: 18, lineHeight: 25, color: tk.sub, textAlign: "center", marginTop: 10 }, NEWSREADER]}>{strings.offlineBody}</Text>
          </View>
        )}
      </InkPanel>
    </Animated.View>
  );
}

/* ── one letter, the card ── */

function CardFace({
  card,
  letter,
  model,
  onAction,
  onMenu,
  cardRef,
  still = false,
}: {
  card: CardVM;
  letter: PoolLetter | null;
  model: TodayModel;
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
  // the voice action says what a press does now: pause while this letter plays
  const playing = model.voice.state?.key === card.id && !!model.voice.state?.playing;
  const [frameH, setFrameH] = useState(0);
  const [textH, setTextH] = useState(0);
  // the slot's gutters (32), the card's padding (32) and the body's (8)
  const folded = !card.isVoice && overflows({ text: card.body, size: card.bodySize, line: card.bodyLine, width: win.width - 72, frameH, textH });
  const text = { fontSize: card.bodySize, lineHeight: card.bodyLine, color: tk.ink, textAlign: card.bodyCenter ? ("center" as const) : ("auto" as const) };
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
          <MosaicId seed={letter?.author ?? null} cell={4.8} gap={1} />
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: PF.monoMed, fontSize: 12, letterSpacing: 0.96, color: tk.sub }}>
            {card.postmark}
          </Text>
          <View style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 2, borderColor: tk.ln, backgroundColor: tk.sf, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            <StampTile id={card.stampId} w={28} r={0} />
          </View>
          {/* THE POOL IS WHERE REPORT MATTERS MOST: always reachable */}
          {card.menu.length > 0 && (
            <Pressable
              onPress={onMenu}
              disabled={still}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={s.more}
              style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: tk.ln, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: tk.ink }}>···</Text>
            </Pressable>
          )}
        </View>

        {/* A CARD IS ALWAYS ONE SCREEN: a long letter folds, never scrolls in place */}
        <View style={{ flex: 1, overflow: "hidden", justifyContent: folded ? "flex-start" : "center", paddingHorizontal: 4, paddingVertical: 10 }} onLayout={(ev) => setFrameH(ev.nativeEvent.layout.height - 20)}>
          {card.isVoice ? <VoiceBlockRN card={card} letter={letter} model={model} italic={italic} still={still} /> : <Text style={[text, face]}>{card.body}</Text>}
          {/* the twin — unconstrained, invisible, measured once per text */}
          {!card.isVoice && (
            <Text pointerEvents="none" onLayout={(ev) => setTextH(ev.nativeEvent.layout.height)} style={[text, face, { position: "absolute", left: 4, right: 4, top: 10, opacity: 0, zIndex: -1 }]}>
              {card.body}
            </Text>
          )}
          {/* A LONG LETTER FADES into its own page colour */}
          {folded && <LinearGradient pointerEvents="none" colors={[`${tk.sf}00`, tk.sf]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 64 }} />}
        </View>
        {folded && (
          <Pressable disabled={still} onPress={() => act("unfold")} hitSlop={10} style={({ pressed }) => ({ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12, marginTop: 2, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.5, color: tk.ind }}>{s.unfold}</Text>
          </Pressable>
        )}

        {/* the stamp's topic, and the one capsule (translation wins) */}
        {(card.topic !== "" || card.capsule.kind !== "none") && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8, marginRight: 3 }}>
            {card.topic !== "" ? <TopicTag name={card.topic} colorHex={card.stampHex} /> : <View />}
            {card.capsule.kind === "translate" ? (
              <TranslateCapsule code={card.capsule.code} label={card.capsule.label} busy={!card.capsule.enabled} onPress={() => act("translate")} />
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
      <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.5, color: tk.ind, marginBottom: 14 }}>{model.view.strings.voiceLetter}</Text>
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

/* ── the control band: the arc, NEXT on glass, REPLY on ink ── */

const AnimatedPath = Animated.createAnimatedComponent(Path);

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
  typing: boolean;
  flow: Flow;
  reduce: boolean;
  dark: boolean;
  onNext: () => void;
  onReply: () => void;
}) {
  const { t: tk } = useTheme();
  const a = arcOf(width);
  const d = `M${a.x0} ${a.y0} Q${a.cx} ${a.cy} ${a.x1} ${a.y1}`;
  const len = useMemo(() => arcLength(width), [width]);

  const bandO = useTo(hidden ? 0 : 1, BAND_FADE);
  const bandY = useTo(typing ? 160 : 0, BAND_SLIDE);
  const btnO = useTo(flow.band ? 1 : 0, reduce ? REDUCED : BAND_FADE);
  const btnY = useTo(flow.band ? 0 : 12, reduce ? REDUCED : BAND_DROP);
  const fill = useTo(flow.arc ? 1 : 0, reduce ? REDUCED : ARC_DRAW);
  const dash = useTo(flow.arc ? 0 : 1, reduce ? REDUCED : DASH_FADE);
  const arcO = useTo(flow.arcAway ? 0 : 1, reduce ? REDUCED : BAND_FADE);
  const arcY = useTo(flow.arcAway && !reduce ? 12 : 0, BAND_DROP);

  const bandStyle = useAnimatedStyle(() => ({ opacity: bandO.value, transform: [{ translateY: bandY.value }] }));
  const btnStyle = useAnimatedStyle(() => ({ opacity: btnO.value, transform: [{ translateY: btnY.value }] }));
  const arcStyle = useAnimatedStyle(() => ({ opacity: arcO.value, transform: [{ translateY: arcY.value }] }));
  const dashProps = useAnimatedProps(() => ({ strokeOpacity: dash.value }));
  const solidProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - fill.value) }));

  const nx = nextX(width);
  const rx = replyX(width);
  const live = ready && flow.band;
  const glass = dark
    ? { backgroundColor: "rgba(26,24,48,0.5)", borderColor: "rgba(255,255,255,0.18)", shadowColor: "#000000", shadowOpacity: 0.5 }
    : { backgroundColor: "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.75)", shadowColor: "#1E1B35", shadowOpacity: 0.35 };
  const label = { fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 1.6 };

  return (
    <Animated.View pointerEvents={hidden ? "none" : "box-none"} style={[{ position: "absolute", left: 0, right: 0, top, height: CONTROL_H }, bandStyle]}>
      {/* the arc: dashed while there are letters, drawn solid when the day is done, then gone with the buttons */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: -ARC_PAD }, arcStyle]}>
        <Svg width={width} height={CONTROL_H + ARC_PAD}>
          <G transform={`translate(0 ${ARC_PAD})`}>
            <AnimatedPath d={d} fill="none" stroke={tk.ink} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={[3, 6]} animatedProps={dashProps} />
            <AnimatedPath d={d} fill="none" stroke={tk.ink} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={[len, len]} animatedProps={solidProps} />
          </G>
        </Svg>
      </Animated.View>

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
            <Text maxFontSizeMultiplier={1} style={{ fontFamily: PF.monoSemi, fontSize: 16, color: tk.ink }}>
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

/* ── Wren: on the arc, in the window ── */

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

function WireWren({ x, y, shown, typing, face, wilt, perchFly }: { x: number; y: number; shown: boolean; typing: boolean; face: Face; wilt: boolean; perchFly: boolean }) {
  const o = useTo(shown ? 1 : 0, BAND_FADE);
  const ty = useTo(typing ? 160 : 0, BAND_SLIDE);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: ty.value }] }));
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: "absolute", left: x - WIRE_SIZE / 2, top: y - WIRE_SIZE / 2 }, style]}>
      <WrenFace face={face} size={WIRE_SIZE} wilt={wilt} perchFly={perchFly} />
    </Animated.View>
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
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom, alignItems: "center" }}>
      <Animated.View entering={BUBBLE_IN} exiting={FadeOut.duration(250)} style={{ maxWidth: 232, alignItems: "center", transformOrigin: "bottom" }}>
        <StickerBox fill={tk.sf} stroke={tk.ln} lineWidth={2} radius={16} shadow={tk.ln} offset={3} faceStyle={{ paddingVertical: 10, paddingHorizontal: 14 }}>
          {/* her line, in Newsreader italic whatever the Letter font (Wren's lines aren't letters) */}
          <Text accessible numberOfLines={3} style={[{ fontSize: 15, lineHeight: 19.5, color: tk.ink }, NEWSREADER_ITALIC]}>
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
  const lineStyle = [{ fontSize: 20, lineHeight: 26, color: tk.ink }, NEWSREADER];
  const mono = (size: number, tracking: number) => ({ fontFamily: PF.monoSemi, fontSize: size, letterSpacing: size * tracking });
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

        {/* tomorrow's bag: closed, when it opens, no number */}
        <View style={{ flex: 1 }} onLayout={(e) => setBagRoom(e.nativeEvent.layout.height)}>
          {bagH >= 96 && (
            <Animated.View style={[{ flex: 1, marginTop: 14, marginHorizontal: 56, marginBottom: 8 }, bagStyle]}>
              <Pressable onPress={tapBag} accessible accessibilityRole="button" accessibilityLabel={[letter.bag, letter.countdown].filter((x) => x !== "").join(" ")} style={{ flex: 1 }}>
                <Bag fill={dark ? tk.soft2 : tk.soft} />
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
                      <Text numberOfLines={1} style={[mono(10, 0.12), { color: tk.bg }]}>
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
            <Text numberOfLines={1} style={[mono(11, 0.14), { color: tk.bg }]}>
              {letter.chip}
            </Text>
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

/** the bag: rounded at the top, deep at the bottom, its flap shut with a wax seal */
function Bag({ fill }: { fill: string }) {
  const { t: tk } = useTheme();
  const [w, setW] = useState(0);
  const radii = { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 96, borderBottomRightRadius: 96 };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={[StyleSheet.absoluteFill, radii, { backgroundColor: fill, overflow: "hidden" }]}>
        {w > 0 && (
          <Svg width={w} height={60} style={{ position: "absolute", left: 0, top: 0 }}>
            <Path d={`M0 30 Q${w / 2} 52 ${w} 30`} fill="none" stroke={tk.ln} strokeWidth={2} />
          </Svg>
        )}
      </View>
      {/* the seal at the flap's lowest point (30 → 52 → 30 bottoms out at 41) */}
      {w > 0 && <View style={{ position: "absolute", left: w / 2 - 7, top: 41 - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: BRAND.waxGold, borderWidth: 1.5, borderColor: tk.ln }} />}
      <View style={[StyleSheet.absoluteFill, radii, { borderWidth: 2.5, borderColor: tk.ln }]} />
    </View>
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
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: sky.text, opacity: 0.62 }}>
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
