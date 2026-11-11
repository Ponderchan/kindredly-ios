import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { AFTER_FIFTEEN_VIEW } from "../../../modules/kindredly-ui/src/AfterFifteen";
import { t, useLang } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { PFM } from "../../theme/post";
import { clockTime, postmark } from "../../lib/format";
import { getStamp, sname } from "../../data/stamps";
import { deskDay } from "../../lib/day";
import { activeDays } from "../../lib/fc-rollout-core";
import { markKept, markReceipt, markShut, markStep, shiftDay, weekTotals, dayTotals, type AfterPage, type AfterState, type AfterToday, type DayLog, type Thing } from "../../lib/after-fifteen-core";
import { resetAfter, setDevAfterOnDemoDesk } from "../../lib/after-fifteen";
import { AFTER_FACT_COUNT } from "../../data/after-facts";
import { countdownLabel } from "../../screens/today/today-cards";
import { buildAfterView, type AfterFormat } from "../../screens/today/after-view";
import { AfterFifteenNative } from "../../screens/today/AfterFifteenNative";
import { useAfterLook, type AfterFifteenActions } from "../../screens/today/useAfterFifteen";
import "../../data/strings";
import "../../data/strings-today3d";
import "../../data/strings-step5-today";
import "../../data/strings-identity2";
import "../../data/strings-after";
import "../../data/strings-after-facts";

/* dev only — TODAY, AFTER FIFTEEN ON DEMO DATA (docs/today-after-fifteen.md).
   kindredly:///dev/after-fifteen

   The three pages as AfterFifteenNative draws them, from fixtures (no desk, no account, nothing
   kept: the page's state lives in this screen), through the same pure builder the Today tab runs
   on (screens/today/after-view buildAfterView) and the same moves (lib/after-fifteen-core
   markShut / markReceipt / markStep / markKept). Needs a dev client built with KAfterFifteenView
   (after pod install); the "afterfifteen" switch is not asked here.

   The panel (HIDE for a clean screenshot; a dot brings it back):
   - PAGE: box (the mailbox), receipt, bedtime;
   - THING: her fact, or a line of the day (a fixture line);
   - FACT: the fact's number, through all of them;
   - READ / REPLIED: the day's counts (15, 9, 1 · 2, 1, 0);
   - WEEK: the receipt with the week's totals (as on a Sunday) or the day's;
   - RUN: the days in a row before tonight (bedtime's dots);
   - PLAY: whether she can play (the strip);
   - UNDO: the Undo capsule up;
   - AGAIN: the page as it first comes up (shutter up, nothing printed, awake, not kept);
   - WIPE: forget what the real pages kept on this phone (lib/after-fifteen resetAfter).
   Every tap that would leave says where it would go. The panel's words are English: a dev page. */

const PAGES: readonly AfterPage[] = ["box", "receipt", "bedtime"];
const READS = [15, 9, 1] as const;
const REPLIES = [2, 1, 0] as const;
const RUNS = [5, 6, 0, 13] as const;
const LINE: Thing = { kind: "line", id: "demo", text: "I still set two cups out.", who: "No. 6059", stamp: "missing", at: "2026-11-11T09:00:00Z", why: "replied" };

const fresh = (day: string, page: AfterPage, thing: Thing): AfterToday => ({ day, page, thing, doneAt: Date.now(), open: false, kept: null, shut: false, receipt: "idle", fed: false, pat: false, asleep: false });

export default function AfterFifteenDev() {
  const { t: tk } = useTheme();
  /* ?desk=1: let the dev demo desk hand over to the real pages for this run, and open Today —
     pass its sample letters and the page takes the desk's place as it would on a real day
     (lib/after-fifteen setDevAfterOnDemoDesk) */
  const router = useRouter();
  const { desk } = useLocalSearchParams<{ desk?: string }>();
  useEffect(() => {
    if (!__DEV__ || desk !== "1") return;
    setDevAfterOnDemoDesk(true);
    router.replace("/(tabs)/letters" as never);
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const lang = useLang();
  const safe = useSafeAreaInsets();
  const available = isKindredlyUIViewAvailable(AFTER_FIFTEEN_VIEW);
  const look = useAfterLook();

  const [panel, setPanel] = useState(true);
  const [page, setPage] = useState<AfterPage>("box");
  const [line, setLine] = useState(false);
  const [factNo, setFactNo] = useState(1);
  const [read, setRead] = useState<number>(15);
  const [replied, setReplied] = useState<number>(2);
  const [week, setWeek] = useState(false);
  const [run, setRun] = useState<number>(5);
  const [canPlay, setCanPlay] = useState(true);
  const [undo, setUndo] = useState(false);
  const [serial, setSerial] = useState(0);

  const day = deskDay();
  const thing: Thing = line ? LINE : { kind: "fact", no: factNo };
  const [state, setState] = useState<AfterState>(() => ({ v: 1, finished: [], days: {}, desk: { day, ms: {}, notes: {} }, today: fresh(day, "box", { kind: "fact", no: 1 }), nights: [], lastKind: null, factNext: 1 }));
  // a chip that changes what the page is starts the page again
  useEffect(() => {
    setState((s) => ({ ...s, today: fresh(day, page, thing) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, line, factNo, serial, day]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(id);
  }, []);

  const fmt = useMemo<AfterFormat>(
    () => ({
      t,
      upper: (s) => s.toLocaleUpperCase(),
      clockHour: (h) => {
        const d = new Date();
        d.setHours(h, 0, 0, 0);
        return clockTime(d);
      },
      stampTime: (ms) => `${postmark(ms)} · ${clockTime(ms)}`,
      dayMark: (key) => {
        const [y, m, d] = key.split("-").map(Number);
        return postmark(new Date(y, m - 1, d, 12).getTime());
      },
      countdown: (u) => countdownLabel(u, t),
      stampName: (id) => {
        const def = getStamp(id);
        return def ? sname(def.name) : "";
      },
      isOwnWords: (id) => id.startsWith("c:"),
      weekdayLetter: (weekday) => new Date(2023, 0, 1 + weekday, 12).toLocaleDateString(lang, { weekday: "narrow" }),
      fact: (no) => ({ text: t(`af.fact.${no}`), foot: t(`af.fact.${no}.foot`) }),
    }),
    [lang],
  );

  const vm = useMemo(() => {
    const today = state.today;
    if (!today) return null;
    // the fixture's days: `run` in a row before tonight, and tonight
    const days = activeDays(
      Array.from({ length: run }, (_, i) => shiftDay(day, -(i + 1))),
      [day],
    );
    const log: Record<string, DayLog> = { [day]: { read, replied, stay: { almosts: 60000 } } };
    for (let i = 1; i < 7; i++) log[shiftDay(day, -i)] = { read: 15 - (i % 3), replied: i % 2, stay: i === 2 ? { missing: 40000 } : {} };
    return buildAfterView(
      { today, name: "Pond", read, replied, canPlay, now, days, totals: week ? weekTotals(log, day) : dayTotals(log[day], day), week, title: t("ld.today"), undo: undo ? t("id2.sheet.undo") : "", undoHint: t("ld.bringBack") },
      fmt,
    );
  }, [state.today, read, replied, canPlay, now, week, run, undo, day, fmt]);

  const act = useMemo<AfterFifteenActions>(() => {
    const away = (to: string) => Alert.alert("Dev page", `In the app this ${to}.`);
    return {
      slot: () => away("opens the composer (/compose)"),
      shut: (shut) => setState((s) => markShut(s, shut)),
      keep: (keep) => setState((s) => markKept(s, keep ? "dev" : null)),
      receipt: (phase) => setState((s) => markReceipt(s, phase)),
      share: (uri) => away(uri ? `shares the picture at ${uri}` : "could not make the picture"),
      step: (step) => setState((s) => markStep(s, step)),
      play: () => away("opens Free Flight (/courier?play=1)"),
      undo: () => {
        setUndo(false);
        away("brings the last letter back to the desk");
      },
    };
  }, []);

  if (!__DEV__) return <Redirect href="/" />;
  const next = <T,>(list: readonly T[], v: T): T => list[(list.indexOf(v) + 1) % list.length];

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ flex: 1 }} key={`${page}:${line}:${factNo}:${serial}`}>
        {available && vm ? (
          <AfterFifteenNative vm={vm} look={look} act={act} />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            <Text style={{ ...PFM.monoMed, fontSize: 12, color: tk.ink, textAlign: "center" }}>This dev client was built before KAfterFifteenView: pod install, then rebuild it.</Text>
          </View>
        )}
      </View>
      {panel ? (
        <View style={{ borderTopWidth: 1, borderTopColor: tk.line, backgroundColor: tk.sf, paddingTop: 8, paddingBottom: Math.max(safe.bottom, 8), gap: 6 }}>
          <Row>
            <Chip label="HIDE" onPress={() => setPanel(false)} />
            <Chip label={`PAGE ${page.toUpperCase()}`} onPress={() => setPage((p) => next(PAGES, p))} />
            <Chip label={`THING ${line ? "LINE" : "FACT"}`} onPress={() => setLine((v) => !v)} />
            <Chip label={`FACT ${factNo}/${AFTER_FACT_COUNT}`} onPress={() => setFactNo((n) => (n % Math.max(1, AFTER_FACT_COUNT)) + 1)} />
            <Chip label="AGAIN" onPress={() => setSerial((n) => n + 1)} />
          </Row>
          <Row>
            <Chip label={`READ ${read}`} onPress={() => setRead((n) => next(READS, n as (typeof READS)[number]))} />
            <Chip label={`REPLIED ${replied}`} onPress={() => setReplied((n) => next(REPLIES, n as (typeof REPLIES)[number]))} />
            <Chip label="WEEK" on={week} onPress={() => setWeek((v) => !v)} />
            <Chip label={`RUN ${run}`} onPress={() => setRun((n) => next(RUNS, n as (typeof RUNS)[number]))} />
            <Chip label="PLAY" on={canPlay} onPress={() => setCanPlay((v) => !v)} />
            <Chip label="UNDO" on={undo} onPress={() => setUndo((v) => !v)} />
            <Chip label="WIPE" onPress={() => void resetAfter().then(() => Alert.alert("Dev page", "What the real pages kept on this phone is forgotten."))} />
          </Row>
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
      <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 0.8, color: on ? tk.bg : tk.ink }}>{label}</Text>
    </Pressable>
  );
}
