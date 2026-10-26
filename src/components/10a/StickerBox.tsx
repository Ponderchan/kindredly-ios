import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { stickerPressOffset } from "./kit";

/* THE STICKER MATERIAL, IN REACT NATIVE (10a).
   ────────────────────────────────────────────────────────────────────────
   A face with an outline and a HARD shadow: an offset copy of its shape in
   ln, no blur (tokens-10a.md §6). It is drawn as a second view behind the
   face rather than with iOS's shadow props, so it survives what those
   don't: a face that clips its children (overflow hidden kills a layer
   shadow), a face that grows with a multi-line field, and a translucent
   fill. Like CSS box-shadow it takes no room in the layout — leave the
   offset free to its right and below.

   Pressed (pass `pressed` from a Pressable's render function) the face
   moves down onto its shadow, which stays where it is: the same press as
   the SwiftUI KStickerButtonStyle. Colours are the caller's, from the
   theme. */
export function StickerBox({
  fill,
  stroke,
  lineWidth = 2,
  radius,
  shadow = null,
  offset = 0,
  pressed = false,
  style,
  faceStyle,
  children,
}: {
  /** the face (tk.sf for every sticker in the mock) */
  fill: string;
  /** the outline colour (tk.ln), or null for none */
  stroke: string | null;
  /** the outline's width: 2.5 InkCard, 2 controls, 1.5 light (tokens-10a §6) */
  lineWidth?: number;
  radius: number;
  /** the hard shadow's colour (tk.ln), or null for none */
  shadow?: string | null;
  /** the hard shadow's offset, right and down: 6, 5, 4, 3 or 2 */
  offset?: number;
  /** a press in progress: the face goes down onto its shadow */
  pressed?: boolean;
  /** the outer box: margins, flex, width — what places the sticker */
  style?: StyleProp<ViewStyle>;
  /** the face: padding, flexDirection, alignment — what lays out its content */
  faceStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const hasShadow = !!shadow && offset > 0;
  const at = stickerPressOffset(hasShadow ? offset : 0, pressed);
  return (
    <View style={style}>
      {hasShadow && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: offset, left: offset, right: -offset, bottom: -offset, borderRadius: radius, backgroundColor: shadow }}
        />
      )}
      <View
        style={[
          { backgroundColor: fill, borderRadius: radius, borderWidth: stroke ? lineWidth : 0, borderColor: stroke ?? "transparent" },
          at ? { transform: [{ translateX: at }, { translateY: at }] } : null,
          faceStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/* OBJECT DEPTH (owner's rule B, 2026-10-26). Controls are flat. A thing in
   the story (the Writing Aura card, an envelope, a letter preview, the First
   Class ticket) keeps its depth, but with no ink edge: only a hard shadow in
   a deep tint of the page purple, #C9C4F2 at 6/6 in the light themes and
   #3A3580 in Midnight. A small object takes a smaller offset (6 × its scale).
   Spread it into a StickerBox: <StickerBox fill radius {...objectDepth(tk)}>.
   KObjectDepth in KSticker.swift is the SwiftUI twin; change them together. */
export const OBJECT_DEPTH = { light: "#C9C4F2", dark: "#3A3580", offset: 6 } as const;

export function objectDepth(tk: { dark: boolean }, offset: number = OBJECT_DEPTH.offset): { stroke: null; shadow: string; offset: number } {
  return { stroke: null, shadow: tk.dark ? OBJECT_DEPTH.dark : OBJECT_DEPTH.light, offset };
}
