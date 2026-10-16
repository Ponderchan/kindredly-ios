/* Behaviour lock for Settings' model (screens/settings/settings-model): the
   sections and their order, exactly two switches in THE QUIET and the
   notice, the swatches (the theme in effect selected; Midnight and Match
   system only once DARK_READY), the Letter font tiles (their own names,
   Garamond only once it is in the app), the age band from the birthday, the
   owner's First Class copy, the footer (both versions, never the email),
   restore's three answers, where each row goes, and the exits' red in all
   four themes (read from theme/themes.json) — the rules both renderers
   draw, so a remote flip between SwiftUI and React Native never changes
   what the reader sees.
   Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/settings/settings-model.test.ts
   The model imports nothing at runtime. Every line prints ok/FAIL and the
   process exits non-zero if any fail. */

import { readFileSync } from "node:fs";
import {
  LETTER_FONT_NAMES,
  ROW_ROUTES,
  SETTINGS_LINKS,
  SETTINGS_ROUTES,
  STORE_VERSION,
  ageBand,
  ageOf,
  buildBanner,
  buildSettingsView,
  dangerInk,
  footerVersion,
  matchSub,
  membershipValue,
  parseDob,
  quietNotice,
  restoreAlert,
  swatches,
  type SettingsFacts,
  type ThemeFacts,
} from "./settings-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

/* a t() that shows which key and which values it was asked for */
const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}{${Object.entries(v).map(([a, b]) => `${a}:${b}`).join(",")}}` : k);

const themesJson = JSON.parse(readFileSync(new URL("../../theme/themes.json", import.meta.url), "utf8")) as {
  themes: Record<string, { name: string; dark: boolean; ink: string; sf: string; soft: string; bg: string }>;
  brand: Record<string, string>;
};
const KEYS = Object.keys(themesJson.themes);
const DARK = KEYS.filter((k) => themesJson.themes[k].dark);

const theme = (over: Partial<ThemeFacts> = {}): ThemeFacts => ({ effective: "classic", pick: "classic", matchSystem: true, keys: KEYS, dark: DARK, darkReady: false, ...over });

const NOW = new Date(2026, 9, 16, 12).getTime(); // 16 Oct 2026, local

const facts = (over: Partial<SettingsFacts> = {}): SettingsFacts => ({
  handle: "maynaa",
  dob: "1999-03-04",
  now: NOW,
  language: { flag: "🇺🇸", label: "English" },
  wren: "Pip",
  theme: theme(),
  letterFont: { selected: "newsreader", choices: ["newsreader", "newyork"] },
  perm: "granted",
  notifyOn: true,
  knock: false,
  premium: false,
  cofounderNo: null,
  restoring: false,
  version: { store: "1.0.5", binary: "1.3.0", build: "29" },
  ...over,
});

/* ── the page's order ── */
{
  const v = buildSettingsView(facts(), t);
  ok("the sections, in order: account, the quiet, first class, help, safety, exits", v.groups.map((g) => g.key).join(",") === "account,quiet,firstClass,help,safety,exits");
  ok("headers come from the strings (APPEARANCE separately)", v.groups[0].header === "settings.account" && v.groups[1].header === "set.sec.quiet" && v.appearance.header === "set.sec.appearance");
  ok("the exits have no header", v.groups[5].header === "");
  ok("the title is SETTINGS and back is a11y.back", v.title === "settings.title" && v.backLabel === "a11y.back");
  ok("account: pen name, age, language, the courier's name", v.groups[0].rows.map((r) => r.key).join(",") === "pen,age,language,wren");
  ok("help: how it works, write to us, rate", v.groups[3].rows.map((r) => r.key).join(",") === "help,writeToUs,rate");
  ok("safety keeps blocked & reported, terms and privacy (Apple)", v.groups[4].rows.map((r) => r.key).join(",") === "blocked,terms,privacy");
  ok("the exits: sign out, delete, both red", v.groups[5].rows.map((r) => `${r.key}:${r.kind}`).join(",") === "signOut:danger,deleteAccount:danger");
  ok("delete carries its subline", v.groups[5].rows[1].sub === "set.deleteSub");
  ok("first class: membership, restore, manage", v.groups[2].rows.map((r) => r.key).join(",") === "membership,restore,manage");
  ok("every row key is unique", new Set(v.groups.flatMap((g) => g.rows.map((r) => r.key))).size === v.groups.flatMap((g) => g.rows).length);
  ok("every row has an SF Symbol and a glyph", v.groups.every((g) => g.rows.every((r) => r.symbol.length > 0 && r.glyph.length > 0)));
}

/* ── the quiet: exactly two switches, and the notice ── */
{
  const v = buildSettingsView(facts(), t);
  const quiet = v.groups[1];
  ok("the quiet: notifications, the knock, moments you kept, unsent letters", quiet.rows.map((r) => r.key).join(",") === "notify,knock,lore,drafts");
  ok("exactly two switches on the whole page", v.groups.flatMap((g) => g.rows).filter((r) => r.kind === "toggle").length === 2);
  ok("the switches show their state", quiet.rows[0].on === true && quiet.rows[1].on === false);
  ok("the switches keep their subs (never the mock's merged sentence)", quiet.rows[0].sub === "set.notify.sub{wren:Pip}" && quiet.rows[1].sub === "set.knock.sub");
  ok("a switch has no chevron", quiet.rows[0].chevron === false && quiet.rows[1].chevron === false);
  ok("permission granted: no notice", quiet.notice === null);
  const unread = buildSettingsView(facts({ notifyOn: null }), t).groups[1];
  ok("Notifications hidden until the phone answers (never flashes the wrong way)", unread.rows.map((r) => r.key).join(",") === "knock,lore,drafts");
  const ask = quietNotice("ask", t);
  ok("never asked: the notice offers iOS's question", ask?.text === "set.push.off" && ask.action === "set.push.offAsk");
  ok("refused: the notice opens Settings", quietNotice("settings", t)?.action === "set.push.offOpen");
  ok("unknown: say nothing", quietNotice(null, t) === null);
  ok("the notice sits on THE QUIET", buildSettingsView(facts({ perm: "settings" }), t).groups[1].notice?.action === "set.push.offOpen");
}

/* ── appearance ── */
{
  const v = buildSettingsView(facts(), t);
  ok("before DARK_READY: no Midnight swatch", !v.appearance.swatches.some((s) => s.key === "midnight"));
  ok("before DARK_READY: the light themes in themes.json's order", v.appearance.swatches.map((s) => s.key).join(",") === KEYS.filter((k) => !DARK.includes(k)).join(","));
  ok("before DARK_READY: no Match system row", v.appearance.showMatch === false);
  ok("swatch names come from the strings, not themes.json's English", v.appearance.swatches[0].label === "theme.classic");
  const ready = buildSettingsView(facts({ theme: theme({ darkReady: true }) }), t);
  ok("DARK_READY: all four, and Match system", ready.appearance.swatches.length === KEYS.length && ready.appearance.showMatch);
  const night = buildSettingsView(facts({ theme: theme({ effective: "midnight", pick: "lavender", darkReady: true }) }), t);
  ok("selected = the theme in effect (Lavender picked, Midnight after dark)", night.appearance.selectedTheme === "midnight");
  const forced = swatches(theme({ effective: "midnight" }), t);
  ok("the dev switch forcing Midnight shows its swatch", forced.some((s) => s.key === "midnight"));
  ok("Match system on: Midnight after dark, the pick by day", matchSub(theme({ pick: "lavender" }), t) === "set.matchSystem.on{night:theme.midnight,day:theme.lavender}");
  ok("Match system on with Midnight picked: Classic by day", matchSub(theme({ pick: "midnight" }), t) === "set.matchSystem.on{night:theme.midnight,day:theme.classic}");
  const onLine = readFileSync(new URL("../../data/strings-step5-settings.ts", import.meta.url), "utf8").match(/"set\.matchSystem\.on": "([^"]*)"/)?.[1] ?? "";
  ok("the Match system line names both themes by placeholder, never in its words", onLine.includes("{night}") && onLine.includes("{day}") && !/Midnight|Classic|Lavender|Paper/.test(onLine));
  ok("Match system off: always the pick", matchSub(theme({ pick: "paper", matchSystem: false }), t) === "set.matchSystem.off{theme:theme.paper}");
  ok("the font tiles: Newsreader and New York, by their own names", v.appearance.fonts.map((f) => `${f.key}=${f.name}`).join(",") === "newsreader=Newsreader,newyork=New York");
  ok("each tile carries the specimen (Aa, the same in every language)", v.appearance.fonts.every((f) => f.sample === "Aa"));
  ok("Garamond has its name ready for when it lands", LETTER_FONT_NAMES.garamond === "EB Garamond");
  ok("the font picked is selected", v.appearance.selectedFont === "newsreader");
  ok("the font tiles have a label and a sub", v.appearance.fontLabel === "set.letterFont" && v.appearance.fontSub === "set.letterFont.sub");
}

/* ── account ── */
{
  const v = buildSettingsView(facts(), t);
  ok("the pen name's value is the handle", v.groups[0].rows[0].value === "maynaa");
  ok("no pen name: You (set.you), never a literal", buildSettingsView(facts({ handle: "" }), t).groups[0].rows[0].value === "set.you");
  ok("the language: flag and endonym, never translated", v.groups[0].rows[2].value === "🇺🇸 English");
  ok("the courier's row is named for her and shows her name", v.groups[0].rows[3].label === "set.wrenName{wren:Pip}" && v.groups[0].rows[3].value === "Pip");
  ok("age: display only, no chevron", v.groups[0].rows[1].kind === "display" && !v.groups[0].rows[1].chevron);
  ok("no birthday: no age row", !buildSettingsView(facts({ dob: null }), t).groups[0].rows.some((r) => r.key === "age"));
}

/* ── age from the birthday, not the year ── */
{
  ok("a date parses", JSON.stringify(parseDob("1999-03-04")) === JSON.stringify({ y: 1999, m: 3, d: 4 }));
  ok("a 31st of a 30-day month isn't a date", parseDob("2000-04-31") === null);
  ok("garbage isn't a date", parseDob("soon") === null && parseDob(null) === null);
  ok("27 the day after the birthday", ageOf("1999-10-15", NOW) === 27);
  ok("27 on the birthday", ageOf("1999-10-16", NOW) === 27);
  ok("26 the day before (the old code said 27 from January)", ageOf("1999-10-17", NOW) === 26);
  ok("17 shows the real number", ageBand("2009-01-01", NOW) === "17");
  ok("18 is 18–24", ageBand("2008-10-16", NOW) === "18–24");
  ok("a day short of 18 is 17", ageBand("2008-10-17", NOW) === "17");
  ok("25 is 25–34", ageBand("2001-01-01", NOW) === "25–34");
  ok("35 is 35–44", ageBand("1991-01-01", NOW) === "35–44");
  ok("45 is 45+", ageBand("1981-01-01", NOW) === "45+");
  ok("a future date shows nothing", ageBand("2030-01-01", NOW) === null);
}

/* ── first class ── */
{
  const free = buildBanner({ premium: false, cofounderNo: null, wren: "Pip" }, t);
  ok("free: the owner's headline and two lines", free.headline === "fc.stubHead" && free.sub === "fc.stubSub1\nfc.stubSub2{wren:Pip}");
  ok("free: Try First Class →", free.cta === "fc.tryCta →");
  ok("free: 1ST on the stamp, the curious courier", free.stampLabel === "fc.firstMark" && free.pose === "fcFree");
  ok("never More Kindreds or a monthly reading", !/kindreds|reading/i.test(JSON.stringify(free)));
  const member = buildBanner({ premium: true, cofounderNo: null, wren: "Pip" }, t);
  ok("member: travelling First Class, MEMBER, delighted", member.headline === "fc.paidHead" && member.stampLabel === "fc.member" && member.pose === "fcMember");
  const founder = buildBanner({ premium: true, cofounderNo: 7, wren: "Pip" }, t);
  ok("cofounder: the founding number", founder.headline === "me.fc.founding{n:7}");
  ok("membership: Cofounder No. 007", membershipValue({ premium: true, cofounderNo: 7 }, t) === "set.member.cofounder{n:007}");
  ok("membership: First Class", membershipValue({ premium: true, cofounderNo: null }, t) === "set.member.first");
  ok("membership: Not yet", membershipValue({ premium: false, cofounderNo: null }, t) === "set.member.not");
  const busy = buildSettingsView(facts({ restoring: true }), t).groups[2].rows[1];
  ok("restoring: … and busy, no chevron", busy.value === "…" && busy.busy && !busy.chevron);
}

/* ── restore's answers ── */
{
  ok("restored", restoreAlert("restored", t).title === "set.restored");
  ok("nothing found", restoreAlert("nothing", t).title === "set.nothingRestore");
  ok("a failure is its own message, never nothing-to-restore", restoreAlert("failed", t).title === "set.restoreFail" && restoreAlert("failed", t).body === "set.push.saveFail");
  ok("purchases unreachable: the failure, never nothing-to-restore", restoreAlert("unavailable", t).title === "set.restoreFail");
}

/* ── the footer ── */
{
  ok("the store's label and the binary's own (owner question 7)", footerVersion({ store: "1.0.5", binary: "1.3.0", build: "29" }) === "1.0.5 · 1.3.0 (29)");
  ok("no build: the version alone", footerVersion({ store: "1.0.5", binary: "1.3.0", build: null }) === "1.0.5 · 1.3.0");
  ok("binary unknown: the store's alone", footerVersion({ store: "1.0.5", binary: null, build: "29" }) === "1.0.5");
  const v = buildSettingsView(facts(), t);
  ok("the footer wraps it in set.version", v.footer === "set.version{v:1.0.5 · 1.3.0 (29)}");
  ok("never the email", !v.footer.includes("@"));
  ok("STORE_VERSION is this release's App Store label", STORE_VERSION === "1.0.5");
}

/* ── where each row goes ── */
{
  ok("pen and the courier open the one-field page", ROW_ROUTES.pen === "/me/edit-field?f=pen" && ROW_ROUTES.wren === "/me/edit-field?f=courier");
  ok("help, write to us and blocked stay in the Me stack (the floating bar stays)", ROW_ROUTES.help === "/me/help" && ROW_ROUTES.writeToUs === "/me/write-to-us" && ROW_ROUTES.blocked === "/me/blocked");
  ok("moments you kept and unsent letters are root routes", ROW_ROUTES.lore === "/lore" && ROW_ROUTES.drafts === "/drafts");
  ok("membership: the paywall from the row", ROW_ROUTES.membership === "/paywall?src=settings_row");
  ok("the banner goes straight to the paywall (owner)", SETTINGS_ROUTES.banner === "/paywall?src=settings_banner");
  ok("rate opens the store's review box", SETTINGS_LINKS.rate.includes("action=write-review"));
  ok("manage opens Apple's subscriptions", SETTINGS_LINKS.manage === "https://apps.apple.com/account/subscriptions");
  ok("rows acting in place have no route", ROW_ROUTES.restore === undefined && ROW_ROUTES.signOut === undefined && ROW_ROUTES.language === undefined);
}

/* ── the exits' red, legible in every theme ── */
{
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  ok("the red starts from the postmark (brand postRed)", themesJson.brand.postRed?.toUpperCase() === "#E0483C");
  for (const k of KEYS) {
    const th = themesJson.themes[k];
    const red = dangerInk(th.ink, themesJson.brand.postRed);
    const worst = Math.min(contrast(red, th.soft), contrast(red, th.sf), contrast(red, th.bg));
    ok(`${k}: the exits' red ${red} clears 4.5:1 on soft, sf and bg (${worst.toFixed(2)})`, worst >= 4.5);
  }
  ok("the light themes' red is the old #B23838's neighbour", dangerInk("#1E1B35") === "#B03D3A");
}

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
