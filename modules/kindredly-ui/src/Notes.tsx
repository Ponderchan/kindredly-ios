import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* THE NOTES TAB, drawn by SwiftUI (ios/Portable/Notes/KNotesScreen.swift, adapter
   ios/Adapters/KNotesView.swift), for src/screens/notes/NotesNative.tsx. Every word, date, label,
   month and VoiceOver line comes in from TS (src/screens/notes/notes-model.ts builds them); Swift
   draws them and reports taps. Swift keeps only the gesture's state: the scroll, whether the
   header is hidden, which note is on top.

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost in
   src/components/NativeSurface.tsx; ignoreSafeArea "all" — it has no text field), and only after
   isKindredlyUIViewAvailable("KNotesView") and the "notes" NativeSurface switch say so. Outside a
   Host it is a RedBox in dev and a CRASH in a release build. Its ref is a KScreenHandle: give it
   `commands.ref` from useKCommands<KNotesCommands> (commands.ts).

   insets.top is the status bar (Swift draws the page colour under it); insets.tabBarRoom is the
   floating bar's room (the bottom fade is that + 78 and the last note ends where it begins). Pass
   `notes` memoised — the window of the journal TS shows, 60 and then 60 more — with a rev from
   useRev: Swift converts them once per rev, and every prop change re-sends the whole props map
   (KCommandBus.swift). What changes often goes by command instead: the calendar's month, the one
   player's transitions, scroll requests. */

export type KNotesKind = "text" | "photo" | "voice" | "video";
export type KNotesGroup = "calm" | "happy" | "tired" | "low";
export type KNotesLayout = "card" | "grid" | "list";
export type KNotesEvening = "none" | "ask" | "on";

/** One note as Swift's KNoteCard draws it. */
export type KNotesNote = {
  id: string;
  kind: KNotesKind;
  group: KNotesGroup;
  /** the mood icon's art key (src/data/moods.ts moodArtKey): "mood-sleepy" for a face,
      "mood-group-low" for a page that chose only a group. Swift draws it from its generated table
      (Kit/KMoodArtData.swift) on the group's tile; a key with no drawing yet ("" included) draws the
      group's icon. */
  icon: string;
  /** Card's head row: "OCT 14 · 21:37" (no mood name: the square says it) */
  label: string;
  /** the words' size (notes-model textTier): "none", "short" (24), "mid" (17), "long" (15, six
      lines); all in the system face */
  textTier: "none" | "short" | "mid" | "long";
  /** Grid and the date chip: "OCT 14" */
  shortLabel: string;
  /** List: "OCT 14 · Sleepy" */
  listLabel: string;
  body: string;
  /** List's one line */
  listLine: string;
  /** a photo note's cover (the detail page's choice); null for none. The cards draw `photos` */
  photo: KImageRefProps | null;
  /** the pictures the card shows: the first four in the order taken (the first is the big tile);
      [] off photo notes */
  photos: KImageRefProps[];
  /** how many pictures the note holds (notes-model photoTiles picks the layout from it) */
  photoCount: number;
  /** the +N on the last tile: the pictures past the four shown; 0 under five */
  photoMore: number;
  /** a video note's local file (Swift makes the frame: kind "videoPoster"); null for none */
  video: KImageRefProps | null;
  /** "0:35"; "" */
  duration: string;
  /** a voice note TS can play */
  playable: boolean;
  /** 32-bit seed for the waveform's bars (notes-model waveHeight) */
  waveSeed: number;
  a11y: string;
};

/** Every word the screen shows that isn't on a note (useNotesModel's NotesStrings, plus the keys' words as drawn). */
export type KNotesStrings = {
  title: string;
  justYou: string;
  viewA11y: string;
  viewCard: string;
  viewGrid: string;
  viewList: string;
  calendarA11y: string;
  prevMonth: string;
  nextMonth: string;
  close: string;
  moments: string;
  play: string;
  pause: string;
  emptyTitle: string;
  emptyBody: string;
  newLabel: string;
  textKey: string;
  voiceKey: string;
  textKeyUpper: string;
  voiceKeyUpper: string;
  eveningAsk: string;
  eveningYes: string;
  eveningNo: string;
  eveningFoot: string;
  eveningOn: string;
  eveningOff: string;
  weekdays: string[];
  /** Notes E1 (the empty page): the question, all in the system font */
  neTitle: string;
  /** the title once a mood is tapped, in calm, happy, tired, low order */
  neLines: string[];
  /** the draft card's grey follow-up, in the same order */
  neAsks: string[];
  /** the draft card's time, as a Card's head row says it ("OCT 19 · 21:37") */
  neTime: string;
  /** VoiceOver on the draft card */
  neA11yCard: string;
  /** the four groups' names (mood.group.*), in the same order: VoiceOver on the tiles */
  neGroupNames: string[];
};

/** The empty state's fixed colours ("#RRGGBB"). */
export type KNotesPalette = { keyText: string; keyVoice: string; tape: string; sticker: string };

/** One day of the 'month' command. */
/** `icon`: the day's newest page's mood icon (moods moodArtKey: "mood-sleepy", "mood-group-low"; "" for none). */
export type KNotesDayRecord = { n: number; label: string; group: KNotesGroup | ""; icon: string; targetId: string; future: boolean; today: boolean; a11y: string };

/** The 'month' command: one month of the calendar (notes-model buildMonth, flattened). */
export type KNotesMonthRecord = {
  key: string;
  title: string;
  lead: number;
  days: KNotesDayRecord[];
  /** per group, in calm, happy, tired, low order, as drawn */
  counts: string[];
  footer: string;
  footerA11y: string;
  legendA11y: string[];
  canPrev: boolean;
  canNext: boolean;
};

/** The Notes view's commands: the standard set (scrollTo top or a note id; playback) plus the
    calendar's month. */
export type KNotesCommands = KStandardCommands & {
  month: KNotesMonthRecord;
  playback: KStandardCommands["playback"] & { failed: boolean };
  /** the page just sealed pops into its place (send it once the note is in `notes`) */
  popIn: { key: string };
};

export type KNotesViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KNotesStrings;
    notes: KNotesNote[];
    hasMore: boolean;
    empty: boolean;
    view: KNotesLayout;
    calendarOpen: boolean;
    recentGroups: KNotesGroup[];
    /** "" for none */
    wrenLine: string;
    /** the line is Notes E1's one-time "first one down…": drawn in the system font, not the letter
        face's italic */
    wrenFirst: boolean;
    bird: KImageRefProps | null;
    birdMini: KImageRefProps | null;
    evening: KNotesEvening;
    eveningBusy: boolean;
    palette: KNotesPalette;
    onOpen?: (id: string) => void;
    onViewCycle?: () => void;
    onCalendarToggle?: (open: boolean) => void;
    onCalendarMonth?: (delta: number) => void;
    onDayPick?: (id: string) => void;
    onVoiceToggle?: (id: string) => void;
    onEveningAnswer?: (answer: "yes" | "no" | "off") => void;
    onWrenLineDismiss?: () => void;
    onCompose?: (kind: "text" | "voice") => void;
    onReachEnd?: () => void;
    /** Notes E1: the draft card under a chosen mood was tapped */
    onEmptyWrite?: (group: KNotesGroup) => void;
    /** <KIsland> / <KSlot> children (none today), every one on every render (Slot.tsx) */
    children?: ReactNode;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };
type NativeNote = Omit<KNotesNote, "photo" | "photos" | "video"> & { photo: NativeImage; photos: NativeImage[]; video: NativeImage };

type NativeKNotesViewProps = Omit<
  KNotesViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "notes"
  | "bird"
  | "birdMini"
  | "onOpen"
  | "onViewCycle"
  | "onCalendarToggle"
  | "onCalendarMonth"
  | "onDayPick"
  | "onVoiceToggle"
  | "onEveningAnswer"
  | "onWrenLineDismiss"
  | "onCompose"
  | "onReachEnd"
  | "onEmptyWrite"
> &
  Required<Pick<KNotesViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    notes: NativeNote[];
    bird: NativeImage;
    birdMini: NativeImage;
    onNotesOpen?: Ev<{ id: string }>;
    onNotesViewCycle?: Ev<Record<string, never>>;
    onNotesCalendarToggle?: Ev<{ open: boolean }>;
    onNotesCalendarMonth?: Ev<{ delta: number }>;
    onNotesDayPick?: Ev<{ id: string }>;
    onNotesVoiceToggle?: Ev<{ id: string }>;
    onNotesEveningAnswer?: Ev<{ answer: "yes" | "no" | "off" }>;
    onNotesWrenLineDismiss?: Ev<Record<string, never>>;
    onNotesCompose?: Ev<{ kind: "text" | "voice" }>;
    onNotesReachEnd?: Ev<Record<string, never>>;
    onNotesEmptyWrite?: Ev<{ group: KNotesGroup }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };

/** An image ref as a Swift @Field record wants it: every field present, "" for none. */
export function nativeImage(ref: KImageRefProps | null | undefined, kind?: "image" | "videoPoster"): NativeImage {
  return ref ? { uri: ref.uri, key: ref.key, kind: kind ?? ref.kind ?? "image" } : NO_IMAGE;
}

/** Notes as the Swift records want them (no nulls: a record field can't take one). */
export function nativeNotes(notes: KNotesNote[]): NativeNote[] {
  return notes.map((n) => ({ ...n, photo: nativeImage(n.photo), photos: n.photos.map((p) => nativeImage(p)), video: nativeImage(n.video, "videoPoster") }));
}

// the view's JS name is the Swift struct's name (ios/Adapters/KNotesView.swift)
const NativeKNotesView = requireNativeView<NativeKNotesViewProps>("KindredlyUI", "KNotesView");

/** The bare SwiftUI screen. Only inside an @expo/ui <Host>; its ref takes commands. Pass `notes`
    memoised with a rev from useRev: the converted copy follows the array's identity, so a render
    that changes nothing else doesn't resend them. */
export const KNotesView = forwardRef<KScreenHandle, KNotesViewProps>(function KNotesView(
  {
    modifiers,
    letterFont,
    insets,
    rev,
    notes,
    bird,
    birdMini,
    onOpen,
    onViewCycle,
    onCalendarToggle,
    onCalendarMonth,
    onDayPick,
    onVoiceToggle,
    onEveningAnswer,
    onWrenLineDismiss,
    onCompose,
    onReachEnd,
    onEmptyWrite,
    ...rest
  },
  ref,
) {
  const sent = useMemo(() => nativeNotes(notes), [notes]);
  const birdRecord = useMemo(() => nativeImage(bird), [bird]);
  const miniRecord = useMemo(() => nativeImage(birdMini), [birdMini]);
  return (
    <NativeKNotesView
      ref={ref}
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      // always sent, so Swift never sees a base prop go missing
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      notes={sent}
      bird={birdRecord}
      birdMini={miniRecord}
      onNotesOpen={onOpen ? (e) => onOpen(e.nativeEvent.id) : undefined}
      onNotesViewCycle={onViewCycle ? () => onViewCycle() : undefined}
      onNotesCalendarToggle={onCalendarToggle ? (e) => onCalendarToggle(e.nativeEvent.open) : undefined}
      onNotesCalendarMonth={onCalendarMonth ? (e) => onCalendarMonth(e.nativeEvent.delta) : undefined}
      onNotesDayPick={onDayPick ? (e) => onDayPick(e.nativeEvent.id) : undefined}
      onNotesVoiceToggle={onVoiceToggle ? (e) => onVoiceToggle(e.nativeEvent.id) : undefined}
      onNotesEveningAnswer={onEveningAnswer ? (e) => onEveningAnswer(e.nativeEvent.answer) : undefined}
      onNotesWrenLineDismiss={onWrenLineDismiss ? () => onWrenLineDismiss() : undefined}
      onNotesCompose={onCompose ? (e) => onCompose(e.nativeEvent.kind) : undefined}
      onNotesReachEnd={onReachEnd ? () => onReachEnd() : undefined}
      onNotesEmptyWrite={onEmptyWrite ? (e) => onEmptyWrite(e.nativeEvent.group) : undefined}
    />
  );
});
