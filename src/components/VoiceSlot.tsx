import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { isKindredlyUIViewAvailable, type KAudioCardLook, type KRecorderBar, type KVoiceSlotAction, type KVoiceSlotCommand } from "../../modules/kindredly-ui";
import { armNative, clearNative, nativeOn } from "../lib/surfaces";
import { t, useLang } from "../lib/i18n";
import { recorderWords, useRecording } from "./Recorder";
import { swiftAudioLook, useAudioCardLook, useOwnPlayer } from "./AudioCard";
import { recorderBar, recorderClock } from "./recorder-model";
import "../data/strings-step5-platform"; // vo.play, vo.pause

/* THE COMPOSERS' VOICE SLOT, FROM TS (2026-10-27).
   ────────────────────────────────────────────────────────────────────────
   The two Swift composers (screens/compose/ComposeNative, screens/
   journal-entry/NoteComposeNative) place one slot while a voice letter or a
   voice note is being made. It was one React Native island: the Recorder,
   and the take's AudioCard under it. Behind the "recorder" and "audiocard"
   switches the page draws either piece itself (KVoiceSlot), and the island
   keeps only what is still React Native — so a Host is never nested in the
   page's Host.

   TS still holds everything that isn't drawing: VoiceBarDriver runs the
   recording (useRecording: expo-audio, the permission, the cap, the
   alerts), VoiceTakeDriver the take's player (useOwnPlayer, as AudioCard),
   each mounted only while it is needed and rendering nothing. What they
   show goes to the page as its `recorder` command (sent when it changes,
   and again when the view attaches); the page's taps come back through its
   onVoice event to `slot.action`.

   Which pieces are Swift is decided once per page (useVoicePieces), so a
   switch flipping mid-recording can't take the recording away. Each Swift
   piece arms the crash breadcrumb when it first shows and clears it once it
   has stood (lib/surfaces armNative / clearNative, as NativeSurface does):
   one that takes the app down twice goes back to the island. */

/** Which of the slot's pieces Swift draws on this page: decided once, at mount. */
export function useVoicePieces(): { bar: boolean; card: boolean } {
  const [pieces] = useState(() => ({
    bar: nativeOn("recorder") && isKindredlyUIViewAvailable("KRecorderView"),
    card: nativeOn("audiocard") && isKindredlyUIViewAvailable("KAudioCardView"),
  }));
  return pieces;
}

type Card = KVoiceSlotCommand["card"];

/** The slot's state on the TS side: what the drivers last said, what to send, the taps. */
export type VoiceSlot = {
  /** there is a take (the page's recUri): with the card in React Native, it is in the island.
      Set by the page as it renders, before the drivers say anything. */
  take: boolean;
  setBar(bar: KRecorderBar | null): void;
  setCard(card: Card | null): void;
  /** what a tap does (each driver sets its own, and takes it back when it goes) */
  handle(action: KVoiceSlotAction, fn: (() => void) | null): void;
  /** the page's onVoice */
  action(action: KVoiceSlotAction): void;
  /** the view (re)attached: say it all again */
  resend(): void;
};

const NO_BAR: KRecorderBar = { phase: "idle", clock: recorderClock(0), timeA11y: "", bars: [], recordLabel: "", stopLabel: "", discardLabel: "" };
const NO_LOOK: KAudioCardLook = {
  ink: "",
  glyph: "",
  panel: "",
  edge: "",
  timeInk: "",
  time: "",
  padding: 10,
  radius: 14,
  disc: 36,
  discRadius: 22,
  glyphSize: 13,
  glyphNudge: 2,
  barRadius: 2,
  bars: [],
  mono: "semibold",
};

/** One per page, made once: `send` is the page's `recorder` command. */
export function createVoiceSlot(pieces: { bar: boolean; card: boolean }, send: (cmd: KVoiceSlotCommand) => void): VoiceSlot {
  let bar: KRecorderBar | null = null;
  let card: Card | null = null;
  let sent = "";
  const handlers: Partial<Record<KVoiceSlotAction, () => void>> = {};
  const command = (s: VoiceSlot): KVoiceSlotCommand => ({
    showBar: !!bar,
    bar: bar ?? NO_BAR,
    showCard: !!card,
    card: card ?? { look: NO_LOOK, playing: false, label: "" },
    // the island holds the React Native Recorder, or the take's React Native card
    island: !pieces.bar || (!pieces.card && s.take),
  });
  const push = (s: VoiceSlot, force: boolean) => {
    const cmd = command(s);
    const json = JSON.stringify(cmd);
    if (!force && json === sent) return;
    sent = json;
    send(cmd);
  };
  const slot: VoiceSlot = {
    take: false,
    setBar(b) {
      bar = b;
      push(slot, false);
    },
    setCard(c) {
      card = c;
      push(slot, false);
    },
    handle(action, fn) {
      if (fn) handlers[action] = fn;
      else delete handlers[action];
    },
    action(action) {
      const fn = handlers[action];
      if (fn) fn();
      else console.warn(`[voice-slot] a ${action} came from the page with nothing to answer it`);
    },
    resend() {
      push(slot, true);
    },
  };
  return slot;
}

/* The breadcrumb for a piece the page draws itself: armed when it first shows, cleared once it
   has stood 3s, when the app goes inactive or to the background, or 1s after it goes. */
function useArmedPiece(key: string) {
  useEffect(() => {
    const arm = armNative(key);
    let done = false;
    const clear = () => {
      if (done) return;
      done = true;
      void arm.then(() => clearNative(key));
    };
    const id = setTimeout(clear, 3000);
    const sub = AppState.addEventListener("change", (a) => {
      if (a === "background" || a === "inactive") clear();
    });
    return () => {
      clearTimeout(id);
      sub.remove();
      setTimeout(clear, 1000);
    };
  }, [key]);
}

/** The recording, for a page whose slot draws the Swift bar: mounted while speaking. Renders
    nothing. */
export function VoiceBarDriver({
  slot,
  recUri,
  recDur,
  onRecorded,
  onClear,
}: {
  slot: VoiceSlot;
  recUri: string | null;
  recDur: number;
  onRecorded: (uri: string, seconds: number) => void;
  onClear: () => void;
}) {
  useLang();
  useArmedPiece("recorder");
  const engine = useRecording({ onDone: onRecorded, onClear });
  const latest = useRef(engine);
  latest.current = engine;
  const bar = recorderBar({ recording: engine.rec, doneUri: recUri, dur: engine.dur, doneDur: recDur, maxS: engine.maxS }, recorderWords());
  const json = JSON.stringify(bar);

  useEffect(() => {
    slot.handle("press", () => latest.current.press());
    slot.handle("discard", () => latest.current.discard());
    return () => {
      slot.handle("press", null);
      slot.handle("discard", null);
      slot.setBar(null);
    };
  }, [slot]);
  useEffect(() => {
    slot.setBar(JSON.parse(json) as KRecorderBar);
  }, [json, slot]);
  return null;
}

/** The take's player, for a page whose slot draws the Swift card: mounted while there is a take.
    Renders nothing. */
export function VoiceTakeDriver({ slot, uri, durationS }: { slot: VoiceSlot; uri: string; durationS: number }) {
  useLang();
  useArmedPiece("audiocard");
  const own = useOwnPlayer(uri, durationS);
  const latest = useRef(own);
  latest.current = own;
  // the composers' take is AudioCard compact, in the theme's chrome
  const look = useAudioCardLook({ compact: true, playing: own.playing, positionS: own.positionS, durationS: own.durationS });
  const card: Card = {
    look: swiftAudioLook(look),
    playing: own.playing,
    label: own.playing ? t("vo.pause") : t("vo.play"),
  };
  const json = JSON.stringify(card);

  useEffect(() => {
    slot.handle("toggle", () => latest.current.toggle());
    return () => {
      slot.handle("toggle", null);
      slot.setCard(null);
    };
  }, [slot]);
  useEffect(() => {
    slot.setCard(JSON.parse(json) as Card);
  }, [json, slot]);
  return null;
}
