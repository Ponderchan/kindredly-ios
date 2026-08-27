import { Modal, Pressable, ScrollView, Text } from "react-native";
import { C, F } from "../theme/tokens";
import { t, useLang } from "../lib/i18n";
import { sentencesOf } from "../lib/journal";

/* Bottom-sheet to choose which sentence of a journal page drifts out
   anonymously (v20 LinePicker). */
export function LinePicker({
  visible,
  body,
  onPick,
  onClose,
}: {
  visible: boolean;
  body: string;
  onPick: (line: string) => void;
  onClose: () => void;
}) {
  useLang(); // repaint when the reader changes language
  const lines = sentencesOf(body);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(19,26,38,0.35)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          style={{ backgroundColor: C.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "72%" }}
          onPress={() => {}}
        >
          <Text style={{ fontFamily: F.serif, fontSize: 21, color: C.ink }}>{t("lp.title")}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.muted, marginTop: 6, marginBottom: 16 }}>
            {t("lp.sub")}
          </Text>
          <ScrollView>
            {lines.map((l, i) => (
              <Pressable
                key={i}
                onPress={() => onPick(l)}
                style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, marginBottom: 10 }}
              >
                <Text style={{ fontFamily: F.serif, fontSize: 15.5, lineHeight: 24, color: C.ink }}>{l}</Text>
              </Pressable>
            ))}
            {lines.length === 0 && (
              <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.faint }}>
                This page is too short to drift a line.
              </Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
