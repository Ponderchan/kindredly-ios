import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Linking } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { iapRestoreOutcome } from "../../lib/iap";
import { LANGS, setLang, t, useLang, type Lang } from "../../lib/i18n";
import { openPrivacy, openTerms } from "../../lib/legal";
import { disableMorningKnock, enableMorningKnock, morningKnockEnabled, registerForReplies, setNotifyOn } from "../../lib/notify";
import { getNotifyOn } from "../../lib/local-push";
import { LETTER_FONT_CHOICES, useTheme, type LetterFontKey } from "../../lib/theme";
import { useFares } from "../../lib/fares";
import { useWrenName } from "../../lib/wren-name";
import { useNotifyBanner } from "../../components/NotifyBanner";
import { P } from "../../theme/post";
import { APPEARANCES, isAppearance } from "../../theme/themes";
import { buildFirstClass4a } from "../me/me-model";
import { meFormat } from "../me/me-format";
import { trialLabel } from "../paywall/paywall-model";
import {
  ROW_ROUTES,
  SETTINGS_LINKS,
  SETTINGS_ROUTES,
  STORE_VERSION,
  buildSettingsView,
  dangerInk,
  restoreAlert,
  type SettingsRowKey,
  type SettingsView,
  type VersionFacts,
} from "./settings-model";
import "../../data/strings-step5-settings";
import "../../data/strings-step5-me"; // fc.firstMark, on the banner's stamp
import "../../data/strings-fc2"; // fc2.ap.*: System, Light, Dark

/* SETTINGS' LOGIC, for both renderers (10a step 5). Everything settings.tsx
   did, plus 10a's APPEARANCE, in one hook: SettingsNative (SwiftUI) and
   SettingsRN (the remote switch's fallback) draw the same view (the pure
   settings-model) and call the same actions, so a flip between them never
   changes what a row does.

   What it reads: the account (pen name, birthday), the courier's name, the
   language, the theme and the Letter font (lib/theme), First Class
   (entitlement), the two switches (on every focus: the knock, the
   Notifications switch) and iOS's permission (useNotifyBanner: on focus and
   on coming back from iOS Settings).

   What it does (owner decisions and the fixes that come with them):
   - a swatch sets the appearance (System / Light / Dark / Lavender /
     Paper: lib/theme); a font tile sets the Letter font;
   - the First Class card at the top is Me's 4a card (buildFirstClass4a,
     the store's trial from useFares, as useMeModel builds it);
   - pen name and the courier's name open the one-field page
     (/me/edit-field), where going back saves;
   - the two switches are optimistic and controlled: the switch moves at
     once, and comes back if iOS says no (with the alert that says how);
   - the language picks, and the push token carries the new language at once
     when notifications are allowed (it used to wait for the next launch);
   - restore says one of three things — restored, nothing found, or that it
     couldn't be done (offline, the store unreachable), never "nothing to
     restore" for a failure — and refreshes First Class after a restore, so
     Membership and the banner change without a relaunch;
   - sign out, and delete account through the sheet (the route draws both
     sheets as window-level modals, above the floating tab bar). */

/** The binary's own version (expo-application), the store's label beside it (owner question 7). */
export function versionFacts(): VersionFacts {
  return {
    store: STORE_VERSION,
    binary: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null,
    build: Application.nativeBuildVersion ?? Constants.expoConfig?.ios?.buildNumber ?? null,
  };
}

export type SettingsActions = {
  back: () => void;
  banner: () => void;
  /** a swatch: an appearance key (system / light / dark / lavender / paper) */
  theme: (key: string) => void;
  font: (key: string) => void;
  row: (key: string) => void;
  toggle: (key: string, on: boolean) => void;
  notice: () => void;
  /** the language sheet */
  pickLanguage: (id: Lang) => void;
  closeLanguage: () => void;
  /** the delete sheet */
  confirmDelete: () => void;
  cancelDelete: () => void;
};

export type SettingsModel = {
  view: SettingsView;
  /** the exits' red for the React Native page (settings-model dangerInk; Swift mixes its own) */
  danger: string;
  /** the language sheet is up, and what it lists */
  picking: boolean;
  lang: Lang;
  langs: typeof LANGS;
  /** the courier's name, for the delete sheet's words */
  wren: string;
  /** the delete sheet is up, and the deletion is running */
  askDelete: boolean;
  deleting: boolean;
  act: SettingsActions;
};

export function useSettingsModel(): SettingsModel {
  const router = useRouter();
  const lang = useLang();
  const theme = useTheme();
  const { appearance, setAppearance, letterFont, setLetterFont, t: tk } = theme;
  const auth = useAuth();
  const { handle, profile, signOut, deleteAccount } = auth;
  const wren = useWrenName();
  const { premium, cofounderNo, refresh: refreshEntitlement } = useEntitlement();
  const { perm, check: checkPerm, turnOn } = useNotifyBanner();
  const { trial } = useFares();

  const [knock, setKnock] = useState(false);
  /* Notifications, one switch for this phone (owner, 2026-10-13) — null until read */
  const [notifyOn, setNotifyOnState] = useState<boolean | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [picking, setPicking] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // a switch's request still out (a permission prompt): a second flip waits for it
  const knockBusy = useRef(false);
  const notifyBusy = useRef(false);
  const restoringRef = useRef(false);
  const deletingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      morningKnockEnabled()
        .then((on) => alive && !knockBusy.current && setKnock(on))
        .catch((e) => console.warn("[settings] the knock switch wasn't read:", e));
      getNotifyOn()
        .then((on) => alive && !notifyBusy.current && setNotifyOnState(on))
        .catch((e) => {
          console.warn("[settings] the notifications switch wasn't read:", e);
          if (alive) setNotifyOnState(true); // the default; the next change writes it down
        });
      return () => {
        alive = false;
      };
    }, []),
  );

  const version = useMemo(versionFacts, []);
  const dob = typeof profile?.dob === "string" ? (profile.dob as string) : null;
  const language = LANGS.find((l) => l.id === lang) ?? LANGS[0];

  const view = useMemo(
    () =>
      buildSettingsView(
        {
          handle,
          dob,
          now: Date.now(),
          language: { flag: language.flag, label: language.label },
          wren,
          theme: { appearance, choices: APPEARANCES },
          letterFont: { selected: letterFont, choices: LETTER_FONT_CHOICES },
          perm,
          notifyOn,
          knock,
          premium,
          cofounderNo,
          firstClass: buildFirstClass4a({ premium, cofounderNo, wren, trial: trialLabel(trial, t) }, meFormat()),
          restoring,
          version,
        },
        t,
      ),
    // lang: every word follows the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handle, dob, language, wren, appearance, letterFont, perm, notifyOn, knock, premium, cofounderNo, trial, restoring, version, lang],
  );

  const onRestore = useCallback(async () => {
    if (restoringRef.current) return;
    restoringRef.current = true;
    setRestoring(true);
    const outcome = await iapRestoreOutcome();
    // First Class came back: say so everywhere now (Membership, the banner, Me), not at the next launch
    if (outcome === "restored") await refreshEntitlement().catch((e) => console.warn("[settings] entitlement refresh after restore:", e));
    restoringRef.current = false;
    setRestoring(false);
    const a = restoreAlert(outcome, t);
    Alert.alert(a.title, a.body);
  }, [refreshEntitlement]);

  const onToggleKnock = useCallback(
    async (want: boolean) => {
      if (knockBusy.current) return;
      knockBusy.current = true;
      setKnock(want); // the switch moves at once
      try {
        if (want) {
          const ok = await enableMorningKnock();
          setKnock(ok);
          if (!ok) Alert.alert(t("set.knock.deniedTitle"), t("set.knock.deniedBody", { wren }));
        } else {
          await disableMorningKnock();
          setKnock(false);
        }
      } catch (e) {
        console.warn("[settings] the knock switch:", e);
        setKnock(!want);
      } finally {
        knockBusy.current = false;
      }
    },
    [wren],
  );

  /* NOTIFICATIONS, ONE SWITCH (owner, 2026-10-13: "统一成两个 8 knock 和
     notification 一个 … 别让用户看见做选择"). Nine kinds underneath, one
     choice on the page. Turning it on asks iOS first if it still can; if iOS
     says no, the switch stays on (it's still what they want) and the notice
     at the top of THE QUIET says how to let it through. */
  const onToggleNotify = useCallback(
    async (want: boolean) => {
      if (notifyBusy.current) return;
      notifyBusy.current = true;
      setNotifyOnState(want);
      try {
        const allowed = await setNotifyOn(want);
        void checkPerm();
        if (want && !allowed) Alert.alert(t("set.knock.deniedTitle"), t("set.push.deniedBody", { wren }));
      } catch (e) {
        console.warn("[settings] the notifications switch:", e);
        // what the phone holds now is unknown: read it back rather than show a guess
        void getNotifyOn().then(setNotifyOnState, () => setNotifyOnState(!want));
      } finally {
        notifyBusy.current = false;
      }
    },
    [checkPerm, wren],
  );

  const onSignOut = useCallback(async () => {
    await signOut();
    router.replace("/onboarding");
  }, [signOut, router]);

  /* Account deletion (5.1.1(v)) — a real, in-app, no-email-required exit.
     The confirm is a sheet, not an Alert: the body is where the product
     decision lives in reader-facing words — letters stay unsigned, kindreds
     keep what you wrote, the sealed journal stays on the phone. */
  const confirmDelete = useCallback(async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    const r = await deleteAccount();
    deletingRef.current = false;
    setDeleting(false);
    setAskDelete(false);
    if ("error" in r) {
      Alert.alert(t("set.stillHere"), r.error);
      return;
    }
    router.replace("/onboarding");
  }, [deleteAccount, router]);

  const row = useCallback(
    (key: string) => {
      const k = key as SettingsRowKey;
      const to = ROW_ROUTES[k];
      if (to) {
        router.push(to as never);
        return;
      }
      switch (k) {
        case "language":
          setPicking(true);
          return;
        case "restore":
          void onRestore();
          return;
        case "manage":
          void Linking.openURL(SETTINGS_LINKS.manage).catch((e) => console.warn("[settings] manage:", e));
          return;
        case "rate":
          void Linking.openURL(SETTINGS_LINKS.rate).catch((e) => console.warn("[settings] rate:", e));
          return;
        case "terms":
          openTerms();
          return;
        case "privacy":
          openPrivacy();
          return;
        case "signOut":
          void onSignOut();
          return;
        case "deleteAccount":
          setAskDelete(true);
          return;
        default:
          return; // the age row, or a key from a later model: nothing to do
      }
    },
    [router, onRestore, onSignOut],
  );

  const act = useMemo<SettingsActions>(
    () => ({
      back: () => (router.canGoBack() ? router.back() : router.replace(SETTINGS_ROUTES.me as never)),
      banner: () => router.push(SETTINGS_ROUTES.banner as never),
      theme: (key) => {
        if (isAppearance(key)) setAppearance(key);
      },
      font: (key) => {
        if ((LETTER_FONT_CHOICES as readonly string[]).includes(key)) setLetterFont(key as LetterFontKey);
      },
      row,
      toggle: (key, on) => {
        if (key === "knock") void onToggleKnock(on);
        else if (key === "notify") void onToggleNotify(on);
      },
      notice: () => void turnOn(),
      pickLanguage: (id) => {
        setLang(id);
        setPicking(false);
        // the push token carries the language the server knocks in: tell it now, not at the
        // next launch (only when allowed: registering would otherwise raise iOS's question)
        if (perm === "granted") void registerForReplies();
      },
      closeLanguage: () => setPicking(false),
      confirmDelete: () => void confirmDelete(),
      cancelDelete: () => {
        if (!deletingRef.current) setAskDelete(false);
      },
    }),
    [router, setAppearance, setLetterFont, row, onToggleKnock, onToggleNotify, turnOn, perm, confirmDelete],
  );

  return {
    view,
    danger: dangerInk(tk.ink, P.post),
    picking,
    lang,
    langs: LANGS,
    wren,
    askDelete,
    deleting,
    act,
  };
}
