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

/* NOTES' OWN ICONS (the owner's pick, 2026-10-18; drawn in .claude/notes-icons, final/icons.json):
   small desk objects in the 10a hand — one ink, stroke 2 on the 24 grid, round caps — with their
   solid parts filled: a dog-eared page (text), a tilted instant photo with a hill and a sun
   (photo), a desk microphone (voice), a cine camera (video); two stacked cards with the 10a hard
   shadow (Card), four rounded tiles (Grid), square bullets (List); a desk calendar with a solid
   header and three slots the button fills with the month's latest moods. Drawn ink-only (their
   optional tint layer is left out: invisible at 16pt, muddy on Midnight). Swift draws the same
   paths (KLineGlyph .noteText … .noteCalendar). */
type NoteDrawing = { stroke: readonly string[]; fill: readonly string[] };
const NOTE_ICON: Readonly<Record<JournalType | NotesView | "calendar", NoteDrawing>> = {
  text: { stroke: ["M13 3H7.5A2.5 2.5 0 0 0 5 5.5V18.5A2.5 2.5 0 0 0 7.5 21H16.5A2.5 2.5 0 0 0 19 18.5V9Z", "M13 3V7A2 2 0 0 0 15 9H19", "M8.5 12.8Q10.25 11.4 12 12.8T15.5 12.8", "M8.5 16.8H13"], fill: [] },
  photo: { stroke: ["M4.76 6.34Q4.45 3.86 6.93 3.55L14.87 2.58Q17.35 2.27 17.66 4.76L19.24 17.66Q19.55 20.14 17.07 20.45L9.13 21.42Q6.65 21.73 6.34 19.24Z"], fill: ["M8.72 14.42Q8.27 14.47 8.22 14.03L8.13 13.33Q8.08 12.88 8.27 12.48L9.73 9.44Q9.92 9.03 10.24 9.35L12.24 11.31Q12.56 11.63 12.88 11.32L13.68 10.55Q14 10.24 14.37 10.5L15.61 11.36Q15.98 11.61 16.04 12.06L16.16 13.05Q16.21 13.5 15.77 13.55Z", "M15.17 7.12A1.15 1.15 0 1 1 12.87 7.12A1.15 1.15 0 1 1 15.17 7.12Z"] },
  voice: { stroke: ["M12 2.9A3.6 3.6 0 0 1 15.6 6.5V9.8A3.6 3.6 0 0 1 8.4 9.8V6.5A3.6 3.6 0 0 1 12 2.9Z", "M8.4 7.9H15.6", "M5.5 10.4A6.5 6.5 0 0 0 18.5 10.4", "M12 16.9V19"], fill: ["M8.3 21.7Q8.3 19 12 19Q15.7 19 15.7 21.7Z"] },
  video: { stroke: ["M5.15 10H13.75A2.2 2.2 0 0 1 15.95 12.2V18.3A2.2 2.2 0 0 1 13.75 20.5H5.15A2.2 2.2 0 0 1 2.95 18.3V12.2A2.2 2.2 0 0 1 5.15 10Z", "M9.35 6A2.6 2.6 0 1 1 4.15 6A2.6 2.6 0 1 1 9.35 6Z", "M14.85 6.6A2 2 0 1 1 10.85 6.6A2 2 0 1 1 14.85 6.6Z", "M15.95 13.6L21.05 11V19.5L15.95 16.9"], fill: [] },
  card: { stroke: ["M6 4.5H15A2.5 2.5 0 0 1 17.5 7V14A2.5 2.5 0 0 1 15 16.5H6A2.5 2.5 0 0 1 3.5 14V7A2.5 2.5 0 0 1 6 4.5Z", "M17 6.5A2.5 2.5 0 0 1 19.5 9V16A2.5 2.5 0 0 1 17 18.5H8A2.5 2.5 0 0 1 5.5 16"], fill: ["M7.4 7.5H8.85A0.9 0.9 0 0 1 9.75 8.4V9.85A0.9 0.9 0 0 1 8.85 10.75H7.4A0.9 0.9 0 0 1 6.5 9.85V8.4A0.9 0.9 0 0 1 7.4 7.5Z"] },
  grid: { stroke: ["M5.75 4H8.25A1.75 1.75 0 0 1 10 5.75V8.25A1.75 1.75 0 0 1 8.25 10H5.75A1.75 1.75 0 0 1 4 8.25V5.75A1.75 1.75 0 0 1 5.75 4Z", "M15.75 4H18.25A1.75 1.75 0 0 1 20 5.75V8.25A1.75 1.75 0 0 1 18.25 10H15.75A1.75 1.75 0 0 1 14 8.25V5.75A1.75 1.75 0 0 1 15.75 4Z", "M5.75 14H8.25A1.75 1.75 0 0 1 10 15.75V18.25A1.75 1.75 0 0 1 8.25 20H5.75A1.75 1.75 0 0 1 4 18.25V15.75A1.75 1.75 0 0 1 5.75 14Z", "M15.75 14H18.25A1.75 1.75 0 0 1 20 15.75V18.25A1.75 1.75 0 0 1 18.25 20H15.75A1.75 1.75 0 0 1 14 18.25V15.75A1.75 1.75 0 0 1 15.75 14Z"], fill: [] },
  list: { stroke: ["M10.5 6H20.5", "M10.5 12H18", "M10.5 18H19.25"], fill: ["M4.2 4.2H5.8A1 1 0 0 1 6.8 5.2V6.8A1 1 0 0 1 5.8 7.8H4.2A1 1 0 0 1 3.2 6.8V5.2A1 1 0 0 1 4.2 4.2Z", "M4.2 10.2H5.8A1 1 0 0 1 6.8 11.2V12.8A1 1 0 0 1 5.8 13.8H4.2A1 1 0 0 1 3.2 12.8V11.2A1 1 0 0 1 4.2 10.2Z", "M4.2 16.2H5.8A1 1 0 0 1 6.8 17.2V18.8A1 1 0 0 1 5.8 19.8H4.2A1 1 0 0 1 3.2 18.8V17.2A1 1 0 0 1 4.2 16.2Z"] },
  calendar: { stroke: ["M6 5H18A3 3 0 0 1 21 8V17.5A3 3 0 0 1 18 20.5H6A3 3 0 0 1 3 17.5V8A3 3 0 0 1 6 5Z", "M8 2.5V6M16 2.5V6"], fill: ["M6 5H18A3 3 0 0 1 21 8V10H3V8A3 3 0 0 1 6 5Z"] },
};

/** the calendar's three mood slots on the 24 grid (x, y; 3.6 square, corners 1) */
const CALENDAR_SLOTS: readonly (readonly [number, number])[] = [[5, 13], [10.2, 13], [15.4, 13]];

function NoteIcon({ d, size, color, width }: { d: NoteDrawing; size: number; color: string; width: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {d.stroke.map((p, i) => (
        <Path key={"s" + i} d={p} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {d.fill.map((p, i) => (
        <Path key={"f" + i} d={p} fill={color} />
      ))}
    </Svg>
  );
}

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
  return <NoteIcon d={NOTE_ICON[kind]} size={size} color={color} width={2} />;
}

export function ViewIcon({ view, size = 16, color }: { view: NotesView; size?: number; color: string }) {
  return <NoteIcon d={NOTE_ICON[view]} size={size} color={color} width={2} />;
}

/** The calendar button's drawing: Notes' desk calendar (its solid header and rings) with the
    month's three latest days in its three slots, in their groups' ink (empty ones in `empty`) — or
    in their groups' pale fill when `onDark` (the squares sit on a dark ground: Midnight's page, or a
    light theme's filled key), where the inks (Tired #3A34D6, Low #3B6E9B) would read as empty
    slots. KNotesCalendarButton makes the same choice and uses the same slots. */
export function CalendarGlyph({ groups, color, empty, onDark = false, size = 20 }: { groups: readonly MoodGroup[]; color: string; empty: string; onDark?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {NOTE_ICON.calendar.stroke.map((p, i) => (
        <Path key={"s" + i} d={p} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {NOTE_ICON.calendar.fill.map((p, i) => (
        <Path key={"f" + i} d={p} fill={color} />
      ))}
      {CALENDAR_SLOTS.map(([x, y], i) => (
        <Rect key={"m" + i} x={x} y={y} width={3.6} height={3.6} rx={1} fill={groups[i] ? moodColors(groups[i])[onDark ? "fill" : "ink"] : empty} />
      ))}
    </Svg>
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
