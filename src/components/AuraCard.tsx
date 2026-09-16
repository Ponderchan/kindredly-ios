import { Image, Pressable, Text, View } from "react-native";
import { t, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";
import { AURA_SCENES, AURA_SKETCHES } from "../data/aura-scenes";
import { MosaicId } from "./MosaicId";
import { useWrenName } from "../lib/wren-name";
import type { Aura, AuraPhase } from "../lib/aura";
import { lc, phaseCta, phaseFoot, phaseHeadline, phaseLabel, stickerLine, stickerLook, stickerName, titleDesc, titleName } from "../lib/sticker-copy";
import type { ResolvedSticker } from "../lib/writing-engine/stickers";

/* WRITING AURA — the card, built to the owner's W14 sheet (Me tab · final).
   ────────────────────────────────────────────────────────────────────────
   White card, the title in big bold type, the scene on the right, one
   sentence in plain words, then the stickers she has put on — three at
   most here, the sheet has the rest. Day one shows a dashed empty scene and
   a bar to the first read instead of pretending. Every word is a fixed
   template filled with counted facts; nothing is a score or a percentage. */

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

/* the card shows this many; the sheet shows every one */
const CHIPS_AT: Record<AuraPhase, number> = { empty: 0, forming: 1, shaping: 2, clearing: 3, formed: 3 };

/* ── the sticker: its dimension's ink, a white cut edge, a little tilt, and
   nothing on it but its name (the owner's sheet) ── */
export function StickerChip({
  id,
  i = 0,
  size = "md",
  selected,
  onPress,
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
        <View style={{ backgroundColor: look.bg, borderRadius: look.radius, paddingHorizontal: lg ? 15 : 12, paddingVertical: lg ? 8 : 6 }}>
          <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: lg ? 13.5 : 12.5, color: look.fg }} numberOfLines={1}>
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

export function AuraArt({ aura, seed, width, height, radius = 12 }: { aura: Aura; seed: string; avatarId?: string | null; width: number; height: number; radius?: number }) {
  void seed;
  const stage = aura.phase;
  const title = aura.stickers?.title ?? null;
  const frame = { width, height, borderRadius: radius, overflow: "hidden" as const, alignItems: "center" as const, justifyContent: "center" as const };
  const img = { width, height: Math.round((width * 3) / 4) } as const;

  if (stage === "formed" && title?.noun && title.adjective) {
    const src = AURA_SCENES[sceneId(title.adjective, title.noun)];
    return (
      <View style={[frame, { backgroundColor: W14.slot }]}>
        {src ? <Image source={src} style={img} resizeMode="cover" /> : <MosaicId seed={seed} cell={8} gap={1.5} develop={1} />}
      </View>
    );
  }
  if (title?.noun) {
    const src = AURA_SKETCHES[sceneId(null, title.noun)];
    return (
      <View style={[frame, { backgroundColor: W14.slotEmpty, borderWidth: 2, borderStyle: "dashed", borderColor: W14.slotEdge }]}>
        {src ? <Image source={src} style={img} resizeMode="cover" /> : <MosaicId seed={seed} cell={8} gap={1.5} develop={0.5} />}
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

export function AuraCard({
  aura,
  seed,
  avatarId,
  onOpen,
  onShare,
  onWrite,
}: {
  aura: Aura;
  seed: string;
  avatarId?: string | null;
  onOpen: () => void;
  onShare: () => void;
  onWrite?: () => void;
}) {
  useLang();
  const wren = useWrenName();
  const stage = aura.phase;
  const formed = stage === "formed";
  const st = aura.stickers;
  const shown = (st?.home ?? []).slice(0, CHIPS_AT[stage]);
  const toFirst = Math.min(aura.pieces, 3);

  const headline = formed ? titleName(st?.title) : phaseHeadline(stage);
  const desc = formed
    ? titleDesc(st?.title)
    : stage === "empty"
      ? t("ap.empty.desc", { wren })
      : shown[0]
        ? t("ap.noticed", { wren, line: lc(stickerLine(shown[0])) })
        : t("ap.nothingYet");
  const onCta = stage === "empty" || stage === "forming" ? onWrite ?? onOpen : onOpen;

  return (
    <Pressable onPress={onOpen} style={[{ backgroundColor: W14.card, borderRadius: 20, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 }, cardShadow]}>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 2.2, color: P.pen }}>{t("ap.title")}</Text>
          </View>
          <Text style={{ fontFamily: PF.letter, fontSize: 12, color: W14.grey, marginTop: 3 }}>{t("ap.sub")}</Text>
          <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 30, lineHeight: 32, letterSpacing: -1, color: stage === "empty" ? "rgba(30,27,53,0.22)" : W14.ink, marginTop: 14 }}>
            {headline}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 10 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 13, color: formed ? "#2E7D4F" : W14.grey }}>{phaseLabel(stage)}</Text>
          <AuraArt aura={aura} seed={seed} avatarId={avatarId} width={140} height={stage === "empty" ? 110 : 104} />
        </View>
      </View>

      <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 22, color: W14.ink, marginTop: 12 }}>{desc}</Text>

      {shown.length === 0 && !formed && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 }}>
          <View style={{ width: 72, height: 3, borderRadius: 2, backgroundColor: "#E4E1FA", overflow: "hidden" }}>
            <View style={{ width: `${(toFirst / 3) * 100}%`, height: 3, backgroundColor: P.pen }} />
          </View>
          <Text style={{ flex: 1, fontFamily: PF.letter, fontSize: 13.5, color: W14.grey }}>{stage === "empty" ? t("ap.firstWordsEnough") : t("ap.toFirstRead", { n: toFirst })}</Text>
        </View>
      )}

      {shown.length > 0 && (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 14 }}>
          {shown.map((s, i) => (
            <StickerChip key={s.stickerId} id={s.stickerId} i={i} />
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <Pressable onPress={onCta} style={({ pressed }) => ({ flex: 1, backgroundColor: W14.navy, borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.85 : 1 })}>
          <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14, color: "#FFFFFF" }}>{phaseCta(stage)} →</Text>
        </Pressable>
        {formed && (
          <Pressable onPress={onShare} hitSlop={6} style={({ pressed }) => ({ width: 52, borderWidth: 1.5, borderColor: "#DCD9F0", borderRadius: 12, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ fontFamily: PF.letter, fontSize: 18, color: W14.ink }}>⇧</Text>
          </Pressable>
        )}
      </View>
      <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.4, color: W14.grey, textAlign: "center", marginTop: 12 }}>{phaseFoot(stage)}</Text>
    </Pressable>
  );
}

/* ── THE CARD THAT TRAVELS (W14 · 03). Title, scene, stickers that hold, the
   sentence. Never a quote, never a piece id: the snapshot rule. ── */
export function AuraTicket({ aura, seed, avatarId, who }: { aura: Aura; seed: string; avatarId?: string | null; who: string }) {
  const st = aura.stickers;
  const formed = aura.phase === "formed";
  const name = formed ? titleName(st?.title) : st?.title?.noun ? titleName(st.title) : phaseHeadline(aura.phase);
  // the three on the card: the kernel already chose them (one per locked dimension)
  const held = (st?.home ?? []).slice(0, 3);
  const desc = st?.title?.noun ? titleDesc(st.title) : held[0] ? stickerLine(held[0]) : "";
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
            <StickerChip key={s.stickerId} id={s.stickerId} i={i} size="lg" />
          ))}
        </View>
      )}
      {!!desc && <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 23, color: W14.ink, marginTop: 16 }}>{desc}</Text>}
      <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: W14.hair, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.2, color: "rgba(30,27,53,0.4)" }}>{t("ac.formedFrom", { n: letters })}</Text>
        <MosaicId seed={seed} cell={4} gap={1} develop={1} />
      </View>
    </View>
  );
}
