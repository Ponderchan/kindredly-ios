/* The phone's copy of the profile against the account's (lib/profile-local-core). Not wired to a
   runner; run by hand from the repo root with plain node (types stripped by Node itself):
     node src/lib/profile-local-core.test.ts
   The bug (owner, 2026-10-21): after switching accounts, or signing out and back in, the face was
   gone — an empty avatarId in the phone's copy (a guest's "Later", a stale copy) hid the account's
   and then went up over it. An empty identity field only counts when it was cleared on purpose. */

const C = await import("./profile-local-core.ts");
const { CLEARED, applyPatch, hasAnswers, ownerOf, parseLocal, syncPayload, visibleProfile, withoutEmpty } = C;

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  — " + extra));
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const META = { avatarId: "f7", handle: "Moth", pronoun: "she", dob: "1999-05-09", onboarded: true };

/* ── a stale / guest empty never hides or overwrites the account's ── */
{
  const guest = { avatarId: null, dob: null, handle: "", pronoun: undefined, firstLine: "hi" };
  const v = visibleProfile(META, guest);
  ok("a guest's empty face doesn't hide the account's", v.avatarId === "f7", JSON.stringify(v));
  ok("…nor the pen name, pronoun, birthday", v.handle === "Moth" && v.pronoun === "she" && v.dob === "1999-05-09");
  ok("a non-identity field still lays over", v.firstLine === "hi");
  const up = syncPayload(guest);
  ok("the sync leaves the empty identity fields out (the server keeps its own)", !("avatarId" in up) && !("handle" in up) && !("dob" in up) && !("pronoun" in up), JSON.stringify(up));
  ok("the sync still says onboarded and carries the rest", up.onboarded === true && up.firstLine === "hi");
}

/* ── an explicit clear (Edit profile's photo) does count ── */
{
  const local = applyPatch({ avatarId: "f2" }, { avatarId: null });
  ok("a clear is stored as null and remembered", local.avatarId === null && same(local[CLEARED], ["avatarId"]), JSON.stringify(local));
  ok("…and shows over the account's face", visibleProfile(META, local).avatarId === null);
  const up = syncPayload(local);
  ok("…and goes up as null", "avatarId" in up && up.avatarId === null);
  ok("the clear record never goes up", !(CLEARED in up));
  ok("the clear record never shows", !(CLEARED in visibleProfile(META, local)));
  const back = applyPatch(local, { avatarId: "f9" });
  ok("picking a face again forgets the clear", back.avatarId === "f9" && !(CLEARED in back), JSON.stringify(back));
  ok("an empty string clears too", applyPatch({}, { handle: "" }).handle === null);
  ok("clears add up", same(applyPatch(applyPatch({}, { avatarId: null }), { dob: null })[CLEARED], ["avatarId", "dob"]));
}

/* ── ordinary saves ── */
{
  const a = applyPatch({ handle: "Moth" }, { avatarId: "f3" });
  ok("a save merges into the copy", a.handle === "Moth" && a.avatarId === "f3" && !(CLEARED in a));
  ok("a catch-up save ({}) changes nothing", same(applyPatch(a, {}), a));
  ok("the input isn't mutated", same(a, { handle: "Moth", avatarId: "f3" }));
  ok("non-identity empties pass as they are", applyPatch({}, { firstLine: undefined }).firstLine === undefined && applyPatch({}, { showMark: false }).showMark === false);
  ok("a forged clear record in a patch is ignored", !(CLEARED in applyPatch({}, { [CLEARED]: ["avatarId"] })));
  const up = syncPayload({ handle: "Moth" });
  ok("the pen name doubles as full_name", up.full_name === "Moth");
  ok("a junk clear record only names identity fields", visibleProfile(META, { firstLine: null, [CLEARED]: ["firstLine", 3] }).firstLine === null);
}

/* ── onboarding: "Later" says nothing ── */
{
  const p = withoutEmpty({ dob: null, pronoun: "they", showMark: false, showSign: true, avatarId: null, firstLine: "" });
  ok("withoutEmpty drops null / undefined / '' and keeps false", same(p, { pronoun: "they", showMark: false, showSign: true }), JSON.stringify(p));
  const local = applyPatch({}, p);
  ok("so a skipped face is no clear", visibleProfile(META, local).avatarId === "f7" && !(CLEARED in local));
}

/* ── adoption and owners ── */
ok("an empty copy has no answers", !hasAnswers({}) && !hasAnswers(null) && !hasAnswers({ avatarId: null, handle: "" }));
ok("a cleared-only copy has no answers", !hasAnswers({ avatarId: null, [CLEARED]: ["avatarId"] }));
ok("a guest with a face has answers", hasAnswers({ avatarId: "f1" }) && hasAnswers({ showMark: false }));
ok("parseLocal: junk is an empty copy", same(parseLocal(null), {}) && same(parseLocal("{"), {}) && same(parseLocal("[1]"), {}) && same(parseLocal("3"), {}));
ok("parseLocal reads an object", same(parseLocal('{"avatarId":"f1"}'), { avatarId: "f1" }));
ok("owner: an account is its id; a guest or nobody is anon", ownerOf({ id: "u1" }) === "u1" && ownerOf({ id: "u2", is_anonymous: true }) === "anon" && ownerOf(null) === "anon");

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
