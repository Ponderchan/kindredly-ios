import { requireNativeView } from "expo";
import type { KNotesMonthRecord } from "./Notes";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";
import type { KVoiceSlotAction, KVoiceSlotCommand } from "./VoicePieces";
import { nativeWrenPicture, type KWrenPictureData } from "./LastIslands";

/* THE NOTES COMPOSER, drawn by SwiftUI (ios/Portable/Notes/KNoteComposePage.swift, adapter
   ios/Adapters/KNoteComposeView.swift), for src/screens/journal-entry/NoteComposeNative.tsx. Every
   word, the mood, the panels' contents and what the page holds come from TS (useNoteComposeState
   over the pure note-compose-model); Swift draws them, holds the words being typed (an
   uncontrolled field) and reports every edit and tap.

   A whole screen: alone in one @expo/ui <Host> that keeps the keyboard's safe area (SurfaceHost
   field), and only after isKindredlyUIViewAvailable("KNoteComposeView") and the "journalentry"
   NativeSurface switch say so. Its ref is a KScreenHandle (useKCommands with blurOnUnmount and an
   onViewAttach that reseeds the words: a remounted view starts empty).

   Islands, every one on every render, in this order: "wren" (WrenBird at 30, display only) and
   "recorder" (the Recorder and its take while speaking, interactive, with an explicit width). */

export type KNotePanel = "none" | "plus" | "mood";
export type KNoteMediaKind = "photo" | "video" | "voice";
export type KNoteMoodGroupKey = "calm" | "happy" | "tired" | "low";

export type KNoteComposeStrings = {
  /** "oct 26" */
  date: string;
  /** JUST FOR ME */
  justForMe: string;
  /** VoiceOver: the ✕, and the ＋ while its panel is open */
  closeLabel: string;
  /** VoiceOver: the editor */
  editorLabel: string;
  /** the empty page's placeholder */
  placeholder: string;
  /** VoiceOver: the ＋ */
  plusLabel: string;
  /** VoiceOver: the mood capsule before a mood is chosen */
  moodEmptyLabel: string;
  sealLabel: string;
  sealingLabel: string;
  /** VoiceOver's hint on the seal key while no mood is chosen */
  sealHint: string;
  /** under the sealed note, display-ready mono capitals ("KEPT · OCT 26") */
  keptLine: string;
  /** what VoiceOver says once the page is sealed ("Kept.") */
  keptSpoken: string;
  coverHint: string;
  /** VoiceOver: the film's ✕ */
  removeVideo: string;
};

/** The mood the page holds; group "" for none. */
export type KNoteMood = { group: KNoteMoodGroupKey | ""; artKey: string; path: string; a11yLabel: string };
export type KNoteMoodFace = { id: string; name: string; artKey: string; path: string; a11yLabel: string };
export type KNoteMoodGroup = { group: KNoteMoodGroupKey; name: string; faces: KNoteMoodFace[] };
export type KNoteMediaCard = { kind: KNoteMediaKind; label: string; enabled: boolean; a11yValue: string };
export type KNoteThumb = { id: string; kind: "photo" | "video"; image: KImageRefProps; a11yLabel: string; a11yHint: string };

export type KNoteComposeCommands = Omit<KStandardCommands, "setText" | "focus"> & {
  setText: { target: "body"; value: string };
  focus: { target: "body" };
  /** the voice slot: what Swift draws itself of the recorder and the take (VoicePieces.tsx) */
  recorder: KVoiceSlotCommand;
  /** a folding phone's inner screen: this month, for the left page (the Notes tab's own record) */
  month: KNotesMonthRecord;
};

export type KNoteComposeViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KNoteComposeStrings;
    wrenLine: string;
    mood: KNoteMood;
    panel: KNotePanel;
    /** the four groups and their faces (memoised, with a rev) */
    groups: KNoteMoodGroup[];
    openGroup: KNoteMoodGroupKey;
    chosenGroup: KNoteMoodGroupKey | "";
    chosenFace: string;
    cards: KNoteMediaCard[];
    thumbs: KNoteThumb[];
    coverHint: boolean;
    voice: boolean;
    hasSomething: boolean;
    busy: boolean;
    sealed: boolean;
    needsMood: boolean;
    /** the calendar's weekday letters, for a folding phone's left page; none on a phone */
    weekdays?: string[];
    onClose?: () => void;
    onTextChange?: (text: string) => void;
    onFieldFocus?: (focused: boolean) => void;
    onPanel?: (which: "plus" | "mood") => void;
    onPickGroup?: (group: KNoteMoodGroupKey) => void;
    onPickFace?: (id: string) => void;
    onCard?: (kind: KNoteMediaKind) => void;
    onThumb?: (index: number) => void;
    onRemoveMedia?: () => void;
    onSeal?: (text: string) => void;
    onWren?: () => void;
    /** the seal moment has played (after sealed turned true): back to Notes */
    onSealEnd?: () => void;
    /** a tap in the voice slot's Swift recording bar or take card (the `recorder` command) */
    onVoice?: (action: KVoiceSlotAction) => void;
    /** batch 3 ("notewren", LastIslands.tsx): her content picture at 30; Swift draws it and
        leaves the "wren" island out. null keeps the island */
    wren?: KWrenPictureData | null;
    /** the two <KIsland>s, "wren" then "recorder", every render (Slot.tsx) */
    children?: ReactNode;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;

type NativeProps = Omit<
  KNoteComposeViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "onClose"
  | "onTextChange"
  | "onFieldFocus"
  | "onPanel"
  | "onPickGroup"
  | "onPickFace"
  | "onCard"
  | "onThumb"
  | "onRemoveMedia"
  | "onSeal"
  | "onWren"
  | "onSealEnd"
  | "onVoice"
  | "wren"
> &
  Required<Pick<KNoteComposeViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    wren: ReturnType<typeof nativeWrenPicture>;
    onNoteClose?: Ev<Record<string, never>>;
    onNoteTextChange?: Ev<{ text: string }>;
    onNoteFieldFocus?: Ev<{ focused: boolean }>;
    onNotePanel?: Ev<{ which: "plus" | "mood" }>;
    onNotePickGroup?: Ev<{ group: KNoteMoodGroupKey }>;
    onNotePickFace?: Ev<{ id: string }>;
    onNoteCard?: Ev<{ kind: KNoteMediaKind }>;
    onNoteThumb?: Ev<{ index: number }>;
    onNoteRemoveMedia?: Ev<Record<string, never>>;
    onNoteSeal?: Ev<{ text: string }>;
    onNoteWren?: Ev<Record<string, never>>;
    onNoteSealEnd?: Ev<Record<string, never>>;
    onNoteVoice?: Ev<{ action: KVoiceSlotAction }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

/** The groups as the Swift records want them: every field present. */
export function nativeNoteGroups(groups: readonly KNoteMoodGroup[]): KNoteMoodGroup[] {
  return groups.map((g) => ({
    group: g.group,
    name: g.name ?? "",
    faces: g.faces.map((f) => ({ id: f.id ?? "", name: f.name ?? "", artKey: f.artKey ?? "", path: f.path ?? "", a11yLabel: f.a11yLabel ?? "" })),
  }));
}

// the view's JS name is the Swift struct's name (ios/Adapters/KNoteComposeView.swift)
const NativeKNoteComposeView = requireNativeView<NativeProps>("KindredlyUI", "KNoteComposeView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>; its ref takes commands. */
export const KNoteComposeView = forwardRef<KScreenHandle, KNoteComposeViewProps>(function KNoteComposeView(
  { modifiers, letterFont, insets, rev, groups, thumbs, onClose, onTextChange, onFieldFocus, onPanel, onPickGroup, onPickFace, onCard, onThumb, onRemoveMedia, onSeal, onWren, onSealEnd, onVoice, wren, ...rest },
  ref,
) {
  const groupsSent = useMemo(() => nativeNoteGroups(groups), [groups]);
  const wrenSent = useMemo(() => nativeWrenPicture(wren), [wren]);
  const thumbsSent = useMemo(
    () =>
      thumbs.map((t) => ({
        id: t.id ?? "",
        kind: t.kind ?? "photo",
        image: { uri: t.image?.uri ?? "", key: t.image?.key ?? "", kind: t.image?.kind ?? "image" },
        a11yLabel: t.a11yLabel ?? "",
        a11yHint: t.a11yHint ?? "",
      })),
    [thumbs],
  );
  return (
    <NativeKNoteComposeView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      groups={groupsSent}
      thumbs={thumbsSent}
      wren={wrenSent}
      onNoteClose={onClose ? () => onClose() : undefined}
      onNoteTextChange={onTextChange ? (e) => onTextChange(e.nativeEvent.text) : undefined}
      onNoteFieldFocus={onFieldFocus ? (e) => onFieldFocus(e.nativeEvent.focused) : undefined}
      onNotePanel={onPanel ? (e) => onPanel(e.nativeEvent.which === "mood" ? "mood" : "plus") : undefined}
      onNotePickGroup={onPickGroup ? (e) => onPickGroup(e.nativeEvent.group) : undefined}
      onNotePickFace={onPickFace ? (e) => onPickFace(e.nativeEvent.id) : undefined}
      onNoteCard={onCard ? (e) => onCard(e.nativeEvent.kind) : undefined}
      onNoteThumb={onThumb ? (e) => onThumb(e.nativeEvent.index) : undefined}
      onNoteRemoveMedia={onRemoveMedia ? () => onRemoveMedia() : undefined}
      onNoteSeal={onSeal ? (e) => onSeal(e.nativeEvent.text) : undefined}
      onNoteWren={onWren ? () => onWren() : undefined}
      onNoteSealEnd={onSealEnd ? () => onSealEnd() : undefined}
      onNoteVoice={onVoice ? (e) => onVoice(e.nativeEvent.action) : undefined}
    />
  );
});
