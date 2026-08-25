import { Text, View } from "react-native";
import { PF } from "../theme/post";

/* THE MARK. A cofounder is not a receipt, they are a number — so the
   number is what appears, in gold, wherever the product says who you
   are. Deliberately absent from anything a STRANGER sees: the pool must
   stay a place where the only signal is how you write, and a gold chip
   on an anonymous letter would create a paying class inside it. So this
   shows on your own desk, on her, in your settings, and on the pages you
   choose to share — never on a letter to someone who hasn't met you. */

export const COFOUNDER_GOLD = "#C9A227";

export function CofounderMark({ no, size = "sm" }: { no: number | null; size?: "sm" | "lg" }) {
  if (no == null) return null;
  const lg = size === "lg";
  return (
    <View
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
          fontSize: lg ? 10.5 : 8.5,
          letterSpacing: lg ? 1.6 : 1.2,
          color: "#8A6E20",
        }}
      >
        COFOUNDER No. {String(no).padStart(3, "0")}
      </Text>
    </View>
  );
}
