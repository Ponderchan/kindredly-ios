import { OPENING_MIN, weightedCount } from "../../lib/weighted-count";
import { zodiacOf, type Zodiac } from "../../lib/zodiac";
import type { PronounId } from "../../lib/pronouns";

/* THE NEW ONBOARDING'S RUN, AS A MODEL (storyboard 2026-10-18, "The egg is yours, and the
   envelope is you"; .claude/onboarding-story/final/storyboard.md).
   ────────────────────────────────────────────────────────────────────────
   Everything the run DECIDES lives here, pure, so plain node can lock it
   (src/screens/onboarding/flow.test.ts): the thirteen screens and their four
   side states, their order, which screens a given person walks, back and skip,
   the 18+ gate, where the anonymous session is made, how a run resumes after
   the app was killed, and what finish() hands the account. The screens only
   draw and report; the runner (Onboarding2.tsx) only carries out what a move
   here returns. Nothing in this file touches a network, a store or React.

     1 doorstep   the owner's showcase: three live slides, "Hatch my courier",
                  "Been here before? Sign in" (side state 1a: the sign-in sheet)
     2 egg        your shell, which leaves a birthmark
     3 birthday   the 18+ gate (side state 3x: under 18, the end of the road)
     4 pronoun    she, he or they ("Skip, say they")
     5 face       a library face, for kindreds only ("Later")
     6 envelope   "This is you, to a stranger": your frost window, your courier
                  name, ♀/♂ and the star sign, with the two switches
     7 letter     the first letter, at least OPENING_MIN weighted characters
     8 stamp      the first stamp (side state 8a: today's tray of 36)
     9 hatch      the egg reads you and hatches; Post Blue floods to Shell
    10 name       its name and pronoun
    11 address    "Where should replies find you?" (side state 11a: the email
                  code) — or "Not now, keep it on this phone", the guest
    12 flight     the letter is POSTED as the flight starts
    13 knock      the bird asks, once, whether it may knock

   WHO WALKS WHAT (§1a, §9). Everyone starts without an account: the run IS
   the guest run until 11. A real account that signs in on 1a and has finished
   onboarding leaves for Today; one that never finished (made on the web, say)
   starts on 2, skips every screen whose answer the account already has (a
   birthday skips 3, a pronoun 4, a face 5) and skips 11. A guest who already
   finished on this phone goes to Today. 13 is skipped when iOS already lets
   Kindredly knock.

   THE GATE (§9). Nothing on 1 or 2 makes an account of any kind. The wheel on
   3 starts on the current year, so the key stays dim until it is turned (the
   old screen started twenty years back and passed untouched). Under 18 is the
   3x state: the egg goes still, there is no way on and no way back, and the
   block is remembered on the device. 18 or over: the anonymous session is
   made right then — the earliest moment anything needs a user id (the frost
   window and the courier name on 6). If 3 is passed and someone comes back to
   it and answers under 18, the block falls and an anonymous session this run
   made is dropped (signed out on the phone); nothing was posted yet.

   RESUME (§9). The draft is written on every change; a killed app comes back
   to the same screen with every answer, the letter included. A screen the
   draft no longer qualifies for (the session is gone, the letter is short) is
   walked back to the screen that fixes it. The letter is posted exactly once:
   `posted` is set in the same move that arrives on 12, before any network, so
   a kill during the flight resumes on 13 rather than posting twice (a lost
   letter is the rarer, smaller harm than a doubled one).

   WHAT finish() GETS (finishPayload): the profile (dob, pronoun, showMark,
   showSign, avatarId, firstLine), the bird (shell, name, pronoun) and the
   letter (text, stamp, language). NO pen name: since 2026-10-18 it is typed
   and hand-signed on the signing sheet at the first trade (identity Phase 2).
   Both switches are always saved as booleans (lib edit-profile-model: a
   missing showMark reads as off), and the mark is never saved on for they.

   Imports: weighted-count and zodiac (both pure); the pronoun is a type. */

/* ── the screens ─────────────────────────────────────────────────────────── */

/** The thirteen screens, in the order they are walked. */
export const SCREENS = ["doorstep", "egg", "birthday", "pronoun", "face", "envelope", "letter", "stamp", "hatch", "name", "address", "flight", "knock"] as const;
export type ScreenId = (typeof SCREENS)[number];

/** The storyboard's number for each screen (1–13). */
export const SCREEN_NO: Readonly<Record<ScreenId, number>> = Object.freeze(
  Object.fromEntries(SCREENS.map((s, i) => [s, i + 1])) as Record<ScreenId, number>,
);

/** The side states: drawn over (or instead of the body of) one screen, never a step of their own. */
export type SideId = "signin" | "underage" | "tray" | "code";
export const SIDES: readonly SideId[] = ["signin", "underage", "tray", "code"];
/** The screen each side state belongs to. */
export const SIDE_HOME: Readonly<Record<SideId, ScreenId>> = { signin: "doorstep", underage: "birthday", tray: "stamp", code: "address" };
/** The storyboard's name for each side state. */
export const SIDE_NO: Readonly<Record<SideId, string>> = { signin: "1a", underage: "3x", tray: "8a", code: "11a" };

export const isScreen = (x: unknown): x is ScreenId => typeof x === "string" && (SCREENS as readonly string[]).includes(x);
export const isSide = (x: unknown): x is SideId => typeof x === "string" && (SIDES as readonly string[]).includes(x);

/** "1".."13", or the side state's "1a" / "3x" / "8a" / "11a". */
export function labelOf(screen: ScreenId, side: SideId | null = null): string {
  return side ? SIDE_NO[side] : String(SCREEN_NO[screen]);
}

/** Look a screen up by its number or name (the dev entry's jump chips, deep links). */
export function screenFrom(x: string | number | null | undefined): ScreenId | null {
  if (x == null) return null;
  if (isScreen(x)) return x;
  const n = typeof x === "number" ? x : Number(x);
  return Number.isInteger(n) && n >= 1 && n <= SCREENS.length ? SCREENS[n - 1] : null;
}

/* ── the ground under each screen (§3) ───────────────────────────────────── */

/** Post Blue before the hatch, paper for the letter (you are inside the envelope), Shell after the crack. */
export type Ground = "blue" | "paper" | "shell";

/** The ground a screen stands on. 9 is blue until the shell cracks (`born`), then Shell. */
export function groundOf(screen: ScreenId, draft?: Pick<ObDraft, "born"> | null): Ground {
  switch (screen) {
    case "letter":
      return "paper";
    case "hatch":
      return draft?.born ? "shell" : "blue";
    case "name":
    case "address":
    case "flight":
    case "knock":
      return "shell";
    default:
      return "blue";
  }
}

/** The status bar's text on a ground: light on Post Blue, dark on paper and Shell. */
export const barOf = (g: Ground): "light" | "dark" => (g === "blue" ? "light" : "dark");

/* ── the egg on 2–8 (§6) ─────────────────────────────────────────────────── */

/**
 * Where the egg is on a screen: the hero on 2 (and 9, where HatchStage draws it),
 * the nest spot at the top on 3–6 and 8 (the runner keeps ONE egg there across
 * those screens, so it never remounts), the flap's point on 7 (the screen's own
 * FeedEgg), nowhere on 1 (the pager egg is the doorstep's) and after the hatch.
 */
export type EggPlace = "hero" | "nest" | "flap" | null;
export function eggPlace(screen: ScreenId): EggPlace {
  if (screen === "egg" || screen === "hatch") return "hero";
  if (screen === "birthday" || screen === "pronoun" || screen === "face" || screen === "envelope" || screen === "stamp") return "nest";
  if (screen === "letter") return "flap";
  return null;
}

/** The four warmth pips replace the progress bar: passing 3, 4, 5 and 6 each lights one. */
export const PIP_SCREENS: readonly ScreenId[] = ["birthday", "pronoun", "face", "envelope"];

/** How many pips are lit while this screen shows (0 on 3, 3 on 6, all four from 7). */
export function pipsLit(screen: ScreenId): number {
  const i = SCREENS.indexOf(screen);
  const first = SCREENS.indexOf("birthday");
  if (i <= first) return 0;
  return Math.min(PIP_SCREENS.length, i - first);
}

/** The egg's one voice line per screen (strings-onboarding2: "ob2.voice.<screen>"); null where it is silent. */
export function voiceKey(screen: ScreenId): string | null {
  switch (screen) {
    case "egg":
    case "birthday":
    case "pronoun":
    case "face":
    case "envelope":
    case "letter":
    case "stamp":
      return `ob2.voice.${screen}`;
    default:
      return null;
  }
}

/* ── the birthday and the gate (§6 · 3, §9) ──────────────────────────────── */

/** A birthday as the wheel holds it: m is 0–11 (the wheel's row), d 1–31. */
export type Dob = { y: number; m: number; d: number };
/** A calendar day, the same shape (m 0–11), for "today". */
export type Day = Dob;

export const ADULT_AGE = 18;
/** How many years the wheel offers, the current year first. */
export const WHEEL_YEARS = 100;

export const dayOf = (d: Date): Day => ({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() });

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Is this a real calendar day? (31 April and 30 February are not; 29 February only in a leap year.) */
export function validDob(b: Dob | null | undefined): b is Dob {
  if (!b || !Number.isInteger(b.y) || !Number.isInteger(b.m) || !Number.isInteger(b.d)) return false;
  if (b.m < 0 || b.m > 11 || b.d < 1) return false;
  if (b.m === 1 && b.d === 29) return leap(b.y);
  return b.d <= MONTH_DAYS[b.m];
}

/** The wheel may hold 31 February while it spins; this is the day it means (the month's last). */
export function clampDob(b: Dob): Dob {
  const last = b.m === 1 ? (leap(b.y) ? 29 : 28) : MONTH_DAYS[b.m];
  return { y: b.y, m: b.m, d: Math.max(1, Math.min(b.d, last)) };
}

/** "YYYY-MM-DD", the way the account stores it (user_metadata.dob). */
export function dobString(b: Dob): string {
  return `${b.y}-${String(b.m + 1).padStart(2, "0")}-${String(b.d).padStart(2, "0")}`;
}

/** The account's "YYYY-MM-DD" back into the wheel's shape; null for none or junk. */
export function parseDob(s: string | null | undefined): Dob | null {
  const hit = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === "string" ? s.trim() : "");
  if (!hit) return null;
  const b = { y: Number(hit[1]), m: Number(hit[2]) - 1, d: Number(hit[3]) };
  return validDob(b) ? b : null;
}

/** Whole years old on `today`; a 29 February birthday turns a year older on 1 March in a common year. */
export function ageOn(b: Dob, today: Day): number {
  let age = today.y - b.y;
  if (today.m < b.m || (today.m === b.m && today.d < b.d)) age -= 1;
  return age;
}

export type Gate = "unanswered" | "adult" | "minor";

/**
 * The 18+ gate: nothing until a real date is set (no auto-pass), then adult or
 * minor. The wheel rests on the current year, and a birthday in the current
 * year (or later) is no one's answer — it is the wheel not yet turned — so it
 * reads as unanswered and the key stays dim, rather than blocking someone who
 * turned the month first and pressed Next (the block is for good).
 */
export function gate(b: Dob | null | undefined, today: Day): Gate {
  if (!validDob(b) || b.y >= today.y) return "unanswered";
  return ageOn(b, today) >= ADULT_AGE ? "adult" : "minor";
}

/** The years on the wheel, the current year first (so the key stays dim until it is turned). */
export function wheelYears(today: Day): number[] {
  return Array.from({ length: WHEEL_YEARS }, (_, i) => today.y - i);
}

/** Your star sign from the wheel (month and day only). */
export function signOf(b: Dob | null | undefined): Zodiac | null {
  return validDob(b) ? zodiacOf(b.m + 1, b.d) : null;
}

/* ── the letter (§6 · 7) ─────────────────────────────────────────────────── */

/** The first letter must travel: OPENING_MIN (20) weighted characters, the same floor as every opening letter. */
export const letterReady = (text: string): boolean => weightedCount(text.trim()) >= OPENING_MIN;
/** "{n} more to travel": how many weighted characters are still missing (0 once it travels). */
export const lettersLeft = (text: string): number => Math.max(0, OPENING_MIN - weightedCount(text.trim()));

/* ── who is here (the context) ───────────────────────────────────────────── */

/** No session at all, an anonymous session (a guest), or a real account. */
export type ObAccount = "none" | "guest" | "member";

/** Where iOS stands on notifications: allowed, never asked, refused (only Settings can change it), or not read yet. */
export type NotifState = "granted" | "ask" | "settings" | "unknown";

/** What a real account already knows about its owner (user_metadata), used to skip screens and fill answers. */
export type Known = {
  dob?: string | null;
  pronoun?: PronounId | null;
  avatarId?: string | null;
  showMark?: boolean | null;
  showSign?: boolean | null;
};

export type ObCtx = {
  account: ObAccount;
  /** the session's user id (null without a session) */
  uid: string | null;
  /** the profile's onboarded flag, or this phone's own note that this uid finished the new run */
  onboarded: boolean;
  /** the account's answers (members only; a guest's are in the draft) */
  known: Known;
  notif: NotifState;
  /** this device remembers an under-18 answer */
  blocked: boolean;
};

export const NO_ONE: ObCtx = Object.freeze({ account: "none", uid: null, onboarded: false, known: {}, notif: "unknown", blocked: false }) as ObCtx;

/* ── the draft: every answer, persisted on every change ──────────────────── */

/** How 11 ended: a provider linked onto the same user id, the guest's "Not now", or a switch to an account the provider already had. */
export type AddressChoice = "apple" | "google" | "email" | "guest" | "switched";

export type ObDraft = {
  v: 1;
  /** the screen showing (side states are not saved: 3x comes back from the device block) */
  screen: ScreenId;
  /** the user id this draft was made under, once there is one (a draft under another account is dropped) */
  uid: string | null;
  /** 2: the shell (EGG_SHELLS index, 0 = Moonstone) */
  shell: number;
  /** 3: the birthday, null until the wheel was turned */
  dob: Dob | null;
  /** 4: your pronoun, null until answered; "they" after "Skip, say they" */
  pronoun: PronounId | null;
  pronounSkipped: boolean;
  /** 5: the library face (FACES id), null for "Later" or not yet */
  avatarId: string | null;
  faceLater: boolean;
  /** 6: null = the default (the mark on for she/he; the sign on) */
  showMark: boolean | null;
  showSign: boolean | null;
  /** 7: the letter, and which cue the chip is dealing */
  letter: string;
  cue: number;
  /** 8: the stamp picked, null = the one suggested from the letter */
  stamp: string | null;
  /** 9: the shell cracked; the first word it said (first-word.ts), if any */
  born: boolean;
  firstWord: string | null;
  /** 10: its name and pronoun */
  wrenName: string;
  wrenPronoun: PronounId;
  /** 11: how replies find you; when the terms line was agreed to (the moment of first posting) */
  address: AddressChoice | null;
  termsAt: number | null;
  /** 12: finish() has been started (set before the network: at most one post) */
  posted: boolean;
  /** 13: the answer to "Want me to knock?" */
  knock: "yes" | "no" | null;
  /** the anonymous session was made by this run (3 passed with no session) */
  anonMade: boolean;
  startedAt: number;
  updatedAt: number;
};

export function freshDraft(now: number): ObDraft {
  return {
    v: 1,
    screen: "doorstep",
    uid: null,
    shell: 0,
    dob: null,
    pronoun: null,
    pronounSkipped: false,
    avatarId: null,
    faceLater: false,
    showMark: null,
    showSign: null,
    letter: "",
    cue: 0,
    stamp: null,
    born: false,
    firstWord: null,
    wrenName: "",
    wrenPronoun: "she",
    address: null,
    termsAt: null,
    posted: false,
    knock: null,
    anonMade: false,
    startedAt: now,
    updatedAt: now,
  };
}

const isPronoun = (x: unknown): x is PronounId => x === "she" || x === "he" || x === "they";

/**
 * Fill the draft from what a member's account already knows. The account's
 * birthday, pronoun and face WIN over the draft: their screens are skipped for a
 * member (knownSkips), so a value left in a draft from before the sign-in could
 * never be seen or confirmed, and saving it would silently overwrite the
 * account's own. The two switches only fill in where the draft has none (6 is
 * always shown, so the person sees them).
 */
export function seedFromKnown(draft: ObDraft, known: Known): ObDraft {
  const out = { ...draft };
  const kd = parseDob(known.dob);
  if (kd) out.dob = kd;
  if (isPronoun(known.pronoun)) out.pronoun = known.pronoun;
  if (typeof known.avatarId === "string" && known.avatarId) out.avatarId = known.avatarId;
  if (out.showMark === null && typeof known.showMark === "boolean") out.showMark = known.showMark;
  if (out.showSign === null && typeof known.showSign === "boolean") out.showSign = known.showSign;
  return out;
}

/* ── which screens this person walks ─────────────────────────────────────── */

/** A member's known answer skips its screen (the birthday only if it passes the gate). */
function knownSkips(screen: ScreenId, ctx: ObCtx, today: Day): boolean {
  if (ctx.account !== "member") return false;
  if (screen === "birthday") return gate(parseDob(ctx.known.dob), today) === "adult";
  if (screen === "pronoun") return isPronoun(ctx.known.pronoun);
  if (screen === "face") return typeof ctx.known.avatarId === "string" && !!ctx.known.avatarId;
  return false;
}

/** Is `screen` part of this person's run right now? */
export function inPath(screen: ScreenId, ctx: ObCtx, today: Day): boolean {
  if (screen === "doorstep") return ctx.account !== "member";
  if (screen === "address") return ctx.account !== "member";
  if (screen === "knock") return ctx.notif !== "granted";
  return !knownSkips(screen, ctx, today);
}

/** The screens this person walks, in order (the tracking index and the dev entry's map). */
export function pathFor(ctx: ObCtx, today: Day): ScreenId[] {
  return SCREENS.filter((s) => inPath(s, ctx, today));
}

/** The next screen in this person's run after `from`; null = the run is over (Today). */
export function nextScreen(from: ScreenId, ctx: ObCtx, today: Day): ScreenId | null {
  for (let i = SCREENS.indexOf(from) + 1; i < SCREENS.length; i++) if (inPath(SCREENS[i], ctx, today)) return SCREENS[i];
  return null;
}

/** Which screens have a back key (‹): 2–8. 1 has nowhere to go; from 9 on there's no climbing back into the shell. */
export const CAN_BACK: Readonly<Record<ScreenId, boolean>> = {
  doorstep: false,
  egg: true,
  birthday: true,
  pronoun: true,
  face: true,
  envelope: true,
  letter: true,
  stamp: true,
  hatch: false,
  name: false,
  address: false,
  flight: false,
  knock: false,
};

/** The screen ‹ goes to from `from` (the previous one in this person's run), or null. */
export function backScreen(from: ScreenId, ctx: ObCtx, today: Day): ScreenId | null {
  if (!CAN_BACK[from]) return null;
  for (let i = SCREENS.indexOf(from) - 1; i >= 0; i--) if (inPath(SCREENS[i], ctx, today)) return SCREENS[i];
  return null;
}

/** What each screen's text key does: 4 "Skip, say they", 5 "Later", 11 "Not now, keep it on this phone", 12 "TAP TO SKIP" (the animation only), 13 "Not now". */
export const SKIP_KIND: Readonly<Partial<Record<ScreenId, "they" | "later" | "guest" | "tap" | "notnow">>> = {
  pronoun: "they",
  face: "later",
  address: "guest",
  flight: "tap",
  knock: "notnow",
};

/* ── moves: what a key press does, and what the runner must carry out ────── */

/** What the runner carries out after a move, in order. */
export type Effect =
  /** make the anonymous session (3 passed with no session) */
  | { kind: "anon-session" }
  /** remember the under-18 answer on this device */
  | { kind: "remember-block" }
  /** sign out the anonymous session this run made (a passed gate re-answered under 18) */
  | { kind: "drop-session" }
  /** finish(): post the letter, save the profile and the bird — at the start of 12 */
  | { kind: "post" }
  /** iOS's one-time notification prompt ("Yes, knock" on 13, never asked before) */
  | { kind: "ask-notifications" }
  /** Kindredly's notification settings ("Yes, knock" on 13 after an earlier refusal) */
  | { kind: "open-notification-settings" }
  /** the run is over: the first-arrival flags (Today's ritual, the wardrobe slip), the draft cleared, Today */
  | { kind: "arrive" }
  /** nothing to do here (an onboarded account, a guest who finished on this phone): any stale draft
      cleared, straight to Today — NO first-arrival flags, so Today's ritual never replays */
  | { kind: "today" }
  /** track("ob2_step", { step, i }) — every screen arrived at, so drop-off is measured */
  | { kind: "track"; step: ScreenId; i: number };

export type Move = {
  draft: ObDraft;
  side: SideId | null;
  effects: Effect[];
  /** true when the run is over (the last effect is "arrive") */
  leave: boolean;
};

const stamp = (d: ObDraft, now: number): ObDraft => ({ ...d, updatedAt: now });

/** Straight to Today for someone who already finished onboarding (no run, no first-arrival flags). */
const toToday = (draft: ObDraft, now: number): Move => ({ draft: stamp(draft, now), side: null, effects: [{ kind: "today" }], leave: true });

/** Arrive on `to` (or leave when null — the run finished): the track effect, and the post when it is 12 and nothing was posted yet. */
function arrive(draft: ObDraft, to: ScreenId | null, ctx: ObCtx, today: Day, now: number, effects: Effect[] = []): Move {
  if (!to) return { draft: stamp(draft, now), side: null, effects: [...effects, { kind: "arrive" }], leave: true };
  let d: ObDraft = { ...draft, screen: to };
  const fx = [...effects];
  if (to === "flight" && !d.posted) {
    d = { ...d, posted: true };
    fx.push({ kind: "post" });
  }
  fx.push({ kind: "track", step: to, i: Math.max(0, pathFor(ctx, today).indexOf(to)) });
  return { draft: stamp(d, now), side: null, effects: fx, leave: false };
}

/** Can the primary key on the current screen be pressed? (Dim keys: 3 until the wheel is turned, 5 until a face, 6 until there is a session, 7 until 20, 10 until a name; 11 has no primary key of its own.) */
export function canAdvance(draft: ObDraft, ctx: ObCtx, today: Day): boolean {
  switch (draft.screen) {
    case "birthday":
      return gate(draft.dob, today) !== "unanswered";
    case "pronoun":
      return draft.pronoun !== null;
    case "face":
      return !!draft.avatarId;
    case "envelope":
      // the frost window and the courier name come from the uid: 6 waits for the session
      // ("Your courier is thinking of a name…") rather than going on without one
      return ctx.account !== "none";
    case "letter":
    case "stamp":
      return letterReady(draft.letter);
    case "hatch":
      return draft.born;
    case "name": {
      const n = draft.wrenName.trim();
      return n.length > 0 && n.toLowerCase() !== "wren";
    }
    case "address":
      return draft.address !== null;
    case "flight":
      return draft.posted;
    default:
      // 13's primary key IS "Yes, knock" (advance sets it), so it is never dim
      return true;
  }
}

/**
 * The primary key on the current screen (or the screen moving on by itself: 4's
 * one tap, 8's stamp after its thunk, 12's landing). Not ready → the draft as it
 * was, no effects. 3 is the gate: adult → on, with the anonymous session if there
 * is none; minor → 3x, the block, and (if this run made one) the session dropped.
 */
export function advance(draft: ObDraft, ctx: ObCtx, now: number): Move {
  const today = dayOf(new Date(now));
  if (ctx.blocked) return { draft, side: "underage", effects: [], leave: false };
  if (!canAdvance(draft, ctx, today)) return { draft, side: null, effects: [], leave: false };
  const here = draft.screen;
  if (here === "birthday") {
    const g = gate(draft.dob, today);
    if (g === "minor") {
      const fx: Effect[] = [{ kind: "remember-block" }];
      if (ctx.account === "guest") fx.push({ kind: "drop-session" });
      return { draft: stamp({ ...draft, anonMade: false }, now), side: "underage", effects: fx, leave: false };
    }
    const fx: Effect[] = [];
    let d = draft;
    if (ctx.account === "none") {
      fx.push({ kind: "anon-session" });
      d = { ...d, anonMade: true };
    }
    return arrive(d, nextScreen(here, ctx, today), ctx, today, now, fx);
  }
  if (here === "knock") {
    // the primary key is "Yes, knock": pressing it is the yes ("Not now" is skip)
    const d = draft.knock === null ? { ...draft, knock: "yes" as const } : draft;
    const fx: Effect[] = [];
    if (d.knock === "yes") fx.push(ctx.notif === "settings" ? { kind: "open-notification-settings" } : { kind: "ask-notifications" });
    return arrive(d, null, ctx, today, now, fx);
  }
  return arrive(draft, nextScreen(here, ctx, today), ctx, today, now);
}

/** The current screen's text key (SKIP_KIND). A screen without one: no move. */
export function skip(draft: ObDraft, ctx: ObCtx, now: number): Move {
  const today = dayOf(new Date(now));
  const here = draft.screen;
  switch (SKIP_KIND[here]) {
    case "they":
      // no mark for they (finishPayload never saves it on); showMark is left as it was, so
      // coming back and picking she/he finds the switch's default again
      return arrive({ ...draft, pronoun: "they", pronounSkipped: true }, nextScreen(here, ctx, today), ctx, today, now);
    case "later":
      return arrive({ ...draft, avatarId: null, faceLater: true }, nextScreen(here, ctx, today), ctx, today, now);
    case "guest":
      return arrive({ ...draft, address: "guest", termsAt: now }, nextScreen(here, ctx, today), ctx, today, now);
    case "notnow":
      return arrive({ ...draft, knock: "no" }, null, ctx, today, now);
    default:
      // "tap" on 12 skips the animation, which is the screen's own business
      return { draft, side: null, effects: [], leave: false };
  }
}

/** ‹ on the current screen; null where there is no back (1, 9–13, 3x, a member's first screen). The draft keeps every answer. */
export function back(draft: ObDraft, ctx: ObCtx, now: number): Move | null {
  if (ctx.blocked) return null;
  const today = dayOf(new Date(now));
  const to = backScreen(draft.screen, ctx, today);
  if (!to) return null;
  return { draft: stamp({ ...draft, screen: to }, now), side: null, effects: [{ kind: "track", step: to, i: Math.max(0, pathFor(ctx, today).indexOf(to)) }], leave: false };
}

/**
 * After a sign-in on 1a (ctx is the context AFTER it): an account that finished
 * onboarding leaves for Today; one that never did starts on 2 with its known
 * answers filled in (and skips the screens they answer, and 11).
 */
export function signedIn(draft: ObDraft, ctx: ObCtx, now: number): Move {
  const today = dayOf(new Date(now));
  if (ctx.onboarded) return toToday(draft, now);
  const d = seedFromKnown({ ...draft, uid: ctx.uid }, ctx.known);
  if (gate(parseDob(ctx.known.dob), today) === "minor") return { draft: stamp({ ...d, screen: "birthday" }, now), side: "underage", effects: [{ kind: "remember-block" }], leave: false };
  return arrive(d, nextScreen("doorstep", ctx, today), ctx, today, now);
}

/**
 * How 11 ended (ctx is the context AFTER it: a member when a provider linked or
 * the switch happened). The terms line on 11 covers every choice, so it is agreed
 * to here, at the moment of first posting; then 12, which posts.
 */
export function addressDone(draft: ObDraft, choice: AddressChoice, ctx: ObCtx, now: number): Move {
  const today = dayOf(new Date(now));
  const d = { ...draft, address: choice, termsAt: now, uid: ctx.uid ?? draft.uid };
  return arrive(d, nextScreen("address", ctx, today) ?? "flight", ctx, today, now);
}

/** DEV ONLY (the dev entry's chips): put the run on any screen or side state, keeping the draft. */
export function jump(draft: ObDraft, to: ScreenId, side: SideId | null, now: number): Move {
  return { draft: stamp({ ...draft, screen: to }, now), side: side && SIDE_HOME[side] === to ? side : null, effects: [], leave: false };
}

/* ── entering the run: fresh, resumed, or straight to Today ──────────────── */

/**
 * Where a person lands when the onboarding route opens. Leaves for Today when a
 * session that finished onboarding is here (a member, or a guest who finished
 * on this phone). A blocked device lands on 3x. A saved draft resumes on its
 * screen (walked back to the screen that fixes whatever it no longer qualifies
 * for); a member who never finished starts on 2; everyone else on 1.
 */
export function enter(ctx: ObCtx, saved: ObDraft | null, now: number): Move {
  const today = dayOf(new Date(now));
  if (ctx.account !== "none" && ctx.onboarded) {
    /* finish() marks the account onboarded while 12 is still flying, so a kill on 12 or 13
       comes back onboarded with this run's draft still here (arrive clears it): finish the
       run — 13, then Today's first arrival — instead of skipping both */
    if (saved && saved.posted && saved.uid && saved.uid === ctx.uid) return arrive(saved, resumeScreen(saved, ctx, today), ctx, today, now);
    return toToday(saved ?? freshDraft(now), now);
  }
  if (ctx.blocked) return { draft: { ...(saved ?? freshDraft(now)), screen: "birthday" }, side: "underage", effects: [], leave: false };

  /* a draft made under another account is not this person's — and nor is one whose letter was
     already posted under a uid that isn't this session's. 12 posts under the session it began
     with; a MEMBER killed during the flight goes straight to Today on the next launch (app/index
     sends an onboarded account there, never through this route), so that draft is never cleared.
     Signed out later, the next person on this phone (no session: no uid to compare) must start
     fresh, not land on that member's 13 with that member's letter. */
  const posted = !!saved && saved.posted && !!saved.uid && saved.uid !== ctx.uid;
  const own = saved && !posted && (!saved.uid || !ctx.uid || saved.uid === ctx.uid) ? saved : null;
  let d: ObDraft = own ? { ...own } : freshDraft(now);
  if (ctx.uid && !d.uid && ctx.account !== "none") d.uid = ctx.uid;
  if (ctx.account === "member") d = seedFromKnown(d, ctx.known);
  if (ctx.account === "member" && gate(parseDob(ctx.known.dob), today) === "minor") return { draft: { ...d, screen: "birthday" }, side: "underage", effects: [{ kind: "remember-block" }], leave: false };

  if (!own) return arrive(d, ctx.account === "member" ? nextScreen("doorstep", ctx, today) : "doorstep", ctx, today, now);
  return arrive(d, resumeScreen(d, ctx, today), ctx, today, now);
}

/** The screen a saved draft can actually resume on (see enter). */
export function resumeScreen(d: ObDraft, ctx: ObCtx, today: Day): ScreenId | null {
  const at = SCREENS.indexOf(d.screen);
  const past = (s: ScreenId) => at > SCREENS.indexOf(s);
  // 12 started: the letter went (or was lost); the flight isn't replayed — 13, or Today
  if (d.posted) return d.screen === "knock" && inPath("knock", ctx, today) ? "knock" : nextScreen("flight", ctx, today);
  // past the gate: it must still pass, and there must be a session (or the gate makes one again)
  if (past("birthday") && (gate(d.dob, today) !== "adult" || ctx.account === "none")) return inPath("birthday", ctx, today) ? "birthday" : firstOf(ctx, today);
  // past the letter: it must still travel
  if (past("letter") && !letterReady(d.letter)) return "letter";
  // past the hatch: it must have hatched
  if (past("hatch") && !d.born) return "hatch";
  // a screen this person no longer walks (11 after the account arrived, a known answer): the next one
  if (!inPath(d.screen, ctx, today)) return nextScreen(d.screen, ctx, today) ?? "flight";
  return d.screen;
}

const firstOf = (ctx: ObCtx, today: Day): ScreenId => pathFor(ctx, today)[0] ?? "egg";

/* ── finish() ────────────────────────────────────────────────────────────── */

export type FinishPayload = {
  /** "switched": 11 moved to an account the provider already had; that account's own bird carries the letter */
  mode: "new" | "switched";
  /** what saveProfile gets: NO handle / pen name */
  profile: {
    dob: string | null;
    pronoun: PronounId;
    showMark: boolean;
    showSign: boolean;
    avatarId: string | null;
    firstLine: string;
  };
  /** the bird: shell (the birthmark), name, pronoun; null when the switched-to account already has one */
  wren: { shell: number; name: string; pronoun: PronounId } | null;
  /** the letter that flies; null only if it somehow doesn't travel (it never posts short) */
  letter: { text: string; stamp: string; lang: string } | null;
};

/**
 * What finish() saves and posts. `suggestedStamp` is the one the letter suggests
 * (8: draft.stamp null keeps it). For a switch to an account that already
 * finished onboarding, that account's own answers win and its bird stays.
 */
export function finishPayload(draft: ObDraft, ctx: ObCtx, extras: { lang: string; suggestedStamp: string }): FinishPayload {
  const switched = draft.address === "switched";
  const keepAccount = switched && ctx.onboarded;
  const k = ctx.known;
  const pronoun: PronounId = keepAccount && isPronoun(k.pronoun) ? k.pronoun : draft.pronoun ?? "they";
  const markOffered = pronoun === "she" || pronoun === "he";
  const mark = keepAccount && typeof k.showMark === "boolean" ? k.showMark : draft.showMark ?? true;
  const sign = keepAccount && typeof k.showSign === "boolean" ? k.showSign : draft.showSign ?? true;
  const accountDob = parseDob(k.dob) ? (k.dob as string) : null;
  const dob = keepAccount && accountDob ? accountDob : draft.dob ? dobString(draft.dob) : accountDob;
  const text = draft.letter.trim();
  return {
    mode: switched ? "switched" : "new",
    profile: {
      dob,
      pronoun,
      showMark: markOffered && mark,
      showSign: sign,
      avatarId: keepAccount && k.avatarId ? k.avatarId : draft.avatarId,
      firstLine: text,
    },
    wren: keepAccount ? null : { shell: draft.shell, name: draft.wrenName.trim(), pronoun: draft.wrenPronoun },
    letter: letterReady(text) ? { text, stamp: draft.stamp || extras.suggestedStamp || "off-chest", lang: extras.lang || "en" } : null,
  };
}

/* ── what is collected where (§5; the contract's table, locked by the tests) ── */

export const COLLECTS: Readonly<Record<ScreenId, readonly (keyof ObDraft)[]>> = {
  doorstep: [],
  egg: ["shell"],
  birthday: ["dob"],
  pronoun: ["pronoun", "pronounSkipped"],
  face: ["avatarId", "faceLater"],
  envelope: ["showMark", "showSign"],
  letter: ["letter", "cue"],
  stamp: ["stamp"],
  hatch: ["born", "firstWord"],
  name: ["wrenName", "wrenPronoun"],
  address: ["address", "termsAt"],
  flight: ["posted"],
  knock: ["knock"],
};

/* ── the draft on disk ───────────────────────────────────────────────────── */

export const serializeDraft = (d: ObDraft): string => JSON.stringify(d);

/** A saved draft back, defensively: anything malformed is dropped field by field (never a throw); null for junk or another version. */
export function parseDraft(raw: string | null | undefined): ObDraft | null {
  if (!raw) return null;
  let o: any;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== "object" || o.v !== 1 || !isScreen(o.screen)) return null;
  const base = freshDraft(typeof o.startedAt === "number" ? o.startedAt : 0);
  const str = (x: unknown, dflt: string) => (typeof x === "string" ? x : dflt);
  const bool = (x: unknown, dflt: boolean) => (typeof x === "boolean" ? x : dflt);
  const boolOrNull = (x: unknown) => (typeof x === "boolean" ? x : null);
  const dob = o.dob && validDob(o.dob) ? { y: o.dob.y, m: o.dob.m, d: o.dob.d } : null;
  return {
    ...base,
    screen: o.screen,
    uid: typeof o.uid === "string" ? o.uid : null,
    shell: Number.isInteger(o.shell) && o.shell >= 0 && o.shell < 4 ? o.shell : 0,
    dob,
    pronoun: isPronoun(o.pronoun) ? o.pronoun : null,
    pronounSkipped: bool(o.pronounSkipped, false),
    avatarId: typeof o.avatarId === "string" && o.avatarId ? o.avatarId : null,
    faceLater: bool(o.faceLater, false),
    showMark: boolOrNull(o.showMark),
    showSign: boolOrNull(o.showSign),
    letter: str(o.letter, ""),
    cue: Number.isInteger(o.cue) && o.cue >= 0 ? o.cue : 0,
    stamp: typeof o.stamp === "string" && o.stamp ? o.stamp : null,
    born: bool(o.born, false),
    firstWord: typeof o.firstWord === "string" ? o.firstWord : null,
    wrenName: str(o.wrenName, ""),
    wrenPronoun: isPronoun(o.wrenPronoun) ? o.wrenPronoun : "she",
    address: o.address === "apple" || o.address === "google" || o.address === "email" || o.address === "guest" || o.address === "switched" ? o.address : null,
    termsAt: typeof o.termsAt === "number" ? o.termsAt : null,
    posted: bool(o.posted, false),
    knock: o.knock === "yes" || o.knock === "no" ? o.knock : null,
    anonMade: bool(o.anonMade, false),
    updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : 0,
  };
}
