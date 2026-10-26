import { strings } from "../lib/i18n";

/* THE NOTES COMPOSER'S NEW WORDS (owner, 2026-10-26: the Note Composer Bar design, 1.0.7).
   ────────────────────────────────────────────────────────────────────────
   Design: Desktop/export/note-composer-bar/CLAUDE-CODE-PROMPTS-NOTE-COMPOSER.md. Everything else
   the page says is reused from the strings it already had: JUST FOR ME (je.justForMe), Wren's
   lines (content WREN_OPENERS.journal), the sparks (js.*), Seal it here (sc.seal), the mood names
   (mood.group.* and moods.ts moodName), the photo and film labels (sc.a11y.*).

   - nc.sealed: the seal moment, in Wren's voice (the Letter font, italic, in quotes the page adds);
     a statement about the page, never about the reader, so no language genders anyone;
   - nc.photo / nc.video / nc.audio: the ＋ panel's three cards, a word each, as a phone names
     them in that language;
   - nc.plus: VoiceOver on the ＋;
   - nc.oneKind: VoiceOver's value on a card the page can't take (a page holds one kind);
   - nc.moodFirst: VoiceOver's hint on the seal key before a mood is chosen (the key then opens the
     faces: the calendar is made of them). ja/ko polite (ます / 요) like every other VoiceOver hint
     and sc.moodHint, whose second half it repeats; only Wren's own lines are casual;
   - nc.editor: VoiceOver's name for the writing field.

   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same keys:
   src/data/strings-note-compose.test.ts checks them (node src/data/strings-note-compose.test.ts).
   Consumers import this file for its side effect. */

strings(
  /* ── en · English ── */
  {
    "nc.sealed": "Sealed. Just for you.",
    "nc.photo": "Photo",
    "nc.video": "Video",
    "nc.audio": "Audio",
    "nc.plus": "Add a photo, a video or a voice note",
    "nc.oneKind": "A page holds one kind",
    "nc.moodFirst": "Pick a mood first. It's how you'll find this day again.",
    "nc.editor": "Your page",
  },
  /* ── es · Español ── */
  {
    "nc.sealed": "Sellado. Solo para ti.",
    "nc.photo": "Foto",
    "nc.video": "Vídeo",
    "nc.audio": "Nota de voz",
    "nc.plus": "Añadir una foto, un vídeo o una nota de voz",
    "nc.oneKind": "Cada página lleva un solo tipo",
    "nc.moodFirst": "Primero elige cómo te sentiste: así volverás a encontrar este día.",
    "nc.editor": "Tu página",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "nc.sealed": "Lacrado. Só pra você.",
    "nc.photo": "Foto",
    "nc.video": "Vídeo",
    "nc.audio": "Áudio",
    "nc.plus": "Adicionar foto, vídeo ou áudio",
    "nc.oneKind": "Cada página leva um tipo só",
    "nc.moodFirst": "Escolha um humor primeiro: é assim que você reencontra este dia.",
    "nc.editor": "Sua página",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "nc.sealed": "Tersegel. Cuma buat kamu.",
    "nc.photo": "Foto",
    "nc.video": "Video",
    "nc.audio": "Suara",
    "nc.plus": "Tambah foto, video, atau rekaman suara",
    "nc.oneKind": "Satu halaman, satu jenis",
    "nc.moodFirst": "Pilih suasana hatimu dulu. Dari situ kamu bisa menemukan hari ini lagi.",
    "nc.editor": "Halamanmu",
  },
  /* ── fr · Français ── */
  {
    "nc.sealed": "Scellé. Rien que pour toi.",
    "nc.photo": "Photo",
    "nc.video": "Vidéo",
    "nc.audio": "Vocal",
    "nc.plus": "Ajouter une photo, une vidéo ou un vocal",
    "nc.oneKind": "Une page, un seul type",
    "nc.moodFirst": "Choisis d'abord ton humeur : c'est grâce à elle que tu retrouveras ce jour.",
    "nc.editor": "Ta page",
  },
  /* ── de · Deutsch ── */
  {
    "nc.sealed": "Versiegelt. Nur für dich.",
    "nc.photo": "Foto",
    "nc.video": "Video",
    "nc.audio": "Sprachnotiz",
    "nc.plus": "Foto, Video oder Sprachnotiz hinzufügen",
    "nc.oneKind": "Pro Seite nur eine Art",
    "nc.moodFirst": "Wähl zuerst eine Stimmung – daran findest du diesen Tag wieder.",
    "nc.editor": "Deine Seite",
  },
  /* ── it · Italiano ── */
  {
    "nc.sealed": "Sigillato. Solo per te.",
    "nc.photo": "Foto",
    "nc.video": "Video",
    "nc.audio": "Vocale",
    "nc.plus": "Aggiungi una foto, un video o un vocale",
    "nc.oneKind": "Una pagina, un solo tipo",
    "nc.moodFirst": "Prima scegli l'umore: è così che ritroverai questo giorno.",
    "nc.editor": "La tua pagina",
  },
  /* ── ja · 日本語 ── */
  {
    "nc.sealed": "封をしたよ。あなただけのもの。",
    "nc.photo": "写真",
    "nc.video": "動画",
    "nc.audio": "音声",
    "nc.plus": "写真・動画・音声を追加",
    "nc.oneKind": "1ページに1種類まで",
    "nc.moodFirst": "先に気分を選んでください。この日をあとで見つける手がかりになります。",
    "nc.editor": "自分のページ",
  },
  /* ── ko · 한국어 ── */
  {
    "nc.sealed": "봉인했어. 너만 보는 거야.",
    "nc.photo": "사진",
    "nc.video": "동영상",
    "nc.audio": "음성",
    "nc.plus": "사진, 동영상, 음성 추가",
    "nc.oneKind": "한 페이지에 한 종류만",
    "nc.moodFirst": "먼저 기분을 골라 주세요. 나중에 이 날을 다시 찾는 단서가 돼요.",
    "nc.editor": "내 페이지",
  },
);
