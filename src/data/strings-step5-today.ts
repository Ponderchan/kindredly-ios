import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE TODAY TAB'S NEW WORDS (slice "today").
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English in every language, and
   step 6 writes the eight others natively (written AS the language, not
   translated). useTodayDesk imports this file for its side effect (both
   renderers and the dev page go through it), and so does CloseOfDay.

   All of them are for VoiceOver: the card is one element whose moves are
   actions (↑ PASS is only a label for sighted readers), the envelopes of
   the first arrival had no names at all, and the blind's cord could not be
   pulled without a finger.

   Everything else the tab says reuses keys already in nine languages:
   ld.today / closed / allRead / pass / replyArrow / send / unfold /
   voiceLetter / writeBackPh / threadOpensTwo / replyThreadOpens /
   flightFull(.title/.body/.ok) / toast.thread / unsigned / arrived /
   arrivedKept / gone.* / replyFail / signup.reason / xlFail.* / close /
   both.label / foldBack / writeBack / written / onItsWay, ld.unreachable.*
   and fail.* (the data slice), read.invite, mm.original, mm.translating,
   wo.strip.*, rp.menu.* (Report / Block, and rp.menu.a11y for the ⋯),
   vo.play / vo.pause, ui.overLimit, cp.gate.*, cp.fail.title, cp.signin.*,
   net.offline.*, net.slow, cod.*. */

strings(
  /* ── en ── */
  {
    // VoiceOver: the card's "write back" action, and the hint on the resting pill
    "ld.reply.a11y": "Write back",
    // VoiceOver: the card's unfold action (UNFOLD ↓ shows only on a folded letter)
    "ld.unfold.a11y": "Unfold the whole letter",
    // VoiceOver actions on a card: the swipe, without a swipe
    "ld.next.a11y": "Next letter",
    "ld.prev.a11y": "Previous letter",
    // VoiceOver: the three envelopes of the first arrival, and where each stands
    "ld.env.a11y": "Letter {n} of {total}",
    "ld.env.read": "Read",
    "ld.env.open": "Open now",
    "ld.env.sealed": "Not opened yet",
    // VoiceOver: pulling the blind's cord, as an action on the cord
    "cod.close.a11y": "Close the day",
  },
  /* es, pt, id: step 6 */
  {},
  {},
  {},
);
