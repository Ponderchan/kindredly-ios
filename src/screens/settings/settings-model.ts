import type { SettingsGlyph } from "../../components/SettingsIcons";
import type { RestoreOutcome } from "../../lib/iap";

/* SETTINGS, AS ONE PURE VIEW (10a step 5, slice settings-profile).
   ────────────────────────────────────────────────────────────────────────
   Both renderers draw exactly this: the SwiftUI page (KSettingsView, through
   SettingsNative) and the React Native fallback (SettingsRN). The hook
   (useSettingsModel) reads the phone and the account into SettingsFacts and
   does every action; this file decides what the page says and in which
   order, so a remote flip between the two never changes a word, a row or a
   destination. It imports nothing at runtime, so its node test
   (settings-model.test.ts) runs with plain node.

   The page, top to bottom (owner decisions over H:97-103):
   - the 44pt header that scrolls away (SETTINGS, mono at 11);
   - the First Class banner, straight to the paywall (settings_banner), in
     the owner's copy for a free reader, a member and a cofounder;
   - APPEARANCE: the theme swatches, selected = the theme IN EFFECT (H:440);
     Midnight and Match system only once DARK_READY (lib/theme); then the
     Letter font tiles, names never translated, Garamond only once
     GARAMOND_READY (theme/post);
   - ACCOUNT: pen name and the courier's name (each opens the one-field
     page), age (display only, a band; the real number under 18), language
     (the endonym with its flag, never translated);
   - THE QUIET: the notifications-off notice when iOS won't let anything
     through, then exactly two switches — Notifications (hidden until read)
     and the 8 o'clock knock — then Moments you kept and Unsent letters;
   - FIRST CLASS: membership, restore (… while it runs), manage;
   - HELP, SAFETY (report / block stays reachable: Apple);
   - the two exits in red, delete with its subline;
   - the footer: the App Store's label and the build number, never the
     email (owner question 7: "1.0.5 · 1.3.0 (29)"). */

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/* ── the rows ───────────────────────────────────────────────────────────── */

export type SettingsRowKey =
  | "pen"
  | "age"
  | "language"
  | "wren"
  | "notify"
  | "knock"
  | "lore"
  | "drafts"
  | "membership"
  | "restore"
  | "manage"
  | "help"
  | "writeToUs"
  | "rate"
  | "blocked"
  | "terms"
  | "privacy"
  | "signOut"
  | "deleteAccount";

export type SettingsGroupKey = "account" | "quiet" | "firstClass" | "help" | "safety" | "exits";

/** link: opens something (a chevron unless it shows a value) · toggle: a switch · display: shows a
    value, does nothing · danger: one of the two exits, in red */
export type SettingsRowKind = "link" | "toggle" | "display" | "danger";

export type SettingsRowVM = {
  key: SettingsRowKey;
  /** the SF Symbol in the Swift row's 28pt box */
  symbol: string;
  /** the React Native fallback's glyph (components/SettingsIcons) */
  glyph: SettingsGlyph;
  label: string;
  /** the value at the end of the row (mono); "" for none */
  value: string;
  /** a line under the label; "" for none */
  sub: string;
  /** the › after the value */
  chevron: boolean;
  kind: SettingsRowKind;
  /** a switch's state (toggle rows) */
  on: boolean;
  /** working on it (restore): the value reads … and a second tap does nothing */
  busy: boolean;
};

export type SettingsNoticeVM = { text: string; action: string };

export type SettingsGroupVM = {
  key: SettingsGroupKey;
  /** set in capitals by both renderers; "" for the exits, which have none */
  header: string;
  /** THE QUIET's notifications-off notice, over its rows; null for none */
  notice: SettingsNoticeVM | null;
  rows: SettingsRowVM[];
};

export type SettingsBannerVM = {
  eyebrow: string;
  headline: string;
  sub: string;
  cta: string;
  stampLabel: string;
  /** the courier's snapshot for the stamp (lib/bird-images): curious for a free reader,
      delighted for a member, always grown */
  pose: "fcFree" | "fcMember";
};

export type SwatchVM = { key: string; label: string };
/** a Letter font tile: its key, its own name, and the specimen drawn in it */
export type FontVM = { key: string; name: string; sample: string };

export type AppearanceVM = {
  header: string;
  swatches: SwatchVM[];
  /** the theme in effect (H:440): at night with Match system on, Midnight, whatever was tapped */
  selectedTheme: string;
  /** Match system's row (only once DARK_READY) */
  showMatch: boolean;
  matchLabel: string;
  matchSub: string;
  matchOn: boolean;
  fontLabel: string;
  fontSub: string;
  fonts: FontVM[];
  selectedFont: string;
};

export type SettingsView = {
  title: string;
  backLabel: string;
  banner: SettingsBannerVM;
  appearance: AppearanceVM;
  groups: SettingsGroupVM[];
  footer: string;
};

/* ── what the page is built from ────────────────────────────────────────── */

export type ThemeFacts = {
  /** the theme in effect (useTheme().key) */
  effective: string;
  /** the reader's pick and the switch (useTheme) */
  pick: string;
  matchSystem: boolean;
  /** every theme, in themes.json's order, and which are dark */
  keys: readonly string[];
  dark: readonly string[];
  /** lib/theme DARK_READY */
  darkReady: boolean;
};

export type SettingsFacts = {
  /** the pen name; "" for none */
  handle: string;
  /** user_metadata.dob, "YYYY-MM-DD"; null for none */
  dob: string | null;
  /** now, for the age (ms) */
  now: number;
  /** the language row: the endonym and its flag, never translated */
  language: { flag: string; label: string };
  wren: string;
  theme: ThemeFacts;
  letterFont: { selected: string; choices: readonly string[] };
  /** where iOS stands on notifications; null until read (say nothing then) */
  perm: "granted" | "ask" | "settings" | null;
  /** the Notifications switch; null until read (the row is hidden) */
  notifyOn: boolean | null;
  knock: boolean;
  premium: boolean;
  cofounderNo: number | null;
  restoring: boolean;
  version: VersionFacts;
};

export type VersionFacts = {
  /** the App Store's label (STORE_VERSION) */
  store: string;
  /** the binary's own version (expo-application nativeApplicationVersion); null unknown */
  binary: string | null;
  /** its build number (nativeBuildVersion); null unknown */
  build: string | null;
};

/* ── constants ─────────────────────────────────────────────────────────── */

/** The App Store's version label for this release. The store and the binary number their
    releases apart (the store says 1.0.5 for binary 1.3.0); readers only ever see the store's,
    so the footer shows that with the build number support needs, and never the binary's own
    (owner, 2026-10-16: question 7 decided on product logic). UPDATE IT EACH RELEASE, with the
    build that ships under it. */
export const STORE_VERSION = "1.0.5";

/** The Letter font's names: proper nouns, never translated (the endonyms' rule). */
export const LETTER_FONT_NAMES: Readonly<Record<string, string>> = {
  newsreader: "Newsreader",
  newyork: "New York",
  garamond: "EB Garamond",
};

/** The specimen each Letter font tile is drawn with: a pair of letters, not a word, so it
    stays the same in every language (H:99's swatch names are what is read). */
export const LETTER_FONT_SAMPLE = "Aa";

/** Where each row goes. The pages under Settings live in the Me tab's own stack (so the
    floating bar stays); Moments you kept and Unsent letters are root routes other screens open
    too, and the paywall is a root modal. */
export const SETTINGS_ROUTES = {
  pen: "/me/edit-field?f=pen",
  wren: "/me/edit-field?f=courier",
  lore: "/lore",
  drafts: "/drafts",
  help: "/me/help",
  writeToUs: "/me/write-to-us",
  blocked: "/me/blocked",
  membership: "/paywall?src=settings_row",
  /** the banner goes straight to the paywall (owner), not to Me's First Class card */
  banner: "/paywall?src=settings_banner",
  /** where back goes when Settings was opened with nothing under it */
  me: "/(tabs)/me",
} as const;

export const SETTINGS_LINKS = {
  manage: "https://apps.apple.com/account/subscriptions",
  /* the store's own review page, the box already up (the in-app prompt is rationed by iOS and
     never shows in TestFlight, so the row read as broken) */
  rate: "https://apps.apple.com/app/id6805318131?action=write-review",
} as const;

/** The rows that push a route, and where (the rest act in place). */
export const ROW_ROUTES: Partial<Record<SettingsRowKey, string>> = {
  pen: SETTINGS_ROUTES.pen,
  wren: SETTINGS_ROUTES.wren,
  lore: SETTINGS_ROUTES.lore,
  drafts: SETTINGS_ROUTES.drafts,
  help: SETTINGS_ROUTES.help,
  writeToUs: SETTINGS_ROUTES.writeToUs,
  blocked: SETTINGS_ROUTES.blocked,
  membership: SETTINGS_ROUTES.membership,
};

/* ── the pieces ────────────────────────────────────────────────────────── */

/** "YYYY-MM-DD" → its parts, or null when it isn't a real date. */
export function parseDob(dob: string | null | undefined): { y: number; m: number; d: number } | null {
  const hit = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob ?? "");
  if (!hit) return null;
  const y = Number(hit[1]);
  const m = Number(hit[2]);
  const d = Number(hit[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return null;
  // a 31st of a 30-day month (or February's 30th) rolls over: not a date
  const probe = new Date(y, m - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) return null;
  return { y, m, d };
}

/** Whole years from a birthday to `now`, counting the birthday itself (the old code used the
    year alone, so everyone was a year older from January 1st). null for no date or one in the
    future. */
export function ageOf(dob: string | null | undefined, now: number): number | null {
  const p = parseDob(dob);
  if (!p) return null;
  const today = new Date(now);
  let age = today.getFullYear() - p.y;
  const beforeBirthday = today.getMonth() + 1 < p.m || (today.getMonth() + 1 === p.m && today.getDate() < p.d);
  if (beforeBirthday) age -= 1;
  return age < 0 ? null : age;
}

/** The age row's value: a band, never the number, from 18 (18–24, 25–34, 35–44, 45+). Under 18
    shows the real number instead of being laundered into the lowest band (the lowest band used
    to be the fallback, so a bad date read as a checked "18–24"). null hides the row. */
export function ageBand(dob: string | null | undefined, now: number): string | null {
  const a = ageOf(dob, now);
  if (a == null) return null;
  if (a < 18) return `${a}`;
  return a >= 45 ? "45+" : a >= 35 ? "35–44" : a >= 25 ? "25–34" : "18–24";
}

/** The footer's version: the App Store's label with the build number ("1.0.5 (29)"). The
    binary's own version (1.3.0) means nothing to a reader and the build already names the
    binary for support, so it isn't shown; a build that isn't known is left out, never guessed. */
export function footerVersion(v: VersionFacts): string {
  return v.build ? `${v.store} (${v.build})` : v.store;
}

/** The theme a pick stands for by day: Midnight has no day of its own, so Classic (H:429). */
export function dayOf(pick: string, theme: Pick<ThemeFacts, "dark">): string {
  return theme.dark.includes(pick) ? "classic" : pick;
}

/** The theme a pick stands for after dark: the dark theme (themes.json's first, Midnight). */
export function nightOf(theme: Pick<ThemeFacts, "dark">): string {
  return theme.dark[0] ?? "midnight";
}

/** Match system's subline (H:99): "Midnight after dark · Lavender by day" while on, "Always
    Paper" while off. Both themes come in by their swatch names (theme.*), never written into
    the sentence, so a translation names them as their swatches do. */
export function matchSub(theme: ThemeFacts, t: TFn): string {
  return theme.matchSystem
    ? t("set.matchSystem.on", { night: t(`theme.${nightOf(theme)}`), day: t(`theme.${dayOf(theme.pick, theme)}`) })
    : t("set.matchSystem.off", { theme: t(`theme.${theme.pick}`) });
}

/** The swatches offered: every light theme, and Midnight only once DARK_READY (lib/theme: don't
    offer it while it is off) — or while it is already in effect, which only the dev theme
    switch can do then, so its screenshots show the swatch it forced. */
export function swatches(theme: ThemeFacts, t: TFn): SwatchVM[] {
  return theme.keys
    .filter((k) => theme.darkReady || !theme.dark.includes(k) || k === theme.effective)
    .map((k) => ({ key: k, label: t(`theme.${k}`) }));
}

/** The Letter font tiles: the choices this build can draw, by their own names. */
export function fontTiles(choices: readonly string[]): FontVM[] {
  return choices.map((k) => ({ key: k, name: LETTER_FONT_NAMES[k] ?? k, sample: LETTER_FONT_SAMPLE }));
}

/** The First Class banner in the owner's copy (never "More Kindreds" or "a monthly reading":
    Apple 2.3.2): a free reader is offered it, a member is told they travel First Class, a
    cofounder sees their number. */
export function buildBanner(f: { premium: boolean; cofounderNo: number | null; wren: string }, t: TFn): SettingsBannerVM {
  if (f.premium || f.cofounderNo != null) {
    return {
      eyebrow: t("me.firstClass"),
      headline: f.cofounderNo != null ? t("me.fc.founding", { n: String(f.cofounderNo) }) : t("fc.paidHead"),
      sub: t("fc.paidSub"),
      cta: `${t("fc.paidCta")} →`,
      stampLabel: t("fc.member"),
      pose: "fcMember",
    };
  }
  return {
    eyebrow: t("me.firstClass"),
    headline: t("fc.stubHead"),
    sub: `${t("fc.stubSub1")}\n${t("fc.stubSub2", { wren: f.wren })}`,
    cta: `${t("fc.tryCta")} →`,
    stampLabel: t("fc.firstMark"),
    pose: "fcFree",
  };
}

/** The membership row's value: Cofounder No. 007, First Class, or Not yet. */
export function membershipValue(f: { premium: boolean; cofounderNo: number | null }, t: TFn): string {
  if (f.cofounderNo != null) return t("set.member.cofounder", { n: String(f.cofounderNo).padStart(3, "0") });
  return f.premium ? t("set.member.first") : t("set.member.not");
}

const row = (r: Partial<SettingsRowVM> & Pick<SettingsRowVM, "key" | "symbol" | "glyph" | "label">): SettingsRowVM => ({
  value: "",
  sub: "",
  chevron: true,
  kind: "link",
  on: false,
  busy: false,
  ...r,
});

/** The notifications-off notice: shown whenever iOS won't let anything through (guests too,
    whatever the Kindreds bar's × said), with the way to change it. */
export function quietNotice(perm: SettingsFacts["perm"], t: TFn): SettingsNoticeVM | null {
  if (perm == null || perm === "granted") return null;
  return { text: t("set.push.off"), action: perm === "ask" ? t("set.push.offAsk") : t("set.push.offOpen") };
}

/* ── the page ──────────────────────────────────────────────────────────── */

export function buildSettingsView(f: SettingsFacts, t: TFn): SettingsView {
  const age = ageBand(f.dob, f.now);
  const account: SettingsRowVM[] = [
    row({ key: "pen", symbol: "pencil", glyph: "pen", label: t("set.penName"), value: f.handle || t("set.you") }),
    ...(age ? [row({ key: "age", symbol: "birthday.cake", glyph: "cake", label: t("set.age"), value: age, chevron: false, kind: "display" as const })] : []),
    row({ key: "language", symbol: "globe", glyph: "globe", label: t("settings.language"), value: `${f.language.flag} ${f.language.label}`.trim() }),
    row({ key: "wren", symbol: "bird", glyph: "bird", label: t("set.wrenName", { wren: f.wren }), value: f.wren }),
  ];

  const quiet: SettingsRowVM[] = [
    // hidden until the phone says where it stands (it would flash the wrong way)
    ...(f.notifyOn != null
      ? [row({ key: "notify", symbol: "envelope", glyph: "mail", label: t("set.notify.title"), sub: t("set.notify.sub", { wren: f.wren }), chevron: false, kind: "toggle" as const, on: f.notifyOn })]
      : []),
    row({ key: "knock", symbol: "bell", glyph: "bell", label: t("set.knock.title"), sub: t("set.knock.sub"), chevron: false, kind: "toggle", on: f.knock }),
    row({ key: "lore", symbol: "heart", glyph: "heart", label: t("lore.head") }),
    row({ key: "drafts", symbol: "doc.text", glyph: "draft", label: t("set.drafts") }),
  ];

  const firstClass: SettingsRowVM[] = [
    row({ key: "membership", symbol: "ticket", glyph: "ticket", label: t("set.membership"), value: membershipValue(f, t) }),
    row({ key: "restore", symbol: "arrow.clockwise", glyph: "restore", label: t("set.restore"), value: f.restoring ? "…" : "", chevron: !f.restoring, busy: f.restoring }),
    row({ key: "manage", symbol: "creditcard", glyph: "card", label: t("set.manage") }),
  ];

  const help: SettingsRowVM[] = [
    row({ key: "help", symbol: "questionmark.circle", glyph: "help", label: t("settings.howItWorks") }),
    row({ key: "writeToUs", symbol: "envelope.open", glyph: "mail", label: t("settings.writeToUs") }),
    row({ key: "rate", symbol: "star", glyph: "star", label: t("settings.rate") }),
  ];

  const safety: SettingsRowVM[] = [
    row({ key: "blocked", symbol: "hand.raised", glyph: "shield", label: t("set.blocked") }),
    row({ key: "terms", symbol: "doc.plaintext", glyph: "doc", label: t("set.terms") }),
    row({ key: "privacy", symbol: "lock", glyph: "lock", label: t("set.privacy") }),
  ];

  const exits: SettingsRowVM[] = [
    row({ key: "signOut", symbol: "rectangle.portrait.and.arrow.right", glyph: "door", label: t("set.signOut"), chevron: false, kind: "danger" }),
    row({ key: "deleteAccount", symbol: "trash", glyph: "trash", label: t("set.deleteAcct"), sub: t("set.deleteSub"), chevron: false, kind: "danger" }),
  ];

  return {
    title: t("settings.title"),
    backLabel: t("a11y.back"),
    banner: buildBanner({ premium: f.premium, cofounderNo: f.cofounderNo, wren: f.wren }, t),
    appearance: {
      header: t("set.sec.appearance"),
      swatches: swatches(f.theme, t),
      selectedTheme: f.theme.effective,
      showMatch: f.theme.darkReady,
      matchLabel: t("set.matchSystem"),
      matchSub: matchSub(f.theme, t),
      matchOn: f.theme.matchSystem,
      fontLabel: t("set.letterFont"),
      fontSub: t("set.letterFont.sub"),
      fonts: fontTiles(f.letterFont.choices),
      selectedFont: f.letterFont.selected,
    },
    groups: [
      { key: "account", header: t("settings.account"), notice: null, rows: account },
      { key: "quiet", header: t("set.sec.quiet"), notice: quietNotice(f.perm, t), rows: quiet },
      { key: "firstClass", header: t("set.sec.firstClass"), notice: null, rows: firstClass },
      { key: "help", header: t("settings.help"), notice: null, rows: help },
      { key: "safety", header: t("set.sec.safety"), notice: null, rows: safety },
      { key: "exits", header: "", notice: null, rows: exits },
    ],
    footer: t("set.version", { v: footerVersion(f.version) }),
  };
}

/* ── restore ───────────────────────────────────────────────────────────── */

/** What a restore came back with (lib/iap iapRestoreOutcome): First Class found on this Apple
    ID, nothing found, or no answer at all (offline, the App Store unreachable, or a build that
    can't reach purchases). */
export type { RestoreOutcome };

/** The alert after a restore. A failure is its own message, never "Nothing to restore": that
    sentence tells someone who paid that they didn't. */
export function restoreAlert(o: RestoreOutcome, t: TFn): { title: string; body: string } {
  switch (o) {
    case "restored":
      return { title: t("set.restored"), body: t("set.restoredBody") };
    case "nothing":
      return { title: t("set.nothingRestore"), body: t("set.nothingRestoreBody") };
    default:
      return { title: t("set.restoreFail"), body: t("set.push.saveFail") };
  }
}

/* ── the exits' red ────────────────────────────────────────────────────── */

const hexRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

/** The postmark red (P.post / KBrand.postRed), walked a quarter of the way toward the theme's
    ink: #B03D3A on the light themes, #E26F6A on Midnight, both past 4.5:1 on every ground a row
    sits on (the postmark red itself is 3.8:1 on the light groups, and the old fixed #B23838 is
    2.9:1 on Midnight's). SwiftUI mixes the same two tokens the same way (SoftGroup.swift
    KTheme.danger), so the two renderers agree. */
export function dangerInk(ink: string, post = "#E0483C", toward = 0.25): string {
  const a = hexRgb(post);
  const b = hexRgb(ink);
  const mix = a.map((c, i) => Math.round(c * (1 - toward) + b[i] * toward));
  return "#" + mix.map((c) => c.toString(16).padStart(2, "0").toUpperCase()).join("");
}
