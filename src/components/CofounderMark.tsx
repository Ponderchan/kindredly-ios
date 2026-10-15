import { Text, View } from "react-native";
import { PF } from "../theme/post";
import { t, useLang } from "../lib/i18n";

/* THE MARK. A cofounder is not a receipt, they are a number — so the
   number is what appears, in gold, wherever the product says who you
   are. Deliberately absent from anything a STRANGER sees: the pool must
   stay a place where the only signal is how you write, and a gold chip
   on an anonymous letter would create a paying class inside it. So this
   shows on your own desk, on her, in your settings, and on the pages you
   choose to share — never on a letter to someone who hasn't met you.

   10a: the small mark is mono 600 at 9 (the owner's 9/10/11 rule lifts the
   old 8.5). The gold is an object's colour, the same on every light ground;
   on a dark one (the Me card in Midnight) the dark gold text would sit near
   3.6:1, so `onDark` sets it in a light gold (about 9:1) and keeps the
   outline. The caller says which: the paywall's ticket and her room's sky
   are not theme surfaces, so they keep the default. */

export const COFOUNDER_GOLD = "#C9A227";
/** the gold the number is set in on a light card (4.85:1 on white) */
export const COFOUNDER_INK = "#8A6E20";
/** …and on a dark one (Midnight's sf, about 9:1) */
export const COFOUNDER_INK_DARK = "#D9B95A";

export function CofounderMark({
  no,
  size = "sm",
  onDark = false,
}: {
  no: number | null;
  size?: "sm" | "lg";
  /** it sits on a dark ground (the theme's card in Midnight) */
  onDark?: boolean;
}) {
  useLang();
  if (no == null) return null;
  const lg = size === "lg";
  return (
    <View
      accessible
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: COFOUNDER_GOLD,
        paddingHorizontal: lg ? 10 : 7,
        paddingVertical: lg ? 5 : 3,
      }}
    >
      <View style={{ width: lg ? 7 : 5, height: lg ? 7 : 5, backgroundColor: COFOUNDER_GOLD }} />
      <Text
        style={{
          fontFamily: PF.monoSemi,
          fontSize: lg ? 10.5 : 9,
          letterSpacing: lg ? 1.6 : 1.2,
          color: onDark ? COFOUNDER_INK_DARK : COFOUNDER_INK,
        }}
      >
        {t("cf.no", { n: String(no).padStart(3, "0") })}
      </Text>
    </View>
  );
}
