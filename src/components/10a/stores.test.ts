/* Behaviour lock for the two small stores behind Wren's once-lines
   (components/10a/once-store, used by WrenSaysOnce) and her desk
   (components/10a/desk-store, used by WrenDesk). Not wired to a runner;
   run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/components/10a/stores.test.ts
   Both stores import nothing; the flags, the ledger and the network are
   stand-ins here, with promises this file resolves in whatever order a
   case needs. Every line prints ok/FAIL and the process exits non-zero if
   any fail. */

import { createOnceStore, onceFlag } from "./once-store.ts";
import { createDeskStore } from "./desk-store.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/* a promise resolved from outside, to put answers in a chosen order */
function later<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/* ── once-lines ───────────────────────────────────────────────────────── */

function onceRig(flags: Record<string, boolean> = {}) {
  const spent: string[] = [];
  const warned: unknown[] = [];
  let reads = 0;
  const pending: ReturnType<typeof later<Record<string, boolean>>>[] = [];
  const store = createOnceStore({
    read: () => { reads++; const l = later<Record<string, boolean>>(); pending.push(l); return l.promise; },
    spend: (n) => { spent.push(n); flags[n] = true; },
    warn: (_m, e) => warned.push(e),
  });
  const answer = async () => { for (const l of pending.splice(0)) l.resolve({ ...flags }); await tick(); };
  return { store, spent, warned, reads: () => reads, answer, pending };
}

{
  const r = onceRig();
  ok("undecided: hidden", !r.store.visible("kindreds"));
  r.store.decide("kindreds");
  await r.answer();
  ok("first visit: the line shows", r.store.visible("kindreds"));
  ok("…and the flag is spent once", r.spent.join() === onceFlag("kindreds") && onceFlag("kindreds") === "said2:kindreds");
  r.store.decide("kindreds");
  ok("a remount in the same session doesn't ask again", r.reads() === 1);
  ok("…and still shows it", r.store.visible("kindreds"));
}
{
  const r = onceRig({ "said2:sealed": true });
  r.store.decide("sealed");
  await r.answer();
  ok("a line already said stays quiet", !r.store.visible("sealed") && r.spent.length === 0);
}
{
  // React's development double mount: the first pass is torn down before the flags answer
  const r = onceRig();
  const cancelFirst = r.store.decide("sealed");
  cancelFirst();
  r.store.decide("sealed");
  await r.answer();
  ok("double mount: the line still shows (the first pass didn't eat it)", r.store.visible("sealed"));
  ok("double mount: the flag is spent exactly once", r.spent.length === 1);
}
{
  const r = onceRig();
  const cancel = r.store.decide("sealed");
  cancel(); // left the screen before the flags answered
  await r.answer();
  ok("gone before the answer: nothing decided, nothing spent", !r.store.visible("sealed") && r.spent.length === 0);
  r.store.decide("sealed");
  await r.answer();
  ok("…so the next visit still gets the line", r.store.visible("sealed") && r.spent.length === 1);
}
{
  const r = onceRig();
  r.store.decide("kindreds");
  await r.answer();
  ok("not enabled (nothing to show it beside): reported hidden", !r.store.visible("kindreds", false));
  let told = 0;
  const off = r.store.subscribe(() => told++);
  r.store.dismiss("kindreds");
  ok("a tap closes it", !r.store.visible("kindreds"));
  ok("…for every later mount this session", (r.store.decide("kindreds"), !r.store.visible("kindreds")));
  ok("…and the screens are told", told === 1);
  r.store.dismiss("kindreds");
  ok("closing it twice tells nobody twice", told === 1);
  off();
}
{
  const r = onceRig();
  r.store.decide("a");
  r.store.decide("b");
  await r.answer();
  r.store.dismiss("a");
  ok("lines are independent", !r.store.visible("a") && r.store.visible("b"));
}
{
  const r = onceRig();
  const v0 = r.store.version();
  r.store.decide("x");
  r.pending[0].reject(new Error("storage"));
  await tick();
  ok("unreadable flags: quiet, logged, nothing spent", !r.store.visible("x") && r.warned.length === 1 && r.spent.length === 0 && r.store.version() === v0);
}

/* ── her desk ─────────────────────────────────────────────────────────── */

type Post = { id: number };
const posts = (n: number): Post[] => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

function deskRig(ledger: Record<string, number> = {}) {
  const published: number[] = [];
  const ledgers: ReturnType<typeof later<Record<string, number>>>[] = [];
  let auto = true;
  const store = createDeskStore<Post>({
    readLedger: () => {
      if (auto) return Promise.resolve({ ...ledger });
      const l = later<Record<string, number>>();
      ledgers.push(l);
      return l.promise;
    },
    unread: (l, count) => ("wren" in l ? Math.max(0, count - l.wren) : count),
    publish: (n) => published.push(n),
  });
  return { store, published, ledgers, manual: () => { auto = false; } };
}

{
  const r = deskRig({ wren: 2 });
  ok("before anything answers: empty, not loaded", r.store.read().posts.length === 0 && !r.store.read().loaded);
  const cache = later<Post[]>();
  const net = later<Post[] | null>();
  const done = r.store.refresh({ cache: () => cache.promise, fetch: () => net.promise });
  cache.resolve(posts(3));
  await tick();
  ok("the phone's copy shows first", r.store.read().posts.length === 3 && r.store.read().loaded && r.store.read().unread === 1);
  net.resolve(posts(5));
  await done;
  ok("then the network's posts replace it", r.store.read().posts.length === 5 && r.store.read().unread === 3);
  ok("each answer went to the tab's number", r.published.join() === "1,3");
}
{
  const r = deskRig();
  const cache = later<Post[]>();
  const net = later<Post[] | null>();
  const done = r.store.refresh({ cache: () => cache.promise, fetch: () => net.promise });
  net.resolve(posts(4));
  await tick();
  cache.resolve(posts(2));
  await done;
  ok("a copy read after the network answered is ignored", r.store.read().posts.length === 4 && r.published.join() === "4");
}
{
  // both answers start, and the copy's ledger read finishes last
  const r = deskRig();
  r.manual();
  const cache = later<Post[]>();
  const net = later<Post[] | null>();
  const done = r.store.refresh({ cache: () => cache.promise, fetch: () => net.promise });
  cache.resolve(posts(2));
  await tick();
  net.resolve(posts(6));
  await tick();
  ok("two ledger reads in flight", r.ledgers.length === 2);
  r.ledgers[1].resolve({}); // the network's answer
  await tick();
  r.ledgers[0].resolve({}); // the copy's, late
  await done;
  ok("the answer started last wins, whatever order the ledger answers in", r.store.read().posts.length === 6 && r.published.join() === "6");
}
{
  const r = deskRig();
  await r.store.refresh({ cache: async () => posts(2), fetch: async () => null, fallback: () => posts(9) });
  ok("offline: the copy stays, and the fallback isn't used over it", r.store.read().posts.length === 2);
}
{
  const r = deskRig();
  await r.store.refresh({ cache: async () => [], fetch: async () => null, fallback: () => posts(1) });
  ok("offline with nothing on the phone: the fallback (dev's demo)", r.store.read().posts.length === 1 && r.store.read().unread === 1);
}
{
  const r = deskRig();
  await r.store.refresh({ cache: async () => [], fetch: async () => null });
  ok("offline, nothing anywhere, no fallback: still empty and not loaded", r.store.read().posts.length === 0 && !r.store.read().loaded && r.published.length === 0);
}
{
  const warned: unknown[] = [];
  const store = createDeskStore<Post>({ readLedger: async () => ({}), unread: (_l, c) => c, publish: () => {}, warn: (_m, e) => warned.push(e) });
  await store.refresh({ cache: async () => { throw new Error("disk"); }, fetch: async () => { throw new Error("net"); } });
  ok("a failing copy and network are logged, not thrown", warned.length === 2 && !store.read().loaded);
}
{
  const r = deskRig({ wren: 1 });
  let told = 0;
  const off = r.store.subscribe(() => told++);
  await r.store.settle(posts(3));
  ok("a settled answer tells every screen and counts against the ledger", told === 1 && r.store.read().unread === 2);
  off();
  await r.store.settle(posts(4));
  ok("an unsubscribed screen isn't told", told === 1);
}
{
  const r = deskRig();
  await r.store.settle(posts(2));
  ok("never opened her desk: every post is unread", r.store.read().unread === 2);
}

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
