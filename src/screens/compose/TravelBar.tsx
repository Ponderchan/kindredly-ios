import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { t } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { PFM } from "../../theme/post";
import { Stamp, StampSlot } from "../../components/Stamp";
import { CustomGlyph, StampGlyph } from "../../components/ComposeTray";
import { stampSlotStroke } from "../../lib/stamp-frame";
import "../../data/strings-stamps2"; // cs2.tray.* and the 3/3 card's words
import { TRAVEL_BAR as B, stripGroups, travelShowsLabel, type KeyVM } from "./compose-model";
import type { ComposeState } from "./useComposeState";

/* LET IT TRAVEL L6 IN REACT NATIVE (owner, 2026-10-26) — the remote switch's fallback of the
   SwiftUI bar and strip (KComposeTravelBar, KStampStrip), fed by the same state
   (useComposeState over compose-model), so it says the same words in the same states:
   - the bar, 44 tall, 26 in: + (22, 1.9) · the stamp slot (the dashed stamp icon; lav and
     hopping 3 every 1.2s once the words are enough and no stamp is chosen) or the chosen
     stamp's #topic capsule (36, fully round, 1.8 edge in its line ink, its own colour, SF Mono
     12) · the CTA at the right end: "n/20" in mono 11 while under the floor, then one capsule
     (36, 1.8 edge, padding 14, SF Mono 12 at .06em, never cut) with the paper plane: ① lav
     rising inside it to n/20, "Let it travel" faint at 0 and ink after, not pressable; ② "Pick
     a stamp" in ind, opening the strip; ③ solid ink, "Let it travel", sending. With a stamp, a
     topic over 14 characters, or one that can't sit beside the words (compose-model
     travelShowsLabel), leaves the CTA its plane alone (a 36 circle).
     React Native's page never had the paper strip, so its bar has no paper key (18 between
     the rest, 12 once a stamp is chosen, as the SwiftUI bar);
   - the strip, PICK A STAMP: 168 where the keyboard was, soft, a 1.5 line on top; its head and
     DONE; one horizontal row of the stamps at 48 × 58 with their #topic under them in mono 8,
     the chosen one lifted 4 in a double ring, its #topic in ind; the season's stamps first
     under their small marker, then the tray's order (compose-model stripGroups); my own photo
     stamps behind the two glyph tabs while that feature exists.
   Flat (owner, 2026-10-26): no hard shadows; the 1.8 edges are the design's. */

const PLUS = "M12 5v14M5 12h14";
const PLANE = "M21 3L3.5 10.2l7 2.6L13 20l8-17z M10.5 12.8 21 3";
const STRIP_H = 168;
const TILE = 48;
/** the seasonal marker's colours, the same in every theme (the stamp tray's) */
const SEASON = { wash: "#FEF2E4", edge: "#F39420", ink: "#1E1B35" };

function Plane({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={PLANE} stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** the empty slot's dashed stamp icon (the prototype's, 26) */
function StampIcon({ stroke, eyes }: { stroke: string; eyes: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Rect x={4.5} y={4.5} width={15} height={15} rx={2} stroke={stroke} strokeWidth={1.8} strokeDasharray="2.2 2.2" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={9.5} cy={10.5} r={0.9} fill={eyes} />
      <Circle cx={14.5} cy={10.5} r={0.9} fill={eyes} />
      <Path d="M9 14c1.5 1.6 4.5 1.6 6 0" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** 3 up and back over 1.2s while `on`, still under Reduce Motion */
function useHop(on: boolean) {
  const reduce = useReducedMotion();
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on || reduce) {
      y.setValue(0);
      return;
    }
    const ease = Easing.inOut(Easing.ease);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -3, duration: 600, easing: ease, useNativeDriver: true, isInteraction: false }),
        Animated.timing(y, { toValue: 0, duration: 600, easing: ease, useNativeDriver: true, isInteraction: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, reduce, y]);
  return y;
}

export function TravelBar({ state, bottom }: { state: ComposeState; bottom: number }) {
  const { t: tk } = useTheme();
  const { act, key } = state;
  const chosen = state.chosenVM;
  const gap = chosen ? B.gapStamped : B.gap;
  const [barW, setBarW] = useState(0);
  const hop = useHop(key.nudge);
  const asks = key.stage === "needStamp";
  // THE LONG-TOPIC RULE: with a stamp, the words only while they fit beside the topic
  const compact = !!chosen && (barW <= 0 || !travelShowsLabel({ barWidth: barW, topic: chosen.tag, label: key.label, paper: false }));
  const plusOpen = state.tray === "more";

  return (
    <View
      onLayout={(e) => setBarW(e.nativeEvent.layout.width - 2 * B.side)}
      style={{ height: B.height, marginTop: 10, marginBottom: bottom, paddingHorizontal: B.side, flexDirection: "row", alignItems: "center", gap }}
      pointerEvents={state.busy ? "none" : "auto"}
    >
      {/* the +: the question and the voice letter */}
      <Pressable
        onPress={() => act.openTray("more")}
        hitSlop={{ top: 11, bottom: 11, left: 9, right: gap / 2 }}
        accessibilityRole="button"
        accessibilityLabel={plusOpen ? t("wren.trackClose") : t("cp.plus.a11y")}
        style={({ pressed }) => ({ width: B.plus, height: B.plus, opacity: pressed ? 0.6 : 1 })}
      >
        <View style={{ transform: [{ rotate: plusOpen ? "45deg" : "0deg" }] }}>
          <Svg width={B.plus} height={B.plus} viewBox="0 0 24 24" fill="none">
            <Path d={PLUS} stroke={plusOpen ? tk.ind : tk.ink} strokeWidth={1.9} strokeLinecap="round" />
          </Svg>
        </View>
        {state.plusDot && <View style={{ position: "absolute", right: -4, top: -4, width: 9, height: 9, borderRadius: 4.5, backgroundColor: tk.ind, borderWidth: 1.5, borderColor: tk.bg }} />}
      </Pressable>

      {chosen ? (
        /* the chosen stamp's #topic: tap opens the strip again */
        <Pressable
          onPress={() => act.openTray("stamps")}
          hitSlop={{ top: 4, bottom: 4, left: gap / 2, right: gap / 2 }}
          accessibilityRole="button"
          accessibilityLabel={t("cp.stampChosen.a11y", { name: chosen.name })}
          style={({ pressed }) => ({ flexShrink: 1, minWidth: 0, opacity: pressed ? 0.7 : 1 })}
        >
          <View style={{ height: B.capsule, borderRadius: B.capsule / 2, borderWidth: B.edge, borderColor: chosen.line, backgroundColor: chosen.wash, paddingHorizontal: B.pad, justifyContent: "center" }}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...PFM.monoMed, fontSize: B.topicSize, letterSpacing: B.topicSize * B.topicTracking, color: chosen.ink }}>
              {chosen.tag}
            </Text>
          </View>
        </Pressable>
      ) : (
        /* the empty slot: the dashed stamp icon, lav and hopping while it asks */
        <Pressable
          onPress={() => act.openTray("stamps")}
          hitSlop={{ top: 7, bottom: 7, left: gap / 2, right: gap / 2 }}
          accessibilityRole="button"
          accessibilityLabel={t("cp.stamp.a11y")}
          accessibilityState={{ selected: state.tray === "stamps" }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Animated.View style={{ width: B.slot, height: B.slot, borderRadius: 8, backgroundColor: asks ? tk.lav : "transparent", alignItems: "center", justifyContent: "center", transform: [{ translateY: hop }] }}>
            <StampIcon stroke={asks ? tk.ind : tk.ink} eyes={tk.ink} />
          </Animated.View>
        </Pressable>
      )}

      {/* the CTA at the right end, the count beside it while under the floor */}
      <View style={{ flex: chosen ? 0 : 1, flexShrink: 0, marginLeft: chosen ? "auto" : 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: B.countGap }}>
        {!!key.count && <Text accessibilityElementsHidden importantForAccessibility="no" style={{ ...PFM.monoMed, fontSize: 11, letterSpacing: 11 * 0.12, color: tk.mute }}>{key.count}</Text>}
        <Capsule k={key} compact={compact} onPress={() => act.keyPress()} />
      </View>
    </View>
  );
}

/** The CTA capsule: one capsule, three states (see the top of the file). */
function Capsule({ k, compact, onPress }: { k: KeyVM; compact: boolean; onPress: () => void }) {
  const { t: tk } = useTheme();
  const travels = k.stage === "filling" || k.stage === "needStamp" || k.stage === "ready" || k.stage === "sending";
  const ground = k.stage === "ready" ? tk.ink : k.stage === "paperFirstClass" ? "#D8A63F" : tk.bg;
  const edge = k.stage === "ready" || k.stage === "paperFirstClass" ? tk.ink : k.stage === "needStamp" ? tk.ind : tk.line;
  const ink =
    k.stage === "ready" ? tk.bg : k.stage === "needStamp" ? tk.ind : k.stage === "paperFirstClass" ? "#1E1B35" : k.stage === "filling" ? (k.progress > 0 ? tk.ink : tk.faint) : tk.mute;
  // the lav rises to n/20 (.25s, cubic-bezier(.3,1,.3,1)) and fades out at 20
  const target = k.progress >= 0 ? Math.min(1, Math.max(0, k.progress)) : k.stage === "needStamp" || k.stage === "ready" ? 1 : 0;
  const wash = useRef(new Animated.Value(target)).current;
  const washOn = useRef(new Animated.Value(k.progress >= 0 ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(wash, { toValue: target, duration: 250, easing: Easing.bezier(0.3, 1, 0.3, 1), useNativeDriver: false, isInteraction: false }).start();
  }, [target, wash]);
  useEffect(() => {
    Animated.timing(washOn, { toValue: k.progress >= 0 ? 1 : 0, duration: 300, useNativeDriver: false, isInteraction: false }).start();
  }, [k.progress >= 0, washOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const planeAlone = compact && travels;
  const words = compact && !travels && k.narrowLabel ? k.narrowLabel : k.label;
  return (
    <Pressable
      onPress={onPress}
      disabled={!k.enabled}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityLabel={k.label}
      accessibilityValue={k.countA11y ? { text: k.countA11y } : undefined}
      accessibilityHint={k.hintA11y || undefined}
      accessibilityState={{ disabled: !k.enabled }}
      style={({ pressed }) => ({
        height: B.capsule,
        minWidth: B.capsule,
        borderRadius: B.capsule / 2,
        borderWidth: B.edge,
        borderColor: edge,
        backgroundColor: ground,
        overflow: "hidden",
        paddingHorizontal: planeAlone ? 0 : B.pad,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: B.planeGap,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: tk.lav, opacity: washOn, width: wash.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }}
      />
      {planeAlone ? (
        <Plane color={ink} size={B.planeAlone} />
      ) : (
        <>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...PFM.monoMed, fontSize: B.labelSize, letterSpacing: B.labelSize * B.labelTracking, color: ink }}>
            {words}
          </Text>
          {travels && <Plane color={ink} size={B.plane} />}
        </>
      )}
    </Pressable>
  );
}

/** The stamp strip, PICK A STAMP (see the top of the file). */
export function StampStrip({ state }: { state: ComposeState }) {
  const { t: tk } = useTheme();
  const { act } = state;
  const custom = state.custom;
  const tabs = custom.state !== "hidden";
  const shown = tabs ? state.trayTab : "official";
  const [fullCard, setFullCard] = useState(false);
  useEffect(() => setFullCard(false), [shown]);
  const groups = stripGroups(state.sections);
  const marked = groups.some((g) => !!g.mark);

  const cell = (id: string, name: string, a11yLabel: string) => {
    const on = state.sel === id;
    return (
      <Pressable
        key={id}
        onPress={() => act.pickStamp(id)}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ selected: on }}
        style={({ pressed }) => ({ alignItems: "center", minWidth: TILE, gap: 6, opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ transform: [{ translateY: on ? -4 : 0 }] }}>
          <Stamp id={id} width={TILE} />
          {on && (
            <>
              <View pointerEvents="none" style={{ position: "absolute", left: -2, top: -2, right: -2, bottom: -2, borderRadius: 5, borderWidth: 2, borderColor: tk.sf }} />
              <View pointerEvents="none" style={{ position: "absolute", left: -4, top: -4, right: -4, bottom: -4, borderRadius: 7, borderWidth: 2, borderColor: tk.ind }} />
            </>
          )}
        </View>
        <Text numberOfLines={1} style={{ ...PFM.monoMed, fontSize: 8, letterSpacing: 8 * 0.08, color: on ? tk.ind : tk.sub }}>
          {name}
        </Text>
      </Pressable>
    );
  };

  const markTag = (mark: string) => (
    <Text style={{ alignSelf: "flex-start", ...PFM.monoSemi, fontSize: 8, letterSpacing: 1, color: SEASON.ink, backgroundColor: SEASON.wash, borderColor: SEASON.edge, borderWidth: 1, borderRadius: 8, overflow: "hidden", paddingHorizontal: 5, paddingVertical: 1, opacity: mark ? 1 : 0 }}>
      {mark || " "}
    </Text>
  );

  return (
    <View style={{ height: STRIP_H, backgroundColor: tk.soft, borderTopWidth: 1.5, borderTopColor: tk.line, paddingTop: 14, gap: 10 }}>
      {/* the head: PICK A STAMP, the two tabs while my own stamps exist, DONE */}
      <View style={{ height: 20, paddingHorizontal: 20, flexDirection: "row", alignItems: "center" }}>
        <Text accessibilityRole="header" numberOfLines={1} style={{ ...PFM.monoMed, fontSize: 10, letterSpacing: 1.4, color: tk.sub }}>
          {state.stripHead}
        </Text>
        {tabs && (
          <View style={{ flexDirection: "row", gap: 2, marginLeft: 10 }}>
            {(["official", "custom"] as const).map((which) => {
              const on = shown === which;
              return (
                <Pressable
                  key={which}
                  onPress={() => !on && act.pickTrayTab(which)}
                  hitSlop={{ top: 9, bottom: 9 }}
                  accessibilityRole="tab"
                  accessibilityLabel={t(which === "official" ? "cs2.tray.tabOfficial" : "cs2.tray.tabCustom")}
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => ({ width: 34, height: 26, borderRadius: 8, backgroundColor: on ? tk.soft2 : "transparent", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : on ? 1 : 0.55 })}
                >
                  {which === "official" ? <StampGlyph size={18} color={tk.ink} /> : <CustomGlyph size={18} color={tk.ink} cut={on ? tk.soft2 : tk.soft} />}
                </Pressable>
              );
            })}
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Pressable onPress={act.closeTray} hitSlop={12} accessibilityRole="button">
          <Text style={{ fontSize: 13, fontWeight: "500", color: tk.mute }}>{t("pp.strip.done")}</Text>
        </Pressable>
      </View>

      <ScrollView key={shown} horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingVertical: 6, gap: 12, alignItems: "flex-end" }}>
        {shown === "custom" ? (
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            {/* the dashed +: the Stamp Press, or (Free at 3/3) the small card */}
            <Pressable
              onPress={() => (custom.full ? setFullCard(true) : act.makeStamp())}
              accessibilityRole="button"
              accessibilityLabel={t("cs2.use.a11yMake")}
              style={({ pressed }) => ({ alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}
            >
              <View>
                <StampSlot width={TILE} stroke={stampSlotStroke(tk)} />
                <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: (9 / 120) * TILE * 1.2, bottom: -(9 / 120) * TILE * 1.2, alignItems: "center", justifyContent: "center" }}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 7v10M7 12h10" stroke={tk.ind} strokeWidth={1.8} strokeLinecap="round" />
                  </Svg>
                </View>
              </View>
              <Text style={{ ...PFM.monoMed, fontSize: 8 }}> </Text>
            </Pressable>
            {custom.items.map((it) => cell(it.id, it.topic, it.a11yLabel))}
            {custom.items.length === 0 && <Text style={{ width: 200, fontSize: 13, lineHeight: 18, color: tk.sub, marginTop: 8 }}>{t("cs2.tray.empty")}</Text>}
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.key} style={{ gap: 4 }}>
              {/* the season's small marker over its stamps; the same room over the rest */}
              {marked && markTag(g.mark)}
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>{g.items.map((it) => cell(it.id, `#${it.name}`, it.a11yLabel))}</View>
            </View>
          ))
        )}
      </ScrollView>

      {/* the 3/3 card: Free has made its three (flat) */}
      {fullCard && custom.full && (
        <Pressable accessibilityElementsHidden onPress={() => setFullCard(false)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: tk.soft + "B8", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 300, backgroundColor: tk.sf, borderWidth: 1.5, borderColor: tk.ln, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 2 }}>
            <Text accessibilityRole="header" style={{ ...PFM.monoSemi, fontSize: 11, letterSpacing: 1.3, color: tk.ink }}>{state.customFullTitle}</Text>
            <Pressable accessibilityRole="button" onPress={() => { setFullCard(false); act.fullCta(); }} style={{ minHeight: 40, justifyContent: "center", marginTop: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: tk.ind }}>{t("cs2.me.fullCta")}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setFullCard(false)} style={{ minHeight: 40, justifyContent: "center" }}>
              <Text style={{ fontSize: 14, color: tk.mute }}>{t("cs2.me.notNow")}</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </View>
  );
}
