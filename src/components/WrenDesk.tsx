import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { WrenBird } from "./WrenBird";
import { cardShadow } from "./AuraCard";
import { P, PF } from "../theme/post";
import { getLang, t, useLang } from "../lib/i18n";
import { sinceShort, listWhen } from "../lib/format";
import { readRoomSeen } from "../lib/room-seen";
import { setDeskWaiting } from "../lib/waiting";
import { DEMO_WREN_POSTS } from "../data/demo";
import { DEMO_TEXT, storeMode } from "../lib/dev-store";
import { OFFICIAL_NAME, WREN_ROOM, fetchWrenPosts, postText, readPostsCache, wrenUnread, type WrenPost } from "../lib/wren-desk";

/* THE OFFICIAL BIRD — the courier as everyone has her, in a ring, with the
   mark that says this account is the product's own. Skin is pinned to the
   default look on purpose: your Wren wears the coat you gave her, this one
   is the one on the box. The mark is the kindreds' green tick in pen blue
   — same shape, so it reads as "verified" the way the phone already taught
   it, in the colour this app uses for the system speaking. */
export function OfficialBird({ size = 52, mood = "content" as const }: { size?: number; mood?: "content" | "curious" | "delight" }) {
  const badge = Math.max(16, Math.round(size * 0.34));
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#F3F2FA", borderWidth: 1, borderColor: P.ink12, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <WrenBird size={Math.round(size * 0.62)} mood={mood} skin="sticker" accessory="none" />
      </View>
      <View style={{ position: "absolute", right: -1, bottom: -1 }}>
        <OfficialMark size={badge} />
      </View>
    </View>
  );
}

export function OfficialMark({ size = 16 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: P.pen, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
      <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 12l5 5 9-10" />
      </Svg>
    </View>
  );
}

/* HER ROW — pinned above everything on Kindreds, for everyone, always.
   The one account nobody has to earn: no ring, no count to five, and it
   is there for a guest on the first launch. It reads like the rows under
   it (name, last line, when) so it sits with them, and the mark says why
   it is first. */
/* inList (the Kindreds list, owner 2026-10-10): the first row of the paper,
   pinned — no card of her own, square marks like every other row; onUnread
   lets the list mark the ALL tab while a post of hers is unopened. */
export function WrenDeskRow({ inList = false, onUnread }: { inList?: boolean; onUnread?: (n: number) => void } = {}) {
  const router = useRouter();
  useLang();
  const [posts, setPosts] = useState<WrenPost[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(() => {
    let alive = true;
    const settle = (p: WrenPost[]) => {
      if (!alive) return;
      setPosts(p);
      readRoomSeen().then((l) => {
        if (!alive) return;
        const n = wrenUnread(l, p.length);
        setUnread(n);
        onUnread?.(n);
        setDeskWaiting(n); // the tab's number counts her desk too
      });
    };
    if (__DEV__ && storeMode) {
      settle([{ ...DEMO_WREN_POSTS[0], body: DEMO_TEXT[getLang()].welcome, at: new Date(Date.now() - 2 * 3600_000).toISOString() }]);
      return () => {
        alive = false;
      };
    }
    readPostsCache().then((c) => c.length && settle(c));
    fetchWrenPosts().then((p) => {
      if (p) settle(p);
      else if (__DEV__) settle(DEMO_WREN_POSTS);
    });
    return () => {
      alive = false;
    };
  }, []);
  useFocusEffect(load);

  const last = posts[posts.length - 1];
  const ago = last ? (inList ? listWhen(last.at) : sinceShort(last.at)) : "";
  return (
    <Pressable
      onPress={() => router.push(`/room/${WREN_ROOM}`)}
      accessibilityRole="button"
      style={({ pressed }) =>
        inList
          ? { paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: P.ink, opacity: pressed ? 0.6 : 1 }
          : [{ backgroundColor: "#FFFFFF", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 2, opacity: pressed ? 0.85 : 1 }, cardShadow, { shadowOpacity: 0.05 }]
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <OfficialBird size={inList ? 42 : 44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 15, color: P.ink }}>{OFFICIAL_NAME}</Text>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.2, color: P.pen }}>{t("wo.tag").toUpperCase()}</Text>
            <View style={{ flex: 1 }} />
            {/* the time since her last post — or, while one is unopened, NEW */}
            {unread > 0 ? (
              <View style={{ backgroundColor: P.ink, paddingHorizontal: 7, paddingVertical: 2, borderRadius: inList ? 0 : 999 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.2, color: "#FFFFFF" }}>{t("wo.new")}</Text>
              </View>
            ) : (
              !!ago && <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 0.6, color: P.ink40 }}>{ago}</Text>
            )}
          </View>
          <Text numberOfLines={1} style={{ fontFamily: PF.letterSerif, fontSize: 14, color: unread ? P.ink : P.ink60, marginTop: 3 }}>
            {last ? postText(last).split("\n")[0] : t("wo.row.sub")}
          </Text>
        </View>
        {unread > 0 && (
          <View style={{ minWidth: 20, height: 20, borderRadius: inList ? 0 : 10, paddingHorizontal: 6, backgroundColor: P.ink, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, color: "#FFFFFF" }}>{unread > 9 ? "9+" : String(unread)}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

/* THE STRIP ON TODAY (owner, 2026-09-20): while a post of hers is
   unopened, one line under the plate, hers in voice, that goes to her
   desk. Not a once-line: it stays until the post is read, and it is the
   strongest in-app reminder the product allows itself — no modal, no
   banner over the letter. */
export function DeskStrip() {
  const router = useRouter();
  useLang();
  const [unread, setUnread] = useState(0);
  const load = useCallback(() => {
    let alive = true;
    const settle = (n: number) => {
      readRoomSeen().then((l) => {
        if (!alive) return;
        const u = wrenUnread(l, n);
        setUnread(u);
        setDeskWaiting(u); // Today is the first screen; the tab's number agrees with it
      });
    };
    readPostsCache().then((c) => c.length && settle(c.length));
    fetchWrenPosts().then((p) => p && settle(p.length));
    return () => {
      alive = false;
    };
  }, []);
  useFocusEffect(load);
  if (!unread) return null;
  return (
    <Pressable onPress={() => router.push(`/room/${WREN_ROOM}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 18, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: P.ink, opacity: pressed ? 0.7 : 1 })}>
      <WrenBird size={22} mood="delight" skin="sticker" accessory="none" />
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: PF.letter, fontSize: 13.5, color: P.ink }}>
        {unread === 1 ? t("wo.strip.one") : t("wo.strip.many", { n: unread })}
      </Text>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, color: P.ink }}>›</Text>
    </Pressable>
  );
}
