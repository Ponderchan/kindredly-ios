import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { ZoomIn } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { GlyphInput } from "../../components/GlyphInput";
import { StampTile } from "../../components/StampTile";
import { KeyDot, MoreTray, Nudge, PlusGlyph, RoundKey, StampKeyGlyph, StampTray } from "../../components/ComposeTray";
import { WrenBird } from "../../components/WrenBird";
import { Recorder } from "../../components/Recorder";
import { AudioCard } from "../../components/AudioCard";
import { useBreathe } from "../../components/anim";
import { t } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { MONO, PF, letterFamily } from "../../theme/post";
import { BRAND } from "../../theme/themes";
import { stampVM, type ComposeState } from "./useComposeState";

/* THE COMPOSE PAGE IN REACT NATIVE — the remote switch's fallback (10a
   step 5). The page as it was before SwiftUI, moved here whole and drawn
   from the theme, fed by the same state as the Swift page
   (useComposeState over compose-model), so it carries every fix too: the
   guarded ✕ with the recording guard, DISCARD and SAVE AS DRAFT that save
   once or not at all, the localized count near the ceiling, the free
   writer's "N LEFT TODAY" and the cap panel at zero, the voice letter
   counted, the question shown with a resumed draft.

   Its own shape stays (the sticker-zine desk: the stamp corner at the top,
   the round keys and the wide key below), redrawn in the theme's tokens —
   page bg, lines line, keys ln, the pen ind — and the 10a type where it
   meets the Swift page: writing in the system face at 17, Wren's line in
   Newsreader italic, mono labels at 9 / 10 / 11. The wide key still fills
   toward the floor as you write, now with no digits beside it (owner
   question 5's default: nothing near the quota reads like a count), and
   says SEND where LET IT TRAVEL would be squeezed beside a long pill.
   The courier's flight, the sign-up and the leave sheet are the route's,
   above whichever page draws. */
export function ComposeRN({ state }: { state: ComposeState }) {
  const { t: tk } = useTheme();
  const { act } = state;
  const breathe = useBreathe(6, 2600);
  const [keyW, setKeyW] = useState(0);
  const narrow = keyW > 0 && keyW < 170 && !!state.key.narrowLabel;
  const chosen = stampVM(state.chosen, tk);
  const key = state.key;
  const filling = key.progress >= 0;
  const keyFill = key.stage === "ready" ? tk.ink : key.stage === "needStamp" ? tk.ind : "transparent";
  const keyBorder = key.stage === "ready" ? tk.ink : key.stage === "needStamp" ? tk.ind : tk.line;
  const keyInk = key.stage === "ready" || key.stage === "needStamp" ? tk.bg : tk.mute;
  const countColor = state.count?.tone === "post" ? BRAND.postRed : state.count?.tone === "amber" ? BRAND.goldText : tk.mute;
  const wrenFace = letterFamily("newsreader", true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }}>
      {/* the top row — close, the address, the stamp corner */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: "row", alignItems: "center" }}>
        <Pressable
          onPress={act.close}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("wren.trackClose")}
          style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M5 5l14 14M19 5L5 19" stroke={tk.ink} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text accessibilityRole="header" style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 2, color: tk.ink }}>
            {t("cp.header")}
          </Text>
        </View>
        <Pressable
          onPress={() => act.openTray("stamps")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={chosen ? t("cp.stampChosen.a11y", { name: chosen.name }) : t("cp.stamp.a11y")}
          style={{ transform: [{ rotate: "8deg" }] }}
        >
          <View style={{ padding: 3 }}>
            {state.sel ? (
              <StampTile id={state.sel} w={44} r={5} />
            ) : (
              /* the corner where the stamp goes, still empty */
              <View style={{ width: 44, height: 44, borderWidth: 1.5, borderStyle: "dashed", borderColor: tk.ind, borderRadius: 5, backgroundColor: tk.lav2 }} />
            )}
          </View>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 14, paddingTop: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Wren reads you live — one speech slot: her language hello, then the live read */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessible accessibilityLabel={state.wrenLine}>
            <Animated.View key={state.wrenMood} entering={ZoomIn.duration(340)} style={[breathe, { width: 46, height: 46, alignItems: "center", justifyContent: "center" }]}>
              <WrenBird size={38} mood={state.wrenMood} />
            </Animated.View>
            <Text style={{ flex: 1, ...wrenFace, fontSize: 15, lineHeight: 21, color: tk.sub }}>{state.wrenLine}</Text>
          </View>
          {/* the line she stands on */}
          <View style={{ borderBottomWidth: 1, borderColor: tk.line, marginTop: 12, marginBottom: 8 }} />

          {state.mode === "write" ? (
            <GlyphInput
              onFocus={() => act.fieldFocus("body", true)}
              autoFocus
              value={state.text}
              onChangeText={(v) => act.textChange("body", v)}
              placeholder={state.spark}
              placeholderTextColor={tk.mute}
              accessibilityLabel={t("cp.editor.a11y")}
              multiline
              style={{ minHeight: 340, color: tk.ink, fontSize: 17, lineHeight: 25, textAlignVertical: "top", paddingTop: 10 }}
            />
          ) : (
            <View style={{ paddingTop: 12, minHeight: 250 }}>
              <Recorder doneUri={state.recUri} doneDur={state.recDur} onDone={act.recorded} onClear={act.clearRecording} />
              {state.recUri && (
                <View style={{ marginTop: 12 }}>
                  <AudioCard url={state.recUri} durationS={state.recDur} compact />
                </View>
              )}
              <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 0.6, color: tk.mute, marginTop: 14, lineHeight: 17 }}>
                {t("cp.voiceNote", { wren: state.wrenName })}
              </Text>
              <TextInput
                value={state.text}
                onChangeText={(v) => act.textChange("body", v)}
                onFocus={() => act.fieldFocus("body", true)}
                placeholder={t("cp.voiceLine.ph")}
                placeholderTextColor={tk.mute}
                style={{ color: tk.ink, fontSize: 17, marginTop: 14 }}
              />
            </View>
          )}

          {state.capPanel && (
            <View style={{ marginTop: 16, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: BRAND.creamBorder, backgroundColor: BRAND.cream }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: BRAND.inkOnBrand }}>{state.capText}</Text>
              <Text style={{ fontSize: 13, lineHeight: 18, color: BRAND.subOnCream, marginTop: 5 }}>{t("cp.repliesFree")}</Text>
              <Pressable onPress={act.capLink} accessibilityRole="link" style={{ marginTop: 8, minHeight: 32, justifyContent: "center" }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.1, color: BRAND.goldText }}>{t("cp.discover")}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* THE QUESTION RIDES UNDER THE LETTER — appended below the body at
            send and carried by drafts; turning it off takes it off */}
        {state.askOpen && state.mode === "write" && (
          <View style={{ paddingHorizontal: 22, paddingVertical: 12, borderTopWidth: 1, borderTopColor: tk.line }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: 1.4, color: tk.mute, marginBottom: 7 }}>{t("cp.askLabel")}</Text>
            <TextInput
              value={state.ask}
              onChangeText={(v) => act.textChange("ask", v)}
              onFocus={() => act.fieldFocus("ask", true)}
              placeholder={t("cp.askPh")}
              placeholderTextColor={tk.mute}
              accessibilityLabel={t("cp.askLabel")}
              autoFocus
              maxLength={140}
              style={{ fontSize: 16, color: tk.ink, paddingVertical: 4 }}
            />
          </View>
        )}

        {/* the small line above the keys: the count near the ceiling, and the free writer's day */}
        {(!!state.count || !!state.quota) && (
          <View style={{ paddingHorizontal: 24, flexDirection: "row", justifyContent: "flex-end", gap: 12, marginBottom: -2 }}>
            {state.count && <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, letterSpacing: 0.4, color: countColor }}>{state.count.text}</Text>}
            {!!state.quota && <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 0.9, color: tk.mute }}>{state.quota}</Text>}
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingTop: 10, paddingBottom: state.tray ? 10 : 24 }}>
          {/* TWO ROUND KEYS, A KEYBOARD'S SHAPE (owner, 2026-09-20) */}
          <RoundKey
            onPress={() => act.openTray("more")}
            badge={state.plusDot ? <KeyDot /> : undefined}
            accessibilityLabel={state.tray === "more" ? t("wren.trackClose") : t("cp.plus.a11y")}
          >
            <PlusGlyph size={27} open={state.tray === "more"} color={state.tray === "more" ? tk.ind : tk.ink} />
          </RoundKey>
          {chosen ? (
            /* CHOSEN: the stamp's own pill — its wash, its ink, its #name */
            <Pressable
              onPress={() => act.openTray("stamps")}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={t("cp.stampChosen.a11y", { name: chosen.name })}
              style={({ pressed }) => ({ height: 46, maxWidth: 148, borderRadius: 23, borderWidth: 1.5, borderColor: chosen.line, backgroundColor: chosen.wash, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
            >
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 0.2, color: chosen.ink }}>
                {chosen.tag}
              </Text>
            </Pressable>
          ) : (
            <RoundKey onPress={() => act.openTray("stamps")} accessibilityLabel={t("cp.stamp.a11y")}>
              <StampKeyGlyph open={state.tray === "stamps"} size={27} />
            </RoundKey>
          )}

          {/* THE DOOR SHOWS HOW FAR IT IS: a wash rising toward the floor, no digits */}
          <Pressable
            onPress={() => act.keyPress()}
            onLayout={(e) => setKeyW(e.nativeEvent.layout.width)}
            disabled={!key.enabled}
            accessibilityRole="button"
            accessibilityLabel={key.label}
            accessibilityState={{ disabled: !key.enabled }}
            style={{ flex: 1, backgroundColor: keyFill, borderWidth: 1, borderColor: keyBorder, overflow: "hidden" }}
          >
            {filling && <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round(key.progress * 100)}%`, backgroundColor: tk.lav2 }} />}
            {key.nudge && <Nudge color={tk.bg} />}
            <View style={{ paddingVertical: 17, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flexShrink: 1, fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.5, color: keyInk }}>
                {narrow ? key.narrowLabel : key.label}
              </Text>
            </View>
          </Pressable>
        </View>
        {state.tray === "stamps" && <StampTray selected={state.sel} sections={state.sections} onPick={act.pickStamp} />}
        {state.tray === "more" && <MoreTray askOn={state.more.askOn} voiceOn={state.more.voiceOn} premium={!state.more.voiceLocked} onAsk={act.toggleAsk} onVoice={act.toggleVoice} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
