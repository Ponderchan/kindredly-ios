import { View } from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "../../../lib/theme";

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
   render), so a push never slides in on another colour. */
export const unstable_settings = { initialRouteName: "index" };

export default function MeStackLayout() {
  const { t: tk } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tk.bg } }}>
        <Stack.Screen name="index" />
      </Stack>
    </View>
  );
}
