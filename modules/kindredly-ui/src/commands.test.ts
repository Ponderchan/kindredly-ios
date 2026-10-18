/* Behaviour lock for the command queue, the channel useKCommands keeps, and the rev counter
   (src/commands.ts). Not wired to a runner; run by hand from the repo root with plain node
   (it strips the types itself from Node 22.18 / 23.6 on):
     node modules/kindredly-ui/src/commands.test.ts */

import { createCommandChannel, createCommandQueue, isViewNotFound, nextRev } from "./commands.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };

type Call = { name: string; args: Record<string, unknown> };
const target = (calls: Call[], result: () => Promise<void> = () => Promise.resolve()) => ({
  command(name: string, args: Record<string, unknown>) { calls.push({ name, args }); return result(); },
});
const names = (calls: Call[]) => calls.map((c) => c.name).join(",");
// a view not heard from yet gets its queue one command at a time (each after the one before
// lands), so a check after several commands lets the promises settle first
const settle = () => new Promise((r) => setTimeout(r, 0));

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
  ok("flush sends the first at once, the rest after it lands", names(calls) === "focus");
  await settle();
  ok("flush sends everything, in order", names(calls) === "focus,setText" && q.size === 0);
  ok("args arrive untouched", calls[1].args.value === "hi" && calls[1].args.target === "reply");
}

{
  const q = createCommandQueue();
  const calls: Call[] = [];
  q.send(target(calls), "blur", {});
  ok("a view and an empty queue → sent at once", names(calls) === "blur");
  await settle();
  ok("…and off the queue once it lands", q.size === 0);
}

{
  const q = createCommandQueue();
  const calls: Call[] = [];
  q.send(null, "a", {});
  q.send(target(calls), "b", {});
  await settle();
  ok("a send behind a queue goes out after it, never before", names(calls) === "a,b" && q.size === 0);
}

{
  const q = createCommandQueue(3);
  for (const n of ["1", "2", "3", "4", "5"]) q.send(null, n, {});
  const calls: Call[] = [];
  q.flush(target(calls));
  await settle();
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

/* THE CHANNEL, driven the way React drives it: attach(view) is the ref callback (called in the
   VIEW's commit, which under NativeSurface is not a commit of the screen), commit() runs after
   each commit of the screen, mount()/unmount() with the screen. */

type Log = string[];
// A view like expo's: command() is a prototype method that only works called on the view, so a
// detached call is caught here as "unbound".
class FakeView {
  // plain fields: node's type stripping doesn't take parameter properties
  id: string;
  log: Log;
  constructor(id: string, log: Log) {
    this.id = id;
    this.log = log;
  }
  command(name: string, args: Record<string, unknown>) {
    if (!(this instanceof FakeView)) throw new Error("unbound");
    this.log.push(`${this.id}:${name}${typeof args.value === "string" ? "=" + args.value : ""}`);
    return Promise.resolve();
  }
}
const handleRef = () => ({ current: null as FakeView | null });

{
  // the NativeSurface case: the screen mounts and commits with no view yet, sends from a mount
  // effect, and the view attaches later in a commit of NativeSurface alone
  const log: Log = [];
  const ref = handleRef();
  const ch = createCommandChannel({ ref, blurOnUnmount: true });
  ch.mount();
  ch.commit();
  ch.send("setText", { target: "body", value: "draft" });
  ch.send("focus", { target: "body" });
  ok("no view yet → nothing sent", log.length === 0);
  const view = new FakeView("v1", log);
  ch.attach(view);
  await settle();
  ok("attach alone sends what waited, in order (no send, flush or commit)", log.join(",") === "v1:setText=draft,v1:focus");
  ok("attach fills the RefObject", ref.current === view);
  ch.commit();
  ok("the screen's next commit sends nothing twice (no stale setText over typed words)", log.length === 2);
  ch.send("scrollTo", { key: "end" });
  ok("with the view attached a send goes at once", log.at(-1) === "v1:scrollTo");
}

{
  const log: Log = [];
  const ref = handleRef();
  const ch = createCommandChannel({ ref, onViewAttach: () => log.push("reseed") });
  ch.send("setText", { target: "body", value: "old" });
  const v1 = new FakeView("v1", log);
  ch.attach(v1);
  ok("onViewAttach runs once for a new view, after the queue went out", log.join(",") === "v1:setText=old,reseed");
  ch.commit();
  ok("…not again on the screen's commits", log.filter((l) => l === "reseed").length === 1);
  // a frozen screen: React detaches and reattaches the same instance
  ch.attach(null);
  ch.send("focus", { target: "body" });
  ch.attach(v1);
  await settle();
  ok("the same view attached again: its queue goes out, no reseed", log.join(",") === "v1:setText=old,reseed,v1:focus");
  // a NativeSurface swap: the old view goes, a new one comes
  ch.attach(null);
  ch.send("scrollTo", { key: "end" });
  const v2 = new FakeView("v2", log);
  ch.attach(v2);
  await settle();
  ok("a remounted view gets what was sent meanwhile, then the reseed", log.slice(-2).join(",") === "v2:scrollTo,reseed");
}

{
  const log: Log = [];
  const ref = handleRef();
  const ch = createCommandChannel({ ref });
  ch.configure({ ref, onViewAttach: () => log.push("latest") });
  ch.attach(new FakeView("v", log));
  ok("configure: the latest onViewAttach is the one called", log.join(",") === "latest");
}

{
  // blur on the way out, once per view
  const log: Log = [];
  const ref = handleRef();
  const ch = createCommandChannel({ ref, blurOnUnmount: true });
  ch.mount();
  const v1 = new FakeView("v1", log);
  ch.attach(v1);
  ch.attach(null);
  ok("the view alone unmounting (a NativeSurface swap) is blurred", log.join(",") === "v1:blur");
  ok("detach empties the RefObject", ref.current === null);
  ch.unmount();
  ok("…and the screen unmounting after doesn't blur it again", log.join(",") === "v1:blur");
}

{
  // a real deletion: the screen's layout cleanup runs before its child's ref detaches
  const log: Log = [];
  const ref = handleRef();
  const ch = createCommandChannel({ ref, blurOnUnmount: true });
  ch.mount();
  ch.attach(new FakeView("v1", log));
  ch.unmount();
  ch.attach(null);
  ok("screen unmount then ref detach → one blur", log.join(",") === "v1:blur");
}

{
  // a frozen screen comes back and later freezes again: blurred each time
  const log: Log = [];
  const ref = handleRef();
  const ch = createCommandChannel({ ref, blurOnUnmount: true });
  ch.mount();
  const v1 = new FakeView("v1", log);
  ch.attach(v1);
  ch.unmount();
  ch.attach(null);
  ch.attach(v1);
  ch.mount();
  ch.unmount();
  ch.attach(null);
  ok("hidden, shown, hidden again → blurred twice, once each time", log.join(",") === "v1:blur,v1:blur");
}

{
  const log: Log = [];
  const ref = handleRef();
  const ch = createCommandChannel({ ref });
  ch.mount();
  ch.attach(new FakeView("v1", log));
  ch.attach(null);
  ch.unmount();
  ok("without blurOnUnmount nothing is blurred", log.length === 0);
}

{
  // a view handed the bare RefObject: React fills ref.current, the screen's commit is the backstop
  const log: Log = [];
  const ref = handleRef();
  const ch = createCommandChannel({ ref, onViewAttach: () => log.push("reseed") });
  ch.send("setText", { target: "body", value: "x" });
  ref.current = new FakeView("v1", log);
  ok("bare RefObject: nothing goes out before the screen commits", log.length === 0);
  ch.commit();
  ok("…then the commit sends the queue and reseeds", log.join(",") === "v1:setText=x,reseed");
}

{
  const ref = handleRef();
  const before = warned;
  const ch = createCommandChannel({ ref, onViewAttach: () => { throw new Error("boom"); } });
  let threw = false;
  try {
    ch.attach(new FakeView("v1", []));
  } catch {
    threw = true;
  }
  ok("a throwing onViewAttach is logged, never thrown into React's commit", !threw && warned - before === 1);
}

{
  // every call above went through FakeView.command, which throws when unbound; a warning here
  // would mean some path called command() detached
  const log: Log = [];
  const ref = handleRef();
  const before = warned;
  const ch = createCommandChannel({ ref, blurOnUnmount: true });
  ch.send("focus", { target: "body" });
  ch.attach(new FakeView("v1", log));
  ch.send("blur", {});
  await settle();
  ch.unmount();
  ok("every command is called as a method on the view (expo needs `this`)", warned === before && log.length === 3);
}

/* A VIEW STILL ON ITS WAY (2026-10-18): under Fabric the ref can attach before the main thread has
   mounted the view, and expo rejects with SwiftUIViewNotFound. The queue tries the same command
   again a frame later until one lands, keeps the order, then sends at once. */
const NOT_FOUND = () => Object.assign(new Error("Unable to find the 'KComposeView' view with tag '512'"), { code: "ERR_SWIFT_UI_VIEW_NOT_FOUND" });
const fast = { retryMs: 0, retries: 5, schedule: (fn: () => void) => void setTimeout(fn, 0) };
const until = async (cond: () => boolean) => {
  for (let i = 0; i < 50 && !cond(); i++) await settle();
};

ok("expo's not-found is recognised by message or code", isViewNotFound(NOT_FOUND()) && isViewNotFound({ code: "ERR_SWIFT_UI_VIEW_NOT_FOUND" }) && !isViewNotFound(new Error("no view")));

{
  // mounted on the third try: every command arrives once, in order, none lost
  const q = createCommandQueue(100, fast);
  const calls: Call[] = [];
  let mountedAfter = 2;
  const view = target(calls, () => (mountedAfter-- > 0 ? Promise.reject(NOT_FOUND()) : Promise.resolve()));
  const before = warned;
  q.send(null, "composer", { line: "Wren" });
  q.send(null, "setText", { target: "body", value: "draft" });
  q.send(null, "focus", { target: "body" });
  q.flush(view);
  await until(() => q.size === 0);
  ok("a view not mounted yet: the head is tried again until it lands", names(calls) === "composer,composer,composer,setText,focus");
  ok("…nothing dropped, nothing logged", q.size === 0 && warned === before);
  q.send(view, "scrollTo", { key: "end" });
  ok("once it answered, a send goes out at once (typing never waits)", calls.at(-1)?.name === "scrollTo");
}

{
  // sends made while the head is retrying wait behind it
  const q = createCommandQueue(100, fast);
  const calls: Call[] = [];
  let mountedAfter = 1;
  const view = target(calls, () => (mountedAfter-- > 0 ? Promise.reject(NOT_FOUND()) : Promise.resolve()));
  q.send(view, "composer", {});
  q.send(view, "focus", {});
  await until(() => q.size === 0);
  ok("a send during the retry goes after the retried one", names(calls) === "composer,composer,focus");
}

{
  // a view that never mounts: the queue goes after the retries, said once
  const q = createCommandQueue(100, fast);
  const calls: Call[] = [];
  const before = warned;
  const view = target(calls, () => Promise.reject(NOT_FOUND()));
  q.send(view, "a", {});
  q.send(view, "b", {});
  await until(() => q.size === 0);
  ok("a view that never mounts: tried retries + 1 times, then the queue is dropped", calls.length === 6 && q.size === 0 && warned - before === 1);
}

{
  // another failure means the view answered: it counts as there, the rest go at once
  const q = createCommandQueue(100, fast);
  const calls: Call[] = [];
  let first = true;
  const view = target(calls, () => (first ? ((first = false), Promise.reject(new Error("bad args"))) : Promise.resolve()));
  const before = warned;
  q.send(view, "a", {});
  q.send(view, "b", {});
  await until(() => q.size === 0);
  ok("a command that fails for another reason is logged and dropped, not retried", names(calls) === "a,b" && warned - before === 1);
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
