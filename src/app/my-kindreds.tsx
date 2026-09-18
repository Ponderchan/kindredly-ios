import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { P, PF } from "../theme/post";
import { W14, cardShadow } from "../components/AuraCard";
import { AvatarImage } from "../components/AvatarImage";
import { t, useLang } from "../lib/i18n";
import { fetchThreads, type ThreadSummary } from "../lib/db";

/* YOUR KINDREDS — the owner's numbered sheet. Every correspondence is a
   numbered card, KINDRED No.01, No.02…, in the order they started. Named
   ones wear a green band: face with a check, name, five green dots (five
   letters each way), their last line, and a chat button. The ones still
   anonymous are dashed: a ?, "Still a stranger", the dots filled as far as
   they have come. The rule is one line at the bottom. */

const EACH_WAY = 5;
const GREEN = "#1F5C33";
const GREEN_SOFT = "#7CC58F";

const bandDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()} ${String(d.getDate()).padStart(2, "0")} ${d.getFullYear()}`;
};

function Dots({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {Array.from({ length: EACH_WAY }, (_, i) => (
        <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i < n ? GREEN_SOFT : "#DCD9F0" }} />
      ))}
    </View>
  );
}

function ChatButton({ live, alert, onPress }: { live: boolean; alert: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!live} hitSlop={6} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, backgroundColor: live ? "#EEEDFB" : "#F1F0F8", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={live ? P.pen : "#C9C5E6"} strokeWidth={1.8} strokeLinejoin="round">
        <Path d="M4 5h16v11H9l-5 4V5z" />
      </Svg>
      {alert && <View style={{ position: "absolute", top: -4, right: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E5484D", borderWidth: 2, borderColor: "#FFFFFF" }} />}
    </Pressable>
  );
}

export default function MyKindreds() {
  useLang();
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchThreads().then((th) => alive && setThreads(th || []));
    return () => {
      alive = false;
    };
  }, []);

  // numbered in the order the correspondences began — named first, the rest after
  const list = useMemo(() => {
    const all = (threads ?? []).filter((th) => !th.gone);
    const named = all.filter((th) => th.revealed).sort((a, b) => (a.revealedAt ?? a.lastAt) - (b.revealedAt ?? b.lastAt));
    const anon = all.filter((th) => !th.revealed).sort((a, b) => Math.min(b.mine, b.theirs) - Math.min(a.mine, a.theirs) || b.lastAt - a.lastAt);
    return [...named, ...anon];
  }, [threads]);
  const namedCount = list.filter((th) => th.revealed).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 4, height: 48 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 24, color: W14.ink }}>‹</Text>
        </Pressable>
        <Text style={{ flex: 1, fontFamily: PF.letter, fontWeight: "700", fontSize: 22, letterSpacing: -0.5, color: W14.ink }}>{t("mk.title")}</Text>
        <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 22, letterSpacing: -0.5, color: W14.ink, marginRight: 8 }}>{namedCount}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 4, paddingBottom: 40, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: PF.letter, fontSize: 13.5, lineHeight: 19, color: "rgba(30,27,53,0.65)", marginBottom: 14 }}>{t("mk.lede")}</Text>

        {threads && list.length === 0 && <Text style={{ fontFamily: PF.letter, fontSize: 13.5, color: "rgba(30,27,53,0.55)", marginTop: 20 }}>{t("mk.anonNone")}</Text>}

        {list.map((th, i) => {
          const no = String(i + 1).padStart(2, "0");
          const each = Math.min(th.mine, th.theirs);
          if (th.revealed) {
            return (
              <View key={th.id} style={[{ backgroundColor: W14.card, borderRadius: 16, overflow: "hidden", marginBottom: 12 }, cardShadow, { shadowOpacity: 0.05 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: GREEN, paddingHorizontal: 14, paddingVertical: 7 }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: "#FFFFFF" }}>{t("mk.no", { n: no })}</Text>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: "#FFFFFF" }}>{bandDate(th.revealedAt ?? th.lastAt)}</Text>
                </View>
                <Pressable onPress={() => router.push(`/room/${th.id}`)} style={({ pressed }) => ({ padding: 14, opacity: pressed ? 0.94 : 1 })}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 56, height: 56 }}>
                      <AvatarImage id={th.otherFace ?? null} seed={th.other} size={52} />
                      <View style={{ position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: "#2E7D4F", borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                        <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M5 12l5 5 9-10" />
                        </Svg>
                      </View>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 20, letterSpacing: -0.4, color: W14.ink }} numberOfLines={1}>{th.otherName}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <Dots n={Math.min(each, EACH_WAY)} />
                        <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: "#2E7D4F" }}>{t("mk.eachWayCaps", { n: each })}</Text>
                      </View>
                    </View>
                    <ChatButton live alert={!th.lastSenderMe} onPress={() => router.push(`/room/${th.id}`)} />
                  </View>
                  {!!th.preview && (
                    <View style={{ backgroundColor: "#F6F5FD", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 }}>
                      <Text style={{ fontFamily: PF.letterSerif, fontStyle: "italic", fontSize: 13.5, lineHeight: 19, color: "rgba(30,27,53,0.75)" }} numberOfLines={2}>
                        “{th.preview}”
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          }
          return (
            <Pressable key={th.id} onPress={() => router.push(`/chat/${th.id}`)} style={({ pressed }) => ({ borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#C9C5E6", overflow: "hidden", marginBottom: 12, opacity: pressed ? 0.85 : 1 })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#E4E1FA", paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: "rgba(30,27,53,0.6)" }}>{t("mk.no", { n: no })}</Text>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: "rgba(30,27,53,0.6)" }}>{t("mk.notYet")}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#B9B4F0", backgroundColor: "#EEEDFB", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: PF.mono, fontSize: 15, color: "rgba(30,27,53,0.55)" }}>?</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 18, letterSpacing: -0.3, color: "rgba(30,27,53,0.55)" }}>{t("mk.stranger")}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <Dots n={Math.min(each, EACH_WAY)} />
                    <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: "rgba(30,27,53,0.55)" }}>{t("mk.ofFive", { n: each })}</Text>
                  </View>
                </View>
                <ChatButton live={false} alert={false} />
              </View>
            </Pressable>
          );
        })}

        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN_SOFT, marginTop: 5 }} />
          <Text style={{ flex: 1, fontFamily: PF.letter, fontSize: 12.5, lineHeight: 17, color: "rgba(30,27,53,0.65)" }}>{t("mk.rule")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
