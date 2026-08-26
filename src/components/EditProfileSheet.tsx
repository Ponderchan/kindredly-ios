import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { t, useLang } from "../lib/i18n";
import { C, F, cardStyle, navyBtn } from "../theme/tokens";
import { AVATARS } from "../data/avatar-lib";
import { AvatarImage } from "./AvatarImage";

/* Edit profile — bottom sheet: big preview, choose a photo OR pick a face
   from the library (or roll the dice), and your pen name. One Save. */
export function EditProfileSheet({
  visible,
  initialName,
  initialAvatarId,
  initialPhotoUri,
  seed,
  onSave,
  onClose,
}: {
  visible: boolean;
  initialName: string;
  initialAvatarId?: string | null;
  initialPhotoUri?: string | null;
  seed: string;
  onSave: (name: string, avatarId: string | null, photoUri: string | null) => void;
  onClose: () => void;
}) {
  useLang();
  const [name, setName] = useState(initialName);
  const [avatarId, setAvatarId] = useState<string | null>(initialAvatarId ?? null);
  const [photoUri, setPhotoUri] = useState<string | null>(initialPhotoUri ?? null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setAvatarId(initialAvatarId ?? null);
      setPhotoUri(initialPhotoUri ?? null);
    }
  }, [visible, initialName, initialAvatarId, initialPhotoUri]);

  const choosePhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const uri = res.assets?.[0]?.uri;
    if (uri) {
      setPhotoUri(uri);
      setAvatarId(null);
    }
  };

  const pickFace = (id: string) => {
    setAvatarId(id);
    setPhotoUri(null);
  };

  const roll = () => pickFace(AVATARS[Math.floor(Math.random() * AVATARS.length)].id);

  const canSave = name.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(20,20,26,0.35)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          style={{ backgroundColor: C.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 34, maxHeight: "88%" }}
          onPress={() => {}}
        >
          {/* header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 24, color: C.ink }}>{t("ep.title")}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 16, color: C.muted }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* preview + choose a photo */}
            <View style={{ alignItems: "center", marginBottom: 18 }}>
              <View style={{ borderWidth: 2.5, borderColor: C.purple, borderRadius: 64, padding: 4 }}>
                <AvatarImage id={avatarId} photoUri={photoUri} seed={seed} size={104} round />
              </View>
              <Pressable
                onPress={choosePhoto}
                style={[cardStyle, { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 22, marginTop: 14 }]}
              >
                <Text style={{ fontSize: 15 }}>🖼️</Text>
                <Text style={{ fontFamily: F.sansBold, fontSize: 14, color: C.ink }}>{t("ep.choosePhoto")}</Text>
              </Pressable>
            </View>

            {/* pick a face */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: C.label }}>{t("ep.pickFace")}</Text>
              <Pressable onPress={roll} style={[cardStyle, { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 }]}>
                <Text style={{ fontSize: 14 }}>🎲</Text>
                <Text style={{ fontFamily: F.sansBold, fontSize: 13, color: C.ink }}>{t("ep.random")}</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4, paddingRight: 12 }}>
              {AVATARS.map((a) => {
                const on = avatarId === a.id && !photoUri;
                return (
                  <Pressable key={a.id} onPress={() => pickFace(a.id)}>
                    <View style={{ borderWidth: 2, borderColor: on ? C.purple : "transparent", borderRadius: 33, padding: 2, backgroundColor: on ? C.purpleLt : "transparent" }}>
                      <AvatarImage id={a.id} seed={seed} size={54} round />
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* name */}
            <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: C.label, marginTop: 20, marginBottom: 10 }}>{t("ep.penName")}</Text>
            <View style={[cardStyle, { paddingHorizontal: 16, paddingVertical: 4 }]}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t("ep.penPh")}
                placeholderTextColor={C.faint}
                style={{ fontFamily: F.serif, fontSize: 18, color: C.ink, paddingVertical: 12 }}
              />
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, marginTop: 8 }}>
              Strangers never see it — only a kindred, once you've both enclosed your names.
            </Text>

            <Pressable
              onPress={() => canSave && onSave(name.trim(), photoUri ? null : avatarId, photoUri)}
              disabled={!canSave}
              style={[navyBtn, { paddingVertical: 17, width: "100%", marginTop: 22, backgroundColor: C.purple, opacity: canSave ? 1 : 0.35 }]}
            >
              <Text style={{ color: "#fff", fontFamily: F.sansBold, fontSize: 15.5 }}>{t("ep.save")}</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
