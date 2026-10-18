import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { MOOD10A, MOOD10A_FACE } from "../../theme/themes";
import type { MoodGroup } from "../../data/moods";
import { MOOD_LINE_ART, MOOD_LINE_GRID, type LineShape } from "../../data/mood-line-art";
import type { JournalType } from "../../lib/journal";
import { ArtShapes } from "../../components/ArtShapes";
import type { NotesView } from "./notes-model";

/* THE NOTES MOCK'S LINE DRAWINGS IN REACT NATIVE (10a step 5): the mood
   faces, the four type icons, the three view icons, the calendar — the
   same path data Swift draws (Portable/Kit/KLineGlyph, Kit/KMoodArt), on
   the same 24 grid with round caps, so the fallback and the SwiftUI screen
   draw one set of icons. Colours come from the caller (the theme) or from
   the 10a mood pairs (themes.json "mood", the same in every theme).

   THE MOOD FACES (owner, 2026-10-16) are the redrawn line icons in
   data/mood-line-art (scripts/import-mood-art.mjs from design/moods-line):
   a template in one ink, painted here in the group's face ink (MOOD10A_FACE:
   the ink, Happy's darker #94681C) with every stroke at the size's optical
   step — 2.4 for a face of 14pt or less, 2.0 up to 29pt, 1.75 from 30pt —
   as KMoodChip draws them in Swift. A face asks for its icon by art key
   (moods moodArtKey: "mood-sleepy", "mood-group-low"); an icon not drawn
   yet falls back to its group's icon, and a group icon not drawn yet to the
   10a face below (MOOD_FACE_PATH), the same chain as Swift. */

/** the four 10a line faces (the Notes mock's FACE, H:155): the last fallback, for a group whose
    icon isn't in data/mood-line-art */
export const MOOD_FACE_PATH: Readonly<Record<MoodGroup, string>> = {
  calm: "M8.5 10.5h.01 M15.5 10.5h.01 M8 14.5c1.2 1.4 2.6 2 4 2s2.8-.6 4-2",
  happy: "M6.5 10.5c.8-1.2 2.2-1.2 3 0 M14.5 10.5c.8-1.2 2.2-1.2 3 0 M7.5 14c1.5 2.3 3 3.2 4.5 3.2s3-.9 4.5-3.2",
  tired: "M6.5 10.5h3 M14.5 10.5h3 M10.5 15.5h3",
  low: "M8.5 10.5h.01 M15.5 10.5h.01 M8 16.5c1.2-1.4 2.6-2 4-2s2.8.6 4 2",
};

/** the empty note's tape and NEW sticker: objects with their own colour, the same in every theme
    (both renderers draw them; NotesNative hands them to Swift) */
export const EMPTY_TAPE = "#BFE0C8";
export const EMPTY_STICKER = "#F5D33A";

/** a group's fill and ink (themes.json "mood"), and the ink its face is drawn in on that fill
    (themes.json "moodFace": the ink, except Happy's #94681C) */
export const moodColors = (g: MoodGroup): { fill: string; ink: string; face: string } => ({ fill: MOOD10A[g][0], ink: MOOD10A[g][1], face: MOOD10A_FACE[g] });

/** The stroke a mood face is drawn with at a face size, in 24-grid units: the optical steps 2.4
    (14pt or less), 2.0 (15–29pt), 1.75 (30pt and up), so one master reads from the 12pt legend
    to the 32pt detail page. KMoodArt.strokeStep is the same in Swift. */
export const moodStrokeStep = (faceSize: number): number => (faceSize <= 14 ? 2.4 : faceSize < 30 ? 2 : 1.75);

/** the master stroke the mood icons are drawn at (design/moods-line: stroke 2) */
const MOOD_LINE_STROKE = 2;

/** An icon's line art by art key, or null when it isn't drawn yet (or the key is unknown). */
export function moodLineArt(key: string | undefined | null): readonly LineShape[] | null {
  if (!key || !Object.prototype.hasOwnProperty.call(MOOD_LINE_ART, key)) return null;
  const art = MOOD_LINE_ART[key];
  return art && art.length ? art : null;
}

/** the type icons (H:157; video is ours, in the same hand) */
const TYPE_PATH: Readonly<Record<JournalType, string>> = {
  text: "M4 7h16 M4 12h16 M4 17h10",
  voice: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M5 11a7 7 0 0 0 14 0 M12 18v3",
  photo: "M4 5h16v14H4z M4 15l5-5 4 4 3-3 4 4",
  video: "M5 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M15 10l6-3.5v11L15 14",
};

/** the view button's icons (H:346) */
const VIEW_PATH: Readonly<Record<NotesView, string>> = {
  card: "M4 5h16v6H4z M4 13h16v6H4z",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  list: "M8 6h12 M8 12h12 M8 18h12 M4 6h.01 M4 12h.01 M4 18h.01",
};

function Line({ d, size, color, width }: { d: string; size: number; color: string; width: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

/** A mood's line face: the icon `icon` names (an art key, moods moodArtKey) when it is drawn, else
    the group's icon, else the group's 10a face. `width` is the stroke in 24-grid units (default the
    optical step for `size`); `color` defaults to the group's face ink. Draw it on its tile: a face
    never stands on the page by itself (MoodChip, the tray's blocks, the composer's key). */
export function MoodFace({ group, icon, size, color, width }: { group: MoodGroup; icon?: string; size: number; color?: string; width?: number }) {
  const ink = color ?? moodColors(group).face;
  const stroke = width ?? moodStrokeStep(size);
  const art = moodLineArt(icon) ?? moodLineArt(`mood-group-${group}`);
  if (!art) return <Line d={MOOD_FACE_PATH[group]} size={size} color={ink} width={stroke} />;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${MOOD_LINE_GRID} ${MOOD_LINE_GRID}`}>
      <ArtShapes list={art} tint={ink} strokeScale={stroke / MOOD_LINE_STROKE} />
    </Svg>
  );
}

/** KMoodChip's twin: a rounded square in the group's fill with its face in the group's face ink —
    36/r11/22 on a Card, 28/r9/18 in Grid and List, 18/r5 or r6 in the chip and the legend. `icon`
    is the page's art key (moods moodArtKey); without one the group's icon is drawn. `stroke`
    defaults to the optical step for the face size. */
export function MoodChip({ group, icon, size, radius, face, stroke }: { group: MoodGroup; icon?: string; size: number; radius: number; face: number; stroke?: number }) {
  const c = moodColors(group);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}>
      <MoodFace group={group} icon={icon} size={face} color={c.face} width={stroke} />
    </View>
  );
}

/** What a page is made of, as the mock's 18pt type icon. */
export function TypeIcon({ kind, size = 18, color }: { kind: JournalType; size?: number; color: string }) {
  return <Line d={TYPE_PATH[kind]} size={size} color={color} width={2} />;
}

export function ViewIcon({ view, size = 16, color }: { view: NotesView; size?: number; color: string }) {
  return <Line d={VIEW_PATH[view]} size={size} color={color} width={2} />;
}

/** The calendar button's drawing: the page and its rings, with the three little squares of the
    month's latest days (one row, inside the page below its header line, measured on the drawing's
    24 grid so they scale with it — the six in two rows used to spill over the outline) in their groups' ink (empty ones in `empty`) — or in their groups' pale fill
    when `onDark` (the squares sit on a dark ground: Midnight's page, or a light theme's filled key),
    where the inks (Tired #3A34D6, Low #3B6E9B) would read as empty slots. KNotesCalendarButton
    makes the same choice. */
export function CalendarGlyph({ groups, color, empty, onDark = false, size = 20 }: { groups: readonly MoodGroup[]; color: string; empty: string; onDark?: boolean; size?: number }) {
  // the 24 grid: the page is x 3–21, y 5–21 with its header line at 9.5; the row sits centred below it
  const s = size / 24;
  const sq = 3.12;
  const gap = 1.68;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={3} y={5} width={18} height={16} rx={3} />
        <Path d="M3 9.5h18 M8 3v3.5 M16 3v3.5" />
      </Svg>
      <View style={{ position: "absolute", left: (12 - (3 * sq + 2 * gap) / 2) * s, top: (15.25 - sq / 2) * s, flexDirection: "row", gap: gap * s }}>
        {Array.from({ length: 3 }, (_, i) => (
          <View key={i} style={{ width: sq * s, height: sq * s, borderRadius: 0.9 * s, backgroundColor: groups[i] ? moodColors(groups[i])[onDark ? "fill" : "ink"] : empty }} />
        ))}
      </View>
    </View>
  );
}

/** A small solid play or pause mark (the voice note's visible control, owner question 10). */
export function PlayMark({ playing, size, color }: { playing: boolean; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {playing ? (
        <>
          <Rect x={6.5} y={5} width={3.8} height={14} rx={1} fill={color} />
          <Rect x={13.7} y={5} width={3.8} height={14} rx={1} fill={color} />
        </>
      ) : (
        <Path d="M8 5.9v12.2a1 1 0 0 0 1.5.86l10-6.1a1 1 0 0 0 0-1.72l-10-6.1A1 1 0 0 0 8 5.9z" fill={color} />
      )}
    </Svg>
  );
}
