import { useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import { useWindowDimensions, type TextInput, type TextInputContentSizeChangeEvent, type TextInputScrollEvent, type TextStyle } from "react-native";

/* THE UNCONTROLLED COMPOSER FIELD (10a; the React Native side of KField and
   KComposerField). One mechanism under every React Native place a reply is
   written: the 10a reply strip (ReplyStrip: the reader, Wren's desk), and
   the chat composers' two bars (ReplyBar: the Today reply and the pen-pal
   chat; KindredBar: a room). It was ReplyStrip's own until the bars came
   (2026-10-18); it moved here unchanged so the three can't drift apart on
   the one thing that is easy to get wrong.

   THE FIELD IS UNCONTROLLED, as the Swift KField is: its text lives in the
   native view and is never echoed back from React, which is what keeps a
   Japanese or Korean composition (marked text) whole. The caller follows it
   through onChangeText and gets exactly what was typed from the handle. To
   put text in — a draft resumed, a send that failed and must give the words
   back, a reader closing, an idea used — call setText on the handle; that is
   the only way text goes in after mount.

   HOW TEXT GOES IN (React Native 0.86, Fabric). The TextInput's native
   `text` prop is not a one-off: every time it changes, the shadow node
   writes it into the field's state (BaseTextInputShadowNode
   updateStateIfNeeded) and the native view puts it over what is shown
   whenever no keystroke is in flight (RCTTextInputComponentView
   updateState). So that prop — defaultValue, on every render — must change
   exactly when text is put in and never drift back by itself (handing
   `value` for one render and then dropping it wiped the words a frame
   later). It lives in `seed.text`: initialText once, at mount, and after
   that only what setText and clear say. When setText must put in the very
   text the prop already carries (the person typed over it) a prop that
   doesn't change can't do it: "" goes in by the field's own clear(),
   anything else by a fresh field (`seed.n` is its key) that takes the
   keyboard if the old one had it (onBlur then onFocus may fire around the
   swap). A device check belongs to the 0b spike: setText after typing,
   setText of the same draft after editing it, and setText after a send has
   cleared the field — each must stay on screen, with the send key matching
   what is shown.

   THE FIELD'S HEIGHT IS KEPT FROM HERE TOO (2026-10-18). On this build
   (React Native 0.86, Fabric, Reanimated 4.5) a multiline field that grows
   by itself only grows on a React commit that touches it: the native view's
   own text updates (every keystroke of an uncontrolled field) reach its
   shadow state but not the layout, so a field typed into stayed at the
   height of its last commit — one line in the 10a strip and the reply bar,
   two in the Kindreds bar — and scrolled its words inside, drawn over its
   own outline. Seen on the dev pages (step5-lab's R1 strip, the chat kit's
   RN bars) before the bars came and after, so not theirs. Any commit that
   changes the field's props lays it out at its words, so the hook makes
   one exactly when the height can change:
   · GROWING: a line that doesn't fit makes the text view scroll to the
     caret, and its scroll event carries the content's height (padding
     included); box() takes it as the field's minHeight (to `max`, past
     which it scrolls inside as designed), and that commit lays it out;
   · SHRINKING: a deletion forgets that height and nudges the minHeight by
     a hundredth (invisible, under a pixel) so the field is laid out again
     at what is left;
   · setText and clear forget it too: their own commit measures the words
     they put in. An empty field is pinned to one line (lib/field
     fieldBox's rule: never the height its last letter gave it).

   The caller renders the field as
     <GlyphInput key={f.seed.n} ref={f.input} defaultValue={f.seed.text}
       onChangeText={f.note} onScroll={f.onScroll}
       onContentSizeChange={f.onContentSizeChange}
       autoFocus={f.seed.n > 0 ? f.seed.focus : autoFocus}
       style={{ ...f.box(lineHeight, max, pad), … }} … /> */

/* DYNAMIC TYPE (a11y pass, 2026-10-19). React Native scales the field's
   font AND its line height with the reader's text size, so a height rule
   in unscaled points cut the placeholder in half at XXXL and left a
   one-line slit (the 113 ceiling) at the accessibility sizes. box() works
   in the field's real line: the line height times the text size, capped
   at FIELD_FONT_CAP — the Swift reply dock's .accessibility3 ceiling. The
   caller gives the field maxFontSizeMultiplier={FIELD_FONT_CAP} so the
   text and the rule agree. At the accessibility sizes (AX_SCALE and up)
   the field grows to three lines at most before it scrolls inside, as the
   Swift docks do; below them, to the caller's own count. */

/** the reply fields' Dynamic Type ceiling (KReplyDock's .accessibility3); the field's maxFontSizeMultiplier */
export const FIELD_FONT_CAP = 2.6;
/** from here (AX1) up, a field grows to three lines at most */
const AX_SCALE = 1.6;
const AX_MAX_LINES = 3;

export type ComposerFieldHandle = {
  /** put text in the field (draft resume, restore after a failed send, an idea used); keeps focus */
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

export function useComposerField(ref: Ref<ComposerFieldHandle>, initialText: string | undefined, onChangeText?: (value: string) => void) {
  const input = useRef<TextInput>(null);
  /* the text size the field is drawn at (see DYNAMIC TYPE); useWindowDimensions re-renders on a change.
     Never below 1: at the smaller sizes the field keeps the design's own heights, as it always had */
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(Math.max(fontScale || 1, 1), FIELD_FONT_CAP);
  /* the field's native `text` prop (see HOW TEXT GOES IN): `text` changes
     only in setText and clear; `n` is the field's key, bumped to put in the
     text the prop already carries; `focus` is whether that fresh field
     takes the keyboard */
  const [seed, setSeed] = useState(() => ({ text: initialText ?? "", n: 0, focus: false }));
  /* the prop as last committed: Fabric puts setText's text in only when
     the next commit carries something different */
  const committed = useRef(seed.text);
  useLayoutEffect(() => {
    committed.current = seed.text;
  }, [seed.text]);
  /* what the field holds (every edit, setText and clear) */
  const text = useRef(seed.text);
  const [empty, setEmpty] = useState(text.current.length === 0);
  const [hasWords, setHasWords] = useState(text.current.trim().length > 0);

  /* the field's height (see THE FIELD'S HEIGHT): `h` the content's height as the text view last
     reported it, padding included (0 until a line overflows, and after a deletion, setText and
     clear); `nudge` flips with each deletion, so the next commit lays the field out again */
  const [grown, setGrown] = useState({ h: 0, nudge: false });

  const latest = useRef(onChangeText);
  latest.current = onChangeText;
  const note = (v: string) => {
    const shorter = v.length < text.current.length;
    text.current = v;
    setEmpty(v.length === 0);
    setHasWords(v.trim().length > 0);
    if (shorter) setGrown((g) => ({ h: 0, nudge: !g.nudge }));
    latest.current?.(v);
  };

  const report = (h: number | undefined) => {
    if (typeof h !== "number" || !(h > 0)) return;
    const next = Math.ceil(h);
    setGrown((g) => (Math.abs(g.h - next) < 1 ? g : { ...g, h: next }));
  };
  /* a line that doesn't fit scrolls the text view to the caret; its scroll event carries the content's
     height on iOS (TextInputEventEmitter's scroll payload), though the type only names the offset */
  const onScroll = (e: TextInputScrollEvent) => report((e.nativeEvent as { contentSize?: { height?: number } }).contentSize?.height);
  // and a layout that changed it (the field narrowed or widened) says so here
  const onContentSizeChange = (e: TextInputContentSizeChangeEvent) => report(e.nativeEvent.contentSize?.height);
  /** the field's height rule: one line while empty, else at least its words (to its ceiling, then it
      scrolls inside). `lineHeight`, `max` and `pad` are the design's unscaled points (max = lines ×
      lineHeight + 2 × pad); the lines are scaled to the text size here (see DYNAMIC TYPE). */
  const box = (lineHeight: number, max: number, pad: number): TextStyle => {
    const line = lineHeight * scale;
    const lines = Math.max(1, Math.round((max - pad * 2) / lineHeight));
    const most = scale >= AX_SCALE ? Math.min(lines, AX_MAX_LINES) : lines;
    const oneLine = Math.ceil(line + pad * 2);
    const top = Math.max(oneLine, Math.ceil(most * line + pad * 2));
    if (empty) return { height: oneLine, maxHeight: top };
    return { minHeight: Math.min(top, Math.max(oneLine, grown.h)) + (grown.nudge ? 0.01 : 0), maxHeight: top };
  };
  /** one line of the field, padding included, at the text size: the bars' resting row follows it */
  const restingLine = (lineHeight: number, pad: number) => Math.ceil(lineHeight * scale + pad * 2);

  const clear = () => {
    input.current?.clear();
    /* the prop follows, so it never holds text the field no longer shows
       (a later setText of those words is then a change Fabric applies) */
    setSeed((s) => (s.text === "" ? s : { ...s, text: "" }));
    setGrown((g) => (g.h === 0 ? g : { ...g, h: 0 }));
    note("");
  };

  useImperativeHandle(
    ref,
    () => ({
      setText(value: string) {
        const shown = text.current;
        /* a different prop goes in on the next commit; the same one as
           committed also cancels any other text set since */
        setSeed((s) => (s.text === value ? s : { ...s, text: value }));
        if (value === committed.current && value !== shown) {
          if (value === "") input.current?.clear();
          else {
            const focus = input.current?.isFocused() ?? false;
            setSeed((s) => ({ text: value, n: s.n + 1, focus }));
          }
        }
        // its own commit measures the words it puts in
        setGrown((g) => (g.h === 0 ? g : { ...g, h: 0 }));
        note(value);
      },
      clear,
      focus: () => input.current?.focus(),
      blur: () => input.current?.blur(),
      getText: () => text.current,
      isFocused: () => input.current?.isFocused() ?? false,
    }),
    // note, clear and setText only touch refs and state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { input, seed, note, clear, text, empty, hasWords, box, restingLine, scale, onScroll, onContentSizeChange };
}
