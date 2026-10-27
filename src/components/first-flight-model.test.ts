/* first-flight-model: the chart and the clock both renderers of the first flight draw from.
   Run by hand: node src/components/first-flight-model.test.ts */
import { FLIGHT_CURVES, FLIGHT_TOTAL, FLY0, FLY1, HOME, LOOP_D, SEGS, STOPS, TRAIL, bez, birdTrack, envelopeTrack, flightPoints, stopStamp, stopTimesMs, stopWords, trailCurve } from "./first-flight-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

const pts = flightPoints();
ok("the loop: nine samples on the first segment, eight on each after (the joins once)", pts.length === 9 + 8 * 3);
ok("she leaves from your city at FLY0", pts[0].x === HOME[0] && pts[0].y === HOME[1] && near(pts[0].at, FLY0));
ok("and is home again at FLY1", near(pts[pts.length - 1].x, HOME[0]) && near(pts[pts.length - 1].y, HOME[1]) && near(pts[pts.length - 1].at, FLY1));
ok("the clock only moves forward", pts.every((p, i) => i === 0 || p.at > pts[i - 1].at));
ok("each stop is on the loop", STOPS.every(([x, y]) => pts.some((p) => near(p.x, x) && near(p.y, y))));
ok("a segment starts and ends on its own points", SEGS.every((s) => near(bez(s, 0)[0], s[0][0]) && near(bez(s, 1)[1], s[3][1])));
ok("the path data starts at your city", LOOP_D.startsWith("M78 640 C 60 440, 140 300, 210 250"));
ok("four curves in the path data", (LOOP_D.match(/C /g) ?? []).length === 4);

const bird = birdTrack(pts);
ok("her track: one time for every place", bird.t.length === bird.x.length && bird.x.length === bird.y.length && bird.t.length === pts.length + 4);
ok("she waits by the title, then lands in the middle", bird.x[0] === 240 && bird.y[0] === 232 && bird.x[bird.x.length - 1] === 150 && bird.y[bird.y.length - 1] === 380);
ok("her track ends with the flight", bird.t[bird.t.length - 1] === FLIGHT_TOTAL && bird.t.every((t, i) => i === 0 || t > bird.t[i - 1]));

const plain = envelopeTrack(pts, { w: 120, h: 80 });
ok("the plain envelope starts where the letter folds", plain.x[0] === 135 && plain.y[0] === 330);
ok("it rides under her, a little behind", near(plain.x[2], pts[0].x - 20) && near(plain.y[2], pts[0].y + 22));
const big = envelopeTrack(pts, { w: 160, h: 110 });
ok("a bigger envelope keeps the plain one's centre", near(big.x[0] + 80, plain.x[0] + 60) && near(big.y[5] + 55, plain.y[5] + 40));
ok("the envelope rides on her clock", plain.t.join() === bird.t.join());

ok("a stop's words: the first four", stopWords({ body: "Nobody buys pens  for a life" }) === "Nobody buys pens for" && stopWords(undefined) === "" && stopWords({ body: null }) === "");
ok("a stop's label: the stamp as a #tag, or nothing", stopStamp({ stamp: "cant-sleep" }) === "#cant sleep" && stopStamp({ stamp: null }) === "" && stopStamp(undefined) === "");

ok("every curve: as many values as times, the times in order", Object.values(FLIGHT_CURVES).every((c) => c.t.length === c.v.length && c.t.length >= 2 && c.t.every((t, i) => i === 0 || t > c.t[i - 1])));
ok("every curve inside the flight", Object.values(FLIGHT_CURVES).every((c) => c.t[0] >= 0 && c.t[c.t.length - 1] <= FLIGHT_TOTAL));
ok("the letter folds before the envelope rides", FLIGHT_CURVES.cardFade.t[1] <= FLY0 && FLIGHT_CURVES.envFade.t[1] < FLY0);
ok("the envelope is gone before she lands, the tray comes up as she does", FLIGHT_CURVES.envFade.t[3] <= FLIGHT_CURVES.trayFade.t[1] && FLIGHT_CURVES.trayFade.t[0] < 2.85);
ok("she's back to level by the time she's home", FLIGHT_CURVES.birdTurn.t[FLIGHT_CURVES.birdTurn.t.length - 1] === FLY1 && FLIGHT_CURVES.birdTurn.v[3] === 0);
{
  const c = trailCurve(1.5);
  ok("a trail dot shows as she passes it", c.t[1] === 1.5 && c.v[1] === TRAIL.peak && c.v[0] === 0);
  ok("and dims as she lands", c.t[3] === FLIGHT_TOTAL && c.v[3] === TRAIL.end);
}

const stops = stopTimesMs();
ok("a tap of haptics at each stop", stops.length === 3 && near(stops[0], 1250) && near(stops[1], 1700) && near(stops[2], 2150));
ok("every stop inside the flight window", stops.every((ms) => ms > FLY0 * 1000 && ms < FLY1 * 1000));

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
