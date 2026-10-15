import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { t, useLang } from "../lib/i18n";
import { PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { WrenBird } from "../components/WrenBird";
import { speakAs, useWrenName } from "../lib/wren-name";
import { sendSupportLetter } from "../lib/db";
import { fieldBox } from "../lib/field";

/* WRITE TO US — the contact form, refusing to be a contact form.
   ────────────────────────────────────────────────────────────────────────
   The standard version is three grey inputs and a coloured button, and it
   makes the company the one thing in the app you can't write a letter to.
   So this is the same paper as everywhere else: you write, and the same
   bird carries it. The only extra field is the address, and it's optional
   with the honest consequence printed next to it — no address, no answer.

   It is NOT a thread (see migration 0013). Support is not a
   correspondence, and Kindreds is for people. */

const VERSION = `${Constants.expoConfig?.version ?? "1.0.0"}${Constants.expoConfig?.ios?.buildNumber ? ` (${Constants.expoConfig.ios.buildNumber})` : ""}`;

export default function WriteToUs() {
  const P = useP();
  const { t: tk, dark } = useTheme();
  /* post's solidBtn, drawn from the theme: the pen blue, with its label in
     the page colour (the text on anything filled with ind) */
  const solidBtn = { backgroundColor: P.pen, paddingVertical: 15, alignItems: "center" } as const;
  useLang();
  const router = useRouter();
  const wren = useWrenName();
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSend = body.trim().length >= 2 && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setFailed(false);
    const ok = await sendSupportLetter(body, email, `${VERSION} · ${Platform.OS} ${Platform.Version}`);
    setSending(false);
    if (ok) setSent(true);
    else setFailed(true);
  };

  if (sent)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 }}>
          <WrenBird size={64} mood="delight" />
          <Text style={{ fontFamily: PF.letter, fontSize: 24, fontWeight: "600", color: P.ink, textAlign: "center", marginTop: 18 }}>
            {t("wu.taken")}
          </Text>
          <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 15, lineHeight: 23, color: P.ink60, textAlign: "center", marginTop: 12 }}>
            {speakAs(email.trim() ? t("wu.takenAddr") : t("wu.takenNoAddr"), wren)}
          </Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ ...solidBtn, alignSelf: "stretch", marginTop: 30, opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.8, color: tk.bg }}>{t("wu.done")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>{t("wu.title")}</Text>
        <View style={{ width: 42 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 16 }}>
            <WrenBird size={24} mood="listen" />
            <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 13.5, lineHeight: 20, color: P.ink60 }}>
              {speakAs(t("wu.intro"), wren)}
            </Text>
          </View>

          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            autoFocus
            placeholder={t("wu.ph")}
            placeholderTextColor={tk.faint}
            keyboardAppearance={dark ? "dark" : "light"}
            style={{ ...fieldBox(body, 25, 320), borderBottomWidth: 1, borderBottomColor: P.ink12, paddingTop: 10, paddingBottom: 10, fontFamily: PF.letter, fontSize: 17, lineHeight: 25, color: P.ink }}
          />

          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40, marginTop: 26 }}>
            {t("wu.addrLabel")}
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={t("wu.addrPh")}
            placeholderTextColor={tk.faint}
            keyboardAppearance={dark ? "dark" : "light"}
            style={{ borderBottomWidth: 1, borderBottomColor: P.ink12, paddingVertical: 10, marginTop: 6, fontFamily: PF.letter, fontSize: 16, color: P.ink }}
          />
          <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 12, lineHeight: 18, color: P.ink40, marginTop: 8 }}>
            {t("wu.addrHint")}
          </Text>

          {failed && (
            <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1, color: P.post, marginTop: 16 }}>
              {t("wu.fail")}
            </Text>
          )}

          <Pressable onPress={send} disabled={!canSend} style={({ pressed }) => ({ ...solidBtn, marginTop: 26, opacity: canSend ? (pressed ? 0.85 : 1) : 0.4 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.8, color: tk.bg }}>
              {sending ? "…" : t("wu.send", { wren: wren.toUpperCase() })}
            </Text>
          </Pressable>

          <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: P.ink40, textAlign: "center", marginTop: 14 }}>
            {t("wu.travelsWith", { v: VERSION })}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
