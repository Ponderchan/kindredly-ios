import { strings } from "../lib/i18n";

/* EXPORTING THE STAMPS YOU MADE — ITS WORDS (stamp export, 2026-11-10; First Class).
   ────────────────────────────────────────────────────────────────────────
   A reader's own photo stamps can leave the app two ways, from the album: one stamp as a sticker
   (a PNG with a see-through ground, handed to the share sheet) and all of them as a printable
   sheet (an A4 PDF: the stamps at a real stamp's size between dashed cut lines, with one line of
   small capitals at the top and one at the foot). Both are First Class.

   ENGLISH FIRST (the eight blocks below were written natively on 2026-11-10; this note is how the file began): t() falls back to English, and the other eight languages are written
   natively after this (as each language, never translated; the comment on each key says what it
   is, where it sits and how long it may be). The three empty blocks are es, pt and id, which
   strings() requires.

   The voice: short, warm, lowercase-leaning, no exclamation marks. Wren does not speak here.

   Reused, no new copy: mf.result.lock (the wax-gold "1ST" tag on both actions for a reader who
   is not First Class), pp.a11y.fc (what VoiceOver says for that tag: "First Class").

   Imported for its side effect by the album's export hook (screens/me/useStampExport) and the
   dev page (app/dev/stamp-export). */

strings(
  /* ── en · English ── */
  {
    // the album, the sheet that opens when you tap one of your own stamps: one more capsule among
    // "Write with it", "Rename", "Delete" (System 600 15, one line): about 18 characters
    "sx.sticker": "Save as sticker",
    // the album, at the right of the MADE BY YOU head (small, System 600 12, like Me's "See all →"): at most 16 characters.
    // It makes a printable page of every stamp you made
    "sx.sheet": "Print a sheet",

    // the small pill at the foot of the album while the sticker is being made (a second or two); one short line, ends with an ellipsis
    "sx.sticker.making": "Cutting out your sticker…",
    // the same pill while the printable page is being made (a few seconds with many stamps)
    "sx.sheet.making": "Laying out your sheet…",

    // PRINTED on the sheet, small mono capitals centred at the top of every page. {n} is how many stamps the file holds (2 or more),
    // {year} the year it was made. Keep "KINDREDLY POST" as it is; at most 44 characters with the numbers in
    "sx.sheet.top": "KINDREDLY POST · {n} STAMPS · {year}",
    // the same line when the file holds exactly one stamp
    "sx.sheet.topOne": "KINDREDLY POST · 1 STAMP · {year}",
    // PRINTED at the foot of every page, small mono capitals: how to print it (at its real size, not "fit to page") and what the
    // dashed lines are for; at most 44 characters
    "sx.sheet.foot": "PRINT AT 100% · CUT ALONG THE LINES",

    // an alert's body when the sticker could not be made (its title is sx.sticker); two short sentences. The stamp itself is fine
    "sx.sticker.fail": "The sticker couldn't be made this time. Your stamp is safe.",
    // an alert's body when the sheet could not be made (its title is sx.sheet), usually because a stamp's picture could not be
    // fetched (no connection); two short sentences
    "sx.sheet.fail": "The sheet couldn't be made this time. Your stamps are safe.",
  },
  /* ── es · Español (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "sx.sticker": "Guardar como pegatina",
    "sx.sheet": "Imprimir hoja",
    "sx.sticker.making": "Recortando tu pegatina…",
    "sx.sheet.making": "Armando tu hoja…",
    "sx.sheet.top": "KINDREDLY POST · {n} SELLOS · {year}",
    "sx.sheet.topOne": "KINDREDLY POST · 1 SELLO · {year}",
    "sx.sheet.foot": "IMPRIME AL 100% · RECORTA POR LAS LÍNEAS",
    "sx.sticker.fail": "Esta vez no se pudo hacer la pegatina. Tu sello está a salvo.",
    "sx.sheet.fail": "Esta vez no se pudo hacer la hoja. Tus sellos están a salvo.",
  },
  /* ── pt · Português (Brasil) (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "sx.sticker": "Salvar como adesivo",
    "sx.sheet": "Imprimir folha",
    "sx.sticker.making": "Recortando seu adesivo…",
    "sx.sheet.making": "Montando sua folha…",
    "sx.sheet.top": "KINDREDLY POST · {n} SELOS · {year}",
    "sx.sheet.topOne": "KINDREDLY POST · 1 SELO · {year}",
    "sx.sheet.foot": "IMPRIMA EM 100% · RECORTE NAS LINHAS",
    "sx.sticker.fail": "Desta vez não deu para fazer o adesivo. Seu selo está a salvo.",
    "sx.sheet.fail": "Desta vez não deu para fazer a folha. Seus selos estão a salvo.",
  },
  /* ── id · Bahasa Indonesia (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "sx.sticker": "Simpan jadi stiker",
    "sx.sheet": "Cetak selembar",
    "sx.sticker.making": "Menggunting stikermu…",
    "sx.sheet.making": "Menata lembarmu…",
    "sx.sheet.top": "KINDREDLY POST · {n} PERANGKO · {year}",
    "sx.sheet.topOne": "KINDREDLY POST · 1 PERANGKO · {year}",
    "sx.sheet.foot": "CETAK SKALA 100% · GUNTING IKUTI GARIS",
    "sx.sticker.fail": "Stikernya belum berhasil dibuat kali ini. Perangkomu aman.",
    "sx.sheet.fail": "Lembarnya belum berhasil dibuat kali ini. Semua perangkomu aman.",
  },
  /* ── fr · Français (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "sx.sticker": "En faire un sticker",
    "sx.sheet": "Créer la planche",
    "sx.sticker.making": "Découpage de ton sticker…",
    "sx.sheet.making": "Mise en page de ta planche…",
    "sx.sheet.top": "KINDREDLY POST · {n} TIMBRES · {year}",
    "sx.sheet.topOne": "KINDREDLY POST · 1 TIMBRE · {year}",
    "sx.sheet.foot": "IMPRIMER À 100 % · COUPER SUR LES POINTILLÉS",
    "sx.sticker.fail": "Le sticker n'a pas pu être créé cette fois. Ton timbre est intact.",
    "sx.sheet.fail": "La planche n'a pas pu être créée cette fois. Tes timbres sont intacts.",
  },
  /* ── de · Deutsch (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "sx.sticker": "Als Sticker sichern",
    "sx.sheet": "Bogen drucken",
    "sx.sticker.making": "Dein Sticker wird ausgeschnitten…",
    "sx.sheet.making": "Deine Marken kommen auf den Bogen…",
    "sx.sheet.top": "KINDREDLY POST · {n} MARKEN · {year}",
    "sx.sheet.topOne": "KINDREDLY POST · 1 MARKE · {year}",
    "sx.sheet.foot": "IN 100 % DRUCKEN · AN DEN LINIEN SCHNEIDEN",
    "sx.sticker.fail": "Der Sticker ist diesmal nicht fertig geworden. Deine Marke ist sicher.",
    "sx.sheet.fail": "Der Bogen ist diesmal nicht fertig geworden. Deine Marken sind sicher.",
  },
  /* ── it · Italiano (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "sx.sticker": "Salva come sticker",
    "sx.sheet": "Stampa un foglio",
    "sx.sticker.making": "Ritaglio il tuo sticker…",
    "sx.sheet.making": "Impagino il tuo foglio…",
    "sx.sheet.top": "KINDREDLY POST · {n} FRANCOBOLLI · {year}",
    "sx.sheet.topOne": "KINDREDLY POST · 1 FRANCOBOLLO · {year}",
    "sx.sheet.foot": "STAMPA AL 100% · TAGLIA LUNGO IL TRATTEGGIO",
    "sx.sticker.fail": "Stavolta lo sticker non è venuto. Il tuo francobollo è al sicuro.",
    "sx.sheet.fail": "Stavolta il foglio non è venuto. I tuoi francobolli sono al sicuro.",
  },
  /* ── ja · 日本語 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "sx.sticker": "ステッカーとして保存",
    "sx.sheet": "切手シートを印刷",
    "sx.sticker.making": "ステッカーを切り抜いています…",
    "sx.sheet.making": "切手をシートに並べています…",
    "sx.sheet.top": "KINDREDLY POST · 切手{n}枚 · {year}",
    "sx.sheet.topOne": "KINDREDLY POST · 切手1枚 · {year}",
    "sx.sheet.foot": "実寸（100%）で印刷 · 点線で切り取る",
    "sx.sticker.fail": "今回はステッカーをつくれませんでした。切手はそのまま残っています。",
    "sx.sheet.fail": "今回はシートをつくれませんでした。切手はそのまま残っています。",
  },
  /* ── ko · 한국어 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "sx.sticker": "스티커로 저장",
    "sx.sheet": "우표 시트 인쇄",
    "sx.sticker.making": "스티커를 오려 내는 중…",
    "sx.sheet.making": "시트에 우표를 나란히 놓는 중…",
    "sx.sheet.top": "KINDREDLY POST · 우표 {n}장 · {year}",
    "sx.sheet.topOne": "KINDREDLY POST · 우표 1장 · {year}",
    "sx.sheet.foot": "실제 크기(100%)로 인쇄 · 점선 따라 자르기",
    "sx.sticker.fail": "이번에는 스티커를 만들지 못했어요. 우표는 그대로 있어요.",
    "sx.sheet.fail": "이번에는 시트를 만들지 못했어요. 우표는 그대로 있어요.",
  },
);
