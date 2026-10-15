import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../lib/theme";
import { t } from "../../lib/i18n";
import { NativeSurface } from "../../components/NativeSurface";
import { LeaveSheet } from "../../components/LeaveSheet";
import { PlushCelebration } from "../../components/PlushCelebration";
import { useKindredsModel } from "../../screens/kindreds/useKindredsModel";
import { KindredsNative } from "../../screens/kindreds/KindredsNative";
import { KindredsRN } from "../../screens/kindreds/KindredsRN";
import { KindredsEmpty } from "../../screens/kindreds/KindredsEmpty";
import "../../data/strings-step5-kindreds";

/* THE KINDREDS TAB (10a step 5). Kindreds as an orbit: you at the centre,
   correspondents circling in, drawn closer by the letters THEY send; at
   five letters each way names may be traded, and a kindred has landed.
   Under the orbit, the list is where you act: Wren first, then whatever is
   on you, then the newest; their-turn pen pals folded into one row; the
   rooms gone quiet; the accounts that closed.

   This route only chooses who draws it. The model (screens/kindreds:
   useKindredsModel over the pure kindreds-model) knows everything — the
   list, the order, the words, the menus, report and block — and both
   renderers draw exactly its view:
   - KindredsNative: SwiftUI, one Host for the whole screen (KKindredsView);
   - KindredsRN: the React Native screen, the remote switch's fallback.
   NativeSurface picks between them ("kindreds" in app_surfaces, the
   binary having the view, no JS error, no crash strikes) in live mode: a
   flip reaches a running app, but only while the tab isn't on show.

   Nobody yet (a real answer with no one in it — a new account, a guest
   with no session) is the React Native empty state, whoever would draw the
   list. The block question (the shared sheet, as a window-level Modal over
   the floating tab bar) and the Plush moment are React Native overlays
   above either. */
export default function KindredsTab() {
  const router = useRouter();
  const { t: tk } = useTheme();
  const model = useKindredsModel();

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      {model.empty ? (
        <KindredsEmpty onWrite={() => router.push("/compose")} />
      ) : (
        <NativeSurface
          surface="kindreds"
          view="KKindredsView"
          mode="live"
          native={() => <KindredsNative model={model} />}
          fallback={() => <KindredsRN model={model} />}
        />
      )}

      {/* block, asked once — the same sheet the ⋯ in a room raises */}
      <LeaveSheet
        modal
        open={!!model.blocking}
        title={t("rp.blockTitle")}
        body={t("rp.blockBody")}
        actions={[{ label: model.blockBusy ? "…" : t("rp.blockConfirm"), kind: "destructive", onPress: model.act.confirmBlock }]}
        cancelLabel={t("set.neverMind")}
        onCancel={model.act.cancelBlock}
      />

      <PlushCelebration kindreds={model.named} />
    </View>
  );
}
