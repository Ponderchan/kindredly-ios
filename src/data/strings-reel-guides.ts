import { strings } from "../lib/i18n";

/* THE LETTERS, STAMPS AND COURIER GUIDE REELS — THEIR ONE NEW WORD (owner, 2026-10-25).
   ────────────────────────────────────────────────────────────────────────
   Three guide reels brought up to 1.0.5 (components/guide-reel/letters,
   stamps, courier): strangers' desks are frosted windows, the + on Today
   pops Letter and Note, a read desk ends on tomorrow's bag, the stamps
   reel ends on Stamp Press, and the courier's knocks are the two switches
   Settings has. Every other word they show is the product's own, already
   in nine languages: pub.popLetter / pub.popNote and bag.opens from
   strings-today3d, cod.wholePost, the press's camera hint, #topic
   placeholder, filter names and 1ST from strings-stamps2 (cs2.cam.hint,
   cs2.ed.topicPh, cs2.ed.f.*, cs2.ed.fcBadge), and set.sec.quiet,
   set.notify.title and set.knock.title from Settings. What the stamps reel
   lacked was a #topic for the moment it presses.

   English only for now: every other language falls back to it (t() does)
   until the next copy pass writes it there. Imported for its side effect by
   the reel. */

strings(
  /* ── en ── */
  {
    // the #topic named in the stamps guide reel's Stamp Press scene, on a photo stamp of a sunrise over a green hill
    // (the "#" is the app's, not part of the word). Lower case, a few words, at most 24 characters (cs2.ed.count);
    // the kind of name a reader gives a moment they photographed
    "gd.stamps.pressTopic": "first light",
  },
  /* ── es ── */
  {},
  /* ── pt ── */
  {},
  /* ── id ── */
  {},
);
