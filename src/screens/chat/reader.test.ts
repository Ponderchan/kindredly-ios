/* Behaviour lock for the one-letter reader's rules (screens/chat/reader): known bugs 2, 3 and 4,
   the hero, translate and the reply hint. Not wired to a runner; run by hand from the repo root
   with plain node (it strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/chat/reader.test.ts
   reader imports its pure neighbours the way Metro wants them (no extension), so a load hook adds
   ".ts" to an extensionless relative import, in this process only. Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const R = await import("./reader.ts");
const { demoDetail } = await import("../../data/demo.ts");

type Detail = import("../../lib/db").ThreadDetail;
type Msg = import("../../lib/db").ThreadMessage;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(",")})` : key);
const fmt = { t, locale: "en-US", postmark: (iso: string) => `PM:${iso.slice(5, 10)}`, penPal: (other: string) => `NO.${other.length}` };

const voice = demoDetail("demo-voice") as Detail;
const gone = demoDetail("demo-gone-penpal") as Detail;
const goneKindred = demoDetail("demo-gone-kindred") as Detail;
const mira = demoDetail("demo-mira") as Detail;
const north = demoDetail("demo-north") as Detail;

/* ── the hero ── */
{
  const conv = R.readerLetters(voice);
  ok("the voice opening is a letter even with replies after it", conv.length === voice.messages.length + 1);
  ok("?m=opening picks the opening", R.heroIndex(conv, { m: "opening" }) === 0);
  ok("?m=<id> picks that letter", R.heroIndex(conv, { m: "demo-voice-2" }) === 2);
  ok("an unknown ?m= falls back to ?i=", R.heroIndex(conv, { m: "nope", i: "1" }) === 1);
  ok("?i= out of range falls back to their latest", R.heroIndex(conv, { i: "99" }) === 2);
  ok("nothing asked: their latest", R.heroIndex(conv, {}) === 2);
  ok("a bad ?i= is ignored", R.heroIndex(conv, { i: "1.5" }) === 2);
  ok("nothing loaded: no hero", R.heroIndex([], { m: "opening" }) === -1);
  const mine: Msg[] = [{ body: "a", mine: true, date: "2026-10-01T10:00:00Z", id: "x" }];
  ok("only my letters: the newest", R.heroIndex(mine, {}) === 0);
  ok("the link key of the opening is 'opening'", R.letterLinkKey(conv[0]) === "opening" && R.letterLinkKey(conv[2]) === "demo-voice-2");
}

/* ── known bug 2: the voice opening plays wherever it shows ── */
{
  const conv = R.readerLetters(voice);
  ok("bug 2: the opening is a voice letter as the hero", R.isVoiceLetter(conv[0], voice));
  ok("bug 2: …and among the earlier letters (no conv.length test)", conv.length > 1 && R.isVoiceLetter(conv[0], voice));
  ok("bug 2: a reply is never a voice card", !R.isVoiceLetter(conv[1], voice));
  ok("a words opening is no voice card", !R.isVoiceLetter(R.readerLetters(mira)[0], mira));
  const silent: Detail = { ...voice, opening: "" };
  ok("a voice opening with no caption still shows", R.readerLetters(silent)[0]?.body === "" && R.isVoiceLetter(R.readerLetters(silent)[0], silent));
}

/* ── known bug 3: the opening's own date, or none ── */
{
  const conv = R.readerLetters(voice);
  ok("bug 3: the opening wears openingAt", R.letterDate(conv[0], voice, fmt) === `PM:${voice.openingAt!.slice(5, 10)}`);
  const apart: Detail = { ...voice, openingAt: "2026-08-02T09:00:00Z", since: "2026-08-11T09:00:00Z" };
  ok("bug 3: never since (the first reply's date)", R.letterDate(conv[0], apart, fmt) === "PM:08-02");
  const noDate: Detail = { ...voice, openingAt: null };
  ok("bug 3: no date known, no date (no AUG 11)", R.letterDate(conv[0], noDate, fmt) === "" && !R.postmarkLine(conv[0], noDate, fmt).includes("AUG"));
  ok("a reply wears its own date", R.letterDate(conv[1], voice, fmt) === `PM:${conv[1].date.slice(5, 10)}`);
  ok("the postmark says date · who", R.postmarkLine(conv[2], voice, fmt) === `PM:${conv[2].date.slice(5, 10)} · NO.${voice.other.length}`);
  ok("my letter is signed YOU", R.postmarkLine(conv[1], voice, fmt).endsWith("· ui.you"));
}

/* ── known bug 4: a deleted correspondent ── */
{
  const conv = R.readerLetters(gone);
  ok("bug 4: a ghost is UNSIGNED, never a shared No.", R.correspondentLabel(gone, fmt) === "ld.unsigned");
  ok("bug 4: their letters are signed UNSIGNED", R.signatureOf(conv[0], gone, fmt) === "ld.unsigned");
  ok("bug 4: the opening of a ghost has no date", R.postmarkLine(conv[0], gone, fmt) === "ld.unsigned");
  ok("bug 4: nothing can be written to a ghost", !R.canWriteHere(gone, "ok"));
  ok("bug 4: ch.gone where the composer was", R.closedLine(gone, "ok", t) === "ch.gone");
  ok("a gone kindred is UNSIGNED too, never their old name", R.correspondentLabel(goneKindred, fmt) === "ld.unsigned");
  ok("a gone kindred's placeholder isn't a name", R.replyPlaceholder(goneKindred, t) === "th.writeBackThem");
  ok("missing: closed in place", !R.canWriteHere(voice, "missing") && R.closedLine(voice, "missing", t) === "fail.closed.body");
  ok("offline with the letter kept: still writable", R.canWriteHere(voice, "offline") && R.closedLine(voice, "offline", t) === "");
  ok("nothing loaded: not writable, no closed line", !R.canWriteHere(null, "loading") && R.closedLine(null, "loading", t) === "");
}

/* ── names ── */
ok("a kindred is their name in capitals", R.correspondentLabel(mira, fmt) === (mira.otherName || "").toUpperCase());
ok("a pen pal is their number", R.correspondentLabel(north, fmt) === `NO.${north.other.length}`);
ok("a revealed thread's placeholder says their name", R.replyPlaceholder(mira, t) === `th.sayTo(name=${mira.otherName})`);
ok("a pen pal's placeholder: write back to them", R.replyPlaceholder(north, t) === "th.writeBackThem");

/* ── translate ── */
{
  const yes = () => true;
  const conv = R.readerLetters(voice);
  ok("translate is offered on their words", R.offersTranslate(conv[2], voice, yes));
  ok("…never on mine", !R.offersTranslate(conv[1], voice, yes));
  ok("…never on a voice card", !R.offersTranslate(conv[0], voice, yes));
  ok("…never when it reads as the reader's language", !R.offersTranslate(conv[2], voice, () => false));
  ok("the capsule code: ES→EN", R.capsuleCode("ES", "EN", false) === "ES→EN");
  ok("…turned round once translated", R.capsuleCode("ES", "EN", true) === "EN←ES");
  ok("…none when their language can't be told", R.capsuleCode(null, "EN", false) === "");
  ok("…none when it is the reader's own", R.capsuleCode("EN", "EN", false) === "");
}

/* ── the reply ── */
ok("one character can't go", !R.replyCanSend("a", false));
ok("two can", R.replyCanSend("ok", false));
ok("not while one is going", !R.replyCanSend("ok then", true));
ok("over a thousand can't go", !R.replyCanSend("x".repeat(1001), false));
ok("the hint says over the limit, in red", (() => {
  const h = R.replyHint("x".repeat(1003), false, t);
  return h.alarm && h.text === "th.over(n=3)";
})());
ok("the hint says where a pen pal's reply goes", R.replyHint("hi", false, t).text === "th.replyGoesStraight");
ok("the hint says where a kindred's words go", R.replyHint("hi", true, t).text === "th.goesStraight");
ok("the title counts letters", R.readerTitle(1, t) === "th.inThreadOne(n=1)" && R.readerTitle(4, t) === "th.inThreadMany(n=4)");
ok("a telegram is centred, a long letter is not", R.heroTier("hello").center && !R.heroTier("word ".repeat(200)).center);

/* ── large type (design-7) ── */
ok("the default size keeps one-line rows", !R.largeType(1));
ok("xxxLarge still does", !R.largeType(1.35));
ok("accessibility sizes wrap", R.largeType(1.6) && R.largeType(3.1));

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
