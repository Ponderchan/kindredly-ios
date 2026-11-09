import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Host } from "@expo/ui/swift-ui";
import { isKindredlyUIViewAvailable, KChatHeaderView, KLetterInFlightView } from "../../../modules/kindredly-ui";
import { LetterInFlight, INFLIGHT_CYCLE_MS } from "../../components/LetterInFlight";
import { ChatHeader } from "../../screens/chat/ChatHeader";
import { revealedLettersHeader } from "../../screens/chat/build-items";
import { demoDetail } from "../../data/demo";
import { useBirdImageRefs } from "../../lib/bird-images";
import { faceRecord, threadFaceInput, useFaceSource } from "../../lib/faces";
import { localeTag } from "../../lib/format";
import { t, useLang } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { useWrenName } from "../../lib/wren-name";
import { PFM } from "../../theme/post";

/* dev only — TWO OF THE FOUR BATCH-3 PIECES, EACH BESIDE ITS REACT NATIVE ORIGINAL (2026-11-09).
   kindredly:///dev/four-pieces

   The crossing ("inflight") and the revealed pen-pal header ("chatheader") are drawn inside the
   Swift reader and the Swift conversation only when their switches are on, and the crossing only
   for the second a reply is in the air; this page shows both renderers without the switch, React
   Native above, Swift below:
   - THE CROSSING: FLY AGAIN replays both; SLOW adds the headwind line. Reduce Motion (Settings ›
     Accessibility) shows the still row in both. Her pictures are her snapshots (bird-images
     inflightFly34 / inflightStill26): they appear once BirdSnapshots has captured them.
   - THE REVEALED HEADER on the demo kindred demo-mira: ChatHeader's "letters" variant, then
     KChatHeaderView with build-items revealedLettersHeader. The keys only log here (the RN ⋯
     opens the real report card: don't send it).
   The other two have their own pages: the rating ask kindredly:///rating-preview?v=letter (or
   v=review&ratings=3), the receipt kindredly:///dev/me4a-fc; turn "ratingask" / "fcreceipt" on in
   kindredly:///ui-lab to see them in Swift. The Swift rows need a dev client built with the
   batch-3 views. */
export default function FourPiecesLab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Lab />;
}

const STATES = [
  { label: "YOUR TURN", toneKey: "ind" as const },
  { label: "THEIR TURN", toneKey: "mute" as const },
  { label: "THEY WENT FIRST", toneKey: "brass" as const },
];

function Lab() {
  const lang = useLang();
  const { key: theme, t: tk, dark } = useTheme();
  const safe = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const wren = useWrenName();
  const [play, setPlay] = useState(0);
  const [slow, setSlow] = useState(false);
  const [stateAt, setStateAt] = useState(0);
  const w = width - 32;

  const birds = useBirdImageRefs<"inflightFly34" | "inflightStill26">(["inflightFly34", "inflightStill26"]);
  const crossing = useMemo(
    () => ({
      to: "JUNO",
      slow: slow ? t("net.slow").toLocaleUpperCase(localeTag()) : "",
      onItsWay: t("ld.onItsWay"),
      cycleMs: INFLIGHT_CYCLE_MS,
      bird: birds.inflightFly34 ?? null,
      stillBird: birds.inflightStill26 ?? null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slow, birds, lang],
  );

  const detail = useMemo(() => demoDetail("demo-mira"), []);
  const state = STATES[stateAt];
  const faceSource = useFaceSource(threadFaceInput({ other: detail?.other, otherFace: detail?.otherFace, revealed: true, theirs: detail?.otherCount ?? 0, gone: detail?.gone }));
  const header = revealedLettersHeader({ t, name: detail?.otherName ?? "Mira", face: faceRecord(faceSource), state, canOpenPage: true, canReport: true });

  const label = (s: string) => <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.4, color: tk.sub, marginTop: 10 }}>{s}</Text>;
  const missing = (view: string) => <Text style={{ fontSize: 12, color: tk.sub }}>This dev client has no {view}: Swift row skipped.</Text>;
  const chip = (s: string, on: boolean, onPress: () => void) => (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: on ? tk.ink : tk.soft2 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: on ? tk.bg : tk.ink }}>{s}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tk.bg }} contentContainerStyle={{ paddingTop: safe.top + 12, paddingBottom: safe.bottom + 40, paddingHorizontal: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", color: tk.ink }}>Four pieces · React Native, then Swift</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {chip("FLY AGAIN", false, () => setPlay((n) => n + 1))}
        {chip("SLOW", slow, () => setSlow((s) => !s))}
        {chip("BACK", false, () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/letters")))}
      </View>

      {label("THE CROSSING · REACT NATIVE")}
      <View style={{ width: w }}>
        <LetterInFlight key={play} to={crossing.to} slow={slow} />
      </View>
      {label("THE CROSSING · SWIFT")}
      {isKindredlyUIViewAvailable("KLetterInFlightView") ? (
        <Host style={{ width: w, height: 62 }} colorScheme={dark ? "dark" : "light"}>
          <KLetterInFlightView theme={theme} inflight={crossing} play={play} />
        </Host>
      ) : (
        missing("KLetterInFlightView")
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {STATES.map((s, i) => (
          <View key={s.label}>{chip(s.label, i === stateAt, () => setStateAt(i))}</View>
        ))}
      </View>
      {label("THE REVEALED HEADER · REACT NATIVE")}
      <View style={{ marginHorizontal: -16 }}>
        <ChatHeader
          variant="letters"
          detail={detail}
          name={detail?.otherName ?? "Mira"}
          state={state}
          wren={wren}
          threadId="demo-mira"
          canOpenPage
          topInset={0}
          onBack={() => console.log("[four-pieces] back")}
          onOpenPage={() => console.log("[four-pieces] page")}
          onBlocked={() => console.log("[four-pieces] blocked")}
          onBeforeSheet={() => {}}
        />
      </View>
      {label("THE REVEALED HEADER · SWIFT")}
      {isKindredlyUIViewAvailable("KChatHeaderView") ? (
        <Host style={{ width, height: 52, marginHorizontal: -16 }} colorScheme={dark ? "dark" : "light"}>
          <KChatHeaderView theme={theme} header={header} onDock={(a) => console.log("[four-pieces] swift header:", a)} />
        </Host>
      ) : (
        missing("KChatHeaderView")
      )}
    </ScrollView>
  );
}
