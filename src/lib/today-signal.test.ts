import { signalFrom, type AuraFacts } from "./today-signal";
import { extractPiece } from "./writing-engine/stickers/extract";
import { STICKER_BY_TRAIT } from "./writing-engine/stickers/catalog";
import { toPiece } from "./writing-engine/stickers";
import type { TraitId } from "./writing-engine/stickers/types";
import { pieceThemes, THEME_STICKER } from "./usage-stickers";
import type { PoolLetter } from "./db";

/* the Today card's chip: subject > stamp > label > hour > rings > nothing */
let fails = 0;
const ok = (name: string, cond: boolean) => {
  if (!cond) fails++;
  console.log(`${cond ? "ok " : "FAIL"} ${name}`);
};

const at = (h: number) => {
  const d = new Date();
  d.setHours(h, 12, 0, 0);
  return d.toISOString();
};
const letter = (body: string, hour: number, o: Partial<PoolLetter> = {}): PoolLetter => ({
  id: "L",
  author: "a",
  stamp: "crush",
  body,
  lang: "en",
  created_at: at(hour),
  ...o,
});
const me = (o: Partial<{ stickers: string[]; usage: string[]; stamps: string[] }> = {}): AuraFacts => ({
  stickers: new Set(o.stickers ?? []),
  usage: new Set(o.usage ?? []),
  stamps: new Set(o.stamps ?? []),
});
const close = { close: { uid: "a", score: 0.9 } as never };

const body = "Sometimes I wonder if soulmates exist… and if they don't, I honestly don't understand how easy one can get comfortable with another — maybe it's nothing. Maybe.";
const f = extractPiece(toPiece("L", "letter", body, at(23), "en"));
const fired = (Object.keys(f.verdicts) as TraitId[]).filter((t) => f.verdicts[t]?.verdict === "support").map((t) => STICKER_BY_TRAIT[t]?.id).filter(Boolean) as string[];
console.log("this letter fires:", fired.join(", "));

const homeBody = "I keep thinking about home lately. My mother's kitchen, the way the house smelled in winter, the garden my father kept. Home is the only word I have for it and I want to go back home.";
const themes = pieceThemes(homeBody);
console.log("home letter themes:", themes.join(", "));
const homeId = themes.length ? THEME_STICKER[themes[0]].id : "";

ok("nothing shared, no matcher → no chip", signalFrom(letter(body, 14), me()) === null);
ok("matcher only → rings", signalFrom(letter(body, 14, close), me())?.kind === "close");
ok("night writer + letter past ten → hour, above rings", JSON.stringify(signalFrom(letter(body, 23, close), me({ usage: ["night_writer"] }))) === JSON.stringify({ kind: "hour", stickerId: "night_writer" }));
ok("night writer + a noon letter → not the hour", signalFrom(letter(body, 12, close), me({ usage: ["night_writer"] }))?.kind === "close");
ok("early bird + a 7am letter → early", signalFrom(letter(body, 7), me({ usage: ["early_bird"] }))?.stickerId === "early_bird");
const s = signalFrom(letter(body, 23, close), me({ stickers: [fired[0]], usage: ["night_writer"] }));
ok("a sticker you wear that the letter fires → label, above hour", s?.kind === "label" && s.stickerId === fired[0]);
ok("a sticker you wear that the letter does not fire → falls through", signalFrom(letter(body, 12), me({ stickers: ["semicolon_enjoyer"] })) === null);
ok("their stamp is one you posted → no longer a read; the label still wins", signalFrom(letter(body, 23, close), me({ stickers: [fired[0]], usage: ["night_writer"], stamps: ["crush", "tiny-win"] }))?.kind === "label");
ok("a stamp alone, posted or not → nothing", signalFrom(letter(body, 12, { stamp: "crush" }), me({ stamps: ["crush"] })) === null);
ok("a home letter reads as the home theme", !!homeId && themes.length > 0);
const sub = signalFrom(letter(homeBody, 23, close), me({ usage: [homeId, "night_writer"], stamps: ["crush"], stickers: fired }));
ok("a subject you keep writing about → subject, above everything", sub?.kind === "subject" && sub.stickerId === homeId);
ok("a private subject sticker never shows", signalFrom(letter("I am so tired, tired all the time, tired of being tired and I cannot sleep or rest at all lately", 12), me({ usage: ["tired_one"] }))?.kind !== "subject");
ok("a short letter skips the subject read", signalFrom(letter("home home home", 12), me({ usage: [homeId] })) === null);
ok("a voice letter never reads words", signalFrom({ ...letter(body, 12), kind: "voice", media_path: "x" }, me({ stickers: fired, usage: [homeId] })) === null);
ok("too short to read → falls through to rings", signalFrom(letter("ok", 12, close), me({ stickers: fired }))?.kind === "close");

console.log(fails ? `\n${fails} failing` : "\nall ok");
process.exit(fails ? 1 : 0);
