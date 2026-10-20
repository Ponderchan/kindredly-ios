import { useState, type ReactNode } from "react";
import { Pressable, Switch, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { MONO, PFM, letterFamily, letterFontKey } from "../../theme/post";
import { THEMES, appearanceTheme, isAppearance, type ThemeKey } from "../../theme/themes";
import { isAxFontScale } from "../notes/notes-model";
import { useTheme } from "../../lib/theme";
import { SettingsIcon, type SettingsGlyph } from "../../components/SettingsIcons";

/* THE 10a LIST PIECES IN REACT NATIVE — the twins of SoftGroup.swift, the
   swatches, the font tiles and the cream banner, for the two fallback pages
   (screens/settings/SettingsRN, screens/edit-profile/EditProfileRN). They
   draw the same things the Swift page draws, from the theme:
   - SoftSection: the mono header (10, .14em, mute) over a soft block,
     corners of 16 (H:101);
   - SoftRowRN: the Settings row — the mark in its 28pt sf box, the label
     (15, ink, or the exits' red), the value (mono 11, mute), the chevron
     (18, faint), the subline (12/1.4, mute), the 1pt line under the words;
   - SoftSwitchRow: the same with a switch (controlled: it shows `on`);
   - SoftPlainRowRN: Edit profile's row, no box, its value 500 14 (H:92);
   - SwatchesRN / FontTilesRN: APPEARANCE (H:99; five appearances, FC2).
   The First Class card at the top of Settings is components/FirstClassStub
   FirstClassCard (Me's 4a card), no longer a banner of its own.
   Every word comes in translated. */

const ROW_PAD = 14;

/** A header over its soft block. headerInset: how far the header sits in from the block's edge
    (Settings 10, H:101; Edit profile 4, H:92), as SoftGroupHeader's in Swift. */
export function SoftSection({ header, headerInset = 10, children, style }: { header: string; headerInset?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { t: tk } = useTheme();
  return (
    <View style={[{ gap: 6 }, style]}>
      {!!header && (
        <Text accessibilityRole="header" style={{ ...PFM.monoSemi, fontSize: MONO.label, letterSpacing: MONO.label * 0.14, color: tk.mute, paddingHorizontal: headerInset }}>
          {header.toLocaleUpperCase()}
        </Text>
      )}
      <View style={{ backgroundColor: tk.soft, borderRadius: 16, overflow: "hidden" }}>{children}</View>
    </View>
  );
}

function Chevron() {
  const { t: tk } = useTheme();
  return (
    <Text accessible={false} style={{ fontSize: 18, lineHeight: 20, color: tk.faint }}>
      ›
    </Text>
  );
}

export function SoftRowRN({
  glyph,
  label,
  value,
  sub,
  chevron = true,
  last = false,
  tint,
  busy = false,
  onPress,
}: {
  glyph: SettingsGlyph;
  label: string;
  value?: string;
  sub?: string;
  chevron?: boolean;
  last?: boolean;
  /** the exits' red */
  tint?: string;
  busy?: boolean;
  /** none: a display row (no button) */
  onPress?: () => void;
}) {
  const { t: tk } = useTheme();
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: ROW_PAD }}>
      <SettingsIcon glyph={glyph} color={tint} />
      <View style={{ flex: 1, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: tk.line, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 15, color: tint ?? tk.ink }}>{label}</Text>
          {!!value && (
            <Text numberOfLines={1} style={{ ...PFM.monoMed, fontSize: MONO.title, color: tk.mute, flexShrink: 1, maxWidth: "55%" }}>
              {value}
            </Text>
          )}
          {chevron && <Chevron />}
        </View>
        {!!sub && <Text style={{ fontSize: 12, lineHeight: 16.8, color: tk.mute }}>{sub}</Text>}
      </View>
    </View>
  );
  if (!onPress) return <View accessible accessibilityLabel={[label, value].filter(Boolean).join(", ")}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={[label, value, sub].filter(Boolean).join(", ")}
      accessibilityState={{ busy, disabled: busy }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  );
}

export function SoftSwitchRow({ glyph, label, sub, on, last = false, onChange }: { glyph?: SettingsGlyph; label: string; sub?: string; on: boolean; last?: boolean; onChange: (on: boolean) => void }) {
  const { t: tk } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: ROW_PAD }}>
      {glyph && <SettingsIcon glyph={glyph} />}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: tk.line }}>
        <View style={{ flex: 1, paddingRight: 12, gap: 4 }}>
          <Text style={{ fontSize: 15, color: tk.ink }}>{label}</Text>
          {!!sub && <Text style={{ fontSize: 12, lineHeight: 16.8, color: tk.mute }}>{sub}</Text>}
        </View>
        <Switch accessibilityLabel={label} accessibilityHint={sub} value={on} onValueChange={onChange} trackColor={{ true: tk.ind, false: tk.faint }} ios_backgroundColor={tk.faint} />
      </View>
    </View>
  );
}

export function SoftPlainRowRN({ label, value, chevron = true, last = false, onPress }: { label: string; value: string; chevron?: boolean; last?: boolean; onPress?: () => void }) {
  const { t: tk } = useTheme();
  const body = (
    <View style={{ paddingHorizontal: ROW_PAD }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: tk.line }}>
        <Text style={{ fontSize: 15, color: tk.ink }}>{label}</Text>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: "right", fontSize: 14, fontWeight: "500", color: tk.mute }}>
          {value}
        </Text>
        {chevron && <Chevron />}
      </View>
    </View>
  );
  if (!onPress) return <View accessible accessibilityLabel={`${label}, ${value}`}>{body}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  );
}

/** One theme as a tiny phone (H:99): its bg, a title bar in its ln, a card in its sf with a hard
    ln shadow, the tab bar with its ind dot in the middle of it (justify-content: center). */
function MiniPhone({ k }: { k: ThemeKey }) {
  const th = THEMES[k in THEMES ? k : "classic"];
  return (
    <View style={{ flex: 1, backgroundColor: th.bg, paddingTop: 9, paddingHorizontal: 7, paddingBottom: 7, gap: 5 }}>
      <View style={{ width: "42%", height: 3, borderRadius: 2, backgroundColor: th.ln }} />
      <View style={{ flex: 1, marginRight: 2, marginBottom: 2 }}>
        <View style={{ position: "absolute", left: 2, top: 2, right: -2, bottom: -2, borderRadius: 7, backgroundColor: th.ln }} />
        <View style={{ flex: 1, borderRadius: 7, backgroundColor: th.sf, borderWidth: 1.5, borderColor: th.ln }} />
      </View>
      <View style={{ height: 9, borderRadius: 5, backgroundColor: th.sf, borderWidth: 1.5, borderColor: th.ln, justifyContent: "center", alignItems: "center" }}>
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: th.ind }} />
      </View>
    </View>
  );
}

/** System's swatch (KThemeSwatches' twin): one phone split on the diagonal from its top-right to
    its bottom-left corner, Classic above it, Midnight below. React Native has no clip path, so the
    Midnight half is a square turned onto the diagonal (overflow hidden) holding the Midnight phone
    turned back into place. Drawn once the tile has a size. */
function SplitPhone() {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const w = box?.w ?? 0;
  const h = box?.h ?? 0;
  const a = Math.atan2(h, w);
  const side = Math.hypot(w, h) + 2;
  return (
    <View style={{ flex: 1 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <MiniPhone k="classic" />
      {box && w > 0 && h > 0 && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: h, width: side, height: side, overflow: "hidden", transformOrigin: "left top", transform: [{ rotate: `${-a}rad` }] }}
        >
          <View style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transformOrigin: "left top", transform: [{ rotate: `${a}rad` }, { translateY: -h }] }}>
            <MiniPhone k="midnight" />
          </View>
        </View>
      )}
    </View>
  );
}

/** The selected look (KSelectableTile): a 2pt ind border and a 3pt lav halo; unselected, line. */
function Tile({ selected, radius, children, style }: { selected: boolean; radius: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { t: tk } = useTheme();
  return (
    <View style={[{ borderRadius: radius + 3, borderWidth: 3, borderColor: selected ? tk.lav : "transparent", margin: -3 }, style]}>
      <View style={{ flex: 1, borderRadius: radius, borderWidth: 2, borderColor: selected ? tk.ind : tk.line, overflow: "hidden" }}>{children}</View>
    </View>
  );
}

/** APPEARANCE's five swatches (FC2 §10): System (the split phone), Light, Dark, Lavender, Paper —
    five columns 10 apart, or two to a row at the accessibility text sizes (each phone no wider
    than 110, the name wrapping), as KThemeSwatches does. The selected one is the reader's
    appearance. A key that isn't an appearance draws as Classic. */
export function SwatchesRN({
  swatches,
  selected,
  onPick,
}: {
  swatches: { key: string; label: string; hint?: string }[];
  selected: string;
  onPick: (key: string) => void;
}) {
  const { t: tk } = useTheme();
  const large = isAxFontScale(useWindowDimensions().fontScale);
  const cols = large ? 2 : 5;
  const rows: (typeof swatches[number] | null)[][] = [];
  for (let i = 0; i < swatches.length; i += cols) {
    const r: (typeof swatches[number] | null)[] = swatches.slice(i, i + cols);
    while (r.length < cols) r.push(null);
    rows.push(r);
  }
  return (
    <View style={{ gap: large ? 14 : 10 }}>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          {r.map((s, i) => {
            if (!s) return <View key={`empty${i}`} style={{ flex: 1 }} />;
            const on = s.key === selected;
            const theme: ThemeKey | null = isAppearance(s.key) ? appearanceTheme(s.key) : "classic";
            return (
              <Pressable
                key={s.key}
                onPress={() => onPick(s.key)}
                accessibilityRole="button"
                accessibilityLabel={s.label}
                accessibilityHint={s.hint || undefined}
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 7, transform: [{ scale: pressed ? 0.94 : 1 }] })}
              >
                <Tile selected={on} radius={12} style={{ alignSelf: large ? "center" : "stretch", width: large ? 110 : undefined, aspectRatio: 3 / 4 }}>
                  {theme ? <MiniPhone k={theme} /> : <SplitPhone />}
                </Tile>
                <Text
                  numberOfLines={large ? 3 : 1}
                  adjustsFontSizeToFit={!large}
                  minimumFontScale={0.75}
                  style={{ fontSize: 11, fontWeight: "500", color: on ? tk.ind : tk.sub, textAlign: "center" }}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function FontTilesRN({ fonts, selected, onPick }: { fonts: { key: string; name: string; sample: string }[]; selected: string; onPick: (key: string) => void }) {
  const { t: tk } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {[0, 1, 2].map((i) => {
        const f = fonts[i];
        if (!f) return <View key={`empty${i}`} style={{ flex: 1 }} />;
        const on = f.key === selected;
        return (
          <Pressable
            key={f.key}
            onPress={() => onPick(f.key)}
            accessibilityRole="button"
            accessibilityLabel={f.name}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}
          >
            <Tile selected={on} radius={12}>
              <View style={{ backgroundColor: tk.sf, padding: 10, alignItems: "center", gap: 4 }}>
                <Text accessible={false} maxFontSizeMultiplier={1.6} style={[{ fontSize: 24, color: tk.ink }, letterFamily(letterFontKey(f.key))]}>
                  {f.sample}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "500", color: on ? tk.ind : tk.sub }}>
                  {f.name}
                </Text>
              </View>
            </Tile>
          </Pressable>
        );
      })}
    </View>
  );
}
