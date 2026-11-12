/* The day's ration (lib/ration): ten on the desk, matched first, one letter per writer.
   node --experimental-strip-types src/lib/ration.test.ts */
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const R = await import("./ration.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

type L = { id: string; author: string | null; close?: number };
const pool: L[] = Array.from({ length: 30 }, (_, i) => ({ id: "l" + i, author: "w" + i }));

ok("ten on the desk", R.DAY_LETTERS === 10 && R.rationPool(pool).length === 10);
const six = pool.slice(0, 6);
ok("a small pool with no repeats comes back as it was", R.rationPool(six) === six);
const busy: L[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ id: "b" + i, author: "busy" })),
  ...Array.from({ length: 20 }, (_, i) => ({ id: "o" + i, author: "o" + i })),
];
const dealt = R.rationPool(busy);
ok("one letter per writer", dealt.filter((l) => l.author === "busy").length === 1 && dealt.length === 10);
const small: L[] = [{ id: "a1", author: "a" }, { id: "a2", author: "a" }, { id: "c1", author: "c" }];
ok("a small pool loses its writer's second letter too", R.rationPool(small).length === 2);
const matched: L[] = [...pool.slice(0, 20), { id: "m1", author: "m", close: 0.9 }, { id: "m2", author: "m", close: 0.9 }];
const withMatch = R.rationPool(matched);
ok("the matched writer comes first, once", withMatch[0].author === "m" && withMatch.filter((l) => l.author === "m").length === 1);
ok("a ghost's letter (no author) is not folded into anyone", R.rationPool([{ id: "g1", author: null }, { id: "g2", author: null }]).length === 2);

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
