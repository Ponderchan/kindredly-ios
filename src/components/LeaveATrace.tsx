import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import Animated, { FadeIn, FadeOut, SlideInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MONO, PF } from "../theme/post";
import { scrimColor, useTheme } from "../lib/theme";
import { t, useLang } from "../lib/i18n";
import { localeTag } from "../lib/format";
import { StickerBox } from "./10a/StickerBox";
import { LineIcon, type LineIconName } from "./10a/LineIcon";
import { popIn } from "./10a/KindredBar";
import { PLAY_TRAY, playCardFill, playTrayHeight } from "./10a/kit";
import type { KChatTrace } from "../../modules/kindredly-ui/src/Conversation";

/* THE "+" IS NOT AN ATTACHMENT BUTTON.
   ────────────────────────────────────────────────────────────────────────
   In every chat app the plus opens a drawer of things to SEND — files,
   photos, stickers. Here it opens a list of things to LEAVE: every row
   adds something to the relationship rather than to the scroll. That is
   the whole difference between a messaging surface and a shared space,
   and it is why this sheet is titled by the act rather than by the
   contents.

   Rows that aren't built yet are shown LOCKED and dimmed rather than
   hidden or, worse, live-looking and dead. The settings panel taught that
   lesson: a row that looks like a feature and does nothing is worse than
   no row, but a row that plainly says "not yet" is an honest promise.

   10a (step 5): every colour is the theme's — the tray was a fixed
   #F3F2FA with white cells, a white slab in Midnight inside the themed
   Wren desk (spec bug 11).

   Three forms live here: the sheet (LeaveATrace), the 10a tray of cards
   (TraceTray: Wren's desk), and the chat composers' + tray (PlayTray: a
   room's four plays on their mood fills, owner 2026-10-18). */

export type TraceKind = "note" | "ask" | "moment" | "song" | "photo" | "bug" | "idea";

export interface TraceAction {
  id: TraceKind;
  title: string;
  sub: string;
  locked?: boolean;
}

/* line icons in the post's own hand — the sheet is a list of things to
   leave, so each row is drawn, not pasted in from the emoji keyboard. The
   same drawings are KLineGlyph's note / ask / moment / song / bug / idea
   in SwiftUI (one 18 grid), so the tray reads the same in both renderers.
   `size` scales the drawing; `stroke` is the line on screen, in points
   (1.4 at 18, as it always was; the 10a cards draw 2 at 28). */
export function TraceIcon({ kind, color, size = 18, stroke = 1.4 }: { kind: TraceKind; color: string; size?: number; stroke?: number }) {
  const c = { stroke: color, strokeWidth: (stroke * 18) / size, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const box = { width: size, height: size, viewBox: "0 0 18 18" };
  switch (kind) {
    case "note":
      return (
        <Svg {...box}>
          <Path d="M4 2.5h7l3 3v10H4z" {...c} />
          <Path d="M11 2.5v3h3" {...c} />
          <Line x1={6.5} y1={9} x2={11.5} y2={9} {...c} />
          <Line x1={6.5} y1={12} x2={10} y2={12} {...c} />
        </Svg>
      );
    case "ask":
      return (
        <Svg {...box}>
          <Path d="M3 3.5h12v8H8.5L5.5 14v-2.5H3z" {...c} />
          <Path d="M7.6 6.6a1.5 1.5 0 1 1 2.1 1.4c-.5.3-.7.6-.7 1.1" {...c} />
          <Circle cx={9} cy={10.6} r={0.6} fill={color} />
        </Svg>
      );
    case "moment":
      return (
        <Svg {...box}>
          <Rect x={2.5} y={5} width={13} height={9.5} {...c} />
          <Path d="M6.5 5l1-2h3l1 2" {...c} />
          <Circle cx={9} cy={9.7} r={2.4} {...c} />
        </Svg>
      );
    case "song":
      return (
        <Svg {...box}>
          <Path d="M7 13.5V4.5l7-1.5v9" {...c} />
          <Circle cx={5} cy={13.5} r={2} {...c} />
          <Circle cx={12} cy={12} r={2} {...c} />
        </Svg>
      );
    /* Wren's desk: what you hand the makers — a picture (a screenshot,
       usually), a bug, an idea */
    case "photo":
      return (
        <Svg {...box}>
          <Rect x={2.5} y={3} width={13} height={12} {...c} />
          <Path d="M2.5 12l3.5-3.5 3 3 2-2 4.5 4.5" {...c} />
          <Circle cx={11.5} cy={6.5} r={1.3} {...c} />
        </Svg>
      );
    case "bug":
      return (
        <Svg {...box}>
          <Path d="M6 8a3 3 0 0 1 6 0v3.5a3 3 0 0 1-6 0z" {...c} />
          <Path d="M7 5.5l-1.5-2M11 5.5l1.5-2" {...c} />
          <Line x1={9} y1={8} x2={9} y2={14.5} {...c} />
          <Path d="M6 9H3.5M12 9h2.5M6 12l-2 1.5M12 12l2 1.5" {...c} />
        </Svg>
      );
    case "idea":
      return (
        <Svg {...box}>
          <Path d="M5.5 7.5a3.5 3.5 0 1 1 5.6 2.8c-.6.5-.9 1-.9 1.7H7.8c0-.7-.3-1.2-.9-1.7A3.5 3.5 0 0 1 5.5 7.5z" {...c} />
          <Line x1={7.8} y1={14} x2={10.2} y2={14} {...c} />
          <Line x1={8.3} y1={15.5} x2={9.7} y2={15.5} {...c} />
        </Svg>
      );
  }
}

function LockIcon({ color, size = 14 }: { color: string; size?: number }) {
  const c = { stroke: color, strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Rect x={2.5} y={6} width={9} height={6.5} {...c} />
      <Path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" {...c} />
    </Svg>
  );
}

/** The sheet form (a title, then a row per trace), on the theme. */
export function LeaveATrace({
  open,
  actions,
  onPick,
  onClose,
}: {
  open: boolean;
  actions: TraceAction[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  useLang(); // repaint when the reader changes language
  const insets = useSafeAreaInsets();
  const { t: tk, dark } = useTheme();
  if (!open) return null;

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* the 10a dim (KDim.composer; black on Midnight, lib/theme scrimColor) */}
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")} style={{ flex: 1, backgroundColor: scrimColor(dark, 0.3) }} />
      </Animated.View>

      {/* on Midnight the sheet carries LeaveSheet's ln rule on top: sf on the dimmed page is
          1.1:1, so without an edge the sheet melts into the page (the light themes keep none) */}
      <Animated.View
        entering={SlideInDown.duration(260)}
        style={{ backgroundColor: tk.sf, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: dark ? 1 : 0, borderTopColor: tk.ln, paddingBottom: Math.max(insets.bottom, 12) + 6 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12 }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: MONO.title * 0.16, color: tk.ink }}>
            {t("lat.title")}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")}>
            <Text style={{ fontFamily: PF.mono, fontSize: 16, color: tk.mute }}>✕</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 4 }}>
          {actions.map((a, i) => (
            <Pressable
              key={a.id}
              disabled={a.locked}
              onPress={() => onPick(a.id)}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!a.locked }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 15,
                borderBottomWidth: i === actions.length - 1 ? 0 : 1,
                borderBottomColor: tk.line,
                opacity: a.locked ? 0.38 : pressed ? 0.55 : 1,
              })}
            >
              <View style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 1.5, borderColor: tk.line, alignItems: "center", justifyContent: "center" }}>
                <TraceIcon kind={a.id} color={tk.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: tk.ink }}>{a.title}</Text>
                {!!a.sub && <Text style={{ fontFamily: "Newsreader-Italic", fontStyle: "italic", fontSize: 13, color: tk.sub, marginTop: 1 }}>{a.sub}</Text>}
              </View>
              {a.locked ? <LockIcon color={tk.mute} /> : <Text style={{ fontFamily: PF.mono, fontSize: 13, color: tk.faint }}>›</Text>}
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

/* the 10a choice card's numbers (KChoiceCard, H:132): the least height
   inside the outline, the grid's inset and gap */
const CARD_MIN = 116;
const TRAY_INSET = 12;
const TRAY_GAP = 10;

/** The tray's height: the keyboard's place (its last height, or 260 above the home indicator),
    never less than the whole 2×2 grid at its least (KChatTray.height's rule). */
export function traceTrayHeight(lastKeyboard: number, bottomInset: number): number {
  const keyboard = lastKeyboard > 0 ? lastKeyboard : 260 + bottomInset;
  const grid = 2 * (CARD_MIN + 4) + TRAY_GAP + 2 * TRAY_INSET + 1 + bottomInset;
  return Math.max(keyboard, grid);
}

/* THE SAME CHOICES, AS A TRAY (owner, 2026-09-20): under the bar where the
   keyboard was — a chat app's drawer — instead of a sheet with a title.

   10a (KChatTray's React Native twin): the tray is the theme's soft with a
   line on top; the choices are the composer-card material two by two, 10
   apart, inset 12 — sf, a 2 ln outline, corners 18, a hard 3/3 ln shadow,
   at least 116 tall — each with its drawing at 28 in ink at a 2pt line,
   the title in mono 600 11 caps and the italic line under it in sub.
   Pressed, a card drops onto its shadow. Locked cards are dimmed with the
   lock in an ind disc. Larger type scrolls inside. Give it the keyboard's
   last height (traceTrayHeight) so it takes exactly the keyboard's place. */
export function TraceTray({
  actions,
  onPick,
  height,
  bottomInset = 0,
}: {
  actions: TraceAction[];
  onPick: (kind: TraceKind) => void;
  /** the tray's height (traceTrayHeight); default: 260 above the home indicator, at least the grid */
  height?: number;
  /** the home indicator's inset, kept clear under the cards */
  bottomInset?: number;
}) {
  useLang();
  const { t: tk } = useTheme();
  const rows: TraceAction[][] = [];
  for (let i = 0; i < actions.length; i += 2) rows.push(actions.slice(i, i + 2));
  return (
    <View style={{ height: height ?? traceTrayHeight(0, bottomInset), backgroundColor: tk.soft, borderTopWidth: 1, borderTopColor: tk.line }}>
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: TRAY_INSET, paddingRight: TRAY_INSET + 3, paddingBottom: TRAY_INSET + 3 + bottomInset, gap: TRAY_GAP }}
      >
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: "row", gap: TRAY_GAP }}>
            {row.map((a) => (
              <TraceCard key={a.id} a={a} onPick={onPick} />
            ))}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/* THE + TRAY (chat composers, Prompt 6; the owner's final, 2026-10-18;
   KChatTray's React Native twin): a room's Kindreds bar opens it under the
   bar, which rides 12 above it. Four small things to leave. (Wren's desk
   keeps TraceTray above: what you hand the makers is not this.)

     ╭──────────────────────────────────────────╮   a sheet on sf, corners 28 28 0 0, a soft
     │                  ▬▬▬▬                    │   shadow up over the gap (Midnight: black,
     │  Leave something small                   │   and a 1pt line edge: no shadow shows on
     │ ┌─────────────────┐ ┌─────────────────┐  │   its page); padding 12 16 0; the handle
     │ │ ▤  Fold a note  │ │ ?  Ask something│  │   40 × 6 in line, 10 above the title (system
     │ └─────────────────┘ └─────────────────┘  │   13 in mute, 4 in, as written), 10 above
     │ ┌─────────────────┐ ┌─────────────────┐  │   the grid
     │ │ ◘  Tiny moment  │ │ ♫  Leave a song │  │
     │ └─────────────────┘ └─────────────────┘  │
     ╰──────────────────────────────────────────╯

   · 270 tall over the iPhone's 34 home inset (kit playTrayHeight: 236 above
     the inset, the inset or 14 below the grid); larger type scrolls inside.
   · THE CARDS, two by two, 10 apart: at least 84 tall (both in a row one
     height), a 2 ln outline, corners 18, padding 0 14, 12 between the I1
     icon (26 at 1.9, in ink) and the words: the trace's title in system 600
     15 (sentence case, Prompt 7) and its line in system 11 on 1.3 in sub.
     Each on its mood's fill (build-items roomTraces: calm Fold a note,
     tired Ask something, low Tiny moment, happy Leave a song), and on
     Midnight the mood's ink mixed 30% into sf (kit playCardFill). Pressed,
     a card goes a little smaller.
   · The four cards pop in together (kpopin, .35s); under Reduce Motion they
     are simply there. How the tray itself rises and goes is the screen's
     (RoomRN: useKeyboardTray, in the keyboard's place).
   · A card runs its flow (onPick); the screen closes the tray. VoiceOver's
     escape on a card closes it (the screen wraps it). */
export function PlayTray({
  traces,
  title,
  onPick,
  bottomInset = 0,
}: {
  traces: KChatTrace[];
  /** "Leave something small", drawn as written; "" for none */
  title: string;
  onPick: (key: string) => void;
  /** the home indicator's inset, kept clear under the cards */
  bottomInset?: number;
}) {
  useLang();
  const { t: tk, dark } = useTheme();
  const reduce = useReducedMotion();
  const rows: KChatTrace[][] = [];
  for (let i = 0; i < traces.length; i += 2) rows.push(traces.slice(i, i + 2));
  return (
    <View
      style={{
        height: playTrayHeight(bottomInset),
        backgroundColor: tk.sf,
        borderTopLeftRadius: PLAY_TRAY.radius,
        borderTopRightRadius: PLAY_TRAY.radius,
        // Midnight's edge, as KFloat's: sf is barely off the page there
        borderWidth: dark ? 1 : 0,
        borderBottomWidth: 0,
        borderColor: tk.line,
        paddingTop: 12,
        paddingHorizontal: 16,
        // the soft shadow up over the gap (0 -10 30 -12 rgba(30,27,53,.35)); black on Midnight
        shadowColor: dark ? "#000000" : "#1E1B35",
        shadowOpacity: dark ? 0.6 : 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -8 },
      }}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ alignSelf: "center", width: 40, height: 6, borderRadius: 3, backgroundColor: tk.line, marginBottom: 10 }} />
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: PLAY_TRAY.gap, paddingBottom: Math.max(14, bottomInset) }}>
        {!!title && (
          <Text accessibilityRole="header" style={{ fontSize: 13, color: tk.mute, marginLeft: 4 }}>
            {title}
          </Text>
        )}
        {rows.map((row) => (
          <View key={row[0].key} style={{ flexDirection: "row", gap: PLAY_TRAY.gap }}>
            {row.map((tr) => (
              <Animated.View key={tr.key} entering={reduce ? undefined : CARD_IN} style={{ flex: 1 }}>
                <PlayCard trace={tr} onPick={onPick} />
              </Animated.View>
            ))}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const CARD_IN = popIn(350);
const I1_PLAYS = new Set<KChatTrace["glyph"]>(["foldNote", "askSomething", "tinyMoment", "leaveSong"]);

function PlayCard({ trace, onPick }: { trace: KChatTrace; onPick: (key: string) => void }) {
  const { t: tk } = useTheme();
  const old = !I1_PLAYS.has(trace.glyph);
  return (
    <Pressable
      onPress={() => onPick(trace.key)}
      accessibilityRole="button"
      accessibilityLabel={trace.subtitle ? `${trace.title}, ${trace.subtitle}` : trace.title}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: PLAY_TRAY.card,
        borderWidth: 2,
        borderColor: tk.ln,
        borderRadius: 18,
        backgroundColor: playCardFill(tk, trace.tint),
        // padding 0 14 inside the 2 outline; a little top and bottom keeps a long translation off it
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {old ? <TraceIcon kind={trace.glyph as TraceKind} color={tk.ink} size={26} stroke={1.9 * (26 / 24)} /> : <LineIcon name={trace.glyph as LineIconName} size={26} color={tk.ink} />}
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: "600", color: tk.ink }}>
          {trace.title}
        </Text>
        {!!trace.subtitle && (
          <Text numberOfLines={3} style={{ fontSize: 11, lineHeight: 14.3, color: tk.sub }}>
            {trace.subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function TraceCard({ a, onPick }: { a: TraceAction; onPick: (kind: TraceKind) => void }) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      disabled={a.locked}
      onPress={() => onPick(a.id)}
      accessibilityRole="button"
      accessibilityLabel={a.sub ? `${a.title}, ${a.sub}` : a.title}
      accessibilityState={{ disabled: !!a.locked }}
      style={{ flex: 1, opacity: a.locked ? 0.45 : 1 }}
    >
      {({ pressed }) => (
        <StickerBox
          fill={tk.sf}
          stroke={tk.ln}
          lineWidth={2}
          radius={18}
          shadow={tk.ln}
          offset={3}
          pressed={pressed && !a.locked}
          faceStyle={{ minHeight: CARD_MIN + 4, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 14 }}
        >
          <TraceIcon kind={a.id} color={tk.ink} size={28} stroke={2} />
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: MONO.title * 0.1, color: tk.ink, textAlign: "center", marginTop: 4 }}
          >
            {a.title.toLocaleUpperCase(localeTag())}
          </Text>
          {!!a.sub && (
            <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: "Newsreader-Italic", fontStyle: "italic", fontSize: 13, color: tk.sub, textAlign: "center" }}>
              {a.sub}
            </Text>
          )}
          {a.locked && (
            <View style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: tk.ind, alignItems: "center", justifyContent: "center" }}>
              <LockIcon color={tk.bg} size={12} />
            </View>
          )}
        </StickerBox>
      )}
    </Pressable>
  );
}
