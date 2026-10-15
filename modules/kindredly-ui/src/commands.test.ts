/* Behaviour lock for the command queue and the rev counter (src/commands.ts).
   Not wired to a runner; run by hand from the repo root with plain node
   (it strips the types itself from Node 22.18 / 23.6 on):
     node modules/kindredly-ui/src/commands.test.ts */

import { createCommandQueue, nextRev } from "./commands.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };

type Call = { name: string; args: Record<string, unknown> };
const target = (calls: Call[], result: () => Promise<void> = () => Promise.resolve()) => ({
  command(name: string, args: Record<string, unknown>) { calls.push({ name, args }); return result(); },
});
const names = (calls: Call[]) => calls.map((c) => c.name).join(",");

// warnings are expected in a few cases below; count them instead of printing them
let warned = 0;
const realWarn = console.warn;
console.warn = () => { warned++; };

{
  const q = createCommandQueue();
  const calls: Call[] = [];
  q.send(null, "focus", { target: "reply" });
  q.send(undefined, "setText", { target: "reply", value: "hi" });
  ok("no view yet → queued, nothing sent", q.size === 2 && calls.length === 0);
  q.flush(null);
  ok("flush without a view keeps the queue", q.size === 2);
  q.flush(target(calls));
  ok("flush sends everything, in order", names(calls) === "focus,setText" && q.size === 0);
  ok("args arrive untouched", calls[1].args.value === "hi" && calls[1].args.target === "reply");
}

{
  const q = createCommandQueue();
  const calls: Call[] = [];
  q.send(target(calls), "blur", {});
  ok("a view and an empty queue → sent at once", names(calls) === "blur" && q.size === 0);
}

{
  const q = createCommandQueue();
  const calls: Call[] = [];
  q.send(null, "a", {});
  q.send(target(calls), "b", {});
  ok("a send behind a queue goes out after it, never before", names(calls) === "a,b" && q.size === 0);
}

{
  const q = createCommandQueue(3);
  for (const n of ["1", "2", "3", "4", "5"]) q.send(null, n, {});
  const calls: Call[] = [];
  q.flush(target(calls));
  ok("past the limit the oldest go first", names(calls) === "3,4,5");
}

{
  const q = createCommandQueue();
  q.send(null, "x", {});
  q.clear();
  ok("clear drops the queue", q.size === 0);
}

{
  const q = createCommandQueue();
  const before = warned;
  let threw = false;
  try {
    q.send({ command: () => { throw new Error("boom"); } }, "x", {});
    q.send({} as never, "y", {});
  } catch {
    threw = true;
  }
  ok("a command that throws, or a view without command(), never throws out", !threw);
  ok("…and both are logged", warned - before === 2);
}

{
  const q = createCommandQueue();
  const calls: Call[] = [];
  const before = warned;
  q.send(target(calls, () => Promise.reject(new Error("no view"))), "x", {});
  await new Promise((r) => setTimeout(r, 0));
  ok("a rejected command is logged, not unhandled", warned - before === 1 && calls.length === 1);
}

{
  const a = [1], b = [2];
  const first = nextRev(null, [a, b]);
  ok("starts at 1", first.rev === 1);
  const same = nextRev(first, [a, b]);
  ok("same values → the same state, same rev", same === first && same.rev === 1);
  ok("a new identity bumps it", nextRev(first, [[1], b]).rev === 2);
  ok("a different count of values bumps it", nextRev(first, [a]).rev === 2);
  ok("Object.is: NaN is the same as NaN", nextRev(nextRev(null, [NaN]), [NaN]).rev === 1);
  ok("Object.is: 0 is not -0", nextRev(nextRev(null, [0]), [-0]).rev === 2);
  let s = first;
  for (let i = 0; i < 5; i++) s = nextRev(s, [[i]]);
  ok("it only goes up", s.rev === 6);
}

console.warn = realWarn;
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
if (fails) process.exit(1);
