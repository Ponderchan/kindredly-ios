import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, TextInput, View, type NativeSyntheticEvent, type TextInputProps, type TextInputSelectionChangeEventData, type TextStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

/* THE GLYPH AS THE CARET.
   ────────────────────────────────────────────────────────────────────────
   The courier's typographic mark, cut down to the two characters that
   are her face: •> — an ink eye and an amber beak. It is the cursor
   wherever you write here (a letter, a page, a reply): made of the same
   keys the reader is pressing, blinking where the next word goes.

   How: the native caret is hidden, and the text up to the selection is
   mirrored in an invisible Text of the same style and width; its last
   line tells us where the caret would be, and the glyph is drawn there.
   Solid while you type, blinking when you stop. */

const INK = "#1E1B35";
const AMBER = "#D8A63F";

/* drawn, not typed: a dot and a chevron, so the eye sits exactly on the
   text's x-height whatever face the page is set in */
export function WrenGlyph({ size }: { size: number }) {
  const w = size * 1.1;
  const h = size * 0.5;
  return (
    <Svg width={w} height={h} viewBox="0 0 1.1 0.5">
      <Circle cx={0.13} cy={0.25} r={0.12} fill={INK} />
      <Path d="M0.5 0.03 L0.98 0.25 L0.5 0.47" fill="none" stroke={AMBER} strokeWidth={0.14} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const flat = (s: TextStyle | TextStyle[] | undefined): TextStyle => (StyleSheet.flatten(s) as TextStyle) || {};

export const GlyphInput = forwardRef<TextInput, TextInputProps>(function GlyphInput(props, ref) {
  const { style, value = "", onChangeText, onSelectionChange, onFocus, onBlur, multiline, placeholder, placeholderTextColor } = props;
  const inner = useRef<TextInput | null>(null);
  const setRefs = useCallback(
    (node: TextInput | null) => {
      inner.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<TextInput | null>).current = node;
    },
    [ref],
  );
  const [sel, setSel] = useState({ start: value.length, end: value.length });
  const [focused, setFocused] = useState(!!props.autoFocus);
  const blink = useRef(new Animated.Value(1)).current;

  const st = flat(style as TextStyle);
  const fontSize = st.fontSize ?? 16;
  const lineHeight = st.lineHeight ?? Math.round(fontSize * 1.4);
  const padTop = (st.paddingTop ?? st.paddingVertical ?? st.padding ?? 0) as number;
  const padLeft = (st.paddingLeft ?? st.paddingHorizontal ?? st.padding ?? 0) as number;
  const padRight = (st.paddingRight ?? st.paddingHorizontal ?? st.padding ?? 0) as number;
  const mirrorStyle: TextStyle = { position: "absolute", left: padLeft, right: padRight, top: padTop, fontFamily: st.fontFamily, fontSize, lineHeight, fontWeight: st.fontWeight, letterSpacing: st.letterSpacing };

  /* blink: solid on every keystroke, then the caret's own rhythm */
  useEffect(() => {
    blink.stopAnimation();
    blink.setValue(1);
    if (!focused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(520),
        Animated.timing(blink, { toValue: 0, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(380),
        Animated.timing(blink, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blink, focused, value, sel.end]);

  /* THE GLYPH IS INLINE. The text up to the caret is mirrored in a
     transparent Text laid exactly over the input, and the bird is an
     inline view at its end — so it is placed in the same layout pass as
     the words, never a frame behind them, and it sits on the baseline the
     way an inline view does: its box is the x-height, so the eye rides the
     middle of the lowercase letters in any face. */
  // after a trailing newline a zero-width mark gives the bird a line to stand on
  const raw = value.slice(0, Math.min(sel.end, value.length));
  // …and at the very start of the text the same mark keeps the line's own
  // height, so the bird sits on the first line instead of floating above it
  const before = raw.endsWith("\n") || raw === "" ? raw + "\u200b" : raw;
  /* an inline view's bottom lands on the line's bottom, not the baseline —
     and iOS sets the glyphs at the TOP of a taller line box, so the
     baseline sits (lineHeight − ascent) above that bottom, not a fixed
     share of the size. The box is that tall less the glyph's own height,
     so the eye lands in the middle of the lowercase at 20/33 and at 17/25
     alike. (0.92 ≈ the serif's ascent; the system face is within a point.) */
  const gw = fontSize * 1.1;
  const glyphBox = Math.max(fontSize * 0.5, lineHeight - fontSize * 0.92);
  const glyph = focused ? (
    <View style={{ width: gw + 2, height: glyphBox, marginLeft: Math.round(fontSize * 0.14), justifyContent: "flex-start" }}>
      <Animated.View style={{ opacity: blink }}>
        <WrenGlyph size={fontSize} />
      </Animated.View>
    </View>
  ) : null;

  return (
    <View style={{ flex: (st.flex as number) ?? undefined, alignSelf: "stretch" }}>
      {/* the wrapper carries the flex; left on the field as well, Yoga
          sizes it from a zero basis and the height the caller set is lost */}
      <TextInput
        {...props}
        style={[style, { flex: undefined }]}
        ref={setRefs}
        placeholder={value ? placeholder : undefined}
        caretHidden
        /* typing always lands the caret after the new text — set that at
           once, before the native selection event catches up */
        onChangeText={(t) => {
          setSel({ start: t.length, end: t.length });
          onChangeText?.(t);
        }}
        onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
          setSel(e.nativeEvent.selection);
          onSelectionChange?.(e);
        }}
        onFocus={(e) => {
          setFocused(true);
          /* a page you come back to (a restored draft) opens with the caret
             at its end — where writing continues — on both the native side
             and ours, so the two can never disagree */
          if (value.length) {
            const end = value.length;
            setSel({ start: end, end });
            inner.current?.setSelection?.(end, end);
          }
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {/* the mirror: same face, same measure, the words transparent, the bird at the caret */}
      {!!value && (
        <Text pointerEvents="none" style={[mirrorStyle, { color: "transparent" }, !multiline && { flexWrap: "nowrap" }]} numberOfLines={multiline ? undefined : 1}>
          {before}
          {glyph}
        </Text>
      )}
      {/* while the page is empty the placeholder is ours to draw, and the
          bird stands at the head of its first line — inside the same line
          of type, so it sits exactly as it does among the words */}
      {/* ONE LINE, ALWAYS: an empty field is sized for one line (fieldBox),
          so a placeholder that wraps — the bird's slot in front of a long
          one did it — spills out under the rule. It ends in an ellipsis
          instead. */}
      {!value && (
        <Text pointerEvents="none" style={[mirrorStyle, { color: (placeholderTextColor as string) || "#B9B3D8" }]} numberOfLines={1} ellipsizeMode="tail">
          {glyph}
          {focused && !!placeholder && <View style={{ width: Math.round(fontSize * 0.35), height: 1 }} />}
          {placeholder ?? ""}
        </Text>
      )}
    </View>
  );
});
