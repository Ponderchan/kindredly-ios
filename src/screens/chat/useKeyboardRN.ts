import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

/* THE KEYBOARD, AS A REACT NATIVE SCREEN NEEDS TO KNOW IT (10a step 5,
   slice chat-rn). The screens that stay React Native (the room and chat
   fallbacks, the reader) sit in a KeyboardAvoidingView, which lifts them by
   the keyboard's height — so their dock pads 10 above the keyboard and the
   home indicator's inset when it is down (KDock's rule), and the trace tray
   takes the keyboard's place at the height it last rose to. A hardware
   keyboard's shortcut bar (well under 120pt) is never taken for that
   height (KChatTray's rule: the software keyboard's rise only). */

export type KeyboardRN = {
  /** the keyboard is up (or rising) */
  up: boolean;
  /** the last height the software keyboard rose to; 0 before it has */
  lastHeight: number;
};

/** the shortest a software keyboard is; anything less is a hardware keyboard's bar */
const SOFT_MIN = 120;

export function useKeyboardRN(): KeyboardRN {
  const [state, setState] = useState<KeyboardRN>({ up: Keyboard.isVisible(), lastHeight: 0 });
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", (e) => {
      const h = e.endCoordinates?.height ?? 0;
      setState((cur) => ({ up: true, lastHeight: h >= SOFT_MIN ? h : cur.lastHeight }));
    });
    const hide = Keyboard.addListener("keyboardWillHide", () => setState((cur) => (cur.up ? { ...cur, up: false } : cur)));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return state;
}
