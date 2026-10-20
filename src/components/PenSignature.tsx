import { memo } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { useLetterFamily, useTheme } from "../lib/theme";
import { PEN_BASELINE, PEN_H, PEN_W, penOrNull, penPath, penTypedUpright, penViewBox } from "../lib/pen-signature";

/* A SIGNED PEN NAME, STILL (identity Phase 2, foundation).
   ────────────────────────────────────────────────────────────────────────
   One person's signature as React Native draws it: their PEN v1 drawing
   (lib/pen-signature) when there is one, else their typed pen name in the
   letter serif's italic — upright for Chinese, Japanese and Korean, where
   an italic is a fake slant (penTypedUpright). Anything stored that isn't
   PEN v1 is drawn as the typed name too: a bad drawing never blanks a name.

   Where it is used: the signing sheet's typed preview, the kindred page's
   THE NAME THEY SIGNED, and the ceremony's end state (its stroke-by-stroke
   draw-in is the ceremony's own, from penDrawPlan, in the same box and
   with the same stroke rule, so the drawing doesn't jump when it lands).

   THE BOX. fit "box" draws the whole 1000×320 at `width` (height =
   width × 0.32): where on the line they signed is kept, and an optional
   faint baseline sits where the pad drew it. fit "ink" crops to the
   drawing at `width` × `height` (the ceremony's small slot).

   THE STROKE is given in points (strokePt, default 2.4) and turned into
   box units for the viewBox it is drawn in, so a signature reads the same
   weight at every size. One ink: the theme's (light on Midnight), never a
   colour — it is someone's hand, not decoration.

   VoiceOver: one element, labelled by the caller (the kindred page says
   "Mira, signed by hand" / "…signed in type"); hidden when unlabelled. */
export const PenSignature = memo(function PenSignature({
  sig,
  name,
  width,
  height,
  fit = "box",
  strokePt = 2.4,
  color,
  baseline = false,
  accessibilityLabel,
  style,
}: {
  /** the drawing (PEN v1) or null/anything else: then the typed name */
  sig: unknown;
  /** the typed pen name: drawn when there is no drawing (and never empty: pass the name they signed with) */
  name: string;
  width: number;
  /** fit "ink" only: the slot's height (default width × 0.32) */
  height?: number;
  fit?: "box" | "ink";
  strokePt?: number;
  /** the ink; the theme's ink by default */
  color?: string;
  /** fit "box": the faint baseline where the pad drew it */
  baseline?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t: tk } = useTheme();
  // a typed signature is something someone wrote: the reader's Letter font, italic where it has one
  const slanted = useLetterFamily(true);
  const ink = color ?? tk.ink;
  const h = fit === "ink" ? (height ?? width * (PEN_H / PEN_W)) : width * (PEN_H / PEN_W);
  const pen = penOrNull(sig);
  const a11y = accessibilityLabel ? { accessible: true, accessibilityLabel } : { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" as const };

  if (!pen) {
    const upright = penTypedUpright(name);
    return (
      <View style={[{ width, height: h, justifyContent: "center", alignItems: "center" }, style]} {...a11y}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={{
            ...(upright ? { fontFamily: undefined, fontStyle: "normal" as const } : slanted),
            fontSize: Math.max(13, h * 0.42),
            color: ink,
            maxWidth: width,
          }}
        >
          {name}
        </Text>
      </View>
    );
  }

  const vb = fit === "ink" ? penViewBox(pen, "ink", { aspect: width / h }) : penViewBox(pen, "box");
  const units = (pt: number) => (pt * vb.w) / width;
  return (
    <View style={[{ width, height: h }, style]} {...a11y}>
      <Svg width={width} height={h} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
        {baseline && fit === "box" ? (
          <Line x1={PEN_W * 0.06} x2={PEN_W * 0.94} y1={PEN_BASELINE * PEN_H} y2={PEN_BASELINE * PEN_H} stroke={tk.ln} strokeWidth={units(1)} />
        ) : null}
        <Path d={penPath(pen)} fill="none" stroke={ink} strokeWidth={units(strokePt)} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
});
