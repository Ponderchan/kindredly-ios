import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { t, useLang } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { MONO, PF } from "../theme/post";
import { Stamp } from "../components/Stamp";
import { STAMP_LADDER } from "../lib/stamp-frame";
import { getStamp } from "../data/stamps";
import { dLong } from "../lib/format";
import { deleteDraft, loadDrafts, type Draft } from "../lib/drafts";
import { BackChevron } from "../components/10a/BackChevron";

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
   an action, not only as a long press.

   The stamp a draft was given sits top-right at the ladder's draftsRow,
   30×36 (stamps v2, 2026-10-18), flat: it hasn't gone anywhere yet, so no
   tilt (it used to lean −4°) and no postmark. */
const DRAFT_STAMP = STAMP_LADDER.draftsRow;

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
      {/* a 52 bar under the safe area: the one BackChevron, then the title after its 12 + 36 + 8 */}
      <View style={{ height: 52, flexDirection: "row", alignItems: "center", paddingLeft: 56, paddingRight: 14 }}>
        <BackChevron onPress={() => router.back()} color={tk.ink} />
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
                  {st ? <Stamp id={d.stamp} width={DRAFT_STAMP.w} /> : null}
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
