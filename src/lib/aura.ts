import { onStorageUserChange, scoped as AsyncStorage, scopedTo, storageNs, storageOwner } from "./scoped-store";
import { wroteSerial } from "./aura-fresh";
import { hatch, type Archetype, type DimScore } from "./hatch-engine";
import { loadJournal } from "./journal";
import { signatureVector, voiceSignature } from "./signature";
import { supabase, supabaseReady } from "./supabase";
import { fetchThreads, upsertFingerprint, whoAmI, TAKEN_BACK, type PoolLetter } from "./db";
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
  /** true when your letters couldn't be read from the server: this is the
      last kept read (or, with none kept, a read of this phone's words
      alone that was not saved). Show it; don't celebrate changes in it. */
  stale?: boolean;
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

/** everything I have written into the world, as fetchMyWriting reads it */
export interface MyWriting {
  /** my active pool letters, newest first (up to 200) */
  letters: Row[];
  /** my thread messages, newest first (up to 400), lines taken back left out */
  messages: Row[];
  /** the local wall-clock hour of each piece — evidence for counted notices */
  hours: number[];
}
const NOTHING_WRITTEN: MyWriting = { letters: [], messages: [], hours: [] };

/* everything I have written INTO THE WORLD — pool letters and thread
   messages, with their ids and dates so each is one piece with one day.
   Server-fetched (they live there).

   NULL WHEN IT COULDN'T BE READ (10a step 5). This used to fail to empty
   lists, and an empty answer is an answer: offline, myAura rebuilt the
   card from the hatch line alone, overwrote the kept read and the stamp
   facts, and Me said FROM YOUR FIRST LINES · 0 LETTERS to someone with a
   year of letters (the Me offline bug, same root as known bug 1). */
/**
 * Your writing, or null when it couldn't be read (offline, or a query
 * failed) — keep whatever you showed last. A guest (no session) and a
 * build without keys get empty lists: nothing of theirs is on a server.
 */
export async function fetchMyWriting(): Promise<MyWriting | null> {
  if (!supabaseReady) return NOTHING_WRITTEN;
  try {
    const who = await whoAmI();
    if (!("id" in who)) return who.reason === "network" ? null : NOTHING_WRITTEN;
    const me = who.id;
    const mine = (cols: string) => supabase!.from("letters").select(cols).eq("author", me).eq("active", true).order("created_at", { ascending: false }).limit(200);
    const [first, m] = await Promise.all([
      mine("id,body,created_at,lang,stamp,reads"),
      supabase!.from("messages").select("id,body,created_at,thread_id").eq("sender", me).order("created_at", { ascending: false }).limit(400),
    ]);
    let l: { data: unknown; error: unknown } = first;
    // pre-0020: no `reads` column yet — read the rest without it
    if (l.error) l = await mine("id,body,created_at,lang,stamp");
    if (l.error || m.error) return null;
    const letters = ((l.data || []) as Row[]).filter((r) => r.body);
    const messages = ((m.data || []) as Row[]).filter((r) => r.body && r.body !== TAKEN_BACK); // a line taken back (web 0031) is nobody's writing
    return {
      letters,
      messages,
      hours: [...letters, ...messages].filter((r) => r.created_at).map((r) => new Date(r.created_at!).getHours()),
    };
  } catch {
    return null;
  }
}

/**
 * The old shape: your writing, or EMPTY LISTS when it couldn't be read.
 * Kept only for callers not yet moved (My letters); new code uses
 * fetchMyWriting and keeps what it showed when that is null.
 */
export async function fetchMyLetters(): Promise<MyWriting> {
  return (await fetchMyWriting()) ?? NOTHING_WRITTEN;
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
/* the stamps you have posted under, each with the last day you used it —
   the Me Stamps segment labels every cell with that date (10a, H:81) */
function saveAuraFacts(usage: UsageSticker[], letters: Row[]): void {
  const stampsAt: Record<string, string> = {};
  for (const r of letters) {
    if (!r.stamp || !r.created_at) continue;
    if (!stampsAt[r.stamp] || r.created_at > stampsAt[r.stamp]) stampsAt[r.stamp] = r.created_at;
  }
  const stamps = [...new Set(letters.map((r) => r.stamp).filter((x): x is string => !!x))];
  const f = { usage: usage.map((u) => u.id), stamps, stampsAt };
  void AsyncStorage.setItem(FACTS_KEY, JSON.stringify(f)).catch(() => {});
}

/** a stamp you have posted a letter under, and the last time you did (ISO; null if the kept read predates dates) */
export interface UsedStamp {
  id: string;
  at: string | null;
}
/**
 * The stamps you have used, newest first, as the last full aura read left
 * them on this phone (Me reads them; nothing is fetched). Empty before the
 * first read. Offline reads never overwrite this.
 */
export async function readUsedStamps(): Promise<UsedStamp[]> {
  try {
    const raw = await AsyncStorage.getItem(FACTS_KEY);
    if (!raw) return [];
    const f = JSON.parse(raw) as { stamps?: string[]; stampsAt?: Record<string, string> };
    const at = f.stampsAt ?? {};
    const ids = [...new Set([...(f.stamps ?? []), ...Object.keys(at)])];
    return ids
      .map((id) => ({ id, at: at[id] ?? null }))
      .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  } catch {
    return [];
  }
}
/* THE LAST READ, KEPT — so the Me tab paints the card the moment it opens
   instead of after the letters have come back from the network. The card
   is drawn from this at once and redrawn when the fresh read lands; the
   two are usually identical, and when they differ the fresh one wins.
   Same move the courier card makes with the threads cache. */
const AURA_CACHE_KEY = "kindredly_aura_cache";
export async function readAuraCache(): Promise<Aura | null> {
  try {
    const ns = await storageOwner();
    const raw = await scopedTo(ns).getItem(AURA_CACHE_KEY);
    const a = raw ? (JSON.parse(raw) as Aura) : null;
    // the kept card goes into memory too, for the next page's first frame (never over a full read)
    if (a && ns === storageNs() && memory?.ns !== ns) memory = { ns, aura: a, readAt: 0, serial: -1 };
    return a;
  } catch {
    return null;
  }
}

/* THE CARD IN MEMORY, AND HOW OFTEN IT IS READ (owner, 2026-11-13, TestFlight b43: Me's Aura
   picture "加载半天，一开始纯灰色" — "别时时读了"). The kept card is taken into memory when the
   app starts (prefetchAuraCard, once auth has said whose phone it is), so Me's first frame has the
   picture instead of the grey slot. Every full read (myAura) lands here with the write count it
   started at (lib/aura-fresh), and Me reads again only when that is no longer current: something
   was written on this phone since, the read was offline (stale), it came from the kept card
   only, or it is over AURA_FRESH_MS old (words written on the web). The aura page, the planet
   page and the courier still read in full when they open; this is Me's look. */
const AURA_FRESH_MS = 2 * 60 * 60 * 1000;
let memory: { ns: string; aura: Aura; readAt: number; serial: number } | null = null;
onStorageUserChange(() => {
  memory = null;
  prefetchAuraCard();
});

/** The last card this account read (in full or from the kept one), now, or null. */
export function keptAura(): Aura | null {
  const ns = storageNs();
  return ns !== null && memory?.ns === ns ? memory.aura : null;
}

/** true = the card in memory is a full read from after the last write, under two hours old. */
export function auraIsCurrent(now = Date.now()): boolean {
  const m = keptAura() ? memory : null;
  return !!m && !m.aura.stale && m.readAt > 0 && now - m.readAt < AURA_FRESH_MS && m.serial === wroteSerial();
}

/** Takes the kept card into memory (the root calls it at launch; again for each account). */
export function prefetchAuraCard(): void {
  void readAuraCache();
}

function saveAuraCache(a: Aura, key?: string): void {
  // the words themselves stay out of it: the card needs the read, not the corpus
  const light: Aura = { ...a, texts: [], pieceText: {} };
  void AsyncStorage.setItem(AURA_CACHE_KEY, JSON.stringify(light)).catch(() => {});
  if (key) void AsyncStorage.setItem(AURA_CACHE_KEY + ":key", key).catch(() => {});
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
async function readUsage(mine: MyWriting, journal: Awaited<ReturnType<typeof loadJournal>>): Promise<UsageSticker[]> {
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

/* the words the aura page counts and quotes (texts, pieceText), from pieces */
function wordsOf(pieces: readonly Piece[]): Pick<Aura, "texts" | "pieceText"> {
  const texts = pieces.map((p) => p.text);
  const pieceText: Aura["pieceText"] = {};
  for (const p of pieces) pieceText[p.id] = { text: p.text, source: p.source, createdAt: p.createdAt };
  return { texts, pieceText };
}

/**
 * The aura, read from everything you wrote. When your letters can't be
 * read from the server (fetchMyWriting null) nothing kept is overwritten:
 * the last kept read comes back marked `stale`, carrying the words this
 * phone holds itself (the hatch line, and the journal pages when the aura
 * scope lets it read them). The kept card is saved without its words, so
 * without these the aura page would count no words and quote nothing.
 * With none kept, a read of this phone's words alone comes back `stale`.
 * Neither is saved (not the card, not the stamp facts, not the sticker
 * seats, not the history).
 */
export async function myAura(firstLine?: string | null): Promise<Aura> {
  const ns = storageNs();
  const serial = wroteSerial();
  const a = await readMyAura(firstLine);
  // into memory for Me's next look (above): the write count it started at, so a letter sent while it read reads again
  if (ns !== null && ns === storageNs()) memory = { ns, aura: a, readAt: a.stale ? 0 : Date.now(), serial };
  return a;
}

async function readMyAura(firstLine?: string | null): Promise<Aura> {
  const fetched = await fetchMyWriting();
  const persist = !!fetched;
  const mine: MyWriting = fetched ?? NOTHING_WRITTEN;
  /* the phone's own pieces first: an offline read hands them back with the kept card */
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
  if (!fetched) {
    const kept = await readAuraCache();
    if (kept) return { ...kept, ...wordsOf(pieces), stale: true };
  }
  for (const r of mine.letters) pieces.push(toPiece(r.id, "letter", r.body, r.created_at, r.lang));
  for (const r of mine.messages) pieces.push(toPiece(r.id, "reply", r.body, r.created_at, null));

  const usage = await readUsage(mine, journal);
  if (persist) saveAuraFacts(usage, mine.letters);
  const lastWrittenAt = [...mine.letters, ...mine.messages].map((r) => r.created_at).filter(Boolean).sort().pop() ?? null;
  if (!pieces.length) {
    const empty: Aura = { ...EMPTY, usage, lastWrittenAt, ...(persist ? {} : { stale: true }) };
    if (persist) saveAuraCache(empty);
    return empty;
  }

  const { texts, pieceText } = wordsOf(pieces);

  /* SAME WORDS, SAME READ (stall probe, 2026-09-20). The hatch and the
     sticker pass over every piece are the heaviest thing the Me tab does,
     and they ran on every visit even when not a word had changed. The
     corpus is fingerprinted by its piece ids; when the fingerprint
     matches the last read, that read is returned with the words put
     back, and the engine stays cold. */
  const key = `${pieces.map((p) => p.id).sort().join("|")}#${scope.sealed ? 1 : 0}`;
  try {
    const lastKey = persist ? await AsyncStorage.getItem(AURA_CACHE_KEY + ":key") : null;
    if (lastKey === key) {
      const cached = await readAuraCache();
      if (cached && cached.phase !== "empty") return { ...cached, texts, pieceText, usage, lastWrittenAt };
    }
  } catch {
    /* no cache, the long way */
  }

  // the observation layer — deterministic over pieces + saved state. This is
  // what the reader is told: phase, stickers, title, all quotable.
  const prevState = await loadStickerState();
  const { readout, state, phase } = readStickers(pieces, prevState, { now: new Date().toISOString(), hours: mine.hours });
  // a read of the phone's words alone must not move the seats it would retire
  if (persist) void saveStickerState(state, prevState);

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

  const aura: Aura = {
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
    ...(persist ? {} : { stale: true }),
  };
  if (persist) saveAuraCache(aura, key);
  return aura;
}

/* ── the server vector, letters only, refreshed on every send ── */

export async function refreshFingerprint(firstLine?: string | null): Promise<void> {
  try {
    const mine = await fetchMyWriting();
    /* nothing published yet → nothing the hatch didn't already know. The
       hatch vector was built from EVERY fed thought; rebuilding here from
       the one saved line alone would make the fingerprint thinner. And a
       read that failed is not "nothing published": leave the vector be. */
    if (!mine || (!mine.letters.length && !mine.messages.length)) return;
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

/** append today's snapshot when the read changed; a stale (offline) read
    is never recorded — it would log a change that didn't happen */
export async function recordAuraSnapshot(a: Aura): Promise<AuraSnapshot[]> {
  if (a.stale) return loadAuraHistory();
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
