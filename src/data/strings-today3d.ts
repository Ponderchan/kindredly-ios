import { strings } from "../lib/i18n";

/* TODAY 3d × 25b — THE TODAY TAB'S AND THE PUBLISH ENTRY'S NEW WORDS (2026-10-16).
   ────────────────────────────────────────────────────────────────────────
   English only for now: the other eight languages are written natively in a
   later pass (written AS the language, never translated — see the comments
   on each key for what it is and where it sits). Until then t() falls back
   to English for these keys.

   Imported for its side effect by useTodayDesk (both renderers and the dev
   page go through it), NativeTabBar (the + panel) and TodayRN.

   Wren's name is never written into a line: {name} is the reader's own
   courier name (useWrenName), and a two-word name must read right in it.
   Every number in these lines is a count the phone holds (owner W33); a
   zero has its own sentence.

   Reused, no new copy: ld.today, ld.reply.a11y, ld.next.a11y,
   ld.unfold(.a11y), ld.voiceLetter, ld.writeBackPh, ld.send, ld.arrived,
   ld.arrivedKept, ld.toast.thread, the reply hint keys, rp.menu.*,
   vo.play / vo.pause, net.offline.title, cod.wholePost, cod.nextPost,
   ff.title, ff.hint, pc.post, wren.trackClose. */

strings(
  /* ── en ── */
  {
    // the control band under the card: the label under the glass disc (its number is the letters left today), and under the ink disc;
    // mono 10 caps, tracking .16em, at most 7 characters each (REPLY has no arrow: ld.replyArrow keeps one)
    "ld.next": "NEXT",
    "ld.replyBtn": "REPLY",
    // VoiceOver: the NEXT button, with how many letters are left on today's desk (plural forms; ja/ko counters)
    "ld.left.a11y.1": "Next letter. One left today.",
    "ld.left.a11y": "Next letter. {n} left today.",
    // the reply field's placeholder for a signed letter; {name} is the pen pal's number in the reader's language
    // (penPalName: "No. 7273", "N.º 7273", "Nr. 7273"); lowercase, like ld.writeBackPh, which stays for unsigned letters
    "ld.writeBackTo": "write back to {name}…",
    // the card's ⋯ menu and its VoiceOver action: restore the letter just passed (one step only; offered while it is still on the desk)
    "ld.bringBack": "Bring back the last letter",
    // the card shown when the first load found no connection and nothing was kept (under net.offline.title)
    "ld.offlineDesk": "Your letters will be here when you're back online.",
    // VoiceOver: the empty card while today's letters load
    "ld.loading.a11y": "Today's letters are on their way.",
    // the countdown to her return, hours and minutes, mono caps ("8H 06M"; 8時間06分, 8시간 06분); {m} is always two digits
    "ld.countdown": "{h}H {m}M",
    // the chip that pops up when the closed bag is tapped, before the countdown ("NOT YET · 8H 06M")
    "ld.notYet": "NOT YET",

    // HER LETTER, when the desk is done: the mono eyebrow at its top (mono 10, .16em); use the catalogue's word for courier
    "wl.from": "FROM YOUR COURIER",
    // her letter, first line: how many letters went past the desk today (passed + answered, exact; at most 15)
    "wl.count.0": "Nothing came past your desk today.",
    "wl.count.1": "That's one. I counted twice.",
    "wl.count.N": "That's {n}. I counted twice.",
    // her letter: how many of them the reader answered (left out when none)
    "wl.replied.1": "You wrote back to one.",
    "wl.replied.N": "You wrote back to {n}.",
    // her letter: correspondences waiting on a reply from the reader (left out when none)
    "wl.waiting.1": "One is still waiting on you. It'll keep.",
    "wl.waiting.N": "{n} are still waiting on you. They'll keep.",
    // her letter: when she's back; {t} is 8 in the morning in the reader's clock ("8:00 AM", "8:00"). Never "tomorrow":
    // between midnight and eight it is the same morning. First person, in her voice
    "wl.next": "I'm back with the next ones at {t}.",
    // her letter, last line: when she can play her game (the window below offers a lap)
    "wl.invite": "Go find one small thing worth putting in a letter — or come fly a lap with me.",
    // her letter, last line: when she can't play (still an egg, or wilted)
    "wl.invitePlain": "Go find one small thing worth putting in a letter.",
    // her signature: an em dash and the first letter of her name ("— W."); {initial} and {name} are both given,
    // so a language without initials (ja/ko) may sign with the whole name
    "wl.sign": "— {initial}.",
    // VoiceOver: her letter as one element
    "wl.a11y": "A letter from {name}",
    // the label on tomorrow's bag, mono caps, at most 14 characters; {t} is the opening hour in the reader's clock.
    // No number: the bag is a picture of the next desk, and nothing in it is counted yet
    "bag.opens": "OPENS AT {t}",
    // the window to her game, under THAT'S ALL FOR TODAY: 15/600 on one line, about 170 pt (around 20 Latin
    // characters with a long name); VoiceOver reads ff.title + ff.hint instead
    "win.fly": "Fly a lap with {name}",

    // THE + PANEL on every tab but Today: her question above the two rows, in italics — who the
    // writing is for (a stranger, carried by her; or yourself), true at any hour
    "pub.ask": "“Who's this one for?”",
    // the letter row: title, then what happens to it
    "pub.letter": "Write a letter",
    "pub.letterSub": "{name} carries it to a stranger",
    // the letter row, right: the free plan's letters left today (hidden for First Class)
    "pub.left": "{n} LEFT",
    // the diary row: title, then what it holds
    "pub.note": "Diary note",
    "pub.noteSub": "Stays with you · text, voice, photo",
    // THE + ON TODAY: the labels under the two round buttons that pop up from the +
    "pub.popLetter": "LETTER",
    "pub.popNote": "NOTE",
  },
  /* ── es ── (written natively in a later pass) */
  {},
  /* ── pt ── */
  {},
  /* ── id ── */
  {},
  /* ── fr ── */
  {},
  /* ── de ── */
  {},
  /* ── it ── */
  {},
  /* ── ja ── */
  {},
  /* ── ko ── */
  {},
);
