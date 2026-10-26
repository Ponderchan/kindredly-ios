import { useCallback, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import {
  KIntroRitualView,
  kIntroRitualHeight,
  type KIntroRitualFace,
  type KIntroRitualNotice,
  type KIntroRitualSide,
} from "../../modules/kindredly-ui";
import { NativeSurface, SurfaceHost } from "./NativeSurface";
import { IntroductionRitual, SIGNED_BEATS, SLOT_H, SLOT_W, fitPlan, monoEms } from "./IntroductionRitual";
import type { HoldAnchor } from "./SignatureHold";
import { useLetterFont, useTheme } from "../lib/theme";
import { faceRecord, useFaceSources, type FaceInput } from "../lib/faces";
import { useBirdImageRef } from "../lib/bird-images";
import { penTypedUpright, penViewBox } from "../lib/pen-signature";
import { stickerLook, stickerName } from "../lib/sticker-copy";
import { dShort, localeTag } from "../lib/format";
import { t } from "../lib/i18n";
import { MONO } from "../theme/post";
import type { ThreadMessage } from "../lib/db";
import type { KindredNotice } from "../lib/kindred-read";
import type { SignedPair, SignedSide } from "../lib/signed-sides";
import "../data/strings-step5-chat"; // in.meFallback

/* THE CEREMONY'S RITUAL, SWIFT OR REACT NATIVE (owner, 2026-10-26; ships in 1.0.7).
   ────────────────────────────────────────────────────────────────────────
   Introduction draws its ritual through this. With both sides signed
   (`signed`), and the "ceremony" switch on (lib/surfaces), and the binary
   carrying KIntroRitualView, the signed ritual is drawn by SwiftUI
   (modules/kindredly-ui KIntroRitual): the road, the two signed cards, the
   sealed envelopes over the windows lifting together, the frost wiped
   clear onto the faces sent, the courier names struck, the signatures
   drawn in with the pen names under them, the bump, KINDREDS · date, and
   what she noticed. Otherwise — the switch off, an older binary, a JS
   error on the Swift path, a crash there on the last two launches, or no
   signatures at all (the mosaic ritual) — it is IntroductionRitual,
   exactly as before.

   TypeScript keeps the logic and the clock: every word and date, the
   faces (lib/faces), the windows (FROST v1 from signed-sides), the stroke
   plans (fitPlan, the React Native ritual's own), the fitted courier size
   and the beats (SIGNED_BEATS). Swift draws them on one clock that starts
   when the sheet opened (`startAt`), so a Host that arrives a frame late
   doesn't push the end past Introduction's own `doneAt`.

   VoiceOver: the Introduction's container stays the one element that says
   the whole ritual and carries Report / Block; Swift also says
   `announce` once, when the ritual is done. Reduce Motion: `still`, the
   React Native ritual's cross-fade to the end state, done by 1600.

   A held signature (450ms, once `holdable`) comes back as the slot's rect
   in the ritual's own points; measured from the view holding the Host, it
   is the anchor SignatureHold drops its card under. */

type Props = {
  road: ThreadMessage[];
  otherSeed: string;
  otherFace?: string | null;
  otherName: string;
  mySeed: string;
  myFace?: string | null;
  myName: string;
  since: string;
  stamp?: string | null;
  notice?: KindredNotice | null;
  signed?: SignedPair | null;
  still?: boolean;
  holdable?: boolean;
  onHoldTheirs?: (anchor: HoldAnchor | null) => void;
  /** the whole ritual as one sentence, said by VoiceOver when it is done ("" for nothing) */
  announce?: string;
};

/** The introduction's ritual: the SwiftUI signed ritual where it can be, else React Native's. */
export function CeremonyRitual(props: Props) {
  // the moment the sheet opened: the Swift clock counts from here, as Introduction's doneAt does
  const [startAt] = useState(() => Date.now());
  const signed = props.signed;
  if (!signed) return <IntroductionRitual {...props} />;
  const height = kIntroRitualHeight(!!props.notice);
  return (
    <NativeSurface
      surface="ceremony"
      view="KIntroRitualView"
      mode="mount"
      native={() => <SwiftRitual {...props} signed={signed} startAt={startAt} height={height} />}
      fallback={() => <IntroductionRitual {...props} />}
      // the ritual's own height while the phone's answers are read: nothing below it moves
      pending={() => <View style={{ height }} />}
    />
  );
}

const face = (f: ReturnType<typeof faceRecord>): KIntroRitualFace => ({ kind: f.kind, uri: f.uri, key: f.key, overscan: f.overscan, mask: f.mask });

/* the courier name's mono size, fitted to the card's column as the React Native ritual fits it to its 136 */
const COLUMN = SLOT_W;
const courierSize = (text: string): number => Math.max(8, Math.min(MONO.title, COLUMN / monoEms(text, 0.6 / MONO.title)));

function sideRecord(s: SignedSide, name: string, f: ReturnType<typeof faceRecord>, ms: number): KIntroRitualSide {
  const courier = s.courier ? s.courier.toLocaleUpperCase(localeTag()) : "";
  const plan = s.sig ? fitPlan(s.sig, ms) : null;
  const vb = plan && s.sig ? penViewBox(s.sig, "ink", { aspect: SLOT_W / SLOT_H }) : { x: 0, y: 0, w: 0, h: 0 };
  return {
    courier,
    courierSize: courier ? courierSize(courier) : MONO.title,
    name,
    typedUpright: penTypedUpright(name),
    face: face(f),
    frost: s.frost,
    strokes: plan ? plan.map((st) => ({ d: st.d, delay: st.delay, duration: st.duration })) : [],
    vbX: vb.x,
    vbY: vb.y,
    vbW: vb.w,
    vbH: vb.h,
  };
}

const deg = (tilt: string): number => {
  const n = parseFloat(tilt);
  return Number.isFinite(n) ? n : 0;
};

const NO_NOTICE: KIntroRitualNotice = { show: false, name: "", bg: "#FFFFFF", fg: "#1E1B35", border: "#FFFFFF", radius: 8, tilt: 0, slapTilt: 2, shared: false };

function SwiftRitual({ road, since, stamp, notice, signed, still = false, holdable = false, onHoldTheirs, announce = "", startAt, height }: Props & { signed: SignedPair; startAt: number; height: number }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const bird = useBirdImageRef("fly");
  // the faces each of them SENT (or the glyph), drawn as a kindred's: what AvatarImage shows in React Native
  const inputs = useMemo<Record<"mine" | "theirs", FaceInput>>(
    () => ({
      mine: { role: "kindred", seed: signed.mine.seed, avatarId: signed.mine.face },
      theirs: { role: "kindred", seed: signed.theirs.seed, avatarId: signed.theirs.face },
    }),
    [signed.mine.seed, signed.mine.face, signed.theirs.seed, signed.theirs.face],
  );
  const faces = useFaceSources(inputs);
  const mine = useMemo(
    () => sideRecord(signed.mine, signed.mine.name || t("in.meFallback"), faceRecord(faces.mine), SIGNED_BEATS.signMineMs),
    [signed.mine, faces.mine],
  );
  const theirs = useMemo(() => sideRecord(signed.theirs, signed.theirs.name, faceRecord(faces.theirs), SIGNED_BEATS.signTheirsMs), [signed.theirs, faces.theirs]);
  const crossings = useMemo(() => road.map((m) => ({ mine: m.mine, date: m.date ? dShort(m.date).toUpperCase() : "—" })), [road]);
  const sticker = useMemo<KIntroRitualNotice>(() => {
    if (!notice) return NO_NOTICE;
    const look = stickerLook(notice.stickerId, 1);
    return { show: true, name: stickerName(notice.stickerId), bg: look.bg, fg: look.fg, border: look.border, radius: look.radius, tilt: deg(look.tilt), slapTilt: notice.shared ? -2 : 2, shared: notice.shared };
  }, [notice]);

  // the held slot, measured from the view holding the Host: SignatureHold's anchor
  const wrap = useRef<View>(null);
  const onRitualHold = useCallback(
    (r: { x: number; y: number; width: number; height: number }) => {
      if (!onHoldTheirs) return;
      const anchor: HoldAnchor = {
        measureInWindow: (cb) => {
          const v = wrap.current;
          if (!v) return cb(NaN, NaN, r.width, r.height);
          v.measureInWindow((x, y) => cb(x + r.x, y + r.y, r.width, r.height));
        },
      };
      onHoldTheirs(anchor);
    },
    [onHoldTheirs],
  );

  return (
    <View ref={wrap} collapsable={false} style={{ height, alignSelf: "stretch" }}>
      <SurfaceHost style={{ flex: 0, height, alignSelf: "stretch" }}>
        <KIntroRitualView
          theme={theme}
          letterFont={letterFont}
          startAt={startAt}
          still={still}
          holdable={holdable && !!onHoldTheirs}
          beats={SIGNED_BEATS}
          road={crossings}
          youLabel={t("ui.you").toUpperCase()}
          themLabel={t("in.them").toUpperCase()}
          roadLine={t("in.road", { n: road.length })}
          stamp={stamp ?? ""}
          bird={bird}
          mine={mine}
          theirs={theirs}
          chip={t("in.sinceChip", { date: dShort(since).toUpperCase() })}
          notice={sticker}
          a11y={announce}
          announce={announce}
          onRitualHold={onRitualHold}
        />
      </SurfaceHost>
    </View>
  );
}
