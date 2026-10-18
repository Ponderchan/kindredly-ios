import { forwardRef, useEffect } from "react";
import { Pressable, Text, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import Animated, { Easing, Extrapolation, FadeIn, FadeOut, interpolate, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { GlyphInput } from "../GlyphInput";
import { useTheme } from "../../lib/theme";
import { BRAND } from "../../theme/themes";
import { PF } from "../../theme/post";
import { LineIcon } from "./LineIcon";
import { EmojiKey, SendDisc } from "./ReplyBar";
import { useComposerField, type ComposerFieldHandle } from "./useComposerField";
import { KINDRED_BAR, KINDRED_BAR_MAX, KINDRED_BAR_PAD, capsuleFill, openKeyFill } from "./kit";

/* THE KINDREDS BAR (chat composers, Prompt 3; the owner's final, 2026-10-18;
   KKindredBar's React Native twin): a room's composer, once names are
   traded (RoomRN). Before names the pen-pal chat writes in the reply bar
   (ReplyBar), which only sends words; here there is more to leave, so the
   bar has a key either side.

     ( ✦ )  ( leave something here…     ☺  (✈) )  ( + )    one row 56 tall, 16 from
      52                52 tall                     52      either edge, 10 apart;
                                                            no voice anywhere
   · THE IDEAS KEY (left): a 52 circle, a 2 ln outline on sf, the I1
     sparkle 24 in ink. Open, its ground fills with ink and the sparkle
     turns lime (#D8F04A), on a .2s ease; it opens the ideas bubble above
     the bar (IdeasBubble, below). VoiceOver: a button, selected while the
     bubble is up, whose escape closes it.
   · THE CAPSULE: 52 tall at one line, corners of 26, on soft (Midnight:
     soft2, kit capsuleFill), padding 0 6 0 16. In it the field (system 16,
     the placeholder "leave something here…" in mute; one line growing to
     five, then it scrolls inside, as the room's field did; uncontrolled,
     useComposerField), the emoji key (EmojiKey, a 40 circle: it gives the
     field the keyboard — React Native can't ask for the emoji keyboard the
     Swift key switches to, see ReplyBar) and, only while there are words,
     the send disc (SendDisc: a 40 circle in ind with the white plane 16;
     the off ground while the words can't go yet). A tap on the capsule's
     own ground gives the field the keyboard.
   · THE + KEY (right): a 52 circle, a 2 ln outline on sf, the plus 16 long
     at 2.4. Open, it turns 45° into an ×, its ground fills with ink and the
     plus turns white, on a springy .35s cubic-bezier(.3,1.3,.4,1) (a plain
     .2s ease under Reduce Motion). It opens the + tray (LeaveATrace's
     PlayTray).
   · MIDNIGHT'S INK IS PALE, so the two open keys and the bubble take the
     theme's lav there instead (kit openKeyFill), which keeps the lime and
     the white legible.
   · THE THREE PANELS SHUT EACH OTHER (the bubble, the keyboard, the tray):
     the screen decides (RoomRN), this bar only reports the presses and the
     field's focus.
   · The keys stay on the bottom line, centred on the resting row, as the
     field grows. VoiceOver's escape on a key closes what it opened. */

export type KindredBarHandle = ComposerFieldHandle;

export type KindredBarProps = {
  placeholder: string;
  autocapitalize: boolean;
  /** the words as typed may go (the send disc's ground) */
  canSend: boolean;
  /** exactly what was typed (Return and the disc); return false to keep it in the field */
  onSend: (value: string) => boolean | void;
  onChangeText?: (value: string) => void;
  /** the text the field starts with (read once, at mount) */
  initialText?: string;
  sendLabel: string;
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
const KEY_FILL = { duration: 200, easing: Easing.out(Easing.ease) };

export const KindredBar = forwardRef<KindredBarHandle, KindredBarProps>(function KindredBar(
  {
    placeholder,
    autocapitalize,
    canSend,
    onSend,
    onChangeText,
    initialText,
    sendLabel,
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
  const f = useComposerField(ref, initialText, onChangeText);
  const { key, capsuleKey, gap, rowHeight, padLeft, padRight, fontSize, lineHeight } = KINDRED_BAR;

  /* Return and the disc: the words as typed. Every caller's model empties the field itself (before
     its first await) and leaves the words alone when it refuses, so the bar never clears on its own
     unless the caller says so by returning nothing */
  const send = () => {
    if (!f.hasWords || !canSend) return;
    const kept = onSend(f.text.current) === false;
    if (!kept) f.clear();
  };

  /* the keys' grounds: the ideas key on a plain .2s ease, the + with its turn */
  const ideasP = useSharedValue(ideasOpen ? 1 : 0);
  const plusP = useSharedValue(trayOpen ? 1 : 0);
  useEffect(() => {
    ideasP.value = withTiming(ideasOpen ? 1 : 0, reduce ? REDUCED : KEY_FILL);
  }, [ideasOpen, reduce, ideasP]);
  useEffect(() => {
    plusP.value = withTiming(trayOpen ? 1 : 0, reduce ? REDUCED : PLUS_TURN);
  }, [trayOpen, reduce, plusP]);
  const open = openKeyFill(tk);
  const ideasStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(ideasP.value, [0, 1], [tk.sf, open]) }));
  const plusStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(interpolate(plusP.value, [0, 1], [0, 1], Extrapolation.CLAMP), [0, 1], [tk.sf, open]),
  }));
  const plusTurn = useAnimatedStyle(() => ({ transform: [{ rotate: `${plusP.value * 45}deg` }] }));

  const round = { width: key, height: key, borderRadius: key / 2, borderWidth: 2, borderColor: tk.ln, alignItems: "center" as const, justifyContent: "center" as const };
  const rest = { height: key, justifyContent: "center" as const };

  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end", gap, paddingVertical: (rowHeight - key) / 2 }, style]}>
      {/* the ideas key */}
      <Pressable
        onPress={onIdeas}
        onAccessibilityEscape={ideasOpen ? onCloseIdeas : undefined}
        accessibilityRole="button"
        accessibilityLabel={ideasLabel}
        accessibilityState={{ selected: ideasOpen }}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
      >
        <Animated.View style={[round, ideasStyle]}>
          <LineIcon name="sparkle" size={24} color={ideasOpen ? BRAND.lime : tk.ink} />
        </Animated.View>
      </Pressable>

      {/* the capsule: its own ground takes a tap to the field */}
      <Pressable
        onPress={() => f.input.current?.focus()}
        accessible={false}
        style={{ flex: 1, minHeight: key, borderRadius: key / 2, backgroundColor: capsuleFill(tk), paddingLeft: padLeft, paddingRight: padRight, flexDirection: "row", alignItems: "flex-end", gap: 6 }}
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
          submitBehavior="submit"
          onSubmitEditing={send}
          autoCapitalize={autocapitalize ? "sentences" : "none"}
          autoFocus={f.seed.n > 0 ? f.seed.focus : undefined}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardAppearance={tk.dark ? "dark" : "light"}
          style={{
            flex: 1,
            ...f.box(lineHeight, KINDRED_BAR_MAX, KINDRED_BAR_PAD),
            paddingTop: KINDRED_BAR_PAD,
            paddingBottom: KINDRED_BAR_PAD,
            paddingHorizontal: 0,
            fontSize,
            lineHeight,
            color: tk.ink,
          }}
        />
        <View style={rest}>
          <EmojiKey label={emojiLabel} onPress={() => f.input.current?.focus()} side={capsuleKey} circle />
        </View>
        {f.hasWords && (
          <Animated.View style={rest} entering={reduce ? FadeIn.duration(200) : discIn} exiting={FadeOut.duration(150)}>
            <SendDisc state={canSend ? "enabled" : "disabled"} label={sendLabel} onPress={send} diameter={capsuleKey} fill={tk.ind} />
          </Animated.View>
        )}
      </Pressable>

      {/* the + key */}
      <Pressable
        onPress={onPlus}
        onAccessibilityEscape={trayOpen ? onCloseTray : undefined}
        accessibilityRole="button"
        accessibilityLabel={trayOpen ? plusCloseLabel : plusLabel}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
      >
        <Animated.View style={[round, plusStyle]}>
          <Animated.View style={plusTurn}>
            <LineIcon name="plus" size={22} stroke={2.4} color={trayOpen ? "#FFFFFF" : tk.ink} />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
});

/** the send disc coming in: from .6 and clear, .2s */
const DISC_EASE = Easing.out(Easing.ease);
function discIn() {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.6 }] },
    animations: { opacity: withTiming(1, { duration: 200, easing: DISC_EASE }), transform: [{ scale: withTiming(1, { duration: 200, easing: DISC_EASE }) }] },
  };
}

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
   · the sentence in Newsreader 19 on 1.3, white (every serif that isn't
     someone's letter being read is Newsreader; the Letter font is for
     letters only);
   · two text keys in mono 600 10 at .12em, 14 apart: ↻ ANOTHER (white at
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
      <Text maxFontSizeMultiplier={2} style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: white, opacity: 0.6 }}>
        {label}
      </Text>
      {/* a new sentence fades in where the old one was (never both stacked) */}
      <Animated.Text key={idea} entering={FadeIn.duration(200)} maxFontSizeMultiplier={2} style={{ fontFamily: PF.letterSerif, fontSize: 19, lineHeight: 24.7, color: white }}>
        {idea}
      </Animated.Text>
      <View style={{ flexDirection: "row", gap: 14 }}>
        <TextKey title={`↻ ${another}`} a11y={another} color={white} dim onPress={onAnother} />
        <TextKey title={`${use} →`} a11y={use} color={BRAND.lime} onPress={onUse} />
      </View>
    </Animated.View>
  );
}

/** A mono text key with a 44 tall target that doesn't change the bubble's height. */
function TextKey({ title, a11y, color, dim = false, onPress }: { title: string; a11y: string; color: string; dim?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // read in lower case: VoiceOver can spell out a short word in capitals ("IT")
      accessibilityLabel={a11y.toLocaleLowerCase()}
      style={({ pressed }) => ({ paddingVertical: 15, marginVertical: -15, opacity: pressed ? 0.6 : 1 })}
    >
      <Text maxFontSizeMultiplier={2} style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color, opacity: dim ? 0.7 : 1 }}>
        {title}
      </Text>
    </Pressable>
  );
}
