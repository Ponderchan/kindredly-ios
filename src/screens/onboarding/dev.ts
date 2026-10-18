import { NO_ONE, SCREENS, freshDraft, letterReady, type NotifState, type ObCtx, type ObDraft, type ScreenId, type SideId } from "./flow";

/* DEV ONLY — THE NEW ONBOARDING'S DEMO MODE AND THE DEV ENTRY'S SETTINGS.
   ────────────────────────────────────────────────────────────────────────
   A GUEST WHO FINISHES THE FIRST FLIGHT POSTS A REAL LETTER, and a run on the
   simulator is otherwise a real run: an anonymous user made on 3, Apple or
   Google linked on 11, iOS's one-time notification prompt spent on 13. So
   the run has a DEMO mode, and in a dev build it is ON BY DEFAULT — whether
   the run was opened from the dev entry (kindredly:///dev/onboarding2) or by
   the identity switch's own route. In demo:
     · posting is stubbed: finish() records its payload here (the dev entry
       shows it) and nothing reaches the server;
     · no session is made, linked, switched or dropped: the run's "who is
       here" is the dev entry's variant, and the stubs move it (3 passed → a
       guest with a made-up uid; 11 → a member);
     · the notification prompt is never asked: "Yes, knock" is logged;
     · the profile, the bird, the flags and Today's pool cache are not
       written (they'd land on whatever account the simulator holds);
     · the draft and the under-18 block use their own keys;
     · the end goes back to the dev entry instead of Today.
   Only the dev entry's DEMO switch turns it off, for this run of the app;
   a release build is never in demo (demoOn() is false there, whatever this
   says). Nothing here is saved. */

/** Who the demo run pretends is here. */
export type DevVariant = "fresh" | "guest-mid" | "member-new" | "member-onboarded" | "guest-onboarded";

export type DevConfig = {
  /** stub posting, sessions, linking and the notification prompt (default ON) */
  demo: boolean;
  variant: DevVariant;
  /** what iOS says about notifications, in demo */
  notif: NotifState;
  /** the phone remembers an under-18 answer, in demo */
  blocked: boolean;
  /** what a sign-in on 1a finds, in demo */
  signInAs: "new" | "onboarded";
  /** 11: the address already belongs to another account ("Switch to it?"), in demo */
  addressExists: boolean;
};

const DEFAULTS: DevConfig = { demo: true, variant: "fresh", notif: "ask", blocked: false, signInAs: "new", addressExists: false };

/* the dev state lives on globalThis, so a Fast Refresh that re-runs this module (any edit to
   flow.ts does) doesn't quietly reset the variant — or turn DEMO back on/off — under a page
   that still shows the old choice */
export type DevStart = { screen: ScreenId; side: SideId | null; seed: boolean };
type DevState = { cfg: DevConfig; start: DevStart | null; log: string[]; payload: unknown };
const G = globalThis as unknown as { __kindredlyOb2Dev?: DevState };
const st: DevState = (G.__kindredlyOb2Dev ??= { cfg: { ...DEFAULTS }, start: null, log: [], payload: null });

export function devConfig(): DevConfig {
  return st.cfg;
}
export function setDevConfig(patch: Partial<DevConfig>): DevConfig {
  if (!__DEV__) return st.cfg;
  st.cfg = { ...st.cfg, ...patch };
  return st.cfg;
}

/** Is the run in demo? Dev builds: the dev entry's switch (on unless turned off). Release: never. */
export function demoOn(): boolean {
  return __DEV__ && st.cfg.demo;
}

/* ── where the next run opens (the jump chips) ── */

/** The dev entry asks the next run to open on a screen (and side state); `seed` fills what that screen needs. */
export function setDevStart(s: DevStart | null): void {
  if (__DEV__) st.start = s;
}
/** Read once by the run as it opens. */
export function takeDevStart(): DevStart | null {
  const s = st.start;
  st.start = null;
  return __DEV__ ? s : null;
}

/* ── the demo's who-is-here ── */

export const DEMO_UID = "00000000-0000-4000-8000-00000000d3e0";
export const DEMO_MEMBER_UID = "00000000-0000-4000-8000-0000000a11ce";

/** The context a demo run starts with, from the variant. */
export function demoContext(c: DevConfig = st.cfg): ObCtx {
  const base: ObCtx = { ...NO_ONE, notif: c.notif, blocked: c.blocked };
  switch (c.variant) {
    case "guest-mid":
      return { ...base, account: "guest", uid: DEMO_UID };
    case "member-new":
      return { ...base, account: "member", uid: DEMO_MEMBER_UID, known: { dob: "1996-06-14", pronoun: "she" } };
    case "member-onboarded":
      return { ...base, account: "member", uid: DEMO_MEMBER_UID, onboarded: true };
    case "guest-onboarded":
      return { ...base, account: "guest", uid: DEMO_UID, onboarded: true };
    default:
      return base;
  }
}

/** What a demo sign-in on 1a (or a switch on 11) finds. */
export function demoMember(c: DevConfig = st.cfg): Pick<ObCtx, "account" | "uid" | "onboarded" | "known"> {
  return c.signInAs === "onboarded"
    ? { account: "member", uid: DEMO_MEMBER_UID, onboarded: true, known: { dob: "1990-02-11", pronoun: "he", showMark: false, showSign: true } }
    : { account: "member", uid: DEMO_MEMBER_UID, onboarded: false, known: { dob: "1994-09-03" } };
}

/** The sample letter a seeded jump writes (the storyboard's own). */
export const SAMPLE_LETTER = "typed \"proud of you\" to my sister four times and deleted it every time. we don't really say stuff like that in my family. maybe tomorrow.";

/** Fill whatever the screen `to` needs from the screens before it, keeping anything already answered. */
export function seedDraftFor(d: ObDraft, to: ScreenId): ObDraft {
  const at = SCREENS.indexOf(to);
  const past = (s: ScreenId) => at > SCREENS.indexOf(s);
  const out = { ...d };
  if (past("birthday") && !out.dob) out.dob = { y: 2001, m: 5, d: 14 };
  if (past("pronoun") && !out.pronoun) out.pronoun = "she";
  if (past("letter") && !letterReady(out.letter)) out.letter = SAMPLE_LETTER;
  if (past("stamp") && !out.stamp) out.stamp = "off-chest";
  if (past("hatch")) out.born = true;
  if (past("name") && !out.wrenName.trim()) out.wrenName = "Otis";
  if (past("address") && !out.address) out.address = "guest";
  return out;
}

/** A fresh demo draft for a jump (no saved draft involved). */
export const freshDemoDraft = (now: number): ObDraft => freshDraft(now);

/* ── what the demo stubbed, for the dev entry to show after a run ── */

export function devNote(line: string): void {
  if (!__DEV__) return;
  st.log.push(`${new Date().toISOString().slice(11, 19)} ${line}`);
  if (st.log.length > 60) st.log.shift();
  console.log("[onboarding2 demo]", line);
}
export const devNotes = (): readonly string[] => st.log;
export function setDevPayload(p: unknown): void {
  if (__DEV__) st.payload = p;
}
export const devPayload = (): unknown => st.payload;
export function clearDevNotes(): void {
  st.log.length = 0;
  st.payload = null;
}
