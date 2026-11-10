import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { speakAs } from "../../lib/wren-name";
import { setDevIdentityPreview, useIdentityOn } from "../../lib/identity";
import { useWhoBook } from "../../lib/who";
import { OFFICIAL_NAME } from "../../lib/wren-desk";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { PFM } from "../../theme/post";
import { DEMO_ROOM_SEEN, DEMO_WREN_POSTS, demoThreads } from "../../data/demo";
import { LeaveSheet } from "../../components/LeaveSheet";
import { buildKindredsView, threadById, type ListTab, type LoadState, type Show } from "../../screens/kindreds/kindreds-model";
import { kindredsFormat, type KindredsActions, type KindredsModel, type KindredsScroll } from "../../screens/kindreds/useKindredsModel";
import { KindredsNative } from "../../screens/kindreds/KindredsNative";
import { KindredsRN } from "../../screens/kindreds/KindredsRN";
import { KindredsEmpty } from "../../screens/kindreds/KindredsEmpty";
import "../../data/strings-step5-kindreds";

/* dev only — THE KINDREDS TAB ON DEMO DATA (10a step 5, slice kindreds).
   kindredly:///dev/step5-kindreds

   The Kindreds screen as either renderer draws it, from data/demo's
   fixtures (no network, no account): every row state the sim checks ask
   for — kindreds with unread numbers (a seeded room-seen ledger), pen pals
   on the five-each road (YOUR TURN / THEIR TURN, n/5, the brass moments),
   a room closing soon, a quiet room in Expired with Rekindle, a closed
   kindred and a closed pen pal, the folded THEIR TURN row, Wren pinned
   with an unread post — built by the same pure model the tab runs on
   (screens/kindreds/kindreds-model) and drawn by KindredsNative (SwiftUI)
   or KindredsRN.

   The panel at the bottom (HIDE for a clean screenshot; a dot brings it
   back):
   - THEME: the dev theme override (Classic / Midnight / Lavender / Paper,
     OFF = the normal theme), the whole app, never saved;
   - SWIFT / RN: which renderer (SWIFT needs a dev client built with
     KKindredsView, after pod install);
   - DATA: the demo rows · kindreds only (PEN PALS shows its hint) · pen
     pals only (KINDREDS shows its hint) · offline with nothing kept · empty
     (the React Native empty state);
   - FC (First Class: nothing expires), WAIT (the entitlement hasn't
     answered: no Expired flash), NOTICE (the notifications bar), ONCE (her
     line), NAMES (the identity switch previewed on for this run of the
     app, never saved: courier names, frosted windows on the rows, the fold
     and the orbit, made-up ♀/♂ and star signs, "was No." — lib/identity
     setDevIdentityPreview).
   The screen's own controls work on the demo: chips, the title's count
   (ALL + your turn + the scroll to the list), CLEAR, the fold, the band
   (Orbit chip, pull, push up), mark read / unread (a local ledger), block
   (the sheet, then the row goes). What would leave the page (a room, a
   chat, their page, the paywall, Wren's desk, a hint, report) says where
   it would go instead. The panel's words are English: a dev page. */

type Data = "demo" | "kindreds" | "penpals" | "offline" | "empty";
const DATA: { key: Data; label: string }[] = [
  { key: "demo", label: "DEMO" },
  { key: "kindreds", label: "KINDREDS ONLY" },
  { key: "penpals", label: "PEN PALS ONLY" },
  { key: "offline", label: "OFFLINE" },
  { key: "empty", label: "EMPTY" },
];

export default function Step5Kindreds() {
  if (!__DEV__) return <Redirect href="/" />;
  return <KindredsLab />;
}

function KindredsLab() {
  const lang = useLang();
  const { key, t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const safe = useSafeAreaInsets();
  const swiftAvailable = isKindredlyUIViewAvailable("KKindredsView");

  const [swift, setSwift] = useState(swiftAvailable);
  const [data, setData] = useState<Data>("demo");
  const [premium, setPremium] = useState(false);
  const [unsettled, setUnsettled] = useState(false);
  const [notice, setNotice] = useState(false);
  const [once, setOnce] = useState(true);
  const [panel, setPanel] = useState(true);

  const [tab, setTab] = useState<ListTab>("all");
  const [show, setShow] = useState<Show>(null);
  const [scroll, setScroll] = useState<KindredsScroll>({ serial: 0, target: "top" });
  const [ledger, setLedger] = useState<Record<string, number>>(DEMO_ROOM_SEEN);
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set());
  const [blocking, setBlocking] = useState<string | null>(null);
  // the search field's words (owner's audit, 2026-11-10); null while not searching
  const [search, setSearch] = useState<string | null>(null);

  const threads = useMemo(() => {
    const all = demoThreads({ store: false }).filter((th) => !gone.has(th.id));
    if (data === "kindreds") return all.filter((th) => th.revealed);
    if (data === "penpals") return all.filter((th) => !th.revealed);
    if (data === "offline" || data === "empty") return [];
    return all;
  }, [data, gone]);
  const loadState: LoadState = data === "offline" ? "failed" : data === "empty" ? "none" : "ready";
  const desk = DEMO_WREN_POSTS[DEMO_WREN_POSTS.length - 1];
  // who the demo pen pals are, as the tab asks it (lib/who): the NAMES chip previews the switch on
  const names = useIdentityOn();
  const strangers = useMemo(() => threads.filter((th) => !th.revealed && !th.gone).map((th) => th.other), [threads]);
  const who = useWhoBook({ threads, uids: strangers });

  const view = useMemo(
    () =>
      buildKindredsView(
        {
          threads,
          ledger,
          premium,
          settled: !unsettled,
          tab,
          show,
          loadState,
          desk: { unread: 1, lastLine: desk.body.split("\n")[0], lastAt: desk.at },
          wrenName: OFFICIAL_NAME,
          notice,
          wrenLine: once ? speakAs(t("kindreds.said"), OFFICIAL_NAME) : null,
          demoMenus: true,
          search,
        },
        kindredsFormat(who),
      ),
    // lang: the words follow the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threads, ledger, premium, unsettled, tab, show, loadState, notice, once, lang, who, search],
  );

  const away = useCallback((where: string) => Alert.alert("Dev page", `In the app this opens ${where}.`), []);
  const act = useMemo<KindredsActions>(() => {
    const find = (id: string) => threadById(demoThreads({ store: false }), id);
    return {
      openRow: (id) => {
        const th = find(id);
        away(th?.revealed ? `/room/${id}` : `/chat/${id}`);
      },
      rowAction: (id, k) => {
        const th = find(id);
        if (!th) return;
        if (k === "read") setLedger((l) => ({ ...l, [id]: th.theirs }));
        else if (k === "unread") setLedger((l) => ({ ...l, [id]: th.theirs - 1 }));
        else if (k === "block") setBlocking(id);
        else if (k === "report") Alert.alert(t("rp.reportedTitle"), t("rp.reportedBody", { wren: OFFICIAL_NAME }));
        else away(k === "page" ? `/kindred/${id}` : "/paywall?src=rekindle");
      },
      openWren: () => away("/room/wren"),
      openFold: () => setTab("penpals"),
      openFoldFace: (id) => away(`/chat/${id}`),
      chip: (k) => {
        if (k === "all" || k === "kindreds" || k === "penpals") setTab(k);
      },
      title: () => {
        setTab("all");
        setShow("your");
        setScroll((s) => ({ serial: s.serial + 1, target: "list" }));
      },
      clear: () => setShow(null),
      hint: (kind) => away(kind === "kindreds" ? "/room/wren?guide=kindreds" : "/(tabs)/letters"),
      notice: (action) => (action === "close" ? setNotice(false) : away("iOS's notification question, or Settings")),
      wrenLine: () => setOnce(false),
      band: (open, via) => console.log(`[step5-kindreds] band ${open ? "open" : "folded"} by ${via}`),
      search: (query, active) => setSearch(active ? query : null),
      confirmBlock: () => {
        if (blocking) setGone((g) => new Set(g).add(blocking));
        setBlocking(null);
      },
      cancelBlock: () => setBlocking(null),
    };
  }, [away, blocking]);

  const model: KindredsModel = { view, loadState, empty: view.empty, named: 0, scroll, blocking, blockBusy: false, act };
  const themeLabel = forced ? THEMES[forced].name.toUpperCase() : "OFF";

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ flex: 1 }}>
        {model.empty ? <KindredsEmpty onWrite={() => away("/compose")} /> : swift && swiftAvailable ? <KindredsNative model={model} /> : <KindredsRN model={model} />}
      </View>

      <LeaveSheet
        modal
        open={!!blocking}
        title={t("rp.blockTitle")}
        body={t("rp.blockBody")}
        actions={[{ label: t("rp.blockConfirm"), kind: "destructive", onPress: act.confirmBlock }]}
        cancelLabel={t("set.neverMind")}
        onCancel={act.cancelBlock}
      />

      {panel ? (
        <View style={{ borderTopWidth: 1, borderTopColor: tk.line, backgroundColor: tk.sf, paddingTop: 8, paddingBottom: Math.max(safe.bottom, 8), gap: 6 }}>
          <Row>
            <Chip label="HIDE" onPress={() => setPanel(false)} />
            {(["off", ...THEME_KEYS] as const).map((k) => (
              <Chip key={k} label={k === "off" ? "OFF" : THEMES[k as ThemeKey].name.toUpperCase()} on={k === "off" ? !forced : forced === k} onPress={() => setDevThemeOverride(k === "off" ? null : (k as ThemeKey))} />
            ))}
          </Row>
          <Row>
            <Chip label="SWIFT" on={swift && swiftAvailable} onPress={() => (swiftAvailable ? setSwift(true) : Alert.alert("Dev page", "This dev client was built before KKindredsView: pod install, then rebuild it."))} />
            <Chip label="RN" on={!swift || !swiftAvailable} onPress={() => setSwift(false)} />
            {DATA.map((d) => (
              <Chip key={d.key} label={d.label} on={data === d.key} onPress={() => setData(d.key)} />
            ))}
          </Row>
          <Row>
            <Chip label="FC" on={premium} onPress={() => setPremium((v) => !v)} />
            <Chip label="WAIT" on={unsettled} onPress={() => setUnsettled((v) => !v)} />
            <Chip label="NOTICE" on={notice} onPress={() => setNotice((v) => !v)} />
            <Chip label="ONCE" on={once} onPress={() => setOnce((v) => !v)} />
            <Chip label="NAMES" on={names} onPress={() => setDevIdentityPreview(!names)} />
            <Chip label="RESET ROWS" onPress={() => { setGone(new Set()); setLedger(DEMO_ROOM_SEEN); setTab("all"); setShow(null); }} />
          </Row>
          <Text style={{ ...PFM.monoMed, fontSize: 10, color: tk.sub, paddingHorizontal: 12 }}>
            {`THEME ${themeLabel} (${key}) · ${swift && swiftAvailable ? "SWIFTUI" : "REACT NATIVE"}${swiftAvailable ? "" : " (no KKindredsView in this build)"} · ${view.waiting} ON YOU`}
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
      <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 0.8, color: on ? tk.bg : tk.ink }}>{label}</Text>
    </Pressable>
  );
}
