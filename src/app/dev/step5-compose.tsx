import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hasKindredlyStampArt, isKindredlyUIViewAvailable, type KScreenHandle } from "../../../modules/kindredly-ui";
import { BIRTHDAY_STAMP } from "../../lib/birthday-stamp-core";
import { setDevBirthdayStamp } from "../../lib/birthday-stamp";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { getLang, setLang, t, useLang, type Lang } from "../../lib/i18n";
import { OFFICIAL_NAME } from "../../lib/wren-desk";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { PFM } from "../../theme/post";
import { LetterTravel } from "../../components/LetterTravel";
import { LeaveSheet, type LeaveAction } from "../../components/LeaveSheet";
import type { Draft } from "../../lib/drafts";
import type { BumpResult } from "../../lib/api";
import { useComposeState, type ComposeIO, type ComposeParams } from "../../screens/compose/useComposeState";
import { ComposeNative } from "../../screens/compose/ComposeNative";
import { ComposeRN } from "../../screens/compose/ComposeRN";
import "../../data/strings-step5-compose";

/* dev only — THE COMPOSE PAGE ON DEMO DATA (10a step 5, slice compose).
   kindredly:///dev/step5-compose

   The compose page as either renderer draws it, from the same state hook
   the route runs (useComposeState), with every network call, storage write
   and account step stood in for (no network, no account, nothing saved):
   her gate says yes after a beat, the cap counts letters in memory, drafts
   live in this page, the courier flies and comes back to a fresh page.

   The panel at the bottom (HIDE for a clean screenshot; the dot brings it
   back):
   - THEME: the dev theme override (Classic / Midnight / Lavender / Paper,
     OFF = the normal theme), the whole app, never saved;
   - SWIFT / RN: which renderer (SWIFT needs a dev client built with
     KComposeView, after pod install);
   - PAGE: EMPTY (a fresh page, the spark), FLOOR (a first line: the floor
     line half full), STAMP? (words enough and no stamp: PICK A MOOD STAMP
     and its nudge), DRAFT (a resumed draft with its stamp and question: the
     caret stays in the letter), LONG (near the ceiling: the count in brass),
     each a fresh page;
   - LANG: EN / IT / FR / DE / JA, the app's language for this session
     (not saved; the language the page opened with comes back when it
     closes). STAMP? in IT, FR and DE is the travel key's longest label
     (SCEGLI UN FRANCOBOLLO DELL'UMORE wraps to two lines on an SE instead
     of pushing the + off the left edge); EMPTY in FR or JA shows Wren's
     once-per-language hello whole (once per language per install);
   - FC (First Class: no quota, the voice letter open), FC@SERVER (First
     Class by the server's word only, as when the entitlement read failed
     at launch: the page guesses free and shows the count, the server says
     premium — at 0 the letter still goes, and the count and panel leave),
     GUEST (the cap's check asks for an account), LEFT ? / 4 / 1 / 0 (the
     free writer's day; 0 shows the cap panel at once, drawn only while the
     keyboard and the trays are away — check it on an SE-sized simulator),
     FAIL (the publish fails: the page comes back with its words), CAP (the
     server says the day is spent), BDAY (owner's audit, 2026-11-10: today
     is the reader's birthday for this page, lib/birthday-stamp's dev
     switch, never saved — open the stamps: the birthday stamp is first,
     under TODAY ONLY; off, it is offered nowhere. Needs a dev client whose
     Swift has the stamp's drawing; an older one says so).
   Under VoiceOver, a two-finger Z closes an open tray, then asks to leave.
   What would leave the page (back, the paywall, the sign-up sheet) says
   where it would go instead. The panel's words are English: a dev page. */

type Page = "empty" | "floor" | "stamp" | "draft" | "long";
const PAGES: { key: Page; label: string }[] = [
  { key: "empty", label: "EMPTY" },
  { key: "floor", label: "FLOOR" },
  { key: "stamp", label: "STAMP?" },
  { key: "draft", label: "DRAFT" },
  { key: "long", label: "LONG" },
];
const DEV_LANGS: Lang[] = ["en", "it", "fr", "de", "ja"];
type Left = null | 4 | 1 | 0;
const LEFTS: { key: Left; label: string }[] = [
  { key: null, label: "LEFT ?" },
  { key: 4, label: "4" },
  { key: 1, label: "1" },
  { key: 0, label: "0" },
];

const DEMO_DRAFT: Draft = {
  id: "d-demo",
  date: "2026-10-14T21:12:00.000Z",
  stamp: "made-my-day",
  body: "The bus driver waited for me today. I was running with my coat half on and he just sat there with the door open, not even looking annoyed.",
  ask: "What small kindness stayed with you this week?",
};
const FLOOR_TEXT = "I fixed the";
// past the floor (20 weighted), no stamp yet: the key asks for one
const READY_TEXT = "I fixed the squeaky gate this morning and nobody noticed, which felt right.";
// about 980 weighted: the count near the ceiling, in brass
const LONG_TEXT = ("I keep a list of the small things that went right. " as string).repeat(19).trim();

export default function Step5Compose() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ComposeLab />;
}

function ComposeLab() {
  useLang();
  const { key, t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const safe = useSafeAreaInsets();
  const swiftAvailable = isKindredlyUIViewAvailable("KComposeView");

  const [swift, setSwift] = useState(swiftAvailable);
  const [page, setPage] = useState<Page>("empty");
  const [premium, setPremium] = useState(false);
  const [serverPremium, setServerPremium] = useState(false);
  const [guest, setGuest] = useState(false);
  // a first kindred: opens the Airmail paper (letter papers)
  const [kindred, setKindred] = useState(false);
  const [left, setLeft] = useState<Left>(4);
  const [fail, setFail] = useState(false);
  const [cap, setCap] = useState(false);
  // BDAY: today is the reader's birthday for this page (lib/birthday-stamp's dev switch, never saved):
  // the birthday stamp comes first in the stamps, under TODAY ONLY; it goes back as the page closes
  const [bday, setBday] = useState(false);
  const bdayDrawn = hasKindredlyStampArt(BIRTHDAY_STAMP);
  useEffect(() => {
    setDevBirthdayStamp(bday);
    return () => setDevBirthdayStamp(false);
  }, [bday]);
  const [panel, setPanel] = useState(true);
  // a fresh page for every change of page, renderer, account or day
  const [run, setRun] = useState(0);
  const pageKey = `${run}:${page}:${swift}:${premium}:${serverPremium}:${guest}:${kindred}:${String(left)}`;
  const lang = useLang();

  // the language this page opened with comes back when it closes
  useEffect(() => {
    const opened = getLang();
    return () => setLang(opened, false);
  }, []);

  const themeLabel = forced ? THEMES[forced].name.toUpperCase() : "OFF";

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ flex: 1 }}>
        <DemoPage
          key={pageKey}
          page={page}
          swift={swift && swiftAvailable}
          premium={premium}
          serverPremium={serverPremium}
          guest={guest}
          kindred={kindred}
          left={left}
          fail={fail}
          cap={cap}
          onDone={() => setRun((n) => n + 1)}
        />
      </View>

      {panel ? (
        <View style={{ borderTopWidth: 1, borderTopColor: tk.line, backgroundColor: tk.sf, paddingTop: 8, paddingBottom: Math.max(safe.bottom, 8), gap: 6 }}>
          <Row>
            <Chip label="HIDE" onPress={() => setPanel(false)} />
            {(["off", ...THEME_KEYS] as const).map((k) => (
              <Chip key={k} label={k === "off" ? "OFF" : THEMES[k as ThemeKey].name.toUpperCase()} on={k === "off" ? !forced : forced === k} onPress={() => setDevThemeOverride(k === "off" ? null : (k as ThemeKey))} />
            ))}
          </Row>
          <Row>
            <Chip label="SWIFT" on={swift && swiftAvailable} onPress={() => (swiftAvailable ? setSwift(true) : Alert.alert("Dev page", "This dev client was built before KComposeView: pod install, then rebuild it."))} />
            <Chip label="RN" on={!swift || !swiftAvailable} onPress={() => setSwift(false)} />
            {PAGES.map((p) => (
              <Chip key={p.key} label={p.label} on={page === p.key} onPress={() => { setPage(p.key); setRun((n) => n + 1); }} />
            ))}
          </Row>
          <Row>
            {DEV_LANGS.map((l) => (
              <Chip key={l} label={l.toUpperCase()} on={lang === l} onPress={() => { setLang(l, false); setRun((n) => n + 1); }} />
            ))}
          </Row>
          <Row>
            <Chip label="FC" on={premium} onPress={() => setPremium((v) => !v)} />
            <Chip label="FC@SERVER" on={serverPremium} onPress={() => setServerPremium((v) => !v)} />
            <Chip label="GUEST" on={guest} onPress={() => setGuest((v) => !v)} />
            <Chip label="KINDRED" on={kindred} onPress={() => setKindred((v) => !v)} />
            {LEFTS.map((l) => (
              <Chip key={l.label} label={l.label} on={left === l.key} onPress={() => setLeft(l.key)} />
            ))}
            <Chip label="FAIL" on={fail} onPress={() => setFail((v) => !v)} />
            <Chip label="CAP" on={cap} onPress={() => setCap((v) => !v)} />
            <Chip
              label="BDAY"
              on={bday}
              onPress={() => (bdayDrawn ? setBday((v) => !v) : Alert.alert("Dev page", "This dev client was built before the birthday stamp's drawing (KStampArtData.swift) and the module's hasStampArt: rebuild it. Until then the stamp is offered nowhere, by design."))}
            />
          </Row>
          <Text style={{ ...PFM.monoMed, fontSize: 10, color: tk.sub, paddingHorizontal: 12 }}>
            {`THEME ${themeLabel} (${key}) · ${swift && swiftAvailable ? "SWIFTUI" : "REACT NATIVE"}${swiftAvailable ? "" : " (no KComposeView in this build)"}`}
          </Text>
        </View>
      ) : (
        <Pressable onPress={() => setPanel(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Show the dev panel" style={{ position: "absolute", left: 10, top: Math.max(safe.top, 10) + 50, width: 14, height: 14, borderRadius: 7, backgroundColor: tk.ind, opacity: 0.5 }} />
      )}
    </View>
  );
}

/* One compose page on the demo: the route's own layout (the page, the
   courier above it, the leave sheet), with the world stood in for. */
function DemoPage(p: { page: Page; swift: boolean; premium: boolean; serverPremium: boolean; guest: boolean; kindred: boolean; left: Left; fail: boolean; cap: boolean; onDone: () => void }) {
  const { t: tk } = useTheme();
  const viewRef = useRef<KScreenHandle>(null);
  const drafts = useRef(new Map<string, Draft>([[DEMO_DRAFT.id, DEMO_DRAFT]]));
  const used = useRef(p.left == null ? 0 : 5 - p.left);
  const recent = useRef<string[]>(["cant-sleep", "made-my-day", "not-a-stamp"]);
  const flags = useRef(p);
  flags.current = p;

  const params = useMemo<ComposeParams>(
    () =>
      p.page === "draft"
        ? { draft: DEMO_DRAFT.id }
        : p.page === "floor"
          ? { seed: FLOOR_TEXT }
          : p.page === "stamp"
            ? { seed: READY_TEXT }
            : p.page === "long"
              ? { seed: LONG_TEXT, stamp: "tiny-win" }
              : {},
    [p.page],
  );

  const io = useMemo<Partial<ComposeIO>>(() => {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const away = (where: string) => Alert.alert("Dev page", `In the app this opens ${where}.`);
    return {
      screen: async () => {
        await wait(300);
        return { ok: true };
      },
      bumpLetters: async (): Promise<BumpResult> => {
        await wait(200);
        const f = flags.current;
        if (f.guest) return { ok: false, reason: "unauthorized" };
        // First Class (by the page's word or the server's alone): counted (honest stats), never capped
        if (f.premium || f.serverPremium) return { ok: true, premium: true, count: ++used.current };
        if (f.cap || used.current >= 5) return { ok: false, reason: "daily_cap", cap: 5, used: used.current };
        return { ok: true, premium: false, count: ++used.current, cap: 5 };
      },
      lettersLeftToday: async () => (flags.current.left == null ? null : { count: used.current, left: Math.max(0, 5 - used.current) }),
      publishLetter: async (_stamp, _body, _lang, paper) => {
        await wait(500);
        console.log(`[step5-compose] publishing on paper ${String(paper ?? null)}`);
        return flags.current.fail ? null : "demo-letter";
      },
      fetchHasKindred: async () => flags.current.kindred,
      publishVoiceLetter: async () => {
        await wait(500);
        return flags.current.fail ? null : true;
      },
      saveDraft: async (d) => {
        const id = d.id || `d-${Date.now()}`;
        drafts.current.set(id, { id, date: new Date().toISOString(), stamp: d.stamp, body: d.body, ask: d.ask });
        console.log(`[step5-compose] draft ${id} saved (${drafts.current.size} kept)`);
        return id;
      },
      getDraft: async (id) => drafts.current.get(id) ?? null,
      deleteDraft: async (id) => {
        drafts.current.delete(id);
        console.log(`[step5-compose] draft ${id} thrown away (${drafts.current.size} kept)`);
        return [...drafts.current.values()];
      },
      readRecentStamps: async () => recent.current,
      noteStampUsed: async (id) => {
        recent.current = [id, ...recent.current.filter((x) => x !== id)].slice(0, 8);
        return recent.current;
      },
      nextSpark: async () => t("sp.day.1"),
      sent: ({ mode, stamp, id }) => console.log(`[step5-compose] sent a ${mode} letter, stamp ${stamp}, id ${String(id)}`),
      goBack: () => {
        away("the page underneath (back)");
        p.onDone();
      },
      push: (href) => away(href),
    };
    // made once per page: the flags are read live through the ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = useComposeState({
    params,
    env: { premium: p.premium, premiumSettled: true, isGuest: p.guest, signedIn: true, wren: OFFICIAL_NAME },
    target: viewRef,
    tk,
    io,
  });
  const { act } = state;

  // the sign-up sheet would start a real sign-in: say so instead
  useEffect(() => {
    if (!state.needsAccount) return;
    Alert.alert("Dev page", "In the app the sign-up sheet opens here (cp.signup.reason).", [{ text: "OK", onPress: act.closeSignUp }]);
  }, [state.needsAccount, act]);

  const leaveActions: LeaveAction[] = [
    ...(state.leaveCanSave ? [{ label: t("cp.leave.draft"), kind: "primary" as const, onPress: act.saveAndLeave }] : []),
    { label: t("cp.leave.discard"), kind: "destructive", onPress: act.discard },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      {p.swift ? <ComposeNative state={state} viewRef={viewRef} /> : <ComposeRN state={state} />}
      {state.step === "sending" && (
        <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { backgroundColor: tk.bg }]}>
          <LetterTravel ready={state.done} onDone={act.travelDone} />
        </View>
      )}
      <LeaveSheet open={state.leaving} title={t("cp.leave.title")} body={t("cp.leave.body")} actions={leaveActions} onCancel={act.keepWriting} />
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
      {children}
    </ScrollView>
  );
}

function Chip({ label, on = false, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: on ? tk.ink : tk.line, backgroundColor: on ? tk.ink : tk.sf, opacity: pressed ? 0.7 : 1 })}
    >
      <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 0.8, color: on ? tk.bg : tk.ink }}>{label}</Text>
    </Pressable>
  );
}
