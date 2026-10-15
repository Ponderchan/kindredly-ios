import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useWrenName } from "../lib/wren-name";
import { t, useLang } from "../lib/i18n";
import { F } from "../theme/tokens";
import { useTheme } from "../lib/theme";
import { MoodIcon } from "./MoodIcon";
import { MOOD_IDS, MOODS, type MoodId } from "../data/moods";

/* Bottom-sheet mood grid shown after saving a journal page — now 30 moods,
   so the grid scrolls. */
export function MoodModal({
  visible,
  onPick,
  onCancel,
}: {
  visible: boolean;
  onPick: (id: MoodId) => void;
  onCancel: () => void;
}) {
  useLang();
  const tk = useTheme().t;
  const wren = useWrenName();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(19,26,38,0.35)", justifyContent: "flex-end" }}
        onPress={onCancel}
      >
        <Pressable
          style={{ backgroundColor: tk.sf, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 }}
          onPress={() => {}}
        >
          <Text style={{ fontFamily: F.serif, fontSize: 22, color: tk.ink, textAlign: "center" }}>{t("mm.title")}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontStyle: "italic", fontSize: 13, color: tk.mute, textAlign: "center", marginTop: 6 }}>
            {t("mm.sub", { wren })}
          </Text>
          <ScrollView style={{ maxHeight: 380, marginTop: 20 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
              {MOOD_IDS.map((id) => (
                <Pressable key={id} onPress={() => onPick(id)} style={{ width: "25%", alignItems: "center", marginBottom: 16 }}>
                  <MoodIcon id={id} size={48} />
                  <Text style={{ fontFamily: F.sans, fontSize: 10.5, color: tk.mute, marginTop: 4 }}>{MOODS[id].n}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
