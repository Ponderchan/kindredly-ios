import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Stop } from "react-native-svg";
import { Y } from "../theme/y2k";

/* THE SHELL YOU PICK BEFORE YOU WRITE — and the one thing about her you get
   to choose. What's inside is decided by what you write; the shell only
   leaves a BIRTHMARK. Each shell carries a mark colour, drawn on the egg's
   crown and then on the hatchling's forehead, so the choice made on the
   egg screen is still visible on the bird a week later instead of vanishing
   the moment she's named (W39). */

export interface Shell {
  id: string;
  name: string;
  base: string; // the lit face
  mid: string; // the shadow side
  deep: string; // speckles
  mark: string; // the birthmark
  /** @deprecated alias of `deep`, kept for older call sites */
  speck: string;
}

const shell = (id: string, name: string, base: string, mid: string, deep: string, mark: string): Shell => ({ id, name, base, mid, deep, mark, speck: deep });

/* "Sage" rather than the sheet's MOSS: the courier already has a skin called
   Moss, and a shell and a skin sharing a name would read as the same thing */
export const EGG_SHELLS: Shell[] = [
  shell("moonstone", "Moonstone", "#E6E9F6", "#D2D7EC", "#B8BFDC", "#7C86B8"),
  shell("sage", "Sage", "#DCE8DC", "#C6D9C6", "#A8C2A8", "#4F8C5C"),
  shell("dusk", "Dusk", "#EADFEE", "#D6C6DC", "#BCA8C4", "#8A6AA0"),
  shell("clay", "Clay", "#F7E4DA", "#EACCBE", "#D6ADA0", "#C8705A"),
];

/* the egg's outline, centred on its own origin: 148 wide, 192 tall. The
   hatch splits this exact polygon along CRACK into six shards, so the
   pieces that fly are the shell that was drawn. */
export const RIM = "0,-96 26,-92 48,-76 64,-50 72,-20 74,6 68,38 52,68 30,88 0,96 -30,88 -52,68 -68,38 -74,6 -72,-20 -64,-50 -48,-76 -26,-92";
export const EGG_W = 148;
export const EGG_H = 192;

/* the birthmark: a small leaf on the crown */
export const MARK_D = "M-10 -60 q10 -8 20 0 q-4 10 -10 10 q-6 0 -10 -10z";

/** the shell's light, as a gradient any Svg can paint with — the hatch draws
    the flying shards from it, in a layer of its own */
export function ShellGradient({ shell: s, gid }: { shell: Shell; gid: string }) {
  return (
    <Defs>
      {/* user-space, not bounding-box: RN-SVG paints a bounding-box gradient as a hard edge */}
      <LinearGradient id={gid} gradientUnits="userSpaceOnUse" x1={-40} y1={-96} x2={50} y2={96}>
        <Stop offset={0} stopColor="#FFFFFF" />
        <Stop offset={0.46} stopColor={s.base} />
        <Stop offset={1} stopColor={s.mid} />
      </LinearGradient>
    </Defs>
  );
}

/** the shell drawn at the origin — shared by the picker, the dock and the hatch.
    `gid` keeps the gradient id unique when several eggs share one Svg. */
export function EggBody({ shell: s, gid, children, strokeWidth = 2.4 }: { shell: Shell; gid: string; children?: React.ReactNode; strokeWidth?: number }) {
  return (
    <G>
      <ShellGradient shell={s} gid={gid} />
      <Polygon points={RIM} fill={`url(#${gid})`} stroke={Y.ink} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <G opacity={0.55}>
        <Circle cx={-30} cy={-44} r={4.6} fill={s.deep} />
        <Circle cx={26} cy={-20} r={3.4} fill={s.deep} />
        <Circle cx={-14} cy={30} r={3} fill={s.deep} />
        <Circle cx={38} cy={44} r={4} fill={s.deep} />
      </G>
      <Path d={MARK_D} fill={s.mark} opacity={0.7} />
      {children}
    </G>
  );
}

/** the egg on its own, with a ground shadow — sized so the egg fills the box */
export function EggShell({ variant = 0, size = 120, shadow = true }: { variant?: number; size?: number; shadow?: boolean }) {
  const s = EGG_SHELLS[variant] ?? EGG_SHELLS[0];
  return (
    <Svg width={size} height={size} viewBox="-110 -110 220 220">
      {shadow && <Ellipse cx={0} cy={100} rx={62} ry={8} fill={Y.ink} opacity={0.1} />}
      <G transform="scale(0.98)">
        <EggBody shell={s} gid={`egg-${s.id}`} />
      </G>
    </Svg>
  );
}
