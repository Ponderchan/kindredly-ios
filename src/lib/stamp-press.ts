import { useSyncExternalStore } from "react";
import { Directory, File, Paths } from "expo-file-system";
import { API_BASE, supabase, supabaseReady } from "./supabase";
import { WRITE_MS, fetchWithin } from "./net";
import { scoped as AsyncStorage } from "./scoped-store";
import {
  addDraft,
  checkBody,
  parseCheck,
  parseDrafts,
  parseQuota,
  type CheckOutcome,
  type PressCategory,
  type PressDraft,
  type StoredFilter,
  type PressedStamp,
  type StampQuota,
} from "./stamp-press-core";

export * from "./stamp-press-core";

/* STAMP PRESS, THE REACT NATIVE GLUE (build agent B "edit", 2026-10-19). The rules are
   lib/stamp-press-core (pure, node-tested); this file talks to the server and the disk.
   ────────────────────────────────────────────────────────────────────────
   1. fetchStampQuota()   my_stamp_quota() (web 0038). null until the owner has run 0038 (or
                          offline): the apps hide the whole feature then. Logged once, never thrown.
   2. checkStamp(...)     POST /api/stamp-check with the reader's Supabase JWT. Every failure that
                          isn't the server's verdict (no key → 503, offline, a timeout) comes back
                          as { kind: "unavailable" }: the page keeps the stamp as a local draft.
   3. Drafts              the filtered JPEG the server couldn't check, kept in the app's documents
                          (stamp-drafts/) with a per-account index (scoped store). Never uploaded
                          by themselves: retryDraft() sends one again when asked.
   4. Originals           the 3:4 crop (1200 × 1600) BEFORE its filter, kept on this phone only (stamp-originals/
                          <stamp id>.jpg) so a First Class member can change the filter later. The
                          server never sees an original.
   5. The pressed signal  notePressed(stamp) after an approval; Me › Stamps reads usePressedStamp()
                          for the lime "new" sticker (24h) and the "Your stamp is ready. · Write
                          with it →" bar (once: takePressedToast()). Memory only, plus the "new"
                          ids in the scoped store for the 24 hours.

   The JPEG is made by Swift (KStampEditScreen, Portable/Profile/KFaceStrip.swift): 600 × 800, the
   photo stamp's cut bounds (3:4, PHOTO_STAMP.export; builds before 2026-10-20 sent 640 × 704,
   10:11, which the server still takes; the shape is never baked in, every renderer
   clips), filtered, ≤150 KB, no EXIF, written to a temporary file whose path comes back in the
   submit event; readJpegBase64 reads it here. */

const DRAFTS_KEY = "kindredly_stamp_drafts";
const NEW_KEY = "kindredly_stamp_new";
const NEW_MS = 24 * 60 * 60 * 1000;

async function bearer(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch (e) {
    console.warn("[stamp-press] no session", e);
    return null;
  }
}

/* ── 1 · the quota ────────────────────────────────────────────────────────────────────────── */

let quotaWarned = false;

/** What my_stamp_quota() answers an account-less caller, as 0039 means it to (why "account"). */
const GUEST_QUOTA: StampQuota = { plan: "free", made: 0, cap: 3, remaining: 3, canMake: false, why: "account", gold: false };

/** my_stamp_quota(), or null when it can't be asked (0038 not run, offline, signed out). */
export async function fetchStampQuota(): Promise<StampQuota | null> {
  if (!supabaseReady || !supabase) return null;
  try {
    const { data, error } = await supabase.rpc("my_stamp_quota");
    // a guest has no account, and 0039 grants the function to accounts only, so the server
    // refuses instead of answering why "account". Answer it here: MADE BY YOU still shows, and
    // MAKE ONE leads to sign-up (stamp-collection), rather than the whole card standing empty.
    if (error && (error as { code?: string }).code === "42501") return GUEST_QUOTA;
    if (error) throw error;
    const q = parseQuota(data);
    if (!q && !quotaWarned) {
      quotaWarned = true;
      console.log("[stamp-press] my_stamp_quota answered something unreadable", data);
    }
    return q;
  } catch (e) {
    if (!quotaWarned) {
      quotaWarned = true;
      console.log("[stamp-press] my_stamp_quota unavailable (has 0038 run?)", e);
    }
    return null;
  }
}

/* ── 2 · the check ────────────────────────────────────────────────────────────────────────── */

/** The JPEG Swift wrote, as base64 (no prefix). null when it can't be read. */
export async function readJpegBase64(uri: string): Promise<string | null> {
  try {
    const f = new File(uri);
    if (!f.exists) {
      console.warn("[stamp-press] the stamp's JPEG is gone", uri);
      return null;
    }
    return await f.base64();
  } catch (e) {
    console.warn("[stamp-press] couldn't read the stamp's JPEG", e);
    return null;
  }
}

export type CheckInput = {
  /** file:// of the filtered JPEG; null for a rename (replace set, the picture unchanged) */
  image: string | null;
  topic: string;
  category: PressCategory;
  filter: StoredFilter;
  /** the id of one of my approved stamps to edit (First Class / Cofounder) */
  replace?: string | null;
};

/** Sends the stamp to stamp-check. Never throws. */
export async function checkStamp(input: CheckInput): Promise<CheckOutcome> {
  const token = await bearer();
  if (!token) return { kind: "auth" };
  let image: string | null = null;
  if (input.image) {
    image = await readJpegBase64(input.image);
    if (!image) return { kind: "bad", error: "no_image" };
  }
  try {
    const r = await fetchWithin(
      `${API_BASE}/api/stamp-check`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: checkBody({ image, topic: input.topic, category: input.category, filter: input.filter, replace: input.replace ?? null }),
      },
      WRITE_MS,
    );
    let body: unknown = null;
    try {
      body = await r.json();
    } catch {
      body = null; // a body that isn't JSON: parseCheck reads the status alone
    }
    const out = parseCheck(r.status, body);
    if (out.kind === "bad" || out.kind === "unavailable") console.log("[stamp-press] stamp-check", r.status, body);
    return out;
  } catch (e) {
    console.log("[stamp-press] stamp-check didn't answer", e);
    return { kind: "unavailable" };
  }
}

/** Changes an approved stamp's colour (0038 recolour_custom_stamp; no check needed: the picture
    and the words don't change). → true when the server took it. */
export async function recolourStamp(id: string, category: PressCategory): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc("recolour_custom_stamp", { p_stamp: id, p_category: category });
    if (error) throw error;
    return data === "ok" || data === true;
  } catch (e) {
    console.warn("[stamp-press] recolour_custom_stamp failed", e);
    return false;
  }
}

/* ── 3 · drafts ───────────────────────────────────────────────────────────────────────────── */

function folder(name: "stamp-drafts" | "stamp-originals" | "stamp-pictures"): Directory {
  const d = new Directory(Paths.document, name);
  d.create({ intermediates: true, idempotent: true });
  return d;
}

function removeFile(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch (e) {
    console.warn("[stamp-press] couldn't remove", uri, e);
  }
}

export async function listDrafts(): Promise<PressDraft[]> {
  try {
    const list = parseDrafts(await AsyncStorage.getItem(DRAFTS_KEY));
    // a file the system cleared takes its draft with it
    return list.filter((d) => {
      try {
        return new File(d.image).exists;
      } catch {
        return false;
      }
    });
  } catch (e) {
    console.warn("[stamp-press] couldn't read the drafts", e);
    return [];
  }
}

/** Keeps the filtered JPEG as a draft (copied out of the temporary folder). → the draft, or null
    when the disk refused (said in the log; the page then says the stamp couldn't be kept). */
export async function saveDraft(input: { image: string; topic: string; category: PressCategory; filter: StoredFilter; id?: string }): Promise<PressDraft | null> {
  try {
    const id = input.id ?? `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const dest = new File(folder("stamp-drafts"), `${id}.jpg`);
    if (dest.uri !== new File(input.image).uri) {
      if (dest.exists) dest.delete();
      await new File(input.image).copy(dest);
    }
    const draft: PressDraft = { id, image: dest.uri, topic: input.topic, category: input.category, filter: input.filter, at: Date.now() };
    const { list, dropped } = addDraft(await listDrafts(), draft);
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(list));
    dropped.forEach((d) => removeFile(d.image));
    return draft;
  } catch (e) {
    console.warn("[stamp-press] couldn't keep the draft", e);
    return null;
  }
}

export async function removeDraft(id: string): Promise<void> {
  try {
    const list = await listDrafts();
    const gone = list.find((d) => d.id === id);
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(list.filter((d) => d.id !== id)));
    if (gone) removeFile(gone.image);
  } catch (e) {
    console.warn("[stamp-press] couldn't remove the draft", e);
  }
}

/** Sends a draft again; an approval removes it, another 503 leaves it. */
export async function retryDraft(d: PressDraft): Promise<CheckOutcome> {
  const out = await checkStamp({ image: d.image, topic: d.topic, category: d.category, filter: d.filter });
  if (out.kind === "approved" || out.kind === "rejected") await removeDraft(d.id);
  if (out.kind === "approved") notePressed(out.stamp);
  return out;
}

/* ── 4 · originals (for a later filter change) ────────────────────────────────────────────── */

export async function keepOriginal(stampId: string, photoUri: string): Promise<void> {
  try {
    const dest = new File(folder("stamp-originals"), `${stampId}.jpg`);
    if (dest.exists) dest.delete();
    await new File(photoUri).copy(dest);
  } catch (e) {
    console.warn("[stamp-press] couldn't keep the original", e);
  }
}

/** The original kept for this stamp on this phone, or null (made elsewhere, or deleted). */
export function originalFor(stampId: string): string | null {
  try {
    const f = new File(new Directory(Paths.document, "stamp-originals"), `${stampId}.jpg`);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
}

export function forgetOriginal(stampId: string): void {
  const uri = originalFor(stampId);
  if (uri) removeFile(uri);
}

/* the approved picture itself (the filtered JPEG that was sent), so a stamp just made shows on this
   phone while its signed link can't be had (offline, storage slow); the server's copy wins when it
   answers. Mine only: custom-stamps reads it for my own stamps. */
export async function keepPicture(stampId: string, imageUri: string): Promise<void> {
  try {
    const dest = new File(folder("stamp-pictures"), `${stampId}.jpg`);
    if (dest.exists) dest.delete();
    await new File(imageUri).copy(dest);
  } catch (e) {
    console.warn("[stamp-press] couldn't keep the approved picture", e);
  }
}

export function pictureFor(stampId: string): string | null {
  try {
    const f = new File(new Directory(Paths.document, "stamp-pictures"), `${stampId}.jpg`);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
}

export function forgetPicture(stampId: string): void {
  const uri = pictureFor(stampId);
  if (uri) removeFile(uri);
}

/* ── 5 · the pressed signal ───────────────────────────────────────────────────────────────── */

let pressed: { stamp: PressedStamp; at: number; toast: boolean } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

/** After an approval: Me shows the bar once and the "new" sticker for 24 hours. */
export function notePressed(stamp: PressedStamp): void {
  pressed = { stamp, at: Date.now(), toast: true };
  emit();
  void (async () => {
    try {
      const raw = await AsyncStorage.getItem(NEW_KEY);
      const now = Date.now();
      const kept = (raw ? (JSON.parse(raw) as { id: string; at: number }[]) : []).filter((x) => x && typeof x.id === "string" && now - x.at < NEW_MS && x.id !== stamp.id);
      await AsyncStorage.setItem(NEW_KEY, JSON.stringify([{ id: stamp.id, at: now }, ...kept].slice(0, 20)));
    } catch (e) {
      console.warn("[stamp-press] couldn't remember the new stamp", e);
    }
  })();
}

/** The last stamp pressed in this session (null for none): Me's "new" sticker and its bar. */
export function usePressedStamp(): { stamp: PressedStamp; at: number; toast: boolean } | null {
  return useSyncExternalStore(subscribe, () => pressed, () => pressed);
}

/** The bar shows once: true the first time it is asked after an approval. */
export function takePressedToast(): PressedStamp | null {
  if (!pressed || !pressed.toast) return null;
  pressed = { ...pressed, toast: false };
  emit();
  return pressed.stamp;
}

/** The ids made in the last 24 hours (the lime "new" sticker). */
export async function newStampIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(NEW_KEY);
    const now = Date.now();
    const list = raw ? (JSON.parse(raw) as { id: string; at: number }[]) : [];
    return new Set(list.filter((x) => x && typeof x.id === "string" && now - x.at < NEW_MS).map((x) => x.id));
  } catch (e) {
    console.warn("[stamp-press] couldn't read the new stamps", e);
    return new Set();
  }
}
