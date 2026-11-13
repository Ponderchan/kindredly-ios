import { useEffect, useMemo, type ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useLoop, useOnce, type Reel } from "../guide-reel/kit";
import { WrenBird, type WrenMood } from "../WrenBird";
import { Frost } from "../Frost";
import { GUIDE_REEL_WIDTHS, Stamp, snapStampWidth } from "../Stamp";
import { PFM, letterFitSize } from "../../theme/post";
import { THEMES } from "../../theme/themes";
import { getStamp, sname } from "../../data/stamps";
import { frostSpec } from "../../lib/frost";
import { strangerName } from "../../lib/stranger-name";
import { useLetterFamily, useLetterFont } from "../../lib/theme";
import { clockTime, localeTag } from "../../lib/format";
import { getLang, t } from "../../lib/i18n";
import "../../data/strings-news-1-0-9";
import "../../data/strings-after"; // af.bed.* (her bedtime lines and the three keys)
import "../../data/strings-today3d"; // ld.next, ld.replyBtn

/* WHAT'S NEW IN 1.0.9, AS ONE NIGHT (owner, 2026-11-13: "做的有创意一点 类似创意广告的思维做 别
   总是流水线似的" — not the 1.0.5 way of a caption over a demo, seven times).
   ────────────────────────────────────────────────────────────────────────
   Two creative pitches and a judge (workflow wf_4c57a4fc-99c) settled on "Lights Out": nothing
   on a phone ever ends, and 1.0.9 runs out on purpose. One unbroken night in five beats:
     1. just one more — a home screen at 11:47 pm, the new icon the only colour on it, a guilty
        thumb; the app opens on the desk: the ninth letter, a tally of eight.
     2. that's ten — Next: the tenth letter is someone who finally said no; Next again, and the
        thumb taps empty paper twice. Nothing comes. She hops in: "that's 10. i'm wrecked."
     3. tuck her in — her bedtime page, as Today draws it after a desk finished after 8 pm: the
        opened envelope, Snack (seeds, three pecks), Pat ("mm. right there."), then Lights out.
     4. lights out — the night blooms behind her only (the reel stays a light picture), she falls
        asleep ("see you at 8."), and the view pulls back to her planet, a stamp for every letter
        she carried; at 3:04 am its lamps come on, one by one: each is someone your letter reached.
     5. new icon — dawn runs the night through peach to the icon's yellow, the planet sets, the
        disc squares off into the tile, she rises into her peek and the tile drops back into its
        slot on the home screen at 7:59 am: "new icon." / "it's me. checking if it's 8 yet."
   Only true things: bedtime is the page a desk finished after 8 pm gets (lib/after-fifteen-core);
   ten a day (lib/ration DAY_LETTERS); her planet's stamps and lamps (docs/courier-planet.md),
   which never turns by itself; the icon is a picture and never moves once it is the icon.
   Only Next is ever pressed, so her pat line is the no-replies one (af.bed.say.pat.0).

   ONE NIGHT ACROSS FIVE REMOUNTS. ReelSquare mounts each scene fresh; this reel asks for `cut`
   (no cross-fade), so every beat's first frame is drawn from the same constants as the previous
   beat's last one (the clock, the desk, her spot, the disc, the tile) and the swap can't be
   seen; beat 5 ends on beat 1's first frame, with a later clock, so the loop is the day turning.

   React Native only: it is not in the Swift player's table (guide-reel/swift-reel-data), so the
   Swift room shows it as an island and it can reach binary 1.2.8 over the air. The card that
   holds it (news-reel/index) is offered only while the planet and the end-of-day pages are on.
   Everything is drawn at the square's own size `s`; a reel is a light picture in every theme,
   so its colours are fixed, never the theme's. */

const RM = ReduceMotion.System;
const E_OUT = Easing.out(Easing.cubic);
const E_IN = Easing.in(Easing.quad);
const E_INOUT = Easing.inOut(Easing.cubic);
const E_POP = Easing.out(Easing.back(1.6));
const E_PEEK = Easing.out(Easing.back(1.25));
const LINEAR = Easing.linear;

/* the reel's own fixed inks (a light picture in every theme) */
const L = THEMES.classic;
const INK = L.ink;
const SUB = L.sub;
const GROUND = "#F2F1F6"; // the wallpaper and the desk: one paper, so the app opens onto it
const HAIR = "rgba(30,27,53,0.13)";
const TILE_A = "#E3E1EA";
const TILE_B = "#D9D7E3";
const TILE_LABEL = "#DAD8E3";
const PENCIL = "#6B6684";
const ICON_YELLOW = "#FFD453"; // the icon's tile (design/app-icon-wren): change with the icon
const DAWN = "#FBE3D6"; // her sky's morning (courier-card-model PALETTE.morning)
const NIGHT_TOP = "#24305E"; // the bedtime page's night, a little deeper at the top
const NIGHT_LOW = "#46558F";
const LAMP = "#FFD98A"; // the planet's lamps (KCourierCardMetrics.lamp)
const MOON = "#FFF3D6";
const SEAL = "#D9A12B"; // the envelope's seal on the bedtime page

const clamp01 = (x: number) => {
  "worklet";
  return Math.min(1, Math.max(0, x));
};

/* ── where things are, in fractions of the square ──────────────────── */

const CLOCK = { x: 0.06, y: 0.058, size: 0.036 };
const TILE = 0.15;
const COLS = [0.17, 0.39, 0.61, 0.83];
const ROWS = [0.2, 0.385, 0.57];
const ICON = { cx: COLS[1], cy: ROWS[2] }; // column 2, row 3
const ICON_R = 0.225; // an iOS icon's corner, of its side
const CARD = { x: 0.12, y: 0.2, w: 0.76, h: 0.42 };
const PILL = { cy: 0.735, w: 0.33, h: 0.1, reply: 0.305, next: 0.695 };
const TALLY = { x: 0.065, y: 0.87, h: 0.05 };
const WREN = { cx: 0.5, top: 0.29, size: 0.36 }; // her feet: top + 0.865 × size = 0.60
const FEET = WREN.top + 0.865 * WREN.size;
const ENV = { x: 0.25, y: FEET - 0.005, w: 0.5, h: 0.2, apex: 0.47 };
const BED = { y: 0.835, h: 0.12, w: 0.27, gap: 0.03 };
const DISC_A = { cx: 0.5, cy: 0.45, d: 0.7 }; // as the night blooms behind her
const DISC_B = { cx: 0.5, cy: 0.4, d: 0.62 }; // pulled back to her planet
const DISC_K = DISC_B.d / DISC_A.d;
/* inside the disc, in fractions of its diameter (the same whichever size it is drawn at) */
const PLANET = { cx: 0.5, cy: 0.585, d: 0.6 };
const TINY = 0.18; // her, asleep on top of it

/* the clock across the night: real times, in the reader's own clock */
function at(h: number, m: number): string {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return clockTime(d, { locale: localeTag() });
}

/* her lines come quoted on the page (“that’s 10. i’m wrecked.”); in a bubble the quotes go */
const unquote = (x: string) => x.replace(/^[\s“”"«»„‟「『‘’']+|[\s“”"«»„‟」』‘’']+$/g, "");

/* ── small shared pieces ───────────────────────────────────────────── */

/* shown from `from` until `to` (ms), faded: from ≤ 0 is there at once, no `to` stays */
function Shown({ from, to, ms = 180, style, children, pop = false }: { from: number; to?: number; ms?: number; style?: StyleProp<ViewStyle>; children?: ReactNode; pop?: boolean }) {
  const on = useOnce(pop ? 360 : ms, Math.max(0, from), pop ? E_POP : E_OUT);
  const off = useOnce(ms, to ?? 0);
  const first = from <= 0;
  const last = to == null;
  const st = useAnimatedStyle(() => {
    const v = first ? 1 : on.value;
    return {
      opacity: Math.min(1, first ? 1 : on.value * 1.4) - (last ? 0 : off.value),
      transform: pop ? [{ scale: 0.6 + 0.4 * Math.min(1.08, v) }] : [],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[style, st]}>
      {children}
    </Animated.View>
  );
}

/* the reel's clock, top left under the scene bars (SF Mono, as the app's labels): one time, or
   the next one cross-fading in at its moment */
function Clock({ s, times }: { s: number; times: readonly { text: string; at: number }[] }) {
  return (
    <>
      {times.map((c, i) => (
        <Shown key={i} from={c.at} to={times[i + 1]?.at} ms={220} style={{ position: "absolute", left: s * CLOCK.x, top: s * CLOCK.y }}>
          <Text numberOfLines={1} style={{ ...PFM.monoSemi, fontSize: s * CLOCK.size, letterSpacing: 0.4, color: SUB }}>
            {c.text}
          </Text>
        </Shown>
      ))}
    </>
  );
}

/* THE HAND. One finger through a beat: it slides in to its first spot, travels between spots
   (arriving at each `t`), presses at `presses`, can rub (the pat) and slides out at `leave`.
   Driven by one clock over the scene, so a scene can tap more than once with one thumb. */
const HAND_D = "M13 4c2.2 0 4 1.8 4 4v13l2-.4c1.6-.3 3.1.7 3.5 2.3l.1.4 1.6-.3c1.7-.3 3.3.8 3.6 2.5l1.7-.2c1.8-.2 3.4 1.1 3.6 2.9L35 38c.8 6.6-4.4 11-11 11h-3.4c-3.4 0-6.6-1.6-8.6-4.4L5 35.4c-1-1.4-.7-3.4.7-4.4 1.3-.9 3.1-.8 4.2.4L9 30V8c0-2.2 1.8-4 4-4Z";
type Spot = { x: number; y: number; t: number };
function Hand({ s, total, spots, presses = [], rubs = [], leave }: { s: number; total: number; spots: readonly Spot[]; presses?: readonly number[]; rubs?: readonly { at: number; ms: number; n: number; dx: number }[]; leave: number }) {
  const size = s * 0.13;
  const clk = useOnce(total, 0, LINEAR);
  const pts = spots.map((p) => ({ x: p.x * s, y: p.y * s, t: p.t }));
  const rubList = rubs.map((r) => ({ at: r.at, ms: r.ms, n: r.n, dx: r.dx * s }));
  const pressList = [...presses];
  const COME = 460;
  const MOVE = 380;
  const st = useAnimatedStyle(() => {
    const ms = clk.value * total;
    let x = pts[0].x;
    let y = pts[0].y;
    let a = 1;
    if (ms < pts[0].t) {
      const p = clamp01((ms - (pts[0].t - COME)) / COME);
      const e = 1 - Math.pow(1 - p, 3);
      x = pts[0].x + (1 - e) * s * 0.28;
      y = pts[0].y + (1 - e) * s * 0.34;
      a = p;
    } else {
      for (let i = 1; i < pts.length; i++) {
        if (ms >= pts[i].t - MOVE) {
          const p = clamp01((ms - (pts[i].t - MOVE)) / MOVE);
          const e = p * p * (3 - 2 * p);
          x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * e;
          y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * e;
        }
      }
    }
    for (let i = 0; i < rubList.length; i++) {
      const r = rubList[i];
      if (ms >= r.at && ms <= r.at + r.ms) x += Math.sin(((ms - r.at) / r.ms) * Math.PI * 2 * r.n) * r.dx;
    }
    if (ms > leave) {
      const p = clamp01((ms - leave) / 300);
      x += p * s * 0.2;
      y += p * s * 0.26;
      a = 1 - p;
    }
    let press = 0;
    for (let i = 0; i < pressList.length; i++) {
      const d = ms - pressList[i];
      if (d >= 0 && d < 120) press = d / 120;
      else if (d >= 120 && d < 340) press = Math.max(press, 1 - (d - 120) / 220);
    }
    return { opacity: a, transform: [{ translateX: x - size * 0.3 }, { translateY: y - size * 0.12 }, { scale: 1 - 0.12 * press }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, st]}>
      <Svg width={size} height={size * 1.25} viewBox="0 0 40 50">
        <Path d={HAND_D} fill="#F1C9A5" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

/* a tap on nothing: a thin ring grows and goes, and nothing answers (a plain view, scaled: no
   animated SVG props, which moved their whole drawing about on the simulator) */
function Ring({ s, x, y, at: when }: { s: number; x: number; y: number; at: number }) {
  const v = useOnce(340, when, E_OUT);
  const R = s * 0.07;
  const st = useAnimatedStyle(() => ({ opacity: v.value > 0 ? 0.55 * (1 - v.value) : 0, transform: [{ scale: 0.05 + 0.95 * v.value }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x * s - R, top: y * s - R, width: R * 2, height: R * 2, borderRadius: R, borderWidth: 1.2, borderColor: INK }, st]} />;
}

/* her speech: a flat white bubble on a hairline, a tail toward her (or the icon) */
function Bubble({ s, left, top, width, tailX, tailUp = false, text, size = 0.05, pad = 0.022, align = "center" }: { s: number; left: number; top: number; width?: number; tailX?: number; tailUp?: boolean; text: string; size?: number; pad?: number; align?: "center" | "left" }) {
  const tw = s * 0.05;
  const th = s * 0.03;
  return (
    <View style={{ position: "absolute", left: s * left, top: s * top, width: width != null ? s * width : undefined, maxWidth: s * (0.94 - left) }}>
      <View style={{ backgroundColor: "#FFFFFF", borderRadius: s * 0.045, borderWidth: 1, borderColor: HAIR, paddingHorizontal: s * 0.04, paddingVertical: s * pad, alignSelf: align === "center" ? "center" : "flex-start" }}>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: s * size, lineHeight: s * size * 1.25, fontWeight: "500", color: INK, textAlign: align }}>
          {text}
        </Text>
      </View>
      {tailX != null && (
        <Svg width={tw} height={th + 2} style={{ position: "absolute", left: s * tailX - s * left - tw / 2, ...(tailUp ? { top: -th + 1 } : { bottom: -th + 1 }), transform: tailUp ? [{ scaleY: -1 }] : [] }}>
          <Path d={`M0 1 L${tw / 2} ${th} L${tw} 1 Z`} fill="#FFFFFF" />
          <Path d={`M0 1 L${tw / 2} ${th} L${tw} 1`} fill="none" stroke={HAIR} strokeWidth={1} />
        </Svg>
      )}
    </View>
  );
}

/* ── the icon (design/app-icon-wren/out/svg/icon-light.svg, as vectors) ── */

function IconArt({ size, tile = true, bird = true }: { size: number; tile?: boolean; bird?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {tile && <Rect width={200} height={200} fill={ICON_YELLOW} />}
      {bird && (
        <G transform="translate(-72 -32) scale(1.5)">
          <Path d="M40.5,110C40.5,68 72,40 110.5,40C142,40 159.5,64.5 159.5,92.5C163,127.5 142,159 100,159C65,159 40.5,141.5 40.5,110Z" fill="#5757EC" />
          <Path d="M59.5,132a37,25 0 1,0 74,0a37,25 0 1,0 -74,0" fill="#F6E7C9" />
          <Circle cx={89} cy={75} r={10.4} fill="#1E1B33" />
          <Circle cx={92.2} cy={71.6} r={3} fill="#FFFFFF" />
          <Circle cx={126} cy={69} r={11.4} fill="#1E1B33" />
          <Circle cx={129.4} cy={65.4} r={3.3} fill="#FFFFFF" />
          <Path d="M128,85L161,94.5L128,104Z" fill="#F2A0B5" stroke="#F2A0B5" strokeWidth={10} strokeLinejoin="round" />
        </G>
      )}
    </Svg>
  );
}

/* the icon in its slot on the home screen: a picture, still, clipped to the icon's corners */
function IconTile({ s }: { s: number }) {
  const w = s * TILE;
  return (
    <View style={{ position: "absolute", left: s * ICON.cx - w / 2, top: s * ICON.cy - w / 2, width: w, height: w, borderRadius: w * ICON_R, overflow: "hidden" }}>
      <IconArt size={w} />
    </View>
  );
}

/* THE HOME SCREEN: blank tiles in two pale greys with a grey bar for a name, so the yellow tile
   is the only colour; the slot that is hers has her name instead. `appear`: the tiles come in
   one after another from that moment (dawn, beat 5); otherwise they are there. */
function HomeGrid({ s, appear, label = 0 }: { s: number; appear?: number; label?: number }) {
  const w = s * TILE;
  const tiles: ReactNode[] = [];
  let n = 0;
  ROWS.forEach((cy, r) =>
    COLS.forEach((cx, c) => {
      if (cx === ICON.cx && cy === ICON.cy) return;
      const k = n++;
      tiles.push(
        <Shown key={`${r}-${c}`} from={appear != null ? appear + k * 30 : 0} ms={240} style={{ position: "absolute", left: s * cx - w / 2, top: s * cy - w / 2, width: w, alignItems: "center" }}>
          <View style={{ width: w, height: w, borderRadius: w * ICON_R, backgroundColor: (r + c) % 2 ? TILE_B : TILE_A }} />
          <View style={{ marginTop: s * 0.016, width: w * (0.48 + ((r * 3 + c) % 3) * 0.1), height: s * 0.014, borderRadius: s * 0.007, backgroundColor: TILE_LABEL }} />
        </Shown>,
      );
    }),
  );
  return (
    <>
      {tiles}
      <Shown from={label} ms={240} style={{ position: "absolute", left: s * ICON.cx - w, top: s * ICON.cy + w / 2 + s * 0.008, width: w * 2, alignItems: "center" }}>
        <Text numberOfLines={1} style={{ fontSize: s * 0.031, fontWeight: "500", color: INK }}>
          Kindredly
        </Text>
      </Shown>
    </>
  );
}

/* ── the desk ──────────────────────────────────────────────────────── */

const NINE = { seed: "news-105-9288", stamp: "cant-sleep", line: "nw109.card9" }; // Sunday Kite, in English
const TEN = { seed: "news-109-11", stamp: "tiny-win", line: "nw109.card10" };
const NINE_FROST = frostSpec(NINE.seed);
const TEN_FROST = frostSpec(TEN.seed);

/* a letter on the desk, as Today deals it: their frosted window and the name your courier gave
   them, the opening line in your letter font, the topic and the stamp. Flat: a white sheet on a
   hairline, no shadow, no edge colour (owner, 2026-11-12). */
function LetterCard({ s, who }: { s: number; who: typeof NINE }) {
  const face = useLetterFamily();
  const size = letterFitSize(useLetterFont(), s * 0.056);
  const spec = who === NINE ? NINE_FROST : TEN_FROST;
  const stamp = getStamp(who.stamp);
  const name = strangerName(who.seed, { lang: getLang(), unsigned: t("ld.unsigned") });
  const tag = stamp ? `#${sname(stamp.name).toLocaleLowerCase(localeTag())}` : "";
  const sw = snapStampWidth(s * 0.1, GUIDE_REEL_WIDTHS);
  const pad = s * 0.045;
  const win = s * 0.085;
  return (
    <View style={{ width: s * CARD.w, height: s * CARD.h, backgroundColor: "#FFFFFF", borderRadius: s * 0.06, borderWidth: 1, borderColor: HAIR }}>
      <View style={{ position: "absolute", left: pad, top: pad, right: pad + sw + s * 0.02, flexDirection: "row", alignItems: "center", gap: s * 0.025 }}>
        {spec ? <Frost spec={spec} size={win} /> : <View style={{ width: win, height: win }} />}
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flexShrink: 1, fontSize: s * 0.04, fontWeight: "600", color: INK }}>
          {name}
        </Text>
      </View>
      <View style={{ position: "absolute", right: pad, top: pad }}>
        <Stamp id={who.stamp} width={sw} />
      </View>
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={{ position: "absolute", left: pad, right: pad, top: pad + win + s * 0.04, ...face, fontSize: size, lineHeight: size * 1.3, color: INK }}>
        {t(who.line)}
      </Text>
      {!!tag && (
        <View style={{ position: "absolute", left: pad, bottom: pad, borderRadius: s * 0.05, backgroundColor: stamp?.color ?? "#B9B5D0", paddingHorizontal: s * 0.028, paddingVertical: s * 0.011 }}>
          <Text numberOfLines={1} style={{ ...PFM.monoSemi, fontSize: s * 0.028, color: INK }}>
            {tag}
          </Text>
        </View>
      )}
    </View>
  );
}

/* Reply and Next under the letter */
function Pills({ s }: { s: number }) {
  const one = (cx: number, label: string, ink: boolean) => (
    <View style={{ position: "absolute", left: s * (cx - PILL.w / 2), top: s * (PILL.cy - PILL.h / 2), width: s * PILL.w, height: s * PILL.h, borderRadius: s * PILL.h, alignItems: "center", justifyContent: "center", backgroundColor: ink ? INK : "#FFFFFF", borderWidth: ink ? 0 : 1, borderColor: HAIR }}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...PFM.monoSemi, fontSize: s * 0.034, letterSpacing: 1.2, color: ink ? "#FFFFFF" : INK }}>
        {label}
      </Text>
    </View>
  );
  return (
    <>
      {one(PILL.reply, t("ld.replyBtn"), false)}
      {one(PILL.next, t("ld.next"), true)}
    </>
  );
}

/* THE TALLY, in pencil at the desk's foot: a five-bar gate for most of the world, the stroke
   order of 正 in Japanese and Korean (two of them make ten). Strokes 1…`have` are there; the
   ones in `draw` are drawn in at their moment, as if by a pencil: each in a box that opens the
   way the pencil moves (down, or across), so nothing in the SVG itself is animated. */
type Stroke = { d: string; dir: "down" | "across" };
function tallyStrokes(h: number, cjk: boolean): Stroke[] {
  const out: Stroke[] = [];
  if (cjk) {
    for (let g = 0; g < 2; g++) {
      const x = g * h * 1.25;
      const c = x + h * 0.5;
      out.push({ d: `M${x + h * 0.08} ${h * 0.1}L${x + h * 0.92} ${h * 0.08}`, dir: "across" });
      out.push({ d: `M${c} ${h * 0.1}L${c + h * 0.01} ${h * 0.94}`, dir: "down" });
      out.push({ d: `M${c} ${h * 0.5}L${x + h * 0.8} ${h * 0.49}`, dir: "across" });
      out.push({ d: `M${x + h * 0.24} ${h * 0.46}L${x + h * 0.25} ${h * 0.94}`, dir: "down" });
      out.push({ d: `M${x + h * 0.04} ${h * 0.95}L${x + h * 0.96} ${h * 0.93}`, dir: "across" });
    }
    return out;
  }
  for (let g = 0; g < 2; g++) {
    const x = g * h * 1.1;
    for (let i = 0; i < 4; i++) {
      const bx = x + h * 0.12 + i * h * 0.2;
      out.push({ d: `M${bx} ${h * 0.06}L${bx + h * 0.03} ${h * 0.94}`, dir: "down" });
    }
    out.push({ d: `M${x - h * 0.02} ${h * 0.78}L${x + h * 0.86} ${h * 0.2}`, dir: "across" });
  }
  return out;
}

const TALLY_W = 2.6; // of its height
function PencilIn({ w, h, stroke, when }: { w: number; h: number; stroke: Stroke; when: number }) {
  const v = useOnce(250, when, LINEAR);
  const down = stroke.dir === "down";
  const st = useAnimatedStyle(() => (down ? { height: (h + 2) * v.value, opacity: v.value > 0 ? 1 : 0 } : { width: w * v.value, opacity: v.value > 0 ? 1 : 0 }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: w, height: h + 2, overflow: "hidden" }, st]}>
      <Svg width={w} height={h + 2}>
        <Path d={stroke.d} fill="none" stroke={PENCIL} strokeWidth={down ? 1.6 : 2} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function Tally({ s, have, draw = [] }: { s: number; have: number; draw?: readonly { k: number; at: number }[] }) {
  const h = s * TALLY.h;
  const w = h * TALLY_W;
  const cjk = getLang() === "ja" || getLang() === "ko";
  const strokes = useMemo(() => tallyStrokes(h, cjk), [h, cjk]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: s * TALLY.x, top: s * TALLY.y, width: w, height: h + 2 }}>
      <Svg width={w} height={h + 2}>
        {strokes.slice(0, have).map((st, i) => (
          <Path key={i} d={st.d} fill="none" stroke={PENCIL} strokeWidth={st.dir === "down" ? 1.6 : 2} strokeLinecap="round" />
        ))}
      </Svg>
      {draw.map((d) => (strokes[d.k - 1] ? <PencilIn key={d.k} w={w} h={h} stroke={strokes[d.k - 1]} when={d.at} /> : null))}
    </View>
  );
}

/* a letter going past: off to the left with a small turn, as Next sends it */
function Flick({ at: when, children }: { at: number; children: ReactNode }) {
  const v = useOnce(300, when, E_IN);
  const st = useAnimatedStyle(() => ({ opacity: 1 - v.value, transform: [{ translateX: -v.value * 260 }, { rotate: `${-6 * v.value}deg` }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/* the next letter coming on from the right */
function DealIn({ at: when, children }: { at: number; children: ReactNode }) {
  const v = useOnce(400, when, E_OUT);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateX: (1 - v.value) * 220 }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/* ── her, and her bed ──────────────────────────────────────────────── */

/* her at her spot on the desk: the moods stacked and cross-faded, turned about her feet for a
   peck or a lean */
function Her({ s, moods, turn }: { s: number; moods: readonly { mood: WrenMood; from: number; to?: number }[]; turn?: SharedValue<number> }) {
  const size = s * WREN.size;
  const zero = useSharedValue(0);
  const r = turn ?? zero;
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: s * WREN.cx - size / 2, top: s * WREN.top, width: size, height: size, transformOrigin: ["50%", "86.5%", 0] }, st]}>
      {moods.map((m, i) => (
        <Shown key={i} from={m.from} to={m.to} ms={160} style={{ position: "absolute", left: 0, top: 0 }}>
          <WrenBird size={size} mood={m.mood} stage="wren" skin="sticker" accessory="none" />
        </Shown>
      ))}
    </Animated.View>
  );
}

/* the opened envelope she sleeps in (the bedtime page's): the flap folded back behind her, the
   front with its folds, the gold seal */
function Envelope({ s }: { s: number }) {
  const x = s * ENV.x, y = s * ENV.y, w = s * ENV.w, h = s * ENV.h;
  const top = s * ENV.apex;
  return (
    <Svg pointerEvents="none" width={s} height={s} style={{ position: "absolute", left: 0, top: 0 }}>
      <Path d={`M${x} ${y}L${x + w / 2} ${top}L${x + w} ${y}Z`} fill="#ECEBF6" stroke={HAIR} strokeWidth={1} strokeLinejoin="round" />
      <Rect x={x} y={y} width={w} height={h} rx={s * 0.012} fill="#FFFFFF" stroke={HAIR} strokeWidth={1} />
      <Path d={`M${x + 1} ${y + 1}L${x + w / 2} ${y + h * 0.62}L${x + w - 1} ${y + 1}M${x + 1} ${y + h - 1}L${x + w * 0.4} ${y + h * 0.5}M${x + w - 1} ${y + h - 1}L${x + w * 0.6} ${y + h * 0.5}`} fill="none" stroke={HAIR} strokeWidth={1} />
      <Circle cx={x + w / 2} cy={y + h * 0.66} r={s * 0.014} fill={SEAL} />
    </Svg>
  );
}

/* the bedtime page's three keys, in their own colours: Snack (butter, a bowl of seeds), Pat
   (pink, a heart), Lights out (blue, the moon; grey until the first two are done) */
type BedKey = "snack" | "pat" | "lights";
const BED_LOOK: Record<BedKey, { fill: string; tick: string; icon: string }> = {
  snack: { fill: "#F7E6BF", tick: "#B07A1A", icon: "#A0712A" },
  pat: { fill: "#F6CAD6", tick: "#B8325A", icon: "#C43C66" },
  lights: { fill: "#CFE2F6", tick: "#2F5A9E", icon: "#2F4A86" },
};
function BedIcon({ k, size, color }: { k: BedKey; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {k === "snack" && (
        <>
          <Path d="M3.5 12.5h17c0 4.4-3.8 7.5-8.5 7.5s-8.5-3.1-8.5-7.5Z" fill={color} />
          <Circle cx={9} cy={10} r={1.5} fill={color} />
          <Circle cx={12.5} cy={8.5} r={1.5} fill={color} />
          <Circle cx={15.5} cy={10.3} r={1.5} fill={color} />
        </>
      )}
      {k === "pat" && <Path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.4-7.5 10-7.5 10Z" fill={color} />}
      {k === "lights" && <Path d="M15.5 3.8A8.3 8.3 0 1 0 20.2 15 6.6 6.6 0 0 1 15.5 3.8Z" fill={color} />}
    </Svg>
  );
}

function BedKeys({ s, done, unlock, from = 0 }: { s: number; done: Partial<Record<BedKey, number>>; unlock: number; from?: number }) {
  const keys: BedKey[] = ["snack", "pat", "lights"];
  const x0 = (1 - (3 * BED.w + 2 * BED.gap)) / 2;
  const label: Record<BedKey, string> = { snack: t("af.bed.snack"), pat: t("af.bed.pat"), lights: t("af.bed.lights") };
  return (
    <>
      {keys.map((k, i) => {
        const look = BED_LOOK[k];
        const locked = k === "lights";
        return (
          <Shown key={k} from={from + i * 70} ms={260} style={{ position: "absolute", left: s * (x0 + i * (BED.w + BED.gap)), top: s * BED.y, width: s * BED.w, height: s * BED.h }}>
            {/* Lights out stands grey until the first two are done (as on the page), then takes its blue */}
            {locked && unlock > 0 && (
              <Shown from={0} to={unlock} ms={220} style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
                <BedKeyFace s={s} k={k} fill="#EEEDF2" ink="rgba(30,27,53,0.38)" iconInk="rgba(47,74,134,0.35)" label={label[k]} />
              </Shown>
            )}
            <Shown from={locked ? unlock : 0} ms={220} style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
              <BedKeyFace s={s} k={k} fill={look.fill} ink={INK} iconInk={look.icon} label={label[k]} />
            </Shown>
            {done[k] != null && (
              <Shown from={done[k] as number} pop style={{ position: "absolute", left: s * 0.012, top: s * 0.012 }}>
                <Svg width={s * 0.04} height={s * 0.04} viewBox="0 0 24 24">
                  <Circle cx={12} cy={12} r={12} fill={look.tick} />
                  <Path d="M6.5 12.5l3.6 3.6L17.5 8.6" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Shown>
            )}
          </Shown>
        );
      })}
    </>
  );
}

function BedKeyFace({ s, k, fill, ink, iconInk, label }: { s: number; k: BedKey; fill: string; ink: string; iconInk: string; label: string }) {
  return (
    <View style={{ flex: 1, borderRadius: s * 0.04, backgroundColor: fill, alignItems: "center", justifyContent: "center", gap: s * 0.008, paddingHorizontal: s * 0.012 }}>
      <BedIcon k={k} size={s * 0.05} color={iconInk} />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: s * 0.036, fontWeight: "600", color: ink }}>
        {label}
      </Text>
    </View>
  );
}

/* three seeds dropped onto the envelope's lip, one gone with each peck */
function Seed({ s, i, drop, eat }: { s: number; i: number; drop: number; eat: number }) {
  const f = useOnce(380, drop + i * 90, E_IN);
  const gone = useOnce(70, eat);
  const x0 = s * (0.7 + i * 0.03), y0 = s * 0.36;
  const x1 = s * (0.585 + i * 0.03), y1 = s * (ENV.y - 0.012);
  const st = useAnimatedStyle(() => ({
    opacity: f.value > 0 ? 1 - gone.value : 0,
    transform: [{ translateX: x0 + (x1 - x0) * f.value }, { translateY: y0 + (y1 - y0) * f.value }, { rotate: `${i * 40 + 200 * f.value}deg` }],
  }));
  const w = s * 0.018;
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -w / 2, top: -w * 0.35, width: w, height: w * 0.7, borderRadius: w, backgroundColor: "#B88A4A" }, st]} />;
}

/* ── the night and her planet ──────────────────────────────────────── */

const STARS = [
  [0.2, 0.42, 0.012],
  [0.8, 0.26, 0.01],
  [0.74, 0.5, 0.008],
  [0.32, 0.16, 0.008],
  [0.88, 0.62, 0.009],
] as const;

/* the night's sky inside the disc: its gradient, the moon and a few stars (fractions of its side).
   Drawn a little past the disc on every side: drawn exactly at its size, the SVG came out a point
   or two short of the clip on the right and at the foot, which flattened the circle there. */
const BLEED = 4;
function NightSky({ d }: { d: number }) {
  const mx = d * 0.27 + BLEED, my = d * 0.27 + BLEED, mr = d * 0.055;
  const D = d + BLEED * 2;
  return (
    <Svg width={D} height={D} style={{ position: "absolute", left: -BLEED, top: -BLEED }}>
      <Defs>
        <LinearGradient id="n109" x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor={NIGHT_TOP} />
          <Stop offset={1} stopColor={NIGHT_LOW} />
        </LinearGradient>
      </Defs>
      <Rect width={D} height={D} fill="url(#n109)" />
      <Path d={`M${mx} ${my - mr}A${mr} ${mr} 0 1 0 ${mx} ${my + mr}A${mr * 0.78} ${mr} 0 1 1 ${mx} ${my - mr}Z`} fill={MOON} />
      {STARS.map(([x, y, r], i) => (
        <Circle key={i} cx={x * d + BLEED} cy={y * d + BLEED} r={r * d} fill="#FFFFFF" opacity={0.8} />
      ))}
    </Svg>
  );
}

/* HER PLANET, flat: sea, three lands, trees on the rim, seven stamps stuck on, and a lamp beside
   each stamp for the stranger that letter reached (lit after dark, pale by day). It never turns
   by itself (docs/courier-planet.md). Drawn in a 100 box at `d`. */
const LANDS = [
  "M14 34C20 20 38 15 47 23C55 30 49 41 38 42C28 43 22 50 15 46C10 43 11 39 14 34Z",
  "M58 54C66 47 82 49 87 59C91 68 84 78 74 80C66 81 63 74 58 70C53 66 53 58 58 54Z",
  "M22 70C28 66 38 69 40 76C42 83 34 90 26 87C19 85 17 74 22 70Z",
];
const TREES = [
  [50, 1.5],
  [93, 26],
  [97, 58],
  [6, 62],
  [72, 95],
  [24, 92],
] as const;
const PLANET_STAMPS = [
  { x: 30, y: 30, r: -14, c: "#3C87EF" },
  { x: 62, y: 22, r: 10, c: "#FDE669" },
  { x: 76, y: 44, r: -8, c: "#F8779E" },
  { x: 48, y: 52, r: 6, c: "#4CD78C" },
  { x: 22, y: 58, r: 12, c: "#A790F3" },
  { x: 66, y: 72, r: -10, c: "#FB765A" },
  { x: 40, y: 78, r: 4, c: "#71C8F6" },
] as const;
const LAMPS = PLANET_STAMPS.map((p, i) => ({ x: p.x + (i % 2 ? -8 : 8), y: p.y + (i % 3 === 0 ? 7 : -6) }));

function PlanetArt({ d, night }: { d: number; night: boolean }) {
  const sea = night ? "#1D3A66" : "#6FB6E8";
  const land = night ? "#2F5A4E" : "#9CD48C";
  const tree = night ? "#173A30" : "#3F8F52";
  return (
    <Svg width={d} height={d} viewBox="-4 -4 108 108" style={{ position: "absolute", left: 0, top: 0 }}>
      <Circle cx={50} cy={50} r={50} fill={sea} />
      {LANDS.map((p, i) => (
        <Path key={i} d={p} fill={land} />
      ))}
      {TREES.map(([x, y], i) => (
        <G key={i}>
          <Circle cx={x - 2.4} cy={y + 0.6} r={2.8} fill={tree} />
          <Circle cx={x + 2.4} cy={y + 0.6} r={2.8} fill={tree} />
          <Circle cx={x} cy={y - 1.6} r={3.1} fill={tree} />
        </G>
      ))}
      {PLANET_STAMPS.map((p, i) => (
        <G key={i} transform={`rotate(${p.r} ${p.x} ${p.y})`}>
          <Rect x={p.x - 5} y={p.y - 6} width={10} height={12} rx={1} fill="#FFFFFF" />
          <Rect x={p.x - 3.6} y={p.y - 4.6} width={7.2} height={9.2} rx={0.6} fill={p.c} />
        </G>
      ))}
    </Svg>
  );
}

/* one lamp: a warm dot and a flat quarter-strength disc round it (no blur), popped on at `on`,
   paled by day from `pale` */
function Lamp({ d, x, y, on, pale }: { d: number; x: number; y: number; on: number; pale?: number }) {
  const v = useOnce(220, on, E_POP);
  const p = useOnce(500, pale ?? 0);
  const fades = pale != null;
  const lit = on <= 0;
  const st = useAnimatedStyle(() => {
    const a = lit ? 1 : v.value;
    return { opacity: Math.min(1, a * 1.5) * (fades ? 1 - 0.6 * p.value : 1), transform: [{ scale: lit ? 1 : 0.3 + 0.7 * a }] };
  });
  const k = d / 108;
  const R = 5.2 * k;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: (x + 4) * k - R, top: (y + 4) * k - R, width: R * 2, height: R * 2 }, st]}>
      <Svg width={R * 2} height={R * 2}>
        <Circle cx={R} cy={R} r={R} fill={LAMP} opacity={0.25} />
        <Circle cx={R} cy={R} r={R * 0.42} fill={LAMP} />
      </Svg>
    </Animated.View>
  );
}

/* her planet in the disc, with her asleep on top, breathing; `lampsAt` lights them in turn (null:
   all lit already); `dayFrom` pales it into day */
function Planet({ D, lampsAt, dayFrom }: { D: number; lampsAt: number | null; dayFrom?: number }) {
  const d = D * PLANET.d;
  const tiny = D * TINY;
  const breathe = useLoop(1600);
  const day = useOnce(700, dayFrom ?? 0);
  const toDay = dayFrom != null;
  const dayStyle = useAnimatedStyle(() => ({ opacity: toDay ? day.value : 0 }));
  const sleep = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 + 0.03 * breathe.value }] }));
  return (
    <View style={{ width: d, height: d + tiny }}>
      <View style={{ position: "absolute", left: 0, top: tiny * 0.82, width: d, height: d }}>
        <PlanetArt d={d} night />
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: d, height: d }, dayStyle]}>
          <PlanetArt d={d} night={false} />
        </Animated.View>
        {LAMPS.map((p, i) => (
          <Lamp key={i} d={d} x={p.x} y={p.y} on={lampsAt == null ? 0 : lampsAt + i * 170} pale={dayFrom} />
        ))}
      </View>
      <Animated.View style={[{ position: "absolute", left: d / 2 - tiny / 2, top: 0, width: tiny, height: tiny, transformOrigin: ["50%", "86.5%", 0] }, sleep]}>
        <WrenBird size={tiny} mood="sleepy" stage="wren" skin="sticker" accessory="none" />
      </Animated.View>
    </View>
  );
}

/* ── 1 · just one more ─────────────────────────────────────────────── */

const B1 = { hand: 1500, tap: 2150, open: 2250, desk: 2700, total: 3800 };

function JustOneMore({ s }: { s: number }) {
  const open = useOnce(450, B1.open, E_OUT);
  const w0 = s * TILE;
  const x0 = s * ICON.cx - w0 / 2, y0 = s * ICON.cy - w0 / 2;
  // the app opening out of its icon: a plain yellow tile grows to the square and fades as it
  // goes, onto the desk's paper (mixing the two colours went through a muddy beige); the icon's
  // picture is never scaled: it fades as the tile starts
  const grow = useAnimatedStyle(() => {
    const v = open.value;
    return {
      opacity: v > 0 && v < 1 ? Math.min(1, 1.6 * (1 - v)) : 0,
      left: x0 * (1 - v),
      top: y0 * (1 - v),
      width: w0 + (s - w0) * v,
      height: w0 + (s - w0) * v,
      borderRadius: w0 * ICON_R * (1 - v),
      backgroundColor: ICON_YELLOW,
    };
  });
  return (
    <View style={{ width: s, height: s }}>
      <Shown from={0} to={B1.open} ms={200} style={{ position: "absolute", left: 0, top: 0, width: s, height: s }}>
        <HomeGrid s={s} />
      </Shown>
      <Shown from={0} to={B1.open} ms={120} style={{ position: "absolute", left: 0, top: 0, width: s, height: s }}>
        <IconTile s={s} />
      </Shown>
      <Animated.View pointerEvents="none" style={[{ position: "absolute" }, grow]} />

      <Shown from={200} to={B1.open} ms={260} style={{ position: "absolute", left: s * 0.06, right: s * 0.06, top: s * 0.79 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ textAlign: "center", fontSize: s * 0.082, fontWeight: "700", letterSpacing: -0.5, color: INK }}>
          {t("nw109.oneMore")}
        </Text>
      </Shown>

      {/* the desk it opens on: 11:48, the ninth letter, a tally of eight */}
      <Shown from={B1.desk - 50} ms={240} style={{ position: "absolute", left: 0, top: 0, width: s, height: s }}>
        <Tally s={s} have={8} />
      </Shown>
      <Shown from={B1.desk} ms={300} style={{ position: "absolute", left: s * CARD.x, top: s * CARD.y }}>
        <DealIn at={B1.desk}>
          <LetterCard s={s} who={NINE} />
        </DealIn>
      </Shown>
      <Shown from={B1.desk + 150} ms={260} style={{ position: "absolute", left: 0, top: 0, width: s, height: s }}>
        <Pills s={s} />
      </Shown>

      <Clock s={s} times={[{ text: at(23, 47), at: 0 }, { text: at(23, 48), at: B1.desk }]} />
      <Hand s={s} total={B1.total} spots={[{ x: ICON.cx, y: ICON.cy + 0.01, t: B1.hand }]} presses={[B1.tap]} rubs={[{ at: B1.hand + 60, ms: 520, n: 1, dx: 0.006 }]} leave={B1.open + 40} />
    </View>
  );
}

/* ── 2 · that's ten ────────────────────────────────────────────────── */

const B2 = { next1: 600, ten: 900, next2: 2600, empty1: 3100, empty2: 3450, leave: 3650, hop: 3700, say: 4300, total: 6000 };

function ThatsTen({ s }: { s: number }) {
  const centre = { x: 0.5, y: CARD.y + CARD.h / 2 };
  const hop = useOnce(520, B2.hop, LINEAR);
  const hopSt = useAnimatedStyle(() => ({
    opacity: hop.value > 0 ? 1 : 0,
    transform: [{ translateX: (1 - hop.value) * s * 0.62 }, { translateY: -Math.abs(Math.sin(hop.value * Math.PI * 2)) * s * 0.075 }],
  }));
  return (
    <View style={{ width: s, height: s }}>
      <Shown from={0} to={B2.hop + 200} ms={300} style={{ position: "absolute", left: 0, top: 0, width: s, height: s }}>
        <Tally s={s} have={8} draw={[{ k: 9, at: B2.next1 + 50 }, { k: 10, at: B2.next2 + 80 }]} />
      </Shown>
      <View style={{ position: "absolute", left: s * CARD.x, top: s * CARD.y }}>
        <Flick at={B2.next1 + 40}>
          <LetterCard s={s} who={NINE} />
        </Flick>
      </View>
      <View style={{ position: "absolute", left: s * CARD.x, top: s * CARD.y }}>
        <DealIn at={B2.ten}>
          <Flick at={B2.next2 + 40}>
            <LetterCard s={s} who={TEN} />
          </Flick>
        </DealIn>
      </View>
      <Shown from={0} to={B2.next2 + 300} ms={160} style={{ position: "absolute", left: 0, top: 0, width: s, height: s }}>
        <Pills s={s} />
      </Shown>

      {/* nothing comes: two taps on the empty paper, then her */}
      <Ring s={s} x={centre.x} y={centre.y} at={B2.empty1} />
      <Ring s={s} x={centre.x} y={centre.y} at={B2.empty2} />
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, hopSt]}>
        <Her s={s} moods={[{ mood: "content", from: 0 }]} />
      </Animated.View>
      <Shown from={B2.say} pop style={{ position: "absolute", left: 0, top: 0, width: s, height: s, transformOrigin: [s * 0.52, s * 0.25, 0] }}>
        <Bubble s={s} left={0.1} top={0.12} width={0.8} tailX={0.52} text={unquote(t("af.bed.say.idle.N", { n: 10 }))} />
      </Shown>

      <Clock s={s} times={[{ text: at(23, 48), at: 0 }]} />
      <Hand
        s={s}
        total={B2.total}
        spots={[
          { x: PILL.next, y: PILL.cy, t: B2.next1 - 100 },
          { x: centre.x, y: centre.y, t: B2.empty1 - 60 },
        ]}
        presses={[B2.next1, B2.next2, B2.empty1, B2.empty2]}
        leave={B2.leave}
      />
    </View>
  );
}

/* ── 3 · tuck her in ───────────────────────────────────────────────── */

const B3 = { envelope: 300, keys: 600, snack: 1200, seeds: 1300, pecks: 1720, fed: 2250, pat: 2850, rub: 3000, patted: 3600, say: 3700, sayOff: 5500, unlock: 5000, lights: 5900, total: 6500 };

function usePecks(when: number, n: number, deg: number): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    const seq: number[] = [];
    for (let i = 0; i < n; i++) seq.push(withTiming(deg, { duration: 70, reduceMotion: RM }), withTiming(0, { duration: 90, reduceMotion: RM }));
    v.value = withDelay(when, withSequence(...seq));
  }, [v, when, n, deg]);
  return v;
}

function TuckHerIn({ s }: { s: number }) {
  const peck = usePecks(B3.pecks, 3, 13);
  const leanIn = useOnce(260, B3.rub, E_OUT);
  const leanOut = useOnce(320, B3.patted + 500, E_OUT);
  const turn = useDerivedValue(() => peck.value + 4 * (leanIn.value - leanOut.value));
  const env = useOnce(500, B3.envelope, E_OUT);
  const envSt = useAnimatedStyle(() => ({ opacity: env.value, transform: [{ translateY: (1 - env.value) * s * 0.1 }] }));
  const keyX = (i: number) => (1 - (3 * BED.w + 2 * BED.gap)) / 2 + i * (BED.w + BED.gap) + BED.w / 2;
  const keyY = BED.y + BED.h / 2;
  const head = { x: WREN.cx + 0.03, y: WREN.top + 0.085 };
  return (
    <View style={{ width: s, height: s }}>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, envSt]}>
        <Envelope s={s} />
      </Animated.View>
      <Her
        s={s}
        turn={turn}
        moods={[
          { mood: "content", from: 0 },
          { mood: "happy", from: B3.rub + 60, to: B3.patted + 600 },
        ]}
      />
      {[0, 1, 2].map((i) => (
        <Seed key={i} s={s} i={i} drop={B3.seeds} eat={B3.pecks + 70 + i * 160} />
      ))}
      <Shown from={0} to={B3.envelope} ms={200} style={{ position: "absolute", left: 0, top: 0, width: s, height: s }}>
        <Bubble s={s} left={0.1} top={0.12} width={0.8} tailX={0.52} text={unquote(t("af.bed.say.idle.N", { n: 10 }))} />
      </Shown>
      <Shown from={B3.say} to={B3.sayOff} pop style={{ position: "absolute", left: 0, top: 0, width: s, height: s, transformOrigin: [s * 0.36, s * 0.24, 0] }}>
        <Bubble s={s} left={0.07} top={0.13} tailX={0.36} align="left" text={unquote(t("af.bed.say.pat.0"))} />
      </Shown>
      <BedKeys s={s} from={B3.keys} done={{ snack: B3.fed, pat: B3.patted }} unlock={B3.unlock} />

      <Clock s={s} times={[{ text: at(23, 48), at: 0 }]} />
      <Hand
        s={s}
        total={B3.total}
        spots={[
          { x: keyX(0), y: keyY, t: B3.snack - 80 },
          { x: head.x, y: head.y, t: B3.rub },
        ]}
        presses={[B3.snack]}
        rubs={[{ at: B3.rub, ms: 560, n: 2, dx: 0.03 }]}
        leave={B3.patted}
      />
      <Hand s={s} total={B3.total} spots={[{ x: keyX(2), y: keyY, t: B3.lights - 80 }]} presses={[B3.lights]} leave={B3.lights + 260} />
    </View>
  );
}

/* ── 4 · lights out ────────────────────────────────────────────────── */

const B4 = { keysOff: 0, bloom: 200, asleep: 950, say: 1000, sayOff: 2700, pull: 2800, clock: 3000, lamps: 3600, caption: 4000, total: 6600 };

/* the disc at DISC_A's size, placed by its centre; drawn at `base` and scaled */
function discBox(s: number, disc: { cx: number; cy: number; d: number }) {
  const D = s * disc.d;
  return { left: s * disc.cx - D / 2, top: s * disc.cy - D / 2, width: D, height: D, D };
}

function LightsOut({ s }: { s: number }) {
  const A = discBox(s, DISC_A);
  const bloom = useOnce(700, B4.bloom, E_OUT);
  const pull = useOnce(700, B4.pull, E_INOUT);
  const disc = useAnimatedStyle(() => ({
    transform: [{ translateX: 0 }, { translateY: -pull.value * s * (DISC_A.cy - DISC_B.cy) }, { scale: (0.03 + 0.97 * bloom.value) * (1 - pull.value * (1 - DISC_K)) }],
  }));
  const bed = useAnimatedStyle(() => ({ opacity: 1 - pull.value, transform: [{ translateY: -pull.value * s * 0.02 }, { scale: 1 - 0.75 * pull.value }] }));
  const keys = useOnce(220, B4.keysOff, E_IN);
  const keysSt = useAnimatedStyle(() => ({ opacity: 1 - keys.value, transform: [{ translateY: keys.value * s * 0.035 }] }));
  const rise = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - pull.value) * A.D * 1.05 }] }));
  const P = PLANET.d * A.D;
  return (
    <View style={{ width: s, height: s }}>
      {/* the night, only inside the disc: the paper round it stays light in every theme */}
      <Animated.View style={[{ position: "absolute", left: A.left, top: A.top, width: A.width, height: A.height, borderRadius: A.D / 2, overflow: "hidden" }, disc]}>
        <NightSky d={A.D} />
        <Animated.View style={[{ position: "absolute", left: A.D * PLANET.cx - P / 2, top: A.D * PLANET.cy - P / 2 - A.D * TINY * 0.82 }, rise]}>
          <Planet D={A.D} lampsAt={B4.lamps} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: s, height: s, transformOrigin: [s * DISC_A.cx, s * DISC_A.cy, 0] }, bed]}>
        <Envelope s={s} />
        <Her
          s={s}
          moods={[
            { mood: "content", from: 0, to: B4.asleep },
            { mood: "sleepy", from: B4.asleep },
          ]}
        />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, keysSt]}>
        <BedKeys s={s} done={{ snack: 0, pat: 0 }} unlock={0} />
      </Animated.View>

      <Shown from={B4.say} to={B4.sayOff} pop style={{ position: "absolute", left: 0, top: 0, width: s, height: s, transformOrigin: [s * 0.5, s * 0.83, 0] }}>
        <Bubble s={s} left={0.2} top={0.845} width={0.6} tailX={0.5} tailUp text={t("nw109.seeYou")} />
      </Shown>
      <Shown from={B4.caption} ms={300} style={{ position: "absolute", left: s * 0.07, right: s * 0.07, top: s * (DISC_B.cy + DISC_B.d / 2 + 0.035) }}>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={{ textAlign: "center", fontSize: s * 0.058, lineHeight: s * 0.07, fontWeight: "700", letterSpacing: -0.3, color: INK }}>
          {t("nw109.lights")}
        </Text>
      </Shown>

      <Clock s={s} times={[{ text: at(23, 48), at: 0 }, { text: at(3, 4), at: B4.clock }]} />
    </View>
  );
}

/* ── 5 · new icon ──────────────────────────────────────────────────── */

const B5 = { captionOff: 0, dawn: 300, sun: 900, clock: 900, set: 1000, square: 1500, peek: 1700, home: 2400, label: 3100, swap: 3150, say1: 3400, say2: 4300, total: 6200 };

function NewIcon({ s }: { s: number }) {
  const B = discBox(s, DISC_B);
  const dawn = useOnce(700, B5.dawn, E_OUT);
  const sun = useOnce(600, B5.sun);
  const set = useOnce(600, B5.set, E_IN);
  const square = useOnce(700, B5.square, E_INOUT);
  const peek = useOnce(520, B5.peek, E_PEEK);
  const home = useOnce(800, B5.home, E_INOUT);
  const kBig = 0.5 / DISC_B.d;
  const kIcon = TILE / DISC_B.d;
  const dx = s * (ICON.cx - DISC_B.cx);
  const dy = s * (ICON.cy - DISC_B.cy);
  const tile = useAnimatedStyle(() => {
    const k = 1 + (kBig - 1) * square.value + (kIcon - kBig) * home.value;
    return {
      borderRadius: B.D / 2 + (B.D * ICON_R - B.D / 2) * square.value,
      transform: [{ translateX: dx * home.value }, { translateY: dy * home.value }, { scale: k }],
    };
  });
  // morning comes up from the bottom of the disc, a band of her dawn sky rising through the night
  // (a cross-fade of navy and peach went through grey), then the sun's yellow over it
  const dawnSt = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - dawn.value) * B.D * 1.02 - dawn.value * B.D * 0.33 }] }));
  const sunSt = useAnimatedStyle(() => ({ opacity: sun.value }));
  const setSt = useAnimatedStyle(() => ({ transform: [{ translateY: set.value * B.D * 0.85 }] }));
  const peekSt = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - peek.value) * B.D * 0.8 }], opacity: peek.value > 0 ? 1 : 0 }));
  const P = PLANET.d * B.D;
  return (
    <View style={{ width: s, height: s }}>
      <HomeGrid s={s} appear={B5.home + 100} label={B5.label} />

      {/* the night turns to morning, the planet sets, the disc squares off into her tile and she
          rises into her peek; then the tile drops into its slot */}
      <Animated.View style={[{ position: "absolute", left: B.left, top: B.top, width: B.width, height: B.height, overflow: "hidden" }, tile]}>
        <NightSky d={B.D} />
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: B.D, height: B.D * 1.4 }, dawnSt]}>
          <Svg width={B.D} height={B.D * 1.4}>
            <Defs>
              <LinearGradient id="d109" x1="0" y1="0" x2="0" y2="1">
                <Stop offset={0} stopColor={DAWN} stopOpacity={0} />
                <Stop offset={0.22} stopColor={DAWN} />
                <Stop offset={1} stopColor="#FFD9A8" />
              </LinearGradient>
            </Defs>
            <Rect width={B.D} height={B.D * 1.4} fill="url(#d109)" />
          </Svg>
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: B.D, height: B.D, backgroundColor: ICON_YELLOW }, sunSt]} />
        <Animated.View style={[{ position: "absolute", left: B.D * PLANET.cx - P / 2, top: B.D * PLANET.cy - P / 2 - B.D * TINY * 0.82 }, setSt]}>
          <Planet D={B.D} lampsAt={null} dayFrom={B5.dawn} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, peekSt]}>
          <IconArt size={B.D} tile={false} />
        </Animated.View>
      </Animated.View>
      {/* settled in its slot it is the icon itself, drawn at its own size */}
      <Shown from={B5.swap} ms={120} style={{ position: "absolute", left: 0, top: 0, width: s, height: s }}>
        <IconTile s={s} />
      </Shown>

      <Shown from={0} to={B5.captionOff + 300} ms={300} style={{ position: "absolute", left: s * 0.07, right: s * 0.07, top: s * (DISC_B.cy + DISC_B.d / 2 + 0.035) }}>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={{ textAlign: "center", fontSize: s * 0.058, lineHeight: s * 0.07, fontWeight: "700", letterSpacing: -0.3, color: INK }}>
          {t("nw109.lights")}
        </Text>
      </Shown>

      {/* two of her messages under the icon, one after the other */}
      <Shown from={B5.say1} pop style={{ position: "absolute", left: 0, top: 0, width: s, height: s, transformOrigin: [s * ICON.cx, s * 0.71, 0] }}>
        <Bubble s={s} left={0.07} top={0.718} tailX={ICON.cx} tailUp align="left" size={0.046} pad={0.02} text={t("nw109.icon1")} />
      </Shown>
      <Shown from={B5.say2} pop style={{ position: "absolute", left: 0, top: 0, width: s, height: s, transformOrigin: [s * 0.12, s * 0.84, 0] }}>
        <Bubble s={s} left={0.07} top={0.832} width={0.86} align="left" size={0.042} pad={0.018} text={t("nw109.icon2")} />
      </Shown>

      <Clock s={s} times={[{ text: at(3, 4), at: 0 }, { text: at(7, 59), at: B5.clock }]} />
    </View>
  );
}

export const reel: Reel = {
  bg: GROUND,
  cut: true,
  scenes: [
    { key: "one-more", ms: B1.total, render: (s) => <JustOneMore s={s} /> },
    { key: "ten", ms: B2.total, render: (s) => <ThatsTen s={s} /> },
    { key: "tuck-in", ms: B3.total, render: (s) => <TuckHerIn s={s} /> },
    { key: "lights-out", ms: B4.total, render: (s) => <LightsOut s={s} /> },
    { key: "new-icon", ms: B5.total, render: (s) => <NewIcon s={s} /> },
  ],
};
