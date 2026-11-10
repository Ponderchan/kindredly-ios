/* EDIT PROFILE, AS ONE PURE VIEW (10a step 5, slice settings-profile).
   ────────────────────────────────────────────────────────────────────────
   Edit profile is its own page now, pushed in the Me tab's stack (owner),
   with these fields, each saving on its own (P:310):
   - the avatar block: your face (a photo, a portrait, an old drawn face or
     the mosaic: AvatarImage, a React Native island in the Swift page) and
     the camera button's menu, Choose a photo / Random face;
   - the face strip: the portraits offered, the pool following your
     pronoun (she → f, he → m, they → all, as onboarding does), the one-time
     note for the six legacy portraits over it (owner question 12);
   - YOU: Pen name ›, Pronouns (a she / he / they menu), Birthday (shown,
     never edited: no chevron, not a button — but see A BIRTHDAY, SET ONCE
     below for an account that has none), ep.privateNote under them;
   - YOUR COURIER: Name › (owner question 13: no courier pronoun row).
   Pen name and Name open the one-field page (edit-field), where going back
   saves. A face or a photo applies at once; the account hears about it
   once the picks stop (createSaveQueue below), and a pronoun at once.

   MAKE YOUR OWN FACE (owner, 2026-10-26; only with the "makeface" switch
   on): the strip starts with a ＋ cell tagged FREE · ONCE until the free
   face is made, 1ST CLASS after (mf.tag.*); the faces Wren made come next,
   newest first, chosen and worn exactly like a portrait (their ids are
   "made-<uuid>"). Switch off, the page is exactly what it was.

   WITH THE IDENTITY SWITCH ON (identity Phase 1: identity-plan §4 and its
   zodiac addendum) the page gains ON YOUR LETTERS between YOU and its
   footer: "Show ♀ / ♂ on your letters" (only for she and he: they and
   unset have no mark, so no switch) and "Star sign on your letters", each
   saving user_metadata showMark / showSign at once, the way a pronoun is
   saved (web 0034's marks_for reads them: the mark only for a real true,
   the sign unless false). The avatar's hint and the footer take their
   true-again words (id.ep.avatarNote, id.ep.privateNote). Switch off, the
   page is exactly what it was: no group, the old words.

   THE ONE-TIME NOTE (identityNote below), for someone who was here before
   the switch: shown once, over the tabs, with both switches inside it (the
   mark's starts off for an existing she/he user, whose pronoun was given
   as "only used in how the app talks about you"; the sign's starts on),
   a live preview of how a stranger sees them, and one Done. Either way the
   two values are saved, so it never comes back on any phone.

   A BIRTHDAY, SET ONCE (owner's audit, 2026-11-10). "Shown, never edited"
   stays the rule for a birthday that exists: it carries the 18+ gate. But
   an account with NO birthday (older accounts, some sign-in paths) saw "—",
   could not tap it, and the star sign's switch under it said "Shows once
   your birthday is set": a dead end. So when, and only when, the row shows
   "—" (birthdayEditable: nothing stored, or nothing that is a date) the
   view carries `birthdaySet`: the row gets its chevron and opens a date
   wheel in an iOS sheet, resting on today as onboarding's wheel does, its
   key dim until a year is turned. Before anything is saved the system asks
   once more, naming the date, and says it can't be changed afterwards.
   What the answer does is setBirthdayOutcome below, on the verdict of
   ONBOARDING'S OWN gate (screens/onboarding/flow gate(): no second rule):
   an adult's date is saved where onboarding saves it (user_metadata.dob,
   through auth.saveProfile) and the row is "shown, never edited" from then
   on, with the star sign named under its switch; an under-18 date is never
   saved and gets onboarding's block (the hook: device-block's storage, the
   session ended, onboarding's own "Not yet." screen and words). A birthday
   that already exists is never written over, whatever asks.

   Both renderers draw exactly this view (EditProfileNative in SwiftUI,
   EditProfileRN as the remote switch's fallback); the hook
   (useEditProfileModel) reads the account and the phone and does the work.
   This file imports nothing at runtime, so its node test runs with plain
   node (edit-profile-model.test.ts). */

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export type PronounId = "she" | "he" | "they";
export const PRONOUN_IDS: readonly PronounId[] = ["she", "he", "they"];
export const DEFAULT_PRONOUN: PronounId = "they";

/** The longest pen name (onboarding's field, onboarding.tsx maxLength 20). */
export const PEN_NAME_MAX = 20;
/** The longest courier name: lib/wren-name WREN_NAME_MAX, which saveWrenName cuts to (the
    rename prompt used to take 18 and lose two without a word). Kept equal by the test. */
export const COURIER_NAME_MAX = 16;
/** How long the face picks settle before the account hears of them. */
export const FACE_SAVE_DELAY_MS = 600;
/** The legacy note's flag (lib/flags): set by either of its buttons and by any face change. */
export const NEW_FACES_FLAG = "new_faces_offered";
/** What a missing value shows. */
export const NONE = "—";

export const isPronounId = (v: unknown): v is PronounId => v === "she" || v === "he" || v === "they";

/** Your pronoun: the account's (user_metadata.pronoun, which the matcher reads and which a new
    phone still has) before this phone's copy (kindredly_you_pronoun, which reads they/them on a
    new phone or after a reinstall), and they/them when neither says. */
export function resolvePronoun(account: unknown, device: unknown): PronounId {
  if (isPronounId(account)) return account;
  if (isPronounId(device)) return device;
  return DEFAULT_PRONOUN;
}

/* ── the faces ─────────────────────────────────────────────────────────── */

export type FaceDefLite = { id: string; pool: "m" | "f"; legacy?: boolean };

/** The faces offered for a pronoun, in the library's order: she → the f pool, he → the m pool,
    they → all of them (the onboarding rule, so the strip and the dice never offer a face from
    the other pool). Legacy portraits are never offered. */
export function facePool<F extends FaceDefLite>(pronoun: PronounId, faces: readonly F[]): F[] {
  const offered = faces.filter((f) => !f.legacy);
  if (pronoun === "she") return offered.filter((f) => f.pool === "f");
  if (pronoun === "he") return offered.filter((f) => f.pool === "m");
  return offered;
}

/** A face from the pool for the dice: never the one already worn while there is another.
    `rand` is Math.random's shape. */
export function randomFace(pool: readonly FaceDefLite[], current: string | null, rand: () => number): string | null {
  const choices = pool.length > 1 ? pool.filter((f) => f.id !== current) : pool;
  if (!choices.length) return null;
  const i = Math.min(choices.length - 1, Math.floor(rand() * choices.length));
  return choices[i].id;
}

/** The one-time note over the face strip (owner question 12): only for someone wearing one of
    the six legacy portraits (kept for whoever chose one, no longer offered), not wearing a
    photo, and not yet asked. Never for the thirty old drawn faces (new scope, owner) or for
    someone with no face. */
export function showNewFacesNote(f: { photo: boolean; avatarId: string | null; isLegacy: (id: string) => boolean; offered: boolean }): boolean {
  return !f.photo && !!f.avatarId && f.isLegacy(f.avatarId) && !f.offered;
}

/* ── the fields on the one-field page ──────────────────────────────────── */

export type FieldKind = "pen" | "courier";

export const fieldKind = (v: unknown): FieldKind => (v === "courier" ? "courier" : "pen");

export type FieldSpec = {
  max: number;
  /** onboarding's traits for the pen name: no capitals forced, no autocorrect */
  autoCapitalize: "none" | "words";
  autoCorrect: boolean;
};

export const FIELD_SPECS: Readonly<Record<FieldKind, FieldSpec>> = {
  pen: { max: PEN_NAME_MAX, autoCapitalize: "none", autoCorrect: false },
  courier: { max: COURIER_NAME_MAX, autoCapitalize: "words", autoCorrect: false },
};

/** What leaving the one-field page does with what was typed: save it only when it is a real,
    changed value. Empty is never saved (the old one stays), and the courier can't take her own
    official name (reserved: shown under the field as it is typed, and not saved).
    UNCHANGED COMES FIRST: the name she already has is never called reserved. An account that
    never named her is still "Wren", and every visit opens on "Wren" for a moment while her name
    is read from the phone (useWrenName starts at DEFAULT_WREN), so testing reserved first put the
    red line up the moment the page opened, telling them the name they have isn't allowed (the
    old Settings prompt returned on an unchanged value before it looked). */
export function checkField(kind: FieldKind, raw: string, current: string, isReserved: (name: string) => boolean): { value: string; save: boolean; error: "reserved" | null } {
  const value = raw.trim().slice(0, FIELD_SPECS[kind].max);
  if (value === current.trim()) return { value, save: false, error: null };
  if (kind === "courier" && value && isReserved(value)) return { value, save: false, error: "reserved" };
  return { value, save: value.length > 0, error: null };
}

/* ── the page ──────────────────────────────────────────────────────────── */

export type EditFacts = {
  handle: string;
  /** user_metadata.dob, "YYYY-MM-DD"; null for none */
  dob: string | null;
  pronoun: PronounId;
  /** what strangers may see (identity Phase 1); absent = the switch off, the page as it was */
  letters?: LettersFacts;
  wren: string;
  /** the portrait or old face worn; null for none (a photo, or never picked) */
  avatarId: string | null;
  /** a photo is worn (it wins over the face) */
  photo: boolean;
  /** the faces offered for the pronoun, in order */
  pool: readonly { id: string }[];
  /** the legacy note shows */
  newFacesNote: boolean;
  /** Make your own face: absent while its switch is off */
  make?: MakeFacts;
  /** what the birthday wheel needs (today, the reader's locale); absent = the row is never a button */
  wheel?: BirthdayWheelFacts;
};

/** Today on the reader's own calendar (month 1–12) and the locale the wheel names its months in. */
export type BirthdayWheelFacts = { today: { y: number; m: number; d: number }; locale: string };
/** How many years the wheel goes back: onboarding's (screens/onboarding/flow WHEEL_YEARS). Kept equal by the test. */
export const BIRTHDAY_WHEEL_YEARS = 100;

/** What the ＋ cell knows: the free face is spent, and the faces made (avatar ids, newest first). */
export type MakeFacts = { used: boolean; made: readonly string[] };
/** at most this many made faces ride in the strip */
export const MADE_IN_STRIP = 3;

export type EditFormat = {
  t: TFn;
  /** a birthday in the reader's language, from its parts (month 1-12) */
  birthday: (y: number, m: number, d: number) => string;
};

export type EditRowVM = { label: string; value: string };
export type PronounOptionVM = { id: PronounId; label: string };

export type NewFacesNoteVM = {
  title: string;
  body: string;
  see: string;
  keep: string;
  /** up to three of the new faces, as a glimpse */
  faceIds: string[];
};

/** One switch on the page or in the note: its words and the value the account holds. */
export type LetterToggleVM = { label: string; note: string; on: boolean };

/** ON YOUR LETTERS: the mark's switch (null for they / unset) and the sign's. */
export type LettersVM = { header: string; mark: LetterToggleVM | null; sign: LetterToggleVM };

/** The Birthday row as a button, and its wheel sheet (only while no birthday is set). */
export type BirthdaySetVM = {
  /** VoiceOver's hint on the row */
  hint: string;
  /** the sheet: its title, the line under it, the key under the wheel, the small line under the key, the ✕ */
  title: string;
  body: string;
  key: string;
  once: string;
  closeLabel: string;
  /** today (month 1–12): where the wheel rests, and its last day */
  today: { y: number; m: number; d: number };
  /** the oldest year on the wheel */
  minYear: number;
  /** BCP-47, for the wheel's month names */
  locale: string;
};

export type EditView = {
  title: string;
  backLabel: string;
  cameraLabel: string;
  photoLabel: string;
  randomLabel: string;
  avatarHint: string;
  facesHeader: string;
  faces: { id: string; a11y: string }[];
  /** the face picked in the strip; "" while a photo is worn or none is */
  selectedFace: string;
  /** Make your own face's ＋ cell; null while its switch is off */
  make: { tag: string; firstClass: boolean; a11y: string } | null;
  note: NewFacesNoteVM | null;
  youHeader: string;
  pen: EditRowVM;
  pronoun: EditRowVM & { options: PronounOptionVM[]; selected: PronounId };
  birthday: EditRowVM;
  /** no birthday yet: the row is a button that opens the wheel; null once one is set (shown, never edited) */
  birthdaySet: BirthdaySetVM | null;
  /** identity switch on: ON YOUR LETTERS, between YOU and the footer; null while it is off */
  letters: LettersVM | null;
  courierHeader: string;
  courier: EditRowVM;
  footer: string;
};

/** "YYYY-MM-DD" → the reader's long date, or NONE. Parsed as a calendar date, not as UTC
    midnight (which shows the day before west of Greenwich). */
export function birthdayValue(dob: string | null | undefined, fmt: Pick<EditFormat, "birthday">): string {
  const hit = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob ?? "");
  if (!hit) return NONE;
  const y = Number(hit[1]);
  const m = Number(hit[2]);
  const d = Number(hit[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return NONE;
  return fmt.birthday(y, m, d);
}

/* ── a birthday, set once (owner's audit, 2026-11-10) ───────────────────── */

/** May a birthday be set here? Only while the row shows "—": nothing stored, or nothing that reads
    as a date. A birthday that exists is shown, never edited. */
export function birthdayEditable(dob: string | null | undefined): boolean {
  return birthdayValue(dob, { birthday: () => "set" }) === NONE;
}

/** The row as a button and its sheet's words, or null when a birthday exists (or the hook gave no wheel). */
export function birthdaySetView(dob: string | null | undefined, wheel: BirthdayWheelFacts | undefined, t: TFn): BirthdaySetVM | null {
  if (!wheel || !birthdayEditable(dob)) return null;
  return {
    hint: t("bd.row.hint"),
    title: t("ep.birthday"),
    // onboarding's own line under its wheel's headline: what the date is for, and that it stays private
    body: t("ob2.birthday.before"),
    key: t("bd.sheet.key"),
    once: t("bd.sheet.once"),
    closeLabel: t("wren.trackClose"),
    today: wheel.today,
    minYear: wheel.today.y - (BIRTHDAY_WHEEL_YEARS - 1),
    locale: wheel.locale,
  };
}

/** Onboarding's gate's three answers (screens/onboarding/flow Gate), written out: this file imports nothing at runtime. */
export type BirthdayVerdict = "unanswered" | "adult" | "minor";

/**
 * What an answer on the wheel does, on the verdict of onboarding's own gate for that date:
 * - a birthday already exists → nothing, ever (it is never written over);
 * - unanswered (the wheel not turned: this year or later, or no real day) → nothing, as
 *   onboarding's key stays dim;
 * - minor → the block, exactly onboarding's (the hook does it); the date is not saved;
 * - adult → save it.
 */
export function setBirthdayOutcome(f: { current: string | null | undefined; verdict: BirthdayVerdict }): "nothing" | "block" | "save" {
  if (!birthdayEditable(f.current)) return "nothing";
  if (f.verdict === "minor") return "block";
  return f.verdict === "adult" ? "save" : "nothing";
}

/* ── what strangers see beside your courier name (identity Phase 1) ─────── */

/** What the page and the note know about the two switches. */
export type LettersFacts = {
  /** the identity switch (lib/identity useIdentityOn) */
  identity: boolean;
  /** user_metadata.showMark as stored (true / false / missing) */
  showMark: unknown;
  /** user_metadata.showSign as stored */
  showSign: unknown;
  /** your own star sign from your birthday (lib/zodiac zodiacFromDob); null with no birthday */
  sign: string | null;
};

/** The mark is offered to she and he only: they and unset have no mark, so no switch. */
export const markOffered = (p: PronounId): boolean => p === "she" || p === "he";
/** The mark shows only for a real true (0034: unset is "not answered yet", hidden). */
export const showsMark = (v: unknown): boolean => v === true;
/** The sign shows unless it was turned off (0034: on by default). */
export const showsSign = (v: unknown): boolean => v !== false;
/* lib/zodiac zodiacKey, written out: this file imports nothing at runtime */
const signKey = (sign: string): string => "zd." + sign;

/** The two switches as the page and the note word them: the mark's for she / he only. */
export function lettersView(pronoun: PronounId, f: Pick<LettersFacts, "showMark" | "showSign" | "sign">, t: TFn): LettersVM {
  return {
    header: t("ep.id.section"),
    mark: markOffered(pronoun) ? { label: t(pronoun === "she" ? "ep.id.mark.she" : "ep.id.mark.he"), note: t("ep.id.markNote"), on: showsMark(f.showMark) } : null,
    sign: { label: t("ep.id.sign"), note: f.sign ? t("ep.id.signNote", { sign: t(signKey(f.sign)) }) : t("ep.id.signNone"), on: showsSign(f.showSign) },
  };
}

/** The one-time note's flag (lib/flags): this phone has shown it (the account's two values say it everywhere else). */
export const IDENTITY_NOTE_FLAG = "identity_note_seen";

/**
 * The one-time note for someone who was here before the switch: the switch is on, there is a
 * session and they finished onboarding, neither switch was ever saved on their account (the new
 * onboarding will save both for a new user; until it ships, a new user gets this note too), and
 * this phone hasn't shown it.
 */
export function showIdentityNote(f: { identity: boolean; session: boolean; onboarded: boolean; showMark: unknown; showSign: unknown; seen: boolean }): boolean {
  if (!f.identity || !f.session || !f.onboarded || f.seen) return false;
  return typeof f.showMark !== "boolean" && typeof f.showSign !== "boolean";
}

export type IdentityNoteVM = {
  title: string;
  body: string;
  /** YOU, TO A STRANGER: over the live preview */
  previewLabel: string;
  /** the preview's courier name for you, as a stranger's courier in your language would give it */
  previewName: string;
  /** VoiceOver: the preview as one element */
  previewA11y: string;
  letters: LettersVM;
  foot: string;
  done: string;
};

/** The note's words, the preview and its two switches (the mark's for she / he only). */
export function identityNote(
  f: { pronoun: PronounId; showMark: unknown; showSign: unknown; sign: string | null; previewName: string },
  t: TFn,
): IdentityNoteVM {
  const letters = lettersView(f.pronoun, f, t);
  const spoken = [
    f.previewName,
    letters.mark?.on ? t(`id.mark.${f.pronoun}`) : "",
    letters.sign.on && f.sign ? t(signKey(f.sign)) : "",
  ]
    .filter(Boolean)
    .join(", ");
  return {
    title: t("id.note.title"),
    body: t(markOffered(f.pronoun) ? "id.note.body" : "id.note.bodyThey"),
    previewLabel: t("id.preview"),
    previewName: f.previewName,
    previewA11y: t("id.preview.a11y", { who: spoken }),
    letters,
    foot: t("id.note.foot"),
    done: t("id.note.done"),
  };
}

/** What Done saves: both values, always, so the note never comes back on any phone. The mark is
    never saved on for they / unset. */
export function identityNoteSave(pronoun: PronounId, showMark: boolean, showSign: boolean): { showMark: boolean; showSign: boolean } {
  return { showMark: markOffered(pronoun) && showMark, showSign };
}

export function buildEditView(f: EditFacts, fmt: EditFormat): EditView {
  const { t } = fmt;
  const total = f.pool.length;
  const on = !!f.letters?.identity;
  return {
    title: t("ep.title"),
    backLabel: t("a11y.back"),
    cameraLabel: t("ep.cameraA11y"),
    photoLabel: t("ep.choosePhoto"),
    randomLabel: t("ep.random"),
    // switch on: the true-again words (strangers see a window, never your face; a kindred the one you had at signing).
    // With the ＋ cell (make your own face) a photo can travel to be painted, so "a photo never leaves
    // this phone" stops being true: its own line tells the two photos apart (2026-10-27)
    avatarHint: t(f.make ? "mf.ep.avatarNote" : on ? "id.ep.avatarNote" : "ep.avatarNote"),
    facesHeader: t("ep.faces"),
    faces: [
      // the faces Wren made, first (switch on); named like the rest, after the portraits' count
      ...(f.make?.made ?? []).slice(0, MADE_IN_STRIP).map((id) => ({ id, a11y: t("mf.result.a11y") })),
      ...f.pool.map((face, i) => ({ id: face.id, a11y: t("ep.faceA11y", { n: i + 1, total }) })),
    ],
    selectedFace: f.photo || !f.avatarId ? "" : f.avatarId,
    make: f.make ? { tag: t(f.make.used ? "mf.tag.first" : "mf.tag.once"), firstClass: f.make.used, a11y: t("mf.entry.a11y") } : null,
    note: f.newFacesNote
      ? {
          title: t("ep.newFaces.title"),
          body: t("ep.newFaces.body"),
          see: t("ep.newFaces.see"),
          keep: t("ep.newFaces.keep"),
          faceIds: f.pool.slice(0, 3).map((x) => x.id),
        }
      : null,
    youHeader: t("ui.you"),
    pen: { label: t("set.penName"), value: f.handle.trim() || NONE },
    pronoun: {
      label: t("ep.pronouns"),
      value: t(`pr.${f.pronoun}`),
      options: PRONOUN_IDS.map((id) => ({ id, label: t(`pr.${id}`) })),
      selected: f.pronoun,
    },
    birthday: { label: t("ep.birthday"), value: birthdayValue(f.dob, fmt) },
    birthdaySet: birthdaySetView(f.dob, f.wheel, t),
    letters: on && f.letters ? lettersView(f.pronoun, f.letters, t) : null,
    courierHeader: t("me.sec.courier"),
    courier: { label: t("ep.name"), value: f.wren },
    footer: t(on ? "id.ep.privateNote" : "ep.privateNote"),
  };
}

/* ── saving, one field at a time ───────────────────────────────────────── */

export type ProfilePatch = Record<string, unknown>;

export type SaveQueue = {
  /** a change that can wait: merged with what is waiting, sent once the picks stop */
  later(patch: ProfilePatch): void;
  /** a change that goes now: sent at once, with whatever was waiting */
  now(patch: ProfilePatch): Promise<void>;
  /** sends what is waiting (leaving the page, the app going to the background); resolves once
      every save handed over so far has finished */
  flush(): Promise<void>;
  /** something is waiting */
  readonly waiting: boolean;
};

type Timers = { set: (fn: () => void, ms: number) => unknown; clear: (handle: unknown) => void };

/** ONE QUEUE FOR EVERY SAVE THE PAGE MAKES. What waits is merged, so a face picked twice is one
    save and a pronoun sent while a face waits carries the face along; only the face and photo
    picks wait (the debounce), and a send hands its patch to `save` AT ONCE, in call order.
    `save` is the latest auth.saveProfile (through the caller's ref, useEditProfileModel), which
    writes the phone's copy the moment it is called (merged into its ref of the local picture, in
    call order) and runs the account syncs one after another itself (its syncChain). So the queue
    must not wait for one save's network round trip before handing over the next: it did, and a
    face picked while the one before was still on its way to the account wasn't even written on
    the phone until that trip ended, so Me showed the old face, and iOS suspending the app in
    that window lost the new one on the phone too. The returned promise (and flush's) resolves
    once everything handed over so far has finished. */
export function createSaveQueue(
  save: (patch: ProfilePatch) => Promise<unknown>,
  delayMs = FACE_SAVE_DELAY_MS,
  timers: Timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) },
  onError: (e: unknown) => void = (e) => console.warn("[edit-profile] a save failed:", e),
): SaveQueue {
  let pending: ProfilePatch | null = null;
  let timer: unknown = null;
  let chain: Promise<void> = Promise.resolve();

  const stopTimer = () => {
    if (timer != null) timers.clear(timer);
    timer = null;
  };

  const send = (): Promise<void> => {
    stopTimer();
    if (!pending) return chain;
    const patch = pending;
    pending = null;
    // handed over now (the phone's copy is written in this call); the chain only tracks it
    let done: Promise<void>;
    try {
      done = Promise.resolve(save(patch)).then(
        () => undefined,
        (e) => onError(e),
      );
    } catch (e) {
      onError(e);
      done = Promise.resolve();
    }
    chain = chain.then(() => done);
    return chain;
  };

  return {
    later(patch) {
      pending = { ...(pending ?? {}), ...patch };
      stopTimer();
      timer = timers.set(() => {
        timer = null;
        void send();
      }, delayMs);
    },
    now(patch) {
      pending = { ...(pending ?? {}), ...patch };
      return send();
    },
    flush: send,
    get waiting() {
      return pending != null;
    },
  };
}
