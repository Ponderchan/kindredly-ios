import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MONO, PF } from "../theme/post";
import { scrimColor, useP, useTheme } from "../lib/theme";
import { dangerInk } from "../screens/settings/settings-model";
import { t, useLang } from "../lib/i18n";
import { KEYBOARD_OUT_MS, blurThen, type CommandTarget } from "../lib/keyboard";

/* LEAVING A COMPOSER WITH WORDS IN IT.
   ────────────────────────────────────────────────────────────────────────
   This was Alert.alert, which is correct behaviour wearing the wrong face:
   system chrome, system type, rounded system buttons, in a product built out
   of paper and hairlines. A confirm is the one moment you have someone's full
   attention — spending it on stock iOS furniture wastes it.

   The FORM is borrowed (a sheet up from the bottom once the keyboard is out
   of the way) because it is the right form: it comes from where the keyboard
   just left, it doesn't cover what you wrote, and it can be dismissed by
   reaching down rather than aiming at a small button.

   The GRAMMAR is ours: paper, square corners, a rule under the title, mono
   for what the machine asks and the letter face for what it says back.

   The cancel is a full-width row, not a small ✕. The most likely reason you
   are looking at this sheet is that you did not mean to leave at all, so
   going back to writing should be the easiest thing on it to hit. The ✕ is
   there too, for people who reach for corners.

   Its colours are the theme's. The sheet is a sheet, so it is sf (the same
   white as the page in Classic); the rules and the quiet outline are ln;
   the filled button is ind with its label in the page colour, as every
   filled key in 10a is. One thing stays fixed: the postal red of the
   destructive row (an object's colour, like the postmark, in every theme).
   The dim is lib/theme scrimColor: the 10a navy the mock lays under its
   composer sheet (H:128) in the light themes, black on Midnight, where navy
   lightens the page. On Midnight the destructive WORD
   leaves the postal red for Settings' exits' red (settings-model dangerInk,
   as ReportMenu's block does): the postal red is 4.2:1 on the dark sf, under
   4.5 for an 11pt label. Its rule keeps the postal red.

   ABOVE THE FLOATING TAB BAR (10a). By default the sheet is an absolutely
   positioned View in its screen, and the tab bar the tabs layout draws
   after its screens sits on top of it — hence bottomExtra. Inside the Me
   tab's own stack (Settings, Edit profile) nothing a screen draws can clear
   the bar, so `modal` puts the sheet in a transparent React Native Modal,
   window-level, over the bar and everything else. Prefer `modal` for any
   sheet raised inside the tabs; a pushed root route doesn't need it.

   The mono sizes follow the 10a rule (theme/post MONO: a title is 11). */

export interface LeaveAction {
  label: string;
  /** primary = the filled pen button · destructive = ruled in postal red ·
      quiet = ruled in ink, for a serious act that is not the red one */
  kind: "primary" | "destructive" | "quiet";
  /** a mark before the label (a flag, a glyph). With one, the actions
      become a list — mark in a fixed column, label ranged left — so a set
      of them lines up instead of each centring on its own length */
  lead?: string;
  onPress: () => void;
}

export function LeaveSheet({
  open,
  title,
  body,
  actions,
  cancelLabel,
  bottomExtra = 0,
  modal = false,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  actions: LeaveAction[];
  /** null hides the cancel row entirely — for a sheet whose single action
      IS the dismissal, where a second "go back" row would be a question the
      reader was never asked. */
  cancelLabel?: string | null;
  /** extra room under the buttons, for a sheet raised inside a tab screen:
      the tab bar draws OVER this one, so without it the bottom row sits
      behind the bar — untappable, and invisible. Ignored with `modal`,
      which is above the bar already. */
  bottomExtra?: number;
  /** draw the sheet in a transparent window-level Modal, above the
      floating tab bar and every screen (see above) */
  modal?: boolean;
  onCancel: () => void;
}) {
  useLang(); // repaint when the reader changes language
  const P = useP();
  const { t: tk, dark } = useTheme();
  const insets = useSafeAreaInsets();
  if (!open) return null;

  const sheet = (
    <View accessibilityViewIsModal style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* a low-opacity dim rather than a blur: the page behind stays
            readable, which matters when the question is about that page */}
        <Pressable onPress={onCancel} accessible={false} style={{ flex: 1, backgroundColor: scrimColor(dark, 0.3) }} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(260)}
        style={{
          backgroundColor: tk.sf,
          borderTopWidth: 1,
          borderTopColor: tk.ln,
          paddingBottom: Math.max(insets.bottom, 12) + 6 + (modal ? 0 : bottomExtra),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tk.ln }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.6, color: P.ink }}>{title.toUpperCase()}</Text>
          <Pressable onPress={onCancel} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")}>
            <Text style={{ fontFamily: PF.mono, fontSize: 16, color: P.ink40 }}>✕</Text>
          </Pressable>
        </View>

        <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink60, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 20 }}>
          {body}
        </Text>

        <View style={{ paddingHorizontal: 22, gap: 10 }}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              accessibilityRole="button"
              style={({ pressed }) => [
                a.kind === "primary"
                  ? { backgroundColor: P.pen, paddingVertical: 15, alignItems: "center" as const, opacity: pressed ? 0.85 : 1 }
                  : {
                      borderWidth: 1,
                      borderColor: a.kind === "quiet" ? tk.ln : P.post,
                      paddingVertical: 15,
                      alignItems: "center" as const,
                      backgroundColor: pressed
                        ? a.kind === "quiet"
                          ? P.paperDeep
                          : "rgba(224,72,60,0.08)"
                        : "transparent",
                    },
                a.lead ? { flexDirection: "row" as const, alignItems: "center" as const, paddingHorizontal: 18 } : null,
              ]}
            >
              {!!a.lead && <Text style={{ width: 34, fontSize: 17, lineHeight: 20 }}>{a.lead}</Text>}
              <Text
                style={{
                  fontFamily: PF.monoSemi,
                  fontSize: MONO.title,
                  letterSpacing: 1.6,
                  color: a.kind === "primary" ? tk.bg : a.kind === "quiet" ? P.ink : dark ? dangerInk(tk.ink, P.post) : P.post,
                }}
              >
                {a.label}
              </Text>
            </Pressable>
          ))}

          {cancelLabel === null ? null : (
            <Pressable onPress={onCancel} accessibilityRole="button" style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.6, color: P.ink }}>{cancelLabel ?? t("cp.leave.keep")}</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );

  if (!modal) return sheet;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      {sheet}
    </Modal>
  );
}

/** Open the sheet the way the reference does: keyboard out of the way
    first, so the sheet rises into the space it just vacated instead of over
    it. Reaches a SwiftUI field too (lib/keyboard): pass the Swift screen's
    view ref as `target` and its field is told to let go first. */
export function openLeaveSheet(show: () => void, target?: CommandTarget) {
  blurThen(show, target, { delayMs: KEYBOARD_OUT_MS });
}
