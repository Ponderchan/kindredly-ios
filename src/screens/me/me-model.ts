import type { Rung } from "../../lib/aura-ladder";

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
     the game rather than her room. */

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
    if (!s.id || seen.has(s.id)) continue;
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

export type KeepsakeTileVM = { id: string; name: string; fresh: boolean };

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

/** `shelf` newest first, as loadShelf / mint hand it back. */
export function buildKeepsakes(shelf: readonly KeepsakeFacts[], wren: string, fmt: MeFormat): KeepsakesVM {
  const { t, upper } = fmt;
  const known = shelf.filter((k) => k.known);
  const count = t("me.keepsakes.count", { n: known.length });
  const tiles: (KeepsakeTileVM | null)[] = [];
  for (let i = 0; i < KEEPSAKE_TILES; i++) {
    const k = known[i];
    tiles.push(k ? { id: k.id, name: k.name, fresh: k.fresh } : null);
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
  /** "3H AGO", the diary's time (flight-log agoLabel) */
  ago: string;
  /** what she says: the hunger line, or the flight log's entry */
  line: string;
  /** the aside under it; "" for none */
  sub: string;
};

/** One sentence for the whole card (the React Native scene is hidden from VoiceOver),
    read from the same lines the card shows, ending in what the tap does. */
export function courierA11y(f: CourierFacts, fmt: MeFormat): string {
  const { t } = fmt;
  const parts = f.dayOff
    ? [`${f.wren}, ${t("ff.dayoff.tag")}`, f.carrying ? t("ff.dayoff.lineCarrying") : t("ff.dayoff.line"), f.best > 0 ? t("ff.dayoff.subBest", { n: f.best }) : t("ff.dayoff.sub"), t("ff.play")]
    : [f.ago ? `${f.wren}, ${f.ago}` : f.wren, f.line, f.sub, t("me.open")];
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
