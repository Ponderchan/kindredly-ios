import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, LayoutAnimation } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { settlesAtEnd, trayShown } from "./follow";

/* THE KEYBOARD, AS A REACT NATIVE SCREEN NEEDS TO KNOW IT (10a step 5,
   slice chat-rn). The screens that stay React Native (the room and chat
   fallbacks, the reader, Wren's desk) sit in a KeyboardAvoidingView, which
   lifts them by the keyboard's height — so their dock pads 10 above the
   keyboard and the home indicator's inset when it is down (KDock's rule),
   and the trace tray takes the keyboard's place at the height it last rose
   to. A hardware keyboard's shortcut bar (well under 120pt) is never taken
   for that height (KChatTray's rule: the software keyboard's rise only).

   Two more pieces live here (review fixes), shared by the room fallback and
   Wren's desk:
   · useKeyboardSettle: KeyboardAvoidingView animates its padding with
     LayoutAnimation, so the list's frame is still the old height when its
     onLayout scrollToEnd runs; once the keyboard has finished moving, a list
     that was at its end goes there again (spec bug 9, on device);
   · useKeyboardTray: the trace tray and the keyboard swap in ONE commit —
     the tray is drawn only while the keyboard is down, rises on the
     keyboard's own way down (the keyboardWillHide that zeroes the avoiding
     view's padding) and goes on its way up, with the keyboard's duration,
     or a plain 200ms fade under Reduce Motion (KChatMotion.tray). */

export type KeyboardRN = {
  /** the keyboard is up (or rising) */
  up: boolean;
  /** the last height the software keyboard rose to; 0 before it has */
  lastHeight: number;
  /** how long the keyboard's last move took, in ms (250 until one has been seen) */
  durationMs: number;
};

/** the shortest a software keyboard is; anything less is a hardware keyboard's bar */
const SOFT_MIN = 120;
/** iOS's keyboard animation, until one has been measured */
const KEYBOARD_MS = 250;
/** under Reduce Motion the tray fades, with no movement to follow */
const REDUCED_MS = 200;

export function useKeyboardRN(): KeyboardRN {
  const [state, setState] = useState<KeyboardRN>({ up: Keyboard.isVisible(), lastHeight: 0, durationMs: KEYBOARD_MS });
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", (e) => {
      const h = e.endCoordinates?.height ?? 0;
      setState((cur) => ({ up: true, lastHeight: h >= SOFT_MIN ? h : cur.lastHeight, durationMs: e.duration > 0 ? e.duration : cur.durationMs }));
    });
    const hide = Keyboard.addListener("keyboardWillHide", () => setState((cur) => (cur.up ? { ...cur, up: false } : cur)));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return state;
}

/** Configure the next commit's layout change as the tray's motion (KMotion.panelRise in React
    Native terms): the keyboard's duration and curve, the tray fading in or out as the dock moves;
    under Reduce Motion a plain 200ms ease. Returns how long it runs. */
export function trayMotion(durationMs: number, reduce: boolean): number {
  const ms = reduce ? REDUCED_MS : Math.max(10, durationMs > 0 ? durationMs : KEYBOARD_MS);
  const type = reduce ? LayoutAnimation.Types.easeOut : LayoutAnimation.Types.keyboard;
  LayoutAnimation.configureNext({
    duration: ms,
    create: { type, property: LayoutAnimation.Properties.opacity },
    update: { type },
    delete: { type, property: LayoutAnimation.Properties.opacity },
  });
  return ms;
}

/**
 * Once the keyboard has finished rising or falling, `settle()` if the list was at its end as the
 * move began (and no finger is on it). `atEnd` and `dragging` are read at the moment, from the
 * screen's own scroll state.
 */
export function useKeyboardSettle(read: () => { painted: boolean; atEnd: boolean; dragging: boolean }, settle: () => void) {
  const live = useRef({ read, settle });
  live.current = { read, settle };
  useEffect(() => {
    let atEndBefore = false;
    const before = () => {
      atEndBefore = live.current.read().atEnd;
    };
    const after = () => {
      const { painted, dragging } = live.current.read();
      if (settlesAtEnd({ painted, atEndBefore, dragging })) live.current.settle();
      atEndBefore = false;
    };
    const subs = [
      Keyboard.addListener("keyboardWillShow", before),
      Keyboard.addListener("keyboardWillHide", before),
      Keyboard.addListener("keyboardDidShow", after),
      Keyboard.addListener("keyboardDidHide", after),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
}

/** How long a choice from the tray holds it in place for the keyboard to come and take it. */
const HAND_OFF_MS = 600;
/** A field focused with no software keyboard coming (a hardware keyboard) closes the tray after this. */
const NO_KEYBOARD_MS = 400;

export type KeyboardTray = {
  /** draw the tray now (asked for, or held for a hand-off, and the keyboard down) */
  shown: boolean;
  /** the + : open (putting the keyboard away through `blur`) or close */
  toggle: (blur: () => void) => void;
  /** close it (VoiceOver's escape from the + or a card) */
  close: () => void;
  /** a field took focus: the keyboard's rise closes the tray; no keyboard, it closes shortly */
  onFieldFocus: () => void;
  /** a choice that hands the keyboard to the field: keep the tray until the keyboard is up */
  handOff: () => void;
};

/**
 * The trace tray in the keyboard's place. `open` / `setOpen` are the screen's own state (the
 * room's model, the desk's useState); `onMotion(ms)` is told when a layout motion of that length
 * starts, so the list can be at its end once it settled.
 */
export function useKeyboardTray(keyboard: KeyboardRN, open: boolean, setOpen: (v: boolean) => void, onMotion?: (ms: number) => void): KeyboardTray {
  const reduce = useReducedMotion();
  const [held, setHeldState] = useState(false);
  const heldRef = useRef(false);
  const setHeld = useCallback((v: boolean) => {
    heldRef.current = v;
    setHeldState(v);
  }, []);
  /* what was asked, as of the last render or a handler since (a keyboard event can arrive before
     React has rendered the press that asked for the tray) */
  const want = useRef(open);
  want.current = open;
  const live = useRef({ reduce, setOpen, onMotion, up: keyboard.up, durationMs: keyboard.durationMs });
  live.current = { reduce, setOpen, onMotion, up: keyboard.up, durationMs: keyboard.durationMs };

  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );
  const later = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const motion = useCallback((durationMs: number) => {
    const ms = trayMotion(durationMs, live.current.reduce);
    live.current.onMotion?.(ms);
  }, []);

  // the keyboard going down with the tray asked for: the tray rises in the very commit that drops
  // the avoiding view's padding (both are answers to this event), so the dock stays where it is
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardWillHide", (e) => {
      if (want.current) motion(e.duration);
    });
    return () => sub.remove();
  }, [motion]);

  // the keyboard coming up takes the tray's place: it is already not drawn (shown needs the
  // keyboard down), and the ask goes with it
  useEffect(() => {
    if (!keyboard.up) return;
    setHeld(false);
    if (want.current) {
      want.current = false;
      live.current.setOpen(false);
    }
  }, [keyboard.up, setHeld]);

  const close = useCallback(() => {
    if (!want.current && !heldRef.current) return;
    // a motion only when the tray is on screen now (so the commit below really moves it)
    if (!live.current.up) motion(live.current.durationMs);
    want.current = false;
    if (heldRef.current) setHeld(false);
    live.current.setOpen(false);
  }, [motion, setHeld]);

  const toggle = useCallback(
    (blur: () => void) => {
      if (want.current) {
        close();
        return;
      }
      want.current = true;
      // choosing something to leave is not done mid-sentence: with the keyboard up the tray waits
      // for it to go down (above); with it down, it rises now
      const up = live.current.up;
      blur();
      if (!up && !heldRef.current) motion(live.current.durationMs);
      live.current.setOpen(true);
    },
    [motion, close],
  );

  const onFieldFocus = useCallback(() => {
    if (!want.current) return;
    later(NO_KEYBOARD_MS, () => {
      if (!want.current || live.current.up) return;
      want.current = false;
      motion(live.current.durationMs);
      live.current.setOpen(false);
    });
  }, [later, motion]);

  const handOff = useCallback(() => {
    if (!want.current) return;
    setHeld(true);
    // the keyboard never came (a hardware keyboard): let the tray go, moving — a motion is only
    // ever configured for a commit that will happen, or it would animate the next unrelated one
    later(HAND_OFF_MS, () => {
      if (!heldRef.current) return;
      if (!live.current.up && !want.current) motion(live.current.durationMs);
      setHeld(false);
    });
  }, [later, motion, setHeld]);

  return { shown: trayShown({ asked: open, held, keyboardUp: keyboard.up }), toggle, close, onFieldFocus, handOff };
}
