import AsyncStorage from "@react-native-async-storage/async-storage";

/* Writing sparks — the line in the empty letter.

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
const SPARKS = [
  "tell a stranger something you never posted.",
  "what small thing stayed with you today?",
  "write the memory you almost forgot.",
  "say the thing you'd only say to someone you'll never meet.",
  "what are you pretending not to think about?",
  "describe a room you miss.",
  "what did you notice today that no one else would have?",
  "what were you like a year ago?",
  "something you changed your mind about.",
  "the last time you felt understood.",
];

/* 22:00–04:00. Shorter, plainer, and it doesn't ask you to summarise a day
   you're still inside. */
const NIGHT = [
  "it's late. what's still awake in you?",
  "nobody's up. say it plainly.",
  "what keeps coming back at this hour?",
  "what would you say if it cost you nothing?",
];

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
  const list = isNight() ? NIGHT : SPARKS;
  return list[n % list.length];
}
