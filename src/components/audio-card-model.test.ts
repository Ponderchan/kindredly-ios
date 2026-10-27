/* Behaviour lock for the voice card (components/audio-card-model): its colours in the four
   themes, the Midnight mood fill, the system dress, the time and the lit bars, the same for both
   renderers. Not wired to a runner; run by hand from the repo root with plain node (it strips the
   types itself from Node 22.18 / 23.6 on):
     node src/components/audio-card-model.test.ts
   The model imports nothing, so the theme's values are written out here (src/theme/themes.json). */

import { AUDIO_BARS, audioCardHeight, audioCardLook, audioClock, moodFillOf, moodTime, type AudioCardInput } from "./audio-card-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const CLASSIC = { bg: "#FFFFFF", ind: "#3A34D6", lav2: "#EEEDFB", sub: "#55506E", line: "#E6E4EC" };
const MIDNIGHT = { bg: "#0F0E1C", ind: "#8E89FF", lav2: "#242150", sub: "#B9B5D0", line: "#2F2C4B" };
const MOODS = [
  ["#DDEFD6", "#2E7D4F"],
  ["#F6E7C6", "#B8842A"],
  ["#E4E2F4", "#3A34D6"],
  ["#CFE3F5", "#3B6E9B"],
] as const;
const INK = "#1E1B35";
const base = (over: Partial<AudioCardInput> = {}): AudioCardInput => ({
  theme: CLASSIC,
  dark: false,
  moods: MOODS,
  inkOnBrand: INK,
  playing: false,
  positionS: 0,
  durationS: 35,
  ...over,
});

ok("sixteen bars", AUDIO_BARS.length === 16);
ok("clock m:ss", audioClock(35) === "0:35" && audioClock(61.9) === "1:01" && audioClock(-1) === "0:00");

const rest = audioCardLook(base());
ok("chrome: ind disc, the page colour on it, lav2 panel", rest.ink === CLASSIC.ind && rest.glyph === CLASSIC.bg && rest.panel === CLASSIC.lav2 && rest.edge === "");
ok("at rest the time is the length", rest.time === "0:35");
ok("at rest the first bar is lit (0/16 <= 0), the rest dim", rest.bars[0].alpha === 0.9 && rest.bars.slice(1).every((b) => b.alpha === 0.3));
ok("full size: 44 disc, padding 14, round", rest.disc === 44 && rest.padding === 14 && rest.discRadius === 22 && rest.radius === 14 && rest.glyphSize === 15);
ok("the ▶ sits 2 right", rest.glyphNudge === 2);
ok("full bars", rest.bars.every((b, i) => b.h === AUDIO_BARS[i]));
ok("mono 600", rest.mono === "semibold");

const playing = audioCardLook(base({ playing: true, positionS: 17.5 }));
ok("playing: the running time", playing.time === "0:17");
ok("playing: half lit", playing.bars.filter((b) => b.alpha === 0.9).length === 9);
ok("the ❚❚ sits centred", playing.glyphNudge === 0);
const paused = audioCardLook(base({ playing: false, positionS: 10 }));
ok("paused part-way: where it stopped", paused.time === "0:10");
ok("never past the end", audioCardLook(base({ playing: true, positionS: 99 })).pct === 1);
ok("no length known: nothing lit past the first", audioCardLook(base({ durationS: 0, positionS: 4, playing: true })).pct === 0);

const compact = audioCardLook(base({ compact: true }));
ok("compact: 36 disc, padding 10, 13 glyph, bars at .75", compact.disc === 36 && compact.padding === 10 && compact.glyphSize === 13 && compact.bars[0].h === 9);

const tinted = audioCardLook(base({ tint: "#2E7D4F" }));
ok("a light theme keeps lav2 under a tint", tinted.panel === CLASSIC.lav2 && tinted.edge === "");
ok("a tint is content: its own disc, white glyph, its own time", tinted.ink === "#2E7D4F" && tinted.glyph === "#FFFFFF" && tinted.timeInk === "#2E7D4F");

const night = audioCardLook(base({ theme: MIDNIGHT, dark: true, tint: "#2E7D4F" }));
ok("Midnight: a mood ink sits on its own fill", night.panel === "#DDEFD6");
ok("Midnight: the time walked 35% to the brand ink, ringing the disc", night.timeInk === moodTime("#2E7D4F", INK) && night.edge === night.timeInk);
ok("Midnight: lit bars at full strength", night.bars[0].alpha === 1);
ok("moodTime of Calm", moodTime("#2E7D4F", INK) === "#285B46");
ok("moodTime leaves a non-hex alone", moodTime("transparent", INK) === "transparent");
ok("moodFillOf ignores case, null for a stranger", moodFillOf("#b8842a", MOODS) === "#F6E7C6" && moodFillOf("#123456", MOODS) === null);
ok("Midnight: the caller's own fill wins", audioCardLook(base({ theme: MIDNIGHT, dark: true, tint: "#2E7D4F", tintFill: "transparent" })).panel === "transparent");
ok("Midnight: a tint that isn't a mood ink keeps lav2", audioCardLook(base({ theme: MIDNIGHT, dark: true, tint: "#123456" })).panel === MIDNIGHT.lav2);
ok("Midnight without a tint: chrome", audioCardLook(base({ theme: MIDNIGHT, dark: true })).panel === MIDNIGHT.lav2);

const sys = audioCardLook(base({ system: true, tint: "#2E7D4F", playing: true, positionS: 17.5 }));
ok("system: pen disc, page glyph, no panel, square", sys.ink === CLASSIC.ind && sys.glyph === CLASSIC.bg && sys.panel === "transparent" && sys.radius === 0 && sys.discRadius === 0 && sys.padding === 0);
ok("system: ruled bars, pen lit and line after, full strength", sys.bars[0].color === CLASSIC.ind && sys.bars[15].color === CLASSIC.line && sys.bars.every((b) => b.alpha === 1) && sys.barRadius === 0);
ok("system: the time in sub, mono 400", sys.timeInk === CLASSIC.sub && sys.mono === "regular");

ok("heights", audioCardHeight(false, false) === 72 && audioCardHeight(true, false) === 56 && audioCardHeight(false, true) === 44 && audioCardHeight(true, true) === 36);

if (fails) {
  console.log(`${fails} failed`);
  process.exit(1);
}
console.log("all ok");
