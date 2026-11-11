import type { KCourierPalette } from "./MePieces";

/* THE COURIER'S PLANET ON ME (2026-11-11, docs/courier-planet.md), behind its own switch
   ("meplanet" in src/lib/surfaces.ts, off by default): KMeView's `planet` record. With `on`,
   the Swift Me tab is one page under the same sticky header, with no segments — her card (a
   small whole planet she lives on, her flight log, four looks), the Aura and Stamps
   tiles, the report row (ios/Portable/Me/KMePlanetCard.swift, KMeScreen.swift KMePlanetPage;
   the planet itself is ios/Portable/Planet, Wren is ios/Portable/Kit/KWrenBird.swift — drawn
   by Swift from the family's data, never a snapshot or an island).

   The record is built by src/screens/me/planet-model.ts (pure, tested) and me-pieces.ts. Turn
   it on only where isKindredlyUIViewAvailable("KMePlanetView") says the binary can draw it:
   an older binary ignores the record and keeps the page of segments, while TS would already
   be answering the new page's taps. */

export const ME_PLANET_VIEW = "KMePlanetView";

/** The hatchling's own proportions (src/lib/hatchling-form HatchlingForm). */
export type KWrenForm = {
  bodyStretch: number;
  crestLift: number;
  eyeScale: number;
  eyeSpread: number;
  cheek: number;
  beakScale: number;
  tail: boolean;
};

/** How Swift draws her (KWrenBird): the ids are components/WrenBird's. */
export type KWrenLookData = {
  skin: "sticker" | "plush" | "ink" | "moss" | "peach";
  stage: "egg" | "hatch" | "fledge" | "wren";
  /** the planet sets her mood itself; a shelf chip's is "content" */
  mood?: "content" | "happy" | "listen" | "sleepy" | "curious" | "delight" | "think" | "wink" | "worry";
  accessory: "none" | "beanie" | "scarf" | "phones" | "flower" | "party" | "shades" | "witch" | "ghost";
  /** starving: she loses colour and droops */
  wilt?: boolean;
  /** hatch stage only; null for none */
  form?: KWrenForm | null;
  /** the shell's birthmark, "#RRGGBB"; "" or absent for none */
  mark?: string | null;
};

/** One letter she has carried: a stamp on the planet. */
export type KPlanetLetterData = {
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
  /** "NOV 3"; "" for none */
  day: string;
};

/** One look on her card's shelf. */
export type KMeShelfLookData = {
  /** what onLook reports: "dress:beanie", "skin:moss" */
  id: string;
  /** BEANIE, MOSS: under the chip */
  name: string;
  look: KWrenLookData;
  worn: boolean;
  /** First Class, and not hers: gold dashes and a lock */
  firstClass: boolean;
  /** not hers yet for another reason (Moss before the first kindred) */
  dim: boolean;
  a11y: string;
  hint: string;
};

/** The Stamps tile under her card. */
export type KMeStampsTileData = {
  label: string;
  title: string;
  caption: string;
  /** at most three are drawn */
  fan: { id: string; hex: string }[];
  /** the blank stamp to make one */
  make: boolean;
  a11y: string;
  hint: string;
};

/** Her card and the tiles under it, as KMeView's `planet` takes them. */
export type KMePlanetData = {
  /** draw the planet's page instead of the segments */
  on: boolean;
  /** the planet's clock runs (the tab is focused) */
  live: boolean;
  /** the hour's sky (courier-card-model PALETTE) */
  palette: KCourierPalette;
  /** newest first */
  letters: KPlanetLetterData[];
  state: "home" | "out" | "waiting" | "back" | "dayOff";
  /** at home: asleep (letters behind her) or awake (an empty bag) */
  napping: boolean;
  look: KWrenLookData;
  /** YOUR COURIER, or DAY OFF */
  chip: string;
  /** DRAG TO SPIN */
  hint: string;
  /** her flight log: PIP · FLIGHT LOG, the run she is on a row to a line, how many of the rows
      have happened (the lamp is on the last of them), a line of hers the rows cannot say */
  log: { title: string; rows: string[]; done: number; note: string; a11y: string };
  /** Open, or Play */
  cta: string;
  /** the round button's name for VoiceOver */
  track: string;
  /** VoiceOver's sentence for the scene */
  a11y: string;
  shelf: KMeShelfLookData[];
  allLooks: string;
  allLooksHint: string;
  stamps: KMeStampsTileData;
  auraHint: string;
  /** the Aura tile's chip: WRITING AURA */
  auraChip: string;
  /** the cover's two ways in: a small picture and a number each */
  stampsEntry: { count: string; a11y: string; hint: string };
  lettersEntry: { count: string; a11y: string; hint: string };
  /** you, under the cover: your mark (he | she | ""), your sign as its emoji and its name, two
      numbers (kindreds, notes), Edit */
  me: { mark: string; sign: string; signName: string; signA11y: string; stats: { key: string; count: string; unit: string; a11y: string; hint: string }[]; edit: string };
  /** her badge, and her journey while she grows */
  her: { name: string; day: string; tag: string; journeyTitle: string; stops: { id: string; name: string; state: "done" | "now" | "later" }[]; next: string; a11y: string };
  /** where the writing report stands, for its tile's picture, and the tile's chip */
  reportTile: { state: "none" | "progress" | "ready" | "done" | "locked"; have: number; need: number; tag: string };
  reportChip: string;
};

type NativeForm = KWrenForm;
type NativeLook = { skin: string; stage: string; mood: string; accessory: string; wilt: boolean; hasForm: boolean; form: NativeForm; mark: string };
export type NativeMePlanet = Omit<KMePlanetData, "look" | "shelf"> & { look: NativeLook; shelf: (Omit<KMeShelfLookData, "look"> & { look: NativeLook })[] };

const NEUTRAL_FORM: NativeForm = { bodyStretch: 1, crestLift: 0, eyeScale: 1, eyeSpread: 0, cheek: 1, beakScale: 1, tail: false };

/** A look as the Swift record takes it (a record field can't be null or missing). */
export const nativeWrenLook = (l: KWrenLookData): NativeLook => ({
  skin: l.skin,
  stage: l.stage,
  mood: l.mood ?? "content",
  accessory: l.accessory,
  wilt: !!l.wilt,
  hasForm: !!l.form,
  form: l.form ?? NEUTRAL_FORM,
  mark: l.mark ?? "",
});

/** The record for a host when the planet is off: Swift keeps the page of segments. */
export const ME_PLANET_OFF: NativeMePlanet = Object.freeze({
  on: false,
  live: false,
  palette: { text: "#FFFFFF", scrim: "#2B2660", button: "#FFFFFF", buttonText: "#1E1B35", sky0: "#1E1B35", sky1: "#2E2A6B", sea: "#1F2E5E", land: "#2F5148", forest: "#1B3530", rock: "#3A3F5C", ink: "#DAD6F2", chip: "#FFFFFF", chipText: "#1E1B35", sun: "", sunX: 0.84, sunY: 0.18, moon: true, stars: true, lit: true, cloud: "" },
  letters: [],
  state: "home",
  napping: true,
  look: nativeWrenLook({ skin: "sticker", stage: "wren", accessory: "none" }),
  chip: "",
  hint: "",
  log: { title: "", rows: [], done: 0, note: "", a11y: "" },
  cta: "",
  track: "",
  a11y: "",
  shelf: [],
  allLooks: "",
  allLooksHint: "",
  stamps: { label: "", title: "", caption: "", fan: [], make: false, a11y: "", hint: "" },
  auraHint: "",
  auraChip: "",
  stampsEntry: { count: "", a11y: "", hint: "" },
  lettersEntry: { count: "", a11y: "", hint: "" },
  me: { mark: "", sign: "", signName: "", signA11y: "", stats: [], edit: "" },
  her: { name: "", day: "", tag: "", journeyTitle: "", stops: [], next: "", a11y: "" },
  reportTile: { state: "none", have: 0, need: 0, tag: "" },
  reportChip: "",
}) as NativeMePlanet;

/** Her card as the Swift record takes it. */
export const nativeMePlanet = (d: KMePlanetData | null | undefined): NativeMePlanet =>
  d ? { ...d, look: nativeWrenLook(d.look), shelf: d.shelf.map((s) => ({ ...s, look: nativeWrenLook(s.look) })) } : ME_PLANET_OFF;
