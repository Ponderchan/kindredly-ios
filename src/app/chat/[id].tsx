import { useLocalSearchParams } from "expo-router";
import { NativeSurface } from "../../components/NativeSurface";
import { LettersNative } from "../../screens/chat/ConversationNative";
import { LettersRN } from "../../screens/chat/LettersRN";
import { DeckInsets } from "../../components/DeckInsets";

/* THE CORRESPONDENCE — a pen pal before names (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   One switch, two renderers on one model (screens/chat/useLettersModel):
   the SwiftUI conversation (ConversationNative → KConversationView, one
   Host under the React Native header and the reach band) and the React
   Native screen it replaces (LettersRN). The remote switch's 'chat' key
   picks, once, when the chat opens ("mount"); a binary without
   KConversationView, a JS error in the Swift path or two crash strikes
   send it to React Native. */
/* on a small laptop the page ends at the bend: its foot keeps the bend's gap, not the home
   indicator's inset (components/DeckInsets) */
export default function ChatRoute() {
  return (
    <DeckInsets>
      <ChatRoutePage />
    </DeckInsets>
  );
}

function ChatRoutePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NativeSurface surface="chat" view="KConversationView" mode="mount" native={() => <LettersNative id={id} />} fallback={() => <LettersRN />} />;
}
