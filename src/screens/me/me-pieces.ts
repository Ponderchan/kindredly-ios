import { useEffect, useRef, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui/src/available";
import type { KAuraArtData, KCourierCardData } from "../../../modules/kindredly-ui/src/MePieces";
import { armNative, clearNative, disarmNative, useNativeSurface } from "../../lib/surfaces";
import { useBirdImageRefs } from "../../lib/bird-images";
import { useAssetImageRef, type ImageRefRecord } from "../../lib/images";
import { t, useLang } from "../../lib/i18n";
import { agoLabel } from "../../lib/flight-log";
import { WHEREABOUTS_META } from "../../lib/whereabouts";
import { useTheme } from "../../lib/theme";
import { AURA_SCENES, AURA_SKETCHES } from "../../data/aura-scenes";
import { AURA_ART_HAS } from "../../components/AuraCard";
import { courierCardModel, daylight, type CourierCardModel } from "../../components/courier-card-model";
import { auraArtPlan, nativeDeskPaint, scenePalette, type AuraArtPlan } from "../../components/aura-art-model";
import { auraSlotPalette, type AuraCardVM, type SlotTokens } from "./me-model";
import type { MeCourier } from "./useMeModel";

/* TWO PIECES OF ME IN SWIFTUI (2026-10-27): the courier's card and the Aura card's picture, which
   are React Native islands inside the Swift Me tab (MeNative) and the Swift aura room (AuraNative).
   With a piece's switch on (lib/surfaces "couriercard", "auraart"; off by default) and the
   binary carrying it, the host hands Swift the piece's record (KMeView courierCard / auraArt,
   KAuraRoomView auraArt) and leaves the island empty; Swift draws the piece itself
   (modules/kindredly-ui Portable/Me/KCourierCard.swift, KAuraArt.swift). Off, the record is null
   and the island is drawn exactly as before.

   - THE GATE (useSwiftPiece): the switch (useNativeSurface: NATIVE_DEFAULTS, the table, the dev
     override, the crash strikes), the binary's marker view for the piece (KCourierCardView,
     KAuraArtView: a binary without them would ignore the record and leave an empty frame), and
     the crash breadcrumb: the first time a piece shows in a process its mark is written
     (armNative) BEFORE Swift is told to draw it, so a crash in its first frames is counted
     against the piece (two in a row send it back to React Native), and it is cleared once the
     piece has stood 3 s on show (or 1 s after it goes, or when the app leaves the front). Until
     the mark lands (milliseconds) the island draws. A mark written for a piece that then never
     showed is taken back (disarmNative), as NativeSurface does.
   - THE RECORDS: the same words, colours and choices as the React Native pieces, from the pure
     models both renderers read (components/courier-card-model, aura-art-model); her picture is
     her snapshot (lib/bird-images card-*), the fifty pictures their bundled files. */

/* batch 3 (2026-11-09): the same gate for two pieces drawn inside other Swift pages — the revealed
   chat header (KConversationView, "chatheader") and the crossing in the reader (KLetterReaderView,
   "inflight") — each with its marker view (modules/kindredly-ui/src/FourPieces.tsx) */
export type MePieceKey = "couriercard" | "auraart" | "chatheader" | "inflight" | "freeflight"; // Free Flight (app/courier) uses this gate too
const PIECE_VIEW: Record<MePieceKey, string> = {
  couriercard: "KCourierCardView",
  auraart: "KAuraArtView",
  chatheader: "KChatHeaderView",
  inflight: "KLetterInFlightView",
  freeflight: "KFreeFlightView",
};

/* ── the gate ──────────────────────────────────────────────────────────── */

/* the breadcrumb's clocks, NativeSurface's */
const STAND_MS = 3000;
const GONE_MS = 1000;

/* per piece, in this process: its mark on the way to the disk, on it, or cleared (it stood) */
type Arming = "arming" | "armed" | "stood";
const arming = new Map<MePieceKey, Arming>();
let armingVersion = 0;
const armingListeners = new Set<() => void>();
const armingChanged = () => {
  armingVersion++;
  armingListeners.forEach((l) => l());
};
const subscribeArming = (l: () => void) => {
  armingListeners.add(l);
  return () => {
    armingListeners.delete(l);
  };
};
const readArming = () => armingVersion;

function stand(key: MePieceKey): void {
  if (arming.get(key) !== "armed") return;
  arming.set(key, "stood");
  clearNative(key);
  armingChanged();
}

/** true = Swift draws this piece now (see THE GATE). `showing`: the piece is on screen. */
export function useSwiftPiece(key: MePieceKey, showing: boolean): boolean {
  const on = useNativeSurface(key) && isKindredlyUIViewAvailable(PIECE_VIEW[key]);
  useSyncExternalStore(subscribeArming, readArming, readArming);
  const state = arming.get(key);
  // still wanted when the mark lands: mounted, on and on show (read then, not when it was asked)
  const wanted = useRef(false);
  wanted.current = on && showing;
  useEffect(
    () => () => {
      wanted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!on || !showing) return;
    const s = arming.get(key);
    if (s === undefined) {
      // first show in this process: the mark first, then Swift
      arming.set(key, "arming");
      armNative(key)
        .catch((e) => console.log(`[me-pieces] arming ${key} failed, drawing it anyway:`, e))
        .then(() => {
          if (arming.get(key) !== "arming") return;
          if (wanted.current) {
            arming.set(key, "armed");
          } else {
            // gone before it could show: no strike, no forgiveness
            arming.delete(key);
            disarmNative(key);
          }
          armingChanged();
        });
      return;
    }
    if (s === "armed") {
      const timer = setTimeout(() => stand(key), STAND_MS);
      const sub = AppState.addEventListener("change", (a) => {
        if (a !== "active") stand(key);
      });
      return () => {
        clearTimeout(timer);
        sub.remove();
        setTimeout(() => stand(key), GONE_MS);
      };
    }
  }, [on, showing, key, state]);

  return on && (state === "armed" || state === "stood");
}

/** The same value back while its content is the same (JSON), so a rebuilt but unchanged record
    keeps its identity and isn't re-sent to Swift. */
function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

/* ── the courier's card ────────────────────────────────────────────────── */

/**
 * The courier card for KMeView's `courierCard`, or null to keep the island. As MeNative's
 * CourierCard draws it: framed, her day off the game's cover (it opens the game), the hour the
 * phone's clock, the diary line the Me model's entry.
 * @param showing the Courier card is the segment on show
 * @param live the loops may run (the tab is focused)
 */
export function useCourierCardData(courier: MeCourier, { showing, live }: { showing: boolean; live: boolean }): KCourierCardData | null {
  const on = useSwiftPiece("couriercard", showing);
  useLang(); // the words are the reader's language's: re-written when it changes
  const model = on ? courierModelOf(courier) : null;
  // her picture is captured only while the card is on show; while a new face is being captured
  // (she took off, she got hungry) the last one stays, rather than the card going empty
  const birds = useBirdImageRefs(model && showing ? [model.pose] : [], { wilt: !!model?.wilt });
  const lastBird = useRef<ImageRefRecord | null>(null);
  const bird = model ? (birds[model.pose] ?? lastBird.current) : null;
  if (bird) lastBird.current = bird;
  return useSameContent(model ? courierCardData(model, bird, showing && live) : null);
}

/** The card's model for Me's courier, in the reader's language (the hour: the phone's clock,
    unless `hour` says otherwise). MeNative's CourierCard: her day off is the game's cover. */
export function courierModelOf(courier: MeCourier, hour?: number): CourierCardModel {
  return courierCardModel(
    {
      wren: courier.wren,
      state: courier.where.state,
      stage: courier.stage,
      stateMood: WHEREABOUTS_META[courier.where.state].mood,
      entry: courier.entry,
      hunger: courier.hunger,
      playing: courier.dayOff,
      best: courier.best,
      hour,
    },
    { t, ago: agoLabel },
  );
}

/** The Swift record for a card model and her picture. */
export function courierCardData(model: CourierCardModel, bird: ImageRefRecord | null, live: boolean): KCourierCardData {
  return {
    on: true,
    live,
    daylight: model.daylight,
    palette: model.palette,
    state: model.state,
    at: model.at,
    playing: model.playing,
    flying: model.flying,
    bird,
    chip: model.chip,
    you: model.you,
    somewhere: model.somewhere,
    dayOffTag: model.dayOffTag,
    name: model.name,
    time: model.time,
    line: model.line,
    aside: model.aside,
    cta: model.cta,
  };
}

/* ── the Aura card's picture ───────────────────────────────────────────── */

/**
 * The Aura card's picture for KMeView's and KAuraRoomView's `auraArt`, or null to keep the
 * island. As AuraArtSlot draws it: the title's picture fitted by height (laid in 6 on a dark
 * theme), else the desk at the rung's fidelity in the slot's palette, at this hour.
 * @param art the card's art (me-model buildAuraCard), null while there is no card
 * @param showing the card is on show
 */
export function useAuraArtData(art: AuraCardVM["art"] | null, showing: boolean): KAuraArtData | null {
  const on = useSwiftPiece("auraart", showing && !!art);
  const { t: tk, dark } = useTheme();
  const plan = on && art ? auraArtPlan(art, AURA_ART_HAS, dark) : null;
  const image = useAssetImageRef(auraPictureModule(plan));
  return useSameContent(plan && art ? auraArtData(art, plan, image, tk, dark) : null);
}

/** The bundled file of a plan's picture (null for the desk). */
export function auraPictureModule(plan: AuraArtPlan | null): number | null {
  return plan?.kind === "picture" ? ((plan.set === "scenes" ? AURA_SCENES : AURA_SKETCHES)[plan.id] ?? null) : null;
}

/** The Swift record for the card's art, its plan (auraArtPlan) and the picture's file, in the
    theme's slot palette, at this hour. */
export function auraArtData(art: AuraCardVM["art"], plan: AuraArtPlan, image: ImageRefRecord | null, tk: SlotTokens, dark: boolean): KAuraArtData {
  return {
    on: true,
    kind: plan.kind,
    image: plan.kind === "picture" ? image : null,
    inset: plan.kind === "picture" ? plan.inset : 0,
    // the strokes come with the ground: light ones on a dark slot (me-model auraSlotPalette)
    desk: nativeDeskPaint(art.fidelity, daylight(), scenePalette(auraSlotPalette(tk, dark))),
  };
}
