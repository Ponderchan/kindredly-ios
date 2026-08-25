import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { P, PF } from "../theme/post";
import { hashStr } from "../lib/format";
import type { ThreadSummary } from "../lib/db";
import type { Souvenir } from "../lib/whereabouts";
import type { Whereabouts } from "../lib/whereabouts";

/* THE SKY — see lib/sky.ts for why the axes are what they are.
   ────────────────────────────────────────────────────────────────────────
   X is one day, midnight to midnight, with the night shaded at both ends
   and a live NOW line. Y is closeness: the more someone has written to
   you, the lower their window hangs — your own house sits on the ground
   at the hour you keep.

   The only bird in the air is yours, and she is on the leg her real
   status says she is on: outbound to the door she is knocking at,
   inbound with something that is genuinely waiting for you.

   Keepsakes hang as stars, placed by their own id, so a long
   correspondence life slowly fills a sky nobody else has. */

const H = 264;
const PAD_X = 16;
const GROUND = 30; // where your house stands
const FOG = 42; // the band for people whose hours you don't know yet

const NIGHT = "#171532";
const DUSK = "#2A2554";
const DAY = "#4A4384";

export function SkyMap({
  threads,
  hours,
  myHour,
  state,
  keepsakes,
  wren,
  onOpen,
}: {
  threads: ThreadSummary[];
  hours: Record<string, number>;
  myHour: number | null;
  state: Whereabouts | "dozing";
  keepsakes: Souvenir[];
  wren: string;
  onOpen: (t: ThreadSummary) => void;
}) {
  const [w, setW] = useState(0);
  const fly = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fly.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fly, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(fly, { toValue: 0, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fly, state]);

  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const inner = Math.max(0, w - PAD_X * 2);
  const x = (h: number) => PAD_X + (h / 24) * inner;

  /* closeness: their letters pull them down toward your ground */
  const y = (theirs: number) => {
    const near = Math.min(1, theirs / 6);
    const floor = H - GROUND - 24; // as close as anyone gets
    const ceil = FOG + 26; // just under the fog
    return floor - near * (floor - ceil);
  };

  const placed = threads
    .filter((t) => hours[t.other] != null)
    .map((t) => ({ t, hx: x(hours[t.other]!), hy: y(t.theirs) }));

  /* SOMEONE YOU HAVEN'T HEARD FROM KEEPS NO HOURS YET. They don't vanish
     from the sky — they wait in the fog at the top, where you can see that
     someone is out there without pretending to know when they wake. */
  const fogged = threads
    .filter((t) => hours[t.other] == null)
    .map((t, i) => ({ t, hx: PAD_X + ((hashStr("fog:" + t.id) % 1000) / 1000) * inner, hy: 16 + (i % 2) * 13 }));

  const home = { x: x(myHour ?? nowH), y: H - GROUND };

  /* the leg she is on right now, if any */
  const flying =
    state === "delivery"
      ? [...threads].filter((t) => t.lastSenderMe && t.mine > 0).sort((a, b) => b.lastAt - a.lastAt)[0]
      : state === "bringing"
        ? [...threads].filter((t) => !t.lastSenderMe && t.theirs > 0).sort((a, b) => b.lastAt - a.lastAt)[0]
        : null;
  const target = flying ? placed.find((p) => p.t.id === flying.id) : null;

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ borderWidth: 1, borderColor: P.ink }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          <Defs>
            <LinearGradient id="sky" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={NIGHT} />
              <Stop offset="0.25" stopColor={DUSK} />
              <Stop offset="0.5" stopColor={DAY} />
              <Stop offset="0.75" stopColor={DUSK} />
              <Stop offset="1" stopColor={NIGHT} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={w} height={H} fill="url(#sky)" />

          {/* stars: your keepsakes, hung where their own ids put them */}
          {keepsakes.slice(0, 10).map((k) => {
            const h1 = hashStr("sky:" + k.id);
            const sx = PAD_X + ((h1 % 1000) / 1000) * inner;
            const sy = 18 + (((h1 >> 10) % 1000) / 1000) * (H - GROUND - 90);
            return <Circle key={k.id} cx={sx} cy={sy} r={1.6} fill="#FFF6D8" opacity={0.75} />;
          })}

          {/* the hours */}
          {[0, 6, 12, 18, 24].map((h) => (
            <G key={h}>
              <Line x1={x(h)} y1={H - GROUND} x2={x(h)} y2={H - GROUND + 5} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
              <SvgText x={x(h)} y={H - GROUND + 16} fill="rgba(255,255,255,0.45)" fontSize={8} fontFamily={PF.mono} textAnchor="middle">
                {h === 24 ? "24" : String(h).padStart(2, "0")}
              </SvgText>
            </G>
          ))}
          {/* the ground you write from */}
          <Line x1={0} y1={H - GROUND} x2={w} y2={H - GROUND} stroke="rgba(255,255,255,0.28)" strokeWidth={1} />

          {/* NOW — the terminator, where the day actually is */}
          <Line x1={x(nowH)} y1={6} x2={x(nowH)} y2={H - GROUND} stroke="#8F87F5" strokeWidth={1.2} strokeDasharray="3,4" />
          <SvgText x={x(nowH)} y={14} fill="#B8B2FF" fontSize={8} fontFamily={PF.mono} textAnchor="middle">
            NOW
          </SvgText>

          {/* the leg she is flying */}
          {target && (
            <Path
              d={`M ${home.x} ${home.y - 12} Q ${(home.x + target.hx) / 2} ${Math.min(home.y, target.hy) - 46} ${target.hx} ${target.hy}`}
              stroke={state === "bringing" ? "#F0A050" : "#8F87F5"}
              strokeWidth={1.3}
              strokeDasharray="4,5"
              fill="none"
              opacity={0.85}
            />
          )}

          {/* the fog: out there, hour unknown */}
          <Rect x={0} y={0} width={w} height={FOG} fill="#0E0C22" opacity={0.45} />
          {fogged.map((f) => (
            <G key={f.t.id}>
              <Rect x={f.hx - 5} y={f.hy - 5} width={10} height={10} fill="rgba(255,255,255,0.13)" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
            </G>
          ))}

          {/* their windows */}
          {placed.map((p) => (
            <G key={p.t.id}>
              <Rect
                x={p.hx - 7}
                y={p.hy - 7}
                width={14}
                height={14}
                fill={p.t.revealed ? "#FFD98A" : "rgba(255,255,255,0.22)"}
                stroke={p.t.revealed ? "#FFE7B0" : "rgba(255,255,255,0.4)"}
                strokeWidth={1}
              />
              <Line x1={p.hx} y1={p.hy - 7} x2={p.hx} y2={p.hy + 7} stroke={NIGHT} strokeWidth={1} opacity={0.5} />
              <Line x1={p.hx - 7} y1={p.hy} x2={p.hx + 7} y2={p.hy} stroke={NIGHT} strokeWidth={1} opacity={0.5} />
            </G>
          ))}

          {/* your house */}
          <G>
            <Path d={`M ${home.x - 11} ${home.y} L ${home.x - 11} ${home.y - 9} L ${home.x} ${home.y - 17} L ${home.x + 11} ${home.y - 9} L ${home.x + 11} ${home.y} Z`} fill="#F8F4E7" />
            <Rect x={home.x - 3} y={home.y - 8} width={6} height={8} fill="#F0A050" />
          </G>
        </Svg>
      )}

      {/* she rides the leg — an Animated view over the svg, since her art is a component */}
      {w > 0 && target && (
        <Animated.View
          style={{
            position: "absolute",
            left: (state === "bringing" ? target.hx : home.x) - 13,
            top: (state === "bringing" ? target.hy : home.y - 22) - 13,
            transform: [
              {
                translateX: fly.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, (state === "bringing" ? home.x - target.hx : target.hx - home.x) * 0.72],
                }),
              },
              {
                translateY: fly.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, (state === "bringing" ? home.y - 22 - target.hy : target.hy - (home.y - 22)) * 0.72 - 14],
                }),
              },
            ],
          }}
        >
          <WrenDot />
        </Animated.View>
      )}

      {/* the windows are tappable — the svg can't hold a press, so hit
          targets ride above it */}
      {[...placed, ...fogged].map((p) => (
        <Pressable
          key={p.t.id}
          onPress={() => onOpen(p.t)}
          style={{ position: "absolute", left: p.hx - 16, top: p.hy - 16, width: 32, height: 32 }}
        />
      ))}

      {/* the one sentence the sky is for */}
      <View style={{ backgroundColor: P.ink, paddingHorizontal: 12, paddingVertical: 8 }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.78)" }}>
          {placed.length === 0 && fogged.length === 0
            ? "AN EMPTY SKY"
            : placed.length === 0
              ? `${fogged.length} IN THE FOG · NO HOURS KNOWN YET`
              : `${placed.length} ${placed.length === 1 ? "WINDOW" : "WINDOWS"} · THEY KEEP THEIR OWN HOURS${fogged.length ? ` · ${fogged.length} IN FOG` : ""}`}
        </Text>
      </View>
    </View>
  );
}

/* her, small enough to be a bird at altitude */
function WrenDot() {
  return (
    <Svg width={26} height={26} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={6.5} fill="#6D6DF6" />
      <Path d="M19 13 L25 9 L23 14 Z" fill="#4B4BD8" />
      <Circle cx={11} cy={12} r={1.4} fill="#12101F" />
      <Path d="M6.5 13.5 L2.5 12 L6 15.5 Z" fill="#8F8CFF" />
    </Svg>
  );
}
