import { Pressable, Text, View } from "react-native";
import { C, F, cardStyle } from "../theme/tokens";
import { StampTile } from "./StampTile";
import { ProgressBar } from "./ui";
import { postNo } from "../lib/format";
import type { ThreadSummary } from "../lib/db";

/* A letter/thread list row (v20 1026-1059): stamp, name/alias, last-message
   preview, unread ember dot, and an "n of 5 to names" bar before reveal. */

export function ThreadRow({ t, onOpen }: { t: ThreadSummary; onOpen: () => void }) {
  const name = t.otherName || `No. ${postNo(t.other)}`;
  const unread = !t.lastSenderMe; // they wrote last → your turn
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        cardStyle,
        { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, marginBottom: 10, opacity: pressed ? 0.94 : 1 },
      ]}
    >
      <StampTile id={t.stamp} w={40} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 16, color: C.ink }}>{name}</Text>
          {unread && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.ember }} />}
        </View>
        <Text numberOfLines={1} style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, marginTop: 3 }}>
          {t.preview}
        </Text>
        {!t.revealed && t.mine > 0 && (
          <View style={{ marginTop: 8 }}>
            <ProgressBar pct={Math.min(100, (t.mine / 5) * 100)} height={3} />
            <Text style={{ fontFamily: F.sans, fontSize: 10, color: C.faint, marginTop: 4 }}>
              {t.mine >= 5 ? "满 5 封，可以看名字了" : `还差 ${5 - t.mine} 封就能看名字`}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
