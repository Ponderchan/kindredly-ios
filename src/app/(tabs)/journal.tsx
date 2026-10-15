import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "../../lib/theme";
import { NativeSurface } from "../../components/NativeSurface";
import { useNotesModel } from "../../screens/notes/useNotesModel";
import { NotesNative } from "../../screens/notes/NotesNative";
import { NotesRN } from "../../screens/notes/NotesRN";
import "../../data/strings-step5-notes";

/* THE NOTES TAB (10a step 5) — letters to yourself, sealed on this phone.
   Three ways to lay the pages (Card, Grid, List: a button cycles them, the
   choice kept on this phone), a calendar of the months where each day wears
   its mood's colour, the evening question once after the first page and
   its off switch, and her line on the first visit.

   This route only chooses who draws it. The model (screens/notes:
   useNotesModel over the pure notes-model) knows everything — the pages,
   every label, the month, the view, the evening question, the one voice
   player, where each tap goes — and both renderers draw exactly its view:
   - NotesNative: SwiftUI, one Host for the whole tab (KNotesView);
   - NotesRN: the React Native screen, the remote switch's fallback.
   NativeSurface picks between them ("notes" in app_surfaces, the binary
   having the view, no JS error, no crash strikes) in live mode: a flip
   reaches a running app, but only while the tab isn't on show.

   lib/journal is never written here: the detail page, the composer and the
   roll do that. In a dev build /journal?empty=1 shows the empty state over
   a full journal. */
export default function JournalTab() {
  const { t: tk } = useTheme();
  const { empty } = useLocalSearchParams<{ empty?: string }>();
  const model = useNotesModel({ forceEmpty: __DEV__ && empty === "1" });

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <NativeSurface surface="notes" view="KNotesView" mode="live" native={() => <NotesNative model={model} />} fallback={() => <NotesRN model={model} />} />
    </View>
  );
}
