import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Pressable, Text, View } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { t, useLang } from "../lib/i18n";
import { F } from "../theme/tokens";
import { useTheme } from "../lib/theme";
import { fmt } from "../lib/format";
import "../data/strings-a11y-compose";

/* Voice recorder — v20's design (record button + live waveform + timer),
   shared by voice letters and voice journal pages. Caps at `maxS` (default
   3:00, the v20 precedent). Calls onDone(uri, seconds) after stop.

   Its colours are the theme's, the old C palette read by role: the panel
   is a card face (sf) ruled in line, the take you can keep sits on the
   accent's palest wash (lav2), the key, bars and timer are ind with the
   page colour on the key, and the ✕ is faint. The red of a recording in
   progress is a signal, not chrome, so it stays the same in every theme,
   with white on it. */

const RECORDING = "#D66C3E"; // the old C.ember

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
  const { t: tk } = useTheme();
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
    // a11y cm-6: iOS has no live region; say it the moment it happens
    AccessibilityInfo.announceForAccessibility(t("rc.a11y.started"));
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
    AccessibilityInfo.announceForAccessibility(t("rc.a11y.stopped"));
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
      <View style={{ borderRadius: 14, padding: 16, backgroundColor: tk.lav2, flexDirection: "row", alignItems: "center", gap: 13 }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: tk.ind, alignItems: "center", justifyContent: "center" }}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: tk.bg, fontSize: 16 }}>✓</Text>
        </View>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 26 }}>
          {BARS.map((h, i) => (
            <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: tk.ind, opacity: 0.65 }} />
          ))}
        </View>
        <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: tk.ind }}>{fmt(doneDur || 0)}</Text>
        {/* a11y cm-6: named, and a 44 box (it was the 13pt ✕ and 8 of slop, about 29); the
            negative margin keeps the row as it was drawn */}
        <Pressable
          onPress={() => {
            setDur(0);
            onClear?.();
          }}
          accessibilityRole="button"
          accessibilityLabel={t("rc.a11y.discard")}
          style={{ width: 44, height: 44, margin: -14, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: tk.faint, fontSize: 13 }}>✕</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 14, padding: 16, backgroundColor: tk.sf, flexDirection: "row", alignItems: "center", gap: 13, borderWidth: 1, borderColor: tk.line }}>
      <Pressable
        onPress={() => (rec ? stop() : start())}
        // a11y cm-6: it read as the emoji ("studio microphone", then "black square")
        accessibilityRole="button"
        accessibilityLabel={rec ? t("rc.a11y.stop") : t("rc.a11y.record")}
        accessibilityState={{ busy: rec }}
        accessibilityValue={rec ? { text: t("rc.a11y.time", { t: fmt(dur), max: fmt(maxS) }) } : undefined}
        style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: rec ? RECORDING : tk.ind, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: rec ? "#FFFFFF" : tk.bg, fontSize: 15 }}>{rec ? "■" : "🎙"}</Text>
      </Pressable>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 26 }}>
        {BARS.map((h, i) => (
          <View
            key={i}
            style={{
              width: 3,
              height: rec ? h + Math.sin((dur + i) * 0.6) * 4 : h,
              borderRadius: 2,
              backgroundColor: rec ? RECORDING : tk.ind,
              opacity: 0.65,
            }}
          />
        ))}
      </View>
      <Text accessibilityLabel={t("rc.a11y.time", { t: fmt(dur), max: fmt(maxS) })} style={{ fontFamily: F.sansBold, fontSize: 12.5, color: rec ? RECORDING : tk.ind }}>
        {fmt(dur)} / {fmt(maxS)}
      </Text>
    </View>
  );
}
