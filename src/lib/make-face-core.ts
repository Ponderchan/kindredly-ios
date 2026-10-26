/* MAKE YOUR OWN FACE, THE PURE PART (owner, 2026-10-26). Ids, the state the doors show, the
   server's answers, the flow's screens and the guest token, with no React Native import, so
   make-face-core.test.ts runs with plain node. lib/make-face is the phone half (storage, the
   request, the hooks); src/screens/make-face draws the flow.

   THE AVATAR ID. A made face is worn exactly like a library face: user_metadata.avatarId and
   the face a signer gives a thread (web 0035/0047 private.pen_face) hold "made-<face uuid>",
   lower case, 41 characters. Library ids are "f-…" / "m-…", so the two never collide, and an
   app that doesn't know made faces (1.0.6 and older, the web today) draws its glyph for one. */

export type MadeFaceState = "free" | "used" | "yours";

export const MADE_FACE_PREFIX = "made-";
const MADE_ID = /^made-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** "made-<uuid>": a made face's avatar id. */
export const isMadeFaceId = (id: unknown): id is string => typeof id === "string" && MADE_ID.test(id);
/** "made-<uuid>" → the face's uuid (null for anything else). */
export const madeFaceUuid = (id: unknown): string | null => (isMadeFaceId(id) ? id.slice(MADE_FACE_PREFIX.length) : null);
/** the face's uuid → its avatar id (null for anything that isn't a uuid). */
export const madeFaceAvatarId = (uuid: unknown): string | null => {
  const u = typeof uuid === "string" ? uuid.toLowerCase() : "";
  return UUID.test(u) ? MADE_FACE_PREFIX + u : null;
};

/* ── what this phone keeps (lib/make-face, scoped to the account) ──────────────────────────── */

/** One face this account (or this phone's guest) made. The picture is a file in the app's
    documents, kept by NAME (the container path changes between installs). */
export type MadeFaceRecord = {
  /** the face's uuid */
  id: string;
  /** "made-<id>" */
  avatarId: string;
  /** the file's name under Documents/made-faces; null until it is downloaded */
  file: string | null;
  /** the storage path ("faces" bucket), to download it again on a new phone */
  path: string | null;
  createdAt: string;
};

export type MadeFaceStore = {
  v: 1;
  /** newest first, at most MAX_KEPT */
  faces: MadeFaceRecord[];
  /** the free face is spent (a face was made here, or the server said so) */
  used: boolean;
  /** the made face chosen in the flow ("This is me"), until another face is chosen */
  worn: string | null;
  /** a drawing that was left running (the app went away mid-drawing) */
  pending: { since: string; from: MakeFaceFrom } | null;
};

export const MAX_KEPT = 20;
export const EMPTY_STORE: MadeFaceStore = Object.freeze({ v: 1, faces: [], used: false, worn: null, pending: null }) as MadeFaceStore;

/** A stored value read back, whatever it is: junk is an empty store, never a throw. */
export function readStore(raw: string | null | undefined): MadeFaceStore {
  if (!raw) return EMPTY_STORE;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return EMPTY_STORE;
  }
  if (!o || typeof o !== "object") return EMPTY_STORE;
  const s = o as Partial<MadeFaceStore>;
  const faces = Array.isArray(s.faces)
    ? s.faces
        .filter((f): f is MadeFaceRecord => !!f && typeof f === "object" && typeof (f as MadeFaceRecord).id === "string" && isMadeFaceId((f as MadeFaceRecord).avatarId))
        .map((f) => ({ id: f.id, avatarId: f.avatarId, file: typeof f.file === "string" && f.file ? f.file : null, path: typeof f.path === "string" && f.path ? f.path : null, createdAt: typeof f.createdAt === "string" ? f.createdAt : "" }))
        .slice(0, MAX_KEPT)
    : [];
  const pending =
    s.pending && typeof s.pending === "object" && typeof s.pending.since === "string" && Number.isFinite(Date.parse(s.pending.since))
      ? { since: s.pending.since, from: asFrom(s.pending.from) }
      : null;
  return { v: 1, faces, used: s.used === true || faces.length > 0, worn: isMadeFaceId(s.worn) ? s.worn : null, pending };
}

/** A face added (or refreshed) at the front; the free one is spent. */
export function addFace(s: MadeFaceStore, f: MadeFaceRecord): MadeFaceStore {
  const rest = s.faces.filter((x) => x.id !== f.id);
  const old = s.faces.find((x) => x.id === f.id);
  const merged: MadeFaceRecord = { ...f, file: f.file ?? old?.file ?? null, path: f.path ?? old?.path ?? null };
  return { ...s, used: true, faces: [merged, ...rest].slice(0, MAX_KEPT) };
}

/** The server's list (my_faces / a claim) folded in: every face it knows is kept, with what this
    phone already downloaded; faces only this phone knows stay too (a guest's, before a claim). */
export function mergeFaces(s: MadeFaceStore, server: { id: string; path: string | null; createdAt: string }[]): MadeFaceStore {
  let out = s;
  for (const f of [...server].reverse()) {
    const avatarId = madeFaceAvatarId(f.id);
    if (!avatarId) continue;
    out = addFace(out, { id: f.id.toLowerCase(), avatarId, file: null, path: f.path, createdAt: f.createdAt });
  }
  const order = (a: MadeFaceRecord, b: MadeFaceRecord) => (b.createdAt || "").localeCompare(a.createdAt || "");
  return { ...out, faces: [...out.faces].sort(order).slice(0, MAX_KEPT) };
}

/**
 * THE STATE A DOOR SHOWS (useMadeFace):
 *   yours  a made face is worn: the avatar the account holds (or the one chosen in the flow,
 *          before onboarding saves it) is one of this phone's made faces
 *   used   the free face is spent (made here, or the server says so), and none is worn
 *   free   nothing made yet
 * avatarId is the account's face when it is known: a made id wins, a library id means a made face
 * isn't worn, none (a guest mid-onboarding, a photo) leaves it to the one chosen in the flow.
 */
export function madeFaceState(s: Pick<MadeFaceStore, "faces" | "used" | "worn">, avatarId?: string | null): MadeFaceState {
  const worn = wornId(s, avatarId);
  if (worn && s.faces.some((f) => f.avatarId === worn)) return "yours";
  if (s.used || s.faces.length > 0) return "used";
  return "free";
}

/** the made face worn: the account's own when it is one, else the flow's choice unless the
    account wears a library face */
export function wornId(s: Pick<MadeFaceStore, "worn">, avatarId?: string | null): string | null {
  if (isMadeFaceId(avatarId)) return avatarId;
  return avatarId ? null : s.worn;
}

/** The face a door shows: the worn one, else the newest. */
export function shownFace(s: Pick<MadeFaceStore, "faces" | "worn">, avatarId?: string | null): MadeFaceRecord | null {
  const want = wornId(s, avatarId);
  return s.faces.find((f) => f.avatarId === want) ?? s.faces[0] ?? null;
}

/* ── the server's answers (POST /api/face, web functions/api/face.js) ──────────────────────── */

export type RefuseReason = "no_face" | "many_faces" | "minor" | "unsafe" | "words";
const REASONS: readonly RefuseReason[] = ["no_face", "many_faces", "minor", "unsafe", "words"];

export type ServerFace = { id: string; avatarId: string; url: string | null; path: string | null; createdAt: string };

export type FaceAnswer =
  | { kind: "made"; face: ServerFace }
  | { kind: "refused"; reason: RefuseReason }
  | { kind: "quota" }
  | { kind: "cap" }
  | { kind: "suspended" }
  | { kind: "auth" }
  | { kind: "bad"; error: string }
  | { kind: "unavailable" };

/** A face as the server sends it, or null when it isn't one. */
export function readServerFace(o: unknown): ServerFace | null {
  if (!o || typeof o !== "object") return null;
  const f = o as Record<string, unknown>;
  const id = typeof f.id === "string" ? f.id.toLowerCase() : "";
  const avatarId = madeFaceAvatarId(id);
  if (!avatarId) return null;
  return {
    id,
    avatarId,
    url: typeof f.url === "string" && /^https:\/\//.test(f.url) ? f.url : null,
    path: typeof f.image_path === "string" && f.image_path ? f.image_path : null,
    createdAt: typeof f.created_at === "string" ? f.created_at : "",
  };
}

/** status + body → what happened. Anything unreadable is "unavailable" (said as the line
    dropping: nothing was counted). */
export function readFaceAnswer(status: number, body: unknown): FaceAnswer {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (status === 200 && b.ok === true) {
    const face = readServerFace(b.face);
    return face ? { kind: "made", face } : { kind: "unavailable" };
  }
  if (status === 200 && b.ok === false) {
    const reason = REASONS.includes(b.reason as RefuseReason) ? (b.reason as RefuseReason) : "unsafe";
    return { kind: "refused", reason };
  }
  if (status === 402) return { kind: "quota" };
  if (status === 429) return { kind: "cap" };
  if (status === 403) return { kind: "suspended" };
  if (status === 401) return { kind: "auth" };
  if (status === 400 || status === 404 || status === 413) return { kind: "bad", error: typeof b.error === "string" ? b.error : String(status) };
  return { kind: "unavailable" };
}

/* ── the flow ─────────────────────────────────────────────────────────────────────────────── */

export type MakeFaceFrom = "onboarding" | "me";
export const asFrom = (v: unknown): MakeFaceFrom => (v === "onboarding" ? "onboarding" : "me");

export type MakeFaceScreen = "intro" | "method" | "confirm" | "words" | "generating" | "result" | "done" | "rejected" | "failed" | "quota" | "signin";
export type DrawMode = "photo" | "words" | "again";

/** Where the flow opens: the free face (or First Class) → the intro; the free face spent → the
    First Class card, or, for a guest, the sign-in card (the spec's three doors). */
export function openingScreen(f: { state: MadeFaceState; guest: boolean; firstClass: boolean }): MakeFaceScreen {
  if (f.state === "free" || f.firstClass) return "intro";
  return f.guest ? "signin" : "quota";
}

/** "Make another" on the result: First Class draws again; a guest is asked to sign in; anyone
    else sees the First Class card. */
export function anotherScreen(f: { guest: boolean; firstClass: boolean }): "again" | "quota" | "signin" {
  if (f.firstClass) return "again";
  return f.guest ? "signin" : "quota";
}

/** What an answer turns into on screen. */
export function screenFor(a: FaceAnswer): MakeFaceScreen {
  switch (a.kind) {
    case "made":
      return "result";
    case "refused":
      return "rejected";
    case "quota":
      return "quota";
    default:
      return "failed";
  }
}

/** The rejected screen's two buttons for a reason and the way in: photo refusals offer words
    (and another photo, unless the photo was refused for age or the reader is under 18); words
    refusals offer other words (and a photo, for adults). */
export function rejectActions(reason: RefuseReason, mode: DrawMode, minor: boolean): { primary: "photo" | "words"; secondary: "photo" | "words" | null } {
  if (mode === "words" || mode === "again" || reason === "words") return { primary: "words", secondary: minor ? null : "photo" };
  if (reason === "minor" || minor) return { primary: "words", secondary: null };
  return { primary: "photo", secondary: "words" };
}

/** Under 18 today, from "YYYY-MM-DD" (no birthday known: not under). */
export function isUnder18(dob: string | null | undefined, now: Date = new Date()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob ?? "");
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age--;
  return age < 18;
}

/** The words as the server takes them: whitespace collapsed, at most 120 characters. */
export const WORDS_MAX = 120;
export function cleanWords(s: string): string {
  return [...s.replace(/\s+/gu, " ").trim()].slice(0, WORDS_MAX).join("");
}

/* ── the guest token: the phone's own, for a guest with no session ────────────────────────── */

const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
export const isGuestToken = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{22,64}$/.test(v);
/** 32 characters from 64 (192 bits); `rand` gives bytes 0–255. */
export function newGuestToken(rand: () => number): string {
  let s = "";
  for (let i = 0; i < 32; i++) s += TOKEN_ALPHABET[(rand() | 0) & 63];
  return s;
}

/* ── the knock (a local notification while the app is away mid-drawing) ───────────────────── */

/** a drawing takes 15–25 s; the knock is set for when it should be done, never under 4 s away */
export const EXPECTED_DRAW_S = 22;
export function knockAfterS(startedAt: number, now: number, expectS = EXPECTED_DRAW_S): number {
  return Math.max(4, Math.round(expectS - (now - startedAt) / 1000));
}
/** a drawing left running is looked for on the server for this long, then forgotten */
export const PENDING_TTL_MS = 15 * 60_000;
export function pendingAlive(p: MadeFaceStore["pending"], now: number): boolean {
  return !!p && now - Date.parse(p.since) < PENDING_TTL_MS;
}
