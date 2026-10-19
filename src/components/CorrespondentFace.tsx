import { View } from "react-native";
import { useTheme } from "../lib/theme";
import { developFor } from "../lib/mosaic";
import { BRAND } from "../theme/themes";
import { AvatarImage } from "./AvatarImage";
import { MosaicId } from "./MosaicId";
import { StampAvatar, StampMosaic } from "./StampAvatar";

/* THE OTHER PERSON, AS FAR AS YOU KNOW THEM — one component, three screens.
   ────────────────────────────────────────────────────────────────────────
   The list, the orbit and the chat header each drew this themselves, with
   the develop maths copied three times, so the same person could drift out
   of sync between screens. Worse, two very different states looked
   identical: a face at five letters and a face after names were traded are
   both COMPLETE, and nothing but the presence of a name told them apart.

   So completion gets a mark of its own — a hairline frame, which is what
   this product uses for everything else that is finished. A quiet line for
   "this face is done", brass for "and they've already put their name in".

   develop runs on THEIR letters only. You come to know someone by reading
   them; how much you have written changes nothing about how clearly you
   see them (lib/mosaic developFor, which Swift's KMosaic reads too).

   10a (step 5):
   · on the theme — the frame is the theme's line, the brass is the brand's
     wax (KBrand brassSeal), the mosaic paints in the theme's ink (MosaicId);
   · a kindred is a ROUND face, a pen pal a square mosaic (owner 10-15): a
     revealed kindred who gave no face is drawn round too, with the
     stranger glyph, as their Kindreds row is (critic);
   · a null seed is NO ONE — a deleted account (0009) — and wears the veil,
     the same for every ghost because it claims nothing; never the hash of a
     placeholder like "anon", which dressed every ghost in one face. */

const SIZES = {
  sm: { cell: 2.8, gap: 0.9, avatar: 22, pad: 3, stamp: 18 }, // the orbit
  md: { cell: 4.4, gap: 1.2, avatar: 28, pad: 4, stamp: 28 }, // a list row
  lg: { cell: 5.5, gap: 1.5, avatar: 32, pad: 4, stamp: 36 }, // the chat header
} as const;

/* A MEMBER (C2, 2026-10-19): `denom` ("1ST" / "007") draws the face as a gold perforated stamp
   at the size's `stamp` side — a kindred's portrait or a pen pal's mosaic, square inside. The
   stamp replaces the line / brass signing frame (contract D-8): the signing state still shows in
   the header's own tone. A deleted account (no seed) is never stamped. */

export function CorrespondentFace({
  seed,
  theirs,
  revealed,
  otherFace,
  theirSigned,
  size = "md",
  denom,
}: {
  /** their user id; null (or "") for a deleted account, which draws the veil */
  seed: string | null | undefined;
  /** how many letters they have sent you */
  theirs: number;
  revealed: boolean;
  otherFace?: string | null;
  theirSigned?: boolean;
  /** I signed first: the face is done either way (a quiet frame), so it changes nothing drawn */
  iSigned?: boolean;
  size?: keyof typeof SIZES;
  /** a member's denomination ("" / undefined = not a member) */
  denom?: string | null;
}) {
  const { t: tk } = useTheme();
  const s = SIZES[size];

  // no one behind it: the veil, no frame (nothing about them is complete or waiting)
  if (!seed) return <MosaicId seed={null} cell={s.cell} gap={s.gap} />;

  if (denom) {
    return (
      <StampAvatar size={s.stamp} denom={denom}>
        {({ size: inner, radius }) =>
          revealed ? (
            <AvatarImage id={otherFace ?? null} seed={seed} size={inner} radius={radius ?? undefined} />
          ) : (
            <StampMosaic seed={seed} size={inner} develop={developFor(theirs)} base={s.stamp} cell={s.cell} gap={s.gap} />
          )
        }
      </StampAvatar>
    );
  }

  // a kindred: round — their portrait, or the stranger glyph when they gave none
  if (revealed) return <AvatarImage id={otherFace ?? null} seed={seed} size={s.avatar} />;

  const complete = theirs >= 5;
  // brass only for the state that is waiting on you; a quiet line for a face that is done
  const frame = !complete ? null : theirSigned ? BRAND.brassSeal : tk.line;

  const face = <MosaicId seed={seed} cell={s.cell} gap={s.gap} develop={developFor(theirs)} />;
  if (!frame) return face;
  return <View style={{ padding: s.pad, borderWidth: 1, borderColor: frame }}>{face}</View>;
}
