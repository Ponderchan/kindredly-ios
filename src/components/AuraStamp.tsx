import { Text, View } from "react-native";
import { P, PF } from "../theme/post";
import type { OrbSky } from "./VoiceCard";

/* YOUR OWN STAMP — the identity artifact of a postal world.
   ────────────────────────────────────────────────────────────────────────
   The orb was an abstraction any astrology app could ship. This product's
   world is POST: letters, stamps, franks, seals — and in that world the
   one object worth wanting is a stamp only you can issue.

   It is printed FROM YOUR WRITING, literally. Real stamps carry microprint
   as their security texture; this one's microprint is your own sentences —
   a texture at arm's length, your life up close. The denomination is how
   much you've written. The title is your archetype, once it's earned. The
   paper is tinted by the hour you write in; the engraving warms or cools
   with which of your dimensions lead; your typographic tics sit in the
   margins like plate marks.

   The ladder becomes the stamp's own biography:
     empty     a bare engraving plate — dashed frame, nothing cut
     forming   pencil lines appear (your words, faint and grey)
     shaping   the ink starts taking
     clearing  full art, but overprinted SPECIMEN — in philately a
               specimen is a printer's proof, NOT VALID FOR POSTAGE.
               Neither, yet, is this identity.
     formed    perforated, denominated, titled — and franked with the
               date the ninth signal locked. Issued.

   Everything on it is computed from writing. Nothing is picked. */

const SKY_PAPER: Record<OrbSky, string> = {
  dawn: "#FBF2EC",
  day: "#FFFFFF",
  dusk: "#F8F0F4",
  night: "#EEEDFA",
};

function lerpHex(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const c = (sh: number) => [(sh >> 16) & 255, (sh >> 8) & 255, sh & 255];
  const [ar, ag, ab] = c(ah);
  const [br, bg, bb] = c(bh);
  const m = (x: number, y: number) => Math.round(x + (y - x) * Math.max(0, Math.min(1, t)));
  return `#${((m(ar, br) << 16) | (m(ag, bg) << 8) | m(ab, bb)).toString(16).padStart(6, "0")}`;
}

export function AuraStamp({
  stage,
  texts,
  name,
  pieces,
  sky = "day",
  warmth = 0.5,
  marks = [],
  formedOn,
  holderBg = "#FFFFFF",
  width = 172,
}: {
  stage: "empty" | "forming" | "shaping" | "clearing" | "formed";
  /** the writer's own lines — the engraving is made of them */
  texts: string[];
  name: string | null;
  pieces: number;
  sky?: OrbSky;
  warmth?: number;
  marks?: string[];
  formedOn?: string | null;
  /** the surface behind the stamp — the perforation punches show it */
  holderBg?: string;
  width?: number;
}) {
  const W = width;
  const H = Math.round(W * 1.26);
  const issued = stage === "formed";
  const inkA = stage === "forming" ? 0.3 : stage === "shaping" ? 0.55 : 0.8;
  const engra = lerpHex("#3A3AF5", "#B0489C", warmth); // cool pen → warm plum
  const paper = SKY_PAPER[sky];

  // the microprint: the writer's words, tiled into rows
  const corpus = texts.join("  ").replace(/\s+/g, " ").trim();
  const rows = Math.max(1, Math.min(9, stage === "forming" ? 4 : 9));
  const rowText = (i: number) => {
    if (!corpus) return "";
    const span = 46;
    const start = (i * 37) % Math.max(1, corpus.length - span);
    return corpus.slice(start, start + span);
  };

  // perforation dots along the edges, punched in the holder's colour
  const PERF = 7;
  const step = 12;
  const nx = Math.floor(W / step);
  const ny = Math.floor(H / step);
  const perfs: { x: number; y: number }[] = [];
  for (let i = 0; i <= nx; i++) {
    perfs.push({ x: (i * W) / nx, y: 0 });
    perfs.push({ x: (i * W) / nx, y: H });
  }
  for (let i = 1; i < ny; i++) {
    perfs.push({ x: 0, y: (i * H) / ny });
    perfs.push({ x: W, y: (i * H) / ny });
  }

  return (
    <View style={{ width: W + 8, height: H + 8, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: W, height: H, backgroundColor: paper, borderWidth: stage === "empty" ? 0 : 0, overflow: "hidden" }}>
        {/* ── the engraving: rows of your own words ── */}
        <View style={{ position: "absolute", left: 10, right: 10, top: 26, bottom: 44, overflow: "hidden", opacity: stage === "empty" ? 0 : 1 }}>
          {Array.from({ length: rows }).map((_, i) => (
            <Text
              key={i}
              numberOfLines={1}
              style={{
                fontFamily: PF.mono,
                fontSize: 6.5,
                lineHeight: Math.max(10, (H - 82) / rows),
                letterSpacing: 0.3,
                color: stage === "forming" ? P.ink40 : lerpHex(engra, "#111113", 0.25),
                opacity: inkA,
              }}
            >
              {rowText(i)}
            </Text>
          ))}
        </View>

        {/* empty: the uncut plate */}
        {stage === "empty" && (
          <View style={{ position: "absolute", left: 10, right: 10, top: 26, bottom: 44, borderWidth: 1, borderStyle: "dashed", borderColor: P.ink12, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 8, letterSpacing: 1.4, color: P.ink40 }}>NOT YET CUT</Text>
          </View>
        )}

        {/* ── frame + masthead + denomination ── */}
        <View style={{ position: "absolute", left: 6, right: 6, top: 6, bottom: 6, borderWidth: 1, borderColor: stage === "empty" ? P.ink12 : P.ink }} />
        <View style={{ position: "absolute", left: 12, top: 11, flexDirection: "row", alignItems: "center", right: 12 }}>
          <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 7.5, letterSpacing: 1.6, color: stage === "empty" ? P.ink40 : P.ink }}>
            KINDREDLY POST
          </Text>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, color: stage === "empty" ? P.ink40 : engra }}>
            {pieces > 0 ? pieces : "—"}
          </Text>
        </View>

        {/* plate marks: the writer's tics, in the margin */}
        {marks.length > 0 && (
          <Text style={{ position: "absolute", left: 12, bottom: 30, fontFamily: PF.mono, fontSize: 8, letterSpacing: 2, color: P.ink40 }}>
            {marks.slice(0, 3).join(" ")}
          </Text>
        )}

        {/* ── the title strip ── */}
        <View style={{ position: "absolute", left: 6, right: 6, bottom: 6, height: 22, borderTopWidth: 1, borderTopColor: stage === "empty" ? P.ink12 : P.ink, alignItems: "center", justifyContent: "center", backgroundColor: paper }}>
          <Text numberOfLines={1} style={{ fontFamily: issued ? PF.monoSemi : PF.mono, fontSize: 8.5, letterSpacing: 1.2, color: issued ? P.ink : P.ink40, paddingHorizontal: 6 }}>
            {(name || "").toUpperCase() || "UNTITLED"}
          </Text>
        </View>

        {/* clearing: the SPECIMEN overprint — a proof, not valid for postage */}
        {stage === "clearing" && (
          <View pointerEvents="none" style={{ position: "absolute", left: -20, right: -20, top: H / 2 - 12, alignItems: "center", transform: [{ rotate: "-14deg" }] }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 17, letterSpacing: 6, color: P.post, opacity: 0.5 }}>
              SPECIMEN
            </Text>
          </View>
        )}
      </View>

      {/* perforations — punched through, showing the holder */}
      {stage !== "empty" &&
        perfs.map((p, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 4 + p.x - PERF / 2,
              top: 4 + p.y - PERF / 2,
              width: PERF,
              height: PERF,
              borderRadius: PERF / 2,
              backgroundColor: holderBg,
            }}
          />
        ))}

      {/* issued: Wren's frank across the corner */}
      {issued && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: -12,
            top: -10,
            width: 74,
            height: 74,
            borderRadius: 37,
            borderWidth: 2,
            borderColor: P.brassSeal,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ rotate: "-12deg" }],
            opacity: 0.9,
          }}
        >
          <Text style={{ fontFamily: PF.monoMed, fontSize: 6.5, letterSpacing: 1, color: P.brassSeal }}>KINDREDLY</Text>
          <View style={{ width: 40, height: 1, backgroundColor: P.brassSeal, marginVertical: 3 }} />
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 8.5, letterSpacing: 0.5, color: P.brassSeal }}>
            {formedOn ? formedOn.slice(5).replace("-", ".") : "ISSUED"}
          </Text>
        </View>
      )}
    </View>
  );
}
