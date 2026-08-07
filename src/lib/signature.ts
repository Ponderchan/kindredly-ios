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

/** CJK-aware shared reader used by the fallbacks. */
export function voiceSignature(text: string): VoiceSig {
  const t = (text || "").trim();
  const cjk = (t.match(/[㐀-鿿]/g) || []).length;
  const latin = (t.match(/[A-Za-zÀ-ɏ]+/g) || []).length;
  const words = cjk + latin;
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
  const cjk = (t.match(/[㐀-鿿]/g) || []).length;
  const latin = (t.match(/[A-Za-zÀ-ɏ]+/g) || []).length;
  const words = Math.max(1, cjk + latin);
  const sents = Math.max(
    1,
    t.split(/[.!?。！？\n]+/).filter((s) => s.trim().length).length,
  );
  const fp = fingerprint(t);
  const u = fp.units.length ? fp.units : [0.3];
  const mean = u.reduce((a, b) => a + b, 0) / u.length;
  const varc = u.reduce((a, b) => a + (b - mean) * (b - mean), 0) / u.length;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  return [
    clamp(sig.sentenceLen / 30), // 0 sentence length
    clamp((sig.pauses / words) * 4), // 1 pause density
    clamp(cjk / words), // 2 CJK-ness
    clamp(mean), // 3 avg beat weight
    clamp(varc * 6), // 4 rhythm variance
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
