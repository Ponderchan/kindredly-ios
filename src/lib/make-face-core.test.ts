/* Behaviour lock for lib/make-face-core (Make your own face, 2026-10-26). Not wired to a runner;
   run by hand from the repo root with plain node (Node 22.18+ strips the types):
     node src/lib/make-face-core.test.ts */

import {
  EMPTY_STORE,
  MAX_KEPT,
  addFace,
  anotherScreen,
  cleanWords,
  isGuestToken,
  isMadeFaceId,
  isUnder18,
  knockAfterS,
  madeFaceAvatarId,
  madeFaceState,
  madeFaceUuid,
  mergeFaces,
  newGuestToken,
  openingScreen,
  pendingAlive,
  readFaceAnswer,
  readStore,
  rejectActions,
  screenFor,
  shownFace,
  type MadeFaceRecord,
} from "./make-face-core.ts";

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

const U1 = "0b1c2d3e-4f50-4612-8a7b-9c8d7e6f5a4b";
const U2 = "7f3c2a10-4b5e-4d21-9c8a-1e2f3a4b5c6d";
const face = (id: string, createdAt = "2026-10-26T10:00:00Z", file: string | null = null): MadeFaceRecord => ({ id, avatarId: "made-" + id, file, path: `u/${id}.png`, createdAt });

// ── ids ──
ok("a made id", isMadeFaceId("made-" + U1));
ok("a library id is not", !isMadeFaceId("f-02-tender-thinker") && !isMadeFaceId("made-x") && !isMadeFaceId("MADE-" + U1));
ok("uuid out", madeFaceUuid("made-" + U1) === U1 && madeFaceUuid("f-02") === null);
ok("uuid in, lower-cased", madeFaceAvatarId(U1.toUpperCase()) === "made-" + U1 && madeFaceAvatarId("nope") === null);
ok("the id fits the server's pen_face (41 characters)", ("made-" + U1).length === 41);

// ── the store ──
ok("nothing stored → empty", readStore(null) === EMPTY_STORE && readStore("{nope") === EMPTY_STORE && readStore("7") === EMPTY_STORE);
{
  const s = readStore(JSON.stringify({ v: 1, faces: [face(U1), { id: "x", avatarId: "f-02" }, null], used: false, worn: "made-" + U1, pending: { since: "2026-10-26T10:00:00Z", from: "onboarding" } }));
  ok("junk faces dropped", s.faces.length === 1 && s.faces[0].id === U1);
  ok("a face kept means the free one is spent", s.used === true);
  ok("worn and pending read back", s.worn === "made-" + U1 && s.pending?.from === "onboarding");
}
ok("a worn id that isn't a made id is dropped", readStore(JSON.stringify({ faces: [], worn: "f-02" })).worn === null);
{
  let s = addFace(EMPTY_STORE, face(U1, "2026-10-26T10:00:00Z", "a.png"));
  s = addFace(s, face(U2, "2026-10-26T11:00:00Z"));
  ok("added at the front", s.faces[0].id === U2 && s.faces.length === 2 && s.used);
  s = addFace(s, { ...face(U1), file: null });
  ok("re-adding keeps the downloaded file", s.faces[0].id === U1 && s.faces[0].file === "a.png" && s.faces.length === 2);
  const many = Array.from({ length: MAX_KEPT + 5 }, (_, i) => face(`${U1.slice(0, -2)}${String(i).padStart(2, "0")}`));
  ok("at most MAX_KEPT", many.reduce(addFace, EMPTY_STORE).faces.length === MAX_KEPT);
}
{
  const local = addFace(EMPTY_STORE, face(U1, "2026-10-26T09:00:00Z", "mine.png"));
  const s = mergeFaces(local, [{ id: U2, path: "u/b.png", createdAt: "2026-10-26T12:00:00Z" }, { id: U1, path: "u/a.png", createdAt: "2026-10-26T09:00:00Z" }]);
  ok("merge: newest first, local files kept", s.faces[0].id === U2 && s.faces[1].file === "mine.png" && s.faces.length === 2);
  ok("merge: junk ids skipped", mergeFaces(EMPTY_STORE, [{ id: "nope", path: null, createdAt: "" }]).faces.length === 0);
}

// ── what a door shows ──
ok("nothing made → free", madeFaceState(EMPTY_STORE) === "free");
ok("spent on the server, nothing here → used", madeFaceState({ ...EMPTY_STORE, used: true }) === "used");
{
  const s = { ...addFace(EMPTY_STORE, face(U1)), worn: "made-" + U1 };
  ok("chosen in the flow, nothing on the account yet → yours", madeFaceState(s) === "yours" && madeFaceState(s, null) === "yours");
  ok("the account wears a library face → used", madeFaceState(s, "f-02-tender-thinker") === "used");
  ok("the account wears it → yours", madeFaceState({ ...s, worn: null }, "made-" + U1) === "yours");
  ok("a made id that isn't on this phone → used", madeFaceState({ ...s, worn: null }, "made-" + U2) === "used");
  ok("shown: the worn one", shownFace(addFace(s, face(U2)))?.id === U1);
  ok("shown: else the newest", shownFace({ ...addFace(s, face(U2)), worn: null })?.id === U2);
}

// ── the answers ──
{
  const made = readFaceAnswer(200, { ok: true, face: { id: U1.toUpperCase(), url: "https://x.supabase.co/s", image_path: "u/a.png", created_at: "t" } });
  ok("200 ok → made, the id lower-cased", made.kind === "made" && made.face.avatarId === "made-" + U1 && made.face.url === "https://x.supabase.co/s");
  ok("200 ok without a face → unavailable", readFaceAnswer(200, { ok: true }).kind === "unavailable");
  ok("an http url is not taken", (() => { const a = readFaceAnswer(200, { ok: true, face: { id: U1, url: "http://x" } }); return a.kind === "made" && a.face.url === null; })());
  const r = readFaceAnswer(200, { ok: false, reason: "many_faces" });
  ok("200 refused → its reason", r.kind === "refused" && r.reason === "many_faces");
  ok("an unknown reason → unsafe", (() => { const a = readFaceAnswer(200, { ok: false, reason: "??" }); return a.kind === "refused" && a.reason === "unsafe"; })());
  ok("402 → quota, 429 → cap, 403 → suspended, 401 → auth", readFaceAnswer(402, {}).kind === "quota" && readFaceAnswer(429, {}).kind === "cap" && readFaceAnswer(403, {}).kind === "suspended" && readFaceAnswer(401, null).kind === "auth");
  ok("400 → bad with its error", (() => { const a = readFaceAnswer(400, { error: "bad_image" }); return a.kind === "bad" && a.error === "bad_image"; })());
  ok("503, 500, junk → unavailable", readFaceAnswer(503, {}).kind === "unavailable" && readFaceAnswer(500, "x").kind === "unavailable");
  ok("screens: made → result, refused → rejected, quota → quota, the rest → failed", screenFor(made) === "result" && screenFor(r) === "rejected" && screenFor({ kind: "quota" }) === "quota" && screenFor({ kind: "cap" }) === "failed" && screenFor({ kind: "unavailable" }) === "failed");
}

// ── the flow ──
ok("free → intro", openingScreen({ state: "free", guest: false, firstClass: false }) === "intro");
ok("used → the First Class card", openingScreen({ state: "used", guest: false, firstClass: false }) === "quota");
ok("used guest → sign in", openingScreen({ state: "yours", guest: true, firstClass: false }) === "signin");
ok("First Class, used → intro", openingScreen({ state: "used", guest: false, firstClass: true }) === "intro");
ok("make another: First Class draws again", anotherScreen({ guest: false, firstClass: true }) === "again");
ok("make another: free → quota, guest → sign in", anotherScreen({ guest: false, firstClass: false }) === "quota" && anotherScreen({ guest: true, firstClass: false }) === "signin");
ok("reject: a photo with no face → another photo, or words", JSON.stringify(rejectActions("no_face", "photo", false)) === JSON.stringify({ primary: "photo", secondary: "words" }));
ok("reject: a minor's photo → words only", JSON.stringify(rejectActions("minor", "photo", false)) === JSON.stringify({ primary: "words", secondary: null }));
ok("reject: words → other words, or a photo", JSON.stringify(rejectActions("words", "words", false)) === JSON.stringify({ primary: "words", secondary: "photo" }));
ok("reject: words, under 18 → other words only", rejectActions("unsafe", "words", true).secondary === null);

// ── age, words, token, knock ──
const NOW = new Date(2026, 9, 26, 12);
ok("17 tomorrow-18 is under", isUnder18("2008-10-27", NOW));
ok("18 today is not", !isUnder18("2008-10-26", NOW));
ok("no birthday is not under", !isUnder18(null, NOW) && !isUnder18("soon", NOW));
ok("words collapsed and capped at 120", cleanWords("  a  b\n c ") === "a b c" && [...cleanWords("é".repeat(130))].length === 120);
{
  let n = 0;
  const t = newGuestToken(() => (n += 37) & 255);
  ok("a token: 32 characters the server takes", t.length === 32 && isGuestToken(t));
  ok("not a token: short or with spaces", !isGuestToken("abc") && !isGuestToken("a b".repeat(10)));
}
ok("knock: when the drawing should be done", knockAfterS(0, 5000) === 17);
ok("knock: never under 4 s away", knockAfterS(0, 60_000) === 4);
ok("pending: alive for 15 minutes", pendingAlive({ since: new Date(0).toISOString(), from: "me" }, 14 * 60_000) && !pendingAlive({ since: new Date(0).toISOString(), from: "me" }, 16 * 60_000) && !pendingAlive(null, 0));

{
  const face = { id: U1, url: "https://x.supabase.co/s", image_path: "u/a.png", created_at: "t" };
  const three = readFaceAnswer(200, { ok: true, face, choices: [{ path: "u/a.png", url: "https://x/1" }, { path: "u/a-c1.png", url: "https://x/2" }, { path: "u/a-c2.png", url: "http://x/3" }] });
  ok("choices: kept when https and pathed (an http one dropped)", three.kind === "made" && three.choices?.length === 2);
  const one = readFaceAnswer(200, { ok: true, face, choices: [{ path: "u/a.png", url: "https://x/1" }] });
  ok("choices: a single one is no choice", one.kind === "made" && one.choices === undefined);
  ok("choices: none from an older server", (() => { const a = readFaceAnswer(200, { ok: true, face }); return a.kind === "made" && a.choices === undefined; })());
}

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
