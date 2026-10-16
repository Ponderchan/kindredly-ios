import type { ReactNode } from "react";
import { Pressable, Switch, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { MONO, PF, letterFamily, letterFontKey } from "../../theme/post";
import { BRAND, THEMES, type ThemeKey } from "../../theme/themes";
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
   - SwatchesRN / FontTilesRN: APPEARANCE (H:99);
   - BannerRN: the First Class banner in brand cream (H:98).
   Every word comes in translated. */

const ROW_PAD = 14;

/** A header over its soft block. headerInset: how far the header sits in from the block's edge
    (Settings 10, H:101; Edit profile 4, H:92), as SoftGroupHeader's in Swift. */
export function SoftSection({ header, headerInset = 10, children, style }: { header: string; headerInset?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { t: tk } = useTheme();
  return (
    <View style={[{ gap: 6 }, style]}>
      {!!header && (
        <Text accessibilityRole="header" style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: MONO.label * 0.14, color: tk.mute, paddingHorizontal: headerInset }}>
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
            <Text numberOfLines={1} style={{ fontFamily: PF.monoMed, fontSize: MONO.title, color: tk.mute, flexShrink: 1, maxWidth: "55%" }}>
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
function MiniPhone({ k }: { k: string }) {
  const th = THEMES[(k in THEMES ? k : "classic") as ThemeKey];
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

/** The selected look (KSelectableTile): a 2pt ind border and a 3pt lav halo; unselected, line. */
function Tile({ selected, radius, children, style }: { selected: boolean; radius: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { t: tk } = useTheme();
  return (
    <View style={[{ borderRadius: radius + 3, borderWidth: 3, borderColor: selected ? tk.lav : "transparent", margin: -3 }, style]}>
      <View style={{ flex: 1, borderRadius: radius, borderWidth: 2, borderColor: selected ? tk.ind : tk.line, overflow: "hidden" }}>{children}</View>
    </View>
  );
}

export function SwatchesRN({ swatches, selected, onPick }: { swatches: { key: string; label: string }[]; selected: string; onPick: (key: string) => void }) {
  const { t: tk } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {[0, 1, 2, 3].map((i) => {
        const s = swatches[i];
        if (!s) return <View key={`empty${i}`} style={{ flex: 1 }} />;
        const on = s.key === selected;
        return (
          <Pressable
            key={s.key}
            onPress={() => onPick(s.key)}
            accessibilityRole="button"
            accessibilityLabel={s.label}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 7, transform: [{ scale: pressed ? 0.94 : 1 }] })}
          >
            <Tile selected={on} radius={12} style={{ alignSelf: "stretch", aspectRatio: 3 / 4 }}>
              <MiniPhone k={s.key} />
            </Tile>
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "500", color: on ? tk.ind : tk.sub }}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
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

/** The First Class banner (H:98): brand cream, the same in every theme; the courier's snapshot on
    its stamp (null leaves the stamp's face white). One button. */
export function BannerRN({ eyebrow, headline, sub, cta, stampLabel, bird, onPress }: { eyebrow: string; headline: string; sub: string; cta: string; stampLabel: string; bird: string | null; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[eyebrow, headline, sub, cta].join(", ")}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: BRAND.cream, borderWidth: 1.5, borderColor: BRAND.creamBorder, borderRadius: 18, paddingVertical: 14, paddingLeft: 16, paddingRight: 14, opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: BRAND.waxGold }} />
          <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: MONO.label * 0.16, color: BRAND.goldText }}>{eyebrow.toLocaleUpperCase()}</Text>
        </View>
        <Text style={{ fontFamily: PF.letterSerif, fontStyle: "normal", fontSize: 19, lineHeight: 22.8, color: BRAND.inkOnBrand }}>{headline}</Text>
        <Text style={{ fontSize: 12, lineHeight: 16.8, color: BRAND.subOnCream }}>{sub}</Text>
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: BRAND.goldText, marginTop: 2 }}>
          {cta}
        </Text>
      </View>
      <View style={{ width: 56, height: 70, borderRadius: 8, backgroundColor: BRAND.paperWhite, borderWidth: 2, borderStyle: "dotted", borderColor: BRAND.waxGold, alignItems: "center", justifyContent: "center", gap: 4, transform: [{ rotate: "4deg" }] }}>
        {bird ? <Image source={{ uri: bird }} style={{ width: 31, height: 31 }} contentFit="contain" /> : <View style={{ width: 31, height: 31 }} />}
        <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.small, letterSpacing: MONO.small * 0.1, color: BRAND.goldText }}>{stampLabel}</Text>
      </View>
    </Pressable>
  );
}
