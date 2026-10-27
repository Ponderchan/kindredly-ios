import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Reel } from "../guide-reel/kit";
import { ReelSquare } from "../ReelSquare";
import { useP, useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { PF } from "../../theme/post";
import { reel as v105 } from "./v1-0-5";

/* WHAT'S NEW, PLAYED WHERE IT'S SAID (owner, 2026-10-13: "1.0.4的时候一起发").
   A desk post can point at a release's reel with the link
   kindredly:///news/<App Store version>; this build plays the reels it
   ships with, right under the post. A post for a reel this build doesn't
   have shows only its words — and builds before 1.0.5 drop the link
   altogether (they keep http links only), so the words must stand alone.

   1.0.5 plays v1-0-5 (owner, 2026-10-25: every new part of it — Stamp
   Press, letter papers, the new identity, This or That, sky postcards, the
   font). 1.0.6 is the iOS 27 launch fix carrying the same features to
   everyone who missed 1.0.5, so its post plays the same reel.

   v1-0-4 is kept but plays nowhere: it was made for "1.0.4", the
   2026-10-15 hotfix took that number without its features, and they ship
   inside 1.0.5, whose reel this now is. Its pen-pal rows also draw
   "No. 4417" and mosaic faces, which the product no longer shows. */
/* a release's card, read as a guide card is (owner, 2026-10-25: "就这种大小的card 动画"): the
   reel, its title, one paragraph, and a button to the thing it shows first */
type News = { reel: Reel; title: string; body: string; cta: string; href: string };
const V105: News = { reel: v105, title: "nw105.card.title", body: "nw105.card.body", cta: "nw105.card.cta", href: "/stamp-press" };
const NEWS: Record<string, News> = {
  "1.0.5": V105,
  "1.0.6": V105,
};

export const newsReelOf = (id: string): Reel | null => NEWS[id]?.reel ?? null;

/** A release's card as the Swift room draws it (screens/wren-room/WrenRoomNative): its words'
    keys and where its button goes, or null for a reel this build doesn't ship. */
export const newsCardOf = (id: string): Omit<News, "reel"> | null => {
  const n = NEWS[id];
  return n ? { title: n.title, body: n.body, cta: n.cta, href: n.href } : null;
};

/** the id in a kindredly:///news/<id> link, or null */
export const newsIdOf = (link: string | null | undefined): string | null => {
  const m = (link || "").match(/^kindredly:\/\/\/?news\/([0-9][0-9.]*)$/);
  return m ? m[1] : null;
};

export function NewsCard({ id, label }: { id: string; label: string }) {
  useLang();
  const P = useP();
  const T = useTheme().t;
  const router = useRouter();
  const news = NEWS[id];
  if (!news) return null;
  // the guide card's frame, sizes and type, so a release reads as one of the guides (GuideCard)
  return (
    <View style={{ marginTop: 6, marginBottom: 8 }}>
      <View style={{ maxWidth: 360, borderRadius: 18, backgroundColor: T.sf, borderWidth: 1, borderColor: P.ink12, overflow: "hidden" }}>
        <ReelSquare reel={news.reel} label={label} />
        <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, gap: 6 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 17, fontWeight: "700", color: P.ink }}>{t(news.title)}</Text>
          <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 21, color: P.ink60 }}>{t(news.body)}</Text>
        </View>
        <Pressable
          onPress={() => router.push(news.href as never)}
          accessibilityRole="button"
          style={({ pressed }) => ({ borderTopWidth: 1, borderTopColor: P.ink12, paddingVertical: 12, alignItems: "center", backgroundColor: pressed ? T.soft2 : T.sf })}
        >
          <Text style={{ fontFamily: PF.letter, fontSize: 15, fontWeight: "600", color: P.pen }}>{t(news.cta)}</Text>
        </Pressable>
      </View>
    </View>
  );
}
