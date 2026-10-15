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
     never edited: no chevron, not a button), ep.privateNote under them;
   - YOUR COURIER: Name › (owner question 13: no courier pronoun row).
   Pen name and Name open the one-field page (edit-field), where going back
   saves. A face or a photo applies at once; the account hears about it
   once the picks stop (createSaveQueue below), and a pronoun at once.

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
    official name (reserved: shown under the field as it is typed, and not saved). */
export function checkField(kind: FieldKind, raw: string, current: string, isReserved: (name: string) => boolean): { value: string; save: boolean; error: "reserved" | null } {
  const value = raw.trim().slice(0, FIELD_SPECS[kind].max);
  if (kind === "courier" && value && isReserved(value)) return { value, save: false, error: "reserved" };
  return { value, save: value.length > 0 && value !== current.trim(), error: null };
}

/* ── the page ──────────────────────────────────────────────────────────── */

export type EditFacts = {
  handle: string;
  /** user_metadata.dob, "YYYY-MM-DD"; null for none */
  dob: string | null;
  pronoun: PronounId;
  wren: string;
  /** the portrait or old face worn; null for none (a photo, or never picked) */
  avatarId: string | null;
  /** a photo is worn (it wins over the face) */
  photo: boolean;
  /** the faces offered for the pronoun, in order */
  pool: readonly { id: string }[];
  /** the legacy note shows */
  newFacesNote: boolean;
};

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
  note: NewFacesNoteVM | null;
  youHeader: string;
  pen: EditRowVM;
  pronoun: EditRowVM & { options: PronounOptionVM[]; selected: PronounId };
  birthday: EditRowVM;
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

export function buildEditView(f: EditFacts, fmt: EditFormat): EditView {
  const { t } = fmt;
  const total = f.pool.length;
  return {
    title: t("ep.title"),
    backLabel: t("a11y.back"),
    cameraLabel: t("ep.cameraA11y"),
    photoLabel: t("ep.choosePhoto"),
    randomLabel: t("ep.random"),
    avatarHint: t("ep.avatarNote"),
    facesHeader: t("ep.faces"),
    faces: f.pool.map((face, i) => ({ id: face.id, a11y: t("ep.faceA11y", { n: i + 1, total }) })),
    selectedFace: f.photo || !f.avatarId ? "" : f.avatarId,
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
    courierHeader: t("me.sec.courier"),
    courier: { label: t("ep.name"), value: f.wren },
    footer: t("ep.privateNote"),
  };
}

/* ── saving, one field at a time ───────────────────────────────────────── */

export type ProfilePatch = Record<string, unknown>;

export type SaveQueue = {
  /** a change that can wait: merged with what is waiting, sent once the picks stop */
  later(patch: ProfilePatch): void;
  /** a change that goes now: sent with whatever was waiting, after anything already sent */
  now(patch: ProfilePatch): Promise<void>;
  /** sends what is waiting (leaving the page, the app going to the background) */
  flush(): Promise<void>;
  /** something is waiting */
  readonly waiting: boolean;
};

type Timers = { set: (fn: () => void, ms: number) => unknown; clear: (handle: unknown) => void };

/** ONE QUEUE FOR EVERY SAVE THE PAGE MAKES. Each send goes out only after the one before it
    has finished, and what waits is merged, so a face picked twice is one save and a pronoun
    sent while a face waits carries the face along. `save` is called through the caller's ref
    to the latest auth.saveProfile (useEditProfileModel), so no send ever pushes a profile
    captured before the previous one landed (auth.tsx used to spread the profile its closure
    held, and a late face save put back the pen name it was made before). */
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
    chain = chain.then(() => save(patch)).then(
      () => undefined,
      (e) => onError(e),
    );
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
