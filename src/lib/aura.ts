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

export type AuraPhase = "empty" | "early" | "building" | "rich";

export interface Aura {
  phase: AuraPhase;
  /** 0..1 — lockedCount / 9. The honest "how formed" number. */
  formed: number;
  pieces: number;
  dims: DimScore[];
  locked: DimScore[];
  sealed: DimScore[];
  archetype: Archetype | null; // withheld until the aura is actually building
  sources: AuraSources;
  /** the words you lean on — counted, top of the list, rarest first kept */
  commonWords: string[];
}

/* everything I have written INTO THE WORLD — pool letters and thread
   messages. Server-fetched (they live there), fail-safe to []. */
async function fetchMyLetters(): Promise<{ letters: string[]; messages: string[] }> {
  if (!supabaseReady) return { letters: [], messages: [] };
  try {
    const { data: u } = await supabase!.auth.getUser();
    const me = u.user?.id;
    if (!me) return { letters: [], messages: [] };
    const [l, m] = await Promise.all([
      supabase!.from("letters").select("body").eq("author", me).limit(200),
      supabase!.from("messages").select("body").eq("sender", me).limit(400),
    ]);
    return {
      letters: (l.data || []).map((r: any) => r.body).filter(Boolean),
      messages: (m.data || []).map((r: any) => r.body).filter(Boolean),
    };
  } catch {
    return { letters: [], messages: [] };
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
      formed: 0,
      pieces: 0,
      dims: [],
      locked: [],
      sealed: [],
      archetype: null,
      sources: { letters: 0, sealed: 0, conversations: 0 },
      commonWords: [],
    };
  }

  const h = hatch(texts);
  const locked = h.dims.filter((d) => d.locked);
  const sealed = h.dims.filter((d) => !d.locked);
  const formed = locked.length / h.dims.length;

  /* the phases from the owner's design — and the archetype is WITHHELD
     until the aura is genuinely building. Naming someone off one line is a
     horoscope; the name has to be earned by evidence, like everything else
     in this system. */
  const phase: AuraPhase = pieces <= 3 ? "early" : pieces <= 10 ? "building" : "rich";

  return {
    phase,
    formed,
    pieces,
    dims: h.dims,
    locked,
    sealed,
    archetype: phase === "early" ? null : h.archetype,
    sources: {
      letters: mine.letters.length,
      sealed: sealedCount,
      conversations: mine.messages.length,
    },
    commonWords: topWords(texts),
  };
}

/* ── the server vector, letters only, refreshed on every send ── */

export async function refreshFingerprint(firstLine?: string | null): Promise<void> {
  try {
    const mine = await fetchMyLetters();
    const parts = [
      ...(firstLine && firstLine.trim().length >= 3 ? [firstLine.trim()] : []),
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
