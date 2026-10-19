import { strings } from "../lib/i18n";

/* IDENTITY PHASE 2 — EVERY NEW WORD THE SIGNED NAME NEEDS (2026-10-19).
   ────────────────────────────────────────────────────────────────────────
   The signing sheet, the sign door's two new states, the ceremony's
   signatures and the kindred page's signed name
   (.claude/ui10a-research/identity/identity-plan.md §1 rows 3–5a, §7, §11;
   the owner's decisions and every screen's flow are in
   .claude/identity-build/PHASE2.md, which overrides the plan). All of it
   sits behind the remote switch app_surfaces('identity'): with the switch
   off no screen reads any key in this file, and the door, the ENCLOSE IT
   confirmation and the ceremony say exactly what they said before.

   All nine languages are written (2026-10-19 copy pass): each block was
   written AS its language from a short native brief (a tender, slightly
   formal moment, trading names after five letters each way, but young),
   then read blind as that language's editor, the way strings-identity.ts
   was. Each key's comment, on the English, says what it is, where it sits
   and how long it may run; a new key goes in every block, or t() falls
   back to English for it.

   Choices the blocks share, so the next writer keeps them:
   - The act is the everyday word for putting your name on something, never
     a legal one: firmar, assinar, tanda tangan (teken only on the button,
     where nothing longer fits 16), signer, unterschreiben, firmare,
     ja サイン (署名 only in id2.sheet.legal, for the legal signature it must
     not be), ko 서명 (as the app's in.knowYou already says).
   - Nobody is gendered: the reader is never "invitado/convidado" (es/pt/fr/
     it say "without an account"; de Gast, id tamu, ja ゲスト and ko 게스트
     are neutral), and the other side is never a masculine role noun. "You
     stay pen pals" is es/pt penpals, fr "en correspondance", de "eine
     Brieffreundschaft", it "penne amiche"; "you both see each other's" is
     built on the two signatures (las dos / as duas / les deux / beide)
     where a plural would agree.
   - "Just for this kindred" (id2.sheet.faceNote) says "this person" or the
     correspondence: at that moment they are not kindreds yet.
   - id2.door.theyFirst is NOT id.kd.theyFirst (wrote the first letter), so
     no block reuses that line: es FIRMÓ PRIMERO, pt/fr/it "already signed",
     de HAT UNTERSCHRIEBEN, id SUDAH TANDA TANGAN, ja 先にサインしたのは, ko
     먼저 서명한 건. With the longest courier name each list can make (es/fr/
     it 19, id 16, de 15) the door runs to 35 characters at most, which the
     brass sticker still sets on one line at 375 (it wraps, never clips).
   - The pad's two switches name the other way plainly (Mejor teclearlo /
     Mejor a mano, Plutôt le taper / Plutôt à la main…), and id2.sheet.padA11y
     quotes the type switch with exactly its own words.

   Who reads what (PHASE2.md "Files"): id2.sheet.* the signing sheet (sheet
   agent); id2.door.* buildLettersDock's sign door (sheet agent);
   id2.in.* the introduction ritual (ceremony agent); id2.kd.* the kindred
   page (ceremony agent); id2.rp.* the long-press on a signature (ceremony
   agent). The web has its own words (z()), but scripts/port-zine-copy.mjs
   fills every zine line that says the same English from this file.

   GRAMMAR AROUND {name}. In id2.door.theyFirst, id2.sheet.lead* and
   id2.in.a11y, {name} is a COURIER NAME ("Sunday Kite", "雨のランタン"):
   no article, possessive or agreeing adjective (strings-identity.ts has the
   rules per language). {pen} is the reader's own typed pen name. Never
   suggest a signature is checked, verified or legally binding: it is a pen
   name, drawn. ko has no particle helper, so no block puts a particle that
   changes with the last syllable after {name} or {pen}: only invariant
   ones (도, 의) or none, with the name last ("먼저 서명한 건 {name}"). ja:
   さん after a courier name inside sentences (id2.sheet.lead, leadTheirs,
   in.a11y), never in labels, never after the reader's own; a pen name sits
   in 「」 in the sentences that say it. */

strings(
  /* ── en ── */
  {
    /* ── the sign door (the brass sticker over the pen-pal reply bar, from five letters each way) ── */
    // they have signed and you haven't: the door is gold and opens the signing sheet. {name} is their courier name,
    // already in capitals. "Wrote first" = wrote their NAME first (signed first), not who wrote the opening letter.
    // Mono caps, one line: at most about 32 characters with an 18-character name
    "id2.door.theyFirst": "{name} WROTE FIRST",
    // you have signed and they haven't: a quiet line where the door was, not a button. Mono caps, at most 24 characters
    "id2.door.waiting": "YOU SIGNED · WAITING",
    // VoiceOver hint on the door (offer and theyFirst): what a double tap does
    "id2.door.hint": "Opens the page where you sign your name.",

    /* ── the signing sheet (a page sheet over the chat) ── */
    // the sheet's title, mono caps, at most 18 characters
    "id2.sheet.title": "SIGN YOUR NAME",
    // the close button, said aloud
    "id2.sheet.close": "Close",
    // the first line, in Wren's serif italic, when you would be the first to sign. {name} = their courier name.
    // What travels and when. At most about 120 characters
    "id2.sheet.lead": "When {name} signs too, this is what they get: the face, the name and the signature below.",
    // the same line when they have signed already: yours opens theirs. At most about 120 characters
    "id2.sheet.leadTheirs": "{name} has signed. The moment yours goes, you both see each other's.",
    // group label over the faces, mono caps, at most 16 characters
    "id2.sheet.face": "THE FACE YOU SEND",
    // under the faces when the reader wears a photo: it stays on the phone. At most about 90 characters
    "id2.sheet.facePhoto": "Your photo never leaves this phone. Send one of these faces, or none.",
    // under the faces otherwise: the choice is for this kindred only. At most about 90 characters
    "id2.sheet.faceNote": "Just for this kindred. Your profile keeps its own face.",
    // the "no face" choice (a plain glyph), its label and what VoiceOver says
    "id2.sheet.faceNone": "No face",
    // VoiceOver for one library face in the row: {n} of {m}, and whether it's the one chosen is the control's own state
    "id2.sheet.faceA11y": "Face {n} of {m}",
    // group label over the name field, mono caps, at most 16 characters
    "id2.sheet.name": "YOUR PEN NAME",
    // the name field's placeholder when it's empty (the first trade): what a pen name is. At most about 30 characters
    "id2.sheet.namePh": "A name to be known by",
    // under the field at the first trade: it's kept and used from now on. At most about 90 characters
    "id2.sheet.nameFirst": "It's saved to your profile. Every kindred from now on knows you by it.",
    // under the field at a later trade (filled from the profile): change it here and it changes from now on. At most about 90 characters
    "id2.sheet.nameLater": "From your profile. Change it here and it changes for the kindreds still to come.",
    // under the field, in red, when the name is the one a stranger's courier already calls you: the reveal would change nothing
    "id2.sheet.nameCourier": "That's the name strangers already know you by. Choose your own.",
    // in red, when the name holds a link, an @handle or a long number (lib/wren screenNow): a pen name can't carry contact details
    "id2.sheet.nameOffpage": "No links, handles or numbers in a pen name.",
    // group label over the pad, mono caps, at most 16 characters
    "id2.sheet.sign": "YOUR SIGNATURE",
    // the faint caption in the empty pad's corner, over the faint traced pen name. Lowercase, at most about 24 characters
    "id2.sheet.trace": "trace your pen name",
    // the faint guide when no pen name is typed yet, on the baseline. Lowercase, at most about 16 characters
    "id2.sheet.traceEmpty": "sign here",
    // the pad's two small buttons
    "id2.sheet.undo": "Undo",
    "id2.sheet.clear": "Clear",
    // the switch above the pad: send the name in type instead of drawing it (one tap; VoiceOver lands here first)
    "id2.sheet.typeIt": "Type it instead",
    // the same switch while typed: back to the pad
    "id2.sheet.drawIt": "Draw it instead",
    // VoiceOver hint on "Type it instead"
    "id2.sheet.typeItHint": "Sends your pen name in type, without a drawing.",
    // VoiceOver label of the pad itself: what it is and how to use it (and that typing is the other way)
    "id2.sheet.padA11y": "Signature pad. Draw your pen name with one finger, or choose Type it instead.",
    // VoiceOver value of the pad once something is drawn
    "id2.sheet.padDrawn": "Signed, {n} strokes",
    // under the pad, small, plainly: the most important sentence on the sheet. At most about 60 characters
    "id2.sheet.legal": "Sign your pen name, not your legal signature.",
    // for a guest (an anonymous session): they can sign now; an account keeps the kindred. At most about 110 characters
    "id2.sheet.guest": "You can sign as a guest. Link an account to keep this kindred on any device.",
    // the guest line's text button (opens the existing sign-in sheet, which links the guest)
    "id2.sheet.guestLink": "Link an account",
    // the reason line the sign-in sheet shows when opened from here
    "id2.sheet.guestReason": "Somewhere to keep your kindreds, on any device.",
    // the main button, mono caps, at most 16 characters
    "id2.sheet.send": "SIGN AND SEND",
    // the foot line under the button: when they see it, and that never signing is allowed. At most about 110 characters
    "id2.sheet.foot": "They see it only once they've signed too. If they never do, you stay pen pals, and that's allowed.",

    /* ── the introduction ritual (identity on) ── */
    // VoiceOver: the ritual is one element that says what happened, the courier name and then the pen name.
    // {name} = their courier name, {pen} = the pen name they signed
    "id2.in.a11y": "{name} signed as {pen}.",
    // VoiceOver for your side of it. {name} = the courier name strangers knew you by, {pen} = yours
    "id2.in.a11yMine": "And you, {name} to them until now, signed as {pen}.",

    /* ── the kindred page ── */
    // the label over their signature (the drawing, or the typed name in the italic). Mono caps, at most 22 characters
    "id2.kd.signed": "THE NAME THEY SIGNED",
    // under it: the courier name they had while you were strangers. {name} in capitals ("SUNDAY KITE", "NO. 4481"). Mono caps
    "id2.kd.firstMet": "FIRST MET AS {name}",
    // VoiceOver for a drawn signature: {pen} = their pen name
    "id2.kd.drawnA11y": "{pen}, signed by hand",
    // VoiceOver for a typed one
    "id2.kd.typedA11y": "{pen}, signed in type",
    // VoiceOver hint on a signature that can be long-pressed
    "id2.kd.holdHint": "Touch and hold to report or block.",

    // a kindred's Kindreds row, second line, for 7 days after names were traded: the courier name they had as a
    // stranger. {name} is that courier name ("Sunday Kite"). Lowercase, short (the Phase 1 "was {no}" line's twin,
    // written for a name rather than a number)
    "id2.kd.was": "was {name}",

    /* ── the long-press on a signature (the ceremony's end state and the kindred page) ── */
    // the menu's report row (Block reuses rp.menu.block)
    "id2.rp.signature": "Report this signature",
  },
  /* ── es ── */
  {
    "id2.door.theyFirst": "{name} FIRMÓ PRIMERO",
    "id2.door.waiting": "FIRMASTE · ESPERANDO",
    "id2.door.hint": "Abre la página para firmar con tu nombre.",
    "id2.sheet.title": "PON TU FIRMA",
    "id2.sheet.close": "Cerrar",
    "id2.sheet.lead": "Cuando {name} también firme, recibirá esto: la cara, el nombre y la firma de aquí abajo.",
    "id2.sheet.leadTheirs": "{name} ya firmó. En cuanto mandes la tuya, las dos se abren a la vez.",
    "id2.sheet.face": "LA CARA QUE DAS",
    "id2.sheet.facePhoto": "Tu foto nunca sale de este teléfono. Manda una de estas caras, o ninguna.",
    "id2.sheet.faceNote": "Solo para esta persona. Tu perfil sigue con su cara de siempre.",
    "id2.sheet.faceNone": "Sin cara",
    "id2.sheet.faceA11y": "Cara {n} de {m}",
    "id2.sheet.name": "TU SEUDÓNIMO",
    "id2.sheet.namePh": "Cómo quieres que te llamen",
    "id2.sheet.nameFirst": "Se guarda en tu perfil. Desde ahora, todos tus afines te conocerán así.",
    "id2.sheet.nameLater": "Viene de tu perfil. Si lo cambias aquí, cambia para los afines que estén por llegar.",
    "id2.sheet.nameCourier": "Así te llaman ya los desconocidos. Elige un nombre tuyo.",
    "id2.sheet.nameOffpage": "Un seudónimo no lleva enlaces, @usuarios ni números.",
    "id2.sheet.sign": "TU FIRMA",
    "id2.sheet.trace": "repasa tu seudónimo",
    "id2.sheet.traceEmpty": "firma aquí",
    "id2.sheet.undo": "Deshacer",
    "id2.sheet.clear": "Borrar",
    "id2.sheet.typeIt": "Mejor teclearlo",
    "id2.sheet.drawIt": "Mejor a mano",
    "id2.sheet.typeItHint": "Envía tu seudónimo tecleado, sin firma a mano.",
    "id2.sheet.padA11y": "Panel de firma. Escribe tu seudónimo con un dedo, o elige Mejor teclearlo.",
    "id2.sheet.padDrawn": "Firmado, {n} trazos",
    "id2.sheet.legal": "Pon tu seudónimo, no tu firma oficial.",
    "id2.sheet.guest": "Puedes firmar sin cuenta. Vincula una y conservarás esta correspondencia en cualquier dispositivo.",
    "id2.sheet.guestLink": "Vincular una cuenta",
    "id2.sheet.guestReason": "Un lugar donde guardar a tus afines, en cualquier dispositivo.",
    "id2.sheet.send": "FIRMAR Y ENVIAR",
    "id2.sheet.foot": "Solo lo verá cuando también firme. Si nunca lo hace, seguirán siendo penpals, y no pasa nada.",
    "id2.in.a11y": "{name} firmó como {pen}.",
    "id2.in.a11yMine": "Y tú, que hasta ahora eras {name}, firmaste como {pen}.",
    "id2.kd.signed": "EL NOMBRE QUE FIRMÓ",
    "id2.kd.firstMet": "LLEGÓ COMO {name}",
    "id2.kd.drawnA11y": "{pen}, firmado a mano",
    "id2.kd.typedA11y": "{pen}, firmado con el teclado",
    "id2.kd.holdHint": "Mantén pulsado para reportar o bloquear.",
    "id2.kd.was": "era {name}",
    "id2.rp.signature": "Reportar esta firma",
  },
  /* ── pt ── */
  {
    "id2.door.theyFirst": "{name} JÁ ASSINOU",
    "id2.door.waiting": "VOCÊ ASSINOU · ESPERANDO",
    "id2.door.hint": "Abre a página onde você assina com seu nome.",
    "id2.sheet.title": "ASSINE SEU NOME",
    "id2.sheet.close": "Fechar",
    "id2.sheet.lead": "Quando {name} também assinar, vai receber isto: o rosto, o nome e a assinatura aqui de baixo.",
    "id2.sheet.leadTheirs": "{name} já assinou. Assim que a sua for, as duas se abrem juntas.",
    "id2.sheet.face": "QUAL ROSTO VAI",
    "id2.sheet.facePhoto": "Sua foto nunca sai deste celular. Mande um destes rostos, ou nenhum.",
    "id2.sheet.faceNote": "Só pra essa pessoa. O rosto do seu perfil continua o mesmo.",
    "id2.sheet.faceNone": "Sem rosto",
    "id2.sheet.faceA11y": "Rosto {n} de {m}",
    "id2.sheet.name": "SEU PSEUDÔNIMO",
    "id2.sheet.namePh": "Um nome pra te chamarem",
    "id2.sheet.nameFirst": "Fica salvo no seu perfil. Daqui pra frente, toda alma afim vai te conhecer por ele.",
    "id2.sheet.nameLater": "Vem do seu perfil. Mude aqui e ele muda pras próximas almas afins.",
    "id2.sheet.nameCourier": "É assim que os desconhecidos já te chamam. Escolha um nome seu.",
    "id2.sheet.nameOffpage": "Nada de links, @ ou números no pseudônimo.",
    "id2.sheet.sign": "SUA ASSINATURA",
    "id2.sheet.trace": "passe por cima do nome",
    "id2.sheet.traceEmpty": "assine aqui",
    "id2.sheet.undo": "Desfazer",
    "id2.sheet.clear": "Limpar",
    "id2.sheet.typeIt": "Prefiro digitar",
    "id2.sheet.drawIt": "Prefiro assinar à mão",
    "id2.sheet.typeItHint": "Envia seu pseudônimo digitado, sem assinatura à mão.",
    "id2.sheet.padA11y": "Área de assinatura. Escreva seu pseudônimo com um dedo, ou escolha Prefiro digitar.",
    "id2.sheet.padDrawn": "Assinado, {n} traços",
    "id2.sheet.legal": "Use seu pseudônimo, não sua assinatura oficial.",
    "id2.sheet.guest": "Dá pra assinar sem conta. Vincule uma pra ter essa alma afim em qualquer aparelho.",
    "id2.sheet.guestLink": "Vincular uma conta",
    "id2.sheet.guestReason": "Um lugar pra guardar suas almas afins, em qualquer aparelho.",
    "id2.sheet.send": "ASSINAR E ENVIAR",
    "id2.sheet.foot": "Essa pessoa só vê tudo isso quando assinar também. Se nunca assinar, vocês continuam penpals, e tudo bem.",
    "id2.in.a11y": "{name} assinou como {pen}.",
    "id2.in.a11yMine": "E você, que até agora era {name}, assinou como {pen}.",
    "id2.kd.signed": "O NOME ASSINADO",
    "id2.kd.firstMet": "CHEGOU COMO {name}",
    "id2.kd.drawnA11y": "{pen}, assinado à mão",
    "id2.kd.typedA11y": "{pen}, assinado no teclado",
    "id2.kd.holdHint": "Toque e segure pra denunciar ou bloquear.",
    "id2.kd.was": "era {name}",
    "id2.rp.signature": "Denunciar esta assinatura",
  },
  /* ── id ── */
  {
    "id2.door.theyFirst": "{name} SUDAH TANDA TANGAN",
    "id2.door.waiting": "TANDA TANGAN · MENUNGGU",
    "id2.door.hint": "Membuka halaman untuk menandatangani namamu.",
    "id2.sheet.title": "TANDA TANGAN",
    "id2.sheet.close": "Tutup",
    "id2.sheet.lead": "Begitu {name} ikut tanda tangan, inilah yang ia terima: wajah, nama, dan tanda tangan di bawah ini.",
    "id2.sheet.leadTheirs": "{name} sudah tanda tangan. Begitu punyamu terkirim, kalian bisa saling melihat.",
    "id2.sheet.face": "PILIH WAJAH",
    "id2.sheet.facePhoto": "Fotomu tak pernah keluar dari ponsel ini. Kirim salah satu wajah ini, atau tanpa wajah.",
    "id2.sheet.faceNote": "Hanya untuk orang ini. Wajah di profilmu tetap seperti biasa.",
    "id2.sheet.faceNone": "Tanpa wajah",
    "id2.sheet.faceA11y": "Wajah {n} dari {m}",
    "id2.sheet.name": "NAMA PENAMU",
    "id2.sheet.namePh": "Ingin dikenal sebagai…",
    "id2.sheet.nameFirst": "Nama ini disimpan di profilmu. Mulai sekarang, setiap kerabat mengenalmu dengan nama ini.",
    "id2.sheet.nameLater": "Dari profilmu. Kalau diubah di sini, kerabat berikutnya akan mengenal nama yang baru.",
    "id2.sheet.nameCourier": "Itu nama yang sudah dipakai orang asing untukmu. Pilih namamu sendiri.",
    "id2.sheet.nameOffpage": "Nama pena tak boleh berisi tautan, @akun, atau nomor.",
    "id2.sheet.sign": "TANDA TANGANMU",
    "id2.sheet.trace": "tebalkan nama penamu",
    "id2.sheet.traceEmpty": "tulis di sini",
    "id2.sheet.undo": "Urungkan",
    "id2.sheet.clear": "Hapus",
    "id2.sheet.typeIt": "Ketik saja",
    "id2.sheet.drawIt": "Tulis tangan saja",
    "id2.sheet.typeItHint": "Mengirim nama penamu sebagai ketikan, tanpa coretan tangan.",
    "id2.sheet.padA11y": "Kolom tanda tangan. Tulis nama penamu dengan satu jari, atau pilih Ketik saja.",
    "id2.sheet.padDrawn": "Sudah ditandatangani, {n} goresan",
    "id2.sheet.legal": "Tulis nama penamu, bukan tanda tangan resmimu.",
    "id2.sheet.guest": "Kamu bisa tanda tangan sebagai tamu. Tautkan akun agar kerabat ini tetap ada di perangkat mana pun.",
    "id2.sheet.guestLink": "Tautkan akun",
    "id2.sheet.guestReason": "Tempat menyimpan kerabat-kerabatmu, di perangkat mana pun.",
    "id2.sheet.send": "TEKEN DAN KIRIM",
    "id2.sheet.foot": "Ia baru melihatnya setelah ikut tanda tangan. Kalau tidak pernah, kalian tetap penpal, dan itu tidak apa-apa.",
    "id2.in.a11y": "{name} bertanda tangan sebagai {pen}.",
    "id2.in.a11yMine": "Dan kamu, yang selama ini {name} baginya, bertanda tangan sebagai {pen}.",
    "id2.kd.signed": "NAMA TANDA TANGANNYA",
    "id2.kd.firstMet": "PERTAMA KENAL SEBAGAI {name}",
    "id2.kd.drawnA11y": "{pen}, tulisan tangan",
    "id2.kd.typedA11y": "{pen}, diketik",
    "id2.kd.holdHint": "Sentuh lama untuk melaporkan atau memblokir.",
    "id2.kd.was": "dulu {name}",
    "id2.rp.signature": "Laporkan tanda tangan ini",
  },
  /* ── fr ── */
  {
    "id2.door.theyFirst": "{name} A DÉJÀ SIGNÉ",
    "id2.door.waiting": "TU AS SIGNÉ · EN ATTENTE",
    "id2.door.hint": "Ouvre la page où tu signes de ton nom.",
    "id2.sheet.title": "SIGNE DE TON NOM",
    "id2.sheet.close": "Fermer",
    "id2.sheet.lead": "Quand {name} signera à son tour, voici ce qu'on lui remettra : le visage, le nom et la signature ci-dessous.",
    "id2.sheet.leadTheirs": "{name} a signé. Dès que la tienne part, les deux s'ouvrent en même temps.",
    "id2.sheet.face": "LE VISAGE ENVOYÉ",
    "id2.sheet.facePhoto": "Ta photo ne quitte jamais ce téléphone. Envoie un de ces visages, ou aucun.",
    "id2.sheet.faceNote": "Rien que pour cette correspondance. Ton profil garde son visage.",
    "id2.sheet.faceNone": "Aucun visage",
    "id2.sheet.faceA11y": "Visage {n} sur {m}",
    "id2.sheet.name": "TON NOM DE PLUME",
    "id2.sheet.namePh": "Le nom qu'on retiendra",
    "id2.sheet.nameFirst": "Il est enregistré dans ton profil. Désormais, tes semblables te connaîtront sous ce nom.",
    "id2.sheet.nameLater": "Repris de ton profil. Change-le ici, et il change pour les semblables à venir.",
    "id2.sheet.nameCourier": "C'est déjà le nom que te donnent les inconnus. Choisis le tien.",
    "id2.sheet.nameOffpage": "Pas de liens, de @pseudos ni de numéros dans un nom de plume.",
    "id2.sheet.sign": "TA SIGNATURE",
    "id2.sheet.trace": "repasse ton nom de plume",
    "id2.sheet.traceEmpty": "signe ici",
    "id2.sheet.undo": "Annuler",
    "id2.sheet.clear": "Effacer",
    "id2.sheet.typeIt": "Plutôt le taper",
    "id2.sheet.drawIt": "Plutôt à la main",
    "id2.sheet.typeItHint": "Envoie ton nom de plume tapé, sans signature dessinée.",
    "id2.sheet.padA11y": "Zone de signature. Trace ton nom de plume avec un doigt, ou choisis Plutôt le taper.",
    "id2.sheet.padDrawn": "Signé, {n} traits",
    "id2.sheet.legal": "Ton nom de plume, pas ta signature officielle.",
    "id2.sheet.guest": "Tu peux signer sans compte. Associe un compte pour garder cette correspondance sur tous tes appareils.",
    "id2.sheet.guestLink": "Associer un compte",
    "id2.sheet.guestReason": "Un endroit où garder tes semblables, sur tous tes appareils.",
    "id2.sheet.send": "SIGNER & ENVOYER",
    "id2.sheet.foot": "Ils ne le verront qu'après avoir signé à leur tour. Sinon, vous restez en correspondance, et c'est très bien.",
    "id2.in.a11y": "{name} a signé sous le nom de {pen}.",
    "id2.in.a11yMine": "Et toi, jusqu'ici {name} pour eux, tu as signé sous le nom de {pen}.",
    "id2.kd.signed": "LEUR SIGNATURE",
    "id2.kd.firstMet": "AU DÉPART, {name}",
    "id2.kd.drawnA11y": "{pen}, signé à la main",
    "id2.kd.typedA11y": "{pen}, signé au clavier",
    "id2.kd.holdHint": "Maintiens appuyé pour signaler ou bloquer.",
    "id2.kd.was": "ex-{name}",
    "id2.rp.signature": "Signaler cette signature",
  },
  /* ── de ── */
  {
    "id2.door.theyFirst": "{name} HAT UNTERSCHRIEBEN",
    "id2.door.waiting": "UNTERSCHRIEBEN · WARTEN",
    "id2.door.hint": "Öffnet die Seite, auf der du mit deinem Namen unterschreibst.",
    "id2.sheet.title": "UNTERSCHREIBEN",
    "id2.sheet.close": "Schließen",
    "id2.sheet.lead": "Wenn {name} auch unterschreibt, geht das hier raus: das Gesicht, der Name und die Unterschrift unten.",
    "id2.sheet.leadTheirs": "{name} hat schon unterschrieben. Sobald deine rausgeht, öffnen sich beide zugleich.",
    "id2.sheet.face": "WELCHES GESICHT",
    "id2.sheet.facePhoto": "Dein Foto verlässt nie dieses Handy. Schick eins dieser Gesichter mit – oder keins.",
    "id2.sheet.faceNote": "Nur für diese Brieffreundschaft. Dein Profil behält sein eigenes Gesicht.",
    "id2.sheet.faceNone": "Kein Gesicht",
    "id2.sheet.faceA11y": "Gesicht {n} von {m}",
    "id2.sheet.name": "DEIN SCHREIBNAME",
    "id2.sheet.namePh": "Wie willst du heißen?",
    "id2.sheet.nameFirst": "Er landet in deinem Profil. Ab jetzt kennen dich alle Seelenverwandten unter diesem Namen.",
    "id2.sheet.nameLater": "Aus deinem Profil. Änderst du ihn hier, gilt er für alle künftigen Seelenverwandten.",
    "id2.sheet.nameCourier": "Unter diesem Namen kennen dich Fremde schon. Such dir einen eigenen aus.",
    "id2.sheet.nameOffpage": "Keine Links, @Namen oder Nummern im Schreibnamen.",
    "id2.sheet.sign": "UNTERSCHRIFT",
    "id2.sheet.trace": "fahr den Namen nach",
    "id2.sheet.traceEmpty": "unterschreib hier",
    "id2.sheet.undo": "Rückgängig",
    "id2.sheet.clear": "Löschen",
    "id2.sheet.typeIt": "Lieber tippen",
    "id2.sheet.drawIt": "Lieber von Hand",
    "id2.sheet.typeItHint": "Schickt deinen Schreibnamen getippt, ohne Handschrift.",
    "id2.sheet.padA11y": "Unterschriftenfeld. Zeichne deinen Schreibnamen mit einem Finger oder wähle „Lieber tippen“.",
    "id2.sheet.padDrawn": "Unterschrieben, {n} Striche",
    "id2.sheet.legal": "Dein Schreibname, nicht deine echte Unterschrift.",
    "id2.sheet.guest": "Du kannst als Gast unterschreiben. Verknüpf ein Konto, dann bleibt dir diese Verbindung auf jedem Gerät.",
    "id2.sheet.guestLink": "Konto verknüpfen",
    "id2.sheet.guestReason": "Ein Ort für deine Seelenverwandten, auf jedem Gerät.",
    "id2.sheet.send": "ABSCHICKEN",
    "id2.sheet.foot": "Sie sehen es erst, wenn sie auch unterschreiben. Sonst bleibt es eine Brieffreundschaft, und das darf so sein.",
    "id2.in.a11y": "{name} hat als {pen} unterschrieben.",
    "id2.in.a11yMine": "Und du, für sie bisher {name}, hast als {pen} unterschrieben.",
    "id2.kd.signed": "IHRE UNTERSCHRIFT",
    "id2.kd.firstMet": "KENNENGELERNT ALS {name}",
    "id2.kd.drawnA11y": "{pen}, von Hand unterschrieben",
    "id2.kd.typedA11y": "{pen}, getippt",
    "id2.kd.holdHint": "Gedrückt halten, um zu melden oder zu blockieren.",
    "id2.kd.was": "früher {name}",
    "id2.rp.signature": "Diese Unterschrift melden",
  },
  /* ── it ── */
  {
    "id2.door.theyFirst": "{name} HA GIÀ FIRMATO",
    "id2.door.waiting": "HAI FIRMATO · IN ATTESA",
    "id2.door.hint": "Apre la pagina dove firmi con il tuo nome.",
    "id2.sheet.title": "FIRMA COL TUO NOME",
    "id2.sheet.close": "Chiudi",
    "id2.sheet.lead": "Quando firmerà anche {name}, ecco cosa riceverà: il volto, il nome e la firma qui sotto.",
    "id2.sheet.leadTheirs": "{name} ha già firmato. Appena parte la tua, vi vedete a vicenda.",
    "id2.sheet.face": "VOLTO DA MANDARE",
    "id2.sheet.facePhoto": "La tua foto non lascia mai questo telefono. Manda uno di questi volti, o nessuno.",
    "id2.sheet.faceNote": "Solo per questa persona. Il volto del tuo profilo non cambia.",
    "id2.sheet.faceNone": "Nessun volto",
    "id2.sheet.faceA11y": "Volto {n} di {m}",
    "id2.sheet.name": "NOME DI PENNA",
    "id2.sheet.namePh": "Come vuoi farti chiamare",
    "id2.sheet.nameFirst": "Resta salvato nel tuo profilo. D'ora in poi, ogni anima affine ti conoscerà così.",
    "id2.sheet.nameLater": "Dal tuo profilo. Se lo cambi qui, cambia per le prossime anime affini.",
    "id2.sheet.nameCourier": "Così ti chiamano già gli sconosciuti. Scegline uno tuo.",
    "id2.sheet.nameOffpage": "Niente link, @nomi o numeri in un nome di penna.",
    "id2.sheet.sign": "LA TUA FIRMA",
    "id2.sheet.trace": "ricalca il tuo nome",
    "id2.sheet.traceEmpty": "firma qui",
    "id2.sheet.undo": "Annulla",
    "id2.sheet.clear": "Cancella",
    "id2.sheet.typeIt": "Meglio digitarlo",
    "id2.sheet.drawIt": "Meglio a mano",
    "id2.sheet.typeItHint": "Invia il tuo nome di penna digitato, senza firma a mano.",
    "id2.sheet.padA11y": "Area della firma. Scrivi il tuo nome di penna con un dito, oppure scegli Meglio digitarlo.",
    "id2.sheet.padDrawn": "Firmato, {n} tratti",
    "id2.sheet.legal": "Firma col nome di penna, non con la tua firma ufficiale.",
    "id2.sheet.guest": "Puoi firmare anche senza account. Collegane uno per tenere questa anima affine su ogni dispositivo.",
    "id2.sheet.guestLink": "Collega un account",
    "id2.sheet.guestReason": "Un posto dove tenere le tue anime affini, su ogni dispositivo.",
    "id2.sheet.send": "FIRMA E INVIA",
    "id2.sheet.foot": "Lo vedranno solo quando avranno firmato anche loro. Se non succede mai, restate penne amiche, ed è giusto così.",
    "id2.in.a11y": "{name} ha firmato come {pen}.",
    "id2.in.a11yMine": "E tu, finora {name} per loro, hai firmato come {pen}.",
    "id2.kd.signed": "LA LORO FIRMA",
    "id2.kd.firstMet": "ALL'INIZIO ERA {name}",
    "id2.kd.drawnA11y": "{pen}, firmato a mano",
    "id2.kd.typedA11y": "{pen}, firmato a tastiera",
    "id2.kd.holdHint": "Tieni premuto per segnalare o bloccare.",
    "id2.kd.was": "era {name}",
    "id2.rp.signature": "Segnala questa firma",
  },
  /* ── ja ── */
  {
    "id2.door.theyFirst": "先にサインしたのは{name}",
    "id2.door.waiting": "サイン済み · 相手待ち",
    "id2.door.hint": "サインするページを開きます。",
    "id2.sheet.title": "名前をサインする",
    "id2.sheet.close": "閉じる",
    "id2.sheet.lead": "{name}さんもサインしたら、下の顔・名前・サインが相手に届きます。",
    "id2.sheet.leadTheirs": "{name}さんはもうサインしています。あなたがサインした瞬間、お互いの名前が見えるようになります。",
    "id2.sheet.face": "送る顔",
    "id2.sheet.facePhoto": "写真はこのスマホから出ません。ここから顔をひとつ選んで送れます。送らなくてもかまいません。",
    "id2.sheet.faceNote": "この相手にだけ送ります。プロフィールの顔はそのままです。",
    "id2.sheet.faceNone": "顔なし",
    "id2.sheet.faceA11y": "{m}個中{n}番目の顔",
    "id2.sheet.name": "ペンネーム",
    "id2.sheet.namePh": "呼ばれたい名前",
    "id2.sheet.nameFirst": "プロフィールに保存されます。これから出会う心友は、みんなこの名前であなたを知ります。",
    "id2.sheet.nameLater": "プロフィールの名前です。ここで変えると、これから出会う心友にはその名前で届きます。",
    "id2.sheet.nameCourier": "それは見知らぬ人がすでに使っている、あなたの呼び名です。自分で選んだ名前にしてください。",
    "id2.sheet.nameOffpage": "ペンネームにリンク・@ID・番号は入れられません。",
    "id2.sheet.sign": "サイン",
    "id2.sheet.trace": "ペンネームをなぞって",
    "id2.sheet.traceEmpty": "ここにサイン",
    "id2.sheet.undo": "取り消す",
    "id2.sheet.clear": "消去",
    "id2.sheet.typeIt": "文字で送る",
    "id2.sheet.drawIt": "手書きにする",
    "id2.sheet.typeItHint": "手書きのサインなしで、ペンネームを文字で送ります。",
    "id2.sheet.padA11y": "サイン欄。指でペンネームを書いてください。「文字で送る」を選ぶこともできます。",
    "id2.sheet.padDrawn": "サイン済み、{n}画",
    "id2.sheet.legal": "書くのはペンネーム。正式な署名は書かないでください。",
    "id2.sheet.guest": "ゲストのままでもサインできます。アカウントを連携すると、どの端末でもこの心友とつながっていられます。",
    "id2.sheet.guestLink": "アカウントを連携",
    "id2.sheet.guestReason": "どの端末でも、心友とのつながりを残しておける場所。",
    "id2.sheet.send": "サインして送る",
    "id2.sheet.foot": "相手に見えるのは、相手もサインしたときだけ。サインしないままでも、文通相手のままでいられます。それでいいんです。",
    "id2.in.a11y": "{name}さんは「{pen}」とサインしました。",
    "id2.in.a11yMine": "そして、相手から{name}と呼ばれていたあなたは「{pen}」とサインしました。",
    "id2.kd.signed": "相手がサインした名前",
    "id2.kd.firstMet": "出会ったときは{name}",
    "id2.kd.drawnA11y": "{pen}、手書きのサイン",
    "id2.kd.typedA11y": "{pen}、文字のサイン",
    "id2.kd.holdHint": "長押しで通報・ブロックができます。",
    "id2.kd.was": "以前は {name}",
    "id2.rp.signature": "このサインを通報",
  },
  /* ── ko ── */
  {
    "id2.door.theyFirst": "먼저 서명한 건 {name}",
    "id2.door.waiting": "서명 완료 · 기다리는 중",
    "id2.door.hint": "서명하는 페이지를 열어요.",
    "id2.sheet.title": "서명하기",
    "id2.sheet.close": "닫기",
    "id2.sheet.lead": "{name}도 서명하면 아래의 얼굴과 이름, 서명이 전해져요.",
    "id2.sheet.leadTheirs": "{name}의 서명이 도착했어요. 당신이 서명하는 순간, 서로의 이름이 보여요.",
    "id2.sheet.face": "보낼 얼굴",
    "id2.sheet.facePhoto": "사진은 이 휴대폰 밖으로 나가지 않아요. 이 얼굴 중 하나를 보내거나, 안 보내도 돼요.",
    "id2.sheet.faceNote": "이 상대에게만 보내요. 프로필 얼굴은 그대로예요.",
    "id2.sheet.faceNone": "얼굴 없음",
    "id2.sheet.faceA11y": "얼굴 {m}개 중 {n}번째",
    "id2.sheet.name": "당신의 필명",
    "id2.sheet.namePh": "불리고 싶은 이름",
    "id2.sheet.nameFirst": "프로필에 저장돼요. 앞으로 만나는 인연은 모두 이 이름으로 당신을 알게 돼요.",
    "id2.sheet.nameLater": "프로필에서 가져왔어요. 여기서 바꾸면 앞으로 만날 인연에게는 바뀐 이름으로 가요.",
    "id2.sheet.nameCourier": "낯선 사람들이 이미 당신을 부르는 이름이에요. 당신만의 이름을 골라 주세요.",
    "id2.sheet.nameOffpage": "필명에는 링크, @아이디, 번호를 넣을 수 없어요.",
    "id2.sheet.sign": "당신의 서명",
    "id2.sheet.trace": "필명을 따라 써 보세요",
    "id2.sheet.traceEmpty": "여기에 서명",
    "id2.sheet.undo": "실행 취소",
    "id2.sheet.clear": "지우기",
    "id2.sheet.typeIt": "글자로 보내기",
    "id2.sheet.drawIt": "손으로 쓰기",
    "id2.sheet.typeItHint": "손글씨 서명 없이 필명을 글자로 보내요.",
    "id2.sheet.padA11y": "서명란. 손가락으로 필명을 써 주세요. ‘글자로 보내기’를 골라도 돼요.",
    "id2.sheet.padDrawn": "서명 완료, {n}획",
    "id2.sheet.legal": "필명으로 서명하세요. 실제 서명은 쓰지 마세요.",
    "id2.sheet.guest": "게스트로도 서명할 수 있어요. 계정을 연결하면 어느 기기에서든 이 인연을 이어 갈 수 있어요.",
    "id2.sheet.guestLink": "계정 연결하기",
    "id2.sheet.guestReason": "어느 기기에서든 인연을 간직할 곳.",
    "id2.sheet.send": "서명하고 보내기",
    "id2.sheet.foot": "상대도 서명해야 보여요. 끝내 서명하지 않으면 펜팔로 남는 거고, 그것도 괜찮아요.",
    "id2.in.a11y": "{name}의 서명, {pen}.",
    "id2.in.a11yMine": "그리고 당신의 서명, {pen}. 지금까지 상대가 알던 이름은 {name}.",
    "id2.kd.signed": "상대가 서명한 이름",
    "id2.kd.firstMet": "처음 만났을 땐 {name}",
    "id2.kd.drawnA11y": "{pen}, 손으로 쓴 서명",
    "id2.kd.typedA11y": "{pen}, 글자로 쓴 서명",
    "id2.kd.holdHint": "길게 눌러 신고하거나 차단할 수 있어요.",
    "id2.kd.was": "예전엔 {name}",
    "id2.rp.signature": "이 서명 신고",
  },
);
