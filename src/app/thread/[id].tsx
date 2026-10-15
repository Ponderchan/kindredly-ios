import { useLocalSearchParams } from "expo-router";
import { ReaderScreen } from "../../screens/chat/ReaderScreen";

/* THE ONE-LETTER READER — one letter of a correspondence, full page
   (10a step 5). It stays React Native (owner); the screen is
   screens/chat/ReaderScreen and its rules screens/chat/reader.

   ?m=<message id | "opening"> names the letter to read (the chat and the
   room send it); ?i=<index> is kept for links made before ?m=. */
export default function ThreadRoute() {
  const { id, m, i } = useLocalSearchParams<{ id: string; m?: string; i?: string }>();
  return <ReaderScreen id={id} m={m} i={i} />;
}
