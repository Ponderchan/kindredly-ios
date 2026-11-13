import { View } from "react-native";
import { useTheme } from "../../../lib/theme";
import { NativeSurface } from "../../../components/NativeSurface";
import { useSettingsModel } from "../../../screens/settings/useSettingsModel";
import { SettingsNative } from "../../../screens/settings/SettingsNative";
import { AppearanceRN } from "../../../screens/settings/SettingsRN";
import "../../../data/strings-step5-settings";

/* APPEARANCE, ITS OWN PAGE (owner, 2026-11-13: "appearance 和front 不行合在一起 做个视频里的这种
   方案", of Telegram's and Grok's Settings: one Appearance row, then a page with a live preview
   over the choices). Pushed from Settings' Appearance row inside the Me tab's stack, so the
   floating tab bar stays.

   The same model and the same Swift view as Settings (useSettingsModel, KSettingsView with page
   "appearance"): a sample letter in the theme and the Letter font chosen, the five appearances
   under it, the fonts in their own card. Settings only offers the row where this binary draws the
   page (settings-model facts.appearancePage), so the React Native page below is the remote
   switch's fallback, nothing more. */
export default function AppearanceScreen() {
  const { t: tk } = useTheme();
  const model = useSettingsModel();
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <NativeSurface
        surface="settings"
        view="KSettingsView"
        mode="mount"
        native={() => <SettingsNative model={model} page="appearance" />}
        fallback={() => <AppearanceRN model={model} />}
      />
    </View>
  );
}
