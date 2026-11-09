import { useEffect, useRef } from "react";
import type { KNotePageCommands } from "../../../modules/kindredly-ui/src/NotePages";
import { swiftAudioLook, useAudioCardLook, useOwnPlayer } from "../../components/AudioCard";
import { t, useLang } from "../../lib/i18n";
import "../../data/strings-step5-platform"; // vo.play, vo.pause

/* A JOURNAL PAGE'S VOICE CARD, DRAWN BY THE SWIFT PAGE (batch 3, 2026-11-09; the "notevoice"
   switch, off by default). The page's voice island held AudioCard, which inside a Swift page is
   always the React Native row (a Host is never nested in a Host), so the "audiocard" switch never
   reached it. With "notevoice" on, KNotePageView draws the same row itself in its voice slot
   (KVoiceSlot → KAudioCardRow, the composers' card) and this keeps what AudioCard kept: the voice
   file's own expo-audio player (useOwnPlayer: plays the url, starts over when pressed at the
   end) and the row's look for each moment (useAudioCardLook: full size, in the mood's ink as the
   island's AudioCard had it — `tint`, Midnight's mood fill and all), with VoiceOver's vo.play /
   vo.pause as the island's AudioCard said them. Mounted beside the page's Host while there is a
   voice; renders nothing.

   What it shows goes to the page as its `voice` command (only when it changes, and all of it
   again when the view attaches: `resend`); the disc comes back through the page's onVoice to
   `toggle`. When it goes, the slot is told to go back to the island. */

export type NoteVoiceLink = {
  /** the page's `voice` command */
  send: (cmd: KNotePageCommands["voice"]) => void;
  /** set by the driver: what the disc does (null while there is none) */
  toggle: (() => void) | null;
  /** set by the driver: say it all again (the view re-attached) */
  resend: (() => void) | null;
};

/** The island again: Swift draws nothing of its own in the slot. */
export const VOICE_SLOT_ISLAND: KNotePageCommands["voice"] = {
  showCard: false,
  card: { look: { ink: "", glyph: "", panel: "", edge: "", timeInk: "", time: "", padding: 14, radius: 14, disc: 44, discRadius: 22, glyphSize: 15, glyphNudge: 2, barRadius: 2, bars: [], mono: "semibold" }, playing: false, label: "" },
  island: true,
};

export function NoteVoiceDriver({ link, url, durationS, tint }: { link: NoteVoiceLink; url: string; durationS?: number | null; tint: string }) {
  useLang();
  const own = useOwnPlayer(url, durationS);
  const latest = useRef(own);
  latest.current = own;
  const look = useAudioCardLook({ tint, playing: own.playing, positionS: own.positionS, durationS: own.durationS });
  const cmd: KNotePageCommands["voice"] = {
    showCard: true,
    card: { look: swiftAudioLook(look), playing: own.playing, label: own.playing ? t("vo.pause") : t("vo.play") },
    island: false,
  };
  const json = JSON.stringify(cmd);
  const sent = useRef("");

  useEffect(() => {
    link.toggle = () => latest.current.toggle();
    link.resend = () => {
      if (sent.current) link.send(JSON.parse(sent.current) as KNotePageCommands["voice"]);
    };
    return () => {
      link.toggle = null;
      link.resend = null;
      sent.current = "";
      link.send(VOICE_SLOT_ISLAND);
    };
  }, [link]);
  useEffect(() => {
    if (json === sent.current) return;
    sent.current = json;
    link.send(JSON.parse(json) as KNotePageCommands["voice"]);
  }, [json, link]);
  return null;
}
