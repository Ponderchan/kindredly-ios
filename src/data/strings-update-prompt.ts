import { strings } from "../lib/i18n";

/* THE UPDATE PROMPT — ITS WORDS (owner, 2026-10-25: set A, used exactly as chosen).
   ────────────────────────────────────────────────────────────────────────
   The sheet Wren brings the parcel in (components/UpdatePrompt UpdateSheet) and the slim banner
   that stays on Today after Later (UpdateBanner). Wren's voice is lowercase: the title and her
   line are written that way on purpose, and nothing in the app raises them. The label is set in
   SF Mono caps on the parcel's stamp; {version} is the App Store's version (1.0.x) from Apple's
   lookup, and the label is not shown at all while that is unknown. "App Store" is Apple's name
   and stays as it is in every language.

   Nine languages (2026-10-25), each written natively in Wren's casual voice (not translated) and
   read blind by a native editor; {version} is kept as it is. Consumers import this file for its
   side effect. */

strings(
  /* ── en · English ── */
  {
    // the stamp on the parcel, SF Mono caps; {version} is the App Store's version ("1.0.6")
    "upd.version": "VERSION {version}",
    // the sheet's title, in Wren's lowercase voice
    "upd.title": "special delivery. it's me, but newer.",
    // Wren's line under the title
    "upd.line": "i'd carry it over myself, but the App Store insists.",
    // the filled key: opens the App Store
    "upd.update": "Update",
    // the quiet key: closes the sheet; the banner stays on Today
    "upd.later": "Later",
    // the banner on Today after Later, and its key
    "upd.banner": "a parcel's waiting for you",
    "upd.banner.cta": "Update ›",
  },
  /* ── es · Español ── */
  {
    "upd.version": "VERSIÓN {version}",
    "upd.title": "entrega especial. soy yo, con plumas nuevas.",
    "upd.line": "te lo traería en el pico, pero la App Store insiste.",
    "upd.update": "Actualizar",
    "upd.later": "Más tarde",
    "upd.banner": "te espera un paquete",
    "upd.banner.cta": "Actualizar ›",
  },
  /* ── pt · Português (Brasil) ── */
  {
    "upd.version": "VERSÃO {version}",
    "upd.title": "entrega especial. sou eu, com penas novas.",
    "upd.line": "eu trazia no bico, mas a App Store faz questão de entregar.",
    "upd.update": "Atualizar",
    "upd.later": "Mais tarde",
    "upd.banner": "tem uma encomenda te esperando",
    "upd.banner.cta": "Atualizar ›",
  },
  /* ── id · Bahasa Indonesia ── */
  {
    "upd.version": "VERSI {version}",
    "upd.title": "paket spesial. isinya aku, versi terbaru.",
    "upd.line": "maunya sih kuantar sendiri, tapi App Store ngotot harus lewat dia.",
    "upd.update": "Perbarui",
    "upd.later": "Nanti",
    "upd.banner": "ada paket nungguin kamu",
    "upd.banner.cta": "Perbarui ›",
  },
  /* ── fr · Français ── */
  {
    "upd.version": "VERSION {version}",
    "upd.title": "livraison spéciale. c'est moi, toute neuve.",
    "upd.line": "je te l'apporterais bien moi-même, mais l'App Store y tient.",
    "upd.update": "Mettre à jour",
    "upd.later": "Plus tard",
    "upd.banner": "un petit colis t'attend",
    "upd.banner.cta": "Mettre à jour ›",
  },
  /* ── de · Deutsch ── */
  {
    "upd.version": "VERSION {version}",
    "upd.title": "eilpost für dich. ich bin's, nur in neu.",
    "upd.line": "ich würd's dir ja selbst bringen, aber der App Store besteht drauf.",
    "upd.update": "Aktualisieren",
    "upd.later": "Später",
    "upd.banner": "ein päckchen wartet auf dich",
    "upd.banner.cta": "Aktualisieren ›",
  },
  /* ── it · Italiano ── */
  {
    "upd.version": "VERSIONE {version}",
    "upd.title": "posta prioritaria. sono io, ma aggiornata.",
    "upd.line": "te lo porterei io, ma l'App Store ci tiene a farlo lui.",
    "upd.update": "Aggiorna",
    "upd.later": "Più tardi",
    "upd.banner": "c'è un pacchetto che ti aspetta",
    "upd.banner.cta": "Aggiorna ›",
  },
  /* ── ja · 日本語 ── */
  {
    "upd.version": "バージョン {version}",
    "upd.title": "速達。ちょっと新しいわたし。",
    "upd.line": "App Storeがどうしてもって。ほんとは、わたしが運びたいのに。",
    "upd.update": "アップデート",
    "upd.later": "あとで",
    "upd.banner": "小包が届いてるよ",
    "upd.banner.cta": "アップデート ›",
  },
  /* ── ko · 한국어 ── */
  {
    "upd.version": "버전 {version}",
    "upd.title": "특급 배송 왔어. 조금 새로워진 나야.",
    "upd.line": "직접 물어다 주고 싶은데, App Store가 꼭 자기가 하겠대.",
    "upd.update": "업데이트",
    "upd.later": "나중에",
    "upd.banner": "당신 앞으로 소포가 와 있어",
    "upd.banner.cta": "업데이트 ›",
  },
);
