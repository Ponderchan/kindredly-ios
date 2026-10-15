import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { View, type StyleProp, type TextInput, type TextInputProps, type ViewStyle } from "react-native";
import { GlyphInput } from "../GlyphInput";
import { useTheme } from "../../lib/theme";
import { fieldBox } from "../../lib/field";
import { SendKey } from "./SendKey";
import { StickerBox } from "./StickerBox";
import { REPLY_FIELD_MAX, REPLY_FIELD_PAD, REPLY_STRIP, sendClearsField, sendKeyState, sendTakesPress, type SendStyle } from "./kit";

/* THE REPLY STRIP (10a, H:124; KReplyStrip's React Native twin).
   ────────────────────────────────────────────────────────────────────────
   Where a reply is written, in the screens that stay React Native (the
   reader, Wren's desk if it moves) and in the room, chat and Today
   fallbacks: an sf face with a 2.5 ln outline, corners 26, a hard 4/4
   shadow, at least 54 tall, padding 0 8 0 20. The field is the system face
   at 17 (writing inputs stay system, H:124), placeholder in mute, the caret
   in ind (GlyphInput), and it grows to five lines. The send key sits at the
   right end, centred on the resting height as the strip grows (SendKey).

   THE FIELD IS UNCONTROLLED, as the Swift KField is: its text lives in the
   native view and is never echoed back from React, which is what keeps a
   Japanese or Korean composition (marked text) whole. The caller follows
   it through onChangeText, decides canSend from it, and gets exactly what
   was typed in onSend(value). To put text in — a draft resumed, a send
   that failed and must give the words back, a reader closing — call
   setText on the handle; that is the only way text goes in after mount.

   SENDING. The key and, with returnSends (the default, as in every chat),
   the keyboard's Return both send. Return then never inserts a newline,
   and an IME commit with Return inserts none either; a pasted newline
   stays. A send that goes (the key was enabled) clears the field itself,
   unless onSend returns false — a fold or a song that clears only once it
   has landed, or a validation the caller refuses. The dimmed key's tap
   (a full pouch) reaches onSend too and never clears: the caller explains.

   `leading` and `trailing` sit beside the strip, outside its outline — the
   mock's round tools (Wren, +): centred on the strip's resting height and
   staying at the bottom as it grows. */

export type ReplyStripHandle = {
  /** put text in the field (draft resume, restore after a failed send); keeps focus */
  setText(value: string): void;
  /** empty it */
  clear(): void;
  focus(): void;
  blur(): void;
  /** what is in the field right now */
  getText(): string;
  /** whether the field has the keyboard */
  isFocused(): boolean;
};

export type ReplyStripProps = {
  /** already translated ("write back…") */
  placeholder: string;
  /** the caller's whole rule for the words as typed: long enough, not over
      the limit, not already sending */
  canSend: boolean;
  /** the words are ready but something outside them holds the letter (a
      full pouch): the key looks disabled and its tap reaches onSend */
  held?: boolean;
  /** exactly what was typed; return false to keep it in the field */
  onSend: (value: string) => boolean | void;
  /** every edit, and every setText/clear, with the field's whole text */
  onChangeText?: (value: string) => void;
  /** the keyboard's Return sends (default true); false for a letter, where Return is a new line */
  returnSends?: boolean;
  /** the text the field starts with (read at mount only; use setText after) */
  initialText?: string;
  /** beside the strip, on the left: round tools */
  leading?: ReactNode;
  /** beside the strip, on the right */
  trailing?: ReactNode;
  /** the send key's word (default ld.send) */
  sendLabel?: string;
  /** leave it to SEND_STYLE (owner question 3) */
  sendStyle?: SendStyle;
  /** VoiceOver's name for the send key (default the word) */
  sendA11yLabel?: string;
  editable?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  /** anything else the TextInput should get (autoCapitalize, autoCorrect, testID…) */
  inputProps?: Omit<TextInputProps, "value" | "defaultValue" | "onChangeText" | "placeholder" | "multiline" | "onSubmitEditing" | "submitBehavior" | "returnKeyType" | "style" | "editable" | "autoFocus" | "maxLength" | "onFocus" | "onBlur">;
  /** the outer row: margins */
  style?: StyleProp<ViewStyle>;
};

export const ReplyStrip = forwardRef<ReplyStripHandle, ReplyStripProps>(function ReplyStrip(
  {
    placeholder,
    canSend,
    held = false,
    onSend,
    onChangeText,
    returnSends = true,
    initialText,
    leading,
    trailing,
    sendLabel,
    sendStyle,
    sendA11yLabel,
    editable,
    autoFocus,
    maxLength,
    onFocus,
    onBlur,
    inputProps,
    style,
  },
  ref,
) {
  const { t: tk } = useTheme();
  const input = useRef<TextInput>(null);
  const text = useRef(initialText ?? "");
  const [empty, setEmpty] = useState(text.current.length === 0);
  const [hasWords, setHasWords] = useState(text.current.trim().length > 0);
  /* setText's text, handed to the TextInput as `value` for one render only:
     it sends it to the native view once and the field is uncontrolled again */
  const [seed, setSeed] = useState<{ value: string } | null>(null);
  useEffect(() => {
    if (seed) setSeed(null);
  }, [seed]);

  const latest = useRef(onChangeText);
  latest.current = onChangeText;
  const note = (v: string) => {
    text.current = v;
    setEmpty(v.length === 0);
    setHasWords(v.trim().length > 0);
    latest.current?.(v);
  };

  const clear = () => {
    input.current?.clear();
    note("");
  };

  useImperativeHandle(
    ref,
    () => ({
      setText(value: string) {
        setSeed({ value });
        note(value);
      },
      clear,
      focus: () => input.current?.focus(),
      blur: () => input.current?.blur(),
      getText: () => text.current,
      isFocused: () => input.current?.isFocused() ?? false,
    }),
    // note and clear only touch refs and state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const state = sendKeyState({ hasWords, canSend, held });
  const send = () => {
    if (!sendTakesPress(state)) return;
    const kept = onSend(text.current) === false;
    if (sendClearsField(state) && !kept) clear();
  };

  const { minHeight, border, radius, shadow, padLeft, padRight, fontSize, lineHeight, gap } = REPLY_STRIP;
  const inner = minHeight - 2 * border;

  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end", gap }, style]}>
      {leading != null && <View style={{ minHeight, justifyContent: "center" }}>{leading}</View>}
      <StickerBox
        fill={tk.sf}
        stroke={tk.ln}
        lineWidth={border}
        radius={radius}
        shadow={tk.ln}
        offset={shadow}
        style={{ flex: 1 }}
        faceStyle={{ flexDirection: "row", alignItems: "flex-end", minHeight, paddingLeft: padLeft, paddingRight: padRight }}
      >
        <GlyphInput
          ref={input}
          {...inputProps}
          defaultValue={initialText}
          value={seed?.value}
          onChangeText={note}
          placeholder={placeholder}
          placeholderTextColor={tk.mute}
          multiline
          returnKeyType={returnSends ? "send" : "default"}
          submitBehavior={returnSends ? "submit" : "newline"}
          onSubmitEditing={returnSends ? send : undefined}
          editable={editable}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onFocus={onFocus}
          onBlur={onBlur}
          style={{
            flex: 1,
            ...fieldBox(empty ? "" : "x", lineHeight, REPLY_FIELD_MAX, REPLY_FIELD_PAD),
            paddingTop: REPLY_FIELD_PAD,
            paddingBottom: REPLY_FIELD_PAD,
            paddingHorizontal: 0,
            fontSize,
            lineHeight,
            color: tk.ink,
          }}
        />
        <View style={{ minHeight: inner, justifyContent: "center", marginLeft: 8 }}>
          <SendKey state={state} onPress={send} label={sendLabel} sendStyle={sendStyle} accessibilityLabel={sendA11yLabel} />
        </View>
      </StickerBox>
      {trailing != null && <View style={{ minHeight, justifyContent: "center" }}>{trailing}</View>}
    </View>
  );
});
