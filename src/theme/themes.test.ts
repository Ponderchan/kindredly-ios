/* Behaviour lock for the theme rule. Not wired to a test runner (the host
   can't run the RN toolchain); run by hand from the repo root with:
     node --experimental-strip-types src/theme/themes.test.ts
   themes.ts imports themes.json, and plain node only loads JSON from ES
   modules with an import attribute that Metro doesn't need. So a load hook
   adds the attribute first, and themes.ts is imported after it.
   Every line prints ok/FAIL and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  load: (url, context, next) =>
    next(url, url.endsWith(".json") ? { ...context, importAttributes: { ...context.importAttributes, type: "json" } } : context),
});

const { THEMES, THEME_KEYS, LIGHT_KEYS, BRAND, MOOD10A, APPEARANCES, DEFAULT_APPEARANCE, appearanceTheme, resolveAppearance, parseAppearance, serializeAppearance, isAppearance } =
  await import("./themes.ts");

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "ok  " : "FAIL"}  ${label}`);
};

/* the five, in Settings' order */
ok("five appearances in order", JSON.stringify(APPEARANCES) === '["system","light","dark","lavender","paper"]');
ok("default is system", DEFAULT_APPEARANCE === "system");
ok("isAppearance takes the five and nothing else", APPEARANCES.every((a) => isAppearance(a)) && !isAppearance("classic") && !isAppearance("midnight") && !isAppearance(null) && !isAppearance(3));

/* resolve: an appearance and the phone's scheme → the theme in effect */
const R = (a: string, s: string | null | undefined) => resolveAppearance(a as never, s);
ok("system, phone light → classic", R("system", "light") === "classic");
ok("system, phone dark → midnight", R("system", "dark") === "midnight");
ok("system, scheme unknown → classic", R("system", null) === "classic" && R("system", undefined) === "classic" && R("system", "unspecified") === "classic");
ok("light → classic, whatever the phone", ["light", "dark", null].every((s) => R("light", s) === "classic"));
ok("dark → midnight, whatever the phone", ["light", "dark", null].every((s) => R("dark", s) === "midnight"));
ok("lavender → lavender, whatever the phone", ["light", "dark", null].every((s) => R("lavender", s) === "lavender"));
ok("paper → paper, whatever the phone", ["light", "dark", null].every((s) => R("paper", s) === "paper"));
ok("appearanceTheme: system has none", appearanceTheme("system") === null);
ok("every fixed appearance names a real theme", APPEARANCES.filter((a) => a !== "system").every((a) => THEME_KEYS.includes(appearanceTheme(a)!)));

/* storage: the new shape round-trips */
const P = (raw: string) => parseAppearance(raw);
ok("new shape round-trips, all five", APPEARANCES.every((a) => P(serializeAppearance(a)) === a));
ok("written as {appearance}", serializeAppearance("dark") === '{"appearance":"dark"}');

/* the migration from { pick, matchSystem } (D-1) */
ok("old midnight (match off) → dark", P('{"pick":"midnight","matchSystem":false}') === "dark");
ok("old midnight (match on) → dark", P('{"pick":"midnight","matchSystem":true}') === "dark");
ok("old lavender (match on) → lavender", P('{"pick":"lavender","matchSystem":true}') === "lavender");
ok("old lavender (match off) → lavender", P('{"pick":"lavender","matchSystem":false}') === "lavender");
ok("old paper → paper", P('{"pick":"paper","matchSystem":true}') === "paper" && P('{"pick":"paper","matchSystem":false}') === "paper");
ok("old classic, match on → system", P('{"pick":"classic","matchSystem":true}') === "system");
ok("old classic, match off → light", P('{"pick":"classic","matchSystem":false}') === "light");
ok("old classic, no switch saved → system", P('{"pick":"classic"}') === "system");
ok("old classic, junk switch → system", P('{"pick":"classic","matchSystem":"no"}') === "system");
ok("old unknown pick, match off → light (the old default pick)", P('{"pick":"neon","matchSystem":false}') === "light");
ok("old unknown pick, match on → system", P('{"pick":"neon","matchSystem":true}') === "system");

/* junk */
ok("null → system", P("null") === "system");
ok("{} → system", P("{}") === "system");
ok("a bare string → system", P('"dark"') === "system");
ok("a number → system", P("42") === "system");
ok("an array → system", P("[1,2]") === "system");
ok("unknown new appearance with no old fields → system", P('{"appearance":"neon"}') === "system");
ok("unknown new appearance falls back to the old fields", P('{"appearance":"neon","pick":"paper"}') === "paper");
ok("the new shape wins over old fields", P('{"appearance":"light","pick":"midnight"}') === "light");
ok("old theme keys are not appearances", P('{"appearance":"midnight"}') === "system" && P('{"appearance":"classic"}') === "system");
let threw = false;
try {
  P("{not json");
} catch {
  threw = true;
}
ok("unreadable JSON throws (the provider warns)", threw);

/* the table itself */
const HEX = /^#[0-9A-F]{6}$/;
const TOKENS = ["bg", "sf", "ink", "ln", "sub", "mute", "faint", "soft", "soft2", "line", "lav", "lav2", "ind"];
ok("four themes", JSON.stringify(THEME_KEYS) === '["classic","midnight","lavender","paper"]');
ok("light keys are classic, lavender, paper", JSON.stringify(LIGHT_KEYS) === '["classic","lavender","paper"]');
ok("midnight is the only dark theme", THEME_KEYS.filter((k) => THEMES[k].dark).join() === "midnight");
ok(
  "every theme has the 13 tokens as #RRGGBB, and nothing else",
  THEME_KEYS.every((k) => {
    const { name, dark, ...rest } = THEMES[k];
    return typeof name === "string" && typeof dark === "boolean" && JSON.stringify(Object.keys(rest)) === JSON.stringify(TOKENS) && Object.values(rest).every((v) => HEX.test(v as string));
  }),
);
ok("brand colours are #RRGGBB", Object.values(BRAND).every((v) => HEX.test(v)));
ok("mood pairs are fill + ink", Object.values(MOOD10A).every((p) => p.length === 2 && p.every((v) => HEX.test(v))));

console.log(fail ? `\n${fail} failed` : "\nall passed");
/* ── the dark theme follows the binary (2026-11-12: Midnight became a neutral black) ── */
{
  const T = await import("./themes.ts");
  ok("plain node has no Swift module: the table as it is", T.binaryThemeRev() === null && T.THEMES.midnight.bg === "#000000");
  ok("a binary with the neutral Midnight (themeRev 2) gets the table's", T.themesFor(2).midnight.bg === "#000000" && T.themesFor(2).midnight.sf === "#16181C" && !T.legacyDark(2));
  ok("a binary from before the constant (read as 1) keeps the old blue-violet Midnight", T.legacyDark(1) && T.themesFor(1).midnight.bg === "#0F0E1C" && T.themesFor(1).midnight.sf === "#1A1830" && T.themesFor(1).midnight.lav === "#2E2A66");
  ok("only Midnight differs on an older binary", (["classic", "lavender", "paper"] as const).every((k) => T.themesFor(1)[k] === T.themesFor(2)[k]));
  ok("the old Midnight carries every token and is still dark", T.LEGACY_MIDNIGHT.dark === true && ["bg", "sf", "ink", "ln", "sub", "mute", "faint", "soft", "soft2", "line", "lav", "lav2", "ind"].every((k) => /^#[0-9A-F]{6}$/.test((T.LEGACY_MIDNIGHT as unknown as Record<string, string>)[k])));
  ok("the neutral Midnight has no colour in its greys", ["bg", "sf", "soft", "soft2", "line"].every((k) => { const h = (T.THEMES.midnight as unknown as Record<string, string>)[k]; const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return Math.max(r, g, b) - Math.min(r, g, b) <= 8; }));
  // the module answering through the JSI global, as expo's requireOptionalNativeModule reads it
  (globalThis as unknown as { expo?: unknown }).expo = { modules: { KindredlyUI: {} } };
  ok("a module with no themeRev constant reads as 1", T.binaryThemeRev() === 1);
  (globalThis as unknown as { expo?: unknown }).expo = { modules: { KindredlyUI: { themeRev: 2 } } };
  ok("a module that says 2 reads as 2", T.binaryThemeRev() === 2);
  delete (globalThis as unknown as { expo?: unknown }).expo;
}

process.exit(fail ? 1 : 0);
