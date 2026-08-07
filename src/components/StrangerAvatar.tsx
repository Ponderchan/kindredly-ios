import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { avatarFor } from "../lib/format";

/* Generative, faceless "seal" glyph avatar for strangers (before names are
   revealed). Deterministic from a seed (the correspondent's user id) — matches
   the web system.js glyph/palette scheme. */

export function StrangerAvatar({ seed, size = 40, round }: { seed: string; size?: number; round?: boolean }) {
  const { glyph, fg, bg } = avatarFor(seed || "anon");
  const xml = `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><g fill="${fg}" stroke="${fg}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: round ? size / 2 : Math.round(size * 0.3),
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <SvgXml xml={xml} width={size * 0.64} height={size * 0.64} />
    </View>
  );
}
