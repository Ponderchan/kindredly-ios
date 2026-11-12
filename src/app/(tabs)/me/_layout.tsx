import { View } from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { useFoldFrame } from "../../../lib/fold";

/* THE ME TAB'S OWN STACK (10a step 5). Settings and Edit profile (and the
   pages under Settings: help, write to us, blocked) are pushed INSIDE the
   Me tab, so the floating tab bar stays on screen as H and P draw it
   (H:451; P:304, 316 "底栏保留"), and pressing Me again pops back to the
   tab's own page (the native stack's tabPress) — which then scrolls to its
   top (screens/me/useMeModel). The routes are /me, /me/settings,
   /me/edit-profile, /me/edit-field, /me/help, /me/write-to-us and
   /me/blocked; the settings-profile slice owns the pages, this owns the
   stack. Root routes (/courier, /aura, /my-letters, /paywall, /lore,
   /drafts…) still push over the tabs, as before.

   initialRouteName "index": a cold link to /me/settings or
   /me/edit-profile (a notification, a deep link) has Me underneath it, so
   back goes to Me rather than nowhere (critic).

   Every page arrives on the theme's ground (contentStyle tk.bg, read at
   render), so a push never slides in on another colour.

   ON A FOLDING PHONE (iPhone Duo, 2026-11-12). Me's own page is the whole window less the band
   ((tabs)/_layout's spreadScene: its sky runs edge to edge and its two pages lay themselves
   out). The pages pushed in here — Settings, Edit profile and the rest — are one column, and on
   the inner screen they stood 870 wide (the First Class card and the five looks stretched across
   the screen). They keep to the column every pushed page keeps (lib/fold-frame: no wider than
   560, in the middle of what the band leaves); the tab's scene has already taken the band, so the
   right side gives back what that took. On the outer screen and on a phone this is nothing. */
export const unstable_settings = { initialRouteName: "index" };

export default function MeStackLayout() {
  const { t: tk } = useTheme();
  const frame = useFoldFrame();
  // the inner screen: the column; the index page keeps the whole scene (see above). The outer
  // screen: Me's scene takes nothing (its sky runs to the edge), so its pushed pages keep out of
  // the band themselves, as every other page there does
  const column = frame.pages
    ? { paddingLeft: frame.left, paddingRight: Math.max(0, frame.right - frame.band) }
    : frame.duo
      ? { paddingLeft: frame.left, paddingRight: frame.right }
      : null;
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tk.bg, ...column } }}>
        <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: tk.bg } }} />
      </Stack>
    </View>
  );
}
