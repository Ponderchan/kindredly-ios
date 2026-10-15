import { scoped as AsyncStorage } from "./scoped-store";
import { Directory, File, Paths } from "expo-file-system";

/* A photo you chose as your face — stored locally in the app's documents
   (only the FILENAME is persisted; the container path changes across
   installs, so the uri is re-resolved on every read). It never leaves the
   phone: the face a kindred gets at signing is the library face
   (user_metadata.avatarId), never this (db.ts).

   10a (Edit profile is its own page): a new photo replaces the old FILE
   too — every pick used to leave another avatar-<time>.jpg behind for
   good — and a copy that fails says so ({ ok: false }), where it used to
   answer null and the caller cleared the face anyway, losing both. Only
   this account's own previous file is deleted: the folder is the phone's,
   and another account signed in on it keeps its photo. */

const KEY = "kindredly_avatar_photo";

function dir(): Directory {
  return new Directory(Paths.document, "profile");
}

export type AvatarPhotoResult = { ok: true; uri: string } | { ok: false; error: string };

/** Deletes one of this account's photo files by name (best effort: one that won't go stays,
    and is said). */
function remove(name: string | null): void {
  if (!name) return;
  try {
    const f = new File(dir(), name);
    if (f.exists) f.delete();
  } catch (e) {
    console.warn("[avatar-photo] the old photo wasn't deleted:", name, e);
  }
}

async function storedName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Copies a picked photo in as your face, then deletes the one before it. Says whether it
    worked: on a failure nothing changes (the old photo, or the face, stays). */
export async function setAvatarPhoto(srcUri: string): Promise<AvatarPhotoResult> {
  const before = await storedName();
  try {
    const d = dir();
    d.create({ intermediates: true, idempotent: true });
    const name = `avatar-${Date.now()}.jpg`;
    const dest = new File(d, name);
    await new File(srcUri).copy(dest);
    await AsyncStorage.setItem(KEY, name);
    if (before !== name) remove(before);
    return { ok: true, uri: dest.uri };
  } catch (e) {
    console.warn("[avatar-photo] the photo wasn't kept:", e);
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}

export async function getAvatarPhoto(): Promise<string | null> {
  try {
    const name = await AsyncStorage.getItem(KEY);
    if (!name) return null;
    const f = new File(dir(), name);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
}

/** Stops wearing the photo (a face was picked): forgets it and deletes its file. */
export async function clearAvatarPhoto(): Promise<void> {
  const before = await storedName();
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.warn("[avatar-photo] the photo wasn't forgotten:", e);
    return; // still worn: keep its file
  }
  remove(before);
}
