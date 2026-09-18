import { Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { PUNCH } from "../theme/punch";
import { t } from "../lib/i18n";
import { stickerName } from "../lib/sticker-copy";
import type { Signal } from "../lib/today-signal";

/* THE ACTUAL REASON, AS A CHIP — the owner's A5, with A4's rings as the
   fallback. Acid green, the one colour on the card that is neither ink nor
   the stamp's, so it reads as "signal" before it is read at all. The words
   are a fixed template around a counted fact; see lib/today-signal. */

export function SignalChip({ signal }: { signal: Signal }) {
  /* one grammar for every sticker you both wear — "{Name}, like you" —
     whether it was read off the words, the clock or the subject; the
     stamp says "your stamp too" (its name is already on the tag beside it) */
  const line =
    signal.kind === "stamp"
      ? t("ld.both.stamp")
      : signal.kind === "close"
        ? t("ld.close")
        : t("ld.both.label", { name: stickerName(signal.stickerId) });
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: PUNCH.acid,
        borderWidth: 2,
        borderColor: PUNCH.ink,
        flexShrink: 1,
      }}
    >
      <Mark kind={signal.kind} />
      <Text style={{ fontSize: 12, fontWeight: "700", color: PUNCH.ink, flexShrink: 1 }} numberOfLines={1}>
        {line}
      </Text>
    </View>
  );
}

function Mark({ kind }: { kind: Signal["kind"] }) {
  const c = PUNCH.ink;
  if (kind === "stamp")
    return (
      <Svg width={13} height={13} viewBox="0 0 16 16">
        <Rect x={1.5} y={1.5} width={13} height={13} rx={1.5} fill="none" stroke={c} strokeWidth={1.8} strokeDasharray="2.2 1.6" />
        <Rect x={5} y={5} width={6} height={6} rx={1} fill={c} />
      </Svg>
    );
  if (kind === "hour")
    return (
      <Svg width={13} height={13} viewBox="0 0 16 16">
        <Circle cx={8} cy={8} r={6.4} fill="none" stroke={c} strokeWidth={1.8} />
        <Path d="M8 4.4V8l2.6 1.6" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  if (kind === "close")
    return (
      <Svg width={22} height={13} viewBox="0 0 34 20">
        <Circle cx={12} cy={10} r={8} fill="none" stroke={c} strokeWidth={2.2} />
        <Circle cx={22} cy={10} r={8} fill="none" stroke={c} strokeWidth={2.2} />
        <Path d="M17 3.2a8 8 0 0 0 0 13.6 8 8 0 0 0 0-13.6z" fill={c} opacity={0.45} />
      </Svg>
    );
  /* two of the same sticker — theirs on the letter, yours on you */
  return (
    <Svg width={13} height={13} viewBox="0 0 16 16">
      <Rect x={1.2} y={5} width={8.6} height={8.6} rx={2} fill="none" stroke={c} strokeWidth={1.8} />
      <Rect x={6} y={1.2} width={8.6} height={8.6} rx={2} fill={c} />
    </Svg>
  );
}
