import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

/* A photo you chose as your face — stored locally in the app's documents
   (only the FILENAME is persisted; the container path changes across
   installs, so the uri is re-resolved on every read). */

const KEY = "kindredly_avatar_photo";

function dir(): Directory {
  return new Directory(Paths.document, "profile");
}

export async function setAvatarPhoto(srcUri: string): Promise<string | null> {
  try {
    const d = dir();
    d.create({ intermediates: true, idempotent: true });
    const name = `avatar-${Date.now()}.jpg`;
    const dest = new File(d, name);
    await new File(srcUri).copy(dest);
    await AsyncStorage.setItem(KEY, name);
    return dest.uri;
  } catch {
    return null;
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

export async function clearAvatarPhoto(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
