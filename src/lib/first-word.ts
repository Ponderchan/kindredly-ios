/* HER FIRST WORD.
   ────────────────────────────────────────────────────────────────────────
   When she hatches she says one word, in a bubble, and it has to be one of
   yours — not the first, not a random one, but the one that is most YOU
   in what you fed the egg. The rule, in order:

     1. a word you used more than once — you reached for it twice in a
        handful of thoughts, so it's a habit, and a habit is a voice;
     2. failing that, the longest word that isn't furniture (no "because",
        no "something") — long words are chosen words;
     3. failing that, nothing: she just chirps. A bubble saying "the…"
        is worse than no bubble.

   Scripts: Latin-ish words of four letters or more; a CJK run is cut into
   two-character pieces (most Chinese/Japanese words), and Hangul syllable
   runs of two or more stand as they are. Casing is kept as written. */

const STOP = new Set(
  "about after again against almost already also always another anyone anything around because been before being between both could does doing down during each either else even ever every everything first from have having here into just like little many maybe more most much must myself never night nothing often only other over people really right same should some something sometimes still such than that their them then there these they thing things think this those though through today under until very were what when where which while will with without would your yours".split(" "),
);

interface Cand {
  w: string;
  key: string;
  n: number;
  len: number;
  at: number;
  cjk: boolean; // two characters is already a whole word
}

export function firstWord(fed: string[]): string | null {
  const text = fed.join(" ");
  const seen = new Map<string, Cand>();
  let at = 0;
  const add = (w: string, cjk = false) => {
    const key = w.toLowerCase();
    if (STOP.has(key)) return;
    const c = seen.get(key);
    if (c) c.n += 1;
    else seen.set(key, { w, key, n: 1, len: Array.from(w).length, at: at++, cjk });
  };
  const re = /([㐀-鿿぀-ヿ]+)|([가-힯]{2,})|([A-Za-zÀ-ɏ'’]{4,})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) {
      const cs = Array.from(m[1]);
      for (let i = 0; i + 1 < cs.length; i += 2) add(cs[i] + cs[i + 1], true);
    } else if (m[2]) add(m[2], true);
    else add(m[3].replace(/^['’]+|['’]+$/g, ""));
  }
  const all = [...seen.values()].filter((c) => c.len >= 2);
  if (!all.length) return null;
  const twice = all.filter((c) => c.n > 1).sort((a, b) => b.n - a.n || b.len - a.len || a.at - b.at);
  if (twice.length) return twice[0].w;
  const long = all.filter((c) => c.cjk || c.len >= 5).sort((a, b) => (b.cjk ? 5 : b.len) - (a.cjk ? 5 : a.len) || a.at - b.at);
  return long.length ? long[0].w : null;
}
