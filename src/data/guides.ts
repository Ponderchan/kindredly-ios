import type { Lang } from "../lib/i18n";

/* THE SIX GUIDES — what the courier can show, in frames, when someone at
   her desk asks how the thing works.
   ────────────────────────────────────────────────────────────────────────
   Each guide is three frames: a small moving picture built from the
   product's own parts (her, an envelope, a mosaic, the nine bars) and one
   line under it. The lines live in the catalog (gd.<id>.title, .f1–.f3)
   so they walk with the language; the TRIGGERS live here because they are
   not shown to anyone — they are what a typed question is matched
   against, on the phone, with no model in the loop.

   Matching is dumb on purpose: a phrase that appears in the question
   scores, longer phrases score more, and the best guide over a threshold
   is shown. Wrong guesses are cheap — "Not it?" sends the words on to the
   makers — so the list favours recall over precision. */

export type GuideId = "letters" | "kindreds" | "aura" | "stamps" | "sealed" | "courier";
export type GuideArtKey =
  | "envelope-stamp"
  | "bird-carry"
  | "desk-count"
  | "mosaic-faint"
  | "mosaic-develop"
  | "two-names"
  | "aura-bars"
  | "aura-lock"
  | "aura-private"
  | "stamps-riffle"
  | "stamps-grid"
  | "stamps-custom"
  | "journal-page"
  | "seal"
  | "no-flight"
  | "bird-dress"
  | "bird-knock"
  | "lock-screen";

export interface Guide {
  id: GuideId;
  frames: GuideArtKey[];
  triggers: Partial<Record<Lang, string[]>>;
}

export const GUIDES: Guide[] = [
  {
    id: "letters",
    frames: ["envelope-stamp", "bird-carry", "desk-count"],
    triggers: {
      en: ["how letters", "how does a letter", "how do letters", "where does my letter", "where do my letters", "who reads my letter", "who gets my letter", "who receives", "how many letters", "15 letters", "fifteen", "counter", "closed for today", "matched", "matching", "how do i send", "send a letter", "write a letter", "post a letter", "how does it work", "how do i start", "get started", "*today tab", "*letters tab", "desk"],
      es: ["cómo funcionan las cartas", "cómo funciona", "quién lee mi carta", "quién recibe", "a dónde va mi carta", "cuántas cartas", "15 cartas", "quince", "contador", "cerrado", "emparejad", "cómo envío", "enviar una carta", "escribir una carta", "cómo empiezo", "escritorio"],
      pt: ["como funcionam as cartas", "como funciona", "quem lê minha carta", "quem recebe", "para onde vai", "quantas cartas", "15 cartas", "quinze", "contador", "fechado", "combinad", "como envio", "enviar uma carta", "escrever uma carta", "como começo", "mesa"],
      id: ["cara kerja surat", "bagaimana cara kerja", "siapa yang membaca", "siapa yang menerima", "ke mana suratku", "berapa surat", "15 surat", "lima belas", "penghitung", "tutup", "dicocokkan", "cara mengirim", "kirim surat", "menulis surat", "cara mulai", "meja"],
      fr: ["comment marchent les lettres", "comment ça marche", "qui lit ma lettre", "qui reçoit", "où va ma lettre", "combien de lettres", "15 lettres", "quinze", "compteur", "fermé", "apparié", "comment envoyer", "envoyer une lettre", "écrire une lettre", "comment commencer", "bureau"],
      de: ["wie funktionieren briefe", "wie funktioniert", "wer liest meinen brief", "wer bekommt", "wohin geht mein brief", "wie viele briefe", "15 briefe", "fünfzehn", "zähler", "geschlossen", "zugeordnet", "wie schicke ich", "brief schicken", "brief schreiben", "wie fange ich an", "schreibtisch"],
      it: ["come funzionano le lettere", "come funziona", "chi legge la mia lettera", "chi riceve", "dove va la mia lettera", "quante lettere", "15 lettere", "quindici", "contatore", "chiuso", "abbinat", "come invio", "inviare una lettera", "scrivere una lettera", "come inizio", "scrivania"],
      ja: ["手紙はどう", "手紙の仕組み", "誰が読む", "誰に届く", "どこに届く", "何通", "15通", "十五", "カウンター", "閉まった", "マッチ", "送り方", "手紙を送", "手紙を書", "始め方", "使い方"],
      ko: ["편지는 어떻게", "편지 구조", "누가 읽", "누구에게", "어디로 가", "몇 통", "15통", "열다섯", "카운터", "닫혔", "매칭", "보내는 법", "편지를 보내", "편지를 쓰", "시작하는 법", "사용법"],
    },
  },
  {
    id: "kindreds",
    frames: ["mosaic-faint", "mosaic-develop", "two-names"],
    triggers: {
      en: ["*kindred", "*kindreds", "reveal", "their name", "real name", "who is this", "who are they", "who they are", "who he is", "who she is", "who am i talking", "who am i writing", "see who", "find out who", "know who", "stranger", "thread", "five letters", "5 letters", "each way", "when do i see", "when will i see", "when can i see", "get to see", "anonymous", "identity", "*mosaic", "*orbit", "rings", "profile picture", "avatar", "their face", "courier name", "frosted", "frost", "pen name", "sign", "signature", "trade names", "swap names"],
      es: ["*afín", "*afines", "revelar", "su nombre", "nombre real", "quién es", "quiénes son", "con quién hablo", "desconocid", "hilo", "cinco cartas", "5 cartas", "anónim", "identidad", "*mosaico", "*órbita", "anillos", "foto de perfil", "seudónimo", "seudonimo", "pseudónimo", "*firma", "empañad", "borros", "nombre del mensajero", "intercambiar nombres", "intercambio de nombres"],
      pt: ["*afim", "*afins", "*alma afim", "*almas afins", "revelar", "nome dele", "nome real", "quem é", "quem são", "com quem falo", "desconhecid", "conversa", "cinco cartas", "5 cartas", "anônim", "identidade", "*mosaico", "*órbita", "anéis", "foto de perfil", "pseudônimo", "pseudonimo", "assinar meu nome", "assinar o nome", "embaçad", "nome do mensageiro", "trocar nomes"],
      id: ["*kindred", "*sekerabat", "ungkap", "namanya", "nama asli", "siapa ini", "siapa mereka", "bicara dengan siapa", "orang asing", "utas", "lima surat", "5 surat", "anonim", "identitas", "*mosaik", "*orbit", "cincin", "foto profil", "nama dari kurir", "buram", "blur", "nama pena", "tanda tangan", "ttd", "tukar nama", "bertukar nama"],
      fr: ["*kindred", "âme sœur", "révéler", "son nom", "vrai nom", "qui est", "qui sont", "à qui je parle", "inconnu", "fil", "cinq lettres", "5 lettres", "anonyme", "identité", "*mosaïque", "*orbite", "anneaux", "photo de profil", "givr", "flou", "nom de plume", "*pseudo", "signer", "signature", "nos noms"],
      de: ["*kindred", "seelenverwandt", "enthüll", "ihr name", "sein name", "echter name", "wer ist das", "wer sind", "mit wem", "fremde", "faden", "fünf briefe", "5 briefe", "anonym", "identität", "*mosaik", "*umlaufbahn", "ringe", "profilbild", "milchglas", "schreibname", "pseudonym", "unterschr", "signier", "namen tausch"],
      it: ["*kindred", "*affine", "*anima affine", "*anime affini", "rivelare", "il suo nome", "vero nome", "chi è", "chi sono", "con chi parlo", "sconosciut", "filo", "cinque lettere", "5 lettere", "anonim", "identità", "*mosaico", "*orbita", "anelli", "foto profilo", "smeriglia", "sfocat", "nome di penna", "pseudonim", "firm", "scambi", "nome vero"],
      ja: ["*キンドレッド", "*心友", "*仲間", "*kindred", "名前は", "本名", "相手は誰", "誰と", "知らない人", "スレッド", "5通", "五通", "匿名", "*モザイク", "*軌道", "リング", "プロフィール", "ペンネーム", "呼び名", "すりガラス", "相手がぼやけ", "サインし", "*署名", "名前を交換", "名前交換"],
      ko: ["*킨드레드", "*kindred", "이름은", "본명", "상대는 누구", "누구랑", "모르는 사람", "스레드", "5통", "다섯 통", "익명", "*모자이크", "*궤도", "링", "프로필", "*필명", "닉네임", "*서명", "사인", "뿌연", "이름 교환", "이름을 주고받"],
    },
  },
  {
    id: "aura",
    frames: ["aura-bars", "aura-lock", "aura-private"],
    triggers: {
      en: ["*aura", "writing aura", "*dimension", "*dimensions", "locked", "unlock", "*archetype", "reach for", "what does it read", "reads my", "analysis", "analyze", "score", "rating", "labels", "forming", "held", "sticker", "stickers", "keepsake"],
      es: ["*aura", "aura escritora", "*dimensión", "*dimensiones", "bloquead", "desbloque", "*arquetipo", "qué lee", "analiza", "análisis", "puntuación", "etiquetas", "pegatina", "recuerdo"],
      pt: ["*aura", "*dimensão", "*dimensões", "travad", "destrav", "*arquétipo", "o que ele lê", "analisa", "análise", "pontuação", "rótulos", "adesivo", "lembrança"],
      id: ["*aura", "aura tulisan", "*dimensi", "terkunci", "buka kunci", "*arketipe", "apa yang dibaca", "analisis", "menganalisis", "skor", "nilai", "label", "stiker", "kenang"],
      fr: ["*aura", "aura de plume", "quelle plume", "ma plume", "*dimension", "*dimensions", "verrouill", "déverrouill", "*archétype", "qu'est-ce qu'elle lit", "analyse", "score", "note", "étiquettes", "autocollant", "souvenir"],
      de: ["*aura", "*dimension", "*dimensionen", "gesperrt", "entsperr", "*archetyp", "was liest sie", "analyse", "analysiert", "punkte", "bewertung", "etiketten", "sticker", "andenken"],
      it: ["*aura", "aura di penna", "che penna sei", "*dimensione", "*dimensioni", "bloccat", "sbloccat", "*archetipo", "cosa legge", "analisi", "analizza", "punteggio", "etichette", "adesivo", "ricordo"],
      ja: ["*オーラ", "*似顔絵", "*aura", "*次元", "ロック", "解除", "*アーキタイプ", "何を読", "分析", "スコア", "点数", "ラベル", "ステッカー", "記念"],
      ko: ["*아우라", "*글결", "결이 비슷", "*aura", "*차원", "잠김", "잠금", "해제", "*아키타입", "뭘 읽", "분석", "점수", "라벨", "스티커", "기념"],
    },
  },
  {
    id: "stamps",
    frames: ["stamps-riffle", "stamps-grid", "stamps-custom"],
    triggers: {
      en: ["*stamp", "*stamps", "mood", "*hashtag", "custom stamp", "stamp cam", "my own stamp", "36", "thirty-six", "twenty words", "20 words", "send key", "let it travel", "seal it"],
      es: ["*sello", "*sellos", "estado de ánimo", "ánimo", "*hashtag", "sello personalizado", "36", "treinta y seis", "veinte palabras", "20 palabras", "prensa", "estampilla", "mi propio sello", "mis propios sellos", "sello con foto", "sello de una foto", "con mis fotos", "nombre del sello"],
      pt: ["*selo", "*selos", "humor", "*hashtag", "selo personalizado", "36", "trinta e seis", "vinte palavras", "20 palavras", "prensa", "meu próprio selo", "meus próprios selos", "selo com foto", "selo de foto", "com minhas fotos", "nome do selo", "tema"],
      id: ["*perangko", "*stempel", "suasana hati", "mood", "*tagar", "perangko sendiri", "36", "tiga puluh enam", "dua puluh kata", "20 kata", "cetak perangko", "bikin perangko", "buat perangko", "perangko foto", "dari foto", "nama perangko", "perangko custom", "prangko"],
      fr: ["*timbre", "*timbres", "humeur", "*hashtag", "timbre personnalisé", "36", "trente-six", "vingt mots", "20 mots", "presse à timbres", "propre timbre", "propres timbres", "créer un timbre", "faire un timbre", "timbre photo", "d'une photo", "nom du timbre"],
      de: ["*briefmarke", "*marke", "*marken", "stimmung", "*hashtag", "eigene marke", "36", "sechsunddreißig", "zwanzig wörter", "20 wörter", "markenpresse", "press", "eigenen marke", "eigene briefmarke", "eigenen briefmarke", "fotomarke", "foto", "kamera"],
      it: ["*francobollo", "*francobolli", "umore", "*hashtag", "francobollo personalizzato", "36", "trentasei", "venti parole", "20 parole", "press", "francobollo con foto", "da una foto", "dalle mie foto", "mio francobollo", "miei francobolli", "foto"],
      ja: ["*切手", "*スタンプ", "気分", "ムード", "*ハッシュタグ", "自分の切手", "36", "三十六", "20語", "二十語", "プレス", "オリジナル切手", "写真の切手", "写真から切手", "切手を作", "切手をつく", "切手の名前", "タグ"],
      ko: ["*우표", "*스탬프", "기분", "무드", "*해시태그", "내 우표", "36", "서른여섯", "20단어", "스무 단어", "프레스", "사진 우표", "사진으로 우표", "우표 만들", "우표만들", "우표를 만들", "나만의 우표", "태그"],
    },
  },
  {
    id: "sealed",
    frames: ["journal-page", "seal", "no-flight"],
    triggers: {
      en: ["*journal", "*sealed", "*diary", "private", "privacy", "backup", "backed up", "cloud", "who can see", "does anyone see", "can anyone read", "safe", "encrypted", "data", "delete my", "export"],
      es: ["*diario", "*sellad", "privad", "privacidad", "copia de seguridad", "respaldo", "nube", "quién puede ver", "alguien ve", "alguien lee", "seguro", "cifrad", "datos", "borrar mi", "exportar"],
      pt: ["*diário", "*selad", "privad", "privacidade", "backup", "nuvem", "quem pode ver", "alguém vê", "alguém lê", "seguro", "criptograf", "dados", "apagar meu", "exportar"],
      id: ["*jurnal", "*tersegel", "segel", "*buku harian", "pribadi", "privasi", "cadangan", "backup", "cloud", "siapa yang bisa lihat", "ada yang lihat", "ada yang baca", "aman", "enkripsi", "data", "hapus", "ekspor"],
      fr: ["*journal", "*scellé", "*intime", "privé", "confidentialité", "sauvegarde", "cloud", "qui peut voir", "quelqu'un voit", "quelqu'un lit", "sûr", "chiffré", "données", "supprimer mes", "exporter"],
      de: ["*tagebuch", "*versiegelt", "privat", "datenschutz", "backup", "sicherung", "cloud", "wer kann sehen", "sieht jemand", "liest jemand", "sicher", "verschlüsselt", "daten", "löschen", "exportieren"],
      it: ["*diario", "*sigillat", "privat", "privacy", "backup", "cloud", "chi può vedere", "qualcuno vede", "qualcuno legge", "sicuro", "cifrat", "dati", "cancellare i miei", "esportare"],
      ja: ["*日記", "*ジャーナル", "*封印", "プライベート", "プライバシー", "バックアップ", "クラウド", "誰が見", "誰かに見", "読まれ", "安全", "暗号", "データ", "削除", "エクスポート"],
      ko: ["*일기", "*저널", "*봉인", "비공개", "프라이버시", "백업", "클라우드", "누가 볼", "누가 읽", "안전", "암호화", "데이터", "삭제", "내보내기"],
    },
  },
  {
    id: "courier",
    frames: ["bird-dress", "bird-knock", "lock-screen"],
    triggers: {
      en: ["*courier", "the bird", "my bird", "rename", "her name", "change name", "change her", "change his", "change their", "change the", "dress", "outfit", "clothes", "hat", "*beanie", "*scarf", "skin", "colour", "color", "lock screen", "live activity", "dynamic island", "notification", "notifications", "push", "knock", "*hatch", "egg"],
      es: ["*mensajer", "el pájaro", "mi pájaro", "renombrar", "cambiar el nombre", "su nombre", "vestir", "ropa", "*gorro", "*bufanda", "*plumaje", "*abrigo", "color", "pantalla de bloqueo", "notificación", "notificaciones", "aviso", "huevo", "nacer"],
      pt: ["*mensageir", "o pássaro", "meu pássaro", "renomear", "mudar o nome", "nome dele", "vestir", "roupa", "*gorro", "*cachecol", "cor", "tela de bloqueio", "notificação", "notificações", "aviso", "ovo", "nascer"],
      id: ["*kurir", "burung", "burungku", "ganti nama", "namanya", "pakaian", "baju", "*topi", "*syal", "warna", "*bulu", "warna bulu", "layar kunci", "notifikasi", "pemberitahuan", "telur", "menetas"],
      fr: ["*messagère", "l'oiseau", "mon oiseau", "renommer", "changer le nom", "son nom", "habiller", "tenue", "vêtement", "*bonnet", "*écharpe", "couleur", "écran de verrouillage", "notification", "notifications", "œuf", "éclore"],
      de: ["*botin", "der vogel", "mein vogel", "umbenennen", "namen ändern", "ihr name", "anziehen", "kleidung", "outfit", "*federkleid", "*mütze", "*schal", "farbe", "sperrbildschirm", "benachrichtigung", "mitteilung", "push", "ei", "schlüpf"],
      it: ["*messaggera", "l'uccellino", "il mio uccellino", "rinominare", "cambiare nome", "il suo nome", "vestire", "vestiti", "cappello", "*berretto", "*sciarpa", "colore", "*piumaggi", "schermata di blocco", "notifica", "notifiche", "uovo", "schiud"],
      ja: ["*伝書鳥", "配達", "鳥", "名前を変え", "改名", "服", "着せ", "*帽子", "*マフラー", "色", "*羽色", "ロック画面", "通知", "卵", "孵化"],
      ko: ["*전령새", "배달", "새", "이름 바꾸", "개명", "*옷", "*코트", "입히", "*모자", "*목도리", "색", "잠금 화면", "알림", "알", "부화"],
    },
  },
];

export const GUIDE_BY_ID: Record<GuideId, Guide> = Object.fromEntries(GUIDES.map((g) => [g.id, g])) as Record<GuideId, Guide>;
export const isGuideId = (s: unknown): s is GuideId => typeof s === "string" && s in GUIDE_BY_ID;
