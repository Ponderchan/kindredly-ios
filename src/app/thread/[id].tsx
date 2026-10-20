import { useLocalSearchParams } from "expo-router";
import { NativeSurface } from "../../components/NativeSurface";
import { ReaderScreen } from "../../screens/chat/ReaderScreen";
import { ReaderNative } from "../../screens/chat/ReaderNative";

/* THE ONE-LETTER READER — one letter of a correspondence, full page
   (10a step 5). One switch, two renderers on one model
   (screens/chat/useReaderModel, its rules screens/chat/reader): the SwiftUI
   reader (ReaderNative → KReaderView, owner-approved 2026-10-20) and the
   React Native ReaderScreen it replaces. The remote switch's 'reader' key
   picks, once, when the reader opens ("mount": it holds the reply's words);
   a binary without KReaderView, a JS error in the Swift path or two crash
   strikes send it to React Native.

   ?m=<message id | "opening"> names the letter to read (the chat and the
   room send it); ?i=<index> is kept for links made before ?m=. */
export default function ThreadRoute() {
  const { id, m, i } = useLocalSearchParams<{ id: string; m?: string; i?: string }>();
  return <NativeSurface surface="reader" view="KReaderView" mode="mount" native={() => <ReaderNative id={id} m={m} i={i} />} fallback={() => <ReaderScreen id={id} m={m} i={i} />} />;
}
