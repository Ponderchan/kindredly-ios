import { View } from "react-native";
import { useTheme } from "../../lib/theme";
import { NativeSurface } from "../../components/NativeSurface";
import { useTodayDesk } from "../../screens/today/useTodayDesk";
import { TodayNative } from "../../screens/today/TodayNative";
import { TodayRN } from "../../screens/today/TodayRN";
import { TodayOverlays } from "../../screens/today/TodayOverlays";
import { TodayUpdate } from "../../screens/today/TodayUpdate";
import { useAfterFifteen } from "../../screens/today/useAfterFifteen";
import { AfterFifteenNative } from "../../screens/today/AfterFifteenNative";
import "../../data/strings-step5-today";

/* TODAY (Today 3d × 25b) — the post: today's strangers' letters, one card
   at a time. If a letter moves you, REPLY and a thread opens (it moves to
   Kindreds); if it doesn't, NEXT (or pull it up) and it's passed — no
   guilt, no unread badge. The desk is dealt each morning and frozen until
   eight; when the last letter goes, Wren flies the arc into her window and
   leaves you her counted letter.

   This route only chooses who draws it. The model (screens/today:
   useTodayDesk over the pure today-cards) knows everything — the day's
   desk, what was passed and answered, the drafts, the cards' words and
   menus, send and its every outcome, the one voice player, report and
   block, her letter and the window — and both renderers draw exactly its
   view:
   - TodayNative: SwiftUI, one Host for the whole desk (KTodayView), Wren
     drawn there from her own pictures, no React Native islands;
   - TodayRN: the React Native screen, the remote switch's fallback.
   NativeSurface picks between them ("today" in app_surfaces, the binary
   having the view, no JS error, no crash strikes) in mount mode: it
   decides once, because the desk holds a field and drafts.

   The toast, the sheets, the report card and the unfolded reader sit over
   either (TodayOverlays). The update prompt (TodayUpdate) wraps them all: its
   sheet when the server asks this binary to update, then its banner at the
   top, which both renderers and the overlays make room for.

   AFTER FIFTEEN (docs/today-after-fifteen.md; the "afterfifteen" switch, off
   by default). Once the day's last letter has gone past, the desk gives its
   place to one of three pages until the morning: the mailbox, the receipt,
   bedtime (screens/today/useAfterFifteen decides, AfterFifteenNative draws,
   SwiftUI only). They stand where the desk stood, behind the same switch
   machinery (NativeSurface: the table, the binary having the view, the crash
   strikes), with the desk itself as the fallback; off, or before the day is
   done, this route is exactly what it was. */
export default function LettersTab() {
  const { t: tk } = useTheme();
  const model = useTodayDesk();
  const after = useAfterFifteen(model);
  const desk = () => (
    <NativeSurface
      surface="today"
      view="KTodayView"
      mode="mount"
      native={() => <TodayNative model={model} />}
      fallback={() => <TodayRN model={model} />}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <TodayUpdate model={model}>
        {after.show && after.vm ? (
          <NativeSurface
            surface="afterfifteen"
            view="KAfterFifteenView"
            mode="mount"
            native={() => (after.vm ? <AfterFifteenNative vm={after.vm} look={after.look} act={after.act} /> : null)}
            fallback={desk}
          />
        ) : (
          desk()
        )}
        <TodayOverlays model={model} />
      </TodayUpdate>
    </View>
  );
}
