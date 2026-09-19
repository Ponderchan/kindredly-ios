import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

/* THE SETTINGS ROWS' MARKS — one small stroke glyph per row, on a tinted
   tile, so a list of eighteen mono labels reads as places rather than a
   ledger. Drawn on the 24-grid like the aura room's share and grid marks;
   tinted by the caller (ink for most, red for the two exits). */

export type SettingsGlyph =
  | "pen" | "cake" | "globe" | "bird" | "bell" | "heart" | "draft" | "ticket" | "restore" | "card"
  | "help" | "mail" | "star" | "shield" | "doc" | "lock" | "door" | "trash";

export function SettingsIcon({ glyph, color = "#3A34D6", tile = "#EEEDFB" }: { glyph: SettingsGlyph; color?: string; tile?: string }) {
  return (
    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: tile, alignItems: "center", justifyContent: "center" }}>
      <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        {glyph === "pen" && <Path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM13 7l3 3" />}
        {glyph === "cake" && <><Path d="M4 20h16M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6M8 12V9M12 12V8M16 12V9" /><Path d="M12 5.5c0-1 1-2 1-2s1 1 1 2a1 1 0 0 1-2 0z" fill={color} /></>}
        {glyph === "globe" && <><Circle cx={12} cy={12} r={8.5} /><Path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" /></>}
        {glyph === "bird" && <><Path d="M4 13c2-6 9-8 12-6l4-1-2 3c1 4-2 8-8 8H6l2-2c-2-1-3-2-4-2z" /><Circle cx={13.5} cy={9.5} r={0.9} fill={color} /></>}
        {glyph === "bell" && <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />}
        {glyph === "heart" && <Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />}
        {glyph === "draft" && <><Path d="M6 3h8l4 4v14H6z" /><Path d="M14 3v4h4M9 12h6M9 16h4" /></>}
        {glyph === "ticket" && <><Path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" /><Path d="M12 6v12" strokeDasharray="2 2" /></>}
        {glyph === "restore" && <Path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5" />}
        {glyph === "card" && <><Rect x={3} y={6} width={18} height={12} rx={2} /><Path d="M3 10h18" /></>}
        {glyph === "help" && <><Circle cx={12} cy={12} r={8.5} /><Path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" /><Circle cx={12} cy={17} r={0.9} fill={color} /></>}
        {glyph === "mail" && <><Rect x={3} y={6} width={18} height={12} rx={2} /><Path d="M3 8l9 6 9-6" /></>}
        {glyph === "star" && <Path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9L3.5 9.7l5.9-.8z" />}
        {glyph === "shield" && <><Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><Path d="M8.5 8.5l7 7" /></>}
        {glyph === "doc" && <><Path d="M6 3h12v18H6z" /><Path d="M9 8h6M9 12h6M9 16h4" /></>}
        {glyph === "lock" && <><Rect x={5} y={10} width={14} height={10} rx={2} /><Path d="M8 10V7a4 4 0 0 1 8 0v3" /></>}
        {glyph === "door" && <Path d="M10 4H5v16h5M14 12h6M17 9l3 3-3 3" />}
        {glyph === "trash" && <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />}
      </Svg>
    </View>
  );
}
