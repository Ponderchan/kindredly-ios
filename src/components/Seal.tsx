import Svg, { Circle, G, Path } from "react-native-svg";
import { C } from "../theme/tokens";
import { WREN_PATHS } from "./Wren";

/* Wren's seal — a blind emboss, not wax. One object, three places: the
   envelope, the press, the claim. Ported from kindredly-v20.jsx (1200-1218).
   An object with its own colours, like the wax disc and the postmark: it
   reads the static C palette on purpose and looks the same in every theme,
   on a themed page and in the guide reels' fixed pictures alike. */

export function Seal({ size = 76 }: { size?: number }) {
  const r = size / 2;
  const small = size < 56;
  const bs = size / 62;
  return (
    <Svg width={size} height={size + 3} viewBox={`0 0 ${size} ${size + 3}`}>
      {!small && <Circle cx={r} cy={r + 1.6} r={r - 1} fill={C.sealShade} opacity={0.09} />}
      <Circle cx={r} cy={r} r={r - 1} fill={small ? C.sealTint : C.sealFace} />
      <Circle
        cx={r}
        cy={r}
        r={r - 1}
        fill="none"
        stroke={small ? "#D8D0F0" : C.sealRing}
        strokeWidth={Math.max(0.8, size * 0.016)}
      />
      {!small && (
        <Circle
          cx={r}
          cy={r}
          r={(r - 1) * 0.86}
          fill="none"
          stroke={C.sealInner}
          strokeWidth={Math.max(0.6, size * 0.011)}
        />
      )}
      <G transform={`translate(${r - 20 * bs},${r - 21 * bs}) scale(${bs})`} fill={C.purple}>
        <Path d={WREN_PATHS.tail} />
        <Path d={WREN_PATHS.body} />
        <Path d={WREN_PATHS.beak} />
      </G>
    </Svg>
  );
}
