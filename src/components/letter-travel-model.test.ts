/* Behaviour lock for the send-off's clock and the sheet's numbers (components/letter-travel-model):
   the beats, the hold on the arrival card, the one tap, the one end, the card's line. The Swift
   port (KLetterTravelFrame / KLetterTravelClock) must give the same numbers. Not wired to a runner;
   run by hand from the repo root with plain node (it strips the types itself from Node 22.18 /
   23.6 on):
     node src/components/letter-travel-model.test.ts */

import { CUES, DONE_MS, HOLD_AT, STILL_T, TOTAL, WAIT_MS, newTravelClock, restartTravelClock, stepTravel, travelArc, travelCardLine, travelFrame } from "./letter-travel-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const near = (a: number, b: number, e = 1e-6) => Math.abs(a - b) < e;

/* ── the sheet ── */
const f0 = travelFrame(0, 0);
ok("the start: a flat page on the desk, no world yet", f0.fold === 0 && f0.out === 0 && f0.cross === 0 && f0.envOnDesk === 1 && f0.foldW === 214 && f0.foldH === 268);
ok("the start: no bird, no seal, no words", f0.swoop === 0 && near(f0.seal, 0) && f0.markIn === 0 && f0.outro === 0 && f0.bob === 0);
ok("the globe starts below the screen", near(f0.gR, 86) && near(f0.gCY, 852 + 150));

const fFold = travelFrame(CUES.Pickup - 0.1, 0);
ok("folded by the pickup: an envelope, sealed", near(fFold.fold, 1) && near(fFold.foldW, 132) && near(fFold.foldH, 86) && fFold.sealed);
ok("half-way it isn't sealed yet", !travelFrame(0.4, 0).sealed);
ok("the seal pops past 1 (easeOutBack) on its way in", travelFrame(CUES.Pickup - 0.1, 0).seal > 1);

const fWorld = travelFrame(CUES.Cross + 0.1, 0);
ok("pulled back: the globe in frame, the desk gone", near(fWorld.out, 1) && near(fWorld.gR, 166) && near(fWorld.gCY, 530) && fWorld.envOnDesk === 0);
{
  // the frame the arc takes over (cross passes .001 at about 2.5645s): no jump
  const a = travelFrame(2.564, 0);
  const b = travelFrame(2.566, 0);
  ok("she is carried home as the arc begins: no jump", a.cross <= 0.001 && b.cross > 0.001 && Math.hypot(a.birdX - b.birdX, a.birdY - b.birdY) < 3);
}

const fEnd = travelFrame(TOTAL, 0);
ok("the end: across, the words in, the outro done", near(fEnd.cross, 1) && near(fEnd.markIn, 1) && near(fEnd.outro, 1));
ok("she lands at the away pin, level", near(fEnd.birdX, fEnd.away[0]) && near(fEnd.birdY, fEnd.away[1]) && near(fEnd.heading, 0));
ok("the arc: home on the left, away on the right, both above the centre", fEnd.home[0] < fEnd.gCX && fEnd.away[0] > fEnd.gCX && fEnd.home[1] < fEnd.gCY && fEnd.away[1] < fEnd.gCY);
ok("the arc's top is 62 above the globe", near(travelArc(fEnd, 0.5)[1], fEnd.gCY + Math.sin((-90 * Math.PI) / 180) * (fEnd.gR + 6 + 62)));
ok("the bird shrinks with the pull-back", near(fEnd.birdS, 0.74 * 0.38));

const still = travelFrame(STILL_T, 0);
ok("Reduce Motion's tableau: across, words in, no outro", near(still.cross, 1) && near(still.markIn, 1) && still.outro === 0);

/* numbers the Swift port is checked against (KLetterTravelFrame) */
const probe = travelFrame(1.9, 2.2);
ok("probe at 1.9s", near(probe.birdX, 133.6407228907363, 1e-9) && near(probe.birdY, 430.47257639075633, 1e-9) && near(probe.heading, -13.472014465357113, 1e-9) && near(probe.bob, 2.994080185284815, 1e-9) && near(probe.gR, 103.77777777777777, 1e-9));

/* ── the clock ── */
{
  const c = newTravelClock(0);
  let taps = 0;
  let dones = 0;
  let last = { T: 0, beat: 0, tap: false, done: false };
  for (let ms = 0; ms <= 10_000; ms += 16) {
    last = stepTravel(c, ms, false);
    if (last.tap) taps++;
    if (last.done) dones++;
  }
  ok("not ready: it rests on the card", last.T === HOLD_AT && dones === 0);
  ok("one tap, at the pickup", taps === 1 && c.tapped);
  ok("the hold was noted", c.holdAt !== null && c.holdAt >= HOLD_AT * 1000);
  ok("past WAIT_MS the card says she is still flying", travelCardLine({ reduce: false, T: last.T, ready: false, heldForMs: 10_000 - (c.holdAt ?? 0), beat: last.beat }) === "wait");
  // the send lands
  let endAt = -1;
  let heldThrough = true;
  for (let ms = 10_016; ms <= 14_000; ms += 16) {
    const s = stepTravel(c, ms, true);
    if (s.done) {
      dones++;
      endAt = ms;
    }
    if (ms < 10_016 + DONE_MS - 16 && s.T !== HOLD_AT) heldThrough = false;
  }
  ok("landed: still held while the card says so", heldThrough);
  ok("landed: the card says so for DONE_MS, then the fade, then one end", dones === 1 && endAt >= 10_016 + DONE_MS && endAt <= 10_016 + DONE_MS + 180 + 32);
}
{
  const c = newTravelClock(0);
  let endAt = -1;
  for (let ms = 0; ms <= 8000; ms += 16) {
    const s = stepTravel(c, ms, true);
    if (s.done) endAt = ms;
  }
  ok("ready from the start: still rests DONE_MS on the card", endAt >= HOLD_AT * 1000 + DONE_MS && endAt <= HOLD_AT * 1000 + DONE_MS + 180 + 32);
}
{
  const c = newTravelClock(0);
  const a = stepTravel(c, 4000, false);
  const b = stepTravel(c, 4000, false);
  ok("stepping twice at the same moment changes nothing", a.T === b.T && c.pauseAt === 4000 && c.holdAt === 4000);
  restartTravelClock(c, 5000);
  ok("a restart keeps the hold and the tap", c.holdAt === 4000 && c.tapped && c.t0 === 5000 && c.paused === 0 && c.pauseAt === null);
}

/* ── the card's line ── */
ok("not at the card: the usual line", travelCardLine({ reduce: false, T: 2, ready: true, heldForMs: 0, beat: 2 }) === null);
ok("at the card and landed: sent", travelCardLine({ reduce: false, T: HOLD_AT, ready: true, heldForMs: 0, beat: 4 }) === "done");
ok("at the card, short rest: the usual line", travelCardLine({ reduce: false, T: HOLD_AT, ready: false, heldForMs: WAIT_MS - 1, beat: 4 }) === null);
ok("Reduce Motion is always at the card", travelCardLine({ reduce: true, T: STILL_T, ready: true, heldForMs: 0, beat: 0 }) === "done");
ok("Reduce Motion with the clock still: never 'still flying' (as React Native)", travelCardLine({ reduce: true, T: STILL_T, ready: false, heldForMs: 0, beat: 0 }) === null);

if (fails) {
  console.log(`${fails} failed`);
  process.exit(1);
}
console.log("all ok");
