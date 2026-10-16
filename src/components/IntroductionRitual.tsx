import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, FadeIn, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { MONO, PF } from "../theme/post";
import { BRAND } from "../theme/themes";
import { useP, useTheme } from "../lib/theme";
import { AvatarImage } from "./AvatarImage";
import { COLS, MosaicId, inkedCells } from "./MosaicId";
import { WrenGlyph } from "./GlyphInput";
import { StickerChip } from "./AuraCard";
import { StampTile } from "./StampTile";
import { WrenBird } from "./WrenBird";
import { t } from "../lib/i18n";
import { dShort } from "../lib/format";
import { hashStr } from "../lib/format";
import { stickerLook } from "../lib/sticker-copy";
import type { ThreadMessage } from "../lib/db";
import type { KindredNotice } from "../lib/kindred-read";

/* THE RITUAL — a sticker book, not a ceremony.
   ────────────────────────────────────────────────────────────────────────
   ① THE ROAD. Ten envelopes, the five each way that bought this, stamped
      one after another with the day they really left.
   ② BURST. Their mosaic blows apart — its own squares scatter and fall
      like paper — and a big sticker slaps down on top of them: candy
      colour, white cut edge, a tilt, squashed flat and back.
   ③ TYPED. The name is typed onto the sticker by •>, in big caps; the
      sticker jolts once when the last letter lands.
   ④ BUMP. Your face slides in from the left, theirs from the right; they
      bump, overlap a little, bounce apart — and are faces, not mosaics,
      from the bump on. A small chip underneath says since when.
   ⑤ ONE MORE STICKER. What she noticed — the label you both wear — is a
      real sticker label with a ×2 corner, slapped under the two of you.

   WHAT FOLLOWS THE THEME. The road is drawn in the page's own inks: the
   ground line, the windows' frames and the envelopes' edges in the outline
   colour (ln), the envelopes' faces on the card face (sf), the names and
   counts in ink. The stickers keep their own colours in every theme — the
   white cut edge, the kindred green, the green since-chip, the ink ×2
   corner, the white ring round each face — because a sticker is an object
   with its own print, not chrome. So does the lit window's warm pane.

   10a (step 5): those print colours are the brand's own (themes.json
   brand: paperWhite, inkOnBrand, greenText), not literals; the kindred
   green sticker and the window's pane are this object's alone. The mono
   labels sit on the 9/10/11 sizes (the envelope's own tiny postmark is
   drawing, not a label). */

const T_ROAD = 380;
const T_STEP = 240; // one letter crosses every 240 ms; the last lands before the burst
const T_FLY = 620; // how long one crossing takes
const T_BURST = T_ROAD + 10 * T_STEP + T_FLY + 300;
const T_SLAP = T_BURST + 520;
const T_NAME = T_SLAP + 520;
const T_BUMP = T_NAME + 1500;
const T_NOTICE = T_BUMP + 1100;
export const T_RITUAL_DONE = T_NOTICE + 700;

const ease = { out: Easing.out(Easing.cubic), back: Easing.out(Easing.back(2)), sine: Easing.inOut(Easing.sin) };

export function IntroductionRitual({
  road,
  otherSeed,
  otherFace,
  otherName,
  mySeed,
  myFace,
  myName,
  since,
  stamp,
  notice,
}: {
  road: ThreadMessage[];
  otherSeed: string;
  otherFace?: string | null;
  otherName: string;
  mySeed: string;
  myFace?: string | null;
  myName: string;
  /** the day the names met */
  since: string;
  /** the stamp the correspondence opened under — the envelopes wear it */
  stamp?: string | null;
  notice?: KindredNotice | null;
}) {
  // the big sticker is the kindred green — the mark of names traded; the
  // label underneath keeps its own dimension ink, so the two never match
  // by accident and the name is never in the label's colour
  const bg = "#7CC58F";
  const fg = BRAND.inkOnBrand;
  const chipLook = notice ? stickerLook(notice.stickerId, 1) : null;
  const P = useP();

  return (
    <View style={{ alignItems: "center" }}>
      {/* ① the road — a flight, not a list: your window on the left, theirs
          on the right, and every letter that bought this crosses between
          them in the order it left, the courier carrying it, the day
          stamped as it lands. The count ticks up on the far side. */}
      <Flight road={road} stamp={stamp} />

      {/* ② burst + slap, ③ the name typed on */}
      <View style={{ width: 300, height: 150, alignItems: "center", justifyContent: "center", marginTop: 14 }}>
        <Burst seed={otherSeed} at={T_BURST} />
        <Slapped at={T_SLAP} tilt={-3}>
          <View style={{ backgroundColor: BRAND.paperWhite, padding: 4, borderRadius: 14, shadowColor: BRAND.inkOnBrand, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 8 } }}>
            <View style={{ backgroundColor: bg, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12, minWidth: 150, alignItems: "center" }}>
              <TypedName name={otherName.toUpperCase()} at={T_NAME} color={fg} />
            </View>
          </View>
        </Slapped>
      </View>

      {/* ④ the bump */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 84, marginTop: 4, width: 300 }}>
        <Bumper side={-1} seed={mySeed} face={myFace ?? null} at={T_BUMP} />
        <Bumper side={1} seed={otherSeed} face={otherFace ?? null} at={T_BUMP} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, width: 300 }}>
        <Animated.Text entering={FadeIn.duration(300).delay(T_BUMP + 700)} numberOfLines={1} style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 13, color: P.ink, maxWidth: 120 }}>{myName}</Animated.Text>
        <Slapped at={T_BUMP + 600} tilt={2} small>
          <View style={{ backgroundColor: BRAND.paperWhite, borderRadius: 999, borderWidth: 1.5, borderColor: BRAND.greenText, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.small, letterSpacing: 1.4, color: BRAND.greenText }}>{t("in.sinceChip", { date: dShort(since).toUpperCase() })}</Text>
          </View>
        </Slapped>
        <Animated.Text entering={FadeIn.duration(300).delay(T_BUMP + 700)} numberOfLines={1} style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 13, color: P.ink, maxWidth: 120 }}>{otherName}</Animated.Text>
      </View>

      {/* ⑤ one more sticker: what she noticed, if a label showed */}
      {notice && chipLook && (
        <View style={{ marginTop: 18, alignItems: "center" }}>
          <Slapped at={T_NOTICE} tilt={notice.shared ? -2 : 2}>
            <View>
              <StickerChip id={notice.stickerId} i={1} size="lg" />
              {notice.shared && (
                <View style={{ position: "absolute", top: -9, right: -12, backgroundColor: BRAND.inkOnBrand, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: BRAND.paperWhite }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.small, color: BRAND.paperWhite }}>×2</Text>
                </View>
              )}
            </View>
          </Slapped>
        </View>
      )}
    </View>
  );
}

/* THE FLIGHT. A short road between two windows. Each letter leaves its
   window, arcs over, and lands at the other one — the courier flying it,
   the day stamped on as it lands. The count at each window ticks up. */
const ROAD_W = 300;
const ROAD_H = 100;
const WIN = 34;
function Flight({ road, stamp }: { road: ThreadMessage[]; stamp?: string | null }) {
  const P = useP();
  const tk = useTheme().t;
  const [mine, setMine] = useState(0);
  const [theirs, setTheirs] = useState(0);
  useEffect(() => {
    const timers = road.map((m, i) => setTimeout(() => (m.mine ? setTheirs((n) => n + 1) : setMine((n) => n + 1)), T_ROAD + i * T_STEP + T_FLY));
    return () => timers.forEach(clearTimeout);
  }, [road]);
  const x0 = WIN / 2 + 8;
  const x1 = ROAD_W - WIN / 2 - 8;
  const y = ROAD_H - 30;
  return (
    <View style={{ width: ROAD_W, height: ROAD_H + 44 }}>
      {/* the ground the two windows stand on, and the dotted road between */}
      <View style={{ position: "absolute", left: 10, right: 10, top: y + WIN / 2 + 2, height: 1.5, backgroundColor: tk.ln }} />
      <View style={{ position: "absolute", left: x0 + WIN / 2 + 6, right: ROAD_W - x1 + WIN / 2 + 6, top: y - 30, height: 0, borderTopWidth: 1.5, borderStyle: "dotted", borderColor: P.ink12 }} />
      <Window x={x0} y={y} label={t("ui.you").toUpperCase()} count={mine} roof />
      <Window x={x1} y={y} label={t("in.them").toUpperCase()} count={theirs} />
      {road.map((m, i) => (
        <Crossing key={i} from={m.mine ? x0 : x1} to={m.mine ? x1 : x0} y={y} at={T_ROAD + i * T_STEP} date={m.date} stamp={stamp} mine={m.mine} />
      ))}
      <Animated.Text entering={FadeIn.duration(400).delay(T_ROAD + road.length * T_STEP + T_FLY + 100)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, textAlign: "center", fontFamily: PF.mono, fontSize: MONO.label, letterSpacing: 1.4, color: P.ink40 }}>
        {t("in.road", { n: road.length })}
      </Animated.Text>
    </View>
  );
}

/* a window with a sill: the count of letters that have landed on it */
function Window({ x, y, label, count, roof }: { x: number; y: number; label: string; count: number; roof?: boolean }) {
  const P = useP();
  const tk = useTheme().t;
  const pop = useSharedValue(0);
  useEffect(() => {
    if (count === 0) return;
    pop.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 280, easing: ease.back }));
  }, [count, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.25 * pop.value }] }));
  return (
    <View style={{ position: "absolute", left: x - WIN / 2 - 20, top: y - WIN / 2 - 14, width: WIN + 40, alignItems: "center" }}>
      {/* your side is home — a roof; theirs is a window in a wall we cannot see */}
      {roof ? (
        <View style={{ width: 0, height: 0, borderLeftWidth: WIN / 2 + 5, borderRightWidth: WIN / 2 + 5, borderBottomWidth: 14, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: tk.ln }} />
      ) : (
        <View style={{ height: 14 }} />
      )}
      {/* the frame is the page's outline; the cross bars are drawn on the fixed warm pane, so
          they keep the brand ink (ln in the light themes; Midnight's ln is 1.4:1 on the cream) */}
      <View style={{ width: WIN, height: WIN, borderWidth: 1.5, borderColor: tk.ln, backgroundColor: "#FFF8DE", alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: 1.5, height: WIN, backgroundColor: BRAND.inkOnBrand }} />
        <View style={{ position: "absolute", width: WIN, height: 1.5, backgroundColor: BRAND.inkOnBrand }} />
      </View>
      {!roof && <View style={{ width: WIN + 10, height: 3, backgroundColor: tk.ln, marginTop: -1 }} />}
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 5 }}>
        <Animated.Text style={[{ fontFamily: PF.letter, fontWeight: "800", fontSize: 15, color: P.ink }, style]}>{count}</Animated.Text>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.small, letterSpacing: 1.2, color: P.ink40 }}>{label}</Text>
      </View>
    </View>
  );
}

/* one letter crossing: the courier carries it over the arc, the envelope
   spins a little, and on landing the day stamps on and both fade */
function Crossing({ from, to, y, at, date, stamp, mine }: { from: number; to: number; y: number; at: number; date?: string | null; stamp?: string | null; mine: boolean }) {
  const P = useP();
  const tk = useTheme().t;
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      at,
      withSequence(
        withTiming(1, { duration: T_FLY, easing: ease.sine, reduceMotion: ReduceMotion.System }),
        withTiming(2, { duration: 420, easing: ease.out, reduceMotion: ReduceMotion.System }),
      ),
    );
  }, [at, v]);
  const dir = to > from ? 1 : -1;
  const body = useAnimatedStyle(() => {
    const p = Math.min(1, v.value);
    const q = Math.max(0, v.value - 1);
    return {
      opacity: v.value === 0 ? 0 : 1 - q,
      transform: [
        { translateX: from + (to - from) * p },
        { translateY: y - 58 * Math.sin(p * Math.PI) - 12 * q },
        { rotate: `${dir * (-14 + 28 * p)}deg` },
      ],
    };
  });
  const stampStyle = useAnimatedStyle(() => {
    const q = Math.max(0, Math.min(1, (v.value - 1) * 2.5));
    return { opacity: q, transform: [{ scale: 0.5 + 0.5 * q }, { rotate: `${-10 + 10 * q}deg` }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -21, top: -14, width: 42, height: 28, alignItems: "center", justifyContent: "center" }, body]}>
      {/* the courier, small, over the letter — facing the way she flies */}
      <View style={{ position: "absolute", top: -22, transform: [{ scaleX: dir }] }}>
        <WrenBird size={26} pose="fly" mood="delight" skin="sticker" />
      </View>
      <View style={{ width: 34, height: 22, borderRadius: 3, backgroundColor: P.sheet, borderWidth: 1.2, borderColor: mine ? P.ink40 : tk.ln, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, backgroundColor: P.ink12 }} />
        {stamp ? <View style={{ position: "absolute", right: 2, top: 2 }}><StampTile id={stamp} w={9} r={1} /></View> : null}
        <Animated.View style={[{ paddingHorizontal: 3, paddingVertical: 1, borderWidth: 1, borderColor: P.pen, borderRadius: 2, backgroundColor: P.sheet }, stampStyle]}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 6.5, letterSpacing: 0.4, color: P.pen }}>{date ? dShort(date).toUpperCase() : "—"}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/* their mosaic, then its own squares thrown outward and falling like paper */
const CELL = 9;
const GAP = 3.5;
const GRID = COLS * CELL + (COLS - 1) * GAP;
function Burst({ seed, at }: { seed: string; at: number }) {
  const cells = Array.from(inkedCells(seed)).map((k) => {
    const [r, c] = k.split(",").map(Number);
    return { key: k, r, c };
  });
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(at, withTiming(1, { duration: 1100, easing: ease.out, reduceMotion: ReduceMotion.System }));
  }, [at, v]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", width: GRID, height: GRID, alignItems: "center", justifyContent: "center" }}>
      {cells.map((cell, i) => (
        <Scrap key={cell.key} r={cell.r} c={cell.c} n={i} v={v} />
      ))}
    </View>
  );
}
function Scrap({ r, c, n, v }: { r: number; c: number; n: number; v: { value: number } }) {
  const P = useP(); // a mosaic cell is ink, as 10a draws the mosaic
  const x0 = c * (CELL + GAP) - GRID / 2 + CELL / 2;
  const y0 = r * (CELL + GAP) - GRID / 2 + CELL / 2;
  // each scrap has its own throw: direction from its place in the grid, a little chaos from its index
  const h = hashStr(`scrap-${n}`);
  const ang = Math.atan2(y0, x0 || 0.01) + (((h % 40) - 20) * Math.PI) / 180;
  const dist = 70 + (h % 50);
  const spin = ((h % 2 ? 1 : -1) * (180 + (h % 180)));
  const style = useAnimatedStyle(() => {
    const p = v.value;
    const gravity = 90 * p * p;
    return {
      transform: [
        { translateX: x0 + Math.cos(ang) * dist * p },
        { translateY: y0 + Math.sin(ang) * dist * p * 0.6 - 30 * Math.sin(p * Math.PI) + gravity },
        { rotate: `${spin * p}deg` },
      ],
      opacity: p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3,
    };
  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: CELL, height: CELL, backgroundColor: P.ink }, style]} />;
}

/* a sticker slapped down: arrives big and flat-fast, squashes, springs back, settles tilted */
function Slapped({ children, at, tilt, small }: { children: React.ReactNode; at: number; tilt: number; small?: boolean }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      at,
      withSequence(
        withTiming(1, { duration: small ? 160 : 220, easing: Easing.in(Easing.quad), reduceMotion: ReduceMotion.System }),
        withTiming(2, { duration: 380, easing: ease.back, reduceMotion: ReduceMotion.System }),
      ),
    );
  }, [at, v, small]);
  const style = useAnimatedStyle(() => {
    const p = v.value;
    const opacity = p < 0.05 ? 0 : 1;
    // 0→1: falling in from above, large; 1→2: squash (scaleY .82) then spring to 1
    const scale = p <= 1 ? 1.35 - 0.35 * p : 1;
    const squashY = p <= 1 ? 1 : p < 1.5 ? 1 - 0.18 * (1 - (p - 1) / 0.5) : 1;
    const squashX = p <= 1 ? 1 : p < 1.5 ? 1 + 0.12 * (1 - (p - 1) / 0.5) : 1;
    return {
      opacity,
      transform: [{ translateY: p <= 1 ? -40 * (1 - p) : 0 }, { scale }, { scaleX: squashX }, { scaleY: squashY }, { rotate: `${tilt * Math.min(1, p)}deg` }],
    };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

/* the name typed onto the sticker by the caret, in big caps; a jolt when the last letter lands */
function TypedName({ name, at, color }: { name: string; at: number; color: string }) {
  const [n, setN] = useState(0);
  const [caret, setCaret] = useState(false);
  const jolt = useSharedValue(0);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setCaret(true), at));
    for (let i = 1; i <= name.length; i++) timers.push(setTimeout(() => setN(i), at + 240 + i * 95));
    const done = at + 240 + name.length * 95;
    timers.push(
      setTimeout(() => {
        jolt.value = withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 260, easing: ease.back }));
      }, done + 80),
    );
    timers.push(setTimeout(() => setCaret(false), done + 600));
    return () => timers.forEach(clearTimeout);
  }, [name, at, jolt]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * jolt.value }] }));
  return (
    <Animated.View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
      <Text style={{ fontFamily: PF.letter, fontSize: 34, fontWeight: "800", letterSpacing: -0.8, color }} numberOfLines={1}>
        {name.slice(0, n)}
      </Text>
      {caret && (
        <View style={{ marginLeft: 4 }}>
          <WrenGlyph size={26} />
        </View>
      )}
    </Animated.View>
  );
}

/* a face that slides in from its side, bumps the other, overlaps a little and springs back;
   a mosaic on the way in, a face from the bump on */
function Bumper({ side, seed, face, at }: { side: -1 | 1; seed: string; face: string | null; at: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      at,
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.in(Easing.quad), reduceMotion: ReduceMotion.System }),
        withTiming(2, { duration: 420, easing: ease.back, reduceMotion: ReduceMotion.System }),
      ),
    );
  }, [at, v]);
  // 0→1: from off-screen to the collision (overlapping by 14); 1→2: spring back to rest (overlap 6)
  const wrap = useAnimatedStyle(() => {
    const p = v.value;
    const x = p <= 1 ? side * (170 - (170 - 22) * p) : side * (22 + 8 * (p - 1));
    return { transform: [{ translateX: x }, { rotate: `${side * (p <= 1 ? -10 * (1 - p) : 0)}deg` }], zIndex: side === 1 ? 2 : 1 };
  });
  const mosaic = useAnimatedStyle(() => ({ opacity: v.value < 1 ? 1 : Math.max(0, 1 - (v.value - 1) * 3) }));
  const portrait = useAnimatedStyle(() => ({ opacity: v.value < 1 ? 0 : Math.min(1, (v.value - 1) * 3), transform: [{ scale: 0.9 + 0.1 * Math.min(1, Math.max(0, v.value - 1)) }] }));
  return (
    <Animated.View style={[{ position: "absolute", width: 64, height: 64, alignItems: "center", justifyContent: "center" }, wrap]}>
      <Animated.View style={[{ position: "absolute" }, mosaic]}>
        <MosaicId seed={seed} cell={5.6} gap={1.6} develop={1} />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", borderWidth: 3, borderColor: BRAND.paperWhite, borderRadius: 34 }, portrait]}>
        <AvatarImage id={face} seed={seed} size={62} />
      </Animated.View>
    </Animated.View>
  );
}
