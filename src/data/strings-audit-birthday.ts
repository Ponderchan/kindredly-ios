import { strings } from "../lib/i18n";

/* THE BIRTHDAY PIECES' WORDS (owner's audit, 2026-11-10; slice "birthday").
   ────────────────────────────────────────────────────────────────────────
   English only for now: t() falls back to English, and the other eight
   languages are written natively afterwards (as each language, never
   translated). Each key's comment says what it is, where it sits and how
   long it may be.

   Three pieces, none of them on the Today tab:
   - Edit profile: setting a birthday ONCE, for an account that has none
     (screens/edit-profile). An under-18 answer gets onboarding's own block
     and onboarding's own words (ob2.underage.*, strings-onboarding2): none
     are written here.
   - The 8 o'clock knock on the reader's birthday (lib/local-push): her
     birthday line instead of the day's knock line.
   - The birthday stamp in the composer's tray (lib/birthday-stamp-core,
     lib/birthday-stamp): its small marker and its set's heading. The
     stamp's own name and prompt live in data/stamps.ts with every other
     stamp ("Birthday" / "It's my birthday today."), also English only for
     now (their other languages are "" there, which reads as English).

   Reused, no new copy: ep.birthday (the row, the wheel sheet's title),
   ob2.birthday.before (the line under that title), wren.trackClose (the
   sheet's ✕), set.cantSave / set.push.saveFail (a save the account refused),
   ob2.underage.head / .line / .change (the under-18 block, on onboarding's
   own screen).

   Imported for its side effect by useEditProfileModel, lib/local-push and
   lib/birthday-stamp. */

strings(
  /* ── en · English ── */
  {
    // ── Edit profile: the Birthday row while no birthday is set ──
    // VoiceOver's hint on the row (it is a button only then)
    "bd.row.hint": "Opens the date wheel. A birthday can be set once.",
    // the wheel sheet's filled key, under the wheel (dim until a year is turned); two or three words
    "bd.sheet.key": "Set birthday",
    // the small line under that key: said BEFORE the confirmation too, so nobody is surprised by it; one line
    "bd.sheet.once": "You can set it once. It can't be changed afterwards.",
    // the system alert before it is saved: {date} is the date in the reader's language, long form ("4 March 1991")
    "bd.confirm.title": "Set {date} as your birthday?",
    // the alert's message; one sentence
    "bd.confirm.body": "It can't be changed afterwards.",
    // the alert's two buttons (system alert buttons: one or two words)
    "bd.confirm.yes": "Set it",
    "bd.confirm.no": "Go back",

    // ── the 8 o'clock knock on the reader's birthday ──
    // a notification body under the courier's name (the title), in her voice: first person, lower case,
    // no closing full stop, no exclamation mark, as short as the knock lines ("morning. letters are on your desk")
    "bd.knock": "happy birthday. i flew in early to say it first",

    // ── the birthday stamp in the composer's tray ──
    // the small marker over the stamp, where the seasonal set says SEASONAL: mono 8 caps in a capsule, very short
    // (it sits over ONE stamp in the strip: 12 characters at most)
    "bd.stamp.mark": "TODAY ONLY",
    // the set's heading in the full tray (the React Native tray; in capitals like HALLOWEEN, beside the marker on one
    // line) and what VoiceOver calls the set: one or two words
    "bd.stamp.set": "YOUR BIRTHDAY",
  },
  /* ── es · Español (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.row.hint": "Abre el selector de fecha. El cumpleaños se elige una sola vez.",
    "bd.sheet.key": "Guardar cumpleaños",
    "bd.sheet.once": "Se elige una sola vez. Después no se puede cambiar.",
    "bd.confirm.title": "¿Guardar el {date} como tu cumpleaños?",
    "bd.confirm.body": "Después no se puede cambiar.",
    "bd.confirm.yes": "Guardar",
    "bd.confirm.no": "Volver",
    "bd.knock": "feliz cumpleaños. madrugué para decírtelo antes que nadie",
    "bd.stamp.mark": "SOLO HOY",
    "bd.stamp.set": "TU CUMPLEAÑOS",
  },
  /* ── pt · Português (Brasil) (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.row.hint": "Abre o seletor de data. O aniversário só pode ser definido uma vez.",
    "bd.sheet.key": "Salvar aniversário",
    "bd.sheet.once": "Só dá pra definir uma vez. Depois não dá pra mudar.",
    "bd.confirm.title": "Salvar {date} como seu aniversário?",
    "bd.confirm.body": "Depois não dá pra mudar.",
    "bd.confirm.yes": "Salvar",
    "bd.confirm.no": "Voltar",
    "bd.knock": "feliz aniversário. voei cedinho pra te dizer antes de todo mundo",
    "bd.stamp.mark": "SÓ HOJE",
    "bd.stamp.set": "SEU ANIVERSÁRIO",
  },
  /* ── id · Bahasa Indonesia (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.row.hint": "Membuka pemilih tanggal. Tanggal lahir hanya bisa diatur sekali.",
    "bd.sheet.key": "Pakai tanggal ini",
    "bd.sheet.once": "Hanya bisa diatur sekali. Setelah itu tidak bisa diubah.",
    "bd.confirm.title": "Jadikan {date} tanggal lahirmu?",
    "bd.confirm.body": "Setelah ini tidak bisa diubah lagi.",
    "bd.confirm.yes": "Simpan",
    "bd.confirm.no": "Kembali",
    "bd.knock": "selamat ulang tahun. aku terbang pagi-pagi biar duluan",
    "bd.stamp.mark": "HARI INI AJA",
    "bd.stamp.set": "ULANG TAHUNMU",
  },
  /* ── fr · Français (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.row.hint": "Ouvre le sélecteur de date. La date de naissance ne se choisit qu'une seule fois.",
    "bd.sheet.key": "Choisir cette date",
    "bd.sheet.once": "Tu ne peux la choisir qu'une seule fois. Impossible de la changer ensuite.",
    "bd.confirm.title": "Ta date de naissance, c'est bien le {date} ?",
    "bd.confirm.body": "Tu ne pourras plus la changer ensuite.",
    "bd.confirm.yes": "Confirmer",
    "bd.confirm.no": "Retour",
    "bd.knock": "joyeux anniversaire. venue tôt pour te le dire la première",
    "bd.stamp.mark": "UN SEUL JOUR",
    "bd.stamp.set": "TON ANNIVERSAIRE",
  },
  /* ── de · Deutsch (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.row.hint": "Öffnet die Datumsauswahl. Der Geburtstag lässt sich nur einmal festlegen.",
    "bd.sheet.key": "Geburtstag festlegen",
    "bd.sheet.once": "Du kannst ihn nur einmal festlegen. Danach lässt er sich nicht mehr ändern.",
    "bd.confirm.title": "{date} als Geburtstag festlegen?",
    "bd.confirm.body": "Danach lässt er sich nicht mehr ändern.",
    "bd.confirm.yes": "Festlegen",
    "bd.confirm.no": "Zurück",
    "bd.knock": "alles gute zum geburtstag. der frühe vogel gratuliert zuerst",
    "bd.stamp.mark": "NUR HEUTE",
    "bd.stamp.set": "DEIN GEBURTSTAG",
  },
  /* ── it · Italiano (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.row.hint": "Apre il selettore della data. Il compleanno si può impostare una volta sola.",
    "bd.sheet.key": "Imposta compleanno",
    "bd.sheet.once": "Puoi impostarlo una volta sola. Dopo non si può più cambiare.",
    "bd.confirm.title": "Compleanno: {date}. Confermi?",
    "bd.confirm.body": "Dopo non si potrà più cambiare.",
    "bd.confirm.yes": "Conferma",
    "bd.confirm.no": "Indietro",
    "bd.knock": "buon compleanno. sono arrivata presto per dirtelo per prima",
    "bd.stamp.mark": "SOLO OGGI",
    "bd.stamp.set": "IL TUO COMPLEANNO",
  },
  /* ── ja · 日本語 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.row.hint": "日付を選ぶ画面を開きます。誕生日を設定できるのは一度だけです。",
    "bd.sheet.key": "誕生日を設定",
    "bd.sheet.once": "設定できるのは一度だけです。あとから変更はできません。",
    "bd.confirm.title": "{date}を誕生日に設定しますか？",
    "bd.confirm.body": "あとから変更はできません。",
    "bd.confirm.yes": "設定する",
    "bd.confirm.no": "戻る",
    "bd.knock": "誕生日おめでとう。いちばん乗りで言いに来た",
    "bd.stamp.mark": "本日限定",
    "bd.stamp.set": "あなたの誕生日",
  },
  /* ── ko · 한국어 (written natively, then a blind native edit, 2026-11-10) ── */
  {
    "bd.row.hint": "날짜를 고르는 창을 열어요. 생일은 한 번만 정할 수 있어요.",
    "bd.sheet.key": "생일 정하기",
    "bd.sheet.once": "한 번만 정할 수 있어요. 정한 뒤에는 바꿀 수 없어요.",
    "bd.confirm.title": "생일을 {date}로 정할까요?",
    "bd.confirm.body": "정한 뒤에는 바꿀 수 없어요.",
    "bd.confirm.yes": "정하기",
    "bd.confirm.no": "돌아가기",
    "bd.knock": "생일 축하해. 제일 먼저 말하려고 일찍 날아왔어",
    "bd.stamp.mark": "오늘 한정",
    "bd.stamp.set": "당신의 생일",
  },
);
