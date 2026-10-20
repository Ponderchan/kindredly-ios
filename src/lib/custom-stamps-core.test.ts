/* Custom stamps, the pure half (lib/custom-stamps-core). Not wired to a runner; run by hand from
   the repo root with plain node:
     node --experimental-strip-types src/lib/custom-stamps-core.test.ts
   Ids, the three 0038 lists (good rows and bad ones), what each state draws, the tag, Keep, the
   row Swift takes, batches of 60 and re-signing. */

const C = await import("./custom-stamps-core.ts");

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};
const U = "0f8fad5b-d9cb-469f-a165-70867728950e";
const U2 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const hexOf = (c: string) => ({ small: "#FBBF3E", missing: "#FB765A" } as Record<string, string>)[c] ?? "#000000";

// ids
ok("id: canonical", C.isCustomStampId(`c:${U}`));
ok("id: upper case refused", !C.isCustomStampId(`c:${U.toUpperCase()}`));
ok("id: official refused", !C.isCustomStampId("off-chest"));
ok("id: non-string refused", !C.isCustomStampId(42));
ok("uuid of id", C.customStampUuid(`c:${U}`) === U);
ok("uuid of junk is null", C.customStampUuid("c:nope") === null);
ok("id of uuid lowercases", C.customStampId(U.toUpperCase()) === `c:${U}`);
ok("customIds dedups and filters", JSON.stringify(C.customIds([`c:${U}`, "crush", null, `c:${U}`, `c:${U2}`])) === JSON.stringify([`c:${U}`, `c:${U2}`]));

// custom_stamps_for
const f = C.parseForRows(
  [
    { id: U, category: "small", gold: true, state: "ok", topic: "#first snow", image_path: `o/${U}/2.jpg`, version: 2, mine: false },
    { id: U2, category: "missing", gold: false, state: "removed", topic: null, image_path: null, version: 1, mine: false },
    { id: "nope", category: "small", state: "ok" },
    { id: U, category: "purple", state: "ok" },
    { id: U, category: "small", state: "weird" },
    null,
  ],
  hexOf,
);
ok("for: two good rows", f.rows.length === 2, JSON.stringify(f));
ok("for: three bad rows (null skipped)", f.bad === 3, String(f.bad));
const a = f.rows[0];
ok("for: id", a.id === `c:${U}` && a.uuid === U);
ok("for: hex from category", a.hex === "#FBBF3E");
ok("for: topic loses #", a.topic === "first snow");
ok("for: key is the path", a.key === `o/${U}/2.jpg` && a.path === a.key && a.version === 2);
ok("for: gold", a.gold === true);
ok("for: url empty until signed", a.url === null);
ok("for: removed has no key", f.rows[1].key === "" && f.rows[1].path === null);
ok("for: not an array", C.parseForRows({}, hexOf).rows.length === 0);

// my_custom_stamps
const m = C.parseMyRows(
  [
    { id: U, topic: "tea", category: "small", filter: "riso", gold: false, status: "approved", image_path: `me/${U}/1.jpg`, version: 1, letters: 4, created_at: "2026-10-19T10:00:00Z" },
    { id: U2, topic: "rain", category: "missing", filter: "paper", gold: false, status: "pending", image_path: null, version: 1, letters: "0", created_at: "2026-10-19T11:00:00Z" },
    { id: U2, topic: "x", category: "missing", filter: "sepia", status: "pending" },
  ],
  hexOf,
);
ok("my: two rows, one bad", m.rows.length === 2 && m.bad === 1);
ok("my: approved → ok, mine", m.rows[0].state === "ok" && m.rows[0].mine && m.rows[0].letters === 4 && m.rows[0].filter === "riso");
ok("my: pending stays pending", m.rows[1].state === "pending" && m.rows[1].status === "pending" && m.rows[1].letters === 0);

// my_kept_stamps
const k = C.parseKeptRows([{ stamp_id: U, owner: "u1", kept_at: "2026-10-18T00:00:00Z", from_letter: U2, from_thread: null, category: "small", gold: false, state: "ok", topic: "kite", image_path: "p.jpg", version: 1 }], hexOf);
ok("kept: one row", k.rows.length === 1 && k.bad === 0);
ok("kept: never mine, from letter", !k.rows[0].mine && k.rows[0].fromLetter === U2 && k.rows[0].fromThread === null && k.rows[0].owner === "u1");

// what to sign
ok("sign: ok with path", C.wantsPicture({ state: "ok", mine: false, path: "p" }));
ok("sign: my removed", C.wantsPicture({ state: "removed", mine: true, path: "p" }));
ok("sign: their removed never", !C.wantsPicture({ state: "removed", mine: false, path: "p" }));
ok("sign: no path never", !C.wantsPicture({ state: "ok", mine: false, path: null }));

// looks
ok("look: unknown", C.lookOf(null) === "unknown");
ok("look: ok + url = photo", C.lookOf({ state: "ok", mine: false, url: "https://x" }) === "photo");
ok("look: ok without url = frame", C.lookOf({ state: "ok", mine: false, url: null }) === "frame");
ok("look: my pending with local file = photo", C.lookOf({ state: "pending", mine: true, url: "file:///x" }) === "photo");
ok("look: my removed = greyed", C.lookOf({ state: "removed", mine: true, url: "https://x" }) === "greyed");
ok("look: hidden = frame", C.lookOf({ state: "hidden", mine: false, url: "https://x" }) === "frame");
ok("look: deleted = frame", C.lookOf({ state: "deleted", mine: false, url: null }) === "frame");

// tag + keep
ok("tag: ok", C.tagOf({ state: "ok", topic: "tea" }) === "tea");
ok("tag: removed none", C.tagOf({ state: "removed", topic: "tea" }) === "");
ok("tag: hidden none", C.tagOf({ state: "hidden", topic: "tea" }) === "");
ok("keep: stranger ok (while keeping is on)", C.canKeep({ state: "ok", mine: false }) === C.KEEP_STAMPS_ON);
ok("keep: mine never", !C.canKeep({ state: "ok", mine: true }));
ok("keep: removed never", !C.canKeep({ state: "removed", mine: false }));

// native row
const n = C.nativeRow({ ...a, url: "https://signed" }, true);
ok("native: strings, url, kept", n.id === `c:${U}` && n.url === "https://signed" && n.kept && n.hex === "#FBBF3E" && n.state === "ok" && n.gold);
ok("native: null url → empty", C.nativeRow(a, false).url === "");

// batches + resign
const ids = Array.from({ length: 125 }, (_, i) => i);
const b = C.batches(ids);
ok("batches of 60", b.length === 3 && b[0].length === 60 && b[2].length === 5);
ok("resign: none yet", C.needsResign(undefined, 0));
ok("resign: 10 min left keeps", !C.needsResign(10 * 60_000, 0));
ok("resign: 4 min left signs", C.needsResign(4 * 60_000, 0));

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
