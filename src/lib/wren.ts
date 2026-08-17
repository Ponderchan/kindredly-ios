/* Wren — the one AI. Every model call goes through the web's /api/wren Pages
   Function (Kimi/Moonshot, key server-side). Ported from kindredly/app/ai.js:
   each job falls back to an honest local heuristic so the product works before
   Kimi is connected / offline. Endpoint is prefixed with the API base so it
   works from the native client. */

import { API_BASE } from "./supabase";
import { voiceSignature } from "./signature";
import { WREN_FALLBACK, oneOf, byLang } from "../data/content";
import type { Lang } from "../data/stamps";

const ENDPOINT = `${API_BASE}/api/wren`;

async function callWren(
  job: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<any | null> {
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ job, ...payload }),
      signal,
    });
    if (!r.ok) return null; // 501 (no key) / 5xx → fall back
    return await r.json();
  } catch {
    return null; // offline / aborted → fall back
  }
}

/** THRESHOLD — screen a letter for harm before it lands. {ok, reason?} */
export async function screen(
  text: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean; reason?: string }> {
  const ai = await callWren("screen", { text }, signal);
  if (ai) return ai;
  const t = text || "";
  if (/(https?:\/\/|www\.|@[\w.]+\.\w|\b\d{7,}\b)/i.test(t)) {
    return { ok: false, reason: "offpage" };
  }
  return { ok: true };
}

/** WREN'S NOTE — one quiet line on what a letter is reaching for. */
export async function note(
  text: string,
  lang: Lang,
  signal?: AbortSignal,
): Promise<string | null> {
  const ai = await callWren("note", { text, lang }, signal);
  if (ai && ai.line) return ai.line;
  const sig = voiceSignature(text);
  if (sig.words < 8) return null;
  const pool = byLang(WREN_FALLBACK.note, lang);
  return oneOf(pool, sig.long ? 1 : sig.words + sig.pauses) || null;
}

/** PORTRAIT — Wren's warm read of how YOU write (the Me page). */
export async function portrait(
  text: string,
  lang: Lang,
  signal?: AbortSignal,
): Promise<string | null> {
  const sig = voiceSignature(text);
  if (sig.words < 12) return null; // too little to read yet
  const ai = await callWren("portrait", { text, lang }, signal);
  return ai && ai.line ? ai.line : null;
}

/** TRANSLATE — Wren renders a letter in the reader's language. No local
 *  fallback (a fake translation would be a lie) — null hides the feature. */
export async function translate(
  text: string,
  to: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const ai = await callWren("translate", { text, to }, signal);
  const out = ai && (ai.text || ai.line);
  return typeof out === "string" && out.trim() ? out.trim() : null;
}

/** YOUR VOICE — the nine-signal read of how you write (server-side engine).
 *  Returns the structured profile or null (offline / job not deployed) —
 *  callers keep their local read and upgrade quietly when this lands. */
export async function voiceRead(
  texts: string[],
  signal?: AbortSignal,
): Promise<{ voice_summary?: string; signature_traits?: string[]; sample_size?: number } | null> {
  if (!texts.length) return null;
  const ai = await callWren("voice", { texts: texts.slice(0, 20) }, signal);
  return ai && (ai.voice_summary || ai.signature_traits) ? ai : null;
}

/** PEEK — deeper read on a correspondent (Kindredly+). */
export async function peek(
  msgs: unknown[],
  lang: Lang,
  signal?: AbortSignal,
): Promise<string> {
  const ai = await callWren("peek", { msgs, lang }, signal);
  if (ai && ai.read) return ai.read;
  return WREN_FALLBACK.peek[lang] || WREN_FALLBACK.peek.en;
}

/** MORNING PAGE curation — Wren picks the best-fit fragment index, or -1. */
export async function curateMorning(
  candidates: { fragment: string }[] | string[],
  mood: string | undefined,
  lang: Lang,
  signal?: AbortSignal,
): Promise<number> {
  if (!candidates || !candidates.length) return -1;
  const ai = await callWren(
    "morning",
    {
      candidates: candidates.map((c: any) => c.fragment || c),
      mood,
      lang,
    },
    signal,
  );
  if (ai && typeof ai.index === "number" && ai.index >= 0 && ai.index < candidates.length)
    return ai.index;
  return -1;
}
