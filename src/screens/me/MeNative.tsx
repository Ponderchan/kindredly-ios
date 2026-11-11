import { useEffect, useMemo, useRef } from "react";
import { useWindowDimensions } from "react-native";
import { useIsFocused } from "expo-router";
import { KIsland, useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import {
  KMeView,
  type KMeAura,
  type KMeCommands,
  type KMeFirstClass,
  type KMeFcRollout,
  type KMeLooks,
  type KMePeekKindreds,
  type KMePeekLetters,
  type KMeProfile,
  type KMeReport,
  type KMeStamps,
  type KMeStrings,
} from "../../../modules/kindredly-ui/src/Me";
import type { KKindredsFace } from "../../../modules/kindredly-ui/src/Kindreds";
import { SurfaceHost } from "../../components/NativeSurface";
import { AvatarImage } from "../../components/AvatarImage";
import { CourierCard } from "../../components/CourierCard";
import { AURA_ART_H, AuraArtSlot, auraArtWidth } from "../../components/AuraCard";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { useBirdImageRef, type BirdPose } from "../../lib/bird-images";
import { faceRecord, useFaceSources, type FaceInput, type FaceSource } from "../../lib/faces";
import type { ImageRefRecord } from "../../lib/images";
import { t } from "../../lib/i18n";
import { stampSpoken, useMemberStamps, useMyStamp } from "../../lib/member-marks";
import { FIRST_CLASS_SEGMENT, type AuraCardVM, type LookPose, type LookTileId, type Me4aView, type MeView } from "./me-model";
import type { MeModel } from "./useMeModel";
import { useStampCollection } from "./useStampCollection";
import { useAuraArtData, useCourierCardData, useMePlanetData } from "./me-pieces";
import { useMyFace } from "../../lib/my-face";

/* THE ME TAB IN SWIFTUI (4a, 2026-10-19): one Host for the whole screen
   (SurfaceHost: flex 1, every safe area ignored, light or dark from the
   theme, the crash breadcrumb's layout report), holding KMeView, with three
   React Native islands inside it — the user's avatar (AvatarImage: a photo,
   a portrait, an old drawn face or the mosaic, which SwiftUI can't all
   draw; drawn 72 and scaled by the collapsing header), the courier's live
   scene (CourierCard: the owner keeps her animation React Native) and the
   Aura card's picture. Every tap is SwiftUI's; the islands take no touches
   and VoiceOver doesn't see them.

   This file only turns the model (useMeModel: me-model's MeView for the
   courier, aura and stamps, and its Me4aView for the header, the peeks, the
   looks, the First Class card and the report door) into the Swift records:
   - the kindreds' faces (lib/faces useFaceSources → faceRecord), the looks
     tiles' and the First Class stamp's birds as snapshots of the reader's
     own courier (useBirdImageRef lookNone, the two middle tiles' poses —
     lookBeanie / lookScarf, or lookWitch / lookGhost in Halloween —,
     lookWorn, fcFree / fcMember);
   - the records kept by content, so a refocus that reads the same page
     again doesn't re-send them (every prop change re-sends the whole props
     map), with one rev for all of them;
   - the islands: all three on every render, in a fixed order (Slot.tsx's
     rule), the courier filled only while Courier shows and the art only
     while Aura shows — so the courier's loops don't run behind another card
     (critic) — and each the size Swift places it at;
   - the locked First Class look and "All looks →" for a free reader show the
     First Class segment (a segment command, reported back like a chip);
   - pressing Me again goes to the top (the model's scroll serial);
   - two of the islands can be drawn by Swift instead (me-pieces, 2026-10-27, behind
     "couriercard" and "auraart", off by default): then the record goes to KMeView and the island
     stays in its place, empty;
   - so can your face (batch 3, "myavatar", off by default; lib/my-face): KMeView's `myFace`,
     drawn by Swift at the island's 72 (square inside your stamp), the island left empty;
   - THE COURIER'S PLANET (2026-11-11, docs/courier-planet.md; "meplanet", off by default;
     me-pieces useMePlanetData): KMeView's `planet`. With it Me is one page with no segments:
     her card (the planet she lives on, her words, four looks), the Aura and Stamps tiles, the
     report row. The courier island and card are then never filled (nothing of the old card
     runs), the Aura tile's picture is Swift's (`auraArt`, on white), a look reports its shelf
     id (act.shelfLook: wear it, take it off, First Class, or her wardrobe), "All looks →"
     opens her wardrobe for everyone, and the round button is act.track. Off, nothing here
     changes. */

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
/** the avatar island's side (KMeScreen.avatarIsland): the header scales it, never re-lays it out */
const AVATAR = 72;

export const nativeStrings = (v: MeView, m: Me4aView): KMeStrings => ({
  settingsLabel: v.settingsLabel,
  courierA11y: v.courierA11y,
  segments: v.segments,
  ...m.a11y,
});

/** `with` appended after a comma, when there is one: what VoiceOver hears for a stamp (C2) */
const andSpoken = (label: string, spoken: string): string => (spoken ? `${label}, ${spoken}` : label);

/** `stamp`: your C2 denomination (useMyStamp), "" for none; VoiceOver hears it on the avatar button */
export const nativeProfile = (m: Me4aView, stamp = ""): KMeProfile => ({
  name: m.profile.name,
  joined: m.profile.joined,
  editLabel: andSpoken(m.profile.editLabel, stampSpoken(stamp, t)),
  stamp,
  stats: m.profile.stats.map((s) => ({ key: s.key, count: s.count, unit: s.unit, a11y: s.a11y, hint: s.hint })),
});

export const nativePeekLetters = (m: Me4aView): KMePeekLetters => ({
  state: m.peekLetters.state,
  items: m.peekLetters.items.map((l) => ({ id: l.id, date: l.date, stampId: l.stampId, stampHex: l.stampHex, body: l.body, tone: l.tone, status: l.status, a11y: l.a11y })),
  seeAll: m.peekLetters.seeAll,
  emptyText: m.peekLetters.emptyText,
  emptyCta: m.peekLetters.emptyCta,
});

const PLACEHOLDER_FACE: KKindredsFace = { kind: "placeholder", uri: "", key: "", overscan: 0, mask: 0, tint: "ink" };
const kindredFace = (s: FaceSource | undefined): KKindredsFace => (s ? { ...faceRecord(s), tint: "ink" } : PLACEHOLDER_FACE);

/** `stampOf`: a kindred's C2 denomination by uid (useMemberStamps), "" for none */
export const nativePeekKindreds = (
  m: Me4aView,
  faces: Readonly<Record<string, FaceSource>>,
  stampOf: (uid: string | null | undefined) => string = () => "",
): KMePeekKindreds => ({
  state: m.peekKindreds.state,
  items: m.peekKindreds.items.map((k) => {
    const stamp = stampOf(k.face.seed);
    return { id: k.id, name: k.name, line: k.line, face: { ...kindredFace(faces[k.id]), stamp }, a11y: andSpoken(k.a11y, stampSpoken(stamp, t)) };
  }),
  open: m.peekKindreds.open,
  emptyText: m.peekKindreds.emptyText,
});

export const nativeLooks = (m: Me4aView, birds: Readonly<Record<LookPose, ImageRefRecord | null>>): KMeLooks => ({
  header: m.looks.header,
  all: m.looks.all,
  allHint: m.looks.allHint,
  tiles: m.looks.tiles.map((t) => ({ id: t.id, label: t.label, name: t.name, bird: birds[t.pose], selected: t.selected, locked: t.locked, dim: t.dim, hint: t.hint })),
});

export const nativeReport = (m: Me4aView): KMeReport => ({
  show: m.report.show,
  title: m.report.title,
  sub: m.report.sub,
  enabled: m.report.enabled,
  locked: m.report.locked,
  hint: m.report.hint,
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


export function MeNative({ model }: { model: MeModel }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const { width } = useWindowDimensions();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands<KMeCommands>(ref);
  const { view, me4a, act, courier, aura, avatar, segment, fc } = model;

  // pressing Me again while on it: to the top (the Me stack has popped itself to this page)
  const served = useRef(model.scroll.serial);
  useEffect(() => {
    if (model.scroll.serial === served.current) return;
    served.current = model.scroll.serial;
    commands.send("scrollTo", { key: "top", animated: true });
  }, [model.scroll, commands]);

  // the kindreds peek's faces, as files and mosaics Swift can draw
  const faceInputs = useMemo(() => {
    const o: Record<string, FaceInput> = {};
    for (const k of me4a.peekKindreds.items) o[k.id] = k.face;
    return o;
  }, [me4a.peekKindreds.items]);
  const faces = useFaceSources(faceInputs);
  // C2: your stamp from your entitlement; your kindreds' from member_marks_for (none before 0037)
  const myStamp = useMyStamp();
  const stampOf = useMemberStamps(me4a.peekKindreds.items.map((k) => k.face.seed));

  // her pictures: the looks tiles (grown, each look pinned; lookWorn is whatever she has on) and
  // the First Class stamp
  // the middle two tiles' poses come from the model (beanie and scarf, or the season's two looks),
  // so only the four pictures on the row are captured
  const lookNone = useBirdImageRef("lookNone");
  const pose1 = me4a.looks.tiles[1]?.pose ?? "lookBeanie";
  const pose2 = me4a.looks.tiles[2]?.pose ?? "lookScarf";
  const look1 = useBirdImageRef(pose1);
  const look2 = useBirdImageRef(pose2);
  const lookWorn = useBirdImageRef("lookWorn");
  const fcPose: BirdPose = me4a.firstClass.pose;
  const fcBird = useBirdImageRef(fcPose);
  const birds = useMemo(() => {
    const b: Record<LookPose, ImageRefRecord | null> = { lookNone, lookBeanie: null, lookScarf: null, lookWitch: null, lookGhost: null, lookWorn };
    b[pose1] = look1;
    b[pose2] = look2;
    return b;
  }, [lookNone, pose1, look1, pose2, look2, lookWorn]);

  const strings = useSameContent(useMemo(() => nativeStrings(view, me4a), [view, me4a]));
  const profile = useSameContent(useMemo(() => nativeProfile(me4a, myStamp), [me4a, myStamp]));
  const peekLetters = useSameContent(useMemo(() => nativePeekLetters(me4a), [me4a]));
  const peekKindreds = useSameContent(useMemo(() => nativePeekKindreds(me4a, faces, stampOf), [me4a, faces, stampOf]));
  const looks = useSameContent(useMemo(() => nativeLooks(me4a, birds), [me4a, birds]));
  const auraRec = useSameContent(useMemo(() => nativeAura(view.aura), [view.aura]));
  const report = useSameContent(useMemo(() => nativeReport(me4a), [me4a]));
  /* the Stamps card (custom stamps, Prompt 1): MADE BY YOU, FROM STRANGERS, YOUR STAMPS, the album
     (useStampCollection: the facts, the words and the taps; the album route shares it) */
  const collection = useStampCollection({ where: "me" });
  const stamps = useSameContent<KMeStamps>(collection.card);
  const firstClass = useSameContent<KMeFirstClass>(
    useMemo(
      () => ({
        eyebrow: me4a.firstClass.eyebrow,
        headline: me4a.firstClass.headline,
        rows: me4a.firstClass.rows,
        cta: me4a.firstClass.cta,
        trial: me4a.firstClass.trial,
        stampLabel: me4a.firstClass.stampLabel,
        bird: fcBird,
        member: me4a.firstClass.member,
      }),
      [me4a.firstClass, fcBird],
    ),
  );
  /* First Class by the day (lib/fc-rollout): the record without the courier's words */
  const { courierLine: _cl, courierSub: _cs, ...fcRecord } = fc.view;
  void _cl;
  void _cs;
  const fcSent = useSameContent<KMeFcRollout>(fcRecord);
  const fcOpen = fc.open;
  // the courier's planet, when "meplanet" is on (null: the page of segments, as before); its
  // clock runs only while the tab is focused. Kept by content like the records above, and in
  // the rev with them: Swift converts it with the page's content
  const focused = useIsFocused();
  const planet = useMePlanetData(model, collection.card, { live: focused });
  const onPlanet = !!planet;
  const rev = useRev(strings, profile, peekLetters, peekKindreds, looks, auraRec, report, stamps, firstClass, fcSent, planet);

  // a free reader's First Class look and "All looks →": the First Class segment, shown as its
  // chip would (Swift reports it back through onSegment); a member's: her wardrobe.
  // With the planet there are no segments: a shelf look reports its own id (act.shelfLook
  // decides), and "All looks →" is her wardrobe for everyone (it explains its own locks)
  const member = me4a.looks.member;
  const toFirstClass = () => commands.send("segment", { index: FIRST_CLASS_SEGMENT });
  const onLook = (id: string) => {
    if (onPlanet) act.shelfLook(id);
    else if (id === "fc" && !member) toFirstClass();
    else act.look(id as LookTileId);
  };
  const onAllLooks = () => (onPlanet || member ? act.allLooks() : toFirstClass());

  // the segment the view opens on: the session's, read once (Swift owns it after)
  const initialSegment = useRef(segment).current;
  const courierW = width - GUTTER * 2 - FRAME_LINES;
  const artW = auraArtWidth(width - GUTTER * 2);

  // the courier's card and the Aura card's picture in Swift, when their switches are on (null:
  // the island, as before); the card's loops run only while the tab is focused. With the planet
  // the old card never shows, and the Aura picture is the tile's (always on show, on white)
  const showsAura = onPlanet ? !!view.aura && !!aura : segment === 1 && !!view.aura && !!aura;
  const courierCard = useCourierCardData(courier, { showing: !onPlanet && segment === 0, live: focused });
  const auraArt = useAuraArtData(showsAura && view.aura ? view.aura.art : null, showsAura, { tile: onPlanet });
  // your face in Swift, when "myavatar" is on (null: the island, as before); armed once Me is seen
  const myFace = useMyFace(avatar, focused);

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
        peekLetters={peekLetters}
        peekKindreds={peekKindreds}
        looks={looks}
        aura={auraRec}
        report={report}
        stamps={stamps}
        firstClass={firstClass}
        initialSegment={initialSegment}
        onSettings={act.settings}
        onEdit={act.edit}
        onPeek={act.peek}
        onPeekLetter={act.peekLetter}
        onPeekKindred={act.peekKindred}
        onSeeAll={act.seeAll}
        onOpenKindreds={act.openKindreds}
        onWrite={act.write}
        onSegment={act.segment}
        onCourier={act.courier}
        onLook={onLook}
        onAllLooks={onAllLooks}
        onAuraOpen={act.auraOpen}
        onAuraCta={act.auraCta}
        onAuraShare={act.auraShare}
        onReport={act.report}
        onStampsEmpty={act.stampsEmpty}
        onStamps={collection.onCard}
        onFirstClass={act.firstClass}
        fc={fcSent}
        onFcOpen={fcOpen}
        courierCard={courierCard}
        auraArt={auraArt}
        myFace={myFace}
        planet={planet}
        onTrack={act.track}
      >
        <KIsland name="avatar" style={{ width: AVATAR, height: AVATAR }}>
          {/* stamped (C2), the island is drawn square: Swift scales it to the stamp's inner side
              (65 of 72), so 3.3 here lands as the stamp's 3pt inner corner */}
          {myFace ? null : <AvatarImage id={avatar.id} photoUri={avatar.photo} seed={avatar.seed} size={AVATAR} radius={myStamp ? 3.3 : undefined} />}
        </KIsland>
        <KIsland name="courier" style={{ width: courierW, height: COURIER_H }}>
          {segment === 0 && !courierCard && !onPlanet ? (
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
          {showsAura && view.aura && !auraArt && !onPlanet ? <AuraArtSlot art={view.aura.art} width={artW} /> : null}
        </KIsland>
      </KMeView>
    </SurfaceHost>
  );
}
