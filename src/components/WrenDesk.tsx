import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { useRowStyle } from "./ChatRowStyle";
import { WrenBird } from "./WrenBird";
import { cardShadow } from "./AuraCard";
import { StickerBox } from "./10a/StickerBox";
import { badgeCount } from "./10a/kit";
import { createDeskStore } from "./10a/desk-store";
import { MONO, PF } from "../theme/post";
import { useTheme } from "../lib/theme";
import { getLang, t, useLang } from "../lib/i18n";
import { sinceShort, listWhen } from "../lib/format";
import { readRoomSeen } from "../lib/room-seen";
import { setDeskWaiting } from "../lib/waiting";
import { DEMO_WREN_POSTS } from "../data/demo";
import { DEMO_TEXT, storeMode } from "../lib/dev-store";
import { OFFICIAL_NAME, WREN_ROOM, fetchWrenPosts, postText, readPostsCache, wrenUnread, type WrenPost } from "../lib/wren-desk";

/* ── HER DESK, READ ONCE FOR EVERY SCREEN (10a step 5) ──────────────────────
   Her row on Kindreds, the strip on Today and the tab's number all ask the
   same two questions: what has she posted, and how much of it haven't you
   opened? They used to ask separately (the row and the strip each loaded
   the posts on every focus, and could disagree about the number they both
   pushed to the tab). Now one small store holds the answer and every
   useWrenDesk() follows it: any screen's focus reads it again — the
   phone's copy first, then the network (fetchWrenPosts asks at most once a
   minute) — and every mounted screen redraws from the one result, which
   also goes to the tab's number (setDeskWaiting).

   The unread count is the room-seen ledger's (wrenUnread): a first post to
   someone who has never opened her desk IS unread. Opening her room marks
   it seen; the next focus anywhere brings the number down. The ordering
   rules (the network beats the copy, the answer started last wins) are
   components/10a/desk-store, tested under node. */

const warn = (what: string, e: unknown) => console.warn(`[wren-desk] ${what}:`, e);

const desk = createDeskStore<WrenPost>({
  readLedger: readRoomSeen,
  unread: wrenUnread,
  publish: setDeskWaiting, // the tab's number counts her desk too
  warn,
});

/** Reads her desk again — the phone's copy, then the network — and every
    mounted useWrenDesk() follows. useWrenDesk does this on each focus;
    call it yourself after something that changes the answer off-screen. */
export function refreshWrenDesk(): void {
  // dev: the App Store screenshots' desk, one welcome post in the device's language
  if (__DEV__ && storeMode) {
    desk.settle([{ ...DEMO_WREN_POSTS[0], body: DEMO_TEXT[getLang()].welcome, at: new Date(Date.now() - 2 * 3600_000).toISOString() }]).catch((e) => warn("demo", e));
    return;
  }
  void desk.refresh({
    cache: readPostsCache,
    fetch: fetchWrenPosts,
    // dev with no table and nothing on the phone: the demo posts, so the row has something to show
    fallback: () => (__DEV__ ? DEMO_WREN_POSTS : null),
  });
}

export type WrenDesk = {
  /** her posts, oldest first, as a transcript reads ([] until anything answered) */
  posts: readonly WrenPost[];
  /** her posts you haven't opened on this phone (also on the tab's number) */
  unread: number;
  /** true once the phone's copy or the network has answered */
  loaded: boolean;
  /** her newest post, or null */
  last: WrenPost | null;
  /** the first line of her newest post in the reader's language, or null with no posts
      (the row then says t("wo.row.sub") and shows no time) */
  lastLine: string | null;
  /** when her newest post went up (ISO), or null; format it where it is shown (listWhen in a list) */
  lastAt: string | null;
  /** read it again now */
  refresh: () => void;
};

/** Her desk, for any screen (see above): reads again on each focus of the
    screen it is in, and re-renders when the reader's language changes (the
    last line is in their language). */
export function useWrenDesk(): WrenDesk {
  useLang();
  const s = useSyncExternalStore(desk.subscribe, desk.read);
  useFocusEffect(
    useCallback(() => {
      refreshWrenDesk();
    }, []),
  );
  const last = s.posts.length ? s.posts[s.posts.length - 1] : null;
  return {
    posts: s.posts,
    unread: s.unread,
    loaded: s.loaded,
    last,
    lastLine: last ? postText(last).split("\n")[0] : null,
    lastAt: last?.at || null,
    refresh: refreshWrenDesk,
  };
}

/* THE OFFICIAL BIRD — the courier as everyone has her, in a ring, with the
   mark that says this account is the product's own. Her look is pinned to
   the one on the box on purpose — the default skin, nothing worn, the
   grown bird (stage "wren") and no hatchling's birthmark — whatever the
   reader's own Wren wears or how far she has grown: your Wren is yours,
   this one is everybody's. (Before 10a she was drawn at the reader's own
   stage, so a new reader's desk had a hatchling on it.) The mark is the
   kindreds' green tick in pen blue — same shape, so it reads as "verified"
   the way the phone already taught it, in the colour this app uses for the
   system speaking.

   The bird is art and keeps her coat. Around her is chrome: the disc is
   soft2, as every face disc in the 10a list (H:378), the mark is ind with
   its tick in the page colour, and the mark's edge is cut in the colour of
   whatever it sits on — `ground`, the page by default; a card passes its
   sf. */
export function OfficialBird({
  size = 52,
  mood = "content" as const,
  ground,
  disc,
}: {
  size?: number;
  mood?: "content" | "curious" | "delight";
  /** what the mark's edge is cut in (default the page, tk.bg) */
  ground?: string;
  /** the disc behind her (default tk.soft2) */
  disc?: string;
}) {
  const { t: tk } = useTheme();
  const badge = Math.max(16, Math.round(size * 0.34));
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: disc ?? tk.soft2, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <WrenBird size={Math.round(size * 0.62)} mood={mood} skin="sticker" accessory="none" stage="wren" mark={null} />
      </View>
      <View style={{ position: "absolute", right: -1, bottom: -1 }}>
        <OfficialMark size={badge} ground={ground} />
      </View>
    </View>
  );
}

export function OfficialMark({ size = 16, ground }: { size?: number; ground?: string }) {
  const { t: tk } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tk.ind, borderWidth: 2, borderColor: ground ?? tk.bg, alignItems: "center", justifyContent: "center" }}>
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
   prototype's rows; 10a in step 5): the first row of the list, no card of
   her own; onUnread lets the list mark the ALL chip while a post of hers is
   unopened.

   In the list she is drawn with the shared row (useRowStyle): the owner's
   sizes in 10a colours — name ink, the time system 13 like every row
   under her and always mute (the badge already says something is new),
   preview sub, the badge ind with the page colour on it, the 22 inset.
   `hairline` draws the 10a rule under her words (H:65) for a list that
   draws its rules that way; the list before step 5 draws its own above
   the next row and leaves it off. With no posts the time is hidden and
   the preview is wo.row.sub.

   On its own (the empty Kindreds page) it is a card: sf with the soft
   shadow, which stays fixed. */
export function WrenDeskRow({ inList = false, onUnread, hairline = false }: { inList?: boolean; onUnread?: (n: number) => void; hairline?: boolean } = {}) {
  const router = useRouter();
  const { t: tk } = useTheme();
  const row = useRowStyle();
  const { unread, loaded, lastLine, lastAt } = useWrenDesk();

  const report = useRef(onUnread);
  report.current = onUnread;
  useEffect(() => {
    if (loaded) report.current?.(unread);
  }, [loaded, unread]);

  const ago = lastAt ? (inList ? listWhen(lastAt) : sinceShort(lastAt)) : "";
  const line = lastLine ?? t("wo.row.sub");
  const open = () => router.push(`/room/${WREN_ROOM}`);

  if (inList) {
    /* in the list she is a row like any other (owner, 2026-10-11): same face
       size, same type, same hairline — only the blue check says it's her */
    return (
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={[OFFICIAL_NAME, t("wo.tag"), unread ? String(unread) : null, ago].filter(Boolean).join(", ")}
        style={({ pressed }) => [row.row, { opacity: pressed ? 0.6 : 1 }]}
      >
        <OfficialBird size={row.face} ground={row.colors.ground} />
        <View style={[row.text, hairline ? row.hairline : null]}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text numberOfLines={1} style={[row.name, { flex: 1 }]}>
              {OFFICIAL_NAME}
            </Text>
            {!!ago && <Text style={row.time}>{ago}</Text>}
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Text numberOfLines={2} style={[row.preview, { flex: 1 }]}>
              {line}
            </Text>
            {unread > 0 && (
              <View style={row.badge}>
                <Text style={row.badgeText}>{badgeCount(unread)}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={[OFFICIAL_NAME, t("wo.tag"), unread ? t("wo.new") : null, ago, line].filter(Boolean).join(", ")}
      style={({ pressed }) => [{ backgroundColor: tk.sf, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 2, opacity: pressed ? 0.85 : 1 }, cardShadow, { shadowOpacity: 0.05 }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <OfficialBird size={44} ground={tk.sf} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 15, color: tk.ink }}>{OFFICIAL_NAME}</Text>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.small, letterSpacing: 1.2, color: tk.ind }}>{t("wo.tag").toUpperCase()}</Text>
            <View style={{ flex: 1 }} />
            {/* the time since her last post — or, while one is unopened, NEW */}
            {unread > 0 ? (
              <View style={{ backgroundColor: tk.ink, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.small, letterSpacing: 1.2, color: tk.bg }}>{t("wo.new")}</Text>
              </View>
            ) : (
              !!ago && <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 0.6, color: tk.mute }}>{ago}</Text>
            )}
          </View>
          <Text numberOfLines={1} style={{ fontFamily: PF.letterSerif, fontSize: 14, color: unread ? tk.ink : tk.sub, marginTop: 3 }}>
            {line}
          </Text>
        </View>
        {unread > 0 && (
          <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: tk.ink, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, color: tk.bg }}>{badgeCount(unread)}</Text>
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
   banner over the letter.

   10a (spec-today "Desk strip"): a sticker on the page — sf, a 2pt ln
   outline, corners 18, a hard 3/3 shadow, padding 10 12, 10 between its
   parts; her bird at 22 (delight, the official look, as on her row); the
   line in system 13 in ink on one line; a › in faint. Placed 16 in from
   the edges and 4 under the plate; `style` moves it. It reads the same
   desk as her row (useWrenDesk), so Today no longer loads it on its own,
   and draws nothing while nothing of hers is unopened. Pressed, it goes
   down onto its shadow. */
export function DeskStrip({ style }: { style?: StyleProp<ViewStyle> } = {}) {
  const router = useRouter();
  const { t: tk } = useTheme();
  const { unread } = useWrenDesk();
  if (!unread) return null;
  const text = unread === 1 ? t("wo.strip.one") : t("wo.strip.many", { n: unread });
  return (
    <Pressable onPress={() => router.push(`/room/${WREN_ROOM}`)} accessibilityRole="button" accessibilityLabel={text} style={[{ marginHorizontal: 16, marginTop: 4 }, style]}>
      {({ pressed }) => (
        <StickerBox
          fill={tk.sf}
          stroke={tk.ln}
          lineWidth={2}
          radius={18}
          shadow={tk.ln}
          offset={3}
          pressed={pressed}
          faceStyle={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}
        >
          <WrenBird size={22} mood="delight" skin="sticker" accessory="none" stage="wren" mark={null} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, color: tk.ink }}>
            {text}
          </Text>
          <Text style={{ fontSize: 18, lineHeight: 20, color: tk.faint }}>›</Text>
        </StickerBox>
      )}
    </Pressable>
  );
}
