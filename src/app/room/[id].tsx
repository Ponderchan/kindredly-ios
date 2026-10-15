import { useLocalSearchParams } from "expo-router";
import { NativeSurface } from "../../components/NativeSurface";
import { RoomNative } from "../../screens/chat/ConversationNative";
import { RoomRN } from "../../screens/chat/RoomRN";

/* THE ROOM — where you are once you know each other (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   One switch, two renderers on one model (screens/chat/useRoomModel):
   the SwiftUI conversation (ConversationNative → KConversationView, one
   Host under the React Native header) and the React Native screen it
   replaces (RoomRN). The remote switch's 'room' key picks, once, when the
   room opens ("mount": a renderer never changes under a thumb that is
   typing); a binary without KConversationView, a JS error in the Swift
   path or two crash strikes send it to React Native.

   Dev: ?expired=1 / ?closing=1 on a demo room show the expired door or
   the closing line without waiting a month. */
export default function RoomRoute() {
  const { id, expired, closing } = useLocalSearchParams<{ id: string; expired?: string; closing?: string }>();
  return (
    <NativeSurface
      surface="room"
      view="KConversationView"
      mode="mount"
      native={() => <RoomNative id={id} expiredParam={expired} closingParam={closing} />}
      fallback={() => <RoomRN />}
    />
  );
}
