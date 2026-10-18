/* The identity switch and the marks cache (lib/identity-core). Not wired to a runner; run by
   hand from the repo root with plain node (types stripped by Node itself; the hook below adds
   ".ts" to the app's extensionless imports):
     node src/lib/identity-core.test.ts
   The switch: only a real true from the table (or the dev preview) turns it on. The rows: only
   she/he and the twelve sign keys get through. The cache: batches of ≤60, one request per id per
   window, in-flight de-duplication, 30-minute freshness, and — the part that matters before the
   owner runs 0034 — a missing function or a failing network never throws and never loops. The
   web's scripts/identity-core.test.mjs checks its port against the same behaviours. */

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

const C = await import("./identity-core.ts");
const { IDENTITY_SURFACE, MARKS_BATCH, NO_MARKS, createMarksCache, devMarksFixture, identitySwitch, isMissingRpc, isUuid, marksBatches, marksOfRow } = C;
type Marks = import("./identity-core.ts").Marks;
type MarksAnswer = import("./identity-core.ts").MarksAnswer;

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  — " + extra));
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ── the switch ── */
ok("the key is 'identity'", IDENTITY_SURFACE === "identity");
ok("nothing known → off", identitySwitch(null) === false);
ok("no row → off", identitySwitch({}) === false);
ok("a true row → on; a false row → off", identitySwitch({ identity: true }) === true && identitySwitch({ identity: false }) === false);
ok("junk is not on ('true', 1)", identitySwitch({ identity: "true" as unknown as boolean }) === false && identitySwitch({ identity: 1 as unknown as boolean }) === false);
ok("other surfaces don't turn it on", identitySwitch({ today: true, chat: true }) === false);
ok("the dev preview wins either way", identitySwitch({ identity: false }, true) === true && identitySwitch({ identity: true }, false) === false && identitySwitch(null, null) === false);

/* ── one row ── */
ok("row: she + gemini", same(marksOfRow({ uid: "u", mark: "she", sign: "gemini" }), { uid: "u", marks: { mark: "she", sign: "gemini" } }));
ok("row: he, no sign", same(marksOfRow({ uid: "u", mark: "he", sign: null }), { uid: "u", marks: { mark: "he", sign: null } }));
ok("row: nothing to show → NO_MARKS itself", marksOfRow({ uid: "u", mark: null, sign: null })!.marks === NO_MARKS);
ok("row: anything but she/he or a sign key reads as none", same(marksOfRow({ uid: "u", mark: "they", sign: "Gemini" })!.marks, NO_MARKS) && same(marksOfRow({ uid: "u", mark: "SHE", sign: "ophiuchus" })!.marks, NO_MARKS));
ok("row: no uid or not an object → skipped", [null, 3, "x", {}, { uid: "" }, { uid: 7, mark: "she" }].every((r) => marksOfRow(r) === null));
ok("NO_MARKS is frozen", Object.isFrozen(NO_MARKS));

/* ── batches ── */
ok("batches: ≤60, de-duplicated, empties dropped, order kept", (() => {
  const ids = Array.from({ length: 130 }, (_, i) => "u" + i);
  const b = marksBatches([...ids, "u3", null, undefined, "", "u129"]);
  return MARKS_BATCH === 60 && b.length === 3 && b[0].length === 60 && b[1].length === 60 && b[2].length === 10 && b.flat().join() === ids.join();
})());
ok("batches: nothing → none", marksBatches([]).length === 0 && marksBatches([null, ""]).length === 0);

/* ── the missing function ── */
ok("missing: PGRST202, 42883, HTTP 404, the message", isMissingRpc({ code: "PGRST202" }) && isMissingRpc({ code: "42883" }) && isMissingRpc({}, 404) && isMissingRpc({ message: "Could not find the function public.marks_for(p_users) in the schema cache" }));
ok("missing: not a network error, a 500, a permission error or nothing", !isMissingRpc({ message: "Network request failed" }) && !isMissingRpc({ code: "PGRST002" }, 503) && !isMissingRpc({ code: "42501", message: "permission denied for function marks_for" }, 401) && !isMissingRpc(null) && !isMissingRpc(undefined, null));

ok("isUuid: a real id yes; a demo id, junk or nothing no", isUuid("7f3c2a10-4b5e-4d21-9c8a-1E2F3A4B5C6D") && ![null, undefined, "", "step5-a1", "demo-mira", "7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6", 7].some(isUuid));

/* ── the dev fixture ── */
{
  const demo = ["step5-a1", "step5-a2", "step5-a3", "step5-a4", "step5-a5", "demo-mira", "demo-blackberry", "demo-north", "demo-quiet", "demo-juno", "demo-long", "demo-voice", "demo-band-youdone", "demo-band-theydone"];
  const f = demo.map(devMarksFixture);
  ok("fixture: deterministic", demo.every((u) => same(devMarksFixture(u), devMarksFixture(u))));
  ok("fixture: the demo rows show she, he and none, and signs", ["she", "he", null].every((m) => f.some((x) => x.mark === m)) && f.filter((x) => x.sign).length >= 8, f.map((x) => `${x.mark}/${x.sign}`).join(" "));
  ok("fixture: no id → none", devMarksFixture(null) === NO_MARKS && devMarksFixture("") === NO_MARKS);
  console.log("     demo: " + demo.slice(0, 5).map((u, i) => `${u}=${f[i].mark ?? "-"}/${f[i].sign ?? "-"}`).join(" "));
}

/* ── the cache ── */
type Call = string[];
function harness(answer: (ids: string[], n: number) => MarksAnswer | Promise<MarksAnswer> | "throw") {
  let clock = 1_000_000;
  const calls: Call[] = [];
  const logs: string[] = [];
  const cache = createMarksCache({
    now: () => clock,
    log: (m) => logs.push(m),
    fetch: async (ids) => {
      calls.push(ids);
      const a = await answer(ids, calls.length);
      if (a === "throw") throw new Error("boom");
      return a;
    },
  });
  return { cache, calls, logs, tick: (ms: number) => (clock += ms) };
}
const rowsFor = (ids: string[]) => ({ rows: ids.map((u) => ({ uid: u, mark: u.endsWith("s") ? "she" : null, sign: u.endsWith("s") ? "leo" : null })) });

{
  const h = harness((ids) => rowsFor(ids));
  const ids = Array.from({ length: 130 }, (_, i) => "p" + i + (i % 2 ? "s" : ""));
  const got = await h.cache.get(ids);
  ok("cache: 130 ids → 3 requests of ≤60", h.calls.length === 3 && h.calls.every((c) => c.length <= 60) && got.size === 130);
  ok("cache: answers mapped (she/leo for some, none for the rest)", same(got.get("p1s"), { mark: "she", sign: "leo" }) && got.get("p2") === NO_MARKS);
  await h.cache.get(ids);
  ok("cache: asked again within 30 minutes → no request", h.calls.length === 3);
  ok("cache: peek answers from memory; never asked → undefined", same(h.cache.peek("p1s"), { mark: "she", sign: "leo" }) && h.cache.peek("nobody") === undefined && h.cache.peek(null) === undefined);
  h.tick(30 * 60_000 + 1);
  ok("cache: a stale answer is still shown", same(h.cache.peek("p1s"), { mark: "she", sign: "leo" }));
  await h.cache.get(["p1s", "p2"]);
  ok("cache: after 30 minutes, asked again (only what was asked for)", h.calls.length === 4 && same(h.calls[3], ["p1s", "p2"]));
}
{
  const h = harness((ids) => ({ rows: ids.filter((u) => u !== "blocked").map((u) => ({ uid: u, mark: "he", sign: null })) }));
  const got = await h.cache.get(["a", "blocked", "a"]);
  ok("cache: an id with no row (blocked, nothing to show, no account) is none", got.get("blocked") === NO_MARKS && same(got.get("a"), { mark: "he", sign: null }) && same(h.calls, [["a", "blocked"]]));
  const extra = harness(() => ({ rows: [{ uid: "stranger", mark: "she", sign: "leo" }] }));
  await extra.cache.get(["x"]);
  ok("cache: rows for ids not asked for are ignored", extra.cache.peek("stranger") === undefined && extra.cache.peek("x") === NO_MARKS);
}
{
  // in flight: two screens asking at once share one request
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  const h = harness(async (ids) => {
    await gate;
    return rowsFor(ids);
  });
  const a = h.cache.get(["q1s", "q2"]);
  const b = h.cache.get(["q2", "q1s", "q3s"]);
  release();
  const [ra, rb] = await Promise.all([a, b]);
  ok("cache: concurrent asks share the in-flight request", h.calls.length === 2 && same(h.calls[0], ["q1s", "q2"]) && same(h.calls[1], ["q3s"]) && same(ra.get("q1s"), rb.get("q1s")));
}
{
  // 0034 not run yet: the function isn't there
  const h = harness(() => ({ error: { code: "PGRST202", message: "Could not find the function public.marks_for(p_users) in the schema cache" }, status: 404 }));
  const got = await h.cache.get(["m1", "m2"]);
  ok("missing function: everything reads as none, no throw", got.get("m1") === NO_MARKS && got.get("m2") === NO_MARKS && h.cache.state() === "absent");
  for (let i = 0; i < 50; i++) await h.cache.get(["m1", "m2", "new" + i]);
  ok("missing function: 50 more renders, new ids too → still the one request (no loop)", h.calls.length === 1);
  ok("missing function: logged once", h.logs.length === 1 && /0034/.test(h.logs[0]));
  h.tick(10 * 60_000 + 1);
  await h.cache.get(["m1"]);
  ok("missing function: asked again only after ten minutes, and not logged again", h.calls.length === 2 && h.logs.length === 1);
}
{
  // offline / 5xx: known answers kept, unknown ones none, one request a minute
  let mode: "ok" | "down" = "ok";
  const h = harness((ids) => (mode === "ok" ? rowsFor(ids) : { error: { message: "Network request failed" }, status: 0 }));
  await h.cache.get(["k1s"]);
  h.tick(31 * 60_000);
  mode = "down";
  const got = await h.cache.get(["k1s", "k2"]);
  ok("failure: what was known is kept, the rest is none", same(got.get("k1s"), { mark: "she", sign: "leo" }) && got.get("k2") === NO_MARKS && h.cache.state() === "backoff");
  for (let i = 0; i < 20; i++) await h.cache.get(["k1s", "k2", "k3"]);
  ok("failure: no request for a minute, whatever the screens ask", h.calls.length === 2);
  h.tick(60_001);
  mode = "ok";
  await h.cache.get(["k2"]);
  ok("failure: asked again after the minute, and the answer lands", h.calls.length === 3 && h.cache.peek("k2") === NO_MARKS && h.cache.state() === "ok");
}
{
  const h = harness(() => "throw");
  const got = await h.cache.get(["t1"]);
  ok("a fetch that throws is a failure, not a crash", got.get("t1") === NO_MARKS && h.cache.state() === "backoff");
}
{
  // forget (block / unblock) and clear (another account)
  const h = harness((ids) => rowsFor(ids));
  let heard = 0;
  const off = h.cache.subscribe(() => heard++);
  await h.cache.get(["f1s", "f2s"]);
  const afterGet = heard;
  h.cache.forget("f1s");
  ok("forget: that one entry goes (and listeners hear it), the other stays", h.cache.peek("f1s") === undefined && h.cache.peek("f2s") !== undefined && heard === afterGet + 1);
  await h.cache.get(["f1s"]);
  ok("forget: the next ask goes to the server", h.calls.length === 2);
  h.cache.clear();
  ok("clear: everything goes", h.cache.peek("f2s") === undefined);
  off();
  const before = heard;
  await h.cache.get(["f9"]);
  ok("unsubscribe: no more calls", heard === before);
}
{
  // an answer in flight when the account changes is dropped; one in flight when its person is blocked too
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  const h = harness(async (ids) => {
    await gate;
    return rowsFor(ids);
  });
  const p = h.cache.get(["c1s", "c2s"]);
  h.cache.forget("c2s");
  release();
  await p;
  ok("forget during flight: that answer is dropped, the other lands", h.cache.peek("c2s") === undefined && h.cache.peek("c1s") !== undefined);
  let release2: () => void = () => {};
  const gate2 = new Promise<void>((r) => (release2 = r));
  const h2 = harness(async (ids) => {
    await gate2;
    return rowsFor(ids);
  });
  const p2 = h2.cache.get(["d1s"]);
  h2.cache.clear();
  release2();
  const r2 = await p2;
  ok("clear during flight: the old account's answer never lands", h2.cache.peek("d1s") === undefined && r2.get("d1s") === NO_MARKS);
}
{
  const h = harness((ids) => rowsFor(ids));
  const got = await h.cache.get([]);
  const got2 = await h.cache.get([null, undefined, ""]);
  ok("asking for nothing asks nothing", got.size === 0 && got2.size === 0 && h.calls.length === 0);
}

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
void (null as unknown as Marks);
