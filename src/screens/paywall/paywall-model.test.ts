/* Behaviour lock for the First Class page's model (screens/paywall/
   paywall-model): the owner's honesty rules of 2026-10-19 — prices as the
   store gives them, the saving worked out from the two real prices, a trial
   only when the store has a free intro offer AND the Apple ID may take it,
   "xx LEFT" only when the seats function answered, no Lifetime at 0 seats,
   "No. 047" only with a real number, benefit rows only as given.
   Run by hand from the repo root:
     node src/screens/paywall/paywall-model.test.ts */

import { buildFares, buildPaywallView, mayTakeTrial, money, pad3, savingPct, trialFromIntro, trialLabel, type PaywallFacts, type PaywallFormat } from "./paywall-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}{${Object.entries(v).map(([a, b]) => `${a}:${b}`).join(",")}}` : k);
const fmt: PaywallFormat = { t, upper: (s) => s.toUpperCase(), speak: (s) => s };

const intro7 = { price: 0, periodUnit: "DAY", periodNumberOfUnits: 7, cycles: 1 };
const pkgs = [
  { id: "$rc_monthly", priceString: "$6.99", title: "M", period: "monthly" as const, raw: {}, productId: "m", price: 6.99, perMonthString: "$6.99", introPrice: intro7 },
  { id: "$rc_lifetime", priceString: "$129.99", title: "L", period: "lifetime" as const, raw: {}, productId: "l", price: 129.99, perMonthString: null, introPrice: null },
  { id: "$rc_annual", priceString: "$39.99", title: "A", period: "annual" as const, raw: {}, productId: "a", price: 39.99, perMonthString: "$3.33", introPrice: intro7 },
];

/* fares */
ok("savingPct from real prices", savingPct(39.99, 6.99) === 52);
ok("no saving when a price is unknown", savingPct(null, 6.99) === null && savingPct(39.99, undefined) === null);
ok("no saving when it isn't one", savingPct(100, 6.99) === null);
ok("trial: a free week is 7 days", JSON.stringify(trialFromIntro({ ...intro7, periodUnit: "WEEK", periodNumberOfUnits: 1 })) === '{"n":7,"unit":"day"}');
ok("trial: a paid intro price is no trial", trialFromIntro({ ...intro7, price: 0.99 }) === null);
ok("trial: a year is 12 months", trialFromIntro({ ...intro7, periodUnit: "YEAR", periodNumberOfUnits: 1 })?.n === 12);
ok("eligibility: eligible and unknown only", mayTakeTrial(2) && mayTakeTrial(0) && !mayTakeTrial(1) && !mayTakeTrial(3) && !mayTakeTrial(undefined));
const eligible = buildFares(pkgs, { a: 2, m: 2 });
ok("ordered annual, monthly, lifetime", eligible.fares.map((f) => f.period).join() === "annual,monthly,lifetime");
ok("the store's strings are kept", eligible.fares[0].priceString === "$39.99" && eligible.fares[2].priceString === "$129.99");
ok("saving computed", eligible.savingPct === 52);
ok("trial on annual and monthly when eligible", eligible.fares[0].trial?.n === 7 && eligible.fares[1].trial?.n === 7 && eligible.trial?.n === 7);
ok("never a trial on the seat", eligible.fares[2].trial === null);
const inelig = buildFares(pkgs, { a: 1, m: 3 });
ok("no trial when ineligible or no offer", inelig.fares.every((f) => f.trial === null) && inelig.trial === null);
ok("no trial when the check failed (no answer)", buildFares(pkgs, {}).fares.every((f) => f.trial === null));
const ph = buildFares([], {});
ok("placeholders: three, no trial, flagged", ph.placeholder && ph.fares.length === 3 && ph.fares.every((f) => f.trial === null && f.raw === null));
ok("placeholders: price parsed for the saving", ph.fares[0].price === 39.99 && ph.savingPct === 52 && ph.fares[0].perMonthString === "$3.33");
ok("money()", money("€12,99")?.amount === 12.99 && money("abc") === null);

/* the page */
const base: PaywallFacts = { fares: eligible, seatsLeft: 53, premium: false, cofounderNo: null, wren: "Wren", benefits: [{ id: "rooms", title: "fc.b1", sub: "fc.b1s" }, { id: "report", title: "fc.b3", sub: "fc.b3s" }] };
const v = buildPaywallView(base, fmt);
const [a, m, l] = v.fares;
ok("initial fare is the annual", v.initialFare === "$rc_annual");
ok("annual badge −52% (worked out)", a.badge === "m4.pw.save{n:52}");
ok("annual with trial: note, CTA, then line", a.note === "M4.PW.NOTEANNUAL{P:$3.33} · M4.TRIAL.DAYS{N:7}" && a.cta === "m4.pw.ctaTrialDays{n:7}" && a.ctaNote === "M4.PW.THENYEAR{PRICE:$39.99}");
ok("monthly with trial", m.note === "M4.PW.NOTEMONTHLY · M4.TRIAL.DAYS{N:7}" && m.ctaNote === "M4.PW.THENMONTH{PRICE:$6.99}" && m.badge === "");
ok("lifetime: founding and seats left", l.note === "M4.PW.NOTEFOUNDING{N:100} · M4.PW.NOTELEFT{LEFT:53}" && l.cta === "m4.pw.ctaCofounder{price:$129.99}");
ok("benefit rows as given, glyph by id", v.benefits.map((b) => b.glyph).join() === "rooms,report");
ok("no badge without a number", v.cofounder.badge === "" && v.cofounder.perks.length === 4);
const noTrial = buildPaywallView({ ...base, fares: inelig }, fmt);
ok("no trial: the plain subscribe line, nothing FREE", noTrial.fares[0].cta === "fc.board · $39.99 m4.pw.perYear" && noTrial.fares[0].ctaNote === "M4.PW.RENEWSYEAR" && !JSON.stringify(noTrial.fares).includes("trial"));
const noSeats = buildPaywallView({ ...base, seatsLeft: null }, fmt);
ok("seats unknown: FOUNDING 100 ONLY alone", noSeats.fares[2].note === "M4.PW.NOTEFOUNDING{N:100}");
const full = buildPaywallView({ ...base, seatsLeft: 0 }, fmt);
ok("0 seats: Lifetime not offered", full.fares.length === 2 && full.fares.every((f) => f.period !== "lifetime"));
const cf = buildPaywallView({ ...base, premium: true, cofounderNo: 47 }, fmt);
ok("cofounder: the real number, padded", cf.cofounder.badge === "m4.pw.cfBadge{n:047}" && cf.member.cofounder && cf.member.premium);
ok("member: manage", cf.member.cta === "fc.manage" && cf.strings.title === "fc.paidHead");
ok("cofounder perk: the stamp avatar, not the ring", cf.cofounder.perks[1].title === "fc2.cf.stamp" && cf.cofounder.perks[1].sub === "fc2.cf.stampSub" && !JSON.stringify(cf.cofounder).includes("pw.cf.ring"));
ok("head: replaces the title for a non-member only", buildPaywallView({ ...base, head: "Keep it" }, fmt).strings.title === "Keep it" && buildPaywallView({ ...base, head: "Keep it", premium: true }, fmt).strings.title === "fc.paidHead");
ok("pad3", pad3(7) === "007" && pad3(123) === "123");
ok("trialLabel none", trialLabel(null, t) === "");

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
