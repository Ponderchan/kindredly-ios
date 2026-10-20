import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetBody, SheetHeader, sheetWords, sheetCard, sheetKey, sheetKeyLabel } from "./sheet-chrome";
import { scrimColor, useP, useTheme } from "../lib/theme";
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

   The FACE is iOS's now (owner, 2026-10-20: the paper-and-rule version
   felt dated): a floating card with large corners, the title centred in the
   system face, capsule keys — components/sheet-chrome, shared with
   SignUpSheet. What follows about colours describes the old paper sheet;
   sheet-chrome says what each key wears now.

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

   The mono sizes follow the 10a rule (theme/post MONO: a title is 11).

   NEVER TALLER THAN THE SCREEN (a11y pass 2026-10-19, cm-1). Nine languages
   on an SE were ~96pt taller than the window at the default size, and the
   delete warning lost its first half from AX3 on. The sheet stops under the
   status bar: the title row stays on top, the cancel row stays at the
   bottom, and the body and the actions scroll between them (bounces off, so
   a sheet that fits looks exactly as it did). The fixed rows cap their type
   at 1.6 so they can't eat the scrolling part. A two-finger scrub (escape)
   is the cancel, so it never travels up to the screen behind and pops it. */

export interface LeaveAction {
  label: string;
  /** primary = the filled pen button · destructive = ruled in postal red ·
      quiet = ruled in ink, for a serious act that is not the red one */
  kind: "primary" | "destructive" | "quiet";
  /** a mark before the label (a flag, a glyph). With one, the actions
      become a list — mark in a fixed column, label ranged left — so a set
      of them lines up instead of each centring on its own length.
      VoiceOver doesn't read it */
  lead?: string;
  /** VoiceOver: the row is the current choice (the language list) */
  selected?: boolean;
  /** VoiceOver: say this instead of the label (a language's own name) */
  accessibilityLabel?: string;
  /** VoiceOver: the language the label is in (BCP 47), so it is spoken in its own voice */
  accessibilityLanguage?: string;
  /** working: the row shows "…" and VoiceOver hears the label, busy */
  busy?: boolean;
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
  const win = useWindowDimensions();
  if (!open) return null;

  const sheet = (
    <View accessibilityViewIsModal onAccessibilityEscape={onCancel} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* a low-opacity dim rather than a blur: the page behind stays
            readable, which matters when the question is about that page */}
        <Pressable onPress={onCancel} accessible={false} style={{ flex: 1, backgroundColor: scrimColor(dark, 0.3) }} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(260)}
        style={[sheetCard(tk, modal ? 0 : bottomExtra), { maxHeight: win.height - insets.top - 12 - (modal ? 0 : bottomExtra), marginBottom: Math.max(insets.bottom - 26, 8) + (modal ? 0 : bottomExtra) }]}
      >
        <SheetHeader title={sheetWords(title)} onClose={onCancel} tk={tk} P={P} />

        <ScrollView bounces={false} style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ paddingBottom: cancelLabel === null ? 6 : 4 }}>
          <SheetBody P={P}>{body}</SheetBody>

          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {actions.map((a) => {
              const kind = a.kind === "primary" ? "primary" : a.kind === "destructive" ? "destructive" : "quiet";
              return (
                <Pressable
                  key={a.label}
                  onPress={a.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={a.accessibilityLabel ?? (a.busy ? a.label : undefined)}
                  accessibilityLanguage={a.accessibilityLanguage}
                  accessibilityState={{ selected: a.selected, busy: a.busy }}
                  style={({ pressed }) => [
                    sheetKey(kind, tk, P, dark, pressed),
                    a.lead ? { flexDirection: "row" as const, justifyContent: "flex-start" as const, paddingHorizontal: 18 } : null,
                  ]}
                >
                  {!!a.lead && (
                    <Text accessibilityElementsHidden importantForAccessibility="no" style={{ width: 34, fontSize: 17, lineHeight: 20 }}>
                      {a.lead}
                    </Text>
                  )}
                  <Text style={[sheetKeyLabel(kind, tk, P, dark), a.lead ? { textAlign: "left" as const, flexShrink: 1 } : null]}>{a.busy ? "…" : sheetWords(a.label)}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {cancelLabel === null ? null : (
          <Pressable onPress={onCancel} accessibilityRole="button" style={({ pressed }) => [sheetKey("plain", tk, P, dark, pressed), { marginHorizontal: 16, marginTop: 2 }]}>
            <Text maxFontSizeMultiplier={1.6} style={sheetKeyLabel("plain", tk, P, dark)}>{sheetWords(cancelLabel ?? t("cp.leave.keep"))}</Text>
          </Pressable>
        )}
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
