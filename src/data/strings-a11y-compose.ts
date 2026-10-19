import { strings } from "../lib/i18n";

/* A11Y PASS, BATCH 4 — WHAT VOICEOVER SAYS ON THE RECORDER, THE NOTES EDITOR'S PHOTOS AND
   WREN'S WARDROBE (2026-10-19).
   ────────────────────────────────────────────────────────────────────────
   Nine languages, each written as the language. Short: most of these are button names.
   Imported for its side effect by components/Recorder (which the compose page's voice island and
   the Notes editor both draw), components/SelfCompose and components/WardrobeRack.

   Reused, not repeated here: ob2.back (the viewer's ‹), wren.lock.* (the rack's lock tags). */

strings(
  /* ── en ── */
  {
    // the Recorder's round key, idle and while recording
    "rc.a11y.record": "Record",
    "rc.a11y.stop": "Stop recording",
    // its value: the time so far, of the limit ("0:12 of 3:00")
    "rc.a11y.time": "{t} of {max}",
    // said as recording starts and stops
    "rc.a11y.started": "Recording",
    "rc.a11y.stopped": "Recording stopped",
    // the ✕ beside a take
    "rc.a11y.discard": "Delete recording",
    // the Notes editor's photo grid; the first is the cover
    "sc.a11y.photo": "Photo {i} of {n}",
    "sc.a11y.photoCover": "Photo {i} of {n}, the cover",
    "sc.a11y.photoHint": "Opens the photo",
    // the photo viewer's bin
    "sc.a11y.deletePhoto": "Delete this photo",
    // the ✕ on the video preview
    "sc.a11y.removeVideo": "Remove the video",
    // a locked First Class piece in Wren's room: what a tap does
    "wren.a11y.plusHint": "Opens First Class",
  },
  /* ── es ── */
  {
    "rc.a11y.record": "Grabar",
    "rc.a11y.stop": "Detener la grabación",
    "rc.a11y.time": "{t} de {max}",
    "rc.a11y.started": "Grabando",
    "rc.a11y.stopped": "Grabación detenida",
    "rc.a11y.discard": "Borrar la grabación",
    "sc.a11y.photo": "Foto {i} de {n}",
    "sc.a11y.photoCover": "Foto {i} de {n}, la portada",
    "sc.a11y.photoHint": "Abre la foto",
    "sc.a11y.deletePhoto": "Borrar esta foto",
    "sc.a11y.removeVideo": "Quitar el video",
    "wren.a11y.plusHint": "Abre Primera Clase",
  },
  /* ── pt ── */
  {
    "rc.a11y.record": "Gravar",
    "rc.a11y.stop": "Parar de gravar",
    "rc.a11y.time": "{t} de {max}",
    "rc.a11y.started": "Gravando",
    "rc.a11y.stopped": "Gravação encerrada",
    "rc.a11y.discard": "Apagar a gravação",
    "sc.a11y.photo": "Foto {i} de {n}",
    "sc.a11y.photoCover": "Foto {i} de {n}, a capa",
    "sc.a11y.photoHint": "Abre a foto",
    "sc.a11y.deletePhoto": "Apagar esta foto",
    "sc.a11y.removeVideo": "Tirar o vídeo",
    "wren.a11y.plusHint": "Abre a Primeira Classe",
  },
  /* ── id ── */
  {
    "rc.a11y.record": "Rekam",
    "rc.a11y.stop": "Berhenti merekam",
    "rc.a11y.time": "{t} dari {max}",
    "rc.a11y.started": "Sedang merekam",
    "rc.a11y.stopped": "Rekaman berhenti",
    "rc.a11y.discard": "Hapus rekaman",
    "sc.a11y.photo": "Foto {i} dari {n}",
    "sc.a11y.photoCover": "Foto {i} dari {n}, sampul",
    "sc.a11y.photoHint": "Buka fotonya",
    "sc.a11y.deletePhoto": "Hapus foto ini",
    "sc.a11y.removeVideo": "Lepas videonya",
    "wren.a11y.plusHint": "Buka Kelas Utama",
  },
  /* ── fr ── */
  {
    "rc.a11y.record": "Enregistrer",
    "rc.a11y.stop": "Arrêter l'enregistrement",
    "rc.a11y.time": "{t} sur {max}",
    "rc.a11y.started": "Enregistrement en cours",
    "rc.a11y.stopped": "Enregistrement arrêté",
    "rc.a11y.discard": "Supprimer l'enregistrement",
    "sc.a11y.photo": "Photo {i} sur {n}",
    "sc.a11y.photoCover": "Photo {i} sur {n}, la couverture",
    "sc.a11y.photoHint": "Ouvre la photo",
    "sc.a11y.deletePhoto": "Supprimer cette photo",
    "sc.a11y.removeVideo": "Retirer la vidéo",
    "wren.a11y.plusHint": "Ouvre Première Classe",
  },
  /* ── de ── */
  {
    "rc.a11y.record": "Aufnehmen",
    "rc.a11y.stop": "Aufnahme beenden",
    "rc.a11y.time": "{t} von {max}",
    "rc.a11y.started": "Aufnahme läuft",
    "rc.a11y.stopped": "Aufnahme beendet",
    "rc.a11y.discard": "Aufnahme löschen",
    "sc.a11y.photo": "Foto {i} von {n}",
    "sc.a11y.photoCover": "Foto {i} von {n}, das Titelbild",
    "sc.a11y.photoHint": "Öffnet das Foto",
    "sc.a11y.deletePhoto": "Dieses Foto löschen",
    "sc.a11y.removeVideo": "Video entfernen",
    "wren.a11y.plusHint": "Öffnet Erste Klasse",
  },
  /* ── it ── */
  {
    "rc.a11y.record": "Registra",
    "rc.a11y.stop": "Ferma la registrazione",
    "rc.a11y.time": "{t} su {max}",
    "rc.a11y.started": "Registrazione in corso",
    "rc.a11y.stopped": "Registrazione fermata",
    "rc.a11y.discard": "Elimina la registrazione",
    "sc.a11y.photo": "Foto {i} di {n}",
    "sc.a11y.photoCover": "Foto {i} di {n}, la copertina",
    "sc.a11y.photoHint": "Apre la foto",
    "sc.a11y.deletePhoto": "Elimina questa foto",
    "sc.a11y.removeVideo": "Togli il video",
    "wren.a11y.plusHint": "Apre Prima Classe",
  },
  /* ── ja ── */
  {
    "rc.a11y.record": "録音",
    "rc.a11y.stop": "録音を止める",
    "rc.a11y.time": "{max}のうち{t}",
    "rc.a11y.started": "録音中",
    "rc.a11y.stopped": "録音を止めました",
    "rc.a11y.discard": "録音を削除",
    "sc.a11y.photo": "写真 {n}枚中{i}枚目",
    "sc.a11y.photoCover": "写真 {n}枚中{i}枚目、表紙",
    "sc.a11y.photoHint": "写真を開きます",
    "sc.a11y.deletePhoto": "この写真を削除",
    "sc.a11y.removeVideo": "動画を外す",
    "wren.a11y.plusHint": "ファーストクラスを開きます",
  },
  /* ── ko ── */
  {
    "rc.a11y.record": "녹음",
    "rc.a11y.stop": "녹음 멈추기",
    "rc.a11y.time": "{max} 중 {t}",
    "rc.a11y.started": "녹음 중",
    "rc.a11y.stopped": "녹음을 멈췄어요",
    "rc.a11y.discard": "녹음 삭제",
    "sc.a11y.photo": "사진 {n}장 중 {i}번째",
    "sc.a11y.photoCover": "사진 {n}장 중 {i}번째, 표지",
    "sc.a11y.photoHint": "사진을 열어요",
    "sc.a11y.deletePhoto": "이 사진 삭제",
    "sc.a11y.removeVideo": "동영상 빼기",
    "wren.a11y.plusHint": "퍼스트 클래스를 열어요",
  },
);
