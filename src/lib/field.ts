import type { TextStyle } from "react-native";

/* AN EMPTY FIELD MUST NEVER KEEP THE HEIGHT ITS LAST LETTER GAVE IT.
   ────────────────────────────────────────────────────────────────────────
   Every composer in this app is a multiline TextInput that grows with the
   words and is cleared programmatically on send. That combination has a
   race: the native text view measures its own content, so when a re-render
   lands in the same beat as the clear — which slice 215's realtime pokes
   made routine, since a send is immediately echoed back — the box can keep
   the height five lines of text gave it while holding nothing at all. What
   you see is the placeholder stranded at the top of an empty box with the
   rule drawn far below it.

   The fix is to stop asking the native view what an EMPTY field is worth:
   with no text there is exactly one right answer, one line, so pin it.
   With text, behave exactly as before — grow to fit, stop at max. */
export function fieldBox(text: string, lineHeight: number, max: number, pad = 10): TextStyle {
  const oneLine = lineHeight + pad * 2;
  return text.length === 0 ? { height: oneLine, maxHeight: max } : { minHeight: oneLine, maxHeight: max };
}
