import { Keyboard } from "react-native";
import { requireOptionalNativeModule } from "expo";

/* THE KEYBOARD, WHOEVER HOLDS IT (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   React Native's Keyboard.dismiss() only blurs the field React Native
   itself knows is focused (TextInputState.currentlyFocusedInput(),
   react-native/Libraries/Utilities/dismissKeyboard.js:18-20). The SwiftUI
   fields of the Swift screens (modules/kindredly-ui KField) are never
   registered there, so it can't reach them: a sheet raised over a focused
   Swift field rose UNDER the keyboard, and an Alert or a pushed screen left
   it stranded over the next thing.

   So the app puts the keyboard away through here: React Native's own
   dismiss, plus KindredlyUI's module function dismissKeyboard, which
   resigns the first responder app-wide (a UIKit sendAction on the main
   queue), whatever drew the field. A binary without that function (every
   build before 10a step 5, and any dev client built before it) just gets
   React Native's half, which is all it has fields for anyway.

   Every push, picker, Alert or React Native modal opened from a Swift
   surface goes through blurThen(), so the screen's own field is told to
   let go first (its 'blur' command) and the keyboard is out of the way
   before the next thing appears. */

type KindredlyUINative = { dismissKeyboard?: () => Promise<void> };

/* how long the keyboard takes to get out of the way (the time LeaveSheet
   has always waited) */
export const KEYBOARD_OUT_MS = 120;

/** Put the keyboard away now, whoever holds it: React Native's TextInput
    or a SwiftUI field in a Swift screen. Safe to call with no keyboard up
    and on any binary. */
export function dismissKeyboard(): void {
  Keyboard.dismiss();
  const ui = requireOptionalNativeModule<KindredlyUINative>("KindredlyUI");
  if (typeof ui?.dismissKeyboard !== "function") return;
  ui.dismissKeyboard().catch((e: unknown) => console.log("[keyboard] KindredlyUI.dismissKeyboard failed:", e));
}

/** A Swift screen's view ref: the KindredlyUI wrappers expose
    command(name, args) (modules/kindredly-ui, KCommandBus). */
export type CommandTarget = {
  current: { command?: (name: string, args: Record<string, unknown>) => unknown } | null;
} | null | undefined;

/** Let go of the keyboard, then run `fn` — before any push, Alert, picker
    or React Native modal opened from a Swift surface.

    `target`, when given, is the Swift screen's view ref; its field gets the
    'blur' command first, so its @FocusState lets go too (dismissing alone
    would leave SwiftUI thinking it is focused, and it can take the keyboard
    back when the modal closes). Then the keyboard is dismissed app-wide.

    `fn` runs once the keyboard is out of the way: after KEYBOARD_OUT_MS if
    it was up, at once if it wasn't. Pass `delayMs` to choose (0 = now, for
    a push that can slide while the keyboard drops). */
export function blurThen(fn: () => void, target?: CommandTarget, opts?: { delayMs?: number }): void {
  const command = target?.current?.command;
  if (command) {
    try {
      const r = command("blur", {});
      if (r && typeof (r as Promise<unknown>).catch === "function") (r as Promise<unknown>).catch((e) => console.log("[keyboard] blur command failed:", e));
    } catch (e) {
      console.log("[keyboard] blur command failed:", e);
    }
  }
  const wasUp = Keyboard.isVisible();
  dismissKeyboard();
  const delay = opts?.delayMs ?? (wasUp ? KEYBOARD_OUT_MS : 0);
  if (delay > 0) setTimeout(fn, delay);
  else fn();
}
