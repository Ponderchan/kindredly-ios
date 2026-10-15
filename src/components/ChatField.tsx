import { forwardRef } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import Svg, { Path } from "react-native-svg";
import { GlyphInput } from "./GlyphInput";
import { PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { fieldBox } from "../lib/field";

/* THE CHAT FIELD (owner, 2026-09-20): a pill, and the moment there is a
   character in it, a blue arrow at its right end that sends. The keyboard's
   own SEND sends too. Nothing shows while the field is empty — an arrow
   with nothing to carry is a button that does nothing, and the pill is
   quieter without it. `canSend` can lag `text` (a reply that is not yet
   long enough, a send in flight): the arrow is there but dimmed, so the
   hand learns the rule without a dialog. */
export const ChatField = forwardRef<
  TextInput,
  TextInputProps & { text: string; canSend: boolean; onSend: () => void; lineHeight?: number }
>(function ChatField({ text, canSend, onSend, lineHeight = 24, style, ...rest }, ref) {
  const P = useP();
  const { t: T, dark } = useTheme();
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", borderRadius: 20, backgroundColor: T.soft, paddingLeft: 14, paddingRight: 5 }}>
      <GlyphInput
        ref={ref}
        value={text}
        multiline
        returnKeyType="send"
        submitBehavior="submit"
        onSubmitEditing={() => canSend && onSend()}
        placeholderTextColor={T.faint}
        keyboardAppearance={dark ? "dark" : "light"}
        {...rest}
        style={[{ flex: 1, ...fieldBox(text, lineHeight, 110), paddingTop: 9, paddingBottom: 9, fontFamily: PF.writing, fontSize: 16, lineHeight, color: P.ink }, style]}
      />
      {text.length > 0 && (
        <Pressable onPress={onSend} disabled={!canSend} hitSlop={6} style={({ pressed }) => ({ marginBottom: 6, opacity: !canSend ? 0.35 : pressed ? 0.7 : 1 })}>
          <SendArrow />
        </Pressable>
      )}
    </View>
  );
});

export function SendArrow({ size = 30 }: { size?: number }) {
  const P = useP();
  const T = useTheme().t;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: P.pen, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke={T.bg} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 19V5" />
        <Path d="M5 12l7-7 7 7" />
      </Svg>
    </View>
  );
}

/* THE PLANE (owner, 2026-09-20): on the Today card's write-back box the
   dim SEND word stays while the box is empty; the moment there are words
   it becomes a black pill with a paper plane — the shape every phone
   already reads as "this goes now". */
export function SendPlane({ on = true, ink = "#111113" }: { on?: boolean; ink?: string }) {
  return (
    <View style={{ width: 54, height: 36, borderRadius: 18, backgroundColor: ink, alignItems: "center", justifyContent: "center", opacity: on ? 1 : 0.35 }}>
      <Svg width={19} height={19} viewBox="0 0 24 24" fill="#FFFFFF">
        <Path d="M3.4 2.6a1 1 0 0 0-1.3 1.2l2.3 7.2a1 1 0 0 0 .8.7l8.3 1.3-8.3 1.3a1 1 0 0 0-.8.7l-2.3 7.2a1 1 0 0 0 1.3 1.2l18-8.4a1 1 0 0 0 0-1.8z" />
      </Svg>
    </View>
  );
}
