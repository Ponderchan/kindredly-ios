import { strings } from "../lib/i18n";

/* THE NEW ONBOARDING — EVERY NEW WORD IT NEEDS (storyboard 2026-10-18,
   .claude/onboarding-story/final/storyboard.md §6; owner's decisions at its top).
   ────────────────────────────────────────────────────────────────────────
   Only the new run (screens/onboarding, identity switch on) reads these. The
   old run (screens/onboarding/legacy) keeps its own ob.* keys, and the new run
   reuses the ob.* keys the storyboard keeps (§12 "Strings": launch.*,
   ob.write.ph, ob.cue.*, ob.hatched.*, ob.born.word, ob.reading.*,
   ob.naming.*, ob.flight.*, ob.age.*, ob.continueApple/Google/Email,
   ob.email.*, ob.code.*) and the identity keys in strings-identity (id.ob.*,
   zd.*), never copying them here.

   ENGLISH FIRST. The two screen agents wrote the English for their screens in
   their own section below (one key per line, a comment on each saying what it
   is, where it sits and how long it may run). All nine languages are written
   (2026-10-19 copy pass): each block was written AS its language from a short
   brief per screen, then read blind as that language's editor (translationese,
   register, plurals, placeholders) and measured with the bundled Inter and
   Plex Mono on a 375pt phone, so a line that must hold one line holds it —
   never translated line by line. A new key goes in every block, or t() falls
   back to English for it.

   Voice: the egg speaks in one short lower-case line, warm and a little dry;
   headlines are sentence case; nothing says "18+" before a date is entered.
   Placeholders: {name} the bird's name, {n} a number.

   Choices the blocks share, so the next writer keeps them:
   - The nouns are the catalogue's (strings.ts, strings-identity): courier =
     mensajero / mensageiro / kurir / messagère / Botin / messaggera / 伝書鳥 /
     전령새; stamp = sello / selo / perangko / timbre / Marke / francobollo /
     切手 / 우표; kindred, pen name, "strangers" and the frost (cristal
     empañado, vidro embaçado, kaca buram, givre, Milchglas, vetro
     smerigliato, すりガラス, 뿌연 유리) exactly as strings-identity has them.
   - The egg's voice warms line by line, the way each language plays
     hot-and-cold: es tibio → casi calentito → calentito; it al calduccio →
     fuochino → caldo caldo; fr au chaud → ça chauffe → bien au chaud; de
     warm → wärmer → richtig warm. ja speaks in soft kana and ko in 반말,
     like Wren; the bird on 13 speaks the same way.
   - The pronoun chips follow pr.* (ella/él/neutro, iel, lei/lui/loro,
     perempuan/laki-laki/netral, 彼女/彼/その人, 그녀/그/그 사람), except de,
     which says neutral rather than "sie (Plural)" and asks "Wie soll dein
     Vogel von dir sprechen?", because a capital Sie opening the headline
     reads as the formal you. The bird's chips on 10: id cewek / cowok (what
     people say of a pet), ja その子, ko 그 아이.
   - Nothing agrees with the reader's gender: no bienvenido / bentornato
     (Hola de nuevo, Eccoti di nuovo, Te revoilà), "Soy yo", not "Esta soy
     yo", and no invitado (Sin cuenta, todo se queda…).
   - {name} keeps strings-identity's rules. On 1, 8 and 12 it is a courier
     name: no article and nothing agreeing with it (fr "de {name}" is safe:
     the French list has no keepsake that elides). On 10–13 and the slip it
     is the bird's name, which only ko has to watch: every particle after it
     is one that never changes with the last syllable (에게, 에게서, 의), or
     there is none ("이름은 {name}", "{name}, 새 옷 입고 싶대요").
   - The placeholder on 10 is a pet's name in each language (Pipo, Pipoca,
     Ciko, Pépin, Otto, Pino, おもち, 콩이), not Otis.
   - The clock line keeps {time} first in the Latin languages, because Intl
     writes the weekday in lower case there (sábado, samedi); ja and ko say
     the day first.
   - 1a's two links keep the English order, Terms then Privacy: LinkedLine
     hands the first bracket to the terms. */

strings(
  {
    /* ── shared (the foundation) ─────────────────────────────────────── */
    "ob2.back": "Back", // VoiceOver label of the ‹ key on 2–8
    // the egg's voice under the nest egg (one line, ≤ 28 characters, lower case, a full stop)
    "ob2.voice.egg": "something's in here.", // 2, under the hero egg
    "ob2.voice.birthday": "warm. not ready.", // 3
    "ob2.voice.pronoun": "it's listening.", // 4
    "ob2.voice.face": "almost warm.", // 5
    "ob2.voice.envelope": "very warm.", // 6
    "ob2.voice.ready": "ready for words.", // 6 → 7, as the four pips join into one ring
    "ob2.voice.letter": "reading over your shoulder.", // 7, the egg on the flap
    "ob2.voice.stamp": "waiting.", // 8

    /* ── screens 1–6, 1a, 3x (the 1–6 agent writes here) ─────────────── */
    // @ob2:screens-1-6
    /* [Square brackets] mark the part of a line that is a link or a key; the copy agent keeps
       exactly one bracketed span where the English has one (screens/onboarding/screens/
       s01-signin.tsx LinkedLine draws it underlined and makes it pressable). */
    // 1 · the doorstep
    "ob2.doorstep.app": "Letters to strangers, carried by a bird you hatch.", // the app line under "kindredly"; 2 lines max at 15pt
    "ob2.doorstep.key": "Hatch my courier", // the acid key; ≤ 22 characters
    "ob2.doorstep.signin": "Been here before? [Sign in]", // the text key under it; opens 1a; ≤ 34 characters
    "ob2.doorstep.s1.head": "Say the thing you'd never post.", // slide 1's headline; two lines reserved at 29pt
    "ob2.doorstep.s1.chip": "no likes. no followers. just letters.", // slide 1's chip on the card's top edge (after a green dot); ≤ 40
    "ob2.doorstep.s1.letter": "i keep rehearsing conversations i will never have", // the sample line typed on slide 1's letter, lower case, written by us; ≤ 55
    "ob2.doorstep.s2.head": "A bird finds someone who writes like you.", // slide 2's headline; two lines
    "ob2.doorstep.s2.chip": "{name} wrote back", // slide 2's chip; {name} = the sample courier name in the reader's language ("Sunday Kite")
    "ob2.doorstep.s3.head": "Five letters each. Then you trade names.", // slide 3's headline; two lines
    "ob2.doorstep.s3.chip": "5 of 5 · names traded", // slide 3's chip; ≤ 30
    "ob2.doorstep.s3.count": "{n} OF 5", // slide 3's mono label over the two meters (n = 0…5); ≤ 10
    "ob2.doorstep.s3.you": "you", // slide 3: the name under the second window (yours: you have no courier name to yourself); ≤ 10
    "ob2.doorstep.slideA11y": "{head} Example {n} of 3.", // VoiceOver: one slide of the showcase card; {head} its headline
    "ob2.doorstep.lang": "Language", // VoiceOver: the "English ▾" chip (only shown when the phone's language isn't one of the nine)
    "ob2.doorstep.langCancel": "Cancel", // the language list's cancel row (the system action sheet)
    // 1a · the sign-in sheet
    "ob2.signin.title": "Welcome back.", // the sheet's title, Inter 800 26
    "ob2.signin.line": "Sign in the way you did last time.", // under it
    "ob2.signin.terms": "By continuing you agree to our [Terms] and [Privacy Policy].", // TWO bracketed links here: Terms, then the privacy policy
    "ob2.signin.new": "New here? [Start without an account →]", // the sheet's last line: closes it and starts screen 2
    "ob2.signin.close": "Close", // VoiceOver: the dimmed area above the sheet
    // 2 · your egg
    "ob2.egg.head": "This one's yours.", // one line at 29pt
    "ob2.egg.line": "Pick a shell. It leaves a birthmark on whoever's inside.", // two lines max
    "ob2.egg.key": "It's mine", // the acid key
    "ob2.egg.shellA11y": "{name} shell", // VoiceOver: a shell tile ("Moonstone shell")
    // 3 · the birthday (the gate: nothing here says 18+ before a date is set)
    "ob2.birthday.head": "When's your birthday?",
    "ob2.birthday.before": "For your star sign. The date itself stays private.", // before the wheel is turned
    "ob2.birthday.after": "{sign}. That shows on your letters. Your birthday never does.", // once a date is set; {sign} = zd.* name, its line glyph drawn before it
    "ob2.birthday.key": "Next", // the acid key (dim until the wheel is turned)
    "ob2.birthday.wheelA11y": "Birthday: {month}, {day}, {year}", // VoiceOver: the wheel card
    "ob2.birthday.month": "Month", // VoiceOver: the wheel's first column (adjustable)
    "ob2.birthday.day": "Day", // VoiceOver: the second column
    "ob2.birthday.year": "Year", // VoiceOver: the third column
    // 3x · not yet
    "ob2.underage.head": "Not yet.",
    "ob2.underage.line": "Kindredly is strangers writing to strangers, so it's for grown-ups. Come back when you're 18.",
    "ob2.underage.change": "Wrong year? Change it", // 3x: the one way back to the wheel, once per phone
    // 4 · she, he or they
    "ob2.pronoun.head": "She, he, or they?",
    "ob2.pronoun.line": "So your bird gets you right. She or he puts a small ♀︎ or ♂︎ by your name. They shows nothing.", // keep ♀︎ ♂︎ as text glyphs
    "ob2.pronoun.she": "she / her", // a chip (the ♀ line glyph is drawn after it)
    "ob2.pronoun.he": "he / him", // a chip (♂ drawn after it)
    "ob2.pronoun.they": "they / them", // a chip (nothing drawn after it)
    "ob2.pronoun.skip": "Skip, say they", // the text key
    "ob2.pronoun.hint": "ONE TAP PICKS AND MOVES ON", // mono label where the primary key would be; ≤ 30
    // 5 · a face
    "ob2.face.head": "Pick a face.",
    "ob2.face.line": "Strangers see frosted glass. A kindred sees this.",
    "ob2.face.key": "This is me", // the acid key (dim until a face is picked)
    "ob2.face.later": "Later", // the text key
    // 6 · you, to a stranger
    "ob2.envelope.head": "This is you, to a stranger.", // two lines max
    "ob2.envelope.thinking": "Your courier is thinking of a name…", // in the name's place until the session exists
    "ob2.envelope.to": "to: someone who writes like you", // the address line on your envelope, italic serif; ≤ 34
    "ob2.envelope.caption": "A stranger's courier names you, so nobody can look you up. In other languages it picks a name in theirs.", // under the card; 3 lines max at 13pt
    "ob2.envelope.onLetters": "{glyph} on my letters", // a switch row; {glyph} is where the ♀/♂ or the sign's line glyph is drawn
    "ob2.envelope.signA11y": "Show your star sign, {sign}, on your letters", // VoiceOver: the sign's switch
    "ob2.envelope.stripLabel": "AFTER FIVE LETTERS EACH", // mono label over the reveal strip; ≤ 26
    "ob2.envelope.stripSign": "YOU EACH SIGN", // mono label over the empty signature line; ≤ 16
    "ob2.envelope.stripLine": "Then the frost clears, and you each sign your pen name.", // under the strip; 2 lines max at 12.5pt
    "ob2.envelope.key": "Looks right", // the acid key

    /* ── screens 7–13, 8a, 11a, the Today slip (the 7–13 agent writes here) ── */
    // @ob2:screens-7-13
    // 7 · the first letter (the sheet is the screen). Kept: ob.write.ph (the page), ob.cue.1..18 (the cue chip)
    "ob2.letter.clockNight": "{time}, {day}. Someone out there is up too.", // 7, the clock line from the phone, 21:00–05:00 ({time} "11:40 pm", {day} "Saturday"); one line, ≤ 50 with them
    "ob2.letter.clockDay": "{time}, {day}. Somewhere a stranger is checking the post.", // 7, the same line by day (05:00–21:00); one line, ≤ 58 with them
    "ob2.letter.head": "Write your first letter.", // 7 headline, left-aligned, one line on a 393pt phone (≤ 26)
    "ob2.letter.line": "A stranger reads it. Your egg reads it first.", // 7 under the headline, one line (≤ 48)
    "ob2.letter.stuck": "Stuck?", // 7, the cue chip's mono label before the cue (caps, ≤ 8)
    "ob2.letter.stuckA11y": "Another idea", // VoiceOver hint on the cue chip (tap deals another cue)
    "ob2.letter.left": "{n} more to travel", // 7, the meter under the page: weighted characters still missing (mono, ≤ 22)
    "ob2.letter.ready": "that'll travel ✓", // 7, the meter at 20 weighted characters (mono, lower case, ≤ 22)
    "ob2.letter.rule": "No links, emails or phone numbers. Those don't get carried.", // 7 house rule, small, beside the key (2–3 lines; exactly what screenNow blocks)
    "ob2.letter.ruleHit": "There's a link, an email or a number in it. Take it out and it travels.", // 7, the house rule when the letter has one (the key stays dim); 2–3 lines
    "ob2.letter.key": "Stamp it", // 7 primary key, dim until 20 (≤ 12)

    // 8 · your first stamp (+ 8a, the tray), and the envelope front that 8 and 12 draw
    "ob2.stamp.eyebrow": "YOUR FIRST STAMP", // 8, mono label over the big stamp (caps, ≤ 22)
    "ob2.stamp.line": "Picked from what you wrote. It tells a stranger the mood before they open it.", // 8, under the stamp's name, 2 lines
    "ob2.stamp.linePicked": "Your pick. It tells a stranger the mood before they open it.", // 8, the same line once they picked another from 8a (it was no longer "picked from what you wrote")
    "ob2.stamp.key": "Stick it on", // 8 primary key (≤ 16)
    "ob2.stamp.another": "Pick another", // 8 outlined key under it: opens 8a (≤ 18)
    "ob2.stamp.trayHead": "Pick your first stamp", // 8a, the tray sheet's title (≤ 26)
    "ob2.stamp.trayDone": "Done", // 8a, closes the tray sheet (≤ 10)
    "ob2.stamp.to": "to: someone who writes like you", // 8 and 12, the address line on your envelope front (Newsreader italic, ≤ 34)
    "ob2.stamp.envA11y": "Your envelope, as a stranger sees it: {name}", // VoiceOver on the envelope front

    // 9 · the hatch. Kept: ob.hatch.eyebrow, ob.hatch.title, ob.hatched.plain/em, ob.born.word/noWord, ob.sealed.*
    "ob2.hatch.tap": "tap it", // 9, the hint under "It heard enough." (a tap helps the knocks); lower case, ≤ 12
    "ob2.hatch.rhythm": "RHYTHM", // 9, read-out chip 1 (mono caps, ≤ 12; three fit one row)
    "ob2.hatch.pauses": "PAUSES", // 9, read-out chip 2
    "ob2.hatch.tells": "SMALL TELLS", // 9, read-out chip 3
    "ob2.hatch.key": "Name it", // 9 primary key, dim until it has hatched (≤ 14)

    // 10 · name it. Kept: ob.naming.goesBy / goesByThey (the label), ob.naming.reserved
    "ob2.name.head": "It needs a name.", // 10 headline (≤ 24)
    "ob2.name.line": "It'll sign every note it writes you.", // 10 under the headline, one line (≤ 40)
    "ob2.name.ph": "Otis", // 10, the field's placeholder: a name that reads as a name in this language (≤ 10)
    "ob2.name.dice": "Roll a name", // VoiceOver on the dice in the field
    "ob2.name.she": "she", // 10, the bird's pronoun chips, lower case (each ≤ 8)
    "ob2.name.he": "he",
    "ob2.name.they": "they",
    "ob2.name.key": "That's {name}", // 10 primary key with the name typed (≤ 22 with a 16-letter name)

    // 11 · where should replies find you (+ 11a, the code; the "already an account" edge). Kept: ob.continueApple/Google/Email, ob.email.*, ob.code.*
    "ob2.address.head": "Where should replies find you?", // 11 headline, two lines (≤ 32)
    "ob2.address.line": "Give {name} an address and your letters follow you to any phone.", // 11 under the headline, two lines
    "ob2.address.terms": "By sending, you agree to our {terms} and {privacy}: zero tolerance for abuse, and anyone can be reported or blocked in one tap.", // 11, small, above the keys (covers all four choices; {terms}/{privacy} are the two links below)
    "ob2.address.termsLink": "Terms", // the link word in ob2.address.terms
    "ob2.address.privacyLink": "Privacy Policy", // the link words in ob2.address.terms
    "ob2.address.guest": "Not now, keep it on this phone", // 11 text key: the guest (≤ 34)
    "ob2.address.guestLine": "Guests live on this phone only. Add an address anytime in Settings.", // 11, small, under the text key, 2 lines
    "ob2.address.exists": "That's already an account. Switch to it?", // 11 edge: the address already owns a Kindredly account (≤ 44)
    "ob2.address.existsLine": "Your letter comes with you; the bird you have there will carry it.", // 11 edge, under it, 2 lines
    "ob2.address.switch": "Switch to it", // 11 edge, the acid key (≤ 16)
    "ob2.address.other": "Use another way", // 11 edge, the text key back to the three keys (≤ 20)
    "ob2.address.failed": "That didn't go through. Try again, or keep it on this phone for now.", // 11, under the keys when a link fails (not when it's cancelled)

    // 12 · the first flight. Kept: ob.flight.plain/em (the title), ff.skip
    "ob2.flight.sub": "YOUR LETTER, IN THE POST", // 12, mono under the title (caps, ≤ 28)
    "ob2.flight.line": "{name}'s first letter is in the air.", // 12, Newsreader italic under the chart; {name} is YOUR courier name (≤ 46 with it)

    // 13 · the knock (the soft pre-ask, from the bird)
    "ob2.knock.head": "Want me to knock when someone writes back?", // 13, the speech card's headline, 2 lines (≤ 46)
    "ob2.knock.line": "A knock when someone replies, and one at 8 if post is waiting. Quiet at night.", // 13, under it, 2 lines (true of the shipped push: replies, the 8 o'clock knock, night quiet hours)
    "ob2.knock.settings": "Turn them on in Settings and I'll knock.", // 13, the line instead, when iOS was already refused (Yes opens Settings)
    "ob2.knock.yes": "Yes, knock", // 13 acid key: only this spends iOS's one-time prompt (≤ 14)
    "ob2.knock.no": "Not now", // 13 text key (≤ 12)
    "ob2.knock.sign": "— {name}", // 13, the bird's sign-off at the card's foot

    // → Today: the wardrobe slip (out of the run). Kept: ob.fare.head + ob.fare.look/dress/both (the fare's headline)
    "ob2.slip.title": "{name} wants a look →", // Today, the slip from the bird on the first arrival (≤ 30 with a 16-letter name)
    "ob2.slip.sub": "try anything on, free", // Today, small under it (lower case, ≤ 28)
    "ob2.slip.close": "Not now", // VoiceOver on the slip's ×
    "ob2.slip.head": "Try anything on {name}.", // the wardrobe sheet's headline (≤ 32 with the name)
    "ob2.slip.line": "Everything tries on. The free pieces are yours to keep.", // under it, one or two lines
    "ob2.slip.keep": "Keep this look", // the sheet's acid key (≤ 18)
    "ob2.slip.fareLead": "Board and {name} keeps them. Close this and the look goes back to how it was.", // the fare's line when a First Class piece is kept from the slip
  },
  /* ── es ── */
  {
    "ob2.back": "Atrás",
    "ob2.voice.egg": "aquí dentro hay algo.",
    "ob2.voice.birthday": "tibio. aún no.",
    "ob2.voice.pronoun": "está escuchando.",
    "ob2.voice.face": "casi calentito.",
    "ob2.voice.envelope": "calentito.",
    "ob2.voice.ready": "listo para tus palabras.",
    "ob2.voice.letter": "te lee por encima del hombro.",
    "ob2.voice.stamp": "esperando.",

    "ob2.doorstep.app": "Cartas a desconocidos, llevadas por un pájaro que sale de tu huevo.",
    "ob2.doorstep.key": "Que nazca mi mensajero",
    "ob2.doorstep.signin": "¿Ya tienes cuenta? [Entrar]",
    "ob2.doorstep.s1.head": "Di lo que nunca publicarías.",
    "ob2.doorstep.s1.chip": "sin likes. sin seguidores. solo cartas.",
    "ob2.doorstep.s1.letter": "sigo ensayando conversaciones que nunca tendré",
    "ob2.doorstep.s2.head": "Un pájaro busca a quien escriba como tú.",
    "ob2.doorstep.s2.chip": "{name} te respondió",
    "ob2.doorstep.s3.head": "Cinco cartas cada uno. Después, los nombres.",
    "ob2.doorstep.s3.chip": "5 de 5 · nombres intercambiados",
    "ob2.doorstep.s3.count": "{n} DE 5",
    "ob2.doorstep.s3.you": "tú",
    "ob2.doorstep.slideA11y": "{head} Ejemplo {n} de 3.",
    "ob2.doorstep.lang": "Idioma",
    "ob2.doorstep.langCancel": "Cancelar",
    "ob2.signin.title": "Hola de nuevo.",
    "ob2.signin.line": "Entra como lo hiciste la última vez.",
    "ob2.signin.terms": "Al continuar, aceptas nuestros [Términos] y nuestra [Política de privacidad].",
    "ob2.signin.new": "¿Primera vez? [Empieza sin cuenta →]",
    "ob2.signin.close": "Cerrar",
    "ob2.egg.head": "Este es tuyo.",
    "ob2.egg.line": "Elige un cascarón. Deja una marca de nacimiento en quien esté dentro.",
    "ob2.egg.key": "Es mío",
    "ob2.egg.shellA11y": "Cascarón {name}",
    "ob2.birthday.head": "¿Cuándo es tu cumpleaños?",
    "ob2.birthday.before": "Es para tu signo. La fecha en sí no la ve nadie.",
    "ob2.birthday.after": "{sign}. Eso sale en tus cartas. Tu cumpleaños, nunca.",
    "ob2.birthday.key": "Siguiente",
    "ob2.birthday.wheelA11y": "Cumpleaños: {day} de {month} de {year}",
    "ob2.birthday.month": "Mes",
    "ob2.birthday.day": "Día",
    "ob2.birthday.year": "Año",
    "ob2.underage.head": "Todavía no.",
    "ob2.underage.line": "En Kindredly se escriben desconocidos, así que es solo para adultos. Vuelve cuando cumplas 18.",
    "ob2.underage.change": "¿Año equivocado? Cámbialo", // 3x: the one way back to the wheel, once per phone
    "ob2.pronoun.head": "¿Ella, él o neutro?",
    "ob2.pronoun.line": "Así tu pájaro sabrá cómo hablar de ti. Con ella o él aparece un pequeño ♀︎ o ♂︎ junto a tu nombre. Con neutro, nada.",
    "ob2.pronoun.she": "ella",
    "ob2.pronoun.he": "él",
    "ob2.pronoun.they": "neutro",
    "ob2.pronoun.skip": "Saltar y usar neutro",
    "ob2.pronoun.hint": "UN TOQUE ELIGE Y AVANZA",
    "ob2.face.head": "Elige una cara.",
    "ob2.face.line": "Los desconocidos ven un cristal empañado. Un afín ve esto.",
    "ob2.face.key": "Soy yo",
    "ob2.face.later": "Más tarde",
    "ob2.envelope.head": "Así te ve un desconocido.",
    "ob2.envelope.thinking": "Tu mensajero está pensando un nombre…",
    "ob2.envelope.to": "para: alguien que escribe como tú",
    "ob2.envelope.caption": "El mensajero de cada desconocido te pone un nombre, así nadie puede buscarte. Si habla otro idioma, te lo pone en el suyo.",
    "ob2.envelope.onLetters": "{glyph} en mis cartas",
    "ob2.envelope.signA11y": "Mostrar tu signo, {sign}, en tus cartas",
    "ob2.envelope.stripLabel": "TRAS CINCO CARTAS CADA UNO",
    "ob2.envelope.stripSign": "CADA UNO FIRMA",
    "ob2.envelope.stripLine": "Entonces el cristal se desempaña y cada uno firma con su seudónimo.",
    "ob2.envelope.key": "Así está bien",

    "ob2.letter.clockNight": "{time}, {day}. Alguien más sigue despierto.",
    "ob2.letter.clockDay": "{time}, {day}. En algún sitio, alguien mira el buzón.",
    "ob2.letter.head": "Escribe tu primera carta.",
    "ob2.letter.line": "La leerá un desconocido. Tu huevo, antes.",
    "ob2.letter.stuck": "¿Bloqueo?",
    "ob2.letter.stuckA11y": "Otra idea",
    "ob2.letter.left": "{n} más para viajar",
    "ob2.letter.ready": "lista para viajar ✓",
    "ob2.letter.rule": "Nada de enlaces, correos ni números de teléfono: eso no viaja.",
    "ob2.letter.ruleHit": "Hay un enlace, un correo o un número. Quítalo y viajará.",
    "ob2.letter.key": "Ponle sello",
    "ob2.stamp.eyebrow": "TU PRIMER SELLO",
    "ob2.stamp.line": "Sale de lo que escribiste. Anuncia el ánimo de la carta antes de abrirla.",
    "ob2.stamp.linePicked": "Lo elegiste tú. Anuncia el ánimo de la carta antes de abrirla.",
    "ob2.stamp.key": "Pégalo",
    "ob2.stamp.another": "Elegir otro",
    "ob2.stamp.trayHead": "Elige tu primer sello",
    "ob2.stamp.trayDone": "Listo",
    "ob2.stamp.to": "para: alguien que escribe como tú",
    "ob2.stamp.envA11y": "Tu sobre, tal como lo ve un desconocido: {name}",
    "ob2.hatch.tap": "tócalo",
    "ob2.hatch.rhythm": "RITMO",
    "ob2.hatch.pauses": "PAUSAS",
    "ob2.hatch.tells": "TICS",
    "ob2.hatch.key": "Ponle nombre",
    "ob2.name.head": "Necesita un nombre.",
    "ob2.name.line": "Firmará cada nota que te escriba.",
    "ob2.name.ph": "Pipo",
    "ob2.name.dice": "Nombre al azar",
    "ob2.name.she": "ella",
    "ob2.name.he": "él",
    "ob2.name.they": "neutro",
    "ob2.name.key": "Se llama {name}",
    "ob2.address.head": "¿Dónde quieres recibir las respuestas?",
    "ob2.address.line": "Dale una dirección a {name} y tus cartas te seguirán a cualquier teléfono.",
    "ob2.address.terms": "Al enviar, aceptas nuestros {terms} y nuestra {privacy}: tolerancia cero con el abuso, y puedes reportar o bloquear a quien sea con un toque.",
    "ob2.address.termsLink": "Términos",
    "ob2.address.privacyLink": "Política de privacidad",
    "ob2.address.guest": "Ahora no, solo en este teléfono",
    "ob2.address.guestLine": "Sin cuenta, todo se queda en este teléfono. Puedes añadir una dirección cuando quieras en Ajustes.",
    "ob2.address.exists": "Ya tienes una cuenta ahí. ¿Cambiar a ella?",
    "ob2.address.existsLine": "Tu carta viene contigo; la llevará el pájaro que tienes allí.",
    "ob2.address.switch": "Cambiar a ella",
    "ob2.address.other": "Usar otra forma",
    "ob2.address.failed": "No ha funcionado. Inténtalo de nuevo o quédate en este teléfono por ahora.",
    "ob2.flight.sub": "TU CARTA, YA EN EL CORREO",
    "ob2.flight.line": "La primera carta de {name} ya vuela.",
    "ob2.knock.head": "¿Llamo a tu puerta cuando alguien te conteste?",
    "ob2.knock.line": "Llamo una vez cuando alguien conteste, y otra a las 8 si te esperan cartas. De noche, silencio.",
    "ob2.knock.settings": "Activa las notificaciones en Ajustes y llamaré.",
    "ob2.knock.yes": "Sí, llama",
    "ob2.knock.no": "Ahora no",
    "ob2.knock.sign": "— {name}",

    "ob2.slip.title": "{name} quiere un look →",
    "ob2.slip.sub": "pruébale de todo, gratis",
    "ob2.slip.close": "Ahora no",
    "ob2.slip.head": "Pruébale de todo a {name}.",
    "ob2.slip.line": "Todo se puede probar. Las prendas gratis te las quedas.",
    "ob2.slip.keep": "Quedarme este look",
    "ob2.slip.fareLead": "Sube a bordo y {name} se los queda. Si cierras, el look vuelve a como estaba.",
  },
  /* ── pt (Brazilian: você, pra) ── */
  {
    "ob2.back": "Voltar",
    "ob2.voice.egg": "tem algo aqui dentro.",
    "ob2.voice.birthday": "morninho. ainda não.",
    "ob2.voice.pronoun": "tá ouvindo.",
    "ob2.voice.face": "esquentando.",
    "ob2.voice.envelope": "quentinho.",
    "ob2.voice.ready": "pronto pras suas palavras.",
    "ob2.voice.letter": "lendo por cima do seu ombro.",
    "ob2.voice.stamp": "esperando.",

    "ob2.doorstep.app": "Cartas para desconhecidos, levadas por um pássaro que você choca.",
    "ob2.doorstep.key": "Chocar meu mensageiro",
    "ob2.doorstep.signin": "Já tem conta? [Entrar]",
    "ob2.doorstep.s1.head": "Diga o que você nunca postaria.",
    "ob2.doorstep.s1.chip": "sem curtidas. sem seguidores. só cartas.",
    "ob2.doorstep.s1.letter": "fico ensaiando conversas que nunca vou ter",
    "ob2.doorstep.s2.head": "Um pássaro acha quem escreve como você.",
    "ob2.doorstep.s2.chip": "{name} respondeu",
    "ob2.doorstep.s3.head": "Cinco cartas de cada lado. Depois, os nomes.",
    "ob2.doorstep.s3.chip": "5 de 5 · nomes trocados",
    "ob2.doorstep.s3.count": "{n} DE 5",
    "ob2.doorstep.s3.you": "você",
    "ob2.doorstep.slideA11y": "{head} Exemplo {n} de 3.",
    "ob2.doorstep.lang": "Idioma",
    "ob2.doorstep.langCancel": "Cancelar",
    "ob2.signin.title": "Que bom te ver de novo.",
    "ob2.signin.line": "Entre do mesmo jeito da última vez.",
    "ob2.signin.terms": "Ao continuar, você aceita nossos [Termos] e nossa [Política de Privacidade].",
    "ob2.signin.new": "Primeira vez? [Começar sem conta →]",
    "ob2.signin.close": "Fechar",
    "ob2.egg.head": "Esse é seu.",
    "ob2.egg.line": "Escolha uma casca. Ela deixa uma marca de nascença em quem estiver dentro.",
    "ob2.egg.key": "É meu",
    "ob2.egg.shellA11y": "Casca {name}",
    "ob2.birthday.head": "Quando é seu aniversário?",
    "ob2.birthday.before": "É pro seu signo. A data em si fica só com você.",
    "ob2.birthday.after": "{sign}. Isso aparece nas suas cartas. Seu aniversário, nunca.",
    "ob2.birthday.key": "Avançar",
    "ob2.birthday.wheelA11y": "Aniversário: {day} de {month} de {year}",
    "ob2.birthday.month": "Mês",
    "ob2.birthday.day": "Dia",
    "ob2.birthday.year": "Ano",
    "ob2.underage.head": "Ainda não.",
    "ob2.underage.line": "No Kindredly, desconhecidos escrevem para desconhecidos, então é só para adultos. Volte quando fizer 18.",
    "ob2.underage.change": "Ano errado? Corrija", // 3x: the one way back to the wheel, once per phone
    "ob2.pronoun.head": "Ela, ele ou neutro?",
    "ob2.pronoun.line": "Assim seu pássaro fala de você do jeito certo. Ela ou ele coloca um pequeno ♀︎ ou ♂︎ ao lado do seu nome. Neutro não mostra nada.",
    "ob2.pronoun.she": "ela",
    "ob2.pronoun.he": "ele",
    "ob2.pronoun.they": "neutro",
    "ob2.pronoun.skip": "Pular e usar neutro",
    "ob2.pronoun.hint": "UM TOQUE ESCOLHE E AVANÇA",
    "ob2.face.head": "Escolha um rosto.",
    "ob2.face.line": "Desconhecidos veem um vidro embaçado. Uma alma afim vê isto.",
    "ob2.face.key": "Sou eu",
    "ob2.face.later": "Depois",
    "ob2.envelope.head": "É assim que um desconhecido te vê.",
    "ob2.envelope.thinking": "Seu mensageiro está pensando num nome…",
    "ob2.envelope.to": "para: alguém que escreve como você",
    "ob2.envelope.caption": "O mensageiro de quem te lê te dá um nome, então ninguém consegue te procurar. Em outro idioma, o nome também muda.",
    "ob2.envelope.onLetters": "{glyph} nas minhas cartas",
    "ob2.envelope.signA11y": "Mostrar seu signo, {sign}, nas suas cartas",
    "ob2.envelope.stripLabel": "APÓS CINCO CARTAS DE CADA",
    "ob2.envelope.stripSign": "CADA UM ASSINA",
    "ob2.envelope.stripLine": "Aí o vidro desembaça e cada um assina com seu pseudônimo.",
    "ob2.envelope.key": "Tudo certo",

    "ob2.letter.clockNight": "{time}, {day}. Tem mais alguém acordado por aí.",
    "ob2.letter.clockDay": "{time}, {day}. Alguém por aí está checando o correio.",
    "ob2.letter.head": "Escreva sua primeira carta.",
    "ob2.letter.line": "Um desconhecido vai ler. Seu ovo lê antes.",
    "ob2.letter.stuck": "Travou?",
    "ob2.letter.stuckA11y": "Outra ideia",
    "ob2.letter.left": "mais {n} pra viajar",
    "ob2.letter.ready": "pronta pra viajar ✓",
    "ob2.letter.rule": "Nada de links, e-mails ou números de telefone. Isso não viaja.",
    "ob2.letter.ruleHit": "Tem um link, um e-mail ou um número aí. Tira que ela viaja.",
    "ob2.letter.key": "Pôr o selo",
    "ob2.stamp.eyebrow": "SEU PRIMEIRO SELO",
    "ob2.stamp.line": "Escolhido pelo que você escreveu. Mostra o clima da carta antes de alguém abrir.",
    "ob2.stamp.linePicked": "Você escolheu. Mostra o clima da carta antes de alguém abrir.",
    "ob2.stamp.key": "Colar o selo",
    "ob2.stamp.another": "Escolher outro",
    "ob2.stamp.trayHead": "Escolha seu primeiro selo",
    "ob2.stamp.trayDone": "Pronto",
    "ob2.stamp.to": "para: alguém que escreve como você",
    "ob2.stamp.envA11y": "Seu envelope, do jeito que um desconhecido vê: {name}",
    "ob2.hatch.tap": "toca nele",
    "ob2.hatch.rhythm": "RITMO",
    "ob2.hatch.pauses": "PAUSAS",
    "ob2.hatch.tells": "MANIAS",
    "ob2.hatch.key": "Dar um nome",
    "ob2.name.head": "Precisa de um nome.",
    "ob2.name.line": "Vai assinar cada bilhete que te escrever.",
    "ob2.name.ph": "Pipoca",
    "ob2.name.dice": "Sortear um nome",
    "ob2.name.she": "ela",
    "ob2.name.he": "ele",
    "ob2.name.they": "neutro",
    "ob2.name.key": "Vai ser {name}",
    "ob2.address.head": "Onde você quer receber as respostas?",
    "ob2.address.line": "Dê um endereço pra {name} e suas cartas te seguem em qualquer celular.",
    "ob2.address.terms": "Ao enviar, você aceita nossos {terms} e nossa {privacy}: tolerância zero com abuso, e qualquer pessoa pode ser denunciada ou bloqueada com um toque.",
    "ob2.address.termsLink": "Termos",
    "ob2.address.privacyLink": "Política de Privacidade",
    "ob2.address.guest": "Agora não, fica neste celular",
    "ob2.address.guestLine": "Sem conta, tudo fica só neste celular. Adicione um endereço quando quiser em Ajustes.",
    "ob2.address.exists": "Já existe uma conta com isso. Trocar pra ela?",
    "ob2.address.existsLine": "Sua carta vai junto; quem leva é o pássaro que você tem lá.",
    "ob2.address.switch": "Trocar pra ela",
    "ob2.address.other": "Usar outro jeito",
    "ob2.address.failed": "Não deu certo. Tente de novo ou fique só neste celular por enquanto.",
    "ob2.flight.sub": "SUA CARTA, NO CORREIO",
    "ob2.flight.line": "A primeira carta de {name} já está no ar.",
    "ob2.knock.head": "Quer que eu bata na porta quando alguém responder?",
    "ob2.knock.line": "Uma batida quando alguém responder, e outra às 8 se tiver carta esperando. De noite, silêncio.",
    "ob2.knock.settings": "Ativa nos Ajustes que eu bato.",
    "ob2.knock.yes": "Sim, bate",
    "ob2.knock.no": "Agora não",
    "ob2.knock.sign": "— {name}",

    "ob2.slip.title": "{name} quer se arrumar →",
    "ob2.slip.sub": "experimente tudo, de graça",
    "ob2.slip.close": "Agora não",
    "ob2.slip.head": "Experimente tudo em {name}.",
    "ob2.slip.line": "Dá pra experimentar tudo. As peças grátis ficam com você.",
    "ob2.slip.keep": "Manter o visual",
    "ob2.slip.fareLead": "Embarque e {name} fica com eles. Feche e o visual volta a ser o que era.",
  },
  /* ── id ── */
  {
    "ob2.back": "Kembali",
    "ob2.voice.egg": "ada sesuatu di dalam.",
    "ob2.voice.birthday": "hangat. belum siap.",
    "ob2.voice.pronoun": "lagi dengerin.",
    "ob2.voice.face": "makin hangat.",
    "ob2.voice.envelope": "hangat banget.",
    "ob2.voice.ready": "siap baca kata-katamu.",
    "ob2.voice.letter": "ikut baca dari balik bahumu.",
    "ob2.voice.stamp": "menunggu.",

    "ob2.doorstep.app": "Surat untuk orang asing, diantar burung yang kamu tetaskan.",
    "ob2.doorstep.key": "Tetaskan kurirku",
    "ob2.doorstep.signin": "Sudah punya akun? [Masuk]",
    "ob2.doorstep.s1.head": "Ungkapkan yang tak akan pernah kamu posting.",
    "ob2.doorstep.s1.chip": "tanpa like. tanpa follower. cuma surat.",
    "ob2.doorstep.s1.letter": "aku terus melatih obrolan yang tak akan pernah terjadi",
    "ob2.doorstep.s2.head": "Burungmu mencari orang yang menulis sepertimu.",
    "ob2.doorstep.s2.chip": "{name} membalas",
    "ob2.doorstep.s3.head": "Lima surat masing-masing. Lalu bertukar nama.",
    "ob2.doorstep.s3.chip": "5 dari 5 · nama ditukar",
    "ob2.doorstep.s3.count": "{n} DARI 5",
    "ob2.doorstep.s3.you": "kamu",
    "ob2.doorstep.slideA11y": "{head} Contoh {n} dari 3.",
    "ob2.doorstep.lang": "Bahasa",
    "ob2.doorstep.langCancel": "Batal",
    "ob2.signin.title": "Selamat datang kembali.",
    "ob2.signin.line": "Masuk dengan cara yang sama seperti terakhir kali.",
    "ob2.signin.terms": "Dengan melanjutkan, kamu menyetujui [Ketentuan] dan [Kebijakan Privasi] kami.",
    "ob2.signin.new": "Baru di sini? [Mulai tanpa akun →]",
    "ob2.signin.close": "Tutup",
    "ob2.egg.head": "Yang ini punyamu.",
    "ob2.egg.line": "Pilih cangkangnya. Siapa pun yang ada di dalam akan membawa tanda lahirnya.",
    "ob2.egg.key": "Ini punyaku",
    "ob2.egg.shellA11y": "Cangkang {name}",
    "ob2.birthday.head": "Kapan ulang tahunmu?",
    "ob2.birthday.before": "Untuk zodiakmu. Tanggalnya sendiri tetap rahasia.",
    "ob2.birthday.after": "{sign}. Ini yang tampil di suratmu, bukan tanggal lahirmu.",
    "ob2.birthday.key": "Lanjut",
    "ob2.birthday.wheelA11y": "Ulang tahun: {day} {month} {year}",
    "ob2.birthday.month": "Bulan",
    "ob2.birthday.day": "Tanggal",
    "ob2.birthday.year": "Tahun",
    "ob2.underage.head": "Belum waktunya.",
    "ob2.underage.line": "Di Kindredly, orang asing saling berkirim surat, jadi ini khusus orang dewasa. Kembali lagi kalau sudah 18 tahun.",
    "ob2.underage.change": "Salah tahun? Ubah", // 3x: the one way back to the wheel, once per phone
    "ob2.pronoun.head": "Perempuan, laki-laki, atau netral?",
    "ob2.pronoun.line": "Supaya burungmu mengenalmu dengan tepat. Pilih perempuan atau laki-laki, dan ♀︎ atau ♂︎ kecil muncul di samping namamu. Netral tidak menampilkan apa-apa.",
    "ob2.pronoun.she": "perempuan",
    "ob2.pronoun.he": "laki-laki",
    "ob2.pronoun.they": "netral",
    "ob2.pronoun.skip": "Lewati, pakai netral",
    "ob2.pronoun.hint": "SEKALI KETUK, LANGSUNG LANJUT",
    "ob2.face.head": "Pilih wajah.",
    "ob2.face.line": "Orang asing melihat kaca buram. Kerabat melihat ini.",
    "ob2.face.key": "Ini aku",
    "ob2.face.later": "Nanti saja",
    "ob2.envelope.head": "Begini kamu di mata orang asing.",
    "ob2.envelope.thinking": "Kurirmu sedang memikirkan nama…",
    "ob2.envelope.to": "kepada: yang menulis sepertimu",
    "ob2.envelope.caption": "Kurir orang asing memberimu nama, jadi tak ada yang bisa mencarimu. Bagi yang berbahasa lain, namamu juga dalam bahasa mereka.",
    "ob2.envelope.onLetters": "{glyph} di suratku",
    "ob2.envelope.signA11y": "Tampilkan zodiakmu, {sign}, di suratmu",
    "ob2.envelope.stripLabel": "SETELAH 5 SURAT TIAP PIHAK",
    "ob2.envelope.stripSign": "TANDA TANGAN",
    "ob2.envelope.stripLine": "Lalu kaca buramnya jadi bening, dan kalian sama-sama bertanda tangan dengan nama pena.",
    "ob2.envelope.key": "Sudah pas",

    "ob2.letter.clockNight": "{time}, {day}. Ada yang belum tidur juga.",
    "ob2.letter.clockDay": "{time}, {day}. Seseorang sedang mengecek kotak suratnya.",
    "ob2.letter.head": "Tulis surat pertamamu.",
    "ob2.letter.line": "Orang asing akan membacanya. Telurmu lebih dulu.",
    "ob2.letter.stuck": "Buntu?",
    "ob2.letter.stuckA11y": "Ide lain",
    "ob2.letter.left": "{n} lagi untuk terbang",
    "ob2.letter.ready": "siap terbang ✓",
    "ob2.letter.rule": "Tanpa tautan, email, atau nomor telepon. Yang begitu tidak ikut diantar.",
    "ob2.letter.ruleHit": "Ada tautan, email, atau nomor. Hapus dulu, baru bisa terbang.",
    "ob2.letter.key": "Beri perangko",
    "ob2.stamp.eyebrow": "PERANGKO PERTAMAMU",
    "ob2.stamp.line": "Dipilih dari tulisanmu. Ia memberi tahu orang asing suasana suratmu sebelum dibuka.",
    "ob2.stamp.linePicked": "Pilihanmu sendiri. Ia memberi tahu orang asing suasana suratmu sebelum dibuka.",
    "ob2.stamp.key": "Tempelkan",
    "ob2.stamp.another": "Pilih yang lain",
    "ob2.stamp.trayHead": "Pilih perangko pertamamu",
    "ob2.stamp.trayDone": "Selesai",
    "ob2.stamp.to": "kepada: yang menulis sepertimu",
    "ob2.stamp.envA11y": "Amplopmu, seperti yang dilihat orang asing: {name}",
    "ob2.hatch.tap": "ketuk saja",
    "ob2.hatch.rhythm": "RITME",
    "ob2.hatch.pauses": "JEDA",
    "ob2.hatch.tells": "CIRI KHAS",
    "ob2.hatch.key": "Beri nama",
    "ob2.name.head": "Ia butuh nama.",
    "ob2.name.line": "Ia memakainya di setiap catatan untukmu.",
    "ob2.name.ph": "Ciko",
    "ob2.name.dice": "Acak nama",
    "ob2.name.she": "cewek",
    "ob2.name.he": "cowok",
    "ob2.name.they": "netral",
    "ob2.name.key": "Namanya {name}",
    "ob2.address.head": "Balasan mau dikirim ke mana?",
    "ob2.address.line": "Beri {name} alamat, dan suratmu akan mengikutimu ke ponsel mana pun.",
    "ob2.address.terms": "Dengan mengirim, kamu menyetujui {terms} dan {privacy} kami: tanpa toleransi untuk pelecehan, dan siapa pun bisa dilaporkan atau diblokir dengan sekali ketuk.",
    "ob2.address.termsLink": "Ketentuan",
    "ob2.address.privacyLink": "Kebijakan Privasi",
    "ob2.address.guest": "Nanti saja, simpan di ponsel ini",
    "ob2.address.guestLine": "Akun tamu hanya ada di ponsel ini. Tambahkan alamat kapan saja di Pengaturan.",
    "ob2.address.exists": "Akun itu sudah ada. Pindah ke sana?",
    "ob2.address.existsLine": "Suratmu ikut pindah; burung yang ada di sana yang akan mengantarnya.",
    "ob2.address.switch": "Pindah ke sana",
    "ob2.address.other": "Pakai cara lain",
    "ob2.address.failed": "Belum berhasil. Coba lagi, atau simpan di ponsel ini dulu.",
    "ob2.flight.sub": "SURATMU, DALAM PERJALANAN",
    "ob2.flight.line": "Surat pertama {name} sudah mengudara.",
    "ob2.knock.head": "Mau kuketuk kalau ada yang membalas?",
    "ob2.knock.line": "Satu ketukan saat ada balasan, dan satu lagi jam 8 pagi kalau ada surat menunggu. Kalau malam, aku diam.",
    "ob2.knock.settings": "Nyalakan di Pengaturan, nanti aku ketuk.",
    "ob2.knock.yes": "Ya, ketuk",
    "ob2.knock.no": "Nanti saja",
    "ob2.knock.sign": "— {name}",

    "ob2.slip.title": "{name} mau dandan →",
    "ob2.slip.sub": "coba apa saja, gratis",
    "ob2.slip.close": "Nanti saja",
    "ob2.slip.head": "Coba apa saja di {name}.",
    "ob2.slip.line": "Semua bisa dicoba. Yang gratis boleh kamu simpan.",
    "ob2.slip.keep": "Pakai yang ini",
    "ob2.slip.fareLead": "Naik dan {name} boleh menyimpannya. Tutup ini, dan tampilannya kembali seperti semula.",
  },
  /* ── fr ── */
  {
    "ob2.back": "Retour",
    "ob2.voice.egg": "y a quelque chose là-dedans.",
    "ob2.voice.birthday": "au chaud. pas encore.",
    "ob2.voice.pronoun": "ça écoute.",
    "ob2.voice.face": "ça chauffe.",
    "ob2.voice.envelope": "bien au chaud.",
    "ob2.voice.ready": "prêt pour tes mots.",
    "ob2.voice.letter": "ça lit par-dessus ton épaule.",
    "ob2.voice.stamp": "ça attend.",

    "ob2.doorstep.app": "Des lettres à des inconnus, portées par un oiseau que tu fais éclore.",
    "ob2.doorstep.key": "Faire éclore ma messagère",
    "ob2.doorstep.signin": "Déjà un compte ? [Se connecter]",
    "ob2.doorstep.s1.head": "Dis ce que tu ne posterais jamais.",
    "ob2.doorstep.s1.chip": "ni likes ni abonnés. juste des lettres.",
    "ob2.doorstep.s1.letter": "je répète des conversations que je n'aurai jamais",
    "ob2.doorstep.s2.head": "Un oiseau trouve qui écrit comme toi.",
    "ob2.doorstep.s2.chip": "{name} a répondu",
    "ob2.doorstep.s3.head": "Cinq lettres chacun, puis on échange nos noms.",
    "ob2.doorstep.s3.chip": "5 sur 5 · noms échangés",
    "ob2.doorstep.s3.count": "{n} SUR 5",
    "ob2.doorstep.s3.you": "toi",
    "ob2.doorstep.slideA11y": "{head} Exemple {n} sur 3.",
    "ob2.doorstep.lang": "Langue",
    "ob2.doorstep.langCancel": "Annuler",
    "ob2.signin.title": "Te revoilà.",
    "ob2.signin.line": "Connecte-toi comme la dernière fois.",
    "ob2.signin.terms": "En continuant, tu acceptes nos [Conditions] et notre [Politique de confidentialité].",
    "ob2.signin.new": "Première fois ? [Commencer sans compte →]",
    "ob2.signin.close": "Fermer",
    "ob2.egg.head": "Celui-ci est à toi.",
    "ob2.egg.line": "Choisis une coquille. Elle laisse une tache de naissance à qui se trouve dedans.",
    "ob2.egg.key": "C'est le mien",
    "ob2.egg.shellA11y": "Coquille {name}",
    "ob2.birthday.head": "C'est quand, ton anniversaire ?",
    "ob2.birthday.before": "C'est pour ton signe. La date, elle, reste privée.",
    "ob2.birthday.after": "{sign}. Ça s'affiche sur tes lettres. Ton anniversaire, jamais.",
    "ob2.birthday.key": "Suivant",
    "ob2.birthday.wheelA11y": "Anniversaire : {day} {month} {year}",
    "ob2.birthday.month": "Mois",
    "ob2.birthday.day": "Jour",
    "ob2.birthday.year": "Année",
    "ob2.underage.head": "Pas encore.",
    "ob2.underage.line": "Sur Kindredly, des inconnus s'écrivent : c'est réservé aux adultes. Reviens à tes 18 ans.",
    "ob2.underage.change": "Mauvaise année ? Corrige-la", // 3x: the one way back to the wheel, once per phone
    "ob2.pronoun.head": "Elle, il ou iel ?",
    "ob2.pronoun.line": "Pour que ton oiseau parle de toi comme il faut. Elle ou il ajoute un petit ♀︎ ou ♂︎ à côté de ton nom. Iel n'affiche rien.",
    "ob2.pronoun.she": "elle",
    "ob2.pronoun.he": "il",
    "ob2.pronoun.they": "iel",
    "ob2.pronoun.skip": "Passer, on dira iel",
    "ob2.pronoun.hint": "UNE TOUCHE ET C'EST PARTI",
    "ob2.face.head": "Choisis un visage.",
    "ob2.face.line": "Les inconnus voient du verre givré. Un semblable voit ça.",
    "ob2.face.key": "C'est moi",
    "ob2.face.later": "Plus tard",
    "ob2.envelope.head": "Voici ce qu'un inconnu voit de toi.",
    "ob2.envelope.thinking": "Ta messagère cherche un nom…",
    "ob2.envelope.to": "à : quelqu'un qui écrit comme toi",
    "ob2.envelope.caption": "La messagère de chaque inconnu te donne un nom : personne ne peut te retrouver. Dans une autre langue, elle en choisit un dans la sienne.",
    "ob2.envelope.onLetters": "{glyph} sur mes lettres",
    "ob2.envelope.signA11y": "Afficher ton signe, {sign}, sur tes lettres",
    "ob2.envelope.stripLabel": "APRÈS CINQ LETTRES CHACUN",
    "ob2.envelope.stripSign": "CHACUN SIGNE",
    "ob2.envelope.stripLine": "Alors le givre s'efface, et chacun signe de son nom de plume.",
    "ob2.envelope.key": "C'est bien ça",

    "ob2.letter.clockNight": "{time}, {day}. Quelqu'un d'autre veille aussi.",
    "ob2.letter.clockDay": "{time}, {day}. Quelque part, quelqu'un relève son courrier.",
    "ob2.letter.head": "Écris ta première lettre.",
    "ob2.letter.line": "Un inconnu la lira. Ton œuf, en premier.",
    "ob2.letter.stuck": "En panne ?",
    "ob2.letter.stuckA11y": "Une autre idée",
    "ob2.letter.left": "encore {n} pour partir",
    "ob2.letter.ready": "elle peut partir ✓",
    "ob2.letter.rule": "Pas de liens, d'e-mails ni de numéros de téléphone. Ça, ça ne voyage pas.",
    "ob2.letter.ruleHit": "Il y a un lien, un e-mail ou un numéro dedans. Enlève-le et elle partira.",
    "ob2.letter.key": "Timbrer",
    "ob2.stamp.eyebrow": "TON PREMIER TIMBRE",
    "ob2.stamp.line": "Choisi d'après ce que tu as écrit. Il donne le ton avant même qu'on ouvre la lettre.",
    "ob2.stamp.linePicked": "C'est toi qui l'as choisi. Il donne le ton avant même qu'on ouvre la lettre.",
    "ob2.stamp.key": "Le coller",
    "ob2.stamp.another": "En choisir un autre",
    "ob2.stamp.trayHead": "Choisis ton premier timbre",
    "ob2.stamp.trayDone": "OK",
    "ob2.stamp.to": "à : quelqu'un qui écrit comme toi",
    "ob2.stamp.envA11y": "Ton enveloppe, telle qu'un inconnu la voit : {name}",
    "ob2.hatch.tap": "tapote-le",
    "ob2.hatch.rhythm": "RYTHME",
    "ob2.hatch.pauses": "PAUSES",
    "ob2.hatch.tells": "TICS",
    "ob2.hatch.key": "Donne-lui un nom",
    "ob2.name.head": "Il lui faut un nom.",
    "ob2.name.line": "Il signera chaque mot qu'il t'écrira.",
    "ob2.name.ph": "Pépin",
    "ob2.name.dice": "Nom au hasard",
    "ob2.name.she": "elle",
    "ob2.name.he": "il",
    "ob2.name.they": "iel",
    "ob2.name.key": "Va pour {name}",
    "ob2.address.head": "Où t'envoyer les réponses ?",
    "ob2.address.line": "Donne une adresse à {name} et tes lettres te suivront sur n'importe quel téléphone.",
    "ob2.address.terms": "En envoyant, tu acceptes nos {terms} et notre {privacy} : tolérance zéro pour les abus, et tu peux signaler ou bloquer n'importe qui d'un geste.",
    "ob2.address.termsLink": "Conditions",
    "ob2.address.privacyLink": "Politique de confidentialité",
    "ob2.address.guest": "Pas maintenant, juste ce téléphone",
    "ob2.address.guestLine": "Sans compte, tout reste sur ce téléphone. Ajoute une adresse quand tu veux dans Réglages.",
    "ob2.address.exists": "Ce compte existe déjà. Changer de compte ?",
    "ob2.address.existsLine": "Ta lettre vient avec toi ; c'est l'oiseau que tu as là-bas qui la portera.",
    "ob2.address.switch": "Changer de compte",
    "ob2.address.other": "Autre méthode",
    "ob2.address.failed": "Ça n'a pas marché. Réessaie, ou reste sur ce téléphone pour l'instant.",
    "ob2.flight.sub": "TA LETTRE, À LA POSTE",
    "ob2.flight.line": "La première lettre de {name} s'envole.",
    "ob2.knock.head": "Je toque quand quelqu'un te répond ?",
    "ob2.knock.line": "Un toc quand quelqu'un répond, et un autre à 8 h si du courrier t'attend. Silence la nuit.",
    "ob2.knock.settings": "Active les notifications dans Réglages et je toquerai.",
    "ob2.knock.yes": "Oui, toque",
    "ob2.knock.no": "Plus tard",
    "ob2.knock.sign": "— {name}",

    "ob2.slip.title": "{name} veut un look →",
    "ob2.slip.sub": "essaie tout, c'est gratuit",
    "ob2.slip.close": "Pas maintenant",
    "ob2.slip.head": "Essaie tout sur {name}.",
    "ob2.slip.line": "Tout s'essaie. Les pièces gratuites, tu les gardes.",
    "ob2.slip.keep": "Garder ce look",
    "ob2.slip.fareLead": "Embarque et {name} les garde. Ferme, et le look redevient comme avant.",
  },
  /* ── de ── */
  {
    "ob2.back": "Zurück",
    "ob2.voice.egg": "da ist was drin.",
    "ob2.voice.birthday": "warm. noch nicht so weit.",
    "ob2.voice.pronoun": "es hört zu.",
    "ob2.voice.face": "wärmer.",
    "ob2.voice.envelope": "richtig warm.",
    "ob2.voice.ready": "bereit für deine Worte.",
    "ob2.voice.letter": "liest heimlich mit.",
    "ob2.voice.stamp": "wartet.",

    "ob2.doorstep.app": "Briefe an Fremde. Zugestellt von einem Vogel, den du selbst ausbrütest.",
    "ob2.doorstep.key": "Meine Botin ausbrüten",
    "ob2.doorstep.signin": "Schon dabei? [Anmelden]",
    "ob2.doorstep.s1.head": "Sag, was du nie posten würdest.",
    "ob2.doorstep.s1.chip": "keine likes. keine follower. nur briefe.",
    "ob2.doorstep.s1.letter": "ich probe ständig gespräche, die ich nie führen werde",
    "ob2.doorstep.s2.head": "Ein Vogel findet, wer schreibt wie du.",
    "ob2.doorstep.s2.chip": "{name} hat zurückgeschrieben",
    "ob2.doorstep.s3.head": "Je fünf Briefe. Dann tauscht ihr Namen.",
    "ob2.doorstep.s3.chip": "5 von 5 · Namen getauscht",
    "ob2.doorstep.s3.count": "{n} VON 5",
    "ob2.doorstep.s3.you": "du",
    "ob2.doorstep.slideA11y": "{head} Beispiel {n} von 3.",
    "ob2.doorstep.lang": "Sprache",
    "ob2.doorstep.langCancel": "Abbrechen",
    "ob2.signin.title": "Willkommen zurück.",
    "ob2.signin.line": "Melde dich so an wie beim letzten Mal.",
    "ob2.signin.terms": "Wenn du fortfährst, stimmst du unseren [Nutzungsbedingungen] und der [Datenschutzerklärung] zu.",
    "ob2.signin.new": "Neu hier? [Ohne Konto starten →]",
    "ob2.signin.close": "Schließen",
    "ob2.egg.head": "Das hier ist deins.",
    "ob2.egg.line": "Such dir eine Schale aus. Wer drin ist, trägt davon ein Muttermal.",
    "ob2.egg.key": "Meins",
    "ob2.egg.shellA11y": "Schale {name}",
    "ob2.birthday.head": "Wann hast du Geburtstag?",
    "ob2.birthday.before": "Für dein Sternzeichen. Das Datum selbst bleibt privat.",
    "ob2.birthday.after": "{sign}. Das steht auf deinen Briefen. Dein Geburtstag nie.",
    "ob2.birthday.key": "Weiter",
    "ob2.birthday.wheelA11y": "Geburtstag: {day}. {month} {year}",
    "ob2.birthday.month": "Monat",
    "ob2.birthday.day": "Tag",
    "ob2.birthday.year": "Jahr",
    "ob2.underage.head": "Noch nicht.",
    "ob2.underage.line": "Bei Kindredly schreiben sich Fremde, deshalb ist es nur für Erwachsene. Komm wieder, wenn du 18 bist.",
    "ob2.underage.change": "Falsches Jahr? Ändern", // 3x: the one way back to the wheel, once per phone
    "ob2.pronoun.head": "Wie soll dein Vogel von dir sprechen?",
    "ob2.pronoun.line": "Mit sie oder er steht ein kleines ♀︎ oder ♂︎ neben deinem Namen. Mit neutral steht dort nichts.",
    "ob2.pronoun.she": "sie",
    "ob2.pronoun.he": "er",
    "ob2.pronoun.they": "neutral",
    "ob2.pronoun.skip": "Überspringen (neutral)",
    "ob2.pronoun.hint": "EIN TIPP WÄHLT UND GEHT WEITER",
    "ob2.face.head": "Wähl ein Gesicht.",
    "ob2.face.line": "Fremde sehen Milchglas. Seelenverwandte sehen das hier.",
    "ob2.face.key": "Das bin ich",
    "ob2.face.later": "Später",
    "ob2.envelope.head": "So sehen Fremde dich.",
    "ob2.envelope.thinking": "Deine Botin denkt sich einen Namen aus…",
    "ob2.envelope.to": "an: jemanden, der wie du schreibt",
    "ob2.envelope.caption": "Die Botin deines Gegenübers gibt dir einen Namen, damit niemand dich nachschlagen kann. In einer anderen Sprache heißt du auch anders.",
    "ob2.envelope.onLetters": "{glyph} auf meinen Briefen",
    "ob2.envelope.signA11y": "Dein Sternzeichen, {sign}, auf deinen Briefen zeigen",
    "ob2.envelope.stripLabel": "NACH JE FÜNF BRIEFEN",
    "ob2.envelope.stripSign": "BEIDE SIGNIEREN",
    "ob2.envelope.stripLine": "Dann klärt sich das Milchglas, und ihr unterschreibt beide mit eurem Schreibnamen.",
    "ob2.envelope.key": "Passt so",

    "ob2.letter.clockNight": "{time}, {day}. Irgendwo ist noch jemand wach.",
    "ob2.letter.clockDay": "{time}, {day}. Irgendwo sieht jemand nach der Post.",
    "ob2.letter.head": "Schreib deinen ersten Brief.",
    "ob2.letter.line": "Jemand Fremdes liest ihn. Dein Ei zuerst.",
    "ob2.letter.stuck": "Hänger?",
    "ob2.letter.stuckA11y": "Noch eine Idee",
    "ob2.letter.left": "noch {n} bis zum Abflug",
    "ob2.letter.ready": "reisefertig ✓",
    "ob2.letter.rule": "Links, Mail-Adressen und Telefonnummern werden nicht befördert.",
    "ob2.letter.ruleHit": "Da ist ein Link, eine Mail oder Nummer drin. Nimm das raus, dann reist er.",
    "ob2.letter.key": "Marke drauf",
    "ob2.stamp.eyebrow": "DEINE ERSTE MARKE",
    "ob2.stamp.line": "Ausgesucht nach dem, was du geschrieben hast. Sie verrät die Stimmung, bevor jemand den Brief öffnet.",
    "ob2.stamp.linePicked": "Von dir ausgesucht. Sie verrät die Stimmung, bevor jemand den Brief öffnet.",
    "ob2.stamp.key": "Draufkleben",
    "ob2.stamp.another": "Andere Marke",
    "ob2.stamp.trayHead": "Deine erste Marke",
    "ob2.stamp.trayDone": "Fertig",
    "ob2.stamp.to": "an: jemanden, der wie du schreibt",
    "ob2.stamp.envA11y": "Dein Umschlag, wie Fremde ihn sehen: {name}",
    "ob2.hatch.tap": "tipp drauf",
    "ob2.hatch.rhythm": "RHYTHMUS",
    "ob2.hatch.pauses": "PAUSEN",
    "ob2.hatch.tells": "EIGENHEITEN",
    "ob2.hatch.key": "Namen geben",
    "ob2.name.head": "Wie soll es heißen?",
    "ob2.name.line": "Damit unterschreibt es jede Notiz an dich.",
    "ob2.name.ph": "Otto",
    "ob2.name.dice": "Namen würfeln",
    "ob2.name.she": "sie",
    "ob2.name.he": "er",
    "ob2.name.they": "neutral",
    "ob2.name.key": "Das ist {name}",
    "ob2.address.head": "Wo sollen dich Antworten erreichen?",
    "ob2.address.line": "Gib {name} eine Adresse, dann folgen dir deine Briefe auf jedes Handy.",
    "ob2.address.terms": "Mit dem Absenden stimmst du unseren {terms} und der {privacy} zu: null Toleranz für Belästigung, und du kannst jede Person mit einem Tipp melden oder blockieren.",
    "ob2.address.termsLink": "Nutzungsbedingungen",
    "ob2.address.privacyLink": "Datenschutzerklärung",
    "ob2.address.guest": "Jetzt nicht, nur auf diesem Handy",
    "ob2.address.guestLine": "Als Gast bleibt alles auf diesem Handy. Eine Adresse kannst du jederzeit in den Einstellungen hinzufügen.",
    "ob2.address.exists": "Dazu gibt es schon ein Konto. Wechseln?",
    "ob2.address.existsLine": "Dein Brief kommt mit; der Vogel, den du dort hast, trägt ihn.",
    "ob2.address.switch": "Wechseln",
    "ob2.address.other": "Anders anmelden",
    "ob2.address.failed": "Das hat nicht geklappt. Versuch es noch mal oder bleib vorerst auf diesem Handy.",
    "ob2.flight.sub": "DEIN BRIEF IST UNTERWEGS",
    "ob2.flight.line": "Der erste Brief von {name} ist in der Luft.",
    "ob2.knock.head": "Soll ich anklopfen, wenn jemand zurückschreibt?",
    "ob2.knock.line": "Ein Klopfen, wenn jemand antwortet, und eins um 8, wenn Post wartet. Nachts ist Ruhe.",
    "ob2.knock.settings": "Schalt die Mitteilungen in den Einstellungen ein, dann klopfe ich.",
    "ob2.knock.yes": "Ja, klopf an",
    "ob2.knock.no": "Jetzt nicht",
    "ob2.knock.sign": "— {name}",

    "ob2.slip.title": "{name} will was Neues →",
    "ob2.slip.sub": "alles anprobieren, gratis",
    "ob2.slip.close": "Jetzt nicht",
    "ob2.slip.head": "Zieh {name} was an.",
    "ob2.slip.line": "Alles lässt sich anprobieren. Die kostenlosen Stücke darfst du behalten.",
    "ob2.slip.keep": "Behalten",
    "ob2.slip.fareLead": "Steig ein, und {name} behält sie. Schließ das hier, und alles ist wieder wie vorher.",
  },
  /* ── it ── */
  {
    "ob2.back": "Indietro",
    "ob2.voice.egg": "c'è qualcosa qui dentro.",
    "ob2.voice.birthday": "al calduccio. non ancora.",
    "ob2.voice.pronoun": "sta ascoltando.",
    "ob2.voice.face": "fuochino.",
    "ob2.voice.envelope": "caldo caldo.",
    "ob2.voice.ready": "pronto per le tue parole.",
    "ob2.voice.letter": "sbircia da sopra la spalla.",
    "ob2.voice.stamp": "aspetta.",

    "ob2.doorstep.app": "Lettere a sconosciuti, portate da un uccello che fai nascere tu.",
    "ob2.doorstep.key": "Fai schiudere l'uovo",
    "ob2.doorstep.signin": "Hai già un account? [Accedi]",
    "ob2.doorstep.s1.head": "Di' quello che non posteresti mai.",
    "ob2.doorstep.s1.chip": "zero like. zero follower. solo lettere.",
    "ob2.doorstep.s1.letter": "continuo a provare conversazioni che non avrò mai",
    "ob2.doorstep.s2.head": "Un uccello trova chi scrive come te.",
    "ob2.doorstep.s2.chip": "{name} ha risposto",
    "ob2.doorstep.s3.head": "Cinque lettere a testa. Poi vi scambiate i nomi.",
    "ob2.doorstep.s3.chip": "5 su 5 · nomi scambiati",
    "ob2.doorstep.s3.count": "{n} SU 5",
    "ob2.doorstep.s3.you": "tu",
    "ob2.doorstep.slideA11y": "{head} Esempio {n} di 3.",
    "ob2.doorstep.lang": "Lingua",
    "ob2.doorstep.langCancel": "Annulla",
    "ob2.signin.title": "Eccoti di nuovo.",
    "ob2.signin.line": "Accedi come hai fatto l'ultima volta.",
    "ob2.signin.terms": "Continuando accetti i nostri [Termini] e l'[Informativa sulla privacy].",
    "ob2.signin.new": "Prima volta? [Inizia senza account →]",
    "ob2.signin.close": "Chiudi",
    "ob2.egg.head": "Questo è tuo.",
    "ob2.egg.line": "Scegli un guscio. Lascia una voglia a chiunque ci sia dentro.",
    "ob2.egg.key": "È mio",
    "ob2.egg.shellA11y": "Guscio {name}",
    "ob2.birthday.head": "Quand'è il tuo compleanno?",
    "ob2.birthday.before": "Serve per il tuo segno. La data resta privata.",
    "ob2.birthday.after": "{sign}. Questo compare sulle tue lettere. Il compleanno, mai.",
    "ob2.birthday.key": "Avanti",
    "ob2.birthday.wheelA11y": "Compleanno: {day} {month} {year}",
    "ob2.birthday.month": "Mese",
    "ob2.birthday.day": "Giorno",
    "ob2.birthday.year": "Anno",
    "ob2.underage.head": "Non ancora.",
    "ob2.underage.line": "Su Kindredly si scrivono sconosciuti, quindi è solo per adulti. Torna quando avrai 18 anni.",
    "ob2.underage.change": "Anno sbagliato? Correggilo", // 3x: the one way back to the wheel, once per phone
    "ob2.pronoun.head": "Lei, lui o loro?",
    "ob2.pronoun.line": "Così il tuo uccello parla di te nel modo giusto. Con lei o lui compare un piccolo ♀︎ o ♂︎ accanto al tuo nome. Con loro, niente.",
    "ob2.pronoun.she": "lei",
    "ob2.pronoun.he": "lui",
    "ob2.pronoun.they": "loro",
    "ob2.pronoun.skip": "Salta e usa loro",
    "ob2.pronoun.hint": "UN TOCCO SCEGLIE E VA AVANTI",
    "ob2.face.head": "Scegli un volto.",
    "ob2.face.line": "Gli sconosciuti vedono un vetro smerigliato. Un'anima affine vede questo.",
    "ob2.face.key": "Sono io",
    "ob2.face.later": "Più tardi",
    "ob2.envelope.head": "Ecco come ti vede uno sconosciuto.",
    "ob2.envelope.thinking": "La tua messaggera sta pensando a un nome…",
    "ob2.envelope.to": "per: qualcuno che scrive come te",
    "ob2.envelope.caption": "La messaggera di chi ti legge ti dà un nome, così nessuno può cercarti. Chi parla un'altra lingua ti vede con un nome nella sua.",
    "ob2.envelope.onLetters": "{glyph} sulle mie lettere",
    "ob2.envelope.signA11y": "Mostra il tuo segno, {sign}, sulle tue lettere",
    "ob2.envelope.stripLabel": "DOPO CINQUE LETTERE A TESTA",
    "ob2.envelope.stripSign": "FIRMATE ENTRAMBI",
    "ob2.envelope.stripLine": "Poi il vetro si schiarisce e ognuno firma col proprio nome di penna.",
    "ob2.envelope.key": "Va bene così",

    "ob2.letter.clockNight": "{time}, {day}. Anche qualcun altro è sveglio.",
    "ob2.letter.clockDay": "{time}, {day}. Chissà dove, qualcuno controlla la posta.",
    "ob2.letter.head": "Scrivi la tua prima lettera.",
    "ob2.letter.line": "La leggerà uno sconosciuto. Il tuo uovo, prima.",
    "ob2.letter.stuck": "Blocco?",
    "ob2.letter.stuckA11y": "Un'altra idea",
    "ob2.letter.left": "ancora {n} per partire",
    "ob2.letter.ready": "pronta a partire ✓",
    "ob2.letter.rule": "Niente link, email o numeri di telefono. Quelli non viaggiano.",
    "ob2.letter.ruleHit": "C'è un link, un'email o un numero. Toglilo e partirà.",
    "ob2.letter.key": "Affrancala",
    "ob2.stamp.eyebrow": "IL TUO PRIMO FRANCOBOLLO",
    "ob2.stamp.line": "Scelto da ciò che hai scritto. Dice l'umore della lettera prima ancora di aprirla.",
    "ob2.stamp.linePicked": "L'hai scelto tu. Dice l'umore della lettera prima ancora di aprirla.",
    "ob2.stamp.key": "Attaccalo",
    "ob2.stamp.another": "Scegline un altro",
    "ob2.stamp.trayHead": "Il tuo primo francobollo",
    "ob2.stamp.trayDone": "Fatto",
    "ob2.stamp.to": "per: qualcuno che scrive come te",
    "ob2.stamp.envA11y": "La tua busta, come la vede uno sconosciuto: {name}",
    "ob2.hatch.tap": "toccalo",
    "ob2.hatch.rhythm": "RITMO",
    "ob2.hatch.pauses": "PAUSE",
    "ob2.hatch.tells": "TIC",
    "ob2.hatch.key": "Dagli un nome",
    "ob2.name.head": "Ha bisogno di un nome.",
    "ob2.name.line": "Firmerà ogni biglietto che ti scrive.",
    "ob2.name.ph": "Pino",
    "ob2.name.dice": "Nome a caso",
    "ob2.name.she": "lei",
    "ob2.name.he": "lui",
    "ob2.name.they": "loro",
    "ob2.name.key": "Si chiama {name}",
    "ob2.address.head": "Dove vuoi ricevere le risposte?",
    "ob2.address.line": "Dai un indirizzo a {name} e le tue lettere ti seguiranno su qualsiasi telefono.",
    "ob2.address.terms": "Inviando accetti i nostri {terms} e l'{privacy}: tolleranza zero per gli abusi, e puoi segnalare o bloccare chiunque con un tocco.",
    "ob2.address.termsLink": "Termini",
    "ob2.address.privacyLink": "Informativa sulla privacy",
    "ob2.address.guest": "Non ora, resta su questo telefono",
    "ob2.address.guestLine": "Come ospite, tutto resta su questo telefono. Aggiungi un indirizzo quando vuoi in Impostazioni.",
    "ob2.address.exists": "C'è già un account. Passare a quello?",
    "ob2.address.existsLine": "La tua lettera viene con te; la porterà l'uccello che hai lì.",
    "ob2.address.switch": "Passa a quello",
    "ob2.address.other": "Usa un altro modo",
    "ob2.address.failed": "Non è andata. Riprova, o resta su questo telefono per ora.",
    "ob2.flight.sub": "LA TUA LETTERA, SPEDITA",
    "ob2.flight.line": "La prima lettera di {name} è in volo.",
    "ob2.knock.head": "Busso quando qualcuno ti risponde?",
    "ob2.knock.line": "Un colpetto quando qualcuno risponde, e uno alle 8 se c'è posta che ti aspetta. Di notte, silenzio.",
    "ob2.knock.settings": "Attiva le notifiche nelle Impostazioni e busserò.",
    "ob2.knock.yes": "Sì, bussa",
    "ob2.knock.no": "Non ora",
    "ob2.knock.sign": "— {name}",

    "ob2.slip.title": "{name} vuole un look →",
    "ob2.slip.sub": "prova tutto, gratis",
    "ob2.slip.close": "Non ora",
    "ob2.slip.head": "Prova di tutto su {name}.",
    "ob2.slip.line": "Si può provare tutto. I capi gratis restano tuoi.",
    "ob2.slip.keep": "Tieni questo look",
    "ob2.slip.fareLead": "Sali a bordo e {name} li tiene. Chiudi, e il look torna com'era.",
  },
  /* ── ja ── */
  {
    "ob2.back": "戻る",
    "ob2.voice.egg": "なかに、なにかいる。",
    "ob2.voice.birthday": "あったかい。でも、まだ。",
    "ob2.voice.pronoun": "きいてるよ。",
    "ob2.voice.face": "あったまってきた。",
    "ob2.voice.envelope": "ぽかぽか。",
    "ob2.voice.ready": "ことば、ちょうだい。",
    "ob2.voice.letter": "うしろから、のぞいてる。",
    "ob2.voice.stamp": "まってる。",

    "ob2.doorstep.app": "見知らぬ人への手紙を、あなたが孵した鳥が運ぶ。",
    "ob2.doorstep.key": "伝書鳥を孵す",
    "ob2.doorstep.signin": "アカウントをお持ちの方は [サインイン]",
    "ob2.doorstep.s1.head": "SNSには書けない本音を。",
    "ob2.doorstep.s1.chip": "いいねも、フォロワーもなし。手紙だけ。",
    "ob2.doorstep.s1.letter": "することのない会話を、頭の中で何度も練習している",
    "ob2.doorstep.s2.head": "あなたみたいに書く人を、鳥が見つけてくる。",
    "ob2.doorstep.s2.chip": "{name}から返事が来た",
    "ob2.doorstep.s3.head": "5通ずつ書いたら、名前を交換。",
    "ob2.doorstep.s3.chip": "5通ずつ · 名前を交換",
    "ob2.doorstep.s3.count": "5通中 {n}通",
    "ob2.doorstep.s3.you": "あなた",
    "ob2.doorstep.slideA11y": "{head}（例 {n}/3）",
    "ob2.doorstep.lang": "言語",
    "ob2.doorstep.langCancel": "キャンセル",
    "ob2.signin.title": "おかえりなさい。",
    "ob2.signin.line": "前回と同じ方法でサインインしてください。",
    "ob2.signin.terms": "続けると、[利用規約]と[プライバシーポリシー]に同意したことになります。",
    "ob2.signin.new": "はじめての方は [アカウントなしで始める →]",
    "ob2.signin.close": "閉じる",
    "ob2.egg.head": "これは、あなたの卵。",
    "ob2.egg.line": "殻を選んで。中にいる子に、あざをひとつ残します。",
    "ob2.egg.key": "これにする",
    "ob2.egg.shellA11y": "{name}の殻",
    "ob2.birthday.head": "誕生日はいつ？",
    "ob2.birthday.before": "星座のためです。日付そのものは公開されません。",
    "ob2.birthday.after": "{sign}。手紙に出るのは星座だけ。誕生日は出ません。",
    "ob2.birthday.key": "次へ",
    "ob2.birthday.wheelA11y": "誕生日：{year}年{month}{day}日",
    "ob2.birthday.month": "月",
    "ob2.birthday.day": "日",
    "ob2.birthday.year": "年",
    "ob2.underage.head": "まだ、もう少し先。",
    "ob2.underage.line": "Kindredlyは見知らぬ人どうしが手紙を書き合う場所なので、大人向けです。18歳になったら、また来てください。",
    "ob2.underage.change": "生まれた年を間違えた？ 選び直す", // 3x: the one way back to the wheel, once per phone
    "ob2.pronoun.head": "彼女？ 彼？ それとも、その人？",
    "ob2.pronoun.line": "鳥があなたのことを正しく呼べるように。彼女か彼なら、名前の横に小さな♀︎か♂︎がつきます。その人なら、何もつきません。",
    "ob2.pronoun.she": "彼女",
    "ob2.pronoun.he": "彼",
    "ob2.pronoun.they": "その人",
    "ob2.pronoun.skip": "スキップして「その人」に",
    "ob2.pronoun.hint": "タップで選んで、そのまま次へ",
    "ob2.face.head": "顔を選んで。",
    "ob2.face.line": "見知らぬ人には、すりガラス。心友には、この顔。",
    "ob2.face.key": "これがわたし",
    "ob2.face.later": "あとで",
    "ob2.envelope.head": "見知らぬ人から見た、あなた。",
    "ob2.envelope.thinking": "伝書鳥が名前を考えています…",
    "ob2.envelope.to": "宛先：あなたのように書く誰か",
    "ob2.envelope.caption": "相手の伝書鳥があなたに名前をつけるので、誰にも検索されません。別の言語の人には、その言語の名前で届きます。",
    "ob2.envelope.onLetters": "手紙に{glyph}を表示",
    "ob2.envelope.signA11y": "手紙に星座（{sign}）を表示",
    "ob2.envelope.stripLabel": "お互い5通ずつ書いたら",
    "ob2.envelope.stripSign": "それぞれ署名",
    "ob2.envelope.stripLine": "そこで曇りが晴れて、それぞれペンネームで署名します。",
    "ob2.envelope.key": "これでいい",

    "ob2.letter.clockNight": "{day}、{time}。どこかで、誰かも起きている。",
    "ob2.letter.clockDay": "{day}、{time}。どこかで誰かが郵便受けをのぞいている。",
    "ob2.letter.head": "最初の手紙を書こう。",
    "ob2.letter.line": "見知らぬ人が読む。その前に、卵が読む。",
    "ob2.letter.stuck": "迷ったら",
    "ob2.letter.stuckA11y": "別のヒント",
    "ob2.letter.left": "あと{n}字で出発",
    "ob2.letter.ready": "これで飛べる ✓",
    "ob2.letter.rule": "リンク、メールアドレス、電話番号は運べません。",
    "ob2.letter.ruleHit": "リンク、メールアドレス、番号のどれかが入っています。消せば運べます。",
    "ob2.letter.key": "切手を貼る",
    "ob2.stamp.eyebrow": "はじめての切手",
    "ob2.stamp.line": "書いた内容から選びました。開ける前に、手紙の気分を伝えます。",
    "ob2.stamp.linePicked": "あなたが選んだ切手です。開ける前に、手紙の気分を伝えます。",
    "ob2.stamp.key": "これを貼る",
    "ob2.stamp.another": "ほかを選ぶ",
    "ob2.stamp.trayHead": "はじめての切手を選ぶ",
    "ob2.stamp.trayDone": "完了",
    "ob2.stamp.to": "宛先：あなたのように書く誰か",
    "ob2.stamp.envA11y": "見知らぬ人から見たあなたの封筒：{name}",
    "ob2.hatch.tap": "タップして",
    "ob2.hatch.rhythm": "リズム",
    "ob2.hatch.pauses": "間合い",
    "ob2.hatch.tells": "くせ",
    "ob2.hatch.key": "名前をつける",
    "ob2.name.head": "名前をつけよう。",
    "ob2.name.line": "これから届く手紙に、この名前で署名します。",
    "ob2.name.ph": "おもち",
    "ob2.name.dice": "名前をランダムに",
    "ob2.name.she": "彼女",
    "ob2.name.he": "彼",
    "ob2.name.they": "その子",
    "ob2.name.key": "{name}に決めた",
    "ob2.address.head": "返事は、どこに届けたらいい？",
    "ob2.address.line": "{name}に住所を教えておけば、どのスマホでも手紙が届きます。",
    "ob2.address.terms": "送信すると、{terms}と{privacy}に同意したことになります。嫌がらせは一切許しません。誰でもワンタップで通報・ブロックできます。",
    "ob2.address.termsLink": "利用規約",
    "ob2.address.privacyLink": "プライバシーポリシー",
    "ob2.address.guest": "今はいい。このスマホだけで",
    "ob2.address.guestLine": "ゲストのデータはこのスマホにだけ残ります。住所は設定からいつでも追加できます。",
    "ob2.address.exists": "そのアカウントはすでにあります。切り替えますか？",
    "ob2.address.existsLine": "手紙も一緒に移ります。運ぶのは、そちらにいる鳥です。",
    "ob2.address.switch": "切り替える",
    "ob2.address.other": "別の方法にする",
    "ob2.address.failed": "うまくいきませんでした。もう一度試すか、ひとまずこのスマホだけで続けてください。",
    "ob2.flight.sub": "あなたの手紙、配達中",
    "ob2.flight.line": "{name}の最初の手紙が、空へ。",
    "ob2.knock.head": "返事が来たら、ノックしようか？",
    "ob2.knock.line": "返事が来たらノックひとつ。手紙が待っていたら、朝8時にもうひとつ。夜は静かにしてる。",
    "ob2.knock.settings": "設定でオンにしてくれたら、ノックするね。",
    "ob2.knock.yes": "うん、ノックして",
    "ob2.knock.no": "今はいい",
    "ob2.knock.sign": "— {name}",

    "ob2.slip.title": "{name}が着替えたいって →",
    "ob2.slip.sub": "なんでも無料で試着",
    "ob2.slip.close": "今はいい",
    "ob2.slip.head": "{name}を着せかえよう。",
    "ob2.slip.line": "なんでも試着できます。無料のアイテムは、そのままもらえます。",
    "ob2.slip.keep": "これにする",
    "ob2.slip.fareLead": "乗れば{name}がそのまま着ていられます。閉じれば、もとの姿に戻ります。",
  },
  /* ── ko ── */
  {
    "ob2.back": "뒤로",
    "ob2.voice.egg": "안에 뭔가 있어.",
    "ob2.voice.birthday": "따뜻해. 아직은 아니야.",
    "ob2.voice.pronoun": "듣고 있어.",
    "ob2.voice.face": "점점 따뜻해져.",
    "ob2.voice.envelope": "엄청 따뜻해.",
    "ob2.voice.ready": "이제 말을 들려줘.",
    "ob2.voice.letter": "어깨 너머로 읽는 중.",
    "ob2.voice.stamp": "기다리는 중.",

    "ob2.doorstep.app": "낯선 사람에게 보내는 편지를, 당신이 부화시킨 새가 날라요.",
    "ob2.doorstep.key": "내 전령새 부화시키기",
    "ob2.doorstep.signin": "이미 계정이 있나요? [로그인]",
    "ob2.doorstep.s1.head": "SNS엔 못 올릴 얘기를 여기에.",
    "ob2.doorstep.s1.chip": "좋아요 없음. 팔로워 없음. 편지만.",
    "ob2.doorstep.s1.letter": "하지도 않을 대화를 머릿속에서 자꾸 연습해",
    "ob2.doorstep.s2.head": "당신처럼 쓰는 사람을 새가 찾아와요.",
    "ob2.doorstep.s2.chip": "{name}에게서 답장이 왔어요",
    "ob2.doorstep.s3.head": "다섯 통씩 쓰면, 이름을 주고받아요.",
    "ob2.doorstep.s3.chip": "5통씩 · 이름 교환 완료",
    "ob2.doorstep.s3.count": "5통 중 {n}통",
    "ob2.doorstep.s3.you": "나",
    "ob2.doorstep.slideA11y": "{head} 예시 {n}/3",
    "ob2.doorstep.lang": "언어",
    "ob2.doorstep.langCancel": "취소",
    "ob2.signin.title": "다시 만나 반가워요.",
    "ob2.signin.line": "지난번과 같은 방법으로 로그인하세요.",
    "ob2.signin.terms": "계속하면 [이용약관] 및 [개인정보 처리방침]에 동의하게 돼요.",
    "ob2.signin.new": "처음이세요? [계정 없이 시작하기 →]",
    "ob2.signin.close": "닫기",
    "ob2.egg.head": "이건 당신 거예요.",
    "ob2.egg.line": "껍데기를 골라요. 안에 있는 아이에게 반점 하나를 남겨요.",
    "ob2.egg.key": "이걸로 할래요",
    "ob2.egg.shellA11y": "{name} 껍데기",
    "ob2.birthday.head": "생일이 언제예요?",
    "ob2.birthday.before": "별자리를 알려고 물어봐요. 날짜 자체는 공개되지 않아요.",
    "ob2.birthday.after": "{sign}. 편지에는 별자리만 보이고, 생일은 보이지 않아요.",
    "ob2.birthday.key": "다음",
    "ob2.birthday.wheelA11y": "생일: {year}년 {month} {day}일",
    "ob2.birthday.month": "월",
    "ob2.birthday.day": "일",
    "ob2.birthday.year": "연도",
    "ob2.underage.head": "아직은 안 돼요.",
    "ob2.underage.line": "Kindredly는 낯선 사람끼리 편지를 주고받는 곳이라 성인만 쓸 수 있어요. 18살이 되면 다시 와 주세요.",
    "ob2.underage.change": "연도를 잘못 골랐나요? 다시 고르기", // 3x: the one way back to the wheel, once per phone
    "ob2.pronoun.head": "그녀, 그, 아니면 그 사람?",
    "ob2.pronoun.line": "새가 당신을 제대로 부를 수 있게요. 그녀나 그를 고르면 이름 옆에 작은 ♀︎ 또는 ♂︎ 표시가 붙어요. 그 사람을 고르면 아무것도 붙지 않아요.",
    "ob2.pronoun.she": "그녀",
    "ob2.pronoun.he": "그",
    "ob2.pronoun.they": "그 사람",
    "ob2.pronoun.skip": "건너뛰고 '그 사람'으로",
    "ob2.pronoun.hint": "한 번 누르면 바로 다음으로",
    "ob2.face.head": "얼굴을 골라요.",
    "ob2.face.line": "낯선 사람에겐 뿌연 유리가, 인연에겐 이 얼굴이 보여요.",
    "ob2.face.key": "이게 나예요",
    "ob2.face.later": "나중에",
    "ob2.envelope.head": "낯선 사람에게 당신은 이렇게 보여요.",
    "ob2.envelope.thinking": "전령새가 이름을 고민하는 중…",
    "ob2.envelope.to": "받는 사람: 당신처럼 쓰는 누군가",
    "ob2.envelope.caption": "상대의 전령새가 당신에게 이름을 붙여서, 아무도 당신을 찾아낼 수 없어요. 다른 언어에선 그 언어로 된 이름이 붙어요.",
    "ob2.envelope.onLetters": "편지에 {glyph} 표시",
    "ob2.envelope.signA11y": "편지에 별자리({sign}) 표시",
    "ob2.envelope.stripLabel": "서로 다섯 통씩 쓰고 나면",
    "ob2.envelope.stripSign": "각자 서명",
    "ob2.envelope.stripLine": "그러면 뿌연 유리가 맑아지고, 각자 필명으로 서명해요.",
    "ob2.envelope.key": "이대로 좋아요",

    "ob2.letter.clockNight": "{day} {time}. 어딘가엔 아직 깨어 있는 누군가가 있어요.",
    "ob2.letter.clockDay": "{day} {time}. 어딘가에서 누군가 우편함을 열어 보고 있어요.",
    "ob2.letter.head": "첫 편지를 써 봐요.",
    "ob2.letter.line": "낯선 사람이 읽기 전에, 알이 먼저 읽어요.",
    "ob2.letter.stuck": "막혔어요?",
    "ob2.letter.stuckA11y": "다른 아이디어",
    "ob2.letter.left": "{n}자 더 쓰면 출발",
    "ob2.letter.ready": "이제 날 수 있어요 ✓",
    "ob2.letter.rule": "링크, 이메일, 전화번호는 안 돼요. 그런 건 배달되지 않아요.",
    "ob2.letter.ruleHit": "링크나 이메일, 번호가 들어 있어요. 지우면 보낼 수 있어요.",
    "ob2.letter.key": "우표 붙이기",
    "ob2.stamp.eyebrow": "첫 우표",
    "ob2.stamp.line": "쓴 내용을 보고 골랐어요. 열어 보기 전에 편지의 기분을 알려 줘요.",
    "ob2.stamp.linePicked": "직접 고른 우표예요. 열어 보기 전에 편지의 기분을 알려 줘요.",
    "ob2.stamp.key": "이걸로 붙이기",
    "ob2.stamp.another": "다른 거 고르기",
    "ob2.stamp.trayHead": "첫 우표 고르기",
    "ob2.stamp.trayDone": "완료",
    "ob2.stamp.to": "받는 사람: 당신처럼 쓰는 누군가",
    "ob2.stamp.envA11y": "낯선 사람이 보는 당신의 봉투: {name}",
    "ob2.hatch.tap": "톡 눌러 봐",
    "ob2.hatch.rhythm": "리듬",
    "ob2.hatch.pauses": "쉼표",
    "ob2.hatch.tells": "버릇",
    "ob2.hatch.key": "이름 지어 주기",
    "ob2.name.head": "이름이 필요해요.",
    "ob2.name.line": "앞으로 보내는 쪽지마다 이 이름으로 서명해요.",
    "ob2.name.ph": "콩이",
    "ob2.name.dice": "랜덤 이름",
    "ob2.name.she": "그녀",
    "ob2.name.he": "그",
    "ob2.name.they": "그 아이",
    "ob2.name.key": "이름은 {name}",
    "ob2.address.head": "답장은 어디로 보내 드릴까요?",
    "ob2.address.line": "{name}에게 주소를 알려 주면, 어느 폰에서든 편지가 따라와요.",
    "ob2.address.terms": "보내면 {terms} 및 {privacy}에 동의하게 돼요. 괴롭힘은 절대 용납하지 않으며, 누구든 한 번만 눌러 신고하거나 차단할 수 있어요.",
    "ob2.address.termsLink": "이용약관",
    "ob2.address.privacyLink": "개인정보 처리방침",
    "ob2.address.guest": "지금은 됐어요, 이 폰에만 둘게요",
    "ob2.address.guestLine": "게스트는 이 폰에만 머물러요. 주소는 설정에서 언제든 추가할 수 있어요.",
    "ob2.address.exists": "이미 있는 계정이에요. 그 계정으로 바꿀까요?",
    "ob2.address.existsLine": "편지도 함께 가요. 그 계정의 새가 날라 줄 거예요.",
    "ob2.address.switch": "그 계정으로 바꾸기",
    "ob2.address.other": "다른 방법 쓰기",
    "ob2.address.failed": "연결되지 않았어요. 다시 해 보거나, 일단 이 폰에만 둬요.",
    "ob2.flight.sub": "당신의 편지, 배달 중",
    "ob2.flight.line": "{name}의 첫 편지가 날아올랐어요.",
    "ob2.knock.head": "누가 답장하면 똑똑 두드려 줄까?",
    "ob2.knock.line": "누가 답장하면 한 번, 편지가 기다리고 있으면 아침 8시에 한 번. 밤에는 조용히 있을게.",
    "ob2.knock.settings": "설정에서 켜 주면 두드릴게.",
    "ob2.knock.yes": "응, 두드려 줘",
    "ob2.knock.no": "나중에",
    "ob2.knock.sign": "— {name}",

    "ob2.slip.title": "{name}, 새 옷 입고 싶대요 →",
    "ob2.slip.sub": "뭐든 무료로 입어 보기",
    "ob2.slip.close": "나중에",
    "ob2.slip.head": "{name}에게 뭐든 입혀 봐요.",
    "ob2.slip.line": "뭐든 입어 볼 수 있어요. 무료 아이템은 그대로 가져도 돼요.",
    "ob2.slip.keep": "이 옷으로 할래요",
    "ob2.slip.fareLead": "탑승하면 {name}의 것이 돼요. 닫으면 원래 모습으로 돌아가요.",
  },
);
