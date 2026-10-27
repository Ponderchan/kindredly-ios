import { useCallback, useMemo, useRef } from "react";
import { View, type AccessibilityActionEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KIntroductionView } from "../../modules/kindredly-ui";
import type { KIntroMosaic } from "../../modules/kindredly-ui/src/Introduction";
import type { KIntroRitualSide } from "../../modules/kindredly-ui/src/IntroRitual";
import { SurfaceHost } from "./NativeSurface";
import { SIGNED_BEATS } from "./IntroductionRitual";
import { face, noticeRecord, roadCrossings, sideRecord } from "./IntroductionRitualNative";
import { useIntroduction, type IntroductionProps } from "./useIntroduction";
import {
  BURST_MS,
  TYPE_CARET_AFTER,
  TYPE_JOLT_AFTER,
  TYPE_LEAD,
  TYPE_STEP,
  T_BUMP,
  T_BURST,
  T_FLY,
  T_NAME,
  T_NOTICE,
  T_RITUAL_DONE,
  T_ROAD,
  T_SLAP,
  T_STEP,
  burstScraps,
  mosaicRitualEnd,
  typedSteps,
} from "./introduction-model";
import type { HoldAnchor } from "./SignatureHold";
import { useLetterFont, useTheme } from "../lib/theme";
import { faceRecord, useFaceSources, type FaceInput } from "../lib/faces";
import { useBirdImageRef } from "../lib/bird-images";
import { mosaicMask } from "../lib/mosaic";
import { t, useLang } from "../lib/i18n";
import "../data/strings-step5-chat"; // in.meFallback

/* WREN'S INTRODUCTION IN SWIFTUI (2026-10-27, behind "introritual", OFF by default).
   ────────────────────────────────────────────────────────────────────────
   The body of the introduction's page sheet when Introduction picks Swift
   (NativeSurface, mount mode, chosen as the sheet opens): one SurfaceHost
   filling the sheet, holding KIntroductionView. React Native's sheet
   (Introduction.tsx IntroductionRN) is the fallback.

   TypeScript keeps the logic and the clock, through useIntroduction (the
   same hook React Native's body uses): every word (introduction-model),
   Reduce Motion, when the ritual is done, the hold and its Report / Block
   card. Here it only builds what Swift draws:
     · the mosaic ritual — its clock (introduction-model, React Native's own
       numbers), their scraps (burstScraps), the name's typed steps, both
       FACE v1 masks and the two faces from the bump on (lib/faces, as
       kindreds: what AvatarImage shows);
     · the signed ritual — the ceremony's own records (sideRecord, the
       stroke plans, SIGNED_BEATS), exactly what CeremonyRitual sends;
     · her picture over the letter and the courier on the road, from her
       snapshots (bird-images intro44, introCourier26; the signed road keeps
       the ceremony's "fly"), never redrawn.
   Swift counts every beat from `startAt` (the moment the sheet opened).

   A held signature comes back as its slot in the sheet's points; measured
   from the view holding the Host it is SignatureHold's anchor, and the card
   (a React Native Modal) drops under it. VoiceOver's report / block on the
   ritual go to the same hold. */

const EMPTY_FACE = { kind: "placeholder", uri: "", key: "", overscan: 0, mask: 0 } as const;
const EMPTY_SIDE: KIntroRitualSide = { courier: "", courierSize: 11, name: "", typedUpright: false, face: EMPTY_FACE, frost: null, strokes: [], vbX: 0, vbY: 0, vbW: 0, vbH: 0 };
const EMPTY_MOSAIC: KIntroMosaic = {
  beats: { road: T_ROAD, step: T_STEP, fly: T_FLY, burst: T_BURST, burstMs: BURST_MS, slap: T_SLAP, name: T_NAME, typeLead: TYPE_LEAD, typeStep: TYPE_STEP, joltAfter: TYPE_JOLT_AFTER, caretAfter: TYPE_CARET_AFTER, bump: T_BUMP, notice: T_NOTICE, done: T_RITUAL_DONE, end: T_RITUAL_DONE },
  nameSteps: [],
  scraps: [],
  myMask: 0,
  theirMask: 0,
  myFace: EMPTY_FACE,
  theirFace: EMPTY_FACE,
  myName: "",
  otherName: "",
};

/** The introduction sheet's body in SwiftUI. Only inside the introduction's Modal, on NativeSurface's Swift path. */
export function IntroductionSwift(props: IntroductionProps & { startAt: number }) {
  useLang();
  const { otherSeed, otherFace = null, otherName, myName, road = [], mySeed = "me", myFace = null, notice = null, stamp = null, signed = null, onClose, onTalk, startAt } = props;
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useSafeAreaInsets();
  const { still, doneAt, hold, holdable, words } = useIntroduction(props);
  const wren = useBirdImageRef("intro44");
  const fly = useBirdImageRef("fly");
  const courier26 = useBirdImageRef("introCourier26");

  // the faces: what each SENT when signed (the ceremony's), else the faces the mosaic ritual bumps into
  const inputs = useMemo<Record<"mine" | "theirs", FaceInput>>(
    () =>
      signed
        ? {
            mine: { role: "kindred", seed: signed.mine.seed, avatarId: signed.mine.face },
            theirs: { role: "kindred", seed: signed.theirs.seed, avatarId: signed.theirs.face },
          }
        : {
            mine: { role: "kindred", seed: mySeed, avatarId: myFace },
            theirs: { role: "kindred", seed: otherSeed, avatarId: otherFace },
          },
    [signed, mySeed, myFace, otherSeed, otherFace],
  );
  const faces = useFaceSources(inputs);

  const mine = useMemo(
    () => (signed ? sideRecord(signed.mine, signed.mine.name || t("in.meFallback"), faceRecord(faces.mine), SIGNED_BEATS.signMineMs) : EMPTY_SIDE),
    [signed, faces.mine],
  );
  const theirs = useMemo(() => (signed ? sideRecord(signed.theirs, signed.theirs.name, faceRecord(faces.theirs), SIGNED_BEATS.signTheirsMs) : EMPTY_SIDE), [signed, faces.theirs]);
  const mosaic = useMemo<KIntroMosaic>(() => {
    if (signed) return EMPTY_MOSAIC;
    const name = otherName.toUpperCase();
    return {
      beats: { ...EMPTY_MOSAIC.beats, end: mosaicRitualEnd(name.length) },
      nameSteps: typedSteps(name),
      scraps: burstScraps(otherSeed).map((s) => ({ x0: s.x0, y0: s.y0, ang: s.ang, dist: s.dist, spin: s.spin })),
      myMask: mosaicMask(mySeed, 1),
      theirMask: mosaicMask(otherSeed, 1),
      myFace: face(faceRecord(faces.mine)),
      theirFace: face(faceRecord(faces.theirs)),
      // the reader without a pen name is a lower-case "you" in their language, as React Native's
      myName: myName || t("in.meFallback"),
      otherName,
    };
    // words follow the language: t() reads it fresh, and useLang re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signed, otherName, otherSeed, mySeed, myName, faces.mine, faces.theirs]);
  const crossings = useMemo(() => roadCrossings(road), [road]);
  const sticker = useMemo(() => noticeRecord(notice), [notice]);

  // the held slot, measured from the view holding the Host: SignatureHold's anchor
  const wrap = useRef<View>(null);
  const holdOpen = hold.open;
  const onHold = useCallback(
    (r: { x: number; y: number; width: number; height: number }) => {
      const anchor: HoldAnchor = {
        measureInWindow: (cb) => {
          const v = wrap.current;
          if (!v) return cb(NaN, NaN, r.width, r.height);
          v.measureInWindow((x, y) => cb(x + r.x, y + r.y, r.width, r.height));
        },
      };
      holdOpen(anchor);
    },
    [holdOpen],
  );
  const holdAction = hold.onAction;
  const onAction = useCallback((name: "report" | "block") => holdAction({ nativeEvent: { actionName: name } } as AccessibilityActionEvent), [holdAction]);
  // VoiceOver's two choices, by the names useSignatureHold gives them, only once holdable
  const actions = holdable ? hold.actions : undefined;
  const reportLabel = actions?.find((a) => a.name === "report")?.label ?? "";
  const blockLabel = actions?.find((a) => a.name === "block")?.label ?? "";

  return (
    <View style={{ flex: 1 }}>
      <View ref={wrap} collapsable={false} style={{ flex: 1 }}>
        <SurfaceHost>
          <KIntroductionView
            theme={theme}
            letterFont={letterFont}
            insets={{ top: 0, bottom: insets.bottom, tabBarRoom: 0 }}
            startAt={startAt}
            still={still}
            holdable={holdable}
            title={words.title}
            closeLabel={words.close}
            wren={wren}
            letter={words.body}
            kind={signed ? "signed" : "mosaic"}
            road={crossings}
            youLabel={t("ui.you").toUpperCase()}
            themLabel={t("in.them").toUpperCase()}
            roadLine={t("in.road", { n: road.length })}
            stamp={stamp ?? ""}
            courier={signed ? fly : courier26}
            chip={words.chip}
            notice={sticker}
            beats={SIGNED_BEATS}
            mine={mine}
            theirs={theirs}
            mosaic={mosaic}
            a11y={words.ritualA11y}
            announce={signed ? words.ritualA11y : ""}
            reportLabel={reportLabel}
            blockLabel={blockLabel}
            noticedHead={words.noticedHead}
            noticedLine={words.noticedLine}
            noticedAt={doneAt}
            knowYou={words.knowYou}
            talkTo={words.talkTo}
            onClose={onClose}
            onTalk={onTalk}
            onHold={signed ? onHold : undefined}
            onAction={onAction}
          />
        </SurfaceHost>
      </View>
      {/* Report this signature / Block, under their held signature — inside this sheet */}
      {signed ? hold.sheet : null}
    </View>
  );
}
