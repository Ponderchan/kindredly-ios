import AsyncStorage from "@react-native-async-storage/async-storage";

/* THE UNDER-18 ANSWER, REMEMBERED ON THIS PHONE (storyboard §6 · 3x, §9).
   ────────────────────────────────────────────────────────────────────────
   Someone who answers under 18 on screen 3 is stopped there on this phone,
   with one correction (below) and then for good. The storyboard
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

/* ONE CORRECTION (owner, 2026-10-23: "picked the wrong year and there's no way back" — a reviewer's
   slip would end the review there). The first under-18 answer stops the run with one way out:
   "Wrong year? Change it" goes back to the wheel once. A second under-18 answer on this phone is
   final. Stored values: "1" stopped, one change left · "r" the change was used (not stopped) ·
   "2" stopped for good. */
const STOPPED_ONCE = "1";
const RETRIED = "r";
const STOPPED_FINAL = "2";

async function read(demo: boolean): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key(demo));
  } catch (e) {
    console.warn("[onboarding] the device block couldn't be read:", e);
    return null;
  }
}

/** Does this phone remember an under-18 answer? A read that fails reads as no block (logged): the gate still asks. */
export async function isBlocked(demo = false): Promise<boolean> {
  const v = await read(demo);
  return v === STOPPED_ONCE || v === STOPPED_FINAL;
}

/** May the stopped run go back to the wheel once more? */
export async function canChangeAge(demo = false): Promise<boolean> {
  return (await read(demo)) === STOPPED_ONCE;
}

const changed = new Set<() => void>();
/** told when the one correction is spent (the run's context lifts the block) */
export function onAgeChanged(f: () => void): () => void {
  changed.add(f);
  return () => {
    changed.delete(f);
  };
}

/** Spend the one correction: the run may ask the birthday again. */
export async function changeAge(demo = false): Promise<void> {
  try {
    await AsyncStorage.setItem(key(demo), RETRIED);
  } catch (e) {
    console.warn("[onboarding] the device block couldn't be written:", e);
  }
  for (const f of changed) f();
}

/** Remember the under-18 answer: once with a correction left, or for good after one was used. */
export async function rememberBlock(demo = false): Promise<void> {
  try {
    const was = await AsyncStorage.getItem(key(demo));
    await AsyncStorage.setItem(key(demo), was === RETRIED || was === STOPPED_FINAL ? STOPPED_FINAL : STOPPED_ONCE);
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
