import { requireOptionalNativeModule } from "expo";

/* THE KEYBOARD FROM REACT NATIVE'S SIDE, for the SwiftUI fields in step-5 screens.

   React Native's Keyboard.dismiss() only blurs an input registered with its TextInputState
   (react-native dismissKeyboard.js:18-20). Our SwiftUI KFields never are, so it can't reach
   them. This module function resigns whatever holds the keyboard, app-wide
   (UIApplication.sendAction(resignFirstResponder), KindredlyUIModule.swift).

   The app calls it through src/lib/keyboard.ts's dismissKeyboard(), which does both, and
   blurThen(), which every push, picker, Alert or React Native modal opened from a Swift screen
   goes through, so the keyboard is never stranded over the next screen. To blur one screen's
   fields and keep its state right, send that screen the "blur" command as well: through
   commands.send("blur", {}), or ref.current.command("blur", {}) called as a method, never
   detached (expo finds the view from `this`; see KScreenHandle in types.ts). */

type KindredlyUINative = {
  dismissKeyboard?: () => Promise<void>;
};

/** Resigns the first responder app-wide. Resolves true once done, false when this binary's
    KindredlyUI has no such function (Android, or a dev client built before step 5). */
export async function nativeDismissKeyboard(): Promise<boolean> {
  const native = requireOptionalNativeModule<KindredlyUINative>("KindredlyUI");
  if (typeof native?.dismissKeyboard !== "function") return false;
  try {
    await native.dismissKeyboard();
    return true;
  } catch (e) {
    console.warn("[kindredly-ui] dismissKeyboard failed:", e);
    return false;
  }
}
