import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { P, PF, panel } from "../theme/post";
import { useAuth } from "../lib/auth";
import { disableMorningKnock, enableMorningKnock, morningKnockEnabled } from "../lib/notify";

/* Settings — everything that isn't the profile itself, behind Me's gear. */

export default function Settings() {
  const auth = useAuth();
  const { handle, profile } = auth;
  const router = useRouter();
  const [knock, setKnock] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      morningKnockEnabled().then((on) => alive && setKnock(on));
      return () => {
        alive = false;
      };
    }, []),
  );

  const age = (() => {
    const dob = (profile?.dob as string) || "";
    const y = parseInt(dob.slice(0, 4), 10);
    if (!y) return null;
    const a = new Date().getFullYear() - y;
    return a >= 45 ? "45+" : a >= 35 ? "35–44" : a >= 25 ? "25–34" : "18–24";
  })();

  const editName = () => {
    Alert.prompt?.(
      "Your pen name",
      "Strangers never see it — only a kindred, after five letters.",
      async (next?: string) => {
        const n = (next || "").trim();
        if (!n || n === handle) return;
        const r = await auth.saveProfile({ handle: n });
        if ("error" in r) Alert.alert("Couldn't save", r.error);
      },
      "plain-text",
      handle,
    );
  };

  const onToggleKnock = async (want: boolean) => {
    if (want) {
      const ok = await enableMorningKnock();
      setKnock(ok);
      if (!ok) Alert.alert("Notifications are off", "Allow notifications for Kindredly in Settings, and Wren will knock at eight.");
    } else {
      await disableMorningKnock();
      setKnock(false);
    }
  };

  const onSignOut = async () => {
    await auth.signOut();
    router.replace("/onboarding");
  };

  const Row = ({ label, value, onPress, last }: { label: string; value?: string; onPress?: () => void; last?: boolean }) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 15,
        // no divider on the last row — the panel's own border is already there
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: P.ink12,
      }}
    >
      <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.ink }}>{label}</Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 14, color: P.ink40 }}>{value ?? "›"}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>SETTINGS</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* account */}
        <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1.4, color: P.ink40, marginBottom: 10 }}>ACCOUNT</Text>
        <View style={[panel, { paddingHorizontal: 18, paddingVertical: 2, marginBottom: 22 }]}>
          <Row label="Pen name" value={handle || "You"} onPress={editName} />
          {age && <Row label="Age" value={age} />}
          <Row label="Language" value="English" last />
        </View>

        {/* quiet */}
        <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1.4, color: P.ink40, marginBottom: 10 }}>THE QUIET</Text>
        <View style={[panel, { paddingHorizontal: 18, paddingVertical: 2, marginBottom: 22 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.ink }}>The 8 o'clock knock</Text>
              <Text style={{ fontFamily: PF.serifItalic, fontSize: 11.5, color: P.ink40, marginTop: 2 }}>
                One quiet knock when the Morning Page arrives. Nothing else, ever.
              </Text>
            </View>
            <Switch value={knock} onValueChange={onToggleKnock} trackColor={{ true: P.pen, false: "#D8D8D6" }} />
          </View>
          <Row label="Pages you've kept" onPress={() => router.push("/kept")} />
        </View>

        {/* safety */}
        <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1.4, color: P.ink40, marginBottom: 10 }}>SAFETY</Text>
        <View style={[panel, { paddingHorizontal: 18, paddingVertical: 2, marginBottom: 22 }]}>
          <Row label="Blocked & reported" />
          <Row label="Privacy" last />
        </View>

        <View style={[panel, { paddingHorizontal: 18, paddingVertical: 2 }]}>
          <Pressable onPress={onSignOut} style={{ paddingVertical: 15 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 15, color: "#B23838" }}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
