import { useEffect, useRef } from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { PFM } from "../../theme/post";
import { useTheme } from "../../lib/theme";
import type { ThemeTokens } from "../../theme/themes";
import { keepsake } from "../../data/keepsakes";
import { useTabBarSpace } from "../../components/NativeTabBar";
import { TabHeader } from "../../components/TabHeader";
import { AvatarImage } from "../../components/AvatarImage";
import { CofounderMark } from "../../components/CofounderMark";
import { CourierCard } from "../../components/CourierCard";
import { AuraCard } from "../../components/AuraCard";
import { FirstClassCard } from "../../components/FirstClassStub";
import { StampAvatar } from "../../components/StampAvatar";
import { stampSpoken, useMyStamp } from "../../lib/member-marks";
import { t } from "../../lib/i18n";
import { Stamp } from "../../components/Stamp";
import { STAMP_LADDER } from "../../lib/stamp-frame";
import { InkPanel } from "../../components/10a/InkPanel";
import { StickerBox } from "../../components/10a/StickerBox";
import { BottomFade } from "../../components/10a/BottomFade";
import { BOTTOM_FADE } from "../../components/10a/kit";
import type { KeepsakesVM, ProfileVM, StampsVM, StatKey } from "./me-model";
import type { MeModel } from "./useMeModel";

/* THE ME TAB IN REACT NATIVE — the remote switch's fallback (app_surfaces
   "me" off, a binary without KMeView, or a JS error in the Swift path). It
   must keep working fully, so it draws the same model (screens/me
   me-model, through useMeModel) the SwiftUI screen draws — the same words,
   figures, cards and destinations — on the theme (useTheme): no fixed
   white cards on a lavender wash any more.

   It keeps the old page's shape — everything on one scroll, top to bottom
   — rather than the Swift page's segment chips: profile, the courier in
   her 10a frame with her keepsakes, the Aura card (the 10a one, which
   /aura shows too), the stamps you've used, First Class. The behaviour
   fixes are the model's and arrive here too: "You" from the strings, a
   dash for a figure not read yet, the photo read on every focus, 1ST from
   the strings, the owner's First Class copy, keepsakes minted on Me. The
   pencil pushes /me/edit-profile and the sliders /me/settings (the Me
   stack, so the floating bar stays), whichever renderer those draw in. */

const GUTTER = 16;
/** the 10a frame's outline (H:75) */
const FRAME_LINE = 2.5;

export function MeRN({ model }: { model: MeModel }) {
  const { t: tk, dark } = useTheme();
  const tabRoom = useTabBarSpace();
  const { width } = useWindowDimensions();
  const { view, act, courier, aura, avatar } = model;
  const scrollRef = useRef<ScrollView>(null);
  const cardW = width - GUTTER * 2;

  // pressing Me again while on it: to the top (the stack pops by itself)
  const served = useRef(model.scroll.serial);
  useEffect(() => {
    if (model.scroll.serial === served.current) return;
    served.current = model.scroll.serial;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [model.scroll]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }} edges={["top"]}>
      <TabHeader
        title={view.title}
        right={
          <Pressable onPress={act.settings} hitSlop={6} accessibilityRole="button" accessibilityLabel={view.settingsLabel} style={({ pressed }) => ({ width: 34, height: 34, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={tk.ink} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 6h9 M17 6h3 M4 12h3 M11 12h9 M4 18h11 M19 18h1" />
              <Circle cx={15} cy={6} r={2} />
              <Circle cx={9} cy={12} r={2} />
              <Circle cx={17} cy={18} r={2} />
            </Svg>
          </Pressable>
        }
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: Math.max(tabRoom + 12, BOTTOM_FADE.height - 6), gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileCardRN profile={view.profile} avatar={avatar} dark={dark} tk={tk} onEdit={act.edit} onStat={act.stat} />

        {/* the courier in her 10a frame, her keepsakes under the scene */}
        <StickerBox fill={tk.sf} stroke={tk.ln} lineWidth={FRAME_LINE} radius={24} shadow={tk.ln} offset={5} faceStyle={{ overflow: "hidden" }}>
          <View accessible accessibilityRole="button" accessibilityLabel={view.courierA11y}>
            <CourierCard
              framed
              width={cardW - FRAME_LINE * 2}
              wren={courier.wren}
              where={courier.where}
              threads={courier.threads}
              lastWrittenAt={courier.lastWrittenAt}
              hunger={courier.hunger}
              seenToday={courier.seenToday}
              stage={courier.stage}
              entry={courier.entry}
              dayOff={courier.dayOff}
              best={courier.best}
              onPress={act.courier}
              onPlay={act.courier}
            />
          </View>
          <KeepsakesBlockRN keepsakes={view.keepsakes} tk={tk} onBlock={act.keepsakes} onTile={act.keepsake} />
        </StickerBox>

        {aura ? (
          <AuraCard aura={aura} seed={avatar.seed} avatarId={avatar.id} width={cardW} onOpen={act.auraOpen} onShare={act.auraShare} onWrite={act.auraCta} />
        ) : (
          /* before the first read ever lands (no cache yet): the card's own
             silhouette, so the page doesn't grow under the thumb */
          <InkPanel variant="me" contentStyle={{ gap: 12 }}>
            <View style={{ width: 132, height: 22, borderRadius: 6, backgroundColor: tk.soft2 }} />
            <View style={{ height: 110, borderRadius: 14, backgroundColor: tk.soft2 }} />
            <View style={{ width: "70%", height: 24, borderRadius: 6, backgroundColor: tk.soft2 }} />
            <View style={{ width: "45%", height: 12, borderRadius: 4, backgroundColor: tk.soft2 }} />
            <View style={{ height: 44, borderRadius: 14, backgroundColor: tk.soft2, marginTop: 30 }} />
          </InkPanel>
        )}

        <StampsCardRN stamps={view.stamps} tk={tk} cardW={cardW} onEmpty={act.stampsEmpty} />

        <FirstClassCard card={model.me4a.firstClass} onPress={act.firstClass} />
      </ScrollView>
      <BottomFade />
    </SafeAreaView>
  );
}

/* ── the profile card (H:72) ── */
function ProfileCardRN({
  profile,
  avatar,
  dark,
  tk,
  onEdit,
  onStat,
}: {
  profile: ProfileVM;
  avatar: MeModel["avatar"];
  dark: boolean;
  tk: ThemeTokens;
  onEdit: () => void;
  onStat: (key: StatKey) => void;
}) {
  /* at large text the figure and its unit stack in the half-width cell and
     the unit may take two lines, so SEELENVERWANDTE with three figures isn't
     cut to "SEELENVER…" (KProfileCard does the same with ViewThatFits) */
  const { fontScale } = useWindowDimensions();
  const stack = fontScale >= 1.3;
  const stamp = useMyStamp();
  const spoken = stampSpoken(stamp, t);
  return (
    <InkPanel variant="me" contentStyle={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        {/* a member's face is a gold perforated stamp (C2): the disc and its ring go */}
        <StampAvatar size={56} denom={stamp}>
          {({ size, radius }) =>
            radius != null ? (
              <AvatarImage id={avatar.id} photoUri={avatar.photo} seed={avatar.seed} size={size} radius={radius} />
            ) : (
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: tk.line, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                <AvatarImage id={avatar.id} photoUri={avatar.photo} seed={avatar.seed} size={56} />
                <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: tk.ln }} />
              </View>
            )
          }
        </StampAvatar>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={2} accessibilityRole="header" style={{ fontSize: 22, fontWeight: "700", color: tk.ink }}>
            {profile.name}
          </Text>
          {!!profile.joined && <Text style={{ ...PFM.monoMed, fontSize: 10, letterSpacing: 1.2, color: tk.mute }}>{profile.joined}</Text>}
          {profile.cofounderNo != null && (
            <View style={{ marginTop: 3 }}>
              <CofounderMark no={profile.cofounderNo} onDark={dark} />
            </View>
          )}
        </View>
        <Pressable onPress={onEdit} hitSlop={5} accessibilityRole="button" accessibilityLabel={spoken ? `${profile.editLabel}, ${spoken}` : profile.editLabel} style={({ pressed }) => ({ width: 34, height: 34, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={tk.ink} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </Svg>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 2, borderRadius: 14, overflow: "hidden" }}>
        {profile.stats.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => onStat(s.key)}
            accessibilityRole="button"
            accessibilityLabel={s.a11y}
            style={({ pressed }) => ({ flex: 1, flexDirection: stack ? "column" : "row", alignItems: "center", justifyContent: "center", gap: stack ? 4 : 8, padding: 12, backgroundColor: tk.soft2, opacity: pressed ? 0.6 : 1 })}
          >
            <Svg width={16} height={16} viewBox="0 0 28 28" fill="none" stroke={s.glyph === "envelope" ? tk.ind : tk.ink} strokeWidth={2.4} strokeLinejoin="round">
              <Path d={s.glyph === "envelope" ? "M3 8h22v13H3z M3 9l11 8 11-8" : "M4 6h13v9H9l-4 4z M12 19h8l4 4V12h-3"} />
            </Svg>
            <Text style={{ ...PFM.monoSemi, fontSize: 13, color: tk.ink }}>{s.count}</Text>
            <Text numberOfLines={2} style={{ flexShrink: 1, ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.2, color: tk.mute, textAlign: "center" }}>
              {s.unit}
            </Text>
          </Pressable>
        ))}
      </View>
    </InkPanel>
  );
}

/* ── the keepsakes block under the courier's scene (H:75), on the theme ── */
function KeepsakesBlockRN({ keepsakes, tk, onBlock, onTile }: { keepsakes: KeepsakesVM; tk: ThemeTokens; onBlock: () => void; onTile: (id: string) => void }) {
  return (
    <View style={{ margin: 12, marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: tk.soft2, gap: 10 }}>
      <Pressable onPress={onBlock} accessibilityRole="button" accessibilityLabel={keepsakes.a11y} hitSlop={6} style={({ pressed }) => ({ flexDirection: "row", justifyContent: "space-between", alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.4, color: tk.ink }}>{keepsakes.header}</Text>
        <Text style={{ ...PFM.monoMed, fontSize: 10, letterSpacing: 1.2, color: tk.mute }}>{keepsakes.count}</Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {keepsakes.tiles.map((k, i) => {
          const def = k ? keepsake(k.id) : null;
          if (!k || !def)
            return <Pressable key={`empty${i}`} onPress={onBlock} accessibilityElementsHidden importantForAccessibility="no" style={{ flex: 1, minHeight: 72, borderRadius: 12, borderWidth: 2, borderStyle: "dashed", borderColor: tk.faint }} />;
          return (
            <Pressable
              key={k.id}
              onPress={() => onTile(k.id)}
              accessibilityRole="button"
              accessibilityLabel={k.a11y}
              style={({ pressed }) => ({ flex: 1, minHeight: 72, borderRadius: 12, backgroundColor: tk.sf, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}
            >
              <Image source={def.icon} style={{ width: 32, height: 32 }} resizeMode="contain" />
              {/* the tile grows with its name (minHeight), which stops at 2x so two tiles still sit side by side */}
              <Text numberOfLines={1} maxFontSizeMultiplier={2} style={{ fontSize: 11, fontWeight: "600", color: tk.ink }}>
                {k.name}
              </Text>
              {k.fresh && <View style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: tk.ind }} />}
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontSize: 12, lineHeight: 16.8, color: tk.sub, textAlign: "center" }}>{keepsakes.note}</Text>
    </View>
  );
}

/* ── the stamps you've used (owner's placeholder, H:81) ──
   Stamps v2 (2026-10-18): the stamp IS the cell. Each one stands at the
   ladder's meYourStamps, 80×96, centred in its third of the card, with the
   day you first used it under it in mono 9 (sub) — no dotted frame round
   it any more, which made a perforated stamp look perforated twice, and
   no "n of 36": the count beside the title says how many you've used.
   Your own stamps, so flat. A phone too narrow for three 80s side by side
   (320pt) steps down the ladder to 60×72 rather than off it. */
const ME_STAMP = STAMP_LADDER.meYourStamps;
const ME_STAMP_NARROW = STAMP_LADDER.readerHead.w;

function StampsCardRN({ stamps, tk, cardW, onEmpty }: { stamps: StampsVM; tk: ThemeTokens; cardW: number; onEmpty: () => void }) {
  const inner = cardW - 2 * (16 + 2.5);
  const cellW = Math.floor((inner - 2 * 12) / 3);
  const stampW = cellW >= ME_STAMP.w ? ME_STAMP.w : ME_STAMP_NARROW;
  return (
    <InkPanel variant="me" contentStyle={{ gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ backgroundColor: tk.ink, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.4, color: tk.bg }}>{stamps.label}</Text>
        </View>
        <Text style={{ ...PFM.monoMed, fontSize: 10, letterSpacing: 1.2, color: tk.mute }}>{stamps.count}</Text>
      </View>
      {stamps.empty ? (
        <View style={{ gap: 12, alignItems: "flex-start" }}>
          <Text style={{ fontSize: 13, color: tk.sub }}>{stamps.emptyText}</Text>
          <Pressable onPress={onEmpty} accessibilityRole="button" style={({ pressed }) => ({ backgroundColor: tk.lav, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
            {/* a flat lav capsule, as KStampsCard's (owner's rule B, 2026-10-26) */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: tk.ink }}>{stamps.emptyCta}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {stamps.cells.map((c) => (
            <View key={c.id} accessible accessibilityRole="image" accessibilityLabel={c.a11y} style={{ width: cellW, alignItems: "center", gap: 6 }}>
              <Stamp id={c.id} width={stampW} />
              {!!c.date && (
                <Text numberOfLines={1} style={{ maxWidth: cellW, ...PFM.monoSemi, fontSize: 9, letterSpacing: 0.9, color: tk.sub }}>
                  {c.date}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </InkPanel>
  );
}
