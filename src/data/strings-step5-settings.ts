import { strings } from "../lib/i18n";

/* 10a STEP 5 — SETTINGS AND EDIT PROFILE'S NEW WORDS (slice "settings-profile").
   ────────────────────────────────────────────────────────────────────────
   All nine languages: step 6 wrote the eight beside English natively (written AS the language, not
   translated). Every route of the slice imports this file for its side
   effect ((tabs)/me/settings, edit-profile, edit-field, blocked), and so
   do the model hooks and the dev page.

   Everything else the pages say reuses keys already in nine languages:
   settings.*, set.* (the rows, the switches and their subs, the exits, the
   delete sheet, set.version for the footer), lore.head, me.firstClass,
   fc.stubHead / stubSub1 / stubSub2 / paidHead / paidSub / paidCta /
   member, me.fc.founding, fc.firstMark (strings-step5-me), ep.title,
   ep.penPh, ep.random, ep.choosePhoto, ep.privateNote (the YOU group's
   footer), ui.you (the YOU header), me.sec.courier (YOUR COURIER, set in
   capitals), pr.she / pr.he / pr.they, set.penPrompt.*, set.renameWren,
   set.wrenPrompt.body, ob.naming.reserved, set.cantSave, set.push.saveFail,
   a11y.back (strings-step5-kitrn), bl.*, hp.*, wu.*.

   The font names (Newsreader, New York, EB Garamond, SF Mono) are proper nouns and
   never translated, like the language endonyms (screens/settings
   settings-model LETTER_FONT_NAMES). */

strings(
  /* ── en ── */
  {
    // Settings: the appearance group (theme swatches, Match system, the Letter font)
    "set.sec.appearance": "APPEARANCE",
    "set.matchSystem": "Match system",
    // {night} and {day} are the themes' own names (theme.*), so this line never names a theme
    // differently from its swatch
    "set.matchSystem.on": "{night} after dark · {day} by day",
    "set.matchSystem.off": "Always {theme}",
    // the four themes' names on their swatches (themes.json's names are English literals)
    "theme.classic": "Classic",
    "theme.midnight": "Midnight",
    "theme.lavender": "Lavender",
    "theme.paper": "Paper",
    // the font picker (Newsreader / New York / EB Garamond / SF Mono): the one face for
    // everything people write, not only letters read (owner, 2026-10-20)
    "set.letterFont": "Font",
    "set.letterFont.sub": "Letters, notes and chats use it.",
    // the system serif's tile: its own name, New York (owner, 2026-10-20; it was "System",
    // which read as SF Pro); a proper noun, so every language keeps it
    "set.font.system": "New York",
    // a restore that failed (offline, the App Store unreachable): never "Nothing to restore";
    // the body reuses set.push.saveFail
    "set.restoreFail": "Couldn't restore",
    // the Settings banner's call to action (the Me card keeps fc.stubCta)
    "fc.tryCta": "Try First Class",

    // Edit profile: VoiceOver's name for the camera button on the avatar
    "ep.cameraA11y": "Change your face",
    // under the avatar: what it is for, and who sees it (true for photos and for faces
    // changed after signing: a kindred keeps the face you had when you both signed)
    "ep.avatarNote": "Strangers never see your face. A kindred sees the one you had when you both signed, and a photo never leaves this phone.",
    // the face strip's header (ep.pickFace said "OR PICK A FACE" under a photo button)
    "ep.faces": "PICK A FACE",
    // VoiceOver: one face in the strip (the faces' own names are English design notes)
    "ep.faceA11y": "Face {n} of {total}",
    "ep.pronouns": "Pronouns",
    "ep.birthday": "Birthday",
    // the courier's one row under YOUR COURIER
    "ep.name": "Name",
    // the one-time note for the six legacy portraits (no longer offered), over the face strip
    "ep.newFaces.title": "New faces arrived.",
    "ep.newFaces.body": "Yours stays for as long as you want it. Care to see the new ones?",
    "ep.newFaces.see": "See new faces",
    "ep.newFaces.keep": "Keep mine",

    // the one-field page: the courier name's placeholder (the pen name's is ep.penPh)
    "ef.namePh": "A name…",

    // Blocked & reported: the list didn't load (it used to say "No one's shut out.")
    "bl.loadFail": "The list didn't load. Tap to try again.",
  },
  /* ── es ── */
  {
    "set.sec.appearance": "APARIENCIA",
    "set.matchSystem": "Igual que el sistema",
    "set.matchSystem.on": "{night} cuando oscurece · {day} de día",
    "set.matchSystem.off": "Siempre {theme}",
    "theme.classic": "Clásico",
    "theme.midnight": "Medianoche",
    "theme.lavender": "Lavanda",
    "theme.paper": "Papel",
    "set.letterFont": "Letra",
    "set.letterFont.sub": "Se usa en cartas, notas y chats.",
    "set.font.system": "New York",
    "set.restoreFail": "No se pudo restaurar",
    "fc.tryCta": "Probar Primera Clase",
    "ep.cameraA11y": "Cambiar tu cara",
    "ep.avatarNote": "Los extraños nunca ven tu cara. Un afín ve la que tenías cuando los dos firmaron, y las fotos jamás salen de este teléfono.",
    "ep.faces": "ELIGE UNA CARA",
    "ep.faceA11y": "Cara {n} de {total}",
    "ep.pronouns": "Pronombres",
    "ep.birthday": "Cumpleaños",
    "ep.name": "Nombre",
    "ep.newFaces.title": "Llegaron caras nuevas.",
    "ep.newFaces.body": "La tuya se queda el tiempo que quieras. ¿Les echas un vistazo a las nuevas?",
    "ep.newFaces.see": "Ver caras nuevas",
    "ep.newFaces.keep": "Quedarme con la mía",
    "ef.namePh": "Un nombre…",
    "bl.loadFail": "No se pudo cargar la lista. Toca para volver a intentarlo.",
  },
  /* ── pt ── */
  {
    "set.sec.appearance": "APARÊNCIA",
    "set.matchSystem": "Seguir o sistema",
    "set.matchSystem.on": "{night} ao escurecer · {day} de dia",
    "set.matchSystem.off": "Sempre {theme}",
    "theme.classic": "Clássico",
    "theme.midnight": "Meia-noite",
    "theme.lavender": "Lavanda",
    "theme.paper": "Papel",
    "set.letterFont": "Fonte",
    "set.letterFont.sub": "Usada nas cartas, notas e chats.",
    "set.font.system": "New York",
    "set.restoreFail": "Não foi possível restaurar",
    "fc.tryCta": "Experimente a Primeira Classe",
    "ep.cameraA11y": "Trocar de rosto",
    "ep.avatarNote": "Estranhos nunca veem seu rosto. Uma alma afim vê o rosto que você tinha quando vocês dois assinaram, e nenhuma foto sai deste telefone.",
    "ep.faces": "ESCOLHA UM ROSTO",
    "ep.faceA11y": "Rosto {n} de {total}",
    "ep.pronouns": "Pronomes",
    "ep.birthday": "Aniversário",
    "ep.name": "Nome",
    "ep.newFaces.title": "Chegaram rostos novos.",
    "ep.newFaces.body": "O seu fica pelo tempo que você quiser. Quer ver os novos?",
    "ep.newFaces.see": "Ver rostos novos",
    "ep.newFaces.keep": "Ficar com o meu",
    "ef.namePh": "Um nome…",
    "bl.loadFail": "A lista não carregou. Toque para tentar de novo.",
  },
  /* ── id ── */
  {
    "set.sec.appearance": "TAMPILAN",
    "set.matchSystem": "Ikuti sistem",
    "set.matchSystem.on": "{night} saat gelap · {day} saat terang",
    "set.matchSystem.off": "Selalu {theme}",
    "theme.classic": "Klasik",
    "theme.midnight": "Malam",
    "theme.lavender": "Lavender",
    "theme.paper": "Kertas",
    "set.letterFont": "Font",
    "set.letterFont.sub": "Dipakai di surat, catatan, dan obrolan.",
    "set.font.system": "New York",
    "set.restoreFail": "Tak bisa memulihkan",
    "fc.tryCta": "Coba Kelas Utama",
    "ep.cameraA11y": "Ganti wajahmu",
    "ep.avatarNote": "Orang asing tak pernah melihat wajahmu. Kerabat melihat wajah yang kamu pakai saat kalian bertukar nama, dan foto tak pernah keluar dari ponsel ini.",
    "ep.faces": "PILIH WAJAH",
    "ep.faceA11y": "Wajah {n} dari {total}",
    "ep.pronouns": "Gender",
    "ep.birthday": "Tanggal lahir",
    "ep.name": "Nama",
    "ep.newFaces.title": "Wajah-wajah baru sudah tiba.",
    "ep.newFaces.body": "Wajahmu yang sekarang tetap ada selama kamu mau. Mau lihat yang baru?",
    "ep.newFaces.see": "Lihat wajah baru",
    "ep.newFaces.keep": "Tetap yang sekarang",
    "ef.namePh": "Namanya…",
    "bl.loadFail": "Daftarnya belum bisa dimuat. Ketuk untuk coba lagi.",
  },
  /* ── fr ── */
  {
    "set.sec.appearance": "APPARENCE",
    "set.matchSystem": "Suivre le système",
    "set.matchSystem.on": "{night} la nuit · {day} le jour",
    "set.matchSystem.off": "Toujours {theme}",
    "theme.classic": "Classique",
    "theme.midnight": "Minuit",
    "theme.lavender": "Lavande",
    "theme.paper": "Papier",
    "set.letterFont": "Police",
    "set.letterFont.sub": "Pour les lettres, les notes et les discussions.",
    "set.font.system": "New York",
    "set.restoreFail": "Impossible de restaurer",
    "fc.tryCta": "Essayer la Première classe",
    "ep.cameraA11y": "Changer de visage",
    "ep.avatarNote": "Les inconnus ne voient jamais ton visage. Un semblable voit celui que tu avais quand vous avez échangé vos noms. Une photo, elle, ne quitte jamais ce téléphone.",
    "ep.faces": "CHOISIS UN VISAGE",
    "ep.faceA11y": "Visage {n} sur {total}",
    "ep.pronouns": "Pronoms",
    "ep.birthday": "Date de naissance",
    "ep.name": "Nom",
    "ep.newFaces.title": "De nouveaux visages sont arrivés.",
    "ep.newFaces.body": "Le tien reste aussi longtemps que tu veux. Envie de voir les nouveaux ?",
    "ep.newFaces.see": "Voir les nouveaux",
    "ep.newFaces.keep": "Garder le mien",
    "ef.namePh": "Un nom…",
    "bl.loadFail": "La liste ne s'est pas chargée. Touche pour réessayer.",
  },
  /* ── de ── */
  {
    "set.sec.appearance": "ERSCHEINUNGSBILD",
    "set.matchSystem": "Dem System folgen",
    "set.matchSystem.on": "{night} im Dunkeln · {day} bei Tag",
    "set.matchSystem.off": "Immer {theme}",
    "theme.classic": "Klassisch",
    "theme.midnight": "Nachtblau",
    "theme.lavender": "Lavendel",
    "theme.paper": "Papier",
    "set.letterFont": "Schrift",
    "set.letterFont.sub": "Für Briefe, Notizen und Chats.",
    "set.font.system": "New York",
    "set.restoreFail": "Wiederherstellen nicht möglich",
    "fc.tryCta": "Erste Klasse testen",
    "ep.cameraA11y": "Gesicht ändern",
    "ep.avatarNote": "Fremde sehen dein Gesicht nie. Seelenverwandte sehen es so, wie es war, als ihr beide unterschrieben habt — und ein Foto verlässt dieses Telefon nie.",
    "ep.faces": "WÄHL EIN GESICHT",
    "ep.faceA11y": "Gesicht {n} von {total}",
    "ep.pronouns": "Pronomen",
    "ep.birthday": "Geburtstag",
    "ep.name": "Name",
    "ep.newFaces.title": "Neue Gesichter sind da.",
    "ep.newFaces.body": "Deins bleibt, solange du willst. Lust, dir die neuen anzusehen?",
    "ep.newFaces.see": "Die neuen ansehen",
    "ep.newFaces.keep": "Meins behalten",
    "ef.namePh": "Ein Name…",
    "bl.loadFail": "Die Liste ließ sich nicht laden. Tippe, um es noch einmal zu versuchen.",
  },
  /* ── it ── */
  {
    "set.sec.appearance": "ASPETTO",
    "set.matchSystem": "Segui il sistema",
    "set.matchSystem.on": "{night} col buio · {day} di giorno",
    "set.matchSystem.off": "Sempre {theme}",
    "theme.classic": "Classico",
    "theme.midnight": "Mezzanotte",
    "theme.lavender": "Lavanda",
    "theme.paper": "Carta",
    "set.letterFont": "Carattere",
    "set.letterFont.sub": "Per lettere, note e chat.",
    "set.font.system": "New York",
    "set.restoreFail": "Impossibile ripristinare",
    "fc.tryCta": "Prova la Prima classe",
    "ep.cameraA11y": "Cambia il tuo volto",
    "ep.avatarNote": "Gli sconosciuti non vedono mai il tuo volto. Un'anima affine vede quello che avevi quando avete firmato tutti e due, e una foto non lascia mai questo telefono.",
    "ep.faces": "SCEGLI UN VOLTO",
    "ep.faceA11y": "Volto {n} di {total}",
    "ep.pronouns": "Pronomi",
    "ep.birthday": "Compleanno",
    "ep.name": "Nome",
    "ep.newFaces.title": "Sono arrivati volti nuovi.",
    "ep.newFaces.body": "Il tuo resta finché lo vuoi. Ti va di vedere quelli nuovi?",
    "ep.newFaces.see": "Vedi i volti nuovi",
    "ep.newFaces.keep": "Tieni il mio",
    "ef.namePh": "Un nome…",
    "bl.loadFail": "L'elenco non si è caricato. Tocca per riprovare.",
  },
  /* ── ja ── */
  {
    "set.sec.appearance": "見た目",
    "set.matchSystem": "システムに合わせる",
    "set.matchSystem.on": "夜は「{night}」 · 昼は「{day}」",
    "set.matchSystem.off": "いつも「{theme}」",
    "theme.classic": "しろ",
    "theme.midnight": "まよなか",
    "theme.lavender": "ふじいろ",
    "theme.paper": "きなり",
    "set.letterFont": "書体",
    "set.letterFont.sub": "手紙・ノート・チャットに使われます。",
    "set.font.system": "New York",
    "set.restoreFail": "復元できませんでした",
    "fc.tryCta": "ファーストクラスを試す",
    "ep.cameraA11y": "顔を変える",
    "ep.avatarNote": "見知らぬ人に、あなたの顔は見えません。心友に見えるのは、ふたりが名前を添えたときの顔です。写真がこのスマホから出ることもありません。",
    "ep.faces": "顔を選ぶ",
    "ep.faceA11y": "{total}種類中{n}番目の顔",
    "ep.pronouns": "代名詞",
    "ep.birthday": "誕生日",
    "ep.name": "名前",
    "ep.newFaces.title": "新しい顔が届きました。",
    "ep.newFaces.body": "いまの顔は、好きなだけ使い続けられます。新しい顔も見てみますか？",
    "ep.newFaces.see": "新しい顔を見る",
    "ep.newFaces.keep": "いまのままにする",
    "ef.namePh": "名前をつける…",
    "bl.loadFail": "リストを読み込めませんでした。タップしてもう一度どうぞ。",
  },
  /* ── ko ── */
  {
    "set.sec.appearance": "모양",
    "set.matchSystem": "시스템 설정 따르기",
    "set.matchSystem.on": "어두울 땐 {night} · 밝을 땐 {day}",
    "set.matchSystem.off": "항상 {theme}",
    "theme.classic": "클래식",
    "theme.midnight": "한밤",
    "theme.lavender": "라벤더",
    "theme.paper": "종이",
    "set.letterFont": "글꼴",
    "set.letterFont.sub": "편지, 노트, 채팅에 쓰여요.",
    "set.font.system": "New York",
    "set.restoreFail": "복원하지 못했어요",
    "fc.tryCta": "퍼스트 클래스 체험하기",
    "ep.cameraA11y": "얼굴 바꾸기",
    "ep.avatarNote": "모르는 사람은 당신의 얼굴을 볼 수 없어요. 인연은 서로 이름을 동봉한 그때의 얼굴을 보고, 사진은 이 휴대폰 밖으로 나가지 않아요.",
    "ep.faces": "얼굴 고르기",
    "ep.faceA11y": "{total}개 중 {n}번째 얼굴",
    "ep.pronouns": "인칭 대명사",
    "ep.birthday": "생일",
    "ep.name": "이름",
    "ep.newFaces.title": "새 얼굴들이 도착했어요.",
    "ep.newFaces.body": "지금 얼굴은 원하는 동안 그대로 쓸 수 있어요. 새 얼굴도 구경해 볼래요?",
    "ep.newFaces.see": "새 얼굴 보기",
    "ep.newFaces.keep": "지금 얼굴 그대로",
    "ef.namePh": "이름…",
    "bl.loadFail": "목록을 불러오지 못했어요. 눌러서 다시 시도해 주세요.",
  },
);
