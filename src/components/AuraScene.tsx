import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { PALETTE, type Daylight } from "./CourierCard";
import type { Fidelity } from "../lib/aura-ladder";

/* THE SCENE THAT DEVELOPS — a window, a desk, someone bent over a page.
   ────────────────────────────────────────────────────────────────────────
   One set of paths, drawn four ways (the owner's W33): the first rungs
   show only the lines waiting to be written; three letters in, a faint
   pencil outline; a label stuck, a single-ink sketch on cream; named, the
   whole thing in colour. The colour rung's sky is the courier card's sky
   at this hour — the two cards are always the same time of day. Before
   colour the ground is the app's own pale lavender, the pencil and the
   sketch ink two steps of the same violet. */

export const SCENE_RATIO = 114 / 357;

const D = {
  paper: "#DEDAF6", // the scene's ground before colour — a step deeper than the page, so the band reads as paper, not a hole
  pencil: "rgba(111,104,184,0.62)", // faint, but a drawing — not nothing
  ink: "#4A4390", // the sketch's one ink
  fill: "#F8F7FF",
  lines: "#1E1B35",
  brass: "#D8A63F",
} as const;

export function AuraScene({ width, fidelity, day }: { width: number; fidelity: Fidelity; day: Daylight }) {
  const h = Math.round(width * SCENE_RATIO);
  const pal = PALETTE[day];
  const night = day === "night";
  /* colour: strokes go cream on the night sky, umber by day */
  const cInk = night ? "#F3ECDA" : "#3A2E1E";
  const pane = night ? "#3A3F5C" : pal.sky[1];
  const skin = night ? "#E8CDB2" : "#E8CDB2";
  const body = night ? "#5B4E8A" : "#8A7454";

  return (
    <Svg width={width} height={h} viewBox="0 0 357 114" preserveAspectRatio="xMidYMid slice">
      {fidelity === "colour" && (
        <Defs>
          <LinearGradient id="auraSky" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={pal.sky[0]} />
            <Stop offset="1" stopColor={pal.sky[1]} />
          </LinearGradient>
        </Defs>
      )}
      <Rect x={0} y={0} width={357} height={114} fill={fidelity === "colour" ? "url(#auraSky)" : D.paper} />

      {fidelity === "lines" && (
        <>
          {/* the lines waiting to be written, and one small star */}
          {[
            [24, 124],
            [38, 84],
            [52, 106],
            [66, 54],
          ].map(([y, w], i) => (
            <Rect key={y} x={108} y={y} width={w} height={5} rx={2.5} fill={D.lines} opacity={0.3 - i * 0.05} />
          ))}
          <Path d="M296 28l2.6 6.4 6.4 2.6-6.4 2.6-2.6 6.4-2.6-6.4-6.4-2.6 6.4-2.6z" fill={D.brass} />
        </>
      )}

      {fidelity === "pencil" && <Figure stroke={D.pencil} fill="none" sunFill={null} />}
      {fidelity === "sketch" && <Figure stroke={D.ink} fill={D.fill} sunFill="none" />}
      {fidelity === "colour" && (
        <>
          <Figure stroke={cInk} fill={D.fill} pane={pane} skin={skin} body={body} hair={night ? "#2A2340" : undefined} paper="#FFFFFF" sunFill={night ? "#FFE7BE" : (pal.sun ?? D.brass)} />
          {/* two small lights in the corner — stars at night, sun-dust by day */}
          <Circle cx={40} cy={26} r={3} fill={night ? "#FFE7BE" : D.brass} opacity={night ? 0.9 : 1} />
          <Circle cx={60} cy={17} r={2} fill={night ? "#FFE7BE" : D.brass} opacity={night ? 0.9 : 1} />
        </>
      )}
    </Svg>
  );
}

/* the one geometry: window, sun, desk, head, hair, body, arm, page */
function Figure({ stroke, fill, pane, skin, body, hair, paper, sunFill }: { stroke: string; fill: string; pane?: string; skin?: string; body?: string; hair?: string; paper?: string; sunFill: string | null }) {
  return (
    <>
      <Rect x={192} y={14} width={122} height={70} rx={3} fill={pane ?? fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M253 14V84M192 49H314" stroke={stroke} strokeWidth={1.16} />
      {/* the pencil rung has no sun yet — it arrives with the sketch */}
      {sunFill !== null && <Circle cx={288} cy={32} r={10} fill={sunFill} stroke={sunFill === "none" ? stroke : "none"} strokeWidth={1.7} />}
      <Path d="M24 96H334" stroke={stroke} strokeWidth={2.55} strokeLinecap="round" />
      <Circle cx={108} cy={42} r={18} fill={skin ?? fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M90 46q18 -25 36 0" fill={hair ?? (fill === "none" ? "none" : stroke)} stroke={stroke} strokeWidth={1.7} />
      <Path d="M75 96q6 -36 33 -36q27 0 33 36" fill={body ?? fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M127 74q21 4 33 15" fill="none" stroke={stroke} strokeWidth={2.72} strokeLinecap="round" />
      <Rect x={152} y={83} width={52} height={13} fill={paper ?? fill} stroke={stroke} strokeWidth={1.7} />
      <Path d="M160 88h28M160 92h19" stroke={stroke} strokeWidth={1.16} />
    </>
  );
}
