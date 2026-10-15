import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ROW, rowBadge, rowBadgeText, rowName, rowPreview, rowTime } from "./ChatRowStyle";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { WrenBird } from "./WrenBird";
import { cardShadow } from "./AuraCard";
import { PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
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
   it, in the colour this app uses for the system speaking.

   The bird is art and keeps her coat. Around her is chrome: the ring is the
   accent's palest wash (lav2, the same #EEEDFB in Classic), the mark is
   ind with its tick in the page colour, and the mark's edge is cut in the
   colour of whatever it sits on — `ground`, the page by default; a card
   passes its sf. */
export function OfficialBird({ size = 52, mood = "content" as const, ground }: { size?: number; mood?: "content" | "curious" | "delight"; ground?: string }) {
  const { t: tk } = useTheme();
  const badge = Math.max(16, Math.round(size * 0.34));
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tk.lav2, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <WrenBird size={Math.round(size * 0.62)} mood={mood} skin="sticker" accessory="none" />
      </View>
      <View style={{ position: "absolute", right: -1, bottom: -1 }}>
        <OfficialMark size={badge} ground={ground} />
      </View>
    </View>
  );
}

export function OfficialMark({ size = 16, ground }: { size?: number; ground?: string }) {
  const P = useP();
  const { t: tk } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: P.pen, borderWidth: 2, borderColor: ground ?? tk.bg, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke={tk.bg} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
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
/* inList (the Kindreds list, owner 2026-10-10; restyled 10-11 with the
   prototype's rows): the first row of the list, pinned by a grey band under
   it, no card of her own; onUnread lets the list mark the ALL chip while a
   post of hers is unopened.

   Colours come from the theme. In the list her row borrows the shared
   chat-row styles (ChatRowStyle) for size and weight, and lays the theme's
   colours over theirs by role, so it reads like the rows under it in every
   theme: name ink, time mute (ind while one is unread), preview sub, the
   badge ind with the page colour on it. On its own (the empty Kindreds
   page) it is a card: sf with the soft shadow, which stays fixed. */
export function WrenDeskRow({ inList = false, onUnread }: { inList?: boolean; onUnread?: (n: number) => void } = {}) {
  const router = useRouter();
  useLang();
  const P = useP();
  const { t: tk } = useTheme();
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
  const line = last ? postText(last).split("\n")[0] : t("wo.row.sub");
  if (inList) {
    /* in the list she is a row like any other (owner, 2026-10-11): same face
       size, same type, same hairline — only the blue check says it's her */
    return (
      <Pressable
        onPress={() => router.push(`/room/${WREN_ROOM}`)}
        accessibilityRole="button"
        accessibilityLabel={[OFFICIAL_NAME, t("wo.tag"), unread ? String(unread) : null, ago].filter(Boolean).join(", ")}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: ROW.gap, paddingHorizontal: ROW.pad, opacity: pressed ? 0.6 : 1 })}
      >
        <OfficialBird size={ROW.face} />
        <View style={{ flex: 1, minWidth: 0, paddingVertical: 12, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text numberOfLines={1} style={[rowName, { flex: 1, color: tk.ink }]}>{OFFICIAL_NAME}</Text>
            {!!ago && <Text style={[rowTime(unread > 0), { color: unread > 0 ? tk.ind : tk.mute }]}>{ago}</Text>}
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Text numberOfLines={2} style={[rowPreview, { flex: 1, color: tk.sub }]}>{line}</Text>
            {unread > 0 && (
              <View style={[rowBadge, { backgroundColor: tk.ind }]}>
                <Text style={[rowBadgeText, { color: tk.bg }]}>{unread > 9 ? "9+" : String(unread)}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => router.push(`/room/${WREN_ROOM}`)}
      accessibilityRole="button"
      style={({ pressed }) => [{ backgroundColor: tk.sf, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 2, opacity: pressed ? 0.85 : 1 }, cardShadow, { shadowOpacity: 0.05 }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <OfficialBird size={44} ground={tk.sf} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 15, color: P.ink }}>{OFFICIAL_NAME}</Text>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.2, color: P.pen }}>{t("wo.tag").toUpperCase()}</Text>
            <View style={{ flex: 1 }} />
            {/* the time since her last post — or, while one is unopened, NEW */}
            {unread > 0 ? (
              <View style={{ backgroundColor: P.ink, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.2, color: tk.bg }}>{t("wo.new")}</Text>
              </View>
            ) : (
              !!ago && <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 0.6, color: P.ink40 }}>{ago}</Text>
            )}
          </View>
          <Text numberOfLines={1} style={{ fontFamily: PF.letterSerif, fontSize: 14, color: unread ? P.ink : P.ink60, marginTop: 3 }}>{line}</Text>
        </View>
        {unread > 0 && (
          <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: P.ink, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, color: tk.bg }}>{unread > 9 ? "9+" : String(unread)}</Text>
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
   banner over the letter. A strip on the page: sf, outlined in ln. */
export function DeskStrip() {
  const router = useRouter();
  useLang();
  const P = useP();
  const { t: tk } = useTheme();
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
    <Pressable onPress={() => router.push(`/room/${WREN_ROOM}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 18, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: tk.sf, borderWidth: 1.5, borderColor: tk.ln, opacity: pressed ? 0.7 : 1 })}>
      <WrenBird size={22} mood="delight" skin="sticker" accessory="none" />
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: PF.letter, fontSize: 13.5, color: P.ink }}>
        {unread === 1 ? t("wo.strip.one") : t("wo.strip.many", { n: unread })}
      </Text>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, color: P.ink }}>›</Text>
    </Pressable>
  );
}
