import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { ZoomIn } from "react-native-reanimated";
import { GlyphInput } from "../../components/GlyphInput";
import { Stamp, StampSlot } from "../../components/Stamp";
import { MoreTray } from "../../components/ComposeTray";
import { WrenBird } from "../../components/WrenBird";
import { Recorder } from "../../components/Recorder";
import { StampStrip, TravelBar } from "./TravelBar";
import { AudioCard } from "../../components/AudioCard";
import { useBreathe } from "../../components/anim";
import { t } from "../../lib/i18n";
import { useLetterFamily, useTheme } from "../../lib/theme";
import { MONO, PFM } from "../../theme/post";
import { BRAND } from "../../theme/themes";
import { STAMP_LADDER, stampSlotStroke } from "../../lib/stamp-frame";
import "../../data/strings-travel"; // cp.l6.* (the bar's words)
import type { ComposeState } from "./useComposeState";
import { countBrand } from "./compose-model";
import { CloseGlyph } from "../../components/10a/BackChevron";

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
   tilted at the top; Wren bare beside her line; the letter 19/30; and
   below it the Let it travel L6 bar (owner, 2026-10-26; TravelBar.tsx, the
   SwiftUI KComposeTravelBar's twin): + · the stamp slot or the chosen
   stamp's #topic · the CTA capsule that fills toward the floor with the
   count beside it ("7/20", key.count), asks for a stamp, then sends with
   its paper plane; the stamp strip (PICK A STAMP) where the keyboard was.
   Only the colours come from the theme's tokens (page
   bg, lines line, keys ln, the pen ind), so it still follows the four
   themes; the light themes' placeholder is the old lavender.
   Its type is the owner's (10-20): what you write (the letter, the
   caption, the question) and Wren's line in the writer's Letter font
   (useLetterFamily); TO A STRANGER a secondary title, System 500 17; the
   small lines labels in SF Mono (PFM); the voice note, a sentence, System;
   the wide key, the send key, stays mono. No Inter, no Fraunces.
   The courier's flight, the sign-up and the leave sheet are the route's,
   above whichever page draws.

   It behaves as the Swift page does: the question field takes the keyboard
   only when the writer attaches it (state.focus, as ComposeNative sends it)
   — a resumed draft with a question keeps the caret in the letter;
   VoiceOver's escape closes an open tray, then asks to leave as the × does
   (the gesture would otherwise pop the page past the leave guard); the
   count near the ceiling takes compose-model's brass (countBrand).

   THE STAMP CORNER (stamps v3, owner 2026-10-19; Let it travel L6,
   2026-10-26). It keeps its place and its 50pt hit area; what sits in it
   is the stamp itself at 30×36 (the tray tile's size), tilted 4° — your
   own stamp, so flat: no letter tilt, no postmark. Before one is chosen it
   is the v3 frame alone, unfilled, dashed in the theme's mute (darker on
   Lavender, where mute is under 3:1: stampSlotStroke) (StampSlot, contract
   §7), so choosing a stamp fills the outline it was promised. The bar
   below shows the chosen stamp's #topic (TravelBar.tsx), as the SwiftUI
   page does. */
const CORNER = STAMP_LADDER.trayTile;
const CORNER_DEG = 4;
/** the corner's tap target, as it was: the old 44 tile and its 3pt of padding */
const CORNER_BOX = 50;

export function ComposeRN({ state }: { state: ComposeState }) {
  const { t: tk } = useTheme();
  const { act } = state;
  const breathe = useBreathe(6, 2600);
  // the chosen stamp, official or photo ("c:<uuid>": its #topic on its category's colour)
  const chosen = state.chosenVM;
  // the bar rides 12 above the keyboard or a strip, 30 above the home indicator (L6)
  const [kbUp, setKbUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setKbUp(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKbUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const brand = state.count ? countBrand(state.count.tone, tk.dark) : "mute";
  const countColor = brand === "mute" ? tk.mute : BRAND[brand];
  const placeholder = tk.dark ? tk.mute : "#B9B3D8";
  // content (what you write, Wren's line) is in the writer's Letter font
  const face = useLetterFamily();
  const italic = useLetterFamily(true);

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
            <CloseGlyph color={tk.ink} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontWeight: "500", fontSize: 17, color: tk.ink }}>
              {t("cp.header")}
            </Text>
          </View>
          <Pressable
            onPress={() => act.openTray("stamps")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={chosen ? t("cp.stampChosen.a11y", { name: chosen.name }) : t("cp.stamp.a11y")}
            style={{ transform: [{ rotate: `${CORNER_DEG}deg` }] }}
          >
            <View style={{ width: CORNER_BOX, height: CORNER_BOX, alignItems: "center", justifyContent: "center" }}>
              {state.sel ? (
                <Stamp id={state.sel} width={CORNER.w} />
              ) : (
                /* the corner where the stamp goes, still empty: its outline */
                <StampSlot width={CORNER.w} stroke={stampSlotStroke(tk)} />
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
              <Text style={{ flex: 1, ...italic, fontSize: 14, lineHeight: 20, color: tk.sub }}>{state.wrenLine}</Text>
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
                style={{ minHeight: 340, color: tk.ink, ...face, fontSize: 19, lineHeight: 30, textAlignVertical: "top", paddingTop: 10 }}
              />
            ) : (
              <View style={{ paddingTop: 12, minHeight: 250 }}>
                <Recorder doneUri={state.recUri} doneDur={state.recDur} onDone={act.recorded} onClear={act.clearRecording} />
                {state.recUri && (
                  <View style={{ marginTop: 12 }}>
                    <AudioCard url={state.recUri} durationS={state.recDur} compact />
                  </View>
                )}
                <Text style={{ fontWeight: "400", fontSize: 13, color: tk.mute, marginTop: 14, lineHeight: 18 }}>
                  {t("cp.voiceNote", { wren: state.wrenName })}
                </Text>
                <TextInput
                  value={state.text}
                  onChangeText={(v) => act.textChange("body", v)}
                  onFocus={() => act.fieldFocus("body", true)}
                  placeholder={t("cp.voiceLine.ph")}
                  placeholderTextColor={placeholder}
                  style={{ color: tk.ink, ...face, fontSize: 17, marginTop: 14 }}
                />
              </View>
            )}

            {state.capPanel && (
              <View style={{ marginTop: 16, padding: 16, borderWidth: 1, borderColor: tk.ink }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: tk.ink }}>{state.capText}</Text>
                <Text style={{ fontSize: 13, fontWeight: "400", color: tk.sub, marginTop: 5 }}>{t("cp.repliesFree")}</Text>
                <Pressable onPress={act.capLink} accessibilityRole="link" style={{ marginTop: 10, minHeight: 32, justifyContent: "center" }}>
                  <Text style={{ ...PFM.monoMed, fontSize: 11.5, letterSpacing: 1, color: tk.ind }}>{t("cp.discover")}</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* THE QUESTION RIDES UNDER THE LETTER — appended below the body at
              send and carried by drafts; turning it off takes it off */}
          {state.askOpen && state.mode === "write" && (
            <View style={{ paddingHorizontal: 22, paddingVertical: 12, borderTopWidth: 1, borderTopColor: tk.line }}>
              <Text style={{ ...PFM.mono, fontSize: 9.5, letterSpacing: 1.2, color: tk.mute, marginBottom: 7 }}>{t("cp.askLabel")}</Text>
              <TextInput
                ref={askInput}
                value={state.ask}
                onChangeText={(v) => act.textChange("ask", v)}
                onFocus={() => act.fieldFocus("ask", true)}
                placeholder={t("cp.askPh")}
                placeholderTextColor={placeholder}
                accessibilityLabel={t("cp.askLabel")}
                maxLength={140}
                style={{ ...face, fontSize: 16.5, color: tk.ink, paddingVertical: 4 }}
              />
            </View>
          )}

          {/* the small line above the keys: the count near the ceiling, and the free writer's day */}
          {(!!state.count || !!state.quota) && (
            <View style={{ paddingHorizontal: 26, flexDirection: "row", justifyContent: "flex-end", gap: 12, marginBottom: -2 }}>
              {state.count && <Text style={{ ...PFM.mono, fontSize: 11, letterSpacing: 0.4, color: countColor }}>{state.count.text}</Text>}
              {!!state.quota && <Text style={{ ...PFM.mono, fontSize: 11, letterSpacing: 0.6, color: tk.mute }}>{state.quota}</Text>}
            </View>
          )}

          {/* LET IT TRAVEL L6 (owner, 2026-10-26): + · the stamp slot or the #topic · the CTA,
              12 above a tray (the keyboard: KeyboardAvoidingView), 30 above the home indicator */}
          <TravelBar state={state} bottom={state.tray || kbUp ? 12 : 30} />
          {state.tray === "stamps" && <StampStrip state={state} />}
          {state.tray === "more" && (
            <MoreTray askOn={state.more.askOn} askDisabled={state.more.askDisabled} voiceOn={state.more.voiceOn} premium={!state.more.voiceLocked} onAsk={act.toggleAsk} onVoice={act.toggleVoice} />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
