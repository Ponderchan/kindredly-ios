/* THE RECORDING BAR, AS DATA (both renderers draw from this).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — the words come in through
   `words`, so
     node src/components/recorder-model.test.ts
   locks what the bar shows. The React Native bar (Recorder.tsx
   RecorderRN) draws it; the Swift one (modules/kindredly-ui KRecorderBar,
   on its own in a Host or inside the two composers) is handed it.

   Three phases: idle (the record key on the card face), recording (the
   red of a recording in progress, the bars moving with the seconds) and
   done (the take, on the accent's palest wash, with its ✕). The red is a
   signal, not chrome: the same in every theme, with white on it. */

/** the red of a recording in progress (the old C.ember) */
export const RECORDING = "#D66C3E";

/** the twenty bar heights, at rest */
export const RECORDER_BARS = [10, 16, 22, 18, 14, 20, 24, 12, 18, 22, 26, 14, 10, 18, 22, 24, 20, 14, 18, 22] as const;

export type RecorderPhase = "idle" | "recording" | "done";

/** m:ss (lib/format fmt, kept here so the model stays pure) */
export function recorderClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

/** the take is shown once there is one and nothing is being recorded */
export function recorderPhase(recording: boolean, doneUri: string | null | undefined): RecorderPhase {
  if (doneUri && !recording) return "done";
  return recording ? "recording" : "idle";
}

/** the bars' heights: still at rest and for a take, moving with the seconds while recording */
export function recorderBarHeights(phase: RecorderPhase, dur: number): number[] {
  return RECORDER_BARS.map((h, i) => (phase === "recording" ? h + Math.sin((dur + i) * 0.6) * 4 : h));
}

/** The bar's outer height before Dynamic Type: the 42 key and 16 above and below it, and the
    1pt edge the card face carries (the take has none). */
export function recorderHeight(phase: RecorderPhase): number {
  return 42 + 2 * 16 + (phase === "done" ? 0 : 2);
}

export type RecorderWords = {
  /** VoiceOver: the key at rest (rc.a11y.record) */
  record: string;
  /** VoiceOver: the key while recording (rc.a11y.stop) */
  stop: string;
  /** VoiceOver: the take's ✕ (rc.a11y.discard) */
  discard: string;
  /** "{t} of {max}" (rc.a11y.time) */
  time: (t: string, max: string) => string;
};

/** What either renderer draws. */
export type RecorderBarModel = {
  phase: RecorderPhase;
  /** "0:12 / 3:00" at rest and recording; the take's length when done */
  clock: string;
  /** VoiceOver: the time ("0:12 of 3:00"); the key's value while recording */
  timeA11y: string;
  bars: number[];
  recordLabel: string;
  stopLabel: string;
  discardLabel: string;
};

export function recorderBar(
  s: { recording: boolean; doneUri: string | null | undefined; dur: number; doneDur?: number; maxS: number },
  words: RecorderWords,
): RecorderBarModel {
  const phase = recorderPhase(s.recording, s.doneUri);
  const clock = phase === "done" ? recorderClock(s.doneDur || 0) : `${recorderClock(s.dur)} / ${recorderClock(s.maxS)}`;
  return {
    phase,
    clock,
    timeA11y: words.time(recorderClock(s.dur), recorderClock(s.maxS)),
    bars: recorderBarHeights(phase, s.dur),
    recordLabel: words.record,
    stopLabel: words.stop,
    discardLabel: words.discard,
  };
}
