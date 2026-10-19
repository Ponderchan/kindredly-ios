import { strings } from "../lib/i18n";

/* A11Y PASS, BATCH 5 — ONBOARDING V2'S NEW VOICEOVER WORDS.
   ────────────────────────────────────────────────────────────────────────
   Only what VoiceOver says; nothing here is drawn on screen. Short enough to
   be an element's name. Imported for its side effect by parts/frame.tsx
   (every v2 screen loads it). Everything else the pass announces reuses keys
   already in nine languages (ob2.letter.*, ob.code.bad, ob2.back, ob2.name.dice). */

strings(
  /* ── en ── */
  {
    "a11yob.face": "Face {n} of {total}", // 5, a face tile (was the developer's English description)
    "a11yob.chick": "Your courier", // 10, the chick (taps make it react)
    "a11yob.chickNamed": "Your courier, {name}",
    "a11yob.egg": "Your egg", // the nest egg over 3–6 and 8; its value is the step
    "a11yob.step": "Step {n} of {total}", // the four pips under the egg
  },
  /* ── es ── */
  {
    "a11yob.face": "Cara {n} de {total}",
    "a11yob.chick": "Tu mensajero",
    "a11yob.chickNamed": "Tu mensajero, {name}",
    "a11yob.egg": "Tu huevo",
    "a11yob.step": "Paso {n} de {total}",
  },
  /* ── pt ── */
  {
    "a11yob.face": "Rosto {n} de {total}",
    "a11yob.chick": "Seu mensageiro",
    "a11yob.chickNamed": "Seu mensageiro, {name}",
    "a11yob.egg": "Seu ovo",
    "a11yob.step": "Etapa {n} de {total}",
  },
  /* ── id ── */
  {
    "a11yob.face": "Wajah {n} dari {total}",
    "a11yob.chick": "Kurirmu",
    "a11yob.chickNamed": "Kurirmu, {name}",
    "a11yob.egg": "Telurmu",
    "a11yob.step": "Langkah {n} dari {total}",
  },
  /* ── fr ── */
  {
    "a11yob.face": "Visage {n} sur {total}",
    "a11yob.chick": "Ta messagère",
    "a11yob.chickNamed": "Ta messagère, {name}",
    "a11yob.egg": "Ton œuf",
    "a11yob.step": "Étape {n} sur {total}",
  },
  /* ── de ── */
  {
    "a11yob.face": "Gesicht {n} von {total}",
    "a11yob.chick": "Deine Botin",
    "a11yob.chickNamed": "Deine Botin, {name}",
    "a11yob.egg": "Dein Ei",
    "a11yob.step": "Schritt {n} von {total}",
  },
  /* ── it ── */
  {
    "a11yob.face": "Volto {n} di {total}",
    "a11yob.chick": "La tua messaggera",
    "a11yob.chickNamed": "La tua messaggera, {name}",
    "a11yob.egg": "Il tuo uovo",
    "a11yob.step": "Passo {n} di {total}",
  },
  /* ── ja ── */
  {
    "a11yob.face": "{n}番目の顔（全{total}）",
    "a11yob.chick": "あなたの伝書鳥",
    "a11yob.chickNamed": "あなたの伝書鳥、{name}",
    "a11yob.egg": "あなたの卵",
    "a11yob.step": "ステップ{n}（全{total}）",
  },
  /* ── ko ── */
  {
    "a11yob.face": "{total}개 중 {n}번째 얼굴",
    "a11yob.chick": "내 전령새",
    "a11yob.chickNamed": "내 전령새, {name}",
    "a11yob.egg": "내 알",
    "a11yob.step": "{total}단계 중 {n}단계",
  },
);
