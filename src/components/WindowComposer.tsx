import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { t, useLang } from "../lib/i18n";
import { C, F, cardStyle, navyBtn } from "../theme/tokens";
import { MoodIcon } from "./MoodIcon";
import { MOOD_IDS, type MoodId } from "../data/moods";
import type { WindowPost } from "../lib/db";

/* Compose the one line you put in your window for kindreds to see (v20
   WindowComposer, text/'line' variant). */
export function WindowComposer({
  visible,
  initial,
  onSet,
  onClose,
}: {
  visible: boolean;
  initial: WindowPost | null;
  onSet: (body: string, mood: MoodId) => void;
  onClose: () => void;
}) {
  useLang();
  const [text, setText] = useState("");
  const [mood, setMood] = useState<MoodId>("calm");

  useEffect(() => {
    if (visible) {
      setText(initial?.body || "");
      setMood((initial?.mood as MoodId) || "calm");
    }
  }, [visible, initial]);

  const can = text.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(19,26,38,0.35)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable style={{ backgroundColor: C.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }} onPress={() => {}}>
          <Text style={{ fontFamily: F.serif, fontSize: 22, color: C.ink }}>{t("wc.putLine")}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.muted, marginTop: 6 }}>
            Only your kindreds can see it. Change it whenever.
          </Text>

          <View style={[cardStyle, { padding: 18, marginTop: 18, minHeight: 110 }]}>
            <TextInput
              autoFocus
              value={text}
              onChangeText={setText}
              placeholder={t("wc.ph")}
              placeholderTextColor={C.faint}
              multiline
              maxLength={400}
              style={{ minHeight: 70, color: C.ink, fontFamily: F.serif, fontSize: 17, lineHeight: 27, textAlignVertical: "top" }}
            />
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 16 }}>
            {MOOD_IDS.map((id) => {
              const on = mood === id;
              return (
                <Pressable key={id} onPress={() => setMood(id)} style={{ width: "25%", alignItems: "center", marginBottom: 14, opacity: on ? 1 : 0.45 }}>
                  <MoodIcon id={id} size={on ? 44 : 38} />
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => can && onSet(text.trim(), mood)} disabled={!can} style={[navyBtn, { paddingVertical: 17, width: "100%", marginTop: 6, opacity: can ? 1 : 0.3 }]}>
            <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 13.5, letterSpacing: 1.4 }}>{t("wc.put")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
