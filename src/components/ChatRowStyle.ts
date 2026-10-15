import { useTheme } from "../lib/theme";
import { THEMES, THEME_KEYS, type ThemeKey } from "../theme/themes";
import { rowStyleFor, type RowStyle } from "./10a/kit";

/* THE CHAT ROW (owner, 2026-10-11: "all 下面的那些 chats 做成 2a 一样的，不要区分
   wren"). One look for every row under ALL — Wren's, a kindred's, a pen
   pal's — taken from the prototype (design 2a): a 52pt round face, the name
   and the time on one line, two lines of their last words under it, a blue
   badge when it's on you, a hairline where the words are.

   10a (step 5): useRowStyle() below is the row on the theme. The owner
   keeps the sizes (52 face, gap 14, name 17/600, two-line 15/20 preview,
   badge 20) and the colours come from 10a: names ink, preview sub, the
   time always mute in mono 500 11 (blue is kept for the kindred number and
   YOUR TURN), the badge ind with the page colour on it, the hairline under
   the words in line (H:65), the disc soft2, and the 22pt inset of the mock
   (H:63-65). The recipe is rowStyleFor in components/10a/kit (pure, tested).

   The static ROW and row* exports below are the prototype's fixed colours,
   kept unchanged until their callers (the Kindreds list) move onto
   useRowStyle; nothing new should import them. */
export const ROW = {
  ink: "#1E1B35",
  muted: "#7A7694",
  time: "#8A86A3",
  line: "#EEEDF5",
  blue: "#3A34D6",
  palBg: "#F1F0F8",
  wrenBg: "#EEEDFB",
  face: 52,
  gap: 14,
  pad: 16,
} as const;

export const rowName = { fontSize: 17, fontWeight: "600" as const, color: ROW.ink };
export const rowTime = (on: boolean) => ({ fontSize: 13, color: on ? ROW.blue : ROW.time });
export const rowPreview = { fontSize: 15, lineHeight: 20, color: ROW.muted };
export const rowBadge = { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: ROW.blue, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 2 };
export const rowBadgeText = { fontSize: 12, fontWeight: "600" as const, color: "#FFFFFF" };

export type { RowStyle } from "./10a/kit";
export { ROW_METRICS, badgeCount } from "./10a/kit";

/* built once per theme, so a list gets the same objects back on every
   render until the theme changes (rows can memo on them) */
const ROW_BY_THEME = Object.fromEntries(THEME_KEYS.map((k) => [k, rowStyleFor(THEMES[k])])) as Record<ThemeKey, RowStyle>;

/** The chat row's styles on the theme in effect (see above): metrics
    (face, gap, pad), colours by role, and ready style objects — row, disc,
    text (+ hairline), name, time, preview, you, badge, badgeText. The same
    object until the theme changes. */
export function useRowStyle(): RowStyle {
  return ROW_BY_THEME[useTheme().key];
}
