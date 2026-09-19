import { firstWord } from "./first-word";

/* her first word: a repeated word beats a long one; furniture never speaks */
let fails = 0;
const ok = (name: string, cond: boolean) => {
  if (!cond) fails++;
  console.log(`${cond ? "ok " : "FAIL"} ${name}`);
};

ok("a word used twice wins", firstWord(["the kettle clicks off", "i said fine. the kettle again."]) === "kettle");
ok("otherwise the longest real word", firstWord(["i keep rehearsing conversations i will never have"]) === "conversations");
ok("stop words never speak", firstWord(["something about because"]) === null);
ok("too short to say anything", firstWord(["ok.", "no"]) === null);
ok("keeps the writer's casing", firstWord(["Nobody calls. Nobody."]) === "Nobody");
ok("chinese: a two-character word", firstWord(["我一直在排练永远不会发生的对话"]) !== null);
ok("chinese: repeated piece wins", firstWord(["水壶响了", "水壶又响了"]) === "水壶");
ok("apostrophes stay inside", firstWord(["i couldn't say it"]) === "couldn't");
ok("empty is nothing", firstWord([]) === null);

console.log(fails ? `${fails} failing` : "all ok");
process.exit(fails ? 1 : 0);
