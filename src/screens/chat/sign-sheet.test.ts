/* Behaviour lock for the signing sheet's rules (screens/chat/sign-sheet; identity Phase 2,
   PHASE2.md §6). Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/chat/sign-sheet.test.ts
   A load hook adds ".ts" to an extensionless relative import, in this process only. Every line
   prints ok/FAIL and the process exits non-zero if any fail. The face library is read from
   data/aura-avatar-lib's text (its require()d images can't load under node), as
   edit-profile-model.test.ts does. */

import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const S = await import("./sign-sheet.ts");
const { penDemo, penFromPad, validatePen, PEN_MAX_STROKES } = await import("../../lib/pen-signature.ts");
const { PEN_NAME_MAX } = await import("../edit-profile/edit-profile-model.ts");

type FaceDefLite = import("../edit-profile/edit-profile-model").FaceDefLite;
type PadPoint = import("../../lib/pen-signature").PadPoint;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(",")})` : key);

const lib = readFileSync(new URL("../../data/aura-avatar-lib.ts", import.meta.url), "utf8");
const FACES: FaceDefLite[] = [...lib.matchAll(/\{ id: "([^"]+)", pool: "([mf])"[^}]*?(legacy: true)?\s*\}/g)].map((m) => ({ id: m[1], pool: m[2] as "m" | "f", legacy: !!m[3] }));
ok("the face library parsed", FACES.length >= 40);
const fId = FACES.find((f) => f.pool === "f" && !f.legacy)!.id;
const mId = FACES.find((f) => f.pool === "m" && !f.legacy)!.id;
const legacy = FACES.find((f) => f.legacy);

/* ── faces ── */
{
  const she = S.faceChoices(fId, "she", FACES);
  ok("faces: the profile's own face comes first", she[0] === fId);
  ok("faces: then the pool, without the duplicate", she.filter((x) => x === fId).length === 1);
  ok("faces: she → only the f pool after her own", she.slice(1, -1).every((id) => FACES.find((f) => f.id === id)?.pool === "f"));
  ok("faces: No face (null) is always last", she[she.length - 1] === null && she.filter((x) => x === null).length === 1);
  const he = S.faceChoices(fId, "he", FACES);
  ok("faces: he → own f face first, then only m faces", he[0] === fId && he.slice(1, -1).every((id) => FACES.find((f) => f.id === id)?.pool === "m"));
  const they = S.faceChoices(null, "they", FACES);
  ok("faces: they → every offered face, no own face, then none", they.length === FACES.filter((f) => !f.legacy).length + 1 && they[0] !== null);
  ok("faces: never a legacy portrait from the pool", !legacy || !they.includes(legacy.id));
  ok("faces: a legacy face the profile wears is still offered first (it is a library id)", !legacy || S.faceChoices(legacy.id, "they", FACES)[0] === legacy.id);
  ok("faces: an old drawn face (not a library id) isn't offered", S.faceChoices("hand-03", "she", FACES)[0] !== "hand-03" && !S.faceChoices("hand-03", "she", FACES).includes("hand-03"));
  ok("faces: a photo (no avatarId) → no own face", S.faceChoices(undefined, "he", FACES)[0] === mId);
  ok("default face: the profile's library face", S.defaultFace(fId) === fId);
  ok("default face: none for a photo or an old face", S.defaultFace(null) === null && S.defaultFace("") === null && S.defaultFace("hand-03") === null && S.defaultFace(42) === null);
}

/* ── the pen name ── */
{
  const pass = () => ({ ok: true });
  const screenNow = (s: string) => ({ ok: !/(https?:\/\/|www\.|@[\w.]+\.\w|\b\d{7,}\b)/i.test(s) });
  ok("name: empty → no error line, button off", S.checkPenName("", "Sunday Kite", pass).problem === "empty" && S.nameErrorKey("empty") === null);
  ok("name: spaces only → empty", S.checkPenName("   ", "Sunday Kite", pass).problem === "empty");
  ok("name: trimmed", S.checkPenName("  Rowan  ", "Sunday Kite", pass).value === "Rowan");
  ok("name: held to Edit profile's 20", S.checkPenName("x".repeat(30), "", pass).value.length === PEN_NAME_MAX);
  ok("name: my courier name, any case → courier", S.checkPenName("sunday KITE", "Sunday Kite", pass).problem === "courier" && S.nameErrorKey("courier") === "id2.sheet.nameCourier");
  ok("name: my courier name with spaces around → courier", S.checkPenName("  Sunday Kite ", "Sunday Kite", pass).problem === "courier");
  ok("name: a CJK courier name compares as written", S.checkPenName("雨のランタン", "雨のランタン", pass).problem === "courier" && S.checkPenName("ランタン", "雨のランタン", pass).problem === null);
  ok("name: no courier known → no courier check", S.checkPenName("Sunday Kite", "", pass).problem === null);
  ok("name: a link → offpage", S.checkPenName("www.me.com", "Sunday Kite", screenNow).problem === "offpage" && S.nameErrorKey("offpage") === "id2.sheet.nameOffpage");
  ok("name: a long number → offpage", S.checkPenName("Rowan 5551234567", "", screenNow).problem === "offpage");
  ok("name: an @handle → offpage", S.checkPenName("@rowan.uk", "", screenNow).problem === "offpage");
  ok("name: the courier check runs before the screen", S.checkPenName("Sunday Kite", "Sunday Kite", () => ({ ok: false })).problem === "courier");
  ok("name: a plain pen name passes", S.checkPenName("Rowan", "Sunday Kite", screenNow).problem === null && S.nameErrorKey(null) === null);
  ok("save: a first pen name is saved", S.nameToSave("Rowan", "") === "Rowan");
  ok("save: an unchanged one isn't (spaces don't count)", S.nameToSave(" Rowan ", "Rowan") === null);
  ok("save: a changed one is, trimmed", S.nameToSave(" Ro ", "Rowan") === "Ro");
  ok("save: never an empty one", S.nameToSave("  ", "Rowan") === null);
}

/* ── the drawing ── */
{
  const pad = { width: 343, height: 110 };
  const line = (x0: number, y0: number, x1: number, y1: number, n = 12): PadPoint[] => Array.from({ length: n }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / (n - 1), y: y0 + ((y1 - y0) * i) / (n - 1) }));
  ok("drawing: nothing drawn → null", S.drawingOf([], pad) === null);
  ok("drawing: a stray tap is not a signature", S.drawingOf([[{ x: 100, y: 60 }]], pad) === null);
  ok("drawing: a tiny flick is not one either (w + h under 40)", S.drawingOf([line(100, 60, 104, 62)], pad) === null);
  const sig = S.drawingOf([line(40, 70, 180, 40), line(180, 40, 300, 80)], pad);
  ok("drawing: a real stroke counts, and is PEN v1", !!sig && validatePen(sig).ok);
  ok("drawing: it is exactly what penFromPad sends", JSON.stringify(sig) === JSON.stringify(penFromPad([line(40, 70, 180, 40), line(180, 40, 300, 80)], pad)));
  ok("drawing: no pad size → null", S.drawingOf([line(40, 70, 180, 40)], { width: 0, height: 0 }) === null);
  ok("pad: takes strokes up to the cap, then none", S.padTakesStroke(0) && S.padTakesStroke(PEN_MAX_STROKES - 1) && !S.padTakesStroke(PEN_MAX_STROKES));
  const d = penDemo("Rowan");
  ok("send: typed sends no drawing", S.sigToSend(true, d) === null);
  ok("send: drawn sends the drawing", S.sigToSend(false, d) === d);
  const good = S.checkPenName("Rowan", "Sunday Kite", () => ({ ok: true }));
  const bad = S.checkPenName("", "Sunday Kite", () => ({ ok: true }));
  ok("button: name + typed → on", S.canSign({ name: good, typed: true, drawing: null, busy: false }));
  ok("button: name + a drawing that counts → on", S.canSign({ name: good, typed: false, drawing: d, busy: false }));
  ok("button: name, drawing mode, nothing drawn → off", !S.canSign({ name: good, typed: false, drawing: null, busy: false }));
  ok("button: no name → off, even typed", !S.canSign({ name: bad, typed: true, drawing: null, busy: false }));
  ok("button: a courier name → off", !S.canSign({ name: S.checkPenName("Sunday Kite", "Sunday Kite", () => ({ ok: true })), typed: true, drawing: null, busy: false }));
  ok("button: off while sending", !S.canSign({ name: good, typed: true, drawing: null, busy: true }));
}

/* ── the pad, as both renderers size and ink it (the SwiftUI pad, 2026-10-27) ── */
{
  const { penStrokePath, PEN_W, PEN_H } = await import("../../lib/pen-signature.ts");
  ok("pad size: the sheet's content width at the box's aspect", (() => { const s = S.padSizeOf(375); return s.width === 343 && s.height === Math.round(343 * (PEN_H / PEN_W)); })());
  ok("pad size: never under 200 wide", S.padSizeOf(150).width === 200);
  ok("pad size: never over 600 wide", S.padSizeOf(1024).width === 600 && S.padSizeOf(1024).height === Math.round(600 * (PEN_H / PEN_W)));
  ok("pad size: whole points", Number.isInteger(S.padSizeOf(393).height));
  const a = [{ x: 10, y: 20 }, { x: 30, y: 25 }, { x: 50, y: 40 }];
  const b = [{ x: 70, y: 60 }];
  ok("ink: nothing drawn → no path", S.padInkPath([]) === "");
  ok("ink: one path, each stroke smoothed as penStrokePath does", S.padInkPath([a, b]) === penStrokePath([10, 20, 30, 25, 50, 40]) + penStrokePath([70, 60]));
  ok("ink: a tap is a dot", S.padInkPath([b]).includes("l0.1 0"));
  ok("points: pairs back into pad points", JSON.stringify(S.padPointsOf([1, 2, 3, 4])) === JSON.stringify([{ x: 1, y: 2 }, { x: 3, y: 4 }]));
  ok("points: an odd tail is dropped", S.padPointsOf([1, 2, 3]).length === 1);
  ok("points: junk is dropped", S.padPointsOf([1, "2", NaN, 4, 5, 6]).length === 1 && S.padPointsOf([1, "2", NaN, 4, 5, 6])[0].x === 5);
}

/* ── the words ── */
{
  const base = { courier: "Sunday Kite", theirSigned: false, handle: "", photo: false, isGuest: false };
  const first = S.sheetCopy(base, t);
  ok("copy: first to sign → the lead names their courier", first.lead === "id2.sheet.lead(name=Sunday Kite)");
  ok("copy: they signed → leadTheirs", S.sheetCopy({ ...base, theirSigned: true }, t).lead === "id2.sheet.leadTheirs(name=Sunday Kite)");
  ok("copy: no pen name yet → the first trade's note, empty field", first.firstTrade && first.nameNote === "id2.sheet.nameFirst");
  ok("copy: a pen name → the later note, pre-filled", !S.sheetCopy({ ...base, handle: "Rowan" }, t).firstTrade && S.sheetCopy({ ...base, handle: "Rowan" }, t).nameNote === "id2.sheet.nameLater");
  ok("copy: a pen name of spaces is still the first trade", S.sheetCopy({ ...base, handle: "  " }, t).firstTrade);
  ok("copy: a photo → its own face note", S.sheetCopy({ ...base, photo: true }, t).faceNote === "id2.sheet.facePhoto" && first.faceNote === "id2.sheet.faceNote");
  ok("copy: an account → no guest line", first.guest === null);
  ok("copy: a guest → the line and its link", JSON.stringify(S.sheetCopy({ ...base, isGuest: true }, t).guest) === JSON.stringify({ text: "id2.sheet.guest", link: "id2.sheet.guestLink" }));
  ok("a11y: a face is n of m", S.faceA11y("f-x", 2, 9, t) === "id2.sheet.faceA11y(n=2,m=9)");
  ok("a11y: No face says its name", S.faceA11y(null, 10, 9, t) === "id2.sheet.faceNone");
  ok("a11y: the pad has no value until drawn, then the strokes", S.padValue(0, t) === undefined && S.padValue(3, t) === "id2.sheet.padDrawn(n=3)");
}

/* ── after the answer ── */
{
  ok("demo: they signed first → it opens", S.demoSignResult(true).revealed === true && S.demoSignResult(true).via === "seal");
  ok("demo: I'm first → it waits", S.demoSignResult(false).revealed === false);
  const fail = S.afterSign(null, false);
  ok("after: a failure keeps the sheet as drawn", fail.outcome === "kept" && !fail.ceremony && !fail.waiting);
  ok("after: a refusal closes it (the thread is gone)", S.afterSign(null, true).outcome === "closed");
  const second = S.afterSign({ revealed: true, via: "seal" }, false);
  ok("after: the second signature → the ceremony", second.outcome === "signed" && second.ceremony && !second.waiting);
  const firstSig = S.afterSign({ revealed: false, via: "direct" }, false);
  ok("after: the first signature → YOU SIGNED · WAITING", firstSig.outcome === "signed" && !firstSig.ceremony && firstSig.waiting);
}

/* ── demo mode ── */
{
  let heard = 0;
  const off = S.subscribeSignDemo(() => heard++);
  ok("demo mode: off by default", S.signDemo() === null);
  S.setSignDemo({ handle: "", guest: true });
  ok("demo mode: set, and listeners hear it", S.signDemo()?.guest === true && heard === 1);
  S.setSignDemo(null);
  off();
  S.setSignDemo({ handle: "x", guest: false });
  ok("demo mode: an unsubscribed listener hears nothing more", heard === 2);
  S.setSignDemo(null);
}

/* ── the words exist, in English, in the one side file ── */
{
  const src = readFileSync(new URL("../../data/strings-identity2.ts", import.meta.url), "utf8");
  const model = readFileSync(new URL("./sign-sheet.ts", import.meta.url), "utf8");
  const keys = [...new Set([...model.matchAll(/"(id2\.(?:sheet|door)\.[A-Za-z]+)"/g)].map((m) => m[1]))];
  const missing = keys.filter((k) => !src.includes(`"${k}":`));
  ok(`words: every id2 key the model uses is in strings-identity2 (${keys.length})`, keys.length > 10 && missing.length === 0);
  if (missing.length) console.log("  missing:", missing.join(", "));
}

if (fails) {
  console.log(`\n${fails} failing`);
  process.exit(1);
}
console.log("\nall passing");
