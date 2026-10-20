import { forwardRef } from "react";
import { Pressable, Text, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { GlyphInput } from "../GlyphInput";
import { useLetterFamily, useTheme } from "../../lib/theme";
import { BRAND } from "../../theme/themes";
import { PFM } from "../../theme/post";
import { LineIcon } from "./LineIcon";
import { StickerBox } from "./StickerBox";
import { FIELD_FONT_CAP, useComposerField, type ComposerFieldHandle } from "./useComposerField";
import { REPLY_BAR, REPLY_BAR_MAX, REPLY_BAR_PAD, sendClearsField, sendDiscLook, sendKeyState, sendTakesPress, type SendState } from "./kit";

/* THE REPLY BAR (chat composers, Prompt 1; the owner's final, 2026-10-18;
   KReplyBar's React Native twin). One object in two places, the Today reply
   (TodayRN) and the pen-pal chat before names are traded (LettersRN). What
   leaves it is a letter: words and emoji, nothing else. No Wren tool, no +,
   no voice.

        LETTER 4 OF 5                                  the hint: mono 500 10 at .14em in sub
     ┌─────────────────────────────────────────┐      (the postmark red when it warns), 6 in
     │ ↩  write back…                 ☺   (✈)  │      and 6 above the bar; the screen says
     └─────────────────────────────────────────┘      when it shows (showsHint)

   · THE BAR: 54 tall at one line, corners of 16, sf, a 2 ln outline and a
     hard 2/2 ln shadow (StickerBox: it hangs outside, right and below, so
     whoever places it leaves that room); padding 0 8 0 14 inside the
     outline, its four parts 6 apart.
   · THE REPLY ARROW (I1 replyArrow) 20 across in ink: it only says "this is
     where you write back". Decorative.
   · THE FIELD: system 16 in ink, the placeholder in mute, the caret ind
     (GlyphInput); one line growing to four (about 110 tall), then it
     scrolls inside. Uncontrolled (useComposerField: CJK marked text is
     never overwritten from React; setText is the only way words go in).
   · THE EMOJI KEY (EmojiKey): a 36 square with corners of 10, the I1 face
     22 in ink. The Swift bar switches its field to the system emoji
     keyboard and back; React Native has no way to ask for that keyboard
     (there is no emoji keyboardType, and the text view's input mode isn't
     reachable from JS), so here the key gives the field the keyboard, and
     the keyboard's own globe reaches the emoji. Its ground is lav while
     pressed (the prototype's "pressed / open").
   · THE SEND DISC (SendDisc): a 36 circle, ink with the I1 plane 16 in
     white when it can send; #C9C6D6 and not pressable when it can't; drawn
     off but still pressed while dimmed (Today's full pouch, where the
     caller says why). kit.ts sendDiscLook has the colours, Midnight's too.
   · The arrow, the emoji key and the send disc stay centred on the resting
     row, on the bottom line, as the field grows.

   SENDING, as the 10a strip always did: the disc and, with returnSends,
   the keyboard's Return both send (Today: Return is a new line, a reply is
   a letter and letters keep their paragraphs). A send that goes clears the
   field itself unless onSend returns false (every screen here does: their
   models empty the field themselves, before their first await). */

export type ReplyBarHandle = ComposerFieldHandle;

export type ReplyBarProps = {
  /** already translated ("write back…") */
  placeholder: string;
  /** the line over the bar, as it is drawn (already in capitals); "" for none */
  hint?: string;
  /** the hint in the postmark red (over the limit) */
  hintWarn?: boolean;
  /** the hint shows now (the screen's rule: while the keyboard is up) */
  showsHint?: boolean;
  /** the caller's whole rule for the words as typed */
  canSend: boolean;
  /** the words are ready but something outside them holds the letter (a full pouch): the disc
      looks off and its tap reaches onSend */
  held?: boolean;
  /** exactly what was typed; return false to keep it in the field */
  onSend: (value: string) => boolean | void;
  /** every edit, and every setText/clear, with the field's whole text */
  onChangeText?: (value: string) => void;
  /** the keyboard's Return sends (default true); false for a letter, where Return is a new line */
  returnSends?: boolean;
  /** the text the field starts with (read once, at mount) */
  initialText?: string;
  /** SEND, what VoiceOver calls the send disc */
  sendLabel: string;
  /** what VoiceOver calls the emoji key */
  emojiLabel: string;
  editable?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  /** anything else the TextInput should get (autoCapitalize, autoCorrect, testID…) */
  inputProps?: Omit<TextInputProps, "value" | "defaultValue" | "onChangeText" | "onScroll" | "onContentSizeChange" | "placeholder" | "multiline" | "onSubmitEditing" | "submitBehavior" | "returnKeyType" | "style" | "editable" | "autoFocus" | "onFocus" | "onBlur">;
  /** the outer column: margins */
  style?: StyleProp<ViewStyle>;
};

export const ReplyBar = forwardRef<ReplyBarHandle, ReplyBarProps>(function ReplyBar(
  {
    placeholder,
    hint = "",
    hintWarn = false,
    showsHint = false,
    canSend,
    held = false,
    onSend,
    onChangeText,
    returnSends = true,
    initialText,
    sendLabel,
    emojiLabel,
    editable,
    autoFocus,
    onFocus,
    onBlur,
    inputProps,
    style,
  },
  ref,
) {
  const { t: tk } = useTheme();
  // what is typed here is a reply, so it is in the reader's Letter font (KReplyBar: content: true)
  const face = useLetterFamily();
  const f = useComposerField(ref, initialText, onChangeText);

  const state = sendKeyState({ hasWords: f.hasWords, canSend, held });
  const send = () => {
    if (!sendTakesPress(state)) return;
    const kept = onSend(f.text.current) === false;
    if (sendClearsField(state) && !kept) f.clear();
  };

  const { minHeight, border, radius, shadow, padLeft, padRight, gap, fontSize, lineHeight } = REPLY_BAR;
  /* the resting row follows the field's one line at the reader's text size (54 at the default;
     useComposerField DYNAMIC TYPE), so the placeholder is never cut */
  const inner = Math.max(minHeight - 2 * border, f.restingLine(lineHeight, REPLY_BAR_PAD));
  const rowHeight = inner + 2 * border;
  // the arrow and the two keys: centred on the resting row, kept on the bottom line as it grows
  const rest = { height: inner, justifyContent: "center" as const };

  return (
    <View style={[{ gap: REPLY_BAR.hintGap }, style]}>
      {showsHint && !!hint && (
        <Text numberOfLines={2} maxFontSizeMultiplier={2} style={{ ...PFM.monoMed, fontSize: 10, letterSpacing: 1.4, color: hintWarn ? BRAND.postRed : tk.sub, paddingLeft: 6 }}>
          {hint}
        </Text>
      )}
      <StickerBox
        fill={tk.sf}
        stroke={tk.ln}
        lineWidth={border}
        radius={radius}
        shadow={tk.ln}
        offset={shadow}
        faceStyle={{ flexDirection: "row", alignItems: "flex-end", minHeight: rowHeight, paddingLeft: padLeft, paddingRight: padRight, gap }}
      >
        <View style={rest} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <LineIcon name="replyArrow" size={REPLY_BAR.arrow} color={tk.ink} />
        </View>
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
          returnKeyType={returnSends ? "send" : "default"}
          submitBehavior={returnSends ? "submit" : "newline"}
          onSubmitEditing={returnSends ? send : undefined}
          editable={editable}
          autoFocus={f.seed.n > 0 ? f.seed.focus : autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardAppearance={tk.dark ? "dark" : "light"}
          maxFontSizeMultiplier={FIELD_FONT_CAP}
          style={{
            flex: 1,
            ...f.box(lineHeight, REPLY_BAR_MAX, REPLY_BAR_PAD),
            paddingTop: REPLY_BAR_PAD,
            paddingBottom: REPLY_BAR_PAD,
            paddingHorizontal: 0,
            ...face,
            fontSize,
            lineHeight,
            color: tk.ink,
          }}
        />
        <View style={rest}>
          <EmojiKey label={emojiLabel} onPress={() => f.input.current?.focus()} />
        </View>
        <View style={rest}>
          <SendDisc state={state} label={sendLabel} onPress={send} />
        </View>
      </StickerBox>
    </View>
  );
});

/** THE EMOJI KEY of both chat bars (Prompt 5): the I1 face 22 in ink on a square of `side` with
    corners of `radius` (the reply bar: 36 and 10), or a circle (the Kindreds bar's 40); lav while
    pressed. It gives its field the keyboard — React Native can't switch it to the emoji keyboard as
    the Swift key does (see the header) — so the keyboard's globe is the way to the emoji. */
export function EmojiKey({
  label,
  onPress,
  side = REPLY_BAR.emojiKey,
  radius = REPLY_BAR.emojiRadius,
  circle = false,
  iconSize = 22,
  ground,
}: {
  label: string;
  onPress: () => void;
  side?: number;
  radius?: number;
  circle?: boolean;
  /** the face, in points (the Kindreds bar's 26) */
  iconSize?: number;
  /** the pressed lav ground's side when it is drawn smaller than the target (the Kindreds bar: 38 on 44) */
  ground?: number;
}) {
  const { t: tk } = useTheme();
  const g = ground ?? side;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={ground ? 0 : 4}
      style={{ width: side, height: side, alignItems: "center", justifyContent: "center" }}
    >
      {({ pressed }) => (
        <View style={{ width: g, height: g, borderRadius: circle ? g / 2 : radius, backgroundColor: pressed ? tk.lav : "transparent", alignItems: "center", justifyContent: "center" }}>
          <LineIcon name="emoji" size={iconSize} color={tk.ink} />
        </View>
      )}
    </Pressable>
  );
}

/** THE SEND DISC of both chat bars (KSendDisc): a circle of `diameter` with the I1 line plane 16
    across; enabled on `fill` (ink, the Kindreds bar's ind), disabled on #C9C6D6 and not pressable,
    dimmed the enabled disc at .35 and still pressed (kit.ts sendDiscLook). VoiceOver reads SEND. */
export function SendDisc({ state, label, onPress, diameter = REPLY_BAR.disc, fill }: { state: SendState; label: string; onPress: () => void; diameter?: number; fill?: string }) {
  const { t: tk } = useTheme();
  const look = sendDiscLook(tk, state, fill);
  const live = sendTakesPress(state);
  return (
    <Pressable
      onPress={live ? onPress : undefined}
      disabled={!live}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !live }}
      hitSlop={4}
      style={({ pressed }) => ({
        width: diameter,
        height: diameter,
        borderRadius: diameter / 2,
        backgroundColor: look.ground,
        opacity: look.opacity,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: live && pressed ? 0.94 : 1 }],
      })}
    >
      <LineIcon name="planeLine" size={16} color={look.plane} />
    </Pressable>
  );
}
