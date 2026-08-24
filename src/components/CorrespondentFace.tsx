import { View } from "react-native";
import { P } from "../theme/post";
import { AvatarImage } from "./AvatarImage";
import { MosaicId } from "./MosaicId";

/* THE OTHER PERSON, AS FAR AS YOU KNOW THEM — one component, three screens.
   ────────────────────────────────────────────────────────────────────────
   The list, the orbit and the chat header each drew this themselves, with
   the develop maths copied three times, so the same person could drift out
   of sync between screens. Worse, two very different states looked
   identical: a face at five letters and a face after names were traded are
   both COMPLETE, and nothing but the presence of a name told them apart.

   So completion gets a mark of its own — a hairline frame, which is what
   this product uses for everything else that is finished. Ink for "this
   face is done", brass for "and they've already put their name in".

   develop runs on THEIR letters only. You come to know someone by reading
   them; how much you have written changes nothing about how clearly you
   see them. */

const SIZES = {
  sm: { cell: 2.8, gap: 0.9, avatar: 22, pad: 3 }, // the orbit
  md: { cell: 4.4, gap: 1.2, avatar: 28, pad: 4 }, // a list row
  lg: { cell: 5.5, gap: 1.5, avatar: 32, pad: 4 }, // the chat header
} as const;

export function CorrespondentFace({
  seed,
  theirs,
  revealed,
  otherFace,
  theirSigned,
  iSigned,
  size = "md",
}: {
  seed: string;
  /** how many letters they have sent you */
  theirs: number;
  revealed: boolean;
  otherFace?: string | null;
  theirSigned?: boolean;
  iSigned?: boolean;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  const complete = revealed || theirs >= 5;
  // brass only for the state that is waiting on you
  const frame = !complete ? null : theirSigned && !revealed ? P.brassSeal : iSigned && !revealed ? P.ink12 : revealed ? null : P.ink12;

  const face =
    revealed && otherFace ? (
      <AvatarImage id={otherFace} seed={seed} size={s.avatar} />
    ) : (
      <MosaicId
        seed={seed}
        cell={s.cell}
        gap={s.gap}
        develop={revealed ? 1 : 0.15 + 0.85 * (Math.min(theirs, 5) / 5)}
      />
    );

  if (!frame) return face;
  return (
    <View style={{ padding: s.pad, borderWidth: 1, borderColor: frame }}>
      {face}
    </View>
  );
}
