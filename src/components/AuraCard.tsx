import { Dimensions, Image, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { P, PF } from "../theme/post";
import { AURA_SCENES, AURA_SKETCHES } from "../data/aura-scenes";
import { MosaicId } from "./MosaicId";
import type { Aura } from "../lib/aura";
import { rungOf } from "../lib/aura-ladder";
import { AuraArtBand, AuraScene } from "./AuraScene";
import { ShareIcon } from "./Icons";
import { daylight } from "./CourierCard";
import { chipsFor, phaseHeadline, stickerLook, stickerName, titleDesc, titleName } from "../lib/sticker-copy";
import type { ResolvedSticker } from "../lib/writing-engine/stickers";

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
   nothing on it but its name (the owner's sheet) ── */
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

/* ── the paper: white, like every other card on the page (the sheet's D
   was moon cream; on the lavender ground it read yellow, and warm paper
   is the one thing this system already ruled out — see theme/post). The
   scene's own ground is the pale lavender the sticker slots use, so the
   picture still sits IN the card rather than floating on it. Light by
   design — the courier card is light three hours of four, and at night
   the two make a facing pair, one deep, one pale. ── */
const CREAM = { card: "#FFFFFF", cardNamed: "#FFFFFF", ink: "#1E1B35", dim: "rgba(30,27,53,0.66)", well: "rgba(30,27,53,0.06)", tickOff: "rgba(30,27,53,0.3)" } as const;

/* the five slips on the right of the progress well: "n of your last m" */
function Slips({ n, of }: { n: number; of: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <View key={i} style={{ width: 9, height: 13, borderRadius: 2, backgroundColor: i < n ? CREAM.ink : "transparent", borderWidth: i < of ? 1.5 : 0, borderColor: i < n ? CREAM.ink : CREAM.tickOff, opacity: i < of ? 1 : 0.35 }} />
      ))}
    </View>
  );
}

/* the three slots a name needs: a filled square with a check, or a dashed one */
function Slot({ done }: { done: boolean }) {
  return (
    <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: done ? CREAM.ink : "transparent", borderWidth: done ? 0 : 1.5, borderStyle: "dashed", borderColor: CREAM.tickOff, alignItems: "center", justifyContent: "center" }}>
      {done && <Svg width={10} height={8} viewBox="0 0 10 8"><Path d="M1 4l3 3 5-6" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>}
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
  void seed;
  void avatarId;
  const st = aura.stickers;
  const rung = rungOf(aura);
  const named = rung.level >= 5;
  const width = Dimensions.get("window").width - 32;

  /* the three on the card, and whether each is stuck or still trying */
  const shown = chipsFor(st?.home ?? [], aura.usage, 3);
  const stateOf = (id: string) => st?.home.find((h) => h.stickerId === id)?.state;

  const from =
    rung.level === 0
      ? t("ap.from.first")
      : named
        ? t("ap.from.named", { n: rung.letters })
        : rung.letters === 1
          ? t("ap.from.one")
          : t("ap.from.n", { n: rung.letters });

  const progress =
    rung.level <= 2
      ? rung.letters > 5
        ? t("ap.prog.notYet", { n: rung.letters }) // past the five and nothing holds — say so
        : t("ap.prog.letters", { n: rung.letters, m: rung.level === 2 ? 5 : 3 })
      : rung.level <= 4
        ? rung.stuck > 0
          ? t("ap.prog.stuck", { n: Math.min(rung.stuck, 3) })
          : t("ap.prog.forming", { n: rung.letters }) // a stage reached, nothing held yet: say what was read, not "0 of 3"
        : rung.level === 5
          ? t("ap.prog.addUp")
          : t(rung.changing === 1 ? "ap.prog.changing" : "ap.prog.changingMany", { n: rung.changing });

  const cta = rung.level === 0 ? t("ap.cta.empty") : rung.level <= 2 ? t("ap.cta.another") : rung.level <= 4 ? t("ap.cta.labels") : t("ap.cta.full");
  const onCta = rung.level <= 2 ? onWrite ?? onOpen : onOpen;
  /* the title's own scene, once a noun is in view: its sketch while the
     name is forming (rungs 3–4), in colour once it is earned (5–6) */
  const title = st?.title ?? null;
  const artId = title?.noun ? sceneId(title.adjective ?? null, title.noun) : null;
  const art =
    artId && rung.fidelity === "colour" && AURA_SCENES[artId]
      ? AURA_SCENES[artId]
      : artId && rung.fidelity === "sketch" && AURA_SKETCHES[artId]
        ? AURA_SKETCHES[artId]
        : null;

  /* over a late-night scene the chrome flips to white; the generic
     figure's colour rung follows the courier's hour */
  const day = daylight();
  const onNight = art ? rung.fidelity === "colour" && !!artId && artId.startsWith("late-night") : rung.fidelity === "colour" && day === "night";
  const chrome = onNight ? "#FFFFFF" : CREAM.ink;
  const chromeText = onNight ? CREAM.ink : "#FFFFFF";


  return (
    <Pressable onPress={onOpen} style={[{ backgroundColor: named ? CREAM.cardNamed : CREAM.card, borderRadius: 22, overflow: "hidden" }, cardShadow, { shadowOpacity: 0.12 }]}>
      {/* the picture is the progress (W33): the same scene, developing.
          The pill sits where the courier card's does, same size, same
          corner — the two cards are one family. */}
      <View>
        {art ? <AuraArtBand width={width} src={art} /> : <AuraScene width={width} fidelity={rung.fidelity} day={day} />}
        <View style={{ position: "absolute", left: 14, top: 12, backgroundColor: chrome, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.5, color: chromeText }}>{t("me.sec.aura").toUpperCase()}</Text>
        </View>
        {/* the picture IS the progress — pencil, sketch, colour. The tick
            meter and the PENCIL / SKETCH tag that used to sit on it named
            the stage a second time in words nobody uses (owner, 2026-09-20). */}
      </View>

      <View style={{ paddingHorizontal: 15, paddingTop: 13, paddingBottom: 15 }}>
        <Text style={{ fontFamily: PF.letter, fontWeight: "800", fontSize: named ? 25 : 23, lineHeight: named ? 28 : 26, letterSpacing: -0.6, color: CREAM.ink }}>
          {named ? titleName(st?.title) : t("ap.what")}
        </Text>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1, color: CREAM.dim, marginTop: 6 }}>{from}</Text>

        {shown.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 9, rowGap: 11, marginTop: 12, paddingHorizontal: 2 }}>
            {shown.map((s, i) => (
              <StickerChip key={s.id} id={s.id} i={i} state={s.kind === "writing" ? stateOf(s.id) : undefined} />
            ))}
          </View>
        )}

        {/* the well: letters counted on the way to the first label, then
            the three slots a name needs, then what the name is made of */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: CREAM.well }}>
          {rung.level <= 2 ? (
            <View style={{ flexDirection: "row", gap: 3 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <View key={i} style={{ width: 10, height: 12, borderRadius: 2, backgroundColor: i < Math.min(rung.letters, 5) ? CREAM.ink : CREAM.tickOff }} />
              ))}
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <Slot key={i} done={i < rung.stuck} />
              ))}
            </View>
          )}
          <Text style={{ flex: 1, fontFamily: PF.letter, fontWeight: "600", fontSize: 12, color: CREAM.dim }}>{progress}</Text>
          {rung.level >= 3 && rung.slips && <Slips n={rung.slips.n} of={rung.slips.of} />}
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Pressable onPress={onCta} style={({ pressed }) => ({ flex: 1, backgroundColor: CREAM.ink, borderRadius: 12, paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 14, color: "#FFFFFF" }}>{cta}</Text>
          </Pressable>
          {named && (
            <Pressable onPress={onShare} hitSlop={6} style={({ pressed }) => ({ width: 48, borderWidth: 1.5, borderColor: "rgba(30,27,53,0.2)", borderRadius: 12, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
              <ShareIcon size={20} color={CREAM.ink} />
            </Pressable>
          )}
        </View>
      </View>
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
        <MosaicId seed={seed} cell={4} gap={1} develop={1} />
      </View>
    </View>
  );
}
