import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { MONO, PF } from "../../theme/post";
import { useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { SEND_STYLE, sendTakesPress, type SendState, type SendStyle } from "./kit";

/* THE ONE SEND KEY (10a; KSendKey's React Native twin).
   ────────────────────────────────────────────────────────────────────────
   Every reply in the app ends in this key — Today's strip, a room, a pen
   pal's chat, the reader. Three states (kit.ts sendKeyState):

     disabled  SEND in faint on a soft2 pill, mono 600 11 at .12em, padding
               9 14, corners 18 (H:124). Not pressable; VoiceOver hears a
               dimmed button.
     enabled   owner question 3, built with its recommended answer
               (SEND_STYLE = "plane"): the black pill with the paper plane,
               54 × 36, corners 18, the plane 19 in the page colour (the
               owner's 2026-09-20 key). The other answer, "word", is SEND
               on an ind pill with the page colour on it, same metrics as
               the disabled pill.
     dimmed    looks exactly like disabled but takes the tap — a full pouch:
               the words are ready, the tap explains why they can't go yet.

   The key holds no words of its own: the label is ld.send unless the
   caller gives one, already translated. Colours from the theme. */

/** the paper plane, in a 24 box (ChatField's SendPlane) */
const PLANE = "M3.4 2.6a1 1 0 0 0-1.3 1.2l2.3 7.2a1 1 0 0 0 .8.7l8.3 1.3-8.3 1.3a1 1 0 0 0-.8.7l-2.3 7.2a1 1 0 0 0 1.3 1.2l18-8.4a1 1 0 0 0 0-1.8z";

export function SendKey({
  state,
  onPress,
  label,
  sendStyle = SEND_STYLE,
  accessibilityLabel,
  style,
}: {
  /** from sendKeyState() in ./kit */
  state: SendState;
  /** called for enabled and dimmed (the caller tells them apart) — never for disabled */
  onPress?: () => void;
  /** the word on the pill (default ld.send, "SEND" in nine languages), shown as given */
  label?: string;
  /** the enabled look; leave it to SEND_STYLE unless a screen has its own reason */
  sendStyle?: SendStyle;
  /** what VoiceOver says (default: the label) */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  useLang();
  const { t: tk } = useTheme();
  const word = label ?? t("ld.send");
  const live = sendTakesPress(state);
  const plane = state === "enabled" && sendStyle === "plane";
  const onInd = state === "enabled" && sendStyle === "word";

  return (
    <Pressable
      onPress={live ? onPress : undefined}
      disabled={!live}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? word}
      accessibilityState={{ disabled: !live }}
      hitSlop={plane ? { top: 4, bottom: 4, left: 4, right: 4 } : 6}
      style={({ pressed }) => [{ opacity: live && pressed ? 0.7 : 1 }, style]}
    >
      {plane ? (
        <View style={{ width: 54, height: 36, borderRadius: 18, backgroundColor: tk.ink, alignItems: "center", justifyContent: "center" }}>
          <Svg width={19} height={19} viewBox="0 0 24 24" fill={tk.bg}>
            <Path d={PLANE} />
          </Svg>
        </View>
      ) : (
        <View style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: onInd ? tk.ind : tk.soft2 }}>
          <Text numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: MONO.title * 0.12, color: onInd ? tk.bg : tk.faint }}>
            {word}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
