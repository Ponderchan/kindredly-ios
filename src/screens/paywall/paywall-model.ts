/* THE FIRST CLASS PAGE'S MODEL (Me 4a, Prompt 7; .claude/me4a/ME4A.md §1.6, §2.3, §4.2).
   ────────────────────────────────────────────────────────────────────────
   Pure: everything the Swift paywall (KPaywallScreen) shows, worked out
   from facts the hook gathers (usePaywall: RevenueCat's fares, the seats
   function, the entitlement, the courier's name, the benefit flags). It
   imports nothing at runtime, so its node test needs no stubs:
     node src/screens/paywall/paywall-model.test.ts

   THE RULES THAT MAKE IT HONEST (owner, 2026-10-19):
   - Prices are the store's strings, never re-priced. The "−52%" is worked
     out from the two real prices and shown only when both are numbers and
     the saving is above 0.
   - "7 DAYS FREE" and the trial button exist only when RevenueCat reports a
     free intro offer on that product AND says this Apple ID may take it
     (eligible or unknown). Otherwise the button is the plain subscribe line
     and nothing on the page says FREE.
   - "xx LEFT" only when the seats function answered; "No. 047" only with
     the reader's own cofounder number, after purchase.
   - A benefit row only for a thing the build can reach (data/fc-benefits).
   - Lifetime is not offered once the seats function says none are left. */

import type { IapPackage } from "../../lib/iap";

/* ── fares ─────────────────────────────────────────────────────────────── */

/** A free trial, as the store states it: WEEK becomes days × 7, YEAR months × 12. */
export type Trial = { n: number; unit: "day" | "month" };

export type FarePeriod = "annual" | "monthly" | "lifetime";

/** One fare as the page prices it. */
export type Fare = {
  /** the RevenueCat package identifier (or the placeholder's) */
  id: string;
  period: FarePeriod;
  /** the store's own string ("$39.99"), never re-priced */
  priceString: string;
  /** the store's number, for the saving; null when unknown */
  price: number | null;
  /** an annual's monthly figure in the store's format; null when unknown */
  perMonthString: string | null;
  /** set only for a free intro offer this Apple ID may take */
  trial: Trial | null;
  /** RevenueCat's package (what a purchase takes); null on a placeholder */
  raw: unknown | null;
};

export type Fares = {
  /** the first answer is in (offerings or the placeholders) */
  ready: boolean;
  /** showing the placeholders: RevenueCat or the products aren't there */
  placeholder: boolean;
  /** annual, monthly, lifetime, in that order; whatever the offering has */
  fares: Fare[];
  /** the annual's saving against twelve months, in whole percent; null when it can't be said */
  savingPct: number | null;
  /** the annual's trial (Me's First Class card says it) */
  trial: Trial | null;
};

/* the fare ladder is a design decision, not a dashboard setting: annual is
   the anchor the others are read against, then monthly, then the seat */
const ORDER: FarePeriod[] = ["annual", "monthly", "lifetime"];

/** Shown until RevenueCat and the App Store products exist, so the page is reviewable before the
    fares can be bought. The same three as paywall.tsx's PLACEHOLDERS (the React Native page's). */
export const PLACEHOLDER_PACKAGES: IapPackage[] = [
  { id: "annual", priceString: "$39.99 / year", title: "Annual", period: "annual", raw: null },
  { id: "monthly", priceString: "$6.99 / month", title: "Monthly", period: "monthly", raw: null },
  { id: "lifetime", priceString: "$129", title: "Lifetime", period: "lifetime", raw: null },
];

/** The store's string taken apart only far enough to read a number from it (the placeholders',
    and the per-month figure when the store gives none). Never used to re-price a real fare. */
export function money(priceString: string): { amount: number; symbol: string; short: string } | null {
  const m = priceString.match(/^\s*([^\d\s]*)\s*([\d.,]+)/);
  if (!m) return null;
  const amount = parseFloat(m[2].replace(",", "."));
  if (!Number.isFinite(amount)) return null;
  return { amount, symbol: m[1] || "", short: `${m[1] || ""}${m[2]}` };
}

/** A free trial from the store's intro offer, or null: only a price of 0 is a trial (a paid intro
    price is not "free"), and only a positive length. */
export function trialFromIntro(intro: IapPackage["introPrice"]): Trial | null {
  if (!intro || intro.price !== 0) return null;
  const n = Math.round(intro.periodNumberOfUnits);
  if (!(n > 0)) return null;
  switch (intro.periodUnit) {
    case "DAY":
      return { n, unit: "day" };
    case "WEEK":
      return { n: n * 7, unit: "day" };
    case "MONTH":
      return { n, unit: "month" };
    case "YEAR":
      return { n: n * 12, unit: "month" };
    default:
      return null;
  }
}

/** RevenueCat's eligibility answer: 0 unknown, 1 ineligible, 2 eligible, 3 no intro offer. Only
    eligible and unknown may show a trial (ME4A D12). A missing answer (the check failed) shows none. */
export const mayTakeTrial = (status: number | undefined): boolean => status === 2 || status === 0;

/** Whole percent saved by a year against twelve months; null unless both prices are numbers and
    the saving is above 0. */
export function savingPct(annual: number | null | undefined, monthly: number | null | undefined): number | null {
  if (annual == null || monthly == null || !(monthly > 0) || !(annual > 0)) return null;
  const pct = Math.round((1 - annual / (monthly * 12)) * 100);
  return pct > 0 ? pct : null;
}

/** The fares from RevenueCat's packages (or the placeholders when it has none), with the trials it
    vouches for. `eligibility` is iapTrialEligibility's answer by product id. */
export function buildFares(packages: IapPackage[], eligibility: Record<string, number>, ready = true): Fares {
  const placeholder = packages.length === 0;
  const source = placeholder ? PLACEHOLDER_PACKAGES : packages;
  const fares: Fare[] = [];
  for (const period of ORDER) {
    const p = source.find((x) => x.period === period);
    if (!p) continue;
    if (placeholder) {
      const m = money(p.priceString);
      fares.push({
        id: p.id,
        period,
        // the placeholder's "$39.99 / year" carries its unit; the page sets the unit itself
        priceString: m?.short ?? p.priceString,
        price: m?.amount ?? null,
        perMonthString: period === "annual" && m ? `${m.symbol}${(m.amount / 12).toFixed(2)}` : null,
        // a placeholder can't be bought, so it never promises a trial
        trial: null,
        raw: null,
      });
    } else {
      const status = p.productId ? eligibility[p.productId] : undefined;
      fares.push({
        id: p.id,
        period,
        priceString: p.priceString,
        price: typeof p.price === "number" ? p.price : null,
        perMonthString: period === "annual" ? (p.perMonthString ?? null) : null,
        trial: period !== "lifetime" && mayTakeTrial(status) ? trialFromIntro(p.introPrice ?? null) : null,
        raw: p.raw ?? null,
      });
    }
  }
  const annual = fares.find((f) => f.period === "annual");
  const monthly = fares.find((f) => f.period === "monthly");
  return { ready, placeholder, fares, savingPct: savingPct(annual?.price, monthly?.price), trial: annual?.trial ?? null };
}

/* ── the page ──────────────────────────────────────────────────────────── */

export type PaywallFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** upper-case in the reader's locale (mono labels; ja and ko have no capitals and stay as written) */
  upper: (s: string) => string;
  /** speakAs: the courier's pronouns in a line that names her */
  speak: (s: string) => string;
};

export type PaywallBenefit = { id: string; title: string; sub: string };

export type PaywallFacts = {
  fares: Fares;
  /** 100 − active lifetime seats, or null when the seats function didn't answer */
  seatsLeft: number | null;
  premium: boolean;
  /** the reader's own cofounder number (after purchase); null otherwise */
  cofounderNo: number | null;
  /** the courier's name */
  wren: string;
  /** the rows the build can reach (data/fc-benefits visibleBenefits), as keys */
  benefits: readonly { id: string; title: string; sub: string }[];
  /** onboarding or a lock may bring its own headline; the route passes the rekindle line */
  lead?: string;
  /** a title of its own for a non-member (the wardrobe slip's "Keep this look"); replaces m4.pw.title */
  head?: string;
};

/** What the purchase receipt (components/FirstClassWelcome FirstClassReceipt) is told after a buy
    (FC2 §4.2): the fare's period and store price, the bought product id (for its intro offer), and
    whether that fare showed a free trial when it was bought. */
export type ReceiptFacts = {
  plan: FarePeriod;
  price: string;
  productId: string | null;
  offeredTrial: boolean;
};

/** The glyph a benefit row draws (Swift KPaywallGlyph): the six 4a drawings. */
export type PaywallGlyph = "rooms" | "voice" | "wardrobe" | "report" | "stamps" | "paper";

export type PaywallFareView = {
  id: string;
  period: FarePeriod;
  /** Yearly, Monthly, Lifetime */
  label: string;
  /** "−52%" on the annual, or "" */
  badge: string;
  /** the store's string */
  price: string;
  /** "/ year", "/ month", "once" */
  per: string;
  /** the mono line under the price, upper-cased */
  note: string;
  cta: string;
  /** the mono line under the button, upper-cased */
  ctaNote: string;
  /** the auto-renew or one-payment line under Restore (App Store 3.1.2) */
  legal: string;
  /** VoiceOver: "Yearly, $39.99 / year, save 52%, 7 days free" */
  a11y: string;
};

export type PaywallView = {
  strings: {
    eyebrow: string;
    title: string;
    sub: string;
    close: string;
    restore: string;
    terms: string;
    privacy: string;
    /** the member's line under Restore */
    legal: string;
    active: string;
    activeSub: string;
    cfTitle: string;
    cfTagline: string;
    cfFoot: string;
    sealLabel: string;
    included: string;
  };
  fares: PaywallFareView[];
  /** the annual's id, else the first fare's; "" when there are none */
  initialFare: string;
  benefits: { id: string; glyph: PaywallGlyph; title: string; sub: string }[];
  cofounder: { badge: string; perks: { title: string; sub: string }[] };
  member: { premium: boolean; cofounder: boolean; cta: string; note: string };
};

/** The number of founding seats (the App Store product and the web say the same). */
export const COFOUNDERS_TOTAL = 100;

export const pad3 = (n: number): string => String(Math.max(0, Math.floor(n))).padStart(3, "0");

const GLYPHS: readonly string[] = ["rooms", "voice", "wardrobe", "report", "stamps", "paper"];

/** "7 DAYS FREE", or "" without a trial (not upper-cased: the caller does). */
export function trialLabel(trial: Trial | null, t: PaywallFormat["t"]): string {
  if (!trial) return "";
  if (trial.unit === "day") return trial.n === 1 ? t("m4.trial.dayOne") : t("m4.trial.days", { n: trial.n });
  return trial.n === 1 ? t("m4.trial.monthOne") : t("m4.trial.months", { n: trial.n });
}

function trialCta(trial: Trial, t: PaywallFormat["t"]): string {
  if (trial.unit === "day") return trial.n === 1 ? t("m4.pw.ctaTrialDayOne") : t("m4.pw.ctaTrialDays", { n: trial.n });
  return trial.n === 1 ? t("m4.pw.ctaTrialMonthOne") : t("m4.pw.ctaTrialMonths", { n: trial.n });
}

const join = (...parts: string[]) => parts.filter((p) => p.length > 0).join(" · ");

/** One fare as the page shows it. */
export function fareView(f: Fare, facts: Pick<PaywallFacts, "seatsLeft">, saving: number | null, fmt: PaywallFormat): PaywallFareView {
  const { t, upper } = fmt;
  const price = f.priceString;
  const trial = f.period === "lifetime" ? null : f.trial;
  const tl = trialLabel(trial, t);
  if (f.period === "lifetime") {
    const left = facts.seatsLeft != null ? t("m4.pw.noteLeft", { left: facts.seatsLeft }) : "";
    const label = t("m4.pw.lifetime");
    const per = t("m4.pw.once");
    return {
      id: f.id,
      period: f.period,
      label,
      badge: "",
      price,
      per,
      note: upper(join(t("m4.pw.noteFounding", { n: COFOUNDERS_TOTAL }), left)),
      cta: t("m4.pw.ctaCofounder", { price }),
      ctaNote: upper(t("m4.pw.ctaOnce")),
      legal: t("pw.foot"),
      a11y: [`${label}, ${price} ${per}`, t("m4.pw.noteFounding", { n: COFOUNDERS_TOTAL }), left].filter(Boolean).join(", "),
    };
  }
  const annual = f.period === "annual";
  const label = annual ? t("m4.pw.yearly") : t("m4.pw.monthly");
  const per = annual ? t("m4.pw.perYear") : t("m4.pw.perMonth");
  const badge = annual && saving != null ? t("m4.pw.save", { n: saving }) : "";
  const base = annual ? (f.perMonthString ? t("m4.pw.noteAnnual", { p: f.perMonthString }) : "") : t("m4.pw.noteMonthly");
  return {
    id: f.id,
    period: f.period,
    label,
    badge,
    price,
    per,
    note: upper(join(base, tl)),
    cta: trial ? trialCta(trial, t) : `${t("fc.board")} · ${price} ${per}`,
    ctaNote: upper(trial ? t(annual ? "m4.pw.thenYear" : "m4.pw.thenMonth", { price }) : t(annual ? "m4.pw.renewsYear" : "m4.pw.renewsMonth")),
    legal: t("fc.managedByApple"),
    a11y: [`${label}, ${price} ${per}`, annual && saving != null ? t("m4.pw.a11y.save", { n: saving }) : "", tl].filter(Boolean).join(", "),
  };
}

/** Everything the page shows. */
export function buildPaywallView(facts: PaywallFacts, fmt: PaywallFormat): PaywallView {
  const { t, speak } = fmt;
  const { wren, premium } = facts;
  const cofounder = facts.cofounderNo != null;
  // no seats left: the seat isn't offered (ME4A D6)
  const offered = facts.fares.fares.filter((f) => !(f.period === "lifetime" && facts.seatsLeft === 0));
  const fares = offered.map((f) => fareView(f, facts, facts.fares.savingPct, fmt));
  const initial = offered.find((f) => f.period === "annual") ?? offered[0];
  return {
    strings: {
      eyebrow: t("me.firstClass"),
      title: premium ? t("fc.paidHead") : facts.head || t("m4.pw.title"),
      sub: premium ? speak(t("fc.paidIntroSub", { wren })) : facts.lead || speak(t("m4.pw.sub", { wren })),
      close: t("m4.pw.close"),
      restore: t("pw.restore"),
      terms: t("pw.terms"),
      privacy: t("pw.privacy"),
      legal: t("fc.manageNote"),
      active: t("fc.active"),
      activeSub: t("fc.paidSub"),
      cfTitle: t("pw.cf.title"),
      cfTagline: t("pw.nameEverywhere"),
      cfFoot: t("pw.cf.foot"),
      sealLabel: t("fc.firstMark"),
      included: t("m4.pw.a11y.included"),
    },
    fares,
    initialFare: initial?.id ?? "",
    benefits: facts.benefits.map((b) => ({
      id: b.id,
      glyph: (GLYPHS.includes(b.id) ? b.id : "rooms") as PaywallGlyph,
      title: speak(t(b.title, { wren })),
      sub: speak(t(b.sub, { wren })),
    })),
    cofounder: {
      badge: cofounder ? t("m4.pw.cfBadge", { n: pad3(facts.cofounderNo as number) }) : "",
      perks: [
        { title: t("pw.cf.number"), sub: t("pw.cf.numberSub", { n: COFOUNDERS_TOTAL }) },
        // FC2 (owner decision 2): the stamp avatar replaces "a gold ring on Wren"
        { title: t("fc2.cf.stamp"), sub: t("fc2.cf.stampSub") },
        // Stamp Press (owner, 2026-10-19): every stamp a cofounder makes has the gold gear edge
        { title: t("cs2.pw.cfGold"), sub: t("cs2.pw.cfGoldSub") },
        { title: t("pw.cf.first"), sub: t("pw.cf.firstSub") },
        { title: t("pw.cf.letter"), sub: speak(t("pw.cf.letterSub")) },
      ],
    },
    member: { premium, cofounder, cta: t("fc.manage"), note: t("fc.manageNote") },
  };
}
