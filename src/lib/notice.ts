/* WHAT WREN NOTICED — evidence, never interpretation.
   ────────────────────────────────────────────────────────────────────────
   Wren is the relationship's engine, and the tempting way to build that is
   to hand a thread to a language model and print whatever comes back.
   Don't. In the most intimate place in the product, an invented detail is
   worse than no detail: "you both use 'home' differently" is unfalsifiable,
   and if it is wrong the reader has been told something false about a real
   person in that person's own voice.

   So Wren only ever reports things that can be COUNTED, and shows the count
   alongside. Every line below is a measurement of words the two of you
   actually wrote, computed on this device from letters already here — no
   server, no model, and nothing that can be wrong.

   Naming what a count MEANS is the two of you. That is the difference
   between a shared story and an algorithm's label wall. */

export interface Msg {
  body: string;
  date: string;
}

export interface Notice {
  id: string;
  /** what Wren says — always a fact */
  line: string;
  /** the count that makes it true, shown so it can be checked */
  evidence: string;
}

/* Common enough that sharing them means nothing. Deliberately short: the
   scoring already favours rare words, so this only has to catch the words
   that would otherwise top every list. */
const COMMON = new Set(
  ("about after again against because been before being between both could does doing down during each from have here into just like more most much must never only other over same should some still such than that their them then there these they thing think this those through under very were what when where which while will with would your".split(
    " ",
  )),
);

const words = (t: string) =>
  (t.toLowerCase().match(/[a-zà-ÿ']{5,}/g) || []).filter((w) => !COMMON.has(w));

function count(msgs: Msg[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of msgs) for (const w of words(x.body || "")) m.set(w, (m.get(w) || 0) + 1);
  return m;
}

const hoursOf = (msgs: Msg[]) =>
  msgs.map((m) => (m.date ? new Date(m.date).getHours() : -1)).filter((h) => h >= 0);

export function noticeThings(mine: Msg[], theirs: Msg[]): Notice[] {
  const out: Notice[] = [];

  /* A WORD YOU BOTH REACHED FOR. Ranked by rarity across the pair, so the
     one Wren surfaces is the one that would actually make you look up —
     not "really", which everyone writes. */
  const a = count(mine);
  const b = count(theirs);
  let best: { w: string; mine: number; theirs: number } | null = null;
  for (const [w, n] of a) {
    const k = b.get(w);
    if (!k) continue;
    const total = n + k;
    if (!best || total < best.mine + best.theirs) best = { w, mine: n, theirs: k };
  }
  if (best) {
    out.push({
      id: "word:" + best.w,
      line: `You've both reached for "${best.w}".`,
      evidence: `YOU ${best.mine} · THEM ${best.theirs}`,
    });
  }

  /* WHEN YOU WRITE. The hour a letter was sent is data, so "night people"
     is a measurement rather than a mood — and the count is printed so it
     can be disagreed with. */
  const late = (hs: number[]) => hs.filter((h) => h >= 22 || h < 5).length;
  const mh = hoursOf(mine);
  const th = hoursOf(theirs);
  if (mh.length >= 2 && th.length >= 2) {
    const lm = late(mh);
    const lt = late(th);
    if (lm / mh.length >= 0.5 && lt / th.length >= 0.5) {
      out.push({
        id: "hour:late",
        line: "You both write once the world has gone quiet.",
        evidence: `${lm + lt} OF ${mh.length + th.length} AFTER TEN`,
      });
    }
  }

  /* HOW MUCH YOU SAY. Two people who answer at the same length have found
     a rhythm, and it is visible in a character count. */
  const avg = (msgs: Msg[]) =>
    msgs.length ? msgs.reduce((n, m) => n + (m.body || "").length, 0) / msgs.length : 0;
  const am = avg(mine);
  const at = avg(theirs);
  if (mine.length >= 3 && theirs.length >= 3 && am > 0 && at > 0) {
    const ratio = Math.min(am, at) / Math.max(am, at);
    if (ratio >= 0.8) {
      out.push({
        id: "len:matched",
        line: "You answer each other at almost exactly the same length.",
        evidence: `${Math.round(am)} AND ${Math.round(at)} CHARACTERS`,
      });
    }
  }

  return out;
}
