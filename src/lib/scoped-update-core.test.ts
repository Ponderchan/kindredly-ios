/* lib/scoped-update-core: one change at a time per key, so nothing written in the same moment is
   lost. Plain node from the repo root:
     node src/lib/scoped-update-core.test.ts
   The bug (owner, 2026-11-13): right after a sign-in two screens set two flags in the same moment;
   both read {}, and the second write dropped the first flag ("Meet Mist." again on Me). */

const { makeUpdater, parseOr } = await import("./scoped-update-core.ts");

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  — " + extra));
  if (!cond) fails++;
};

/** a store whose reads and writes each take a tick (or more), as AsyncStorage's do */
function slowStore(delays: { get?: number; set?: number } = {}) {
  const data = new Map<string, string>();
  const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));
  return {
    data,
    async getItem(k: string) {
      await wait(delays.get ?? 1);
      return data.has(k) ? (data.get(k) as string) : null;
    },
    async setItem(k: string, v: string) {
      await wait(delays.set ?? 1);
      data.set(k, v);
    },
  };
}

/* the old way, for contrast: two read-modify-writes in flight lose one */
{
  const kv = slowStore();
  const naiveSet = async (name: string) => {
    const f = parseOr<Record<string, boolean>>(await kv.getItem("flags"), {});
    f[name] = true;
    await kv.setItem("flags", JSON.stringify(f));
  };
  await Promise.all([naiveSet("plush_celebrated"), naiveSet("said2:kindreds")]);
  const f = JSON.parse(kv.data.get("flags") as string);
  ok("the old read-add-write loses one of two flags set together (the bug, reproduced)", Object.keys(f).length === 1);
}

/* the queue: both stay */
{
  const kv = slowStore();
  const update = makeUpdater(kv);
  const setFlag = (name: string) =>
    update("flags::u1", (raw) => {
      const f = parseOr<Record<string, boolean>>(raw, {});
      if (f[name]) return { result: false };
      return { next: JSON.stringify({ ...f, [name]: true }), result: true };
    });
  const results = await Promise.all([setFlag("plush_celebrated"), setFlag("said2:kindreds"), setFlag("plush_celebrated")]);
  const f = JSON.parse(kv.data.get("flags::u1") as string);
  ok("two flags set in the same moment are both kept", f.plush_celebrated === true && f["said2:kindreds"] === true);
  ok("the same flag twice: the second sees the first and writes nothing", results.join(",") === "true,true,false");
}

/* fifty changes at once on one ledger: none lost, in the order they were asked */
{
  const kv = slowStore({ get: 2, set: 3 });
  const update = makeUpdater(kv);
  await Promise.all(
    Array.from({ length: 50 }, (_, i) =>
      update("room_seen::u1", (raw) => {
        const l = parseOr<Record<string, number>>(raw, {});
        return { next: JSON.stringify({ ...l, [`t${i}`]: i }), result: null };
      }),
    ),
  );
  const l = JSON.parse(kv.data.get("room_seen::u1") as string);
  ok("fifty marks at once: all fifty kept", Object.keys(l).length === 50 && l.t49 === 49);
}

/* keys and owners don't wait for each other */
{
  const kv = slowStore();
  const update = makeUpdater(kv);
  await Promise.all([
    update("flags::u1", () => ({ next: '{"a":true}', result: null })),
    update("flags::anon", () => ({ next: '{"b":true}', result: null })),
  ]);
  ok("the account's key and the guest's are separate values", kv.data.get("flags::u1") === '{"a":true}' && kv.data.get("flags::anon") === '{"b":true}');
}

/* a change that throws doesn't stop the next one */
{
  const kv = slowStore();
  const update = makeUpdater(kv);
  const bad = update("k::u1", () => {
    throw new Error("boom");
  }).catch(() => "caught");
  const good = update("k::u1", () => ({ next: "1", result: "ok" }));
  const [b, g] = await Promise.all([bad, good]);
  ok("a failed change is the caller's to catch; the queue goes on", b === "caught" && g === "ok" && kv.data.get("k::u1") === "1");
}

/* nothing to write: no write */
{
  const kv = slowStore();
  let writes = 0;
  const counted = { ...kv, setItem: async (k: string, v: string) => (writes++, kv.setItem(k, v)) };
  const update = makeUpdater(counted);
  await update("k::u1", () => ({ result: null }));
  await update("k::u1", (raw) => ({ next: raw ?? undefined, result: null }));
  ok("a change that decides nothing writes nothing", writes === 0);
}

ok("parseOr: empty, junk and null all give the empty value", JSON.stringify([parseOr(null, {}), parseOr("{oops", []), parseOr("null", {})]) === "[{},[],{}]");

console.log(fails ? `\n${fails} failed` : "\nall ok");
if (fails) process.exit(1);
