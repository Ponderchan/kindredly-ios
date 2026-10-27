/* THE FIRST FLIGHT'S CHART AND CLOCK, shared by its two renderers: components/FirstFlight (React
   Native) and the SwiftUI flight behind the "firstflight" switch (components/FirstFlightNative →
   modules/kindredly-ui KFirstFlight). Pure and free of React Native, so its node test runs with
   plain node (first-flight-model.test.ts). Every number is the React Native flight's own.

   The chart is a 390 × 844 board (scaled to the window by both); the clock runs in seconds. */

/** the board both renderers draw on, in points, and the flight's length in seconds */
export const FLIGHT_W = 390;
export const FLIGHT_H = 844;
export const FLIGHT_TOTAL = 3.05;
/** the flight window on the clock: she leaves home at FLY0 and is back at FLY1 */
export const FLY0 = 0.8;
export const FLY1 = 2.6;

export type FlightXY = [number, number];

/** the loop: your city → three stops → home, four cubic segments on the chart */
export const SEGS: FlightXY[][] = [
  [[78, 640], [60, 440], [140, 300], [210, 250]],
  [[210, 250], [280, 200], [330, 160], [318, 300]],
  [[318, 300], [306, 440], [250, 470], [300, 560]],
  [[300, 560], [350, 650], [190, 700], [78, 640]],
];
/** your city, where the loop starts and ends */
export const HOME: FlightXY = [78, 640];
/** the three stops she brings letters back from */
export const STOPS: FlightXY[] = [[210, 250], [318, 300], [300, 560]];

/** a point on one cubic segment at u ∈ 0…1 */
export const bez = (p: FlightXY[], u: number): FlightXY => {
  const v = 1 - u;
  return [
    v * v * v * p[0][0] + 3 * v * v * u * p[1][0] + 3 * v * u * u * p[2][0] + u * u * u * p[3][0],
    v * v * v * p[0][1] + 3 * v * v * u * p[1][1] + 3 * v * u * u * p[2][1] + u * u * u * p[3][1],
  ];
};

/** the loop as SVG path data (the chart's faint line) */
export const LOOP_D = SEGS.map((s, i) => (i === 0 ? `M${s[0][0]} ${s[0][1]} ` : "") + `C ${s[1][0]} ${s[1][1]}, ${s[2][0]} ${s[2][1]}, ${s[3][0]} ${s[3][1]}`).join(" ");

/** a point she passes, and when (seconds on the clock): the trail she leaves */
export type FlightPoint = { x: number; y: number; at: number };

/** The sampled loop and the moment she passes each point: nine samples a segment, the joins once. */
export function flightPoints(): FlightPoint[] {
  const out: FlightPoint[] = [];
  const n = 9;
  SEGS.forEach((s, si) => {
    for (let i = si === 0 ? 0 : 1; i < n; i++) {
      const [x, y] = bez(s, i / (n - 1));
      const frac = (si + i / (n - 1)) / SEGS.length;
      out.push({ x, y, at: FLY0 + frac * (FLY1 - FLY0) });
    }
  });
  return out;
}

/** A path on the clock: at t[i] seconds the thing is at (x[i], y[i]); straight lines between, held at the ends. */
export type FlightTrack = { t: number[]; x: number[]; y: number[] };

/** the clock's stops for her and the envelope: waiting, the loop, home to the middle, landed */
const trackTimes = (pts: FlightPoint[]) => [0, FLY0 - 0.001, ...pts.map((p) => p.at), 2.85, FLIGHT_TOTAL];

/** Her CENTRE on the board: perched by the title, the loop, then home to the middle. */
export function birdTrack(pts: FlightPoint[]): FlightTrack {
  return {
    t: trackTimes(pts),
    x: [240, 240, ...pts.map((p) => p.x), 150, 150],
    y: [232, 232, ...pts.map((p) => p.y), 380, 380],
  };
}

/** The envelope's TOP-LEFT corner for a box of env.w × env.h: it appears where the letter folded,
    then rides under her. A bigger envelope than the plain 120 × 80 keeps the plain one's centre. */
export function envelopeTrack(pts: FlightPoint[], env: { w: number; h: number }): FlightTrack {
  return {
    t: trackTimes(pts),
    x: [135, 135, ...pts.map((p) => p.x - 20), 90, 90].map((x) => x + (120 - env.w) / 2),
    y: [330, 330, ...pts.map((p) => p.y + 22), 420, 420].map((y) => y + (80 - env.h) / 2),
  };
}

/** One value on the clock: at t[i] seconds it is v[i]; straight lines between, held at the ends
    (Reanimated's interpolate with Extrapolation.CLAMP). */
export type FlightCurve = { t: number[]; v: number[] };

/** Everything else that moves, on the same clock (seconds). */
export const FLIGHT_CURVES = {
  /** 1 · the letter folds in place (its height, ×; it rises 70 × (1 − this) as it goes) */
  cardFold: { t: [0.05, 0.55], v: [1, 0.04] },
  cardFade: { t: [0.5, 0.6], v: [1, 0] },
  /** the envelope appears where the letter folded, rides under her, and is gone before she lands */
  envFade: { t: [0.3, 0.55, 2.5, 2.65], v: [0, 1, 1, 0] },
  envScale: { t: [0.3, 0.6, FLY0, FLY0 + 0.25], v: [0.6, 1, 1, 0.5] },
  /** degrees */
  envTurn: { t: [FLY0, FLY0 + 0.25], v: [0, -12] },
  /** the title steps back once she's gone */
  title: { t: [0.6, 1.0], v: [1, 0.18] },
  /** the chart comes up as she leaves and dims as she lands */
  chart: { t: [0.55, 0.9, 2.7, 3.0], v: [0, 1, 1, 0.35] },
  /** 2 · she flies smaller; 3 · she comes home to the middle, larger */
  birdScale: { t: [0, FLY0, FLY0 + 0.3, FLY1, 2.9], v: [1, 1, 0.78, 0.78, 1.5] },
  /** degrees: the chick herself flies, tilted */
  birdTurn: { t: [FLY0 - 0.05, FLY0 + 0.25, FLY1 - 0.25, FLY1], v: [0, -16, -16, 0] },
  /** 3 · the three envelopes she brings back rise into place */
  trayFade: { t: [2.55, 2.85], v: [0, 1] },
  trayRise: { t: [2.55, 2.9], v: [24, 0] },
} satisfies Record<string, FlightCurve>;

/** Each dot of the trail: it shows (peak) the moment she passes, holds, and fades to `end` as she lands. */
export const TRAIL = { lead: 0.02, peak: 0.7, hold: 2.9, end: 0.3 } as const;
/** The trail dot's curve for the point she passes at `at` seconds. */
export const trailCurve = (at: number): FlightCurve => ({ t: [at - TRAIL.lead, at, TRAIL.hold, FLIGHT_TOTAL], v: [0, TRAIL.peak, TRAIL.peak, TRAIL.end] });

/** A stop's first words on the chart: the first four of the letter she brings back from it. */
export const stopWords = (l?: { body?: string | null }): string => (l?.body || "").split(/\s+/).slice(0, 4).join(" ");
/** A stop's label: that letter's stamp as a #tag ("#cant sleep"); "" for none (the chart says STOP n). */
export const stopStamp = (l?: { stamp?: string | null }): string => (l?.stamp ? "#" + String(l.stamp).replace(/-/g, " ") : "");

/** When she passes each stop, in ms (a light tap of haptics each). */
export function stopTimesMs(): number[] {
  return STOPS.map((_, i) => (FLY0 + ((i + 1) / SEGS.length) * (FLY1 - FLY0)) * 1000);
}
