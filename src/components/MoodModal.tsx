import { Modal, Pressable, Text, View } from "react-native";
import { C, F } from "../theme/tokens";
import { MoodIcon } from "./MoodIcon";
import { MOOD_IDS, MOODS, type MoodId } from "../data/moods";

/* Bottom-sheet 8-mood grid shown after saving a journal page (v20 MoodModal). */
export function MoodModal({
  visible,
  onPick,
  onCancel,
}: {
  visible: boolean;
  onPick: (id: MoodId) => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(19,26,38,0.35)", justifyContent: "flex-end" }}
        onPress={onCancel}
      >
        <Pressable
          style={{ backgroundColor: C.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 }}
          onPress={() => {}}
        >
          <Text style={{ fontFamily: F.serif, fontSize: 22, color: C.ink, textAlign: "center" }}>How did today feel?</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.muted, textAlign: "center", marginTop: 6 }}>
            One word. Wren keeps the rest.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 24 }}>
            {MOOD_IDS.map((id) => (
              <Pressable key={id} onPress={() => onPick(id)} style={{ width: "25%", alignItems: "center", marginBottom: 18 }}>
                <MoodIcon id={id} size={50} />
                <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.muted, marginTop: 4 }}>{MOODS[id].n}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
