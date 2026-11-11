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
   - THE SHELF: four looks, the defaults (Sky, Bare) not counted, left to right by "can I use
     it now": one free piece · the colour a first kindred unlocks · one First Class colour ·
     one First Class piece. Which one stands in a slot turns over each week (Monday, UTC);
     what she is wearing keeps its place whatever the week; tapping the one she wears takes it
     off. A season's free looks take the free slot while the season lasts.
   - what a tap on a look does: wear it, take it off, open First Class (a paid look, not a
     member), or open her wardrobe (Moss before the first kindred: the wardrobe says why). */

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

/* ── the shelf ─────────────────────────────────────────────────────────── */

/** the free pieces, the season's aside */
export const SHELF_FREE: readonly PlanetDress[] = ["beanie", "scarf"];
/** the season's free looks this build can draw (lib/season-core) */
export const SHELF_SEASON: readonly PlanetDress[] = ["witch", "ghost"];
/** the colour a first kindred unlocks */
export const SHELF_KINDRED: PlanetSkin = "moss";
/** the First Class colours: Peach, Night, Mist */
export const SHELF_FC_SKINS: readonly PlanetSkin[] = ["peach", "ink", "plush"];
/** the First Class pieces */
export const SHELF_FC_DRESS: readonly PlanetDress[] = ["phones", "flower", "party", "shades"];

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

const pick = <T,>(list: readonly T[], week: number): T => list[((week % list.length) + list.length) % list.length];
const has = <T,>(list: readonly T[], v: unknown): v is T => (list as readonly unknown[]).includes(v);

/** The shelf's four, left to right (see the top). */
export function shelfSlots(f: ShelfFacts): ShelfSlot[] {
  const season = (f.season ?? []).filter((id): id is PlanetDress => has(SHELF_SEASON, id));
  const freeList = season.length ? season : SHELF_FREE;
  // what she wears keeps its place, whatever the week (a seasonal look she still has on, too)
  const free = has(SHELF_FREE, f.dress) || has(SHELF_SEASON, f.dress) ? f.dress : pick(freeList, f.week);
  const colour = has(SHELF_FC_SKINS, f.skin) ? f.skin : pick(SHELF_FC_SKINS, f.week);
  const piece = has(SHELF_FC_DRESS, f.dress) ? f.dress : pick(SHELF_FC_DRESS, f.week);

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
  return [dress(free, false), skin(SHELF_KINDRED, "kindred"), skin(colour, "plus"), dress(piece, true)];
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
    const hint = s.worn ? t("cp.a11y.takeOff") : s.firstClass ? t("m4.a11y.opensFc") : s.dim ? t("m4.a11y.opensWardrobe", { wren: fmt.wren }) : t("cp.a11y.wear");
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

/** The Stamps tile: what you made lately first (the ones that passed), then what you used, three
    at most; the blank stamp when the press is open to you. */
export function buildStampsTile(s: PlanetStampsSource, fmt: { t: TFn; upper: (s: string) => string }): StampsTileVM {
  const { t, upper } = fmt;
  const made = s.madeShow ? s.made.filter((m) => !m.note).map((m) => ({ id: m.id, hex: "" })) : [];
  const fan = [...made, ...s.cells.map((c) => ({ id: c.id, hex: c.hex }))].slice(0, 3);
  const label = upper(t("me.seg.stamps"));
  const title = s.madeShow ? s.emptyTitle : s.emptyText;
  const caption = s.cells.length > 0 ? s.count : s.madeQuota;
  return { label, title, caption, fan, make: s.madeShow, a11y: [t("me.seg.stamps"), title, caption].filter(Boolean).join(", "), hint: t("cp.a11y.opensAlbum") };
}

export type MePlanetFacts = {
  courier: PlanetCourierWords;
  where: PlanetWhere;
  dayOff: boolean;
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
  name: string;
  time: string;
  line: string;
  aside: string;
  cta: string;
  track: string;
  a11y: string;
  shelf: ShelfLookVM[];
  allLooks: string;
  allLooksHint: string;
  stamps: StampsTileVM;
  auraHint: string;
};

/** Everything her card and the tiles under it show. */
export function buildMePlanet(f: MePlanetFacts, fmt: ShelfFormat): MePlanetVM {
  const { t } = fmt;
  const c = f.courier;
  return {
    state: planetWrenState(f.where, f.dayOff),
    napping: planetNapping(f.where),
    // on her day off she is drawn without hunger's grey, as the game's cover draws her
    look: { skin: f.shelf.skin, dress: f.shelf.dress, stage: f.stage, wilt: f.wilt && !f.dayOff },
    letters: f.letters,
    chip: c.playing ? c.dayOffTag : c.chip,
    hint: fmt.upper(t("cp.hint.spin")),
    name: c.name,
    // on her day off the chip already says so: no second DAY OFF beside her name
    time: c.playing ? "" : c.time,
    line: c.line,
    aside: c.aside,
    cta: c.cta,
    track: t("wren.trackShort"),
    a11y: f.a11y,
    shelf: buildShelf(f.shelf, fmt),
    allLooks: t("m4.looks.all"),
    allLooksHint: t("m4.a11y.opensWardrobe", { wren: fmt.wren }),
    stamps: buildStampsTile(f.stamps, fmt),
    auraHint: t("cp.a11y.opensAura"),
  };
}
