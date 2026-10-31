import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { API_BASE, supabase } from "./supabase";
import { fetchWithin } from "./net";
import { onStorageUserChange, scoped } from "./scoped-store";
import {
  EMPTY_STORE,
  addFace,
  isGuestToken,
  isMadeFaceId,
  madeFaceUuid,
  mergeFaces,
  newGuestToken,
  pendingAlive,
  readFaceAnswer,
  readServerFace,
  readStore,
  type FaceAnswer,
  type MadeFaceRecord,
  type MadeFaceStore,
  type MakeFaceFrom,
  type ServerFace,
} from "./make-face-core";

/* THE FACES WREN DREW, ON THE PHONE (Make your own face, owner 2026-10-26). No React here, so
   lib/faces and AvatarImage can read it; lib/make-face holds the hooks (the contract onboarding
   codes against) and src/screens/make-face the flow.

   - The store (kindredly_made_faces, scoped to the account; a guest's is in the anon bucket and
     moves to the account with the rest of the guest's life, lib/scoped-store OWNED_KEYS): the
     faces made, newest first, each picture downloaded into Documents/made-faces and kept by file
     NAME; whether the free face is spent; the face chosen in the flow (worn); a drawing left
     running (pending).
   - drawFace: POST /api/face (web functions/api/face.js) with the session's token — an account
     or a guest's anonymous session — and, for a guest, this phone's device token (raw
     AsyncStorage kindredly_face_guest: it belongs to the phone, not to an account, so it survives
     sign-up for the claim). The photo goes as base64 in the request and nowhere else.
   - A drawing left running: the request may die with the app in the background, but the server
     finishes it; checkPending() asks "status" for a face made since and keeps it.
   - The claim: a guest who signs in to an account (not the same user: linking keeps the id and
     its faces) has the server move the guest's faces over (mode "claim", once per token).
   - Other people's faces (a kindred's "made-<uuid>"): faces_for (0047) says which this reader may
     see, and their storage paths are signed for an hour (cache key faces:<path>). Until then, or
     when the answer is no, the caller draws the glyph. */

const KEY = "kindredly_made_faces";
const GUEST_KEY = "kindredly_face_guest";
const CLAIM_KEY = "kindredly_face_claim"; // raw: the guest token has faces waiting for an account
/** the drawing takes 15–25 s; the request is let go at 95 (the server's own limit is ~90) */
export const DRAW_MS = 95_000;
/** how many drawings a request asks for, to choose from (web face.js MAX_CHOICES) */
export const DRAW_CHOICES = 3;
const QUICK_MS = 15_000;
const SIGN_S = 3600;

/* ── the store ─────────────────────────────────────────────────────────────────────────────── */

let store: MadeFaceStore = EMPTY_STORE;
let loaded: Promise<void> | null = null;
/** the store has been read for this account (loaded is set the moment the read starts) */
let storeRead = false;
let version = 0;
const listeners = new Set<() => void>();
const changed = () => {
  version++;
  listeners.forEach((l) => l());
};

export function subscribeMadeFaces(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export const madeFacesVersion = (): number => version;
export const madeFacesNow = (): MadeFaceStore => store;

/** Reads this account's store once (again after the account changes). Never rejects. */
export function loadMadeFaces(): Promise<void> {
  if (!loaded)
    loaded = scoped
      .getItem(KEY)
      .then((raw) => {
        store = readStore(raw);
      })
      .catch((e) => console.log("[made-faces] the store couldn't be read, starting empty:", e))
      .finally(() => {
        storeRead = true;
        changed();
      });
  return loaded;
}
onStorageUserChange(() => {
  store = EMPTY_STORE;
  loaded = null;
  storeRead = false;
  synced = false;
  changed();
  void loadMadeFaces();
});

async function save(next: MadeFaceStore): Promise<void> {
  store = next;
  changed();
  try {
    await scoped.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.warn("[made-faces] the store wasn't written:", e);
  }
}

async function update(f: (s: MadeFaceStore) => MadeFaceStore): Promise<MadeFaceStore> {
  await loadMadeFaces();
  const next = f(store);
  await save(next);
  return next;
}

/** The made face chosen as the face (the flow's "This is me"; Edit profile's strip), or none. */
export function setMadeFaceWorn(avatarId: string | null): Promise<MadeFaceStore> {
  return update((s) => ({ ...s, worn: isMadeFaceId(avatarId) ? avatarId : null }));
}

/* ── the pictures ─────────────────────────────────────────────────────────────────────────── */

function dir(): Directory {
  return new Directory(Paths.document, "made-faces");
}

/** file:// of a face's downloaded picture, or null (not downloaded, or purged). */
export function madeFaceFileUri(rec: Pick<MadeFaceRecord, "file"> | null | undefined): string | null {
  if (!rec?.file) return null;
  try {
    const f = new File(dir(), rec.file);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
}

const extOf = (path: string | null): string => {
  const m = /\.(png|jpe?g|webp)$/i.exec(path ?? "");
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "png";
};

/** Downloads a face's picture into Documents/made-faces (from `url`, or a fresh signed link to its
    path) and records the file. → the file:// uri, or null (logged). */
export async function ensureMadeFaceFile(rec: MadeFaceRecord, url?: string | null): Promise<string | null> {
  const have = madeFaceFileUri(rec);
  if (have) return have;
  const src = url || (rec.path ? await signFacePath(rec.path) : null);
  if (!src) return null;
  try {
    const d = dir();
    d.create({ intermediates: true, idempotent: true });
    const name = `${rec.id}.${extOf(rec.path)}`;
    const out = await File.downloadFileAsync(src, new File(d, name), { idempotent: true });
    await update((s) => ({ ...s, faces: s.faces.map((f) => (f.id === rec.id ? { ...f, file: name } : f)) }));
    return out.uri;
  } catch (e) {
    console.warn("[made-faces] the picture wasn't downloaded:", rec.id, e);
    return null;
  }
}

/* ── the request ──────────────────────────────────────────────────────────────────────────── */

async function sessionInfo(): Promise<{ token: string | null; guest: boolean }> {
  if (!supabase) return { token: null, guest: true };
  try {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    return { token: s?.access_token ?? null, guest: !s || s.user?.is_anonymous === true };
  } catch (e) {
    console.warn("[made-faces] no session:", e);
    return { token: null, guest: true };
  }
}

/** This phone's guest token, made once (device-level: it outlives the guest's session). */
export async function guestToken(): Promise<string> {
  try {
    const have = await AsyncStorage.getItem(GUEST_KEY);
    if (isGuestToken(have)) return have;
  } catch (e) {
    console.log("[made-faces] the guest token couldn't be read, making one:", e);
  }
  const t = newGuestToken(() => Math.floor(Math.random() * 256));
  try {
    await AsyncStorage.setItem(GUEST_KEY, t);
  } catch (e) {
    console.warn("[made-faces] the guest token wasn't kept:", e);
  }
  return t;
}

async function post(body: Record<string, unknown>, ms: number): Promise<{ status: number; json: unknown }> {
  const { token, guest } = await sessionInfo();
  const payload = guest ? { ...body, guest: await guestToken() } : body;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await fetchWithin(`${API_BASE}/api/face`, { method: "POST", headers, body: JSON.stringify(payload) }, ms);
  let json: unknown = null;
  try {
    json = await r.json();
  } catch {
    json = null;
  }
  return { status: r.status, json };
}

export type DrawInput = { mode: "photo"; image: string } | { mode: "words"; words: string } | { mode: "again"; from: string };

/** Asks Wren for a face. Never throws: anything that isn't the server's answer is "unavailable".
    A made face is kept (and its picture downloaded) before this resolves. */
export async function drawFace(input: DrawInput, from: MakeFaceFrom): Promise<FaceAnswer> {
  const since = new Date(Date.now() - 2000).toISOString();
  // an earlier drawing still unaccounted for keeps its own (earlier) moment
  await update((s) => ({ ...s, pending: s.pending && pendingAlive(s.pending, Date.now()) ? s.pending : { since, from } }));
  let answer: FaceAnswer;
  try {
    // three drawings to choose from (owner, 2026-10-31); a server from before answers with one
    const { status, json } = await post({ ...(input as unknown as Record<string, unknown>), choices: DRAW_CHOICES }, DRAW_MS);
    answer = readFaceAnswer(status, json);
    if (answer.kind === "bad" || answer.kind === "unavailable" || answer.kind === "auth") console.log("[made-faces] /api/face", status, json);
  } catch (e) {
    console.log("[made-faces] /api/face didn't answer:", e);
    answer = { kind: "unavailable" };
  }
  if (answer.kind === "unavailable" || answer.kind === "quota") {
    /* the request died (the app was away, the line dropped) and the server may have finished
       anyway; or the free face is "spent" by a drawing whose answer never reached this phone */
    const late = await checkPending();
    if (late) return { kind: "made", face: late };
    if (answer.kind === "unavailable") return answer; // pending stays for the next return to the app
  }
  if (answer.kind === "made") await keepServerFace(answer.face);
  else if (answer.kind === "quota") await update((s) => ({ ...s, used: true }));
  await update((s) => ({ ...s, pending: null }));
  return answer;
}

/** The person chose another of the drawings: the face becomes it on the server (the others go),
    and here (the new picture downloaded over the old). false when that didn't happen: the face
    stays the first drawing. */
export async function pickFace(faceId: string, path: string): Promise<boolean> {
  try {
    const { status, json } = await post({ mode: "pick", face: faceId, path }, QUICK_MS);
    const face = status === 200 && json && typeof json === "object" && (json as { ok?: unknown }).ok === true ? readServerFace((json as { face?: unknown }).face) : null;
    if (!face) {
      console.log("[made-faces] pick", status, json);
      return false;
    }
    const old = store.faces.find((f) => f.id === face.id);
    if (old?.file) {
      try {
        const f = new File(dir(), old.file);
        if (f.exists) f.delete();
      } catch (e) {
        console.warn("[made-faces] the first drawing's file wasn't removed:", e);
      }
    }
    await update((s) => ({ ...s, faces: s.faces.map((f) => (f.id === face.id ? { ...f, path: face.path, file: null } : f)) }));
    if (face.url) remember(face.avatarId, face.url, face.path);
    const rec = store.faces.find((f) => f.id === face.id);
    if (rec) await ensureMadeFaceFile(rec, face.url);
    return true;
  } catch (e) {
    console.log("[made-faces] pick didn't answer:", e);
    return false;
  }
}

async function keepServerFace(face: ServerFace): Promise<void> {
  const { guest } = await sessionInfo();
  if (guest) {
    try {
      await AsyncStorage.setItem(CLAIM_KEY, "1");
    } catch (e) {
      console.warn("[made-faces] the claim mark wasn't kept:", e);
    }
  }
  const rec: MadeFaceRecord = { id: face.id, avatarId: face.avatarId, file: null, path: face.path, createdAt: face.createdAt || new Date().toISOString() };
  await update((s) => addFace(s, rec));
  if (face.url) remember(face.avatarId, face.url, face.path);
  await ensureMadeFaceFile(rec, face.url);
}

/** A drawing left running: the face the server made since, kept here; null when there is none
    (yet), or nothing was left running. */
export async function checkPending(): Promise<ServerFace | null> {
  await loadMadeFaces();
  const p = store.pending;
  if (!p) return null;
  if (!pendingAlive(p, Date.now())) {
    await update((s) => ({ ...s, pending: null }));
    return null;
  }
  try {
    const { status, json } = await post({ mode: "status", since: p.since }, QUICK_MS);
    const face = status === 200 && json && typeof json === "object" ? readServerFace((json as { face?: unknown }).face) : null;
    if (!face) return null;
    await keepServerFace(face);
    await update((s) => ({ ...s, pending: null }));
    return face;
  } catch (e) {
    console.log("[made-faces] the drawing left running couldn't be asked about:", e);
    return null;
  }
}

/** Where this reader stands on the server: { used } (the free face is spent), or null when the
    server can't say (0047 not run, offline): the phone's own record stands. */
export async function readFaceQuota(): Promise<{ used: boolean; canMake: boolean; why: string | null } | null> {
  try {
    const { status, json } = await post({ mode: "quota" }, QUICK_MS);
    const q = status === 200 && json && typeof json === "object" ? (json as { quota?: Record<string, unknown> }).quota : null;
    if (!q) return null;
    const used = Number(q.made) > 0 || q.why === "quota";
    if (used && !store.used) await update((s) => ({ ...s, used: true }));
    return { used, canMake: q.can_make === true, why: typeof q.why === "string" ? q.why : null };
  } catch (e) {
    console.log("[made-faces] the quota couldn't be read:", e);
    return null;
  }
}

/* ── an account's faces from the server, and the guest's claim ─────────────────────────────── */

let synced = false;
let syncing: Promise<void> | null = null;

/** Once per account per launch: my_faces (and the guest's claim when this phone made faces as a
    guest and an account is signed in now). Never rejects. */
export function syncMadeFaces(): Promise<void> {
  if (synced) return Promise.resolve();
  if (syncing) return syncing;
  syncing = (async () => {
    await loadMadeFaces();
    const { token, guest } = await sessionInfo();
    if (!token || !supabase) return;
    if (!guest) await claimGuestFaces();
    try {
      const { data, error } = await supabase.rpc("my_faces");
      if (error) throw error;
      const rows = (Array.isArray(data) ? data : []) as { id?: string; image_path?: string | null; created_at?: string }[];
      const list = rows.filter((r) => typeof r.id === "string").map((r) => ({ id: r.id as string, path: r.image_path ?? null, createdAt: r.created_at ?? "" }));
      if (list.length) await update((s) => mergeFaces(s, list));
      synced = true;
    } catch (e) {
      // 0047 not run yet, offline: the phone's own record stands, asked again next launch
      console.log("[made-faces] my_faces didn't answer:", (e as { message?: string })?.message ?? e);
    }
    await checkPending();
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}

async function claimGuestFaces(): Promise<void> {
  let mark: string | null = null;
  try {
    mark = await AsyncStorage.getItem(CLAIM_KEY);
  } catch {
    return;
  }
  if (!mark) return;
  try {
    const { status, json } = await post({ mode: "claim", guest: await guestToken() }, QUICK_MS);
    if (status !== 200) {
      console.log("[made-faces] the claim wasn't taken:", status, json);
      return;
    }
    const faces = ((json as { faces?: unknown[] })?.faces ?? []).map(readServerFace).filter((f): f is ServerFace => !!f);
    if (faces.length) await update((s) => mergeFaces(s, faces.map((f) => ({ id: f.id, path: f.path, createdAt: f.createdAt }))));
    await AsyncStorage.removeItem(CLAIM_KEY);
  } catch (e) {
    console.log("[made-faces] the claim didn't answer, trying again next launch:", e);
  }
}

/* ── showing a made face (yours or a kindred's) ───────────────────────────────────────────── */

type Remote = { uri: string | null; key: string; until: number };
const remote = new Map<string, Remote>();
const asked = new Set<string>();
let batch: Set<string> | null = null;

function remember(avatarId: string, url: string, path: string | null): void {
  remote.set(avatarId, { uri: url, key: "faces:" + (path ?? avatarId), until: Date.now() + 50 * 60_000 });
  changed();
}

async function signFacePath(path: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage.from("faces").createSignedUrl(path, SIGN_S);
    if (error) throw error;
    return data?.signedUrl ?? null;
  } catch (e) {
    console.log("[made-faces] couldn't sign", path, (e as { message?: string })?.message ?? e);
    return null;
  }
}

/** What draws a made face right now: { uri, key } (your own downloaded file, or a signed link to
    a kindred's), or null while it is unknown or not yours to see. Starts nothing. */
/** The picture's cache key: the face and its stored drawing, so a face that became another of
    its drawings (pickFace) is never served from the first one's cache. */
export const madeFaceKey = (rec: Pick<MadeFaceRecord, "avatarId" | "path">): string => "made:" + rec.avatarId + (rec.path ? ":" + rec.path : "");

export function madeFaceRefNow(avatarId: string | null | undefined): { uri: string; key: string } | null {
  if (!isMadeFaceId(avatarId)) return null;
  const own = store.faces.find((f) => f.avatarId === avatarId);
  const file = madeFaceFileUri(own);
  if (file) return { uri: file, key: madeFaceKey(own!) };
  const r = remote.get(avatarId);
  return r && r.uri && r.until > Date.now() ? { uri: r.uri, key: r.key } : null;
}

/** The server said this reader may not see that face (or it is gone): draw the glyph. */
export function madeFaceHidden(avatarId: string | null | undefined): boolean {
  if (!isMadeFaceId(avatarId)) return false;
  const r = remote.get(avatarId);
  return !!r && !r.uri && r.until > Date.now() && !store.faces.some((f) => f.avatarId === avatarId);
}

/** Starts whatever a made face still needs (your own file, or a kindred's link). Batched: the ids
    asked for in one turn go in one faces_for call. Reads the store first, so your own face comes
    from the phone. */
export function prepareMadeFace(avatarId: string | null | undefined): void {
  if (!isMadeFaceId(avatarId)) return;
  if (!storeRead) {
    void loadMadeFaces().then(() => prepareMadeFace(avatarId));
    return;
  }
  if (madeFaceRefNow(avatarId)) return;
  const own = store.faces.find((f) => f.avatarId === avatarId);
  if (own) {
    if (!asked.has(avatarId)) {
      asked.add(avatarId);
      void ensureMadeFaceFile(own).finally(() => asked.delete(avatarId));
    }
    return;
  }
  const r = remote.get(avatarId);
  if (r && r.until > Date.now()) return; // known: not visible (uri null) until it expires
  if (asked.has(avatarId)) return;
  asked.add(avatarId);
  if (!batch) {
    batch = new Set();
    setTimeout(() => {
      const ids = [...(batch ?? [])];
      batch = null;
      void resolveFaces(ids);
    }, 0);
  }
  batch.add(avatarId);
}

async function resolveFaces(avatarIds: string[]): Promise<void> {
  if (!supabase || !avatarIds.length) return;
  const uuids = avatarIds.map(madeFaceUuid).filter((u): u is string => !!u).slice(0, 60);
  try {
    const { data, error } = await supabase.rpc("faces_for", { p_ids: uuids });
    if (error) throw error;
    const rows = (Array.isArray(data) ? data : []) as { avatar_id?: string; image_path?: string }[];
    const paths = rows.filter((r) => isMadeFaceId(r.avatar_id) && typeof r.image_path === "string");
    const signed = paths.length ? await supabase.storage.from("faces").createSignedUrls(paths.map((r) => r.image_path as string), SIGN_S) : { data: [], error: null };
    if (signed.error) throw signed.error;
    const byPath = new Map((signed.data ?? []).map((s) => [s.path ?? "", s.signedUrl ?? null]));
    const now = Date.now();
    for (const id of avatarIds) {
      const row = paths.find((r) => r.avatar_id === id);
      const url = row ? byPath.get(row.image_path as string) ?? null : null;
      // not visible: remembered as nothing for ten minutes (the glyph), then asked again
      remote.set(id, { uri: url, key: "faces:" + (row?.image_path ?? id), until: now + (url ? 50 : 10) * 60_000 });
    }
    changed();
  } catch (e) {
    console.log("[made-faces] faces_for didn't answer:", (e as { message?: string })?.message ?? e);
  } finally {
    avatarIds.forEach((id) => asked.delete(id));
  }
}
