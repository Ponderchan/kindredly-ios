import { useMemo, useState } from "react";
import { localeTag } from "../lib/format";
import { Pressable, Text, View } from "react-native";
import { F } from "../theme/tokens";
import { P, PF } from "../theme/post";
import { MoodIcon } from "./MoodIcon";
import type { JournalEntry } from "../lib/journal";

/* The month as an emotional weather map: every day you wrote drops that day's
   mood face into its cell. Tap a filled day → its detail. The calendar is the
   only navigation a private journal needs — no filter row. */

const WD = ["S", "M", "T", "W", "T", "F", "S"];

export function dayKey(d: string | number | Date): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

type Cell = { entry: JournalEntry; count: number };

export function SealedCalendar({ entries, onPickDay }: { entries: JournalEntry[]; onPickDay: (key: string) => void }) {
  // latest entry + count per day (entries arrive newest-first)
  const byDay = useMemo(() => {
    const map = new Map<string, Cell>();
    for (const e of entries) {
      const k = dayKey(e.date);
      const cur = map.get(k);
      if (cur) cur.count += 1;
      else map.set(k, { entry: e, count: 1 });
    }
    return map;
  }, [entries]);

  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const todayKey = dayKey(now);

  const first = new Date(ym.y, ym.m, 1);
  const lead = first.getDay(); // 0=Sun
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const monthName = first.toLocaleDateString(localeTag(), { month: "long" }).toUpperCase();

  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const step = (delta: number) => {
    const m = ym.m + delta;
    setYm({ y: ym.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  return (
    <View style={{ paddingHorizontal: 22 }}>
      {/* month nav */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 16 }}>
        <Pressable onPress={() => step(-1)} hitSlop={12} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 18, color: P.ink60 }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>
          {monthName} {ym.y}
        </Text>
        <Pressable onPress={() => step(1)} hitSlop={12} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 18, color: P.ink60 }}>›</Text>
        </Pressable>
      </View>

      {/* weekday header */}
      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        {WD.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: "center", fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.5, color: P.ink40 }}>
            {w}
          </Text>
        ))}
      </View>

      {/* grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((d, i) => {
          if (d === null) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const key = `${ym.y}-${String(ym.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const cell = byDay.get(key);
          const isToday = key === todayKey;
          return (
            <Pressable
              key={i}
              disabled={!cell}
              onPress={() => cell && onPickDay(key)}
              style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: P.ink,
                }}
              >
                {cell ? (
                  <>
                    <MoodIcon id={cell.entry.mood} size={34} />
                    {cell.count > 1 && (
                      <View style={{ position: "absolute", right: -2, top: -2, minWidth: 15, height: 15, paddingHorizontal: 3, backgroundColor: P.ink, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: P.paper, fontSize: 8.5, fontFamily: PF.monoMed }}>{cell.count}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={{ fontFamily: PF.mono, fontSize: 12.5, color: isToday ? P.ink : P.ink40 }}>{d}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
