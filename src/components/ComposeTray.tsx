import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { t } from "../lib/i18n";
import { MONO, P as STATIC_P, PFM } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { MOOD_CATEGORIES, SEASONAL_CAT, STAMP_CATEGORIES, STAMPS, getStamp, sname, stampsByCat } from "../data/stamps";
import { SEASONAL_STAMPS } from "../lib/season-core";
import { useSeason } from "../lib/season";
import "../data/strings-season"; // season.tray.mark
import { BIRTHDAY_STAMP, birthdayStampAllows } from "../lib/birthday-stamp-core";
import { useBirthdayStamp } from "../lib/birthday-stamp"; // (it registers bd.stamp.*)
import { Stamp, StampSlot } from "./Stamp";
import { STAMP_LADDER, stampSlotStroke } from "../lib/stamp-frame";
import "../data/strings-stamps2"; // cs2.tray.* and the 3/3 card's words
import { trayNameFit, trayNameHex } from "../screens/compose/compose-model";

/* THE TWO ROUND KEYS UNDER THE LETTER, AND WHAT THEY OPEN.
   ────────────────────────────────────────────────────────────────────────
   A messaging keyboard's shape (owner, 2026-09-20): a stamp key and a ⊕
   key where the ? and the microphone used to stand square. Each opens a
   tray where the keyboard was.

   The stamp tray: a tab row — the 36, and my own photo stamps (only while
   the feature exists for the reader) — then the stamps this letter
   suggests, the ones used lately, and all thirty-six in their categories;
   or, on the custom tab, a dashed + (the Stamp Press) and my stamps.
   The ⊕ tray: the question and the voice letter.

   COLOURS. The keys, trays and glyphs are chrome and take the theme: P
   comes from useP() in each component, a glyph's default ink is read
   inside it (not in its parameter list), the trays' lavender ground is
   soft with its cells on sf, ring outlines are ln, and anything drawn on
   an ink or ind fill is the page colour. Content keeps its own colours: the
   stamps and their names, the amber pencil and photo sun, the red shutter.
   One exception: StampGlyph's default ink stays the static one, because
   the caller that leans on it is the stamps guide reel, a picture with its
   own fixed colours; the tray passes the theme's ink explicitly.

   REDUCE MOTION (as the SwiftUI page does): the nudge stands still, and
   the plus and the stamp key change state at once instead of turning and
   coming apart. Read once per glyph (reanimated's useReducedMotion, as
   LetterTravel reads it). */

export const TRAY_H = 296;

/* THE DOORS (owner, 2026-09-23 → 2026-10-19). They stayed shut while the
   custom stamp was a door to nothing (a reviewer who taps one and gets
   nothing is a rejection). The Stamp Press exists now, so the row is back
   with TWO tabs, the WeChat sticker panel's (owner 2026-10-19, contract §7
   C): the 36 (StampGlyph) and my own photo stamps (CustomGlyph). The stamp
   cam tab is gone: the press is the custom tab's dashed +. Even open, the
   row is drawn only when the caller passes a custom tab that isn't
   "hidden" (the 0038 quota answered and this binary has the press, D10);
   otherwise the tray is exactly the old one. */
const DOORS_OPEN = true;

/* ── THE GLYPH FAMILY (design sheet 2026-09-20, set 1a "Perf Line") ──
   One perforated square is the mother shape; only what sits inside it
   changes. STAMP: a face — it is a MOOD stamp, and a moon would read as
   one particular stamp. CUSTOM: a photo with a pen-blue plus in the
   corner — your picture becomes a stamp. (CAM, a lens in the square, was
   dropped with its tab on 2026-10-19.)
   PLUS turns 45° into × while its tray is open, so closing needs no
   second key. 1.6px strokes, short-dash perforation, nothing else. */
const Perf = ({ color }: { color: string }) => <Rect x={3.5} y={3.5} width={17} height={17} rx={1} stroke={color} strokeWidth={1.6} strokeDasharray="1.4 1.6" fill="none" />;

export function StampGlyph({ size = 22, color = STATIC_P.ink, face }: { size?: number; color?: string; face?: string }) {
  /* `face`: the face in its own colour while the tray is open — an
     emotional stamp lights up when asked (owner, 2026-09-20) */
  const f = face ?? color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Perf color={color} />
      <Circle cx={9.4} cy={10.4} r={1.1} fill={f} />
      <Circle cx={14.6} cy={10.4} r={1.1} fill={f} />
      <Path d="M8.9 14.1c1.1 1.6 5.1 1.6 6.2 0" stroke={f} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/* THE PLUS TURNS, THE RING STAYS. Tapped, the plus rotates 45° into a
   cross and takes the pen colour — the key does not go black (owner,
   2026-09-20). It turns back on close. Something attached to the letter
   (a question, the voice) shows as a pen dot on the ring, not a fill. */
export function PlusGlyph({ size = 22, color, open = false }: { size?: number; color?: string; open?: boolean }) {
  const P = useP();
  const ink = color ?? P.ink;
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) {
      v.setValue(open ? 1 : 0);
      return;
    }
    Animated.timing(v, { toValue: open ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }).start();
  }, [open, v, reduce]);
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 6v12M6 12h12" stroke={ink} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

/** the pen dot on a ring: something is attached. Its edge is the page
    colour, so the dot reads as cut out of the ring. */
export function KeyDot() {
  const P = useP();
  const { t: tk } = useTheme();
  return <View pointerEvents="none" style={{ position: "absolute", top: 2, right: 2, width: 9, height: 9, borderRadius: 4.5, backgroundColor: P.pen, borderWidth: 1.5, borderColor: tk.bg }} />;
}
/* CUSTOM (owner's pick 2f, 2026-09-20; the + added 2026-10-19): your
   photo mounted inside the perforated square — a stamp already — and a
   pen-blue + in its top-right corner on a disc of the tray's ground, so it
   reads cut out of the square: your picture becomes a stamp. The same
   drawing as the SwiftUI tray's KTrayCustomGlyph. */
export function CustomGlyph({ size = 22, color, plus, cut }: { size?: number; color?: string; plus?: string; cut?: string }) {
  const P = useP();
  const { t: tk } = useTheme();
  const ink = color ?? P.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Perf color={ink} />
      <Rect x={6.5} y={6.5} width={11} height={11} stroke={ink} strokeWidth={1.3} fill="none" />
      <Circle cx={10} cy={10} r={1.4} fill="#F2A33A" />
      <Path d="M6.5 17.5l3.4-3.8 2.2 2.2 1.8-1.8 3.6 3.4z" fill={ink} />
      <Circle cx={19} cy={5.5} r={4} fill={cut ?? tk.soft} />
      <Path d="M19 3v5M16.5 5.5h5" stroke={plus ?? tk.ind} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/* the ⊕ tray's two: a drawn question mark and a drawn microphone — same
   1.6px line as the family, round caps; the typed "?" and the 🎙 emoji sat
   in a row of line icons like two guests in the wrong clothes */
function QuestionGlyph({ size = 26, color }: { size?: number; color?: string }) {
  const P = useP();
  const ink = color ?? P.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8.6 9.2a3.4 3.4 0 1 1 5.2 2.9c-1.2.8-1.8 1.5-1.8 2.9" stroke={ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={18.6} r={1.25} fill={ink} />
    </Svg>
  );
}
function MicGlyph({ size = 26, color }: { size?: number; color?: string }) {
  const P = useP();
  const ink = color ?? P.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3.5} width={6} height={10.5} rx={3} stroke={ink} strokeWidth={1.7} />
      <Path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3M9 20.5h6" stroke={ink} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

/** a round key in the bar */
export function RoundKey({
  on,
  onPress,
  children,
  badge,
  accessibilityLabel,
}: {
  on?: boolean;
  onPress: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
  /** what VoiceOver calls the key (its drawing says nothing) */
  accessibilityLabel?: string;
}) {
  const P = useP();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 46,
        height: 46,
        borderRadius: 23,
        // no ring (owner's rule B, 2026-10-26; KComposeIconKey: the glyph alone)
        backgroundColor: on ? P.ink : "transparent",
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
      {badge}
    </Pressable>
  );
}

const COLS = 6;

/** One stamp as a tray section lists it (screens/compose compose-model StampItemVM). */
export type TrayStamp = { id: string; name: string; inkHex: string; a11yLabel: string };
/** `mark`: a seasonal set's small marker beside its head ("SEASONAL") */
export type TraySection = { title: string; items: TrayStamp[]; mark?: string };
/** The custom tab (screens/compose compose-model customTray): hidden = no tab row. */
export type TrayCustom = { state: "hidden" | "empty" | "list"; items: { id: string; topic: string; hex: string; a11yLabel: string }[]; full: boolean };

/* THE STAMP TRAY. Given `sections` (the compose page's, built by
   compose-model stampSections: unknown ids already dropped, names in each
   stamp's name colour), it lists those — the same sections the SwiftUI
   page's tray shows. Without them it builds its own from `suggested` and
   `recent`, as it always has. Names are mono 9 and heads mono 10 (the 10a
   9/10/11 rule), and a name's colour is the stamp's nameLight on the light
   themes and nameDark on Midnight (compose-model trayNameHex, stamps v3),
   measured on this tray's soft: ≥ 4.5:1 on every theme.

   Each tile is the stamp itself at the ladder's trayTile, 30×36 (the
   owner, 2026-10-18: the App Store tray's size; 40×48 read too big for a
   picker of 36): your own stamp, so flat, and nothing framed round it — a
   stamp is never put inside another tile's border. The picked one keeps
   the selection it always had, the pen ring 2pt out from its edge. Its
   name sits on one line wherever it fits (at 9, else 8; compose-model
   trayNameFit), and only a name that fits neither wraps, in up to three
   lines at 9 (else at 8), never cut (a11y pass cm-9). */
const TILE = STAMP_LADDER.trayTile;

export function StampTray({
  selected,
  suggested = [],
  recent = [],
  sections,
  onPick,
  custom,
  tab = "official",
  fullTitle = "",
  onTab,
  onMake,
  onFullCta,
}: {
  selected: string | null;
  suggested?: string[];
  recent?: string[];
  sections?: TraySection[];
  onPick: (id: string) => void;
  /** the custom tab; absent or hidden = no tab row (contract D10) */
  custom?: TrayCustom;
  tab?: "official" | "custom";
  /** the 3/3 card's title, with its count */
  fullTitle?: string;
  onTab?: (tab: "official" | "custom") => void;
  onMake?: () => void;
  onFullCta?: () => void;
}) {
  const P = useP();
  const { t: tk } = useTheme();
  const tabs = DOORS_OPEN && !!custom && custom.state !== "hidden";
  const shown = tabs ? tab : "official";
  const [fullCard, setFullCard] = useState(false);
  useEffect(() => setFullCard(false), [shown]);
  // a name's room: the column (the tray's width less its two 10 gutters, over six) less 3 either
  // side, so two neighbours' names never read as one (can't sleep made my day)
  const room = (useWindowDimensions().width - 20) / COLS - 6;
  // without `sections` the tray builds its own: the season's stamps first while it lasts
  const seasonStamps = useSeason().stamps;
  // …and before them, on the reader's own birthday, the birthday stamp (owner's audit, 2026-11-10)
  const birthdayStamp = useBirthdayStamp();
  const tile = (it: TrayStamp, sectionKey: string) => {
    const on = selected === it.id;
    const fit = trayNameFit(it.name, room);
    return (
      <Pressable
        key={`${sectionKey}:${it.id}`}
        onPress={() => onPick(it.id)}
        hitSlop={2}
        accessibilityRole="button"
        accessibilityLabel={it.a11yLabel}
        accessibilityState={{ selected: on }}
        style={({ pressed }) => ({ width: `${100 / COLS}%`, alignItems: "center", paddingTop: 6, paddingBottom: 4, opacity: pressed ? 0.6 : 1 })}
      >
        <View style={{ padding: 2, borderWidth: 2, borderColor: on ? P.pen : "transparent", borderRadius: 7 }}>
          <Stamp id={it.id} width={TILE.w} />
        </View>
        {/* its name, in its own ink — a stamp is a word as much as a picture; one line where it
            fits, more only for the long ones (never told anyone, mi ha fatto la giornata) */}
        <Text numberOfLines={fit.lines} style={{ ...PFM.monoMed, fontSize: fit.size, letterSpacing: 0.2, color: it.inkHex, marginTop: 2, maxWidth: room, textAlign: "center" }}>
          {it.name}
        </Text>
      </Pressable>
    );
  };
  const section = (key: string, label: string, items: TrayStamp[], mark = "") =>
    items.length ? (
      <View key={key} style={{ marginBottom: 6 }}>
        <View accessible accessibilityRole="header" accessibilityLabel={mark ? `${label}, ${mark}` : label} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 6, marginTop: 10, marginBottom: 4 }}>
          <Text style={{ ...PFM.monoSemi, fontSize: MONO.label, letterSpacing: 1.4, color: P.ink40 }}>{label}</Text>
          {/* a seasonal set (Halloween 2026): a small pumpkin tag, the same in every theme (KStampTray's) */}
          {!!mark && (
            <Text style={{ ...PFM.monoSemi, fontSize: 8, letterSpacing: 1, color: "#1E1B35", backgroundColor: "#FEF2E4", borderColor: "#F39420", borderWidth: 1, borderRadius: 8, overflow: "hidden", paddingHorizontal: 5, paddingVertical: 1 }}>{mark}</Text>
          )}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{items.map((it) => tile(it, key))}</View>
      </View>
    ) : null;
  // a seasonal stamp out of its season is offered nowhere (not as a recent or a suggestion either);
  // nor is the birthday stamp on any day but the reader's birthday
  const known = new Set(STAMPS.map((s) => s.id).filter((id) => (!SEASONAL_STAMPS.has(id) || seasonStamps.includes(id)) && birthdayStampAllows(id, birthdayStamp)));
  const seasonCat = STAMP_CATEGORIES.find((c) => c.id === SEASONAL_CAT);
  const own = (ids: string[]): TrayStamp[] =>
    ids
      .filter((id) => known.has(id))
      .map((id) => {
        const st = getStamp(id);
        const name = sname(st?.name);
        // lower case, as the #name pill says it (owner, 2026-10-18); the set titles stay in capitals
        return { id, name: name.toLowerCase(), inkHex: trayNameHex(st, tk.dark, tk.ink), a11yLabel: name };
      });
  return (
    <View style={{ height: TRAY_H, backgroundColor: tk.soft, borderTopWidth: 1, borderTopColor: P.ink12 }}>
      {/* the tab row (WeChat's sticker panel): the 36, my own stamps — 44 tall, the chosen tab on
          soft2, a 1pt line under it */}
      {tabs && (
        <View style={{ height: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: tk.line }}>
          {(["official", "custom"] as const).map((which) => {
            const on = shown === which;
            return (
              <Pressable
                key={which}
                onPress={() => !on && onTab?.(which)}
                accessibilityRole="tab"
                accessibilityLabel={t(which === "official" ? "cs2.tray.tabOfficial" : "cs2.tray.tabCustom")}
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({ width: 44, height: 36, borderRadius: 9, backgroundColor: on ? tk.soft2 : "transparent", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : on ? 1 : 0.55 })}
              >
                {which === "official" ? <StampGlyph size={22} color={P.ink} /> : <CustomGlyph size={22} color={P.ink} cut={tk.soft} />}
              </Pressable>
            );
          })}
        </View>
      )}
      <ScrollView key={shown} contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 4, paddingBottom: 18 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {shown === "custom" && custom ? (
          <View style={{ marginBottom: 6 }}>
            <Text accessibilityRole="header" style={{ ...PFM.monoSemi, fontSize: MONO.label, letterSpacing: 1.4, color: P.ink40, paddingHorizontal: 6, marginTop: 10, marginBottom: 4 }}>{t("cs2.tray.custom")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {/* the dashed +: the Stamp Press, or (Free at 3/3) the small card */}
              <Pressable
                onPress={() => (custom.full ? setFullCard(true) : onMake?.())}
                hitSlop={2}
                accessibilityRole="button"
                accessibilityLabel={t("cs2.use.a11yMake")}
                style={({ pressed }) => ({ width: `${100 / COLS}%`, alignItems: "center", paddingTop: 6, paddingBottom: 4, opacity: pressed ? 0.6 : 1 })}
              >
                <View style={{ padding: 4 }}>
                  <StampSlot width={TILE.w} stroke={stampSlotStroke(tk)} />
                  <View pointerEvents="none" style={{ position: "absolute", left: 4, right: 4, top: 4 + (9 / 120) * TILE.h, bottom: 4 - (9 / 120) * TILE.h, alignItems: "center", justifyContent: "center" }}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path d="M12 7v10M7 12h10" stroke={tk.ind} strokeWidth={2.7} strokeLinecap="round" />
                    </Svg>
                  </View>
                </View>
              </Pressable>
              {custom.items.map((it) => {
                const on = selected === it.id;
                return (
                  <Pressable
                    key={it.id}
                    onPress={() => onPick(it.id)}
                    hitSlop={2}
                    accessibilityRole="button"
                    accessibilityLabel={it.a11yLabel}
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => ({ width: `${100 / COLS}%`, alignItems: "center", paddingTop: 6, paddingBottom: 4, opacity: pressed ? 0.6 : 1 })}
                  >
                    <View style={{ padding: 2, borderWidth: 2, borderColor: on ? P.pen : "transparent", borderRadius: 7 }}>
                      <Stamp id={it.id} width={TILE.w} />
                    </View>
                    <Text numberOfLines={1} style={{ ...PFM.monoMed, fontSize: 9, letterSpacing: 0.2, color: tk.sub, marginTop: 2, maxWidth: room, textAlign: "center" }}>
                      {it.topic}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {custom.items.length === 0 && (
              <Text style={{ fontSize: 14, lineHeight: 20, color: tk.sub, paddingHorizontal: 6, marginTop: 6 }}>{t("cs2.tray.empty")}</Text>
            )}
          </View>
        ) : sections ? (
          sections.map((s, i) => section(`${i}:${s.title}`, s.title, s.items, s.mark))
        ) : (
          [
            // the reader's birthday: the birthday stamp, alone, first of all, marked as today's only
            birthdayStamp && section("birthday", t("bd.stamp.set"), own([BIRTHDAY_STAMP]), t("bd.stamp.mark")),
            seasonCat && section(SEASONAL_CAT, sname(seasonCat.name).toUpperCase(), own(seasonStamps), t("season.tray.mark")),
            section("suggested", t("cp.forThisLetter"), own(suggested)),
            section("recent", t("cp.recent"), own(recent)),
            ...MOOD_CATEGORIES.map((cat) => section(cat.id, sname(cat.name).toUpperCase(), own(stampsByCat(cat.id).map((s) => s.id)))),
          ]
        )}
      </ScrollView>
      {/* the 3/3 card: Free has made its three */}
      {fullCard && custom?.full && (
        <Pressable accessibilityElementsHidden onPress={() => setFullCard(false)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: tk.soft + "B8", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 300 }}>
            {/* a flat panel (owner's rule B, 2026-10-26): no ink edge, no hard shadow; a line hairline in Midnight */}
            <View style={{ backgroundColor: tk.sf, borderWidth: tk.dark ? 1 : 0, borderColor: tk.line, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6 }}>
              <Text accessibilityRole="header" style={{ ...PFM.monoSemi, fontSize: 11, letterSpacing: 1.3, color: tk.ink }}>{fullTitle}</Text>
              <Pressable accessibilityRole="button" onPress={() => { setFullCard(false); onFullCta?.(); }} style={{ minHeight: 44, justifyContent: "center", marginTop: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: tk.ind }}>{t("cs2.me.fullCta")}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setFullCard(false)} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text style={{ fontSize: 14, color: tk.mute }}>{t("cs2.me.notNow")}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/* THE ⊕ TRAY. `askDisabled` (the compose page while speaking: a recording
   carries no question, and the field is drawn only under a written letter)
   dims the ASK cell, takes its tap away and tells VoiceOver why. */
export function MoreTray({
  askOn,
  askDisabled = false,
  voiceOn,
  premium,
  onAsk,
  onVoice,
}: {
  askOn: boolean;
  askDisabled?: boolean;
  voiceOn: boolean;
  premium: boolean;
  onAsk: () => void;
  onVoice: () => void;
}) {
  const P = useP();
  const { t: tk } = useTheme();
  const cell = (label: string, on: boolean, onPress: () => void, glyph: React.ReactNode, lock?: boolean, disabled?: boolean) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={disabled ? { text: t("cp.askVoice.a11y") } : lock ? { text: t("cp.voiceLocked.a11y") } : undefined}
      accessibilityState={{ selected: on, disabled: !!disabled }}
      style={({ pressed }) => ({ width: 82, alignItems: "center", opacity: disabled ? 0.45 : pressed ? 0.6 : 1 })}
    >
      <View style={{ width: 62, height: 62, borderRadius: 16, backgroundColor: on ? P.ink : tk.sf, borderWidth: 1, borderColor: on ? P.ink : P.ink12, alignItems: "center", justifyContent: "center" }}>
        {glyph}
        {lock && (
          <View style={{ position: "absolute", right: -5, bottom: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: P.pen, alignItems: "center", justifyContent: "center" }}>
            <Svg width={10} height={10} viewBox="0 0 12 12">
              <Path d="M3.7 5.6V4.1a2.3 2.3 0 0 1 4.6 0v1.5" fill="none" stroke={tk.bg} strokeWidth={1.5} strokeLinecap="round" />
              <Rect x={2.5} y={5.6} width={7} height={5} fill={tk.bg} />
            </Svg>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 11, fontWeight: "500", color: P.ink60, marginTop: 8, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ height: TRAY_H, backgroundColor: tk.soft, borderTopWidth: 1, borderTopColor: P.ink12, flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 22 }}>
      {cell(t("cp.tray.ask"), askOn, onAsk, <QuestionGlyph color={askOn ? tk.bg : P.ink} />, false, askDisabled)}
      {cell(t("cp.tray.voice"), voiceOn, onVoice, <View style={{ opacity: premium ? 1 : 0.45 }}><MicGlyph color={voiceOn ? tk.bg : P.ink} /></View>, !premium)}
    </View>
  );
}

/** the stamp a tray pick refers to — for the envelope corner */
export const stampOf = (id: string | null) => (id ? getStamp(id) : null);

/* THE NUDGE. When the key reads PICK A MOOD STAMP, the stamp key is the
   one just to its left — and a small chevron at the key's left edge
   leans toward it, again and again, until a stamp is on the envelope
   (owner, 2026-09-20). Native-driven, not an interaction. Under Reduce
   Motion it stands still. */
export function Nudge({ color }: { color?: string }) {
  const P = useP();
  const ink = color ?? P.pen;
  const reduce = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      x.setValue(0);
      return;
    }
    const sine = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: -4, duration: 520, easing: sine, useNativeDriver: true, isInteraction: false }),
        Animated.timing(x, { toValue: 0, duration: 520, easing: sine, useNativeDriver: true, isInteraction: false }),
        Animated.delay(260),
      ]),
      { resetBeforeIteration: false },
    );
    loop.start();
    return () => loop.stop();
  }, [x, reduce]);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 10, top: 0, bottom: 0, justifyContent: "center", transform: [{ translateX: x }] }}>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M15 5 L8 12 L15 19" stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

/* THE FACE COMES APART, AND A PENCIL ARRIVES (owner, 2026-09-20).
   ────────────────────────────────────────────────────────────────────────
   Closed, the stamp key is the face in the perforated square. Tapped, the
   face breaks — the two eyes fly up and out, the smile drops — and in
   their place a short amber pencil lies across the square's corner, the
   sheet's "Pencil Across": a stamp being made, not a picture of one. The
   ring stays a ring; the fill never goes black. Closing runs it backwards
   and the face reassembles. Every piece is native-driven and none is an
   "interaction". */
export function StampKeyGlyph({ open, size = 23, color }: { open: boolean; size?: number; color?: string }) {
  const P = useP();
  const ink = color ?? P.ink;
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) {
      v.setValue(open ? 1 : 0);
      return;
    }
    Animated.timing(v, { toValue: open ? 1 : 0, duration: 360, easing: open ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }).start();
  }, [open, v, reduce]);
  const u = size / 24; // one viewBox unit in points
  const gone = v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0, 0] });
  const here = v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
  const eyeL = { opacity: gone, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5 * u] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6 * u] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }] };
  const eyeR = { opacity: gone, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 5 * u] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6 * u] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }] };
  const smile = { opacity: gone, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 6 * u] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }] };
  const pencil = { opacity: here, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [6 * u, 0] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [6 * u, 0] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["20deg", "0deg"] }) }] };
  const dot = { opacity: here, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] };
  const abs = { position: "absolute" as const, left: 0, top: 0, width: size, height: size };
  return (
    <View style={{ width: size, height: size }}>
      {/* the square, always */}
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Perf color={ink} />
      </Svg>
      {/* the face, in three pieces */}
      <Animated.View pointerEvents="none" style={[abs, eyeL]}>
        <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={9.4} cy={10.4} r={1.1} fill={ink} /></Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[abs, eyeR]}>
        <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={14.6} cy={10.4} r={1.1} fill={ink} /></Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[abs, smile]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M8.9 14.1c1.1 1.6 5.1 1.6 6.2 0" stroke={ink} strokeWidth={1.6} strokeLinecap="round" /></Svg>
      </Animated.View>
      {/* what takes its place: the ink dot of a stamp being drawn, and the pencil */}
      <Animated.View pointerEvents="none" style={[abs, dot]}>
        <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={10.5} cy={10.5} r={2.4} fill={ink} /></Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[abs, pencil]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <G transform="rotate(45 16.5 16.5)">
            <Rect x={14.6} y={9} width={3.8} height={11} rx={0.6} fill="#F2A33A" stroke={ink} strokeWidth={1.3} />
            <Path d="M14.6 20l1.9 3 1.9-3z" fill={ink} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}
