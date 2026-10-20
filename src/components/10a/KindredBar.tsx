import { forwardRef, useEffect } from "react";
import { Pressable, View, Text, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { GlyphInput } from "../GlyphInput";
import { useLetterFamily, useTheme } from "../../lib/theme";
import { BRAND } from "../../theme/themes";
import { PFM } from "../../theme/post";
import { LineIcon } from "./LineIcon";
import { EmojiKey } from "./ReplyBar";
import { FIELD_FONT_CAP, useComposerField, type ComposerFieldHandle } from "./useComposerField";
import { KINDRED_BAR, KINDRED_BAR_MAX, KINDRED_BAR_PAD, capsuleFill, openKeyFill } from "./kit";

/* THE KINDREDS BAR (chat composers, Prompt 3, as the owner reworked it on
   the evening of 2026-10-18 after a chat app's recording; KKindredBar's
   React Native twin): a room's composer, once names are traded (RoomRN).
   Before names the pen-pal chat writes in the reply bar (ReplyBar), which
   only sends words; here there is more to leave, so the bar has a key on
   the left and two on the right.

      ✦    ( leave something here…          )    ☺    +     one row 48 tall; line
     44                40 tall                   44   44    icons 26 with no ring on
                                                            44 targets; no send key
   · SEND IS THE KEYBOARD'S: a room always sent on Return, so the send disc
     left the capsule. The return key says "send" and stays dim while the
     field is empty (enablesReturnKeyAutomatically); words that can't go yet
     go to the model, which refuses them and says why in the status line.
     The Today and pen-pal reply bars keep their paper plane.
   · THE IDEAS KEY (left): the I1 sparkle at 26 in ink. It opens the ideas
     bubble above the bar (IdeasBubble, below). VoiceOver: a button,
     selected while the bubble is up, whose escape closes it.
   · THE CAPSULE: 40 tall at one line, corners of 20, on soft (Midnight:
     soft2, kit capsuleFill), padding 0 14, 4 from the keys, nothing in it
     but the field (the Letter font at 16, the placeholder "leave something here…" in
     mute; one line growing to five, then it scrolls inside; uncontrolled,
     useComposerField). A tap on its own ground gives the field the keyboard.
   · THE EMOJI KEY (beside the +: the owner moved it out of the field): it
     gives the field the keyboard — React Native can't ask for the emoji
     keyboard the Swift key switches to (see ReplyBar).
   · THE + KEY: the plus 18 long at 2. Open, it turns 45° into an × on a
     springy .35s cubic-bezier(.3,1.3,.4,1) (a plain .2s ease under Reduce
     Motion), and opens the + tray (LeaveATrace's PlayTray).
   · ONE "ON" FOR THE KEYS: a lav disc (38) behind the icon while its panel
     is up; the icons stay in ink, which reads on lav on every theme.
   · THE ICONS SIT ON THE GUTTER: the screen pulls the bar 4 past its 12, so
     a target starts 8 from the edge and its icon 17 (RoomRN).
   · THE THREE PANELS SHUT EACH OTHER (the bubble, the keyboard, the tray):
     the screen decides (RoomRN), this bar only reports the presses and the
     field's focus.
   · The keys stay on the bottom line, centred on the capsule's resting row,
     as the field grows. VoiceOver's escape on a key closes what it opened. */

export type KindredBarHandle = ComposerFieldHandle;

export type KindredBarProps = {
  placeholder: string;
  autocapitalize: boolean;
  /** exactly what was typed (the keyboard's send); return false to keep it in the field */
  onSend: (value: string) => boolean | void;
  onChangeText?: (value: string) => void;
  /** the text the field starts with (read once, at mount) */
  initialText?: string;
  emojiLabel: string;
  ideasLabel: string;
  plusLabel: string;
  plusCloseLabel: string;
  ideasOpen: boolean;
  trayOpen: boolean;
  onIdeas: () => void;
  onPlus: () => void;
  onCloseIdeas: () => void;
  onCloseTray: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  inputProps?: Omit<TextInputProps, "value" | "defaultValue" | "onChangeText" | "onScroll" | "onContentSizeChange" | "placeholder" | "multiline" | "onSubmitEditing" | "submitBehavior" | "returnKeyType" | "style" | "onFocus" | "onBlur" | "autoCapitalize">;
  style?: StyleProp<ViewStyle>;
};

/** the + turning: .35s cubic-bezier(.3,1.3,.4,1), a springy overshoot (KChatMotion.plusTurn) */
const PLUS_TURN = { duration: 350, easing: Easing.bezier(0.3, 1.3, 0.4, 1) };
const REDUCED = { duration: 200, easing: Easing.inOut(Easing.ease) };
const DISC = { duration: 200, easing: Easing.out(Easing.ease) };

export const KindredBar = forwardRef<KindredBarHandle, KindredBarProps>(function KindredBar(
  {
    placeholder,
    autocapitalize,
    onSend,
    onChangeText,
    initialText,
    emojiLabel,
    ideasLabel,
    plusLabel,
    plusCloseLabel,
    ideasOpen,
    trayOpen,
    onIdeas,
    onPlus,
    onCloseIdeas,
    onCloseTray,
    onFocus,
    onBlur,
    inputProps,
    style,
  },
  ref,
) {
  const { t: tk } = useTheme();
  const reduce = useReducedMotion();
  // what someone writes is content: the reader's Letter font (KKindredBar: content: true)
  const face = useLetterFamily();
  const f = useComposerField(ref, initialText, onChangeText);
  const { target, icon, disc, capsule: capsuleRest, capsulePad, gap, rowHeight, fontSize, lineHeight } = KINDRED_BAR;
  /* the capsule's one-line height follows the field's line at the reader's text size (40 at the
     default; useComposerField DYNAMIC TYPE), so the placeholder is never cut */
  const capsule = Math.max(capsuleRest, f.restingLine(lineHeight, KINDRED_BAR_PAD));

  /* the keyboard's send: the words as typed. Every caller's model empties the field itself (before
     its first await) and leaves the words alone when it refuses, so the bar never clears on its own
     unless the caller says so by returning nothing */
  const send = () => {
    if (!f.hasWords) return;
    const kept = onSend(f.text.current) === false;
    if (!kept) f.clear();
  };

  /* the lav discs fade on a .2s ease; the + turns on its springy curve */
  const ideasP = useSharedValue(ideasOpen ? 1 : 0);
  const plusP = useSharedValue(trayOpen ? 1 : 0);
  const plusDisc = useSharedValue(trayOpen ? 1 : 0);
  useEffect(() => {
    ideasP.value = withTiming(ideasOpen ? 1 : 0, reduce ? REDUCED : DISC);
  }, [ideasOpen, reduce, ideasP]);
  useEffect(() => {
    plusP.value = withTiming(trayOpen ? 1 : 0, reduce ? REDUCED : PLUS_TURN);
    plusDisc.value = withTiming(trayOpen ? 1 : 0, reduce ? REDUCED : DISC);
  }, [trayOpen, reduce, plusP, plusDisc]);
  const ideasDisc = useAnimatedStyle(() => ({ opacity: ideasP.value }));
  const plusDiscStyle = useAnimatedStyle(() => ({ opacity: plusDisc.value }));
  const plusTurn = useAnimatedStyle(() => ({ transform: [{ rotate: `${plusP.value * 45}deg` }] }));

  const keyBox = { width: target, height: target, alignItems: "center" as const, justifyContent: "center" as const };
  const lavDisc = { position: "absolute" as const, width: disc, height: disc, borderRadius: disc / 2, backgroundColor: tk.lav };
  // a key's place on the bottom line: centred on the capsule's one-line row as the field grows
  const onRestingRow = { marginBottom: (capsule - target) / 2 };

  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end", paddingVertical: (rowHeight - capsuleRest) / 2 }, style]}>
      {/* the ideas key */}
      <Pressable
        onPress={onIdeas}
        onAccessibilityEscape={ideasOpen ? onCloseIdeas : undefined}
        accessibilityRole="button"
        accessibilityLabel={ideasLabel}
        accessibilityState={{ selected: ideasOpen }}
        style={({ pressed }) => [keyBox, onRestingRow, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
      >
        <Animated.View style={[lavDisc, ideasDisc]} />
        <LineIcon name="sparkle" size={icon} color={tk.ink} />
      </Pressable>

      {/* the capsule: only the field; its own ground takes a tap to the field */}
      <Pressable
        onPress={() => f.input.current?.focus()}
        accessible={false}
        style={{ flex: 1, minHeight: capsule, marginHorizontal: gap, borderRadius: capsuleRest / 2, backgroundColor: capsuleFill(tk), paddingHorizontal: capsulePad }}
      >
        <GlyphInput
          key={f.seed.n}
          ref={f.input}
          {...inputProps}
          defaultValue={f.seed.text}
          onChangeText={f.note}
          onScroll={f.onScroll}
          onContentSizeChange={f.onContentSizeChange}
          placeholder={placeholder}
          placeholderTextColor={tk.mute}
          multiline
          returnKeyType="send"
          enablesReturnKeyAutomatically
          submitBehavior="submit"
          onSubmitEditing={send}
          autoCapitalize={autocapitalize ? "sentences" : "none"}
          autoFocus={f.seed.n > 0 ? f.seed.focus : undefined}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardAppearance={tk.dark ? "dark" : "light"}
          maxFontSizeMultiplier={FIELD_FONT_CAP}
          style={{
            ...f.box(lineHeight, KINDRED_BAR_MAX, KINDRED_BAR_PAD),
            paddingTop: KINDRED_BAR_PAD,
            paddingBottom: KINDRED_BAR_PAD,
            paddingHorizontal: 0,
            ...face,
            fontSize,
            lineHeight,
            color: tk.ink,
          }}
        />
      </Pressable>

      {/* the emoji key, beside the + */}
      <View style={onRestingRow}>
        <EmojiKey label={emojiLabel} onPress={() => f.input.current?.focus()} side={target} circle iconSize={icon} ground={disc} />
      </View>

      {/* the + key */}
      <Pressable
        onPress={onPlus}
        onAccessibilityEscape={trayOpen ? onCloseTray : undefined}
        accessibilityRole="button"
        accessibilityLabel={trayOpen ? plusCloseLabel : plusLabel}
        style={({ pressed }) => [keyBox, onRestingRow, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
      >
        <Animated.View style={[lavDisc, plusDiscStyle]} />
        {/* 18 long at 2 (LineIcon's plus is 16 of its 22 box) */}
        <Animated.View style={plusTurn}>
          <LineIcon name="plus" size={(18 * 22) / 16} stroke={(2 * 16) / 18} color={tk.ink} />
        </Animated.View>
      </Pressable>
    </View>
  );
});

/** kpopin (Prompts 4 and 6; KChatPopIn): up 10, from .96, from clear, on CSS's default ease — the
    bubble takes .3s, the tray's cards .35s. A Reanimated entering animation; under Reduce Motion
    pass a fade instead. */
const POP_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
export function popIn(ms: number) {
  return () => {
    "worklet";
    const cfg = { duration: ms, easing: POP_EASE };
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 10 }, { scale: 0.96 }] },
      animations: { opacity: withTiming(1, cfg), transform: [{ translateY: withTiming(0, cfg) }, { scale: withTiming(1, cfg) }] },
    };
  };
}
const BUBBLE_IN = popIn(300);

/* THE IDEAS BUBBLE (chat composers, Prompt 4; KIdeasBubble's twin): 8 above
   the Kindreds bar, 16 from either edge, one sentence to start from. Only
   the reader sees it; nothing is sent until they send it themselves.

     ┌──────────────────────────────────────────┐   ink (Midnight: lav), corners 18 18 18 4,
     │ AN IDEA                                  │   the small corner at the bottom left, toward
     │ Something I've never said out loud.      │   the ideas key; padding 12 14 12 16, 8 apart
     │ ↻ ANOTHER   USE IT →                     │
     └──────────────────────────────────────────┘

   · AN IDEA in mono 500 10 at .14em, white at 60%;
   · the sentence in the reader's Letter font 19 on 1.3, white (Wren's
     words are content, as every line she says is: owner, 2026-10-20);
   · two text keys in System 600 13 (buttons), 14 apart: ↻ ANOTHER (white at
     70%) shows the next sentence, USE IT → (lime) puts this one in the
     field and gives it the keyboard. Each has a 44 tall target that
     doesn't push the bubble taller; VoiceOver reads them in lower case.
   The words come in from the dock (build-items: AN IDEA / ANOTHER / USE
   IT) and the sentence from useRoomModel's ideas; the ↻ and the → are drawn
   here. It pops in on kpopin, fades under Reduce Motion, and a new sentence
   fades in where the old one was. VoiceOver's escape on it closes it. */
export function IdeasBubble({
  label,
  idea,
  another,
  use,
  onAnother,
  onUse,
  onClose,
  style,
}: {
  label: string;
  idea: string;
  another: string;
  use: string;
  onAnother: () => void;
  onUse: () => void;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t: tk } = useTheme();
  const reduce = useReducedMotion();
  // Wren's words are content: the reader's Letter font (KKindredBar, owner 2026-10-20)
  const face = useLetterFamily();
  const white = "#FFFFFF";
  return (
    <Animated.View
      entering={reduce ? FadeIn.duration(200) : BUBBLE_IN}
      exiting={FadeOut.duration(200)}
      onAccessibilityEscape={onClose}
      style={[
        {
          backgroundColor: openKeyFill(tk),
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          borderBottomRightRadius: 18,
          borderBottomLeftRadius: 4,
          paddingTop: 12,
          paddingRight: 14,
          paddingBottom: 12,
          paddingLeft: 16,
          gap: 8,
        },
        style,
      ]}
    >
      <Text maxFontSizeMultiplier={2} style={{ ...PFM.monoMed, fontSize: 10, letterSpacing: 1.4, color: white, opacity: 0.6 }}>
        {label}
      </Text>
      {/* a new sentence fades in where the old one was (never both stacked) */}
      <Animated.Text key={idea} entering={FadeIn.duration(200)} maxFontSizeMultiplier={2} style={{ ...face, fontSize: 19, lineHeight: 24.7, color: white }}>
        {idea}
      </Animated.Text>
      <View style={{ flexDirection: "row", gap: 14 }}>
        <TextKey title={`↻ ${another}`} a11y={another} color={white} dim onPress={onAnother} />
        <TextKey title={`${use} →`} a11y={use} color={BRAND.lime} onPress={onUse} />
      </View>
    </Animated.View>
  );
}

/** A text key (System: a button) with a 44 tall target that doesn't change the bubble's height. */
function TextKey({ title, a11y, color, dim = false, onPress }: { title: string; a11y: string; color: string; dim?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // read in lower case: VoiceOver can spell out a short word in capitals ("IT")
      accessibilityLabel={a11y.toLocaleLowerCase()}
      style={({ pressed }) => ({ paddingVertical: 15, marginVertical: -15, opacity: pressed ? 0.6 : 1 })}
    >
      <Text maxFontSizeMultiplier={2} style={{ fontSize: 13, fontWeight: "600", color, opacity: dim ? 0.7 : 1 }}>
        {title}
      </Text>
    </Pressable>
  );
}
