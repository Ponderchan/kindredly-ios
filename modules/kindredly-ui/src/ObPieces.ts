import type { KFirstFlightCurves, KFirstFlightPoint, KFirstFlightStop, KFirstFlightTrack } from "./Moments";
import type { KImageRefProps } from "./types";

/* THE ONBOARDING'S LAST FOUR ISLANDS, AS SWIFT DRAWS THEM (batch 3 slice 2, 2026-11-09): the
   `pieces` record of KOnboardingView (ios/Adapters/KOnboardingView.swift → Portable/Onboarding/
   KObPieces.swift, KObHatchStage.swift). Each piece is behind its own switch (app_surfaces
   "obroutebird", "obchick", "obflight", "hatch"; off by default) and is null while React Native
   draws it — then the island is placed exactly as before. Built by src/screens/onboarding/
   ob-pieces.tsx, only after isKindredlyUIViewAvailable("KObPiecesView") (the binary's marker).

   Every bird is a picture of the run's own hatchling (its form, its shell's mark, Sky, bare),
   captured from the real WrenBird / HatchlingRig; Swift moves the pictures. */

/** a picture by name: a mood ("content", "listen" …) or a rig part ("tail", "base" …) */
export type KObPic = { id: string; image: KImageRefProps | null };

/** the named chick on 10, 11 and 13 (s10-chick Chick) */
export type KObChickPiece = {
  /** her face at rest */
  mood: string;
  /** the name tag (10), in capitals; "" for none */
  tag: string;
  a11y: string;
  /** bump to make her react */
  nudge: number;
  nudgeRe: "chirp" | "tilt" | "happy";
};

/** the first flight on 12 (and still behind 13): FirstFlight's board with S12Flight's head, line and envelope */
export type KObFlightPiece = {
  /** Date.now() when the flight started */
  startAt: number;
  still: boolean;
  /** her face now (curious → content → delight) */
  mood: string;
  /** the reader's theme key */
  theme: string;
  head: string;
  sub: string;
  /** the courier's line under the chart ("" for none) and its lines */
  line: string;
  lineLines: number;
  /** the stamp in the envelope's corner */
  stamp: string;
  opener: string;
  openerLines: number;
  carried: string;
  yourCity: string;
  chart: string;
  skip: string;
  stops: KFirstFlightStop[];
  stopWordsSize: number;
  loop: string;
  home: KFirstFlightPoint;
  stopPoints: KFirstFlightPoint[];
  trail: KFirstFlightPoint[];
  curves: KFirstFlightCurves;
  bird: KFirstFlightTrack;
  envelope: KFirstFlightTrack;
  envelopeW: number;
  envelopeH: number;
  /** seconds */
  total: number;
};

/** one idle habit: its weight in the draw, its length (s), its face ("" keeps hers) */
export type KObMotion = { m: string; w: number; s: number; face: string };

/** the hatch on 9 (HatchStage, burst "flood") */
export type KObHatchPiece = {
  /** the rig's parts at rest: tail, farWing, legL, base, nearWing */
  layers: KObPic[];
  /** the face part, one per mood */
  faces: KObPic[];
  mood: string;
  /** the words thrown out of the burst */
  words: string[];
  /** her first word ("" for none) */
  quote: string;
  motions: KObMotion[];
  /** bump as the key goes: she hops */
  celebrate: number;
  /** a dark theme: the egg's shadow is black */
  shadowDark: boolean;
};

export type KObPieces = {
  /** slide 2's flying Wren (bird-images "obRoute"); null keeps the island */
  route: KImageRefProps | null;
  /** the run's hatchling, whole, by mood: the chick's and the flight's pictures */
  birds: KObPic[];
  chick: KObChickPiece | null;
  flight: KObFlightPiece | null;
  hatch: KObHatchPiece | null;
};

/** every island React Native's */
export const OB_PIECES_OFF: KObPieces = { route: null, birds: [], chick: null, flight: null, hatch: null };

const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };
const img = (r: KImageRefProps | null | undefined): KImageRefProps => (r && r.uri ? { uri: r.uri, key: r.key ?? "", kind: r.kind ?? "image" } : NO_IMAGE);
const pics = (list: KObPic[]) => list.filter((p) => p.image?.uri).map((p) => ({ id: p.id, image: img(p.image) }));

/** The record as the Swift side takes it: every picture present (empty for none), `on` per piece. */
export function nativeObPieces(p: KObPieces | null | undefined) {
  const x = p ?? OB_PIECES_OFF;
  return {
    route: img(x.route),
    birds: pics(x.birds),
    chick: x.chick ? { on: true, ...x.chick } : { on: false },
    flight: x.flight ? { on: true, ...x.flight } : { on: false },
    hatch: x.hatch ? { on: true, ...x.hatch, layers: pics(x.hatch.layers), faces: pics(x.hatch.faces) } : { on: false },
  };
}
export type NativeObPieces = ReturnType<typeof nativeObPieces>;
