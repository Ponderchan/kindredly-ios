import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../lib/auth";
import { clearAvatarPhoto, getAvatarPhoto, setAvatarPhoto } from "../../lib/avatar-photo";
import { getFlags, setFlag } from "../../lib/flags";
import { localeTag } from "../../lib/format";
import { t, useLang } from "../../lib/i18n";
import { readYourPronoun, saveYourPronoun } from "../../lib/pronouns";
import { useWrenName } from "../../lib/wren-name";
import { FACES, getFace, type AuraAvatarDef } from "../../data/aura-avatar-lib";
import {
  NEW_FACES_FLAG,
  buildEditView,
  createSaveQueue,
  facePool,
  isPronounId,
  randomFace,
  resolvePronoun,
  showNewFacesNote,
  type EditFormat,
  type EditView,
  type PronounId,
  type SaveQueue,
} from "./edit-profile-model";
import "../../data/strings-step5-settings";

/* EDIT PROFILE'S LOGIC, for both renderers (10a step 5). The page is its
   own now (owner), pushed in the Me tab's stack, and each field saves on
   its own (P:310). EditProfileNative (SwiftUI) and EditProfileRN (the
   remote switch's fallback) draw the same view (the pure
   edit-profile-model) and call the same actions.

   - Your face: a photo (expo-image-picker, square, kept on this phone only:
     lib/avatar-photo, which now deletes the one before and says when the
     copy failed, leaving the face you had), a portrait from the strip, or
     the dice. A photo clears the face the account holds (user_metadata
     avatarId: the one face a kindred gets, snapshotted at signing, db.ts);
     a face clears the photo. Shown at once; the account hears once the
     picks stop (the save queue's 600ms), and at once on leaving the page or
     the app going to the background.
   - The pool follows your pronoun, the account's first (a new phone still
     has it; the phone's own copy reads they/them there).
   - Pronouns: saved at once, on the phone and on the account (the matcher
     reads user_metadata.pronoun, web 0021), and the pool changes with it.
   - Pen name and the courier's name: the one-field page (/me/edit-field),
     where going back saves. Whatever waits is sent first.
   - The new-faces note (owner question 12): only for a legacy portrait,
     once; either button, or any face change, puts it away for good.
   - Every save goes through ONE queue, one after another, calling the
     latest auth.saveProfile, so no save can revert another (auth.tsx's old
     closure did). A failed sync is said once per visit: the change stays on
     the phone, and the next save carries it up. */

const FIELD_ROUTE = { pen: "/me/edit-field?f=pen", courier: "/me/edit-field?f=courier" } as const;

export type EditActions = {
  back: () => void;
  photo: () => void;
  random: () => void;
  face: (id: string) => void;
  pen: () => void;
  pronoun: (id: string) => void;
  courierName: () => void;
  noteSee: () => void;
  noteKeep: () => void;
};

export type EditProfileModel = {
  view: EditView;
  /** the faces on offer (their bundled pictures: the Swift strip loads them as files) */
  pool: AuraAvatarDef[];
  /** what the avatar island draws (AvatarImage) */
  avatar: { id: string | null; photo: string | null; seed: string };
  act: EditActions;
};

const birthdayFormat = (y: number, m: number, d: number): string => {
  try {
    return new Intl.DateTimeFormat(localeTag(), { year: "numeric", month: "long", day: "numeric" }).format(new Date(y, m - 1, d));
  } catch {
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
};

export function useEditProfileModel(): EditProfileModel {
  const router = useRouter();
  const lang = useLang();
  const auth = useAuth();
  const { handle, profile, user } = auth;
  const wren = useWrenName();

  // the latest saveProfile, for the queue (it is stable now, but a ref costs nothing)
  const saveRef = useRef(auth.saveProfile);
  saveRef.current = auth.saveProfile;
  const warned = useRef(false);
  const queue = useRef<SaveQueue | null>(null);
  if (!queue.current) {
    queue.current = createSaveQueue(
      async (patch) => {
        const r = await saveRef.current(patch);
        if ("error" in r) throw new Error(r.error);
      },
      undefined,
      undefined,
      (e) => {
        console.warn("[edit-profile] the account didn't take the change (it stays on this phone):", e);
        if (warned.current) return;
        warned.current = true;
        Alert.alert(t("set.cantSave"), t("set.push.saveFail"));
      },
    );
  }
  const q = queue.current;

  // the photo, read on every visit (the file is the phone's)
  const [photo, setPhoto] = useState<string | null>(null);
  // a face picked here, shown at once while the queue holds it ("" = the photo, none)
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const [devicePronoun, setDevicePronoun] = useState<PronounId | null>(null);
  const [pronounPicked, setPronounPicked] = useState<PronounId | null>(null);
  const [offered, setOffered] = useState(true); // until the flags are read: no note
  const photoReads = useRef(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const n = ++photoReads.current;
      getAvatarPhoto().then((p) => alive && n === photoReads.current && setPhoto(p));
      readYourPronoun().then((p) => alive && setDevicePronoun(p));
      getFlags().then((f) => alive && setOffered(!!f[NEW_FACES_FLAG]));
      return () => {
        alive = false;
        // leaving the page (back, the edge swipe, a push): what waits goes now, so Me and the
        // field page see it
        void queue.current?.flush();
      };
    }, []),
  );

  // leaving: what waits goes now; so does the app going to the background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") void q.flush();
    });
    return () => {
      sub.remove();
      void q.flush();
    };
  }, [q]);

  const accountAvatar = typeof profile?.avatarId === "string" && profile.avatarId ? (profile.avatarId as string) : null;
  const avatarId = picked === undefined ? accountAvatar : picked || null;
  const pronoun = pronounPicked ?? resolvePronoun(profile?.pronoun, devicePronoun);
  const pool = useMemo(() => facePool(pronoun, FACES), [pronoun]);
  const noteShows = showNewFacesNote({ photo: !!photo, avatarId, isLegacy: (id) => !!getFace(id)?.legacy, offered });

  const fmt = useMemo<EditFormat>(() => ({ t, birthday: birthdayFormat }), []);
  const dob = typeof profile?.dob === "string" ? (profile.dob as string) : null;
  const view = useMemo(
    () => buildEditView({ handle, dob, pronoun, wren, avatarId, photo: !!photo, pool, newFacesNote: noteShows }, fmt),
    // lang: every word follows the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handle, dob, pronoun, wren, avatarId, photo, pool, noteShows, fmt, lang],
  );

  const putNoteAway = useCallback(() => {
    setOffered(true);
    void setFlag(NEW_FACES_FLAG);
  }, []);

  const pickFace = useCallback(
    (id: string) => {
      if (!getFace(id)) return;
      setPicked(id);
      if (photo) {
        setPhoto(null);
        photoReads.current++; // a read still out must not bring the photo back
        void clearAvatarPhoto();
      }
      q.later({ avatarId: id });
      putNoteAway();
    },
    [photo, q, putNoteAway],
  );

  const act = useMemo<EditActions>(
    () => ({
      back: () => {
        void q.flush();
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)/me" as never);
      },
      photo: () => {
        void (async () => {
          let res: ImagePicker.ImagePickerResult;
          try {
            res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
          } catch (e) {
            console.warn("[edit-profile] the photo picker:", e);
            return;
          }
          const uri = res.canceled ? null : res.assets?.[0]?.uri;
          if (!uri) return;
          const kept = await setAvatarPhoto(uri);
          if (!kept.ok) {
            // nothing changed: the old photo, or the face, stays
            Alert.alert(t("set.cantSave"), t("set.push.saveFail"));
            return;
          }
          photoReads.current++;
          setPhoto(kept.uri);
          setPicked("");
          // a photo never leaves the phone, so the account's face goes (a kindred signing now gets none)
          q.later({ avatarId: null });
          putNoteAway();
        })();
      },
      random: () => {
        const id = randomFace(pool, avatarId, Math.random);
        if (id) pickFace(id);
      },
      face: pickFace,
      pen: () => {
        void q.flush();
        router.push(FIELD_ROUTE.pen as never);
      },
      pronoun: (id) => {
        if (!isPronounId(id) || id === pronoun) return;
        setPronounPicked(id);
        setDevicePronoun(id);
        void saveYourPronoun(id);
        // the matcher reads the account's copy: it goes now, with anything that waited
        void q.now({ pronoun: id });
      },
      courierName: () => {
        void q.flush();
        router.push(FIELD_ROUTE.courier as never);
      },
      noteSee: putNoteAway,
      noteKeep: putNoteAway,
    }),
    [q, router, pool, avatarId, pickFace, pronoun, putNoteAway],
  );

  return {
    view,
    pool,
    avatar: { id: avatarId, photo, seed: user?.id ?? "me" },
    act,
  };
}
