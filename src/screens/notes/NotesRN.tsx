import { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { MONO, PFM } from "../../theme/post";
import { BRAND } from "../../theme/themes";
import { useLetterFamily, useP, useTheme } from "../../lib/theme";
import { useTabBarSpace } from "../../components/NativeTabBar";
import { TabHeader } from "../../components/TabHeader";
import { EveningAsk, type EveningAskStrings } from "../../components/EveningAsk";
import { SealedTile } from "../../components/SealedTile";
import { SealedCalendar } from "../../components/SealedCalendar";
import { WrenBird } from "../../components/WrenBird";
import { BottomFade } from "../../components/10a/BottomFade";
import { BOTTOM_FADE } from "../../components/10a/kit";
import { CalendarGlyph, EMPTY_STICKER, EMPTY_TAPE, ViewIcon } from "./notes-glyphs";
import { NOTES_VIEWS, noteColumns, noteRows, type NoteVM, type NotesView } from "./notes-model";
import type { NotesModel } from "./useNotesModel";

/* THE NOTES TAB IN REACT NATIVE — the remote switch's fallback (app_surfaces
   "notes" off, a binary without KNotesView, or a JS error in the Swift
   path). It must keep working fully, so it draws exactly the model's view
   (useNotesModel over notes-model) that the SwiftUI screen draws: the same
   cards and words, the same one voice player, the same evening question
   and Wren line, the same month. What is its own is the drawing, on the
   theme (useP / useTheme): no fixed lavender page any more.

   It keeps the Notes it replaces where 10a didn't ask for a change: the
   header's two keys open a VIEW menu (now Card, Grid and List, the views
   the SwiftUI button cycles) and the calendar as a mode in place of the
   list, where a day with one page opens it and a day with several opens
   the day page — and coming back from that page (or another tab) finds the
   calendar still open on the month being browsed. The cards are the 10a
   cards (SealedTile), Grid in rows of two of equal height, one to a row at
   accessibility text sizes as in Swift (notes-model noteColumns). The last
   card clears the floating tab bar and the bottom fade. Every mono label is
   9, 10 or 11. */

const WIN_W = Dimensions.get("window").width;
const VIEW_LABEL: Record<NotesView, "viewCard" | "viewGrid" | "viewList"> = { card: "viewCard", grid: "viewGrid", list: "viewList" };

type Row = { key: string; notes: NoteVM[] };

export function NotesRN({ model }: { model: NotesModel }) {
  const P = useP();
  const { t: tk, dark } = useTheme();
  const tabRoom = useTabBarSpace();
  const { strings: s, act } = model;
  const bottomRoom = Math.max(tabRoom + 72, BOTTOM_FADE.height - 6);

  /* the menu hangs under its key, wherever the key is on this screen */
  const [menu, setMenu] = useState<null | { x: number; y: number; w: number; h: number }>(null);
  const viewKey = useRef<View>(null);
  const openMenu = () => viewKey.current?.measureInWindow((x, y, w, h) => setMenu({ x, y, w, h }));
  const pick = (v: NotesView) => {
    setMenu(null);
    act.setView(v);
  };

  /* the caption lives above the top edge; it is revealed by the overscroll
     and fades in as you pull */
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const pullNote = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [-40, -8, 0], [1, 0, 0], "clamp") }));

  /* Grid is rows of two, and one to a row at accessibility text sizes, as Swift draws it */
  const { fontScale } = useWindowDimensions();
  const columns = noteColumns(model.view, fontScale);
  const rows = useMemo<Row[]>(() => noteRows(model.notes, columns), [model.notes, columns]);

  const evening: EveningAskStrings = { ask: s.eveningAsk, yes: s.eveningYes, no: s.eveningNo, foot: s.eveningFoot, onLine: s.eveningOn, turnOff: s.eveningOff };
  const eveningRow = <EveningAsk state={model.evening.state} busy={model.evening.busy} strings={evening} onYes={act.eveningYes} onNo={act.eveningNo} onOff={act.eveningOff} />;

  const renderRow = useCallback(
    ({ item }: { item: Row }) => (
      <View style={{ flexDirection: "row", gap: 12, alignItems: "stretch" }}>
        {item.notes.map((n) => (
          <View key={n.id} style={{ flex: 1 }}>
            {/* only the note that is loaded gets the player's state, so a transition redraws one tile */}
            <SealedTile note={n} layout={model.view} playback={model.playback?.key === n.id ? model.playback : null} onPress={act.open} onToggleVoice={act.toggleVoice} playLabel={s.play} pauseLabel={s.pause} />
          </View>
        ))}
        {columns === 2 && item.notes.length === 1 && <View style={{ flex: 1 }} />}
      </View>
    ),
    [model.view, columns, model.playback, act.open, act.toggleVoice, s.play, s.pause],
  );

  const viewLabel = s[VIEW_LABEL[model.view]];
  const keyInk = (on: boolean) => (on ? tk.bg : tk.ink);

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* header — every tab's plate (components/TabHeader) */}
        <TabHeader
          title={s.title}
          right={
            model.empty ? (
              <Text style={{ ...PFM.mono, fontSize: MONO.title, letterSpacing: 1.2, color: tk.sub }}>{s.justYou}</Text>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View ref={viewKey} collapsable={false}>
                  <PlateKey on={!!menu} onPress={openMenu} label={s.viewA11y} value={viewLabel} expanded={!!menu}>
                    <ViewIcon view={model.view} size={15} color={keyInk(!!menu)} />
                    <Text style={{ fontWeight: "600", fontSize: 13, color: keyInk(!!menu) }}>{viewLabel}</Text>
                    <Caret open={!!menu} color={keyInk(!!menu)} />
                  </PlateKey>
                </View>
                <PlateKey on={model.calendarOpen} onPress={() => act.setCalendar(!model.calendarOpen)} label={s.calendarA11y} expanded={model.calendarOpen}>
                  <Text style={{ ...PFM.monoSemi, fontSize: MONO.title, letterSpacing: 0.8, color: keyInk(model.calendarOpen) }}>{s.monthCount}</Text>
                  {/* the squares sit on the key: the ink (filled) or the page (outlined); on a dark one the
                      groups' pale fills read, where their inks sank into Midnight's page */}
                  <CalendarGlyph groups={model.recentGroups} color={keyInk(model.calendarOpen)} empty={model.calendarOpen ? tk.bg : tk.line} onDark={model.calendarOpen ? !dark : dark} size={15} />
                  <Caret open={model.calendarOpen} color={keyInk(model.calendarOpen)} />
                </PlateKey>
              </View>
            )
          }
        />

        {/* the view menu: VIEW, then the three ways, the one in use ticked */}
        <Modal transparent visible={!!menu} animationType="fade" onRequestClose={() => setMenu(null)}>
          <Pressable style={{ flex: 1 }} onPress={() => setMenu(null)} accessibilityLabel={s.close}>
            {menu && (
              <Pressable
                onPress={() => {}}
                style={{ position: "absolute", top: menu.y + menu.h + 6, right: WIN_W - (menu.x + menu.w), minWidth: 206, backgroundColor: tk.sf, borderRadius: 18, borderWidth: 1.5, borderColor: tk.ln, padding: 8, shadowColor: tk.ln, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 1, shadowRadius: 0 }}
              >
                <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.6, color: tk.mute, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6 }}>{s.viewMenu}</Text>
                {NOTES_VIEWS.map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => pick(v)}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: model.view === v }}
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, height: 44, paddingHorizontal: 10, borderRadius: 12, backgroundColor: model.view === v ? tk.lav2 : pressed ? tk.soft2 : "transparent" })}
                  >
                    <ViewIcon view={v} size={15} color={tk.ink} />
                    <Text style={{ flex: 1, fontWeight: "600", fontSize: 16, color: tk.ink }}>{s[VIEW_LABEL[v]]}</Text>
                    {model.view === v && <Text style={{ fontSize: 13, color: tk.mute }}>✓</Text>}
                  </Pressable>
                ))}
              </Pressable>
            )}
          </Pressable>
        </Modal>

        {model.empty ? (
          <Empty model={model} eveningRow={eveningRow} tabRoom={tabRoom} />
        ) : model.calendarOpen ? (
          <Animated.ScrollView entering={FadeIn.duration(220)} contentContainerStyle={{ paddingBottom: bottomRoom }} showsVerticalScrollIndicator={false}>
            <Text style={{ ...PFM.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink40, paddingHorizontal: 22, marginBottom: 4, marginTop: 14 }}>{s.moments}</Text>
            <SealedCalendar month={model.month} weekdays={s.weekdays} prevLabel={s.prevMonth} nextLabel={s.nextMonth} onStep={act.calendarMonth} onPickDay={act.openDay} />
          </Animated.ScrollView>
        ) : (
          <Animated.FlatList
            key={`${model.view}-${columns}` /* rows of two and rows of one don't share cells */}
            data={rows}
            keyExtractor={(r) => r.key}
            renderItem={renderRow}
            onScroll={onScroll}
            scrollEventThrottle={16}
            initialNumToRender={8}
            windowSize={7}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: bottomRoom, gap: 12 }}
            ListHeaderComponent={
              <View>
                {/* tucked under the plate — pull down past the top and it shows */}
                <Animated.Text style={[{ position: "absolute", top: -22, left: 4, ...PFM.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink40 }, pullNote]}>{s.moments}</Animated.Text>
                {!!model.wrenLine && <WrenLine line={model.wrenLine} onTap={act.dismissWrenLine} />}
                {eveningRow}
              </View>
            }
          />
        )}
      </SafeAreaView>
      <BottomFade />
    </View>
  );
}

/* her first-visit line, in the page: her own bird at 22 and the line in
   the reader's Letter font's italic in sub (her words are content, owner
   2026-10-20; upright in a face without an italic). A tap closes it for the
   session (the model's dismissWrenOnce). */
function WrenLine({ line, onTap }: { line: string; onTap: () => void }) {
  const { t: tk } = useTheme();
  const face = useLetterFamily(true);
  return (
    <Animated.View entering={FadeIn.duration(420)}>
      <Pressable onPress={onTap} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 4 }}>
        <WrenBird size={22} mood="content" />
        <Text style={[{ flex: 1, fontSize: 15, lineHeight: 21, color: tk.sub }, face]}>{line}</Text>
      </Pressable>
    </Animated.View>
  );
}

/* a key on the plate — outlined, filled while what it opens is open. Both
   keys open something, so both end in the same caret (owner, 2026-09-23) */
function PlateKey({ on, onPress, label, value, expanded, children }: { on: boolean; onPress: () => void; label: string; value?: string; expanded?: boolean; children: React.ReactNode }) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={value ? { text: value } : undefined}
      accessibilityState={expanded === undefined ? { selected: on } : { expanded }}
      hitSlop={8}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 5, height: 28, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1.3, borderColor: tk.ln, backgroundColor: on ? tk.ink : "transparent", opacity: pressed ? 0.75 : 1 })}
    >
      {children}
    </Pressable>
  );
}

/* what a key opens hangs below it: a caret down, turned up while open */
function Caret({ open, color }: { open: boolean; color: string }) {
  return (
    <Svg width={9} height={9} viewBox="0 0 10 10" style={{ marginLeft: 1, transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
      <Path d="M2 3.5l3 3 3-3" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* Empty Notes — still design 1b's one warm, playful moment, and everything
   it said is still here word for word: the taped note, the NEW sticker, the
   two ways in. Painted from the theme; the title in System (an empty
   state is UI, owner 2026-10-20); the tape and the sticker keep their own colours, and the two keys
   their pale ones with a fixed dark ink on them. The evening question's off
   row sits above it when the evening line is on: it is the only off switch,
   and a journal with no pages still gets the line. */
function Empty({ model, eveningRow, tabRoom }: { model: NotesModel; eveningRow: React.ReactNode; tabRoom: number }) {
  const P = useP();
  const { t: tk } = useTheme();
  const s = model.strings;
  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16 }}>{eveningRow}</View>
      {/* centred in what the floating tab bar leaves, the keys clear of it */}
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 26, paddingBottom: Math.max(60, tabRoom + 12) }}>
        {/* the taped note */}
        <View style={{ marginBottom: 34 }}>
          <View style={{ position: "absolute", left: 46, top: -11, width: 78, height: 22, backgroundColor: EMPTY_TAPE, opacity: 0.85, transform: [{ rotate: "-5deg" }], zIndex: 2 }} />
          <View style={{ backgroundColor: tk.sf, borderWidth: 1, borderColor: tk.ln, paddingHorizontal: 26, paddingVertical: 30, transform: [{ rotate: "-1deg" }] }}>
            <Text style={{ fontSize: 27, lineHeight: 34, fontWeight: "600", color: tk.ink, textAlign: "center" }}>{s.emptyTitle}</Text>
            <Text style={{ fontSize: 14.5, lineHeight: 22, color: tk.sub, textAlign: "center", marginTop: 14 }}>{s.emptyBody}</Text>
          </View>
          {/* NEW sticker */}
          <View style={{ position: "absolute", right: 8, bottom: -14, backgroundColor: EMPTY_STICKER, paddingHorizontal: 9, paddingVertical: 6, transform: [{ rotate: "6deg" }] }}>
            <Text style={{ ...PFM.monoSemi, fontSize: 11, letterSpacing: 1, color: BRAND.inkOnBrand }}>{s.newLabel}</Text>
          </View>
        </View>

        {/* the same two keys the roll offers above the pictures (owner,
            2026-09-20): words, or a voice. Pictures are the roll itself —
            the tab's + and "to yourself" both open on it. */}
        <View style={{ flexDirection: "row", gap: 2 }}>
          <Key label={s.textKey} tint={P.keyText} onPress={() => model.act.compose("text")}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={BRAND.inkOnBrand} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 20l4-1 11-11-3-3L5 16z" />
              <Line x1={13} y1={8} x2={16} y2={11} />
            </Svg>
          </Key>
          <Key label={s.voiceKey} tint={P.keyVoice} onPress={() => model.act.compose("voice")}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={BRAND.inkOnBrand} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <Rect x={9} y={3} width={6} height={11} rx={3} />
              <Path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
            </Svg>
          </Key>
        </View>
      </View>
    </Animated.View>
  );
}

function Key({ label, tint, onPress, children }: { label: string; tint: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ flex: 1, height: 120, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: tint, opacity: pressed ? 0.6 : 1 })}>
      {children}
      <Text style={{ fontSize: 13, fontWeight: "600", color: BRAND.inkOnBrand }}>{label}</Text>
    </Pressable>
  );
}
