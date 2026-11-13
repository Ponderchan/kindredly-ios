import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFlags, setFlag } from "../../lib/flags";
import { Alert, Linking } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { STORE_OF_BINARY } from "../../lib/update-prompt-core";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { iapRestoreOutcome } from "../../lib/iap";
import { LANGS, setLang, t, useLang, type Lang } from "../../lib/i18n";
import { openPrivacy, openTerms } from "../../lib/legal";
import { disableMorningKnock, enableMorningKnock, morningKnockEnabled, registerForReplies, setNotifyOn } from "../../lib/notify";
import { PREF_JOB_MS, getNotifyOn, readPushPrefs, setPushPref, within } from "../../lib/local-push";
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
import "../../data/strings-audit-notes"; // set.export*
import "../../data/strings-book-screen"; // bk.set.sub
import "../../data/strings-book-buy"; // bkb.restored (Restore purchases, when only the journal book came back)
import { exportablePages, shareJournalExport } from "../../lib/journal-export-file";
import { JOURNAL_BOOK_ROUTE, journalBookPageThere } from "../journal-book/available";

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
     sheets as window-level modals, above the floating tab bar);
   - Export my journal (owner's audit, 2026-11-10): the journal's words are
     written into one text file in the cache (lib/journal-export-file) and
     handed to the iOS share sheet with React Native's own Share, so the
     reader can save it to Files, AirDrop it or mail it. Nothing is sent
     anywhere by the app; photos and recordings are not in the file, as the
     row's sub-line says. The row's count is read on every focus; a journal
     with no page says so and the tap does nothing; a journal that can't be
     read, or a file that can't be written, is said as a failure — never as
     an empty journal. One export at a time (the row reads … meanwhile).
     THE JOURNAL BOOK (2026-11-10): on a binary that can make the book and
     has its page (journal-book/available), the same row opens /journal-book
     instead (a preview of the reader's own book, the PDF for First Class,
     and this same text export one tap away as "Just the words"), and its
     sub-line says both ways out. On any other binary nothing above changes.
     The write-then-share itself is lib/journal-export-file
     shareJournalExport, the one function both places call. */

/** The binary's own version (expo-application), the store's label beside it (owner question 7). */
export function versionFacts(): VersionFacts {
  const binary = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;
  // the store's label read off the binary (update-prompt-core's table), so no release forgets it:
  // 1.2.7 (38) said "1.0.5 (38)" (owner, 2026-10-31)
  return {
    store: (binary && STORE_OF_BINARY[binary]) || STORE_VERSION,
    binary,
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
  /** the First Class card is put away: this reader isn't a member and has tapped it once */
  bannerHidden: boolean;
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

/** the First Class card at the top of Settings was tapped by a reader who isn't a member */
const FC_BANNER_TAPPED = "settings_fc_tapped";

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
  /* the First Class card at the top was tapped once (lib/flags, per account on this phone) */
  const [fcTapped, setFcTapped] = useState(false);
  useEffect(() => {
    let alive = true;
    getFlags().then((f) => alive && setFcTapped(!!f[FC_BANNER_TAPPED]));
    return () => {
      alive = false;
    };
  }, []);
  const [picking, setPicking] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // a switch's request still out (a permission prompt): a second flip waits for it
  /* The evening question's switch (owner, 2026-11-10): shown only once the account's daily_line
     has been seen on, and from then on for as long as this page stays up, so a reader who turns
     it off can turn it straight back on; the next visit, off means no row. */
  const [evening, setEvening] = useState<{ shown: boolean; on: boolean }>({ shown: false, on: false });
  const eveningBusy = useRef(false);
  const knockBusy = useRef(false);
  const notifyBusy = useRef(false);
  const restoringRef = useRef(false);
  const deletingRef = useRef(false);
  /* Export my journal: how many pages it would hold (null until counted, or when the journal
     couldn't be read: the row stays live and the tap says what happened), and the file being written */
  const [journalPages, setJournalPages] = useState<number | null>(null);
  const journalPagesRef = useRef<number | null>(null);
  journalPagesRef.current = journalPages;
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  /* the journal book: this binary makes it and has its page (asked once; a binary can't gain either while it runs) */
  const bookThere = useMemo(journalBookPageThere, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      exportablePages()
        .then((n) => alive && setJournalPages(n))
        .catch((e) => {
          console.warn("[settings] the journal wasn't counted for the export row:", e);
          if (alive) setJournalPages(null);
        });
      readPushPrefs()
        .then((read) => {
          if (!alive || eveningBusy.current) return;
          const on = !!read.prefs.daily_line;
          setEvening((e) => ({ shown: e.shown || on, on }));
        })
        .catch((e) => console.warn("[settings] the evening question's switch wasn't read:", e));
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
          evening,
          premium,
          cofounderNo,
          firstClass: buildFirstClass4a({ premium, cofounderNo, wren, trial: trialLabel(trial, t) }, meFormat()),
          restoring,
          journalPages,
          exporting,
          journalBook: bookThere,
          version,
        },
        t,
      ),
    // lang: every word follows the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handle, dob, language, wren, appearance, letterFont, perm, notifyOn, knock, evening, premium, cofounderNo, trial, restoring, journalPages, exporting, bookThere, version, lang],
  );

  /* EXPORT MY JOURNAL: write the words to one file, then the share sheet (see the top comment).
     The share sheet's own Cancel is not a failure; a journal with no page just updates the row. */
  const onExport = useCallback(async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    try {
      // 0: the journal has no page (nothing was written, no sheet opened)
      setJournalPages(await shareJournalExport());
    } catch (e) {
      console.warn("[settings] the journal wasn't exported:", e);
      Alert.alert(t("set.export"), t("cp.fail.generic"));
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }, []);

  const onRestore = useCallback(async () => {
    if (restoringRef.current) return;
    restoringRef.current = true;
    setRestoring(true);
    const outcome = await iapRestoreOutcome();
    // First Class came back: say so everywhere now (Membership, the banner, Me), not at the next launch.
    // The journal book bought once came back: the export page's key unlocks now (lib/entitlement bookOwned)
    if (outcome === "restored" || outcome === "book") await refreshEntitlement().catch((e) => console.warn("[settings] entitlement refresh after restore:", e));
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

  /* The evening question, off and on again: the account's daily_line, written the way Notes'
     own Turn Off writes it (useEveningAsk). The switch moves at once; a save that fails puts it
     back and says so. Turning it back on also turns this phone's Notifications on, as saying yes
     in Notes does: off, the 9 o'clock line would never be sent. */
  const onToggleEvening = useCallback(async (want: boolean) => {
    if (eveningBusy.current) return;
    eveningBusy.current = true;
    setEvening({ shown: true, on: want });
    try {
      if (want && !(await getNotifyOn())) {
        await setNotifyOn(true);
        setNotifyOnState(true);
      }
      await within(setPushPref("daily_line", want), PREF_JOB_MS + 5000, "evening question switch");
    } catch (e) {
      console.warn("[settings] the evening question's switch:", e);
      setEvening({ shown: true, on: !want });
      Alert.alert(t("set.cantSave"), t("set.push.saveFail"));
    } finally {
      eveningBusy.current = false;
    }
  }, []);

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

  /* SIGN OUT ASKS FIRST AND SAYS IT WENT (owner, 2026-10-31: "no feedback, I couldn't tell if I
     had signed out"): the system's confirm, what stays with the account, and a success tap as it
     goes; a guest has no account to keep anything, so only the question */
  const onSignOut = useCallback(async () => {
    Alert.alert(t("set.signOut.ask"), auth.isGuest ? undefined : t("set.signOut.body"), [
      { text: t("set.signOut.stay"), style: "cancel" },
      {
        text: t("set.signOut"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            await signOut();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            router.replace("/onboarding");
          })();
        },
      },
    ]);
  }, [signOut, router, auth.isGuest]);

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
        case "exportJournal":
          // no page of their own on this phone yet: say so, rather than a row that does nothing
          if (journalPagesRef.current === 0) {
            Alert.alert(t("set.export"), t("set.export.none"));
            return;
          }
          // the journal book's page where this binary has it; otherwise the text file, as before
          if (bookThere) router.push(JOURNAL_BOOK_ROUTE as never);
          else void onExport();
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
    [router, onRestore, onSignOut, onExport, bookThere],
  );

  const act = useMemo<SettingsActions>(
    () => ({
      back: () => (router.canGoBack() ? router.back() : router.replace(SETTINGS_ROUTES.me as never)),
      banner: () => {
        /* ONE TAP AND IT STEPS ASIDE (owner, 2026-11-13: "first class 做个策略 如果用户点了 就消
           失"): a reader who isn't a member has seen the offer by opening it, so the card at the
           top of Settings goes for good (on this phone, for this account); First Class stays in
           its own group below. A member's card is their membership, not an offer: it stays. */
        if (!premium) {
          void setFlag(FC_BANNER_TAPPED);
          setFcTapped(true);
        }
        router.push(SETTINGS_ROUTES.banner as never);
      },
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
        else if (key === "evening") void onToggleEvening(on);
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
    [router, setAppearance, setLetterFont, row, onToggleKnock, onToggleNotify, onToggleEvening, turnOn, perm, confirmDelete, premium],
  );

  return {
    view,
    bannerHidden: !premium && fcTapped,
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
