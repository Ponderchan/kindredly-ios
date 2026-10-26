/* growth-moment-core: when the growing-up moment shows. Run by hand: node src/lib/growth-moment-core.test.ts */
import { asStage, growthToShow } from "./growth-moment-core.ts";

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

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
