import { Image, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { PALETTE, type Daylight } from "./courier-card-model";
import type { Fidelity } from "../lib/aura-ladder";
import { ART_RATIO, D, auraArtFit, colourDots, deskFigure, figureFills, scenePalette, type FigurePaint, type ScenePalette } from "./aura-art-model";

/* THE SCENE THAT DEVELOPS — a window, a desk, someone bent over a page.
   ────────────────────────────────────────────────────────────────────────
   One set of paths, drawn four ways (the owner's W33): the first rungs
   show only the lines waiting to be written; three letters in, a faint
   pencil outline; a label stuck, a single-ink sketch on cream; named, the
   whole thing in colour. The colour rung's sky is the courier card's sky
   at this hour — the two cards are always the same time of day. Before
   colour the ground is the app's own pale lavender, the pencil and the
   sketch ink two steps of the same violet — on a light theme; a dark one
   draws them in its own light strokes (ScenePalette). Its paint (which
   ink, which fill, the colour rung's hour) is aura-art-model's, which the
   SwiftUI slot (behind "auraart") draws with too. */

export const SCENE_RATIO = 114 / 357;
/** the band when it holds one of the fifty scenes: 16:9, the whole scene
    fitted by height — windows, head and feet all in — with the hour's sky
    and ground running on past its edges (aura-art-model) */
export { ART_RATIO };

/* ONE OF THE FIFTY. Once a noun is in view the band is that title's own
   scene, drawn edge to edge: the pictures are 16:9 now, so nothing is cut
   and nothing is repainted. While the name is still forming it is the
   same scene in one lavender ink on paper; once earned, in colour. The
   aura is the reader's thing, not the courier's — it keeps its own light. */
export function AuraArtBand({ width, src }: { width: number; src: number }) {
  const h = Math.round(width * ART_RATIO);
  return (
    <View style={{ width, height: h, overflow: "hidden" }}>
      <Image source={src} style={{ width, height: h }} resizeMode="cover" />
    </View>
  );
}

/* THE 10a SLOT (H:78): one of the fifty in a slot of a fixed height (110 on
   the Aura card), FITTED BY HEIGHT — never cover-cropped, which at the
   card's width cut about 40% of every picture's height (heads, feet,
   windows; critic). The picture is 16:9, so it sits centred, as wide as
   the height allows, on `ground` (the slot's soft2) at the sides.
   `inset` lays it in the slot as a print instead: that far in from every
   edge, with corners of its own (0, the default, runs it top to bottom). */
export function AuraArtFit({ width, height, src, ground, inset = 0 }: { width: number; height: number; src: number; ground: string; inset?: number }) {
  const fit = auraArtFit(width, height, inset);
  return (
    <View style={{ width, height, backgroundColor: ground, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Image source={src} style={{ width: fit.width, height: fit.height, borderRadius: inset ? 8 : 0 }} resizeMode="contain" />
    </View>
  );
}

/* the paper's inks and the rungs' palette: aura-art-model (D, ScenePalette, SCENE_ON_PAPER) */
export { SCENE_ON_PAPER, type ScenePalette } from "./aura-art-model";

/* `pal` is what the rungs before colour are drawn with; `ground` alone
   overrides just the ground. They used to be the card's own white paper,
   always, which in a 10a card's soft2 art slot is a white block — and in
   Midnight a white slab (critic): the 10a card passes the slot's colour
   (tk.soft2). And the strokes have to come with the ground: the paper's
   near-black lines on Midnight's soft2 are invisible (about 1.05:1) and the
   sketch turns into white blobs, so a dark slot passes light strokes too
   (AuraCard's AuraArtSlot). The colour rung keeps the hour's sky.
   `height` fills a slot of that height instead of the scene's own ratio
   (the art is drawn "slice", so the desk stays whole and the edges give). */
export function AuraScene({
  width,
  height,
  fidelity,
  day,
  ground,
  pal,
}: {
  width: number;
  height?: number;
  fidelity: Fidelity;
  day: Daylight;
  ground?: string;
  pal?: Partial<ScenePalette>;
}) {
  const p: ScenePalette = scenePalette(pal, ground);
  const h = height ?? Math.round(width * SCENE_RATIO);
  const hour = PALETTE[day]; // the hour's light, for the colour rung's sky
  // the rung's figure and the colour rung's two small lights, in the shared paint (aura-art-model)
  const figure = deskFigure(fidelity, day, p);
  const dots = colourDots(day);

  return (
    <Svg width={width} height={h} viewBox="0 0 357 114" preserveAspectRatio="xMidYMid slice">
      {fidelity === "colour" && (
        <Defs>
          <LinearGradient id="auraSky" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={hour.sky[0]} />
            <Stop offset="1" stopColor={hour.sky[1]} />
          </LinearGradient>
        </Defs>
      )}
      <Rect x={0} y={0} width={357} height={114} fill={fidelity === "colour" ? "url(#auraSky)" : p.ground} />

      {fidelity === "lines" && (
        <>
          {/* the lines waiting to be written, and one small star */}
          {[
            [24, 124],
            [38, 84],
            [52, 106],
            [66, 54],
          ].map(([y, w], i) => (
            <Rect key={y} x={108} y={y} width={w} height={5} rx={2.5} fill={p.lines} opacity={0.3 - i * 0.05} />
          ))}
          <Path d="M296 28l2.6 6.4 6.4 2.6-6.4 2.6-2.6 6.4-2.6-6.4-6.4-2.6 6.4-2.6z" fill={D.brass} />
        </>
      )}

      {/* pencil, sketch, colour: the one figure in the rung's paint */}
      {figure && <Figure {...figure} />}
      {fidelity === "colour" && (
        <>
          {/* two small lights in the corner — stars at night, sun-dust by day */}
          <Circle cx={40} cy={26} r={3} fill={dots.fill} opacity={dots.opacity} />
          <Circle cx={60} cy={17} r={2} fill={dots.fill} opacity={dots.opacity} />
        </>
      )}
    </Svg>
  );
}

/* the one geometry: window, sun, desk, head, hair, body, arm, page — in the
   rung's paint (aura-art-model figureFills). The SwiftUI slot draws these
   same numbers (modules/kindredly-ui Portable/Me/KAuraArt.swift). */
function Figure(paint: FigurePaint) {
  const { stroke } = paint;
  const k = figureFills(paint);
  return (
    <>
      <Rect x={192} y={14} width={122} height={70} rx={3} fill={k.window} stroke={stroke} strokeWidth={1.7} />
      <Path d="M253 14V84M192 49H314" stroke={stroke} strokeWidth={1.16} />
      {/* the pencil rung has no sun yet — it arrives with the sketch */}
      {k.sun && <Circle cx={288} cy={32} r={10} fill={k.sun.fill} stroke={k.sun.stroke} strokeWidth={1.7} />}
      <Path d="M24 96H334" stroke={stroke} strokeWidth={2.55} strokeLinecap="round" />
      <Circle cx={108} cy={42} r={18} fill={k.head} stroke={stroke} strokeWidth={1.7} />
      <Path d="M90 46q18 -25 36 0" fill={k.hair} stroke={stroke} strokeWidth={1.7} />
      <Path d="M75 96q6 -36 33 -36q27 0 33 36" fill={k.body} stroke={stroke} strokeWidth={1.7} />
      <Path d="M127 74q21 4 33 15" fill="none" stroke={stroke} strokeWidth={2.72} strokeLinecap="round" />
      <Rect x={152} y={83} width={52} height={13} fill={k.page} stroke={stroke} strokeWidth={1.7} />
      <Path d="M160 88h28M160 92h19" stroke={stroke} strokeWidth={1.16} />
    </>
  );
}
