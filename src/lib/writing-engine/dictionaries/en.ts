import type { LangResources } from "./types";

/* English resources. Seeded from the shipped hatch-engine / wren-read regexes
   so English behaviour stays continuous through the refactor. */
export const EN: LangResources = {
  hedges: ["actually", "maybe", "just", "somehow", "probably", "honestly", "kinda", "sorta", "guess", "think", "still", "though", "like", "really", "pretty", "quite", "somewhat", "perhaps"],
  affectPos: ["happy", "glad", "excited", "love", "loved", "grateful", "thankful", "great", "proud", "amazing", "wonderful", "relieved", "relief", "joy", "hopeful", "better", "smile", "smiled", "laugh", "laughed", "warm", "nice", "beautiful"],
  affectNeg: ["tired", "exhausted", "drained", "sad", "down", "cry", "crying", "tears", "alone", "lonely", "lost", "empty", "numb", "anxious", "anxiety", "scared", "afraid", "worried", "hurt", "hurts", "hurting", "hate", "angry", "broke", "broken", "breakup", "miss", "missed", "missing", "grief", "grieving", "overwhelmed", "stress", "stressed", "hopeless", "worthless", "ashamed", "guilt", "guilty", "pain", "heavy", "cold"],
  laughter: /(haha+|hehe+|hihi+|lol|lm+f?ao|rofl|hhh+)/i,
  question: /[?]/,
  ownedFrame: /\bi (feel|felt|miss|missed|love|loved|hate|hope|hoped|need|needed|want|wanted)\b/i,
  distanceFrame: /\b(someone who|the kind of person|a person who|the type of person|myself from)\b/i,
  firstPerson: ["i", "me", "my", "myself", "mine", "im", "ive", "ill", "id"],
  outward: ["they", "them", "he", "she", "him", "her", "people", "someone", "everyone", "world", "outside", "street", "window", "room", "everybody"],
  abstract: /\b\w+(ness|tion|sion|ity|ment|ance|ence|ism|hood|ship)\b/gi,
  detailOpeners: /^(the|a|an|it|there|this|that|rain|night|morning|sky|my|his|her|their)\b/i,
  quirks: (text, tokens) => {
    const q: string[] = [];
    // lowercase standalone "i" (English-specific tell), needs repetition
    if ((text.match(/\bi(?=[\s,.'])/g) || []).length >= 2) q.push("lowercase-i");
    if ((text.match(/(\.\.\.|…)/g) || []).length >= 2) q.push("ellipses");
    if (/(haha+|hehe+|lol)/i.test(text)) q.push("laugh-haha");
    if (tokens.filter((t) => t === "kinda" || t === "sorta" || t === "gonna" || t === "wanna").length >= 1) q.push("casual-contractions");
    if (/[a-z]([!?])\1{1,}/.test(text)) q.push("repeated-punct");
    return q;
  },
  themes: [
    { theme: "missing_someone", words: ["miss", "missed", "missing", "gone", "left", "away"] },
    { theme: "tired", words: ["tired", "exhausted", "drained", "burnt", "burned", "worn"] },
    { theme: "family", words: ["mum", "mom", "mother", "dad", "father", "family", "parents", "brother", "sister", "grandma", "grandpa"] },
    { theme: "work", words: ["work", "job", "boss", "deadline", "meeting", "office", "shift", "colleague"] },
    { theme: "sleep", words: ["sleep", "asleep", "awake", "insomnia", "tonight", "midnight", "bed", "dreams"] },
    { theme: "loneliness", words: ["lonely", "alone", "isolated", "nobody"] },
    { theme: "friendship", words: ["friend", "friends", "mate", "mates"] },
    { theme: "love", words: ["love", "crush", "him", "her", "date", "kiss", "heart"] },
    { theme: "home", words: ["home", "house", "apartment", "flat", "room", "kitchen", "door"] },
    { theme: "memory", words: ["remember", "remembered", "used", "childhood", "back then", "old"] },
    { theme: "future", words: ["future", "someday", "plan", "hope", "will", "tomorrow", "next"] },
    { theme: "small_win", words: ["finally", "managed", "did", "proud", "won", "finished", "progress"] },
    { theme: "uncertainty", words: ["maybe", "unsure", "confused", "lost", "dunno", "idk"] },
  ],
};
