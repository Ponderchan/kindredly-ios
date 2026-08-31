import { scoped as AsyncStorage } from "./scoped-store";

/* ONE FRAME A DAY, AND IT HAS TO BE TODAY'S.
   ────────────────────────────────────────────────────────────────────────
   An unlimited photo button is a chat app's photo button, and this product
   is not one — five letters buy a name, a reply takes a week. So a moment
   is rationed the way film is: one frame per day per correspondence, and
   the shutter must have been pressed today. A camera roll from 2019 is a
   picture; a photo taken this afternoon is a moment.

   The EXIF check is best-effort — an image stripped of metadata is trusted
   rather than refused, because punishing a privacy-conscious phone would
   be the wrong side to err on. */

const KEY = "kindredly_moment_day";

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export async function momentUsedToday(threadId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return map[threadId] === today();
  } catch {
    return false;
  }
}

export async function markMomentUsed(threadId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[threadId] = today();
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

/** was the shutter pressed today? absent metadata → yes, deliberately. */
export function shotToday(exif: Record<string, any> | null | undefined): boolean {
  const raw = exif?.DateTimeOriginal ?? exif?.DateTime ?? exif?.["{TIFF}"]?.DateTime;
  if (typeof raw !== "string") return true;
  // EXIF: "YYYY:MM:DD HH:MM:SS"
  const m = raw.match(/^(\d{4}):(\d{2}):(\d{2})/);
  if (!m) return true;
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` === `${+m[1]}-${+m[2]}-${+m[3]}`;
}
