import { Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import type { HatchlingForm } from "../lib/hatchling-form";
import type { GrowthStats } from "../data/growth";
import { t } from "../lib/i18n";
import "../data/strings-a11y-compose";
import { PFM } from "../theme/post";
import { useP } from "../lib/theme";
import { useEggOS } from "../lib/egg-os";
import { ACCESSORY_META, SKINS, skinName, skinUnlocked, useHatchSkin } from "../lib/wren-style";
import { WrenBird, type WrenAccessory, type WrenSkin, type WrenStage } from "./WrenBird";

/* THE WARDROBE RACK — one rack, wherever she gets dressed.
   ────────────────────────────────────────────────────────────────────────
   The hatch and her room each had their own tiles, and they drifted: the
   hatch drew the pieces on the chick from a hand-made set that had no
   party hat and no shades, her room drew them on the grown bird from the
   generator, and a piece put on at one looked like a different piece at
   the other. Now both screens render this. The tiles show HER — the stage
   she is at, the look she has on — wearing each piece, so what you tap
   is what you get.

   Locked pieces are drawn at full colour with a brass tag, never dimmed:
   the First Class pieces are the reason to board, and a greyed-out hat
   sells nothing. What a tap on a locked tile does is the caller's call
   (try it on at the hatch; open the fare in her room). Two tones: the
   hatch's console chrome and her room's postal paper. Both take their
   colours from the theme in effect — the console skin from useEggOS, the
   paper from useP — and the tiles' face is the theme's card face. The
   birds and the brass lock tag keep their own colours. */

export type RackTone = "console" | "post";

export function WardrobeRack({
  tone,
  skin,
  accessory,
  stats,
  premium,
  stage,
  form,
  mark,
  show = "both",
  headers = true,
  onLook,
  onDress,
  plusHint,
}: {
  tone: RackTone;
  /** what she has on now — the looks row wears the accessory, the dress row wears the skin */
  skin: WrenSkin;
  accessory: WrenAccessory;
  stats: GrowthStats;
  premium: boolean;
  /** how the tile birds are drawn; omitted = wherever she actually is */
  stage?: WrenStage;
  form?: HatchlingForm;
  mark?: string | null;
  show?: "looks" | "dress" | "both";
  headers?: boolean;
  onLook: (id: WrenSkin, unlocked: boolean) => void;
  onDress: (id: WrenAccessory, unlocked: boolean) => void;
  /** VoiceOver's hint on a First Class piece still locked: what a tap on it does here (her room
      opens the fare; the hatch lets you try it on, so it passes none) */
  plusHint?: string;
}) {
  const P = useP();
  const { Y } = useEggOS();
  const dim = tone === "console" ? Y.dim : P.ink40;
  const header = (label: string, count: string) =>
    headers ? (
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
        <Text style={{ ...PFM.monoSemi, fontSize: 9, letterSpacing: 1.8, color: dim }}>{label}</Text>
        <Text style={{ ...PFM.mono, fontSize: 8.5, color: dim }}>{count}</Text>
      </View>
    ) : null;

  const hatch = useHatchSkin();   // the coat she hatched in on /aura: hers
  const looksOwned = SKINS.filter((s) => skinUnlocked(s.id, stats, premium, hatch)).length;
  const pieces = ACCESSORY_META.filter((a) => a.id !== "none");
  const piecesOwned = pieces.filter((a) => a.free || premium).length;

  return (
    <View>
      {show !== "dress" && (
        <View>
          {header(t("wren.looks"), `${looksOwned}/${SKINS.length}`)}
          <View style={{ flexDirection: "row", marginHorizontal: -3 }}>
            {SKINS.map((sk) => {
              const unlocked = skinUnlocked(sk.id, stats, premium, hatch);
              return (
                <Tile
                  key={sk.id}
                  tone={tone}
                  on={skin === sk.id}
                  label={skinName(sk.id)}
                  lock={unlocked ? null : sk.lock === "plus" ? t("wren.lock.plus") : t("wren.lock.kindred")}
                  hint={!unlocked && sk.lock === "plus" ? plusHint : undefined}
                  style={{ flex: 1, marginHorizontal: 3 }}
                  onPress={() => onLook(sk.id, unlocked)}
                >
                  <WrenBird size={46} mood="happy" stage={stage} form={form} mark={mark} skin={sk.id} accessory={accessory} />
                </Tile>
              );
            })}
          </View>
        </View>
      )}
      {show !== "looks" && (
        <View style={{ marginTop: show === "both" ? 16 : 0 }}>
          {header(t("wren.dress"), `${piecesOwned}/${pieces.length}`)}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentOffset={{ x: 0, y: 0 }} contentContainerStyle={{ paddingRight: 24, paddingBottom: 4 }}>
            {ACCESSORY_META.map((a) => {
              const unlocked = a.free || premium;
              return (
                <Tile
                  key={a.id}
                  tone={tone}
                  on={accessory === a.id}
                  label={t(`ws.acc.${a.id}`)}
                  lock={unlocked ? null : t("wren.lock.plus")}
                  hint={unlocked ? undefined : plusHint}
                  style={{ width: 76, marginRight: 8 }}
                  onPress={() => onDress(a.id, unlocked)}
                >
                  <WrenBird size={46} mood="happy" stage={stage} form={form} mark={mark} skin={skin} accessory={a.id} />
                </Tile>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function Tile({
  tone,
  on,
  label,
  lock,
  hint,
  style,
  onPress,
  children,
}: {
  tone: RackTone;
  on: boolean;
  label: string;
  lock: string | null;
  hint?: string;
  style: ViewStyle;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const P = useP();
  const { Y, bevel, card, t: tk } = useEggOS();
  const accent = tone === "console" ? Y.blue : P.pen;
  /* a console tile pressed in takes the accent's palest wash — in Classic
     the console's own ground, as the #EEEDFF it replaces nearly was */
  const chrome: ViewStyle =
    tone === "console"
      ? {
          ...card,
          ...(on ? {} : bevel(2.5, 2.5)),
          borderColor: on ? Y.blue : Y.ln,
          backgroundColor: on ? tk.lav2 : Y.panel,
          borderRadius: 12,
          transform: [{ translateX: on ? 2.5 : 0 }, { translateY: on ? 2.5 : 0 }],
        }
      : {
          backgroundColor: tk.sf,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: on ? P.pen : "transparent",
        };
  return (
    <Pressable
      onPress={onPress}
      // a11y cm-11: the one she has on was only a 2pt edge; the lock tag rides in the name
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={lock ? `${label}, ${lock}` : label}
      accessibilityHint={hint}
      style={({ pressed }) => [chrome, { alignItems: "center", paddingTop: 8, paddingBottom: 8, opacity: pressed ? 0.85 : 1 }, style]}>
      {children}
      <Text numberOfLines={1} maxFontSizeMultiplier={1.35} style={{ ...PFM.monoSemi, fontSize: 8, letterSpacing: 0.6, color: on ? accent : tone === "console" ? Y.ink : P.ink60, marginTop: 4 }}>
        {label.toUpperCase()}
      </Text>
      {/* the tag keeps its line even when empty, so the tiles stay one height; at least 10, not
          exactly 10, so the larger sizes don't clip it away (a11y cm-12) */}
      <Text numberOfLines={1} maxFontSizeMultiplier={1.35} style={{ ...PFM.monoSemi, fontSize: 6.5, letterSpacing: 0.5, color: "#B08037", marginTop: 2, minHeight: 10 }}>
        {lock ?? ""}
      </Text>
    </Pressable>
  );
}
