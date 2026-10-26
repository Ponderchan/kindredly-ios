import type { WrenAccessory, WrenMood, WrenSkin, WrenStage } from "../../components/WrenBird";
import type { ThreadSummary } from "../../lib/db";
import type { AwayReport, Whereabouts } from "../../lib/whereabouts";
import type { FirstClass4aVM } from "../me/me-model";

/* WREN'S JOURNEY, AS WORDS AND FACTS (the courier page, /courier).
   ────────────────────────────────────────────────────────────────────────
   What the page shows, worked out once for the SwiftUI page (CourierNative,
   KCourierView). The React Native page (components/WrenHome) works the same
   things out inline; these are its rules, kept to the letter so a remote flip
   between the two never changes what the reader sees:
     · the hour's sky and the band's colour (night's band is #2B2660, every
       other hour's is the sky's chip);
     · her face on the perch: hunger's, else asleep at home after five quiet
       days, else her whereabouts'; bare unless she is hatched or grown;
     · her bubble: her day off, hunger, "…" in the egg, "zzz…", or her line;
     · Play only while she flies and isn't starving;
     · the band's second line: what happened while you were away, else the
       journey that set her status and its day;
     · the tracking slip's rows and the stage's two counted facts;
     · the journey's three stops with the days they really turned;
     · the two wardrobe cells and every tile on the rack, locks and all.
   Pure, and type-only imports: plain node runs courier-model.test.ts. Every
   word comes through fmt.t. */

export type CourierFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  upper: (s: string) => string;
  /** a journey's day, "Sep 20" (lib/format dShort) */
  dShort: (ms: number) => string;
  /** a stage's day in the reader's locale, "SEP 20" / "9月20日" (lib/format noteDay) */
  day: (iso: string) => string;
  /** Wren saying a line in her own name (lib/wren-name speakAs) */
  speak: (line: string) => string;
};

/** The hour's sky (components/CourierCard PALETTE[daylight()]), as the page reads it. */
export type CourierSky = {
  night: boolean;
  sky: readonly [string, string];
  ink: string;
  chip: string;
  scrim: string;
  sun: string | null;
  moon: boolean;
  stars: boolean;
};

export type CourierSkinFacts = { id: WrenSkin; lock: "free" | "milestone" | "plus"; unlocked: boolean };
export type CourierPieceFacts = { id: WrenAccessory; free: boolean };
export type CourierKeepsakeFacts = { id: string; evidence: string; fresh: boolean };

export type CourierFacts = {
  wren: string;
  /** stageInfo(stats, floor).stage */
  stage: WrenStage;
  /** stageInfo(stats, floor).next.progress: your side of the way to the next stage ([letters, of]),
      null when there is no next stage or nothing to count */
  next: readonly [number, number] | null;
  /** the counts are in: nothing counted is shown as a number before */
  statsReady: boolean;
  /** stats.day, kindreds, lettersSent */
  day: number;
  kindreds: number;
  lettersSent: number;
  /** her runs (fetchCarried) and whether they are known yet */
  carried: readonly { at: string }[];
  /** getStageDates(), ISO */
  dates: Partial<Record<WrenStage, string>>;
  joinedAt: string | null;
  /** whereabouts(): her state, status line and bubble */
  where: { state: Whereabouts; line: string; bubble: string };
  /** WHEREABOUTS_META[where.state].mood */
  whereMood: WrenMood;
  dozy: boolean;
  /** hungerRead(): someone waiting, or days with nothing to carry */
  hungry: { mood: WrenMood; line: string; wilt: boolean } | null;
  /** isDayOff(): the pillars stand in her sky */
  dayOff: boolean;
  away: AwayReport | null;
  threads: readonly ThreadSummary[];
  /** how the slips name a thread (WrenHome slipName: the who book) */
  nameOf: (th: ThreadSummary) => string;
  /** flightLog(): the rows and her closing line, before speakAs */
  log: { rows: string[]; line: string };
  sky: CourierSky;
  cofounderNo: number | null;
  /** the shelf, newest first, only the ones with a drawing (keepsake(id)) */
  shelf: readonly CourierKeepsakeFacts[];
  shelfTotal: number;
  skin: WrenSkin;
  accessory: WrenAccessory;
  premium: boolean;
  skins: readonly CourierSkinFacts[];
  /** offeredAccessories(season.looks): Bare, the season's looks, the every-day pieces */
  pieces: readonly CourierPieceFacts[];
  firstClass: FirstClass4aVM;
};

export type CourierFactIcon = "letter" | "kindred" | "date" | "next";
export type CourierStopState = "done" | "now" | "later";
export type CourierHeroState = Whereabouts | "dozing";

export type CourierRackTile = {
  id: string;
  label: string;
  /** the brass tag ("FIRST CLASS"), "" when it's hers */
  lock: string;
  /** VoiceOver: a First Class piece still locked opens the fare */
  hint: string;
  on: boolean;
};

export type CourierVM = {
  strings: {
    title: string;
    back: string;
    /** the cover's hint, one line per gesture ("DRAG HER", "TAP FOR A FACE") */
    hints: string[];
    /** VoiceOver's hint on her: what a tap does */
    tapHint: string;
    play: string;
    playA11y: string;
    playHint: string;
    /** VoiceOver's hint on her bubble */
    logHint: string;
    expanded: string;
    collapsed: string;
    track: string;
    trackClose: string;
    slip: string;
    slipGo: string;
    log: string;
    journey: string;
    keepsakes: string;
    allKept: string;
    wrenUpper: string;
  };
  cover: {
    sky0: string;
    sky1: string;
    ink: string;
    band: string;
    /** the pillars' edge on her day off */
    pillarInk: string;
    scrim: string;
    sun: string;
    moon: boolean;
    stars: boolean;
    night: boolean;
    dayOff: boolean;
    /** "DAY 12", "" until the counts are in */
    dayChip: string;
    /** "COFOUNDER No. 007", "" for none */
    cofounder: string;
    bubble: string;
    /** her bubble opens the flight log (she flies) */
    bubbleOpens: boolean;
    canPlay: boolean;
  };
  hero: {
    mood: WrenMood;
    /** drawn with nothing on (a fledgling on the perch) */
    bare: boolean;
    wilt: boolean;
    state: CourierHeroState;
    stage: WrenStage;
  };
  band: { show: boolean; line: string; sub: string; bringing: boolean };
  slip: { rows: string[]; lit: boolean; threadId: string };
  log: { rows: string[]; line: string };
  name: string;
  kindLine: string;
  facts: { icon: CourierFactIcon; text: string }[];
  journey: CourierStop[];
  keepsakes: { id: string; name: string; evidence: string; fresh: boolean; a11y: string }[];
  cells: { key: "looks" | "dress"; label: string; value: string; count: string; swatch: string }[];
  rack: { looks: CourierRackTile[]; dress: CourierRackTile[] };
  firstClass: FirstClass4aVM;
};

/* NO EGG IN THE PRODUCT: the ladder starts where the user does (WrenHome). */
export const JOURNEY: readonly WrenStage[] = ["hatch", "fledge", "wren"];
const STAGE_INDEX: Record<WrenStage, number> = { egg: 0, hatch: 1, fledge: 2, wren: 3 };
/** the band on her night sky; the day skies use their chip */
export const NIGHT_BAND = "#2B2660";
/** the two cells' swatches (WrenHome Cell) */
export const LOOKS_SWATCH = "#A9D0F2";
export const DRESS_SWATCH = "#F2887E";
/** the faces a tap cycles through (CourierStage TAP_MOODS), then a pick-up's, a drop's and a doze's */
export const TAP_MOODS: readonly WrenMood[] = ["happy", "wink", "delight", "think", "listen", "curious"];
export const HELD_MOOD: WrenMood = "happy";
export const DROP_MOOD: WrenMood = "delight";
export const DOZE_MOOD: WrenMood = "sleepy";

/** Which journey set her status — the same rules whereabouts() reads (WrenHome drivingThread). */
export function drivingThread(threads: readonly ThreadSummary[], state: string): ThreadSummary | null {
  const by = (f: (t: ThreadSummary) => boolean) => threads.filter(f).sort((a, b) => b.lastAt - a.lastAt)[0] ?? null;
  if (state === "bringing") return by((t) => (t.mine === 0 ? t.theirs > 0 : !t.lastSenderMe && t.theirs > 0));
  if (state === "delivery") return by((t) => t.lastSenderMe && t.mine > 0);
  return null;
}

/** Her face on the perch, and whether she wears her piece there. */
export function heroOf(f: Pick<CourierFacts, "stage" | "hungry" | "dozy" | "where" | "whereMood">): CourierVM["hero"] {
  const home = f.where.state === "home";
  return {
    mood: f.hungry ? f.hungry.mood : f.dozy && home ? "sleepy" : f.whereMood,
    // WrenHome wearsHere: hatched or grown
    bare: !(f.stage === "wren" || f.stage === "hatch"),
    wilt: !!f.hungry?.wilt,
    state: f.dozy && home ? "dozing" : f.where.state,
    stage: f.stage,
  };
}

/** The day a stage turned, formatted; hatch (and egg) fall back to the day you joined. */
export function stageDay(st: WrenStage, dates: Partial<Record<WrenStage, string>>, joinedAt: string | null, day: (iso: string) => string): string | null {
  const d = dates[st];
  if ((st === "egg" || st === "hatch") && !d && joinedAt) return day(joinedAt);
  return d ? day(d) : null;
}

/** The stage in two counted facts. */
export function stageFacts(f: Pick<CourierFacts, "stage" | "dates" | "joinedAt" | "carried" | "lettersSent" | "kindreds">, fmt: Pick<CourierFormat, "t" | "day">): CourierVM["facts"] {
  const { t } = fmt;
  const d = stageDay(f.stage, f.dates, f.joinedAt, fmt.day);
  // the day only: "1 letter to fledge" was one fixed sentence for every hatchling (owner, 2026-10-26:
  // numbers must be true); the journey below counts the real way there
  if (f.stage === "hatch") return [{ icon: "date", text: d ? t("wren.pill.hatched", { date: d }) : t("wren.pill.hatchedNoDate") }];
  if (f.stage === "fledge") return [{ icon: "date", text: d ? t("wren.pill.flying", { date: d }) : t("wren.pill.flyingNoDate") }, { icon: "next", text: t("wren.pill.toGrow") }];
  if (f.stage === "wren") {
    const journeys = f.carried.length + f.lettersSent;
    return [
      { icon: "letter", text: t("wren.pill.carried", { n: journeys }) },
      { icon: "kindred", text: f.kindreds === 1 ? t("wren.pill.kindredOne") : t("wren.pill.kindreds", { n: f.kindreds }) },
    ];
  }
  return [];
}

/** One stop of the journey, drawn as her form at that stage (owner, 2026-10-26: "she grows"). */
export type CourierStop = {
  id: "hatch" | "fledge" | "wren";
  name: string;
  /** its day ("SEP 20 · NOW"), what gets her there, or "" */
  sub: string;
  state: CourierStopState;
  /** the next stop only: your letters toward it (done of `of`), and that said in words; of 0 = no count */
  done: number;
  of: number;
  progress: string;
};

/** The journey's three stops: a date when the day is known, what gets her there when it's ahead,
    and on the next one your real count toward it (never the other person's part). */
export function journeyStops(f: Pick<CourierFacts, "stage" | "dates" | "joinedAt"> & Partial<Pick<CourierFacts, "next">>, fmt: Pick<CourierFormat, "t" | "day">): CourierVM["journey"] {
  const { t } = fmt;
  const cur = STAGE_INDEX[f.stage];
  const NAME: Record<WrenStage, string> = { egg: t("wren.name.egg"), hatch: t("wren.name.hatch"), fledge: t("wren.name.fledge"), wren: t("wren.name.grown") };
  return JOURNEY.map((st) => {
    const idx = STAGE_INDEX[st];
    const state: CourierStopState = idx < cur ? "done" : idx === cur ? "now" : "later";
    const d = state !== "later" ? stageDay(st, f.dates, f.joinedAt, fmt.day) : null;
    // a passed stop with no date says nothing
    const sub = d ? `${d}${state === "now" ? ` · ${t("wren.now")}` : ""}` : state === "later" ? t(`wren.milestone.${st}`) : "";
    // the count belongs to the next stop, and only when there is more than one thing to count
    const counted = idx === cur + 1 && f.next && f.next[1] > 1 ? f.next : null;
    const done = counted ? Math.max(0, Math.min(counted[0], counted[1])) : 0;
    const of = counted ? counted[1] : 0;
    return { id: st as CourierStop["id"], name: NAME[st], sub, state, done, of, progress: counted ? t("wren.journey.yours", { n: done, m: of }) : "" };
  });
}

/** The tracking slip: her run, as the post would file it. */
export function slipRows(f: Pick<CourierFacts, "threads" | "where" | "wren" | "nameOf">, fmt: Pick<CourierFormat, "t" | "upper" | "dShort">): CourierVM["slip"] {
  const { t, upper } = fmt;
  const th = drivingThread(f.threads, f.where.state);
  if (!th) return { rows: [t("wren.slip.nothing"), t("wren.slip.write")], lit: false, threadId: "" };
  const who = upper(f.nameOf(th));
  const day = upper(fmt.dShort(th.lastAt));
  const rows =
    f.where.state === "delivery"
      ? [t("wren.slip.left", { day }), t("wren.slip.door", { who }), t("wren.slip.waiting")]
      : [t("wren.slip.wrote", { who, day }), t("wren.slip.carried", { wren: upper(f.wren) }), t("wren.slip.forYou")];
  return { rows, lit: true, threadId: th.id };
}

/** The band's second line: while you were away, else the journey that set her status. */
export function bandSub(f: Pick<CourierFacts, "away" | "threads" | "where" | "nameOf">, fmt: Pick<CourierFormat, "t" | "dShort">): string {
  const { t } = fmt;
  if (f.away) {
    return [t("wren.away"), f.away.carriedOut ? t("wren.away.out", { n: f.away.carriedOut }) : null, f.away.broughtBack ? t("wren.away.back", { n: f.away.broughtBack }) : null]
      .filter(Boolean)
      .join(" · ");
  }
  const th = drivingThread(f.threads, f.where.state);
  return th ? `${f.nameOf(th)} · ${fmt.dShort(th.lastAt)}` : "";
}

/** The two cells and the rack's tiles (WrenHome Cell, WardrobeRack). */
export function wardrobe(f: Pick<CourierFacts, "statsReady" | "skin" | "accessory" | "premium" | "skins" | "pieces">, fmt: Pick<CourierFormat, "t">): Pick<CourierVM, "cells" | "rack"> {
  const { t } = fmt;
  const items = f.pieces.filter((a) => a.id !== "none");
  const looksOwned = f.skins.filter((s) => s.unlocked).length;
  // her own piece is named whatever it is, offered now or not (a seasonal look out of its season)
  const dressName = f.accessory === "none" ? t("wren.bare") : t(`ws.acc.${f.accessory}`);
  const plusHint = t("wren.a11y.plusHint");
  return {
    cells: [
      { key: "looks", label: t("wren.looks"), value: t(`skin.${f.skin}.name`), count: f.statsReady ? `${looksOwned}/${f.skins.length}` : "", swatch: LOOKS_SWATCH },
      { key: "dress", label: t("wren.dress"), value: dressName, count: `${items.filter((a) => a.free || f.premium).length}/${items.length}`, swatch: DRESS_SWATCH },
    ],
    rack: {
      looks: f.skins.map((s) => ({
        id: s.id,
        label: t(`skin.${s.id}.name`),
        lock: s.unlocked ? "" : s.lock === "plus" ? t("wren.lock.plus") : t("wren.lock.kindred"),
        hint: !s.unlocked && s.lock === "plus" ? plusHint : "",
        on: f.skin === s.id,
      })),
      dress: f.pieces.map((a) => {
        const unlocked = a.free || f.premium;
        return { id: a.id, label: t(`ws.acc.${a.id}`), lock: unlocked ? "" : t("wren.lock.plus"), hint: unlocked ? "" : plusHint, on: f.accessory === a.id };
      }),
    },
  };
}

/** Everything the courier page shows. */
export function buildCourierView(f: CourierFacts, fmt: CourierFormat): CourierVM {
  const { t, upper } = fmt;
  const hero = heroOf(f);
  const flies = f.stage !== "egg";
  const home = f.where.state === "home";
  const band = f.sky.night ? NIGHT_BAND : f.sky.chip;
  const hints = t("cr.stageHint").split(" · ");
  const STAGE_LABEL: Record<WrenStage, string> = { egg: t("wren.stage.egg"), hatch: t("wren.stage.hatch"), fledge: t("wren.stage.fledge"), wren: t("wren.stage.grown") };
  const bubble = f.dayOff ? t("ff.dayoff.bubble") : f.hungry ? f.hungry.line : !flies ? "…" : f.dozy && home ? "zzz…" : fmt.speak(f.where.bubble);
  return {
    strings: {
      title: t("cr.title", { wren: f.wren }),
      back: t("a11y.back"),
      hints,
      tapHint: hints[hints.length - 1] ?? "",
      play: t("ff.play"),
      playA11y: t("ff.title"),
      playHint: t("ff.hint"),
      logHint: t("wren.log"),
      expanded: t("m4.a11y.expanded"),
      collapsed: t("m4.a11y.collapsed"),
      track: t("wren.trackShort"),
      trackClose: t("wren.trackClose"),
      slip: t("wren.slip"),
      slipGo: t("wren.slip.go"),
      log: t("wren.log"),
      journey: t("wren.journeyShort"),
      keepsakes: t("wren.keepsakes"),
      allKept: t("wren.allKept", { n: f.shelfTotal }),
      wrenUpper: upper(f.wren),
    },
    cover: {
      sky0: f.sky.sky[0],
      sky1: f.sky.sky[1],
      ink: f.sky.ink,
      band,
      pillarInk: f.sky.night ? "#DAD6F2" : f.sky.chip,
      scrim: f.sky.scrim,
      sun: f.sky.sun ?? "",
      moon: f.sky.moon,
      stars: f.sky.stars,
      night: f.sky.night,
      dayOff: f.dayOff,
      dayChip: f.statsReady ? t("me.dayN", { n: f.day }) : "",
      cofounder: f.cofounderNo != null ? t("cf.no", { n: String(f.cofounderNo).padStart(3, "0") }) : "",
      bubble,
      bubbleOpens: flies,
      // starving, she's too tired to play
      canPlay: flies && !hero.wilt,
    },
    hero,
    band: { show: flies, line: f.where.line, sub: bandSub(f, fmt), bringing: f.where.state === "bringing" },
    slip: slipRows(f, fmt),
    log: { rows: f.log.rows, line: fmt.speak(f.log.line) },
    name: f.wren,
    kindLine: `${t("wren.yourCourier")} · ${STAGE_LABEL[f.stage]}`,
    facts: f.statsReady ? stageFacts(f, fmt) : [],
    journey: journeyStops(f, fmt),
    keepsakes: f.shelf.slice(0, 3).map((k) => {
      const name = t(`ks.name.${k.id}`);
      return { id: k.id, name, evidence: k.evidence, fresh: k.fresh, a11y: [k.fresh ? t("me.keepsakes.newA11y", { name }) : name, k.evidence].filter(Boolean).join(", ") };
    }),
    ...wardrobe(f, fmt),
    firstClass: f.firstClass,
  };
}
