/* Member marks (lib/member-marks-core) and the stamp geometry (lib/stamp-avatar). Not wired to a
   runner; run by hand from the repo root with plain node:
     node src/lib/member-marks.test.ts
   The denomination ("" / "1ST" / "007"), the tolerant row parse, the dev fixture, the geometry's
   numbers from the prototype, and the cache: batches of ≤60, uuids only, one request per id per
   window, and — before the owner runs 0037 — a missing function or a failing network never
   throws, never loops, and is logged once. */

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

const M = await import("./member-marks-core.ts");
const G = await import("./stamp-avatar.ts");
const { createMemberCache, denomOf, denomOfMark, devMemberFixture, memberRowOf, pad3, stampSpoken } = M;

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};
const uuid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;

/* denomination */
ok("pad3", pad3(7) === "007" && pad3(42) === "042" && pad3(100) === "100");
ok("denom: none", denomOf(null) === "" && denomOf(undefined) === "" && denomOf({ member: false, cofounderNo: 7 }) === "");
ok("denom: 1ST", denomOf({ member: true, cofounderNo: null }) === "1ST");
ok("denom: cofounder", denomOf({ member: true, cofounderNo: 1 }) === "001");
ok("denom: junk number → 1ST", denomOf({ member: true, cofounderNo: -3 }) === "1ST" && denomOf({ member: true, cofounderNo: 1.5 }) === "1ST");
ok("denomOfMark", denomOfMark(null) === "" && denomOfMark(undefined) === "" && denomOfMark({ cofounderNo: null }) === "1ST" && denomOfMark({ cofounderNo: 9 }) === "009");

/* rows */
ok("row: member", JSON.stringify(memberRowOf({ uid: "a", member: true, cofounder_no: null })) === JSON.stringify({ uid: "a", mark: { cofounderNo: null } }));
ok("row: cofounder", memberRowOf({ uid: "a", member: true, cofounder_no: 12 })?.mark.cofounderNo === 12);
ok("row: numeric string", memberRowOf({ uid: "a", member: true, cofounder_no: "12" })?.mark.cofounderNo === 12);
ok("row: member false → null", memberRowOf({ uid: "a", member: false, cofounder_no: 3 }) === null);
ok("row: junk", memberRowOf(null) === null && memberRowOf("x") === null && memberRowOf({ member: true }) === null && memberRowOf({ uid: "" }) === null);
ok("row: bad number → null no", memberRowOf({ uid: "a", member: true, cofounder_no: "x" })?.mark.cofounderNo === null);

/* spoken */
const tt = (k: string, v?: Record<string, string | number>) => k + (v ? ":" + v.n : "");
ok("spoken", stampSpoken("", tt) === "" && stampSpoken(null, tt) === "" && stampSpoken("1ST", tt) === "fc2.av.member" && stampSpoken("007", tt) === "fc2.av.cofounder:7");

/* fixture */
{
  const kinds = { none: 0, first: 0, no: 0 };
  let stable = true;
  for (let i = 0; i < 300; i++) {
    const m = devMemberFixture("u" + i);
    if (JSON.stringify(m) !== JSON.stringify(devMemberFixture("u" + i))) stable = false;
    if (!m) kinds.none++;
    else if (m.cofounderNo == null) kinds.first++;
    else if (m.cofounderNo >= 1 && m.cofounderNo <= 100) kinds.no++;
  }
  ok("fixture: deterministic", stable);
  ok("fixture: all three kinds, roughly a third each", kinds.none > 60 && kinds.first > 60 && kinds.no > 60, JSON.stringify(kinds));
  ok("fixture: no uid → none", devMemberFixture(null) === null && devMemberFixture("") === null);
}

/* geometry (the contract's numbers) */
const inner = (s: number, c?: number) => G.stampGeometry(s, c).inner;
ok("geometry 72 → 65", inner(72) === 65);
ok("geometry 52 → 45", inner(52) === 45);
ok("geometry 44 → 37", inner(44) === 37);
ok("geometry 40 → 33", inner(40) === 33);
ok("geometry 36 small → 35", inner(36, 1) === 35);
ok("geometry 34 small (by size) → 33", inner(34, 1) === 33);
ok("geometry 22 small (by size) → 21", inner(22) === 21);
ok("geometry ≤32 hides the denomination", !G.stampGeometry(32).showDenom && G.stampGeometry(33).showDenom);
ok("geometry outer = size + 8, bleed 4", G.stampGeometry(52).outer === 60 && G.stampGeometry(52).bleed === 4);
{
  const h = G.stampGeometry(54, 0.5);
  ok("geometry interpolates", h.border === 2 && h.pad === 4 && h.denomOpacity === 0.5 && h.showDenom);
}

/* cache */
{
  let clock = 1000;
  const calls: string[][] = [];
  const logs: string[] = [];
  let mode: "ok" | "absent" | "fail" | "throw" = "ok";
  const c = createMemberCache({
    now: () => clock,
    log: (m) => logs.push(m),
    async fetch(uids) {
      calls.push(uids);
      if (mode === "absent") return { error: { code: "PGRST202", message: "Could not find the function" }, status: 404 };
      if (mode === "fail") return { error: { message: "offline" }, status: 0 };
      if (mode === "throw") throw new Error("boom");
      return { rows: uids.filter((u, i) => i % 2 === 0).map((u, i) => ({ uid: u, member: true, cofounder_no: i === 0 ? 5 : null })) };
    },
  });
  let pings = 0;
  c.subscribe(() => pings++);

  const ids = Array.from({ length: 130 }, (_, i) => uuid(i));
  const got = await c.get([...ids, ids[0], null, undefined, "", "wren", "step5-a1"]);
  ok("cache: 130 ids → 3 batches of ≤60", calls.length === 3 && calls.every((b) => b.length <= 60), calls.map((b) => b.length).join(","));
  ok("cache: non-uuids never sent", calls.every((b) => b.every((u) => /^[0-9a-f-]{36}$/.test(u))));
  ok("cache: non-uuid reads none", got.get("wren") === null && c.peek("wren") === null);
  ok("cache: member row read", got.get(ids[0])?.cofounderNo === 5 && got.get(ids[2])?.cofounderNo === null);
  ok("cache: no row → null", got.get(ids[1]) === null);
  ok("cache: never asked → undefined", c.peek(uuid(999)) === undefined && c.peek(null) === undefined);
  ok("cache: listeners told", pings > 0);

  calls.length = 0;
  await c.get(ids.slice(0, 10));
  ok("cache: fresh answers ask nothing", calls.length === 0);

  /* in-flight de-dupe */
  const a = c.get([uuid(500)]);
  const b = c.get([uuid(500)]);
  await Promise.all([a, b]);
  ok("cache: in-flight de-duplicated", calls.length === 1);

  /* stale → asked again */
  calls.length = 0;
  clock += M.MEMBER_FRESH_MS + 1;
  await c.get([ids[0]]);
  ok("cache: stale asked again", calls.length === 1);

  /* forget */
  calls.length = 0;
  c.forget(ids[0]);
  ok("cache: forget drops the answer", c.peek(ids[0]) === undefined);
  await c.get([ids[0]]);
  ok("cache: forgotten id asked again", calls.length === 1);

  /* absent (0037 not run) */
  mode = "absent";
  calls.length = 0;
  logs.length = 0;
  const r1 = await c.get([uuid(600), uuid(601)]);
  ok("absent: reads none, never throws", r1.get(uuid(600)) === null && c.state() === "absent");
  await c.get([uuid(602)]);
  await c.get([uuid(603)]);
  ok("absent: asks once in the window", calls.length === 1, String(calls.length));
  ok("absent: logged once", logs.length === 1);
  clock += M.MEMBER_ABSENT_MS + 1;
  await c.get([uuid(604)]);
  ok("absent: asks again after ten minutes, still logged once", calls.length === 2 && logs.length === 1);

  /* failure keeps what was known */
  mode = "ok";
  clock += M.MEMBER_ABSENT_MS + 1;
  await c.get([uuid(700)]); // even index 0 → member
  ok("fail setup: 700 is a member", c.peek(uuid(700))?.cofounderNo === 5);
  mode = "fail";
  clock += M.MEMBER_FRESH_MS + 1;
  calls.length = 0;
  await c.get([uuid(700)]);
  ok("fail: keeps what was known", c.peek(uuid(700))?.cofounderNo === 5 && c.state() === "backoff");
  await c.get([uuid(701)]);
  ok("fail: no retry within the minute", calls.length === 1);
  mode = "throw";
  clock += M.MEMBER_RETRY_MS + 1;
  const r3 = await c.get([uuid(702)]);
  ok("throw: reads none, never rejects", r3.get(uuid(702)) === null);

  /* clear drops answers in flight */
  mode = "ok";
  clock += M.MEMBER_RETRY_MS + 1;
  const late = c.get([uuid(800)]);
  c.clear();
  await late;
  ok("clear: answer from before the clear is dropped", c.peek(uuid(800)) === undefined && c.state() === "ok");
}

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
