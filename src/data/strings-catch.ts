import { strings } from "../lib/i18n";

/* CATCH A LINE — THE WORDS (owner, 2026-11-12: "按2d的做"). The Kindreds tab before anyone is in
   it: the first lines of today's letters drift across the empty orbit (screens/kindreds/
   catch-model, KKindredsEmpty.swift). Two lines under the sky while nothing is caught, and the
   opened letter's quiet button; its other button is kd.reply ("Write back"), which every
   language already has.

   Each language says it the way it would, not the way English does: the letters go by (they
   are not "passing through" anything), the slip is touched before it is gone, and the button
   lets it go on its way. Sentence case; tú / você / kamu / tu / du / tu, です・ます, 해요체, as the
   rest of the tab speaks. A letter is feminine in es, pt, fr and it, masculine in de.

   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), every block with the same
   keys. Consumers import this file for its side effect and reference only the keys below. */

strings(
  /* ── en · English ── */
  {
    // under the sky, while no slip is open
    "kc.title": "Letters are passing through.",
    "kc.sub": "Tap one before it drifts off.",
    // the opened letter's quiet button: the slips drift on
    "kc.letGo": "Let it go",
  },
  /* ── es · Español ── */
  {
    "kc.title": "Por aquí pasan cartas.",
    "kc.sub": "Toca una antes de que se aleje.",
    "kc.letGo": "Dejarla ir",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "kc.title": "Tem carta passando por aqui.",
    "kc.sub": "Toque em uma antes que ela vá embora.",
    "kc.letGo": "Deixar ir",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "kc.title": "Ada surat-surat yang lewat.",
    "kc.sub": "Ketuk satu sebelum ia berlalu.",
    "kc.letGo": "Biarkan lewat",
  },
  /* ── fr · Français ── */
  {
    "kc.title": "Des lettres passent par ici.",
    "kc.sub": "Touches-en une avant qu'elle ne file.",
    "kc.letGo": "La laisser filer",
  },
  /* ── de · Deutsch ── */
  {
    "kc.title": "Hier ziehen Briefe vorbei.",
    "kc.sub": "Tipp einen an, bevor er weiterzieht.",
    "kc.letGo": "Ziehen lassen",
  },
  /* ── it · Italiano ── */
  {
    "kc.title": "Di qui passano lettere.",
    "kc.sub": "Toccane una prima che scivoli via.",
    "kc.letGo": "Lasciala andare",
  },
  /* ── ja · 日本語 ── */
  {
    "kc.title": "手紙が通り過ぎていきます。",
    "kc.sub": "流れていく前に、ひとつ触れてみてください。",
    "kc.letGo": "見送る",
  },
  /* ── ko · 한국어 ── */
  {
    "kc.title": "편지들이 지나가고 있어요.",
    "kc.sub": "흘러가 버리기 전에 하나를 눌러 보세요.",
    "kc.letGo": "보내주기",
  },
);
