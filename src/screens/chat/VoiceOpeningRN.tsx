import { useEffect, useMemo, useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import type { ThreadDetail } from "../../lib/db";
import { fmt } from "../../lib/format";
import { t } from "../../lib/i18n";
import { useSignedUrls } from "../../lib/images";
import { playbackPosition, useVoicePlayback, type VoicePlayback } from "../../lib/voice-playback";
import { demoMediaUrl } from "../../data/demo";
import { AudioCardView } from "../../components/AudioCard";
import "../../data/strings-step5-platform"; // vo.play, vo.pause

/* THE VOICE OPENING, IN REACT NATIVE (10a step 5, slice chat-rn).
   ────────────────────────────────────────────────────────────────────────
   Known bug 2: a thread opened by replying to a voice letter starts with
   that reply, so the reader's `conv.length === 1` test hid the voice card
   almost at once, and the room and chat never offered it at all. Wherever
   the opening shows now — the room and chat fallbacks, the reader (hero or
   earlier letter), a kindred's page — it plays.

   One player per screen (lib/voice-playback, the foundation's rule): the
   screen holds it through useOpeningVoiceRN and every card on the screen
   draws from it, so a voice can't play on after the screen is left (the
   player pauses on blur and is released on unmount) and two cards can't
   play over each other. The link is signed from storage (re-signed when it
   lapses), a demo thread's sample stands in for a demo path. Before the
   link is signed (offline) the card is unavailable, as KVoiceCard's
   `unavailable` is: drawn dimmed, its touches stopped, and heard by
   VoiceOver as a dimmed control (not a live "Play" that does nothing on a
   double-tap); a load that failed is a card at rest, and the next press
   loads it again.
   The card is AudioCard's row (AudioCardView: the theme's lav2 panel, the
   ind disc, VoiceOver's vo.play / vo.pause with the time as its value),
   moved on between the player's transitions by a 4 Hz tick while it plays. */

/** the voice opening's key on the screen's one player (the SwiftUI screens use the same) */
export const OPENING_VOICE_KEY = "voice:opening";

export type OpeningVoiceRN = {
  /** the opening is a voice letter */
  has: boolean;
  /** its playable address; null until signed (offline) */
  url: string | null;
  /** the stored length, until the player knows the real one */
  durationS: number;
  /** what build-items wants for the opening's row: its key and length label; null for words */
  voice: { key: string; duration: string } | null;
  /** the one player's state (only the opening plays on these screens) */
  state: VoicePlayback | null;
  toggle: () => void;
  pause: () => void;
};

/** The screen's one player and the opening's signed link. */
export function useOpeningVoiceRN(detail: ThreadDetail | null, isDemo: boolean): OpeningVoiceRN {
  const path = detail?.openingMedia ?? null;
  const signed = useSignedUrls("voice-letters", isDemo ? [] : [path]);
  const url = path ? (isDemo ? demoMediaUrl(path) : signed[path] ?? null) : null;
  const durationS = detail?.openingDurationS ?? 0;
  const player = useVoicePlayback();
  const voice = useMemo(() => (path ? { key: OPENING_VOICE_KEY, duration: fmt(durationS) } : null), [path, durationS]);
  const { toggle: playerToggle, pause } = player;
  const toggle = useMemo(() => () => playerToggle(OPENING_VOICE_KEY, url, durationS), [playerToggle, url, durationS]);
  return { has: !!path, url, durationS, voice, state: player.state, toggle, pause };
}

/** The voice card, drawn from the screen's one player. */
export function VoiceOpeningCard({ voice, compact = true, style }: { voice: OpeningVoiceRN; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const s = voice.state && voice.state.key === OPENING_VOICE_KEY ? voice.state : null;
  const playing = !!s?.playing;
  // the player tells only its transitions; the bar moves on between them
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [playing]);
  const unavailable = !voice.url;
  const durationS = s?.durationS || voice.durationS;
  const card = <AudioCardView compact={compact} playing={playing} positionS={playbackPosition(s)} durationS={durationS} onToggle={voice.toggle} />;
  if (!unavailable) return <View style={style}>{card}</View>;
  /* unavailable: one VoiceOver element over the card, a dimmed button (the card's own button
     inside it is hidden from VoiceOver by `accessible`), and the touches stop at it (box-only) */
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={t("vo.play")}
      accessibilityValue={{ text: fmt(durationS) }}
      accessibilityState={{ disabled: true }}
      pointerEvents="box-only"
      style={[{ opacity: 0.55 }, style]}
    >
      {card}
    </View>
  );
}
