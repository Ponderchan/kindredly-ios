import { strings } from "../lib/i18n";

/* THE A11Y PASS, BATCH 1 (Today, the reply bars, the fare and its welcome) — NEW WORDS.
   ────────────────────────────────────────────────────────────────────────
   Nine languages, each written as the language (the same voice as the welcome card beside it:
   tu / du / tú, not vous / Sie / usted). Imported for its side effect by app/paywall.tsx and
   components/FirstClassWelcome.tsx.

   Everything else this batch says reuses keys already in nine languages: nb.close (the fare's ×),
   cf.no (the cofounder's number on the welcome), fc.yearly / fc.monthly / fc.lifetimeLabel /
   fc.save (the fares' spoken names). */

strings(
  /* ── en ── */
  {
    // the boarding pass's passenger, before the reader has a pen name (it was "you" in every language)
    "a11yt.fc.you": "you",
    // the welcome after a subscription that began with a free trial: its length, and the day the
    // first charge happens (the trial's end, from the App Store's own receipt). {date} is "May 3"
    "a11yt.fcw.trialDays": "{n} days free. Your first charge is on {date}.",
    "a11yt.fcw.trialDayOne": "1 day free. Your first charge is on {date}.",
    "a11yt.fcw.trialMonths": "{n} months free. Your first charge is on {date}.",
    "a11yt.fcw.trialMonthOne": "1 month free. Your first charge is on {date}.",
  },
  /* ── es ── */
  {
    "a11yt.fc.you": "tú",
    "a11yt.fcw.trialDays": "{n} días gratis. Tu primer cobro será el {date}.",
    "a11yt.fcw.trialDayOne": "1 día gratis. Tu primer cobro será el {date}.",
    "a11yt.fcw.trialMonths": "{n} meses gratis. Tu primer cobro será el {date}.",
    "a11yt.fcw.trialMonthOne": "1 mes gratis. Tu primer cobro será el {date}.",
  },
  /* ── pt (Brazil) ── */
  {
    "a11yt.fc.you": "você",
    "a11yt.fcw.trialDays": "{n} dias grátis. Sua primeira cobrança será em {date}.",
    "a11yt.fcw.trialDayOne": "1 dia grátis. Sua primeira cobrança será em {date}.",
    "a11yt.fcw.trialMonths": "{n} meses grátis. Sua primeira cobrança será em {date}.",
    "a11yt.fcw.trialMonthOne": "1 mês grátis. Sua primeira cobrança será em {date}.",
  },
  /* ── id ── */
  {
    "a11yt.fc.you": "kamu",
    "a11yt.fcw.trialDays": "Gratis {n} hari. Tagihan pertamamu jatuh pada {date}.",
    "a11yt.fcw.trialDayOne": "Gratis 1 hari. Tagihan pertamamu jatuh pada {date}.",
    "a11yt.fcw.trialMonths": "Gratis {n} bulan. Tagihan pertamamu jatuh pada {date}.",
    "a11yt.fcw.trialMonthOne": "Gratis 1 bulan. Tagihan pertamamu jatuh pada {date}.",
  },
  /* ── fr ── */
  {
    "a11yt.fc.you": "toi",
    "a11yt.fcw.trialDays": "{n} jours offerts. Ton premier prélèvement aura lieu le {date}.",
    "a11yt.fcw.trialDayOne": "1 jour offert. Ton premier prélèvement aura lieu le {date}.",
    "a11yt.fcw.trialMonths": "{n} mois offerts. Ton premier prélèvement aura lieu le {date}.",
    "a11yt.fcw.trialMonthOne": "1 mois offert. Ton premier prélèvement aura lieu le {date}.",
  },
  /* ── de ── */
  {
    "a11yt.fc.you": "du",
    "a11yt.fcw.trialDays": "{n} Tage gratis. Die erste Abbuchung ist am {date}.",
    "a11yt.fcw.trialDayOne": "1 Tag gratis. Die erste Abbuchung ist am {date}.",
    "a11yt.fcw.trialMonths": "{n} Monate gratis. Die erste Abbuchung ist am {date}.",
    "a11yt.fcw.trialMonthOne": "1 Monat gratis. Die erste Abbuchung ist am {date}.",
  },
  /* ── it ── */
  {
    "a11yt.fc.you": "tu",
    "a11yt.fcw.trialDays": "{n} giorni gratis. Il primo addebito sarà il {date}.",
    "a11yt.fcw.trialDayOne": "1 giorno gratis. Il primo addebito sarà il {date}.",
    "a11yt.fcw.trialMonths": "{n} mesi gratis. Il primo addebito sarà il {date}.",
    "a11yt.fcw.trialMonthOne": "1 mese gratis. Il primo addebito sarà il {date}.",
  },
  /* ── ja ── */
  {
    "a11yt.fc.you": "あなた",
    "a11yt.fcw.trialDays": "{n}日間無料。最初のお支払いは{date}です。",
    "a11yt.fcw.trialDayOne": "1日間無料。最初のお支払いは{date}です。",
    "a11yt.fcw.trialMonths": "{n}か月無料。最初のお支払いは{date}です。",
    "a11yt.fcw.trialMonthOne": "1か月無料。最初のお支払いは{date}です。",
  },
  /* ── ko ── */
  {
    "a11yt.fc.you": "나",
    "a11yt.fcw.trialDays": "{n}일 무료. 첫 결제일은 {date}이에요.",
    "a11yt.fcw.trialDayOne": "1일 무료. 첫 결제일은 {date}이에요.",
    "a11yt.fcw.trialMonths": "{n}개월 무료. 첫 결제일은 {date}이에요.",
    "a11yt.fcw.trialMonthOne": "1개월 무료. 첫 결제일은 {date}이에요.",
  },
);
