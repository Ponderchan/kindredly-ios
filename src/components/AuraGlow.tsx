import { View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { P } from "../theme/post";

/* THE AURA ITSELF — a soft glow that grows as the evidence does.
   ────────────────────────────────────────────────────────────────────────
   Everything else in this product is ink on paper; the aura is the one
   thing that is allowed to glow (stamps were the first sanctioned colour,
   this is the second). Three overlapping radial washes — lavender, pen,
   a warm amber — swell and deepen with `formed`, the fraction of the nine
   signals that have locked. The signals themselves land ON the glow as
   tiny ink specks: lock one, gain a star. The same RadialGradient craft
   the hatch ceremony already uses, so the glow is native, not imported.

   Deterministic: same formed + locked, same aura. No animation here — the
   card is a reading, not a lava lamp. */

const SPECKS: [number, number][] = [
  [0.56, 0.2], [0.74, 0.38], [0.68, 0.6], [0.48, 0.72], [0.28, 0.62],
  [0.22, 0.4], [0.38, 0.26], [0.6, 0.82], [0.13, 0.68],
];

export function AuraGlow({
  formed,
  size = 104,
  uid = "ag",
}: {
  /** 0..1 — locked / 9 */
  formed: number;
  size?: number;
  uid?: string;
}) {
  const s = size;
  const f = Math.max(0, Math.min(1, formed));
  // the glow swells from a faint mist to a full presence
  const g = 0.36 + 0.64 * f;

  if (f === 0) {
    // no data: the barest grey breath, no colour claimed yet
    return (
      <Svg width={s} height={s}>
        <Defs>
          <RadialGradient id={`${uid}0`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={P.ink} stopOpacity={0.09} />
            <Stop offset="100%" stopColor={P.ink} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={s * 0.5} cy={s * 0.5} r={s * 0.22} fill={`url(#${uid}0)`} />
      </Svg>
    );
  }

  return (
    <Svg width={s} height={s}>
      <Defs>
        <RadialGradient id={`${uid}l`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#B9A8F0" stopOpacity={0.55 + 0.35 * f} />
          <Stop offset="100%" stopColor="#B9A8F0" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${uid}p`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={P.pen} stopOpacity={0.22 + 0.2 * f} />
          <Stop offset="100%" stopColor={P.pen} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${uid}a`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#E8B36B" stopOpacity={f > 0.4 ? 0.3 + 0.35 * f : 0} />
          <Stop offset="100%" stopColor="#E8B36B" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* lavender ground, pen heart, amber warmth — in that order */}
      <Circle cx={s * 0.47} cy={s * 0.48} r={s * 0.46 * g} fill={`url(#${uid}l)`} />
      <Circle cx={s * 0.6} cy={s * 0.42} r={s * 0.32 * g} fill={`url(#${uid}p)`} />
      <Circle cx={s * 0.38} cy={s * 0.6} r={s * 0.28 * g} fill={`url(#${uid}a)`} />
    </Svg>
  );
}

/* rn-svg can't nest Views; the specks ride as a sibling overlay */
export function AuraSpecks({ locked, size = 104 }: { locked: number; size?: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: size, height: size }}>
      {SPECKS.slice(0, Math.max(0, Math.min(9, locked))).map(([x, y], i) => (
        <View
          key={i}
          style={{ position: "absolute", left: x * size, top: y * size, width: 3, height: 3, backgroundColor: P.ink }}
        />
      ))}
    </View>
  );
}
