import { Keyboard, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { P, PF, rule, solidBtn } from "../theme/post";
import { t, useLang } from "../lib/i18n";

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
   there too, for people who reach for corners. */

export interface LeaveAction {
  label: string;
  /** primary = the filled pen button · destructive = ruled in postal red ·
      quiet = ruled in ink, for a serious act that is not the red one */
  kind: "primary" | "destructive" | "quiet";
  onPress: () => void;
}

export function LeaveSheet({
  open,
  title,
  body,
  actions,
  cancelLabel,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  actions: LeaveAction[];
  cancelLabel?: string;
  onCancel: () => void;
}) {
  useLang(); // repaint when the reader changes language
  const insets = useSafeAreaInsets();
  if (!open) return null;

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* ink at low opacity rather than a blur: the page behind stays
            readable, which matters when the question is about that page */}
        <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: "rgba(17,17,19,0.32)" }} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(260)}
        style={{
          backgroundColor: P.paper,
          borderTopWidth: 1,
          borderTopColor: P.ink,
          paddingBottom: Math.max(insets.bottom, 12) + 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12, ...rule }}>
          <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.8, color: P.ink }}>{title.toUpperCase()}</Text>
          <Pressable onPress={onCancel} hitSlop={12}>
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
              style={({ pressed }) =>
                a.kind === "primary"
                  ? { ...solidBtn, opacity: pressed ? 0.85 : 1 }
                  : {
                      borderWidth: 1,
                      borderColor: a.kind === "quiet" ? P.ink : P.post,
                      paddingVertical: 15,
                      alignItems: "center",
                      backgroundColor: pressed
                        ? a.kind === "quiet"
                          ? P.paperDeep
                          : "rgba(224,72,60,0.08)"
                        : "transparent",
                    }
              }
            >
              <Text
                style={{
                  fontFamily: PF.monoSemi,
                  fontSize: 12.5,
                  letterSpacing: 1.8,
                  color: a.kind === "primary" ? "#fff" : a.kind === "quiet" ? P.ink : P.post,
                }}
              >
                {a.label}
              </Text>
            </Pressable>
          ))}

          <Pressable onPress={onCancel} style={{ paddingVertical: 16, alignItems: "center" }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.8, color: P.ink }}>{cancelLabel ?? t("cp.leave.keep")}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/** open the sheet the way the reference does: keyboard out of the way first,
    so the sheet rises into the space it just vacated instead of over it */
export function openLeaveSheet(show: () => void) {
  Keyboard.dismiss();
  setTimeout(show, 120);
}
