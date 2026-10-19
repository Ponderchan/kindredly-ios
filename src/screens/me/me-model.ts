import type { Rung } from "../../lib/aura-ladder";
import type { FaceInput } from "../../lib/faces";
import type { LetterCardFacts, LetterStatus } from "../letters/letters-model";

/* THE ME TAB, AS DATA (10a step 5). Pure: no React, no React Native, no
   i18n — every word comes in through `fmt`, so
   `node src/screens/me/me-model.test.ts` locks the rules. Both renderers
   draw what buildMeView returns: the SwiftUI screen (MeNative → KMeView)
   and the React Native fallback (MeRN), so a remote flip between them
   never changes a word, a count or where a tap goes.

   WHAT IT DECIDES
   - the profile: the pen name (or "You", never a hardcoded English word),
     JOINED, the cofounder mark, and the two figures. A figure that hasn't
     been read yet is a dash, not a 0: LETTERS is what the aura read
     counted (pool letters), KINDREDS the growth stats — a fresh install
     used to show "0 LETTERS" until the first read came back, which is a
     claim nobody had checked.
   - the four segments (Courier / Aura / Stamps / First Class) and which
     one opens: the one used last this session, Courier by default.
   - the Aura card (10a, H:78): every number is a count, no progress bar
     (owner). The well's glyphs are five ticks until the first label holds,
     then three slots for the labels a name needs and the strongest label's
     five slips. Its art is the title's own scene once a noun is known (a
     sketch while the name forms, in colour once earned), else the generic
     desk scene at the rung's fidelity.
   - the Stamps card: the stamps you have used, newest first, each with
     the day you last used it (H:81 labels cells by date, not name; the name
     is VoiceOver's).
   - the keepsakes block: how many she has kept, the latest two, NEW on any
     you haven't opened.
   - the First Class card: the owner's copy, never "More Kindreds" or "a
     monthly reading" (Apple 2.3.2); a member's and a cofounder's own words.
   - what VoiceOver says for the courier card, which on her day off opens
     the game rather than her room (its time spelled out, never the card's
     mono "3H AGO"), and for a keepsake tile ("{name}, new" while unopened).
   - what the Aura art slot's rungs before colour are drawn with: the
     paper's strokes on a light theme, the theme's light ones on a dark one. */

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** The model's words: i18n's t, a short date in the reader's language, and upper-casing. */
export type MeFormat = {
  t: TFn;
  /** "Jul 27" — a day, short, in the reader's language (the builder capitalises it) */
  dateShort: (d: string | number) => string;
  /** upper-case in the reader's locale */
  upper: (s: string) => string;
};

/* ── the segments ──────────────────────────────────────────────────────── */

export const SEGMENTS = ["courier", "aura", "stamps", "firstClass"] as const;
export type Segment = (typeof SEGMENTS)[number];
/** the First Class chip is gold in every theme (KSegmentChips firstClassIndex) */
export const FIRST_CLASS_SEGMENT = 3;

/** A segment index that is always one of the four (a stale or junk value opens Courier). */
export const segmentIndex = (i: unknown): number => (typeof i === "number" && Number.isInteger(i) && i >= 0 && i < SEGMENTS.length ? i : 0);

export function segmentLabels(fmt: MeFormat): string[] {
  const { t } = fmt;
  return [t("me.seg.courier"), t("me.seg.aura"), t("me.seg.stamps"), t("set.member.first")];
}

/* ── the profile card (H:72) ───────────────────────────────────────────── */

export type ProfileFacts = {
  /** the pen name; null, "" or blanks for none */
  handle: string | null | undefined;
  /** when the account was made (ISO); null for a guest */
  createdAt: string | null | undefined;
  cofounderNo: number | null | undefined;
  /** pool letters the aura counted; null until the first aura read */
  letters: number | null;
  /** kindreds from the growth stats; null until they are read */
  kindreds: number | null;
};

export type StatKey = "letters" | "kindreds";
export type StatVM = {
  key: StatKey;
  glyph: "envelope" | "bubbles";
  /** the figure, or "–" while it is unknown */
  count: string;
  /** LETTERS, KINDRED(S) */
  unit: string;
  /** "12 letters"; just the unit while unknown */
  a11y: string;
};

export type ProfileVM = {
  name: string;
  /** "JOINED JUL 27"; "" for none */
  joined: string;
  /** "COFOUNDER No. 007"; "" for none */
  cofounder: string;
  /** the number itself, for the React Native CofounderMark; null for none */
  cofounderNo: number | null;
  stats: StatVM[];
  /** VoiceOver's name for the pencil */
  editLabel: string;
};

/** the dash a figure shows until it has been read */
export const UNKNOWN = "–";

export const pad3 = (n: number): string => String(n).padStart(3, "0");

/** The pen name to show: the handle, or "You" (set.you) when there is none. */
export function penName(handle: string | null | undefined, fmt: MeFormat): string {
  const h = (handle ?? "").trim();
  return h || fmt.t("set.you");
}

export function buildProfile(f: ProfileFacts, fmt: MeFormat): ProfileVM {
  const { t, upper } = fmt;
  const letters = f.letters;
  const kindreds = f.kindreds;
  const kindredUnit = kindreds === 1 ? t("me.kindredLabelOne") : t("me.kindredLabel");
  return {
    name: penName(f.handle, fmt),
    joined: f.createdAt ? t("me.joined", { date: upper(fmt.dateShort(f.createdAt)) }) : "",
    cofounder: f.cofounderNo != null ? t("cf.no", { n: pad3(f.cofounderNo) }) : "",
    cofounderNo: f.cofounderNo ?? null,
    stats: [
      {
        key: "letters",
        glyph: "envelope",
        count: letters == null ? UNKNOWN : String(letters),
        unit: t("me.lettersLabel"),
        a11y: letters == null ? t("me.lettersLabel") : letters === 1 ? t("me.a11y.lettersOne") : t("me.a11y.letters", { n: letters }),
      },
      {
        key: "kindreds",
        glyph: "bubbles",
        count: kindreds == null ? UNKNOWN : String(kindreds),
        unit: kindredUnit,
        a11y: kindreds == null ? kindredUnit : kindreds === 1 ? t("me.a11y.kindredsOne") : t("me.a11y.kindreds", { n: kindreds }),
      },
    ],
    editLabel: t("me.edit"),
  };
}

/* ── the Aura card (H:78; owner: counts, no bar) ───────────────────────── */

export type AuraTitleFacts = { noun: string | null; adjective: string | null } | null;

export type AuraFacts = {
  rung: Rung;
  /** the title's name in the reader's language once formed (sticker-copy titleName); "" or null before */
  titleName: string | null;
  /** the title's noun and adjective, for its scene */
  title: AuraTitleFacts;
  /** the (up to) three labels on the card, named; emerging = still trying on (dashed) */
  chips: { id: string; name: string; emerging: boolean }[];
};

export type AuraMeter = {
  /** five ticks (letters on the way to the first label) or three slots (labels a name needs) */
  kind: "ticks" | "slots";
  filled: number;
  total: number;
  /** the strongest held label's "n of your last m", as five slips; null for none */
  slips: { n: number; of: number } | null;
};

export type AuraArt = {
  /** the scene's id in AURA_SCENES / AURA_SKETCHES, or null for the generic desk */
  sceneId: string | null;
  /** colour (named), sketch (forming), or the generic desk's own fidelity */
  fidelity: Rung["fidelity"];
};

export type AuraCardVM = {
  /** YOUR WRITING AURA */
  label: string;
  title: string;
  /** FROM YOUR 12 LETTERS */
  from: string;
  chips: { id: string; name: string; emerging: boolean }[];
  meter: AuraMeter;
  caption: string;
  cta: string;
  /** where the call to action goes: write a letter (the first rungs) or the aura room */
  ctaTo: "compose" | "aura";
  /** named: the share button shows */
  share: boolean;
  shareLabel: string;
  art: AuraArt;
};

/** "quiet-observer" — a scene's id, the AuraCard rule (adjective "quiet" stands in while unknown). */
export const sceneId = (adj: string | null, noun: string): string => `${(adj ?? "quiet").replace(/_/g, "-")}-${noun.replace(/_/g, "-")}`;

export function auraMeter(rung: Rung): AuraMeter {
  if (rung.level <= 2) return { kind: "ticks", filled: Math.max(0, Math.min(rung.letters, 5)), total: 5, slips: null };
  return { kind: "slots", filled: Math.max(0, Math.min(rung.stuck, 3)), total: 3, slips: rung.slips };
}

/** The well's caption: what has been counted, never a percentage (AuraCard's rule). */
export function auraCaption(rung: Rung, fmt: MeFormat): string {
  const { t } = fmt;
  if (rung.level <= 2) {
    // past the five and nothing holds — say so
    if (rung.letters > 5) return t("ap.prog.notYet", { n: rung.letters });
    return t("ap.prog.letters", { n: rung.letters, m: rung.level === 2 ? 5 : 3 });
  }
  if (rung.level <= 4) {
    // a stage reached, nothing held yet: say what was read, not "0 of 3"
    return rung.stuck > 0 ? t("ap.prog.stuck", { n: Math.min(rung.stuck, 3) }) : t("ap.prog.forming", { n: rung.letters });
  }
  if (rung.level === 5) return t("ap.prog.addUp");
  return t(rung.changing === 1 ? "ap.prog.changing" : "ap.prog.changingMany", { n: rung.changing });
}

export function buildAuraCard(f: AuraFacts | null, fmt: MeFormat): AuraCardVM | null {
  if (!f) return null;
  const { t } = fmt;
  const rung = f.rung;
  const named = rung.level >= 5;
  const from =
    rung.level === 0 ? t("ap.from.first") : named ? t("ap.from.named", { n: rung.letters }) : rung.letters === 1 ? t("ap.from.one") : t("ap.from.n", { n: rung.letters });
  const cta = rung.level === 0 ? t("ap.cta.empty") : rung.level <= 2 ? t("ap.cta.another") : rung.level <= 4 ? t("ap.cta.labels") : t("ap.cta.full");
  const noun = f.title?.noun ?? null;
  return {
    label: t("ac.yourAuraTitle"),
    title: named && f.titleName ? f.titleName : t("ap.what"),
    from,
    chips: f.chips.slice(0, 3),
    meter: auraMeter(rung),
    caption: auraCaption(rung, fmt),
    cta,
    ctaTo: rung.level <= 2 ? "compose" : "aura",
    share: named,
    shareLabel: t("ac.shareSm"),
    art: { sceneId: noun ? sceneId(f.title?.adjective ?? null, noun) : null, fidelity: rung.fidelity },
  };
}

/* ── the art slot's strokes (AuraScene's rungs before colour) ──────────── */

/** The theme tokens the slot is drawn from. */
export type SlotTokens = { soft2: string; ink: string; sub: string; ind: string; sf: string };

/** AuraScene's ScenePalette, in part: what is left out keeps the paper's own strokes (W33). */
export type SlotPalette = { ground: string; lines?: string; pencil?: string; ink?: string; fill?: string };

/** "#RRGGBB" at an opacity, as rgba(); anything else comes back as it was. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** What the slot's rungs before colour are drawn with: always on the slot's soft2; on a light
    theme in the paper's own strokes (unchanged), on a dark one in the theme's light ones — the
    lines in ink (at their 30% to 15%), the pencil in sub at .62, the sketch in ind on sf. The
    paper's near-black lines vanished on Midnight's soft2 (about 1.05:1) and its sketch drew
    white blobs (critic). */
export function auraSlotPalette(tk: SlotTokens, dark: boolean): SlotPalette {
  if (!dark) return { ground: tk.soft2 };
  return { ground: tk.soft2, lines: tk.ink, pencil: withAlpha(tk.sub, 0.62), ink: tk.ind, fill: tk.sf };
}

/* ── the Stamps card (owner's placeholder, H:81) ───────────────────────── */

export type StampFacts = {
  id: string;
  /** the last time you posted a letter under it (ISO); null when the kept read predates dates */
  at: string | null;
  /** its name in the reader's language ("" when stamps.ts doesn't list it) */
  name: string;
  /** its colour from stamps.ts, for the tile a stamp without art falls back to; "" for none */
  hex: string;
};

export type StampCellVM = { id: string; date: string; a11y: string; hex: string };

export type StampsVM = {
  /** YOUR STAMPS */
  label: string;
  /** 7 USED */
  count: string;
  cells: StampCellVM[];
  empty: boolean;
  emptyText: string;
  emptyCta: string;
};

export function buildStamps(used: readonly StampFacts[], fmt: MeFormat): StampsVM {
  const { t, upper } = fmt;
  const seen = new Set<string>();
  const cells: StampCellVM[] = [];
  for (const s of used) {
    // official stamps only: a photo stamp ("c:<uuid>") lives in MADE BY YOU, never here (custom stamps)
    if (!s.id || s.id.startsWith("c:") || seen.has(s.id)) continue;
    seen.add(s.id);
    const date = s.at ? upper(fmt.dateShort(s.at)) : "";
    cells.push({ id: s.id, date, a11y: [s.name.trim(), date].filter(Boolean).join(", "), hex: s.hex });
  }
  return {
    label: t("me.stamps.title"),
    count: t("me.stamps.count", { n: cells.length }),
    cells,
    empty: cells.length === 0,
    emptyText: t("me.stamps.empty"),
    emptyCta: t("ml.write"),
  };
}

/* ── the keepsakes block (H:75) ────────────────────────────────────────── */

export type KeepsakeFacts = {
  id: string;
  /** its name in the reader's language (ks.name.<id>) */
  name: string;
  /** the reader hasn't opened it yet (NEW) */
  fresh: boolean;
  /** the catalog still knows how to draw it */
  known: boolean;
};

export type KeepsakeTileVM = {
  id: string;
  name: string;
  fresh: boolean;
  /** what VoiceOver reads for the tile: its name, and "new" while unopened (the dot is visual) */
  a11y: string;
};

export type KeepsakesVM = {
  /** KEEPSAKES */
  header: string;
  /** 3 SO FAR */
  count: string;
  note: string;
  /** always two: the latest keepsakes, null for an empty (dashed) tile */
  tiles: (KeepsakeTileVM | null)[];
  /** VoiceOver's reading of the block's header */
  a11y: string;
};

export const KEEPSAKE_TILES = 2;

/** A keepsake tile's VoiceOver label, the same words on Me (both renderers) and the shelf
    (/keepsakes): the name, and "{name}, new" while it hasn't been opened. */
export function keepsakeA11y(name: string, fresh: boolean, fmt: Pick<MeFormat, "t">): string {
  return fresh ? fmt.t("me.keepsakes.newA11y", { name }) : name;
}

/** `shelf` newest first, as loadShelf / mint hand it back. */
export function buildKeepsakes(shelf: readonly KeepsakeFacts[], wren: string, fmt: MeFormat): KeepsakesVM {
  const { t, upper } = fmt;
  const known = shelf.filter((k) => k.known);
  const count = t("me.keepsakes.count", { n: known.length });
  const tiles: (KeepsakeTileVM | null)[] = [];
  for (let i = 0; i < KEEPSAKE_TILES; i++) {
    const k = known[i];
    tiles.push(k ? { id: k.id, name: k.name, fresh: k.fresh, a11y: keepsakeA11y(k.name, k.fresh, fmt) } : null);
  }
  return {
    header: upper(t("ka.title")),
    count,
    note: t("me.keepsakes.note", { wren }),
    tiles,
    a11y: `${t("ka.title")}, ${count}`,
  };
}

/* ── the First Class card (H:84 in the owner's cream and copy) ─────────── */

export type FirstClassFacts = { premium: boolean; cofounderNo: number | null | undefined; wren: string };

export type FirstClassVM = {
  /** FIRST CLASS */
  eyebrow: string;
  headline: string;
  /** may hold a line break */
  sub: string;
  cta: string;
  /** 1ST, or MEMBER */
  stampLabel: string;
  /** the courier's snapshot on the stamp (lib/bird-images): curious, or delighted for a member */
  pose: "fcFree" | "fcMember";
};

export function buildFirstClass(f: FirstClassFacts, fmt: MeFormat): FirstClassVM {
  const { t } = fmt;
  if (f.premium) {
    return {
      eyebrow: t("me.firstClass"),
      headline: f.cofounderNo != null ? t("me.fc.founding", { n: String(f.cofounderNo) }) : t("fc.paidHead"),
      sub: t("fc.paidSub"),
      cta: `${t("fc.paidCta")} →`,
      stampLabel: t("fc.member"),
      pose: "fcMember",
    };
  }
  return {
    eyebrow: t("me.firstClass"),
    headline: t("fc.stubHead"),
    // the owner's two lines: never "More Kindreds" or "a monthly reading" (Apple 2.3.2)
    sub: `${t("fc.stubSub1")}\n${t("fc.stubSub2", { wren: f.wren })}`,
    cta: `${t("fc.stubCta")} →`,
    stampLabel: t("fc.firstMark"),
    pose: "fcFree",
  };
}

/* ── the courier card's VoiceOver reading ──────────────────────────────── */

export type CourierFacts = {
  wren: string;
  /** her day off: the card opens the game (lib/free-flight) */
  dayOff: boolean;
  /** on her day off, she is carrying one (the game's other line) */
  carrying: boolean;
  /** your best run, for the rematch line */
  best: number;
  /** the diary's time as VoiceOver should say it, "3 hours ago" (spokenAgo), not the card's
      mono "3H AGO", which it reads as "three H ago"; "" for none */
  agoA11y: string;
  /** what she says: the hunger line, or the flight log's entry */
  line: string;
  /** the aside under it; "" for none */
  sub: string;
};

/** The diary's time spelled out for VoiceOver, on flight-log agoLabel's steps (under 2 minutes
    is just now, minutes under the hour, hours under the day, then whole days), so the sentence
    and the card's mono label never disagree about how long ago. `at` null is just now, as there. */
export function spokenAgo(at: number | null, now: number, fmt: Pick<MeFormat, "t">): string {
  const { t } = fmt;
  if (at == null) return t("me.a11y.agoNow");
  const m = Math.max(0, Math.round((now - at) / 60000));
  if (m < 2) return t("me.a11y.agoNow");
  if (m < 60) return t("me.a11y.agoM", { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? t("me.a11y.agoHOne") : t("me.a11y.agoH", { n: h });
  const d = Math.floor(h / 24);
  return d === 1 ? t("me.a11y.agoDOne") : t("me.a11y.agoD", { n: d });
}

/** One sentence for the whole card (the React Native scene is hidden from VoiceOver),
    read from the same lines the card shows, ending in what the tap does. */
export function courierA11y(f: CourierFacts, fmt: MeFormat): string {
  const { t } = fmt;
  const parts = f.dayOff
    ? [`${f.wren}, ${t("ff.dayoff.tag")}`, f.carrying ? t("ff.dayoff.lineCarrying") : t("ff.dayoff.line"), f.best > 0 ? t("ff.dayoff.subBest", { n: f.best }) : t("ff.dayoff.sub"), t("ff.play")]
    : [f.agoA11y ? `${f.wren}, ${f.agoA11y}` : f.wren, f.line, f.sub, t("me.open")];
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.replace(/[.。]+$/, ""))
    .join(". ");
}

/** Where a tap on the courier card goes: the game on her day off, else her room. */
export const courierHref = (dayOff: boolean): string => (dayOff ? "/courier?play=1" : "/courier");

/* ── the whole tab ─────────────────────────────────────────────────────── */

export type MeFacts = {
  profile: ProfileFacts;
  /** null until the first aura read (cache or fresh): the card's skeleton */
  aura: AuraFacts | null;
  stamps: readonly StampFacts[];
  keepsakes: readonly KeepsakeFacts[];
  firstClass: FirstClassFacts;
  courier: CourierFacts;
};

export type MeView = {
  /** ME */
  title: string;
  /** the pen name the bar crossfades to */
  penName: string;
  settingsLabel: string;
  segments: string[];
  profile: ProfileVM;
  aura: AuraCardVM | null;
  stamps: StampsVM;
  keepsakes: KeepsakesVM;
  firstClass: FirstClassVM;
  courierA11y: string;
};

export function buildMeView(f: MeFacts, fmt: MeFormat): MeView {
  const profile = buildProfile(f.profile, fmt);
  return {
    title: fmt.t("me.header"),
    penName: profile.name,
    settingsLabel: fmt.t("me.settingsA11y"),
    segments: segmentLabels(fmt),
    profile,
    aura: buildAuraCard(f.aura, fmt),
    stamps: buildStamps(f.stamps, fmt),
    keepsakes: buildKeepsakes(f.keepsakes, f.courier.wren, fmt),
    firstClass: buildFirstClass(f.firstClass, fmt),
    courierA11y: courierA11y(f.courier, fmt),
  };
}

/* ── where each tap goes (the same for both renderers) ─────────────────── */

export const ME_ROUTES = {
  settings: "/me/settings",
  editProfile: "/me/edit-profile",
  letters: "/my-letters",
  kindreds: "/my-kindreds",
  keepsakes: "/keepsakes",
  keepsake: (id: string) => `/keepsake/${encodeURIComponent(id)}`,
  aura: "/aura",
  auraCard: "/aura-card",
  compose: "/compose",
  paywall: "/paywall?src=me_row",
} as const;

export const statHref = (key: StatKey): string => (key === "letters" ? ME_ROUTES.letters : ME_ROUTES.kindreds);
export const auraCtaHref = (to: AuraCardVM["ctaTo"]): string => (to === "compose" ? ME_ROUTES.compose : ME_ROUTES.aura);

/* ══ ME 4a (2026-10-19, .claude/me4a/ME4A.md) ═════════════════════════════
   The Swift Me draws 4a: a sticky header (avatar, name, "joined …", the gear,
   the two peek buttons and their trays, the four chips) over one segment —
   the courier with WREN'S LOOKS, the Aura card with the report door, the
   stamps, the First Class card. These builders make its records. MeRN (the
   React Native fallback) still draws buildMeView's records above, unchanged.
   Like everything here: pure, words through fmt, node-tested. */

/** a peek or the looks: whether its data has been read yet, and whether it found anything */
export type PeekState = "loading" | "empty" | "ready";

/** The few facts of a letter card the letters peek reads (screens/letters LetterCardFacts). */
export type PeekLetterSource = Pick<LetterCardFacts, "kind" | "id" | "date" | "stamp" | "body" | "status">;

export type PeekLetterVM = {
  id: string;
  /** 2026.09.23 */
  date: string;
  stampId: string;
  stampHex: string;
  body: string;
  tone: "quiet" | "answered" | "replied";
  /** QUIET · ANSWERED · 2 · LUNA REPLIED (mono, upper-cased) */
  status: string;
  /** VoiceOver: the day, the letter, its status */
  a11y: string;
};

export type PeekLettersVM = { state: PeekState; items: PeekLetterVM[]; seeAll: string; emptyText: string; emptyCta: string };

/** How many letters the peek shows. */
export const PEEK_CARDS = 3;

/** "2026.09.23" from an ISO date (screens/letters letterDate's rule); "" for none. */
const dotted = (iso: string): string => (iso ? iso.slice(0, 10).replace(/-/g, ".") : "");

/** A letter's status as the peek's mono line says it. */
export function peekStatus(s: LetterStatus, fmt: MeFormat): { tone: PeekLetterVM["tone"]; text: string } {
  const { t, upper } = fmt;
  if (s.kind === "quiet") return { tone: "quiet", text: upper(t("ml.quiet")) };
  if (s.kind === "answered") return { tone: "answered", text: `${upper(t("ml.answered"))} · ${s.n}` };
  return { tone: "replied", text: upper(s.more > 0 ? t("ml.repliedMore", { who: s.who, n: s.more }) : t("ml.replied", { who: s.who })) };
}

/**
 * The letters peek: the newest three letters (never drafts), "See all n →" with the same count
 * as the stat. `cards` null = not read yet (three blank cards). `stampHex` gives a stamp's colour
 * (stamps.ts), for an id the Swift table doesn't know.
 */
export function buildPeekLetters(cards: readonly PeekLetterSource[] | null, count: number | null, stampHex: (id: string) => string, fmt: MeFormat): PeekLettersVM {
  const { t } = fmt;
  const base = { seeAll: t("m4.peek.seeAll", { n: count ?? 0 }), emptyText: t("m4.peek.noLetters"), emptyCta: `${t("ml.write")} →` };
  if (cards == null) return { state: "loading", items: [], ...base };
  const letters = cards.filter((c) => c.kind === "letter");
  if (letters.length === 0) return { state: "empty", items: [], ...base };
  const items = letters.slice(0, PEEK_CARDS).map((c): PeekLetterVM => {
    const st = peekStatus(c.status, fmt);
    const body = c.body.replace(/\s+/g, " ").trim();
    const day = c.date ? fmt.dateShort(c.date) : "";
    return {
      id: c.id,
      date: dotted(c.date),
      stampId: c.stamp ?? "",
      stampHex: c.stamp ? stampHex(c.stamp) : "",
      body,
      tone: st.tone,
      status: st.text,
      a11y: [day, body, st.text.toLocaleLowerCase()].filter(Boolean).join(". "),
    };
  });
  // the count says how many there are; never fewer than the cards on show
  return { state: "ready", items, ...base, seeAll: t("m4.peek.seeAll", { n: Math.max(count ?? 0, letters.length) }) };
}

/** What a kindreds card is drawn from: a thread with names traded. */
export type PeekThreadSource = {
  id: string;
  revealed: boolean;
  gone?: boolean;
  other: string | null;
  otherFace?: string | null;
  otherName: string | null;
  theirTexts?: string[];
  preview: string;
  lastAt: number;
};

export type PeekKindredVM = { id: string; name: string; line: string; face: FaceInput; a11y: string };
export type PeekKindredsVM = { state: PeekState; items: PeekKindredVM[]; open: string; emptyText: string };

/**
 * The kindreds peek: up to three kindreds (names traded, account still open), the latest first,
 * each with their face, their name (`nameOf`: the pen name, else the who-book's) and their last
 * line (the newest of what they wrote, else the thread's preview). `threads` null = not read yet.
 */
export function buildPeekKindreds(threads: readonly PeekThreadSource[] | null, nameOf: (th: PeekThreadSource) => string, fmt: MeFormat): PeekKindredsVM {
  const { t } = fmt;
  const base = { open: t("m4.peek.openKindreds"), emptyText: t("m4.peek.noKindreds") };
  if (threads == null) return { state: "loading", items: [], ...base };
  const kin = threads.filter((th) => th.revealed && !th.gone).sort((a, b) => b.lastAt - a.lastAt);
  if (kin.length === 0) return { state: "empty", items: [], ...base };
  const items = kin.slice(0, PEEK_CARDS).map((th): PeekKindredVM => {
    const theirs = (th.theirTexts ?? []).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
    const line = theirs.length ? theirs[theirs.length - 1] : th.preview.replace(/\s+/g, " ").trim();
    const name = (th.otherName ?? "").trim() || nameOf(th);
    return {
      id: th.id,
      name,
      line,
      face: { role: "kindred", seed: th.other, avatarId: th.otherFace ?? null, gone: !!th.gone },
      a11y: [name, line].filter(Boolean).join(", "),
    };
  });
  return { state: "ready", items, ...base };
}

/* ── WREN'S LOOKS (owner 2026-10-19: the accessories exactly as live) ──── */

/** The three free looks, in the tray's order, then the First Class tile. */
export const LOOK_TILES = ["none", "beanie", "scarf", "fc"] as const;
export type LookTileId = (typeof LOOK_TILES)[number];
/** The snapshot pose each tile shows (lib/bird-images). */
export type LookPose = "lookNone" | "lookBeanie" | "lookScarf" | "lookWorn";

export type LookTileVM = {
  id: LookTileId;
  label: string;
  name: string;
  pose: LookPose;
  selected: boolean;
  locked: boolean;
  dim: boolean;
  hint: string;
};

export type LooksVM = {
  /** WREN'S LOOKS */
  header: string;
  /** All looks → */
  all: string;
  allHint: string;
  tiles: LookTileVM[];
  /** a First Class reader: the FC tile and "All looks →" open the wardrobe; otherwise the First Class segment */
  member: boolean;
};

export type LooksFacts = {
  /** what she wears now (useWrenSkinControl().accessory) */
  accessory: string;
  premium: boolean;
  wren: string;
};

const FREE_LOOKS = ["none", "beanie", "scarf"] as const;

export function buildLooks(f: LooksFacts, fmt: MeFormat): LooksVM {
  const { t, upper } = fmt;
  const wearsPaid = !(FREE_LOOKS as readonly string[]).includes(f.accessory);
  const free = FREE_LOOKS.map(
    (id): LookTileVM => ({
      id,
      label: upper(t(`ws.acc.${id}`)),
      name: t(`ws.acc.${id}`),
      pose: id === "none" ? "lookNone" : id === "beanie" ? "lookBeanie" : "lookScarf",
      selected: f.accessory === id,
      locked: false,
      dim: false,
      hint: "",
    }),
  );
  const fc: LookTileVM = {
    id: "fc",
    label: upper(t("m4.looks.fc")),
    name: t("m4.looks.fcName"),
    // a member wearing a First Class piece sees her in it; otherwise the plain bird
    pose: f.premium && wearsPaid ? "lookWorn" : "lookNone",
    selected: f.premium && wearsPaid,
    locked: !f.premium,
    dim: !f.premium,
    hint: f.premium ? t("m4.a11y.opensWardrobe", { wren: f.wren }) : t("m4.a11y.opensFc"),
  };
  return {
    header: upper(t("m4.looks.title", { wren: f.wren })),
    all: t("m4.looks.all"),
    allHint: f.premium ? t("m4.a11y.opensWardrobe", { wren: f.wren }) : t("m4.a11y.opensFc"),
    tiles: [...free, fc],
    member: f.premium,
  };
}

/* ── the First Class card (4a, Prompt 6) ───────────────────────────────── */

export type FirstClass4aFacts = FirstClassFacts & {
  /** "7 DAYS FREE" when the store has a free trial this reader may take (lib/fares); "" otherwise */
  trial: string;
};

export type FirstClass4aVM = {
  eyebrow: string;
  headline: string;
  rows: string[];
  cta: string;
  trial: string;
  stampLabel: string;
  pose: "fcFree" | "fcMember";
  member: boolean;
};

export function buildFirstClass4a(f: FirstClass4aFacts, fmt: MeFormat): FirstClass4aVM {
  const { t, upper } = fmt;
  const w = { wren: f.wren };
  // rooms, the wardrobe, voice letters — what this build really has (no "all stamp frames")
  const rows = [t("fc.b1", w), t("fc.b4", w), t("fc.b2", w)];
  if (f.premium) {
    return {
      eyebrow: t("me.firstClass"),
      headline: f.cofounderNo != null ? t("me.fc.founding", { n: String(f.cofounderNo) }) : t("fc.paidHead"),
      rows,
      cta: `${t("fc.paidCta")} →`,
      trial: "",
      stampLabel: t("fc.member"),
      pose: "fcMember",
      member: true,
    };
  }
  return {
    eyebrow: t("me.firstClass"),
    headline: t("fc.stubHead"),
    rows,
    cta: `${t("fc.stubCta")} →`,
    trial: f.trial ? upper(f.trial) : "",
    stampLabel: t("fc.firstMark"),
    pose: "fcFree",
    member: false,
  };
}

/* ── the report door (lib/report-door decides; this only carries it) ───── */

export type ReportRowVM = { show: boolean; title: string; sub: string; enabled: boolean; locked: boolean; hint: string; href: string | null };
export const NO_REPORT_ROW: ReportRowVM = { show: false, title: "", sub: "", enabled: false, locked: false, hint: "", href: null };

/* ── the header ────────────────────────────────────────────────────────── */

export type Stat4aVM = { key: StatKey; count: string; unit: string; a11y: string; hint: string };
export type Profile4aVM = { name: string; joined: string; editLabel: string; stats: Stat4aVM[] };

/** 4a's header: "joined Jul 27" in sentence case (the cofounder number after it), the two buttons
    with VoiceOver's hints. The figures are buildProfile's, so both renderers count the same. */
export function buildProfile4a(f: ProfileFacts, fmt: MeFormat): Profile4aVM {
  const { t } = fmt;
  const p = buildProfile(f, fmt);
  const joined = f.createdAt ? t("m4.joined", { date: fmt.dateShort(f.createdAt) }) : "";
  return {
    name: p.name,
    joined: [joined, p.cofounder].filter(Boolean).join(" · "),
    editLabel: p.editLabel,
    // 4a's units are sentence case after the figure ("10 letters"), not the mono label's capitals
    stats: p.stats.map((s) => {
      const one = (s.key === "letters" ? f.letters : f.kindreds) === 1;
      const unit = s.key === "letters" ? t(one ? "m4.unit.letterOne" : "m4.unit.letters") : t(one ? "m4.unit.kindredOne" : "m4.unit.kindreds");
      return { key: s.key, count: s.count, unit, a11y: s.a11y, hint: t(s.key === "letters" ? "m4.a11y.lettersHint" : "m4.a11y.kindredsHint") };
    }),
  };
}

export type Me4aA11y = { expanded: string; collapsed: string; seeAllAction: string; openKindredsAction: string; locked: string };

export type Me4aFacts = {
  profile: ProfileFacts;
  /** letter cards (screens/letters buildLetterCards), null until read */
  letters: readonly PeekLetterSource[] | null;
  stampHex: (id: string) => string;
  /** the threads, null until read */
  threads: readonly PeekThreadSource[] | null;
  nameOf: (th: PeekThreadSource) => string;
  looks: LooksFacts;
  firstClass: FirstClass4aFacts;
  report: ReportRowVM;
};

export type Me4aView = {
  profile: Profile4aVM;
  peekLetters: PeekLettersVM;
  peekKindreds: PeekKindredsVM;
  looks: LooksVM;
  firstClass: FirstClass4aVM;
  report: ReportRowVM;
  a11y: Me4aA11y;
};

export function buildMe4a(f: Me4aFacts, fmt: MeFormat): Me4aView {
  const { t } = fmt;
  return {
    profile: buildProfile4a(f.profile, fmt),
    peekLetters: buildPeekLetters(f.letters, f.profile.letters, f.stampHex, fmt),
    peekKindreds: buildPeekKindreds(f.threads, f.nameOf, fmt),
    looks: buildLooks(f.looks, fmt),
    firstClass: buildFirstClass4a(f.firstClass, fmt),
    report: f.report,
    a11y: {
      expanded: t("m4.a11y.expanded"),
      collapsed: t("m4.a11y.collapsed"),
      seeAllAction: t("m4.a11y.seeAllAction"),
      openKindredsAction: t("m4.a11y.openKindredsAction"),
      locked: t("m4.a11y.locked"),
    },
  };
}

/* the 4a taps' destinations */
export const ME4A_ROUTES = {
  courier: "/courier",
  room: (id: string) => `/room/${encodeURIComponent(id)}`,
} as const;
