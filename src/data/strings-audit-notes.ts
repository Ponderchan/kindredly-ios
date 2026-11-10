import { strings } from "../lib/i18n";

/* THE JOURNAL'S NEW WORDS FROM THE OWNER'S AUDIT (2026-11-10): editing a sealed page, searching
   Notes, and taking the journal out of the phone as a text file.
   ────────────────────────────────────────────────────────────────────────
   ENGLISH FIRST (the other eight blocks below were written natively on 2026-11-10; this note is how the file began): t() falls back to English, and the other eight languages are written
   natively after this (as each language, never translated; the comment on each key says what it
   is, where it sits and how long it may be). The three empty blocks are es, pt and id, which
   strings() requires; fr de it ja ko are optional and left out until they are written.

   Reused, no new copy: jd.delete, jd.more, je.leaveTitle, cp.leave.discard, so.kept (the edit's
   send-off: "KEPT · OCT 14"), sc.ph, sc.journalTitle (also the exported file's title),
   cp.fail.generic, ml.cancel (the search field's Cancel), and in the exported file Notes' own
   words for what a page holds: jt.pictures, jt.picture, jp.say, jt.aVideo.

   Imported for its side effect by the screens that say these lines: the journal page
   (NotePageNative, app/journal/[id]), the composer (NoteComposeNative, app/journal-entry), Notes
   (useNotesModel), Settings (useSettingsModel) and the export (lib/journal-export-file). */

strings(
  /* ── en · English ── */
  {
    // EDIT A PAGE
    // the journal page's ⋯ menu, above "Delete" (jd.delete) and under "Let This Drift Out": iOS's own pull-down menu, Title Case like its neighbours; one word
    "jd.edit": "Edit",
    // the composer's big key while a sealed page is being changed, where a new page says "Seal it here" (sc.seal); drawn in capitals, about 14 characters at most
    "nc.edit.save": "Save changes",
    // the same key while the change is being saved, where a new page says "Sealing…" (sc.sealing)
    "nc.edit.saving": "Saving…",
    // the leave sheet's body when ✕ or a swipe back would throw away changes to a sealed page (title: je.leaveTitle "Leave this page?"; its one button: DISCARD); two short sentences, like je.leaveBody
    "je.edit.leaveBody": "Your changes aren't saved yet. The page stays as it was.",

    // SEARCH NOTES
    // VoiceOver's name for the magnifier key in the Notes header (beside the view and calendar keys; icon only, never drawn)
    "jt.search.a11y": "Search your notes",
    // the search field's placeholder, in the header where the title was; lowercase like the app's other placeholders, about 22 characters at most (Cancel sits beside it)
    "jt.search.ph": "search your pages",
    // VoiceOver's name for the ⊗ inside the search field: it empties the field (not "reset")
    "jt.search.clear": "Clear search",
    // the one quiet line under the search field when no page holds what was typed; centred, may wrap to two lines
    "jt.search.none": "No page has those words.",

    // EXPORT THE JOURNAL
    // Settings, THE QUIET, the row directly under "Unsent letters" (set.drafts): its label, sentence case like the rows around it
    "set.export": "Export my journal",
    // the line under that label (two or three lines at most, like set.notify.sub): where the journal lives, and — it must stay honest —
    // that the file holds the words only; photos, voice notes and films are NOT in it
    "set.export.sub": "Your journal lives only on this phone. This saves its words as one file; photos, voice and films stay in the app.",
    // the same line when the journal has no page yet: the row then does nothing
    "set.export.none": "Your journal lives only on this phone. Nothing to export yet.",
    // INSIDE THE EXPORTED FILE (a Markdown text file the reader opens elsewhere), under the title "Journal" (sc.journalTitle):
    // {date} is the day it was saved, written out in full in the reader's language ("Tuesday, November 10, 2026").
    // It must say plainly that the file is the words only and that pictures and recordings are still in the app
    "jx.intro": "Saved from Kindredly on {date}. The words only: photos, voice notes and films stay in the app.",
    // in the file, before a page's line that drifted out (the line itself follows on the same line); ends with a colon or the language's own
    "jx.drifted": "A line that drifted out:",
  },
  /* ── es · Español (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jd.edit": "Editar",
    "nc.edit.save": "Guardar",
    "nc.edit.saving": "Guardando…",
    "je.edit.leaveBody": "Tus cambios aún no están guardados. La página se queda como estaba.",
    "jt.search.a11y": "Buscar en tus notas",
    "jt.search.ph": "busca en tus páginas",
    "jt.search.clear": "Borrar búsqueda",
    "jt.search.none": "Ninguna página tiene esas palabras.",
    "set.export": "Exportar mi diario",
    "set.export.sub": "Tu diario solo existe en este teléfono. Aquí guardas sus palabras en un archivo; fotos, voz y videos se quedan en la app.",
    "set.export.none": "Tu diario solo existe en este teléfono. Todavía no hay nada que exportar.",
    "jx.intro": "Guardado desde Kindredly el {date}. Solo las palabras: las fotos, las notas de voz y los videos se quedan en la app.",
    "jx.drifted": "Una línea que partió:",
  },
  /* ── pt · Português (Brasil) (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jd.edit": "Editar",
    "nc.edit.save": "Salvar",
    "nc.edit.saving": "Salvando…",
    "je.edit.leaveBody": "Suas mudanças ainda não foram salvas. A página fica como estava.",
    "jt.search.a11y": "Buscar nas suas notas",
    "jt.search.ph": "busque nas páginas",
    "jt.search.clear": "Limpar busca",
    "jt.search.none": "Nenhuma página tem essas palavras.",
    "set.export": "Exportar meu diário",
    "set.export.sub": "Seu diário só existe neste celular. Aqui você salva as palavras dele num arquivo; fotos, voz e vídeos ficam no app.",
    "set.export.none": "Seu diário só existe neste celular. Ainda não tem nada pra exportar.",
    "jx.intro": "Exportado do Kindredly em {date}. Só as palavras: fotos, notas de voz e vídeos continuam no app.",
    "jx.drifted": "Uma linha que partiu:",
  },
  /* ── id · Bahasa Indonesia (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jd.edit": "Edit",
    "nc.edit.save": "Simpan",
    "nc.edit.saving": "Menyimpan…",
    "je.edit.leaveBody": "Perubahanmu belum tersimpan. Halamannya tetap seperti semula.",
    "jt.search.a11y": "Cari di catatanmu",
    "jt.search.ph": "cari di halamanmu",
    "jt.search.clear": "Kosongkan pencarian",
    "jt.search.none": "Tak ada halaman dengan kata-kata itu.",
    "set.export": "Ekspor jurnalku",
    "set.export.sub": "Jurnalmu hanya ada di ponsel ini. Tulisannya bisa kamu simpan jadi satu berkas; foto, rekaman suara, dan video tetap di aplikasi.",
    "set.export.none": "Jurnalmu hanya ada di ponsel ini. Belum ada yang bisa diekspor.",
    "jx.intro": "Disimpan dari Kindredly pada {date}. Hanya tulisannya: foto, rekaman suara, dan video tetap di aplikasi.",
    "jx.drifted": "Baris yang dibiarkan pergi:",
  },
  /* ── fr · Français (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jd.edit": "Modifier",
    "nc.edit.save": "Enregistrer",
    "nc.edit.saving": "Enregistrement…",
    "je.edit.leaveBody": "Tes modifications ne sont pas encore enregistrées. La page reste comme elle était.",
    "jt.search.a11y": "Rechercher dans tes notes",
    "jt.search.ph": "cherche dans tes pages",
    "jt.search.clear": "Effacer la recherche",
    "jt.search.none": "Aucune page ne contient ces mots.",
    "set.export": "Exporter mon journal",
    "set.export.sub": "Ton journal n'existe que sur ce téléphone. Tu peux en enregistrer le texte dans un seul fichier ; photos, vocaux et vidéos restent dans l'app.",
    "set.export.none": "Ton journal n'existe que sur ce téléphone. Rien à exporter pour l'instant.",
    "jx.intro": "Enregistré depuis Kindredly le {date}. Le texte seulement : les photos, les vocaux et les vidéos restent dans l'app.",
    "jx.drifted": "Une ligne qui s'est envolée :",
  },
  /* ── de · Deutsch (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jd.edit": "Bearbeiten",
    "nc.edit.save": "Speichern",
    "nc.edit.saving": "Speichert…",
    "je.edit.leaveBody": "Deine Änderungen sind noch nicht gespeichert. Die Seite bleibt, wie sie war.",
    "jt.search.a11y": "Notizen durchsuchen",
    "jt.search.ph": "such in deinen Seiten",
    "jt.search.clear": "Suchfeld leeren",
    "jt.search.none": "Auf keiner Seite steht das.",
    "set.export": "Mein Tagebuch exportieren",
    "set.export.sub": "Dein Tagebuch liegt nur auf diesem Telefon. Hier speicherst du seinen Text in einer Datei; Fotos, Sprachnotizen und Videos bleiben in der App.",
    "set.export.none": "Dein Tagebuch liegt nur auf diesem Telefon. Noch gibt es nichts zu exportieren.",
    "jx.intro": "Aus Kindredly gespeichert am {date}. Nur der Text: Fotos, Sprachnotizen und Videos bleiben in der App.",
    "jx.drifted": "Eine davongetriebene Zeile:",
  },
  /* ── it · Italiano (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jd.edit": "Modifica",
    "nc.edit.save": "Salva",
    "nc.edit.saving": "Salvo…",
    "je.edit.leaveBody": "Le modifiche non sono ancora salvate. La pagina resta com'era.",
    "jt.search.a11y": "Cerca nelle tue note",
    "jt.search.ph": "cerca nelle tue pagine",
    "jt.search.clear": "Cancella la ricerca",
    "jt.search.none": "Non c'è in nessuna pagina.",
    "set.export": "Esporta il mio diario",
    "set.export.sub": "Il tuo diario sta solo su questo telefono. Qui ne salvi le parole in un unico file; foto, note vocali e video restano nell'app.",
    "set.export.none": "Il tuo diario sta solo su questo telefono. Per ora non c'è niente da esportare.",
    "jx.intro": "Salvato da Kindredly, {date}. Solo le parole: foto, note vocali e video restano nell'app.",
    "jx.drifted": "Una riga volata via:",
  },
  /* ── ja · 日本語 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jd.edit": "編集",
    "nc.edit.save": "変更を保存",
    "nc.edit.saving": "保存中…",
    "je.edit.leaveBody": "変更はまだ保存されていません。ページは元のまま残ります。",
    "jt.search.a11y": "ノートを検索",
    "jt.search.ph": "ページをさがす",
    "jt.search.clear": "検索語を消去",
    "jt.search.none": "そのことばが出てくるページはありません。",
    "set.export": "日記をファイルに書き出す",
    "set.export.sub": "日記があるのは、このスマホの中だけです。ここから、ことばだけをひとつのファイルに保存できます。写真・音声・動画はアプリに残ります。",
    "set.export.none": "日記があるのは、このスマホの中だけです。書き出すページは、まだありません。",
    "jx.intro": "{date}、Kindredly から保存しました。ことばだけです。写真、音声メモ、動画はアプリに残っています。",
    "jx.drifted": "流れた一行：",
  },
  /* ── ko · 한국어 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "jd.edit": "편집",
    "nc.edit.save": "변경 사항 저장",
    "nc.edit.saving": "저장 중…",
    "je.edit.leaveBody": "바꾼 내용이 아직 저장되지 않았어요. 페이지는 원래대로 남아요.",
    "jt.search.a11y": "노트 검색",
    "jt.search.ph": "페이지 찾기",
    "jt.search.clear": "검색어 지우기",
    "jt.search.none": "그 말이 담긴 페이지가 없어요.",
    "set.export": "일기 내보내기",
    "set.export.sub": "일기는 이 휴대폰에만 있어요. 여기서 글만 파일 하나로 저장할 수 있고, 사진, 음성, 영상은 앱에 남아요.",
    "set.export.none": "일기는 이 휴대폰에만 있어요. 아직 내보낼 페이지가 없어요.",
    "jx.intro": "{date}에 Kindredly에서 저장했어요. 글만 담겨 있어요. 사진, 음성 메모, 영상은 앱에 남아 있어요.",
    "jx.drifted": "띄운 한 줄:",
  },
);
