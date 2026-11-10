import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import type { KScreenHandle } from "../../../modules/kindredly-ui";
import { getLang, t } from "../../lib/i18n";
import { blurThen } from "../../lib/keyboard";
import { WREN_OPENERS, byLang } from "../../data/content";
import type { Lang } from "../../data/stamps";
import { isNamedMood, type MoodId } from "../../data/moods";
import { addEntry, loadJournal, persistMedia, persistMediaMany, updateEntry, type JournalEntry } from "../../lib/journal";
import { journalSpark } from "../../lib/journal-sparks";
import { leaveSealed, takeMood, takePicked, takeSpark } from "../../lib/journal-handoff";
import { todaysMorningLine } from "../../lib/local-push";
import { storeMode, storePhotos } from "../../lib/dev-store";
import type { SelfComposeState } from "../../components/SelfCompose";
import {
  cardAction,
  editChanged,
  editSeed,
  entryType,
  hasMediaOn,
  pageHasSomething,
  pickGroup,
  sealAction,
  togglePanel,
  type NoteMedia,
  type NotePanel,
} from "./note-compose-model";
import type { MoodGroup } from "../../data/moods";

/* THE NOTES COMPOSER'S STATE for the SwiftUI page (NoteComposeNative). What a page holds and how it
   is sealed are the React Native page's (components/SelfCompose) to the letter — the same journal
   calls, the same one page id per page (sealing again replaces a save that half-landed), the same
   one-shot handoffs (the roll's pictures, Notes E1's mood, her question as the spark), the same
   store-mode demo — under the new bar's rules (note-compose-model). SelfCompose itself is left as
   it was: it is the remote switch's fallback, and the fallback should be the page that shipped.

   The words: the route holds them (`text`, its leave guard reads them); Swift reports every edit
   and sends the words as typed with the seal, and they are written back to Swift only when the
   view (re)attaches (NoteComposeNative).

   Everything that covers the page — the image picker, an Alert, the frame viewer — first takes the
   keyboard from the Swift field (blurThen with the view's ref).

   EDITING A SEALED PAGE (owner's audit, 2026-11-10; `editing`, the stored page, fixed for the
   page's life — the route reads it before it mounts this). The page opens holding what the page
   holds (note-compose-model editSeed) and none of a new page's handoffs (the roll's pictures, the
   empty Notes' mood, her question); the save key replaces the stored page (lib/journal
   updateEntry: same id, date and place) instead of adding one, pops no card into Notes and does
   not count as writing today (her evening line is about today's page, not an old one mended).
   - The page's own files are handed back as they are; only a picture, film or take added here is
     copied into the journal's folder, and its copy is remembered (`copies`), so saving again
     after a save that failed never copies it twice. Files taken off the page are removed by
     updateEntry, after the save has landed.
   - What the leave guard hears as "something on the page" is whether anything CHANGED
     (editChanged): ✕ on a page opened and left alone just closes it. */

export type Photo = { uri: string; ratio: number };

export function useNoteComposeState({
  text,
  setText,
  onState,
  viewRef,
  editing,
}: {
  text: string;
  setText: (t: string) => void;
  onState?: (s: SelfComposeState) => void;
  viewRef: RefObject<KScreenHandle | null>;
  /** the sealed page being changed (the route's `edit`); none: a new page */
  editing?: JournalEntry | null;
}) {
  // what the page opened with, once (an edit); null on a new page
  const seed = useRef(editing ? editSeed(editing) : null).current;
  const editId = editing?.id ?? null;
  const [pIdx, setPIdx] = useState(0);
  const [panel, setPanel] = useState<NotePanel>("none");
  const [spark, setSpark] = useState(() => t("js.1"));
  useEffect(() => {
    // a sealed page has its words: no question is asked of it, and none is taken from a new page
    if (seed) return;
    const handed = takeSpark();
    if (handed) {
      setSpark(handed);
      return;
    }
    let alive = true;
    void Promise.all([loadJournal(), todaysMorningLine()])
      .then(([all, morning]) => alive && setSpark(morning ?? journalSpark(all)))
      .catch((e) => console.log("[note-compose] no spark from the journal, keeping the first line:", e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [att, setAtt] = useState<NoteMedia | null>(seed?.att ?? null);
  const [mediaUri, setMediaUri] = useState<string | null>(seed?.mediaUri ?? null);
  // a stored picture's shape isn't kept; the picker's fallback stands in (the viewer fits it anyway)
  const [photos, setPhotos] = useState<Photo[]>(() => (seed ? seed.photos.map((uri) => ({ uri, ratio: 0.8 })) : []));
  const [viewer, setViewer] = useState<number | null>(null);
  const [dur, setDur] = useState(seed?.dur ?? 0);
  const [busy, setBusy] = useState(false);
  const [sealed, setSealed] = useState(false);
  // the mood chosen on the empty Notes page arrives chosen (Notes E1); the page still opens with
  // the keyboard down (the design: both ways in)
  const [mood, setMood] = useState<MoodId | null>(() => {
    if (seed) return seed.mood;
    const m = takeMood();
    return m && isNamedMood(m) ? (m as MoodId) : null;
  });

  const openers = byLang(WREN_OPENERS.journal, getLang() as Lang);
  const hasMedia = hasMediaOn(att, photos.length, mediaUri);
  const hasSomething = pageHasSomething(text, att, photos.length, mediaUri);
  // an edit: what the ✕ would throw away is what changed, not what the page holds
  const changed = seed ? editChanged(seed, { text, mood, att, photos: photos.map((p) => p.uri), mediaUri }) : hasSomething;

  const tellState = useRef(onState);
  tellState.current = onState;
  useEffect(() => {
    tellState.current?.({ hasSomething: changed, busy, sealed });
  }, [changed, busy, sealed]);

  // sealed: the page shows the send-off, which goes back to Notes itself (NoteComposeNative)

  const clearMedia = () => {
    setMediaUri(null);
    setPhotos([]);
    setDur(0);
  };

  const addPhotos = async () => {
    const keep = att === "photo" ? photos : [];
    const remaining = 9 - keep.length;
    if (remaining <= 0) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.length) return;
      const picked: Photo[] = res.assets.map((a) => ({ uri: a.uri, ratio: a.width && a.height ? a.width / a.height : 0.8 }));
      setAtt("photo");
      setMediaUri(null);
      setDur(0);
      setPhotos([...keep, ...picked].slice(0, 9));
    } catch (e) {
      console.warn("[note-compose] the photo picker failed:", e);
    }
  };

  const pickVideo = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 0.8, videoMaxDuration: 180 });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      setAtt("video");
      setPhotos([]);
      setMediaUri(a.uri);
      setDur(a.duration ? Math.round(a.duration / 1000) : 0);
    } catch (e) {
      console.warn("[note-compose] the video picker failed:", e);
    }
  };

  /* the way in: the roll's pictures or film (journal-pick, the usual way since 2026-09-20), a mode
     from Sealed's empty state, or (store mode, dev) two pictures and the moods open */
  const { start, demo } = useLocalSearchParams<{ start?: string; demo?: string }>();
  const armed = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // a sealed page opens with what it holds: none of a new page's ways in
      if (seed) return;
      if (__DEV__ && storeMode && demo && !armed.current) {
        armed.current = true;
        if (storePhotos.length) {
          setAtt("photo");
          setPhotos(storePhotos.slice(0, 9));
        }
        setTimeout(() => setPanel("mood"), 500);
        return;
      }
      const p = takePicked();
      if (p) {
        if ("photos" in p) {
          setAtt("photo");
          setMediaUri(null);
          setPhotos(p.photos.slice(0, 9));
        } else {
          setAtt("video");
          setPhotos([]);
          setMediaUri(p.video.uri);
          setDur(p.video.duration);
        }
        armed.current = true;
        return;
      }
      if (armed.current) return;
      armed.current = true;
      if (start === "voice") setAtt("voice");
      else if (start === "video") void pickVideo();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [start, demo]),
  );

  /* the page stays open, words and all, when the journal couldn't take it; its id is made once,
     so sealing again replaces a save that half-landed */
  const pageId = useRef<string | null>(null);
  const fail = (body: string) => {
    setBusy(false);
    blurThen(() => Alert.alert(t("sc.journalTitle"), body), viewRef);
  };
  const sealPage = async (page: Parameters<typeof addEntry>[0]): Promise<boolean> => {
    pageId.current ??= `j-${Date.now()}`;
    try {
      await addEntry({ ...page, id: pageId.current });
      // Notes pops this card in when the page hands it back
      leaveSealed(pageId.current);
      return true;
    } catch (e) {
      console.warn("[note-compose] the journal didn't save the page:", e);
      fail(t("cp.fail.generic"));
      return false;
    }
  };

  /* AN EDIT'S FILES. The page's own (exactly the paths it opened with) stay where they are; one
     added here is copied in once and its copy kept for a retry. null: the copy failed. */
  const copies = useRef(new Map<string, string>()).current;
  const kept = async (uri: string, ext: string): Promise<string | null> => {
    if (seed && (seed.photos.includes(uri) || seed.mediaUri === uri)) return uri;
    const had = copies.get(uri);
    if (had) return had;
    const copy = await persistMedia(uri, ext);
    if (copy) copies.set(uri, copy);
    return copy;
  };

  /* the save key on an edit: the stored page replaced (same id, date and place); the page stays
     open, words and all, when the journal couldn't take it */
  const saveEdit = async (id: string, body: string, chosen: MoodId) => {
    let edit: Parameters<typeof updateEntry>[1];
    if (att === "photo" && photos.length) {
      const uris: string[] = [];
      for (const p of photos) {
        const u = await kept(p.uri, "jpg");
        if (u) uris.push(u);
      }
      if (!uris.length) return fail(t("sc.failPhotos"));
      // the composer keeps the cover first
      edit = { type: "photo", body, mood: chosen, media: uris, coverIndex: 0, mediaUri: uris[0] };
    } else {
      let file: string | undefined;
      if ((att === "voice" || att === "video") && mediaUri) {
        file = (await kept(mediaUri, att === "video" ? "mp4" : "m4a")) || undefined;
        if (!file) return fail(t("sc.failMedia"));
      }
      edit = { type: entryType(att, photos.length, !!file), body, mood: chosen, mediaUri: file, dur: dur || undefined };
    }
    try {
      await updateEntry(id, edit);
    } catch (e) {
      console.warn("[note-compose] the journal didn't save the changed page:", e);
      return fail(t("cp.fail.generic"));
    }
    setBusy(false);
    setSealed(true);
  };

  const seal = async (words: string, chosen: MoodId) => {
    setBusy(true);
    setPanel("none");
    const body = words.trim();
    if (editId) return saveEdit(editId, body, chosen);
    if (att === "photo" && photos.length) {
      const uris = await persistMediaMany(
        photos.map((p) => p.uri),
        "jpg",
      );
      if (!uris.length) return fail(t("sc.failPhotos"));
      if (!(await sealPage({ type: "photo", body, mood: chosen, media: uris, coverIndex: 0, mediaUri: uris[0] }))) return;
      setBusy(false);
      setSealed(true);
      return;
    }
    let persisted: string | undefined;
    if ((att === "voice" || att === "video") && mediaUri) {
      persisted = (await persistMedia(mediaUri, att === "video" ? "mp4" : "m4a")) || undefined;
      if (!persisted) return fail(t("sc.failMedia"));
    }
    const type = entryType(att, photos.length, !!persisted);
    if (!(await sealPage({ type, body, mood: chosen, mediaUri: persisted, dur: dur || undefined }))) return;
    // A sealed page feeds nothing (see SelfCompose): it is put away and kept.
    setBusy(false);
    setSealed(true);
  };

  const act = {
    textChange: (next: string) => {
      setText(next);
    },
    fieldFocus: (focused: boolean) => {
      // the keyboard takes the panels' place
      if (focused) setPanel("none");
    },
    panel: (which: "plus" | "mood") => setPanel((p) => togglePanel(p, which)),
    pickGroup: (g: MoodGroup) => setMood((m) => pickGroup(m, g)),
    pickFace: (id: string) => {
      if (!isNamedMood(id)) return;
      setMood(id as MoodId);
      setPanel("none");
    },
    card: (kind: NoteMedia) => {
      const a = cardAction(kind, att, hasMedia, photos.length);
      setPanel("none");
      switch (a) {
        case "pickPhotos":
          return blurThen(() => void addPhotos(), viewRef);
        case "pickVideo":
          return blurThen(() => void pickVideo(), viewRef);
        case "voiceOn":
          setAtt("voice");
          clearMedia();
          return;
        case "voiceOff":
          setAtt(null);
          clearMedia();
          return;
        case "none":
          return;
      }
    },
    thumb: (i: number) => {
      if (att !== "photo" || i < 0 || i >= photos.length) return;
      blurThen(() => setViewer(i), viewRef);
    },
    removeMedia: () => {
      setAtt(null);
      clearMedia();
    },
    seal: (words: string) => {
      if (words !== text) setText(words);
      const hasNow = pageHasSomething(words, att, photos.length, mediaUri);
      const a = sealAction({ hasSomething: hasNow, busy, sealed, mood });
      if (a === "askMood") setPanel("mood");
      else if (a === "seal" && mood) void seal(words, mood);
    },
    wren: () => setPIdx((p) => (openers.length ? (p + 1) % openers.length : 0)),
    recorded: (uri: string, s: number) => {
      setMediaUri(uri);
      setDur(s);
    },
    clearRecording: () => {
      setMediaUri(null);
      setDur(0);
    },
    closeViewer: () => setViewer(null),
    coverPhoto: (i: number) => {
      setPhotos((prev) => (i <= 0 || i >= prev.length ? prev : [prev[i], ...prev.filter((_, idx) => idx !== i)]));
      setViewer(null);
    },
    removePhoto: (i: number) => {
      const left = photos.length - 1;
      setPhotos((prev) => prev.filter((_, idx) => idx !== i));
      if (left <= 0) setAtt(null);
      setViewer((v) => (left <= 0 ? null : Math.min(v ?? 0, left - 1)));
    },
  };

  return {
    text,
    spark,
    wrenLine: openers.length ? `“${openers[pIdx % openers.length]}”` : "",
    panel,
    mood,
    att,
    photos,
    mediaUri,
    dur,
    viewer,
    hasMedia,
    hasSomething,
    busy,
    sealed,
    /** a sealed page is being changed (the save key's words, the page's own date) */
    editing: !!seed,
    act,
  };
}

export type NoteComposeState = ReturnType<typeof useNoteComposeState>;
