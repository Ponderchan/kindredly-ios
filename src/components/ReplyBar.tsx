import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { C, F } from "../theme/tokens";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../lib/weighted-count";

/* Inline reply bar — light by default, expandable to a full letter.
   Ported from kindredly-v20.jsx (1222-1277). */

export function ReplyBar({
  placeholder = "Write a response…",
  onSend,
  onExpand,
  footnote = "Short is fine. It leaves at the morning chime either way.",
}: {
  placeholder?: string;
  onSend: (text: string) => void;
  onExpand?: () => void;
  footnote?: string;
}) {
  const [text, setText] = useState("");
  const [h, setH] = useState(44);
  const weight = weightedCount(text);
  const over = weight > LETTER_MAX;
  const can = weight >= REPLY_MIN && !over;

  const fire = () => {
    if (!can) return;
    onSend(text.trim());
    setText("");
    setH(44);
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26 }}>
      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 26,
          padding: 8,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 8,
          borderWidth: 1,
          borderColor: C.line,
          shadowColor: "#131A26",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        {onExpand && (
          <Pressable
            onPress={onExpand}
            hitSlop={6}
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
          >
            <Svg width={17} height={17} viewBox="0 0 18 18">
              <Path
                d="M11 2h5v5M16 2l-6 6M7 16H2v-5M2 16l6-6"
                fill="none"
                stroke={C.faint}
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        )}

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={C.faint}
          multiline
          onContentSizeChange={(e) =>
            setH(Math.min(150, Math.max(44, e.nativeEvent.contentSize.height + 22)))
          }
          style={{
            flex: 1,
            height: h,
            paddingHorizontal: 4,
            color: C.ink,
            fontFamily: F.letter,
            fontSize: 15.5,
            lineHeight: 22,
          }}
        />

        <Pressable
          onPress={fire}
          disabled={!can}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: can ? C.navy : C.lineSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg width={17} height={17} viewBox="0 0 18 18">
            <Path
              d="M4 9h10M9.5 4l5 5-5 5"
              fill="none"
              stroke={can ? "#fff" : C.faint}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>
      <Text style={{ textAlign: "center", fontSize: 10.5, color: over ? "#C0503A" : C.faint, marginTop: 10, fontFamily: F.serifItalic }}>
        {over ? `${weight - LETTER_MAX} over the limit` : footnote}
      </Text>
    </View>
  );
}
