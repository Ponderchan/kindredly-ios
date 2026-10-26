import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* EDIT PROFILE, drawn by SwiftUI (ios/Portable/Profile/KEditProfileScreen.swift, adapter
   ios/Adapters/KEditProfileView.swift), for src/screens/edit-profile/EditProfileNative.tsx. Every
   word and value comes in from TS (src/screens/edit-profile/edit-profile-model.ts builds them);
   Swift draws them and reports taps, and TS saves each field on its own (with the identity switch
   on, ON YOUR LETTERS' two switches too: `letters`, onShowMark, onShowSign).

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost in
   src/components/NativeSurface.tsx; ignoreSafeArea "all" — it has no text field: the pen name and
   the courier's name are edited on a React Native page), and only after
   isKindredlyUIViewAvailable("KEditProfileView") and the "editprofile" NativeSurface switch say
   so. Outside a Host it is a RedBox in dev and a CRASH in a release build. Its ref is a
   KScreenHandle: give it `commands.ref` from useKCommands<KEditProfileCommands> (commands.ts).

   insets.top is the status bar; insets.tabBarRoom the floating bar's room (Edit profile is
   pushed inside the Me tab). Pass the records memoised, with a rev from useRev over ALL of them:
   Swift converts them once per rev.

   CHILDREN: exactly one <KIsland name="avatar"> (112 × 112, AvatarImage round), on every render
   (Slot.tsx). */

export type KEditProfileStrings = {
  title: string;
  backLabel: string;
  cameraLabel: string;
  photoLabel: string;
  randomLabel: string;
  avatarHint: string;
  facesHeader: string;
  youHeader: string;
  courierHeader: string;
  footer: string;
};

export type KEditProfileFace = {
  id: string;
  /** the portrait as a file (lib/images useAssetImageRefs); null while it resolves */
  image: KImageRefProps | null;
  a11y: string;
};

export type KEditProfileRow = { label: string; value: string };

export type KEditProfileRows = {
  pen: KEditProfileRow;
  pronoun: KEditProfileRow;
  birthday: KEditProfileRow;
  courier: KEditProfileRow;
};

/** One switch of ON YOUR LETTERS: its label, the note under it, the value the account holds. */
export type KEditProfileToggle = { label: string; note: string; on: boolean };

/** ON YOUR LETTERS (identity switch on, edit-profile-model LettersVM): the mark's switch (null for
    they / unset) and the sign's. */
export type KEditProfileLetters = { header: string; mark: KEditProfileToggle | null; sign: KEditProfileToggle };

export type KEditProfileNote = {
  title: string;
  body: string;
  see: string;
  keep: string;
  faces: (KImageRefProps | null)[];
};

/** Make your own face's ＋ cell at the head of the strip (the "makeface" switch on): its tag
    (FREE · ONCE / 1ST CLASS), the gold look once the free face is spent, VoiceOver's name. */
export type KEditProfileMake = { tag: string; firstClass: boolean; a11y: string };

/** The Edit profile view's commands: scrollTo the top or the face strip. */
export type KEditProfileCommands = {
  scrollTo: { key: "top" | "faces"; animated?: boolean };
};

export type KEditProfileViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KEditProfileStrings;
    faces: KEditProfileFace[];
    /** the face worn; "" for none (a photo, or none picked) */
    selectedFace: string;
    rows: KEditProfileRows;
    pronounOptions: { id: string; label: string }[];
    pronounSelected: string;
    /** the one-time new-faces note; null for none */
    note: KEditProfileNote | null;
    /** ON YOUR LETTERS, the identity switch's two switches; null (the switch off) draws no group */
    letters?: KEditProfileLetters | null;
    /** Make your own face's ＋ cell; null (the switch off) draws none */
    make?: KEditProfileMake | null;
    /** the ＋ cell */
    onMake?: () => void;
    onBack?: () => void;
    onPhoto?: () => void;
    onRandom?: () => void;
    onFace?: (id: string) => void;
    onPen?: () => void;
    onPronoun?: (id: string) => void;
    /** ON YOUR LETTERS: the ♀/♂ switch asks for this value (the account isn't changed until TS saves it) */
    onShowMark?: (on: boolean) => void;
    /** ON YOUR LETTERS: the star sign's switch asks for this value */
    onShowSign?: (on: boolean) => void;
    onCourierName?: () => void;
    onNoteSee?: () => void;
    onNoteKeep?: () => void;
    /** the one <KIsland name="avatar"> */
    children?: ReactNode;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };
type NativeNote = { present: boolean; title: string; body: string; see: string; keep: string; faces: NativeImage[] };
type NativeMake = { present: boolean; tag: string; firstClass: boolean; a11y: string };
type NativeLetters = {
  present: boolean;
  header: string;
  markShown: boolean;
  markLabel: string;
  markNote: string;
  markOn: boolean;
  signLabel: string;
  signNote: string;
  signOn: boolean;
};

type NativeKEditProfileViewProps = Omit<
  KEditProfileViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "faces"
  | "note"
  | "letters"
  | "make"
  | "onMake"
  | "onShowMark"
  | "onShowSign"
  | "onBack"
  | "onPhoto"
  | "onRandom"
  | "onFace"
  | "onPen"
  | "onPronoun"
  | "onCourierName"
  | "onNoteSee"
  | "onNoteKeep"
> &
  Required<Pick<KEditProfileViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    faces: { id: string; image: NativeImage; a11y: string }[];
    note: NativeNote;
    letters: NativeLetters;
    make: NativeMake;
    onEditBack?: None;
    onEditMake?: None;
    onEditPhoto?: None;
    onEditRandom?: None;
    onEditFace?: Ev<{ id: string }>;
    onEditPen?: None;
    onEditPronoun?: Ev<{ id: string }>;
    onEditShowMark?: Ev<{ on: boolean }>;
    onEditShowSign?: Ev<{ on: boolean }>;
    onEditCourierName?: None;
    onEditNoteSee?: None;
    onEditNoteKeep?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const image = (r: KImageRefProps | null | undefined): NativeImage => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);
const NO_NOTE: NativeNote = { present: false, title: "", body: "", see: "", keep: "", faces: [] };

const NO_MAKE: NativeMake = { present: false, tag: "", firstClass: false, a11y: "" };
const nativeMake = (m: KEditProfileMake | null | undefined): NativeMake => (m ? { present: true, tag: m.tag, firstClass: !!m.firstClass, a11y: m.a11y } : NO_MAKE);

const NO_LETTERS: NativeLetters = { present: false, header: "", markShown: false, markLabel: "", markNote: "", markOn: false, signLabel: "", signNote: "", signOn: true };

/** ON YOUR LETTERS as the Swift record wants it (present false for none: a @Field record can't take null). */
export function nativeEditLetters(l: KEditProfileLetters | null | undefined): NativeLetters {
  if (!l) return NO_LETTERS;
  return {
    present: true,
    header: l.header,
    markShown: !!l.mark,
    markLabel: l.mark?.label ?? "",
    markNote: l.mark?.note ?? "",
    markOn: !!l.mark?.on,
    signLabel: l.sign.label,
    signNote: l.sign.note,
    signOn: l.sign.on,
  };
}

/** The note as the Swift record wants it (a @Field record can't take null). */
export function nativeEditNote(n: KEditProfileNote | null): NativeNote {
  return n ? { present: true, title: n.title, body: n.body, see: n.see, keep: n.keep, faces: n.faces.slice(0, 3).map(image) } : NO_NOTE;
}

// the view's JS name is the Swift struct's name (ios/Adapters/KEditProfileView.swift)
const NativeKEditProfileView = requireNativeView<NativeKEditProfileViewProps>("KindredlyUI", "KEditProfileView");

/** The bare SwiftUI screen. Only inside an @expo/ui <Host>; its ref takes commands. Pass the
    records memoised with a rev from useRev over all of them, and the avatar island as a child. */
export const KEditProfileView = forwardRef<KScreenHandle, KEditProfileViewProps>(function KEditProfileView(
  { modifiers, letterFont, insets, rev, faces, note, letters, make, onMake, onBack, onPhoto, onRandom, onFace, onPen, onPronoun, onShowMark, onShowSign, onCourierName, onNoteSee, onNoteKeep, ...rest },
  ref,
) {
  // the converted records follow their source's identity
  const sentFaces = useMemo(() => faces.map((f) => ({ id: f.id, image: image(f.image), a11y: f.a11y })), [faces]);
  const sentNote = useMemo(() => nativeEditNote(note), [note]);
  const sentLetters = useMemo(() => nativeEditLetters(letters), [letters]);
  const sentMake = useMemo(() => nativeMake(make), [make]);
  return (
    <NativeKEditProfileView
      ref={ref}
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      // always sent, so Swift never sees a base prop go missing
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      faces={sentFaces}
      note={sentNote}
      letters={sentLetters}
      make={sentMake}
      onEditMake={onMake ? () => onMake() : undefined}
      onEditBack={onBack ? () => onBack() : undefined}
      onEditPhoto={onPhoto ? () => onPhoto() : undefined}
      onEditRandom={onRandom ? () => onRandom() : undefined}
      onEditFace={onFace ? (e) => onFace(e.nativeEvent.id) : undefined}
      onEditPen={onPen ? () => onPen() : undefined}
      onEditPronoun={onPronoun ? (e) => onPronoun(e.nativeEvent.id) : undefined}
      onEditShowMark={onShowMark ? (e) => onShowMark(!!e.nativeEvent.on) : undefined}
      onEditShowSign={onShowSign ? (e) => onShowSign(!!e.nativeEvent.on) : undefined}
      onEditCourierName={onCourierName ? () => onCourierName() : undefined}
      onEditNoteSee={onNoteSee ? () => onNoteSee() : undefined}
      onEditNoteKeep={onNoteKeep ? () => onNoteKeep() : undefined}
    />
  );
});
