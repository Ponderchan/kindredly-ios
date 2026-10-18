import AsyncStorage from "@react-native-async-storage/async-storage";

/* THE UNDER-18 ANSWER, REMEMBERED ON THIS PHONE (storyboard §6 · 3x, §9).
   ────────────────────────────────────────────────────────────────────────
   Someone who answers under 18 on screen 3 is stopped there for good on this
   phone: no way forward, no instant retry with another year. The storyboard
   asks for the Keychain, so a reinstall doesn't reset it; this build has no
   Keychain module (expo-secure-store is not a dependency, and the run adds
   none), so the answer lives in the phone's own storage for now — raw
   AsyncStorage, device-level like the language, and kept through account
   deletion (lib/auth DEVICE_PREFS lists the key). A reinstall clears it.
   FOLLOW-UP: move it to the Keychain (expo-secure-store, or a few lines of
   Swift in modules/kindredly-ui) in the next binary.

   DEMO runs (screens/onboarding/dev) keep their own key, so walking 3x on
   the simulator never blocks the simulator's real run; the dev entry can
   clear it. */

export const BLOCK_KEY = "kindredly_ob2_minor";
const DEMO_KEY = "kindredly_ob2_minor_demo";

const key = (demo: boolean) => (demo ? DEMO_KEY : BLOCK_KEY);

/** Does this phone remember an under-18 answer? A read that fails reads as no block (logged): the gate still asks. */
export async function isBlocked(demo = false): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(demo))) === "1";
  } catch (e) {
    console.warn("[onboarding] the device block couldn't be read:", e);
    return false;
  }
}

/** Remember the under-18 answer. */
export async function rememberBlock(demo = false): Promise<void> {
  try {
    await AsyncStorage.setItem(key(demo), "1");
  } catch (e) {
    console.warn("[onboarding] the device block couldn't be written:", e);
  }
}

/** DEV ONLY: forget it (the dev entry's "clear block"). */
export async function clearBlock(demo: boolean): Promise<void> {
  if (!__DEV__) return;
  try {
    await AsyncStorage.removeItem(key(demo));
  } catch (e) {
    console.warn("[onboarding] the device block couldn't be cleared:", e);
  }
}
