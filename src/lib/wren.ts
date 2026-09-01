/* Wren — the one AI. Every model call goes through the web's /api/wren Pages
   Function (Kimi/Moonshot, key server-side). Ported from kindredly/app/ai.js:
   each job falls back to an honest local heuristic so the product works before
   Kimi is connected / offline. Endpoint is prefixed with the API base so it
   works from the native client. */

import { API_BASE } from "./supabase";
import { voiceSignature } from "./signature";
import { WREN_FALLBACK, oneOf, byLang } from "../data/content";
import type { Lang } from "../data/stamps";
import { TRANSLATE_MS, WREN_MS, fetchWithin } from "./net";

const ENDPOINT = `${API_BASE}/api/wren`;

async function callWren(
  job: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal,
  ms: number = WREN_MS,
): Promise<any | null> {
  try {
    /* A DEADLINE, BECAUSE EVERY ONE OF THESE FALLS BACK. Wren went from a
       404 that failed in milliseconds to a live reasoning model, and this
       call sits in the blocking path of every send — so the day the model
       started working was the day sending got slow. Nothing here is worth
       waiting on: `screen` degrades to a regex, every other job to written
       copy. Three seconds, then we use what we already have. */
    const r = await fetchWithin(
      ENDPOINT,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ job, ...payload }),
        signal,
      },
      ms,
    );
    if (!r.ok) return null; // 501 (no key) / 5xx → fall back
    return await r.json();
  } catch {
    return null; // offline / aborted → fall back
  }
}

/** THE LOCAL VERDICT, WITH NO NETWORK IN IT AT ALL.
 *
 *  A reply goes to ONE person who already wrote to you and who has Report
 *  and Block a tap away — and the second letter to that same person, sent
 *  from the chat screen, has never been screened by anything. Putting a
 *  remote model in front of the first one bought no safety the product
 *  didn't already have, and it cost the slowest moment in the product.
 *  This is the check that was doing the real work anyway: contact details
 *  walking off the page. It is synchronous, so it costs nothing. */
export function screenNow(text: string): { ok: boolean; reason?: string } {
  return /(https?:\/\/|www\.|@[\w.]+\.\w|\b\d{7,}\b)/i.test(text || "")
    ? { ok: false, reason: "offpage" }
    : { ok: true };
}

/** THRESHOLD — screen a letter for harm before it lands. {ok, reason?}
 *
 *  THE LOCAL CHECK IS THE FLOOR, THE MODEL IS A BONUS. This used to await
 *  the model and only fall back once it had failed, which put an unbounded
 *  remote call in front of the SEND button — a letter could not leave the
 *  desk until a reasoning model somewhere had an opinion about it. The
 *  regex below is what actually catches the thing this gate exists to catch
 *  (contact details walking off the page), it costs nothing, and it is
 *  never wrong about a letter that has no link in it. So it runs first and
 *  decides; the model gets `ms` to improve on that answer and is otherwise
 *  simply not part of the send. */
export async function screen(
  text: string,
  signal?: AbortSignal,
  ms: number = WREN_MS,
): Promise<{ ok: boolean; reason?: string }> {
  const local = screenNow(text);
  const ai = await callWren("screen", { text }, signal, ms);
  /* and only if it actually answered the question. A 200 carrying `{}` —
     a truncated completion, a reshaped response — used to read as `ok:
     undefined`, which is falsy, which blocked a perfectly ordinary letter
     and told its writer Wren had refused it. */
  return typeof ai?.ok === "boolean" ? (ai as { ok: boolean; reason?: string }) : local;
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
  const ai = await callWren("portrait", { text, lang }, signal, TRANSLATE_MS);
  return ai && ai.line ? ai.line : null;
}

/** TRANSLATE — Wren renders a letter in the reader's language. No local
 *  fallback (a fake translation would be a lie) — null hides the feature. */
export async function translate(
  text: string,
  to: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const ai = await callWren("translate", { text, to }, signal, TRANSLATE_MS);
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
  const ai = await callWren("voice", { texts: texts.slice(0, 20) }, signal, TRANSLATE_MS);
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

