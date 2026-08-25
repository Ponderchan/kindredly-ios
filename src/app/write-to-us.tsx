import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { P, PF, solidBtn } from "../theme/post";
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
          <WrenBird size={64} bare mood="delight" />
          <Text style={{ fontFamily: PF.letter, fontSize: 24, fontWeight: "600", color: P.ink, textAlign: "center", marginTop: 18 }}>
            She's taken it.
          </Text>
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 15, lineHeight: 23, color: P.ink60, textAlign: "center", marginTop: 12 }}>
            {speakAs(
              email.trim()
                ? "A person reads these — not a robot. You'll hear back at the address you left."
                : "A person reads these — not a robot. You didn't leave an address, so this one's a one-way flight.",
              wren,
            )}
          </Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ ...solidBtn, alignSelf: "stretch", marginTop: 30, opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.8, color: "#fff" }}>DONE</Text>
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
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>WRITE TO US</Text>
        <View style={{ width: 42 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 16 }}>
            <WrenBird size={24} bare mood="listen" />
            <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 13.5, lineHeight: 20, color: P.ink60 }}>
              {speakAs("Everyone else here gets a letter. So do we — tell us anything.", wren)}
            </Text>
          </View>

          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            autoFocus
            placeholder="write to us…"
            placeholderTextColor={P.ink40}
            style={{ ...fieldBox(body, 25, 320), borderBottomWidth: 1, borderBottomColor: P.ink12, paddingTop: 10, paddingBottom: 10, fontFamily: PF.letter, fontSize: 17, lineHeight: 25, color: P.ink }}
          />

          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40, marginTop: 26 }}>
            WHERE TO WRITE BACK — OPTIONAL
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="an address, if you want an answer"
            placeholderTextColor={P.ink40}
            style={{ borderBottomWidth: 1, borderBottomColor: P.ink12, paddingVertical: 10, marginTop: 6, fontFamily: PF.letter, fontSize: 16, color: P.ink }}
          />
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 12, lineHeight: 18, color: P.ink40, marginTop: 8 }}>
            Leave it blank and this stays anonymous, like everything else here — but then we can't write back.
          </Text>

          {failed && (
            <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1, color: P.post, marginTop: 16 }}>
              IT DIDN'T GO OUT. TRY AGAIN IN A MOMENT.
            </Text>
          )}

          <Pressable onPress={send} disabled={!canSend} style={({ pressed }) => ({ ...solidBtn, marginTop: 26, opacity: canSend ? (pressed ? 0.85 : 1) : 0.4 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.8, color: "#fff" }}>
              {sending ? "…" : `GIVE IT TO ${wren.toUpperCase()}`}
            </Text>
          </Pressable>

          <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: P.ink40, textAlign: "center", marginTop: 14 }}>
            KINDREDLY {VERSION} TRAVELS WITH IT
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
