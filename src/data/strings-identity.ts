import { strings } from "../lib/i18n";

/* IDENTITY PHASE 1 — EVERY NEW WORD THE STRANGERS' NEW IDENTITY NEEDS (2026-10-18).
   ────────────────────────────────────────────────────────────────────────
   Courier names, the frosted window, the ♀/♂ mark and the star sign
   (.claude/ui10a-research/identity/identity-plan.md §1–§4, §11 and the
   zodiac Addendum; the build plan's decisions override it). All of it sits
   behind the remote switch app_surfaces('identity'): with the switch off no
   screen reads any key in this file, and every screen says exactly what it
   said before.

   All nine languages are written (2026-10-19 copy pass): each block was
   written AS its language, then read blind as that language's editor
   (translationese, register, fit, the grammar rules below) — never
   translated line by line. Each key's comment, on the English, says what
   it is, where it sits and how long it may run; a new key goes in every
   block, or t() falls back to English for it.

   Choices the blocks share, so the next writer keeps them:
   - "Strangers" is the plain word everywhere here (desconocidos,
     desconhecidos, orang asing, inconnus, Fremde, sconosciuti, 見知らぬ人,
     낯선 사람), on the Edit profile page too, where the older notes still
     say extraños / estranhos / 모르는 사람 for the switch-off world.
   - The mark said aloud follows the pronoun the writer picked (ella, sie,
     perempuan…); ja and ko say 女性 / 여성, which is what a Japanese or
     Korean screen reader user expects after a name, not 彼女 / 그녀.
   - The role word before a pen pal's name (id.vo.penPal) never has a
     gender of its own: es/pt/id keep the app's PENPAL, fr says
     Correspondance, de Brieffreundschaft, it Penna amica (things, or a
     noun that agrees only with itself — Correspondant / Brieffreund /
     Amico di penna are masculine and would argue with a ♀ said a beat
     later). id.ga.stranger ends on the same word, or the tab's (CORRES).
   - Where an old line pointed at the person with ELLA / PARA ELA or a
     masculine noun (th.*, la.out.repliedHead, kd.theyFirst in it), the new
     one is built so no word agrees: es LE LLEGA, pt PRA ESSA PESSOA,
     "Alguien te contestó", it "HA COMINCIATO {name}", ko "먼저 쓴 건
     {name}" (no particle after the name at all), ja "先に書いたのは{name}".
   - ko: the only particle after a placeholder is after {sign} in
     id.ob.signLine, and every sign name ends in 자리, so 가 is always right.

   GRAMMAR AROUND A COURIER NAME (plan §3.5). {name} in these keys can be a
   courier name ("Sunday Kite", "Dedal de lluvia", "雨のランタン"): two
   words, no gender, no article of its own. Never put an article, a
   possessive or an adjective that agrees with it; refer back with a plural
   "they" (fr ils, de sie), or repeat the name. ja: さん only inside
   sentences. ko: choose the particle from the last syllable (이/가, 은/는,
   을/를, 으로/로). The mark and the sign are never claimed to be verified,
   and nothing may suggest sorting or filtering people by them.

   THE §11 REWRITES ARE NEW KEYS (id.*), not edits: the old keys keep
   their words for the switch-off world and for older builds, and the
   screens pick the id.* key only while the switch is on. Where they are
   read:
     id.ob.you.sub        onboarding's pronoun step (onboarding agent)
     id.ep.privateNote    Edit profile, the YOU group's footer (profile agent)
     id.ep.avatarNote     Edit profile, under the face (profile agent)
     id.gd.kindreds.f1/f2 the Kindreds guide (GuideCard reads gd.<id>.f<n>) — written,
                          not wired yet: it goes with the switch-day demo sweep
     id.ga.stranger       GuideArt / the kindreds guide reel's label — written, not
                          wired yet: the same sweep, with their mosaic becoming the frost
     id.kd.theyFirst      the kindred page's WHO BEGAN line (wired: screens/chat/kindred-page whoBegan)
     id.th.goesStraight,
     id.th.replyGoesStraight  the reader's reply hint (wired: screens/chat/reader replyHint)
     id.la.out.repliedHead    the Live Activity's head (wired: lib/activities)
   The blocked list's own comment (§11) is code, rewritten in
   app/(tabs)/me/blocked.tsx.

   Imported for its side effect by lib/who (every screen that names a
   stranger builds its book there), the profile and onboarding screens, and
   the dev pages. */

strings(
  /* ── en ── */
  {
    /* ── VoiceOver: the mark and the sign (lib/stranger-who; read after the courier name,
       "Sunday Kite, she, Gemini"). Lowercase where the language writes a pronoun lowercase. ── */
    // the ♀ mark, said aloud: the pronoun the writer chose, nothing more ("she", "ella", "elle", "sie", "女性", "여성")
    "id.mark.she": "she",
    // the ♂ mark, said aloud
    "id.mark.he": "he",
    // the twelve star signs, said aloud and named in Edit profile's switch note: the usual name of the sign in your
    // language (lib/zodiac zodiacKey). Never a date range, never a year
    "zd.aries": "Aries",
    "zd.taurus": "Taurus",
    "zd.gemini": "Gemini",
    "zd.cancer": "Cancer",
    "zd.leo": "Leo",
    "zd.virgo": "Virgo",
    "zd.libra": "Libra",
    "zd.scorpio": "Scorpio",
    "zd.sagittarius": "Sagittarius",
    "zd.capricorn": "Capricorn",
    "zd.aquarius": "Aquarius",
    "zd.pisces": "Pisces",
    // VoiceOver: the role word that opens a pen pal's Kindreds row now that a courier name doesn't say "stranger" the way
    // "No. 4481" did ("Pen pal, Sunday Kite, she, your turn, 2 of 5"). Singular, sentence case
    "id.vo.penPal": "Pen pal",

    /* ── the rows ── */
    // a pen pal's Kindreds row, second line, for 14 days after the switch, under a thread that is older than it: the
    // number they wore before the courier named them. {no} is that number in your language's form ("No. 4481",
    // "N.º 4481", "Nr. 4481"). Lowercase, short: it sits before the row's last line
    "id.was": "was {no}",
    // the one-time guide line in the first pen-pal thread after the switch: why strangers have names, and why the
    // writer may know a reader by another one. Two sentences, at most about 90 characters
    "id.guide": "Couriers name strangers. They may call you by the name theirs gave you.",
    // Wren's desk post on switch day, in her voice (first person): she has started naming the strangers she brings
    "id.wren.post": "I've started naming the strangers I bring you.",

    /* ── Edit profile: the two switches (profile agent), under the pronoun and the birthday.
       WHO SEES WHAT (owner, 2026-11-12): a stranger sees the star sign only; ♀ / ♂ is shown to kindreds alone,
       after the pen name. So the mark's switch is worded for kindreds and the header covers both ── */
    // the group header over the two switches, mono caps, at most 18 characters
    "ep.id.section": "WHAT OTHERS SEE",
    // the mark switch for a she user (on by default for a new she/he user; an existing user turns it on); never shown to
    // they/unset. It decides what KINDREDS see: a stranger never sees the mark. Use your language's word for kindreds (kd.tab.kindreds)
    "ep.id.mark.she": "Show ♀ to your kindreds",
    // the mark switch for a he user
    "ep.id.mark.he": "Show ♂ to your kindreds",
    // under the mark switch: only kindreds see it (after the pen name), strangers never, and it is never used to choose anyone
    "ep.id.markNote": "Only your kindreds see it, after your pen name. Strangers never do, and nobody can sort or filter by it.",
    // the star sign switch (on by default for everyone with a birthday)
    "ep.id.sign": "Star sign on your letters",
    // under the sign switch: the reader's own sign by name, and the promise. {sign} is the sign's name (zd.*)
    "ep.id.signNote": "{sign}. Strangers see the sign, never your birthday.",
    // under the sign switch when no birthday is set: the switch stays, and nothing shows yet
    "ep.id.signNone": "Shows once your birthday is set.",

    /* ── the one-time note for existing users after the switch (profile agent): a sheet with both switches inside it,
       shown once. The mark switch starts OFF for an existing she/he user (their pronoun was given under "only used in how
       the app talks about you", so showing it is their choice); the sign starts on; they/unset see only the sign ── */
    // the note's title, at most about 30 characters
    "id.note.title": "What strangers see now",
    // the note's body for a she/he user: courier names, the sign on by default, and ♀/♂ kept for kindreds. At most about 200 characters
    "id.note.body": "Strangers now know you by a name their courier gives you, never your pen name. Your star sign shows beside it, never your birthday. ♀ or ♂ is for your kindreds only.",
    // the same body for a they/unset user: no mark offered
    "id.note.bodyThey": "Strangers now know you by a name their courier gives you, never your pen name. Your star sign shows beside it, never your birthday.",
    // the note's one button (the switches inside it save as they move)
    "id.note.done": "Done",
    // the note's foot line
    "id.note.foot": "Change either any time in Edit profile.",
    // the label over the live preview of your own card header (your frosted window, your courier name as a stranger's
    // courier would give it, the sign; never ♀/♂, which a stranger doesn't see): in the note and on onboarding's
    // screen 6. Mono caps, at most 20 characters
    "id.preview": "YOU, TO A STRANGER",
    // VoiceOver: the preview as one element. {who} is "Sunday Kite, Gemini"
    "id.preview.a11y": "How a stranger sees you: {who}",

    /* ── onboarding (onboarding agent; the storyboard's own words win where it has them) ── */
    // the birthday step's line under the field once a date is entered; {sign} is the sign's name (zd.*), its glyph drawn beside it
    "id.ob.signLine": "Your star sign, {sign}, shows on your letters. Your birthday itself stays private.",
    // the same line before a date is entered
    "id.ob.signLineNone": "Your star sign shows on your letters. Your birthday itself stays private.",

    /* ── the §11 rewrites, as new keys (see the header for where each is read) ── */
    // was ep.privateNote (the YOU group's footer: pen name, pronoun, birthday): true again — strangers see neither the
    // pen name nor the birthday, only the star sign if its switch allows; a kindred sees the pen name and, if allowed, ♀/♂
    "id.ep.privateNote": "Strangers never see your pen name or your birthday, only the star sign you allow. A kindred sees your pen name, and ♀/♂ if you allow it, once you've both enclosed your names.",
    // was ep.avatarNote: "never leaves this phone" wasn't true (device backups), so it says what is: nobody is sent it
    "id.ep.avatarNote": "Strangers never see your face. A kindred always sees the face you have now. A photo is never sent to us or anyone.",
    // was gd.kindreds.f1 ("…only a number"): the guide's first frame
    "id.gd.kindreds.f1": "A stranger answers your letter and a thread opens between you. No names yet: your courier calls them by one she made up.",
    // was gd.kindreds.f2 ("…their mosaic comes into focus"): the window stays frosted until both have enclosed a name
    "id.gd.kindreds.f2": "Five letters each way and either of you may enclose a name. Once you both have, the frost clears.",
    // was ga.stranger ("NO. 4481 · A PEN PAL"): the guide picture's label. Use a courier name from YOUR language's list
    // (src/data/default-names), in capitals
    "id.ga.stranger": "SUNDAY KITE · A PEN PAL",
    // was kd.theyFirst: {name} is a courier name or a pen name; the verb must not agree with it ("HA SCRITTO PER PRIMO"
    // was masculine), so write it so any name fits. Mono caps
    "id.kd.theyFirst": "{name} WROTE FIRST",
    // was th.goesStraight (a kindred's reply hint): without a gendered pronoun for the person (pt said "PARA ELA"). Mono caps
    "id.th.goesStraight": "THIS GOES STRAIGHT TO THEM",
    // was th.replyGoesStraight (a pen pal's reply hint): the same, for a stranger with a courier name
    "id.th.replyGoesStraight": "THIS REPLY GOES STRAIGHT TO THEM",
    // was la.out.repliedHead (the Live Activity, on the lock screen): still never a name there, and now without a gendered
    // noun ("Ein Fremder" was masculine). Sentence, at most about 32 characters
    "id.la.out.repliedHead": "A stranger wrote back.",
    "id.writeBackTo": "write back to {name}…",
  },
  /* ── es ── */
  {
    "id.mark.she": "ella",
    "id.mark.he": "él",
    "zd.aries": "Aries",
    "zd.taurus": "Tauro",
    "zd.gemini": "Géminis",
    "zd.cancer": "Cáncer",
    "zd.leo": "Leo",
    "zd.virgo": "Virgo",
    "zd.libra": "Libra",
    "zd.scorpio": "Escorpio",
    "zd.sagittarius": "Sagitario",
    "zd.capricorn": "Capricornio",
    "zd.aquarius": "Acuario",
    "zd.pisces": "Piscis",
    "id.vo.penPal": "Penpal",
    "id.was": "era {no}",
    "id.guide": "Cada mensajero bautiza a quienes trae, así que al otro lado puede que lleves otro nombre.",
    "id.wren.post": "Empecé a ponerles nombre a los desconocidos que te traigo.",
    "ep.id.section": "LO QUE VEN OTROS",
    "ep.id.mark.she": "Mostrar ♀ a tus afines",
    "ep.id.mark.he": "Mostrar ♂ a tus afines",
    "ep.id.markNote": "Solo lo ven tus afines, después de tu seudónimo. Los desconocidos nunca, y nadie puede usarlo para ordenar ni filtrar.",
    "ep.id.sign": "Signo zodiacal en tus cartas",
    "ep.id.signNote": "{sign}. Los desconocidos ven el signo, nunca tu fecha de nacimiento.",
    "ep.id.signNone": "Aparece cuando pongas tu fecha de nacimiento.",
    "id.note.title": "Cómo te ven los desconocidos",
    "id.note.body": "Ahora los desconocidos te conocen por un nombre que te pone su mensajero, nunca por tu seudónimo. A su lado va tu signo, nunca tu fecha de nacimiento. El ♀ o ♂ solo lo ven tus afines.",
    "id.note.bodyThey": "Ahora los desconocidos te conocen por un nombre que te pone su mensajero, nunca por tu seudónimo. A su lado va tu signo, nunca tu fecha de nacimiento.",
    "id.note.done": "Listo",
    "id.note.foot": "Puedes cambiar los dos cuando quieras en Editar perfil.",
    "id.preview": "TÚ, A OJOS AJENOS",
    "id.preview.a11y": "Así te ve un desconocido: {who}",
    "id.ob.signLine": "Tu signo, {sign}, aparece en tus cartas. Tu fecha de nacimiento sigue siendo privada.",
    "id.ob.signLineNone": "Tu signo aparece en tus cartas. Tu fecha de nacimiento sigue siendo privada.",
    "id.ep.privateNote": "Los desconocidos nunca ven tu seudónimo ni tu fecha de nacimiento: solo el signo que permitas. Un afín ve tu seudónimo, y el ♀/♂ si lo permites, cuando ambos hayan incluido sus nombres.",
    "id.ep.avatarNote": "Los desconocidos nunca ven tu cara. Un afín siempre ve la que tienes ahora. Una foto nunca se envía, ni a nosotros ni a nadie.",
    "id.gd.kindreds.f1": "Un desconocido responde a tu carta y se abre un hilo entre los dos. Todavía sin nombres: tu mensajero le pone uno inventado.",
    "id.gd.kindreds.f2": "Cinco cartas por lado y cualquiera de los dos puede incluir un nombre. Cuando ambos lo hayan hecho, el cristal se desempaña.",
    "id.ga.stranger": "DEDAL DE LLUVIA · PENPAL",
    "id.kd.theyFirst": "{name} ESCRIBIÓ PRIMERO",
    "id.th.goesStraight": "ESTO LE LLEGA DIRECTO",
    "id.th.replyGoesStraight": "ESTA RESPUESTA LE LLEGA DIRECTO",
    "id.la.out.repliedHead": "Alguien te contestó.",
    "id.writeBackTo": "responde a {name}…",
  },
  /* ── pt ── */
  {
    "id.mark.she": "ela",
    "id.mark.he": "ele",
    "zd.aries": "Áries",
    "zd.taurus": "Touro",
    "zd.gemini": "Gêmeos",
    "zd.cancer": "Câncer",
    "zd.leo": "Leão",
    "zd.virgo": "Virgem",
    "zd.libra": "Libra",
    "zd.scorpio": "Escorpião",
    "zd.sagittarius": "Sagitário",
    "zd.capricorn": "Capricórnio",
    "zd.aquarius": "Aquário",
    "zd.pisces": "Peixes",
    "id.vo.penPal": "Penpal",
    "id.was": "era {no}",
    "id.guide": "Cada mensageiro dá nome a quem traz. Do outro lado, você pode ter outro nome.",
    "id.wren.post": "Comecei a dar nome aos desconhecidos que trago pra você.",
    "ep.id.section": "O QUE VEEM DE VOCÊ",
    "ep.id.mark.she": "Mostrar ♀ às suas almas afins",
    "ep.id.mark.he": "Mostrar ♂ às suas almas afins",
    "ep.id.markNote": "Só suas almas afins veem, depois do seu pseudônimo. Os desconhecidos nunca veem, e ninguém pode usar isso pra ordenar ou filtrar pessoas.",
    "ep.id.sign": "Signo nas suas cartas",
    "ep.id.signNote": "{sign}. Os desconhecidos veem o signo, nunca sua data de nascimento.",
    "ep.id.signNone": "Aparece quando você informar sua data de nascimento.",
    "id.note.title": "Como os desconhecidos veem você",
    "id.note.body": "Agora os desconhecidos conhecem você por um nome que o mensageiro deles escolhe, nunca pelo seu pseudônimo. Ao lado aparece seu signo, nunca sua data de nascimento. O ♀ ou ♂ só aparece pras suas almas afins.",
    "id.note.bodyThey": "Agora os desconhecidos conhecem você por um nome que o mensageiro deles escolhe, nunca pelo seu pseudônimo. Ao lado aparece seu signo, nunca sua data de nascimento.",
    "id.note.done": "Pronto",
    "id.note.foot": "Dá pra mudar qualquer um dos dois quando quiser em Editar perfil.",
    "id.preview": "ASSIM VOCÊ APARECE",
    "id.preview.a11y": "Como um desconhecido vê você: {who}",
    "id.ob.signLine": "Seu signo, {sign}, aparece nas suas cartas. Sua data de nascimento continua só sua.",
    "id.ob.signLineNone": "Seu signo aparece nas suas cartas. Sua data de nascimento continua só sua.",
    "id.ep.privateNote": "Os desconhecidos nunca veem seu pseudônimo nem sua data de nascimento, só o signo que você permitir. Uma alma afim vê seu pseudônimo, e o ♀/♂ se você permitir, quando os dois tiverem incluído seus nomes.",
    "id.ep.avatarNote": "Os desconhecidos nunca veem seu rosto. Uma alma afim sempre vê o rosto que você tem agora. Nenhuma foto é enviada pra nós nem pra ninguém.",
    "id.gd.kindreds.f1": "Um desconhecido responde à sua carta e uma conversa se abre entre vocês. Ainda sem nomes: seu mensageiro chama essa pessoa por um nome que ele mesmo inventou.",
    "id.gd.kindreds.f2": "Cinco cartas de cada lado e qualquer um dos dois pode incluir um nome. Quando os dois tiverem incluído, o vidro desembaça.",
    "id.ga.stranger": "DEDAL DE GAROA · PENPAL",
    "id.kd.theyFirst": "{name} ESCREVEU PRIMEIRO",
    "id.th.goesStraight": "ISTO VAI DIRETO PRA ESSA PESSOA",
    "id.th.replyGoesStraight": "ESTA RESPOSTA VAI DIRETO PRA ESSA PESSOA",
    "id.la.out.repliedHead": "Alguém te respondeu.",
    "id.writeBackTo": "responda a {name}…",
  },
  /* ── id ── */
  {
    "id.mark.she": "perempuan",
    "id.mark.he": "laki-laki",
    "zd.aries": "Aries",
    "zd.taurus": "Taurus",
    "zd.gemini": "Gemini",
    "zd.cancer": "Cancer",
    "zd.leo": "Leo",
    "zd.virgo": "Virgo",
    "zd.libra": "Libra",
    "zd.scorpio": "Scorpio",
    "zd.sagittarius": "Sagitarius",
    "zd.capricorn": "Capricorn",
    "zd.aquarius": "Aquarius",
    "zd.pisces": "Pisces",
    "id.vo.penPal": "Penpal",
    "id.was": "dulu {no}",
    "id.guide": "Tiap kurir menamai orang asing yang dibawanya; di sisi mereka, namamu mungkin lain.",
    "id.wren.post": "Aku mulai memberi nama orang-orang asing yang kubawakan untukmu.",
    "ep.id.section": "YANG ORANG LIHAT",
    "ep.id.mark.she": "Tampilkan ♀ ke kerabatmu",
    "ep.id.mark.he": "Tampilkan ♂ ke kerabatmu",
    "ep.id.markNote": "Cuma kerabatmu yang melihatnya, setelah nama penamu. Orang asing tidak pernah, dan tak ada yang bisa mengurutkan atau menyaring orang berdasarkan tanda ini.",
    "ep.id.sign": "Zodiak di suratmu",
    "ep.id.signNote": "{sign}. Orang asing hanya melihat zodiaknya, bukan tanggal lahirmu.",
    "ep.id.signNone": "Muncul setelah tanggal lahirmu diisi.",
    "id.note.title": "Yang kini dilihat orang asing",
    "id.note.body": "Kini orang asing mengenalmu lewat nama yang diberikan kurir mereka, bukan nama penamu. Zodiakmu tampil di sampingnya, bukan tanggal lahirmu. ♀ atau ♂ hanya terlihat oleh kerabatmu.",
    "id.note.bodyThey": "Kini orang asing mengenalmu lewat nama yang diberikan kurir mereka, bukan nama penamu. Zodiakmu tampil di sampingnya, bukan tanggal lahirmu.",
    "id.note.done": "Selesai",
    "id.note.foot": "Keduanya bisa diubah kapan saja di Edit profil.",
    "id.preview": "DI MATA ORANG ASING",
    "id.preview.a11y": "Begini orang asing melihatmu: {who}",
    "id.ob.signLine": "Zodiakmu, {sign}, tampil di suratmu. Tanggal lahirmu sendiri tetap rahasia.",
    "id.ob.signLineNone": "Zodiakmu tampil di suratmu. Tanggal lahirmu sendiri tetap rahasia.",
    "id.ep.privateNote": "Orang asing nggak pernah lihat nama pena atau tanggal lahirmu, cuma zodiak yang kamu izinkan. Kerabat bisa lihat nama penamu, juga ♀/♂ kalau kamu izinkan, setelah kalian berdua bertukar nama.",
    "id.ep.avatarNote": "Orang asing tak pernah melihat wajahmu. Kerabat selalu melihat wajah yang kamu pakai sekarang. Foto tak pernah dikirim ke kami atau ke siapa pun.",
    "id.gd.kindreds.f1": "Orang asing membalas suratmu dan sebuah utas terbuka di antara kalian. Belum ada nama: kurirmu memanggilnya dengan nama buatannya sendiri.",
    "id.gd.kindreds.f2": "Lima surat dari tiap sisi, lalu salah satu dari kalian boleh menyertakan nama. Begitu kalian berdua sudah menyertakannya, kaca buramnya jadi bening.",
    "id.ga.stranger": "LENTERA DERMAGA · PENPAL",
    "id.kd.theyFirst": "{name} MENULIS DULU",
    "id.th.goesStraight": "INI LANGSUNG KE DIA",
    "id.th.replyGoesStraight": "BALASAN INI LANGSUNG KE DIA",
    "id.la.out.repliedHead": "Seseorang membalas.",
    "id.writeBackTo": "balas surat {name}…",
  },
  /* ── fr ── */
  {
    "id.mark.she": "elle",
    "id.mark.he": "il",
    "zd.aries": "Bélier",
    "zd.taurus": "Taureau",
    "zd.gemini": "Gémeaux",
    "zd.cancer": "Cancer",
    "zd.leo": "Lion",
    "zd.virgo": "Vierge",
    "zd.libra": "Balance",
    "zd.scorpio": "Scorpion",
    "zd.sagittarius": "Sagittaire",
    "zd.capricorn": "Capricorne",
    "zd.aquarius": "Verseau",
    "zd.pisces": "Poissons",
    "id.vo.penPal": "Correspondance",
    "id.was": "ex-{no}",
    "id.guide": "Les messagères baptisent les inconnus. Chez eux, tu portes sans doute un autre nom.",
    "id.wren.post": "J'ai commencé à donner un nom aux inconnus que je t'apporte.",
    "ep.id.section": "CE QUE L'ON VOIT",
    "ep.id.mark.she": "Afficher ♀ à tes semblables",
    "ep.id.mark.he": "Afficher ♂ à tes semblables",
    "ep.id.markNote": "Seuls tes semblables le voient, après ton nom de plume. Les inconnus, jamais, et personne ne peut s'en servir pour trier ou filtrer.",
    "ep.id.sign": "Afficher ton signe sur tes lettres",
    "ep.id.signNote": "{sign}. Les inconnus voient le signe, jamais ta date de naissance.",
    "ep.id.signNone": "S'affiche une fois ta date de naissance renseignée.",
    "id.note.title": "Ce que voient les inconnus",
    "id.note.body": "Désormais, pour les inconnus, tu portes un nom que leur messagère te donne, jamais ton nom de plume. Ton signe s'affiche à côté, jamais ta date de naissance. Le ♀ ou ♂, seuls tes semblables le voient.",
    "id.note.bodyThey": "Désormais, pour les inconnus, tu portes un nom que leur messagère te donne, jamais ton nom de plume. Ton signe s'affiche à côté, jamais ta date de naissance.",
    "id.note.done": "OK",
    "id.note.foot": "Tu peux changer l'un ou l'autre à tout moment dans Modifier le profil.",
    "id.preview": "TOI, POUR UN INCONNU",
    "id.preview.a11y": "Ce qu'un inconnu voit de toi : {who}",
    "id.ob.signLine": "Ton signe, {sign}, s'affiche sur tes lettres. Ta date de naissance, elle, reste privée.",
    "id.ob.signLineNone": "Ton signe s'affiche sur tes lettres. Ta date de naissance, elle, reste privée.",
    "id.ep.privateNote": "Les inconnus ne voient jamais ton nom de plume ni ta date de naissance, seulement le signe que tu autorises. Un semblable voit ton nom de plume, et le ♀/♂ si tu l'autorises, une fois vos deux noms glissés dans l'enveloppe.",
    "id.ep.avatarNote": "Les inconnus ne voient jamais ton visage. Un semblable voit toujours celui que tu as maintenant. Une photo n'est jamais envoyée, ni à nous ni à personne.",
    "id.gd.kindreds.f1": "Un inconnu répond à ta lettre et un fil s'ouvre entre vous. Pas encore de noms : ta messagère lui en invente un.",
    "id.gd.kindreds.f2": "Cinq lettres de chaque côté, et l'un ou l'autre peut glisser un nom. Quand vous l'avez fait tous les deux, le givre s'efface.",
    "id.ga.stranger": "GALET DE PLUIE · CORRES",
    "id.kd.theyFirst": "{name} A ÉCRIT EN PREMIER",
    "id.th.goesStraight": "ÇA VA DIRECTEMENT CHEZ EUX",
    "id.th.replyGoesStraight": "CETTE RÉPONSE VA DIRECTEMENT CHEZ EUX",
    "id.la.out.repliedHead": "Quelqu'un t'a répondu.",
    "id.writeBackTo": "réponds à {name}…",
  },
  /* ── de ── */
  {
    "id.mark.she": "sie",
    "id.mark.he": "er",
    "zd.aries": "Widder",
    "zd.taurus": "Stier",
    "zd.gemini": "Zwillinge",
    "zd.cancer": "Krebs",
    "zd.leo": "Löwe",
    "zd.virgo": "Jungfrau",
    "zd.libra": "Waage",
    "zd.scorpio": "Skorpion",
    "zd.sagittarius": "Schütze",
    "zd.capricorn": "Steinbock",
    "zd.aquarius": "Wassermann",
    "zd.pisces": "Fische",
    "id.vo.penPal": "Brieffreundschaft",
    "id.was": "früher {no}",
    "id.guide": "Jede Botin gibt den Fremden, die sie bringt, einen Namen. Drüben heißt du vielleicht anders.",
    "id.wren.post": "Ich habe angefangen, den Fremden, die ich dir bringe, Namen zu geben.",
    "ep.id.section": "WAS ANDERE SEHEN",
    "ep.id.mark.she": "♀ deinen Seelenverwandten zeigen",
    "ep.id.mark.he": "♂ deinen Seelenverwandten zeigen",
    "ep.id.markNote": "Nur deine Seelenverwandten sehen es, hinter deinem Schreibnamen. Fremde nie, und niemand kann danach sortieren oder filtern.",
    "ep.id.sign": "Sternzeichen auf deinen Briefen zeigen",
    "ep.id.signNote": "{sign}. Fremde sehen das Sternzeichen, nie dein Geburtsdatum.",
    "ep.id.signNone": "Erscheint, sobald dein Geburtstag eingetragen ist.",
    "id.note.title": "Was Fremde jetzt sehen",
    "id.note.body": "Fremde kennen dich jetzt unter einem Namen, den ihre Botin dir gibt, nie unter deinem Schreibnamen. Daneben steht dein Sternzeichen, nie dein Geburtsdatum. ♀ oder ♂ sehen nur deine Seelenverwandten.",
    "id.note.bodyThey": "Fremde kennen dich jetzt unter einem Namen, den ihre Botin dir gibt, nie unter deinem Schreibnamen. Daneben steht dein Sternzeichen, nie dein Geburtsdatum.",
    "id.note.done": "Fertig",
    "id.note.foot": "Beides kannst du jederzeit unter „Profil bearbeiten“ ändern.",
    "id.preview": "DU, FÜR FREMDE",
    "id.preview.a11y": "So sehen Fremde dich: {who}",
    "id.ob.signLine": "Dein Sternzeichen, {sign}, steht auf deinen Briefen. Dein Geburtsdatum selbst bleibt privat.",
    "id.ob.signLineNone": "Dein Sternzeichen steht auf deinen Briefen. Dein Geburtsdatum selbst bleibt privat.",
    "id.ep.privateNote": "Fremde sehen nie deinen Schreibnamen oder dein Geburtsdatum, nur das Sternzeichen, wenn du es erlaubst. Seelenverwandte sehen deinen Schreibnamen und, wenn du es erlaubst, das ♀/♂, sobald ihr beide eure Namen beigelegt habt.",
    "id.ep.avatarNote": "Fremde sehen dein Gesicht nie. Seelenverwandte sehen immer dein aktuelles Gesicht. Ein Foto wird nie verschickt, weder an uns noch an sonst jemanden.",
    "id.gd.kindreds.f1": "Jemand Fremdes antwortet auf deinen Brief, und zwischen euch öffnet sich ein Faden. Noch keine Namen: Deine Botin denkt sich einen aus.",
    "id.gd.kindreds.f2": "Fünf Briefe in jede Richtung, dann darf jeder von euch einen Namen beilegen. Habt ihr es beide getan, klärt sich das Milchglas.",
    "id.ga.stranger": "HAFENLATERNE · BRIEFWECHSEL",
    "id.kd.theyFirst": "{name} HAT ZUERST GESCHRIEBEN",
    "id.th.goesStraight": "DAS GEHT DIREKT ZU IHNEN",
    "id.th.replyGoesStraight": "DIESE ANTWORT GEHT DIREKT ZU IHNEN",
    "id.la.out.repliedHead": "Jemand hat dir geantwortet.",
    "id.writeBackTo": "schreib {name} zurück…",
  },
  /* ── it ── */
  {
    "id.mark.she": "lei",
    "id.mark.he": "lui",
    "zd.aries": "Ariete",
    "zd.taurus": "Toro",
    "zd.gemini": "Gemelli",
    "zd.cancer": "Cancro",
    "zd.leo": "Leone",
    "zd.virgo": "Vergine",
    "zd.libra": "Bilancia",
    "zd.scorpio": "Scorpione",
    "zd.sagittarius": "Sagittario",
    "zd.capricorn": "Capricorno",
    "zd.aquarius": "Acquario",
    "zd.pisces": "Pesci",
    "id.vo.penPal": "Penna amica",
    "id.was": "era {no}",
    "id.guide": "Ogni messaggera battezza chi porta: dall'altra parte, potresti avere un altro nome.",
    "id.wren.post": "Ho cominciato a dare un nome agli sconosciuti che ti porto.",
    "ep.id.section": "COSA VEDONO DI TE",
    "ep.id.mark.she": "Mostra ♀ alle tue anime affini",
    "ep.id.mark.he": "Mostra ♂ alle tue anime affini",
    "ep.id.markNote": "Lo vedono solo le tue anime affini, dopo il tuo nome di penna. Gli sconosciuti mai, e nessuno può usarlo per ordinare o filtrare.",
    "ep.id.sign": "Segno zodiacale sulle tue lettere",
    "ep.id.signNote": "{sign}. Gli sconosciuti vedono il segno, mai la tua data di nascita.",
    "ep.id.signNone": "Compare quando avrai inserito la data di nascita.",
    "id.note.title": "Cosa vedono ora gli sconosciuti",
    "id.note.body": "Ora gli sconosciuti ti conoscono con un nome che ti dà la loro messaggera, mai col tuo nome di penna. Accanto c'è il tuo segno, mai la tua data di nascita. Il ♀ o ♂ lo vedono solo le tue anime affini.",
    "id.note.bodyThey": "Ora gli sconosciuti ti conoscono con un nome che ti dà la loro messaggera, mai col tuo nome di penna. Accanto c'è il tuo segno, mai la tua data di nascita.",
    "id.note.done": "Fatto",
    "id.note.foot": "Puoi cambiarli quando vuoi in Modifica profilo.",
    "id.preview": "COSÌ TI VEDONO",
    "id.preview.a11y": "Come ti vede uno sconosciuto: {who}",
    "id.ob.signLine": "Il tuo segno, {sign}, compare sulle tue lettere. La data di nascita resta privata.",
    "id.ob.signLineNone": "Il tuo segno compare sulle tue lettere. La data di nascita resta privata.",
    "id.ep.privateNote": "Gli sconosciuti non vedono mai il tuo nome di penna né la tua data di nascita, solo il segno che permetti. Un'anima affine vede il tuo nome di penna, e il ♀/♂ se lo permetti, una volta che avete entrambi allegato i vostri nomi.",
    "id.ep.avatarNote": "Gli sconosciuti non vedono mai il tuo volto. Un'anima affine vede sempre quello che hai adesso. Una foto non viene mai inviata, né a noi né a nessun altro.",
    "id.gd.kindreds.f1": "Qualcuno che non conosci risponde alla tua lettera e tra voi si apre un filo. Ancora niente nomi: la tua messaggera gliene inventa uno.",
    "id.gd.kindreds.f2": "Cinque lettere per parte, e ognuno dei due può allegare un nome. Quando l'avete fatto entrambi, il vetro si schiarisce.",
    "id.ga.stranger": "NASTRO DI SERA · PENNA AMICA",
    "id.kd.theyFirst": "HA COMINCIATO {name}",
    "id.th.goesStraight": "QUESTO VA DRITTO A LORO",
    "id.th.replyGoesStraight": "QUESTA RISPOSTA VA DRITTA A LORO",
    "id.la.out.repliedHead": "Qualcuno ti ha risposto.",
    "id.writeBackTo": "rispondi a {name}…",
  },
  /* ── ja ── */
  {
    "id.mark.she": "女性",
    "id.mark.he": "男性",
    "zd.aries": "おひつじ座",
    "zd.taurus": "おうし座",
    "zd.gemini": "ふたご座",
    "zd.cancer": "かに座",
    "zd.leo": "しし座",
    "zd.virgo": "おとめ座",
    "zd.libra": "てんびん座",
    "zd.scorpio": "さそり座",
    "zd.sagittarius": "いて座",
    "zd.capricorn": "やぎ座",
    "zd.aquarius": "みずがめ座",
    "zd.pisces": "うお座",
    "id.vo.penPal": "文通相手",
    "id.was": "以前は {no}",
    "id.guide": "伝書鳥は、連れてくる見知らぬ人に名前をつけます。相手のもとでは、あなたも別の名前かもしれません。",
    "id.wren.post": "あなたに連れてくる見知らぬ人たちに、名前をつけはじめたよ。",
    "ep.id.section": "ほかの人に見えるもの",
    "ep.id.mark.she": "心友に♀を表示",
    "ep.id.mark.he": "心友に♂を表示",
    "ep.id.markNote": "心友にだけ、ペンネームのあとに表示されます。見知らぬ人には見えません。誰もこれで並べ替えたり絞り込んだりはできません。",
    "ep.id.sign": "手紙に星座を表示",
    "ep.id.signNote": "{sign}。見知らぬ人に見えるのは星座だけで、誕生日は見えません。",
    "ep.id.signNone": "誕生日を設定すると表示されます。",
    "id.note.title": "見知らぬ人に見えるもの",
    "id.note.body": "これからは、見知らぬ人の伝書鳥があなたに名前をつけます。ペンネームは見えません。名前の横には星座が出ますが、誕生日は出ません。♀や♂は心友にだけ見えます。",
    "id.note.bodyThey": "これからは、見知らぬ人の伝書鳥があなたに名前をつけます。ペンネームは見えません。名前の横には星座が出ますが、誕生日は出ません。",
    "id.note.done": "完了",
    "id.note.foot": "どちらも「プロフィールを編集」からいつでも変えられます。",
    "id.preview": "見知らぬ人から見たあなた",
    "id.preview.a11y": "見知らぬ人から見たあなた：{who}",
    "id.ob.signLine": "手紙には星座（{sign}）が表示されます。誕生日そのものは公開されません。",
    "id.ob.signLineNone": "手紙には星座が表示されます。誕生日そのものは公開されません。",
    "id.ep.privateNote": "見知らぬ人には、ペンネームも誕生日も見えません。見えるのは、あなたが許した星座だけ。ペンネームと、あなたが許した♀/♂が見えるのは、互いに名前を添えた心友だけです。",
    "id.ep.avatarNote": "見知らぬ人に、あなたの顔は見えません。心友には、いまのあなたの顔が見えます。写真が私たちや誰かに送られることはありません。",
    "id.gd.kindreds.f1": "見知らぬ人があなたの手紙に返事をすると、ふたりの間にスレッドが開きます。まだ名前はないので、伝書鳥がつけた名前で呼びます。",
    "id.gd.kindreds.f2": "お互いに五通ずつ送ると、どちらからでも名前を添えられます。ふたりとも添えたら、すりガラスの曇りが晴れます。",
    "id.ga.stranger": "雨のランタン · 文通相手",
    "id.kd.theyFirst": "先に書いたのは{name}",
    "id.th.goesStraight": "これは相手にまっすぐ届きます",
    "id.th.replyGoesStraight": "この返事は相手にまっすぐ届きます",
    "id.la.out.repliedHead": "誰かが返事をくれました。",
    "id.writeBackTo": "{name}さんに返事を書く…",
  },
  /* ── ko ── */
  {
    "id.mark.she": "여성",
    "id.mark.he": "남성",
    "zd.aries": "양자리",
    "zd.taurus": "황소자리",
    "zd.gemini": "쌍둥이자리",
    "zd.cancer": "게자리",
    "zd.leo": "사자자리",
    "zd.virgo": "처녀자리",
    "zd.libra": "천칭자리",
    "zd.scorpio": "전갈자리",
    "zd.sagittarius": "궁수자리",
    "zd.capricorn": "염소자리",
    "zd.aquarius": "물병자리",
    "zd.pisces": "물고기자리",
    "id.vo.penPal": "펜팔",
    "id.was": "예전엔 {no}",
    "id.guide": "전령새는 데려오는 낯선 사람에게 이름을 붙여요. 상대 쪽에선 당신도 다른 이름일지 몰라요.",
    "id.wren.post": "당신에게 데려오는 낯선 사람들에게 이름을 붙여 주기 시작했어.",
    "ep.id.section": "다른 사람에게 보이는 것",
    "ep.id.mark.she": "인연에게 ♀ 표시",
    "ep.id.mark.he": "인연에게 ♂ 표시",
    "ep.id.markNote": "인연에게만 필명 뒤에 표시돼요. 낯선 사람에겐 보이지 않고, 누구도 이걸로 정렬하거나 걸러 낼 수 없어요.",
    "ep.id.sign": "편지에 별자리 표시",
    "ep.id.signNote": "{sign}. 낯선 사람에겐 별자리만 보이고, 생일은 보이지 않아요.",
    "ep.id.signNone": "생일을 입력하면 표시돼요.",
    "id.note.title": "이제 낯선 사람에게 보이는 것",
    "id.note.body": "이제 낯선 사람에게 당신은 그쪽 전령새가 붙인 이름으로 보여요. 필명은 보이지 않아요. 이름 옆엔 별자리가 보이고, 생일은 보이지 않아요. ♀ 또는 ♂ 표시는 인연에게만 보여요.",
    "id.note.bodyThey": "이제 낯선 사람에게 당신은 그쪽 전령새가 붙인 이름으로 보여요. 필명은 보이지 않아요. 이름 옆엔 별자리가 보이고, 생일은 보이지 않아요.",
    "id.note.done": "완료",
    "id.note.foot": "둘 다 프로필 편집에서 언제든 바꿀 수 있어요.",
    "id.preview": "낯선 사람이 보는 당신",
    "id.preview.a11y": "낯선 사람이 보는 당신: {who}",
    "id.ob.signLine": "편지에는 별자리 {sign}가 표시돼요. 생일 자체는 공개되지 않아요.",
    "id.ob.signLineNone": "편지에는 별자리가 표시돼요. 생일 자체는 공개되지 않아요.",
    "id.ep.privateNote": "낯선 사람은 필명도 생일도 볼 수 없어요. 당신이 허용한 별자리만 보여요. 필명과 당신이 허용한 ♀/♂ 표시는 서로 이름을 동봉한 인연만 볼 수 있어요.",
    "id.ep.avatarNote": "낯선 사람은 당신의 얼굴을 볼 수 없어요. 인연은 늘 지금 당신의 얼굴을 봐요. 사진은 우리에게도, 다른 누구에게도 보내지지 않아요.",
    "id.gd.kindreds.f1": "낯선 사람이 당신의 편지에 답하면 둘 사이에 스레드가 열려요. 아직 이름은 없어요. 전령새가 지어 준 이름으로 불러요.",
    "id.gd.kindreds.f2": "서로 다섯 통씩 오가면 둘 중 누구든 이름을 동봉할 수 있어요. 둘 다 동봉하면 뿌연 유리가 맑아져요.",
    "id.ga.stranger": "새벽 우산 · 펜팔",
    "id.kd.theyFirst": "먼저 쓴 건 {name}",
    "id.th.goesStraight": "이건 상대에게 곧장 가요",
    "id.th.replyGoesStraight": "이 답장은 상대에게 곧장 가요",
    "id.la.out.repliedHead": "누군가 답장했어요.",
    "id.writeBackTo": "{name}에게 답장 쓰기…",
  },
);
