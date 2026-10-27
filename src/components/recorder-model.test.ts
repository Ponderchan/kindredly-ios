/* Behaviour lock for the recording bar (components/recorder-model): its phase, its clock, its
   bars and its height, the same for both renderers. Not wired to a runner; run by hand from the
   repo root with plain node (it strips the types itself from Node 22.18 / 23.6 on):
     node src/components/recorder-model.test.ts */

import { RECORDER_BARS, RECORDING, recorderBar, recorderBarHeights, recorderClock, recorderHeight, recorderPhase, type RecorderWords } from "./recorder-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const words: RecorderWords = { record: "Record", stop: "Stop recording", discard: "Delete recording", time: (t, max) => `${t} of ${max}` };

ok("the red is the old ember", RECORDING === "#D66C3E");
ok("twenty bars", RECORDER_BARS.length === 20);
ok("clock m:ss", recorderClock(0) === "0:00" && recorderClock(9.9) === "0:09" && recorderClock(65) === "1:05" && recorderClock(180) === "3:00");
ok("clock never negative", recorderClock(-4) === "0:00" && recorderClock(NaN) === "0:00");

ok("idle with nothing kept", recorderPhase(false, null) === "idle");
ok("recording wins over a kept take", recorderPhase(true, "file:///a.m4a") === "recording");
ok("a take while not recording is done", recorderPhase(false, "file:///a.m4a") === "done");

const still = recorderBarHeights("idle", 7);
ok("bars still at rest", still.every((h, i) => h === RECORDER_BARS[i]));
ok("bars still for a take", recorderBarHeights("done", 7).every((h, i) => h === RECORDER_BARS[i]));
const moving = recorderBarHeights("recording", 3);
ok("bars move while recording", moving.some((h, i) => h !== RECORDER_BARS[i]));
ok("bars move by sin((dur + i) × .6) × 4", Math.abs(moving[2] - (22 + Math.sin(5 * 0.6) * 4)) < 1e-9);
ok("bars stay within 4 of rest", moving.every((h, i) => Math.abs(h - RECORDER_BARS[i]) <= 4));

ok("height: the card face carries its edge", recorderHeight("idle") === 76 && recorderHeight("recording") === 76);
ok("height: the take has none", recorderHeight("done") === 74);

const idle = recorderBar({ recording: false, doneUri: null, dur: 0, maxS: 180 }, words);
ok("idle clock reads 0:00 / 3:00", idle.clock === "0:00 / 3:00");
ok("idle time for VoiceOver", idle.timeA11y === "0:00 of 3:00");
ok("labels pass through", idle.recordLabel === "Record" && idle.stopLabel === "Stop recording" && idle.discardLabel === "Delete recording");

const rec = recorderBar({ recording: true, doneUri: null, dur: 12, maxS: 180 }, words);
ok("recording clock runs", rec.phase === "recording" && rec.clock === "0:12 / 3:00" && rec.timeA11y === "0:12 of 3:00");

const done = recorderBar({ recording: false, doneUri: "file:///a.m4a", dur: 0, doneDur: 34, maxS: 180 }, words);
ok("the take shows its own length", done.phase === "done" && done.clock === "0:34");
ok("a take with no length reads 0:00", recorderBar({ recording: false, doneUri: "x", dur: 0, maxS: 180 }, words).clock === "0:00");

if (fails) {
  console.log(`${fails} failed`);
  process.exit(1);
}
console.log("all ok");
