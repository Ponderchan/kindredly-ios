/* THE MONTHLY REPORT, WRAPPED (owner, 2026-10-31; design/report-v2).
   ────────────────────────────────────────────────────────────────────────
   Wren's monthly night letter as eight cards, in two templates drawn by
   Swift (KWrappedReportScreen): A "Wrapped" (loud poster cards) and B "Mail
   pile" (every card a piece of post). This file is the pure half: no React,
   no React Native, no i18n, no storage. lib/report-wrapped gathers the
   facts (the account's letters, reads, replies and kindreds for the month,
   the nine-dimension read, the phone's last snapshot) and every word comes
   in through `fmt`, so `node src/screens/report/wrapped-core.test.ts`
   locks the rules.

   THE NUMBERS ARE COUNTS. Letters written in the period, Σ letters.reads
   over them (people, not opens: web 0020), threads where someone answered
   one of your letters, kindreds whose names were traded in the period.
   Nothing is estimated and nothing is a percentage. A card whose fact is
   missing is left out rather than filled.

   THE PERIOD. The calendar month before this one ("october, read by
   wren", 1 OCT–31 OCT) — unless it holds no letter of yours, and then this
   month so far (a first report can come mid-month). The next report is the
   1st of next month.

   THE CARDS, in order, and when each is there:
     cover   always: the month's type (its stamp in your coat), its line
     far     a letter in the period: the receipt (written, desks, wrote
             back, new kindreds) and "N people have read you…"
     line    a sentence from one of the period's letters, with its date.
             It never leaves the phone and is never on the share card.
     vibe    always: three #tags from the nine-dimension read (the 2am
             one first when the hour window is at night)
     hour    three letters or more: the densest 3-hour window of 24 local
             hours, and "N of M after 11pm" only when that window is at night
     click   always: the type you'd click with (PAIRS) and why
     share   always: the 9:16 card (type, stamp, #tags, kindredly.io/aura)
     next    always: how you changed since last month (First Class reads
             it; others see it blurred), Wren's prompt, write a letter */

export type WrappedTemplate = "A" | "B";
export type WrappedCardKey = "cover" | "far" | "line" | "vibe" | "hour" | "click" | "share" | "next";

export const ARCH_IDS = [
  "window-watcher",
  "night-courier",
  "pocket-archivist",
  "soft-cartographer",
  "static-listener",
  "unsent-editor",
  "weather-reporter",
  "ellipsis-keeper",
  "blunt-valentine",
  "slow-confetti",
  "margin-scribbler",
  "deep-diver",
] as const;
export type ArchId = (typeof ARCH_IDS)[number];

/** The web's coat ids, in its order (app/aura/result.js SKIN_IDS): the ?vs= code's second digit. */
export const SKIN_IDS = ["sticker", "moss", "plush", "peach", "ink"] as const;
export type SkinId = (typeof SKIN_IDS)[number];

/** The nine, in the web's fixed order (app/aura/result.js DIM_KEYS). */
export const DIM_KEYS = ["vocabulary", "sentence", "rhythm", "emotion", "perspective", "function", "punctuation", "structure", "quirks"] as const;

/* WHO YOU'D CLICK WITH — DRAFT FOR THE OWNER (2026-10-31). Six pairs, each
   both ways, built from the types' own lines in lib/hatch-engine: the two
   halves of each pair lead on different dimensions and finish each other's
   sentence. The why lines are rw.pair.<id> (strings-wrapped). Until the
   owner approves the table, the whole report stays behind its switch
   ("reportwrapped", off). */
export const PAIRS: Record<ArchId, ArchId> = {
  "night-courier": "window-watcher",
  "window-watcher": "night-courier",
  "pocket-archivist": "slow-confetti",
  "slow-confetti": "pocket-archivist",
  "soft-cartographer": "deep-diver",
  "deep-diver": "soft-cartographer",
  "static-listener": "weather-reporter",
  "weather-reporter": "static-listener",
  "unsent-editor": "blunt-valentine",
  "blunt-valentine": "unsent-editor",
  "ellipsis-keeper": "margin-scribbler",
  "margin-scribbler": "ellipsis-keeper",
};

export const isArchId = (v: unknown): v is ArchId => typeof v === "string" && (ARCH_IDS as readonly string[]).includes(v);

/* ── the period ── */

export type Period = {
  /** "2026-10" */
  month: string;
  /** local midnight of its first day, and of the day after it ends */
  start: Date;
  end: Date;
  /** the last day shown on the receipt (the month's last day, or today) */
  lastDay: Date;
  /** the month so far, not a whole one */
  partial: boolean;
};

const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** The month before `now`'s, whole. */
export function lastMonth(now: Date): Period {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  return { month: monthKeyOf(start), start, end, lastDay: new Date(end.getTime() - 86400000), partial: false };
}

/** `now`'s month, up to today. */
export function thisMonthSoFar(now: Date): Period {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { month: monthKeyOf(start), start, end, lastDay: new Date(now.getFullYear(), now.getMonth(), now.getDate()), partial: true };
}

/** "2026-11-01" for any day of October. */
export function nextReportDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/* ── the hour ── */

export type HourRead = {
  /** letters per local hour, 0…23 */
  buckets: number[];
  /** the densest 3-hour window's first hour */
  start: number;
  /** letters in it, and in all */
  inWindow: number;
  total: number;
  kind: "night" | "morning" | "day" | "evening";
  /** letters written at 23:00 or later, or before 05:00 */
  afterEleven: number;
};

export const HOUR_AT = 3;

/** The 24 buckets and the densest window, or null under three letters. Ties go to the window
    whose middle hour is fullest, then to the later start (nights are what people post). */
export function readHours(hours: number[]): HourRead | null {
  const hs = hours.filter((h) => Number.isInteger(h) && h >= 0 && h < 24);
  if (hs.length < HOUR_AT) return null;
  const buckets = Array.from({ length: 24 }, (_, i) => hs.filter((h) => h === i).length);
  let start = 0;
  let best = -1;
  let bestMid = -1;
  for (let s = 0; s < 24; s++) {
    const n = buckets[s] + buckets[(s + 1) % 24] + buckets[(s + 2) % 24];
    const mid = buckets[(s + 1) % 24];
    if (n > best || (n === best && mid >= bestMid)) {
      best = n;
      bestMid = mid;
      start = s;
    }
  }
  const covers = [start, (start + 1) % 24, (start + 2) % 24];
  const night = covers.some((h) => h === 23 || h < 4);
  const kind = night ? "night" : start >= 4 && start <= 10 ? "morning" : start >= 11 && start <= 16 ? "day" : "evening";
  return { buckets, start, inWindow: best, total: hs.length, kind, afterEleven: hs.filter((h) => h >= 23 || h < 5).length };
}

const hh = (h: number) => `${String(((h % 24) + 24) % 24).padStart(2, "0")}:00`;
/** "23:00" and "02:00" for a window from 23. */
export const windowEnds = (start: number): [string, string] => [hh(start), hh(start + 3)];

/* ── the line ── */

export type PickedLine = { text: string; at: string };

const OPENERS = /^(hi|hello|hey|dear|hola|olá|oi|halo|bonjour|salut|hallo|liebe|lieber|ciao|caro|cara)\b/i;
const FIRST_PERSON = /\b(i|i'm|i've|my|me|yo|mi|me|eu|meu|minha|aku|saya|je|j'|moi|mon|ma|ich|mein|meine|mir|mich|io|mio|mia)\b|私|僕|わたし|俺|나는|내가|저는|제가/i;
const CJK = /[぀-ヿ㐀-鿿가-힣]/;

/** The sentence from your own letters Wren keeps: one that stands alone (not a greeting, not a
    question), at a length a postcard holds, first person preferred, closest to ~70 characters;
    ties go to the earlier letter. Your words exactly as written, trimmed. */
export function pickLine(letters: { body: string; created_at: string }[]): PickedLine | null {
  let best: { text: string; at: string; score: number } | null = null;
  const sorted = [...letters].filter((l) => l.body && l.created_at).sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const l of sorted) {
    const sentences = l.body
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?。！？…])\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const s of sentences) {
      const cjk = CJK.test(s);
      const len = [...s].length;
      const [lo, hi, aim] = cjk ? [10, 60, 28] : [28, 140, 70];
      if (len < lo || len > hi) continue;
      if (/[?？]$/.test(s) || OPENERS.test(s) || /https?:|@\w/.test(s)) continue;
      const score = -Math.abs(len - aim) + (FIRST_PERSON.test(s) ? 25 : 0);
      if (!best || score > best.score) best = { text: s, at: l.created_at, score };
    }
  }
  return best ? { text: best.text, at: best.at } : null;
}

/* ── the #tags ── */

export type DimIn = { key: string; score: number; locked: boolean; chipId: string };

/** The #tag for each read the nine can give (hatch-engine chipIds), and the night one. The words
    are rw.tag.<id>.t / .s; the glyph is Swift's (KWrappedGlyph). */
export const TAG_OF_CHIP: Record<string, string> = {
  "dim.chip.vocabulary.observed": "observed",
  "dim.chip.vocabulary.plain": "plain",
  "dim.chip.sentence.breathe": "breathe",
  "dim.chip.sentence.short": "short",
  "dim.chip.rhythm.conversation": "conversation",
  "dim.chip.rhythm.steady": "steady",
  "dim.chip.emotion.contrast": "contrast",
  "dim.chip.emotion.owned": "owned",
  "dim.chip.emotion.low": "low",
  "dim.chip.perspective.distance": "distance",
  "dim.chip.perspective.inside": "inside",
  "dim.chip.perspective.world": "world",
  "dim.chip.function.hedged": "hedged",
  "dim.chip.function.commits": "commits",
  "dim.chip.punctuation.pauses": "pauses",
  "dim.chip.punctuation.commas": "commas",
  "dim.chip.punctuation.clean": "clean",
  "dim.chip.structure.detailFeeling": "detail",
  "dim.chip.structure.noThroat": "nothroat",
  "dim.chip.quirks.has": "quirks",
};
export const NIGHT_TAG = "night";
export const TAG_IDS = [NIGHT_TAG, ...Object.values(TAG_OF_CHIP)];

/** Three tags: the night one first when the hour window is at night, then the strongest reads
    (trusted ones before the still-growing), never two from one dimension. */
export function pickTags(dims: DimIn[], night: boolean): string[] {
  const out: string[] = night ? [NIGHT_TAG] : [];
  const order = [...dims].sort((a, b) => Number(b.locked) - Number(a.locked) || b.score - a.score);
  for (const d of order) {
    if (out.length >= 3) break;
    const tag = TAG_OF_CHIP[d.chipId];
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/* ── the compare code (web app/aura/result.js encodeVs, without the classic writer) ── */

export function encodeVs(arch: ArchId, skin: SkinId, dims: { key: string; score: number }[]): string {
  const a = Math.max(0, ARCH_IDS.indexOf(arch));
  const s = Math.max(0, SKIN_IDS.indexOf(skin));
  const scores = DIM_KEYS.map((k) => {
    const d = dims.find((x) => x.key === k);
    return d ? Math.max(0, Math.min(100, Math.round(d.score))) : 50;
  });
  return "a" + a.toString(36) + s + scores.map((n) => n.toString(36).padStart(2, "0")).join("");
}

/** kindredly.io/aura in the reader's language (the web's paths: /es/aura …; English has none). */
export function compareUrl(lang: string, vs: string): string {
  return "https://kindredly.io" + (lang === "en" ? "" : "/" + lang) + "/aura?vs=" + vs;
}

/* ── which template ── */

/** she → B "Mail pile", he → A "Wrapped", they or unset → one of the two, the same one every time
    for this reader (a hash of `seed`, the account id). A choice made with "switch style" wins. */
export function pickTemplate(pronoun: "she" | "he" | "they" | null, seed: string, chosen: WrappedTemplate | null): WrappedTemplate {
  if (chosen === "A" || chosen === "B") return chosen;
  if (pronoun === "she") return "B";
  if (pronoun === "he") return "A";
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 2 === 0 ? "A" : "B";
}

/* ── the month's snapshot, and how you changed ── */

export type Snapshot = {
  month: string;
  arch: ArchId;
  tags: string[];
  /** the hour window's first hour, or null */
  hour: number | null;
  letters: number;
  desks: number;
};

export type Change = { key: "type" | "typeSame" | "letters" | "desks" | "hour" | "hourSame" | "newTag"; vars: Record<string, string | number> };

/** What moved since `prev`, at most four rows, in the order: type, letters, desks, hour, a new
    tag. `typeName` names a type and `tagName` a tag in the reader's language. */
export function changesSince(
  prev: Snapshot | null,
  now: Snapshot,
  typeName: (id: ArchId) => string,
  tagName: (id: string) => string,
): Change[] {
  if (!prev) return [];
  const out: Change[] = [];
  out.push(prev.arch === now.arch ? { key: "typeSame", vars: { type: typeName(now.arch) } } : { key: "type", vars: { from: typeName(prev.arch), to: typeName(now.arch) } });
  if (prev.letters !== now.letters) out.push({ key: "letters", vars: { n: now.letters, m: prev.letters } });
  if (prev.desks !== now.desks) out.push({ key: "desks", vars: { n: now.desks, m: prev.desks } });
  if (prev.hour != null && now.hour != null)
    out.push(prev.hour === now.hour ? { key: "hourSame", vars: { h: hh(now.hour) } } : { key: "hour", vars: { from: hh(prev.hour), to: hh(now.hour) } });
  const fresh = now.tags.find((x) => !prev.tags.includes(x));
  if (fresh) out.push({ key: "newTag", vars: { tag: tagName(fresh) } });
  return out.slice(0, 4);
}

/** The snapshot to compare against: the latest one from a month before `month`. */
export function previousSnapshot(snaps: Snapshot[], month: string): Snapshot | null {
  return snaps.filter((s) => s.month < month).sort((a, b) => b.month.localeCompare(a.month))[0] ?? null;
}

/** Keep one snapshot per month, the newest twelve. */
export function keepSnapshot(snaps: Snapshot[], s: Snapshot): Snapshot[] {
  return [...snaps.filter((x) => x.month !== s.month), s].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);
}

/* ── the facts, and the view ── */

export type WrappedFacts = {
  period: Period;
  arch: ArchId;
  skin: SkinId;
  dims: DimIn[];
  /** the period's letters, each with its body, date and reads */
  letters: { body: string; created_at: string; reads: number }[];
  /** threads where someone wrote back to one of your letters, started in the period */
  repliesReceived: number;
  /** kindreds whose names were traded in the period */
  kindredsMade: number;
  /** the phone's last snapshot before this period */
  prev: Snapshot | null;
  /** First Class: "how you changed" is drawn, not blurred */
  member: boolean;
  /** Wren's prompt for today, already in the reader's language */
  prompt: string;
  lang: string;
  now: Date;
};

export type WrappedFmt = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** her name, as she is called */
  wren: string;
  /** "october" (the reader's language); `short` "oct" */
  monthName: (d: Date, short?: boolean) => string;
  /** "oct 14" / "14 oct." … */
  dayMonth: (d: Date) => string;
};

export type WrappedTag = { id: string; tag: string; sub: string; rank: string };

export type WrappedView = {
  cards: WrappedCardKey[];
  eyebrows: Record<WrappedCardKey, string>;
  arch: ArchId;
  skin: SkinId;
  /** the type, as the cards set it ("the night courier") */
  typeName: string;
  typeLine: string;
  /** cover */
  coverEyebrow: string;
  youre: string;
  typeIs: string;
  readFrom: string;
  tapToOpen: string;
  coverSign: string;
  envelopeTo: string;
  /** far */
  letters: number;
  desks: number;
  replies: number;
  kindreds: number;
  farLede: string;
  farBig: string;
  farUnit: string;
  receiptHead: string;
  receiptSub: string;
  rowWrote: string;
  rowDesks: string;
  rowBack: string;
  rowKindred: string;
  receiptKeep: string;
  delivered: string;
  backSticker: string;
  kindredSticker: string;
  closer: string;
  /** line */
  lineTitle: string;
  line: string;
  lineSig: string;
  postcard: string;
  stampSlot: string;
  lineTo: string;
  lineOnly: string;
  lineOutOf: string;
  lineStickers: [string, string];
  /** vibe */
  vibeTitleA: string;
  vibeTitleB: string;
  vibeSub: string;
  vibeRead: string;
  tags: WrappedTag[];
  tear: string;
  /** hour */
  hourLede: string;
  hourFrom: string;
  hourTo: string;
  hourLine: string;
  hourService: string;
  hourAfter: string;
  hourStrip: string;
  hourStub: string;
  hourFoot: string;
  hourEach: string;
  hourBuckets: number[];
  hourStart: number;
  hourNight: boolean;
  /** click */
  clickTitle: string;
  pair: ArchId;
  pairName: string;
  pairLine: string;
  destination: string;
  whyLabel: string;
  why: string;
  theirThing: string;
  readTheirs: string;
  readHint: string;
  /** share */
  shareTitle: string;
  shareBrand: string;
  shareIssue: string;
  shareIm: string;
  shareAsk: string;
  shareUrl: string;
  shareTypeLabel: string;
  shareWhatsYours: string;
  shareStory: string;
  shareCompare: string;
  switchStyle: string;
  compareUrl: string;
  compareMessage: string;
  shareMessage: string;
  /** next */
  nextTitle: string;
  sinceLabel: string;
  changedTitle: string;
  changes: string[];
  /** no snapshot to compare with yet */
  firstNote: string;
  locked: boolean;
  unlock: string;
  seal: string;
  promptLabel: string;
  prompt: string;
  write: string;
  nextReport: string;
  /** chrome */
  close: string;
  /** a11y: the cards' tap zones */
  nextCard: string;
  prevCard: string;
};

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** The cards there are, in order. */
export function wrappedCards(f: Pick<WrappedFacts, "letters">, line: PickedLine | null, hours: HourRead | null): WrappedCardKey[] {
  const keys: WrappedCardKey[] = ["cover"];
  if (f.letters.length) keys.push("far");
  if (line) keys.push("line");
  keys.push("vibe");
  if (hours) keys.push("hour");
  keys.push("click", "share", "next");
  return keys;
}

export function wrappedView(f: WrappedFacts, fmt: WrappedFmt): WrappedView {
  const { t, wren } = fmt;
  // the report's voice is lower case where the language's own rules allow it (rw.case)
  const lower = t("rw.case") === "lower";
  const cased = (s: string) => (lower ? s.toLocaleLowerCase(f.lang) : s);
  const T = (key: string, vars: Record<string, string | number> = {}) => cased(t(key, { wren, ...vars }));
  const plural = (n: number, one: string, many: string, vars: Record<string, string | number> = {}) => T(n === 1 ? one : many, { n, ...vars });

  const hours = readHours(f.letters.map((l) => new Date(l.created_at).getHours()));
  const line = pickLine(f.letters);
  const cards = wrappedCards(f, line, hours);
  const tags = pickTags(f.dims, hours?.kind === "night");
  const typeName = (id: ArchId) => cased(t(`arch.${id}.name`));
  const tagName = (id: string) => T(`rw.tag.${id}.t`);

  const letters = f.letters.length;
  const desks = f.letters.reduce((a, l) => a + (Number.isFinite(l.reads) ? Math.max(0, l.reads) : 0), 0);
  const month = fmt.monthName(f.period.start);
  const pair = PAIRS[f.arch];
  const [from, to] = hours ? windowEnds(hours.start) : ["", ""];
  const vs = encodeVs(f.arch, f.skin, f.dims);
  const url = compareUrl(f.lang, vs);
  const nowSnap: Snapshot = { month: f.period.month, arch: f.arch, tags, hour: hours?.start ?? null, letters, desks };
  const changes = changesSince(f.prev, nowSnap, typeName, tagName).map((c) => T(`rw.ch.${c.key}`, c.vars));
  const rank = [T("rw.vibe.r1"), T("rw.vibe.r2"), T("rw.vibe.r3")];

  return {
    cards,
    eyebrows: {
      cover: T("rw.cover.eyebrow", { month }),
      far: T("rw.far.eyebrow"),
      line: T("rw.line.eyebrow"),
      vibe: T("rw.vibe.eyebrow"),
      hour: T("rw.hour.eyebrow"),
      click: T("rw.click.eyebrow"),
      share: T("rw.share.eyebrow"),
      next: T("rw.next.eyebrow"),
    },
    arch: f.arch,
    skin: f.skin,
    typeName: typeName(f.arch),
    typeLine: cased(t(`arch.${f.arch}.desc`)),
    coverEyebrow: T("rw.cover.eyebrow", { month }),
    youre: T("rw.cover.youre"),
    typeIs: T("rw.cover.typeIs"),
    readFrom: letters ? plural(letters, "rw.cover.fromOne", "rw.cover.from") : T("rw.cover.fromWriting"),
    tapToOpen: T("rw.cover.tap"),
    coverSign: T("rw.cover.sign"),
    envelopeTo: T("rw.cover.to"),

    letters,
    desks,
    replies: f.repliesReceived,
    kindreds: f.kindredsMade,
    farLede: desks ? plural(letters, "rw.far.ledeOne", "rw.far.lede") : plural(letters, "rw.far.ledeZeroOne", "rw.far.ledeZero"),
    farBig: String(desks || letters),
    farUnit: desks ? (desks === 1 ? T("rw.far.unitOne") : T("rw.far.unit")) : T("rw.far.unitZero"),
    receiptHead: T("rw.far.receipt"),
    receiptSub: cased(
      fill(t("rw.far.receiptSub"), {
        month,
        range: `${fmt.dayMonth(f.period.start)}–${fmt.dayMonth(f.period.lastDay)}`,
      }),
    ).toLocaleUpperCase(f.lang),
    rowWrote: T("rw.far.rowWrote"),
    rowDesks: T("rw.far.rowDesks"),
    rowBack: T("rw.far.rowBack"),
    rowKindred: T("rw.far.rowKindred"),
    receiptKeep: T("rw.far.keep"),
    delivered: T("rw.far.delivered"),
    backSticker: plural(f.repliesReceived, "rw.far.backOne", "rw.far.back"),
    kindredSticker: plural(f.kindredsMade, "rw.far.kindredOne", "rw.far.kindred"),
    closer: desks ? plural(desks, "rw.far.closerOne", "rw.far.closer") : T("rw.far.closerZero"),

    lineTitle: T("rw.line.title"),
    line: line ? `“${line.text}”` : "",
    lineSig: line ? T("rw.line.sig", { date: fmt.dayMonth(new Date(line.at)) }) : "",
    postcard: T("rw.line.postcard"),
    stampSlot: T("rw.line.slot"),
    lineTo: T("rw.line.to"),
    lineOnly: T("rw.line.only"),
    lineOutOf: T(f.period.partial ? "rw.line.outOfSoFar" : "rw.line.outOf"),
    lineStickers: [T("rw.line.st1"), T("rw.line.st2")],

    vibeTitleA: T("rw.vibe.titleA"),
    vibeTitleB: T("rw.vibe.titleB"),
    vibeSub: T("rw.vibe.sub"),
    vibeRead: T(`rw.read.${f.arch}`),
    tags: tags.map((id, i) => ({ id, tag: tagName(id), sub: T(`rw.tag.${id}.s`), rank: rank[i] ?? "" })),
    tear: T("rw.vibe.tear"),

    hourLede: T("rw.hour.lede"),
    hourFrom: from,
    hourTo: to,
    hourLine: hours ? T(`rw.hour.k.${hours.kind}`) : "",
    hourService: hours ? T(hours.kind === "night" ? "rw.hour.serviceNight" : "rw.hour.serviceDay") : "",
    hourAfter: hours && hours.kind === "night" ? T("rw.hour.after", { n: hours.afterEleven, m: hours.total }) : "",
    hourStrip: T("rw.hour.strip"),
    hourStub: hours ? T(`rw.hour.stub.${hours.kind}`) : "",
    hourFoot: hours ? T(hours.kind === "night" ? "rw.hour.footNight" : "rw.hour.footDay") : "",
    hourEach: hours ? (hours.kind === "night" ? T("rw.hour.eachNight", { n: hours.afterEleven, m: hours.total }) : T("rw.hour.each")) : "",
    hourBuckets: hours?.buckets ?? [],
    hourStart: hours?.start ?? 0,
    hourNight: hours?.kind === "night",

    clickTitle: T("rw.click.title"),
    pair,
    pairName: typeName(pair),
    pairLine: cased(t(`arch.${pair}.desc`)),
    destination: T("rw.click.dest"),
    whyLabel: T("rw.click.why"),
    why: T(`rw.pair.${f.arch}`),
    theirThing: T("rw.click.theirs"),
    readTheirs: T("rw.click.read"),
    readHint: T("rw.click.hint"),

    shareTitle: T("rw.share.title"),
    shareBrand: T("rw.share.brand"),
    shareIssue: T("rw.share.issue", { month: fmt.monthName(f.period.start, true), yy: String(f.period.start.getFullYear()).slice(2) }),
    shareIm: T("rw.share.im"),
    shareAsk: T("rw.share.ask"),
    shareUrl: "kindredly.io/aura",
    shareTypeLabel: T("rw.share.typeLabel"),
    shareWhatsYours: T("rw.share.whatsYours"),
    shareStory: T("rw.share.story"),
    shareCompare: T("rw.share.compare"),
    switchStyle: T("rw.share.switch"),
    compareUrl: url,
    compareMessage: fill(t("rw.share.compareMsg", { wren }), { type: typeName(f.arch), url }),
    shareMessage: fill(t("rw.share.msg", { wren }), { type: typeName(f.arch), url }),

    nextTitle: T("rw.next.title"),
    sinceLabel: f.prev ? T("rw.next.since", { month: fmt.monthName(monthStart(f.prev.month)) }) : "",
    changedTitle: T("rw.next.changed"),
    changes,
    firstNote: f.prev ? "" : T("rw.next.first"),
    locked: !f.member && changes.length > 0,
    unlock: T("rw.next.unlock"),
    seal: T("rw.next.seal"),
    promptLabel: T("rw.next.promptLabel"),
    prompt: f.prompt,
    write: T("rw.next.write"),
    nextReport: T("rw.next.report", { date: fmt.dayMonth(nextReportDay(f.now)) }).toLocaleUpperCase(f.lang),

    close: t("rw.close"),
    nextCard: t("rw.a11y.next"),
    prevCard: t("rw.a11y.prev"),
  };
}

/** "2026-09" → its first day, local. */
export function monthStart(month: string): Date {
  const [y, m] = month.split("-").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, 1);
}

/** The snapshot this report leaves for next month's. */
export function snapshotOf(f: WrappedFacts): Snapshot {
  const hours = readHours(f.letters.map((l) => new Date(l.created_at).getHours()));
  return {
    month: f.period.month,
    arch: f.arch,
    tags: pickTags(f.dims, hours?.kind === "night"),
    hour: hours?.start ?? null,
    letters: f.letters.length,
    desks: f.letters.reduce((a, l) => a + Math.max(0, l.reads || 0), 0),
  };
}
