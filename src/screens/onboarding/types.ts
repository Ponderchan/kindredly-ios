import { createContext, useContext } from "react";
import type { LaunchHandoff } from "../../components/LaunchAnimation";
import type { AuthProvider, AuthResult } from "../../lib/auth";
import type { PoolLetter } from "../../lib/db";
import type { Lang } from "../../lib/i18n";
import type { AddressChoice, FinishPayload, NotifState, ObCtx, ObDraft, ScreenId, SideId } from "./flow";

/* THE CONTRACT BETWEEN THE RUNNER AND THE SCREENS (the new onboarding).
   ────────────────────────────────────────────────────────────────────────
   A screen is a component that takes ObScreenProps and draws ONE screen of
   the storyboard (and its side state, when `side` says so). It decides
   nothing about the run: it records answers with set(), and it says what
   the person did with advance() / skip() / back / signedIn() / addressDone().
   The runner (Onboarding2) asks the flow (flow.ts) what that means and
   carries out the effects. Everything that leaves the phone goes through
   `services`, which in DEMO is stubbed (screens/onboarding/dev), so a screen
   never imports lib/auth, lib/db or lib/notify itself. The same props are on
   a context (useObRun) for parts deep inside a screen. */

export type ObScreenProps = {
  /** every answer so far (the draft, saved on every change) */
  draft: ObDraft;
  /** who is here: account none / guest / member, uid, onboarded, the account's known answers, iOS's notification state, the device block */
  ctx: ObCtx;
  /** the side state open on this screen (1a signin, 3x underage, 8a tray, 11a code), or null */
  side: SideId | null;
  /** record answers (merged into the draft, persisted) */
  set: (patch: Partial<ObDraft>) => void;
  /** the primary key (or the screen moving on by itself); `patch` is merged into the draft first
      (4's one tap: advance({ pronoun }); 8: advance({ stamp }); on 13 advance() is "Yes, knock").
      Ignored while flow.canAdvance says no. */
  advance: (patch?: Partial<ObDraft>) => void;
  /** whether the primary key is ready (dim it otherwise) */
  canAdvance: boolean;
  /** the screen's text key: 4 "Skip, say they", 5 "Later", 11 "Not now…", 13 "Not now" */
  skip: () => void;
  /** ‹ — null on screens without one (1, 9–13, 3x, a member's first screen) */
  back: (() => void) | null;
  openSide: (side: SideId) => void;
  closeSide: () => void;
  /** 3x: "Wrong year? Change it" — back to the wheel, once per phone; null when it was used */
  changeAge?: (() => void) | null;
  /** 1a: a sign-in succeeded (the runner waits for the account to land, then: Today, or 2 with the known answers) */
  signedIn: () => void;
  /** 11: how replies find you ("guest" is skip()); the runner waits for the account to land, then 12, which posts */
  addressDone: (choice: Exclude<AddressChoice, "guest">) => void;
  /** 12: resolves when finish() (the post and the saves) is done; the flight may await it before advance() */
  finished: () => Promise<void>;
  /** everything that leaves the phone: auth, notifications, the pool, the post — DEMO-stubbed */
  services: ObServices;
  /** the session's user id (null before 3 passes, or while the session is still being made — 6 says "Your courier is thinking of a name…") */
  uid: string | null;
  /** screen 1 only, once: how the launch played as it handed over (null: not straight from the launch — open at rest) */
  handoff: LaunchHandoff | null;
  /** the reader's language (the strings follow it) */
  lang: Lang;
  /** the run is a DEMO (dev): nothing leaves the phone */
  demo: boolean;
  /** the clock the run decides by (age, the clock line on 7) */
  now: () => number;
};

/** What a screen may ask of the world. Real: lib/auth, lib/db, NotifyBanner's permission helpers. DEMO: stubs that log. */
export interface ObServices {
  readonly demo: boolean;
  /** Apple's key shows only where Sign in with Apple is available */
  readonly appleAvailable: boolean;

  /* ── 1a: a returning person signs in to their account ── */
  /** Apple / Google: a plain sign-in (an anonymous session on the phone links, or moves to the account that already owns the identity). */
  signIn(provider: "apple" | "google"): Promise<AuthResult>;
  /** Email: sends the six-digit code; answers { sent, mode } — pass that mode to emailVerify. */
  emailSignIn(email: string): Promise<AuthResult>;

  /* ── 11: give replies an address, on the SAME user id ── */
  /** Apple / Google linked onto the guest's user id; { exists } when the identity already has an account (ask "Switch to it?"). */
  link(provider: "apple" | "google"): Promise<AuthResult>;
  /** Email attached to the guest; { sent, mode: "attach" }, or { exists }. */
  emailAttach(email: string): Promise<AuthResult>;
  /** "Switch to it?" → yes. Email answers { sent, mode: "otp" }. */
  switchAccount(provider: AuthProvider, email?: string): Promise<AuthResult>;
  /** The six-digit code (1a and 11a). */
  emailVerify(email: string, code: string, mode: "otp" | "attach"): Promise<AuthResult>;

  /* ── 10, 12, 13 ── */
  /** 10: the real letters the first flight brings back (and Today's first desk); demo: samples */
  prefetchPool(): Promise<PoolLetter[]>;
  /** where iOS stands now */
  notifPerm(): Promise<NotifState>;

  /* ── carried out by the runner from the flow's effects (screens don't call these) ── */
  createAnonSession(): Promise<boolean>;
  dropGuestSession(): Promise<void>;
  rememberBlock(): Promise<void>;
  finish(payload: FinishPayload): Promise<void>;
  askNotifications(): Promise<boolean>;
  openNotificationSettings(): Promise<void>;
  arrive(uid: string | null): Promise<void>;
  /** already onboarded: clear any stale draft, Today, no first-arrival flags */
  today(): Promise<void>;
  track(step: ScreenId, i: number): void;
  loadDraft(): Promise<ObDraft | null>;
  saveDraft(d: ObDraft): Promise<void>;
}

export const ObRunContext = createContext<ObScreenProps | null>(null);

/** The run's props from anywhere inside a screen. */
export function useObRun(): ObScreenProps {
  const v = useContext(ObRunContext);
  if (!v) throw new Error("useObRun must be used inside the new onboarding's runner");
  return v;
}
