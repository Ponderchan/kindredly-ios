import { rungOf } from "./aura-ladder";
import type { Aura } from "./aura";

/* the seven rungs, from the aura's counted facts */
let fails = 0;
const ok = (name: string, cond: boolean) => {
  if (!cond) fails++;
  console.log(`${cond ? "ok " : "FAIL"} ${name}`);
};
const st = (id: string, dimension: string, state: "emerging" | "established", supporting = 4, eligible = 5) => ({ stickerId: id, dimension, state, supporting, eligible });
const aura = (phase: Aura["phase"], letters: number, home: ReturnType<typeof st>[] = []): Aura =>
  ({ phase, sources: { letters, sealed: 0, conversations: 0 }, stickers: { home, byDimension: Object.fromEntries(home.map((h) => [h.dimension, h])) } }) as unknown as Aura;

ok("nothing written → 0, lines", JSON.stringify([rungOf(aura("empty", 0)).level, rungOf(aura("empty", 0)).fidelity]) === '[0,"lines"]');
ok("one letter → 1, lines", rungOf(aura("forming", 1)).level === 1);
ok("three letters, nothing holds → 2, pencil", JSON.stringify([rungOf(aura("forming", 3)).level, rungOf(aura("forming", 3)).fidelity]) === '[2,"pencil"]');
ok("fifteen letters, nothing holds → still 2", rungOf(aura("forming", 15)).level === 2);
const r3 = rungOf(aura("shaping", 5, [st("detail_collector", "vocabulary", "established"), st("straight_shooter", "sentence", "emerging")]));
ok("one stuck → 3, sketch, 1 stuck, slips 4 of 5", r3.level === 3 && r3.fidelity === "sketch" && r3.stuck === 1 && r3.slips?.n === 4 && r3.slips.of === 5);
ok("three stuck, no name → 4", rungOf(aura("clearing", 7, [st("a", "vocabulary", "established"), st("b", "sentence", "established"), st("c", "emotion", "established")])).level === 4);
const r5 = rungOf(aura("formed", 14, [st("a", "vocabulary", "established"), st("b", "sentence", "established"), st("c", "emotion", "established")]));
ok("named → 5, colour, five ticks", r5.level === 5 && r5.fidelity === "colour" && r5.ticks === 5);
const r6 = rungOf(aura("formed", 20, [st("a", "vocabulary", "established"), st("b", "sentence", "emerging"), st("c", "emotion", "established")]));
ok("named with one trying → 6, changing 1", r6.level === 6 && r6.changing === 1);
console.log(fails ? `\n${fails} failing` : "\nall ok");
process.exit(fails ? 1 : 0);
