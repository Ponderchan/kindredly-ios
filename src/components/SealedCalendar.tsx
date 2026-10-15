import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { PF } from "../theme/post";
import { useTheme } from "../lib/theme";
import { MoodIcon } from "./MoodIcon";
import type { MonthVM } from "../screens/notes/notes-model";

/* The month as an emotional weather map, in the Notes fallback (10a step
   5): every day you wrote shows that day's newest page's face in its cell,
   with a count when there were several. Tap a filled day → that page, or
   the day page when it holds more than one. The calendar is the only
   navigation a private journal needs — no filter row.

   It draws a MonthVM (screens/notes/notes-model buildMonth), the month the
   SwiftUI overlay draws, so both agree on the days: the weekday letters
   are the language's own and start on its first weekday (known bug 5:
   they were English S M T W T F S everywhere), the title is the locale's
   ("2026年10月", not "10月 2026"), › stops at this month and ‹ at the
   first month with a page. Painted from the theme. */

/** Re-exported for the callers that always took it from here. */
export { dayKey } from "../screens/notes/notes-model";

export function SealedCalendar({
  month,
  weekdays,
  prevLabel,
  nextLabel,
  onStep,
  onPickDay,
}: {
  month: MonthVM;
  /** seven letters from the language's first weekday */
  weekdays: string[];
  prevLabel: string;
  nextLabel: string;
  onStep: (delta: number) => void;
  onPickDay: (key: string) => void;
}) {
  const { t: tk } = useTheme();
  const cells: (MonthVM["days"][number] | null)[] = [...Array.from({ length: month.lead }, () => null), ...month.days];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={{ paddingHorizontal: 22 }}>
      {/* month nav */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 16 }}>
        <Chevron dir="left" enabled={month.canPrev} label={prevLabel} onPress={() => onStep(-1)} />
        <Text accessibilityRole="header" style={{ flexShrink: 1, textAlign: "center", fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.54, color: tk.ink }}>
          {month.title}
        </Text>
        <Chevron dir="right" enabled={month.canNext} label={nextLabel} onPress={() => onStep(1)} />
      </View>

      {/* weekday header */}
      <View style={{ flexDirection: "row", marginBottom: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {weekdays.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: "center", fontFamily: PF.monoSemi, fontSize: 10, color: tk.faint }}>
            {w}
          </Text>
        ))}
      </View>

      {/* grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((d, i) => {
          if (d === null) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const filled = !!d.targetId;
          return (
            <Pressable
              key={i}
              disabled={!filled}
              onPress={() => filled && onPickDay(d.key)}
              accessibilityRole={filled ? "button" : "text"}
              accessibilityLabel={d.a11y}
              accessibilityState={{ disabled: !filled }}
              style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" }}
            >
              <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: d.today ? 1.5 : 0, borderColor: tk.ln, borderRadius: 11 }}>
                {filled && d.mood ? (
                  <>
                    <MoodIcon id={d.mood} size={34} />
                    {d.count > 1 && (
                      <View style={{ position: "absolute", right: -2, top: -2, minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 4, backgroundColor: tk.ink, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: tk.bg, fontSize: 9, fontFamily: PF.monoMed }}>{d.count}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={{ fontSize: 13, color: d.future ? tk.faint : d.today ? tk.ink : tk.mute }}>{d.n}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* the month, summed — so an empty grid still says something */}
      <Text accessibilityLabel={month.footerA11y} style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.2, color: tk.mute, textAlign: "center", marginTop: 8 }}>
        {month.footer}
      </Text>
    </View>
  );
}

function Chevron({ dir, enabled, label, onPress }: { dir: "left" | "right"; enabled: boolean; label: string; onPress: () => void }) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => ({ width: 40, height: 40, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={enabled ? tk.ink : tk.faint} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d={dir === "left" ? "M15 6l-7 6 7 6" : "M9 6l7 6-7 6"} />
      </Svg>
    </Pressable>
  );
}
