import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F, cardStyle } from "../../theme/tokens";
import { Caps, ProgressBar } from "../../components/ui";
import { StrangerAvatar } from "../../components/StrangerAvatar";
import { PlushCelebration } from "../../components/PlushCelebration";
import { postNo } from "../../lib/format";
import { fetchThreads, type ThreadSummary } from "../../lib/db";

const REVEAL_AT = 5;

export default function KindredsTab() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchThreads().then((t) => {
        setThreads(t || []);
        setLoaded(true);
      });
    }, []),
  );

  const kindreds = threads.filter((t) => t.revealed);
  const becoming = threads.filter((t) => !t.revealed && t.mine > 0);
  const anything = kindreds.length > 0 || becoming.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 130, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontFamily: F.serif, fontSize: 30, color: C.ink, letterSpacing: -0.5 }}>Kindreds</Text>
        <Text style={{ fontFamily: F.sans, fontSize: 13.5, color: C.muted, marginTop: 4 }}>
          The strangers who became something.
        </Text>

        {kindreds.length > 0 && (
          <>
            <Caps style={{ marginTop: 28, marginBottom: 14 }}>NO LONGER STRANGERS</Caps>
            {kindreds.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/thread/${t.id}`)}
                style={({ pressed }) => [cardStyle, { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, marginBottom: 10, opacity: pressed ? 0.94 : 1 }]}
              >
                <StrangerAvatar seed={t.other} size={44} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontFamily: F.serif, fontSize: 17, color: C.ink }}>{t.otherName || `No. ${postNo(t.other)}`}</Text>
                    <Text style={{ fontSize: 13 }}>💜</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 5, marginTop: 8 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.purpleMid }} />
                    ))}
                  </View>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {becoming.length > 0 && (
          <>
            <Caps style={{ marginTop: 24, marginBottom: 14 }}>STILL STRANGERS</Caps>
            {becoming.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/thread/${t.id}`)}
                style={({ pressed }) => [cardStyle, { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, marginBottom: 10, opacity: pressed ? 0.94 : 1 }]}
              >
                <StrangerAvatar seed={t.other} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.serif, fontSize: 16, color: C.ink }}>No. {postNo(t.other)}</Text>
                  <View style={{ marginTop: 8 }}>
                    <ProgressBar pct={Math.min(100, (t.mine / REVEAL_AT) * 100)} height={3} />
                    <Text style={{ fontFamily: F.sans, fontSize: 10, color: C.faint, marginTop: 4 }}>
                      {Math.max(0, REVEAL_AT - t.mine)} more from you to names
                    </Text>
                  </View>
                </View>
                {!t.lastSenderMe && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.ember }} />}
              </Pressable>
            ))}
          </>
        )}

        {loaded && !anything && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
            <Svg width={200} height={130} viewBox="0 0 200 130">
              {[0, 1, 2, 3, 4].map((i) => (
                <Circle key={i} cx={26 + i * 38} cy={104 - i * 20} r={4.5} fill={C.purpleMid} opacity={0.9} />
              ))}
              <Path d="M26 104 L64 84 L102 64 L140 44 L178 24" fill="none" stroke={C.line} strokeWidth={1.6} strokeDasharray="4 4" />
            </Svg>
            <Text style={{ fontFamily: F.serif, fontSize: 22, color: C.ink, marginTop: 20, textAlign: "center" }}>
              Nobody knows your name yet.
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: 13.5, lineHeight: 21, color: C.muted, marginTop: 14, textAlign: "center", maxWidth: 280 }}>
              Write back and forth five times with someone, and Wren stops keeping your names from each other.
            </Text>
          </View>
        )}
      </ScrollView>
      <PlushCelebration kindreds={kindreds.length} />
    </SafeAreaView>
  );
}
