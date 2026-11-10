/* Behaviour lock for Edit profile's model (screens/edit-profile/
   edit-profile-model): the pronoun (the account's before the phone's), the
   face pool by pronoun, the dice, the one-time note for the six legacy
   portraits only, the one-field page's rules (pen 20, courier 16 as
   lib/wren-name cuts, Wren reserved but never for the name she already
   has, empty never saved), the birthday read as a calendar date, the rows
   (birthday shown, never edited — and, for an account with none, set ONCE
   through the wheel on onboarding's own gate: owner's audit, 2026-11-10;
   no courier pronoun row), and the save
   queue (merged, each save handed over at once in call order, never
   behind another's network trip, flushed on leaving), and identity Phase
   1: ON YOUR LETTERS only with the switch on (the mark's switch for she /
   he only, the sign's always; the account's values read as 0034 reads
   them), the identity words for the hint and the footer, and the one-time
   note (who sees it, its words and preview, what Done saves) — the rules
   both renderers draw.
   Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/edit-profile/edit-profile-model.test.ts
   The model imports nothing at runtime. The face table and wren-name's
   limit are read as text (they import React Native). Every line prints
   ok/FAIL and the process exits non-zero if any fail. */

import { readFileSync } from "node:fs";
import {
  BIRTHDAY_WHEEL_YEARS,
  COURIER_NAME_MAX,
  FIELD_SPECS,
  NEW_FACES_FLAG,
  NONE,
  PEN_NAME_MAX,
  birthdayEditable,
  birthdaySetView,
  birthdayValue,
  buildEditView,
  checkField,
  createSaveQueue,
  facePool,
  fieldKind,
  identityNote,
  identityNoteSave,
  lettersView,
  markOffered,
  showIdentityNote,
  showsMark,
  showsSign,
  randomFace,
  resolvePronoun,
  setBirthdayOutcome,
  showNewFacesNote,
  type EditFacts,
  type EditFormat,
  type FaceDefLite,
} from "./edit-profile-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}{${Object.entries(v).map(([a, b]) => `${a}:${b}`).join(",")}}` : k);
const fmt: EditFormat = { t, birthday: (y, m, d) => `${y}/${m}/${d}` };

/* the real face table, read as text: id, pool, legacy */
const lib = readFileSync(new URL("../../data/aura-avatar-lib.ts", import.meta.url), "utf8");
const FACES: FaceDefLite[] = [...lib.matchAll(/\{ id: "([^"]+)", pool: "([mf])"[^}]*?(legacy: true)?\s*\}/g)].map((m) => ({ id: m[1], pool: m[2] as "m" | "f", legacy: !!m[3] }));
const legacyIds = FACES.filter((f) => f.legacy).map((f) => f.id);

/* ── the pronoun ── */
ok("the account's pronoun first (a new phone keeps it)", resolvePronoun("she", "they") === "she");
ok("the phone's when the account says nothing", resolvePronoun(undefined, "he") === "he");
ok("they/them when neither says", resolvePronoun(null, null) === "they");
ok("a bad value is ignored", resolvePronoun("xe", "she") === "she");

/* ── the faces ── */
ok("the face table reads: 56 portraits, six legacy", FACES.length === 56 && legacyIds.length === 6);
const she = facePool("she", FACES);
const he = facePool("he", FACES);
const they = facePool("they", FACES);
ok("she: the f pool", she.length > 0 && she.every((f) => f.pool === "f"));
ok("he: the m pool", he.length > 0 && he.every((f) => f.pool === "m"));
ok("they: all fifty", they.length === 50);
ok("never a legacy portrait offered", [...she, ...he, ...they].every((f) => !f.legacy));
ok("the dice never repeat the face worn", randomFace(she, she[0].id, () => 0) !== she[0].id);
ok("the dice stay in the pool", he.some((f) => f.id === randomFace(he, null, () => 0.999)));
ok("the dice with one face: that face", randomFace([she[0]], she[0].id, () => 0.5) === she[0].id);
ok("the dice with none: nothing", randomFace([], null, () => 0.5) === null);

/* ── the legacy note (owner question 12) ── */
const isLegacy = (id: string) => legacyIds.includes(id);
ok("a legacy portrait, not asked yet: the note", showNewFacesNote({ photo: false, avatarId: legacyIds[0], isLegacy, offered: false }));
ok("asked once: never again", !showNewFacesNote({ photo: false, avatarId: legacyIds[0], isLegacy, offered: true }));
ok("a photo: never", !showNewFacesNote({ photo: true, avatarId: legacyIds[0], isLegacy, offered: false }));
ok("a new portrait: never", !showNewFacesNote({ photo: false, avatarId: they[0].id, isLegacy, offered: false }));
ok("an old drawn face: never (new scope, owner)", !showNewFacesNote({ photo: false, avatarId: "m-anchor", isLegacy, offered: false }));
ok("no face: never", !showNewFacesNote({ photo: false, avatarId: null, isLegacy, offered: false }));
ok("the note's flag", NEW_FACES_FLAG === "new_faces_offered");

/* ── the one-field page ── */
const reserved = (n: string) => n.trim().toLowerCase() === "wren";
ok("the field kind defaults to the pen name", fieldKind("x") === "pen" && fieldKind("courier") === "courier");
ok("pen name: 20, onboarding's traits", PEN_NAME_MAX === 20 && FIELD_SPECS.pen.max === 20 && FIELD_SPECS.pen.autoCapitalize === "none" && !FIELD_SPECS.pen.autoCorrect);
ok("courier name: 16", COURIER_NAME_MAX === 16 && FIELD_SPECS.courier.max === 16);
const wrenName = readFileSync(new URL("../../lib/wren-name.ts", import.meta.url), "utf8");
ok("16 is what lib/wren-name cuts to", /export const WREN_NAME_MAX = 16;/.test(wrenName) && /slice\(0, WREN_NAME_MAX\)/.test(wrenName));
ok("a new pen name is saved, trimmed", JSON.stringify(checkField("pen", "  june  ", "may", reserved)) === JSON.stringify({ value: "june", save: true, error: null }));
ok("empty is never saved", !checkField("pen", "   ", "may", reserved).save);
ok("unchanged is not saved again", !checkField("pen", "may", "may", reserved).save);
ok("too long is cut, not refused", checkField("pen", "x".repeat(30), "may", reserved).value.length === 20);
ok("courier: Wren is reserved and not saved", JSON.stringify(checkField("courier", "wren", "Pip", reserved)) === JSON.stringify({ value: "wren", save: false, error: "reserved" }));
ok("courier: a name is saved, cut to 16", checkField("courier", "Bartholomew-the-Second", "Pip", reserved).value.length === 16);
ok("a pen name may be Wren (only the courier can't)", checkField("pen", "Wren", "may", reserved).save);
ok(
  "courier: her name unchanged is never called reserved (a Wren never renamed, and every visit's first moment)",
  JSON.stringify(checkField("courier", "Wren", "Wren", reserved)) === JSON.stringify({ value: "Wren", save: false, error: null }),
);
ok("courier: unchanged with spaces round it, still no error and no save", JSON.stringify(checkField("courier", " Wren ", "Wren", reserved)) === JSON.stringify({ value: "Wren", save: false, error: null }));
ok("courier: Wren typed over another name is still reserved", checkField("courier", "Wren", "Pip", reserved).error === "reserved");
ok("courier: a new case of her own Wren is a change, and reserved", checkField("courier", "wren", "Wren", reserved).error === "reserved");

/* ── the birthday ── */
ok("a birthday in the reader's form", birthdayValue("1991-11-01", fmt) === "1991/11/1");
ok("no birthday: —", birthdayValue(null, fmt) === NONE && birthdayValue("", fmt) === NONE);
ok("a bad date: —", birthdayValue("1991-13-01", fmt) === NONE);

/* ── a birthday, set once (owner's audit, 2026-11-10) ── */
ok("a birthday that exists is never editable", !birthdayEditable("1991-11-01"));
ok("no birthday: editable (null, undefined, '')", birthdayEditable(null) && birthdayEditable(undefined) && birthdayEditable(""));
ok("something stored that is no date: editable, as the row shows —", birthdayEditable("1991-13-01") && birthdayEditable("soon"));
ok("an adult's date is saved", setBirthdayOutcome({ current: null, verdict: "adult" }) === "save");
ok("an under-18 date is the block, never a save", setBirthdayOutcome({ current: null, verdict: "minor" }) === "block");
ok("the wheel not turned: nothing", setBirthdayOutcome({ current: "", verdict: "unanswered" }) === "nothing");
ok(
  "a birthday that exists is never written over, whatever the answer",
  setBirthdayOutcome({ current: "1991-11-01", verdict: "adult" }) === "nothing" && setBirthdayOutcome({ current: "1991-11-01", verdict: "minor" }) === "nothing",
);
const flowText = readFileSync(new URL("../onboarding/flow.ts", import.meta.url), "utf8");
ok("the wheel goes back as far as onboarding's (flow WHEEL_YEARS)", new RegExp(`export const WHEEL_YEARS = ${BIRTHDAY_WHEEL_YEARS};`).test(flowText));
ok("the verdicts are onboarding's gate's three", /export type Gate = "unanswered" \| "adult" \| "minor";/.test(flowText));
{
  const wheel = { today: { y: 2026, m: 11, d: 10 }, locale: "en-US" };
  const set = birthdaySetView(null, wheel, t);
  ok("the sheet's words: the row's own title, onboarding's line, the key, the once line, the ✕", set?.title === "ep.birthday" && set.body === "ob2.birthday.before" && set.key === "bd.sheet.key" && set.once === "bd.sheet.once" && set.closeLabel === "wren.trackClose" && set.hint === "bd.row.hint");
  ok("the wheel: today, a hundred years of them, the reader's locale", JSON.stringify(set?.today) === JSON.stringify(wheel.today) && set?.minYear === 1927 && set.locale === "en-US");
  ok("a birthday set: no button, no sheet", birthdaySetView("1991-11-01", wheel, t) === null);
  ok("no wheel facts (a caller that never asked): no button", birthdaySetView(null, undefined, t) === null);
}

/* ── the page ── */
const facts = (over: Partial<EditFacts> = {}): EditFacts => ({
  handle: "maynaa",
  dob: "1991-11-01",
  pronoun: "she",
  wren: "Pip",
  avatarId: she[2].id,
  photo: false,
  pool: she,
  newFacesNote: false,
  ...over,
});
{
  const v = buildEditView(facts(), fmt);
  ok("the title and back", v.title === "ep.title" && v.backLabel === "a11y.back");
  ok("the camera button is named, its menu has the photo and the dice", v.cameraLabel === "ep.cameraA11y" && v.photoLabel === "ep.choosePhoto" && v.randomLabel === "ep.random");
  ok("the avatar's note is the true one", v.avatarHint === "ep.avatarNote");
  ok("the strip: the pool, each face named for VoiceOver", v.faces.length === she.length && v.faces[0].a11y === `ep.faceA11y{n:1,total:${she.length}}`);
  ok("the face worn is selected", v.selectedFace === she[2].id);
  ok("a photo: no face selected", buildEditView(facts({ photo: true }), fmt).selectedFace === "");
  ok("YOU: pen name, pronouns, birthday", v.youHeader === "ui.you" && v.pen.label === "set.penName" && v.pronoun.label === "ep.pronouns" && v.birthday.label === "ep.birthday");
  ok("the pen name shows", v.pen.value === "maynaa");
  ok("no pen name: —", buildEditView(facts({ handle: " " }), fmt).pen.value === NONE);
  ok("pronouns: she / he / they, the one held selected", v.pronoun.options.map((o) => o.id).join(",") === "she,he,they" && v.pronoun.selected === "she" && v.pronoun.value === "pr.she");
  ok("the birthday is a value only", v.birthday.value === "1991/11/1" && !("options" in v.birthday));
  const wheel = { today: { y: 2026, m: 11, d: 10 }, locale: "en-US" };
  ok("a birthday set: shown, never edited (no button, even with the wheel's facts)", v.birthdaySet === null && buildEditView(facts({ wheel }), fmt).birthdaySet === null);
  const none = buildEditView(facts({ dob: null, wheel }), fmt);
  ok("no birthday: the row shows — and is the wheel's button", none.birthday.value === NONE && none.birthdaySet?.key === "bd.sheet.key");
  ok("no birthday, no wheel facts: the row as it was", buildEditView(facts({ dob: null }), fmt).birthdaySet === null);
  ok("YOUR COURIER: her name only (no pronoun row, owner question 13)", v.courierHeader === "me.sec.courier" && v.courier.label === "ep.name" && v.courier.value === "Pip");
  ok("the footer is the private note", v.footer === "ep.privateNote");
  ok("no note unless asked", v.note === null);
  const note = buildEditView(facts({ newFacesNote: true }), fmt).note;
  ok("the note: its words and three new faces", note?.title === "ep.newFaces.title" && note.see === "ep.newFaces.see" && note.keep === "ep.newFaces.keep" && note.faceIds.length === 3);
}

/* ── what strangers see (identity Phase 1) ── */
{
  const off = buildEditView(facts({ letters: { identity: false, showMark: true, showSign: true, sign: "scorpio" } }), fmt);
  ok("switch off: no ON YOUR LETTERS, the page as it was", off.letters === null && off.avatarHint === "ep.avatarNote" && off.footer === "ep.privateNote");
  ok("no letters facts at all: the page as it was", buildEditView(facts(), fmt).letters === null);
  const on = buildEditView(facts({ letters: { identity: true, showMark: undefined, showSign: undefined, sign: "scorpio" } }), fmt);
  ok("switch on: the group and its header", on.letters?.header === "ep.id.section");
  ok("switch on: the identity words for the hint and the footer", on.avatarHint === "id.ep.avatarNote" && on.footer === "id.ep.privateNote");
  ok("she: the ♀ switch, off until answered (0034: only a real true shows)", on.letters?.mark?.label === "ep.id.mark.she" && on.letters.mark.note === "ep.id.markNote" && on.letters.mark.on === false);
  ok("the sign: on by default, the sign named under it", on.letters?.sign.label === "ep.id.sign" && on.letters.sign.on === true && on.letters.sign.note === "ep.id.signNote{sign:zd.scorpio}");
  const he = buildEditView(facts({ pronoun: "he", letters: { identity: true, showMark: true, showSign: false, sign: null } }), fmt);
  ok("he: the ♂ switch, as the account holds it", he.letters?.mark?.label === "ep.id.mark.he" && he.letters.mark.on === true);
  ok("the sign turned off stays off; no birthday says so", he.letters?.sign.on === false && he.letters.sign.note === "ep.id.signNone");
  const they = buildEditView(facts({ pronoun: "they", letters: { identity: true, showMark: true, showSign: true, sign: "leo" } }), fmt);
  ok("they: no mark switch at all (they have no mark)", they.letters?.mark === null && they.letters.sign.on === true);
  ok("the mark is offered to she and he only", markOffered("she") && markOffered("he") && !markOffered("they"));
  ok("showMark: only a real true (\"true\", 1, unset are off)", showsMark(true) && !showsMark("true") && !showsMark(1) && !showsMark(undefined) && !showsMark(false));
  ok("showSign: anything but false (unset is on)", showsSign(undefined) && showsSign(true) && showsSign(null) && !showsSign(false));
  const made = { used: false, made: [] };
  ok("the ＋ cell on: its own note, which tells the two photos apart (switch off or on)",
    buildEditView(facts({ make: made }), fmt).avatarHint === "mf.ep.avatarNote" &&
      buildEditView(facts({ make: made, letters: { identity: true, showMark: true, showSign: true, sign: "leo" } }), fmt).avatarHint === "mf.ep.avatarNote");
  ok("lettersView is the page's group", JSON.stringify(lettersView("she", { showMark: true, showSign: false, sign: "leo" }, t)) === JSON.stringify({ header: "ep.id.section", mark: { label: "ep.id.mark.she", note: "ep.id.markNote", on: true }, sign: { label: "ep.id.sign", note: "ep.id.signNote{sign:zd.leo}", on: false } }));
}

/* ── the one-time note (identity Phase 1) ── */
{
  const base = { identity: true, session: true, onboarded: true, showMark: undefined as unknown, showSign: undefined as unknown, seen: false };
  ok("the note: switch on, signed in, onboarded, never answered, not seen here", showIdentityNote(base));
  ok("never with the switch off", !showIdentityNote({ ...base, identity: false }));
  ok("never without a session, or before onboarding is done", !showIdentityNote({ ...base, session: false }) && !showIdentityNote({ ...base, onboarded: false }));
  ok("never twice on this phone", !showIdentityNote({ ...base, seen: true }));
  ok("never once the account holds an answer (either value)", !showIdentityNote({ ...base, showMark: false }) && !showIdentityNote({ ...base, showSign: true }));
  const n = identityNote({ pronoun: "she", showMark: undefined, showSign: undefined, sign: "gemini", previewName: "Sunday Kite" }, t);
  ok("the note's words", n.title === "id.note.title" && n.body === "id.note.body" && n.foot === "id.note.foot" && n.done === "id.note.done" && n.previewLabel === "id.preview");
  ok("both switches inside it: the mark's off, the sign's on", n.letters.mark?.on === false && n.letters.sign.on === true);
  ok("the preview says what a stranger sees: the name and the sign (no mark until it is on)", n.previewName === "Sunday Kite" && n.previewA11y === "id.preview.a11y{who:Sunday Kite, zd.gemini}");
  const n2 = identityNote({ pronoun: "she", showMark: true, showSign: false, sign: "gemini", previewName: "Sunday Kite" }, t);
  ok("the preview follows the switches", n2.previewA11y === "id.preview.a11y{who:Sunday Kite, id.mark.she}");
  const nt = identityNote({ pronoun: "they", showMark: true, showSign: true, sign: null, previewName: "Rainy Thimble" }, t);
  ok("they: the body without the mark, no mark switch, no sign without a birthday", nt.body === "id.note.bodyThey" && nt.letters.mark === null && nt.previewA11y === "id.preview.a11y{who:Rainy Thimble}");
  ok("Done saves both values (so it never comes back)", JSON.stringify(identityNoteSave("she", false, true)) === JSON.stringify({ showMark: false, showSign: true }));
  ok("Done never saves a mark on for they", identityNoteSave("they", true, false).showMark === false);
}

/* ── the save queue ── */
{
  type Timer = { fn: () => void; at: number };
  let clock = 0;
  const timers = new Map<number, Timer>();
  let nextId = 1;
  const fake = {
    set: (fn: () => void, ms: number) => {
      const id = nextId++;
      timers.set(id, { fn, at: clock + ms });
      return id;
    },
    clear: (h: unknown) => void timers.delete(h as number),
  };
  const advance = async (ms: number) => {
    clock += ms;
    for (const [id, tm] of [...timers]) if (tm.at <= clock) {
      timers.delete(id);
      tm.fn();
    }
    await new Promise((r) => setTimeout(r, 0));
  };

  /* `called` is what auth.saveProfile was handed and when (it writes the phone's copy in that
     call); `sent` is what has finished (its account sync). */
  const called: Record<string, unknown>[] = [];
  const sent: Record<string, unknown>[] = [];
  const save = async (p: Record<string, unknown>) => {
    called.push(p);
    await new Promise((r) => setTimeout(r, 5));
    sent.push(p);
  };
  const q = createSaveQueue(save, 600, fake, () => {});

  q.later({ avatarId: "a" });
  q.later({ avatarId: "b" });
  ok("two quick picks wait as one", q.waiting && called.length === 0);
  await advance(599);
  ok("nothing goes before the picks settle", called.length === 0);
  await advance(1);
  await new Promise((r) => setTimeout(r, 20));
  ok("then one save, the last pick", sent.length === 1 && sent[0].avatarId === "b");

  q.later({ avatarId: "c" });
  await q.now({ pronoun: "he" });
  ok("a pronoun goes now, carrying the face that waited", sent.length === 2 && sent[1].avatarId === "c" && sent[1].pronoun === "he");
  ok("and the face's timer is gone", timers.size === 0 && !q.waiting);

  q.later({ avatarId: "d" });
  const p1 = q.now({ pronoun: "they" });
  q.later({ avatarId: "e" });
  const p2 = q.flush();
  ok("each save is handed over at once, in call order, without waiting for the one before to finish", called.length === 4 && called[2].pronoun === "they" && called[2].avatarId === "d" && called[3].avatarId === "e" && sent.length === 2);
  await Promise.all([p1, p2]);
  ok("a flush resolves once everything handed over has finished", sent.length === 4 && sent.includes(called[2]) && sent.includes(called[3]));

  await q.flush();
  ok("a flush with nothing waiting sends nothing", called.length === 4 && sent.length === 4);

  /* the case that lost a face: a pick while the one before is still on its way to the account */
  {
    const handed: Record<string, unknown>[] = [];
    let release = () => {};
    const slow = createSaveQueue(
      (p) => {
        handed.push(p);
        return handed.length === 1 ? new Promise<void>((r) => (release = r)) : Promise.resolve();
      },
      600,
      fake,
      () => {},
    );
    slow.later({ avatarId: "A" });
    await advance(600);
    ok("face A is handed over (its sync still out)", handed.length === 1);
    slow.later({ avatarId: "B" });
    const left = slow.flush(); // leaving the page, or the app going to the background
    ok("face B is written at once, not after A's round trip", handed.length === 2 && handed[1].avatarId === "B");
    let settled = false;
    void left.then(() => (settled = true));
    await new Promise((r) => setTimeout(r, 0));
    ok("but the flush still waits for A to finish", !settled);
    release();
    await left;
    ok("and resolves once it has", true);
  }

  let throws = 0;
  const sync = createSaveQueue(() => { throw new Error("thrown at once"); }, 600, fake, () => throws++);
  await sync.now({ a: 1 });
  ok("a save that throws at once is reported, and the queue still resolves", throws === 1);

  let errors = 0;
  const bad = createSaveQueue(async () => { throw new Error("offline"); }, 600, fake, () => errors++);
  const good: Record<string, unknown>[] = [];
  await bad.now({ handle: "x" });
  ok("a failed save is reported, and the queue goes on", errors === 1);
  const chained = createSaveQueue(async (p) => { good.push(p); }, 600, fake, () => {});
  await chained.now({ a: 1 });
  ok("a fresh queue sends", good.length === 1);
}

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
