import { useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View, type TextStyle } from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { KGalleryHost, isKindredlyUIViewAvailable, type KThemeKey } from "../../../modules/kindredly-ui";
import { Stamp, StampSlot } from "../../components/Stamp";
import { STAMPS } from "../../data/stamps";
import { STAMP_LADDER, stampHeight, stampTierV3, tilt, type StampPlacement, type StampPlacementName } from "../../lib/stamp-frame";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import THEMES from "../../theme/themes.json";
import { PF } from "../../theme/post";

/* dev only — STAMPS V3 IN REACT NATIVE (v3 B "character", owner 2026-10-19).
   kindredly:///dev/step5-stamp-art

   Every stamp here is components/Stamp, drawn from lib/stamp-frame (the v3 tiers, the colour
   roles, the tilt, the ladder) and data/stamp-art-v3 (the drawings), to check them on a device
   beside the Swift renderer (KStamp). Tier names are the v3 ones (DOT, XS, S, L). No network, no account: everything is bundled.

   From the top:
   - THEME: the dev theme switch (lib/theme setDevThemeOverride), as in ui-lab. The PLACEMENTS
     section follows it; the LADDER and ALL 36 sheets don't need it, each draws one light
     surface (Classic) and Midnight side by side, whatever the app's theme.
   - LADDER: one stamp from each category at every v3 tier: the dot (9), XS 15 and 20, S 25
     and 30, L 40, 50, 60, 80 and 120 — flat. Then delivered
     at 40, 50, 60, 80 and 120, each tilted by a sample letter id (the four tilts, −2 to +2°, in
     turn; the ids are the golden ones in lib/stamp-frame.test). No postmark (the owner took it
     off on 2026-10-18). Each row scrolls sideways.
   - PLACEMENTS: every entry of STAMP_LADDER at its own size, with its rule (a fixed angle,
     the letter's tilt, or flat), named as the code names it. The compose
     corner shows both states: the empty dashed v3 frame (the theme's mute) and a stamp in it, at 8°.
     The landing wall's scatter is the web's and is drawn flat here.
   - FALLBACK: an id this build doesn't know (the frame alone in #8B7FE8) at XS, S and L, and
     the dot.
   - ALL 36: every stamp at the tray's 30×36 on both surfaces, six to a row, a row per category.
   - SWIFT: the module's gallery (KGalleryHost) after all of it. Until the Swift renderer step
     its STAMPS section still draws the v1 art (KStampArt); it is kept here so the two can be
     compared once KStamp lands. A binary without KindredlyUI says so instead.

   The words are English, typed here: a dev page. */

// one stamp from each category, in category order: confessions, almosts, late nights, small
// things, becoming, missing
const SAMPLE = ["never-told", "crush", "cant-sleep", "made-my-day", "growing", "seasons"];
const FLAT_WIDTHS = [9, 15, 20, 25, 30, 40, 50, 60, 80, 120];
const MAIL_WIDTHS = [40, 50, 60, 80, 120];
// lib/stamp-frame.test's golden letter ids: −3, −1.5, +1.5, +3
const LETTER_IDS = ["00000000-0000-4000-8000-000090000000", "00000000-0000-0000-0000-000000000000", "3f2b8c1e-6a4d-4e2f-9b7a-1c5d8e0f2a61", "e8b1f6c3-2d47-4a95-b06e-3c9a5d1f7b24"];
const ROWS = Array.from({ length: Math.ceil(STAMPS.length / 6) }, (_, r) => STAMPS.slice(r * 6, r * 6 + 6).map((s) => s.id));
const KEYS = Object.keys(THEMES.themes) as KThemeKey[];
const SURFACES: KThemeKey[] = ["classic", "midnight"];

// KType's monoSection (600 10 .14em) and monoCaption (500 10 .06em), as the gallery sets them
const section: TextStyle = { fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4 };
const captionStyle: TextStyle = { fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 0.6 };

export default function Step5StampArt() {
  if (!__DEV__) return <Redirect href="/" />;
  return <StampArtPage />;
}

function StampArtPage() {
  const { key, t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const scroll = useRef<ScrollView>(null);
  const [at, setAt] = useState<Record<string, number>>({});
  const mark = (name: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
    const y = e.nativeEvent.layout.y;
    setAt((m) => (m[name] === y ? m : { ...m, [name]: y }));
  };
  const native = isKindredlyUIViewAvailable("KGalleryView");
  const choices: { label: string; value: KThemeKey | null }[] = [...KEYS.map((k) => ({ label: THEMES.themes[k].name, value: k })), { label: "Off", value: null }];

  const chip = (label: string, on: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: tk.ln,
        backgroundColor: on ? tk.ink : tk.sf,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: on ? tk.sf : tk.ink }}>{label}</Text>
    </Pressable>
  );
  const jump = (label: string, name: string) => chip(label, false, () => scroll.current?.scrollTo({ y: at[name] ?? 0, animated: true }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={[section, { fontSize: 10.5, letterSpacing: 1.3, color: tk.ind, margin: 16, marginBottom: 6 }]}>STEP 5 · STAMPS V3</Text>
        <Text style={[section, { color: tk.mute, marginHorizontal: 16, marginBottom: 8 }]}>
          THEME · {forced ? "FORCED" : "NORMAL"} · {THEMES.themes[key].name.toUpperCase()}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginBottom: 12 }}>
          {choices.map(({ label, value }) => chip(label, forced === value, () => setDevThemeOverride(value)))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginBottom: 16 }}>
          {jump("LADDER ↓", "ladder")}
          {jump("PLACEMENTS ↓", "placements")}
          {jump("ALL 36 ↓", "all")}
          {jump("SWIFT ↓", "swift")}
        </View>

        <View onLayout={mark("ladder")} style={{ paddingHorizontal: 16, gap: 12 }}>
          <Head>LADDER · FLAT, THEN DELIVERED · CLASSIC AND MIDNIGHT</Head>
          {SURFACES.map((k) => (
            <LadderSheet key={k} theme={k} />
          ))}
        </View>

        <View onLayout={mark("placements")} style={{ paddingHorizontal: 16, paddingTop: 24, gap: 12 }}>
          <Head>PLACEMENTS · STAMP_LADDER · THIS THEME</Head>
          <Placements />
          <Head>FALLBACK · UNKNOWN ID AT 20, 40, 80 · THE DOT AT 9</Head>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 14 }}>
            <Stamp id="no-such-stamp" width={20} />
            <Stamp id="no-such-stamp" width={40} />
            <Stamp id="no-such-stamp" width={80} />
            <Stamp id="no-such-stamp" width={9} />
            <Stamp id="growing" width={9} />
          </View>
        </View>

        <View onLayout={mark("all")} style={{ paddingHorizontal: 16, paddingTop: 24, gap: 12 }}>
          <Head>ALL {STAMPS.length} · TRAY 30×36 · A ROW PER CATEGORY</Head>
          {SURFACES.map((k) => (
            <AllSheet key={k} theme={k} />
          ))}
        </View>

        <View onLayout={mark("swift")} style={{ paddingTop: 24, gap: 12 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <Head>SWIFT · KGALLERY (KSTAMP)</Head>
          </View>
          {native ? (
            <KGalleryHost theme={key} />
          ) : (
            <Text style={{ fontSize: 15, lineHeight: 22, color: tk.ink, marginHorizontal: 16 }}>KindredlyUI is not in this build. Run pod install (or prebuild), then rebuild the dev client.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Head({ children }: { children: ReactNode }) {
  const { t: tk } = useTheme();
  return (
    <Text style={[section, { color: tk.mute }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

function Caption({ children, color }: { children: ReactNode; color: string }) {
  return (
    <Text numberOfLines={2} style={[captionStyle, { color }]}>
      {children}
    </Text>
  );
}

/* One surface: the sample stamps at every flat width, then delivered. */
function LadderSheet({ theme }: { theme: KThemeKey }) {
  const kt = THEMES.themes[theme];
  return (
    <View style={{ padding: 12, borderRadius: 18, borderWidth: 1, borderColor: kt.line, backgroundColor: kt.bg, gap: 10 }}>
      <Text style={[section, { color: kt.mute }]}>{kt.name.toUpperCase()} · FLAT</Text>
      {SAMPLE.map((id) => (
        <ScrollView key={id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "flex-end", gap: 10, paddingVertical: 4 }}>
          {FLAT_WIDTHS.map((w) => (
            <Stamp key={w} id={id} width={w} dark={kt.dark} />
          ))}
        </ScrollView>
      ))}
      <Caption color={kt.mute}>{FLAT_WIDTHS.map((w) => `${w} ${stampTierV3(w).toUpperCase()}`).join(" · ")}</Caption>
      <Text style={[section, { color: kt.mute, marginTop: 6 }]}>{kt.name.toUpperCase()} · DELIVERED</Text>
      {SAMPLE.map((id, r) => (
        <ScrollView key={id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "flex-end", paddingVertical: 6 }}>
          {MAIL_WIDTHS.map((w, c) => {
            const letter = LETTER_IDS[(r + c) % LETTER_IDS.length];
            return (
              <View key={w} style={{ marginLeft: 18 }}>
                <Stamp id={id} width={w} delivered letterId={letter} dark={kt.dark} />
              </View>
            );
          })}
        </ScrollView>
      ))}
      <Caption color={kt.mute}>{MAIL_WIDTHS.map((w) => `${w}×${stampHeight(w)}`).join(" · ")} · TILT BY LETTER ID</Caption>
    </View>
  );
}

/* Every named placement at its own size and rule, on this theme. */
function Placements() {
  const { t: tk } = useTheme();
  const entries = Object.entries(STAMP_LADDER) as [StampPlacementName, StampPlacement][];
  return (
    <View style={{ gap: 14 }}>
      {entries.map(([name, p], i) => {
        const id = STAMPS[(i * 7) % STAMPS.length].id;
        const letter = LETTER_IDS[i % LETTER_IDS.length];
        const rule = p.tilt === "letter" ? `TILT ${tilt(letter)}° (LETTER)` : typeof p.tilt === "number" && p.tilt ? `${p.tilt}°` : p.tilt === "scatter" ? "SCATTER (WEB), FLAT HERE" : "FLAT";
        return (
          <View key={name} style={{ gap: 6 }}>
            <Caption color={tk.mute}>
              {name.toUpperCase()} · {p.w}×{p.h} · {stampTierV3(p.w).toUpperCase()} · {rule}
            </Caption>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 18, paddingLeft: 0 }}>
              {name === "composeCorner" && (
                <View style={{ transform: [{ rotate: `${p.tilt}deg` }] }}>
                  <StampSlot width={p.w} stroke={tk.mute} />
                </View>
              )}
              <View style={{ transform: typeof p.tilt === "number" && p.tilt ? [{ rotate: `${p.tilt}deg` }] : undefined }}>
                <Stamp id={id} width={p.w} delivered={p.tilt === "letter"} letterId={letter} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* Every stamp at the tray's size on one surface, six to a row (a row is a category). */
function AllSheet({ theme }: { theme: KThemeKey }) {
  const kt = THEMES.themes[theme];
  const w = STAMP_LADDER.trayTile.w;
  return (
    <View style={{ padding: 12, borderRadius: 18, borderWidth: 1, borderColor: kt.line, backgroundColor: kt.bg, gap: 8 }}>
      <Text style={[section, { color: kt.mute }]}>{kt.name.toUpperCase()}</Text>
      <View style={{ padding: 12, borderRadius: 14, backgroundColor: kt.soft, gap: 12 }}>
        {ROWS.map((row, r) => (
          <View key={r} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {row.map((id) => (
              <Stamp key={id} id={id} width={w} dark={kt.dark} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
