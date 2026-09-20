import type { LangResources } from "./types";

/* English resources. Seeded from the shipped hatch-engine / wren-read regexes
   so English behaviour stays continuous through the refactor. */
export const EN: LangResources = {
  hedges: ["actually", "maybe", "just", "somehow", "kind of", "sort of", "probably", "honestly", "i guess", "i think"],
  // exact shipped POSITIVE set (for the contrast signal)
  affectPos: ["love", "happy", "glad", "hope", "proud", "grateful", "warm", "nice", "beautiful", "smile", "laugh"],
  // exact shipped NEGATIVE set (for the contrast signal)
  affectNeg: ["miss", "hate", "scared", "sad", "tired", "angry", "lonely", "hurt", "ashamed", "numb", "heavy", "cold"],
  // exact shipped EMOTION set (for emoHits / feeling-endings)
  emotionWords: ["feel", "felt", "feeling", "love", "loved", "miss", "missed", "hate", "scared", "afraid", "happy", "sad", "tired", "angry", "lonely", "hope", "hurt", "glad", "ashamed", "proud", "jealous", "grateful", "numb"],
  laughter: /(haha+|hehe+|hihi+|lol|lm+f?ao|rofl|hhh+)/i,
  question: /[?]/,
  ownedFrame: /\bi (feel|felt|miss|missed|love|loved|hate|hope|hoped|need|needed|want|wanted)\b/i,
  distanceFrame: /\b(someone who|the kind of person|a person who|the type of person|myself from)\b/i,
  firstPerson: ["i", "me", "my", "myself"],
  outward: ["they", "he", "she", "people", "someone", "everyone", "world", "outside", "street", "window", "room"],
  abstract: /\b\w+(ness|tion|sion|ity|ment|ance|ence|ism|hood|ship)\b/gi,
  detailOpeners: /^(the|a|an|it|there|rain|night|morning|my)\b/i,
  quirks: (text) => {
    const q: string[] = [];
    // lowercase standalone "i" — an English-specific tell; needs repetition
    if ((text.match(/\bi(?=[\s,.'])/g) || []).length >= 2) q.push("lowercase-i");
    return q;
  },
  themes: [
    { theme: "missing_someone", words: ["miss", "missed", "missing", "gone", "left", "away"] },
    { theme: "tired", words: ["tired", "exhausted", "drained", "burnt", "burned", "worn"] },
    { theme: "family", words: ["mum", "mom", "mother", "dad", "father", "family", "parents", "brother", "sister", "grandma", "grandpa", "grandmother", "grandfather", "nan", "nana", "granddad", "grandad", "aunt", "uncle", "cousin"] },
    { theme: "work", words: ["work", "job", "boss", "deadline", "meeting", "office", "shift", "colleague"] },
    { theme: "sleep", words: ["sleep", "asleep", "awake", "insomnia", "tonight", "midnight", "bed", "dreams"] },
    { theme: "loneliness", words: ["lonely", "alone", "isolated", "nobody"] },
    { theme: "friendship", words: ["friend", "friends", "mate", "mates"] },
    // no bare pronouns: "her" made every letter about a grandmother a love letter
    { theme: "love", words: ["love", "crush", "date", "kiss", "heart", "boyfriend", "girlfriend", "ex", "in love", "my ex", "situationship"] },
    { theme: "home", words: ["home", "house", "apartment", "flat", "room", "kitchen", "door"] },
    { theme: "memory", words: ["remember", "remembered", "used", "childhood", "back then", "old"] },
    { theme: "future", words: ["future", "someday", "plan", "hope", "will", "tomorrow", "next"] },
    { theme: "small_win", words: ["finally", "managed", "did", "proud", "won", "finished", "progress"] },
    { theme: "uncertainty", words: ["maybe", "unsure", "confused", "lost", "dunno", "idk"] },
  ],
};
