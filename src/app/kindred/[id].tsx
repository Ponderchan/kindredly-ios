import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { P, PF, panel, rule, solidBtn } from "../../theme/post";
import { AvatarImage } from "../../components/AvatarImage";
import { MosaicId } from "../../components/MosaicId";
import { ReportMenu } from "../../components/ReportMenu";
import { StampTile } from "../../components/StampTile";
import { getStamp } from "../../data/stamps";
import { dLong } from "../../lib/format";
import { fetchThreadMessages, type ThreadDetail } from "../../lib/db";

/* A kindred's page — the room behind the name.
   ────────────────────────────────────────────────────────────────────────
   Before reveal there is deliberately NO page: a stranger is their letters
   and nothing else, and No. 8434 having a profile would undo the whole
   point. This screen is part of what two signatures buy.

   It only shows what is true and already ours: the face they gave (or the
   mosaic, if they gave their name only), how long the correspondence has
   run, how many letters each way, the stamp it started under, and the
   letter that started it. No feeds, no fields, no empty shelves promising
   furniture — when the shared play (crossed letters, the pair card) is
   built, it moves in HERE. Until then the room is small and honest.

   Report/block stays reachable on a person page — intimacy is exactly
   where safety tools must not disappear. */
export default function KindredScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ThreadDetail | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!id) return;
        if (__DEV__ && id.startsWith("demo-")) {
          const { DEMO_DETAILS } = await import("../../data/demo");
          if (alive) setDetail(DEMO_DETAILS[id] ?? null);
          return;
        }
        const d = await fetchThreadMessages(id);
        if (alive) setDetail(d);
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  const name = detail?.otherName || "A kindred";
  const letters = (detail?.myCount ?? 0) + (detail?.otherCount ?? 0);
  const st = detail ? getStamp(detail.stamp) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2, color: P.ink }}>A KINDRED</Text>
        <ReportMenu targetUser={detail?.other} context="thread" refId={id} snapshot={detail?.opening} onBlocked={() => router.back()} />
      </View>
      <View style={{ ...rule }} />

      {detail && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* who they are — the face they gave, beside the one you watched develop */}
          <View style={{ backgroundColor: P.sheet, padding: 20, marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              {detail.otherFace ? (
                <AvatarImage id={detail.otherFace} seed={detail.other} size={64} />
              ) : (
                <MosaicId seed={detail.other} cell={9} gap={2.4} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: PF.letter, fontSize: 28, fontWeight: "600", color: P.ink }}>{name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7 }}>
                  <MosaicId seed={detail.other} cell={3} gap={1} />
                  <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1, color: P.ink40 }}>
                    THE FACE YOU WATCHED ARRIVE
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* the correspondence, as facts */}
          <View style={[panel, { paddingHorizontal: 18, paddingVertical: 4, marginBottom: 14 }]}>
            {detail.since ? (
              <Row label="Corresponding since" value={dLong(detail.since)} />
            ) : null}
            <Row label="Letters" value={`${letters} — ${detail.myCount} yours · ${detail.otherCount} theirs`} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11 }}>
              <Text style={{ fontFamily: PF.mono, fontSize: 14.5, color: P.ink }}>Began under</Text>
              {st ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.ink60 }}>{st.name.en}</Text>
                  <View style={{ transform: [{ rotate: "-4deg" }] }}>
                    <StampTile id={detail.stamp} w={30} r={4} />
                  </View>
                </View>
              ) : (
                <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.ink40 }}>—</Text>
              )}
            </View>
          </View>

          {/* the letter that started it */}
          {!!detail.opening && (
            <View style={{ backgroundColor: P.sheet, padding: 18, marginBottom: 18 }}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>WHERE IT BEGAN</Text>
              <Text numberOfLines={5} style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink, marginTop: 10 }}>
                {detail.opening}
              </Text>
              <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1, color: P.ink40, marginTop: 10 }}>
                {detail.openingFromMe ? "YOU WROTE FIRST" : `${name.toUpperCase()} WROTE FIRST`}
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ ...solidBtn, opacity: pressed ? 0.85 : 1 })}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.8, color: "#fff" }}>
              WRITE TO {name.toUpperCase()}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
      <Text style={{ fontFamily: PF.mono, fontSize: 14.5, color: P.ink }}>{label}</Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.ink60 }}>{value}</Text>
    </View>
  );
}
