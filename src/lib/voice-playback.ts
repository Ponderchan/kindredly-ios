/* ONE VOICE AT A TIME, PER SCREEN.
   ────────────────────────────────────────────────────────────────────────
   Every voice card used to mount its own expo-audio player. On Today that
   meant a voice letter kept playing after a swipe to the next page (each
   page had a player of its own and nothing paused it), and every card
   held a player whether or not it was ever pressed. Now a screen holds
   exactly one player (foundation, audio_video):

   - toggling another item replace()s the source and plays it;
   - toggling the playing item pauses it; toggling it again resumes, and a
     finished item starts again from 0 (AudioCard / SealedTile did this);
   - it pauses when the screen loses focus, when it unmounts, and when the
     caller's `pauseOn` value changes (Today's card index);
   - a link re-signed while an item is loaded doesn't reset it: a paused
     item resumes where it was on the source it already has.

   Swift's KVoiceCard is display-only. It gets `state` through the
   'playback' command — only on transitions (play, pause, seek, end, a
   stall that knocks the clock out by more than a beat), never per tick —
   and runs the progress itself from { positionS, at } while playing. So
   the screen does not re-render at the player's status rate either: the
   status listener below only touches state on a transition. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer, type AudioStatus } from "expo-audio";
import { useFocusEffect } from "expo-router";

/** What is loaded and where it stands. `at` is Date.now() (ms) when positionS was true. */
export type VoicePlayback = {
  /** the caller's id for the item (a letter id, a note id, 'opening') */
  key: string;
  playing: boolean;
  /** seconds into the item at `at` */
  positionS: number;
  /** seconds; the player's own once loaded, else the duration the caller passed */
  durationS: number;
  /** ms since the epoch when positionS was sampled — while playing, now's position is positionS + (now − at) / 1000 */
  at: number;
};

export type VoicePlaybackApi = {
  /** the loaded item, or null before anything was played (or after stop()) */
  state: VoicePlayback | null;
  /**
   * Play/pause `key`. Another key replaces the source and plays from 0; the same key
   * pauses, resumes, or restarts from 0 when it had finished. A null url (not signed
   * yet, offline) does nothing — the card shows itself unavailable.
   * @param durationS the stored length, used until the player knows the real one
   */
  toggle: (key: string, url: string | null | undefined, durationS?: number | null) => void;
  /** pause whatever is playing (before a modal, a recording, a push) */
  pause: () => void;
  /** pause and forget the item: state becomes null */
  stop: () => void;
};

/** a finished item is "at the end" within this many seconds */
const END_SLOP = 0.3;
/** while playing, a status this far from the clock Swift is running is a transition (a stall, a seek) */
const DRIFT_S = 0.75;

/** Where a playback stands at `now` (ms), clamped to its length. */
export function playbackPosition(s: VoicePlayback | null, now: number = Date.now()): number {
  if (!s) return 0;
  const p = s.playing ? s.positionS + Math.max(0, now - s.at) / 1000 : s.positionS;
  return s.durationS > 0 ? Math.min(s.durationS, Math.max(0, p)) : Math.max(0, p);
}

/** 0..1 through the item at `now` (ms) — for a React Native fallback's bar. 0 when the length is unknown. */
export function playbackProgress(s: VoicePlayback | null, now: number = Date.now()): number {
  return s && s.durationS > 0 ? playbackPosition(s, now) / s.durationS : 0;
}

/** The 'playback' command's args for Swift: { key, playing, positionS, durationS, at }. Nothing loaded → key "". */
export function playbackCommandArgs(s: VoicePlayback | null): { key: string; playing: boolean; positionS: number; durationS: number; at: number } {
  return s ? { key: s.key, playing: s.playing, positionS: s.positionS, durationS: s.durationS, at: s.at } : { key: "", playing: false, positionS: 0, durationS: 0, at: 0 };
}

/** Pure: is `next` a change worth telling Swift about, given what it was last told? */
export function isPlaybackTransition(prev: VoicePlayback | null, next: VoicePlayback | null): boolean {
  if (!prev || !next) return prev !== next;
  if (prev.key !== next.key || prev.playing !== next.playing) return true;
  if (Math.abs(prev.durationS - next.durationS) > 0.05) return true;
  if (!next.playing) return Math.abs(prev.positionS - next.positionS) > 0.05;
  return Math.abs(playbackPosition(prev, next.at) - next.positionS) > DRIFT_S;
}

/**
 * The screen's one voice player. Send `state` to Swift on change:
 *
 *   const voice = useVoicePlayback({ pauseOn: index });
 *   useEffect(() => { send("playback", playbackCommandArgs(voice.state)); }, [voice.state]);
 *   // onVoiceToggle(key) → voice.toggle(key, urls[path], stored duration)
 *
 * URLs should come from useSignedUrls('voice-letters', …) (lib/images) so an hour-old link is re-signed.
 * @param opts.pauseOn any value; when it changes, playback pauses (Today's page index)
 * @param opts.onChange called with every transition, as state changes (for a command sent without waiting for a render)
 */
export function useVoicePlayback(opts: { pauseOn?: unknown; onChange?: (s: VoicePlayback | null) => void } = {}): VoicePlaybackApi {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const [state, setState] = useState<VoicePlayback | null>(null);
  const told = useRef<VoicePlayback | null>(null);
  const loaded = useRef<{ key: string | null; url: string | null; hint: number }>({ key: null, url: null, hint: 0 });
  /* when the source was last replaced: the old item's last time tick can
     still be queued behind the switch, and must not move the new item's clock */
  const replacedAt = useRef(0);
  /* the reader's last press: a status the player emitted just before it
     (already on its way) must not undo what they asked for */
  const asked = useRef({ playing: false, at: 0 });
  const onChange = useRef(opts.onChange);
  onChange.current = opts.onChange;

  const duration = useCallback((d?: number) => (d && d > 0 ? d : player.duration > 0 ? player.duration : loaded.current.hint || 0), [player]);

  const tell = useCallback((next: VoicePlayback | null, force = false) => {
    if (!force && !isPlaybackTransition(told.current, next)) return;
    told.current = next;
    setState(next);
    onChange.current?.(next);
  }, []);

  const publish = useCallback(
    (playing: boolean, positionS?: number, durationS?: number, force = false) => {
      const key = loaded.current.key;
      if (!key) return;
      const d = duration(durationS);
      const p = Math.max(0, positionS ?? player.currentTime ?? 0);
      tell({ key, playing, positionS: d > 0 ? Math.min(d, p) : p, durationS: d, at: Date.now() }, force);
    },
    [player, duration, tell],
  );

  // the player's own news: an end, a pause from outside (a call, another app), a stall, the real length
  useEffect(() => {
    let wasRunning = false;
    const sub = player.addListener("playbackStatusUpdate", (s: AudioStatus & { error?: string | null }) => {
      if (!loaded.current.key) return;
      if (Date.now() - replacedAt.current < 1000 && s.currentTime > 1 && !s.didJustFinish) return; // the previous item's tick
      if (s.didJustFinish) {
        wasRunning = false;
        const d = duration(s.duration);
        publish(false, d, d);
        return;
      }
      if (s.error) {
        // the file wouldn't load (an expired link, offline): stop rather than run a clock over silence
        wasRunning = false;
        if (__DEV__) console.warn("[voice-playback]", loaded.current.key, s.error);
        publish(false, 0);
        return;
      }
      /* still loading or buffering after play() reads as playing (the key
         shows pause, as pressed); the clock is re-based the moment sound
         actually starts, so Swift's bar doesn't run ahead of a slow load */
      const running = s.timeControlStatus === "playing";
      const intent = s.playing || s.timeControlStatus === "waitingToPlayAtSpecifiedRate";
      const started = running && !wasRunning;
      wasRunning = running;
      if (intent !== asked.current.playing && Date.now() - asked.current.at < 300) return;
      publish(intent, s.currentTime, s.duration, started);
    });
    return () => sub.remove();
  }, [player, publish, duration]);

  /* always pause, never "if playing": an item still loading after play()
     isn't playing yet, and would start the moment it loaded */
  const pause = useCallback(() => {
    if (!loaded.current.key) return;
    asked.current = { playing: false, at: Date.now() };
    player.pause();
    publish(false);
  }, [player, publish]);

  const stop = useCallback(() => {
    if (loaded.current.key) player.pause();
    loaded.current = { key: null, url: null, hint: 0 };
    tell(null, true);
  }, [player, tell]);

  const toggle = useCallback(
    (key: string, url: string | null | undefined, durationS?: number | null) => {
      if (!url) return;
      const cur = loaded.current;
      const press = (playing: boolean) => (asked.current = { playing, at: Date.now() });
      if (cur.key === key) {
        // what the reader asked for, not what AVPlayer is doing yet (it may still be loading)
        if (told.current?.key === key && told.current.playing) {
          press(false);
          player.pause();
          publish(false);
          return;
        }
        press(true);
        const d = duration();
        const pos = player.currentTime || 0;
        const atStart = pos <= END_SLOP;
        const atEnd = d > 0 && pos >= d - END_SLOP;
        if (cur.url !== url && (atStart || atEnd)) {
          // a fresh link and nothing to keep: load it
          cur.url = url;
          replacedAt.current = Date.now();
          player.replace({ uri: url });
          player.play();
          publish(true, 0);
          return;
        }
        if (atEnd) void player.seekTo(0);
        player.play();
        publish(true, atEnd ? 0 : pos);
        return;
      }
      // another item: one player, so this one replaces whatever was loaded
      press(true);
      if (cur.key) player.pause();
      loaded.current = { key, url, hint: durationS && durationS > 0 ? durationS : 0 };
      replacedAt.current = Date.now();
      player.replace({ uri: url });
      player.play();
      publish(true, 0, loaded.current.hint);
    },
    [player, publish, duration],
  );

  // pause when the screen loses focus (a push, a tab switch); unmount releases the player itself
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  useFocusEffect(
    useCallback(() => {
      return () => pauseRef.current();
    }, []),
  );

  // pause when the caller's page changes (not on the first render)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pauseRef.current();
  }, [opts.pauseOn]);

  return { state, toggle, pause, stop };
}
