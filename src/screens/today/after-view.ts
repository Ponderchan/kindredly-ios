import { MORNING_HOUR, untilMorning } from "../../lib/day";
import { PALETTE, daylight } from "../../components/courier-card-model";
import { streakDots, streakRun, type AfterToday, type Thing, type Totals } from "../../lib/after-fifteen-core";

/* TODAY, AFTER FIFTEEN — WHAT THE PAGE SAYS (docs/today-after-fifteen.md).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — every word, date and stamp name comes in through
   `fmt`, so `node src/screens/today/after-view.test.ts` locks what each page says for which
   numbers. useAfterFifteen gathers the facts; AfterFifteenNative sends the result to Swift
   (KAfterFifteenView) as it is.

   EVERY NUMBER IS REAL. `read` is what went past the desk today, `replied` what was written back
   to; the receipt's totals are only the days the phone logged; the streak is the days that count
   (lib/after-fifteen-core). One and none have their own words, and a line with nothing to count
   is left out rather than printed with a zero.

   NOTHING OF A STRANGER'S LEAVES THE PHONE. A line of the day is shown on this phone and can be
   kept on this phone. The receipt's shared picture never carries one (the receipt only prints
   facts), and its "stayed on" row is marked `unshared` when the topic is a photo stamp's own
   #tag, which is a writer's words. */

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export type AfterFormat = {
  t: TFn;
  /** capitals in the reader's language */
  upper: (s: string) => string;
  /** format.clockTime of today at hour:00 ("8:00 AM", "8:00") */
  clockHour: (hour: number) => string;
  /** "NOV.11 · 3:19 PM" */
  stampTime: (ms: number) => string;
  /** "NOV.11", from a desk day's key ("2026-11-11") */
  dayMark: (key: string) => string;
  /** "8H 06M" */
  countdown: (u: { h: number; m: number }) => string;
  /** a stamp's name in the reader's language ("almosts"; a photo stamp's own #tag), or "" */
  stampName: (id: string) => string;
  /** a photo stamp ("c:<uuid>"): its name is a writer's own words */
  isOwnWords: (stampId: string) => boolean;
  /** the weekday's one letter (0 = Sunday) */
  weekdayLetter: (weekday: number) => string;
  /** a fact's words and what stands under them */
  fact: (no: number) => { text: string; foot: string };
};

export type AfterFacts = {
  today: AfterToday;
  /** her name */
  name: string;
  /** what went past the desk today, and what was written back to */
  read: number;
  replied: number;
  /** she can play (not an egg, not wilted) */
  canPlay: boolean;
  now: Date;
  /** the days that count for the one streak (written or finished) */
  days: ReadonlySet<string>;
  /** the receipt's numbers: the day's, or on a Sunday the week's */
  totals: Totals;
  week: boolean;
  /** "Today" */
  title: string;
  /** "Undo" while the last pass can be taken back, "" otherwise; and its VoiceOver hint */
  undo: string;
  undoHint: string;
};

/** KAfterSkyRecord: the hour's sky as Free Flight draws it (screens/courier/free-flight-model). */
export type AfterSky = {
  sky0: string;
  sky1: string;
  land: string;
  forest: string;
  scrim: string;
  pillarInk: string;
  /** "" for no sun */
  sun: string;
  moon: boolean;
  stars: boolean;
  night: boolean;
};

/** The sky her game is played under at `now` (PALETTE[daylight()], the pillars edged as the game edges them). */
export function afterSky(now: Date): AfterSky {
  const hour = daylight(now.getHours());
  const p = PALETTE[hour];
  const night = hour === "night";
  return {
    sky0: p.sky[0],
    sky1: p.sky[1],
    land: p.land,
    forest: p.forest,
    scrim: p.scrim,
    pillarInk: night ? "#DAD6F2" : p.chip,
    sun: p.sun ?? "",
    moon: p.moon,
    stars: p.stars,
    night,
  };
}

export type AfterRow = { id: string; label: string; value: string; strong: boolean; unshared: boolean };

/** KAfterFifteenView's records, field for field (modules/kindredly-ui/src/AfterFifteen.tsx). */
export type AfterVM = {
  page: AfterToday["page"];
  title: string;
  thing: {
    isLine: boolean;
    tag: string;
    body: string;
    foot: string;
    keep: string;
    kept: string;
    keepStub: string;
    keptStub: string;
    isKept: boolean;
    keepHint: string;
  };
  strip: { canPlay: boolean; eyebrow: string; title: string; hint: string };
  /** her game's sky at this hour, for the window on a folding phone's right page (afterSky) */
  sky: AfterSky;
  box: {
    line: string;
    sub: string;
    hint: string;
    pinned: string;
    slot: string;
    slotOpening: string;
    slotA11y: string;
    eyebrow: string;
    closed: string;
    back: string;
    countdown: string;
    pull: string;
    lift: string;
    pullA11y: string;
    liftA11y: string;
    shut: boolean;
  };
  receipt: {
    line: string;
    shop: string;
    stampLine: string;
    rows: AfterRow[];
    delivery: AfterRow[];
    print: string;
    printing: string;
    tear: string;
    share: string;
    phase: AfterToday["receipt"];
    a11y: string;
  };
  bed: {
    sayIdle: string;
    sayFed: string;
    sayFull: string;
    sayPat: string;
    sayNeedSnack: string;
    sayNeedPat: string;
    snack: { label: string; sub: string; subDone: string };
    pat: { label: string; sub: string; subDone: string };
    lights: { label: string; sub: string; subDone: string };
    lockedSub: string;
    sleepTag: string;
    streak: string;
    streakSub: string;
    streakDone: string;
    streakSubDone: string;
    next: string;
    nextAt: string;
    dots: { id: string; letter: string; on: boolean; tonight: boolean }[];
    dotsA11y: string;
    dotsA11yDone: string;
    birdA11y: string;
    fed: boolean;
    patted: boolean;
    asleep: boolean;
  };
  undo: string;
  undoHint: string;
};

/** one, or many: the key's ".1" form or its ".N" form with {n} */
const count = (t: TFn, key: string, n: number): string => (n === 1 ? t(`${key}.1`) : t(`${key}.N`, { n }));

/**
 * Her fact as she murmurs it asleep: the sentence ends become pauses, and the last full stop is
 * dropped (af.sleepTalk puts the ellipses and the quotation marks round it). Names keep their
 * capitals.
 */
export function sleepTalk(text: string): string {
  return text
    .trim()
    .replace(/[.。!！]+\s*$/u, "")
    .replace(/([.!])\s+/g, "… ")
    .replace(/[。！]/g, "…");
}

const QUOTES = "\"'“”‘’«»「」『』„‚";

/** A stranger's line in the language's quotation marks; a line that came with its own is left as written. */
export function quoted(line: string, t: TFn): string {
  const s = line.trim();
  return s && QUOTES.includes(s[0]) && QUOTES.includes(s[s.length - 1]) ? s : t("af.quote", { line: s });
}

/** "#ALMOSTS" for a stamp, or "" when it has no name to show */
function topic(stampId: string, fmt: AfterFormat): string {
  const name = stampId ? fmt.stampName(stampId).replace(/^#/, "").trim() : "";
  return name ? `#${fmt.upper(name)}` : "";
}

/** What stands on the note, the receipt's foot and the card over her. `asleep`: bedtime's card, where her fact is sleep-talk. */
export function buildThing(thing: Thing, o: { name: string; kept: boolean; sleep: boolean }, fmt: AfterFormat): AfterVM["thing"] {
  const { t, upper } = fmt;
  const words = { keep: upper(t("af.keep")), kept: upper(t("af.kept")), keepStub: t("af.keepStub"), keptStub: t("af.kept"), isKept: o.kept, keepHint: t("af.keep.hint") };
  if (thing.kind === "line") {
    const tag = topic(thing.stamp, fmt);
    const who = thing.who ? upper(thing.who) : "";
    return { isLine: true, tag: upper(t("af.thing.line")), body: quoted(thing.text, t), foot: [who, tag].filter(Boolean).join(" · "), ...words };
  }
  const fact = fmt.fact(thing.no);
  return {
    isLine: false,
    tag: upper(t("af.thing.fact", { name: o.name, n: thing.no })),
    body: o.sleep ? t("af.sleepTalk", { fact: sleepTalk(fact.text) }) : fact.text,
    foot: upper(fact.foot),
    ...words,
  };
}

/** The receipt's rows. A count of nothing written back is printed (it is a count); "stayed on" only when the timer saw it. */
export function receiptRows(totals: Totals, fmt: AfterFormat): AfterRow[] {
  const { t, upper } = fmt;
  const rows: AfterRow[] = [
    { id: "read", label: upper(t("af.rc.read")), value: String(totals.read), strong: false, unshared: false },
    { id: "replied", label: upper(t("af.rc.replied")), value: String(totals.replied), strong: false, unshared: false },
  ];
  const stay = totals.stay ? topic(totals.stay, fmt) : "";
  if (totals.stay && stay) rows.push({ id: "stay", label: upper(t("af.rc.stay")), value: stay, strong: false, unshared: fmt.isOwnWords(totals.stay) });
  return rows;
}

export function buildAfterView(f: AfterFacts, fmt: AfterFormat): AfterVM {
  const { t, upper } = fmt;
  const { today, name } = f;
  const morning = fmt.clockHour(MORNING_HOUR);
  const countdown = fmt.countdown(untilMorning(f.now));
  const backIn = upper(t("cod.nextPost", { name }));
  const read = Math.max(1, f.read);

  const thing = buildThing(today.thing, { name, kept: today.kept != null, sleep: today.page === "bedtime" }, fmt);

  // the receipt
  const rows = receiptRows(f.totals, fmt);
  const delivery: AfterRow[] = [
    { id: "next", label: upper(t("af.rc.next")), value: morning, strong: false, unshared: false },
    { id: "back", label: backIn, value: countdown, strong: true, unshared: false },
  ];
  const courier = upper(t("af.rc.courier", { name }));
  const span = f.totals.from === f.totals.to ? fmt.dayMark(f.totals.to) : `${fmt.dayMark(f.totals.from)} – ${fmt.dayMark(f.totals.to)}`;
  const stampLine = f.week ? `${span} · ${courier}` : `${fmt.stampTime(today.doneAt)} · ${courier}`;
  const spoken = [...rows, ...delivery].map((r) => `${r.label}, ${r.value}`).join(". ");

  // bedtime's streak: today counts already (the desk is finished), so before lights out the bar
  // says the days up to yesterday and what tonight makes
  const run = Math.max(1, streakRun(f.days, today.day));
  const before = run - 1;
  const streak = before === 0 ? t("af.bed.streak.0") : count(t, "af.bed.streak", before);
  const streakSub = t("af.bed.makes", { n: run });
  const streakDone = count(t, "af.bed.streak", run);
  // "a full week" is said once, at seven; a longer run goes back to "see you at 8"
  const streakSubDone = run === 7 ? t("af.bed.week") : t("af.bed.seeYou", { t: morning });

  return {
    page: today.page,
    title: f.title,
    thing,
    strip: f.canPlay
      ? { canPlay: true, eyebrow: upper(t("af.strip.eyebrow", { name })), title: t("win.fly", { name }), hint: t("af.strip.hint") }
      : { canPlay: false, eyebrow: "", title: `${backIn} ${countdown}`, hint: "" },
    sky: afterSky(f.now),
    box: {
      line: count(t, "af.box.say", read),
      sub: f.replied > 0 ? count(t, "wl.replied", f.replied) : "",
      hint: upper(t("af.box.hint")),
      pinned: t("af.box.pinned"),
      slot: upper(t("af.box.slot")),
      slotOpening: upper(t("af.box.slotOpening")),
      slotA11y: t("pub.letter"),
      eyebrow: t("cod.wholePost"),
      closed: t("af.box.closed"),
      back: upper(t("af.box.back", { t: morning })),
      countdown,
      pull: upper(t("af.box.pull")),
      lift: upper(t("af.box.lift")),
      pullA11y: t("af.box.pull.a11y"),
      liftA11y: t("af.box.lift.a11y"),
      shut: today.shut,
    },
    receipt: {
      line: f.week ? t("af.rc.say.week") : count(t, "af.rc.say", read),
      shop: upper(t("af.rc.shop")),
      stampLine,
      rows,
      delivery,
      print: f.week ? t("af.rc.print.week") : t("af.rc.print.day"),
      printing: upper(t("af.rc.printing")),
      tear: t("af.rc.tear"),
      share: f.week ? t("af.rc.share.week") : t("af.rc.share.day"),
      phase: today.receipt,
      a11y: `${t("af.rc.a11y")}. ${spoken}. ${thing.tag}. ${thing.body}`,
    },
    bed: {
      sayIdle: count(t, "af.bed.say.idle", read),
      sayFed: count(t, "af.bed.say.fed", read),
      sayFull: t("af.bed.say.full"),
      sayPat: f.replied === 0 ? t("af.bed.say.pat.0") : count(t, "af.bed.say.pat", f.replied),
      sayNeedSnack: t("af.bed.say.needSnack"),
      sayNeedPat: t("af.bed.say.needPat"),
      snack: { label: t("af.bed.snack"), sub: t("af.bed.snack.sub"), subDone: t("af.bed.snack.done") },
      pat: { label: t("af.bed.pat"), sub: t("af.bed.pat.sub"), subDone: t("af.bed.pat.done") },
      lights: { label: t("af.bed.lights"), sub: t("af.bed.lights.sub"), subDone: t("af.bed.lights.done") },
      lockedSub: t("af.bed.locked"),
      sleepTag: upper(t("af.bed.sleepTag", { name })),
      streak,
      streakSub,
      streakDone,
      streakSubDone,
      next: t("af.bed.next"),
      nextAt: morning,
      dots: streakDots(f.days, today.day).map((d) => ({ id: d.key, letter: fmt.weekdayLetter(d.weekday), on: d.on, tonight: d.tonight })),
      dotsA11y: `${streak}. ${streakSub}. ${t("af.bed.next")} ${morning}`,
      dotsA11yDone: `${streakDone}. ${streakSubDone}. ${t("af.bed.next")} ${morning}`,
      birdA11y: t("af.bed.bird.a11y", { name }),
      fed: today.fed,
      patted: today.pat,
      asleep: today.asleep,
    },
    undo: f.undo,
    undoHint: f.undoHint,
  };
}
