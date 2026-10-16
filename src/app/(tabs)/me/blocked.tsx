import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { t, useLang } from "../../../lib/i18n";
import { MONO, PF } from "../../../theme/post";
import { useTheme } from "../../../lib/theme";
import { MosaicId } from "../../../components/MosaicId";
import { SecondaryHeader } from "../../../components/10a";
import { useTabBarSpace } from "../../../components/NativeTabBar";
import { useWrenName } from "../../../lib/wren-name";
import { dLong, postNo } from "../../../lib/format";
import { fetchBlocks, unblockUser, type BlockRow } from "../../../lib/db";
import "../../../data/strings-step5-settings";

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
   the person who filed one is what it DOES, so that's what the line says.

   10a (step 5): under Settings in the Me tab's own stack (/me/blocked, was
   /blocked), on the theme. A list that didn't load says so (bl.loadFail,
   tap to try again) — it used to say "No one's shut out." when the read
   failed, which tells someone with blocks that they have none. */

type Load = "loading" | "ok" | "failed";

export default function BlockedScreen() {
  useLang();
  const { t: tk } = useTheme();
  const safe = useSafeAreaInsets();
  const tabBar = useTabBarSpace();
  const wren = useWrenName();
  const [rows, setRows] = useState<BlockRow[]>([]);
  const [load, setLoad] = useState<Load>("loading");
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void fetchBlocks().then((r) => {
        if (!alive) return;
        if (r) {
          setRows(r);
          setLoad("ok");
        } else {
          // the rows already shown stay; an empty page says it didn't load, never "no one"
          setLoad((was) => (was === "ok" ? "ok" : "failed"));
        }
      });
      return () => {
        alive = false;
      };
    }, [attempt]),
  );

  const unblock = (b: BlockRow) =>
    Alert.alert(t("bl.letBackTitle"), t("bl.letBackBody"), [
      { text: t("bl.keepOut"), style: "cancel" },
      {
        text: t("bl.unblockAction"),
        onPress: async () => {
          const ok = await unblockUser(b.blocked);
          if (ok) setRows((r) => r.filter((x) => x.blocked !== b.blocked));
          else Alert.alert(t("bl.fail"), t("bl.failBody"));
        },
      },
    ]);

  const count = load === "ok" ? String(rows.length).padStart(2, "0") : "··";

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: safe.top }}>
      <SecondaryHeader
        title={t("bl.title")}
        fallbackHref="/(tabs)/me/settings"
        right={
          <Text accessibilityLabel={load === "ok" ? String(rows.length) : undefined} style={{ fontFamily: PF.monoMed, fontSize: MONO.title, letterSpacing: 1.2, color: tk.mute, minWidth: 36, textAlign: "right" }}>
            {count}
          </Text>
        }
      />

      {load === "failed" ? (
        <Pressable onPress={() => setAttempt((n) => n + 1)} accessibilityRole="button" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 16, lineHeight: 23, color: tk.sub, textAlign: "center" }}>{t("bl.loadFail")}</Text>
        </Pressable>
      ) : load === "ok" && rows.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 22, lineHeight: 30, color: tk.ink, textAlign: "center" }}>{t("bl.emptyTitle")}</Text>
          <Text style={{ fontFamily: PF.mono, fontSize: MONO.title, lineHeight: 18, color: tk.sub, textAlign: "center", marginTop: 12 }}>{t("bl.emptyBody")}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }} showsVerticalScrollIndicator={false}>
          {rows.map((b) => (
            <View key={b.blocked} style={{ backgroundColor: tk.soft, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center" }}>
              <MosaicId seed={b.blocked} cell={7} />
              <View style={{ flex: 1, paddingLeft: 14 }}>
                {/* face AND number, always the pair — faces alone collide
                    (~25k of them); the pair space is ~300M. Without the
                    number, a twin face here reads as "they're back". */}
                <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1, color: tk.ink }}>NO. {postNo(b.blocked)}</Text>
                <Text style={{ fontFamily: PF.mono, fontSize: MONO.label, letterSpacing: 0.8, color: tk.mute, marginTop: 3 }}>{t("bl.blockedOn", { day: dLong(b.created_at).toUpperCase() })}</Text>
                <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 12, color: tk.sub, marginTop: 3 }}>{t("bl.noReach")}</Text>
              </View>
              <Pressable onPress={() => unblock(b)} hitSlop={10} accessibilityRole="button" style={{ paddingVertical: 6, paddingLeft: 10 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.2, color: tk.ind }}>{t("bl.unblock")}</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* what a report does — the part the reporter never sees */}
      <View style={{ paddingHorizontal: 26, paddingTop: 12, paddingBottom: tabBar + 6, borderTopWidth: 1, borderTopColor: tk.line }}>
        <Text style={{ fontFamily: PF.mono, fontSize: MONO.label, lineHeight: 16, letterSpacing: 0.8, color: tk.mute, textAlign: "center" }}>{t("bl.footer", { wren: wren.toUpperCase() })}</Text>
      </View>
    </View>
  );
}
