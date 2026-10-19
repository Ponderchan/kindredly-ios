import { requireNativeView } from "expo";
import { forwardRef, memo, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeFrost, type KFrost, type KImageRefProps, type KInsets, type KMark, type KMenuAction, type KScreenBaseProps, type KScreenHandle, type KSign, type KStandardCommands } from "./types";

/* THE TODAY TAB, drawn by SwiftUI (ios/Portable/Today/KTodayDesk.swift, adapter
   ios/Adapters/KTodayView.swift), for src/screens/today/TodayNative.tsx. Every word, date, count,
   rule and menu comes in from TS (src/screens/today/today-cards.ts builds the cards and her
   letter); Swift draws them and reports taps. Swift keeps only the gesture's, the keyboard's and
   the day's-end pictures' state: the card on screen (it advances before TS confirms a pass and
   reconciles by id), the drag, the field's focus, Wren's flight.

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost field in
   src/components/NativeSurface.tsx: ignoreSafeArea "container", so the keyboard's safe area stays
   and the reply strip rides it), and only after isKindredlyUIViewAvailable("KTodayView") and the
   "today" NativeSurface switch say so. Outside a Host it is a RedBox in dev and a CRASH in a
   release build. Its ref is a KScreenHandle: give it `commands.ref` from
   useKCommands<KTodayCommands>(ref, { blurOnUnmount: true, onViewAttach }) and reseed the bound
   letter's draft in onViewAttach (a remounted view starts with an empty field).

   insets.top is the status bar; insets.tabBarRoom the floating bar's room (the band sits 2 above
   it). Pass `cards` memoised with a rev from useRev — apart from the drafts, so typing never
   re-sends fifteen letters. Anything that changes often (the composer's key and hint, focus,
   playback, text seeds) goes through commands, never props. No children: Wren is drawn in Swift
   from her own pictures (`birds`, BirdSnapshots captures), so the desk has no islands. */

/** The one capsule slot at a card's foot. */
export type KTodayCapsule = {
  kind: "none" | "translate" | "signal";
  code?: string;
  label?: string;
  enabled?: boolean;
  value?: string;
  glyph?: "rings" | "clock" | "stickers";
};

/** Who wrote a desk letter, as the card's header draws it (today-cards CardWho; identity-plan §9).
    The identity switch decides it in TS: off, "No. 7273", the FACE v1 mosaic, no mark, no sign;
    on, the courier name, the frosted window, the ♀/♂ mark and the star sign. A deleted account is
    UNSIGNED behind the veil: the mosaic veil off, a flat veil tile on ("tile"). */
export type KTodayWho = {
  /** one line, never truncated: "No. 7273", "Sunday Kite", UNSIGNED */
  name: string;
  /** the she/he mark after the name (an ink glyph in sub, 6pt after it); null for none */
  mark: KMark;
  /** the star sign after the mark (4pt after it, or where it would be); null for none */
  sign: KSign;
  /** the face: the mosaic (off, drawn by the old docket beside `postmark`), the frosted window
      (on, filling the 40 square slot), the veil (off), the tile (on) */
  face: "mosaic" | "frost" | "veil" | "tile";
  /** face "mosaic": FACE v1, bit row × 5 + column */
  mask: number;
  /** face "frost": the window (src/lib/frost FrostSpec); null otherwise */
  frost: KFrost | null;
};

/** One desk letter (today-cards CardVM, without what Swift doesn't draw). */
export type KTodayCard = {
  id: string;
  who: KTodayWho;
  /** "SEP.23": the date alone, under the name */
  when: string;
  /** the identity switch off: the docket line as it always read ("SEP.23 · NO.7273"), which Swift
      draws beside the mosaic in place of the §9 header; "" with the switch on */
  postmark: string;
  stampId: string;
  stampHex: string;
  stampName: string;
  topic: string;
  topicWash: string;
  topicInk: string;
  topicLine: string;
  body: string;
  bodySize: number;
  bodyLine: number;
  bodyCenter: boolean;
  isVoice: boolean;
  voiceReady: boolean;
  caption: string;
  durationLabel: string;
  capsule: KTodayCapsule;
  menu: KMenuAction[];
  a11yLabel: string;
  /** the reply field's placeholder for this letter: "write back to No. 7273…" (switch on, "write back to Sunday Kite…") */
  replyPlaceholder: string;
};

/** TS's phase of the desk (today-cards DeskPhase). */
export type KTodayPhase = "loading" | "offline" | "reading" | "done";

/** The tab bar's + panel over Today. */
export type KTodayPlus = "closed" | "sheet" | "pop";

/** Wren on the band (useTodayDesk view.wren): what TS decides about her; Swift draws the reactions. */
export type KTodayWren = {
  /** the face she rests in: sleepy in her night hours (21:00–07:59, the reader's clock), else content (today-cards wrenRest) */
  rest: "idle" | "sleepy";
  /** moves each time a reply leaves the phone: she takes the letter, flies off with it and comes back to her spot */
  carry: number;
  /** the unfolded reader is open: she steps aside, and straightens up when it closes */
  reader: boolean;
  /** VoiceOver's name for her ("Your courier"); tapping her makes her hop */
  a11y: string;
  /** her name, VoiceOver's value */
  name: string;
};

/** Every word on the desk that isn't on a card. */
export type KTodayStrings = {
  title: string;
  /** NEXT, under the glass disc */
  next: string;
  /** REPLY, under the ink disc */
  reply: string;
  replyA11y: string;
  unfold: string;
  unfoldA11y: string;
  voiceLetter: string;
  more: string;
  /** VoiceOver's "Next letter" (the card's action) */
  nextA11y: string;
  bringBack: string;
  play: string;
  pause: string;
  send: string;
  placeholder: string;
  /** VoiceOver: the reply bar's emoji key */
  emoji: string;
  offlineTitle: string;
  offlineBody: string;
  loadingA11y: string;
};

/** Her counted note when the desk is done (today-cards WrenLetterVM). */
export type KTodayWrenLetter = {
  from: string;
  stamp: string;
  lines: string[];
  sign: string;
  bag: string;
  foot: string;
  countdown: string;
  notYet: string;
  chip: string;
  a11y: string;
};

/** The window's sky by the hour, "#RRGGBB" (today-cards WindowSky). */
export type KTodaySky = { top: string; bottom: string; pillarFill: string; pillarInk: string; text: string; stars: boolean; night: boolean };

/** The window to her game (today-cards WindowVM). */
export type KTodayWindow = { canPlay: boolean; eyebrow: string; line: string; a11yLabel: string; a11yHint: string; sky: KTodaySky };

/** Her five pictures (today-birds useTodayBirds); null for one not captured yet. */
export type KTodayBirds = {
  idle: KImageRefProps | null;
  curious: KImageRefProps | null;
  delight: KImageRefProps | null;
  sleepy: KImageRefProps | null;
  fly: KImageRefProps | null;
  flyIsPerch: boolean;
};

/** The reply strip's state for the bound letter, sent on every change. */
export type KTodayComposer = {
  letterId: string;
  sendState: "disabled" | "enabled" | "dimmed";
  hint: string;
  hintWarn: boolean;
  preview: string;
  sending: boolean;
  /** the last send press answered (its serial from onReplySend) */
  sendSerial: number;
};

/** The Today view's commands: setText, focus, blur, reset, composer, playback. */
export type KTodayCommands = Omit<KStandardCommands, "scrollTo" | "composer" | "playback"> & {
  composer: KTodayComposer;
  playback: { key: string; playing: boolean; positionS: number; durationS: number; at: number; failed: boolean };
};

export type KTodayCardAction = "unfold" | "translate" | "report" | "block" | "voice";

export type KTodayViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KTodayStrings;
    phase: KTodayPhase;
    /** letters on today's desk not yet passed (NEXT's number) */
    left: number;
    leftA11y: string;
    /** the letters not passed yet, the one on screen first */
    cards: KTodayCard[];
    titleLocked: boolean;
    freshUnfold: boolean;
    /** her first-arrival line over her head, "" for none */
    arrivalLine: string;
    wrenLetter: KTodayWrenLetter;
    window: KTodayWindow;
    birds: KTodayBirds;
    night: boolean;
    plus: KTodayPlus;
    /** NEXT and REPLY step aside: a send in flight, or the reader open */
    hideBand: boolean;
    wren: KTodayWren;
    onPass?: (letterId: string) => void;
    onBringBack?: () => void;
    onReplyOpen?: (letterId: string) => void;
    onWindow?: () => void;
    onReplyChange?: (letterId: string, text: string) => void;
    onReplySend?: (letterId: string, text: string, serial: number) => void;
    onReplyFocus?: (focused: boolean) => void;
    onCardAction?: (letterId: string, action: KTodayCardAction) => void;
    /** a stranger's photo stamp on a card, long-pressed (custom stamps): keep | report */
    onStampMenu?: (letterId: string, action: "keep" | "report") => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;

type NativeCapsule = Required<KTodayCapsule>;
/** Who, as the Swift record wants it: "" for no mark or sign, NO_FROST for no window (a @Field can't take null). */
type NativeWho = { name: string; mark: string; sign: string; face: KTodayWho["face"]; mask: number; frost: KFrost };
type NativeCard = Omit<KTodayCard, "who" | "capsule" | "menu"> & {
  who: NativeWho;
  capsule: NativeCapsule;
  menu: { key: string; title: string; icon: string; destructive: boolean }[];
};
type NativeImageRef = Required<KImageRefProps>;
type NativeBirds = { idle: NativeImageRef; curious: NativeImageRef; delight: NativeImageRef; sleepy: NativeImageRef; fly: NativeImageRef; flyIsPerch: boolean };

type Handlers = "onPass" | "onBringBack" | "onReplyOpen" | "onWindow" | "onReplyChange" | "onReplySend" | "onReplyFocus" | "onCardAction" | "onStampMenu";

type NativeKTodayViewProps = Omit<KTodayViewProps, "letterFont" | "insets" | "rev" | "cards" | "birds" | Handlers> &
  Required<Pick<KTodayViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    cards: NativeCard[];
    birds: NativeBirds;
    onTodayPass?: Ev<{ letterId: string }>;
    onTodayBringBack?: Ev<Record<string, never>>;
    onTodayReplyOpen?: Ev<{ letterId: string }>;
    onTodayWindow?: Ev<Record<string, never>>;
    onTodayReplyChange?: Ev<{ letterId: string; text: string }>;
    onTodayReplySend?: Ev<{ letterId: string; text: string; serial: number }>;
    onTodayReplyFocus?: Ev<{ focused: boolean }>;
    onTodayCardAction?: Ev<{ letterId: string; action: KTodayCardAction }>;
    onTodayStampMenu?: Ev<{ letterId: string; action: "keep" | "report" }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

/** Cards as the Swift records want them: every field present (a @Field record can't take null). */
export function nativeTodayCards(cards: readonly KTodayCard[]): NativeCard[] {
  return cards.map((c) => ({
    ...c,
    who: {
      name: c.who.name,
      mark: c.who.mark ?? "",
      sign: c.who.sign ?? "",
      face: c.who.face,
      mask: c.who.mask,
      frost: nativeFrost(c.who.face === "frost" ? c.who.frost : null),
    },
    capsule: {
      kind: c.capsule.kind,
      code: c.capsule.code ?? "",
      label: c.capsule.label ?? "",
      enabled: c.capsule.enabled ?? true,
      value: c.capsule.value ?? "",
      glyph: c.capsule.glyph ?? "rings",
    },
    menu: c.menu.map((m) => ({ key: m.key, title: m.title, icon: m.icon, destructive: m.destructive ?? false })),
  }));
}

/** A picture as the Swift record wants it: none is an empty uri, never null. */
const nativeRef = (r: KImageRefProps | null): NativeImageRef => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : { uri: "", key: "", kind: "image" });

/** Her five pictures as the Swift record wants them. */
export function nativeTodayBirds(b: KTodayBirds): NativeBirds {
  return { idle: nativeRef(b.idle), curious: nativeRef(b.curious), delight: nativeRef(b.delight), sleepy: nativeRef(b.sleepy), fly: nativeRef(b.fly), flyIsPerch: b.flyIsPerch };
}

// the view's JS name is the Swift struct's name (ios/Adapters/KTodayView.swift)
const NativeKTodayView = requireNativeView<NativeKTodayViewProps>("KindredlyUI", "KTodayView");

/** The bare SwiftUI screen. Only inside an @expo/ui <Host>; its ref takes commands. Memoised: a
    render of the screen that changes none of its props (a keystroke) doesn't reach the native
    view, whose every props update re-converts the whole map. */
export const KTodayView = memo(
  forwardRef<KScreenHandle, KTodayViewProps>(function KTodayView(
    { modifiers, letterFont, insets, rev, cards, birds, onPass, onBringBack, onReplyOpen, onWindow, onReplyChange, onReplySend, onReplyFocus, onCardAction, onStampMenu, ...rest },
    ref,
  ) {
    const sent = useMemo(() => nativeTodayCards(cards), [cards]);
    const pictures = useMemo(() => nativeTodayBirds(birds), [birds]);
    return (
      <NativeKTodayView
        ref={ref}
        modifiers={modifiers}
        // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
        {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
        {...rest}
        // always sent, so Swift never sees a base prop go missing
        letterFont={letterFont ?? "newsreader"}
        insets={insets ?? NO_INSETS}
        rev={rev ?? 0}
        cards={sent}
        birds={pictures}
        onTodayPass={onPass ? (e) => onPass(e.nativeEvent.letterId) : undefined}
        onTodayBringBack={onBringBack ? () => onBringBack() : undefined}
        onTodayReplyOpen={onReplyOpen ? (e) => onReplyOpen(e.nativeEvent.letterId) : undefined}
        onTodayWindow={onWindow ? () => onWindow() : undefined}
        onTodayReplyChange={onReplyChange ? (e) => onReplyChange(e.nativeEvent.letterId, e.nativeEvent.text) : undefined}
        onTodayReplySend={onReplySend ? (e) => onReplySend(e.nativeEvent.letterId, e.nativeEvent.text, e.nativeEvent.serial) : undefined}
        onTodayReplyFocus={onReplyFocus ? (e) => onReplyFocus(e.nativeEvent.focused) : undefined}
        onTodayCardAction={onCardAction ? (e) => onCardAction(e.nativeEvent.letterId, e.nativeEvent.action) : undefined}
        onTodayStampMenu={onStampMenu ? (e) => onStampMenu(e.nativeEvent.letterId, e.nativeEvent.action) : undefined}
      />
    );
  }),
);
