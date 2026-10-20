import type { ReactNode } from "react";
import { Pressable, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { getLang, t } from "../lib/i18n";
import type { useP, useTheme } from "../lib/theme";

/* THE SHEETS' FACE, AS iOS DRAWS ONE (owner, 2026-10-20: the ruled paper sheets "feel dated,
   especially the black rule on top — make them Apple-native").
   A card floating 8pt in from the edges with large continuous corners (the iOS 26 sheet), no
   rules; the title in the system face, centred, sentence case, with the body under it; a round
   grey ✕ in the corner; capsule buttons 50pt tall in the system face. LeaveSheet and SignUpSheet
   both wear it, so every confirm in the app changes together. Colours stay the theme's: the card
   is sf, the filled key ind (the pen), the quiet key the soft wash; the destructive key is
   iOS's own red on a pale red wash. */

type Tk = ReturnType<typeof useTheme>["t"];
type Pal = ReturnType<typeof useP>;

export const SHEET_RADIUS = 34;

/** the floating card; `bottom` is room under it (a tab bar's height, when it isn't in a Modal) */
export function sheetCard(tk: Tk, bottom: number): ViewStyle {
  return {
    marginHorizontal: 8,
    marginBottom: 8 + bottom,
    backgroundColor: tk.sf,
    borderRadius: SHEET_RADIUS,
    borderCurve: "continuous",
    paddingTop: 22,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  };
}

/** iOS's system red, light and dark */
export const systemRed = (dark: boolean) => (dark ? "#FF453A" : "#FF3B30");

/** the title, centred, and the round ✕ in the corner */
export function SheetHeader({ title, onClose, tk, P }: { title: string; onClose: () => void; tk: Tk; P: Pal }) {
  return (
    <View style={{ paddingHorizontal: 56, minHeight: 30, justifyContent: "center" }}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.6} style={{ fontSize: 17, lineHeight: 22, fontWeight: "500", color: P.ink, textAlign: "center" }}>
        {title}
      </Text>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("wren.trackClose")}
        style={({ pressed }) => ({
          position: "absolute",
          right: 16,
          top: -6,
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: tk.soft,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: "700", color: tk.mute }}>
          ✕
        </Text>
      </Pressable>
    </View>
  );
}

/** the body under the title */
export function SheetBody({ children, P }: { children: ReactNode; P: Pal }) {
  return <Text style={{ fontSize: 15, lineHeight: 21, color: P.ink60, textAlign: "center", paddingHorizontal: 24, paddingTop: 6, paddingBottom: 20 }}>{children}</Text>;
}

export type SheetKey = "primary" | "destructive" | "quiet" | "plain";

/** a capsule key's ground */
export function sheetKey(kind: SheetKey, tk: Tk, P: Pal, dark: boolean, pressed: boolean): ViewStyle {
  const ground =
    kind === "primary" ? P.pen : kind === "destructive" ? (dark ? "rgba(255,69,58,0.18)" : "rgba(255,59,48,0.10)") : kind === "quiet" ? tk.soft : "transparent";
  return {
    minHeight: 50,
    borderRadius: 25,
    borderCurve: "continuous",
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ground,
    opacity: pressed ? 0.7 : 1,
  };
}

/** a capsule key's label */
export function sheetKeyLabel(kind: SheetKey, tk: Tk, P: Pal, dark: boolean): TextStyle {
  const color = kind === "primary" ? tk.bg : kind === "destructive" ? systemRed(dark) : kind === "quiet" ? P.ink : tk.ind;
  return { fontSize: 17, lineHeight: 22, fontWeight: kind === "plain" ? "400" : "600", color, textAlign: "center" };
}

/* SENTENCE CASE. The sheets' words are stored in capitals for the old mono rows ("SAVE AS
   DRAFT"); an iOS sheet says "Save as draft". A label with no lower-case letter is lowered and its
   first letter raised, in the reader's language; German keeps its nouns' capitals (the nouns the
   sheets' callers actually use, checked 2026-10-20). Japanese and Korean have no case, so they
   pass through untouched, as does anything already in mixed case. */
const DE_NOUNS = new Set(["entwurf", "konto", "brief", "spur", "gesicht", "schreibname"]);

export function sheetWords(s: string): string {
  if (!/\p{Lu}/u.test(s) || /\p{Ll}/u.test(s)) return s;
  const lang = getLang();
  let out = s.toLocaleLowerCase(lang);
  if (lang === "de") out = out.replace(/\p{L}+/gu, (w) => (DE_NOUNS.has(w) ? w[0].toLocaleUpperCase("de") + w.slice(1) : w));
  const i = out.search(/\p{L}/u);
  return i < 0 ? out : out.slice(0, i) + out[i].toLocaleUpperCase(lang) + out.slice(i + 1);
}
