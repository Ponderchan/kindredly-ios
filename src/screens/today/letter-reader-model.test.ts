/* Behaviour lock for the unfolded letter (screens/today/letter-reader-model): what it shows, what
   VoiceOver hears of its docket, the bar's placeholder and hint, and what a send does — the same
   for both renderers. Not wired to a runner; run by hand from the repo root with plain node:
     node src/screens/today/letter-reader-model.test.ts */

import { readerClosesOnSend, readerDocketA11y, readerHint, readerPlaceholder, readerText, type ReaderCard } from "./letter-reader-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const card = (o: Partial<ReaderCard> = {}): ReaderCard => ({
  isVoice: false,
  caption: "",
  body: "Dear stranger,",
  postmark: "SEP.23 · NO.7273",
  when: "SEP.23",
  replyPlaceholder: "write back to No. 7273…",
  who: { spoken: "Sunday Kite, she, Gemini" },
  ...o,
});

ok("a letter shows its words", readerText(card()) === "Dear stranger,");
ok("the translation shows when the card shows it (body is what the card shows)", readerText(card({ body: "Querido desconocido," })) === "Querido desconocido,");
ok("a voice letter shows its caption, never the body", readerText(card({ isVoice: true, caption: "the sea at night", body: "x" })) === "the sea at night");
ok("a voice letter with the default caption shows nothing", readerText(card({ isVoice: true, caption: "", body: "x" })) === "");

ok("switch off: VoiceOver reads the postmark", readerDocketA11y(card(), false) === "SEP.23 · NO.7273");
ok("switch on: the writer, then the date", readerDocketA11y(card(), true) === "Sunday Kite, she, Gemini. SEP.23");

ok("the letter's own placeholder wins", readerPlaceholder(card(), "write back…") === "write back to No. 7273…");
ok("unsigned: the desk's placeholder", readerPlaceholder(card({ replyPlaceholder: "" }), "write back…") === "write back…");

ok("the hint in capitals", readerHint("a thread opens with your words", "en") === "A THREAD OPENS WITH YOUR WORDS");
ok("the hint in the reader's locale (Turkish dotted i)", readerHint("i", "tr") === "İ");
ok("no hint stays none", readerHint("", "en") === "");

ok("a send closes the reader", readerClosesOnSend({ pouchFull: false }) === true);
ok("a full pouch only explains: the reader stays", readerClosesOnSend({ pouchFull: true }) === false);

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
