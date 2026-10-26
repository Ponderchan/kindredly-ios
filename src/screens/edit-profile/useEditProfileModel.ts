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
import { useIdentityOn } from "../../lib/identity";
import { zodiacFromDob } from "../../lib/zodiac";
import { FACES, getFace, type AuraAvatarDef } from "../../data/aura-avatar-lib";
import { makeFaceHref, setMadeFaceWorn, useMadeFaceStore, useMakeFaceOn } from "../../lib/make-face";
import { isMadeFaceId, madeFaceState, type MadeFaceRecord } from "../../lib/make-face-core";
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
import "../../data/strings-identity";
import "../../data/strings-make-face";

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
   - With the identity switch on (lib/identity), ON YOUR LETTERS: the
     ♀/♂ switch (she and he only) and the star sign's, each saved at once
     to the account as showMark / showSign, the way the pronoun is (web
     0034's marks_for reads them there, so a change reaches every stranger
     within the half hour their phones keep an answer). Your sign is worked
     out here from your birthday (lib/zodiac) only to name it under the
     switch; strangers get it from the server, never the date.
   - The new-faces note (owner question 12): only for a legacy portrait,
     once; either button, or any face change, puts it away for good.
   - Every save goes through ONE queue, handed to the latest
     auth.saveProfile at once and in order (it writes the phone's copy then
     and there, merged into its ref of the local picture, and runs the
     account syncs one after another), so no save can revert another
     (auth.tsx's old closure did) and none waits on another's network trip.
     A failed sync is said once per visit: the change stays on the phone, and
     the next save carries it up.
   - Make your own face (the "makeface" switch, lib/make-face): the strip's ＋
     cell opens /make-face?from=me, which decides its own first screen (the
     free face, the First Class card, or a guest's sign-in) and saves the face
     it makes; the faces Wren made sit first in the strip and are picked like
     a portrait (lib/made-faces keeps which one is worn). */

const FIELD_ROUTE = { pen: "/me/edit-field?f=pen", courier: "/me/edit-field?f=courier" } as const;

export type EditActions = {
  back: () => void;
  photo: () => void;
  random: () => void;
  face: (id: string) => void;
  pen: () => void;
  pronoun: (id: string) => void;
  /** ON YOUR LETTERS: the ♀/♂ switch and the star sign's (identity switch on) */
  showMark: (on: boolean) => void;
  showSign: (on: boolean) => void;
  courierName: () => void;
  noteSee: () => void;
  noteKeep: () => void;
  /** the strip's ＋ cell: Make your own face (switch on) */
  make?: () => void;
};

export type EditProfileModel = {
  view: EditView;
  /** the faces on offer (their bundled pictures: the Swift strip loads them as files) */
  pool: AuraAvatarDef[];
  /** what the avatar island draws (AvatarImage) */
  avatar: { id: string | null; photo: string | null; seed: string };
  /** the faces Wren made (switch on), for their pictures in the strip */
  made?: MadeFaceRecord[];
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
      // back from another page (Make your own face saved a face there): the account's face again,
      // unless a pick here is still waiting to be sent
      if (!queue.current?.waiting) setPicked(undefined);
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
  // Make your own face: the ＋ cell and the faces made, only while its switch is on
  const makeOn = useMakeFaceOn();
  const madeStore = useMadeFaceStore();
  const madeIds = madeStore.faces.map((f) => f.avatarId).join("|");
  const madeUsed = madeFaceState(madeStore) !== "free";
  const make = useMemo(
    () => (makeOn ? { used: madeUsed, made: madeIds ? madeIds.split("|") : [] } : undefined),
    [makeOn, madeUsed, madeIds],
  );
  const noteShows = showNewFacesNote({ photo: !!photo, avatarId, isLegacy: (id) => !!getFace(id)?.legacy, offered });

  const fmt = useMemo<EditFormat>(() => ({ t, birthday: birthdayFormat }), []);
  const dob = typeof profile?.dob === "string" ? (profile.dob as string) : null;
  // what strangers may see (identity Phase 1): the switch, and the two values as the account holds them
  const identity = useIdentityOn();
  const showMark: unknown = profile?.showMark;
  const showSign: unknown = profile?.showSign;
  const sign = useMemo(() => zodiacFromDob(dob), [dob]);
  const view = useMemo(
    () =>
      buildEditView(
        { handle, dob, pronoun, wren, avatarId, photo: !!photo, pool, newFacesNote: noteShows, letters: { identity, showMark, showSign, sign }, make },
        fmt,
      ),
    // lang: every word follows the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handle, dob, pronoun, wren, avatarId, photo, pool, noteShows, fmt, lang, identity, showMark, showSign, sign, make],
  );

  const putNoteAway = useCallback(() => {
    setOffered(true);
    void setFlag(NEW_FACES_FLAG);
  }, []);

  const pickFace = useCallback(
    (id: string) => {
      const made = isMadeFaceId(id);
      if (!getFace(id) && !made) return;
      setPicked(id);
      // which made face is worn (none, for a portrait): the ＋ cell and onboarding's read it
      void setMadeFaceWorn(made ? id : null);
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
          void setMadeFaceWorn(null);
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
      // saved at once, like the pronoun: strangers' marks_for reads the account's copy (0034)
      showMark: (on) => {
        void q.now({ showMark: !!on });
      },
      showSign: (on) => {
        void q.now({ showSign: !!on });
      },
      courierName: () => {
        void q.flush();
        router.push(FIELD_ROUTE.courier as never);
      },
      noteSee: putNoteAway,
      noteKeep: putNoteAway,
      make: () => {
        void q.flush();
        router.push(makeFaceHref("me") as never);
      },
    }),
    [q, router, pool, avatarId, pickFace, pronoun, putNoteAway],
  );

  return {
    view,
    pool,
    // Me's rule (useMeModel), so a reader with no session and no face sees one mosaic on both
    avatar: { id: avatarId, photo, seed: user?.id || "you" },
    made: makeOn ? madeStore.faces : [],
    act,
  };
}
