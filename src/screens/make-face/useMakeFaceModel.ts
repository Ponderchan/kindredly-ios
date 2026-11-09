import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { File, Paths } from "expo-file-system";
import { prepareFacePhoto, type KMakeFaceScreen, type KMakeFaceStrings, type KMakeFaceChipGroup } from "../../../modules/kindredly-ui/src/MakeFace";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { clearAvatarPhoto } from "../../lib/avatar-photo";
import { t, useLang } from "../../lib/i18n";
import { checkPending, drawFace, loadMadeFaces, madeFaceFileUri, madeFaceKey, madeFaceRefNow, madeFacesNow, pickFace, readFaceQuota, setMadeFaceWorn, syncMadeFaces, type DrawInput } from "../../lib/made-faces";
import { useMadeFaceStore } from "../../lib/make-face";
import { setNotifyOn } from "../../lib/notify";
import {
  anotherScreen,
  cleanWords,
  isUnder18,
  knockAfterS,
  madeFaceState,
  openingScreen,
  pendingAlive,
  rejectActions,
  screenFor,
  shownFace,
  type DrawMode,
  type FaceAnswer,
  type FaceChoice,
  type MadeFaceRecord,
  type MakeFaceFrom,
  type RefuseReason,
} from "../../lib/make-face-core";
import { faceChips, faceStrings, genLines, type QuotaLine } from "./make-face-model";
import "../../data/strings-make-face";
import "../../data/strings-note-compose"; // jp.cameraDenied, the roll's own line

/* MAKE YOUR OWN FACE, THE LOGIC (owner, 2026-10-26). KMakeFacePage (Swift) draws the screen named
   here; this decides it, talks to the server (lib/made-faces) and to the phone (the picker, the
   photo made small, the knock).

   THE RULES (the spec's Prompt 0 and the owner's notes):
   - ONE free face; a refusal, the network or a timeout costs nothing (the server's rule: only a
     drawing it stores counts). After it, Make another is First Class's (the paywall), and a guest
     who has used it is asked to sign in (the existing Apple / Google sign-ins).
   - The photo is only used to paint: the picker's file is made small and bare at once
     (prepareFacePhoto, Swift) and deleted; the small copy is read into memory when it is sent and
     deleted then too (kept in memory only for a Retry in this sitting). Nothing of it stays on the
     phone or on the server.
   - Under 18 (the account's birthday, or the one onboarding passes as ?dob=): no photo rows.
   - Leaving while Wren paints: the drawing runs on (a module-level job, not the screen's), and if
     the app goes to the background a local notification "wren finished your face" is set for when
     the drawing should be done; tapping it opens /make-face?resume=1 on the result. If the
     request died with the app, the face is fetched from the server's "status" (lib/made-faces).
     In the foreground nothing interrupts: the doors (Edit profile, onboarding) show the new face.
   - From Me, "This is me" saves the face as the avatar at once (and drops a worn photo, as
     choosing a portrait does); from onboarding it only marks it worn: onboarding saves it with
     the rest of the profile (lib/make-face, the handoff). */

const KNOCK_ID = "make-face-knock";

/* ── the drawing, outliving the screen ─────────────────────────────────────────────────────── */

type Job = { from: MakeFaceFrom; mode: DrawMode; startedAt: number; promise: Promise<FaceAnswer>; answer: FaceAnswer | null };
let job: Job | null = null;
let watching = false;
/** how many make-face pages are open: none open when a drawing lands = the in-app knock */
let pagesOpen = 0;

/* THE IN-APP KNOCK (owner's design, 2026-10-31). A drawing that lands while the reader is still in
   the app but has left the page used to say nothing; now FaceReadyBanner (the tabs) drops a banner
   with the new face and "See it", which opens the page on the result (the job keeps its answer,
   choices and all, until a page applies it). */
export type FaceReady = { from: MakeFaceFrom; avatarId: string };
const readyListeners = new Set<(r: FaceReady) => void>();
export function subscribeFaceReady(fn: (r: FaceReady) => void): () => void {
  readyListeners.add(fn);
  return () => {
    readyListeners.delete(fn);
  };
}
/** DEV ONLY (src/app/dev/face-ready.tsx): drop the banner as a finished drawing would, no drawing made. */
export function devFaceReady(r: FaceReady): void {
  if (__DEV__) readyListeners.forEach((fn) => fn(r));
}

async function cancelKnock(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(KNOCK_ID);
  } catch (e) {
    console.log("[make-face] the knock couldn't be cancelled:", e);
  }
}

/** A copy of the new face for the lock-screen knock (owner's design, board 4): iOS moves an
    attachment's file into its own store, so it gets a copy in the cache, never the kept file. */
function knockPicture(avatarId: string | null): { identifier: string; url: string; type: string; typeHint: string }[] | undefined {
  if (!avatarId) return undefined;
  try {
    const rec = madeFacesNow().faces.find((f) => f.avatarId === avatarId);
    const uri = rec ? madeFaceFileUri(rec) : null;
    if (!uri) return undefined;
    const src = new File(uri);
    const copy = new File(Paths.cache, `knock-${Date.now()}.${src.extension.replace(".", "") || "png"}`);
    src.copy(copy);
    const uti = copy.extension === ".jpg" ? "public.jpeg" : "public.png";
    return [{ identifier: "face", url: copy.uri, type: uti, typeHint: uti }];
  } catch (e) {
    console.log("[make-face] the knock goes without the face:", e);
    return undefined;
  }
}

async function knock(from: MakeFaceFrom, afterS: number | null, avatarId: string | null = null): Promise<void> {
  try {
    const attachments = afterS == null ? knockPicture(avatarId) : undefined;
    await Notifications.scheduleNotificationAsync({
      identifier: KNOCK_ID,
      content: { body: t("mf.notif"), sound: false, data: { face: 1, from }, ...(attachments ? { attachments } : {}) },
      trigger: afterS == null ? null : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: afterS, repeats: false },
    });
  } catch (e) {
    // notifications not allowed: the doors still show the face when they come back
    console.log("[make-face] the knock wasn't set:", e);
  }
}

/** the app going to the background mid-drawing sets the knock for when it should be done */
function watchAppState(): void {
  if (watching) return;
  watching = true;
  AppState.addEventListener("change", (s) => {
    if (s === "background" && job && !job.answer) void knock(job.from, knockAfterS(job.startedAt, Date.now()));
  });
}

function startJob(input: DrawInput, from: MakeFaceFrom): Job {
  watchAppState();
  const j: Job = { from, mode: input.mode, startedAt: Date.now(), answer: null, promise: Promise.resolve({ kind: "unavailable" }) };
  j.promise = drawFace(input, from).then(async (answer) => {
    j.answer = answer;
    if (AppState.currentState === "active" && answer.kind === "made" && pagesOpen === 0) {
      const r: FaceReady = { from, avatarId: answer.face.avatarId };
      readyListeners.forEach((fn) => fn(r));
    }
    if (AppState.currentState !== "active" && answer.kind === "made") {
      // still away: the knock goes now (any timed one first)
      await cancelKnock();
      await knock(from, null, answer.face.avatarId);
    } else {
      await cancelKnock();
    }
    return answer;
  });
  job = j;
  return j;
}

/* ── the photo files ───────────────────────────────────────────────────────────────────────── */

function remove(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch (e) {
    console.warn("[make-face] a photo file wasn't deleted:", e);
  }
}

/* ── the model ─────────────────────────────────────────────────────────────────────────────── */

export type MakeFaceActions = {
  close: () => void;
  start: () => void;
  method: (kind: "camera" | "library" | "words") => void;
  retake: () => void;
  usePhoto: () => void;
  draw: (text: string) => void;
  leave: () => void;
  accept: () => void;
  another: () => void;
  pickInstead: () => void;
  done: () => void;
  retry: () => void;
  rejectPrimary: () => void;
  rejectSecondary: () => void;
  firstClass: () => void;
  notNow: () => void;
  apple: () => void;
  google: () => void;
  later: () => void;
  /** one of the drawings to choose from was tapped */
  choose: (index: number) => void;
  /** while Wren paints: allow notifications (iOS asks), wait here instead, or back to the ask */
  knockAllow: () => void;
  knockWatch: () => void;
  knockAsk: () => void;
};

/** While Wren paints (owner's design, 2026-10-31): ask = the card offering a knock; watch = they
    chose to wait (with a way back to the ask); on = notifications allowed, Leave is the button;
    off = iOS won't let us ask again, Leave is still there and the face waits in Edit profile. */
export type KnockState = "ask" | "watch" | "on" | "off";

export type MakeFaceModel = {
  /** null until the phone's store is read (the page waits: no first screen flickers) */
  screen: KMakeFaceScreen | null;
  from: MakeFaceFrom;
  strings: KMakeFaceStrings;
  chips: KMakeFaceChipGroup[];
  genLines: string[];
  minor: boolean;
  firstClass: boolean;
  appleAvailable: boolean;
  busy: boolean;
  photo: { uri: string; key: string } | null;
  result: { uri: string; key: string } | null;
  /** the drawings to choose from (empty: just the one), and the one chosen */
  choices: { uri: string; key: string }[];
  choice: number;
  knock: KnockState;
  quotaFace: { uri: string; key: string } | null;
  act: MakeFaceActions;
};

const refOf = (rec: MadeFaceRecord | null | undefined): { uri: string; key: string } | null => {
  if (!rec) return null;
  const file = madeFaceFileUri(rec);
  if (file) return { uri: file, key: madeFaceKey(rec) };
  return madeFaceRefNow(rec.avatarId);
};

export function useMakeFaceModel(p: { from: MakeFaceFrom; dob?: string | null; resume?: boolean }): MakeFaceModel {
  const lang = useLang();
  const router = useRouter();
  const auth = useAuth();
  const { premium: firstClass } = useEntitlement();
  const store = useMadeFaceStore();
  const { from } = p;
  const avatar = typeof auth.profile?.avatarId === "string" && auth.profile.avatarId ? (auth.profile.avatarId as string) : null;
  const dob = p.dob || (typeof auth.profile?.dob === "string" ? (auth.profile.dob as string) : null);
  const minor = isUnder18(dob);
  const guest = auth.isGuest;

  const [screen, setScreen] = useState<KMakeFaceScreen | null>(null);
  const [reason, setReason] = useState<RefuseReason | null>(null);
  const [mode, setMode] = useState<DrawMode>("photo");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  // three to choose from (owner, 2026-10-31): the face is the first until another is picked
  const [choices, setChoices] = useState<FaceChoice[]>([]);
  const [choice, setChoice] = useState(0);
  const [knockState, setKnockState] = useState<KnockState>("on");
  // what iOS says now: allowed → on; never asked → the ask; refused for good → off
  useEffect(() => {
    void Notifications.getPermissionsAsync()
      .then((p) => alive.current && setKnockState(p.status === "granted" ? "on" : p.canAskAgain ? "ask" : "off"))
      .catch((e) => console.log("[make-face] notification permission unreadable:", e));
  }, []);
  const [busy, setBusy] = useState(false);
  const last = useRef<DrawInput | null>(null);
  const alive = useRef(true);
  const photoRef = useRef<string | null>(null);
  photoRef.current = photoUri;

  useEffect(() => {
    alive.current = true;
    pagesOpen += 1;
    return () => {
      alive.current = false;
      pagesOpen -= 1;
      // a photo that was never sent goes with the screen
      remove(photoRef.current);
    };
  }, []);

  const apply = useCallback((answer: FaceAnswer, m: DrawMode) => {
    if (!alive.current) return;
    if (answer.kind === "made") {
      setResultId(answer.face.id);
      setChoices(answer.choices ?? []);
      setChoice(0);
    }
    if (answer.kind === "refused") setReason(answer.reason);
    setMode(m);
    setScreen(screenFor(answer));
  }, []);

  const follow = useCallback(
    (j: Job) => {
      setScreen("generating");
      void j.promise.then((a) => {
        // a page that has gone leaves the answer on the job for the next one (the knock opens it)
        if (!alive.current) return;
        apply(a, j.mode);
        if (job === j) job = null;
      });
    },
    [apply],
  );

  // the first screen, once the phone's store is read
  useEffect(() => {
    let off = false;
    void (async () => {
      await loadMadeFaces();
      if (off) return;
      if (job && job.from === from) {
        if (job.answer) {
          apply(job.answer, job.mode);
          job = null;
        } else follow(job);
        return;
      }
      if (p.resume) {
        const s = madeFacesNow();
        if (pendingAlive(s.pending, Date.now())) {
          setScreen("generating");
          const face = await checkPending();
          if (off) return;
          if (face) {
            setResultId(face.id);
            setScreen("result");
          } else setScreen("failed");
          return;
        }
        if (s.faces[0]) {
          setResultId(s.faces[0].id);
          setScreen("result");
          return;
        }
      }
      const s = madeFacesNow();
      setScreen(openingScreen({ state: madeFaceState(s, avatar), guest, firstClass }));
    })();
    return () => {
      off = true;
    };
    // the first screen is chosen once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the server may know better (a new phone, a face made elsewhere): a "free" intro turns into the card
  useEffect(() => {
    let off = false;
    void (async () => {
      if (auth.session) await syncMadeFaces();
      const q = await readFaceQuota();
      if (off || !q || !q.used || firstClass) return;
      setScreen((sc) => (sc === "intro" ? (guest ? "signin" : "quota") : sc));
    })();
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(
    (input: DrawInput) => {
      last.current = input;
      setReason(null);
      follow(startJob(input, from));
    },
    [follow, from],
  );

  const pick = useCallback(async (kind: "camera" | "library") => {
    let res: ImagePicker.ImagePickerResult;
    try {
      if (kind === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(t("jp.cameraDenied"));
          return;
        }
        res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1, exif: false, cameraType: ImagePicker.CameraType.front });
      } else {
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1, exif: false });
      }
    } catch (e) {
      console.warn("[make-face] the picker:", e);
      return;
    }
    const src = res.canceled ? null : res.assets?.[0]?.uri;
    if (!src) return;
    setBusy(true);
    const small = await prepareFacePhoto(src);
    remove(src); // the picker's own copy never stays
    if (!alive.current) {
      remove(small);
      return;
    }
    setBusy(false);
    if (!small) {
      Alert.alert(t("mf.photoFail"));
      return;
    }
    remove(photoRef.current);
    setPhotoUri(small);
    setScreen("confirm");
  }, []);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/me" as never);
  }, [router]);

  const result = useMemo(() => {
    const rec = resultId ? store.faces.find((f) => f.id === resultId) ?? null : null;
    return rec;
  }, [resultId, store]);

  const signIn = useCallback(
    async (provider: "apple" | "google") => {
      setBusy(true);
      const r = provider === "apple" ? await auth.signInWithApple() : await auth.signInWithGoogle();
      if (!alive.current) return;
      setBusy(false);
      if ("error" in r) {
        Alert.alert(r.error);
        return;
      }
      if (!("ok" in r)) return; // cancelled, or a link waiting
      await syncMadeFaces();
      if (alive.current) setScreen(firstClass ? "intro" : "quota");
    },
    [auth, firstClass],
  );

  const act = useMemo<MakeFaceActions>(
    () => ({
      close,
      start: () => setScreen("method"),
      method: (kind) => {
        if (kind === "words") setScreen("words");
        else if (!minor) void pick(kind);
      },
      retake: () => {
        remove(photoRef.current);
        setPhotoUri(null);
        setScreen("method");
      },
      usePhoto: () => {
        const uri = photoRef.current;
        if (!uri) return;
        void (async () => {
          let image: string | null = null;
          try {
            image = await new File(uri).base64();
          } catch (e) {
            console.warn("[make-face] the photo couldn't be read:", e);
          }
          // sent from memory; the file goes now
          remove(uri);
          setPhotoUri(null);
          if (!image) {
            Alert.alert(t("mf.photoFail"));
            setScreen("method");
            return;
          }
          run({ mode: "photo", image });
        })();
      },
      draw: (text) => {
        const words = cleanWords(text);
        if (words) run({ mode: "words", words });
      },
      leave: close,
      accept: () => {
        if (!result) return;
        void (async () => {
          // another of the drawings: the face becomes it first; if that fails it stays the first
          if (choices.length > 1 && choice > 0 && choices[choice]) {
            setBusy(true);
            const ok = await pickFace(result.id, choices[choice].path);
            if (!alive.current) return;
            setBusy(false);
            if (!ok) {
              Alert.alert(t("mf.failed.line"));
              return;
            }
          }
          setChoices([]);
          await setMadeFaceWorn(result.avatarId);
          if (from === "me" && !guest) {
            const r = await auth.saveProfile({ avatarId: result.avatarId });
            if ("error" in r) console.warn("[make-face] the account didn't take the face (it stays on this phone):", r.error);
            // a worn photo gives way to the face, as choosing a portrait makes it
            void clearAvatarPhoto();
          }
          if (alive.current) setScreen("done");
        })();
      },
      another: () => {
        const next = anotherScreen({ guest, firstClass });
        if (next === "again" && result) run({ mode: "again", from: result.id });
        else if (next !== "again") setScreen(next);
      },
      pickInstead: () => {
        void setMadeFaceWorn(null);
        close();
      },
      done: close,
      retry: () => {
        if (last.current) run(last.current);
        else setScreen("method");
      },
      rejectPrimary: () => {
        const a = rejectActions(reason ?? "no_face", mode, minor).primary;
        setScreen(a === "photo" ? "method" : "words");
      },
      rejectSecondary: () => {
        const a = rejectActions(reason ?? "no_face", mode, minor).secondary;
        if (a) setScreen(a === "photo" ? "method" : "words");
      },
      firstClass: () => router.push("/paywall?src=make_face" as never),
      notNow: close,
      apple: () => void signIn("apple"),
      google: () => void signIn("google"),
      later: close,
      choose: (i) => setChoice(Math.max(0, Math.min(choices.length - 1, i))),
      // the app's own Notifications switch on, iOS asked if it still can; the face knock then
      // comes with the reply knocks the rest of the app sends
      knockAllow: () => {
        void setNotifyOn(true)
          .then((ok) => alive.current && setKnockState(ok ? "on" : "off"))
          .catch((e) => {
            console.warn("[make-face] notifications:", e);
            if (alive.current) setKnockState("off");
          });
      },
      knockWatch: () => setKnockState("watch"),
      knockAsk: () => setKnockState("ask"),
    }),
    [close, minor, pick, run, result, from, guest, auth, firstClass, reason, mode, router, signIn, choices, choice],
  );

  const quota: QuotaLine = firstClass ? "member" : madeFaceState(store, avatar) === "free" ? "free" : "used";
  const strings = useMemo(
    () => faceStrings(t, { quota, entry: from, reason, mode, reject: rejectActions(reason ?? "no_face", mode, minor) }),
    // lang: every word follows the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quota, from, reason, mode, minor, lang],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const chips = useMemo(() => faceChips(t), [lang]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lines = useMemo(() => genLines(t), [lang]);

  return {
    screen,
    from,
    strings,
    chips,
    genLines: lines,
    minor,
    firstClass,
    appleAvailable: auth.appleAvailable,
    busy,
    photo: photoUri ? { uri: photoUri, key: photoUri } : null,
    // the chosen drawing while there's a choice (signed URLs, keyed by their stored paths)
    result: choices.length > 1 && choices[choice] ? { uri: choices[choice].url, key: "faces:" + choices[choice].path } : refOf(result),
    choices: choices.length > 1 ? choices.map((c) => ({ uri: c.url, key: "faces:" + c.path })) : [],
    choice,
    knock: knockState,
    quotaFace: refOf(shownFace(store, avatar)),
    act,
  };
}
