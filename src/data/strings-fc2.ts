import { strings } from "../lib/i18n";

/* FC2 — EVERY NEW WORD FOR THE FIRST CLASS RECEIPT (A3), THE STAMP AVATAR (C2), THE COFOUNDER
   PERK LINE, THE 4a FIRST CLASS CARD EVERYWHERE AND THE FIVE APPEARANCES (2026-10-19).
   ────────────────────────────────────────────────────────────────────────
   The build contract is .claude/fc-receipt/CONTRACT.md (§8 lists every key with its English).
   One file, nine blocks (en es pt id fr de it ja ko — pt is pt-BR), in that order. Each build
   agent writes ONLY between its own markers, in every block, with the same keys in all nine:
     A receipt-fc  → fc2.rc.*  fc2.cf.*
     B avatar-swift → (none planned; B reads fc2.av.*)
     C avatar-rn   → fc2.av.*
     D appearance  → fc2.ap.*
   Each language is written AS that language (native, short, warm, like the other First Class
   lines), never translated word for word; then reread cold as that language's editor. The reader
   is never gendered. Each consumer imports this file for its side effect. A key missing from a
   block falls back to English: src/data/strings-fc2.test.ts checks the nine agree
   (node src/data/strings-fc2.test.ts). */

strings(
  /* ── en · English ── */
  {
    /* ── A receipt-fc · en ── */
    "fc2.rc.stFirst": "first class ✦",
    "fc2.rc.stClass": "1ST CLASS",
    "fc2.rc.stCofounder": "COFOUNDER #{n}",
    "fc2.rc.stCofounderPending": "COFOUNDER",
    "fc2.rc.stFreeDays": "{n} days free",
    "fc2.rc.stFreeDayOne": "1 day free",
    "fc2.rc.stFreeMonths": "{n} months free",
    "fc2.rc.stFreeMonthOne": "1 month free",
    "fc2.rc.stYearly": "yearly",
    "fc2.rc.stMonthly": "monthly",
    "fc2.rc.stOneOf": "one of {n}",
    "fc2.rc.titleSub": "Your letters travel first class now.",
    "fc2.rc.titleLife": "You’re a cofounder now.",
    "fc2.rc.lenDays": "{n} days",
    "fc2.rc.lenDayOne": "1 day",
    "fc2.rc.lenMonths": "{n} months",
    "fc2.rc.lenMonthOne": "1 month",
    "fc2.rc.bodyTrialYear": "Free for {trial} starting today. First charge {price} on {date}, then yearly. Cancel anytime in Settings.",
    "fc2.rc.bodyTrialMonth": "Free for {trial} starting today. First charge {price} on {date}, then monthly. Cancel anytime in Settings.",
    "fc2.rc.bodyPaidYear": "{price} charged today, renews yearly. Cancel anytime in Settings.",
    "fc2.rc.bodyPaidMonth": "{price} charged today, renews monthly. Cancel anytime in Settings.",
    "fc2.rc.bodyRenewYear": "Renews yearly at {price}. Cancel anytime in Settings.",
    "fc2.rc.bodyRenewMonth": "Renews monthly at {price}. Cancel anytime in Settings.",
    "fc2.rc.bodyLife": "One payment, yours for good. Cofounder No. {n} is printed on everything the app says about you.",
    "fc2.rc.bodyLifePending": "One payment, yours for good. Your Cofounder number will be printed on everything the app says about you.",
    "fc2.rc.go": "Start writing",
    "fc2.rc.close": "Close",
    "fc2.cf.stamp": "Your avatar becomes a stamp",
    "fc2.cf.stampSub": "printed with your number",
    /* ── end A · en ── */

    /* ── B avatar-swift · en ── */
    /* ── end B · en ── */

    /* ── C avatar-rn · en ── */
    "fc2.av.member": "First Class",
    "fc2.av.cofounder": "Cofounder No. {n}",
    /* ── end C · en ── */

    /* ── D appearance · en ── */
    "fc2.ap.system": "System",
    "fc2.ap.light": "Light",
    "fc2.ap.dark": "Dark",
    "fc2.ap.systemHint": "Follows your iPhone’s Light or Dark setting",
    /* ── end D · en ── */
  },
  /* ── es · Spanish ── */
  {
    /* ── A receipt-fc · es ── */
    "fc2.rc.stFirst": "primera clase ✦",
    "fc2.rc.stClass": "1.ª CLASE",
    "fc2.rc.stCofounder": "COFOUNDER #{n}",
    "fc2.rc.stCofounderPending": "COFOUNDER",
    "fc2.rc.stFreeDays": "{n} días gratis",
    "fc2.rc.stFreeDayOne": "1 día gratis",
    "fc2.rc.stFreeMonths": "{n} meses gratis",
    "fc2.rc.stFreeMonthOne": "1 mes gratis",
    "fc2.rc.stYearly": "anual",
    "fc2.rc.stMonthly": "mensual",
    "fc2.rc.stOneOf": "uno de {n}",
    "fc2.rc.titleSub": "Tus cartas ya viajan en primera clase.",
    "fc2.rc.titleLife": "Ya eres parte de quienes fundan Kindredly.",
    "fc2.rc.lenDays": "{n} días",
    "fc2.rc.lenDayOne": "1 día",
    "fc2.rc.lenMonths": "{n} meses",
    "fc2.rc.lenMonthOne": "1 mes",
    "fc2.rc.bodyTrialYear": "Gratis durante {trial} desde hoy. Primer cargo de {price} el {date}, y después cada año. Cancela cuando quieras en Ajustes.",
    "fc2.rc.bodyTrialMonth": "Gratis durante {trial} desde hoy. Primer cargo de {price} el {date}, y después cada mes. Cancela cuando quieras en Ajustes.",
    "fc2.rc.bodyPaidYear": "Hoy se cobran {price} y se renueva cada año. Cancela cuando quieras en Ajustes.",
    "fc2.rc.bodyPaidMonth": "Hoy se cobran {price} y se renueva cada mes. Cancela cuando quieras en Ajustes.",
    "fc2.rc.bodyRenewYear": "Se renueva cada año por {price}. Cancela cuando quieras en Ajustes.",
    "fc2.rc.bodyRenewMonth": "Se renueva cada mes por {price}. Cancela cuando quieras en Ajustes.",
    "fc2.rc.bodyLife": "Un solo pago, tuyo para siempre. Tu número de fundación, el {n}, va impreso en todo lo que la app dice de ti.",
    "fc2.rc.bodyLifePending": "Un solo pago, tuyo para siempre. Tu número de fundación irá impreso en todo lo que la app dice de ti.",
    "fc2.rc.go": "Empezar a escribir",
    "fc2.rc.close": "Cerrar",
    "fc2.cf.stamp": "Tu avatar se vuelve un sello",
    "fc2.cf.stampSub": "impreso con tu número",
    /* ── end A · es ── */

    /* ── B avatar-swift · es ── */
    /* ── end B · es ── */

    /* ── C avatar-rn · es ── */
    "fc2.av.member": "Primera Clase",
    "fc2.av.cofounder": "Cofundador N.º {n}",
    /* ── end C · es ── */

    /* ── D appearance · es ── */
    "fc2.ap.system": "Sistema",
    "fc2.ap.light": "Claro",
    "fc2.ap.dark": "Oscuro",
    "fc2.ap.systemHint": "Sigue el modo claro u oscuro de tu iPhone",
    /* ── end D · es ── */
  },
  /* ── pt · Brazilian Portuguese (pt-BR) ── */
  {
    /* ── A receipt-fc · pt ── */
    "fc2.rc.stFirst": "primeira classe ✦",
    "fc2.rc.stClass": "1ª CLASSE",
    "fc2.rc.stCofounder": "COFOUNDER #{n}",
    "fc2.rc.stCofounderPending": "COFOUNDER",
    "fc2.rc.stFreeDays": "{n} dias grátis",
    "fc2.rc.stFreeDayOne": "1 dia grátis",
    "fc2.rc.stFreeMonths": "{n} meses grátis",
    "fc2.rc.stFreeMonthOne": "1 mês grátis",
    "fc2.rc.stYearly": "anual",
    "fc2.rc.stMonthly": "mensal",
    "fc2.rc.stOneOf": "um de {n}",
    "fc2.rc.titleSub": "Suas cartas agora viajam de primeira classe.",
    "fc2.rc.titleLife": "Agora você faz parte da fundação do Kindredly.",
    "fc2.rc.lenDays": "{n} dias",
    "fc2.rc.lenDayOne": "1 dia",
    "fc2.rc.lenMonths": "{n} meses",
    "fc2.rc.lenMonthOne": "1 mês",
    "fc2.rc.bodyTrialYear": "Grátis por {trial} a partir de hoje. Primeira cobrança de {price} em {date}, depois todo ano. Cancele quando quiser nos Ajustes.",
    "fc2.rc.bodyTrialMonth": "Grátis por {trial} a partir de hoje. Primeira cobrança de {price} em {date}, depois todo mês. Cancele quando quiser nos Ajustes.",
    "fc2.rc.bodyPaidYear": "{price} cobrados hoje, renova todo ano. Cancele quando quiser nos Ajustes.",
    "fc2.rc.bodyPaidMonth": "{price} cobrados hoje, renova todo mês. Cancele quando quiser nos Ajustes.",
    "fc2.rc.bodyRenewYear": "Renova todo ano por {price}. Cancele quando quiser nos Ajustes.",
    "fc2.rc.bodyRenewMonth": "Renova todo mês por {price}. Cancele quando quiser nos Ajustes.",
    "fc2.rc.bodyLife": "Um pagamento só, seu para sempre. Seu número de fundação, o {n}, aparece impresso em tudo o que o app diz sobre você.",
    "fc2.rc.bodyLifePending": "Um pagamento só, seu para sempre. Seu número de fundação vai aparecer impresso em tudo o que o app diz sobre você.",
    "fc2.rc.go": "Começar a escrever",
    "fc2.rc.close": "Fechar",
    "fc2.cf.stamp": "Seu avatar vira um selo",
    "fc2.cf.stampSub": "impresso com o seu número",
    /* ── end A · pt ── */

    /* ── B avatar-swift · pt ── */
    /* ── end B · pt ── */

    /* ── C avatar-rn · pt ── */
    "fc2.av.member": "Primeira Classe",
    "fc2.av.cofounder": "Cofundador N.º {n}",
    /* ── end C · pt ── */

    /* ── D appearance · pt ── */
    "fc2.ap.system": "Sistema",
    "fc2.ap.light": "Claro",
    "fc2.ap.dark": "Escuro",
    "fc2.ap.systemHint": "Acompanha o modo claro ou escuro do seu iPhone",
    /* ── end D · pt ── */
  },
  /* ── id · Indonesian ── */
  {
    /* ── A receipt-fc · id ── */
    "fc2.rc.stFirst": "kelas utama ✦",
    "fc2.rc.stClass": "KELAS UTAMA",
    "fc2.rc.stCofounder": "COFOUNDER #{n}",
    "fc2.rc.stCofounderPending": "COFOUNDER",
    "fc2.rc.stFreeDays": "gratis {n} hari",
    "fc2.rc.stFreeDayOne": "gratis 1 hari",
    "fc2.rc.stFreeMonths": "gratis {n} bulan",
    "fc2.rc.stFreeMonthOne": "gratis 1 bulan",
    "fc2.rc.stYearly": "tahunan",
    "fc2.rc.stMonthly": "bulanan",
    "fc2.rc.stOneOf": "satu dari {n}",
    "fc2.rc.titleSub": "Suratmu kini terbang di kelas utama.",
    "fc2.rc.titleLife": "Kamu kini seorang cofounder.",
    "fc2.rc.lenDays": "{n} hari",
    "fc2.rc.lenDayOne": "1 hari",
    "fc2.rc.lenMonths": "{n} bulan",
    "fc2.rc.lenMonthOne": "1 bulan",
    "fc2.rc.bodyTrialYear": "Gratis {trial} mulai hari ini. Tagihan pertama {price} pada {date}, lalu tiap tahun. Batalkan kapan saja di Pengaturan.",
    "fc2.rc.bodyTrialMonth": "Gratis {trial} mulai hari ini. Tagihan pertama {price} pada {date}, lalu tiap bulan. Batalkan kapan saja di Pengaturan.",
    "fc2.rc.bodyPaidYear": "{price} ditagih hari ini, diperpanjang tiap tahun. Batalkan kapan saja di Pengaturan.",
    "fc2.rc.bodyPaidMonth": "{price} ditagih hari ini, diperpanjang tiap bulan. Batalkan kapan saja di Pengaturan.",
    "fc2.rc.bodyRenewYear": "Diperpanjang tiap tahun seharga {price}. Batalkan kapan saja di Pengaturan.",
    "fc2.rc.bodyRenewMonth": "Diperpanjang tiap bulan seharga {price}. Batalkan kapan saja di Pengaturan.",
    "fc2.rc.bodyLife": "Sekali bayar, milikmu selamanya. Nomor cofounder-mu, {n}, tercetak di semua yang aplikasi ini tunjukkan tentangmu.",
    "fc2.rc.bodyLifePending": "Sekali bayar, milikmu selamanya. Nomor cofounder-mu akan tercetak di semua yang aplikasi ini tunjukkan tentangmu.",
    "fc2.rc.go": "Mulai menulis",
    "fc2.rc.close": "Tutup",
    "fc2.cf.stamp": "Avatarmu jadi perangko",
    "fc2.cf.stampSub": "tercetak dengan nomormu",
    /* ── end A · id ── */

    /* ── B avatar-swift · id ── */
    /* ── end B · id ── */

    /* ── C avatar-rn · id ── */
    "fc2.av.member": "Kelas Utama",
    "fc2.av.cofounder": "Cofounder ke-{n}",
    /* ── end C · id ── */

    /* ── D appearance · id ── */
    "fc2.ap.system": "Sistem",
    "fc2.ap.light": "Terang",
    "fc2.ap.dark": "Gelap",
    "fc2.ap.systemHint": "Ikut mode terang atau gelap di iPhone-mu",
    /* ── end D · id ── */
  },
  /* ── fr · French ── */
  {
    /* ── A receipt-fc · fr ── */
    "fc2.rc.stFirst": "première classe ✦",
    "fc2.rc.stClass": "1re CLASSE",
    "fc2.rc.stCofounder": "COFOUNDER #{n}",
    "fc2.rc.stCofounderPending": "COFOUNDER",
    "fc2.rc.stFreeDays": "{n} jours offerts",
    "fc2.rc.stFreeDayOne": "1 jour offert",
    "fc2.rc.stFreeMonths": "{n} mois offerts",
    "fc2.rc.stFreeMonthOne": "1 mois offert",
    "fc2.rc.stYearly": "annuel",
    "fc2.rc.stMonthly": "mensuel",
    "fc2.rc.stOneOf": "un sur {n}",
    "fc2.rc.titleSub": "Tes lettres voyagent en première classe.",
    "fc2.rc.titleLife": "Bienvenue dans le cercle fondateur.",
    "fc2.rc.lenDays": "{n} jours",
    "fc2.rc.lenDayOne": "1 jour",
    "fc2.rc.lenMonths": "{n} mois",
    "fc2.rc.lenMonthOne": "1 mois",
    "fc2.rc.bodyTrialYear": "Gratuit pendant {trial} dès aujourd’hui. Premier prélèvement de {price} le {date}, puis chaque année. Résiliable à tout moment dans Réglages.",
    "fc2.rc.bodyTrialMonth": "Gratuit pendant {trial} dès aujourd’hui. Premier prélèvement de {price} le {date}, puis chaque mois. Résiliable à tout moment dans Réglages.",
    "fc2.rc.bodyPaidYear": "{price} débités aujourd’hui, renouvelé chaque année. Résiliable à tout moment dans Réglages.",
    "fc2.rc.bodyPaidMonth": "{price} débités aujourd’hui, renouvelé chaque mois. Résiliable à tout moment dans Réglages.",
    "fc2.rc.bodyRenewYear": "Renouvelé chaque année à {price}. Résiliable à tout moment dans Réglages.",
    "fc2.rc.bodyRenewMonth": "Renouvelé chaque mois à {price}. Résiliable à tout moment dans Réglages.",
    "fc2.rc.bodyLife": "Un seul paiement, à toi pour toujours. Ton numéro fondateur, le {n}, est imprimé sur tout ce que l’app dit de toi.",
    "fc2.rc.bodyLifePending": "Un seul paiement, à toi pour toujours. Ton numéro fondateur sera imprimé sur tout ce que l’app dit de toi.",
    "fc2.rc.go": "Commencer à écrire",
    "fc2.rc.close": "Fermer",
    "fc2.cf.stamp": "Ton avatar devient un timbre",
    "fc2.cf.stampSub": "imprimé à ton numéro",
    /* ── end A · fr ── */

    /* ── B avatar-swift · fr ── */
    /* ── end B · fr ── */

    /* ── C avatar-rn · fr ── */
    "fc2.av.member": "Première classe",
    "fc2.av.cofounder": "Cofondateur n° {n}",
    /* ── end C · fr ── */

    /* ── D appearance · fr ── */
    "fc2.ap.system": "Système",
    "fc2.ap.light": "Clair",
    "fc2.ap.dark": "Sombre",
    "fc2.ap.systemHint": "Suit le mode clair ou sombre de ton iPhone",
    /* ── end D · fr ── */
  },
  /* ── de · German ── */
  {
    /* ── A receipt-fc · de ── */
    "fc2.rc.stFirst": "erste Klasse ✦",
    "fc2.rc.stClass": "1. KLASSE",
    "fc2.rc.stCofounder": "COFOUNDER #{n}",
    "fc2.rc.stCofounderPending": "COFOUNDER",
    "fc2.rc.stFreeDays": "{n} Tage gratis",
    "fc2.rc.stFreeDayOne": "1 Tag gratis",
    "fc2.rc.stFreeMonths": "{n} Monate gratis",
    "fc2.rc.stFreeMonthOne": "1 Monat gratis",
    "fc2.rc.stYearly": "jährlich",
    "fc2.rc.stMonthly": "monatlich",
    "fc2.rc.stOneOf": "eine von {n}",
    "fc2.rc.titleSub": "Deine Briefe reisen jetzt Erste Klasse.",
    "fc2.rc.titleLife": "Jetzt gehörst du zum Gründungskreis.",
    "fc2.rc.lenDays": "{n} Tage",
    "fc2.rc.lenDayOne": "1 Tag",
    "fc2.rc.lenMonths": "{n} Monate",
    "fc2.rc.lenMonthOne": "1 Monat",
    "fc2.rc.bodyTrialYear": "Ab heute {trial} lang gratis. Erste Abbuchung von {price} am {date}, danach jährlich. Jederzeit in den Einstellungen kündbar.",
    "fc2.rc.bodyTrialMonth": "Ab heute {trial} lang gratis. Erste Abbuchung von {price} am {date}, danach monatlich. Jederzeit in den Einstellungen kündbar.",
    "fc2.rc.bodyPaidYear": "{price} heute abgebucht, verlängert sich jährlich. Jederzeit in den Einstellungen kündbar.",
    "fc2.rc.bodyPaidMonth": "{price} heute abgebucht, verlängert sich monatlich. Jederzeit in den Einstellungen kündbar.",
    "fc2.rc.bodyRenewYear": "Verlängert sich jährlich für {price}. Jederzeit in den Einstellungen kündbar.",
    "fc2.rc.bodyRenewMonth": "Verlängert sich monatlich für {price}. Jederzeit in den Einstellungen kündbar.",
    "fc2.rc.bodyLife": "Einmal zahlen, für immer deins. Deine Gründungsnummer {n} steht auf allem, was die App über dich zeigt.",
    "fc2.rc.bodyLifePending": "Einmal zahlen, für immer deins. Deine Gründungsnummer steht bald auf allem, was die App über dich zeigt.",
    "fc2.rc.go": "Losschreiben",
    "fc2.rc.close": "Schließen",
    "fc2.cf.stamp": "Dein Avatar wird zur Briefmarke",
    "fc2.cf.stampSub": "mit deiner Nummer bedruckt",
    /* ── end A · de ── */

    /* ── B avatar-swift · de ── */
    /* ── end B · de ── */

    /* ── C avatar-rn · de ── */
    "fc2.av.member": "Erste Klasse",
    "fc2.av.cofounder": "Mitgründer Nr. {n}",
    /* ── end C · de ── */

    /* ── D appearance · de ── */
    "fc2.ap.system": "Automatisch",
    "fc2.ap.light": "Hell",
    "fc2.ap.dark": "Dunkel",
    "fc2.ap.systemHint": "Folgt dem hellen oder dunklen Modus deines iPhones",
    /* ── end D · de ── */
  },
  /* ── it · Italian ── */
  {
    /* ── A receipt-fc · it ── */
    "fc2.rc.stFirst": "prima classe ✦",
    "fc2.rc.stClass": "1ª CLASSE",
    "fc2.rc.stCofounder": "COFOUNDER #{n}",
    "fc2.rc.stCofounderPending": "COFOUNDER",
    "fc2.rc.stFreeDays": "{n} giorni gratis",
    "fc2.rc.stFreeDayOne": "1 giorno gratis",
    "fc2.rc.stFreeMonths": "{n} mesi gratis",
    "fc2.rc.stFreeMonthOne": "1 mese gratis",
    "fc2.rc.stYearly": "annuale",
    "fc2.rc.stMonthly": "mensile",
    "fc2.rc.stOneOf": "uno di {n}",
    "fc2.rc.titleSub": "Le tue lettere ora viaggiano in prima classe.",
    "fc2.rc.titleLife": "Ora fai parte del gruppo fondatore.",
    "fc2.rc.lenDays": "{n} giorni",
    "fc2.rc.lenDayOne": "1 giorno",
    "fc2.rc.lenMonths": "{n} mesi",
    "fc2.rc.lenMonthOne": "1 mese",
    "fc2.rc.bodyTrialYear": "Gratis per {trial} da oggi. Primo addebito di {price} il {date}, poi ogni anno. Puoi disdire quando vuoi in Impostazioni.",
    "fc2.rc.bodyTrialMonth": "Gratis per {trial} da oggi. Primo addebito di {price} il {date}, poi ogni mese. Puoi disdire quando vuoi in Impostazioni.",
    "fc2.rc.bodyPaidYear": "{price} addebitati oggi, si rinnova ogni anno. Puoi disdire quando vuoi in Impostazioni.",
    "fc2.rc.bodyPaidMonth": "{price} addebitati oggi, si rinnova ogni mese. Puoi disdire quando vuoi in Impostazioni.",
    "fc2.rc.bodyRenewYear": "Si rinnova ogni anno a {price}. Puoi disdire quando vuoi in Impostazioni.",
    "fc2.rc.bodyRenewMonth": "Si rinnova ogni mese a {price}. Puoi disdire quando vuoi in Impostazioni.",
    "fc2.rc.bodyLife": "Un solo pagamento, tuo per sempre. Il tuo numero fondatore, il {n}, è stampato su tutto ciò che l’app dice di te.",
    "fc2.rc.bodyLifePending": "Un solo pagamento, tuo per sempre. Il tuo numero fondatore sarà stampato su tutto ciò che l’app dice di te.",
    "fc2.rc.go": "Inizia a scrivere",
    "fc2.rc.close": "Chiudi",
    "fc2.cf.stamp": "Il tuo avatar diventa un francobollo",
    "fc2.cf.stampSub": "stampato con il tuo numero",
    /* ── end A · it ── */

    /* ── B avatar-swift · it ── */
    /* ── end B · it ── */

    /* ── C avatar-rn · it ── */
    "fc2.av.member": "Prima classe",
    "fc2.av.cofounder": "Cofondatore n. {n}",
    /* ── end C · it ── */

    /* ── D appearance · it ── */
    "fc2.ap.system": "Sistema",
    "fc2.ap.light": "Chiaro",
    "fc2.ap.dark": "Scuro",
    "fc2.ap.systemHint": "Segue la modalità chiara o scura del tuo iPhone",
    /* ── end D · it ── */
  },
  /* ── ja · Japanese ── */
  {
    /* ── A receipt-fc · ja ── */
    "fc2.rc.stFirst": "ファーストクラス ✦",
    "fc2.rc.stClass": "1ST CLASS",
    "fc2.rc.stCofounder": "共同創業者 #{n}",
    "fc2.rc.stCofounderPending": "共同創業者",
    "fc2.rc.stFreeDays": "{n}日間無料",
    "fc2.rc.stFreeDayOne": "1日間無料",
    "fc2.rc.stFreeMonths": "{n}か月無料",
    "fc2.rc.stFreeMonthOne": "1か月無料",
    "fc2.rc.stYearly": "年額",
    "fc2.rc.stMonthly": "月額",
    "fc2.rc.stOneOf": "{n}名のひとり",
    "fc2.rc.titleSub": "これから手紙は、ファーストクラスで旅をします。",
    "fc2.rc.titleLife": "共同創業者になりました。",
    "fc2.rc.lenDays": "{n}日間",
    "fc2.rc.lenDayOne": "1日間",
    "fc2.rc.lenMonths": "{n}か月",
    "fc2.rc.lenMonthOne": "1か月",
    "fc2.rc.bodyTrialYear": "今日から{trial}無料。{date}に初回{price}のお支払い、その後は毎年更新です。設定からいつでも解約できます。",
    "fc2.rc.bodyTrialMonth": "今日から{trial}無料。{date}に初回{price}のお支払い、その後は毎月更新です。設定からいつでも解約できます。",
    "fc2.rc.bodyPaidYear": "本日{price}をお支払い、以後は毎年更新です。設定からいつでも解約できます。",
    "fc2.rc.bodyPaidMonth": "本日{price}をお支払い、以後は毎月更新です。設定からいつでも解約できます。",
    "fc2.rc.bodyRenewYear": "毎年{price}で更新されます。設定からいつでも解約できます。",
    "fc2.rc.bodyRenewMonth": "毎月{price}で更新されます。設定からいつでも解約できます。",
    "fc2.rc.bodyLife": "一度のお支払いで、ずっとあなたのもの。共同創業者 No. {n} が、アプリに出るあなたのすべてに刻まれます。",
    "fc2.rc.bodyLifePending": "一度のお支払いで、ずっとあなたのもの。共同創業者の番号が、アプリに出るあなたのすべてに刻まれます。",
    "fc2.rc.go": "書きはじめる",
    "fc2.rc.close": "閉じる",
    "fc2.cf.stamp": "アバターが切手になる",
    "fc2.cf.stampSub": "あなたの番号入りで",
    /* ── end A · ja ── */

    /* ── B avatar-swift · ja ── */
    /* ── end B · ja ── */

    /* ── C avatar-rn · ja ── */
    "fc2.av.member": "ファーストクラス",
    "fc2.av.cofounder": "共同創業者 No. {n}",
    /* ── end C · ja ── */

    /* ── D appearance · ja ── */
    "fc2.ap.system": "システム",
    "fc2.ap.light": "ライト",
    "fc2.ap.dark": "ダーク",
    "fc2.ap.systemHint": "iPhoneのライト／ダーク設定に合わせます",
    /* ── end D · ja ── */
  },
  /* ── ko · Korean ── */
  {
    /* ── A receipt-fc · ko ── */
    "fc2.rc.stFirst": "퍼스트 클래스 ✦",
    "fc2.rc.stClass": "1ST CLASS",
    "fc2.rc.stCofounder": "공동 창업자 #{n}",
    "fc2.rc.stCofounderPending": "공동 창업자",
    "fc2.rc.stFreeDays": "{n}일 무료",
    "fc2.rc.stFreeDayOne": "1일 무료",
    "fc2.rc.stFreeMonths": "{n}개월 무료",
    "fc2.rc.stFreeMonthOne": "1개월 무료",
    "fc2.rc.stYearly": "연간",
    "fc2.rc.stMonthly": "월간",
    "fc2.rc.stOneOf": "{n}명 중 하나",
    "fc2.rc.titleSub": "이제 편지가 퍼스트 클래스로 떠나요.",
    "fc2.rc.titleLife": "이제 공동 창업자예요.",
    "fc2.rc.lenDays": "{n}일",
    "fc2.rc.lenDayOne": "1일",
    "fc2.rc.lenMonths": "{n}개월",
    "fc2.rc.lenMonthOne": "1개월",
    "fc2.rc.bodyTrialYear": "오늘부터 {trial} 무료예요. {date}에 첫 결제 {price}, 이후 매년 갱신돼요. 설정에서 언제든 해지할 수 있어요.",
    "fc2.rc.bodyTrialMonth": "오늘부터 {trial} 무료예요. {date}에 첫 결제 {price}, 이후 매월 갱신돼요. 설정에서 언제든 해지할 수 있어요.",
    "fc2.rc.bodyPaidYear": "오늘 {price} 결제 완료, 이후 매년 갱신돼요. 설정에서 언제든 해지할 수 있어요.",
    "fc2.rc.bodyPaidMonth": "오늘 {price} 결제 완료, 이후 매월 갱신돼요. 설정에서 언제든 해지할 수 있어요.",
    "fc2.rc.bodyRenewYear": "매년 {price}에 갱신돼요. 설정에서 언제든 해지할 수 있어요.",
    "fc2.rc.bodyRenewMonth": "매월 {price}에 갱신돼요. 설정에서 언제든 해지할 수 있어요.",
    "fc2.rc.bodyLife": "한 번 결제로 영원히 당신 것. 공동 창업자 번호 {n}번이 앱이 보여 주는 당신의 모든 곳에 새겨져요.",
    "fc2.rc.bodyLifePending": "한 번 결제로 영원히 당신 것. 공동 창업자 번호가 앱이 보여 주는 당신의 모든 곳에 새겨져요.",
    "fc2.rc.go": "쓰기 시작",
    "fc2.rc.close": "닫기",
    "fc2.cf.stamp": "아바타가 우표가 돼요",
    "fc2.cf.stampSub": "당신의 번호가 찍혀서",
    /* ── end A · ko ── */

    /* ── B avatar-swift · ko ── */
    /* ── end B · ko ── */

    /* ── C avatar-rn · ko ── */
    "fc2.av.member": "퍼스트 클래스",
    "fc2.av.cofounder": "공동 창업자 No. {n}",
    /* ── end C · ko ── */

    /* ── D appearance · ko ── */
    "fc2.ap.system": "시스템",
    "fc2.ap.light": "라이트",
    "fc2.ap.dark": "다크",
    "fc2.ap.systemHint": "iPhone의 라이트·다크 설정을 따라가요",
    /* ── end D · ko ── */
  }
);
