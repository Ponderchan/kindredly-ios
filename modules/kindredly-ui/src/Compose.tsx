import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* THE COMPOSE PAGE, drawn by SwiftUI (ios/Portable/Compose/KComposePage.swift, adapter
   ios/Adapters/KComposeView.swift), for src/screens/compose/ComposeNative.tsx. Every word, the
   stamp's colours, the counts and the key's state come in from TS (src/screens/compose:
   useComposeState over the pure compose-model); Swift draws them, holds the words being typed and
   reports every edit and tap. Swift keeps only what a finger changes: the words (uncontrolled
   fields, so a Japanese or Korean composition is never written over), focus, and the keyboard.

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}
   ignoreSafeArea="container"> (SurfaceHost field in src/components/NativeSurface.tsx: the
   keyboard's safe area is kept, so the toolbar rides the keyboard), and only after
   isKindredlyUIViewAvailable("KComposeView") and the "compose" NativeSurface switch say so.
   Outside a Host it is a RedBox in dev and a CRASH in a release build.

   Its ref is a KScreenHandle: give it `commands.ref` from useKCommands<KComposeCommands>
   (commands.ts) with { blurOnUnmount: true, onViewAttach }. It holds text fields, so:
   - reseed in onViewAttach: setText { target: "body" } and { target: "ask" } with what TS holds.
     A remounted view starts empty, and a failed send must never lose the words (TS keeps them:
     onTextChange reports every edit, with no debounce);
   - never echo typing back: setText only for a draft resumed, a seed, a demo, a remount;
   - the live state (Wren's line, the key, the count) changes as the letter is typed, so it goes
     through the `composer` command, never props (every prop change re-sends the whole props map;
     a command costs a tenth of that). Send it when it changes, and again on attach;
   - blur before anything that covers the page (a sheet, an Alert, a push): blurThen / openLeaveSheet
     with this ref as the target. The page blurs itself before a tray opens and on the key.

   Islands (<KIsland>, Slot.tsx), every one on every render, in this order:
   - "wren": Wren herself (WrenBird, her mood, breathing), 26 × 26, display only; Swift sets her in
     the 36 soft2 circle;
   - "recorder": the Recorder and its preview while speaking (nothing inside while writing),
     interactive, self-sizing (RNHostView matchContents), with an explicit width (the page's width
     less 36): an island sizes to its content, and the Recorder fills its width.

   insets: top (the status bar Swift pads under) and bottom (the home indicator the toolbar keeps
   clear of while the keyboard is down, and the tray grows by). tabBarRoom is 0: a root route. */

export type KComposeMode = "write" | "speak";
export type KComposeTray = "none" | "stamps" | "more";

/** Every word of the page that isn't live or in a list. */
export type KComposeStrings = {
  /** TO A STRANGER */
  title: string;
  /** "Close": VoiceOver's name for the ×, and for the + while its tray is open */
  closeLabel: string;
  /** VoiceOver: the empty stamp slot and the stamp key ("Choose a mood stamp") */
  stampLabel: string;
  /** VoiceOver: the + ("Add a question or a voice letter") */
  plusLabel: string;
  /** VoiceOver: the editor ("Your letter") */
  editorLabel: string;
  /** the empty page's spark (lib/sparks) */
  placeholder: string;
  /** the line that travels with a recording: its placeholder */
  captionPlaceholder: string;
  /** under the Recorder: "Up to three minutes…" */
  voiceNote: string;
  /** over the question field */
  askLabel: string;
  askPlaceholder: string;
  /** the more tray's two cells */
  moreAsk: string;
  moreVoice: string;
  /** VoiceOver's value on the locked voice cell ("First Class only") */
  voiceLocked: string;
  /** VoiceOver's value on the ASK cell while speaking, when it is off ("Only with a written letter") */
  askDisabled: string;
  /** the daily-cap panel: its line, its sub, its link */
  capText: string;
  capSub: string;
  capLink: string;
};

/** The chosen stamp, coloured for the page (theme/post channelColors against the theme's page
    and tray). id "" = none chosen yet: the dashed slot and the stamp key. */
export type KComposeStamp = {
  id: string;
  /** "#made my day", already cased */
  name: string;
  /** the pill's fill, its words, its rule */
  washHex: string;
  inkHex: string;
  lineHex: string;
  /** VoiceOver: "Mood stamp: Made my day. Change it" */
  a11yLabel: string;
};

export type KComposeStampItem = { id: string; name: string; inkHex: string; a11yLabel: string };
export type KComposeSection = { title: string; items: KComposeStampItem[] };

/** The more tray's cells. askOn: lit (the question shows); askDisabled: off while speaking (a
    recording carries no question); voiceLocked: not First Class (a tap goes to the paywall). */
export type KComposeMore = { askOn: boolean; askDisabled: boolean; voiceOn: boolean; voiceLocked: boolean };

/** The live state, sent as the `composer` command whenever it changes (and on attach). */
export type KComposeLive = {
  /** Wren's line, already in quotes */
  wrenLine: string;
  key: {
    stage: "filling" | "needStamp" | "ready" | "sending";
    label: string;
    /** the label where `label` doesn't fit (SEND); "" never squeezes */
    narrowLabel: string;
    tone: "mute" | "ind";
    enabled: boolean;
    /** the wash toward the floor 0..1, -1 for none */
    progress: number;
    /** the count beside the label while the wash shows ("7/20"), "" for none */
    count: string;
    nudge: boolean;
    /** VoiceOver's value on the key ("13 more to go"), "" for none (a11y pass cm-8) */
    countA11y: string;
    /** VoiceOver's hint on the key (on PICK A MOOD STAMP), "" for none */
    hintA11y: string;
  };
  /** the count near the ceiling; text "" hides it */
  count: { text: string; tone: "mute" | "amber" | "post" };
};

/** The compose view's commands: setText / focus with target "body" (the letter, or the line that
    travels with a recording: one field at a time, one text) or "ask" (the question), blur, and
    composer (the live state). */
export type KComposeCommands = Omit<KStandardCommands, "setText" | "focus" | "composer"> & {
  setText: { target: "body" | "ask"; value: string };
  focus: { target: "body" | "ask" };
  composer: KComposeLive;
};

export type KComposeViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KComposeStrings;
    stamp: KComposeStamp;
    mode: KComposeMode;
    /** what sits where the keyboard was; the page blurs before it shows */
    tray: KComposeTray;
    /** the stamp tray's sections; send [] unless the stamp tray is open (memoised, with a rev) */
    sections: KComposeSection[];
    /** the question field shows (under the letter) */
    askOn: boolean;
    more: KComposeMore;
    /** the + key's dot: something rides with the letter */
    plusDot: boolean;
    /** "4 LEFT TODAY" for a free writer, "" otherwise */
    quota: string;
    /** the daily-cap panel shows */
    capPanel: boolean;
    /** a send is in flight */
    busy: boolean;
    onClose?: () => void;
    onTextChange?: (target: "body" | "ask", text: string) => void;
    /** a tray key: toggles that tray */
    onTray?: (which: "stamps" | "more") => void;
    onPickStamp?: (id: string) => void;
    onAskToggle?: () => void;
    onVoiceToggle?: () => void;
    /** the main key, with the words as typed: TS sends, or opens the stamps (needStamp) */
    onKeyPress?: (text: string, ask: string) => void;
    onCapLink?: () => void;
    /** a field gained or lost the keyboard (a gained focus closes the tray) */
    onFieldFocus?: (target: "body" | "ask", focused: boolean) => void;
    /** the two <KIsland>s, "wren" then "recorder", every render (Slot.tsx) */
    children?: ReactNode;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;

type NativeKComposeViewProps = Omit<
  KComposeViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "sections"
  | "onClose"
  | "onTextChange"
  | "onTray"
  | "onPickStamp"
  | "onAskToggle"
  | "onVoiceToggle"
  | "onKeyPress"
  | "onCapLink"
  | "onFieldFocus"
> &
  Required<Pick<KComposeViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    sections: KComposeSection[];
    onComposeClose?: Ev<Record<string, never>>;
    onComposeTextChange?: Ev<{ target: "body" | "ask"; text: string }>;
    onComposeTray?: Ev<{ which: "stamps" | "more" }>;
    onComposePickStamp?: Ev<{ id: string }>;
    onComposeAskToggle?: Ev<Record<string, never>>;
    onComposeVoiceToggle?: Ev<Record<string, never>>;
    onComposeKeyPress?: Ev<{ text: string; ask: string }>;
    onComposeCapLink?: Ev<Record<string, never>>;
    onComposeFieldFocus?: Ev<{ target: "body" | "ask"; focused: boolean }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

/** Sections as the Swift records want them: every field present (a Swift @Field record can't
    take null or undefined). */
export function nativeComposeSections(sections: readonly KComposeSection[]): KComposeSection[] {
  return sections.map((s) => ({
    title: s.title ?? "",
    items: s.items.map((i) => ({ id: i.id ?? "", name: i.name ?? "", inkHex: i.inkHex ?? "", a11yLabel: i.a11yLabel ?? "" })),
  }));
}

// the view's JS name is the Swift struct's name (ios/Adapters/KComposeView.swift)
const NativeKComposeView = requireNativeView<NativeKComposeViewProps>("KindredlyUI", "KComposeView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>; its ref takes commands. Pass
    `sections` memoised with a rev from useRev: the converted copy follows the array's identity. */
export const KComposeView = forwardRef<KScreenHandle, KComposeViewProps>(function KComposeView(
  {
    modifiers,
    letterFont,
    insets,
    rev,
    sections,
    onClose,
    onTextChange,
    onTray,
    onPickStamp,
    onAskToggle,
    onVoiceToggle,
    onKeyPress,
    onCapLink,
    onFieldFocus,
    ...rest
  },
  ref,
) {
  const sent = useMemo(() => nativeComposeSections(sections), [sections]);
  return (
    <NativeKComposeView
      ref={ref}
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      // always sent, so Swift never sees a base prop go missing
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      sections={sent}
      onComposeClose={onClose ? () => onClose() : undefined}
      onComposeTextChange={onTextChange ? (e) => onTextChange(e.nativeEvent.target, e.nativeEvent.text) : undefined}
      onComposeTray={onTray ? (e) => onTray(e.nativeEvent.which) : undefined}
      onComposePickStamp={onPickStamp ? (e) => onPickStamp(e.nativeEvent.id) : undefined}
      onComposeAskToggle={onAskToggle ? () => onAskToggle() : undefined}
      onComposeVoiceToggle={onVoiceToggle ? () => onVoiceToggle() : undefined}
      onComposeKeyPress={onKeyPress ? (e) => onKeyPress(e.nativeEvent.text, e.nativeEvent.ask) : undefined}
      onComposeCapLink={onCapLink ? () => onCapLink() : undefined}
      onComposeFieldFocus={onFieldFocus ? (e) => onFieldFocus(e.nativeEvent.target, e.nativeEvent.focused) : undefined}
    />
  );
});
