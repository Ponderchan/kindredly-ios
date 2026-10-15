import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "expo-router";
import Svg, { Path, Rect } from "react-native-svg";
import { MONO, PF } from "../../theme/post";
import { useLetterFamily, useTheme } from "../../lib/theme";
import { BRAND, type ThemeTokens } from "../../theme/themes";
import { useTabBarSpace } from "../../components/NativeTabBar";
import { TabHeader } from "../../components/TabHeader";
import { KindredsSky } from "../../components/KindredsSky";
import { AvatarImage } from "../../components/AvatarImage";
import { MosaicId } from "../../components/MosaicId";
import { OfficialBird } from "../../components/WrenDesk";
import { WrenBird } from "../../components/WrenBird";
import { NoticeBar } from "../../components/NotifyBanner";
import { MessageMenu, a11yActions, type MessageAction } from "../../components/MessageMenu";
import { useRowStyle } from "../../components/ChatRowStyle";
import { BottomFade } from "../../components/10a/BottomFade";
import { BOTTOM_FADE } from "../../components/10a/kit";
import type { ChipVM, FoldVM, ItemVM, RowVM, TagTone } from "./kindreds-model";
import type { KindredsActions, KindredsModel } from "./useKindredsModel";

/* THE KINDREDS TAB IN REACT NATIVE — the remote switch's fallback (app_surfaces
   "kindreds" off, a binary without KKindredsView, or a JS error in the Swift
   path). It must keep working fully, so it draws exactly the model's view
   (kindreds-model) that the SwiftUI screen draws: the same rows, words,
   order, fold, quiet group, closed accounts, empty lines and menus. What is
   its own is the drawing, on the theme (useTheme / useRowStyle): no fixed
   white page, chips or row palette any more, and the 10a row (52 face, 22
   inset, the hairline under the words).

   The sky is the React Native one (KindredsSky + OrbitMap): folded onto
   its own horizon (TabHeader has no rule since 10a), opened by a tap, a
   pull past 56 at the top, folded by a push up from the top (then the list
   settles at the top), and folded again on every visit. It draws the same
   orbit items as the Swift orbit (stable places, your-turn faces in ind).
   Rows keep MessageMenu's Host per row for the long-press menu — fine for a
   fallback. */

type Tk = ThemeTokens;

export function KindredsRN({ model }: { model: KindredsModel }) {
  const { t: tk } = useTheme();
  const tabRoom = useTabBarSpace();
  const navigation = useNavigation();
  const { view, act } = model;
  const scrollRef = useRef<ScrollView>(null);
  const listY = useRef(0);

  /* the sky starts folded on every visit — the list is what you came for */
  const [skyOpen, setSkyOpen] = useState(false);
  useFocusEffect(useCallback(() => () => setSkyOpen(false), []));

  /* the list moves the sky: pulled down past its top, the sky opens; pushed
     up from the top while it is open, it folds back and the list settles
     under it. A push that starts further down is just scrolling. */
  const dragFrom = useRef(0);
  /* a push that folds the sky usually lets go with speed, and iOS carries
     that on past the scroll back to the top — so the list is sent to the
     top again once the glide ends, unless a new drag has begun */
  const settleTop = useRef(false);
  const toTop = useCallback(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), []);
  /* the furthest the list was pulled past its top during this drag: the
     offset at release can already be springing back */
  const pulled = useRef(0);
  const onDragStart = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragFrom.current = e.nativeEvent.contentOffset.y;
    pulled.current = 0;
    settleTop.current = false;
  }, []);
  const onScrollMove = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y < pulled.current) pulled.current = y;
  }, []);
  const onDragEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = Math.min(e.nativeEvent.contentOffset.y, pulled.current);
      if (y < -56) setSkyOpen(true);
      else if (skyOpen && dragFrom.current < 40 && y - dragFrom.current > 24) {
        setSkyOpen(false);
        settleTop.current = true;
        toTop();
      }
    },
    [skyOpen, toTop],
  );
  const onGlideEnd = useCallback(() => {
    if (!settleTop.current) return;
    settleTop.current = false;
    toTop();
  }, [toTop]);

  // the title's tap: to the list (the model has set ALL + your turn)
  const served = useRef(model.scroll.serial);
  useEffect(() => {
    if (model.scroll.serial === served.current) return;
    served.current = model.scroll.serial;
    if (model.scroll.target === "top") toTop();
    else scrollRef.current?.scrollTo({ y: Math.max(0, listY.current - 12), animated: true });
  }, [model.scroll, toTop]);

  // pressing Kindreds again while on it goes to the top
  useEffect(() => {
    const nav = navigation as unknown as { addListener?: (type: string, cb: () => void) => () => void; isFocused?: () => boolean };
    if (!nav.addListener) return;
    return nav.addListener("tabPress", () => {
      if (nav.isFocused?.()) toTop();
    });
  }, [navigation, toTop]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        alwaysBounceVertical
        onScroll={onScrollMove}
        scrollEventThrottle={16}
        onScrollBeginDrag={onDragStart}
        onScrollEndDrag={onDragEnd}
        onMomentumScrollEnd={onGlideEnd}
        contentContainerStyle={{ paddingBottom: Math.max(tabRoom + 72, BOTTOM_FADE.height - 6) }}
        showsVerticalScrollIndicator={false}
      >
        {/* the title answers one question — is anything on me? — and when it
            is, tapping it shows exactly those */}
        <TabHeader
          title={view.title}
          rightLabel={view.status}
          rightTone={view.statusActive ? "ind" : "mute"}
          onRightPress={view.statusActive ? act.title : undefined}
          rightA11yLabel={view.statusA11y}
        />

        {/* the sky on its own horizon: a tick for every pen pal, ind for the ones on you */}
        <KindredsSky
          items={view.orbit}
          open={skyOpen}
          onToggle={() => setSkyOpen((o) => !o)}
          label={view.orbitChipLabel}
          legendCloser={view.legendCloser}
          legendTurn={view.legendTurn}
        />

        <View onLayout={(e) => (listY.current = e.nativeEvent.layout.y)}>
          <Chips chips={view.chips} onPress={act.chip} tk={tk} />
          <View style={{ marginTop: 8 }}>
            {view.items.map((it) => (
              <Item key={it.id} item={it} act={act} tk={tk} />
            ))}
          </View>
        </View>
      </ScrollView>
      <BottomFade />
    </SafeAreaView>
  );
}

/* CHIPS: the three groups, the chosen one on lav with ind type, the rest
   sf with a line border (H:62 with the owner's 16.5), scrolling sideways
   when a language runs long. */
function Chips({ chips, onPress, tk }: { chips: ChipVM[]; onPress: (key: string) => void; tk: Tk }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 2 }} accessibilityRole="tablist">
      {chips.map((c) => {
        const ink = c.selected ? tk.ind : tk.ink;
        return (
          <Pressable
            key={c.key}
            onPress={() => onPress(c.key)}
            hitSlop={{ top: 5, bottom: 5 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: c.selected }}
            accessibilityLabel={c.a11yLabel}
            style={({ pressed }) => ({
              paddingVertical: 9,
              paddingHorizontal: 16,
              borderRadius: 22,
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              backgroundColor: c.selected ? tk.lav : tk.sf,
              borderWidth: 1.5,
              borderColor: c.selected ? tk.lav : tk.line,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {c.glyph === "kindred" && <KindredGlyph />}
            {c.glyph === "penPal" && <PenPalGlyph color={tk.ind} />}
            <Text numberOfLines={1} style={{ fontSize: 16.5, fontWeight: "500", color: ink }}>
              {c.label}
            </Text>
            {!!c.count && <Text style={{ fontSize: 14.5, fontWeight: "500", color: ink, opacity: 0.55 }}>{c.count}</Text>}
            {!c.selected && c.dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tk.ind }} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* the two groups' marks (H:62): a kindred's face on the courier's green (a
   fixed object colour, themes.json brand), a pen pal's checker in ind */
function KindredGlyph() {
  return (
    <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: BRAND.greenText, alignItems: "center", justifyContent: "center" }}>
      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={BRAND.paperWhite} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M8 10h.01 M16 10h.01 M8 15c1.3 1.3 2.6 2 4 2s2.7-.7 4-2" />
      </Svg>
    </View>
  );
}
function PenPalGlyph({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Rect x={0.9} y={0.9} width={16.2} height={16.2} rx={4.1} fill="none" stroke={color} strokeWidth={1.8} />
      <Rect x={4.8} y={4.8} width={3.7} height={3.7} fill={color} />
      <Rect x={9.5} y={9.5} width={3.7} height={3.7} fill={color} />
    </Svg>
  );
}

const Item = memo(function Item({ item, act, tk }: { item: ItemVM; act: KindredsActions; tk: Tk }) {
  switch (item.type) {
    case "wrenLine":
      return <WrenLine text={item.text} onTap={act.wrenLine} tk={tk} />;
    case "notice":
      return <NoticeBar text={item.text} closeLabel={item.closeLabel} onPress={() => act.notice("turnOn")} onClose={() => act.notice("close")} />;
    case "line":
      return <Text style={{ fontSize: 13, color: tk.mute, paddingHorizontal: 22, paddingVertical: 12 }}>{item.text}</Text>;
    case "showing":
      return (
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginHorizontal: 22, marginBottom: 2 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, color: tk.mute }}>
            {item.text}
          </Text>
          <Pressable onPress={act.clear} hitSlop={10} accessibilityRole="button">
            <Text style={{ fontSize: 13, fontWeight: "600", color: tk.ind, paddingVertical: 6 }}>{item.clear}</Text>
          </Pressable>
        </View>
      );
    case "wren":
      return <Row row={item.row} onOpen={act.openWren} onAction={act.rowAction} />;
    case "row":
      return <Row row={item.row} onOpen={() => act.openRow(item.row.id)} onAction={act.rowAction} />;
    case "fold":
      return <Fold fold={item.fold} onFace={act.openFoldFace} onAll={act.openFold} tk={tk} />;
    case "emptyLine":
      return <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.2, color: tk.mute, paddingHorizontal: 22, paddingVertical: 16 }}>{item.text}</Text>;
    case "hintKindreds":
      return (
        <Pressable onPress={() => act.hint("kindreds")} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 22, paddingVertical: 13, opacity: pressed ? 0.6 : 1 })}>
          <View style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderStyle: "dashed", borderColor: tk.faint }} />
          <Text style={{ flex: 1, fontFamily: PF.letterSerif, fontSize: 13.5, lineHeight: 19, color: tk.sub }}>{item.text}</Text>
        </Pressable>
      );
    case "hintPenpals":
      return (
        <Pressable onPress={() => act.hint("penpals")} accessibilityRole="button" style={({ pressed }) => ({ paddingHorizontal: 22, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ fontFamily: PF.letterSerif, fontStyle: "italic", fontSize: 14, lineHeight: 20, color: tk.sub }}>{item.text}</Text>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.2, color: tk.ind, marginTop: 8 }}>{item.link}</Text>
        </Pressable>
      );
    case "groupHeader":
      return (
        <Text accessibilityRole="header" style={{ fontSize: 13, fontWeight: "600", color: tk.mute, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 4 }}>
          {item.text}
        </Text>
      );
  }
});

/* her once-line: the reader's own Wren and the line in the serif's italic */
function WrenLine({ text, onTap, tk }: { text: string; onTap: () => void; tk: Tk }) {
  const italic = useLetterFamily(true);
  return (
    <Pressable onPress={onTap} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 22 }}>
      <WrenBird size={22} mood="content" />
      <Text style={[{ flex: 1, fontSize: 13.5, lineHeight: 20, color: tk.sub }, italic]}>{text}</Text>
    </Pressable>
  );
}

const TONE = (tk: Tk): Record<TagTone, string> => ({ ind: tk.ind, mute: tk.mute, post: BRAND.postRed, brass: BRAND.brassSeal });

/* ONE ROW for everyone (the owner's sizes, 10a colours): the face, the name
   with a pen pal's n/5 and the time, two lines of their last words led by
   the row's tags and "You: ", the badge or Rekindle ›, the hairline under
   the words. Long-pressed, the row is lifted into iOS's menu (MessageMenu);
   a row with a menu doesn't fade under the finger (owner 10-11). */
function Row({ row, onOpen, onAction }: { row: RowVM; onOpen: () => void; onAction: (id: string, key: string) => void }) {
  const s = useRowStyle();
  const { t: tk } = useTheme();
  const tone = TONE(tk);
  const actions: MessageAction[] = row.actions.map((a) => ({ key: a.key, label: a.title, icon: a.icon, destructive: a.destructive, onPress: () => onAction(row.id, a.key) }));
  return (
    <Pressable
      onPress={onOpen}
      // a long-press is the row's menu, so lifting the finger must not also open it
      onLongPress={actions.length ? NOOP : undefined}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={row.a11yLabel}
      {...a11yActions(actions)}
      style={({ pressed }) => ({ opacity: pressed && !actions.length ? 0.6 : 1 })}
    >
      <MessageMenu actions={actions} radius={0}>
        <View style={s.row}>
          <View style={{ opacity: row.dim ? 0.45 : 1 }}>
            <Face row={row} />
          </View>
          <View style={[s.text, s.hairline]}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text numberOfLines={1} style={[s.name, { flexShrink: 1 }, row.nameDim && { color: s.colors.sub }]}>
                {row.name}
              </Text>
              {!!row.progress && <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, color: s.colors.sub }}>{row.progress}</Text>}
              <View style={{ flex: 1 }} />
              {!!row.time && <Text style={s.time}>{row.time}</Text>}
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <Text numberOfLines={2} style={[s.preview, { flex: 1 }]}>
                {row.tags.map((g) => (
                  <Text key={g.text} style={{ fontSize: 12, fontWeight: "600", letterSpacing: 0.3, color: tone[g.tone] }}>
                    {g.text}{"  "}
                  </Text>
                ))}
                {!!row.youPrefix && <Text style={s.you}>{row.youPrefix}</Text>}
                {row.preview}
              </Text>
              {row.badge ? (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{row.badge}</Text>
                </View>
              ) : row.trailingLink ? (
                <Text style={{ fontSize: 13, fontWeight: "600", color: s.colors.ind, marginTop: 2 }}>{row.trailingLink}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </MessageMenu>
    </Pressable>
  );
}
const NOOP = () => {};

/* a face as the row draws it: Wren's official bird; a kindred's portrait,
   legacy face or glyph (a closed kindred with no face left wears the veil);
   a pen pal's mosaic on the soft disc, developed by their letters */
function Face({ row }: { row: RowVM }) {
  const s = useRowStyle();
  if (row.kind === "wren") return <OfficialBird size={s.face} ground={s.colors.ground} />;
  const f = row.face;
  if (!f) return <View style={s.disc} />;
  if (f.role === "kindred" && (f.avatarId || (!f.gone && f.seed))) {
    return <AvatarImage id={f.avatarId ?? null} seed={f.seed ?? "anon"} size={s.face} />;
  }
  return (
    <View style={s.disc}>
      <MosaicId seed={f.gone ? null : f.seed} cell={4.5} gap={1.2} develop={f.develop ?? 1} />
    </View>
  );
}

/* the pen pals whose turn is theirs, as one row: up to six faces, how many
   more, and the way to all of them */
const FOLD_FACE = 34;
function Fold({ fold, onFace, onAll, tk }: { fold: FoldVM; onFace: (id: string) => void; onAll: () => void; tk: Tk }) {
  return (
    <Pressable onPress={onAll} accessibilityRole="button" accessibilityLabel={fold.a11yLabel} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginLeft: 22, paddingRight: 22, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tk.line }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {fold.faces.map((f, i) => (
            <Pressable
              key={f.id}
              onPress={() => onFace(f.id)}
              hitSlop={{ top: 6, bottom: 6 }}
              accessibilityRole="button"
              accessibilityLabel={f.a11yLabel}
              style={{ marginLeft: i > 0 ? -8 : 0, zIndex: fold.faces.length - i }}
            >
              <View style={{ width: FOLD_FACE, height: FOLD_FACE, borderRadius: FOLD_FACE / 2, borderWidth: 2, borderColor: tk.bg, backgroundColor: tk.soft2, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <MosaicId seed={f.seed} cell={2.9} gap={0.8} develop={f.develop} />
              </View>
            </Pressable>
          ))}
          {!!fold.more && <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: "600", color: tk.mute }}>{fold.more}</Text>}
        </View>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: "600", color: tk.mute }}>
          {fold.label}
        </Text>
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={tk.mute} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 6l6 6-6 6" />
        </Svg>
      </View>
    </Pressable>
  );
}
