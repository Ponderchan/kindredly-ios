import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { C } from "../theme/tokens";
import { WREN_PATHS } from "./Wren";

/* The hero envelope — ported from kindredly-v20.jsx (266-284). When `sealed`,
   draws the embossed Wren wax seal on the flap. */

export function EnvelopeArt({ w = 210, sealed = true }: { w?: number; sealed?: boolean }) {
  return (
    <Svg width={w} height={w * 0.72} viewBox="0 0 212 152">
      <Rect x={8} y={12} width={196} height={132} rx={5} fill="rgba(90,66,40,0.15)" />
      <Rect x={4} y={6} width={196} height={132} rx={5} fill="#FBF7EF" />
      <Path d="M4 10 L102 84 L200 10" fill="none" stroke="#E8DFCD" strokeWidth={1.2} />
      <Path d="M4 6 L200 6 L102 82 Z" fill="#FDFAF4" stroke="#E8DFCD" strokeWidth={1.2} />
      {sealed && (
        <>
          <Circle cx={102} cy={75.5} r={21} fill={C.sealShade} opacity={0.09} />
          <Circle cx={102} cy={74} r={21} fill={C.sealFace} />
          <Circle cx={102} cy={74} r={21} fill="none" stroke={C.sealRing} strokeWidth={1.3} />
          <Circle cx={102} cy={74} r={18} fill="none" stroke={C.sealInner} strokeWidth={1} />
          <G transform="translate(88.5,59.5) scale(0.68)" fill={C.purple}>
            <Path d={WREN_PATHS.tail} />
            <Path d={WREN_PATHS.body} />
            <Path d={WREN_PATHS.beak} />
          </G>
        </>
      )}
    </Svg>
  );
}
