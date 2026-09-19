import { FACE_OF_MOTION, MOTION_OF_DIM, MOTION_S, layerOf, pickMotion, poseAt, REST, splitSides } from "./chick-motions";
import type { DimKey, DimScore } from "./hatch-engine";
import { WREN_FAMILY } from "../components/wren-family-data";

/* her habits come from the read; the rig tells her parts apart by shape */
let fails = 0;
const ok = (name: string, cond: boolean) => {
  if (!cond) fails++;
  console.log(`${cond ? "ok " : "FAIL"} ${name}`);
};

const dim = (key: DimKey, score: number, locked = false): DimScore => ({ key, label: key, score, locked, line: "", sealed: "" } as DimScore);
const KEYS: DimKey[] = ["vocabulary", "sentence", "rhythm", "perspective", "emotion", "function", "punctuation", "structure", "quirks"];

ok("every dimension owns a motion", KEYS.every((k) => !!MOTION_OF_DIM[k]));
ok("every motion has a length and a face entry", (Object.keys(MOTION_S) as (keyof typeof MOTION_S)[]).every((m) => MOTION_S[m] > 0 && m in FACE_OF_MOTION));

// a strong, locked dimension wins most draws
{
  const dims = KEYS.map((k) => dim(k, k === "vocabulary" ? 90 : 20, k === "vocabulary"));
  let pecks = 0;
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 400; i++) if (pickMotion(dims, null, rnd) === "peck") pecks++;
  ok(`rare words → she pecks most of the time (${pecks}/400)`, pecks > 200);
  ok("but never only that", pecks < 380);
}
ok("never the same motion twice running", pickMotion([dim("rhythm", 100, true)], "hop") !== "hop");
ok("no read at all → she just looks about", pickMotion([]) === "look");

// the rig's layers, on the real export
{
  const list = WREN_FAMILY["wren-sticker-hatchling"].flatMap(splitSides);
  const count = (l: string) => list.filter((s) => layerOf(s) === l).length;
  ok("one body", count("body") === 1);
  ok("one tail, two wings, one belly, one feather", count("tail") === 1 && count("farWing") === 1 && count("nearWing") === 1 && count("belly") === 1 && count("feather") === 1);
  ok("a leg and a foot per side", count("legL") === 2 && count("legR") === 2);
  ok("the rest is her face", count("face") === list.length - 10);
}

// poses
ok("rest is nothing", poseAt(null, 0.5) === REST);
ok("a hop is highest in the middle", poseAt("hop", 0.5).all.includes("-14.00") && poseAt("hop", 0).all.includes("0.00"));
ok("the seed is there before the peck and gone after", poseAt("peck", 0.2).seed && !poseAt("peck", 0.8).seed);
ok("only the left foot lifts", poseAt("foot", 0.5).legL !== "" && poseAt("foot", 0.5).all === "");

console.log(fails ? `${fails} failing` : "all ok");
process.exit(fails ? 1 : 0);
