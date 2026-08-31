/* VERBATIM port of the web app's writing-fingerprint math (kindredly/app/ai.js
   lines 30-136). This MUST stay byte-for-byte identical to the web so that the
   8-dim `fingerprints.sig` vector this client upserts is cosine-comparable by
   the nightly `compute_matches` job (and by the other platform's clients).
   Pure, deterministic, no model, no DOM — do not "improve" it. */

export interface VoiceSig {
  words: number;
  sentenceLen: number;
  pauses: number;
  long: boolean;
}

/* WHAT COUNTS AS A WORD, ACROSS SCRIPTS. "cjk + latin" counted every Han
   character as a word — a Chinese sentence's denominator ran ~1.7× hot, so
   every per-word dimension was shifted for exactly the writers this product
   launches to. And scripts outside those two ranges counted as ZERO: a
   Korean or Russian letter had words=1, every ratio pinned at the clamp,
   and its vector matched everyone. The divisors are mean word lengths —
   first-order, no segmenter, so the shared-file constraint holds.
   Thai and other spaceless non-ideographic scripts remain wrong (an honest
   word count needs a real segmenter); left uncounted, flagged here. */
export function scriptWords(t: string): number {
  const han = (t.match(/[㐀-鿿]/g) || []).length;
  const kana = (t.match(/[぀-ヿ]/g) || []).length;
  const hangul = (t.match(/[가-힣]/g) || []).length;
  const alpha = (t.match(/[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]+/g) || []).length;
  return alpha + han / 1.7 + kana / 2 + hangul / 2;
}

/** Script-aware shared reader used by the fallbacks. */
export function voiceSignature(text: string): VoiceSig {
  const t = (text || "").trim();
  const words = scriptWords(t);
  const sents = t.split(/[.!?。！？\n]+/).filter((s) => s.trim().length);
  const len = sents.length ? words / sents.length : words;
  const pauses = (t.match(/[,;—…、，]/g) || []).length;
  return { words, sentenceLen: Math.round(len), pauses, long: len > 14 };
}

export interface Fingerprint {
  sig: VoiceSig;
  units: number[];
  hasText: boolean;
}

/** rhythm "beats" (0..1) — bar heights for the voiceprint in Me. */
export function fingerprint(text: string): Fingerprint {
  const t = (text || "").replace(/\s+/g, " ").trim();
  const sig = voiceSignature(t);
  const units: number[] = [];
  const re = /([㐀-鿿])|([A-Za-zÀ-ɏ]+)|([,.;!?—…、，。！？])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (m[1]) units.push(0.34 + (m[1].charCodeAt(0) % 40) / 62); // 0.34..0.98
    else if (m[2]) units.push(Math.max(0.12, Math.min(1, m[2].length / 12)));
    else units.push(0.07);
  }
  return { sig, units, hasText: units.length > 0 };
}

/** 8-dim style vector for cross-user matching (stored in Supabase). */
export function signatureVector(text: string): number[] {
  const t = (text || "").trim();
  const sig = voiceSignature(t);
  const words = Math.max(1, sig.words);
  const sentences = t.split(/[.!?。！？\n]+/).filter((s) => s.trim().length);
  const sents = Math.max(1, sentences.length);

  /* dim 2 — sentence-length burstiness. Its predecessor was cjk/words: a
     language tag wearing a dimension's clothes, pulling every cross-script
     pair apart in the one product whose claim is that a stranger anywhere
     might write like you. Burstiness is the classic stylometric read that
     needs no language at all: does this hand write in even breaths, or in
     short-long-short? Dim 0 holds the MEAN sentence length; this holds its
     unevenness — "all short" and "short-long-short" finally separate. */
  const lens = sentences.map((x) => voiceSignature(x).words);
  const lmean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const lvar = lens.length ? lens.reduce((a, b) => a + (b - lmean) * (b - lmean), 0) / lens.length : 0;
  const burst = lmean > 0 ? Math.sqrt(lvar) / lmean : 0;

  /* dims 3/4 — rhythm, read as BREATHS, not charcodes. fingerprint()'s beats
     size a Han character by its codepoint (charCodeAt % 40): decorative for
     the Me-tab bars, but as a matching dimension it made every Chinese hand
     average the same ~0.66 while a Latin hand averaged by real word length —
     one more language separator, and zero style signal for CJK. A breath is
     the span between punctuation stops, measured in script-aware words: the
     same instrument for every script. fingerprint() itself is untouched —
     the bars in Me still draw exactly as they always have. */
  const breaths = t
    .split(/[,;:.!?—…、，。！？；：\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Math.min(1, scriptWords(x) / 12));
  const u = breaths.length ? breaths : [0.3];
  const mean = u.reduce((a, b) => a + b, 0) / u.length;
  const varc = u.reduce((a, b) => a + (b - mean) * (b - mean), 0) / u.length;

  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  return [
    clamp(sig.sentenceLen / 30), // 0 sentence length
    clamp((sig.pauses / words) * 4), // 1 pause density
    clamp(burst * 1.2), // 2 sentence-length burstiness
    clamp(mean), // 3 avg breath length
    clamp(varc * 6), // 4 breath variance
    clamp((t.match(/[?？]/g) || []).length / sents), // 5 question density
    clamp((t.match(/[!！]/g) || []).length / sents), // 6 exclaim density
    clamp(((t.match(/[…—]|\.\.\./g) || []).length / words) * 6), // 7 trailing-off
  ];
}

/** cosine similarity between two equal-length vectors (0..1). */
export function cosineSim(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let ab = 0,
    aa = 0,
    bb = 0;
  for (let i = 0; i < a.length; i++) {
    ab += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? ab / (Math.sqrt(aa) * Math.sqrt(bb)) : 0;
}
