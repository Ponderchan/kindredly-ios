/* Weighted character count — the same model X/Twitter uses, so it reads as
   fair to anyone who's ever counted characters before:
     · CJK (Chinese / Japanese / Korean)          → 2 each
     · an emoji (the whole grapheme, any build)    → 2 each
     · a URL                                       → a flat 23, whatever it is
     · everything else (letters, punctuation,
       spaces, newlines)                           → 1 each
   Media attachments aren't text, so they don't count here at all.

   Two jobs: the limits (an opening is 20–1000, a reply is 2–1000) and sizing
   the reader (a very short letter gets the telegram tier, a long one shrinks). */

/* a cold letter to a stranger — one real line. Was 40 (two lines, or twenty
   hanzi); the owner found the door too heavy twice, so it is one line now:
   ten hanzi, or "I fixed the wobbly chair today." */
export const OPENING_MIN = 20;
export const REPLY_MIN = 2; // inside a thread, "ok." is a whole answer
export const LETTER_MAX = 1000; // a genuine short letter, not an essay
export const COUNTER_FROM = LETTER_MAX - 200; // only surface the count near the ceiling

// a URL costs a flat 23 no matter how long the real link is
const URL_RE = /(?:https?:\/\/|www\.)\S+/gi;

// codepoint ranges that count double (CJK + fullwidth + kana + hangul + …)
const CJK: [number, number][] = [
  [0x1100, 0x115f], [0x2e80, 0x2eff], [0x2f00, 0x2fdf], [0x3000, 0x303f],
  [0x3040, 0x309f], [0x30a0, 0x30ff], [0x3130, 0x318f], [0x31c0, 0x31ef],
  [0x3200, 0x32ff], [0x3300, 0x33ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff],
  [0xa000, 0xa4cf], [0xac00, 0xd7af], [0xf900, 0xfaff], [0xfe30, 0xfe4f],
  [0xff00, 0xffef], [0x20000, 0x2fa1f],
];
// codepoints that begin an emoji grapheme
const EMOJI: [number, number][] = [
  [0x1f000, 0x1faff], [0x2600, 0x26ff], [0x2700, 0x27bf], [0x1f1e6, 0x1f1ff],
];
const EMOJI_ONE = new Set([
  0x231a, 0x231b, 0x2b1b, 0x2b1c, 0x2b50, 0x2b55, 0x203c, 0x2049, 0x2122, 0x2139,
  0x24c2, 0x3030, 0x303d, 0x3297, 0x3299,
]);

const inRange = (cp: number, r: [number, number][]): boolean => {
  for (const [a, b] of r) if (cp >= a && cp <= b) return true;
  return false;
};
const isCJK = (cp: number) => inRange(cp, CJK);
const isEmojiStart = (cp: number) => inRange(cp, EMOJI) || EMOJI_ONE.has(cp);
// modifiers/joiners that stay part of the same emoji grapheme
const isGlue = (cp: number) =>
  cp === 0x200d || // zero-width joiner
  cp === 0xfe0f || cp === 0xfe0e || // variation selectors
  cp === 0x20e3 || // combining enclosing keycap
  (cp >= 0x1f3fb && cp <= 0x1f3ff) || // skin-tone modifiers
  (cp >= 0x1f1e6 && cp <= 0x1f1ff); // second regional indicator of a flag

export function weightedCount(input: string): number {
  if (!input) return 0;
  let n = 0;
  // pull URLs out first — each is a flat 23
  const text = input.replace(URL_RE, () => {
    n += 23;
    return "";
  });

  const cp = Array.from(text); // iterates by code point (handles surrogate pairs)
  for (let i = 0; i < cp.length; i++) {
    const c = cp[i].codePointAt(0)!;
    // an emoji start, or a keycap base like "1" that's followed by VS16
    const keycap = i + 1 < cp.length && cp[i + 1].codePointAt(0) === 0xfe0f;
    if (isEmojiStart(c) || keycap) {
      let j = i + 1;
      while (j < cp.length) {
        const nc = cp[j].codePointAt(0)!;
        if (isGlue(nc) || cp[j - 1].codePointAt(0) === 0x200d) j++; // glue, or joined base after a ZWJ
        else break;
      }
      i = j - 1;
      n += 2;
      continue;
    }
    n += isCJK(c) ? 2 : 1;
  }
  return n;
}

/* How the reader sizes a letter by its weight. A short one is a telegram —
   big, centred, a deliberate object; a long one steps down so it stays a
   comfortable read rather than a wall. */
export function letterTier(weighted: number): { size: number; line: number; center: boolean } {
  if (weighted <= 100) return { size: 30, line: 40, center: true }; // telegram
  if (weighted > 600) return { size: 18, line: 29, center: false }; // long
  return { size: 21, line: 33, center: false }; // a letter
}
