import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { ZoomIn } from "react-native-reanimated";
import { GlyphInput } from "../../components/GlyphInput";
import { StampTile } from "../../components/StampTile";
import { KeyDot, MoreTray, Nudge, PlusGlyph, RoundKey, StampKeyGlyph, StampTray } from "../../components/ComposeTray";
import { WrenBird } from "../../components/WrenBird";
import { Recorder } from "../../components/Recorder";
import { AudioCard } from "../../components/AudioCard";
import { useBreathe } from "../../components/anim";
import { t } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { MONO, PF } from "../../theme/post";
import { BRAND } from "../../theme/themes";
import { stampVM, type ComposeState } from "./useComposeState";
import { countBrand } from "./compose-model";

/* THE COMPOSE PAGE IN REACT NATIVE — the remote switch's fallback (10a
   step 5). The page as it was before SwiftUI, moved here whole and drawn
   from the theme, fed by the same state as the Swift page
   (useComposeState over compose-model), so it carries every fix too: the
   guarded ✕ with the recording guard, DISCARD and SAVE AS DRAFT that save
   once or not at all, the localized count near the ceiling, the free
   writer's "N LEFT TODAY" and the cap panel at zero, the voice letter
   counted, the question shown with a resumed draft.

   It looks as the App Store page did (owner, 2026-10-18: "the composer as
   it was"): the sticker-zine desk — ✕, TO A STRANGER, the stamp corner
   tilted at the top; Wren bare beside her line in Fraunces italic; the
   letter in Inter 19/30; the two round keys and the wide key below, which
   fills toward the floor as you write with the count beside its label
   ("7/20", key.count), and says SEND where LET IT TRAVEL would be squeezed
   beside a long pill. Only the colours come from the theme's tokens (page
   bg, lines line, keys ln, the pen ind), so it still follows the four
   themes; the light themes' placeholder is the old lavender.
   The courier's flight, the sign-up and the leave sheet are the route's,
   above whichever page draws.

   It behaves as the Swift page does: the question field takes the keyboard
   only when the writer attaches it (state.focus, as ComposeNative sends it)
   — a resumed draft with a question keeps the caret in the letter;
   VoiceOver's escape closes an open tray, then asks to leave as the × does
   (the gesture would otherwise pop the page past the leave guard); the
   count near the ceiling takes compose-model's brass (countBrand). */
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
  const brand = state.count ? countBrand(state.count.tone, tk.dark) : "mute";
  const countColor = brand === "mute" ? tk.mute : BRAND[brand];
  const placeholder = tk.dark ? tk.mute : "#B9B3D8";

  // the question takes the keyboard only when it is attached (never on a resumed draft)
  const askInput = useRef<TextInput>(null);
  const seenFocus = useRef(state.focus.serial);
  useEffect(() => {
    if (state.focus.serial === seenFocus.current) return;
    seenFocus.current = state.focus.serial;
    if (state.focus.target === "ask") askInput.current?.focus();
  }, [state.focus]);

  return (
    // VoiceOver's escape: an open tray closes first, then the guarded way out
    <View style={{ flex: 1 }} onAccessibilityEscape={() => (state.tray ? act.closeTray() : act.close())}>
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
            <Text style={{ fontFamily: PF.mono, fontSize: 17, color: tk.ink }}>✕</Text>
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text accessibilityRole="header" style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.6, color: tk.ink }}>
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
              <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 14, lineHeight: 20, color: tk.sub }}>{state.wrenLine}</Text>
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
                placeholderTextColor={placeholder}
                accessibilityLabel={t("cp.editor.a11y")}
                multiline
                style={{ minHeight: 340, color: tk.ink, fontFamily: PF.writing, fontSize: 19, lineHeight: 30, textAlignVertical: "top", paddingTop: 10 }}
              />
            ) : (
              <View style={{ paddingTop: 12, minHeight: 250 }}>
                <Recorder doneUri={state.recUri} doneDur={state.recDur} onDone={act.recorded} onClear={act.clearRecording} />
                {state.recUri && (
                  <View style={{ marginTop: 12 }}>
                    <AudioCard url={state.recUri} durationS={state.recDur} compact />
                  </View>
                )}
                <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: tk.mute, marginTop: 14, lineHeight: 17 }}>
                  {t("cp.voiceNote", { wren: state.wrenName })}
                </Text>
                <TextInput
                  value={state.text}
                  onChangeText={(v) => act.textChange("body", v)}
                  onFocus={() => act.fieldFocus("body", true)}
                  placeholder={t("cp.voiceLine.ph")}
                  placeholderTextColor={placeholder}
                  style={{ color: tk.ink, fontFamily: PF.letter, fontSize: 17, marginTop: 14 }}
                />
              </View>
            )}

            {state.capPanel && (
              <View style={{ marginTop: 16, padding: 16, borderWidth: 1, borderColor: tk.ink }}>
                <Text style={{ fontFamily: PF.letter, fontSize: 15, fontWeight: "600", color: tk.ink }}>{state.capText}</Text>
                <Text style={{ fontFamily: PF.letter, fontSize: 13, color: tk.sub, marginTop: 5 }}>{t("cp.repliesFree")}</Text>
                <Pressable onPress={act.capLink} accessibilityRole="link" style={{ marginTop: 10, minHeight: 32, justifyContent: "center" }}>
                  <Text style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: tk.ind }}>{t("cp.discover")}</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* THE QUESTION RIDES UNDER THE LETTER — appended below the body at
              send and carried by drafts; turning it off takes it off */}
          {state.askOpen && state.mode === "write" && (
            <View style={{ paddingHorizontal: 22, paddingVertical: 12, borderTopWidth: 1, borderTopColor: tk.line }}>
              <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: tk.mute, marginBottom: 7 }}>{t("cp.askLabel")}</Text>
              <TextInput
                ref={askInput}
                value={state.ask}
                onChangeText={(v) => act.textChange("ask", v)}
                onFocus={() => act.fieldFocus("ask", true)}
                placeholder={t("cp.askPh")}
                placeholderTextColor={placeholder}
                accessibilityLabel={t("cp.askLabel")}
                maxLength={140}
                style={{ fontFamily: PF.letter, fontSize: 16.5, color: tk.ink, paddingVertical: 4 }}
              />
            </View>
          )}

          {/* the small line above the keys: the count near the ceiling, and the free writer's day */}
          {(!!state.count || !!state.quota) && (
            <View style={{ paddingHorizontal: 24, flexDirection: "row", justifyContent: "flex-end", gap: 12, marginBottom: -2 }}>
              {state.count && <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.4, color: countColor }}>{state.count.text}</Text>}
              {!!state.quota && <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.6, color: tk.mute }}>{state.quota}</Text>}
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
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68} style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 0.2, color: chosen.ink }}>
                  {chosen.tag}
                </Text>
              </Pressable>
            ) : (
              <RoundKey onPress={() => act.openTray("stamps")} accessibilityLabel={t("cp.stamp.a11y")}>
                <StampKeyGlyph open={state.tray === "stamps"} size={27} />
              </RoundKey>
            )}

            {/* THE DOOR SHOWS HOW FAR IT IS: a wash rising toward the floor, the count beside the label */}
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
              <View style={{ paddingVertical: 17, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flexShrink: 1, fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1.4, color: keyInk }}>
                  {narrow ? key.narrowLabel : key.label}
                </Text>
                {/* the count rides in the row, not over the label */}
                {!!key.count && <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: tk.mute }}>{key.count}</Text>}
              </View>
            </Pressable>
          </View>
          {state.tray === "stamps" && <StampTray selected={state.sel} sections={state.sections} onPick={act.pickStamp} />}
          {state.tray === "more" && (
            <MoreTray askOn={state.more.askOn} askDisabled={state.more.askDisabled} voiceOn={state.more.voiceOn} premium={!state.more.voiceLocked} onAsk={act.toggleAsk} onVoice={act.toggleVoice} />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
