import { useEffect, useState } from "react";
import { AccessibilityInfo, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { t, useLang } from "../../../lib/i18n";
import { MONO, P, PF } from "../../../theme/post";
import { useTheme } from "../../../lib/theme";
import { WrenBird } from "../../../components/WrenBird";
import { SecondaryHeader } from "../../../components/10a";
import { useTabBarSpace } from "../../../components/NativeTabBar";
import { speakAs, useWrenName } from "../../../lib/wren-name";
import { sendSupportLetter } from "../../../lib/db";
import { fieldBox } from "../../../lib/field";
import { dangerInk, footerVersion } from "../../../screens/settings/settings-model";
import { versionFacts } from "../../../screens/settings/useSettingsModel";

/* WRITE TO US — the contact form, refusing to be a contact form.
   ────────────────────────────────────────────────────────────────────────
   The standard version is three grey inputs and a coloured button, and it
   makes the company the one thing in the app you can't write a letter to.
   So this is the same paper as everywhere else: you write, and the same
   bird carries it. The only extra field is the address, and it's optional
   with the honest consequence printed next to it — no address, no answer.

   It is NOT a thread (see migration 0013). Support is not a
   correspondence, and Kindreds is for people.

   10a (step 5): under Settings in the Me tab's own stack (/me/write-to-us,
   was /write-to-us), on the theme, under the secondary header. The letter
   carries the version the footer of Settings shows: the store's label and
   the binary's own with its build (support needs the second). */

const VERSION = footerVersion(versionFacts());

export default function WriteToUs() {
  useLang();
  const { t: tk, dark } = useTheme();
  const safe = useSafeAreaInsets();
  const tabBar = useTabBarSpace();
  const router = useRouter();
  const wren = useWrenName();
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  /* the one filled button: the theme's ind, its label in the page colour */
  const solidBtn = { backgroundColor: tk.ind, paddingVertical: 15, alignItems: "center" } as const;
  const canSend = body.trim().length >= 2 && !sending;

  // VoiceOver hears a failed send (accessibilityLiveRegion on the line is Android's only); each
  // try clears `failed` first, so a second failure is said again
  useEffect(() => {
    if (failed && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(t("wu.fail"));
  }, [failed]);

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
      <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: safe.top, paddingBottom: tabBar }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 }}>
          <WrenBird size={64} mood="delight" />
          <Text style={{ fontSize: 24, fontWeight: "600", color: tk.ink, textAlign: "center", marginTop: 18 }}>{t("wu.taken")}</Text>
          <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 15, lineHeight: 23, color: tk.sub, textAlign: "center", marginTop: 12 }}>
            {speakAs(email.trim() ? t("wu.takenAddr") : t("wu.takenNoAddr"), wren)}
          </Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button" style={({ pressed }) => ({ ...solidBtn, alignSelf: "stretch", marginTop: 30, opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.8, color: tk.bg }}>{t("wu.done")}</Text>
          </Pressable>
        </View>
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: safe.top }}>
      <SecondaryHeader title={t("wu.title")} fallbackHref="/(tabs)/me/settings" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: tabBar + 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 16 }}>
            <WrenBird size={24} mood="listen" />
            <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 13.5, lineHeight: 20, color: tk.sub }}>{speakAs(t("wu.intro"), wren)}</Text>
          </View>

          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            autoFocus
            placeholder={t("wu.ph")}
            placeholderTextColor={tk.faint}
            selectionColor={tk.ind}
            keyboardAppearance={dark ? "dark" : "light"}
            style={{ ...fieldBox(body, 25, 320), borderBottomWidth: 1, borderBottomColor: tk.line, paddingTop: 10, paddingBottom: 10, fontSize: 17, lineHeight: 25, color: tk.ink }}
          />

          <Text style={{ fontFamily: PF.mono, fontSize: MONO.label, letterSpacing: 1.2, color: tk.mute, marginTop: 26 }}>{t("wu.addrLabel")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={t("wu.addrPh")}
            placeholderTextColor={tk.faint}
            selectionColor={tk.ind}
            keyboardAppearance={dark ? "dark" : "light"}
            style={{ borderBottomWidth: 1, borderBottomColor: tk.line, paddingVertical: 10, marginTop: 6, fontSize: 16, color: tk.ink }}
          />
          <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 12, lineHeight: 18, color: tk.mute, marginTop: 8 }}>{t("wu.addrHint")}</Text>

          {failed && (
            <Text accessibilityLiveRegion="polite" style={{ fontFamily: PF.mono, fontSize: MONO.title, letterSpacing: 1, color: dangerInk(tk.ink, P.post), marginTop: 16 }}>
              {t("wu.fail")}
            </Text>
          )}

          <Pressable
            onPress={send}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend, busy: sending }}
            style={({ pressed }) => ({ ...solidBtn, marginTop: 26, opacity: canSend ? (pressed ? 0.85 : 1) : 0.4 })}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.8, color: tk.bg }}>{sending ? "…" : t("wu.send", { wren: wren.toUpperCase() })}</Text>
          </Pressable>

          <Text style={{ fontFamily: PF.mono, fontSize: MONO.small, letterSpacing: 1, color: tk.mute, textAlign: "center", marginTop: 14 }}>{t("wu.travelsWith", { v: VERSION })}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
