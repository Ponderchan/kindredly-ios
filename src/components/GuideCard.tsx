import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { GUIDE_HREF, reelOf } from "./guide-reel";
import { ReelSquare } from "./ReelSquare";
import { GUIDE_BY_ID, type GuideId } from "../data/guides";
import { PF, PFM } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { t, useLang } from "../lib/i18n";
import { useWrenName } from "../lib/wren-name";

/* A GUIDE, IN THE TRANSCRIPT — a big card that plays itself (owner,
   2026-10-11, after WhatsApp's channel cards: "大的清楚的动态演示"). On top a
   square reel: a few scenes, each a moving picture built from the
   product's own parts at full size, with a thin bar per scene showing
   where it is; tap the square to start it over. Under it the guide's title,
   the three lines it used to page through read as one paragraph, and a
   button to the place it just explained. The reel only runs while the
   room is on screen. */
export function GuideCard({ guide, onNotIt }: { guide: GuideId; onNotIt?: () => void }) {
  useLang();
  const P = useP();
  const T = useTheme().t;
  const wren = useWrenName();
  const router = useRouter();
  const g = GUIDE_BY_ID[guide];
  const reel = reelOf(guide);
  const body = g.frames.map((_, n) => t(`gd.${guide}.f${n + 1}`, { wren })).join(" ");
  return (
    <View style={{ marginTop: 6, marginBottom: 8 }}>
      <View style={{ maxWidth: 360, borderRadius: 18, backgroundColor: T.sf, borderWidth: 1, borderColor: P.ink12, overflow: "hidden" }}>
        <ReelSquare reel={reel} label={t(`gd.${guide}.title`)} />
        <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, gap: 6 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 17, fontWeight: "700", color: P.ink }}>{t(`gd.${guide}.title`)}</Text>
          <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 21, color: P.ink60 }}>{body}</Text>
        </View>
        <Pressable
          onPress={() => router.push(GUIDE_HREF[guide] as never)}
          accessibilityRole="button"
          style={({ pressed }) => ({ borderTopWidth: 1, borderTopColor: P.ink12, paddingVertical: 12, alignItems: "center", backgroundColor: pressed ? T.soft2 : T.sf })}
        >
          <Text style={{ fontFamily: PF.letter, fontSize: 15, fontWeight: "600", color: P.pen }}>{t(`gd.${guide}.cta`)}</Text>
        </Pressable>
      </View>
      {onNotIt && (
        <Pressable onPress={onNotIt} hitSlop={6} style={{ marginTop: 8, alignSelf: "flex-start" }}>
          <Text style={{ ...PFM.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.ink40 }}>
            {t("gd.notIt")} <Text style={{ color: P.pen, ...PFM.monoSemi }}>{t("gd.sendOn")} ›</Text>
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
  const P = useP();
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ ...PFM.monoMed, fontSize: 9, letterSpacing: 1.3, color: P.ink40, marginBottom: 8 }}>{t("gd.chips.head")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ids.map((id) => (
          <Pressable key={id} onPress={() => onPick(id)} style={({ pressed }) => ({ borderWidth: 1.5, borderColor: P.pen, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: P.penWash, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: P.pen }}>{t(`gd.${id}.title`)}</Text>
          </Pressable>
        ))}
        {more && onMore && (
          <Pressable onPress={onMore} style={({ pressed }) => ({ borderWidth: 1.5, borderColor: P.ink12, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: P.ink60 }}>{t("gd.chips.more")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
