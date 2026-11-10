/* Mute a correspondence, its rules (lib/thread-mute-model; owner's audit, 2026-11-10). Not wired
   to a runner; run by hand from the repo root with plain node (types stripped by Node itself; the
   hook below adds ".ts" to the app's extensionless imports):
     node src/lib/thread-mute-model.test.ts
   Who is offered the item (the switch, an account, a real thread, someone there), what the item
   says, and the optimistic book: a tap shows at once, a failed write falls back to what the
   server last said, a fresh read never undoes a tap on its way, and taps on one thread settle in
   order. */

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const M = await import("./thread-mute-model.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };
const same = (a: ReadonlySet<string>, b: string[]) => a.size === b.length && b.every((x) => a.has(x));

const T1 = "3f0c1a52-9b7e-4c1d-8a0f-5d2e6b7c8d90";
const T2 = "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const facts = { on: true, guest: false, demo: false, threadId: T1, someone: true };

/* ── who is offered it ── */
ok("the switch's key is threadmute", M.MUTE_SURFACE === "threadmute");
ok("switch on, an account, a real thread, someone there: offered", M.muteOffered(facts));
ok("the switch off: not offered (the menu is as it was)", !M.muteOffered({ ...facts, on: false }));
ok("a guest: not offered", !M.muteOffered({ ...facts, guest: true }));
ok("a demo thread: not offered", !M.muteOffered({ ...facts, demo: true }));
ok("a demo thread's id is no uuid: not offered even unflagged", !M.muteOffered({ ...facts, threadId: "demo-mira" }));
ok("no thread yet: not offered", !M.muteOffered({ ...facts, threadId: undefined }) && !M.muteOffered({ ...facts, threadId: null }) && !M.muteOffered({ ...facts, threadId: "" }));
ok("nobody on the other side (no ⋯): not offered", !M.muteOffered({ ...facts, someone: false }));

/* ── the item ── */
const t = (k: string) => k;
ok("ringing: Mute, with bell.slash", (() => { const r = M.muteRow(false, t); return r.label === "tm.mute" && r.icon === "bell.slash"; })());
ok("muted: Unmute, with bell", (() => { const r = M.muteRow(true, t); return r.label === "tm.unmute" && r.icon === "bell"; })());

/* ── the set ── */
{
  const none: ReadonlySet<string> = new Set();
  const one = M.withMuted(none, T1, true);
  ok("muting adds", same(one, [T1]) && none.size === 0);
  ok("muting what is muted changes nothing (the same set)", M.withMuted(one, T1, true) === one);
  ok("unmuting removes", same(M.withMuted(one, T1, false), []));
  ok("unmuting what rings changes nothing (the same set)", M.withMuted(none, T1, false) === none);
}

/* ── the optimistic book ── */
{
  let changes = 0;
  const b = M.createMuteBook(() => changes++);
  ok("a new book shows nothing", b.shown().size === 0);
  const n = b.want(T1, true);
  ok("a tap shows at once", same(b.shown(), [T1]) && changes === 1);
  const before = b.shown();
  b.settle(T1, n, true, true);
  ok("the write held: still muted, and nothing redrawn", same(b.shown(), [T1]) && b.shown() === before && changes === 1);
  b.load(new Set([T1]));
  ok("a fresh read that agrees redraws nothing", b.shown() === before && changes === 1);
}
{
  const b = M.createMuteBook();
  const n = b.want(T1, true);
  b.settle(T1, n, true, false);
  ok("the write failed: back to ringing", same(b.shown(), []));
  b.load(new Set([T1]));
  const m = b.want(T1, false);
  ok("unmute shows at once", same(b.shown(), []));
  b.settle(T1, m, false, false);
  ok("the unmute failed: back to muted (what the server said)", same(b.shown(), [T1]));
}
{
  const b = M.createMuteBook();
  const n = b.want(T1, true);
  b.load(new Set([T2]));
  ok("a fresh read never undoes a tap on its way", same(b.shown(), [T1, T2]));
  b.settle(T1, n, true, true);
  ok("…and once it holds, both are muted", same(b.shown(), [T1, T2]));
  b.load(new Set([T1]));
  ok("a later read replaces what was known (unmuted on another phone)", same(b.shown(), [T1]));
}
{
  // mute, unmute, mute again before any answer: only the latest wish shows, each answer lands in order
  const b = M.createMuteBook();
  const n1 = b.want(T1, true);
  const n2 = b.want(T1, false);
  const n3 = b.want(T1, true);
  ok("three taps: the latest wish shows", same(b.shown(), [T1]));
  b.settle(T1, n1, true, true);
  ok("the first answer doesn't let go of the latest wish", same(b.shown(), [T1]));
  b.settle(T1, n2, false, true);
  ok("the second answer (unmuted on the server) still shows the latest wish", same(b.shown(), [T1]));
  b.settle(T1, n3, true, false);
  ok("the last write failed: what the server holds is the second answer", same(b.shown(), []));
}
{
  const b = M.createMuteBook();
  const n1 = b.want(T1, true);
  const n2 = b.want(T1, false);
  b.settle(T1, n1, true, false);
  ok("an older failed write doesn't disturb the newer wish", same(b.shown(), []));
  b.settle(T1, n2, false, true);
  ok("…which then holds", same(b.shown(), []));
}
{
  let changes = 0;
  const b = M.createMuteBook(() => changes++);
  b.load(new Set([T1]));
  b.want(T2, true);
  b.reset();
  ok("another account: nothing known, nothing wanted", b.shown().size === 0 && changes === 3);
  b.reset();
  ok("resetting an empty book redraws nothing", changes === 3);
}

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
