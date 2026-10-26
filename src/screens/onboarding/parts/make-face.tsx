import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { t } from "../../../lib/i18n";
import type { MadeFaceState } from "../../../lib/make-face";
import { PFM } from "../../../theme/post";
import { OB } from "./tokens";
import "../../../data/strings-make-face";

/* SCREEN 5'S "＋ MAKE YOURS" CELL (the custom face, lib/make-face; owner 2026-10-26).
   ────────────────────────────────────────────────────────────────────────
   The first cell of the face grid, in both renderers (S05Face here, KObFaceScreen in Swift),
   only while lib/make-face useMakeFaceOn() says the door may show (the "makeface" switch and a
   binary with its page). A 62 circle on lav2 with a 2pt dashed pen-blue edge and a 24 ＋ in pen
   blue, and under it a mono 7.5 tag (strings-make-face): MAKE YOURS · FREE while the free face is
   unused, 1ST CLASS once it is, YOURS with the face shown in the circle once one is worn. A tap
   opens the flow (makeFaceHref("onboarding", { dob })); the face it made is picked like any
   library face, its "made-<uuid>" id kept as the avatarId and saved with the rest of the profile.
   Picking a library face or "Later" calls setMadeFaceWorn(null), and never spends the free one. */

const PEN = "#3A3AF5";
const GROUND = "#EEEDFB";
export const MAKE_FACE_D = 62;

/** The cell's mono tag for a state, already in the reader's language. */
export function makeFaceLabel(state: MadeFaceState): string {
  return state === "yours" ? t("mf.tag.yours") : state === "used" ? t("mf.tag.first") : t("mf.tag.makeFree");
}

/** The ＋ in pen blue, 24 across. */
function Plus() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M12 5v14 M5 12h14" stroke={PEN} strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function MakeFaceCell({
  state,
  image,
  selected,
  width,
  onPress,
}: {
  state: MadeFaceState;
  image: string | null;
  selected: boolean;
  /** the grid's cell width */
  width: number;
  onPress: () => void;
}) {
  const label = makeFaceLabel(state);
  const yours = state === "yours" && !!image;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={yours ? t("mf.result.a11y") : t("mf.entry.a11y")}
      accessibilityValue={{ text: label }}
      accessibilityState={{ selected }}
      style={{ width, minHeight: Math.max(width, 84), alignItems: "center", justifyContent: "center" }}
    >
      <View
        style={{
          width: MAKE_FACE_D + 12,
          height: MAKE_FACE_D + 12,
          borderRadius: (MAKE_FACE_D + 12) / 2,
          borderWidth: selected ? 2 : 0,
          borderColor: OB.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: MAKE_FACE_D + 8, height: MAKE_FACE_D + 8, borderRadius: (MAKE_FACE_D + 8) / 2, borderWidth: selected ? 4 : 0, borderColor: OB.acid, alignItems: "center", justifyContent: "center" }}>
          {yours ? (
            <Image source={{ uri: image }} style={{ width: MAKE_FACE_D, height: MAKE_FACE_D, borderRadius: MAKE_FACE_D / 2, backgroundColor: GROUND }} contentFit="cover" />
          ) : (
            <View style={{ width: MAKE_FACE_D, height: MAKE_FACE_D, borderRadius: MAKE_FACE_D / 2, backgroundColor: GROUND, borderWidth: 2, borderStyle: "dashed", borderColor: PEN, alignItems: "center", justifyContent: "center" }}>
              <Plus />
            </View>
          )}
        </View>
      </View>
      <Text maxFontSizeMultiplier={1} numberOfLines={2} style={{ ...PFM.monoSemi, fontSize: 7.5, letterSpacing: 0.75, color: PEN, textAlign: "center", marginTop: -2, maxWidth: width - 4 }}>
        {label}
      </Text>
    </Pressable>
  );
}
