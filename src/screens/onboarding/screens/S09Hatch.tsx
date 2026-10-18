import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { HATCH_READ_S, HatchStage } from "../../../components/HatchStage";
import { firstWord } from "../../../lib/first-word";
import { t } from "../../../lib/i18n";
import { ShellFlood } from "../parts/flood";
import { KeyArea, TOPBAR_H } from "../parts/frame";
import { AcidKey } from "../parts/keys";
import { GUTTER, OB, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import { keptLine, useHatchRead } from "./s09-read";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* SCREEN 9 · THE HATCH — the existing HatchStage, and the world turns Shell
   (storyboard §6 · 9, §3 "It has a job in the story").
   ────────────────────────────────────────────────────────────────────────
   Still on Post Blue. The stamped letter went into the egg; the egg reads
   it (the read-out chips tick: RHYTHM ✓ · PAUSES ✓ · SMALL TELLS ✓ over
   the seconds the shell takes), knocks three times — a tap on it helps
   (HatchStage tapHelps) — and cracks. The copy before the crack is the old
   run's: READING YOU / "It heard enough.", with "tap it".

   NEW AT THE BURST: no dark, no flash (HatchStage burst="flood"). A disc of
   Shell grows from the crack and covers the screen in 420 ms
   (parts/flood), the six shards flying over it: the egg's warm inside
   spills out over the blue. When it covers the screen, the draft is
   `born` (with its first word, lib/first-word — the same word HatchStage
   says), so the runner's ground is Shell from then on, and this screen
   mounts the dark status bar (a later mount wins). The chick pops up in
   the lower half-shell with the birthmark of the shell picked on 2, and
   its first word flies out of your letter in a bubble; a tap on it gets a
   reaction. Then: "Something hatched." and the kept ob.born.word line,
   which names what it caught first.

   "Name it" stays dim until it has hatched (the flow: draft.born). No ‹:
   you can't climb back into a shell. Reduce Motion: HatchStage lands on
   the born tableau at once and the flood is a cross-fade. */

const CHROME = { ink: OB.ink, accent: OB.blue, panel: OB.paper, line: OB.ink };
/** the read-out chips' green on Shell (5.1:1 on #FFF8EE) */
const READ_GREEN = "#2E7D46";

export default function S09Hatch(props: ObScreenProps) {
  const { draft } = props;
  const insets = useSafeAreaInsets();
  const { form, mood, read, dimPhrase } = useHatchRead(draft.letter);
  const rootRef = useRef<View>(null);
  const [floodFrom, setFloodFrom] = useState<{ x: number; y: number } | null>(null);
  const [flooded, setFlooded] = useState(draft.born);
  const [hatched, setHatched] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [prog, setProg] = useState(0);
  const leaving = useRef(false);

  /* the read-out ticks over the seconds the shell takes to crack, so the read and the birth are one moment */
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / (HATCH_READ_S * 1000));
      setProg(p);
      if (p >= 1) clearInterval(id);
    }, 90);
    return () => clearInterval(id);
  }, []);

  /* the crack is where the flood starts (window points → this screen's) */
  const onBurst = (at: { x: number; y: number }) => {
    const root = rootRef.current;
    if (!root) return setFloodFrom(at);
    root.measureInWindow((x, y) => setFloodFrom({ x: at.x - x, y: at.y - y }));
  };
  const onFlooded = () => {
    setFlooded(true);
    if (!draft.born) props.set({ born: true, firstWord: firstWord([draft.letter]) });
  };

  const nameIt = () => {
    if (!props.canAdvance || leaving.current) return;
    leaving.current = true;
    setCelebrate((c) => c + 1); // it hops as the screen goes
    setTimeout(() => props.advance(), 320);
  };

  const ink = flooded ? OB.ink : OB.white;
  const soft = flooded ? OB.inkSoft : OB.white;
  const chips = [t("ob2.hatch.rhythm"), t("ob2.hatch.pauses"), t("ob2.hatch.tells")];

  const footer = (
    <View style={{ minHeight: 150, paddingHorizontal: GUTTER, alignItems: "center" }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
        {chips.map((label, i) => {
          const done = hatched || prog >= ((i + 1) / chips.length) * 0.92;
          const c = flooded ? READ_GREEN : OB.white;
          return (
            <View key={label} style={{ height: 28, paddingHorizontal: 11, borderRadius: 14, borderWidth: 2, borderColor: c, justifyContent: "center", opacity: done ? 1 : 0.45 }}>
              <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.label, { fontSize: 10, letterSpacing: 1.2, color: c }]}>{`${label} ${done ? "✓" : "·"}`}</Text>
            </View>
          );
        })}
      </View>
      {!hatched ? (
        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.label, { color: soft }]}>{t("ob.hatch.eyebrow")}</Text>
          <Text maxFontSizeMultiplier={OB_MAX_FONT} accessibilityRole="header" style={[TYPE.headline, { color: ink, textAlign: "center", marginTop: 6 }]}>
            {t("ob.hatch.title")}
          </Text>
          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.voice, { color: soft, marginTop: 6 }]}>{t("ob2.hatch.tap")}</Text>
        </View>
      ) : (
        <Animated.View entering={FadeInDown.duration(420)} style={{ alignItems: "center", marginTop: 16 }}>
          <Text maxFontSizeMultiplier={OB_MAX_FONT} accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={[TYPE.headline, { color: OB.ink, textAlign: "center" }]}>
            {keptLine("ob.hatched.plain", "ob.hatched.em")}
          </Text>
          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.lineSmall, { color: OB.inkSoft, textAlign: "center", marginTop: 8 }]}>
            {said ? t("ob.born.word", { dim: dimPhrase }) : t("ob.born.noWord", { dim: dimPhrase })}
          </Text>
        </Animated.View>
      )}
    </View>
  );

  return (
    <View ref={rootRef} collapsable={false} style={{ flex: 1 }}>
      {flooded && <StatusBar style="dark" animated />}
      {/* the Shell flood, under the stage so the shards fly over it */}
      {floodFrom && !draft.born && <ShellFlood play from={floodFrom} onDone={onFlooded} />}
      <View style={{ flex: 1 }}>
        <HatchStage
          shell={draft.shell}
          fed={[draft.letter]}
          mood={mood}
          form={form}
          dims={read.dims}
          skin="sticker"
          celebrate={celebrate}
          burst="flood"
          onBurst={onBurst}
          chrome={CHROME}
          tapHelps
          onBorn={() => setHatched(true)}
          onWord={setSaid}
          header={<View style={{ height: insets.top + TOPBAR_H }} />}
          footer={footer}
        />
      </View>
      <Animated.View entering={FadeIn.duration(200)}>
        <KeyArea primary={<AcidKey label={t("ob2.hatch.key")} disabled={!props.canAdvance || !hatched} onPress={nameIt} />} />
      </Animated.View>
    </View>
  );
}
