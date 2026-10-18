/* THE RUN'S HAPTICS, BY NAME (storyboard §4, §6).
   ────────────────────────────────────────────────────────────────────────
   One name per meaning, so the same moment feels the same on every screen:
   THE THUNK is the stamp landing — the launch's mark becoming the first
   card's stamp on 1, and your first stamp on 8, the same light impact as
   the launch's crack at 0.98 s, so the three are one gesture. Everything
   is best-effort: expo-haptics is required lazily (as LaunchAnimation does),
   and a phone without a Taptic Engine, or a failure, is silence, never a
   throw. */

let H: typeof import("expo-haptics") | null = null;
try {
  H = require("expo-haptics");
} catch {}

const impact = (style: "Light" | "Medium" | "Soft" | "Rigid") => {
  try {
    void H?.impactAsync(H.ImpactFeedbackStyle[style]);
  } catch {}
};

/** the stamp lands (1 and 8): the launch crack's light impact */
export const thunk = () => impact("Light");
/** a warmth pip lights on the egg (3, 4, 5, 6) */
export const pip = () => impact("Soft");
/** a wheel row or a chip passes under the thumb (3, 4, 10) */
export const tick = () => {
  try {
    void H?.selectionAsync();
  } catch {}
};
/** the chick chirps as its name is typed (10) */
export const chirp = tick;
/** the shell cracks (9) */
export const crack = () => impact("Medium");
/** something done that matters: the letter in the post (12), linked (11) */
export const success = () => {
  try {
    void H?.notificationAsync(H.NotificationFeedbackType.Success);
  } catch {}
};
/** a refusal: 3x, a code that didn't match (11a) */
export const refuse = () => {
  try {
    void H?.notificationAsync(H.NotificationFeedbackType.Warning);
  } catch {}
};
