import { Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { BRAND } from "../theme/themes";
import { useTheme } from "../lib/theme";

/* THE ACTUAL REASON, AS A CAPSULE — the owner's A5, with A4's rings as the
   fallback, in 10a dress (H:35; KAurasClose's React Native twin): the lime
   #D8F04A, a 2pt ln outline, corners 20, padding 6 12, no shadow; the mark
   in its 20 × 14 slot and the words in system 600 13, 6 apart. The lime is
   the one colour on the card that is neither ink nor the stamp's, so it
   reads as "signal" before it is read at all. Text and mark stay #1E1B35
   in every theme (BRAND.inkOnBrand): Midnight's own ink on lime would be a
   contrast of 1.03 (the mock's bug).

   Four kinds share it, each with its mark: auras close (two rings), the
   same hour (a clock), a shared subject or label (two of the same
   sticker). The words are the caller's (today-cards capsuleFor: a fixed
   template around a counted fact, see lib/today-signal), so both
   renderers say the same thing. On the Today card it shares one slot with
   the translate capsule, and translation wins (owner). */

export type SignalGlyph = "rings" | "clock" | "stickers";

export function SignalChip({ label, glyph }: { label: string; glyph: SignalGlyph }) {
  const { t: tk } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: BRAND.lime,
        borderWidth: 2,
        borderColor: tk.ln,
        flexShrink: 1,
      }}
    >
      <Mark glyph={glyph} />
      <Text style={{ fontSize: 13, fontWeight: "600", color: BRAND.inkOnBrand, flexShrink: 1 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Mark({ glyph }: { glyph: SignalGlyph }) {
  const c = BRAND.inkOnBrand;
  if (glyph === "rings")
    return (
      <Svg width={20} height={14} viewBox="0 0 20 14" fill="none" stroke={c} strokeWidth={1.8}>
        <Circle cx={7} cy={7} r={5.5} />
        <Circle cx={13} cy={7} r={5.5} />
      </Svg>
    );
  if (glyph === "clock")
    return (
      <View style={{ width: 20, height: 14, alignItems: "center", justifyContent: "center" }}>
        <Svg width={14} height={14} viewBox="0 0 16 16">
          <Circle cx={8} cy={8} r={6.4} fill="none" stroke={c} strokeWidth={1.8} />
          <Path d="M8 4.4V8l2.6 1.6" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      </View>
    );
  /* two of the same sticker — theirs on the letter, yours on you */
  return (
    <View style={{ width: 20, height: 14, alignItems: "center", justifyContent: "center" }}>
      <Svg width={14} height={14} viewBox="0 0 16 16">
        <Rect x={1.2} y={5} width={8.6} height={8.6} rx={2} fill="none" stroke={c} strokeWidth={1.8} />
        <Rect x={6} y={1.2} width={8.6} height={8.6} rx={2} fill={c} />
      </Svg>
    </View>
  );
}
