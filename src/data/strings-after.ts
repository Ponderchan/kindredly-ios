import { strings } from "../lib/i18n";

/* TODAY, AFTER FIFTEEN — THE WORDS (docs/today-after-fifteen.md; the owner's decisions of 2026-11-11).
   ────────────────────────────────────────────────────────────────────────
   The three pages Today becomes once the day's last letter has gone past (the mailbox, the
   receipt, bedtime), the small daily thing they carry, and the strip to her game. What is
   already the app's is reused, not rewritten: "You wrote back to {n}." (wl.replied.*), THAT'S ALL
   FOR TODAY (cod.wholePost), "{name} IS BACK IN" (cod.nextPost), the countdown (ld.countdown),
   "Fly a lap with {name}" (win.fly), "Write a letter" (pub.letter), Undo (td.undo*). These are
   only what is new.

   WHO SPEAKS. The courier is "her" in every language that marks it (the prototype said he / his;
   the live app says her). She has a name the reader gave her: {name}. Her spoken lines are the
   ones inside quotation marks: short, lower case in English (her voice on her card: fl.*), warm,
   a little dry, never cute about a status. Everything else is plain UI.

   EVERY NUMBER IS REAL. {n} is what went past the desk today (1…15), or the replies, or the
   streak's days. A line never claims more than its number says; the forms for one are separate
   keys because nine languages decline them differently.

     af.strip.eyebrow     the strip's small label, drawn in capitals: she is off duty
     af.strip.hint        VoiceOver: what the strip does
     af.box.say.*         the mailbox: her line in the window (how many letters went past)
     af.box.hint          under it, capitals: what to do next (there is a cord at the right)
     af.box.pinned        why: she left something on the shutter
     af.box.slot          under the slot, capitals, one line across the box (about 36 characters):
                          the slot still takes letters though the day is over
     af.box.slotOpening   the same line for a second after a tap, while the envelope falls in
     af.box.closed        the sign on the shutter: one word, large
     af.box.back          under it, capitals; {t} is 8 in the morning in the reader's clock
     af.box.pull / lift   under the cord's ring, capitals, 4–6 characters
     af.box.*.a11y        VoiceOver: the cord, shutter up / shutter down
     af.thing.fact        the small thing's label when it is her fact, capitals; {n} its number
     af.thing.line        …when it is a stranger's line (she adds no comment to it, anywhere)
     af.quote             a stranger's line in the language's own quotation marks
     af.sleepTalk         her fact as sleep-talk on the bedtime card: the fact between ellipses,
                          in the language's quotation marks
     af.keep / kept       the capsule, capitals: keep it / it is kept (the ✦ stays)
     af.keepStub          the receipt's button for the same thing, after it is torn off
     af.keep.hint         VoiceOver: where Keep puts it (the Lore shelf's own name: lore.title)
     af.lore.fact         the kept fact's heading on that shelf
     af.rc.say.*          the receipt: her line over the printer (day: how many; week: the week)
     af.rc.shop           the receipt's head: the shop's name
     af.rc.courier        on its second line, capitals: who served
     af.rc.read … stay    the receipt's rows, capitals, each on one line with its number at the
                          right (at most 18 characters): letters read · letters answered · the
                          topic the reader stayed on longest (only printed when the phone timed it)
     af.rc.next           when the next letters come ({t} at the right)
     af.rc.print.*        the button: print the day's / the week's receipt
     af.rc.printing       while it prints, capitals
     af.rc.tear           the button once it is printed
     af.rc.share.*        the button once it is torn off: share the picture
     af.rc.a11y           VoiceOver: what the printed paper is, before its rows are read
     af.bed.say.*         bedtime: her lines. idle: when the page opens ({n} letters); fed: after
                          the snack; full: a second snack; pat / pat.1 / pat.0: after a pat, with
                          the replies ({n}, one, none); needSnack / needPat: lights out tapped early
     af.bed.snack …       the three steps: a name (one or two words), what it is, what it became
     af.bed.locked        under Lights out until 1 and 2 are done
     af.bed.sleepTag      over her fact once she sleeps, capitals
     af.bed.streak.*      the bar's left line: days in a row ({n}; one; none before tonight)
     af.bed.makes         its right line before lights out: what tonight brings the count to
     af.bed.week          …after lights out when the count is a whole number of weeks
     af.bed.seeYou        …after lights out otherwise; {t} is 8 in the morning
     af.bed.next          the bar's right label before the hour ("next letters 8:00 AM")
     af.bed.bird.a11y     VoiceOver: her, as a button

   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same
   keys: src/data/strings-after.test.ts checks they agree and that the labels fit where they sit
   (node src/data/strings-after.test.ts). Consumers import this file for its side effect. */

strings(
  /* ── en · English ── */
  {
    "af.strip.eyebrow": "{name}’s off the clock",
    "af.strip.hint": "Opens Free Flight",

    "af.box.say.1": "“that’s one. i counted twice.”",
    "af.box.say.N": "“that’s {n}. i counted twice.”",
    "af.box.hint": "Pull the cord →",
    "af.box.pinned": "I pinned something to the shutter.",
    "af.box.slot": "The slot stays open · drop a letter",
    "af.box.slotOpening": "Opening your letter paper…",
    "af.box.closed": "Closed",
    "af.box.back": "Back at {t}",
    "af.box.pull": "Pull",
    "af.box.lift": "Lift",
    "af.box.pull.a11y": "Pull the shutter down",
    "af.box.lift.a11y": "Lift the shutter",

    "af.thing.fact": "{name}’s fact · No. {n}",
    "af.thing.line": "Line of the day",
    "af.quote": "“{line}”",
    "af.sleepTalk": "“…{fact}…”",
    "af.keep": "Keep",
    "af.kept": "Kept ✦",
    "af.keepStub": "Keep the stub",
    "af.keep.hint": "Saves it to your Lore",
    "af.lore.fact": "{name}’s fact, No. {n}",

    "af.rc.say.1": "“that’s one. there’s a little extra at the bottom.”",
    "af.rc.say.N": "“that’s {n}. there’s a little extra at the bottom.”",
    "af.rc.say.week": "“that’s the week. there’s a little extra at the bottom.”",
    "af.rc.shop": "Kindredly Post",
    "af.rc.courier": "Courier {name}",
    "af.rc.read": "Letters read",
    "af.rc.replied": "Written back",
    "af.rc.stay": "You stayed on",
    "af.rc.next": "Next delivery",
    "af.rc.print.day": "Print today’s receipt",
    "af.rc.print.week": "Print this week’s receipt",
    "af.rc.printing": "Printing…",
    "af.rc.tear": "Tear it off",
    "af.rc.share.day": "Share my day",
    "af.rc.share.week": "Share my week",
    "af.rc.a11y": "Receipt",

    "af.bed.say.idle.1": "“that’s one. i’m wrecked anyway.”",
    "af.bed.say.idle.N": "“that’s {n}. i’m wrecked.”",
    "af.bed.say.fed.1": "“one letter is hungry work. thanks.”",
    "af.bed.say.fed.N": "“{n} letters is hungry work. thanks.”",
    "af.bed.say.full": "“i’m full. honest.”",
    "af.bed.say.pat.0": "“mm. right there.”",
    "af.bed.say.pat.1": "“you wrote back to one. proud of you.”",
    "af.bed.say.pat.N": "“you wrote back to {n}. proud of you.”",
    "af.bed.say.needSnack": "“not yet. snack first.”",
    "af.bed.say.needPat": "“one pat. then lights.”",
    "af.bed.snack": "Snack",
    "af.bed.snack.sub": "a few seeds",
    "af.bed.snack.done": "fed",
    "af.bed.pat": "Pat",
    "af.bed.pat.sub": "one, gently",
    "af.bed.pat.done": "patted",
    "af.bed.lights": "Lights out",
    "af.bed.lights.sub": "then she sleeps",
    "af.bed.lights.done": "asleep",
    "af.bed.locked": "after 1 and 2",
    "af.bed.sleepTag": "{name}, talking in her sleep",
    "af.bed.streak.0": "A new run",
    "af.bed.streak.1": "1 day in a row",
    "af.bed.streak.N": "{n} days in a row",
    "af.bed.makes": "tonight makes {n}",
    "af.bed.week": "a full week",
    "af.bed.seeYou": "see you at {t}",
    "af.bed.next": "next letters",
    "af.bed.bird.a11y": "Pat {name}",
  },
  /* the other eight are written natively, not translated (see the header): until they land,
     every language falls back to the English above */
  {},
  {},
  {},
);
