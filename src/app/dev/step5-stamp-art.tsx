import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, type TextStyle } from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { KGalleryHost, isKindredlyUIViewAvailable, type KThemeKey } from "../../../modules/kindredly-ui";
import { StampTile } from "../../components/StampTile";
import { STAMPS, STAMP_CATEGORIES } from "../../data/stamps";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import THEMES from "../../theme/themes.json";
import { PF } from "../../theme/post";

/* dev only — STAMP ART IN SWIFT (step 5, batch 1). kindredly:///dev/step5-stamp-art

   The 36 stamps as SwiftUI draws them (KStampArt, from Kit/KStampArtData.swift, which
   scripts/gen-stamp-art-swift.mjs generates from src/data/stamp-art.ts) next to StampTile's
   React Native drawing of the same art, to compare before the Today card, compose and Me
   start drawing stamps in Swift. No network, no account: everything here is the bundled art.

   From the top:
   - THEME: the dev theme switch (lib/theme setDevThemeOverride), as in ui-lab. The gallery and
     this page follow it; the four theme sheets below don't need it, they draw every theme.
   - SWIFT STAMPS ↓ / REACT NATIVE ↓ jump to the two halves of the comparison.
   - the gallery (KGalleryHost, one Host), whose last section is STAMPS: one stamp at 16 to 96,
     the art framed as the screens frame it (the Today card's 34 box, the compose slot's 28, a
     picked tray tile), the tinted tile an id without art gets (in a passed hex, then in
     StampTile's own colour), then all 36 in each theme on its tray colour, six to a row, a row
     per category.
   - right under it, REACT NATIVE: the same rows drawn by StampTile, laid out the same way
     (sizes, gaps, grounds), so a screenshot of each half compares sheet for sheet. StampTile
     adds its faint shadow.card; KStampArt leaves shadows to its caller.

   Measured before this page existed (macOS, the same Swift): every path reads the same in the
   module's KSVGPath as in the generator's reader, and the 36 drawn at 256 differ from a browser's
   drawing of the SVG on 0.2% of pixels, all of them antialiasing at the perforation's edges.

   A binary built before the stamp files were added shows a gallery that ends at LONG-PRESS MENU
   (pod install, then rebuild the dev client). The words are English, typed here: a dev page. */

const KEYS = Object.keys(THEMES.themes) as KThemeKey[];
const SIZES = [16, 22, 28, 40, 64, 96];
const ROWS = Array.from({ length: Math.ceil(STAMPS.length / 6) }, (_, r) => STAMPS.slice(r * 6, r * 6 + 6).map((s) => s.id));

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
  // where the React Native half starts and how tall it is: the Swift section above it is laid
  // out the same way, so it starts that height (less this block's 16 on top) plus the gallery's
  // 28 of bottom padding higher
  const [rn, setRn] = useState({ y: 0, h: 0 });
  const swiftTop = Math.max(0, rn.y - (rn.h - 16) - 28);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={[section, { fontSize: 10.5, letterSpacing: 1.3, color: tk.ind, margin: 16, marginBottom: 6 }]}>STEP 5 · STAMP ART</Text>
        <Text style={[section, { color: tk.mute, marginHorizontal: 16, marginBottom: 8 }]}>
          THEME · {forced ? "FORCED" : "NORMAL"} · {THEMES.themes[key].name.toUpperCase()}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginBottom: 12 }}>
          {choices.map(({ label, value }) => chip(label, forced === value, () => setDevThemeOverride(value)))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginBottom: 12 }}>
          {chip("SWIFT STAMPS ↓", false, () => scroll.current?.scrollTo({ y: swiftTop, animated: true }))}
          {chip("REACT NATIVE ↓", false, () => scroll.current?.scrollTo({ y: rn.y, animated: true }))}
        </View>
        <Text style={{ fontSize: 15, lineHeight: 22, color: tk.ink, marginHorizontal: 16, marginBottom: 12 }}>
          {native
            ? "The gallery's last section, STAMPS, is SwiftUI (KStampArt). The same rows drawn by React Native's StampTile follow right under it."
            : "KindredlyUI is not in this build. Run pod install (or prebuild), then rebuild the dev client. StampTile's half is below."}
        </Text>

        {native ? <KGalleryHost theme={key} /> : null}

        <View onLayout={(e) => setRn({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })} style={{ backgroundColor: tk.bg, paddingHorizontal: 16, paddingTop: 16 }}>
          <ReactNativeStamps />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* The gallery's STAMPS section again, drawn by StampTile: the same rows, sizes and grounds. */
function ReactNativeStamps() {
  const { t: tk } = useTheme();
  const caption = (text: string) => (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[captionStyle, { color: tk.mute }]}>
      {text}
    </Text>
  );
  return (
    <View style={{ gap: 10 }}>
      <Text style={[section, { color: tk.mute }]} accessibilityRole="header">
        REACT NATIVE · STAMPTILE · ALL {STAMPS.length} · FOUR THEMES
      </Text>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
          {SIZES.map((s) => (
            <StampTile key={s} id="never-told" w={s} />
          ))}
        </View>
        {caption("NEVER-TOLD · 16 · 22 · 28 · 40 · 64 · 96")}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {/* the Today card's box: 34, corners of 10, a 2pt ln border on sf, the art inset 2 */}
          <View style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 2, borderColor: tk.ln, backgroundColor: tk.sf, alignItems: "center", justifyContent: "center" }}>
            <StampTile id="made-my-day" w={30} r={0} />
          </View>
          <StampTile id="crush" w={28} />
          {/* a tray tile, picked (ComposeTray) */}
          <View style={{ padding: 2, borderWidth: 2, borderColor: tk.ind, borderRadius: 7 }}>
            <StampTile id="cant-sleep" w={40} r={5} />
          </View>
          {/* StampTile's fallback in a stamp's colour (it takes no hex, so drawn here as it would) */}
          <View style={{ width: 40, height: 40, borderRadius: 5, backgroundColor: "#1E948A22", borderWidth: 1.5, borderColor: "#1E948A" }} />
          <StampTile id="no-such-stamp" w={40} r={5} />
        </View>
        {caption("CARD BOX · SLOT 28 · TRAY PICKED · TILE (HEX) · TILE")}
        {caption("ROWS · " + STAMP_CATEGORIES.map((c) => c.name.en.toUpperCase()).join(" · "))}
        {KEYS.map((k) => (
          <Sheet key={k} theme={k} />
        ))}
        {caption(`ALL ${STAMPS.length} FROM STAMP-ART.TS`)}
      </View>
    </View>
  );
}

/* Every stamp in one theme, as KGallery's stampSheet lays it out. */
function Sheet({ theme }: { theme: KThemeKey }) {
  const kt = THEMES.themes[theme];
  return (
    <View style={{ padding: 12, borderRadius: 18, borderWidth: 1, borderColor: kt.line, backgroundColor: kt.bg, gap: 8 }}>
      <Text style={[section, { color: kt.mute }]}>{kt.name.toUpperCase()}</Text>
      <View style={{ padding: 12, borderRadius: 14, backgroundColor: kt.soft, gap: 12 }}>
        {ROWS.map((row, r) => (
          <View key={r} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {row.map((id) => (
              <StampTile key={id} id={id} w={40} r={5} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
