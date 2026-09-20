import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { GUIDE_BY_ID, type GuideId } from "../data/guides";
import { GuideArt } from "./GuideArt";
import { P, PF } from "../theme/post";
import { t, useLang } from "../lib/i18n";
import { useWrenName } from "../lib/wren-name";

/* A GUIDE, IN THE TRANSCRIPT — three frames you page through, each a
   moving picture over one line. It sits where her answer would, bordered
   like the things she leaves on the table, and it is finished when the
   last frame is; there is nothing to open. */
export function GuideCard({ guide, onNotIt }: { guide: GuideId; onNotIt?: () => void }) {
  useLang();
  const wren = useWrenName();
  const g = GUIDE_BY_ID[guide];
  const [w, setW] = useState(0);
  const [page, setPage] = useState(0);
  const ref = useRef<ScrollView>(null);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!w) return;
    setPage(Math.round(e.nativeEvent.contentOffset.x / w));
  };
  const go = (p: number) => {
    ref.current?.scrollTo({ x: p * w, animated: true });
    setPage(p);
  };
  const last = page >= g.frames.length - 1;
  return (
    <View style={{ marginTop: 4, marginBottom: 6 }}>
      <View style={{ borderWidth: 1, borderColor: P.ink12, backgroundColor: "#FFFFFF" }} onLayout={onLayout}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 13, paddingTop: 11, paddingBottom: 6 }}>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.3, color: P.ink40 }}>{t("gd.howTo")}</Text>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.3, color: P.ink, marginLeft: 6 }}>{t(`gd.${guide}.title`).toUpperCase()}</Text>
        </View>
        {w > 0 && (
          <ScrollView
            ref={ref}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            style={{ width: w - 2 }}
          >
            {g.frames.map((art, i) => (
              <View key={art} style={{ width: w - 2 }}>
                <View style={{ backgroundColor: P.penWash, marginHorizontal: 13 }}>
                  {/* frames off-screen do not animate: nine loops at once is a
                      battery, not a picture */}
                  {Math.abs(i - page) <= 1 ? <GuideArt art={art} /> : <View style={{ height: 150 }} />}
                </View>
                <Text style={{ fontFamily: PF.letter, fontSize: 15.5, lineHeight: 23, color: P.ink, paddingHorizontal: 13, paddingTop: 12, minHeight: 74 }}>
                  {t(`gd.${guide}.f${i + 1}`, { wren })}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 13, paddingBottom: 12, paddingTop: 4 }}>
          <View style={{ flexDirection: "row", gap: 5 }}>
            {g.frames.map((_, i) => (
              <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === page ? P.pen : "#E4E1FA" }} />
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => go(last ? 0 : page + 1)} hitSlop={8}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.2, color: P.pen }}>{last ? t("gd.again") : `${t("gd.next")} ›`}</Text>
          </Pressable>
        </View>
      </View>
      {onNotIt && (
        <Pressable onPress={onNotIt} hitSlop={6} style={{ marginTop: 8, alignSelf: "flex-start" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.ink40 }}>
            {t("gd.notIt")} <Text style={{ color: P.pen, fontFamily: PF.monoSemi }}>{t("gd.sendOn")} ›</Text>
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/* the row of chips under the transcript — how the guides are found
   without typing */
export function GuideChips({ ids, onPick, more, onMore }: { ids: GuideId[]; onPick: (g: GuideId) => void; more?: boolean; onMore?: () => void }) {
  useLang();
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.3, color: P.ink40, marginBottom: 8 }}>{t("gd.chips.head")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ids.map((id) => (
          <Pressable key={id} onPress={() => onPick(id)} style={({ pressed }) => ({ borderWidth: 1.5, borderColor: P.pen, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: P.penWash, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1, color: P.pen }}>{t(`gd.${id}.title`).toUpperCase()}</Text>
          </Pressable>
        ))}
        {more && onMore && (
          <Pressable onPress={onMore} style={({ pressed }) => ({ borderWidth: 1.5, borderColor: P.ink12, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1, color: P.ink60 }}>{t("gd.chips.more")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
