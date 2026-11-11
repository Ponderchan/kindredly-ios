/* THE COURIER'S PLANET, AS DATA (docs/courier-planet.md; owner sign-off 2026-11-11).
   Pure: no React, no React Native, no i18n — every word comes in through `fmt`, so
   `node src/screens/me/planet-model.test.ts` locks the rules. The Swift Me tab draws what
   buildMePlanet returns (MeNative → KMeView's `planet`, Portable/Me/KMePlanetCard.swift).

   WHAT IT DECIDES
   - what she is doing on the planet, from where she is (lib/whereabouts) and her day off
     (lib/free-flight): at home (asleep; awake with an empty bag) · on the way, flying her loop
     with your letter · waiting at their door · back with a reply · day off.
   - the letters behind the stamps: every letter of yours she has carried, newest first, each
     with the place it keeps for good (its ordinal: 1 is the first letter you ever sent, so a
     new letter never moves an old stamp), its stamp, how many strangers have had it on their
     desk (letters.reads: a lamp each) and whether anyone wrote back (a postmark).
   - THE SHELF: six looks, the defaults (Sky, Bare) not counted, left to right by "can I use
     it now": two free pieces · the colour a first kindred unlocks · two First Class colours ·
     one First Class piece. Which ones stand there is not fixed: the wardrobe's catalogue put
     in order by what she wears, the season on now, what the server puts forward, what this
     phone has reached for, and the week's turn (see THE SHELF below). Tapping the one she
     wears takes it off.
   - what a tap on a look does: wear it, take it off, open First Class (a paid look, not a
     member), or open her wardrobe (Moss before the first kindred: the wardrobe says why).
   - THE PLANET PAGE (app/planet; buildPlanetPage): the three figures — ON THE WAY (what she is
     out with now: your unanswered letters while she flies with them, the doors she waits at
     while she waits, else none), CARRIED (every letter of yours) and ON DESKS (the strangers
     who have had one on their desk, summed) — a dash until read, never a made-up 0; and one
     slip per letter, worded as her page's slip and My letters word them: when it left, how
     many desks, where it stands. The run she is on now takes its letter's slip (her page's
     three rows, and Go to the Door once she is back); a run that answers someone else's
     letter has no stamp, so it gets a slip of its own, first. The page opens on that run's
     slip, else on the newest letter. */

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/* the catalogue's ids, as components/WrenBird and lib/wren-style have them */
export type PlanetSkin = "sticker" | "plush" | "ink" | "moss" | "peach";
export type PlanetDress = "none" | "beanie" | "scarf" | "phones" | "flower" | "party" | "shades" | "witch" | "ghost";
export type PlanetStage = "egg" | "hatch" | "fledge" | "wren";

/* ── what she is doing ─────────────────────────────────────────────────── */

export type PlanetWrenState = "home" | "out" | "waiting" | "back" | "dayOff";
export type PlanetWhere = "home" | "delivery" | "bringing" | "exploring" | "unsent";

/** Where she is (lib/whereabouts) and her day off (lib/free-flight isDayOff), as the planet
    shows it. "exploring" is a letter out that nobody has answered: she flies her loop with it. */
export function planetWrenState(where: PlanetWhere, dayOff: boolean): PlanetWrenState {
  if (dayOff) return "dayOff";
  if (where === "exploring") return "out";
  if (where === "delivery") return "waiting";
  if (where === "bringing") return "back";
  return "home";
}

/** At home with letters behind her she naps; with an empty bag (nothing ever sent) she waits awake. */
export const planetNapping = (where: PlanetWhere): boolean => where !== "unsent";

/* ── the letters behind the stamps ─────────────────────────────────────── */

/** A letter as the letters model has it (screens/letters buildLetterCards). */
export type PlanetLetterSource = {
  kind: "letter" | "draft";
  id: string;
  /** ISO; "" for none */
  date: string;
  stamp: string | null;
  reads: number;
  answers: readonly unknown[];
};

export type PlanetLetterVM = {
  id: string;
  /** 1 = the first letter you ever sent: it decides where the stamp sits, for good */
  ordinal: number;
  /** the letter's stamp id; "" for none */
  stamp: string;
  /** its colour for a stamp the binary's table doesn't know; "" for none */
  hex: string;
  /** strangers who have had it on their desk: a lamp each */
  reads: number;
  /** someone wrote back: the postmark */
  answered: boolean;
  /** "NOV 3", as the slip writes it; "" for none */
  day: string;
};

/** How many letters the record carries: the planet has places for 47, and one to spare. */
export const PLANET_LETTERS = 48;

/**
 * The letters behind the stamps, newest first.
 * @param cards your letters and drafts (null until read): drafts are left out
 * @param total how many letters you have ever sent, when known. The list holds the newest 200 at
 *   most, so the ordinals are counted down from this, and an old stamp keeps its place when the
 *   list's tail falls off.
 */
export function planetLetters(
  cards: readonly PlanetLetterSource[] | null,
  total: number | null,
  fmt: { day: (iso: string) => string; hexOf: (id: string) => string },
): PlanetLetterVM[] {
  const letters = (cards ?? []).filter((c) => c.kind === "letter").sort((a, b) => b.date.localeCompare(a.date));
  const count = Math.max(letters.length, total ?? 0);
  return letters.slice(0, PLANET_LETTERS).map((l, i) => {
    const stamp = l.stamp ?? "";
    return {
      id: l.id,
      ordinal: count - i,
      stamp,
      hex: stamp ? fmt.hexOf(stamp) : "",
      reads: Math.max(0, Math.round(l.reads || 0)),
      answered: l.answers.length > 0,
      day: l.date ? fmt.day(l.date) : "",
    };
  });
}

/* ── the shelf ───────────────────────────────────────────────────────────
   Six looks under her flight log: three anyone can have on the left (two free pieces and the
   colour a first kindred opens), three First Class ones on the right (two colours and a piece).

   WHICH six is not written here (owner, 2026-11-11: "这些放出来的不是固定的，可以是基于节日或者
   用户点击的热度，这个别写死"). The candidates are the wardrobe's own catalogue (lib/wren-style,
   passed in as `catalogue`), and inside each group they are put in order by, first to last:
     1. what she has on: it keeps its place;
     2. the season on now (lib/season: a festival's looks by date, with its remote switch);
     3. what the server puts forward (`featured`: app_surfaces rows "shelf.<look>" set true —
        a festival, a drop, what is popular; a row, not a build);
     4. what this phone has reached for most (`heat`, lib/look-heat: taps on the shelf and looks
        put on, kept on the phone);
     5. the week's turn, so a shelf nobody has touched still changes.
   A new look is a line in the wardrobe's catalogue (and its drawing in Swift's KWrenBird); it
   is then a candidate here with nothing to add. */

/** What the wardrobe holds, as the shelf needs it. */
export type ShelfCatalogue = {
  /** every piece she can have on (not "none"): free or First Class, a season's or every day's */
  dress: readonly { id: PlanetDress; free: boolean; seasonal?: boolean }[];
  /** every colour: sticker is the default (never on the shelf), a milestone is the first kindred */
  skins: readonly { id: PlanetSkin; lock: "free" | "milestone" | "plus" }[];
};

/** The catalogue when none is passed (tests, the dev page): lib/wren-style's, as of 2026-11. */
export const SHELF_CATALOGUE: ShelfCatalogue = {
  dress: [
    { id: "beanie", free: true },
    { id: "scarf", free: true },
    { id: "phones", free: false },
    { id: "flower", free: false },
    { id: "party", free: false },
    { id: "shades", free: false },
    { id: "witch", free: true, seasonal: true },
    { id: "ghost", free: true, seasonal: true },
  ],
  skins: [
    { id: "sticker", lock: "free" },
    { id: "moss", lock: "milestone" },
    { id: "peach", lock: "plus" },
    { id: "ink", lock: "plus" },
    { id: "plush", lock: "plus" },
  ],
};
/** the First Class colours and pieces of that catalogue */
export const SHELF_FC_SKINS: readonly PlanetSkin[] = SHELF_CATALOGUE.skins.filter((x) => x.lock === "plus").map((x) => x.id);
export const SHELF_FC_DRESS: readonly PlanetDress[] = SHELF_CATALOGUE.dress.filter((x) => !x.free).map((x) => x.id);

/** How many of each the shelf holds, left to right. */
export const SHELF_PLACES = { freeDress: 2, kindredSkin: 1, paidSkin: 2, paidDress: 1 } as const;

/** The app_surfaces keys that put a look forward: "shelf.phones", "shelf.peach". */
export const SHELF_FEATURE_PREFIX = "shelf.";
/** The looks the table puts forward (bare ids, sorted); none for no table yet. */
export function shelfFeatured(remote: Readonly<Record<string, boolean>> | null): string[] {
  if (!remote) return [];
  return Object.keys(remote)
    .filter((k) => k.startsWith(SHELF_FEATURE_PREFIX) && remote[k] === true)
    .map((k) => k.slice(SHELF_FEATURE_PREFIX.length).trim())
    .filter(Boolean)
    .sort();
}

const WEEK_MS = 7 * 86_400_000;
/** The week a moment falls in, counted from a Monday (UTC): the shelf turns over when it changes. */
export const shelfWeek = (now: number): number => Math.floor((now + 3 * 86_400_000) / WEEK_MS);

export type ShelfFacts = {
  /** what she wears now (useWrenSkinControl) */
  skin: PlanetSkin;
  dress: PlanetDress;
  premium: boolean;
  /** your kindreds; null while unknown (Moss is then drawn as not yet hers, unless she wears it) */
  kindreds: number | null;
  /** the coat she hatched in on the web (lib/wren-style): hers without First Class; null for none */
  hatchSkin: PlanetSkin | null;
  /** the season's looks on offer now (lib/season useSeason().looks); none = the every-day pieces */
  season?: readonly string[];
  /** shelfWeek(now) */
  week: number;
  /** the wardrobe's catalogue (lib/wren-style ACCESSORY_META, SKINS); SHELF_CATALOGUE when absent */
  catalogue?: ShelfCatalogue;
  /** looks the server puts forward now, bare ids (shelfFeatured) */
  featured?: readonly string[];
  /** how often this phone has reached for each look, by bare id (lib/look-heat) */
  heat?: Readonly<Record<string, number>>;
};

export type ShelfSlot = {
  /** what a tap reports: "dress:beanie", "skin:moss" */
  id: string;
  kind: "dress" | "skin";
  value: PlanetDress | PlanetSkin;
  /** her in it: this slot's piece on the colour she wears, or this slot's colour with what she wears */
  look: { skin: PlanetSkin; dress: PlanetDress };
  worn: boolean;
  /** hers to wear now */
  open: boolean;
  /** First Class, and not hers: the gold dashes and the lock */
  firstClass: boolean;
  /** Moss before the first kindred: drawn dim */
  dim: boolean;
};

/** a look's count in the heat record; only a real, own, positive number counts */
const warmth = (heat: Readonly<Record<string, number>>, id: string): number => {
  const v: unknown = Object.prototype.hasOwnProperty.call(heat, id) ? heat[id] : 0;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
};

/** A group's candidates in the shelf's order (see the top): worn, in season, put forward, reached
    for, then the week's turn. */
function inOrder<T extends string>(pool: readonly T[], worn: string, season: readonly string[], f: ShelfFacts): T[] {
  const n = pool.length;
  const featured = f.featured ?? [];
  const heat = f.heat ?? {};
  const turn = (i: number) => (((i - f.week) % n) + n) % n;
  return pool
    .map((v, i) => ({ v, i }))
    .sort(
      (a, b) =>
        Number(b.v === worn) - Number(a.v === worn) ||
        Number(season.includes(b.v)) - Number(season.includes(a.v)) ||
        Number(featured.includes(b.v)) - Number(featured.includes(a.v)) ||
        warmth(heat, b.v) - warmth(heat, a.v) ||
        turn(a.i) - turn(b.i),
    )
    .map((x) => x.v);
}

/** The shelf's six, left to right (see the top). */
export function shelfSlots(f: ShelfFacts): ShelfSlot[] {
  const cat = f.catalogue ?? SHELF_CATALOGUE;
  const season = (f.season ?? []).filter((id) => cat.dress.some((d) => d.id === id && d.seasonal));
  // the every-day pieces, a season's while it lasts, and a seasonal one she still has on
  const freeDress = cat.dress.filter((d) => d.free && (!d.seasonal || season.includes(d.id) || d.id === f.dress)).map((d) => d.id);
  const paidDress = cat.dress.filter((d) => !d.free).map((d) => d.id);
  const kindredSkins = cat.skins.filter((x) => x.lock === "milestone").map((x) => x.id);
  const paidSkins = cat.skins.filter((x) => x.lock === "plus").map((x) => x.id);

  const dress = (value: PlanetDress, paid: boolean): ShelfSlot => {
    const worn = f.dress === value;
    const open = !paid || f.premium;
    return { id: `dress:${value}`, kind: "dress", value, look: { skin: f.skin, dress: value }, worn, open, firstClass: paid && !f.premium, dim: false };
  };
  const skin = (value: PlanetSkin, lock: "kindred" | "plus"): ShelfSlot => {
    const worn = f.skin === value;
    const hatched = f.hatchSkin === value;
    const open = hatched || worn || (lock === "plus" ? f.premium : (f.kindreds ?? 0) >= 1);
    return { id: `skin:${value}`, kind: "skin", value, look: { skin: value, dress: f.dress }, worn, open, firstClass: lock === "plus" && !open, dim: lock === "kindred" && !open };
  };
  return [
    ...inOrder(freeDress, f.dress, season, f).slice(0, SHELF_PLACES.freeDress).map((v) => dress(v, false)),
    ...inOrder(kindredSkins, f.skin, season, f).slice(0, SHELF_PLACES.kindredSkin).map((v) => skin(v, "kindred")),
    ...inOrder(paidSkins, f.skin, season, f).slice(0, SHELF_PLACES.paidSkin).map((v) => skin(v, "plus")),
    ...inOrder(paidDress, f.dress, season, f).slice(0, SHELF_PLACES.paidDress).map((v) => dress(v, true)),
  ];
}

/** What a tap on a look does. */
export type ShelfTap =
  | { do: "dress"; value: PlanetDress }
  | { do: "skin"; value: PlanetSkin }
  /** a First Class look, and the reader is not a member */
  | { do: "firstClass" }
  /** Moss before the first kindred: her wardrobe says what unlocks it */
  | { do: "wardrobe" };

/** A tap on the look with this id ("dress:beanie", "skin:moss"); null for an id the shelf doesn't hold. */
export function shelfTap(id: string, f: ShelfFacts): ShelfTap | null {
  const slot = shelfSlots(f).find((s) => s.id === id);
  if (!slot) return null;
  if (!slot.open) return slot.firstClass ? { do: "firstClass" } : { do: "wardrobe" };
  if (slot.kind === "dress") return { do: "dress", value: slot.worn ? "none" : (slot.value as PlanetDress) };
  // the colour she wears comes off: back to Sky, the default
  return { do: "skin", value: slot.worn ? "sticker" : (slot.value as PlanetSkin) };
}

export type ShelfLookVM = {
  id: string;
  /** BEANIE, MOSS: under the chip */
  name: string;
  skin: PlanetSkin;
  dress: PlanetDress;
  worn: boolean;
  firstClass: boolean;
  dim: boolean;
  /** VoiceOver: the name as written, and what a tap does */
  a11y: string;
  hint: string;
};

export type ShelfFormat = { t: TFn; upper: (s: string) => string; wren: string };

const lookName = (s: ShelfSlot, t: TFn): string => (s.kind === "dress" ? t(`ws.acc.${s.value}`) : t(`skin.${s.value}.name`));

/** The shelf with its words. */
export function buildShelf(f: ShelfFacts, fmt: ShelfFormat): ShelfLookVM[] {
  const { t, upper } = fmt;
  return shelfSlots(f).map((s) => {
    const name = lookName(s, t);
    const hint = s.worn ? t("planet.a11y.takeOff") : s.firstClass ? t("m4.a11y.opensFc") : s.dim ? t("m4.a11y.opensWardrobe", { wren: fmt.wren }) : t("planet.a11y.wear");
    return {
      id: s.id,
      name: upper(name),
      skin: s.look.skin,
      dress: s.look.dress,
      worn: s.worn,
      firstClass: s.firstClass,
      dim: s.dim,
      a11y: s.open ? name : `${name}, ${t("m4.a11y.locked")}`,
      hint,
    };
  });
}

/* ── her card's words ──────────────────────────────────────────────────── */

/** The words the courier's card already says (components/courier-card-model courierCardModel). */
export type PlanetCourierWords = {
  /** YOUR COURIER */
  chip: string;
  /** DAY OFF */
  dayOffTag: string;
  playing: boolean;
  name: string;
  time: string;
  line: string;
  aside: string;
  /** Open, or Play */
  cta: string;
};

/** The Stamps card's record, the fields the tile reads (screens/me/stamp-collection buildStampsCard). */
export type PlanetStampsSource = {
  count: string;
  cells: readonly { id: string; hex: string }[];
  madeShow: boolean;
  madeQuota: string;
  emptyTitle: string;
  emptyText: string;
  made: readonly { id: string; note: string }[];
};

export type StampsTileVM = {
  label: string;
  title: string;
  caption: string;
  fan: { id: string; hex: string }[];
  make: boolean;
  a11y: string;
  hint: string;
};

/** The app's own stamps the tile shows while the reader has none of theirs (owner, 2026-11-11:
    "stamp 前面放两个或者三个假的我们的邮票"): three official ones, so the tile is never a blank. */
export const SAMPLE_STAMPS: readonly string[] = ["tiny-win", "cant-sleep", "crush"];

/** The Stamps tile: what you made lately first (the ones that passed), then what you used, three
    at most; with none of either, three of the app's own as samples; the blank stamp when the
    press is open to you. */
export function buildStampsTile(s: PlanetStampsSource, fmt: { t: TFn; upper: (s: string) => string }): StampsTileVM {
  const { t, upper } = fmt;
  const made = s.madeShow ? s.made.filter((m) => !m.note).map((m) => ({ id: m.id, hex: "" })) : [];
  const yours = [...made, ...s.cells.map((c) => ({ id: c.id, hex: c.hex }))].slice(0, 3);
  const fan = yours.length ? yours : SAMPLE_STAMPS.map((id) => ({ id, hex: "" }));
  const label = upper(t("me.seg.stamps"));
  const title = s.madeShow ? s.emptyTitle : s.emptyText;
  const caption = s.cells.length > 0 ? s.count : s.madeQuota;
  return { label, title, caption, fan, make: s.madeShow, a11y: [t("me.seg.stamps"), title, caption].filter(Boolean).join(", "), hint: t("planet.a11y.opensAlbum") };
}

/* ── her flight log on the card ────────────────────────────────────────── */

/** What the card's flight log is written from (owner, 2026-11-11: the log instead of her two
    sentences, its rows kept up with the hour). */
export type FlightLogFacts = {
  /** the run she is on, as her page's slip files it (courier-model slipRows, with its times
      written as "2H AGO"); null when she is on none. `back`: she has the reply with her */
  transit: { rows: string[]; back: boolean } | null;
  /** your newest letter nobody has answered: when it left (epoch ms) and the desks it has been
      on; null when there is none, or your letters aren't read yet */
  out: { at: number; reads: number } | null;
  /** her own line still has to be said, because the rows cannot say it: the Post's letter,
      hunger, her day off */
  say: boolean;
};

export type FlightLogVM = {
  /** PIP · FLIGHT LOG */
  title: string;
  /** in the order they happen */
  rows: string[];
  /** how many rows have happened: the last of them is where she is now (the lamp) */
  done: number;
  /** a line of hers; "" for none */
  note: string;
  a11y: string;
};

export type MePlanetFormat = ShelfFormat & {
  /** "2H AGO": how long since a moment (lib/flight-log agoLabel) */
  ago: (at: number) => string;
};

/**
 * Her flight log. A run she is on (at a door, or back with a reply) is her page's own slip; out
 * with a letter nobody has answered, it is that letter's three lines (when it left, the desks it
 * has been on — a count, never a time: nothing records when a stranger read it —, waiting);
 * otherwise nothing is in transit.
 */
export function buildFlightLog(f: FlightLogFacts, where: PlanetWhere, c: PlanetCourierWords, fmt: MePlanetFormat): FlightLogVM {
  const { t, upper } = fmt;
  let rows: string[];
  let done: number;
  if (f.transit && (where === "delivery" || where === "bringing")) {
    rows = f.transit.rows;
    // at their door the last row (waiting) hasn't happened; back with the reply, all of it has
    done = f.transit.back ? rows.length : Math.max(0, rows.length - 1);
  } else if (where === "exploring" && f.out) {
    const reads = Math.max(0, Math.round(f.out.reads || 0));
    const desks = reads === 0 ? t("la.out.reads0") : reads === 1 ? t("la.out.reads1") : t("la.out.readsN", { n: reads });
    rows = [t("wren.slip.left", { day: upper(fmt.ago(f.out.at)) }), upper(noStop(desks)), t("wren.slip.waiting")];
    done = 2;
  } else if (where === "exploring") {
    // out, and the letter itself not read yet: the one thing known
    rows = [t("wren.slip.waiting")];
    done = 1;
  } else {
    rows = [t("wren.slip.nothing"), t("wren.slip.write")];
    done = 0;
  }
  const note = f.say ? c.line : "";
  return { title: `${upper(c.name)} · ${t("wren.log")}`, rows, done, note, a11y: noStops([`${c.name}, ${t("wren.log")}`, note, ...rows]) };
}

/* ── the cover: its two ways in, you under it, her badge, the report's tile ── */

/** One of Me's own numbers, as the page already words it (me-model Stat4aVM). */
export type CoverStat = { count: string; unit: string; a11y: string; hint: string };

/** Where the writing report stands (lib/report-door ReportDoor); null for no door. */
export type CoverDoor =
  | { state: "progress"; have: number; need: number }
  | { state: "ready"; kind: "first" | "monthly" }
  | { state: "locked" }
  | { state: "done" };

export type CoverFacts = {
  /** your letters and your kindreds, as Me's header words them */
  letters: CoverStat;
  kindreds: CoverStat;
  /** your notes; null until they are read */
  notes: number | null;
  /** your mark as the account has it (she | he); null for none */
  mark: "she" | "he" | null;
  /** your sign (lib/zodiac), from your birthday; null for none */
  sign: string | null;
  /** the days she has carried letters; null until the stats are in */
  day: number | null;
  door: CoverDoor | null;
  /** this month, short, in capitals: NOV */
  month: string;
};

/** The twelve signs as their emoji (the owner, 2026-11-11: "星座用 emoji 里的星座"). */
export const SIGN_EMOJI: Readonly<Record<string, string>> = {
  aries: "♈️", taurus: "♉️", gemini: "♊️", cancer: "♋️", leo: "♌️", virgo: "♍️",
  libra: "♎️", scorpio: "♏️", sagittarius: "♐️", capricorn: "♑️", aquarius: "♒️", pisces: "♓️",
};

/** Her journey's stops, in order; the last is grown. */
export const JOURNEY_STOPS: readonly PlanetStage[] = ["egg", "hatch", "fledge", "wren"];
const stageName = (st: PlanetStage, t: TFn): string => t(`wren.name.${st === "wren" ? "grown" : st}`);

export type HerBadgeVM = {
  name: string;
  /** DAY 12; "" until known */
  day: string;
  /** GROWN once she is; "" while she grows */
  tag: string;
  /** PIP'S JOURNEY; "" once she is grown (the journey folds away) */
  journeyTitle: string;
  stops: { id: PlanetStage; name: string; state: "done" | "now" | "later" }[];
  /** the next stop and what it takes; "" for none */
  next: string;
  a11y: string;
};

/** Her badge, and her journey while she is still growing. */
export function buildHerBadge(name: string, chip: string, stage: PlanetStage, day: number | null, fmt: ShelfFormat): HerBadgeVM {
  const { t, upper } = fmt;
  const at = JOURNEY_STOPS.indexOf(stage);
  const grown = stage === "wren";
  const dayChip = day == null ? "" : t("me.dayN", { n: day });
  const stops = JOURNEY_STOPS.map((st, i) => ({ id: st, name: upper(stageName(st, t)), state: (i < at ? "done" : i === at ? "now" : "later") as "done" | "now" | "later" }));
  const nextStage = grown ? null : JOURNEY_STOPS[at + 1];
  const next = nextStage ? `${upper(stageName(nextStage, t))} — ${upper(t(`wren.milestone.${nextStage}`))}` : "";
  return {
    name,
    day: dayChip,
    tag: grown ? upper(stageName("wren", t)) : "",
    journeyTitle: grown ? "" : t("wren.journey", { wren: upper(name) }),
    stops: grown ? [] : stops,
    next,
    a11y: noStops([name, chip, dayChip, stageName(stage, t), next]),
  };
}

export type CoverVM = {
  stampsEntry: { count: string; a11y: string; hint: string };
  lettersEntry: { count: string; a11y: string; hint: string };
  me: { mark: string; sign: string; signName: string; signA11y: string; stats: (CoverStat & { key: string })[]; edit: string };
  reportTile: { state: "none" | "progress" | "ready" | "done" | "locked"; have: number; need: number; tag: string };
  reportChip: string;
};

export type CoverFormat = MePlanetFormat & {
  /** "notes", as the Notes tab is called, for under a number */
  notesUnit: string;
};

/** The cover's two ways in, you under it, and where the report stands. */
export function buildCover(f: CoverFacts, stamps: StampsTileVM, fmt: CoverFormat): CoverVM {
  const { t, upper } = fmt;
  const used = (stamps.caption.match(/\d+/) ?? [""])[0];
  const signName = f.sign ? t(`zd.${f.sign}`) : "";
  const markWord = f.mark === "she" ? t("pr.she") : f.mark === "he" ? t("pr.he") : "";
  const door = f.door;
  return {
    stampsEntry: { count: used, a11y: [t("me.seg.stamps"), used].filter(Boolean).join(", "), hint: stamps.hint },
    lettersEntry: { count: f.letters.count, a11y: f.letters.a11y, hint: f.letters.hint },
    me: {
      mark: f.mark ?? "",
      sign: f.sign ? (SIGN_EMOJI[f.sign] ?? "") : "",
      signName,
      signA11y: [markWord, signName].filter(Boolean).join(", "),
      stats: [
        { key: "kindreds", ...f.kindreds },
        { key: "notes", count: f.notes == null ? FIGURE_UNKNOWN : String(f.notes), unit: fmt.notesUnit, a11y: f.notes == null ? fmt.notesUnit : t("jt.notesN", { n: f.notes }), hint: "" },
      ],
      edit: t("jd.edit"),
    },
    reportTile:
      !door ? { state: "none", have: 0, need: 0, tag: "" }
      : door.state === "progress" ? { state: "progress", have: Math.max(0, door.have), need: Math.max(1, door.need), tag: "" }
      : door.state === "ready" ? { state: "ready", have: 0, need: 0, tag: door.kind === "first" ? "NO. 1" : f.month }
      : { state: door.state, have: 0, need: 0, tag: f.month },
    // WRITING REPORT, beside the Aura tile's WRITING AURA (the owner, 2026-11-11: no YOUR on them)
    reportChip: upper(t("planet.tile.report")),
  };
}

export type MePlanetFacts = {
  courier: PlanetCourierWords;
  where: PlanetWhere;
  dayOff: boolean;
  log: FlightLogFacts;
  cover: CoverFacts;
  /** VoiceOver's sentence for the card (me-model courierA11y) */
  a11y: string;
  letters: PlanetLetterVM[];
  shelf: ShelfFacts;
  stamps: PlanetStampsSource;
  /** what she looks like: the stage she is at, and whether hunger has greyed her */
  stage: PlanetStage;
  wilt: boolean;
};

export type MePlanetVM = {
  state: PlanetWrenState;
  napping: boolean;
  /** an egg has no bird to fly: the planet draws the egg on top */
  look: { skin: PlanetSkin; dress: PlanetDress; stage: PlanetStage; wilt: boolean };
  letters: PlanetLetterVM[];
  chip: string;
  hint: string;
  log: FlightLogVM;
  her: HerBadgeVM;
  cta: string;
  track: string;
  a11y: string;
  shelf: ShelfLookVM[];
  allLooks: string;
  allLooksHint: string;
  stamps: StampsTileVM;
  auraHint: string;
  /** the Aura tile's chip: WRITING AURA */
  auraChip: string;
} & CoverVM;

/** Everything her card and the tiles under it show. */
export function buildMePlanet(f: MePlanetFacts, fmt: CoverFormat): MePlanetVM {
  const { t } = fmt;
  const c = f.courier;
  const stamps = buildStampsTile(f.stamps, fmt);
  const chip = c.playing ? c.dayOffTag : c.chip;
  return {
    ...buildCover(f.cover, stamps, fmt),
    her: buildHerBadge(c.name, chip, f.stage, f.cover.day, fmt),
    state: planetWrenState(f.where, f.dayOff),
    napping: planetNapping(f.where),
    // on her day off she is drawn without hunger's grey, as the game's cover draws her
    look: { skin: f.shelf.skin, dress: f.shelf.dress, stage: f.stage, wilt: f.wilt && !f.dayOff },
    letters: f.letters,
    chip,
    hint: fmt.upper(t("planet.hint.spin")),
    log: buildFlightLog(f.log, f.where, c, fmt),
    cta: c.cta,
    track: t("wren.trackShort"),
    a11y: f.a11y,
    shelf: buildShelf(f.shelf, fmt),
    allLooks: t("m4.looks.all"),
    allLooksHint: t("m4.a11y.opensWardrobe", { wren: fmt.wren }),
    stamps,
    auraHint: t("planet.a11y.opensAura"),
    auraChip: t("ap.title"),
  };
}

/* ── the planet page ───────────────────────────────────────────────────── */

/** Where a letter stands (screens/letters letterStatus): quiet, answered by n, or replied to by someone named. */
export type PageLetterStatus = { kind: "quiet" } | { kind: "answered"; n: number } | { kind: "replied"; who: string; more: number };

/** A letter as the page needs it (screens/letters buildLetterCards has all of it). */
export type PageLetterSource = PlanetLetterSource & { body: string; status: PageLetterStatus };

/** The run she is on now (her page's tracking slip: courier-model slipRows, drivingThread). */
export type PageTransit = {
  /** the three rows, as her page files them */
  rows: string[];
  /** the correspondence Go to the Door opens */
  thread: string;
  /** the letter of yours it answers; "" when it answers someone else's (no stamp for it) */
  letter: string;
  /** she is back with the reply: Go to the Door shows */
  back: boolean;
};

export type PlanetSlipVM = {
  id: string;
  /** the planet's letter this slip belongs to; "" for a run with no stamp */
  letter: string;
  stamp: string;
  hex: string;
  /** NOV 3 · CRUSH */
  head: string;
  /** how the letter opens */
  body: string;
  rows: string[];
  /** the row a reader's lamp stands before; -1 for none */
  lamp: number;
  /** Go to the Door; "" for none */
  cta: string;
  /** the correspondence the button opens; "" for none */
  thread: string;
  a11y: string;
};

/** the id of a run's own slip (a reply that answered someone else's letter) */
export const TRANSIT_SLIP = "transit";

export type PageFormat = ShelfFormat & {
  /** "NOV 3": a day, short, upper-cased, in the reader's language */
  day: (iso: string) => string;
  /** a stamp's name in the reader's language; "" when unknown */
  stampName: (id: string) => string;
};

const noStop = (s: string): string => s.replace(/[.。]+$/, "");

/** One letter's three rows: when it left, the desks it has been on (none: no row), where it stands. */
export function letterRows(l: PageLetterSource, fmt: PageFormat): { rows: string[]; lamp: number } {
  const { t, upper } = fmt;
  const rows = [t("wren.slip.left", { day: l.date ? fmt.day(l.date) : "" })];
  let lamp = -1;
  const reads = Math.max(0, Math.round(l.reads || 0));
  if (reads > 0) {
    lamp = rows.length;
    rows.push(upper(noStop(reads === 1 ? t("la.out.reads1") : t("la.out.readsN", { n: reads }))));
  }
  const st = l.status;
  rows.push(st.kind === "replied" ? upper(st.more > 0 ? t("ml.repliedMore", { who: st.who, n: st.more }) : t("ml.replied", { who: st.who })) : st.kind === "answered" ? t("ml.answered") : t("wren.slip.waiting"));
  return { rows, lamp };
}

/** The slips, in the pager's order, and the one the page opens on ("" for none). */
export function planetSlips(cards: readonly PageLetterSource[] | null, letters: readonly PlanetLetterVM[], transit: PageTransit | null, fmt: PageFormat): { slips: PlanetSlipVM[]; open: string } {
  const { t } = fmt;
  const byId = new Map((cards ?? []).filter((c) => c.kind === "letter").map((c) => [c.id, c]));
  const go = transit?.back ? t("wren.slip.go") : "";
  const slips: PlanetSlipVM[] = [];
  let open = "";
  for (const l of letters) {
    const card = byId.get(l.id);
    if (!card) continue;
    const name = l.stamp ? fmt.stampName(l.stamp) : "";
    const head = [l.day, name ? fmt.upper(name) : ""].filter(Boolean).join(" · ");
    const mine = !!transit && transit.letter === l.id;
    const { rows, lamp } = mine ? { rows: transit.rows, lamp: -1 } : letterRows(card, fmt);
    if (mine) open = l.id;
    slips.push({ id: l.id, letter: l.id, stamp: l.stamp, hex: l.hex, head, body: card.body.trim(), rows, lamp, cta: mine ? go : "", thread: mine ? transit.thread : "", a11y: noStops([head, card.body.trim(), ...rows]) });
  }
  // a run that isn't about one of these letters (a reply to someone else's, or a letter past the list)
  if (transit && !open) {
    slips.unshift({ id: TRANSIT_SLIP, letter: "", stamp: "", hex: "", head: "", body: "", rows: transit.rows, lamp: -1, cta: go, thread: transit.thread, a11y: noStops(transit.rows) });
    open = TRANSIT_SLIP;
  }
  return { slips, open: open || (slips[0]?.id ?? "") };
}

const noStops = (parts: readonly string[]): string =>
  parts
    .map((p) => noStop(p.trim()))
    .filter(Boolean)
    .join(". ");

export type PlanetFigureVM = { id: "way" | "carried" | "desks"; value: string; label: string; lamp: boolean; a11y: string };

/** a figure not read yet: a dash, never a made-up 0 (as Me's profile figures) */
export const FIGURE_UNKNOWN = "–";

export type FigureFacts = {
  where: PlanetWhere;
  /** your letters nobody has answered; null until your letters are read */
  quiet: number | null;
  /** the doors she waits at: correspondences where the last word is yours */
  atDoors: number;
  /** every letter of yours she has carried; null until known */
  carried: number | null;
  /** the strangers who have had a letter of yours on their desk, summed; null until read */
  desks: number | null;
};

/** ON THE WAY · CARRIED · ON DESKS. */
export function planetFigures(f: FigureFacts, fmt: Pick<PageFormat, "t" | "upper">): PlanetFigureVM[] {
  const { t, upper } = fmt;
  // what she is out with now, as her state says it: flying with your unanswered letters, or
  // waiting at doors; at home, back, or with an empty bag, nothing is on the way
  const way = f.where === "exploring" ? f.quiet : f.where === "delivery" ? Math.max(1, f.atDoors) : 0;
  const fig = (id: PlanetFigureVM["id"], n: number | null, key: string, lamp = false): PlanetFigureVM => {
    const value = n == null ? FIGURE_UNKNOWN : String(n);
    return { id, value, label: upper(t(key)), lamp, a11y: n == null ? t(key) : `${value}, ${t(key)}` };
  };
  return [fig("way", way, "planet.page.way"), fig("carried", f.carried, "planet.page.carried"), fig("desks", f.desks, "planet.page.desks", true)];
}

export type PlanetPageFacts = {
  courier: PlanetCourierWords;
  where: PlanetWhere;
  dayOff: boolean;
  a11y: string;
  /** your letters as cards (null until read), and the same letters as the planet places them */
  cards: readonly PageLetterSource[] | null;
  letters: PlanetLetterVM[];
  /** how many letters you have ever sent, when known */
  total: number | null;
  transit: PageTransit | null;
  atDoors: number;
  look: { skin: PlanetSkin; dress: PlanetDress; stage: PlanetStage; wilt: boolean };
};

export type PlanetPageVM = {
  state: PlanetWrenState;
  napping: boolean;
  look: { skin: PlanetSkin; dress: PlanetDress; stage: PlanetStage; wilt: boolean };
  letters: PlanetLetterVM[];
  chip: string;
  hint: string;
  name: string;
  time: string;
  line: string;
  aside: string;
  figures: PlanetFigureVM[];
  /** TRACK */
  track: string;
  slips: PlanetSlipVM[];
  emptyRows: string[];
  open: string;
  myLetters: string;
  myLettersCount: string;
  back: string;
  zoomIn: string;
  zoomOut: string;
  a11y: string;
};

/** Everything the planet page shows. */
export function buildPlanetPage(f: PlanetPageFacts, fmt: PageFormat): PlanetPageVM {
  const { t, upper } = fmt;
  const c = f.courier;
  const read = f.cards ? f.cards.filter((x) => x.kind === "letter") : null;
  const { slips, open } = planetSlips(f.cards, f.letters, f.transit, fmt);
  const carried = read ? Math.max(read.length, f.total ?? 0) : f.total;
  return {
    state: planetWrenState(f.where, f.dayOff),
    napping: planetNapping(f.where),
    look: { ...f.look, wilt: f.look.wilt && !f.dayOff },
    letters: f.letters,
    chip: c.playing ? c.dayOffTag : c.chip,
    hint: `${upper(t("planet.hint.spin"))} · ${upper(t("planet.hint.zoom"))}`,
    name: c.name,
    time: c.playing ? "" : c.time,
    line: c.line,
    aside: c.aside,
    figures: planetFigures(
      {
        where: f.where,
        quiet: read ? read.filter((x) => x.answers.length === 0).length : null,
        atDoors: f.atDoors,
        carried,
        desks: read ? read.reduce((n, x) => n + Math.max(0, Math.round(x.reads || 0)), 0) : null,
      },
      fmt,
    ),
    track: upper(t("wren.trackShort")),
    slips,
    emptyRows: [t("wren.slip.nothing"), t("wren.slip.write")],
    open,
    myLetters: t("ml.title"),
    myLettersCount: carried == null ? "" : String(carried),
    back: t("a11y.back"),
    zoomIn: t("planet.a11y.zoomIn"),
    zoomOut: t("planet.a11y.zoomOut"),
    a11y: f.a11y,
  };
}
