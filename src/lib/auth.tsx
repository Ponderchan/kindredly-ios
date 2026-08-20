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
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseReady } from "./supabase";

/* Auth facade for the native client. Apple (SIWA, mandatory on iOS), Google
   (OAuth via WebBrowser + PKCE code exchange), and email magic-link. Mirrors
   the web app's provider set + adds Apple. Sign-out uses scope:'local' (the
   peekabug fix) so the session clears even if the server revoke fails. */

WebBrowser.maybeCompleteAuthSession();

export type AuthResult =
  | { ok: true }
  | { error: string }
  | { cancelled: true }
  | { sent: true };

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
  signInWithApple: () => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithEmail: (email: string, name?: string) => Promise<AuthResult>;
  saveProfile: (p: Record<string, any>) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);
export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

const redirectTo = Linking.createURL("auth-callback");

const LOCAL_PROFILE_KEY = "kindredly_profile_local";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!supabaseReady);
  const [session, setSession] = useState<Session | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [localProfile, setLocalProfile] = useState<Record<string, any>>({});
  /* saveProfile is defined further down and the adopt effect above it needs to
     call it — a ref keeps the two independent of declaration order rather than
     shuffling the whole file around one call. */
  const saveProfileRef = useRef<(p: Record<string, any>) => Promise<AuthResult>>(async () => ({ ok: true }));

  const user = session?.user ?? null;
  // local edits (name/avatar) always win and survive without a session;
  // they sync to user_metadata whenever a session exists.
  const profile = {
    ...((user?.user_metadata as Record<string, any>) || {}),
    ...localProfile,
  } as Record<string, any>;
  const handle: string = profile.handle || profile.full_name || profile.name || "";
  const onboarded = !!profile.onboarded;
  // no session at all, or one that belongs to nobody yet
  const isGuest = !session || user?.is_anonymous === true;

  useEffect(() => {
    AsyncStorage.getItem(LOCAL_PROFILE_KEY)
      .then((raw) => {
        if (raw) setLocalProfile(JSON.parse(raw));
      })
      .catch(() => {});
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  /* SIGNING IN MID-APP ADOPTS THE GHOST, it doesn't start over.
     ────────────────────────────────────────────────────────────────────
     Someone who chose "Just looking" walks the whole console — pen name,
     birthday, face, courier, its name and pronoun, the first letter — and
     all of it lands in localProfile and AsyncStorage, because saveProfile
     writes locally with or without a session.

     But `onboarded: true` was only ever set on the SIGNED-IN branch, so a
     ghost never got the flag. They could sign in from the sheet, carry on
     happily... and the next cold start would hit index.tsx's
     `!session || !onboarded` and march them back through onboarding, where
     finishing again would overwrite the courier they had already named.

     So the moment a session appears with local work waiting and no flag on
     the account, the account adopts it. That is what makes signing in later
     mean "keep this" instead of "start over". */
  const adopted = useRef(false);
  useEffect(() => {
    /* An anonymous session is NOT an account adopting anything — it is the
       guest themselves. Adoption is for the moment a real identity arrives. */
    if (!supabase || !session || user?.is_anonymous || adopted.current) return;
    const meta = (session.user?.user_metadata as Record<string, any>) || {};
    if (meta.onboarded) return; // the account already knows
    if (!Object.keys(localProfile).length) return; // nothing to adopt
    adopted.current = true;
    void saveProfileRef.current({});
  }, [session, user, localProfile]);

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
      const code = (Linking.parse(url).queryParams?.code as string) || "";
      if (code) await supabase.auth.exchangeCodeForSession(code);
    } catch {
      /* ignore malformed callbacks */
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

  const signInWithApple = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth not configured." };
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken)
        return { error: "No identity token returned by Apple." };
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

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: "Auth not configured." };
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url)
        return { error: error?.message || "Could not start Google sign-in." };
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type === "cancel" || res.type === "dismiss")
        return { cancelled: true };
      if (res.type === "success" && res.url) {
        const code = (Linking.parse(res.url).queryParams?.code as string) || "";
        if (code) {
          const { error: e2 } = await supabase.auth.exchangeCodeForSession(code);
          if (e2) return { error: e2.message };
          return { ok: true };
        }
      }
      return { error: "Google sign-in did not complete." };
    } catch (e: any) {
      return { error: e?.message || "Google sign-in failed." };
    }
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, name?: string): Promise<AuthResult> => {
      if (!supabase) return { error: "Auth not configured." };
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
          if (error) return { error: error.message };
          return { sent: true };
        }
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
            data: name ? { full_name: name } : undefined,
          },
        });
        if (error) return { error: error.message };
        return { sent: true };
      } catch (e: any) {
        return { error: e?.message || "Could not send the link." };
      }
    },
    [],
  );

  const saveProfile = useCallback(
    async (p: Record<string, any>): Promise<AuthResult> => {
      // local first — edits stick immediately, with or without a session
      const nextLocal = { ...localProfile, ...p };
      setLocalProfile(nextLocal);
      AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(nextLocal)).catch(() => {});
      // then best-effort sync to the account when signed in
      if (supabase && session) {
        /* The whole local picture goes up, not just this call's delta. A
           catch-up sync passes {} — with the old code that pushed nothing but
           the onboarded flag and left the account without the handle, the
           birthday or the first line that were already sitting on the phone. */
        const data: Record<string, any> = { ...nextLocal, onboarded: true };
        if (nextLocal.handle) data.full_name = nextLocal.handle;
        try {
          const { error } = await supabase.auth.updateUser({ data });
          if (!error) await refresh();
        } catch {
          /* local copy already saved; sync retries on next save */
        }
      }
      return { ok: true };
    },
    [refresh, session, localProfile],
  );
  saveProfileRef.current = saveProfile;

  const signOut = useCallback(async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* local session already cleared; onAuthStateChange reconciles */
      }
    }
    setSession(null);
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
    saveProfile,
    signOut,
    refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
