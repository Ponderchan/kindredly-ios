import AsyncStorage from "@react-native-async-storage/async-storage";
import { hatch, type Archetype, type DimScore } from "./hatch-engine";
import { loadJournal } from "./journal";
import { signatureVector, voiceSignature } from "./signature";
import { supabase, supabaseReady } from "./supabase";
import { upsertFingerprint } from "./db";

/* THE AURA, ON ONE ENGINE.
   ────────────────────────────────────────────────────────────────────────
   The product grew three separate "read your writing" engines: voice.ts
   (nine two-way switches, strength driven mostly by HOW MANY pieces you
   wrote), signature.ts (the 8-dim server vector), and hatch-engine (nine
   continuous 0–100 dims, twelve archetypes, evidence-locking). The Me tab
   ran on the weakest of the three, while the resonance map and the read of
   a correspondent already ran on hatch — so "your" nine dimensions and
   "your match's" nine dimensions didn't even share names. You and the
   person you write to must be measured with the same instrument, or the
   overlap between you means nothing. hatch is the instrument.

   TWO CORPORA, DELIBERATELY DIFFERENT.
   · The LOCAL aura reads everything you wrote on this phone — the hatch
     line, your sealed pages, your letters. It never leaves the device.
   · The SERVER vector (matching) reads LETTERS ONLY. The sealed journal
     feeds nothing that leaves the phone — "No one sees this. Not even
     me." is load-bearing, and SelfCompose records the day journal text
     was cut from the vector. That line stays cut.

   AND THE VECTOR FINALLY GROWS. upsertFingerprint had exactly one caller
   in the whole app: onboarding. The nightly matcher — the thing deciding
   whose letters reach whom — was scoring everyone by the paragraph they
   typed on day one, forever. refreshFingerprint() re-derives it from the
   letters corpus and is called after every published letter and reply.
   The owner's spec says it outright: the more you write, the sharper the
   match. That requires the vector to move. */

export interface AuraSources {
  letters: number; // pool letters + thread messages, yours
  sealed: number; // journal pages (LOCAL AURA ONLY — never the vector)
  conversations: number; // thread messages, yours
}

/* the ladder, as the owner froze it on the design canvas:
     empty      pieces == 0            nothing claimed
     forming    locked ≤ 2             first signals speak
     shaping    locked 3–5             the glow takes shape
     clearing   locked 6–8, OR 9/9     everything read — but a name off
                while pieces < 10      six pieces is a horoscope, so the
                                       name waits for ten real pieces
     formed     locked 9 AND ≥10 pieces  the name, earned */
export type AuraPhase = "empty" | "forming" | "shaping" | "clearing" | "formed";

export interface Aura {
  phase: AuraPhase;
  /** the corpus the reading came from — for renderers that want the words */
  texts: string[];
  /** 0..1 — lockedCount / 9. The honest "how formed" number. */
  formed: number;
  pieces: number;
  dims: DimScore[];
  locked: DimScore[];
  sealed: DimScore[];
  archetype: Archetype | null; // null until FORMED — the name is the last thing earned
  /** the engine's working name, available BEFORE formed — only for Wren's
      crossed-out naming drafts on the envelope back (owner-designed tease:
      "The Quick Sp—"). Never show it whole before `archetype` is non-null. */
  draft: Archetype | null;
  /** the day the ninth signal locked, from local history (formed phase only) */
  formedOn?: string | null;
  sources: AuraSources;
  /** the words you lean on — counted, top of the list, rarest first kept */
  commonWords: string[];
  /** counted, never generated: over half your letters left after 22:00 or
      before 06:00. Evidence for a live P.S., in notice.ts's philosophy —
      Wren only says what she can count. Journal pages are deliberately
      excluded from the count: the sealed room stays out of her mouth. */
  nightOwl: boolean;
}

/* everything I have written INTO THE WORLD — pool letters and thread
   messages. Server-fetched (they live there), fail-safe to []. */
async function fetchMyLetters(): Promise<{ letters: string[]; messages: string[]; hours: number[] }> {
  if (!supabaseReady) return { letters: [], messages: [], hours: [] };
  try {
    const { data: u } = await supabase!.auth.getUser();
    const me = u.user?.id;
    if (!me) return { letters: [], messages: [], hours: [] };
    const [l, m] = await Promise.all([
      supabase!.from("letters").select("body,created_at").eq("author", me).limit(200),
      supabase!.from("messages").select("body,created_at").eq("sender", me).limit(400),
    ]);
    const rows = [...(l.data || []), ...(m.data || [])];
    return {
      letters: (l.data || []).map((r: any) => r.body).filter(Boolean),
      messages: (m.data || []).map((r: any) => r.body).filter(Boolean),
      // local wall-clock hour of each piece — evidence for counted notices
      hours: rows.filter((r: any) => r.body && r.created_at).map((r: any) => new Date(r.created_at).getHours()),
    };
  } catch {
    return { letters: [], messages: [], hours: [] };
  }
}

const STOP = new Set(
  "about after again against because been before being between both could does doing down during each every first from have having here into just like little maybe more most much must never night often only other over people really right same should some something still such than that their there these thing things think this those through today under until very were what when where which while will with would your yours".split(
    " ",
  ),
);

function topWords(texts: string[], n = 8): string[] {
  const freq = new Map<string, number>();
  for (const t of texts)
    for (const w of (t.toLowerCase().match(/[a-zà-ÿ']{4,}/g) || []))
      if (!STOP.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

export async function myAura(firstLine?: string | null): Promise<Aura> {
  const local: string[] = [];
  if (firstLine && firstLine.trim().length >= 3) local.push(firstLine.trim());
  let sealedCount = 0;
  try {
    for (const e of await loadJournal()) {
      if (e.id.startsWith("demo-")) continue;
      if (e.body && e.body.trim().length >= 3) {
        local.push(e.body.trim());
        sealedCount++;
      }
    }
  } catch {
    /* the sealed room stays sealed — the aura just reads less */
  }
  const mine = await fetchMyLetters();
  const texts = [...local, ...mine.letters, ...mine.messages];

  const pieces = texts.length;
  if (!pieces) {
    return {
      phase: "empty",
      texts: [],
      formed: 0,
      pieces: 0,
      dims: [],
      locked: [],
      sealed: [],
      archetype: null,
      draft: null,
      sources: { letters: 0, sealed: 0, conversations: 0 },
      commonWords: [],
      nightOwl: false,
    };
  }

  const h = hatch(texts);
  const locked = h.dims.filter((d) => d.locked);
  const sealed = h.dims.filter((d) => !d.locked);
  /* the owner's blend (design canvas, frozen): dimensions carry 70%,
     sample volume 30% — so 9/9 off six pieces reads 88%, not a false
     100%, and the last stretch to Formed is visibly about writing more */
  const formed = 0.7 * (locked.length / h.dims.length) + 0.3 * Math.min(pieces / 10, 1);

  const phase: AuraPhase =
    locked.length <= 2
      ? "forming"
      : locked.length <= 5
        ? "shaping"
        : locked.length === 9 && pieces >= 10
          ? "formed"
          : "clearing";

  let formedOn: string | null = null;
  if (phase === "formed") {
    try {
      const hist: AuraSnapshot[] = JSON.parse((await AsyncStorage.getItem(HIST_KEY)) || "[]");
      formedOn = hist.find((x) => x.locked.length === 9)?.date ?? new Date().toISOString().slice(0, 10);
    } catch {
      formedOn = new Date().toISOString().slice(0, 10);
    }
  }

  return {
    phase,
    texts,
    formed,
    pieces,
    dims: h.dims,
    locked,
    sealed,
    formedOn,
    archetype: phase === "formed" ? h.archetype : null,
    draft: h.archetype ?? null,
    sources: {
      letters: mine.letters.length,
      sealed: sealedCount,
      conversations: mine.messages.length,
    },
    commonWords: topWords(texts),
    nightOwl:
      mine.hours.length >= 3 &&
      mine.hours.filter((h) => h >= 22 || h < 6).length / mine.hours.length > 0.5,
  };
}

/* ── the server vector, letters only, refreshed on every send ── */

export async function refreshFingerprint(firstLine?: string | null): Promise<void> {
  try {
    const mine = await fetchMyLetters();
    /* THE HATCH LINE RIDES ALONG BY DEFAULT. Every existing caller invoked
       this bare, so the first refresh after onboarding OVERWROTE the rich
       hatch-corpus vector with one derived from a single published letter —
       the fingerprint got thinner the moment you started writing. The line
       lives in user_metadata (saveProfile syncs it there), so fetch it here
       once instead of threading it through four call sites. */
    /* nothing published yet → nothing the hatch didn't already know. The
       hatch vector was built from EVERY fed thought; rebuilding here from
       the one saved line alone would make the fingerprint thinner. */
    if (!mine.letters.length && !mine.messages.length) return;
    let line = firstLine;
    if (line == null && supabaseReady) {
      try {
        const { data } = await supabase!.auth.getUser();
        const fl = (data.user?.user_metadata as Record<string, unknown> | undefined)?.firstLine;
        if (typeof fl === "string") line = fl;
      } catch {
        /* the corpus alone is still worth refreshing */
      }
    }
    const parts = [
      ...(line && line.trim().length >= 3 ? [line.trim()] : []),
      ...mine.letters,
      ...mine.messages,
    ];
    if (!parts.length) return;
    const corpus = parts.join("\n\n");
    await upsertFingerprint(signatureVector(corpus), voiceSignature(corpus).words);
  } catch {
    /* matching just stays a day staler — never surface this */
  }
}

/* ── history: the timeline is diffs between snapshots, stored locally ── */

const HIST_KEY = "kindredly_aura_history";

export interface AuraSnapshot {
  date: string; // ISO day
  locked: string[]; // dim keys locked as of this day
  archetype: string | null;
  pieces: number;
}

export async function recordAuraSnapshot(a: Aura): Promise<AuraSnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(HIST_KEY);
    const hist: AuraSnapshot[] = raw ? JSON.parse(raw) : [];
    const today = new Date().toISOString().slice(0, 10);
    const last = hist[hist.length - 1];
    const snap: AuraSnapshot = {
      date: today,
      locked: a.locked.map((d) => d.key),
      archetype: a.archetype?.id ?? null,
      pieces: a.pieces,
    };
    // append only when something actually changed — the timeline is events,
    // not a heartbeat
    const changed =
      !last ||
      last.archetype !== snap.archetype ||
      last.locked.join() !== snap.locked.join();
    if (changed && a.pieces > 0) {
      hist.push(snap);
      await AsyncStorage.setItem(HIST_KEY, JSON.stringify(hist.slice(-40)));
    }
    return hist;
  } catch {
    return [];
  }
}

export async function loadAuraHistory(): Promise<AuraSnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(HIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
