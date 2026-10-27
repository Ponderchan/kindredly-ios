/* growth-moment-core: when the growing-up moment shows. Run by hand: node src/lib/growth-moment-core.test.ts */
import { GROWTH_BEATS, GROWTH_BURST, GROWTH_CURVES, GROWTH_SHAKE, GROWTH_SIZE, asStage, growthToShow, growthWords } from "./growth-moment-core.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };

ok("nothing seen yet: a baseline, no moment", growthToShow("wren", null).moment === null && growthToShow("wren", null).seen === "wren");
ok("the same stage: nothing", growthToShow("fledge", "fledge").moment === null);
ok("fledged since: hatch → fledge", JSON.stringify(growthToShow("fledge", "hatch").moment) === '{"from":"hatch","to":"fledge"}');
ok("grown since: fledge → wren", JSON.stringify(growthToShow("wren", "fledge").moment) === '{"from":"fledge","to":"wren"}');
ok("two at once: one moment, from the form last seen", JSON.stringify(growthToShow("wren", "hatch").moment) === '{"from":"hatch","to":"wren"}');
ok("from an egg: drawn from the hatchling", growthToShow("fledge", "egg").moment?.from === "hatch");
ok("hatching has no moment of its own", growthToShow("hatch", "egg").moment === null && growthToShow("hatch", "egg").seen === "hatch");
ok("never backwards", growthToShow("hatch", "wren").moment === null && growthToShow("hatch", "wren").seen === "wren");
ok("the moment marks the stage seen", growthToShow("wren", "fledge").seen === "wren");
ok("a junk store reads as nothing", asStage("adult") === null && asStage(3) === null && asStage("fledge") === "fledge");

/* the moment itself, shared by the React Native scene and the SwiftUI one */
{
  const tk = (k: string) => ({ "grow.line.wren": "All grown up.", "grow.line.fledge": "My wings hold.", "wren.name.grown": "Grown", "wren.name.fledge": "Fledgling" })[k] ?? k;
  const grown = growthWords({ from: "fledge", to: "wren" }, tk, "Oct.27");
  ok("words: her line for growing up", grown.line === "All grown up.");
  ok("words: the stamp is the stage and the day, in capitals", grown.mark === "GROWN · OCT.27");
  ok("words: fledging has its own line and stage", growthWords({ from: "hatch", to: "fledge" }, tk, "Oct.27").mark === "FLEDGLING · OCT.27" && growthWords({ from: "hatch", to: "fledge" }, tk, "x").line === "My wings hold.");
  ok("sizes: each form larger than the last", GROWTH_SIZE.hatch < GROWTH_SIZE.fledge && GROWTH_SIZE.fledge < GROWTH_SIZE.wren && GROWTH_SIZE.egg === GROWTH_SIZE.hatch);
  const b = GROWTH_BEATS;
  ok("beats: the shake is over before the old form gives way", b.shakeAt + GROWTH_SHAKE.length * b.shakeStep <= b.outAt);
  ok("beats: the shake ends where it began", GROWTH_SHAKE[GROWTH_SHAKE.length - 1] === 0);
  ok("beats: the haptic lands while the new form pops in", b.hapticAt >= b.popAt && b.hapticAt <= b.popAt + b.popMs);
  ok("beats: then the stamp, then the words, then the bob", b.popAt + b.popMs <= b.stampAt && b.stampAt < b.wordsAt && b.wordsAt + b.wordsMs <= b.bobAt);
  ok("beats: about two seconds in all", b.wordsAt + b.wordsMs >= 2000 && b.wordsAt + b.wordsMs <= 2600);
  ok("curves: four numbers each, x inside 0…1", Object.values(GROWTH_CURVES).every((c) => c.length === 4 && c[0] >= 0 && c[0] <= 1 && c[2] >= 0 && c[2] <= 1));
  ok("burst: fourteen pieces", GROWTH_BURST === 14);
}

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
