import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F, cardStyle } from "../theme/tokens";
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

  const Row = ({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.lineSoft }}
    >
      <Text style={{ fontFamily: F.sans, fontSize: 15, color: C.ink }}>{label}</Text>
      <Text style={{ fontFamily: F.sans, fontSize: 14, color: C.faint }}>{value ?? "›"}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 26, color: C.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: F.serif, fontSize: 19, color: C.ink }}>Settings</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* account */}
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: C.label, marginBottom: 10 }}>ACCOUNT</Text>
        <View style={[cardStyle, { paddingHorizontal: 18, paddingVertical: 2, marginBottom: 22 }]}>
          <Row label="Pen name" value={handle || "You"} onPress={editName} />
          {age && <Row label="Age" value={age} />}
          <Row label="Language" value="English" />
        </View>

        {/* quiet */}
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: C.label, marginBottom: 10 }}>THE QUIET</Text>
        <View style={[cardStyle, { paddingHorizontal: 18, paddingVertical: 2, marginBottom: 22 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.lineSoft }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontFamily: F.sans, fontSize: 15, color: C.ink }}>The 8 o'clock knock</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, marginTop: 2 }}>
                One quiet knock when the Morning Page arrives. Nothing else, ever.
              </Text>
            </View>
            <Switch value={knock} onValueChange={onToggleKnock} trackColor={{ true: C.purple, false: "#D8D8D6" }} />
          </View>
          <Row label="Pages you've kept" onPress={() => router.push("/kept")} />
        </View>

        {/* safety */}
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: C.label, marginBottom: 10 }}>SAFETY</Text>
        <View style={[cardStyle, { paddingHorizontal: 18, paddingVertical: 2, marginBottom: 22 }]}>
          <Row label="Blocked & reported" />
          <Row label="Privacy" />
        </View>

        <View style={[cardStyle, { paddingHorizontal: 18, paddingVertical: 2 }]}>
          <Pressable onPress={onSignOut} style={{ paddingVertical: 15 }}>
            <Text style={{ fontFamily: F.sansMed, fontSize: 15, color: "#B23838" }}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
