import { MOOD_GROUPS, MOOD_GROUP_FACES, MOOD_GROUP_IDS, isGroupOnly, isNamedMood, moodArtKey, moodFace, moodGroup, resolveMood, type FaceId, type MoodGroup, type MoodId } from "../../data/moods";

/* THE NOTES COMPOSER'S RULES (owner, 2026-10-26: the Note Composer Bar design, 1.0.7), pure, so a
   node test can hold them (note-compose-model.test.ts). The SwiftUI page draws them
   (NoteComposeNative, through useNoteComposeState); the React Native page (components/SelfCompose)
   is the remote switch's fallback and keeps its own older bar.

   - THE PANELS are one at a time where the keyboard goes: ＋ (Photo, Video, Audio) or the moods.
     A key toggles its own panel and closes the other; the page taking the keyboard closes both.
   - THE MOOD. A group card chooses that group (the group itself is stored, as on the Notes
     tray: "group-low") and keeps the panel open; the group already chosen, tapped again, keeps
     whatever face was in it. A face chooses itself and closes the panel. The panel shows the
     chosen mood's group, Calm's before anything is chosen. The faces are the owner's table
     (moods.ts MOOD_GROUP_FACES): the thirty, in their four groups.
   - THE SEAL KEY is live as soon as the page holds words or media (no counter: a diary has no
     floor). With no mood yet a press opens the moods instead of sealing — a sealed page without
     one couldn't be found again (the calendar is made of the faces) — and the key says why to
     VoiceOver (its hint); after a face, the next press seals.
   - ONE KIND PER PAGE (the journal stores one type): while the page holds photos, a film or a
     recording, the other two cards are off. An empty voice page gives way to either; Audio
     tapped again takes the empty Recorder away. Photo adds to the album (nine at most).

   EDITING A SEALED PAGE (owner's audit, 2026-11-10: the page's ⋯ gained Edit). The same composer
   opens holding the page — its words, its mood, its pictures with the cover first (as the page
   itself draws them, and as the composer keeps a cover: the first), its film or recording — and
   saving replaces that page (lib/journal updateEntry). editSeed is what it opens with; a page
   with no readable mood opens with none, so the save key asks for one as it does on a new page.
   editChanged is whether ✕ would throw something away: what the page WOULD BE SAVED AS against
   what it was opened as, so an empty Recorder opened and left, or a space typed at the end, is
   not a change, and the leave sheet only rises over real edits. */

export type NotePanel = "none" | "plus" | "mood";
export type NoteMedia = "photo" | "video" | "voice";

/** The page holds media: pictures on an album page, the file on a film or voice page. */
export function hasMediaOn(att: NoteMedia | null, photoCount: number, mediaUri: string | null): boolean {
  if (att === "photo") return photoCount > 0;
  return att !== null && !!mediaUri;
}

/** Words or media: something the ✕ would throw away, and what the seal key waits for. */
export function pageHasSomething(text: string, att: NoteMedia | null, photoCount: number, mediaUri: string | null): boolean {
  return text.trim().length > 0 || hasMediaOn(att, photoCount, mediaUri);
}

/** A key's panel, toggled: its own closes, any other opens in its place. */
export function togglePanel(current: NotePanel, which: Exclude<NotePanel, "none">): NotePanel {
  return current === which ? "none" : which;
}

/** A group card: another group stores that group itself; the chosen group again keeps the mood. */
export function pickGroup(current: MoodId | null, g: MoodGroup): MoodId {
  if (current && moodGroup(current) === g) return current;
  return MOOD_GROUP_IDS[g];
}

/** The group whose faces the panel shows: the chosen mood's, Calm's before one is chosen. */
export function openGroupFor(mood: MoodId | null): MoodGroup {
  return mood ? moodGroup(mood) : "calm";
}

/** The chosen face's id, "" for a group alone or nothing. */
export function chosenFaceOf(mood: MoodId | null): string {
  if (!mood || isGroupOnly(mood)) return "";
  return moodFace(mood) ?? "";
}

/** What a press on the seal key does. */
export function sealAction(s: { hasSomething: boolean; busy: boolean; sealed: boolean; mood: MoodId | null }): "none" | "askMood" | "seal" {
  if (!s.hasSomething || s.busy || s.sealed) return "none";
  return s.mood ? "seal" : "askMood";
}

/** Which of the ＋ panel's cards the page can take. */
export function cardsOn(att: NoteMedia | null, hasMedia: boolean): Record<NoteMedia, boolean> {
  if (!att || !hasMedia) return { photo: true, video: true, voice: true };
  return { photo: att === "photo", video: att === "video", voice: att === "voice" };
}

export type CardAction = "pickPhotos" | "pickVideo" | "voiceOn" | "voiceOff" | "none";

/** What a card does. A card that is off does nothing (the page holds another kind). */
export function cardAction(kind: NoteMedia, att: NoteMedia | null, hasMedia: boolean, photoCount: number): CardAction {
  if (!cardsOn(att, hasMedia)[kind]) return "none";
  switch (kind) {
    case "photo":
      return att === "photo" && photoCount >= 9 ? "none" : "pickPhotos";
    case "video":
      return "pickVideo";
    case "voice":
      if (att !== "voice") return "voiceOn";
      return hasMedia ? "none" : "voiceOff";
  }
}

/** The journal type a sealed page is stored as (the voice or film only once its file is kept). */
export function entryType(att: NoteMedia | null, photoCount: number, persisted: boolean): "text" | NoteMedia {
  if (att === "photo" && photoCount > 0) return "photo";
  if ((att === "voice" || att === "video") && persisted) return att;
  return "text";
}

/* ── editing a sealed page ── */

/** A sealed page as the composer opens it. */
export type EditSeed = {
  text: string;
  /** null when the page stored no mood this app can name */
  mood: MoodId | null;
  att: NoteMedia | null;
  /** a photo page's pictures, the cover first */
  photos: string[];
  /** a film's or a recording's file */
  mediaUri: string | null;
  dur: number;
};

/** What the composer holds, as editChanged reads it. */
export type EditNow = { text: string; mood: MoodId | null; att: NoteMedia | null; photos: readonly string[]; mediaUri: string | null };

/** The page the composer opens with. A photo page's album comes cover first (the cover the page's
    coverIndex names; one past the album, or none, is the first), a page saved before albums with
    its single picture; a film or voice page whose file is gone opens as its words alone. */
export function editSeed(e: { type?: string; body?: string; mood?: string | null; mediaUri?: string; media?: string[]; coverIndex?: number; dur?: number }): EditSeed {
  const text = typeof e.body === "string" ? e.body : "";
  const mood = isNamedMood(e.mood) ? resolveMood(e.mood) : null;
  const none: EditSeed = { text, mood, att: null, photos: [], mediaUri: null, dur: 0 };
  if (e.type === "photo") {
    const all = e.media?.length ? e.media : e.mediaUri ? [e.mediaUri] : [];
    if (!all.length) return none;
    const ci = e.coverIndex;
    const cover = typeof ci === "number" && Number.isInteger(ci) && ci >= 0 && ci < all.length ? ci : 0;
    return { ...none, att: "photo", photos: [all[cover], ...all.filter((_, i) => i !== cover)] };
  }
  if ((e.type === "voice" || e.type === "video") && e.mediaUri) {
    return { ...none, att: e.type, mediaUri: e.mediaUri, dur: typeof e.dur === "number" && e.dur > 0 ? e.dur : 0 };
  }
  return none;
}

/** Whether saving now would change the page: its words (as saved: trimmed), its mood, its kind,
    its pictures and their order, its file. */
export function editChanged(seed: EditSeed, now: EditNow): boolean {
  if (now.text.trim() !== seed.text.trim()) return true;
  if (now.mood !== seed.mood) return true;
  const kindWas = entryType(seed.att, seed.photos.length, !!seed.mediaUri);
  const kindNow = entryType(now.att, now.photos.length, !!now.mediaUri);
  if (kindNow !== kindWas) return true;
  if (kindNow === "photo") return now.photos.length !== seed.photos.length || now.photos.some((u, i) => u !== seed.photos[i]);
  if (kindNow === "voice" || kindNow === "video") return now.mediaUri !== seed.mediaUri;
  return false;
}

export type NoteFace = { id: FaceId; name: string; artKey: string; path: string; a11yLabel: string };
export type NoteGroup = { group: MoodGroup; name: string; faces: NoteFace[] };

/** The mood panel: the four groups in the owner's order, each with its faces. `name` is the
    group's name, `faceName` a face's; `upper` cases a face's name for its tile (the reader's
    locale). */
export function panelGroups(name: (g: MoodGroup) => string, faceName: (id: FaceId) => string, upper: (s: string) => string): NoteGroup[] {
  return MOOD_GROUPS.map((g) => ({
    group: g,
    name: name(g),
    faces: MOOD_GROUP_FACES[g].map((id) => {
      const n = faceName(id);
      return { id, name: upper(n), artKey: moodArtKey(id), path: "", a11yLabel: n };
    }),
  }));
}
