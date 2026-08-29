import type { DimScore, DimKey } from "./hatch-engine";

/* WHAT HATCHED IS SHAPED BY WHAT YOU FED IT.
   ────────────────────────────────────────────────────────────────────────
   The hatchling used to be one drawing for everybody, with a gifted
   accessory bolted on from a four-bucket classifier (`wren-type.ts`) that
   read two signals and never explained itself. Two problems: every reader's
   bird was the same bird, and the one thing that did differ — a pair of
   headphones — arrived with no reason attached.

   So the BODY carries the read instead. Seven of the nine dimensions the
   engine already scores move a part of her, continuously: two readers a few
   points apart hatch birds a few points apart, and no two corpora produce
   the same chick. Nothing is selected from a table; there are no types.

   Every mapping has to survive being said out loud — "short sentences, so
   she's compact" is a sentence a person would accept. `structure` and
   `function` are deliberately NOT mapped: the honest correspondence for
   them is nothing, and a forced one would turn the whole scheme from
   "your writing grew this" into a random generator wearing an explanation.
   They still surface in the nine-dimension aura, where they belong.

   Amplitudes are small on purpose (±12–18%). The point is that yours is
   recognisably yours, not that it is a caricature. */

export interface HatchlingForm {
  bodyStretch: number; // 1 = the base circle · >1 taller, <1 wider
  crestLift: number; // px the tuft's tip rises
  eyeScale: number; // multiplier on eye radius
  eyeSpread: number; // px each eye moves out from centre
  cheek: number; // 0 = no blush · 1 = the base blush · >1 warmer
  beakScale: number; // multiplier on the beak
  tail: boolean; // the one extra feather a distinctive hand earns
}

export const NEUTRAL: HatchlingForm = {
  bodyStretch: 1,
  crestLift: 0,
  eyeScale: 1,
  eyeSpread: 0,
  cheek: 1,
  beakScale: 1,
  tail: false,
};

/* THE SCORES ARE NOT CENTRED ON 50. Measured across real hatch corpora the
   nine dimensions cluster around the low forties — a chick centred on 50
   would put almost every reader on the same side of every axis, which is
   precisely the sameness this exists to remove. So the centre is the one the
   engine actually produces, and the half-range is narrow enough that a
   typical corpus reaches most of the amplitude rather than a sliver of it. */
const CENTRE = 45;
const HALF = 28;

const axis = (dims: DimScore[], key: DimKey): number => {
  const d = dims.find((x) => x.key === key);
  if (!d) return 0;
  return Math.max(-1, Math.min(1, (d.score - CENTRE) / HALF));
};

export function hatchlingForm(dims: DimScore[] | null | undefined): HatchlingForm {
  if (!dims || !dims.length) return NEUTRAL;

  const sentence = axis(dims, "sentence"); // short ↔ long
  const emotion = axis(dims, "emotion"); // implicit ↔ explicit
  const perspective = axis(dims, "perspective"); // outward ↔ inward
  const punctuation = axis(dims, "punctuation"); // sparse ↔ expressive
  const vocabulary = axis(dims, "vocabulary"); // plain ↔ ornate
  const quirks = axis(dims, "quirks"); // conventional ↔ distinctive
  /* rhythm needs several sentences before it can say anything, and the hatch
     corpus is a handful of short thoughts — it reads near-constant here. So
     it drives the one BINARY part rather than a continuous one: a hand bursty
     enough to move it at all has earned the extra feather. */
  const rhythm = axis(dims, "rhythm");
  return {
    // long sentences read as a bird with more length to her
    bodyStretch: 1 + sentence * 0.14,
    // a distinctive hand wears its tuft up
    crestLift: quirks * 10,
    // feeling on the surface widens the eyes; kept under the skull
    eyeScale: 1 + emotion * 0.18,
    // looking outward opens the face; looking inward draws it together
    eyeSpread: -perspective * 5,
    // exclamation marks and dashes put colour in the cheeks
    cheek: Math.max(0, 1 + punctuation * 0.9),
    // the beak is the instrument that picks the words
    beakScale: 1 + vocabulary * 0.16,
    // the one binary part, for the one signal that arrives binary
    tail: rhythm > 0.25,
  };
}

/* ── remembering her ──────────────────────────────────────────────────
   The form is derived from the hatch corpus, which the app does not keep,
   so it is stored once at the hatch and read everywhere she appears. A
   reader who hatched a compact, wide-eyed chick should meet the same chick
   in her room tomorrow. */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const KEY = "kindredly_hatchling_form";

export async function saveHatchlingForm(f: HatchlingForm): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    /* best-effort — she falls back to the neutral chick */
  }
}

export async function getHatchlingForm(): Promise<HatchlingForm> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...NEUTRAL, ...(JSON.parse(raw) as Partial<HatchlingForm>) } : NEUTRAL;
  } catch {
    return NEUTRAL;
  }
}

/** her proportions, for any screen that draws her at the hatch stage */
export function useHatchlingForm(): HatchlingForm {
  const [f, setF] = useState<HatchlingForm>(NEUTRAL);
  useEffect(() => {
    let alive = true;
    void getHatchlingForm().then((v) => alive && setF(v));
    return () => {
      alive = false;
    };
  }, []);
  return f;
}
