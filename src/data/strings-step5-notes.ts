import { strings } from "../lib/i18n";

/* 10a STEP 5 — THE NOTES TAB'S NEW WORDS (slice "notes").
   ────────────────────────────────────────────────────────────────────────
   All nine languages: step 6 wrote the eight beside English natively (written AS the language, not
   translated). Every file that says one of these imports this one for its
   side effect: the Notes route, the composer, the sparks, the detail page
   and the dev page.

   Sentence case on purpose. Labels that are drawn in capitals ("9 NOTES",
   the month) are upper-cased for display in the locale
   (toLocaleUpperCase), so VoiceOver can read the same key in its own case:
   lower-casing an all-caps key would turn German nouns ("3 Notizen") into
   "3 notizen".

   Everything else Notes says reuses keys already in nine languages:
   jt.notes, jt.viewCard, jt.viewMenu, jt.moments, jt.said, jt.justYou,
   jt.emptyTitle, jt.emptyBody, jt.new, jp.write, jp.say ("Voice note" in
   "Voice note · 0:35"), jt.picture, jt.pictures, jt.aVideo, ev.*,
   sc.askMood (also the composer's mood key for VoiceOver until a face is
   picked, then the face's name), sc.moodHint (the picker's hint), wren.trackClose (closing
   the calendar), js.1, and moodName() for the thirty faces.

   After this release jt.viewCompact, jt.tape, jt.month1 / monthN /
   monthNone (the old calendar footer), jt.typeIt / snapIt / sayIt /
   filmIt, and the dead JournalCard's jc.* and MoodModal's mm.title /
   mm.sub go unused. */

strings(
  /* ── en ── */
  {
    // the view button's three values (jt.viewCard "Card" already exists)
    "jt.viewGrid": "Grid",
    "jt.viewList": "List",
    // VoiceOver's name for the view button; its value is the view in use ("Card")
    "jt.viewA11y": "View",
    // VoiceOver's name for the calendar button (it read only a number before)
    "jt.calendar": "Calendar",
    "jt.prevMonth": "Previous month",
    "jt.nextMonth": "Next month",
    // the calendar footer and its VoiceOver forms; drawn upper-cased ("9 NOTES")
    "jt.notesN": "{n} notes",
    "jt.notes1": "1 note",
    "jt.notesNone": "No notes",
    // a calendar day for VoiceOver: "Wednesday, October 14, 2 notes"
    "jt.dayA11y": "{date}, {count}",
    // a legend item for VoiceOver: "Calm, 3 notes"
    "jt.legendA11y": "{group}, {count}",
    // a voice note's VoiceOver actions (ff.play is a game's "Play" and translates differently)
    "jt.play": "Play",
    "jt.pause": "Pause",
    // the four mood groups: the picker's colour blocks, the calendar legend for VoiceOver
    "mood.group.calm": "Calm",
    "mood.group.happy": "Happy",
    "mood.group.tired": "Tired",
    "mood.group.low": "Low",
    // two empty-page sparks that were passed to t() as raw English and never keyed
    "js.42": "I hope you still remember…",
    "js.43": "behind the \"I'm fine\"…",
    // the detail page when the page isn't there (torn out, or unreadable), instead of a blank page
    "jd.notFound": "This page isn't here any more.",
    // VoiceOver's name for the detail page's ··· key (the way to Drift and to Delete); it read the dots
    "jd.more": "More",
    // the leave question when the page has a picture, a film or a recording but no words
    // (je.leaveBody says "You've written something", which isn't true then)
    "je.leaveBodyMedia": "What's on this page isn't kept until you seal it.",
  },
  /* ── es ── */
  {
    "jt.viewGrid": "Cuadrícula",
    "jt.viewList": "Lista",
    "jt.viewA11y": "Vista",
    "jt.calendar": "Calendario",
    "jt.prevMonth": "Mes anterior",
    "jt.nextMonth": "Mes siguiente",
    "jt.notesN": "{n} notas",
    "jt.notes1": "1 nota",
    "jt.notesNone": "Sin notas",
    "jt.dayA11y": "{date}, {count}",
    "jt.legendA11y": "{group}, {count}",
    "jt.play": "Reproducir",
    "jt.pause": "Pausa",
    "mood.group.calm": "Calma",
    "mood.group.happy": "Alegría",
    "mood.group.tired": "Cansancio",
    "mood.group.low": "Bajón",
    "js.42": "ojalá todavía te acuerdes…",
    "js.43": "detrás del «estoy bien»…",
    "jd.notFound": "Esta página ya no está.",
    "jd.more": "Más",
    "je.leaveBodyMedia": "Lo que hay en esta página no se guarda hasta que la selles.",
  },
  /* ── pt ── */
  {
    "jt.viewGrid": "Grade",
    "jt.viewList": "Lista",
    "jt.viewA11y": "Visualização",
    "jt.calendar": "Calendário",
    "jt.prevMonth": "Mês anterior",
    "jt.nextMonth": "Próximo mês",
    "jt.notesN": "{n} notas",
    "jt.notes1": "1 nota",
    "jt.notesNone": "Nenhuma nota",
    "jt.dayA11y": "{date}, {count}",
    "jt.legendA11y": "{group}, {count}",
    "jt.play": "Reproduzir",
    "jt.pause": "Pausar",
    "mood.group.calm": "Calma",
    "mood.group.happy": "Alegria",
    "mood.group.tired": "Cansaço",
    "mood.group.low": "Maré baixa",
    "js.42": "espero que você ainda se lembre…",
    "js.43": "por trás do “tô bem”…",
    "jd.notFound": "Esta página não está mais aqui.",
    "jd.more": "Mais",
    "je.leaveBodyMedia": "O que está nesta página só é salvo quando você selar.",
  },
  /* ── id ── */
  {
    "jt.viewGrid": "Kisi",
    "jt.viewList": "Daftar",
    "jt.viewA11y": "Tampilan",
    "jt.calendar": "Kalender",
    "jt.prevMonth": "Bulan sebelumnya",
    "jt.nextMonth": "Bulan berikutnya",
    "jt.notesN": "{n} catatan",
    "jt.notes1": "1 catatan",
    "jt.notesNone": "Tak ada catatan",
    "jt.dayA11y": "{date}, {count}",
    "jt.legendA11y": "{group}, {count}",
    "jt.play": "Putar",
    "jt.pause": "Jeda",
    "mood.group.calm": "Tenang",
    "mood.group.happy": "Gembira",
    "mood.group.tired": "Lelah",
    "mood.group.low": "Kacau",
    "js.42": "semoga kamu masih ingat…",
    "js.43": "di balik \"nggak apa-apa\"…",
    "jd.notFound": "Halaman ini sudah tak ada di sini.",
    "jd.more": "Lainnya",
    "je.leaveBodyMedia": "Isi halaman ini baru tersimpan setelah kamu menyegelnya.",
  },
  /* ── fr ── */
  {
    "jt.viewGrid": "Grille",
    "jt.viewList": "Liste",
    "jt.viewA11y": "Affichage",
    "jt.calendar": "Calendrier",
    "jt.prevMonth": "Mois précédent",
    "jt.nextMonth": "Mois suivant",
    "jt.notesN": "{n} notes",
    "jt.notes1": "1 note",
    "jt.notesNone": "Aucune note",
    "jt.dayA11y": "{date}, {count}",
    "jt.legendA11y": "{group}, {count}",
    "jt.play": "Lecture",
    "jt.pause": "Pause",
    "mood.group.calm": "Calme",
    "mood.group.happy": "En joie",
    "mood.group.tired": "À plat",
    "mood.group.low": "Sombre",
    "js.42": "j'espère que tu te souviens encore…",
    "js.43": "derrière le « ça va »…",
    "jd.notFound": "Cette page n'est plus là.",
    "jd.more": "Plus",
    "je.leaveBodyMedia": "Ce que tu as mis sur cette page n'est pas gardé tant que tu ne l'as pas scellée.",
  },
  /* ── de ── */
  {
    "jt.viewGrid": "Raster",
    "jt.viewList": "Liste",
    "jt.viewA11y": "Ansicht",
    "jt.calendar": "Kalender",
    "jt.prevMonth": "Vorheriger Monat",
    "jt.nextMonth": "Nächster Monat",
    "jt.notesN": "{n} Notizen",
    "jt.notes1": "1 Notiz",
    "jt.notesNone": "Keine Notizen",
    "jt.dayA11y": "{date}, {count}",
    "jt.legendA11y": "{group}, {count}",
    "jt.play": "Wiedergabe",
    "jt.pause": "Pause",
    "mood.group.calm": "Ruhig",
    "mood.group.happy": "Glücklich",
    "mood.group.tired": "Müde",
    "mood.group.low": "Mies",
    "js.42": "ich hoffe, du weißt noch…",
    "js.43": "hinter dem „alles gut“…",
    "jd.notFound": "Diese Seite gibt es nicht mehr.",
    "jd.more": "Mehr",
    "je.leaveBodyMedia": "Was auf dieser Seite ist, wird erst gespeichert, wenn du sie versiegelst.",
  },
  /* ── it ── */
  {
    "jt.viewGrid": "Griglia",
    "jt.viewList": "Elenco",
    "jt.viewA11y": "Vista",
    "jt.calendar": "Calendario",
    "jt.prevMonth": "Mese precedente",
    "jt.nextMonth": "Mese successivo",
    "jt.notesN": "{n} note",
    "jt.notes1": "1 nota",
    "jt.notesNone": "Nessuna nota",
    "jt.dayA11y": "{date}, {count}",
    "jt.legendA11y": "{group}, {count}",
    "jt.play": "Riproduci",
    "jt.pause": "Pausa",
    "mood.group.calm": "Calma",
    "mood.group.happy": "Gioia",
    "mood.group.tired": "Stanchezza",
    "mood.group.low": "Malumore",
    "js.42": "spero che ti ricordi ancora…",
    "js.43": "dietro quel «sto bene»…",
    "jd.notFound": "Questa pagina non c'è più.",
    "jd.more": "Altro",
    "je.leaveBodyMedia": "Quello che c'è su questa pagina non viene salvato finché non la sigilli.",
  },
  /* ── ja ── */
  {
    "jt.viewGrid": "グリッド",
    "jt.viewList": "リスト",
    "jt.viewA11y": "表示",
    "jt.calendar": "カレンダー",
    "jt.prevMonth": "前の月",
    "jt.nextMonth": "次の月",
    "jt.notesN": "{n}ページ",
    "jt.notes1": "1ページ",
    "jt.notesNone": "0ページ",
    "jt.dayA11y": "{date}、{count}",
    "jt.legendA11y": "{group}、{count}",
    "jt.play": "再生",
    "jt.pause": "一時停止",
    "mood.group.calm": "おだやか",
    "mood.group.happy": "ごきげん",
    "mood.group.tired": "つかれた",
    "mood.group.low": "もやもや",
    "js.42": "まだ覚えているといいな…",
    "js.43": "「大丈夫」の裏にあるもの…",
    "jd.notFound": "このページは、もうここにありません。",
    "jd.more": "その他",
    "je.leaveBodyMedia": "このページの中身は、封印するまで保存されません。",
  },
  /* ── ko ── */
  {
    "jt.viewGrid": "격자",
    "jt.viewList": "목록",
    "jt.viewA11y": "보기",
    "jt.calendar": "캘린더",
    "jt.prevMonth": "이전 달",
    "jt.nextMonth": "다음 달",
    "jt.notesN": "페이지 {n}장",
    "jt.notes1": "페이지 한 장",
    "jt.notesNone": "페이지 없음",
    "jt.dayA11y": "{date}, {count}",
    "jt.legendA11y": "{group}, {count}",
    "jt.play": "재생",
    "jt.pause": "일시 정지",
    "mood.group.calm": "평온",
    "mood.group.happy": "행복",
    "mood.group.tired": "피곤",
    "mood.group.low": "저기압",
    "js.42": "아직 기억하고 있길 바라…",
    "js.43": "괜찮다는 말 뒤에…",
    "jd.notFound": "이 페이지는 이제 여기 없어요.",
    "jd.more": "더 보기",
    "je.leaveBodyMedia": "봉인하기 전엔 이 페이지에 담은 것이 저장되지 않아요.",
  },
);
