import { View } from "react-native";
import { useTheme } from "../../../lib/theme";
import { t } from "../../../lib/i18n";
import { NativeSurface } from "../../../components/NativeSurface";
import { LeaveSheet } from "../../../components/LeaveSheet";
import { useSettingsModel } from "../../../screens/settings/useSettingsModel";
import { SettingsNative } from "../../../screens/settings/SettingsNative";
import { SettingsRN } from "../../../screens/settings/SettingsRN";
import "../../../data/strings-step5-settings";

/* SETTINGS (10a step 5), behind Me's sliders, pushed inside the Me tab's own
   stack (me/_layout), so the floating tab bar stays (H:451; P:316). It used
   to be the root route /settings.

   This route only chooses who draws it. The model (screens/settings:
   useSettingsModel over the pure settings-model) knows everything — every
   row, word and value, every action — and both renderers draw exactly its
   view:
   - SettingsNative: SwiftUI, one Host for the whole page (KSettingsView);
   - SettingsRN: the React Native page, the remote switch's fallback.
   NativeSurface picks between them ("settings" in app_surfaces, the binary
   having the view, no JS error, no crash strikes) in mount mode: decided
   once, never swapped under the reader.

   The two sheets — the language list and the delete confirm — are React
   Native, in their window-level modal mode: inside the Me stack nothing a
   page draws can clear the floating tab bar, and the last language rows,
   NEVER MIND and the delete buttons used to end up under it (critic). */
export default function SettingsScreen() {
  const { t: tk } = useTheme();
  const model = useSettingsModel();

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <NativeSurface surface="settings" view="KSettingsView" mode="mount" native={() => <SettingsNative model={model} />} fallback={() => <SettingsRN model={model} />} />

      {/* the language: endonyms and flags, never translated; the current one marked */}
      <LeaveSheet
        modal
        open={model.picking}
        title={t("settings.language")}
        body={t("set.langBody", { n: model.langs.length })}
        actions={model.langs.map((l) => ({
          label: l.label.toUpperCase(),
          lead: l.flag,
          kind: l.id === model.lang ? ("primary" as const) : ("quiet" as const),
          selected: l.id === model.lang,
          // VoiceOver says the name in that language's own voice, without the flag
          accessibilityLabel: l.label,
          accessibilityLanguage: l.id === "pt" ? "pt-BR" : l.id,
          onPress: () => model.act.pickLanguage(l.id),
        }))}
        cancelLabel={t("set.neverMind")}
        onCancel={model.act.closeLanguage}
      />

      {/* deleting the account: the sheet with the product's own words */}
      <LeaveSheet
        modal
        open={model.askDelete}
        title={t("set.delTitle")}
        body={t("set.delBody", { wren: model.wren })}
        actions={[{ label: t("set.delConfirm"), busy: model.deleting, kind: "destructive", onPress: model.act.confirmDelete }]}
        cancelLabel={t("set.delKeep")}
        onCancel={model.act.cancelDelete}
      />
    </View>
  );
}
