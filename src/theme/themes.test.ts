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

const { THEMES, THEME_KEYS, LIGHT_KEYS, BRAND, MOOD10A, DEFAULT_PREFS, resolveTheme, applyPick, parsePrefs } = await import("./themes.ts");

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "ok  " : "FAIL"}  ${label}`);
};
const r = (pick: string, matchSystem: boolean, systemScheme: string | null, darkReady: boolean) =>
  resolveTheme({ pick: pick as never, matchSystem, systemScheme, darkReady });

/* the table, once the screens have moved (DARK_READY true) */
ok("classic, match, light → classic", r("classic", true, "light", true) === "classic");
ok("classic, match, dark → midnight", r("classic", true, "dark", true) === "midnight");
ok("lavender, match, dark → midnight", r("lavender", true, "dark", true) === "midnight");
ok("lavender, match, light → lavender", r("lavender", true, "light", true) === "lavender");
ok("midnight, match, light → classic", r("midnight", true, "light", true) === "classic");
ok("midnight, match, dark → midnight", r("midnight", true, "dark", true) === "midnight");
ok("paper, no match, dark → paper", r("paper", false, "dark", true) === "paper");
ok("midnight, no match, light → midnight", r("midnight", false, "light", true) === "midnight");
ok("classic, match, scheme unknown → classic", r("classic", true, null, true) === "classic");

/* the same table while DARK_READY is false: nothing ever resolves to Midnight */
ok("[not ready] classic, match, light → classic", r("classic", true, "light", false) === "classic");
ok("[not ready] classic, match, dark → classic", r("classic", true, "dark", false) === "classic");
ok("[not ready] lavender, match, dark → lavender", r("lavender", true, "dark", false) === "lavender");
ok("[not ready] midnight, match, light → classic", r("midnight", true, "light", false) === "classic");
ok("[not ready] paper, no match, dark → paper", r("paper", false, "dark", false) === "paper");
ok("[not ready] midnight, no match, dark → classic", r("midnight", false, "dark", false) === "classic");
const neverNight = THEME_KEYS.every((pick) =>
  [true, false].every((m) => ["light", "dark", "unspecified", null].every((s) => r(pick, m, s, false) !== "midnight")),
);
ok("[not ready] no pick × switch × scheme gives midnight", neverNight);

/* the setter rule */
ok("picking midnight turns match system off", JSON.stringify(applyPick({ pick: "lavender", matchSystem: true }, "midnight")) === '{"pick":"midnight","matchSystem":false}');
ok("picking paper keeps match system on", JSON.stringify(applyPick({ pick: "classic", matchSystem: true }, "paper")) === '{"pick":"paper","matchSystem":true}');
ok("picking classic keeps match system off", JSON.stringify(applyPick({ pick: "midnight", matchSystem: false }, "classic")) === '{"pick":"classic","matchSystem":false}');

/* defaults and what's read back */
ok("default is classic, following the system", DEFAULT_PREFS.pick === "classic" && DEFAULT_PREFS.matchSystem === true);
ok("saved prefs read back", JSON.stringify(parsePrefs('{"pick":"paper","matchSystem":false}')) === '{"pick":"paper","matchSystem":false}');
ok("unknown theme falls back alone", JSON.stringify(parsePrefs('{"pick":"neon","matchSystem":false}')) === '{"pick":"classic","matchSystem":false}');
ok("a non-boolean switch falls back alone", JSON.stringify(parsePrefs('{"pick":"lavender","matchSystem":"yes"}')) === '{"pick":"lavender","matchSystem":true}');
ok("null reads as defaults", JSON.stringify(parsePrefs("null")) === JSON.stringify(DEFAULT_PREFS));
let threw = false;
try {
  parsePrefs("{not json");
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
process.exit(fail ? 1 : 0);
