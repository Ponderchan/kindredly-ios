import { View } from "react-native";
import { useTheme } from "../../lib/theme";
import { NativeSurface } from "../../components/NativeSurface";
import { useTodayDesk } from "../../screens/today/useTodayDesk";
import { TodayNative } from "../../screens/today/TodayNative";
import { TodayRN } from "../../screens/today/TodayRN";
import { TodayOverlays } from "../../screens/today/TodayOverlays";
import "../../data/strings-step5-today";

/* TODAY (10a step 5) — the post, as a stack of strangers you swipe
   through, one card at a time. If a letter moves you, write back and a
   thread opens (it moves to Kindreds); if it doesn't, swipe to the next —
   no guilt, no unread badge. Fifteen a day; the blind comes down on the
   last page.

   This route only chooses who draws it. The model (screens/today:
   useTodayDesk over the pure today-cards) knows everything — the desk, the
   page, the drafts, the cards' words and menus, send and its every
   outcome, the one voice player, report and block — and both renderers
   draw exactly its view:
   - TodayNative: SwiftUI, one Host for the whole desk (KTodayView), with
     Wren and the blind as React Native islands;
   - TodayRN: the React Native screen, the remote switch's fallback.
   NativeSurface picks between them ("today" in app_surfaces, the binary
   having the view, no JS error, no crash strikes) in mount mode: it
   decides once, because the desk holds a field and drafts.

   The toast, the sheets, the report card and the unfolded reader sit over
   either (TodayOverlays). */
export default function LettersTab() {
  const { t: tk } = useTheme();
  const model = useTodayDesk();

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <NativeSurface
        surface="today"
        view="KTodayView"
        mode="mount"
        native={() => <TodayNative model={model} />}
        fallback={() => <TodayRN model={model} />}
      />
      <TodayOverlays model={model} />
    </View>
  );
}
