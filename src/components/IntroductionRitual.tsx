import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeIn, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { MONO, PF, PFM } from "../theme/post";
import { BRAND } from "../theme/themes";
import { useLetterFamily, useP, useTheme } from "../lib/theme";
import { AvatarImage } from "./AvatarImage";
import { COLS, MosaicId, inkedCells } from "./MosaicId";
import { WrenGlyph } from "./GlyphInput";
import { StickerChip } from "./AuraCard";
import { Stamp } from "./Stamp";
import { STAMP_DOT_PT } from "../lib/stamp-frame";
import { WrenBird } from "./WrenBird";
import { t } from "../lib/i18n";
import { dShort, localeTag } from "../lib/format";
import { hashStr } from "../lib/format";
import { stickerLook } from "../lib/sticker-copy";
import type { ThreadMessage } from "../lib/db";
import type { KindredNotice } from "../lib/kindred-read";
import { Frost, VeilTile } from "./Frost";
import type { FrostSpec } from "../lib/frost";
import { penDrawPlan, penTypedUpright, penViewBox, type PenDrawStep, type PenSig } from "../lib/pen-signature";
import type { SignedPair, SignedSide } from "../lib/signed-sides";
import { PenSignature } from "./PenSignature";

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
   drawing, not a label).

   IDENTITY ON — THE SIGNED NAME (Phase 2, PHASE2.md §7; `signed` given).
   The road stays; the burst and the typed sticker go, because there was
   no mosaic to blow apart and the name wasn't typed by the courier — it
   was signed by the person. Two columns, yours on the left as on the road:
   ② at 3400 the two frosted windows each of you wore (FROST v1, the very
      colours the other saw), courier names under them; a soft sheen
      sweeps each pane top-left to bottom-right as the frost goes, the
      square turns round, and the face each of you SENT is behind it (the
      snapshot from the seal, or the glyph for none).
   ③ at 4250 an ink line strikes through their courier name, then yours;
      both dim to 45%. A name you were given gives way to one you chose.
   ④ at 4600 their signature draws in stroke by stroke (penDrawPlan, in a
      132×42 slot, 2pt, the theme's ink), their pen name fading in under
      it; at 5600 yours, faster. A typed side has no drawing: the pen name
      fades into the slot in the italic (upright for CJK), once.
   ⑤ at 6250 the two faces bump (kept), ⑥ at 6850 KINDREDS · {date}
      slaps under them, ⑦ at 7300 what she noticed; done at 8000, inside
      today's 8040.
   Under Reduce Motion (`still`) none of that moves: the road is already
   landed, and the end state cross-fades in — faces, struck names, whole
   signatures at 300, the chip at 900, the sticker at 1300 — done by 1600.
   Their signature, once still, can be held (450ms) for Report this
   signature / Block (`onHoldTheirs`; the Introduction draws the card).
   No postmark wavy lines anywhere; the envelopes' stamps are Stamp's. */

const T_ROAD = 380;
const T_STEP = 240; // one letter crosses every 240 ms; the last lands before the burst
const T_FLY = 620; // how long one crossing takes
const T_BURST = T_ROAD + 10 * T_STEP + T_FLY + 300;
const T_SLAP = T_BURST + 520;
const T_NAME = T_SLAP + 520;
const T_BUMP = T_NAME + 1500;
const T_NOTICE = T_BUMP + 1100;
export const T_RITUAL_DONE = T_NOTICE + 700;

/* identity on: the signed beats (PHASE2.md §7.1), on the same road */
const S_WINDOWS = 3400; // the two windows fade in (250ms)
const S_WIPE = 3650; // the sheen sweeps, the frost goes (→ 4200); round 3700 → 4200; the face 3800 → 4250
const S_STRIKE_THEIRS = 4250;
const S_STRIKE_MINE = 4370;
const S_SIGN_THEIRS = 4600;
const S_SIGN_THEIRS_MS = 1000;
const S_SIGN_MINE = 5600;
const S_SIGN_MINE_MS = 600;
const S_BUMP = 6250;
const S_CHIP = 6850;
const S_NOTICE = 7300;
/** identity on: when the signed ritual is done (the Introduction's "noticed" line waits for it) */
export const T_SIGNED_DONE = 8000;
/** the same under Reduce Motion: a cross-fade to the end state */
export const T_SIGNED_DONE_STILL = 1600;
/** When the ritual a sheet is showing is done: today's, or the signed one, moving or still. */
export const ritualDoneAt = (signed: boolean, still: boolean): number => (!signed ? T_RITUAL_DONE : still ? T_SIGNED_DONE_STILL : T_SIGNED_DONE);

/* THE SIGNED RITUAL'S CLOCK, for the SwiftUI ritual (modules/kindredly-ui KIntroRitual, behind the
   "ceremony" switch: components/IntroductionRitualNative). Swift draws every beat on these very
   numbers, so the two renderers keep one clock; they are the constants above, unchanged. `lift`
   and `liftMs` are the Swift ritual's alone: the two sealed envelopes over the windows lift
   together (the kindreds reel's "both open together", guide-reel/kindreds OPEN_LIFT) just before
   the frost goes; the React Native ritual has no envelopes over its windows. All in ms from the
   moment the ceremony opened. */
export const SIGNED_BEATS = {
  road: T_ROAD,
  step: T_STEP,
  fly: T_FLY,
  windows: S_WINDOWS,
  lift: S_WIPE - 130,
  liftMs: 340,
  wipe: S_WIPE,
  wipeMs: 600, // WIPE_MS (declared further down)
  strikeTheirs: S_STRIKE_THEIRS,
  strikeMine: S_STRIKE_MINE,
  signTheirs: S_SIGN_THEIRS,
  signTheirsMs: S_SIGN_THEIRS_MS,
  signMine: S_SIGN_MINE,
  signMineMs: S_SIGN_MINE_MS,
  bump: S_BUMP,
  chip: S_CHIP,
  notice: S_NOTICE,
  done: T_SIGNED_DONE,
  doneStill: T_SIGNED_DONE_STILL,
} as const;

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
  signed,
  still = false,
  holdable = false,
  onHoldTheirs,
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
  /** identity on: what each side signed — the frost wipe and the signatures replace the burst and the sticker */
  signed?: SignedPair | null;
  /** identity on, Reduce Motion: the end state cross-fades in (done by 1600) */
  still?: boolean;
  /** identity on: the ritual is done and their signature may be held */
  holdable?: boolean;
  /** identity on: their signature was held (450ms); the view that was held, for the card */
  onHoldTheirs?: (anchor: View | null) => void;
}) {
  if (signed) {
    return <SignedRitual road={road} stamp={stamp} signed={signed} since={since} notice={notice} still={still} holdable={holdable} onHoldTheirs={onHoldTheirs} />;
  }
  return <MosaicRitual road={road} otherSeed={otherSeed} otherFace={otherFace} otherName={otherName} mySeed={mySeed} myFace={myFace} myName={myName} since={since} stamp={stamp} notice={notice} />;
}

/* identity off (or no signed data): today's ritual, exactly */
function MosaicRitual({
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
  since: string;
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
        <Animated.Text entering={FadeIn.duration(300).delay(T_BUMP + 700)} numberOfLines={1} maxFontSizeMultiplier={1.4} style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 13, color: P.ink, maxWidth: 120 }}>{myName}</Animated.Text>
        <Slapped at={T_BUMP + 600} tilt={2} small>
          <View style={{ backgroundColor: BRAND.paperWhite, borderRadius: 999, borderWidth: 1.5, borderColor: BRAND.greenText, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ ...PFM.monoSemi, fontSize: MONO.small, letterSpacing: 1.4, color: BRAND.greenText }}>{t("in.sinceChip", { date: dShort(since).toUpperCase() })}</Text>
          </View>
        </Slapped>
        <Animated.Text entering={FadeIn.duration(300).delay(T_BUMP + 700)} numberOfLines={1} maxFontSizeMultiplier={1.4} style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 13, color: P.ink, maxWidth: 120 }}>{otherName}</Animated.Text>
      </View>

      {/* ⑤ one more sticker: what she noticed, if a label showed */}
      {notice && chipLook && (
        <View style={{ marginTop: 18, alignItems: "center" }}>
          <Slapped at={T_NOTICE} tilt={notice.shared ? -2 : 2}>
            <View>
              <StickerChip id={notice.stickerId} i={1} size="lg" />
              {notice.shared && (
                <View style={{ position: "absolute", top: -9, right: -12, backgroundColor: BRAND.inkOnBrand, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: BRAND.paperWhite }}>
                  <Text style={{ ...PFM.monoSemi, fontSize: MONO.small, color: BRAND.paperWhite }}>×2</Text>
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
function Flight({ road, stamp, still = false }: { road: ThreadMessage[]; stamp?: string | null; still?: boolean }) {
  const P = useP();
  const tk = useTheme().t;
  /* still (identity on, Reduce Motion): the road as it ends — every letter landed, the counts final,
     no crossings, the count line already there */
  const [mine, setMine] = useState(() => (still ? road.filter((m) => !m.mine).length : 0));
  const [theirs, setTheirs] = useState(() => (still ? road.filter((m) => m.mine).length : 0));
  /* the counts follow the road's letters, not the array: the chat hands a new one on every reload
     of the thread (a letter arriving while the ceremony is open), and replaying the timers onto the
     counts already there landed every letter twice — "10 YOU · 10 THEM". A road that really changed
     starts its count again. */
  const roadKey = road.map((m) => (m.mine ? "1" : "0")).join("");
  useEffect(() => {
    if (still) {
      setMine(road.filter((m) => !m.mine).length);
      setTheirs(road.filter((m) => m.mine).length);
      return;
    }
    setMine(0);
    setTheirs(0);
    const timers = road.map((m, i) => setTimeout(() => (m.mine ? setTheirs((n) => n + 1) : setMine((n) => n + 1)), T_ROAD + i * T_STEP + T_FLY));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadKey, still]);
  const x0 = WIN / 2 + 8;
  const x1 = ROAD_W - WIN / 2 - 8;
  const y = ROAD_H - 30;
  return (
    <View style={{ width: ROAD_W, height: ROAD_H + 44 }}>
      {/* the ground the two windows stand on, and the dotted road between */}
      <View style={{ position: "absolute", left: 10, right: 10, top: y + WIN / 2 + 2, height: 1.5, backgroundColor: tk.ln }} />
      <View style={{ position: "absolute", left: x0 + WIN / 2 + 6, right: ROAD_W - x1 + WIN / 2 + 6, top: y - 30, height: 0, borderTopWidth: 1.5, borderStyle: "dotted", borderColor: P.ink12 }} />
      <Window x={x0} y={y} label={t("ui.you").toUpperCase()} count={mine} roof still={still} />
      <Window x={x1} y={y} label={t("in.them").toUpperCase()} count={theirs} still={still} />
      {!still &&
        road.map((m, i) => (
          <Crossing key={i} from={m.mine ? x0 : x1} to={m.mine ? x1 : x0} y={y} at={T_ROAD + i * T_STEP} date={m.date} stamp={stamp} mine={m.mine} />
        ))}
      <Animated.Text
        entering={still ? undefined : FadeIn.duration(400).delay(T_ROAD + road.length * T_STEP + T_FLY + 100)}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, textAlign: "center", ...PFM.mono, fontSize: MONO.label, letterSpacing: 1.4, color: P.ink40 }}
      >
        {t("in.road", { n: road.length })}
      </Animated.Text>
    </View>
  );
}

/* a window with a sill: the count of letters that have landed on it */
function Window({ x, y, label, count, roof, still }: { x: number; y: number; label: string; count: number; roof?: boolean; still?: boolean }) {
  const P = useP();
  const tk = useTheme().t;
  const pop = useSharedValue(0);
  useEffect(() => {
    if (count === 0 || still) return;
    pop.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 280, easing: ease.back }));
  }, [count, pop, still]);
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
        <Text style={{ ...PFM.monoSemi, fontSize: MONO.small, letterSpacing: 1.2, color: P.ink40 }}>{label}</Text>
      </View>
    </View>
  );
}

/* one letter crossing: the courier carries it over the arc, the envelope
   spins a little, and on landing the day stamps on and both fade.

   The stamp in its corner (stamps v2, 2026-10-18). The ladder offers this
   envelope the chip, 15×18, or — if the envelope can't take 18 tall — a
   6pt dot of the stamp's colour. It can't: the envelope is 34×22 with a
   1.2pt edge, 19.6pt inside, so a chip would fill its whole height and
   half its width, sit under the date as it stamps on, and stop reading as
   an envelope with a stamp on it. So it wears the dot, in the corner where
   the 9pt square was. */
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
    <Animated.View
      pointerEvents="none"
      // decoration: pointerEvents stops touches, not VoiceOver (the ritual is one sentence on its container)
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: "absolute", left: -21, top: -14, width: 42, height: 28, alignItems: "center", justifyContent: "center" }, body]}
    >
      {/* the courier, small, over the letter — facing the way she flies */}
      <View style={{ position: "absolute", top: -22, transform: [{ scaleX: dir }] }}>
        <WrenBird size={26} pose="fly" mood="delight" skin="sticker" />
      </View>
      <View style={{ width: 34, height: 22, borderRadius: 3, backgroundColor: P.sheet, borderWidth: 1.2, borderColor: mine ? P.ink40 : tk.ln, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, backgroundColor: P.ink12 }} />
        {stamp ? <Stamp id={stamp} width={STAMP_DOT_PT} style={{ position: "absolute", right: 3, top: 3 }} /> : null}
        <Animated.View style={[{ paddingHorizontal: 3, paddingVertical: 1, borderWidth: 1, borderColor: P.pen, borderRadius: 2, backgroundColor: P.sheet }, stampStyle]}>
          <Text style={{ ...PFM.monoSemi, fontSize: 6.5, letterSpacing: 0.4, color: P.pen }}>{date ? dShort(date).toUpperCase() : "—"}</Text>
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
      {/* the name being revealed: a display size that doesn't grow with Dynamic Type, and shrinks to
          fit before it would be cut to "MARGA…" */}
      <Text
        style={{ flexShrink: 1, fontFamily: PF.letter, fontSize: 34, fontWeight: "800", letterSpacing: -0.8, color }}
        numberOfLines={1}
        maxFontSizeMultiplier={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
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

/* ═══ IDENTITY ON: THE SIGNED NAME ═══════════════════════════════════════
   Two columns (yours left, theirs right, as on the road), each a window
   that wipes clear onto the face sent, the courier name struck through,
   the signature drawn in, the pen name under it. Columns, not the 56pt
   pair of the first sketch: two 132pt signature slots side by side need
   the room, so the faces sit over their own signatures (80pt apart) and
   the bump carries them to the middle and back. */
const COL_W = 136;
const COL_GAP = 8;
const FACE = 64;
export const SLOT_W = 132;
export const SLOT_H = 42;
/* how far each face travels to the collision: they meet overlapping by 10pt */
const BUMP_IN = (COL_W + COL_GAP - FACE) / 2 + 5;
/* the wipe's own clock, from S_WIPE (ms) */
const WIPE_MS = 600;
const never = ReduceMotion.Never; // the moving path only runs with Reduce Motion off; `still` is the other path

function SignedRitual({
  road,
  stamp,
  signed,
  since,
  notice,
  still,
  holdable,
  onHoldTheirs,
}: {
  road: ThreadMessage[];
  stamp?: string | null;
  signed: SignedPair;
  since: string;
  notice?: KindredNotice | null;
  still: boolean;
  holdable: boolean;
  onHoldTheirs?: (anchor: View | null) => void;
}) {
  const chipLook = notice ? stickerLook(notice.stickerId, 1) : null;
  // a cross-fade is not motion: under Reduce Motion it still fades (and is the only thing that moves)
  const fade = (ms: number, at: number) => FadeIn.duration(ms).delay(at).reduceMotion(never);
  const pair = (
    <View style={{ flexDirection: "row", width: COL_W * 2 + COL_GAP, justifyContent: "space-between" }}>
      <SignedColumn side={signed.mine} dir={1} strikeAt={S_STRIKE_MINE} signAt={S_SIGN_MINE} signMs={S_SIGN_MINE_MS} still={still} fallbackName={t("in.meFallback")} />
      <SignedColumn side={signed.theirs} dir={-1} strikeAt={S_STRIKE_THEIRS} signAt={S_SIGN_THEIRS} signMs={S_SIGN_THEIRS_MS} still={still} holdable={holdable} onHold={onHoldTheirs} />
    </View>
  );
  const chip = (
    <View style={{ backgroundColor: BRAND.paperWhite, borderRadius: 999, borderWidth: 1.5, borderColor: BRAND.greenText, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ ...PFM.monoSemi, fontSize: MONO.small, letterSpacing: 1.4, color: BRAND.greenText }}>{t("in.sinceChip", { date: dShort(since).toUpperCase() })}</Text>
    </View>
  );
  return (
    <View style={{ alignItems: "center" }}>
      {/* ① the road, as today (or already landed) */}
      <Flight road={road} stamp={stamp} still={still} />

      {/* ② the windows wipe clear, ③ the courier names struck, ④ the signatures */}
      <Animated.View entering={still ? fade(400, 300) : fade(250, S_WINDOWS)} style={{ marginTop: 14 }}>
        {pair}
      </Animated.View>

      {/* ⑥ since when — under the two of you */}
      <View style={{ marginTop: 10, alignItems: "center", minHeight: 24 }}>
        {still ? (
          // at the tilt the slapped chip settles at, so the end state is the same either way
          <Animated.View entering={fade(300, 900)} style={{ transform: [{ rotate: "2deg" }] }}>
            {chip}
          </Animated.View>
        ) : (
          <Slapped at={S_CHIP} tilt={2} small>
            {chip}
          </Slapped>
        )}
      </View>

      {/* ⑦ what she noticed, if a label showed (kept) */}
      {notice && chipLook && (
        <View style={{ marginTop: 14, alignItems: "center" }}>
          {(() => {
            const sticker = (
              <View>
                <StickerChip id={notice.stickerId} i={1} size="lg" />
                {notice.shared && (
                  <View style={{ position: "absolute", top: -9, right: -12, backgroundColor: BRAND.inkOnBrand, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: BRAND.paperWhite }}>
                    <Text style={{ ...PFM.monoSemi, fontSize: MONO.small, color: BRAND.paperWhite }}>×2</Text>
                  </View>
                )}
              </View>
            );
            return still ? (
              <Animated.View entering={fade(300, 1300)} style={{ transform: [{ rotate: `${notice.shared ? -2 : 2}deg` }] }}>
                {sticker}
              </Animated.View>
            ) : (
              <Slapped at={S_NOTICE} tilt={notice.shared ? -2 : 2}>
                {sticker}
              </Slapped>
            );
          })()}
        </View>
      )}
    </View>
  );
}

/* one side: the window that wipes onto the face, the struck courier name, the signature, the pen name */
function SignedColumn({
  side,
  dir,
  strikeAt,
  signAt,
  signMs,
  still,
  fallbackName,
  holdable = false,
  onHold,
}: {
  side: SignedSide;
  /** which way the middle is: +1 for the left column, -1 for the right */
  dir: 1 | -1;
  strikeAt: number;
  signAt: number;
  signMs: number;
  still: boolean;
  /** the words for a side with no pen name (mine only: in.meFallback) */
  fallbackName?: string;
  holdable?: boolean;
  onHold?: (anchor: View | null) => void;
}) {
  const slot = useRef<View>(null);
  const name = side.name || fallbackName || "";
  const holds = !!onHold && holdable;
  return (
    <View style={{ width: COL_W, alignItems: "center" }}>
      <Bumping dir={dir} at={S_BUMP} still={still}>
        <WipeWindow frost={side.frost} face={side.face} seed={side.seed} still={still} />
      </Bumping>
      <StruckName text={side.courier.toLocaleUpperCase(localeTag())} at={strikeAt} still={still} />
      <Pressable
        ref={slot}
        disabled={!holds}
        delayLongPress={450}
        onLongPress={holds ? () => onHold?.(slot.current) : undefined}
        accessible={false}
        style={{ marginTop: 10, width: SLOT_W, height: SLOT_H }}
      >
        {side.sig ? <DrawnSig sig={side.sig} at={signAt} ms={signMs} still={still} /> : <TypedSig name={name} at={signAt} still={still} />}
      </Pressable>
      {/* the typed pen name under a drawing (a typed side IS the name: nothing under it) */}
      <View style={{ height: 20, marginTop: 4, justifyContent: "center" }}>{side.sig ? <FadeName text={name} at={signAt + signMs} still={still} /> : null}</View>
    </View>
  );
}

/* ② the frosted window each wore, wiped clear: a sheen sweeps the pane while the frost fades, the
   square goes round, and the face behind it — the one they SENT, or the glyph — comes forward */
function WipeWindow({ frost, face, seed, still }: { frost: FrostSpec | null; face: string | null; seed: string; still: boolean }) {
  const c = useSharedValue(still ? WIPE_MS : 0);
  useEffect(() => {
    if (still) {
      c.value = WIPE_MS;
      return;
    }
    c.value = withDelay(S_WIPE, withTiming(WIPE_MS, { duration: WIPE_MS, easing: Easing.linear, reduceMotion: never }));
  }, [still, c]);
  const clip = useAnimatedStyle(() => {
    const r = Math.min(1, Math.max(0, (c.value - 50) / 500)); // 3700 → 4200
    const e = r * r * (3 - 2 * r);
    return { borderRadius: FACE * (0.25 + 0.25 * e) };
  });
  const frostStyle = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, c.value / 550)); // 3650 → 4200
    return { opacity: 1 - p * p * (3 - 2 * p) };
  });
  const sheen = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, c.value / 550));
    const e = p * p * (3 - 2 * p);
    const d = -FACE * 0.85 + FACE * 1.7 * e;
    return { opacity: p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0, transform: [{ translateX: d }, { translateY: d }, { rotate: "45deg" }] };
  });
  const faceStyle = useAnimatedStyle(() => {
    const f = Math.min(1, Math.max(0, (c.value - 150) / 450)); // 3800 → 4250
    return { opacity: f, transform: [{ scale: 0.92 + 0.08 * f }] };
  });
  return (
    <View style={{ width: FACE, height: FACE }}>
      <Animated.View style={[{ width: FACE, height: FACE, overflow: "hidden" }, clip]}>
        <Animated.View style={[{ position: "absolute" }, faceStyle]}>
          <AvatarImage id={face} seed={seed} size={FACE} />
        </Animated.View>
        {!still && (
          <Animated.View pointerEvents="none" style={[{ position: "absolute" }, frostStyle]}>
            {frost ? <Frost spec={frost} size={FACE} /> : <VeilTile size={FACE} />}
          </Animated.View>
        )}
        {!still && (
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: (FACE - FACE * 0.5) / 2, top: (FACE - FACE * 2) / 2, width: FACE * 0.5, height: FACE * 2 }, sheen]}>
            <Svg width={FACE * 0.5} height={FACE * 2}>
              <Defs>
                <LinearGradient id="wipe" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0} />
                  <Stop offset={0.5} stopColor="#FFFFFF" stopOpacity={0.85} />
                  <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={FACE * 0.5} height={FACE * 2} fill="url(#wipe)" />
            </Svg>
          </Animated.View>
        )}
      </Animated.View>
      {/* the white ring a face wears as a sticker (as the bump's faces always did), once it's round */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: FACE, height: FACE, borderWidth: 3, borderColor: BRAND.paperWhite }, clip, faceStyle]} />
    </View>
  );
}

/* ③ a 1.5pt ink line strikes through the courier name, left to right; the name dims to 45% */
function StruckName({ text, at, still }: { text: string; at: number; still: boolean }) {
  const tk = useTheme().t;
  const v = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) {
      v.value = 1;
      return;
    }
    v.value = withDelay(at, withTiming(1, { duration: 240, easing: Easing.inOut(Easing.quad), reduceMotion: never }));
  }, [at, still, v]);
  // the name's own width, measured: a percentage width on the absolute line resolved against the
  // column, not the name, and ran past it
  const w = useSharedValue(0);
  const nameStyle = useAnimatedStyle(() => ({ opacity: 1 - 0.55 * v.value }));
  const line = useAnimatedStyle(() => ({ width: w.value * v.value }));
  if (!text) return <View style={{ height: 16, marginTop: 8 }} />;
  /* the wrapper is the name's own width, so the line strikes the name and nothing past it. No
     numberOfLines: a one-line Text takes the whole column on iOS, and the line ran past the name.
     The face is mono, so the width is known: a name too long for the column (a long German one)
     steps the size down instead of wrapping (full-width CJK counts as two). */
  const fs = Math.max(8, Math.min(MONO.title, COL_W / monoEms(text, 0.6 / MONO.title)));
  return (
    <View onLayout={(e) => (w.value = e.nativeEvent.layout.width)} style={{ marginTop: 8, maxWidth: COL_W, alignSelf: "center", justifyContent: "center" }}>
      <Animated.Text style={[{ ...PFM.monoMed, fontSize: fs, letterSpacing: 0.6, color: tk.sub }, nameStyle]}>{text}</Animated.Text>
      <Animated.View style={[{ position: "absolute", left: 0, top: "50%", height: 1.5, marginTop: -0.5, backgroundColor: tk.ink }, line]} />
    </View>
  );
}

/* a mono line's width in ems (plus `spacingEm` a character): 0.6 per character, 1.0 per wide one */
const WIDE = /[ᄀ-ᇿ⺀-꓏가-힯豈-﫿＀-｠]/;
export function monoEms(text: string, spacingEm: number): number {
  let n = 0;
  for (const ch of text) n += (WIDE.test(ch) ? 1 : 0.6) + spacingEm;
  return Math.max(1, n);
}

/* ④ the drawing, stroke by stroke, in the 132×42 slot: one clock per side, each stroke's dash run
   out over its own share of it (penDrawPlan). Still, it is simply the signature (PenSignature, the
   same box, margin and weight, so nothing jumps). */
const AnimatedPath = Animated.createAnimatedComponent(Path);
const SIG_PT = 2;

/* the plan squeezed into `ms` however many strokes there are (32 at most): the gaps and the floor
   per stroke shrink before the whole would overrun the next beat (the Swift ritual draws the same
   plan: components/IntroductionRitualNative) */
export function fitPlan(sig: PenSig, ms: number): PenDrawStep[] | null {
  const n = sig.s.length;
  const gapMs = n > 1 ? Math.min(60, (ms * 0.25) / (n - 1)) : 0;
  const minStrokeMs = Math.min(80, ((ms - gapMs * (n - 1)) / n) * 0.6);
  return penDrawPlan(sig, ms, { gapMs, minStrokeMs });
}

function DrawnSig({ sig, at, ms, still }: { sig: PenSig; at: number; ms: number; still: boolean }) {
  const tk = useTheme().t;
  const plan = useMemo(() => fitPlan(sig, ms), [sig, ms]);
  const vb = useMemo(() => penViewBox(sig, "ink", { aspect: SLOT_W / SLOT_H }), [sig]);
  const end = plan ? plan.reduce((m, st) => Math.max(m, st.delay + st.duration), 0) : 0;
  const clock = useSharedValue(still ? end + 1 : 0);
  useEffect(() => {
    if (still) {
      clock.value = end + 1;
      return;
    }
    clock.value = withDelay(at, withTiming(end + 1, { duration: end + 1, easing: Easing.linear, reduceMotion: never }));
  }, [at, end, still, clock]);
  if (still || !plan) return <PenSignature sig={sig} name="" width={SLOT_W} height={SLOT_H} fit="ink" strokePt={SIG_PT} />;
  const sw = (SIG_PT * vb.w) / SLOT_W;
  return (
    <Svg width={SLOT_W} height={SLOT_H} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
      {plan.map((st, i) => (
        <StrokeIn key={i} step={st} clock={clock} width={sw} ink={tk.ink} />
      ))}
    </Svg>
  );
}

function StrokeIn({ step, clock, width, ink }: { step: PenDrawStep; clock: SharedValue<number>; width: number; ink: string }) {
  const dash = step.length + 2;
  const props = useAnimatedProps(() => {
    const raw = Math.min(1, Math.max(0, (clock.value - step.delay) / step.duration));
    const p = raw * raw * (3 - 2 * raw);
    // hidden until its turn: a round cap at the dash's end would otherwise sit on the first point as a dot
    return { strokeDashoffset: dash * (1 - p), strokeOpacity: clock.value >= step.delay ? 1 : 0 };
  });
  return <AnimatedPath d={step.d} fill="none" stroke={ink} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[dash, dash]} animatedProps={props} />;
}

/* a typed side: the pen name fades into the slot in the reader's Letter font's italic (upright for
   CJK, and in a face without an italic), 20pt, once: a signature is something someone wrote */
function TypedSig({ name, at, still }: { name: string; at: number; still: boolean }) {
  const tk = useTheme().t;
  const upright = penTypedUpright(name);
  const slanted = useLetterFamily(true);
  const plain = useLetterFamily();
  const v = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) {
      v.value = 1;
      return;
    }
    v.value = withDelay(at, withTiming(1, { duration: 400, easing: ease.out, reduceMotion: never }));
  }, [at, still, v]);
  const style = useAnimatedStyle(() => ({ opacity: v.value }));
  return (
    <Animated.View style={[{ width: SLOT_W, height: SLOT_H, alignItems: "center", justifyContent: "center" }, style]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={{ ...(upright ? plain : slanted), fontSize: 20, color: tk.ink, maxWidth: SLOT_W }}
      >
        {name}
      </Text>
    </Animated.View>
  );
}

/* the typed pen name under a drawing, in the letter face */
function FadeName({ text, at, still }: { text: string; at: number; still: boolean }) {
  const tk = useTheme().t;
  const v = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) {
      v.value = 1;
      return;
    }
    v.value = withDelay(at, withTiming(1, { duration: 200, easing: ease.out, reduceMotion: never }));
  }, [at, still, v]);
  const style = useAnimatedStyle(() => ({ opacity: v.value }));
  return (
    <Animated.Text numberOfLines={1} style={[{ fontFamily: PF.letter, fontWeight: "600", fontSize: 13, color: tk.ink, maxWidth: COL_W }, style]}>
      {text}
    </Animated.Text>
  );
}

/* ⑤ the bump, kept: both faces go to the middle, meet overlapping a little, and spring back to
   their own columns (the back easing overshoots them outward once) */
function Bumping({ dir, at, still, children }: { dir: 1 | -1; at: number; still: boolean; children: React.ReactNode }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    v.value = withDelay(
      at,
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.in(Easing.quad), reduceMotion: never }),
        withTiming(2, { duration: 420, easing: ease.back, reduceMotion: never }),
      ),
    );
  }, [at, still, v]);
  const style = useAnimatedStyle(() => {
    const p = v.value;
    const k = p <= 1 ? p : 2 - p;
    return { transform: [{ translateX: dir * BUMP_IN * k }, { rotate: `${dir * 6 * k}deg` }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}
