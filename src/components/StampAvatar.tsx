import React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { PF } from "../theme/post";
import { useTheme } from "../lib/theme";
import { MosaicId } from "./MosaicId";
import {
  STAMP_CREAM,
  STAMP_GOLD,
  STAMP_GOLD_TEXT,
  STAMP_GROUND_DARK,
  STAMP_INNER_RADIUS,
  STAMP_OUTER_RADIUS,
  stampGeometry,
} from "../lib/stamp-avatar";

/* A MEMBER'S FACE AS A GOLD PERFORATED STAMP (C2, 2026-10-19).

   The layout box stays size × size; the frame is drawn 4pt outside it (absolute, −4), so a row
   never moves. Inside, the caller draws the face at `box.size` (the inner side) and clips it to
   `box.radius` (3). Not a member ("" / null): the children are drawn exactly as they always are.

   The edge is #D8A63F in every theme; the ground is cream, or gold at 15% on a dark theme. The
   denomination ("1ST" / "007") is a printed mark: never translated, never grows with Dynamic
   Type, hidden at ≤32pt. The stamp is decorative to VoiceOver: whoever holds the face speaks
   membership in its own label (fc2.av.member / fc2.av.cofounder). */
export function StampAvatar({
  size,
  denom,
  compact,
  children,
  style,
}: {
  size: number;
  /** "" / null = not a member: renders children({ size, radius: null }) untouched */
  denom: string | null | undefined;
  /** 0 full rule, 1 small rule; omitted = by size (≤32 → small) */
  compact?: number;
  /** draw your face at `size` × `size`; `radius` is the corner to clip to (null = draw as you always do) */
  children: (box: { size: number; radius: number | null }) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { dark } = useTheme();
  if (!denom) {
    return <View style={[{ width: size, height: size }, style]}>{children({ size, radius: null })}</View>;
  }
  const g = stampGeometry(size, compact);
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: -g.bleed,
          top: -g.bleed,
          width: g.outer,
          height: g.outer,
          borderRadius: STAMP_OUTER_RADIUS,
          borderWidth: g.border,
          borderStyle: "dotted",
          borderColor: STAMP_GOLD,
          backgroundColor: dark ? STAMP_GROUND_DARK : STAMP_CREAM,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: -g.bleed + g.border + g.pad,
          top: -g.bleed + g.border + g.pad,
          width: g.inner,
          height: g.inner,
          borderRadius: STAMP_INNER_RADIUS,
          overflow: "hidden",
        }}
      >
        {children({ size: g.inner, radius: STAMP_INNER_RADIUS })}
        {g.showDenom ? (
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            allowFontScaling={false}
            maxFontSizeMultiplier={1}
            numberOfLines={1}
            style={{
              position: "absolute",
              right: 3,
              bottom: 2,
              fontFamily: PF.monoSemi,
              fontSize: 8,
              lineHeight: 10,
              color: STAMP_GOLD_TEXT,
              opacity: g.denomOpacity,
            }}
          >
            {denom}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** The orbit's tiny faces (≈10–16pt): only a 1pt dotted gold edge 1.5pt outside the face's box,
 *  radius 2, no ground and no denomination (contract D-6). Absolute; put it beside the face. */
export function StampEdge({ size, x = 0, y = 0 }: { size: number; x?: number; y?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x - 1.5,
        top: y - 1.5,
        width: size + 3,
        height: size + 3,
        borderRadius: 2,
        borderWidth: 1,
        borderStyle: "dotted",
        borderColor: STAMP_GOLD,
      }}
    />
  );
}

/** A pen pal's mosaic inside a stamp: a soft2 tile at radius 3, the mosaic at the round face's
 *  proportions — `cell` / `gap` are what the round face uses at `base`, scaled to `size`. */
export function StampMosaic({
  seed,
  size,
  develop = 1,
  base,
  cell,
  gap,
}: {
  seed: string | null | undefined;
  size: number;
  develop?: number;
  base: number;
  cell: number;
  gap: number;
}) {
  const { t: tk } = useTheme();
  const k = size / base;
  return (
    <View style={{ width: size, height: size, borderRadius: STAMP_INNER_RADIUS, backgroundColor: tk.soft2, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <MosaicId seed={seed ?? null} cell={cell * k} gap={gap * k} develop={develop} />
    </View>
  );
}
