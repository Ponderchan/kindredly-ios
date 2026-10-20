import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Keyboard, Text, View, type NativeSyntheticEvent, type TextLayoutEventData } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Line, Path } from "react-native-svg";
import { useLetterFamily, useTheme } from "../lib/theme";
import { MONO, PFM } from "../theme/post";
import { PEN_BASELINE, PEN_H, PEN_W, penStrokePath, penTypedUpright, type PadPoint } from "../lib/pen-signature";

/* THE SIGNATURE PAD (identity Phase 2, PHASE2.md §6.2 item 4).
   ────────────────────────────────────────────────────────────────────────
   Where a pen name is signed by hand, once per trade. A soft field at the
   box's own aspect (width × 0.32, so where on the line they signed is kept
   when lib/pen-signature penFromPad maps it into the 1000×320 box), with
   the line you sign on: a 1pt ln baseline at PEN_BASELINE of the height,
   from 6% to 94% of the width, a small × at its left end. Under the ink,
   faintly, the pen name being traced — the typed name in the letter serif's
   italic (upright for Chinese, Japanese and Korean, where an italic is a
   fake slant), sitting on the baseline, never wider than 70% of the pad;
   "sign here" with no name yet. The caption in the corner fades at the
   first stroke; the guide stays under the ink.

   THE INK is the theme's (light on Midnight), 2.4pt, round caps and joins,
   smoothed exactly as the published drawing will be (penStrokePath on the
   pad's own points), so nothing changes shape when it lands. One finger:
   react-native-gesture-handler's Pan from the first touch (minDistance 0),
   on the JS thread; the live stroke's points sit in a ref and paint once a
   frame, the finished strokes are the caller's (it keeps them through a
   failed send). At 32 strokes the pad takes no more (padTakesStroke).

   A FINGER ON THE PAD OWNS IT. The sheet's scroll view stops scrolling
   while one is down (onDrawing) and, when the caller passes it, the
   scroll view's own pan waits on this one (blocksExternalGesture), so a
   downward stroke draws instead of moving the sheet. Touching the pad puts
   the keyboard away.

   VoiceOver: the pad is one element — its label says what it is and that
   Type it instead is the other way, its value how many strokes are down.
   It isn't the way in for a screen reader (the sheet focuses Type it
   instead first). */

export type SignaturePadProps = {
  width: number;
  /** the finished strokes, in pad points (the caller keeps them) */
  strokes: readonly (readonly PadPoint[])[];
  /** a stroke finished (never called once the pad is full) */
  onStroke: (stroke: PadPoint[]) => void;
  /** a finger went down (true) or came up (false): the sheet stops scrolling meanwhile */
  onDrawing?: (active: boolean) => void;
  /** the pad takes no more strokes (32) */
  full?: boolean;
  /** the pen name being traced; "" draws `emptyGuide` */
  guide: string;
  emptyGuide: string;
  /** the corner caption ("trace your pen name") */
  caption: string;
  accessibilityLabel: string;
  accessibilityValue?: string;
  /** the scroll view whose pan waits on the pad's (react-native-gesture-handler's ScrollView ref) */
  blocks?: RefObject<unknown>;
  /** the pad's field; the theme's soft by default (a sheet on Midnight, where soft is the sheet's own sf, passes soft2) */
  surface?: string;
};

const STROKE_PT = 2.4;
/** the guide's share of the ink */
const GUIDE_ALPHA = 0.1;
/** the guide never spans more than this share of the pad */
const GUIDE_SPAN = 0.7;

const flat = (pts: readonly PadPoint[]): number[] => {
  const out: number[] = [];
  for (const p of pts) out.push(p.x, p.y);
  return out;
};

/** the pad's size for a content width: the box's aspect, whole points */
export const padHeightOf = (width: number): number => Math.round(width * (PEN_H / PEN_W));

export const SignaturePad = memo(function SignaturePad({
  width,
  strokes,
  onStroke,
  onDrawing,
  full = false,
  guide,
  emptyGuide,
  caption,
  accessibilityLabel,
  accessibilityValue,
  blocks,
  surface,
}: SignaturePadProps) {
  const { t: tk } = useTheme();
  const height = padHeightOf(width);
  const baseY = Math.round(height * PEN_BASELINE);

  /* the live stroke: points in a ref, painted once a frame */
  const live = useRef<PadPoint[] | null>(null);
  const [, setFrame] = useState(0);
  const raf = useRef<number | null>(null);
  const paint = useCallback(() => {
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      setFrame((n) => (n + 1) % 1_000_000);
    });
  }, []);
  useEffect(
    () => () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  /* the latest props, for the gesture's callbacks (built once per size) */
  const latest = useRef({ onStroke, onDrawing, full, width, height });
  latest.current = { onStroke, onDrawing, full, width, height };

  const clampPt = (x: number, y: number): PadPoint => {
    const { width: w, height: h } = latest.current;
    return { x: Math.max(0, Math.min(w, x)), y: Math.max(0, Math.min(h, y)) };
  };

  const pan = useMemo(() => {
    let g = Gesture.Pan()
      .minDistance(0)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .runOnJS(true)
      .onBegin((e) => {
        if (latest.current.full) return;
        Keyboard.dismiss();
        live.current = [clampPt(e.x, e.y)];
        latest.current.onDrawing?.(true);
        paint();
      })
      .onUpdate((e) => {
        if (!live.current) return;
        live.current.push(clampPt(e.x, e.y));
        paint();
      })
      .onFinalize(() => {
        const stroke = live.current;
        live.current = null;
        latest.current.onDrawing?.(false);
        if (stroke && stroke.length) latest.current.onStroke(stroke);
        paint();
      });
    if (blocks) g = g.blocksExternalGesture(blocks as never);
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint, blocks]);

  const donePath = useMemo(() => strokes.map((s) => penStrokePath(flat(s))).join(""), [strokes]);
  const livePath = live.current ? penStrokePath(flat(live.current)) : "";
  const inked = strokes.length > 0 || !!live.current;

  /* THE GUIDE ON THE LINE. Measured once at its natural size (hidden), then drawn scaled to fit
     70% of the pad, its baseline (the line's ascender, whatever font the script falls through
     to) on the pad's baseline. */
  const text = guide.trim() || emptyGuide;
  const upright = penTypedUpright(text);
  const guideSize = Math.round(height * 0.42);
  const [measure, setMeasure] = useState<{ text: string; w: number; asc: number } | null>(null);
  const onGuideLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const line = e.nativeEvent.lines[0];
    if (!line) return;
    const w = e.nativeEvent.lines.reduce((m, l) => Math.max(m, l.width), 0);
    setMeasure((m) => (m && m.text === text && Math.abs(m.w - w) < 0.5 ? m : { text, w, asc: line.ascender }));
  };
  const fit = measure && measure.text === text && measure.w > 0 ? Math.min(1, (width * GUIDE_SPAN) / measure.w) : null;
  // the name to trace, in the reader's Letter font's italic (upright for CJK, and in a face without one)
  const slanted = useLetterFamily(true);
  const guideFont = upright ? { fontFamily: undefined, fontStyle: "normal" as const } : slanted;

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={accessibilityValue ? { text: accessibilityValue } : undefined}
        style={{ width, height, borderRadius: 12, backgroundColor: surface ?? tk.soft, overflow: "hidden" }}
      >
        {/* the natural size of the guide, never seen: on a line wide enough never to wrap or be
            cut, so its reported width is the words' own */}
        <Text
          key={`m:${text}`}
          onTextLayout={onGuideLayout}
          allowFontScaling={false}
          accessible={false}
          style={[guideFont, { position: "absolute", left: 0, top: 0, width: 4000, opacity: 0, fontSize: guideSize }]}
        >
          {text}
        </Text>
        {fit != null && measure ? (
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={[
              guideFont,
              {
                position: "absolute",
                left: 0,
                right: 0,
                top: baseY - measure.asc * fit,
                textAlign: "center",
                fontSize: guideSize * fit,
                color: tk.ink,
                opacity: GUIDE_ALPHA,
              },
            ]}
          >
            {text}
          </Text>
        ) : null}

        <Svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }}>
          <Line x1={width * 0.06} x2={width * 0.94} y1={baseY} y2={baseY} stroke={tk.ln} strokeWidth={1} />
          {/* the × at the line's left end */}
          <Path
            d={`M${width * 0.06} ${baseY - 13}l7 7M${width * 0.06 + 7} ${baseY - 13}l-7 7`}
            stroke={tk.sub}
            strokeWidth={1.4}
            strokeLinecap="round"
            fill="none"
          />
          {donePath ? <Path d={donePath} stroke={tk.ink} strokeWidth={STROKE_PT} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
          {livePath ? <Path d={livePath} stroke={tk.ink} strokeWidth={STROKE_PT} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
        </Svg>

        {!inked ? (
          <Animated.Text
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(180)}
            maxFontSizeMultiplier={1.4}
            style={{ position: "absolute", left: 12, top: 9, ...PFM.monoMed, fontSize: MONO.label, letterSpacing: MONO.label * 0.06, color: tk.sub }}
          >
            {caption}
          </Animated.Text>
        ) : null}
      </View>
    </GestureDetector>
  );
});
