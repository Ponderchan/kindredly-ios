import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { MONO, PF } from "../theme/post";
import { useLetterFamily, useTheme } from "../lib/theme";
import { BRAND, type ThemeTokens } from "../theme/themes";
import { AvatarImage } from "../components/AvatarImage";
import { SecondaryHeader } from "../components/10a/SecondaryHeader";
import { t, useLang } from "../lib/i18n";
import { localeTag } from "../lib/format";
import { fetchThreads, readThreadsCache, type ThreadSummary } from "../lib/db";

/* YOUR KINDREDS — the owner's numbered sheet. Every correspondence is a
   numbered card, KINDRED No.01, No.02…, in the order they started. Named
   ones wear a green band: face with a check, name, five green dots (five
   letters each way), their last line, and a chat button. The ones still
   anonymous are dashed: a ?, "Still a stranger", the dots filled as far as
   they have come. The rule is one line at the bottom.

   10a: on the theme, under the secondary page's header (KINDREDS, the
   named count on the right). The courier's green band and the green dots
   are brand colours, the same in every theme; the cards, the dashed
   strangers and the chat keys are the theme's. The band's date is in the
   reader's language (it was always American English). Their last line is
   their letter, so it takes the reader's Letter font. The kept list shows
   at once, then the fresh one; a failed read keeps what was shown. */

const EACH_WAY = 5;
const GREEN = BRAND.courierGreen;
const GREEN_TEXT = BRAND.greenText;
const GREEN_SOFT = "#7CC58F"; // a lit dot: the courier's green, light enough to read on any card

/* the band's date, in ONE call, so each language orders and marks it its
   own way (ja and ko with their year, month and day signs, de "05. OKT.
   2026") — it used to glue a localised month into the American order,
   which read "10月 05 2026" in Japanese */
const bandDate = (ms: number) => {
  const locale = localeTag();
  return new Date(ms).toLocaleDateString(locale, { year: "numeric", month: "short", day: "2-digit" }).toLocaleUpperCase(locale);
};

function Dots({ n, tk }: { n: number; tk: ThemeTokens }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {Array.from({ length: EACH_WAY }, (_, i) => (
        <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i < n ? GREEN_SOFT : tk.line }} />
      ))}
    </View>
  );
}

function ChatButton({ live, alert, onPress, tk }: { live: boolean; alert: boolean; onPress?: () => void; tk: ThemeTokens }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!live}
      hitSlop={6}
      accessibilityElementsHidden={!live}
      importantForAccessibility={live ? "auto" : "no-hide-descendants"}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, backgroundColor: live ? tk.lav2 : tk.soft2, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={live ? tk.ind : tk.faint} strokeWidth={1.8} strokeLinejoin="round">
        <Path d="M4 5h16v11H9l-5 4V5z" />
      </Svg>
      {alert && <View style={{ position: "absolute", top: -4, right: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: BRAND.postRed, borderWidth: 2, borderColor: tk.sf }} />}
    </Pressable>
  );
}

export default function MyKindreds() {
  useLang();
  const router = useRouter();
  const { t: tk } = useTheme();
  const quote = useLetterFamily(true);
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);

  useEffect(() => {
    let alive = true;
    readThreadsCache().then((c) => alive && c && setThreads((cur) => cur ?? c));
    // a failed read (null) keeps what was shown
    fetchThreads().then((th) => alive && (th ? setThreads(th) : setThreads((cur) => cur ?? [])));
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
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }} edges={["top"]}>
      <SecondaryHeader
        title={t("mk.title").toLocaleUpperCase()}
        fallbackHref="/(tabs)/me"
        right={threads ? <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, letterSpacing: 1.1, color: tk.mute, paddingHorizontal: 4 }}>{namedCount}</Text> : undefined}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: PF.letterSerif, fontSize: 14, lineHeight: 20, color: tk.sub, marginBottom: 14 }}>{t("mk.lede")}</Text>

        {threads && list.length === 0 && <Text style={{ fontSize: 13.5, color: tk.mute, marginTop: 20 }}>{t("mk.anonNone")}</Text>}

        {list.map((th, i) => {
          const no = String(i + 1).padStart(2, "0");
          const each = Math.min(th.mine, th.theirs);
          if (th.revealed) {
            return (
              <View key={th.id} style={{ backgroundColor: tk.sf, borderRadius: 16, borderWidth: 1.5, borderColor: tk.line, overflow: "hidden", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: GREEN, paddingHorizontal: 14, paddingVertical: 7 }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: 1.6, color: BRAND.paperWhite }}>{t("mk.no", { n: no })}</Text>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: 1.6, color: BRAND.paperWhite }}>{bandDate(th.revealedAt ?? th.lastAt)}</Text>
                </View>
                <Pressable onPress={() => router.push(`/room/${th.id}`)} style={({ pressed }) => ({ padding: 14, opacity: pressed ? 0.94 : 1 })}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 56, height: 56 }}>
                      <AvatarImage id={th.otherFace ?? null} seed={th.other} size={52} />
                      <View style={{ position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: GREEN_TEXT, borderWidth: 2, borderColor: tk.sf, alignItems: "center", justifyContent: "center" }}>
                        <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={BRAND.paperWhite} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M5 12l5 5 9-10" />
                        </Svg>
                      </View>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 20, fontWeight: "600", letterSpacing: -0.3, color: tk.ink }} numberOfLines={1}>
                        {th.otherName}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <Dots n={Math.min(each, EACH_WAY)} tk={tk} />
                        <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: 1.4, color: tk.dark ? GREEN_SOFT : GREEN_TEXT }}>{t("mk.eachWayCaps", { n: each })}</Text>
                      </View>
                    </View>
                    <ChatButton live alert={!th.lastSenderMe} onPress={() => router.push(`/room/${th.id}`)} tk={tk} />
                  </View>
                  {!!th.preview && (
                    <View style={{ backgroundColor: tk.soft2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 }}>
                      <Text style={[{ fontSize: 13.5, lineHeight: 19, color: tk.sub }, quote]} numberOfLines={2}>
                        “{th.preview}”
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          }
          return (
            <Pressable key={th.id} onPress={() => router.push(`/chat/${th.id}`)} style={({ pressed }) => ({ borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: tk.faint, overflow: "hidden", marginBottom: 12, opacity: pressed ? 0.85 : 1 })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: tk.lav, paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: 1.6, color: tk.sub }}>{t("mk.no", { n: no })}</Text>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: 1.6, color: tk.sub }}>{t("mk.notYet")}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderStyle: "dashed", borderColor: tk.faint, backgroundColor: tk.lav2, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: PF.monoMed, fontSize: 15, color: tk.mute }}>?</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 18, fontWeight: "600", letterSpacing: -0.3, color: tk.mute }}>{t("mk.stranger")}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <Dots n={Math.min(each, EACH_WAY)} tk={tk} />
                    <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: 1.4, color: tk.mute }}>{t("mk.ofFive", { n: each })}</Text>
                  </View>
                </View>
                <ChatButton live={false} alert={false} tk={tk} />
              </View>
            </Pressable>
          );
        })}

        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN_SOFT, marginTop: 5 }} />
          <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 17, color: tk.sub }}>{t("mk.rule")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
