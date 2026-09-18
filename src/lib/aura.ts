import { scoped as AsyncStorage } from "./scoped-store";
import { hatch, type Archetype, type DimScore } from "./hatch-engine";
import { loadJournal } from "./journal";
import { signatureVector, voiceSignature } from "./signature";
import { supabase, supabaseReady } from "./supabase";
import { fetchThreads, upsertFingerprint, type PoolLetter } from "./db";
import { signalFrom, type AuraFacts, type Signal } from "./today-signal";
import { loadLore } from "./lore";
import { getCounters } from "./usage-counters";
import { usageStickers, type UsageSticker } from "./usage-stickers";
import { getWrenAccessory, getWrenSkin } from "./wren-style";
import { DEFAULT_WREN, getWrenName } from "./wren-name";
import { readStickers, toPiece, type Piece, type PieceSource, type StickerReadout, type StickerState, type AuraPhase as StickerPhase } from "./writing-engine/stickers";

/* THE AURA, ON ONE ENGINE — AND NOW ON EVIDENCE.
   ────────────────────────────────────────────────────────────────────────
   hatch (nine continuous dims, evidence-locking) is still the instrument
   the correspondent read and the resonance map are measured with, and its
   radar still draws the shape. What the reader is TOLD about themselves no
   longer comes from it: the sticker layer (writing-engine/stickers) reads
   every piece on its own, counts pieces rather than hits, and only names a
   habit it can quote. Phases, stickers and the title all come from there.

   TWO CORPORA, DELIBERATELY DIFFERENT.
   · The LOCAL aura reads everything you wrote on this phone — the hatch
     line, your sealed pages, your letters. It never leaves the device, and
     neither do the quotes it shows you.
   · The SERVER vector (matching) reads LETTERS ONLY. The sealed journal
     feeds nothing that leaves the phone — "No one sees this. Not even
     me." is load-bearing. That line stays cut. */

export interface AuraSources {
  letters: number; // pool letters, yours
  sealed: number; // journal pages (LOCAL AURA ONLY — never the vector)
  conversations: number; // thread messages, yours
}

export type AuraPhase = StickerPhase;

export interface Aura {
  phase: AuraPhase;
  /** the corpus the reading came from — for renderers that want the words */
  texts: string[];
  /** every piece's words by id, for quoting evidence. Local only. */
  pieceText: Record<string, { text: string; source: PieceSource; createdAt: string }>;
  /** the observation layer: stickers, title, evidence */
  stickers: StickerReadout | null;
  /** when your last letter or reply left — the courier's log reads the clock off it */
  lastWrittenAt: string | null;
  /** what the product counted — when you write, what about, what you keep.
      `private` ones never leave the phone. */
  usage: UsageSticker[];
  /** 0..1 — established observations over nine, blended with sample size.
      A progress feel for the card, never spoken as accuracy. */
  formed: number;
  pieces: number;
  dims: DimScore[];
  locked: DimScore[];
  sealed: DimScore[];
  /** legacy: hatch's archetype, only once FORMED — kept for the correspondent
      read and the resonance map; the reader no longer sees it as their name */
  archetype: Archetype | null;
  draft: Archetype | null;
  formedOn?: string | null;
  sources: AuraSources;
  /** the words you lean on — counted, top of the list, rarest first kept */
  commonWords: string[];
  /** counted, never generated: over half your letters left after 22:00 or
      before 06:00. Journal pages are deliberately excluded from the count. */
  nightOwl: boolean;
}

export interface WritingRow {
  id: string;
  body: string;
  created_at: string | null;
  lang?: string | null;
  stamp?: string | null;
  thread_id?: string | null;
  /** how many people have read it — present once 0020 is applied */
  reads?: number | null;
}
type Row = WritingRow;

/* everything I have written INTO THE WORLD — pool letters and thread
   messages, with their ids and dates so each is one piece with one day.
   Server-fetched (they live there), fail-safe to []. */
export async function fetchMyLetters(): Promise<{ letters: Row[]; messages: Row[]; hours: number[] }> {
  if (!supabaseReady) return { letters: [], messages: [], hours: [] };
  try {
    const { data: s } = await supabase!.auth.getSession();
    const me = s.session?.user?.id;
    if (!me) return { letters: [], messages: [], hours: [] };
    const mine = (cols: string) => supabase!.from("letters").select(cols).eq("author", me).eq("active", true).order("created_at", { ascending: false }).limit(200);
    let l: { data: unknown; error: unknown } = await mine("id,body,created_at,lang,stamp,reads");
    // pre-0020: no `reads` column yet — read the rest without it
    if (l.error) l = await mine("id,body,created_at,lang,stamp");
    const [m] = await Promise.all([
      supabase!.from("messages").select("id,body,created_at,thread_id").eq("sender", me).order("created_at", { ascending: false }).limit(400),
    ]);
    const letters = ((l.data || []) as Row[]).filter((r) => r.body);
    const messages = ((m.data || []) as Row[]).filter((r) => r.body);
    return {
      letters,
      messages,
      // local wall-clock hour of each piece — evidence for counted notices
      hours: [...letters, ...messages].filter((r) => r.created_at).map((r) => new Date(r.created_at!).getHours()),
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

/* ── which of your text is in scope: letters and replies always; sealed
   pages only when you turn them on (off by default — the owner's call) ── */
const SCOPE_KEY = "kindredly_aura_scope";
export interface AuraScope {
  sealed: boolean;
}
export async function getAuraScope(): Promise<AuraScope> {
  try {
    const raw = await AsyncStorage.getItem(SCOPE_KEY);
    return raw ? { sealed: false, ...(JSON.parse(raw) as Partial<AuraScope>) } : { sealed: false };
  } catch {
    return { sealed: false };
  }
}
export async function setAuraScope(scope: AuraScope): Promise<void> {
  try {
    await AsyncStorage.setItem(SCOPE_KEY, JSON.stringify(scope));
  } catch {
    /* the toggle just does not stick — never worth an alert */
  }
}

/* counted, never read into — for the Habits lens */
export function wordCounts(texts: string[], n = 6): [string, number][] {
  const freq = new Map<string, number>();
  for (const t of texts)
    for (const w of (t.toLowerCase().match(/[\p{L}']{4,}/gu) || []))
      if (!STOP.has(w)) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}
export function pauseCounts(texts: string[]): [string, number][] {
  const all = texts.join("\n");
  const c = (re: RegExp) => (all.match(re) || []).length;
  return [
    [". / 。", c(/[.。](?!\.)/g)],
    ["? / ？", c(/[?？]/g)],
    [", / ，", c(/[,，]/g)],
    ["— / …", c(/[—–]|\.{3,}|…/g)],
  ];
}

/* ── the sticker layer's memory: seats, challengers, retired stickers ── */
const STATE_KEY = "kindredly_sticker_state";

export async function loadStickerState(): Promise<StickerState | null> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as StickerState) : null;
  } catch {
    return null;
  }
}
async function saveStickerState(next: StickerState, prev: StickerState | null): Promise<void> {
  try {
    const a = JSON.stringify(next);
    if (prev && JSON.stringify(prev) === a) return;
    await AsyncStorage.setItem(STATE_KEY, a);
  } catch {
    /* the seats are recomputed next time; nothing is lost but the debounce */
  }
}

/* what Today needs from the aura, left on the phone by the last full read:
   the counted layer's ids and the stamps you have posted under. Today never
   computes the aura; it asks "is this reader a night writer? has she posted
   #crush?" and the answer is whatever the Me tab last showed. */
const FACTS_KEY = "kindredly_aura_facts";
async function loadAuraFacts(): Promise<AuraFacts> {
  const facts: AuraFacts = { stickers: new Set(), usage: new Set(), stamps: new Set() };
  try {
    const [raw, state] = await Promise.all([AsyncStorage.getItem(FACTS_KEY), loadStickerState()]);
    if (raw) {
      const f = JSON.parse(raw) as { usage?: string[]; stamps?: string[] };
      facts.usage = new Set(f.usage ?? []);
      facts.stamps = new Set(f.stamps ?? []);
    }
    for (const h of Object.values(state?.current ?? {})) if (h?.stickerId) facts.stickers.add(h.stickerId);
  } catch {
    /* a phone with no read yet shares nothing */
  }
  return facts;
}
function saveAuraFacts(usage: UsageSticker[], stamps: (string | null | undefined)[]): void {
  const f = { usage: usage.map((u) => u.id), stamps: [...new Set(stamps.filter((x): x is string => !!x))] };
  void AsyncStorage.setItem(FACTS_KEY, JSON.stringify(f)).catch(() => {});
}
/** what a pool letter has in common with the reader — see lib/today-signal */
export async function signalFor(letter: PoolLetter): Promise<Signal | null> {
  return signalFrom(letter, await loadAuraFacts());
}

const EMPTY: Aura = {
  phase: "empty",
  texts: [],
  pieceText: {},
  stickers: null,
  formed: 0,
  pieces: 0,
  dims: [],
  locked: [],
  sealed: [],
  archetype: null,
  draft: null,
  lastWrittenAt: null,
  usage: [],
  sources: { letters: 0, sealed: 0, conversations: 0 },
  commonWords: [],
  nightOwl: false,
};

/* the counted layer — threads, kept letters, the bird, the Today taps.
   Each source fails to "nothing counted", never to an error. */
async function readUsage(mine: Awaited<ReturnType<typeof fetchMyLetters>>, journal: Awaited<ReturnType<typeof loadJournal>>): Promise<UsageSticker[]> {
  const [threads, lore, counters, skin, accessory, name] = await Promise.all([
    fetchThreads().catch(() => null),
    loadLore().catch(() => []),
    getCounters(),
    getWrenSkin().catch(() => "sticker" as const),
    getWrenAccessory().catch(() => "none" as const),
    getWrenName().catch(() => DEFAULT_WREN),
  ]);
  try {
    return usageStickers({
      now: new Date().toISOString(),
      letters: mine.letters.map((r) => ({ at: r.created_at, text: r.body, stamp: r.stamp })),
      replies: mine.messages.map((r) => ({ at: r.created_at, text: r.body })),
      threads: threads ?? [],
      journal,
      keptN: lore.length,
      dressed: skin !== "sticker" || accessory !== "none",
      named: !!name && name.trim() !== DEFAULT_WREN,
      counters,
    });
  } catch {
    return [];
  }
}

export async function myAura(firstLine?: string | null): Promise<Aura> {
  const pieces: Piece[] = [];
  if (firstLine && firstLine.trim().length >= 3) pieces.push(toPiece("hatch-line", "hatch", firstLine.trim(), "", null));
  let sealedCount = 0;
  const scope = await getAuraScope();
  let journal: Awaited<ReturnType<typeof loadJournal>> = [];
  try {
    journal = (scope.sealed ? await loadJournal() : []).filter((e) => !e.id.startsWith("demo-"));
    for (const e of journal) {
      if (e.body && e.body.trim().length >= 3) {
        pieces.push(toPiece(e.id, "sealed", e.body.trim(), e.date, null));
        sealedCount++;
      }
    }
  } catch {
    /* the sealed room stays sealed — the aura just reads less */
  }
  const mine = await fetchMyLetters();
  for (const r of mine.letters) pieces.push(toPiece(r.id, "letter", r.body, r.created_at, r.lang));
  for (const r of mine.messages) pieces.push(toPiece(r.id, "reply", r.body, r.created_at, null));

  const usage = await readUsage(mine, journal);
  saveAuraFacts(usage, mine.letters.map((r) => r.stamp));
  const lastWrittenAt = [...mine.letters, ...mine.messages].map((r) => r.created_at).filter(Boolean).sort().pop() ?? null;
  if (!pieces.length) return { ...EMPTY, usage, lastWrittenAt };

  const texts = pieces.map((p) => p.text);
  const pieceText: Aura["pieceText"] = {};
  for (const p of pieces) pieceText[p.id] = { text: p.text, source: p.source, createdAt: p.createdAt };

  // the observation layer — deterministic over pieces + saved state. This is
  // what the reader is told: phase, stickers, title, all quotable.
  const prevState = await loadStickerState();
  const { readout, state, phase } = readStickers(pieces, prevState, { now: new Date().toISOString(), hours: mine.hours });
  void saveStickerState(state, prevState);

  // the instrument — still the shape, the correspondent read, the vector
  const h = hatch(texts);
  const locked = h.dims.filter((d) => d.locked);
  const sealed = h.dims.filter((d) => !d.locked);
  const established = readout.observations.filter((o) => o.state === "established").length;
  const formed = Math.min(1, 0.7 * (Math.min(established, 9) / 9) + 0.3 * Math.min(readout.windowPieces / 10, 1));

  let formedOn: string | null = null;
  if (phase === "formed") {
    try {
      const hist: AuraSnapshot[] = JSON.parse((await AsyncStorage.getItem(HIST_KEY)) || "[]");
      formedOn = hist.find((x) => x.phase === "formed")?.date ?? new Date().toISOString().slice(0, 10);
    } catch {
      formedOn = new Date().toISOString().slice(0, 10);
    }
  }

  return {
    phase,
    texts,
    pieceText,
    stickers: readout,
    formed,
    pieces: pieces.length,
    dims: h.dims,
    locked,
    sealed,
    formedOn,
    archetype: phase === "formed" ? h.archetype : null,
    draft: h.archetype ?? null,
    lastWrittenAt,
    usage,
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
    /* nothing published yet → nothing the hatch didn't already know. The
       hatch vector was built from EVERY fed thought; rebuilding here from
       the one saved line alone would make the fingerprint thinner. */
    if (!mine.letters.length && !mine.messages.length) return;
    let line = firstLine;
    if (line == null && supabaseReady) {
      try {
        const { data } = await supabase!.auth.getSession();
        const fl = (data.session?.user?.user_metadata as Record<string, unknown> | undefined)?.firstLine;
        if (typeof fl === "string") line = fl;
      } catch {
        /* the corpus alone is still worth refreshing */
      }
    }
    const parts = [
      ...(line && line.trim().length >= 3 ? [line.trim()] : []),
      ...mine.letters.map((r) => r.body),
      ...mine.messages.map((r) => r.body),
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
  locked: string[]; // dim keys locked as of this day (the instrument)
  /** established sticker ids as of this day */
  stickers?: string[];
  /** "quick-observer" once formed, "observer" while partial, null before */
  title?: string | null;
  phase?: AuraPhase;
  archetype: string | null;
  pieces: number;
}

const titleKey = (a: Aura): string | null => {
  const t = a.stickers?.title;
  if (!t || !t.noun) return null;
  return t.adjective ? `${t.adjective}-${t.noun}` : t.noun;
};

export async function recordAuraSnapshot(a: Aura): Promise<AuraSnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(HIST_KEY);
    const hist: AuraSnapshot[] = raw ? JSON.parse(raw) : [];
    const today = new Date().toISOString().slice(0, 10);
    const last = hist[hist.length - 1];
    const snap: AuraSnapshot = {
      date: today,
      locked: a.locked.map((d) => d.key),
      stickers: (a.stickers?.home ?? []).filter((s) => s.state === "established").map((s) => s.stickerId).sort(),
      title: titleKey(a),
      phase: a.phase,
      archetype: a.archetype?.id ?? null,
      pieces: a.pieces,
    };
    // append only when something actually changed — the timeline is events,
    // not a heartbeat
    const changed =
      !last ||
      last.title !== snap.title ||
      (last.stickers ?? []).join() !== (snap.stickers ?? []).join() ||
      last.phase !== snap.phase;
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
