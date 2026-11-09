import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { WardrobeRack } from "../../components/WardrobeRack";
import { WrenBird, type WrenAccessory, type WrenSkin } from "../../components/WrenBird";
import { FirstClassPaywall } from "../../app/paywall";
import { NativeSurface } from "../../components/NativeSurface";
import { Host } from "@expo/ui/swift-ui";
import { KWARDROBE_SLIP_DEPTH, KWardrobeSheetView, KWardrobeSlipView } from "../../../modules/kindredly-ui";
import { tryPose, tryTilePose, useBirdImageRef, useBirdImageRefs } from "../../lib/bird-images";
import type { ImageRefRecord } from "../../lib/images";
import { useSeason } from "../../lib/season";
import { useTheme } from "../../lib/theme";
import { useEntitlement } from "../../lib/entitlement";
import { WARDROBE_SLIP, getFlags, unsetFlag } from "../../lib/flags";
import { t, useLang } from "../../lib/i18n";
import { useScreenInsets } from "../../lib/screen-insets";
import { EMPTY_STATS } from "../../lib/stats";
import { useWrenName } from "../../lib/wren-name";
import { useWrenSkinControl } from "../../lib/wren-skin";
import { ACCESSORY_META, SKINS, offeredAccessories, skinName, skinUnlocked, useHatchSkin } from "../../lib/wren-style";
import { AcidKey } from "../onboarding/parts/keys";
import { EDGE, FONT, OB, SHADOW, TYPE } from "../onboarding/parts/tokens";
import { deskGeometry } from "./today-cards";
import type { TodayModel } from "./useTodayDesk";
import "../../data/strings-onboarding2";

/* THE WARDROBE SLIP — the first arrival's "Otis wants a look →" (the new
   onboarding's storyboard §6 "→ Today: the wardrobe slip").
   ────────────────────────────────────────────────────────────────────────
   The new run took the dress step and First Class OUT of the way of the
   first letter (DECISION Q4): neither is ever between a person and their
   first letter. Instead, when the run ends (services.arrive sets the
   WARDROBE_SLIP flag, lib/flags), Today shows one slip from the bird: its
   name, "wants a look →", "try anything on, free", and a × to put it away.

   A tap opens the existing WardrobeRack (tone post) in a page sheet, where
   EVERYTHING tries on — the free pieces and the First Class ones, on the
   bird itself, big. "Keep this look" keeps it; if something First Class is
   on, it opens the First Class page (FirstClassPaywall: the Swift page, as
   every other way in, FC2 §4.8) first, and the page's close
   puts the bird back the way it was when the sheet opened (as it hatched),
   while boarding keeps the look. The flag is cleared the moment the slip is
   opened or put away, so it never comes back.

   WHERE IT SITS. Today is drawn by SwiftUI (TodayNative, one Host for the
   whole desk) with a React Native fallback (TodayRN), and the overlays sit
   over either (TodayOverlays) — so the slip is one of those overlays,
   floating just above the control band (NEXT · Wren · REPLY), over the
   foot of the card, rather than "under the letters" inside the Swift desk:
   a slot of its own in the desk is a KTodayView change (Swift), left for a
   later step. It stays out of the way of the unfolded letter (hidden while
   the reader is open).

   `demo` (the dev preview, app/dev/wardrobe-slip) never reads or clears
   the flag and never dresses the real bird: Keep only logs. */

/** The slip over Today, when the run's arrival asked for it. */
export function TodayWardrobeSlip({ model }: { model: TodayModel }) {
  const insets = useScreenInsets();
  const { height: hostH } = useWindowDimensions();
  const { controlTop } = deskGeometry({ hostH, safeTop: insets.top, tabBarRoom: insets.tabBarRoom });
  const [want, setWant] = useState(false);
  useEffect(() => {
    let alive = true;
    void getFlags().then((f) => alive && setWant(!!f[WARDROBE_SLIP]));
    return () => {
      alive = false;
    };
  }, []);
  if (!want || model.view.readerId != null) return null;
  /* the flag goes the moment the slip is opened or put away; the slip itself stays mounted and
     goes on its own (WardrobeSlip returns nothing once the slip has faded and the sheet is down).
     It used to unmount here as well, which took the sheet away in the same tap that opened it
     (batch 3, 2026-11-09: on the real Today the sheet never showed; the dev page has no onSeen). */
  const done = () => {
    void unsetFlag(WARDROBE_SLIP);
  };
  return <WardrobeSlip bottom={hostH - controlTop + 10} onSeen={done} />;
}

/* SWIFT OR REACT NATIVE (2026-10-27, the second Swift batch). The slip is
   drawn by SwiftUI with the "wardrobeslip" switch on and KWardrobeSlipView in
   the binary (SlipNative: Portable/Today/KWardrobeSlip.swift, in a Host of its
   own sized to it), else by React Native (SlipRN, exactly as it was). Either
   way this decides everything: when it goes, the flag, and the sheet it opens
   (WardrobeSheet below has a switch of its own, "wardrobesheet"). The slip's
   way out (.16s) is the renderer's own; this keeps the Swift Host up until it
   has faded. */

/** how long the Swift slip takes to fade out after either tap (KWardrobeSlip.outDuration), and a frame */
const SLIP_OUT_MS = 200;

/** The slip itself, and the sheet it opens. `onSeen`: it was opened or put away (clear the flag). */
export function WardrobeSlip({ bottom, onSeen, demo = false }: { bottom: number; onSeen?: () => void; demo?: boolean }) {
  useLang();
  const name = useWrenName();
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  // the slip has finished going (the Swift one fades out first; the React Native one has its own exiting)
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    if (!gone) return;
    const id = setTimeout(() => setFaded(true), SLIP_OUT_MS);
    return () => clearTimeout(id);
  }, [gone]);
  // the sheet is all the way down (a Swift sheet takes its going's time; it needs its Host until then)
  const [sheetAway, setSheetAway] = useState(true);
  if (gone && faded && !open && sheetAway) return null;
  const take = () => {
    setGone(true);
    setOpen(true);
    setSheetAway(false);
    onSeen?.();
  };
  const away = () => {
    setGone(true);
    onSeen?.();
  };
  return (
    <>
      {gone && faded ? null : (
        <NativeSurface
          surface="wardrobeslip"
          view="KWardrobeSlipView"
          mode="mount"
          native={(host) => <SlipNative bottom={bottom} name={name} shown={!gone} onTake={take} onAway={away} onLayoutContent={host.onLayoutContent} />}
          fallback={() => <SlipRN bottom={bottom} name={name} gone={gone} onTake={take} onAway={away} />}
          pending={() => null}
        />
      )}
      <WardrobeSheet open={open} name={name} demo={demo} onClose={() => setOpen(false)} onAway={() => setSheetAway(true)} />
    </>
  );
}

/** The slip in SwiftUI, in a Host that matches its height (its depth hangs right and below: the Host leaves it room). */
function SlipNative({
  bottom,
  name,
  shown,
  onTake,
  onAway,
  onLayoutContent,
}: {
  bottom: number;
  name: string;
  shown: boolean;
  onTake: () => void;
  onAway: () => void;
  onLayoutContent: (e: { nativeEvent: { width: number; height: number } }) => void;
}) {
  const { key: theme, dark } = useTheme();
  const bird = useBirdImageRef("content");
  return (
    <Host
      matchContents={{ vertical: true }}
      ignoreSafeArea="all"
      colorScheme={dark ? "dark" : "light"}
      onLayoutContent={onLayoutContent}
      style={{ position: "absolute", left: 16, right: 16 - KWARDROBE_SLIP_DEPTH, bottom: bottom - KWARDROBE_SLIP_DEPTH }}
    >
      <KWardrobeSlipView
        theme={theme}
        title={t("ob2.slip.title", { name })}
        sub={t("ob2.slip.sub")}
        close={t("ob2.slip.close")}
        bird={bird}
        shown={shown}
        onOpen={onTake}
        onClose={onAway}
      />
    </Host>
  );
}

/** The React Native slip (the "wardrobeslip" switch's fallback), exactly as it was. */
function SlipRN({ bottom, name, gone, onTake, onAway }: { bottom: number; name: string; gone: boolean; onTake: () => void; onAway: () => void }) {
  return (
    <>
      {!gone && (
        <Animated.View entering={FadeInDown.delay(500).duration(360)} exiting={FadeOut.duration(160)} style={{ position: "absolute", left: 16, right: 16, bottom }}>
          <View style={{ position: "absolute", left: SHADOW, top: SHADOW, right: -SHADOW, bottom: -SHADOW, borderRadius: 18, backgroundColor: OB.ink }} />
          <View style={{ borderRadius: 18, borderWidth: EDGE, borderColor: OB.ink, backgroundColor: "#FFF3D6", flexDirection: "row", alignItems: "center", paddingLeft: 10, paddingRight: 4, minHeight: 64 }}>
            <Pressable
              onPress={onTake}
              accessibilityRole="button"
              accessibilityLabel={`${t("ob2.slip.title", { name })} ${t("ob2.slip.sub")}`}
              style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center" }}>
                <WrenBird size={46} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text numberOfLines={1} style={{ ...FONT.bold, fontSize: 16.5, color: OB.ink }}>
                  {t("ob2.slip.title", { name })}
                </Text>
                <Text numberOfLines={1} style={{ ...FONT.body, fontSize: 13, color: OB.inkSoft, marginTop: 1 }}>
                  {t("ob2.slip.sub")}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={onAway}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t("ob2.slip.close")}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d="M5 5l14 14M19 5L5 19" stroke={OB.inkSoft} strokeWidth={2.6} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </>
  );
}

/** The rack in a page sheet: everything tries on; Keep (through the fare when First Class is on). */
function WardrobeSheet({
  open,
  name,
  demo,
  onClose,
  onAway,
}: {
  open: boolean;
  name: string;
  demo: boolean;
  onClose: () => void;
  /** the sheet is all the way down (at once for React Native, whose Modal goes on its own; once a Swift sheet has finished going) */
  onAway: () => void;
}) {
  const insets = useSafeAreaInsets();
  const ctl = useWrenSkinControl();
  const { premium } = useEntitlement();
  const [look, setLook] = useState<WrenSkin>(ctl.skin);
  const [dress, setDress] = useState<WrenAccessory>(ctl.accessory);
  const [fare, setFare] = useState(false);
  // the Swift sheet has finished going down (the fare waits for it)
  const [down, setDown] = useState(false);
  // it has opened in this mount: from then on the switch has chosen (see below)
  const [opened, setOpened] = useState(false);
  if (open && !opened) setOpened(true);
  // a Swift sheet is up, or on its way down (set as it is presented, cleared once it has gone)
  const swiftUp = useRef(false);
  const openNow = useRef(open);
  openNow.current = open;
  const gone = () => {
    swiftUp.current = false;
    setDown(true);
    if (!openNow.current) onAway();
  };
  // each opening starts from the bird as it is now
  useEffect(() => {
    if (!open) {
      // (only the Swift path reads it: a reopening must not find the last fare's "down")
      setDown(false);
      // React Native's Modal goes on its own; a Swift sheet still going says so when it has gone
      if (!swiftUp.current) onAway();
      return;
    }
    setLook(ctl.skin);
    setDress(ctl.accessory);
    setFare(false);
    setDown(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const lookOpen = skinUnlocked(look, EMPTY_STATS, premium);
  const dressOpen = !!ACCESSORY_META.find((a) => a.id === dress)?.free || premium;
  const firstClass = !lookOpen || !dressOpen;

  const keep = (l: WrenSkin, d: WrenAccessory) => {
    if (demo) console.log("[wardrobe slip demo] would keep", l, d, "— the real bird is not dressed");
    else {
      ctl.pick(l);
      ctl.dress(d);
    }
    onClose();
  };
  const what = !lookOpen && !dressOpen ? t("ob.fare.both") : !lookOpen ? t("ob.fare.look") : t("ob.fare.dress");
  const fareSheet = () => (
    <FirstClassPaywall
      sheet
      source="onboarding_dress"
      courier={name}
      head={t("ob.fare.head", { what })}
      lead={t("ob2.slip.fareLead", { name })}
      // × : the bird goes back the way it was when the sheet opened (as it hatched)
      onClose={onClose}
      onDone={() => keep(look, dress)}
    />
  );
  const onKeep = () => {
    if (!firstClass) return keep(look, dress);
    setDown(false); // the Swift sheet's going starts now: the fare waits for this one
    setFare(true);
  };

  /* SWIFT OR REACT NATIVE (batch 3, 2026-11-09). With the "wardrobesheet" switch on and
     KWardrobeSheetView in the binary, the sheet is an iOS sheet drawn by SwiftUI (WardrobeSheetSwift
     below: modules/kindredly-ui Portable/Today/KWardrobeSheet.swift), presented from a 1pt Host;
     otherwise the React Native page sheet below, exactly as it was. The trial (look, dress), the
     fare and Keep stay here either way. The one difference: Keep with something First Class on
     takes the Swift sheet down first, and the fare (the same FirstClassPaywall) rises in the
     React Native page sheet once it is gone, where React Native swaps it in in place.
     NativeSurface in mount mode, mounted from the first opening on (nothing shows before it
     either way), so the crash breadcrumb is armed as the sheet first opens. */
  if (!opened) return null;
  return (
    <NativeSurface
      surface="wardrobesheet"
      view="KWardrobeSheetView"
      mode="mount"
      native={(host) => (
        <>
          <WardrobeSheetSwift
            presented={open && !fare}
            name={name}
            look={look}
            dress={dress}
            premium={premium}
            onLayoutContent={host.onLayoutContent}
            onLook={setLook}
            onDress={setDress}
            onKeep={onKeep}
            onClose={onClose}
            onUp={() => {
              swiftUp.current = true;
            }}
            onGone={gone}
          />
          <Modal visible={open && fare && down} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            {fareSheet()}
          </Modal>
        </>
      )}
      fallback={() => sheetRN()}
      // a frame or two while the breadcrumb is written: nothing yet, as before the sheet rises
      pending={() => null}
    />
  );

  /* the React Native page sheet (the "wardrobesheet" switch's fallback), exactly as it was */
  function sheetRN() {
    return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {fare ? (
        fareSheet()
      ) : (
        <View style={{ flex: 1, backgroundColor: OB.shell }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 22, paddingRight: 8, paddingTop: 14 }}>
            <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, ...FONT.head, fontSize: 22, letterSpacing: -0.5, color: OB.ink }}>
              {t("ob2.slip.head", { name })}
            </Text>
            <Pressable onPress={onClose} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("ob2.slip.close")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M5 5l14 14M19 5L5 19" stroke={OB.ink} strokeWidth={2.6} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
          <Text style={[TYPE.lineSmall, { color: OB.inkSoft, paddingHorizontal: 22, marginTop: 2 }]}>{t("ob2.slip.line")}</Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: "center", marginVertical: 14 }}>
              <WrenBird size={150} skin={look} accessory={dress} mood="happy" />
            </View>
            <WardrobeRack tone="post" skin={look} accessory={dress} stats={EMPTY_STATS} premium={premium} onLook={(id) => setLook(id)} onDress={(id) => setDress(id)} />
          </ScrollView>
          <View style={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
            <AcidKey label={t("ob2.slip.keep")} onPress={onKeep} />
          </View>
        </View>
      )}
    </Modal>
    );
  }
}

/** The Swift sheet's 1pt Host, and everything it shows: the words, the rack's tiles and her
    pictures (lib/bird-images "try-…", "trytile-…"), each the WardrobeRack's own rule. */
function WardrobeSheetSwift({
  presented,
  name,
  look,
  dress,
  premium,
  onLayoutContent,
  onLook,
  onDress,
  onKeep,
  onClose,
  onUp,
  onGone,
}: {
  presented: boolean;
  name: string;
  look: WrenSkin;
  dress: WrenAccessory;
  premium: boolean;
  onLayoutContent: (e: { nativeEvent: { width: number; height: number } }) => void;
  onLook: (id: WrenSkin) => void;
  onDress: (id: WrenAccessory) => void;
  onKeep: () => void;
  onClose: () => void;
  /** it is being presented (it will report onGone once it has gone) */
  onUp: () => void;
  onGone: () => void;
}) {
  useLang();
  const { key: theme, dark } = useTheme();
  const up = useRef(onUp);
  up.current = onUp;
  useEffect(() => {
    if (presented) up.current();
  }, [presented]);
  const hatch = useHatchSkin(); // the coat she hatched in on /aura: hers (WardrobeRack)
  const season = useSeason();
  const offered = offeredAccessories(season.looks);
  const pieces = offered.filter((a) => a.id !== "none");
  const looksOwned = SKINS.filter((s) => skinUnlocked(s.id, EMPTY_STATS, premium, hatch)).length;
  const piecesOwned = pieces.filter((a) => a.free || premium).length;

  /* her pictures, while the sheet is up: big in the trial first, then the tiles (each coat in the
     trial piece, each piece on the trial coat), then the big ones a tap away */
  const big = tryPose(look, dress);
  const near = [...SKINS.map((sk) => tryPose(sk.id, dress)), ...offered.map((a) => tryPose(look, a.id))].filter((p) => p !== big);
  const birds = useBirdImageRefs(presented ? [big, ...SKINS.map((sk) => tryTilePose(sk.id, dress)), ...offered.map((a) => tryTilePose(look, a.id)), ...near] : []);
  // while a new picture is being captured the last one in its place stays, rather than an empty frame
  const last = useRef<Record<string, ImageRefRecord>>({});
  const held = (slot: string, ref: ImageRefRecord | undefined): ImageRefRecord | null => {
    if (ref) last.current[slot] = ref;
    return last.current[slot] ?? null;
  };

  return (
    <Host
      ignoreSafeArea="all"
      colorScheme={dark ? "dark" : "light"}
      onLayoutContent={onLayoutContent}
      style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1 }}
    >
      <KWardrobeSheetView
        theme={theme}
        presented={presented}
        strings={{
          head: t("ob2.slip.head", { name }),
          line: t("ob2.slip.line"),
          close: t("ob2.slip.close"),
          keep: t("ob2.slip.keep"),
          looksLabel: t("wren.looks"),
          looksCount: `${looksOwned}/${SKINS.length}`,
          dressLabel: t("wren.dress"),
          dressCount: `${piecesOwned}/${pieces.length}`,
        }}
        bird={held("big", birds[big])}
        near={near.flatMap((p) => (birds[p] ? [birds[p]] : []))}
        looks={SKINS.map((sk) => {
          const unlocked = skinUnlocked(sk.id, EMPTY_STATS, premium, hatch);
          return {
            id: sk.id,
            label: skinName(sk.id),
            lock: unlocked ? "" : sk.lock === "plus" ? t("wren.lock.plus") : t("wren.lock.kindred"),
            hint: "",
            on: look === sk.id,
            bird: held(`look:${sk.id}`, birds[tryTilePose(sk.id, dress)]),
          };
        })}
        dress={offered.map((a) => {
          const unlocked = a.free || premium;
          return {
            id: a.id,
            label: t(`ws.acc.${a.id}`),
            lock: unlocked ? "" : t("wren.lock.plus"),
            hint: "",
            on: dress === a.id,
            bird: held(`dress:${a.id}`, birds[tryTilePose(look, a.id)]),
          };
        })}
        onLook={(id) => onLook(id as WrenSkin)}
        onDress={(id) => onDress(id as WrenAccessory)}
        onKeep={onKeep}
        onClose={onClose}
        onGone={onGone}
      />
    </Host>
  );
}
