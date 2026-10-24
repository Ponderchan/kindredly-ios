/* The words the 2026-10-25 over-the-air update brings, in all nine languages: the update prompt
   (strings-update-prompt), the 1.0.5 what's-new reel (strings-news-1-0-5), the guide reels' own
   words (strings-reel-kindreds, strings-reel-guides) and the guide lines rewritten for 1.0.5
   (strings.ts gd.*). Each file's nine blocks carry the same keys and none is empty; the update
   prompt's English is the owner's set A word for word; {version} and {wren} sit in every language
   where the English has them; the banner's key ends on " ›"; the #topics are #topics. Not wired
   to a runner; run by hand from the repo root with plain node (Node 22.18+ strips the types):
     node src/data/strings-ota-1025.test.ts
   i18n is swapped for a recorder (the real one needs AsyncStorage). Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

const LANGS = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];
let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

/* the blocks one file hands to strings(), en first; a fresh import each time */
async function blocksOf(file: string): Promise<Record<string, string>[]> {
  (globalThis as { __blocks?: unknown }).__blocks = undefined;
  await import(`./${file}?${file}`);
  return (globalThis as unknown as { __blocks: Record<string, string>[] }).__blocks;
}

const vars = (s: string) => (s.match(/\{\w+\}/g) || []).sort().join(",");

function sameShape(file: string, blocks: Record<string, string>[], keys?: string[]) {
  ok(`${file}: nine blocks`, blocks.length === 9, `got ${blocks.length}`);
  const en = blocks[0];
  const want = keys ?? Object.keys(en);
  blocks.forEach((b, i) => {
    const lang = LANGS[i];
    const missing = want.filter((k) => !(k in b));
    ok(`${file} ${lang}: every key`, !missing.length, missing.join(", "));
    const empty = want.filter((k) => typeof b[k] !== "string" || !b[k].trim());
    ok(`${file} ${lang}: none empty`, !empty.length, empty.join(", "));
    const moved = want.filter((k) => k in b && vars(b[k]) !== vars(en[k]));
    ok(`${file} ${lang}: the {vars} the English has`, !moved.length, moved.join(", "));
  });
}

/* ── the update prompt: set A, word for word ── */
const SET_A: Record<string, string> = {
  "upd.version": "VERSION {version}",
  "upd.title": "special delivery. it's me, but newer.",
  "upd.line": "i'd carry it over myself, but the App Store insists.",
  "upd.update": "Update",
  "upd.later": "Later",
  "upd.banner": "a parcel's waiting for you",
  "upd.banner.cta": "Update ›",
};
const up = await blocksOf("strings-update-prompt.ts");
sameShape("strings-update-prompt", up, Object.keys(SET_A));
const drift = Object.keys(SET_A).filter((k) => up[0][k] !== SET_A[k]);
ok("update prompt: the English is set A", !drift.length, drift.join(", "));
const noArrow = LANGS.filter((_, i) => !up[i]["upd.banner.cta"].endsWith(" ›"));
ok("update prompt: every banner key ends on ' ›'", !noArrow.length, noArrow.join(", "));
const noStore = LANGS.filter((_, i) => !up[i]["upd.line"].includes("App Store"));
ok("update prompt: Wren's line names the App Store as Apple does", !noStore.length, noStore.join(", "));

/* ── the what's-new reel ── */
const nw = await blocksOf("strings-news-1-0-5.ts");
sameShape("strings-news-1-0-5", nw);
const badTopic = LANGS.filter((_, i) => {
  const s = nw[i]["nw105.press.topic"];
  return !s.startsWith("#") || [...s].length > 25;
});
ok("what's new: the pressed stamp's #topic has its # and fits 24", !badTopic.length, badTopic.join(", "));

/* ── the guide reels' own words ── */
const kin = await blocksOf("strings-reel-kindreds.ts");
sameShape("strings-reel-kindreds", kin);
const gr = await blocksOf("strings-reel-guides.ts");
sameShape("strings-reel-guides", gr);
const badPress = LANGS.filter((_, i) => {
  const s = gr[i]["gd.stamps.pressTopic"];
  return s.startsWith("#") || [...s].length > 24;
});
ok("stamps reel: the #topic is written without its # and fits 24", !badPress.length, badPress.join(", "));

/* ── the guide lines rewritten for 1.0.5 ── */
const cat = await blocksOf("strings.ts");
const GD = ["gd.letters.f3", "gd.kindreds.f1", "gd.kindreds.f2", "gd.kindreds.f3", "gd.stamps.f1", "gd.stamps.f3", "gd.courier.f2"];
sameShape("strings.ts (1.0.5 guide lines)", cat, GD);
const stale = LANGS.filter((_, i) => /mosai|mosaï|モザイク|모자이크|veinte|vinte|dua puluh|vingt|zwanzig|venti/i.test(GD.map((k) => cat[i][k]).join(" ")));
ok("the guide lines no longer speak of mosaics or twenty words", !stale.length, stale.join(", "));

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
