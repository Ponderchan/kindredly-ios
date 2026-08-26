import { View } from "react-native";
import { P } from "../theme/post";

/* THE MARK ON THE TRANSLATE CONTROL — "second impression".
   Two rules, the app's own structural unit, standing for one line of type set
   twice: the same sentence in another language comes out a different length.
   The top rule is the original, the bottom is the translation, and pen marks
   whichever one you are reading — so the mark reports state instead of
   decorating the word. Off, it stays ink and lets REPLY keep the only pen in
   the row. Deliberately not the 文/A glyph: that is someone else's visual
   language, and this product is built of type and its own postal objects. */
export function TranslateMark({ on }: { on?: boolean }) {
  return (
    <View style={{ width: 13, marginRight: 7 }}>
      <View style={{ height: 1.5, width: 13, backgroundColor: P.ink40 }} />
      <View style={{ height: 1.5, width: 8, marginTop: 3, backgroundColor: on ? P.pen : P.ink40 }} />
    </View>
  );
}
