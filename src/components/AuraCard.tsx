import { useMemo } from "react";
import { Dimensions, Image, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";
import { useTheme } from "../lib/theme";
import type { ThemeTokens } from "../theme/themes";
import { AURA_SCENES, AURA_SKETCHES } from "../data/aura-scenes";
import { MosaicId } from "./MosaicId";
import type { Aura } from "../lib/aura";
import { rungOf } from "../lib/aura-ladder";
import { AuraArtFit, AuraScene } from "./AuraScene";
import { ShareIcon } from "./Icons";
import { daylight } from "./CourierCard";
import { InkPanel } from "./10a/InkPanel";
import { chipsFor, phaseHeadline, stickerLook, stickerName, titleDesc, titleName } from "../lib/sticker-copy";
import type { ResolvedSticker } from "../lib/writing-engine/stickers";
import { auraSlotPalette, buildAuraCard, type AuraCardVM, type AuraFacts } from "../screens/me/me-model";
import { meFormat } from "../screens/me/me-format";
import "../data/strings-step5-me";

/* WRITING AURA — the card, built to the owner's W33 ladder sheet on the D
   palette (Aura × Courier pairing), 2026-09-19.
   ────────────────────────────────────────────────────────────────────────
   Cream paper. The scene at the top IS the progress: lines waiting to be
   written, then a pencil outline, then a sketch, then colour — see
   lib/aura-ladder for the seven rungs. Under it: the sentence, where it
   came from, the three stickers (solid = stuck, dashed = trying on), one
   well of counted progress, and the one thing to do next. No phase names,
   no steps, no percentages; every number is a count. */

export const dear = (name: string) => name.replace(/^The\s+/i, "");

export const W14 = {
  ink: "#1E1B35",
  navy: "#2E2A6B",
  card: "#FFFFFF",
  slot: "#E4E1FA",
  slotEmpty: "#F6F5FD",
  slotEdge: "#C9C5E6",
  grey: "rgba(30,27,53,0.5)",
  hair: "#E4E1F2",
  gold: "#D8A63F",
  goldInk: "#B08037",
} as const;

export const cardShadow = {
  shadowColor: "#1E1B35",
  shadowOpacity: 0.07,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
} as const;

/** "Based on your 13 letters" — pool letters and replies, the ones the aura
    actually read; before any letter it rests on the first lines alone */
export function basedOn(aura: Aura): string {
  const n = aura.sources.letters + aura.sources.conversations;
  if (n === 0) return t("ap.basedOnFirst");
  if (n === 1) return t("ap.basedOnOne");
  return aura.sources.conversations > 0 ? t("ap.basedOnBoth", { n }) : t("ap.basedOn", { n });
}


/* ── the sticker: its dimension's ink, a white cut edge, a little tilt, and
   nothing on it but its name (the owner's sheet). A sticker is an object,
   so it keeps all of its colours in every theme: the white edge, the ink
   ring when it's picked, and the dashed outline of one still trying on. ── */
export function StickerChip({
  id,
  i = 0,
  size = "md",
  selected,
  onPress,
  state,
}: {
  id: string;
  state?: ResolvedSticker["state"];
  i?: number;
  size?: "md" | "lg";
  selected?: boolean;
  onPress?: () => void;
}) {
  const look = stickerLook(id, i);
  const lg = size === "lg";
  /* still trying on: the same sticker, drawn as a dashed outline — no fill
     until it holds (the ladder's one visual for state) */
  const trying = state === "emerging";
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ transform: [{ rotate: look.tilt }, { translateY: selected ? -3 : 0 }, { scale: pressed ? 0.97 : 1 }] })}
    >
      <View
        style={{
          backgroundColor: "#FFFFFF",
          padding: 3,
          borderRadius: look.radius === 999 ? 999 : look.radius + 3,
          shadowColor: "#1E1B35",
          shadowOpacity: selected ? 0.3 : 0.18,
          shadowRadius: selected ? 8 : 5,
          shadowOffset: { width: 0, height: selected ? 8 : 4 },
          borderWidth: selected ? 2 : 0,
          borderColor: W14.ink,
        }}
      >
        <View style={{ backgroundColor: trying ? "#FFFFFF" : look.bg, borderRadius: look.radius, borderWidth: 2, borderStyle: trying ? "dashed" : "solid", borderColor: trying ? W14.ink : look.border, paddingHorizontal: lg ? 13 : 10, paddingVertical: lg ? 6 : 4 }}>
          <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: lg ? 13.5 : 12.5, color: trying ? W14.ink : look.fg }} numberOfLines={1}>
            {stickerName(id)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ── the scene: the owner's fifty pixel scenes, one per title.
   · formed        → the title's scene, in colour
   · a noun known  → that noun's scene as a lavender sketch (the adjective
                     is not earned yet, and the sketch does not say one)
   · first signs   → a dashed frame with the first lines of a page
   · nothing yet   → the dashed frame with a faded sketch behind it ── */
const sceneId = (adj: string | null, noun: string): string => `${(adj ?? "quiet").replace(/_/g, "-")}-${noun.replace(/_/g, "-")}`;

/* AuraArt lives on the share card (AuraTicket), fixed paper in every theme,
   so the face it falls back to takes the card's ink (W14.ink), not the
   theme's: Midnight's light ink is 1.03:1 on these pale slots. */
export function AuraArt({ aura, seed, width, height, radius = 12 }: { aura: Aura; seed: string; avatarId?: string | null; width: number; height: number; radius?: number }) {
  void seed;
  const stage = aura.phase;
  const title = aura.stickers?.title ?? null;
  const frame = { width, height, borderRadius: radius, overflow: "hidden" as const, alignItems: "center" as const, justifyContent: "center" as const };
  const img = { width, height: Math.round((width * 9) / 16) } as const;

  if (stage === "formed" && title?.noun && title.adjective) {
    const src = AURA_SCENES[sceneId(title.adjective, title.noun)];
    return (
      <View style={[frame, { backgroundColor: W14.slot }]}>
        {src ? <Image source={src} style={img} resizeMode="cover" /> : <MosaicId seed={seed} cell={8} gap={1.5} develop={1} color={W14.ink} />}
      </View>
    );
  }
  if (title?.noun) {
    const src = AURA_SKETCHES[sceneId(null, title.noun)];
    return (
      <View style={[frame, { backgroundColor: W14.slotEmpty, borderWidth: 2, borderStyle: "dashed", borderColor: W14.slotEdge }]}>
        {src ? <Image source={src} style={img} resizeMode="cover" /> : <MosaicId seed={seed} cell={8} gap={1.5} develop={0.5} color={W14.ink} />}
      </View>
    );
  }
  if (stage === "empty") {
    return (
      <View style={[frame, { backgroundColor: W14.slotEmpty, borderWidth: 2, borderStyle: "dashed", borderColor: W14.slotEdge }]}>
        <Image source={AURA_SKETCHES["quiet-observer"]} style={[img, { opacity: 0.35 }]} resizeMode="cover" />
      </View>
    );
  }
  // first signs: the first lines of a page, and a star for the one thing noticed
  const w = Math.round(width * 0.5);
  return (
    <View style={[frame, { backgroundColor: W14.slotEmpty, borderWidth: 2, borderStyle: "dashed", borderColor: W14.slotEdge }]}>
      <View style={{ width: w, gap: 7 }}>
        <View style={{ width: w, height: 4, borderRadius: 2, backgroundColor: "#8F87D9" }} />
        <View style={{ width: Math.round(w * 0.72), height: 4, borderRadius: 2, backgroundColor: "#8F87D9" }} />
        <View style={{ height: 6 }} />
        <View style={{ width: Math.round(w * 0.9), height: 4, borderRadius: 2, backgroundColor: "#8F87D9" }} />
        <View style={{ width: Math.round(w * 0.5), height: 4, borderRadius: 2, backgroundColor: "#8F87D9" }} />
      </View>
      <Text style={{ position: "absolute", right: Math.round(width * 0.18), bottom: Math.round(height * 0.16), fontSize: 16, color: "#C9C5E6" }}>✦</Text>
    </View>
  );
}

/* ── THE CARD, 10a (H:78; owner: every number a count, no bar) ──────────────
   The InkPanel "me" (sf, 2.5 ln, corners 24, a 5/5 ln shadow, padding 16),
   12 between its pieces: the ink label YOUR WRITING AURA; the art slot, 110
   tall on soft2 with corners of 14 — the title's own scene fitted by height
   (never cover-cropped), or the desk drawn at the rung's fidelity on the
   slot's colour; the title (system 600 20/1.2), FROM YOUR N LETTERS (mono
   500 10 .14em, mute); the labels as ind outlines (1.5, corners 16, system
   600 12; dashed while still trying on — the full-colour stickers stay on
   the aura room's other tabs and the share card); the well's count glyphs
   in ind and faint (five ticks, or three slots and the strongest label's
   five slips) and the caption in mono 500 10; then the call to action
   (ink, system 600 14, corners 14) and, once named, a 48-wide share key.

   Everything it says is the Me model's (screens/me/me-model buildAuraCard,
   node-tested), which the SwiftUI card (KAuraCard) draws too, so the two
   renderers and the /aura page can't tell a reader different things. The
   top of the card opens the aura room (onOpen); the call to action writes a
   letter on the first rungs (onWrite) and opens the room after. */

/** The aura's facts for the card: the rung, the formed name, the scene's noun, the three labels. */
export function auraCardFacts(aura: Aura | null): AuraFacts | null {
  if (!aura) return null;
  const st = aura.stickers;
  const shown = chipsFor(st?.home ?? [], aura.usage, 3);
  const stateOf = (id: string) => st?.home.find((h) => h.stickerId === id)?.state;
  return {
    rung: rungOf(aura),
    titleName: titleName(st?.title) || null,
    title: st?.title ? { noun: st.title.noun ?? null, adjective: st.title.adjective ?? null } : null,
    chips: shown.map((c) => ({ id: c.id, name: stickerName(c.id), emerging: c.kind === "writing" && stateOf(c.id) === "emerging" })),
  };
}

/** the art slot's height on the 10a card (H:78) */
export const AURA_ART_H = 110;
/** the art slot's width on a card `cardWidth` wide: inside its padding and outline */
export const auraArtWidth = (cardWidth: number): number => Math.max(0, cardWidth - 2 * (16 + 2.5));

/* The picture in the slot: the title's scene (in colour once named, its
   sketch while the name forms), fitted by height; otherwise the desk at the
   rung's fidelity, on the slot's own colour. The slot's corners are the
   caller's (the card clips them; the Swift card clips the island). */
export function AuraArtSlot({ art, width, height = AURA_ART_H }: { art: AuraCardVM["art"]; width: number; height?: number }) {
  const { t: tk, dark } = useTheme();
  // the strokes come with the ground: light ones on a dark slot (me-model auraSlotPalette)
  const pal = useMemo(() => auraSlotPalette(tk, dark), [tk, dark]);
  const src =
    art.sceneId && art.fidelity === "colour" && AURA_SCENES[art.sceneId]
      ? AURA_SCENES[art.sceneId]
      : art.sceneId && art.fidelity === "sketch" && AURA_SKETCHES[art.sceneId]
        ? AURA_SKETCHES[art.sceneId]
        : null;
  /* Midnight lays the picture in as a print (inset 6, its own corners).
     The fifty scenes and their sketches are drawn on baked pale paper, the
     sketches almost all paper; run flush to the dark slot's top and bottom
     they read as a light slab cut into it, with soft2 bars at the sides.
     The picture keeps its colours; the light themes keep it flush. */
  if (src) return <AuraArtFit width={width} height={height} src={src} ground={tk.soft2} inset={dark ? 6 : 0} />;
  return (
    <View style={{ width, height, backgroundColor: tk.soft2, overflow: "hidden" }}>
      <AuraScene width={width} height={height} fidelity={art.fidelity} day={daylight()} pal={pal} />
    </View>
  );
}

/* the five slips: "n of your last m" */
function Slips({ n, of, tk }: { n: number; of: number; tk: ThemeTokens }) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <View key={i} style={{ width: 9, height: 13, borderRadius: 2, backgroundColor: i < n ? tk.ind : "transparent", borderWidth: i < of ? 1.5 : 0, borderColor: i < n ? tk.ind : tk.faint, opacity: i < of ? 1 : 0.35 }} />
      ))}
    </View>
  );
}

/* the three slots a name needs: filled with a check, or dashed */
function Slot({ done, tk }: { done: boolean; tk: ThemeTokens }) {
  return (
    <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: done ? tk.ind : "transparent", borderWidth: done ? 0 : 1.5, borderStyle: "dashed", borderColor: tk.faint, alignItems: "center", justifyContent: "center" }}>
      {done && (
        <Svg width={10} height={8} viewBox="0 0 10 8">
          <Path d="M1 4l3 3 5-6" fill="none" stroke={tk.bg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}

/** The well's glyphs (owner: counts, not a bar). */
export function AuraMeterGlyphs({ meter }: { meter: AuraCardVM["meter"] }) {
  const { t: tk } = useTheme();
  if (meter.kind === "ticks")
    return (
      <View style={{ flexDirection: "row", gap: 3 }}>
        {Array.from({ length: meter.total }, (_, i) => (
          <View key={i} style={{ width: 10, height: 12, borderRadius: 2, backgroundColor: i < meter.filled ? tk.ind : tk.faint }} />
        ))}
      </View>
    );
  return (
    <View style={{ flexDirection: "row", gap: 5 }}>
      {Array.from({ length: meter.total }, (_, i) => (
        <Slot key={i} done={i < meter.filled} tk={tk} />
      ))}
    </View>
  );
}

export function AuraCard({
  aura,
  seed,
  avatarId,
  onOpen,
  onShare,
  onWrite,
  width = Dimensions.get("window").width - 32,
}: {
  aura: Aura;
  seed: string;
  avatarId?: string | null;
  onOpen: () => void;
  onShare: () => void;
  onWrite?: () => void;
  /** the card's width (the page's, less its 16 gutters, by default) */
  width?: number;
}) {
  const lang = useLang();
  const { t: tk } = useTheme();
  void seed;
  void avatarId;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const vm = useMemo(() => buildAuraCard(auraCardFacts(aura), meFormat()), [aura, lang]);
  if (!vm) return null;
  const onCta = vm.ctaTo === "compose" ? onWrite ?? onOpen : onOpen;
  const artW = auraArtWidth(width);

  return (
    <InkPanel variant="me" style={{ width }} contentStyle={{ gap: 12 }}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={[vm.label, vm.title, vm.from, ...vm.chips.map((c) => c.name), vm.caption].join(". ")} style={({ pressed }) => ({ gap: 12, opacity: pressed ? 0.85 : 1 })}>
        <View style={{ alignSelf: "flex-start", backgroundColor: tk.ink, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: tk.bg }}>{vm.label}</Text>
        </View>
        <View style={{ height: AURA_ART_H, borderRadius: 14, overflow: "hidden", backgroundColor: tk.soft2 }}>
          <AuraArtSlot art={vm.art} width={artW} />
        </View>
        <Text style={{ fontSize: 20, lineHeight: 24, fontWeight: "600", color: tk.ink }}>{vm.title}</Text>
        <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: tk.mute }}>{vm.from}</Text>
        {vm.chips.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {vm.chips.map((c) => (
              <View key={c.id} style={{ borderWidth: 1.5, borderStyle: c.emerging ? "dashed" : "solid", borderColor: tk.ind, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 }}>
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: tk.ind }}>
                  {c.name}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AuraMeterGlyphs meter={vm.meter} />
          <Text style={{ flex: 1, fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 0.6, color: tk.mute }}>{vm.caption}</Text>
          {vm.meter.slips && <Slips n={vm.meter.slips.n} of={vm.meter.slips.of} tk={tk} />}
        </View>
      </Pressable>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCta} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, backgroundColor: tk.ink, borderRadius: 14, paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.85 : 1 })}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: tk.bg }}>{vm.cta}</Text>
        </Pressable>
        {vm.share && (
          <Pressable onPress={onShare} hitSlop={6} accessibilityRole="button" accessibilityLabel={vm.shareLabel} style={({ pressed }) => ({ width: 48, backgroundColor: tk.sf, borderWidth: 2, borderColor: tk.ln, borderRadius: 14, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <ShareIcon size={20} color={tk.ink} />
          </Pressable>
        )}
      </View>
    </InkPanel>
  );
}

/* ── THE CARD THAT TRAVELS (W14 · 03). Title, scene, stickers that hold, the
   sentence. Never a quote, never a piece id: the snapshot rule. ── */
export function AuraTicket({ aura, seed, avatarId, who }: { aura: Aura; seed: string; avatarId?: string | null; who: string }) {
  const st = aura.stickers;
  const formed = aura.phase === "formed";
  const name = formed ? titleName(st?.title) : st?.title?.noun ? titleName(st.title) : phaseHeadline(aura.phase);
  // the three on the card: the kernel already chose them (one per locked dimension)
  // what travels: the writing stickers, then only the counted ones that may leave the phone
  const held = chipsFor(st?.home ?? [], aura.usage, 3, { publicOnly: true });
  const desc = st?.title?.noun ? titleDesc(st.title) : held[0] ? held[0].line : "";
  const letters = st?.windowPieces ?? aura.pieces;
  return (
    <View style={[{ backgroundColor: W14.card, borderRadius: 18, borderWidth: 1.5, borderColor: P.pen, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 }, cardShadow, { shadowOpacity: 0.14, shadowRadius: 44, shadowOffset: { width: 0, height: 20 } }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 2.4, color: P.pen }}>KINDREDLY</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.4, color: "rgba(30,27,53,0.4)" }}>{t("ap.title")}</Text>
      </View>
      <Text style={{ fontFamily: PF.letter, fontSize: 12, color: W14.grey, marginTop: 4 }}>{t("ac.meInWords", { name: who })}</Text>
      <View style={{ marginTop: 14 }}>
        <AuraArt aura={aura} seed={seed} avatarId={avatarId} width={299} height={156} />
      </View>
      <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 40, lineHeight: 40, letterSpacing: -1.6, color: W14.ink, marginTop: 16 }}>{name}</Text>
      {held.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16 }}>
          {held.map((s, i) => (
            <StickerChip key={s.id} id={s.id} i={i} size="lg" />
          ))}
        </View>
      )}
      {!!desc && <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 23, color: W14.ink, marginTop: 16 }}>{desc}</Text>}
      <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: W14.hair, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.2, color: "rgba(30,27,53,0.4)" }}>{t("ac.formedFrom", { n: letters })}</Text>
        {/* the card's own ink: the card is white in every theme and travels
            as a PNG, where the theme's (light, in Midnight) face would vanish */}
        <MosaicId seed={seed} cell={4} gap={1} develop={1} color={W14.ink} />
      </View>
    </View>
  );
}
