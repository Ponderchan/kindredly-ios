import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeFrost, type KFrost, type KInsets, type KScreenBaseProps, type KScreenHandle } from "./types";

/* A KINDRED'S PAGE, drawn by SwiftUI (2026-10-27, behind the "kindredpage" switch; ios/Portable/
   Chat/KKindredPageScreen.swift, adapter ios/Adapters/KKindredPageView.swift), for
   src/screens/chat/KindredPageNative.tsx. TS reads the thread and words every section
   (src/screens/chat/kindred-page-view.ts, over the rules in kindred-page.ts); Swift draws them
   and reports taps, the held signature and VoiceOver's two actions on it.

   Commands: playback { key, playing, positionS, durationS, at } for the voice opening (the one
   player lives in TS, lib/voice-playback).

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KKindredPageView") and the "kindredpage" NativeSurface switch say so. */

export type KKindredPageStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  /** VoiceOver for the ⋯; "" draws no ⋯ (nobody to report) */
  moreLabel: string;
  offlineTitle: string;
  offlineBody: string;
  /** the thread is gone (or hidden by a block) and nothing is kept */
  missingBody: string;
  /** VoiceOver for the voice card's toggle (vo.play, vo.pause) */
  playLabel: string;
  pauseLabel: string;
  /** VoiceOver's two actions on a held signature (id2.rp.signature, rp.menu.block) */
  reportLabel: string;
  blockLabel: string;
};

/** loading: the bar alone; offline / missing: one line under it; ready: the page */
export type KKindredPageState = "loading" | "ready" | "offline" | "missing";

/** How the face is drawn: round (a kindred, 64), a pen pal's frosted window or flat veil tile
    (56, identity on), their mosaic (cells of 9, developing), or the veil mosaic (a closed account). */
export type KKindredPageFaceShape = "round" | "frost" | "tile" | "mosaic" | "veil";

export type KKindredPageFace = {
  shape: KKindredPageFaceShape;
  /** round: the picture (lib/faces faceRecord: image | placeholder) */
  kind: "image" | "placeholder";
  uri: string;
  key: string;
  overscan: number;
  /** mosaic: the FACE v1 mask */
  mask: number;
  /** frost: the window; NO_FROST otherwise */
  frost: KFrost | null;
  /** a member's stamp (C2): "1ST" | "007" | "" */
  stamp: string;
  /** VoiceOver for a stamped face ("First Class"); "" leaves the face unread */
  a11y: string;
};

export type KKindredPagePerson = {
  /** names traded: the name at 26; before, the archetype at 24 with its line */
  revealed: boolean;
  heading: string;
  /** a kindred's she/he mark and star sign after the name; "" for none, and always "" before names
      are traded (the mark is a kindred's to see) */
  mark: "she" | "he" | "";
  sign: string;
  /** VoiceOver for the name with its marks ("Mira, she, Gemini"); "" reads the heading alone */
  headingA11y: string;
  /** under the heading before names; "" */
  sub: string;
  /** THE FACE YOU WATCHED ARRIVE; "" for none */
  arrival: string;
  /** that small mosaic's mask */
  arrivalMask: number;
};

export type KKindredPageSigned = {
  show: boolean;
  label: string;
  /** the pen name, drawn in type when there is no drawing */
  name: string;
  /** a typed CJK name stands upright */
  typedUpright: boolean;
  a11y: string;
  /** VoiceOver's hint when it can be held; "" */
  hint: string;
  holdable: boolean;
  /** the drawing as SVG path data in PEN v1 box units; "" for a typed name */
  path: string;
  boxW: number;
  boxH: number;
  /** where the pad drew its baseline, in box units */
  baselineY: number;
  /** FIRST MET AS …; "" */
  met: string;
};

export type KKindredPageDim = { key: string; label: string; score: number; line: string };

export type KKindredPageLearned = {
  show: boolean;
  label: string;
  /** "3 MOMENTS" */
  moments: string;
  dims: KKindredPageDim[];
  /** KEEP WRITING; "" when nothing is sealed */
  sealedLabel: string;
  /** "□ how they …   □ …" */
  sealed: string;
};

export type KKindredPageTrack = { key: string; label: string; mine: number; theirs: number; together: boolean; a11y: string };

export type KKindredPageResonance = {
  show: boolean;
  label: string;
  /** "73%" */
  score: string;
  rows: KKindredPageTrack[];
  close: string;
  far: string;
};

export type KKindredPageFact = {
  key: string;
  label: string;
  value: string;
  /** the stamp it began under, drawn after the value; "" for none */
  stamp: string;
  /** the id that stamp tilts by */
  letterId: string;
};

export type KKindredPageOpening = {
  show: boolean;
  label: string;
  /** a voice letter: the card above its caption */
  voice: boolean;
  /** "0:35" */
  duration: string;
  body: string;
  /** the body's line limit */
  lines: number;
  /** YOU WROTE FIRST / … WROTE FIRST */
  who: string;
};

export type KKindredPageViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KKindredPageStrings;
    state: KKindredPageState;
    face: KKindredPageFace;
    person: KKindredPagePerson;
    signed: KKindredPageSigned;
    learned: KKindredPageLearned;
    resonance: KKindredPageResonance;
    facts: KKindredPageFact[];
    opening: KKindredPageOpening;
    /** the voice opening's link isn't signed yet (offline): the card is dimmed and still */
    voiceUnavailable: boolean;
    /** TALK TO {NAME}; "" for no door */
    talk: string;
    onBack?: () => void;
    onMore?: () => void;
    onTalk?: () => void;
    onVoice?: () => void;
    /** the signature was held: its slot, in the page's own points from its top left */
    onHold?: (r: { x: number; y: number; width: number; height: number }) => void;
    /** VoiceOver's action on the signature: "report" | "block" */
    onSignatureAction?: (name: "report" | "block") => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeFace = Omit<KKindredPageFace, "frost"> & { frost: KFrost };

type NativeKKindredPageViewProps = Omit<
  KKindredPageViewProps,
  "letterFont" | "insets" | "rev" | "face" | "onBack" | "onMore" | "onTalk" | "onVoice" | "onHold" | "onSignatureAction"
> &
  Required<Pick<KKindredPageViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    face: NativeFace;
    onKpBack?: None;
    onKpMore?: None;
    onKpTalk?: None;
    onKpVoice?: None;
    onKpHold?: Ev<{ x: number; y: number; width: number; height: number }>;
    onKpSigAction?: Ev<{ name: string }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

const NativeKKindredPageView = requireNativeView<NativeKKindredPageViewProps>("KindredlyUI", "KKindredPageView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KKindredPageView = forwardRef<KScreenHandle, KKindredPageViewProps>(function KKindredPageView(
  { modifiers, letterFont, insets, rev, face, onBack, onMore, onTalk, onVoice, onHold, onSignatureAction, ...rest },
  ref,
) {
  // a Swift record can't take null: no window is NO_FROST
  const sentFace = useMemo(() => ({ ...face, frost: nativeFrost(face.frost) }), [face]);
  return (
    <NativeKKindredPageView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      face={sentFace}
      onKpBack={onBack ? () => onBack() : undefined}
      onKpMore={onMore ? () => onMore() : undefined}
      onKpTalk={onTalk ? () => onTalk() : undefined}
      onKpVoice={onVoice ? () => onVoice() : undefined}
      onKpHold={onHold ? (e) => onHold(e.nativeEvent) : undefined}
      onKpSigAction={onSignatureAction ? (e) => onSignatureAction(e.nativeEvent.name === "block" ? "block" : "report") : undefined}
    />
  );
});
