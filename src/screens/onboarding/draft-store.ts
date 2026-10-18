import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseDraft, serializeDraft, type ObDraft } from "./flow";

/* THE RUN'S DRAFT ON THE PHONE (storyboard §9: "Kill the app mid-run and it
   resumes on the same screen with the draft kept").
   ────────────────────────────────────────────────────────────────────────
   One key, raw AsyncStorage (device-level, not scoped-store): the run starts
   before there is any account — and scoped reads wait for auth — and the
   anonymous session made on 3 must not move the draft into another bucket
   half-way through. The draft carries the uid it was made under, and the
   flow drops a draft from another account (flow.enter).

   FINISHED HERE. When the run ends, the draft is cleared and the uid that
   finished is noted, so a guest who finished while the profile save was
   still on its way (or failed: offline) isn't walked through the run again
   at the next launch — the note counts as onboarded for THAT uid only
   (screens/onboarding/Onboarding2's context), never for another account.

   DEMO runs keep their own keys, so a demo walkthrough on the simulator never
   touches the real run's draft. Failures are logged, never thrown: losing a
   draft costs a person their place, not their account. */

const DRAFT_KEY = "kindredly_ob2_draft";
const DONE_KEY = "kindredly_ob2_done";
const k = (base: string, demo: boolean) => (demo ? `${base}_demo` : base);

export async function loadDraft(demo: boolean): Promise<ObDraft | null> {
  try {
    return parseDraft(await AsyncStorage.getItem(k(DRAFT_KEY, demo)));
  } catch (e) {
    console.warn("[onboarding] the draft couldn't be read:", e);
    return null;
  }
}

export async function saveDraft(d: ObDraft, demo: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(k(DRAFT_KEY, demo), serializeDraft(d));
  } catch (e) {
    console.warn("[onboarding] the draft couldn't be saved:", e);
  }
}

export async function clearDraft(demo: boolean): Promise<void> {
  try {
    await AsyncStorage.removeItem(k(DRAFT_KEY, demo));
  } catch (e) {
    console.warn("[onboarding] the draft couldn't be cleared:", e);
  }
}

/** The uid that finished the new run on this phone (null: none, or unreadable). */
export async function finishedUid(demo: boolean): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(k(DONE_KEY, demo));
  } catch (e) {
    console.warn("[onboarding] the finished note couldn't be read:", e);
    return null;
  }
}

export async function noteFinished(uid: string | null, demo: boolean): Promise<void> {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(k(DONE_KEY, demo), uid);
  } catch (e) {
    console.warn("[onboarding] the finished note couldn't be saved:", e);
  }
}
