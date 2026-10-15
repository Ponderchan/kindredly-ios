import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { MONO, PF } from "../theme/post";
import { StampTile } from "../components/StampTile";
import { getStamp } from "../data/stamps";
import { dLong } from "../lib/format";
import { deleteDraft, loadDrafts, type Draft } from "../lib/drafts";
import "../data/strings-step5-kitrn"; // a11y.back

/* Unsent — the letters you started and didn't send.
   ────────────────────────────────────────────────────────────────────────
   lib/drafts has existed since the port and NOTHING EVER LISTED IT. The
   letter desk could save a draft and could resume one by id, but no screen
   ever showed you the ids, so "save as draft" wrote into a place you could
   not reach. A save with no way back is worse than no save at all: it tells
   you the words are kept and then keeps them from you.

   It's a desk with pages on it, like Sealed — same rule, and these are the
   most literally unfinished pages in the product. Opening one hands it back
   to the letter desk with its stamp and its spark intact; the draft is only
   deleted once that letter actually goes (or the writer discards it there).

   10a: drawn from the theme (owner: every page follows the theme) — the
   page on bg, each draft a card face (sf) edged in line, the words ink and
   the dates mute — with the mono labels at 9 / 10 / 11. No 10a drawing
   exists for it, so its shape stays. Each card says what it is to
   VoiceOver (its date and its first words) and offers throwing it away as
   an action, not only as a long press. */
export default function DraftsScreen() {
  useLang();
  const router = useRouter();
  const { t: tk } = useTheme();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadDrafts().then((d) => {
        if (!alive) return;
        setDrafts(d);
        setLoaded(true);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const remove = (d: Draft) =>
    Alert.alert(t("dr.throwTitle"), t("dr.throwBody"), [
      { text: t("dr.keep"), style: "cancel" },
      {
        text: t("dr.throw"),
        style: "destructive",
        onPress: async () => setDrafts(await deleteDraft(d.id)),
      },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.back")}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 6l-7 6 7 6" stroke={tk.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text accessibilityRole="header" style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.8, color: tk.ink }}>
          {t("dr.title")}
        </Text>
        <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, letterSpacing: 1.2, color: tk.mute }}>
          {loaded ? String(drafts.length).padStart(2, "0") : "··"}
        </Text>
      </View>
      <View style={{ borderBottomWidth: 1, borderBottomColor: tk.line }} />

      {loaded && drafts.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 22, lineHeight: 30, color: tk.ink, textAlign: "center" }}>{t("dr.emptyTitle")}</Text>
          <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, lineHeight: 18, color: tk.sub, textAlign: "center", marginTop: 12 }}>
            {t("dr.emptyBody")}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {drafts.map((d) => {
            const st = getStamp(d.stamp);
            const date = dLong(d.date).toUpperCase();
            const words = d.body.trim();
            return (
              <Pressable
                key={d.id}
                onPress={() => router.push({ pathname: "/compose", params: { draft: d.id } })}
                onLongPress={() => remove(d)}
                accessibilityRole="button"
                accessibilityLabel={`${date}. ${words}`}
                accessibilityActions={[{ name: "throw", label: t("dr.throw") }]}
                onAccessibilityAction={(e) => {
                  if (e.nativeEvent.actionName === "throw") remove(d);
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? tk.soft2 : tk.sf,
                  borderWidth: 1,
                  borderColor: tk.line,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <Text style={{ flex: 1, fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 0.8, color: tk.mute }}>{date}</Text>
                  {st ? (
                    <View style={{ transform: [{ rotate: "-4deg" }] }}>
                      <StampTile id={d.stamp} w={34} r={4} />
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={4} style={{ fontSize: 17, lineHeight: 25, color: tk.ink, marginTop: 12 }}>
                  {words}
                </Text>
              </Pressable>
            );
          })}
          <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 0.8, color: tk.mute, textAlign: "center", marginTop: 10 }}>{t("dr.hint")}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
