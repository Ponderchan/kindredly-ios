import type { TextStyle, ViewStyle } from "react-native";
import { PF } from "../theme/post";
import { Y as Y_STATIC } from "../theme/y2k";
import { THEMES, THEME_KEYS, type ThemeKey, type ThemeTokens } from "../theme/themes";
import { useTheme } from "./theme";

/* EGG OS ON THE RUNTIME THEME (10a step 3). theme/y2k.ts is the console's
   skin as it was drawn: Y, a palette made of the static P, and the bevel,
   card, key, tag and mono pieces built from it. This is the same skin with
   every chrome colour taken from the theme in effect, so the onboarding
   moves over the way a P screen does with useP(): a component writes
   `const { Y, bevel, card, key, tag, mono } = useEggOS();` and its call
   sites stay as they were. The shapes and numbers are y2k's, unchanged.

   Each Y key goes to the 10a token that does its job:

     Y key        10a     why
     ground       lav2    the console's wash. Not bg: in Classic bg is white,
                          and the console is the pale accent wash it has
                          always been (#ECECFE → #EEEDFB), the same colour as
                          the splash, so the handoff from launch still holds
     groundDeep   lav     a step down from the ground, for the chip under a
                          headline and the page's ruled lines. lav2 → lav is
                          a step deeper in every theme
     ink          ink     type. Y.ink also drew every outline and hard
                          shadow; in 10a those are ln (below)
     panel        sf      the sticker panels' face
     blue         ind     the one actionable colour
     dim          sub     the console's secondary type. Y.dim was ink at .6,
                          P.ink60's weight, which useP also sends to sub
     faint        faint   placeholders, disabled and unlit (ink at .32)
     brass, warn, lcd     fixed: the hatch key's wax gold (BRAND.waxGold),
                          the postmark red of the age warning, and the
                          console screen, which nothing draws today

   and three keys the static Y never needed, because in it they were all
   the one near-black or the one white:
     ln        ln        outlines, the meter's frame, every hard shadow
     onFill    bg        type and marks on a blue or ink fill (10a's rule:
                         the page colour is the text colour on ink and ind)
     fixedInk  #1E1B35   type and marks on a fill that keeps its colour in
                         every theme — the brass key, the cream cue deck —
                         so they stay dark there when the theme's ink is
                         light

   The egg and hatchling art keep their own colours and still read the
   static Y; this skin is for the chrome around them.

   Built once per theme, so a screen gets the same object back until the
   theme changes. */

/** Classic's ink: type on a fill that doesn't change with the theme */
export const FIXED_INK = THEMES.classic.ink;

export type EggPalette = { readonly [K in keyof typeof Y_STATIC]: string } & {
  readonly ln: string;
  readonly onFill: string;
  readonly fixedInk: string;
};

export type EggSkin = {
  Y: EggPalette;
  /** the 10a tokens themselves, for the few roles Y has no key for */
  t: ThemeTokens;
  dark: boolean;
  bevel: (dx?: number, dy?: number) => ViewStyle;
  card: ViewStyle;
  key: ViewStyle;
  tag: ViewStyle;
  mono: (size?: number, weight?: "r" | "m" | "b") => TextStyle;
};

function skinFor(t: ThemeTokens): EggSkin {
  const Y: EggPalette = {
    ground: t.lav2,
    groundDeep: t.lav,
    ink: t.ink,
    panel: t.sf,
    blue: t.ind,
    brass: Y_STATIC.brass,
    lcd: Y_STATIC.lcd,
    dim: t.sub,
    faint: t.faint,
    warn: Y_STATIC.warn,
    ln: t.ln,
    onFill: t.bg,
    fixedInk: FIXED_INK,
  };

  /* a hard shadow, no blur, in the outline colour (10a: shadows use ln too) */
  const bevel = (dx = 4, dy = 4): ViewStyle => ({
    shadowColor: Y.ln,
    shadowOffset: { width: dx, height: dy },
    shadowOpacity: 1,
    shadowRadius: 0,
  });

  /** a sticker panel */
  const card: ViewStyle = {
    backgroundColor: Y.panel,
    borderWidth: 2,
    borderColor: Y.ln,
    borderRadius: 10,
  };

  /** the primary key */
  const key: ViewStyle = {
    backgroundColor: Y.blue,
    borderWidth: 2,
    borderColor: Y.ln,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  };

  /** a small stencilled tag */
  const tag: ViewStyle = {
    backgroundColor: Y.panel,
    borderWidth: 2,
    borderColor: Y.ln,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  };

  /** mono chrome type: everything the console says about itself */
  const mono = (size = 11, weight: "r" | "m" | "b" = "m"): TextStyle => ({
    fontFamily: weight === "b" ? PF.monoSemi : weight === "m" ? PF.monoMed : PF.mono,
    fontSize: size,
    letterSpacing: size <= 11 ? 1.4 : 0.8,
    color: Y.ink,
  });

  return { Y, t, dark: t.dark, bevel, card, key, tag, mono };
}

const SKIN_BY_THEME = Object.fromEntries(THEME_KEYS.map((k) => [k, skinFor(THEMES[k])])) as Record<ThemeKey, EggSkin>;

/** the Egg OS skin, coloured by the active theme — see above */
export function useEggOS(): EggSkin {
  return SKIN_BY_THEME[useTheme().key];
}
