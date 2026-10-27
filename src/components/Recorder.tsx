import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Pressable, Text, View } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { Host } from "@expo/ui/swift-ui";
import { KRecorderView } from "../../modules/kindredly-ui";
import { t, useLang } from "../lib/i18n";
import { PFM } from "../theme/post";
import { useTheme } from "../lib/theme";
import { NativeSurface, useSurfaceHost, type SurfaceHostLink } from "./NativeSurface";
import { RECORDING, recorderBar, recorderHeight, type RecorderBarModel, type RecorderWords } from "./recorder-model";
import "../data/strings-a11y-compose";

/* Voice recorder — v20's design (record button + live waveform + timer),
   shared by voice letters and voice journal pages. Caps at `maxS` (default
   3:00, the v20 precedent). Calls onDone(uri, seconds) after stop.

   Its colours are the theme's, the old C palette read by role: the panel
   is a card face (sf) ruled in line, the take you can keep sits on the
   accent's palest wash (lav2), the key, bars and timer are ind with the
   page colour on the key, and the ✕ is faint. The red of a recording in
   progress is a signal, not chrome, so it stays the same in every theme,
   with white on it.

   TWO WAYS TO DRAW IT (2026-10-27). The recording itself — expo-audio, the
   microphone's permission, the cap, the file, the alerts, what VoiceOver is
   told as it starts and stops — is useRecording, here in TS, whoever draws
   the bar. What the bar shows is recorder-model's (recorderBar). With the
   "recorder" switch on (lib/surfaces) and the binary carrying KRecorderView,
   SwiftUI draws it in a small Host of its own (NativeSurface: the crash
   breadcrumb, a JS error back to React Native); otherwise RecorderRN, the
   same bar as always. Inside a Swift screen (an island of the composers)
   it is always React Native — a Host is never nested in a Host; the Swift
   composers draw the Swift bar themselves (components/VoiceSlot). */

/** The recording: expo-audio, the permission, the cap, the file. The key and the take's ✕ call
    `press` and `discard`; `rec` and `dur` are what the bar shows. */
export function useRecording({
  maxS = 180,
  onDone,
  onClear,
}: {
  maxS?: number;
  onDone: (uri: string, seconds: number) => void;
  onClear?: () => void;
}) {
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

  return {
    rec,
    dur,
    maxS,
    press: () => {
      void (rec ? stop() : start());
    },
    discard: () => {
      setDur(0);
      onClear?.();
    },
  };
}

/** The bar's words, in the reader's language. */
export function recorderWords(): RecorderWords {
  return {
    record: t("rc.a11y.record"),
    stop: t("rc.a11y.stop"),
    discard: t("rc.a11y.discard"),
    time: (time, max) => t("rc.a11y.time", { t: time, max }),
  };
}

type RecorderProps = {
  maxS?: number;
  onDone: (uri: string, seconds: number) => void;
  onClear?: () => void;
  doneUri?: string | null;
  doneDur?: number;
};

export function Recorder({ maxS = 180, onDone, onClear, doneUri, doneDur }: RecorderProps) {
  useLang();
  const engine = useRecording({ maxS, onDone, onClear });
  const bar = recorderBar({ recording: engine.rec, doneUri, dur: engine.dur, doneDur, maxS }, recorderWords());
  const inSwift = useSurfaceHost() !== null;
  const rn = () => <RecorderRN bar={bar} onPress={engine.press} onDiscard={engine.discard} />;
  if (inSwift) return rn();
  return (
    <NativeSurface
      surface="recorder"
      view="KRecorderView"
      mode="mount"
      native={(host) => <RecorderSwift bar={bar} onPress={engine.press} onDiscard={engine.discard} host={host} />}
      fallback={rn}
      // the same bar, drawn by React Native for the moment the phone's answers take
      pending={rn}
    />
  );
}

/* The Swift bar: its width from React Native, its height from SwiftUI. The bar's own height holds
   the room while the Host lays out, so nothing under it moves. */
function RecorderSwift({ bar, onPress, onDiscard, host }: { bar: RecorderBarModel; onPress: () => void; onDiscard: () => void; host: SurfaceHostLink }) {
  const { key: theme, dark } = useTheme();
  return (
    <View style={{ minHeight: recorderHeight(bar.phase) }}>
      <Host matchContents={{ vertical: true }} colorScheme={dark ? "dark" : "light"} ignoreSafeArea="all" onLayoutContent={host.onLayoutContent}>
        <KRecorderView theme={theme} bar={bar} onPress={onPress} onDiscard={onDiscard} />
      </Host>
    </View>
  );
}

/** The React Native bar: what recorder-model says, the key and the take's ✕. */
export function RecorderRN({ bar, onPress, onDiscard }: { bar: RecorderBarModel; onPress: () => void; onDiscard: () => void }) {
  const { t: tk } = useTheme();
  const rec = bar.phase === "recording";

  // recorded state — review row
  if (bar.phase === "done") {
    return (
      <View style={{ borderRadius: 14, padding: 16, backgroundColor: tk.lav2, flexDirection: "row", alignItems: "center", gap: 13 }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: tk.ind, alignItems: "center", justifyContent: "center" }}>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: tk.bg, fontSize: 16 }}>✓</Text>
        </View>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 26 }}>
          {bar.bars.map((h, i) => (
            <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: tk.ind, opacity: 0.65 }} />
          ))}
        </View>
        <Text style={{ ...PFM.monoSemi, fontSize: 12.5, color: tk.ind }}>{bar.clock}</Text>
        {/* a11y cm-6: named, and a 44 box (it was the 13pt ✕ and 8 of slop, about 29); the
            negative margin keeps the row as it was drawn */}
        <Pressable
          onPress={onDiscard}
          accessibilityRole="button"
          accessibilityLabel={bar.discardLabel}
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
        onPress={onPress}
        // a11y cm-6: it read as the emoji ("studio microphone", then "black square")
        accessibilityRole="button"
        accessibilityLabel={rec ? bar.stopLabel : bar.recordLabel}
        accessibilityState={{ busy: rec }}
        accessibilityValue={rec ? { text: bar.timeA11y } : undefined}
        style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: rec ? RECORDING : tk.ind, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: rec ? "#FFFFFF" : tk.bg, fontSize: 15 }}>{rec ? "■" : "🎙"}</Text>
      </Pressable>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 26 }}>
        {bar.bars.map((h, i) => (
          <View
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 2,
              backgroundColor: rec ? RECORDING : tk.ind,
              opacity: 0.65,
            }}
          />
        ))}
      </View>
      <Text accessibilityLabel={bar.timeA11y} style={{ ...PFM.monoSemi, fontSize: 12.5, color: rec ? RECORDING : tk.ind }}>
        {bar.clock}
      </Text>
    </View>
  );
}
