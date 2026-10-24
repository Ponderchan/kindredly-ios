import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { adoptGuestBucket, claimLegacyKeys, scopedTo, setStorageUser, storageOwner } from "./scoped-store";
import { applyPatch, fillGaps, hasAnswers, ownerOf, parseLocal, syncPayload, visibleProfile } from "./profile-local-core";
import { clearAvatarPhoto } from "./avatar-photo";
import { clearAppBadge } from "./app-badge";
import { handOverJournal } from "./journal";
import { forgetThisDevice } from "./notify";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseReady } from "./supabase";
import { t } from "./i18n";

/* Auth facade for the native client. Apple (SIWA, mandatory on iOS), Google
   (OAuth via WebBrowser + PKCE code exchange), and email magic-link. Mirrors
   the web app's provider set + adds Apple. Sign-out uses scope:'local' (the
   peekabug fix) so the session clears even if the server revoke fails. */

WebBrowser.maybeCompleteAuthSession();

export type AuthResult =
  | { ok: true }
  | { error: string }
  | { cancelled: true }
  /* mode says which verify path the emailed code belongs to: "otp" for a
     plain sign-in, "attach" when an anonymous account is claiming an email —
     Supabase files those under different OTP types. */
  | { sent: true; mode?: "otp" | "attach" }
  /* THE ADDRESS IS ALREADY SOMEONE'S ACCOUNT (the new onboarding's screen 11,
     storyboard §6). A guest linking Apple / Google / an email that already
     owns a Kindredly account can't be linked onto the guest's user id; only
     a caller that asked for it (`{ onExists: "ask" }`) gets this answer, and
     then asks "That's already an account. Switch to it?" — switchAccount()
     is the yes. Every other caller keeps the behaviour it always had. */
  | { exists: true; provider: AuthProvider };

/** The three ways to give replies an address. */
export type AuthProvider = "apple" | "google" | "email";

/** What a sign-in does when the identity already belongs to another account
    (only a guest linking can hit it): "ask" returns { exists } for the caller
    to ask about; left out, each provider does what it always did. */
export type LinkOpts = { onExists?: "ask" };

interface AuthValue {
  ready: boolean; // initial session check complete
  enabled: boolean; // supabase configured
  session: Session | null;
  user: User | null;
  profile: Record<string, any>;
  handle: string;
  onboarded: boolean;
  /* THE ONLY QUESTION THAT MATTERS ONCE ANONYMOUS AUTH EXISTS.
     "Is there a session?" and "is this a real account?" stop being the same
     question the moment guests are signed in anonymously — and every guard
     written as `!session` silently stops firing. The change made to help
     guests is the one that disables their guardrails, so the app asks this
     instead, everywhere, and never asks about `session` directly. */
  isGuest: boolean;
  appleAvailable: boolean;
  signInAnonymously: () => Promise<AuthResult>;
  signInWithApple: (opts?: LinkOpts) => Promise<AuthResult>;
  signInWithGoogle: (opts?: LinkOpts) => Promise<AuthResult>;
  signInWithEmail: (email: string, name?: string, opts?: LinkOpts) => Promise<AuthResult>;
  verifyEmailCode: (email: string, token: string, mode: "otp" | "attach") => Promise<AuthResult>;
  /** "Switch to it?" → yes: sign in to the account that already owns this
      identity, leaving the guest's anonymous user behind (nothing of it was
      posted). Email answers { sent, mode: "otp" }; verifyEmailCode finishes it. */
  switchAccount: (provider: AuthProvider, email?: string) => Promise<AuthResult>;
  saveProfile: (p: Record<string, any>) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<AuthResult>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);
export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

const redirectTo = Linking.createURL("auth-callback");

/* ONE CODE, ONE EXCHANGE (owner's phone, 2026-10-15: "PKCE code verifier not
   found in storage" on Continue with Google). The Google redirect reaches two
   listeners — openAuthSessionAsync's result and the app-wide deep-link
   handler that exists for the email link — and both exchanged the same code.
   The first one in deletes the verifier; the second fails, and when the
   second was Google's own, its error was shown over a sign-in that had just
   worked. Now every caller of a code shares one exchange, and an exchange
   that errors while a session is already there (the other path won) counts
   as done. */
/* A DEAD SESSION TAKES THE SIGN-IN WITH IT (owner's phone, 2026-10-20: "PKCE code verifier not
   found in storage" again, on the shipped build that already exchanges once). The phone still held
   a session whose account was gone (deleted elsewhere, or its refresh token revoked). Supabase drops
   such a session the first time it tries to refresh it, and dropping a session also deletes every
   PKCE verifier in storage — including the one Google's sign-in had just written, so the code came
   back to nothing. Before a browser sign-in starts, ask the server about the stored session and let
   go of a dead one here; and hold the token refresher still while the browser is up. */
const GONE = new Set(["user_not_found", "session_not_found", "bad_jwt", "refresh_token_not_found"]);
async function letGoOfDeadSession(): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();   // an expired token refreshes (or drops) here, before the verifier exists
    if (!data.session) return;
    const { error } = await supabase.auth.getUser();
    if (error && (GONE.has((error as any).code) || error.status === 401 || error.status === 403)) {
      console.warn("[auth] the stored session has no account on the server; signing out on this phone first");
      await supabase.auth.signOut({ scope: "local" });
    }
  } catch (e) {
    console.warn("[auth] couldn't check the stored session before sign-in:", e);
  }
}
/* THE VERIFIER IS HELD ACROSS THE BROWSER (owner's phone, 2026-10-20, still "PKCE code verifier not
   found" after the above). While nobody is signed in, any supabase.auth.getUser() — and the app makes
   several the moment it is active again (db uid(), notify, activities, folds…) — fails with "session
   missing", and supabase-js answers that by dropping the session, which deletes every PKCE verifier.
   Coming back from Google wakes the app, those calls race the exchange, and the verifier the exchange
   needs is gone. So the verifier is read before the browser opens and put back, if it went missing,
   right before the exchange. */
const verifierKey = () => `${(supabase!.auth as any).storageKey}-code-verifier`;
let heldVerifier: string | null = null;
async function holdVerifier(): Promise<void> {
  try { heldVerifier = await AsyncStorage.getItem(verifierKey()); } catch { heldVerifier = null; }
}
async function restoreVerifier(): Promise<void> {
  if (!supabase || !heldVerifier) return;
  try {
    if (!(await AsyncStorage.getItem(verifierKey()))) {
      await AsyncStorage.setItem(verifierKey(), heldVerifier);
      console.warn("[auth] the sign-in verifier was cleared while the browser was up; put back");
    }
  } catch (e) {
    console.warn("[auth] couldn't put the sign-in verifier back:", e);
  }
}
async function inBrowserRoundTrip<T>(run: () => Promise<T>): Promise<T> {
  if (!supabase) return run();
  await holdVerifier();
  try { await supabase.auth.stopAutoRefresh(); } catch {}
  try { return await run(); } finally { try { await supabase.auth.startAutoRefresh(); } catch {} }
}

const exchanges = new Map<string, Promise<{ error: string | null }>>();
/* THE FLOW'S OWN VERIFIER (2026-10-20). supabase-js 2.112 keeps one verifier per sign-in flow and
   adds the flow's id to the redirect (sb_flow_id); an exchange that does not name it reads a shared
   legacy key that any other flow or exchange may have cleared — "PKCE code verifier not found" on a
   sign-in that had a verifier all along. Every exchange names its flow when the callback carries one. */
function callbackFlowId(params: Record<string, unknown> | null | undefined): string | undefined {
  const v = params?.sb_flow_id;
  return typeof v === "string" && v ? v : undefined;
}
function exchangeOnce(code: string, flowId?: string): Promise<{ error: string | null }> {
  const running = exchanges.get(code);
  if (running) return running;
  const p = (async () => {
    if (!supabase) return { error: "Auth not configured." };
    try {
      await restoreVerifier();
      const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
      if (!error) return { error: null };
      const { data } = await supabase.auth.getSession();
      if (data.session && !data.session.user.is_anonymous) return { error: null };
      return { error: error.message };
    } catch (e: any) {
      return { error: e?.message || "Sign-in failed." };
    }
  })();
  exchanges.set(code, p);
  void p.then(() => { heldVerifier = null; });
  return p;
}

const LOCAL_PROFILE_KEY = "kindredly_profile_local";

/* "THAT'S ALREADY AN ACCOUNT." How Supabase says a link can't happen because
   the identity or the email belongs to another user: an error code on a
   thrown/returned AuthError (identity_already_exists for Apple's id token and
   Google's link, email_exists for updateUser's email), or, on Google's link,
   the same code in the redirect's query or fragment. The message is the
   fallback for an older server that sends no code. */
const EXISTS_CODES = new Set(["identity_already_exists", "email_exists", "user_already_exists"]);
function alreadyAnAccount(e: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!e) return false;
  if (e.code && EXISTS_CODES.has(e.code)) return true;
  return /already (been )?(registered|linked|exists)|identity is already linked/i.test(e.message ?? "");
}

/** The parameters of an OAuth redirect, from its query AND its fragment (errors can come in either). */
function callbackParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const q = Linking.parse(url).queryParams ?? {};
    for (const [k, v] of Object.entries(q)) if (typeof v === "string") out[k] = v;
  } catch {
    /* a malformed URL has no parameters */
  }
  const hash = url.indexOf("#");
  if (hash >= 0) {
    for (const part of url.slice(hash + 1).split("&")) {
      const [k, v = ""] = part.split("=");
      if (k && !(k in out)) {
        try {
          out[k] = decodeURIComponent(v.replace(/\+/g, " "));
        } catch {
          out[k] = v;
        }
      }
    }
  }
  return out;
}

/* The last Apple identity token, for "Switch to it?" right after a link that
   found the Apple ID already had an account: signing in with the same token
   spares a second Apple sheet. Apple's tokens live ten minutes; five is the
   margin. In memory only. */
let lastAppleToken: { token: string; at: number } | null = null;
const APPLE_TOKEN_REUSE_MS = 5 * 60_000;

/* THE PHONE'S OWN SETTINGS OUTLIVE AN ACCOUNT. Deleting the account scrubs its keys and the
   legacy bare ones — but these bare keys are the phone's, not anyone's account's: the theme, the
   Letter font, the language, the remote switch's table and its crash breadcrumb. Scrubbed, the
   phone came back in another language and theme at the next launch, for whoever starts again on
   it. */
const DEVICE_PREFS: ReadonlySet<string> = new Set([
  "kindredly_theme", // lib/theme
  "kindredly_letter_font", // lib/theme
  "kindredly_lang", // lib/i18n
  "kindredly_surfaces", // lib/surfaces: the remote switch's table
  "kindredly_native_arming", // lib/surfaces: the crash breadcrumb (the binary's, not the account's)
  "kindredly_ob2_minor", // screens/onboarding/device-block: the under-18 answer is the phone's, and outlives any account
  "kindredly_update_seen", // lib/update-prompt: the update sheet was shown on this binary
  "kindredly_store_version", // lib/update-prompt: the App Store's release, as Apple last answered
]);

/* THE APP REVIEW ACCOUNT (App Review 2.1(a), 2026-10-23: "provide a user name and password").
   Kindredly signs in with Apple, Google or an emailed code — nothing a reviewer can use. For this
   one address only, "Continue with email" sends nothing and the six-digit code screen takes the
   account's password (Supabase email + password, set by the owner in the dashboard; never in the
   code). Everyone else's email sign-in is exactly as before. */
const REVIEW_EMAIL = "review@kindredly.io";
const isReviewEmail = (email: string): boolean => email.trim().toLowerCase() === REVIEW_EMAIL;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!supabaseReady);
  const [session, setSession] = useState<Session | null>(null);
  /* the session as of now, for callbacks made once (deleteAccount's scrub
     read the first render's session — usually none — and so never removed
     the deleted account's bucket) */
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [localProfile, setLocalProfile] = useState<Record<string, any>>({});
  /* the local picture as of NOW, for saveProfile: every save merges into this (never into the
     localProfile some render's closure captured), so two saves in a row — a face, then a pen
     name — can't put back what the other just changed. setLocalProfile only ever follows it. */
  const localRef = useRef<Record<string, any>>({});
  /* WHOSE the local picture is (a uid, or "anon"; null before auth has resolved), and the read of
     that account's stored copy. The picture used to be read once, at launch, and then kept across
     sign-outs and sign-ins: account B was shown, and synced, account A's copy — or a guest's, whose
     empty face then went up over B's (owner, 2026-10-21: "my avatar is gone"). Now each change of
     account swaps in that account's own stored copy, and a save waits for it before merging. */
  const localOwner = useRef<string | null>(null);
  const localLoad = useRef<Promise<void>>(Promise.resolve());
  /* the last session's user, to tell a guest LINKING an identity (same user id, no longer
     anonymous — their own bucket, adopted whatever the account says) from a sign-in to another
     account */
  const lastUser = useRef<{ id: string; anon: boolean } | null>(null);
  /* the account syncs, one after another: each sends the whole local picture as it is when its
     turn comes, so the last one out always carries every change (10a: Edit profile saves each
     field on its own) */
  const syncChain = useRef<Promise<unknown>>(Promise.resolve());
  /* saveProfile is defined further down and the adopt effect above it needs to
     call it — a ref keeps the two independent of declaration order rather than
     shuffling the whole file around one call. */
  const saveProfileRef = useRef<(p: Record<string, any>) => Promise<AuthResult>>(async () => ({ ok: true }));

  const user = session?.user ?? null;
  // local edits (name/avatar) always win and survive without a session;
  // they sync to user_metadata whenever a session exists.
  // an empty face / pen name / pronoun / birthday on the phone only hides the account's when it was
  // cleared on purpose (lib/profile-local-core)
  const profile = visibleProfile(user?.user_metadata as Record<string, any> | undefined, localProfile);
  /* THE PEN NAME IS ONLY EVER THE PEN NAME. It used to fall back to user_metadata.full_name /
     name, which Apple and Google fill with the person's legal name: anyone who never typed a pen
     name (the new onboarding no longer asks for one; it is chosen at the first trade) would have
     shown it on Me and SENT it to a pen pal when trading names (identity plan, mismatch 2). With
     no pen name it is "": Me says "You", and signing asks for one first (useLettersModel). */
  const handle: string = profile.handle || "";
  const onboarded = !!profile.onboarded;
  // no session at all, or one that belongs to nobody yet
  const isGuest = !session || user?.is_anonymous === true;

  /* the storage namespace follows the session — set the moment it is KNOWN (including "nobody" →
     the anon bucket), so no module can read another account's bucket during boot. scoped reads
     gate on this. It used to be set on the first render too, before the stored session had been
     read: every cold start opened the anon bucket first, and the local profile (read once, then)
     came from there — a guest's picture laid over the signed-in account's.

     With it, the local picture follows the account: that account's stored copy is read in (after
     a guest's bucket has moved into an account that adopts it), and nothing of the last account's
     stays in memory. */
  useEffect(() => {
    if (!ready) return;
    const u = session?.user ?? null;
    const owner = ownerOf(u);
    setStorageUser(owner === "anon" ? null : owner);
    const was = lastUser.current;
    lastUser.current = u ? { id: u.id, anon: !!u.is_anonymous } : null;
    if (owner === localOwner.current) return;
    localOwner.current = owner;
    localRef.current = {};
    setLocalProfile({});
    const meta = (u?.user_metadata as Record<string, any>) || {};
    const linked = !!u && !!was && was.anon && was.id === u.id;
    localLoad.current = (async () => {
      let adopt = false;
      let anon: Record<string, any> = {};
      if (owner !== "anon") {
        await claimLegacyKeys(owner); // one-time: see scoped-store.claimLegacyKeys
        /* SIGNING IN MID-APP ADOPTS THE GHOST, it doesn't start over.
           ────────────────────────────────────────────────────────────────
           Someone who chose "Just looking" walks the whole console — pen name, birthday, face,
           courier, its name and pronoun, the first letter — and all of it lands in the anon
           bucket, because saveProfile writes locally with or without an account. `onboarded:
           true` was only ever set on the signed-in branch, so the next cold start would march them
           back through onboarding. So when a real identity arrives with a guest's answers waiting
           and no flag on the account, the account adopts them — and a guest who LINKED an identity
           onto their own user id always takes their own bucket. An account that already exists
           adopts nothing: the guest's answers are never laid over it. */
        anon = parseLocal(await scopedTo("anon").getItem(LOCAL_PROFILE_KEY).catch(() => null));
        adopt = linked || (!meta.onboarded && hasAnswers(anon));
        if (adopt) await adoptGuestBucket(owner);
      }
      let stored: Record<string, any> = {};
      try {
        stored = parseLocal(await scopedTo(owner).getItem(LOCAL_PROFILE_KEY));
      } catch (e) {
        console.warn("[auth] the local profile wasn't read:", e);
      }
      if (localOwner.current !== owner) return; // another account since
      /* an identity field this account has nowhere (server or own copy) comes back from the guest
         copy, which every cold start used to read: for accounts whose server value an older bug
         emptied, it is the only place the pen name or face still is (owner, b31: "my name is gone") */
      const gaps = owner !== "anon" && !adopt ? fillGaps(meta, stored, anon) : { next: stored, filled: false };
      localRef.current = gaps.next;
      setLocalProfile(gaps.next);
      if (gaps.filled) {
        void scopedTo(owner).setItem(LOCAL_PROFILE_KEY, JSON.stringify(gaps.next)).catch((e) => console.warn("[auth] the filled profile wasn't stored:", e));
        void saveProfileRef.current({});
      } else if (adopt && !meta.onboarded) void saveProfileRef.current({});
    })();
  }, [ready, session]);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session ?? null))
      .catch((e) => console.warn("[auth] the stored session wasn't read:", e))
      .finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => setAppleAvailable(false));
    }
  }, []);

  // deep-link handler (email magic-link return; cold + warm start)
  const exchange = useCallback(async (url: string) => {
    if (!supabase || !url) return;
    try {
      const qp = Linking.parse(url).queryParams;
      const code = (qp?.code as string) || "";
      if (code) {
        const { error } = await exchangeOnce(code, callbackFlowId(qp));
        if (error) console.warn("[auth] link sign-in:", error);
      }
    } catch (e) {
      console.warn("[auth] malformed callback:", e);
    }
  }, []);
  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => exchange(url));
    Linking.getInitialURL().then((u) => {
      if (u) exchange(u);
    });
    return () => sub.remove();
  }, [exchange]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    setSession(data.session ?? null);
  }, []);

  /* "Just looking" gets a REAL session, not no session. Every RLS policy in
     this project is `to authenticated`, and an anonymous user carries exactly
     that role — so the pool becomes readable, the first letter can actually
     publish, a fingerprint exists, and the matcher can name them. A guest
     experiences the product instead of a version of it with the mechanism
     removed.

     It is also the safer of the two options that were on the table: opening
     the tables to `anon` would have let anyone with the app's shipped key
     read every letter with nobody to hold responsible. An anonymous user has
     a uid — rate-limitable, bannable, auditable. */
  const signInAnonymously = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth not configured." };
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) return { error: error.message };
      return { ok: true };
    } catch (e: any) {
      return { error: e?.message || "Couldn't start a session." };
    }
  }, []);

  const signInWithApple = useCallback(async (opts?: LinkOpts): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth not configured." };
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken)
        return { error: t("auth.err.apple") };
      lastAppleToken = { token: cred.identityToken, at: Date.now() };
      /* UPGRADING A GHOST KEEPS THE GHOST'S ROW. For an anonymous session
         this LINKS the Apple identity onto the same user id — the letters,
         threads and fingerprint written while just looking stay theirs.
         signInWithIdToken here would mint a fresh account and orphan all of
         it, which is exactly the "start over" this whole path exists to
         avoid. Needs "Allow manual linking" ON in Supabase auth settings. */
      const anon = (await supabase.auth.getUser()).data.user?.is_anonymous === true;
      const { error } = anon
        ? await supabase.auth.linkIdentity({ provider: "apple", token: cred.identityToken })
        : await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken });
      /* the Apple ID already has its own account: the caller that asked
         (onboarding's screen 11) asks "Switch to it?"; everyone else sees
         the error, as before */
      if (error && anon && opts?.onExists === "ask" && alreadyAnAccount(error)) return { exists: true, provider: "apple" };
      if (error) return { error: error.message };
      if (anon) await refresh();
      // Apple only returns the name on the FIRST authorization — capture it.
      const name = [cred.fullName?.givenName, cred.fullName?.familyName]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (name) {
        try {
          await supabase.auth.updateUser({ data: { full_name: name } });
        } catch {
          /* non-fatal */
        }
      }
      return { ok: true };
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return { cancelled: true };
      return { error: e?.message || "Apple sign-in failed." };
    }
  }, [refresh]);

  /* GOOGLE IN THE BROWSER: open Supabase's authorize URL, come back on the
     app's redirect, exchange the code (once — exchangeOnce). An error on the
     way back (the redirect's error / error_code) comes back as { error, code }
     so the caller can tell "already an account" from a real failure. */
  const googleRoundTrip = useCallback(async (url: string): Promise<AuthResult | { error: string; code: string }> => {
    const res = await inBrowserRoundTrip(() => WebBrowser.openAuthSessionAsync(url, redirectTo));
    if (res.type === "cancel" || res.type === "dismiss") return { cancelled: true };
    if (res.type === "success" && res.url) {
      const q = callbackParams(res.url);
      if (q.error || q.error_code) return { error: q.error_description || q.error || t("auth.err.google"), code: q.error_code || q.error || "" };
      if (q.code) {
        const { error: e2 } = await exchangeOnce(q.code, callbackFlowId(q as any));
        if (e2) return { error: e2 };
        return { ok: true };
      }
    }
    return { error: t("auth.err.google") };
  }, []);

  /* a plain Google sign-in: the account that owns this Google identity (made
     on the spot if there is none) */
  const googleSignIn = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth not configured." };
    await letGoOfDeadSession();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return { error: error?.message || "Could not start Google sign-in." };
    const r = await googleRoundTrip(data.url);
    return "code" in r ? { error: r.error } : r;
  }, [googleRoundTrip]);

  /* UPGRADING A GHOST WITH GOOGLE KEEPS THE GHOST'S ROW, as Apple already
     did. A guest who tapped Google used to run a fresh OAuth sign-in: a new
     account, and the guest's letter, threads and bird orphaned on the old
     anonymous user (storyboard §13.3, found 2026-10-18). For an anonymous
     session this now LINKS the Google identity onto the same user id
     (linkIdentity: the browser round trip, the code exchanged for the same
     user, no longer anonymous), and the adopt effect above moves the
     guest's bucket as it does for Apple. Needs "Allow manual linking" ON in
     Supabase, which Apple's link already relies on.

     When that Google identity already has its own account the link can't
     happen: a caller that asked (`onExists: "ask"`, onboarding's screen 11)
     gets { exists } and asks "Switch to it?"; every other caller gets what
     a guest always got here — signed in to that account. */
  const signInWithGoogle = useCallback(async (opts?: LinkOpts): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth not configured." };
    try {
      const anon = (await supabase.auth.getUser()).data.user?.is_anonymous === true;
      if (!anon) return await googleSignIn();
      await letGoOfDeadSession();
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error && alreadyAnAccount(error)) return opts?.onExists === "ask" ? { exists: true, provider: "google" } : await googleSignIn();
      if (error || !data?.url) return { error: error?.message || "Could not start Google sign-in." };
      const r = await googleRoundTrip(data.url);
      if ("code" in r) {
        if (!alreadyAnAccount({ code: r.code, message: r.error })) return { error: r.error };
        return opts?.onExists === "ask" ? { exists: true, provider: "google" } : await googleSignIn();
      }
      if ("ok" in r) await refresh();
      return r;
    } catch (e: any) {
      return { error: e?.message || "Google sign-in failed." };
    }
  }, [googleRoundTrip, googleSignIn, refresh]);

  const signInWithEmail = useCallback(
    async (email: string, name?: string, opts?: LinkOpts): Promise<AuthResult> => {
      if (!supabase) return { error: "Auth not configured." };
      // the App Review account: no email is sent; its code screen takes the account's password
      if (isReviewEmail(email)) return { sent: true, mode: "otp" };
      try {
        /* Same principle as Apple: an anonymous user doesn't sign in with
           email, they ATTACH an email to the account they already are.
           updateUser sends the confirmation ("Confirm email" is on), and
           until it's clicked they simply remain anonymous — nothing lost,
           nothing orphaned. */
        const anonUser = (await supabase.auth.getUser()).data.user;
        if (anonUser?.is_anonymous) {
          const { error } = await supabase.auth.updateUser(
            { email, data: name ? { full_name: name } : undefined },
            { emailRedirectTo: redirectTo },
          );
          /* the email is already another account's: onboarding's screen 11
             asks "Switch to it?"; everyone else sees the error, as before */
          if (error && opts?.onExists === "ask" && alreadyAnAccount(error)) return { exists: true, provider: "email" };
          if (error) return { error: error.message };
          return { sent: true, mode: "attach" };
        }
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
            data: name ? { full_name: name } : undefined,
          },
        });
        if (error) return { error: error.message };
        return { sent: true, mode: "otp" };
      } catch (e: any) {
        return { error: e?.message || "Could not send the link." };
      }
    },
    [],
  );

  /* the 6-digit code from the email — the sign-in that never leaves the
     app. The emailed LINK still works too; this is the path that doesn't
     depend on it. */
  const verifyEmailCode = useCallback(
    async (email: string, token: string, mode: "otp" | "attach"): Promise<AuthResult> => {
      if (!supabase) return { error: "Auth not configured." };
      if (isReviewEmail(email)) {
        try {
          const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: token });
          if (error) return { error: error.message };
          await refresh();
          return { ok: true };
        } catch (e: any) {
          return { error: e?.message || "Could not sign in." };
        }
      }
      try {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: mode === "attach" ? "email_change" : "email",
        });
        if (error) return { error: error.message };
        await refresh();
        return { ok: true };
      } catch (e: any) {
        return { error: e?.message || "Could not verify the code." };
      }
    },
    [refresh],
  );

  /* "THAT'S ALREADY AN ACCOUNT. SWITCH TO IT?" → yes (storyboard §6, screen
     11's edge). A plain sign-in to the account that owns the identity: the
     new session simply replaces the anonymous one (no sign-out first, so a
     cancelled sheet leaves the guest exactly where they were). The guest's
     anonymous user stays behind with nothing posted; an account that never
     finished onboarding adopts the guest's bucket (the adopt effect), one
     that did keeps its own bird. Apple reuses the token the failed link just
     got, while it is fresh, so the person isn't shown the Apple sheet twice. */
  const switchAccount = useCallback(
    async (provider: AuthProvider, email?: string): Promise<AuthResult> => {
      if (!supabase) return { error: "Auth not configured." };
      try {
        if (provider === "google") return await googleSignIn();
        if (provider === "email") {
          if (!email) return { error: t("ob.email.bad") };
          const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
          if (error) return { error: error.message };
          return { sent: true, mode: "otp" };
        }
        let token = lastAppleToken && Date.now() - lastAppleToken.at < APPLE_TOKEN_REUSE_MS ? lastAppleToken.token : null;
        if (!token) {
          const cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL] });
          if (!cred.identityToken) return { error: t("auth.err.apple") };
          token = cred.identityToken;
          lastAppleToken = { token, at: Date.now() };
        }
        const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token });
        if (error) return { error: error.message };
        lastAppleToken = null;
        await refresh();
        return { ok: true };
      } catch (e: any) {
        if (e?.code === "ERR_REQUEST_CANCELED") return { cancelled: true };
        return { error: e?.message || "Sign-in failed." };
      }
    },
    [googleSignIn, refresh],
  );

  /* SAVING THE PROFILE. Local first — edits stick immediately, with or without a session —
     then, when signed in, the account. Two things changed in 10a, when Edit profile began to
     save each field on its own:
     - the merge is into localRef (the picture as of now), not into the localProfile a render's
       closure held, so a save made just after another can't revert it (a late face save used
       to put back the pen name it was made before, on the phone and on the account);
     - the account syncs run one after another (syncChain), and the answer is the sync's: a
       failed updateUser is { error } now, where it used to be { ok: true } whatever happened,
       which left a pen name off the account with nobody told. The local copy is kept either
       way, and the next save carries it up.
     The function itself never changes (no deps that move), so a caller holding an old copy
     calls the same thing. */
  const saveProfile = useCallback(
    async (p: Record<string, any>): Promise<AuthResult> => {
      /* into THIS account's picture, once its stored copy is in (a save merged into the empty
         picture of an account still being read would write that stored copy over) */
      if (localOwner.current === null) await storageOwner();
      for (let l = localLoad.current; ; l = localLoad.current) {
        await l;
        if (l === localLoad.current) break;
      }
      const owner = localOwner.current as string;
      // an identity field named with nothing in it is a clear on purpose (lib/profile-local-core)
      const nextLocal = applyPatch(localRef.current, p);
      localRef.current = nextLocal;
      setLocalProfile(nextLocal);
      scopedTo(owner).setItem(LOCAL_PROFILE_KEY, JSON.stringify(nextLocal)).catch((e) => console.warn("[auth] the local profile wasn't saved:", e));
      const client = supabase;
      if (!client || !sessionRef.current) return { ok: true };
      const run = syncChain.current.then(async (): Promise<AuthResult> => {
        if (!sessionRef.current) return { ok: true }; // signed out while it waited its turn
        // another account since: this picture is not its to receive (it syncs its own on its next save)
        if (ownerOf(sessionRef.current.user) !== owner || localOwner.current !== owner) return { ok: true };
        /* The whole local picture goes up, as it is NOW, not just this call's delta. A
           catch-up sync passes {} — with the old code that pushed nothing but the onboarded
           flag and left the account without the handle, the birthday or the first line that
           were already sitting on the phone. */
        // never an empty face / pen name / pronoun / birthday the person didn't clear
        const data = syncPayload(localRef.current);
        try {
          const { error } = await client.auth.updateUser({ data });
          if (error) {
            console.warn("[auth] the profile didn't reach the account:", error.message);
            return { error: error.message };
          }
          await refresh();
          return { ok: true };
        } catch (e: any) {
          console.warn("[auth] the profile didn't reach the account:", e);
          return { error: e?.message || "The account couldn't be reached." };
        }
      });
      syncChain.current = run;
      return run;
    },
    [refresh],
  );
  saveProfileRef.current = saveProfile;

  const signOut = useCallback(async () => {
    // stop knocking a phone whose owner has left the account
    await forgetThisDevice();
    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* local session already cleared; onAuthStateChange reconciles */
      }
    }
    clearAppBadge();
    setSession(null);
  }, []);

  /* Account deletion (App Store 5.1.1(v) — and the decent thing to offer).
     The server side is one RPC: delete_account() removes the auth.users row
     as the user themself, and migration 0009's FK rules decide what death
     leaves behind — letters stay in the world unsigned, threads keep the
     survivor's half, everything private to the account cascades away.

     Locally, everything resets EXCEPT the sealed journal. The journal never
     belonged to the account — "No one sees this. Not even me." — so it
     doesn't die with it; it belongs to the phone and stays on the phone.
     So do the phone's own settings (DEVICE_PREFS: theme, Letter font,
     language, the remote switch), which were never the account's either.
     The scrub runs BEFORE sign-out so the adopt-on-sign-in effect can never
     resurrect the old pen name into some future session. */
  const deleteAccount = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: t("auth.err.offline") };
    await forgetThisDevice();
    await removeMyStampPictures();
    const { error } = await supabase.rpc("delete_account");
    if (error) {
      return { error: t("auth.err.delete") };
    }
    // the photo worn as a face: the scrub below forgets its name, this deletes its file too
    await clearAvatarPhoto().catch(() => {});
    try {
      const uid = sessionRef.current?.user?.id;
      /* …except the journal (owner, 2026-10-15: "日记留吧"): sealed pages
         belong to the phone, as this sheet says, so they are handed to the
         guest bucket the phone falls back to before the scrub. If the
         hand-over fails, the account's journal is left unscrubbed rather
         than lost. */
      let journalHandedOver = true;
      if (uid) {
        try {
          await handOverJournal(uid);
        } catch (e) {
          journalHandedOver = false;
          console.warn("[auth] journal hand-over failed; leaving it in place:", e);
        }
      }
      const keys = await AsyncStorage.getAllKeys();
      /* namespaced: scrub exactly the deleted account's bucket, plus any
         legacy bare keys — never a bare journal, and never the account's
         journal if it couldn't be handed over. Other accounts' buckets stay. */
      const isJournal = (k: string) => k.split("::")[0].startsWith("kindredly_journal");
      const gone = keys.filter(
        (k) =>
          k.startsWith("kindredly") &&
          !DEVICE_PREFS.has(k) &&
          (uid ? k.endsWith(`::${uid}`) || !k.includes("::") : !k.includes("::")) &&
          !(isJournal(k) && (!k.includes("::") || !journalHandedOver)),
      );
      if (gone.length) await AsyncStorage.multiRemove(gone);
    } catch {
      /* the account is already gone; a failed local scrub must not block that */
    }
    localRef.current = {};
    setLocalProfile({});
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* the server user no longer exists; only the local session matters */
    }
    clearAppBadge();
    setSession(null);
    return { ok: true };
  }, []);

  const value: AuthValue = {
    ready,
    enabled: supabaseReady,
    session,
    user,
    profile,
    handle,
    onboarded,
    isGuest,
    appleAvailable,
    signInWithApple,
    signInAnonymously,
    signInWithGoogle,
    signInWithEmail,
    verifyEmailCode,
    switchAccount,
    saveProfile,
    deleteAccount,
    signOut,
    refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* The custom stamps' pictures live in the private "stamps" bucket under <uid>/, which SQL may not
   empty (0038): an account that goes takes its pictures with it, removed here while the session can
   still list and delete its own folder. A failure is logged and never blocks the deletion. */
async function removeMyStampPictures(): Promise<void> {
  if (!supabase) return;
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return;
    const bucket = supabase.storage.from("stamps");
    const { data, error } = await bucket.list(uid, { limit: 1000 });
    if (error) {
      console.warn("[account] stamp pictures not listed", error.message);
      return;
    }
    const paths = (data ?? []).map((f) => `${uid}/${f.name}`);
    if (paths.length) {
      const { error: rmError } = await bucket.remove(paths);
      if (rmError) console.warn("[account] stamp pictures not removed", rmError.message);
    }
  } catch (e) {
    console.warn("[account] stamp pictures", e);
  }
}
