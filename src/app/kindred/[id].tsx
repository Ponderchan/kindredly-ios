import { useLocalSearchParams } from "expo-router";
import { KindredPage } from "../../screens/chat/KindredPage";

/* A KINDRED'S PAGE — the room behind the name (10a step 5). It stays React
   Native; the screen is screens/chat/KindredPage and its rules
   screens/chat/kindred-page. Reached from the room's and the chat's
   header and from a Kindreds row's long press. */
export default function KindredRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <KindredPage id={id} />;
}
