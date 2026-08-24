import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { P, PF, rule } from "../theme/post";
import { MosaicId } from "../components/MosaicId";
import { useWrenName } from "../lib/wren-name";
import { dLong } from "../lib/format";
import { fetchBlocks, unblockUser, type BlockRow } from "../lib/db";

/* Blocked & reported — the settings row that used to be a dead label.
   ────────────────────────────────────────────────────────────────────────
   The backend has had "read own blocks" and "remove own blocks" policies
   since 0004; nothing ever called them, so blocking was a door that locked
   and could never be unlocked. This is the other half of the mechanism —
   and the screen a reviewer goes looking for when they check that an
   anonymous-UGC app really lets people manage who can reach them.

   A blocked writer appears exactly as the reader knew them: the mosaic
   derived from their uuid, the same one that sat on their letters. No name,
   because there never was one.

   Reports are shown as an explanation, not a list — a report is a signal
   handed to the bird, not a case file the reporter owns. What matters to
   the person who filed one is what it DOES, so that's what the line says. */
export default function BlockedScreen() {
  const router = useRouter();
  const wren = useWrenName();
  const [rows, setRows] = useState<BlockRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void fetchBlocks().then((r) => {
        if (!alive) return;
        setRows(r || []);
        setLoaded(true);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const unblock = (b: BlockRow) =>
    Alert.alert("Let them back in?", "Their letters can reach you again, and yours can reach them.", [
      { text: "Keep them out", style: "cancel" },
      {
        text: "Unblock",
        onPress: async () => {
          const ok = await unblockUser(b.blocked);
          if (ok) setRows((r) => r.filter((x) => x.blocked !== b.blocked));
          else Alert.alert("Couldn't unblock", "Nothing changed — try again in a moment.");
        },
      },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2, color: P.ink }}>BLOCKED & REPORTED</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.2, color: P.ink40 }}>
          {loaded ? String(rows.length).padStart(2, "0") : "··"}
        </Text>
      </View>
      <View style={{ ...rule }} />

      {loaded && rows.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 22, lineHeight: 30, color: P.ink, textAlign: "center" }}>
            No one's shut out.
          </Text>
          <Text style={{ fontFamily: PF.mono, fontSize: 11, lineHeight: 18, color: P.ink60, textAlign: "center", marginTop: 12 }}>
            BLOCK A WRITER FROM ANY OF THEIR LETTERS
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {rows.map((b) => (
            <View
              key={b.blocked}
              style={{ backgroundColor: P.sheet, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center" }}
            >
              <MosaicId seed={b.blocked} cell={7} />
              <View style={{ flex: 1, paddingLeft: 14 }}>
                <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.8, color: P.ink40 }}>
                  BLOCKED {dLong(b.created_at).toUpperCase()}
                </Text>
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 12, color: P.ink60, marginTop: 3 }}>
                  Their letters don't reach you.
                </Text>
              </View>
              <Pressable onPress={() => unblock(b)} hitSlop={10} style={{ paddingVertical: 6, paddingLeft: 10 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.2, color: P.pen }}>UNBLOCK</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* what a report does — the part the reporter never sees */}
      <View style={{ paddingHorizontal: 26, paddingTop: 12, paddingBottom: 18, borderTopWidth: 1, borderTopColor: P.ink12 }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, lineHeight: 16, letterSpacing: 0.8, color: P.ink40, textAlign: "center" }}>
          REPORTS GO TO {wren.toUpperCase()} · THREE DIFFERENT READERS REPORTING ONE WRITER SILENCES THEM FOR EVERYONE
        </Text>
      </View>
    </SafeAreaView>
  );
}
