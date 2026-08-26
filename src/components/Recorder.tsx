import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { t, useLang } from "../lib/i18n";
import { C, F } from "../theme/tokens";
import { fmt } from "../lib/format";

/* Voice recorder — v20's design (record button + live waveform + timer),
   shared by voice letters and voice journal pages. Caps at `maxS` (default
   3:00, the v20 precedent). Calls onDone(uri, seconds) after stop. */

const BARS = [10, 16, 22, 18, 14, 20, 24, 12, 18, 22, 26, 14, 10, 18, 22, 24, 20, 14, 18, 22];

export function Recorder({
  maxS = 180,
  onDone,
  onClear,
  doneUri,
  doneDur,
}: {
  maxS?: number;
  onDone: (uri: string, seconds: number) => void;
  onClear?: () => void;
  doneUri?: string | null;
  doneDur?: number;
}) {
  useLang();
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const [rec, setRec] = useState(false);
  const [dur, setDur] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const start = async () => {
    const status = await requestRecordingPermissionsAsync();
    if (!status.granted) {
      Alert.alert(t("rc.micTitle"), t("rc.micBody"));
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setDur(0);
    setRec(true);
    timer.current = setInterval(() => {
      setDur((d) => {
        if (d + 1 >= maxS) stop(d + 1);
        return Math.min(maxS, d + 1);
      });
    }, 1000);
  };

  const stop = async (finalDur?: number) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRec(false);
    try {
      await recorder.stop();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      const uri = recorder.uri;
      const seconds = finalDur ?? dur;
      if (uri && seconds >= 2) onDone(uri, seconds);
      else if (uri) Alert.alert(t("rc.shortTitle"), t("rc.shortBody"));
    } catch {
      Alert.alert(t("rc.failTitle"), t("rc.failBody"));
    }
  };

  // recorded state — review row
  if (doneUri && !rec) {
    return (
      <View style={{ borderRadius: 14, padding: 16, backgroundColor: C.purpleLt, flexDirection: "row", alignItems: "center", gap: 13 }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.purple, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 16 }}>✓</Text>
        </View>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 26 }}>
          {BARS.map((h, i) => (
            <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: C.purple, opacity: 0.65 }} />
          ))}
        </View>
        <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: C.purple }}>{fmt(doneDur || 0)}</Text>
        <Pressable
          onPress={() => {
            setDur(0);
            onClear?.();
          }}
          hitSlop={8}
        >
          <Text style={{ color: C.faint, fontSize: 13 }}>✕</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 14, padding: 16, backgroundColor: C.creamHi, flexDirection: "row", alignItems: "center", gap: 13, borderWidth: 1, borderColor: C.line }}>
      <Pressable
        onPress={() => (rec ? stop() : start())}
        style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: rec ? C.ember : C.purple, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: "#fff", fontSize: 15 }}>{rec ? "■" : "🎙"}</Text>
      </Pressable>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 26 }}>
        {BARS.map((h, i) => (
          <View
            key={i}
            style={{
              width: 3,
              height: rec ? h + Math.sin((dur + i) * 0.6) * 4 : h,
              borderRadius: 2,
              backgroundColor: rec ? C.ember : C.purple,
              opacity: 0.65,
            }}
          />
        ))}
      </View>
      <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: rec ? C.ember : C.purple }}>
        {fmt(dur)} / {fmt(maxS)}
      </Text>
    </View>
  );
}
