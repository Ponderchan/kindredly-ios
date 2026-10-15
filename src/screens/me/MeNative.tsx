import { useEffect, useMemo, useRef } from "react";
import { useWindowDimensions } from "react-native";
import { KIsland, useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import {
  KMeView,
  type KMeAura,
  type KMeCommands,
  type KMeFirstClass,
  type KMeKeepsakes,
  type KMeProfile,
  type KMeStamps,
  type KMeStrings,
} from "../../../modules/kindredly-ui/src/Me";
import { SurfaceHost } from "../../components/NativeSurface";
import { AvatarImage } from "../../components/AvatarImage";
import { CourierCard } from "../../components/CourierCard";
import { AURA_ART_H, AuraArtSlot, auraArtWidth } from "../../components/AuraCard";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { useAssetImageRefs } from "../../lib/images";
import { useBirdImageRef } from "../../lib/bird-images";
import { keepsake } from "../../data/keepsakes";
import type { AuraCardVM, KeepsakesVM, MeView } from "./me-model";
import type { MeModel } from "./useMeModel";

/* THE ME TAB IN SWIFTUI (10a step 5): one Host for the whole screen
   (SurfaceHost: flex 1, every safe area ignored, light or dark from the
   theme, the crash breadcrumb's layout report), holding KMeView, with three
   React Native islands inside it — the user's avatar (AvatarImage: a photo,
   a portrait, an old drawn face or the mosaic, which SwiftUI can't all
   draw), the courier's live scene (CourierCard: the owner keeps her
   animation React Native) and the Aura card's picture (one of the fifty
   scenes fitted by height, or the desk). Every tap is SwiftUI's; the
   islands take no touches and VoiceOver doesn't see them.

   This file only turns the model's view (me-model, the same one the React
   Native fallback draws) into the Swift records:
   - the keepsake icons as expo-asset files (useAssetImageRefs), the First
     Class stamp's bird as a snapshot of the reader's own courier, grown,
     curious or delighted (useBirdImageRef fcFree / fcMember);
   - the records kept by content, so a refocus that reads the same page
     again doesn't re-send them (every prop change re-sends the whole props
     map), with one rev for all of them;
   - the islands: all three on every render, in a fixed order (Slot.tsx's
     rule), the courier filled only while Courier shows and the art only
     while Aura shows — so the courier's loops don't run behind another card
     (critic) — and each the size Swift places it at;
   - pressing Me again goes to the top (the model's scroll serial). */

/** The same value back while its content is the same (JSON), so a rebuilt but unchanged record
    keeps its identity and isn't re-sent to Swift. */
function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

/* the page's gutters, and the courier frame's two outlines */
const GUTTER = 16;
const FRAME_LINES = 5;
/** the courier scene's height (CourierCard SCENE_H; KMeScreen.courierSceneHeight) */
const COURIER_H = 236;

export const nativeStrings = (v: MeView): KMeStrings => ({
  title: v.title,
  penName: v.penName,
  settingsLabel: v.settingsLabel,
  courierA11y: v.courierA11y,
  segments: v.segments,
});

export const nativeProfile = (v: MeView): KMeProfile => ({
  name: v.profile.name,
  joined: v.profile.joined,
  cofounder: v.profile.cofounder,
  editLabel: v.profile.editLabel,
  stats: v.profile.stats.map((s) => ({ key: s.key, glyph: s.glyph, count: s.count, unit: s.unit, a11y: s.a11y })),
});

const NO_AURA: KMeAura = {
  present: false,
  label: "",
  title: "",
  from: "",
  chips: [],
  meterKind: "ticks",
  filled: 0,
  total: 5,
  slipsN: -1,
  slipsOf: -1,
  caption: "",
  cta: "",
  share: false,
  shareLabel: "",
};

export function nativeAura(a: AuraCardVM | null): KMeAura {
  if (!a) return NO_AURA;
  return {
    present: true,
    label: a.label,
    title: a.title,
    from: a.from,
    chips: a.chips.map((c) => ({ id: c.id, name: c.name, emerging: c.emerging })),
    meterKind: a.meter.kind,
    filled: a.meter.filled,
    total: a.meter.total,
    slipsN: a.meter.slips ? a.meter.slips.n : -1,
    slipsOf: a.meter.slips ? a.meter.slips.of : -1,
    caption: a.caption,
    cta: a.cta,
    share: a.share,
    shareLabel: a.shareLabel,
  };
}

export const nativeStamps = (v: MeView): KMeStamps => ({
  label: v.stamps.label,
  count: v.stamps.count,
  cells: v.stamps.cells.map((c) => ({ id: c.id, date: c.date, a11y: c.a11y, hex: c.hex })),
  emptyText: v.stamps.emptyText,
  emptyCta: v.stamps.emptyCta,
});

export function nativeKeepsakes(k: KeepsakesVM, icons: Partial<Record<string, { uri: string; key: string }>>): KMeKeepsakes {
  return {
    header: k.header,
    count: k.count,
    note: k.note,
    a11y: k.a11y,
    tiles: k.tiles.map((t) => (t ? { id: t.id, name: t.name, image: icons[t.id] ?? null, fresh: t.fresh, a11y: t.a11y } : { id: "", name: "", image: null, fresh: false, a11y: "" })),
  };
}

export function MeNative({ model }: { model: MeModel }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const { width } = useWindowDimensions();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands<KMeCommands>(ref);
  const { view, act, courier, aura, avatar, segment } = model;

  // pressing Me again while on it: to the top (the Me stack has popped itself to this page)
  const served = useRef(model.scroll.serial);
  useEffect(() => {
    if (model.scroll.serial === served.current) return;
    served.current = model.scroll.serial;
    commands.send("scrollTo", { key: "top", animated: true });
  }, [model.scroll, commands]);

  // the keepsake icons the two tiles show, as files Swift can load
  const tileIds = view.keepsakes.tiles.map((t) => t?.id ?? "").join("|");
  const iconMods = useMemo(() => {
    const mods: Record<string, number> = {};
    for (const id of tileIds.split("|")) {
      const def = id ? keepsake(id) : null;
      if (def) mods[id] = def.icon;
    }
    return mods;
  }, [tileIds]);
  const icons = useAssetImageRefs(iconMods);
  const bird = useBirdImageRef(view.firstClass.pose);

  const strings = useSameContent(useMemo(() => nativeStrings(view), [view]));
  const profile = useSameContent(useMemo(() => nativeProfile(view), [view]));
  const auraRec = useSameContent(useMemo(() => nativeAura(view.aura), [view.aura]));
  const stamps = useSameContent(useMemo(() => nativeStamps(view), [view]));
  const keepsakes = useSameContent(useMemo(() => nativeKeepsakes(view.keepsakes, icons), [view.keepsakes, icons]));
  const firstClass = useSameContent<KMeFirstClass>(
    useMemo(
      () => ({
        eyebrow: view.firstClass.eyebrow,
        headline: view.firstClass.headline,
        sub: view.firstClass.sub,
        cta: view.firstClass.cta,
        stampLabel: view.firstClass.stampLabel,
        bird,
      }),
      [view.firstClass, bird],
    ),
  );
  const rev = useRev(strings, profile, auraRec, stamps, keepsakes, firstClass);

  // the segment the view opens on: the session's, read once (Swift owns it after)
  const initialSegment = useRef(segment).current;
  const courierW = width - GUTTER * 2 - FRAME_LINES;
  const artW = auraArtWidth(width - GUTTER * 2);

  return (
    <SurfaceHost>
      <KMeView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        profile={profile}
        aura={auraRec}
        stamps={stamps}
        keepsakes={keepsakes}
        firstClass={firstClass}
        initialSegment={initialSegment}
        onSettings={act.settings}
        onEdit={act.edit}
        onStat={act.stat}
        onSegment={act.segment}
        onCourier={act.courier}
        onKeepsakes={act.keepsakes}
        onKeepsake={act.keepsake}
        onAuraOpen={act.auraOpen}
        onAuraCta={act.auraCta}
        onAuraShare={act.auraShare}
        onStampsEmpty={act.stampsEmpty}
        onFirstClass={act.firstClass}
      >
        <KIsland name="avatar" style={{ width: 56, height: 56 }}>
          <AvatarImage id={avatar.id} photoUri={avatar.photo} seed={avatar.seed} size={56} />
        </KIsland>
        <KIsland name="courier" style={{ width: courierW, height: COURIER_H }}>
          {segment === 0 ? (
            <CourierCard
              framed
              width={courierW}
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
              // the frame owns the tap; on her day off the card draws the game's cover
              onPlay={courier.dayOff ? act.courier : undefined}
            />
          ) : null}
        </KIsland>
        <KIsland name="auraArt" style={{ width: artW, height: AURA_ART_H }}>
          {segment === 1 && view.aura && aura ? <AuraArtSlot art={view.aura.art} width={artW} /> : null}
        </KIsland>
      </KMeView>
    </SurfaceHost>
  );
}
