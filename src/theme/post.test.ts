/* Behaviour lock for the letter font and the theme-aware channel colours
   (theme/post). Not wired to a runner; run by hand from the repo root with
   plain node (it strips the types itself from Node 22.18 / 23.6 on):
     node src/theme/post.test.ts
   post.ts imports nothing, so it loads as it is. The stamp colours and the
   theme surfaces are read as text from their own files (stamps.ts imports
   i18n, which imports React Native). Every line prints ok/FAIL and the
   process exits non-zero if any fail. */

import { readFileSync } from "node:fs";
import {
  DEFAULT_LETTER_FONT,
  GARAMOND_READY,
  LETTER_FONT_CHOICES,
  LETTER_FONT_KEYS,
  MONO,
  channelColors,
  channelInk,
  channelWash,
  letterFamily,
  letterFontKey,
} from "./post.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };

/* ── the letter font ── */
ok("the default is Newsreader", DEFAULT_LETTER_FONT === "newsreader");
ok("three values in all", LETTER_FONT_KEYS.join() === "newsreader,newyork,garamond");
ok("Garamond is embedded on this build", GARAMOND_READY === true);
ok("Settings offers all three", LETTER_FONT_CHOICES.join() === "newsreader,newyork,garamond");
ok("a stored New York stays New York", letterFontKey("newyork") === "newyork");
ok("a stored Garamond stays Garamond", letterFontKey("garamond") === "garamond");
ok("junk reads as the default", ["", null, undefined, 3, "NewYork", "times"].every((v) => letterFontKey(v) === "newsreader"));
ok("Newsreader upright", (() => { const f = letterFamily("newsreader"); return f.fontFamily === "Newsreader-Regular" && f.fontStyle === "normal"; })());
ok("Newsreader italic is said twice", (() => { const f = letterFamily("newsreader", true); return f.fontFamily === "Newsreader-Italic" && f.fontStyle === "italic"; })());
ok("New York is the system serif (ui-serif)", (() => { const f = letterFamily("newyork"); return f.fontFamily === "ui-serif" && f.fontStyle === "normal"; })());
ok("New York italic comes from fontStyle", (() => { const f = letterFamily("newyork", true); return f.fontFamily === "ui-serif" && f.fontStyle === "italic"; })());
ok("Garamond upright and its italic both ask for the one embedded face", (() => { const u = letterFamily("garamond"); const i = letterFamily("garamond", true); return u.fontFamily === "EBGaramond-Regular" && u.fontStyle === "normal" && i.fontFamily === "EBGaramond-Regular" && i.fontStyle === "italic"; })());

/* ── the mono table (owner question 2's default) ── */
ok("labels and titles are 9, 10, 11", MONO.small === 9 && MONO.label === 10 && MONO.title === 11);
ok("YOUR COURIER keeps 12, the Me numbers 13", MONO.courier === 12 && MONO.figure === 13);

/* ── channel colours ── */
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (s: string) => { const [r, g, b] = hex(s); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a: string, b: string) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const stamps = [...new Set([...readFileSync(new URL("../data/stamps.ts", import.meta.url), "utf8").matchAll(/color: "(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]))];
const themes = JSON.parse(readFileSync(new URL("./themes.json", import.meta.url), "utf8")).themes as Record<string, Record<string, string>>;
ok("the stamp colours were found", stamps.length >= 36);

for (const [name, tk] of Object.entries(themes)) {
  for (const surface of ["bg", "sf", "soft", "soft2"] as const) {
    const s = tk[surface];
    const bad = stamps.filter((c) => { const cc = channelColors(c, s); return ratio(cc.ink, cc.wash) < 4.5; });
    ok(`${name} ${surface}: every stamp's tag text clears 4.5:1 on its wash${bad.length ? " (" + bad.join(" ") + ")" : ""}`, bad.length === 0);
    const lineBad = stamps.filter((c) => ratio(channelColors(c, s).line, s) < 3);
    ok(`${name} ${surface}: every tag rule clears 3:1 on the surface${lineBad.length ? " (" + lineBad.join(" ") + ")" : ""}`, lineBad.length === 0);
  }
}
{
  const mid = themes.midnight.sf;
  const deep = channelColors("#2E3F8C", mid); // Late nights, the deepest blue
  ok("Midnight: a deep stamp's ink is lighter than the stamp, not darker", lum(deep.ink) > lum("#2E3F8C"));
  ok("Midnight: the wash stays dark (a tint of the tray, not a pale slab)", lum(deep.wash) < 0.05);
  ok("Classic: the ink is darker than the stamp", lum(channelColors("#C86E7A", themes.classic.sf).ink) <= lum("#C86E7A"));
}
ok("a missing stamp colour still gives readable colours", (() => { const c = channelColors(null, themes.midnight.sf); return ratio(c.ink, c.wash) >= 4.5; })());
ok("a malformed stamp colour doesn't throw", (() => { const c = channelColors("blue", "#FFFFFF"); return /^#[0-9a-f]{6}$/.test(c.wash) && /^#[0-9a-f]{6}$/.test(c.ink); })());
ok("no surface → the old paper", channelColors("#6B4F9E").wash === channelWash("#6B4F9E"));
/* the old pair is unchanged: the values the 1.2.x tags were drawn with */
ok("channelWash unchanged", channelWash("#6B4F9E") === "#e6e0e7" && channelWash(null) === "#F4F4F5");
ok("channelInk unchanged", channelInk("#C86E7A") === "#98545d" && channelInk(undefined) === "#111113");

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
