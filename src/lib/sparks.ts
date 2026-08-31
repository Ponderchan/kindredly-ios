import { scoped as AsyncStorage } from "./scoped-store";
import { t } from "./i18n";

/* Writing sparks — the line in the empty LETTER (to a stranger).
   ────────────────────────────────────────────────────────────────────────
   There are TWO spark systems and they are not interchangeable:
     lib/sparks.ts         → this one. The letter desk. Prompts point OUTWARD,
                             at a reader who doesn't know you.
     lib/journal-sparks.ts → the sealed page. Prompts point INWARD, and choose
                             themselves from your own entries and moods.
   A letter prompt on a diary page would ask you to explain yourself to nobody;
   a diary prompt on a letter would forget there's a stranger at the other end.
   ────────────────────────────────────────────────────────────────────────

   "ok so here's the thing…" reads like an AI prompt box: it's about the act of
   typing, not about anything. A spark should hand you something to reach for.

   THE STRATEGY, three rules:

   1. SEQUENCED, NOT RANDOM. The first sparks a newcomer sees are the ones that
      explain the product by asking — "tell a stranger something you never
      posted" teaches what this place is in one line. Random ordering would
      spend that first impression on whatever came up. After the opening run
      it rotates, and the counter persists, so you never open twice onto the
      same page.

   2. THE HOUR HAS ITS OWN VOICE. Between 10pm and 4am the prompts change — at
      that hour people are not looking for "what small thing stayed with you
      today", and a daytime prompt at 2am reads as tone-deaf. Night gets its
      own short set and rotates within it.

   3. NEVER A QUESTION ABOUT THE APP. Every spark asks about the writer's life.
      None of them mention writing, posting, sharing, or Wren. The moment the
      prompt is about using the product, the page becomes a form. */

const KEY = "kindredly_spark_n";

/* The opening run teaches the place, then the rotation keeps it fresh. */
const DAY_COUNT = 10;

/* 22:00–04:00. Shorter, plainer, and it doesn't ask you to summarise a day
   you're still inside. */
const NIGHT_COUNT = 4;

export function isNight(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 22 || h < 4;
}

/** the spark for this visit; advances the counter so the next one differs */
export async function nextSpark(): Promise<string> {
  let n = 0;
  try {
    n = parseInt((await AsyncStorage.getItem(KEY)) || "0", 10) || 0;
    await AsyncStorage.setItem(KEY, String(n + 1));
  } catch {
    /* a spark is not worth failing over */
  }
  // resolve in the reader's current language at selection time; the counter
  // still picks which prompt, the catalog decides how it reads
  return isNight() ? t(`sp.night.${(n % NIGHT_COUNT) + 1}`) : t(`sp.day.${(n % DAY_COUNT) + 1}`);
}
