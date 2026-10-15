import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KMenuAction, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* THE STEP-5 SPIKE LAB (batch 0b, dev only), drawn by SwiftUI (ios/Portable/Kit/KLab.swift,
   adapter ios/Adapters/KLabView.swift), for src/app/dev/step5-lab.tsx. One surface that puts
   the step-5 kit together the way the chat screen will (a long bottom-anchored list, a dock on
   the keyboard, a KField, row menus, pictures, an island, a voice card) so it can be tried on a
   device before any screen is built on it.

   It is a whole screen: alone in one @expo/ui <Host style={{flex:1}} ignoreSafeArea="container">
   (SurfaceHost field in src/components/NativeSurface.tsx), and only after
   isKindredlyUIViewAvailable("KLabView") says this binary has it. Outside a Host it is a RedBox
   in dev and a CRASH in a release build. Its ref is a KScreenHandle: give it `commands.ref` from
   useKCommands (commands.ts), typed with KLabCommands. It holds a KField, so pass
   { blurOnUnmount: true } (the lab can turn it off to try the Swift guard alone). Its one island
   goes in as <KIsland name="cord"> (Slot.tsx). */

/** One row: oldest first; the list opens at the last. */
export type KLabRow = {
  id: string;
  body: string;
  /** drawn on the right */
  mine: boolean;
  /** the small line under the bubble; "" for none */
  meta: string;
  /** the long-press menu; [] for none */
  menu: KMenuAction[];
};

/** Every word the lab shows (Swift holds none). */
export type KLabStrings = {
  placeholder: string;
  sendLabel: string;
  /** VoiceOver's name for the round + */
  plusLabel: string;
  /** the line under the strip */
  hint: string;
  /** what the + opens */
  trayText: string;
  islandTitle: string;
  mediaTitle: string;
  assetCaption: string;
  remoteCaption: string;
  posterCaption: string;
  birdCaption: string;
  voiceTitle: string;
  /** the voice's whole length, e.g. "0:06" */
  voiceDuration: string;
  playLabel: string;
  pauseLabel: string;
  toggleLabel: string;
  listTitle: string;
};

/** What the lab reports about itself, on every change. */
export type KLabFacts = {
  atBottom: boolean;
  /** the first row on screen once the scroll settled; "" before the first settle */
  topRowId: string;
  /** the keyboard's inset at the bottom of the lab, in points; 0 while it is down */
  keyboardInset: number;
  focused: boolean;
};

/** A timing: "stamp" = a props change reaching the Swift body, "command" = a ping through the
    command bus. ms is JS's Date.now() at sending to Swift's clock at arrival; n is how many rows
    the props held. */
export type KLabMeasure = { kind: "stamp" | "command"; ms: number; n: number };

/** The lab's commands: the standard set (setText/focus target "reply") plus its own. */
export type KLabCommands = KStandardCommands & {
  composer: { canSend: boolean };
  ping: { at: number };
  playback: KStandardCommands["playback"] & { failed?: boolean };
};

export type KLabViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    rows: KLabRow[];
    strings: KLabStrings;
    assetImage?: KImageRefProps | null;
    remoteImage?: KImageRefProps | null;
    posterImage?: KImageRefProps | null;
    birdImage?: KImageRefProps | null;
    /** set to Date.now() to time a props round (onLabMeasure kind "stamp") */
    stamp?: number;
    onLabSend?: (text: string) => void;
    onLabDraft?: (text: string) => void;
    onLabRowAction?: (id: string, key: string) => void;
    onLabVoiceToggle?: () => void;
    onLabFacts?: (facts: KLabFacts) => void;
    onLabPull?: (depth: number) => void;
    onLabNearTop?: () => void;
    onLabMeasure?: (m: KLabMeasure) => void;
    onLabToggle?: (on: boolean) => void;
    /** the <KIsland name="cord">, every render */
    children?: ReactNode;
  };

type NativeRow = { id: string; body: string; mine: boolean; meta: string; menu: { key: string; title: string; icon: string; destructive: boolean }[] };
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };

type NativeKLabViewProps = Omit<
  KLabViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "rows"
  | "assetImage"
  | "remoteImage"
  | "posterImage"
  | "birdImage"
  | "onLabSend"
  | "onLabDraft"
  | "onLabRowAction"
  | "onLabFacts"
  | "onLabPull"
  | "onLabMeasure"
  | "onLabToggle"
> &
  Required<Pick<KLabViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    rows: NativeRow[];
    assetImage: NativeImage;
    remoteImage: NativeImage;
    posterImage: NativeImage;
    birdImage: NativeImage;
    onLabSend?: (e: { nativeEvent: { text: string } }) => void;
    onLabDraft?: (e: { nativeEvent: { text: string } }) => void;
    onLabRowAction?: (e: { nativeEvent: { id: string; key: string } }) => void;
    onLabFacts?: (e: { nativeEvent: KLabFacts }) => void;
    onLabPull?: (e: { nativeEvent: { depth: number } }) => void;
    onLabMeasure?: (e: { nativeEvent: KLabMeasure }) => void;
    onLabToggle?: (e: { nativeEvent: { on: boolean } }) => void;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };

const image = (ref: KImageRefProps | null | undefined): NativeImage =>
  ref ? { uri: ref.uri, key: ref.key, kind: ref.kind ?? "image" } : NO_IMAGE;

/* Rows as the Swift record wants them: every menu item with its destructive flag spelled out
   (an undefined field would reach Swift as null, which a Bool @Field can't take). */
function nativeRows(rows: KLabRow[]): NativeRow[] {
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    mine: r.mine,
    meta: r.meta,
    menu: r.menu.map((m) => ({ key: m.key, title: m.title, icon: m.icon, destructive: m.destructive ?? false })),
  }));
}

// the view's JS name is the Swift struct's name (ios/Adapters/KLabView.swift)
const NativeKLabView = requireNativeView<NativeKLabViewProps>("KindredlyUI", "KLabView");

/** The bare SwiftUI lab. Only inside an @expo/ui <Host>; its ref takes commands. Pass `rows`
    memoised, with a rev from useRev: the converted copy follows the array's identity, so a render
    that changes nothing else doesn't resend them. */
export const KLabView = forwardRef<KScreenHandle, KLabViewProps>(function KLabView(
  {
    modifiers,
    rows,
    letterFont,
    insets,
    rev,
    assetImage,
    remoteImage,
    posterImage,
    birdImage,
    onLabSend,
    onLabDraft,
    onLabRowAction,
    onLabFacts,
    onLabPull,
    onLabMeasure,
    onLabToggle,
    ...rest
  },
  ref,
) {
  const sent = useMemo(() => nativeRows(rows), [rows]);
  return (
    <NativeKLabView
      ref={ref}
      modifiers={modifiers}
      // lets event modifiers reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      // always sent, so Swift never sees a base prop go missing
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      rows={sent}
      assetImage={image(assetImage)}
      remoteImage={image(remoteImage)}
      posterImage={image(posterImage)}
      birdImage={image(birdImage)}
      onLabSend={onLabSend ? (e) => onLabSend(e.nativeEvent.text) : undefined}
      onLabDraft={onLabDraft ? (e) => onLabDraft(e.nativeEvent.text) : undefined}
      onLabRowAction={onLabRowAction ? (e) => onLabRowAction(e.nativeEvent.id, e.nativeEvent.key) : undefined}
      onLabFacts={onLabFacts ? (e) => onLabFacts(e.nativeEvent) : undefined}
      onLabPull={onLabPull ? (e) => onLabPull(e.nativeEvent.depth) : undefined}
      onLabMeasure={onLabMeasure ? (e) => onLabMeasure(e.nativeEvent) : undefined}
      onLabToggle={onLabToggle ? (e) => onLabToggle(e.nativeEvent.on) : undefined}
    />
  );
});
