import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { PF } from "../../theme/post";
import { TabBarSpace, nativeTabBarRoom } from "../../components/NativeTabBar";
import { useTodayCore, type TodayModel } from "../../screens/today/useTodayDesk";
import { TodayNative } from "../../screens/today/TodayNative";
import { TodayRN } from "../../screens/today/TodayRN";
import { TodayOverlays } from "../../screens/today/TodayOverlays";
import { DEMO_DESK, demoDeps, useDemoSource, type DemoFixture, type DemoReply } from "../../screens/today/today-demo";
import "../../data/strings-step5-today";

/* dev only — THE TODAY DESK ON FIXTURES (10a step 5, slice today).
   kindredly:///dev/step5-today

   The Today tab as either renderer draws it, on screens/today/today-demo's
   letters (no network, no account): a telegram the matcher named (auras
   close), a Spanish letter it also named (the translate capsule wins the
   slot; ES→EN translates in place), a long letter that folds (UNFOLD opens
   the reader), a voice letter (the sample sound plays through the desk's
   one player and stops on a swipe), a long Chinese letter folded before it
   is measured, an unsigned letter (the veil, no ⋯) — then the blind.
   The same model runs on it as on the tab (useTodayCore), so the card
   stack, the plate shrinking into its postmark, the reply strip on the
   keyboard, the send (the fly-by, "Reply sent.", the next card sliding up),
   the pouch, a refused reply and the guest sheet all behave as they will.

   The panel at the bottom (HIDE for a clean screenshot: the desk then
   leaves the floating tab bar's room, as on the tab; a dot brings it back):
   - THEME: the dev theme override (Classic / Midnight / Lavender / Paper,
     OFF = the normal theme), never saved;
   - SWIFT / RN: which renderer (SWIFT needs a dev client built with
     KTodayView, after pod install);
   - DESK · ARRIVAL (her first return: the strip of three envelopes, the
     first card unfolding) · LOADING (no desk yet: the plate blank, no
     blind) · KEPT (a desk shown while the first load is in flight) ·
     QUIET (nothing on the desk: CLOSED, the strip, the blind). LOADING
     and QUIET are also her first return, and must draw no arrival: there
     are no letters for her envelopes to be;
   - STRIP (an unopened post of Wren's), POUCH (five in flight: SEND dims,
     the sheet explains), and what the next reply does: OK · GONE (taken
     back: ld.unreachable, the letter leaves) · OFFLINE · SUSPENDED · GUEST
     (the sign-up sheet). RESET puts the letters back.
   Report and block say what they would do instead of reaching the server
   (a block still clears the writer's letters). The panel's words are
   English: a dev page. */

type Mode = "desk" | "arrival" | "loading" | "kept" | "quiet";
const MODES: { key: Mode; label: string }[] = [
  { key: "desk", label: "DESK" },
  { key: "arrival", label: "ARRIVAL" },
  { key: "loading", label: "LOADING" },
  { key: "kept", label: "KEPT" },
  { key: "quiet", label: "QUIET" },
];
const REPLIES: DemoReply[] = ["ok", "gone", "offline", "suspended", "guest"];

export default function Step5Today() {
  if (!__DEV__) return <Redirect href="/" />;
  return <TodayLab />;
}

function TodayLab() {
  const { key, t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const safe = useSafeAreaInsets();
  const swiftAvailable = isKindredlyUIViewAvailable("KTodayView");

  const [swift, setSwift] = useState(swiftAvailable);
  const [mode, setMode] = useState<Mode>("desk");
  const [strip, setStrip] = useState(true);
  const [pouch, setPouch] = useState(false);
  const [reply, setReply] = useState<DemoReply>("ok");
  const [panel, setPanel] = useState(true);
  const [round, setRound] = useState(0); // RESET: a new pool object puts every letter back

  const fixture = useMemo<DemoFixture>(
    () => ({
      pool: mode === "loading" || mode === "quiet" ? [] : mode === "arrival" ? DEMO_DESK.slice(0, 3) : [...DEMO_DESK],
      loaded: mode !== "loading" && mode !== "kept",
      flights: pouch ? 5 : 1,
      waiting: 2,
      // she has just come back in LOADING and QUIET too: neither may draw her envelopes over nothing
      fresh: mode === "arrival" || mode === "loading" || mode === "quiet",
      deskUnread: strip ? 1 : 0,
    }),
    // round: RESET deals the same letters again as a new desk
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, pouch, strip, round],
  );
  const replyRef = useRef(reply);
  replyRef.current = reply;
  const source = useDemoSource(fixture);
  const blockedRef = useRef<(author: string) => void>(() => {});
  const deps = useMemo(() => demoDeps({ reply: () => replyRef.current, blocked: (a) => blockedRef.current(a) }), []);
  const model: TodayModel = useTodayCore(source, deps);
  blockedRef.current = model.act.blocked;

  const themeLabel = forced ? THEMES[forced].name.toUpperCase() : "OFF";
  // with the panel hidden the desk leaves the floating tab bar's room, as on the tab
  const room = panel ? 0 : nativeTabBarRoom(safe.bottom);

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <TabBarSpace.Provider value={room}>
        <View style={{ flex: 1 }}>
          {swift && swiftAvailable ? <TodayNative model={model} /> : <TodayRN model={model} />}
          <TodayOverlays model={model} />
        </View>
      </TabBarSpace.Provider>

      {panel ? (
        <View style={{ borderTopWidth: 1, borderTopColor: tk.line, backgroundColor: tk.sf, paddingTop: 8, paddingBottom: Math.max(safe.bottom, 8), gap: 6 }}>
          <Row>
            <Chip label="HIDE" onPress={() => setPanel(false)} />
            {(["off", ...THEME_KEYS] as const).map((k) => (
              <Chip key={k} label={k === "off" ? "OFF" : THEMES[k as ThemeKey].name.toUpperCase()} on={k === "off" ? !forced : forced === k} onPress={() => setDevThemeOverride(k === "off" ? null : (k as ThemeKey))} />
            ))}
          </Row>
          <Row>
            <Chip label="SWIFT" on={swift && swiftAvailable} onPress={() => (swiftAvailable ? setSwift(true) : Alert.alert("Dev page", "This dev client was built before KTodayView: pod install, then rebuild it."))} />
            <Chip label="RN" on={!swift || !swiftAvailable} onPress={() => setSwift(false)} />
            {MODES.map((m) => (
              <Chip key={m.key} label={m.label} on={mode === m.key} onPress={() => setMode(m.key)} />
            ))}
          </Row>
          <Row>
            <Chip label="STRIP" on={strip} onPress={() => setStrip((v) => !v)} />
            <Chip label="POUCH" on={pouch} onPress={() => setPouch((v) => !v)} />
            {REPLIES.map((r) => (
              <Chip key={r} label={r.toUpperCase()} on={reply === r} onPress={() => setReply(r)} />
            ))}
            <Chip label="RESET" onPress={() => setRound((n) => n + 1)} />
          </Row>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 10, color: tk.sub, paddingHorizontal: 12 }}>
            {`THEME ${themeLabel} (${key}) · ${swift && swiftAvailable ? "SWIFTUI" : "REACT NATIVE"}${swiftAvailable ? "" : " (no KTodayView in this build)"} · PAGE ${model.view.idx}/${model.view.feed.length}`}
          </Text>
        </View>
      ) : (
        <Pressable onPress={() => setPanel(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Show the dev panel" style={{ position: "absolute", left: 10, bottom: Math.max(safe.bottom, 10), width: 14, height: 14, borderRadius: 7, backgroundColor: tk.ind, opacity: 0.5 }} />
      )}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
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
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 0.8, color: on ? tk.bg : tk.ink }}>{label}</Text>
    </Pressable>
  );
}
