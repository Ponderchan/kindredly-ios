import { strings } from "../lib/i18n";

/* THE OWNER'S AUDIT, 2026-11-10 — THE CONVERSATION'S NEW WORDS (the chat slice).
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English, and the other eight
   languages (es pt id fr de it ja ko — es is Latin American, pt is pt-BR)
   are to be written natively after this, AS the language, never translated
   (see each key's comment for what it is and where it sits).

   Imported for its side effect by lib/thread-mute (the one place these are
   read).

   MUTE A CORRESPONDENCE (behind the "threadmute" switch, off): the ⋯ menu of
   a conversation and of a kindred's page gets one row above "Report this
   person" (rp.menu.report) and "Block this person" (rp.menu.block). Muted,
   that correspondence sends this reader no push notifications; nothing else
   changes and the other person is never told.

   Reused, no new copy: rp.menu.report, rp.menu.block, rp.menu.never (the
   rows under it), jd.more (VoiceOver's name for the ⋯ once it offers more
   than report and block), set.cantSave and set.push.saveFail (the alert
   when a mute couldn't be saved), and for keeping a pen-pal letter in lore:
   mm.keep, rm.keep.title, rm.keep.body, rm.keep.do, mm.you, lore.from. */

strings(
  /* ── en · English ── */
  {
    // the ⋯ menu's first row while this correspondence still sends pushes, beside the system's bell.slash glyph:
    // one word, sentence case, as short as it can be (it sits over "Report this person"); the verb, not a state
    "tm.mute": "Mute",
    // the same row once muted, beside the system's bell glyph: tapping it lets the pushes come again
    "tm.unmute": "Unmute",
    // VoiceOver only: added after the conversation header's own label while muted ("Mira, Kindred since October 8,
    // Muted"), where a sighted reader sees a small bell.slash beside the name; one word, the state
    "tm.muted": "Muted",
  },
  /* ── es · Español (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "tm.mute": "Silenciar",
    "tm.unmute": "Dejar de silenciar",
    "tm.muted": "Silenciado",
  },
  /* ── pt · Português (Brasil) (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "tm.mute": "Silenciar",
    "tm.unmute": "Reativar",
    "tm.muted": "Silenciado",
  },
  /* ── id · Bahasa Indonesia (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "tm.mute": "Bisukan",
    "tm.unmute": "Bunyikan",
    "tm.muted": "Dibisukan",
  },
  /* ── fr · Français (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "tm.mute": "Mettre en sourdine",
    "tm.unmute": "Réactiver",
    "tm.muted": "En sourdine",
  },
  /* ── de · Deutsch (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "tm.mute": "Stummschalten",
    "tm.unmute": "Stummschaltung aufheben",
    "tm.muted": "Stummgeschaltet",
  },
  /* ── it · Italiano (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "tm.mute": "Silenzia",
    "tm.unmute": "Riattiva",
    "tm.muted": "Silenziata",
  },
  /* ── ja · 日本語 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "tm.mute": "ミュート",
    "tm.unmute": "ミュート解除",
    "tm.muted": "ミュート中",
  },
  /* ── ko · 한국어 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "tm.mute": "알림 끄기",
    "tm.unmute": "알림 켜기",
    "tm.muted": "알림 꺼짐",
  },
);
