import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  appleAvailable: boolean;
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

  const user = session?.user ?? null;
  // local edits (name/avatar) always win and survive without a session;
  // they sync to user_metadata whenever a session exists.
  const profile = {
    ...((user?.user_metadata as Record<string, any>) || {}),
    ...localProfile,
  } as Record<string, any>;
  const handle: string = profile.handle || profile.full_name || profile.name || "";
  const onboarded = !!profile.onboarded;

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
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: cred.identityToken,
      });
      if (error) return { error: error.message };
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
  }, []);

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
        const data: Record<string, any> = { ...p, onboarded: true };
        if (p.handle) data.full_name = p.handle;
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
    appleAvailable,
    signInWithApple,
    signInWithGoogle,
    signInWithEmail,
    saveProfile,
    signOut,
    refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
