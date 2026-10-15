/* Behaviour lock for the conversation's rules (screens/chat/build-items), which the SwiftUI
   conversation and the React Native fallbacks both run on. Not wired to a runner; run by hand
   from the repo root with plain node (it strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/chat/build-items.test.ts
   build-items imports its pure neighbours the way Metro wants them (no extension), so a load hook
   adds ".ts" to an extensionless relative import, in this process only. Every line prints
   ok/FAIL and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const B = await import("./build-items.ts");
const { DEMO_DETAILS, DEMO_FOLDS, demoDetail, demoFolds } = await import("../../data/demo.ts");

type Msg = import("../../lib/db").ThreadMessage;
type Detail = import("../../lib/db").ThreadDetail;
type Fold = import("../../lib/folds").Fold;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

/* a t() that shows its key and vars, so every word is checked as "came from t()" */
const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(",")})` : key);
const day = (iso: string) => iso.slice(5, 10); // "10-14"
const time = (iso: string) => iso.slice(11, 16);
const NOW = Date.parse("2026-10-16T12:00:00Z");

const menuCtx = (over: Partial<import("./build-items").MenuCtx> = {}): import("./build-items").MenuCtx => ({
  t,
  isDemo: false,
  otherExists: true,
  nowMs: NOW,
  skewMs: 0,
  trans: {},
  canTranslate: () => false,
  ...over,
});

const roomCtx = (d: Detail, over: Partial<import("./build-items").RoomItemsCtx> = {}): import("./build-items").RoomItemsCtx => {
  const conv = B.conversation(d);
  return {
    ...menuCtx(),
    locale: "en-US",
    day,
    name: "Mira",
    keyOf: B.messageKey,
    photoOf: (m) => (m.meta?.url ? { uri: m.meta.url, key: m.meta.url } : null),
    voice: null,
    messages: d.messages,
    songsCount: d.messages.filter((m) => m.kind === "song").length,
    lastMessage: conv[conv.length - 1] ?? null,
    ...over,
  };
};

const actKeys = (a: { key: string }[]) => a.map((x) => x.key).join(",");

/* ── the stream ── */
{
  const d = demoDetail("demo-mira")!;
  const conv = B.conversation(d);
  ok("conversation starts with the opening (no id, no date)", B.isOpening(conv[0]) && conv[0].body === d.opening);
  ok("conversation keeps every message", conv.length === d.messages.length + 1);
  const stream = B.roomStream(conv, demoFolds("demo-mira"));
  ok("an answered fold renders once (3 root folds of 4)", stream.filter((s) => s.type === "fold").length === 3);
  ok("the opening sorts first", stream[0].type === "msg" && B.isOpening(stream[0].msg));
  const dates = stream.map((s) => s.date).filter(Boolean);
  ok("the stream is in time order", dates.every((x, i) => i === 0 || dates[i - 1] <= x));
  const answered = stream.find((s) => s.type === "fold" && s.fold.id === "df-3");
  ok("the answer rides on its opener", !!answered && answered.type === "fold" && answered.answer?.id === "df-4");
  const voiceOnly: Detail = { ...d, opening: "", openingMedia: "demo/voice.m4a" };
  ok("a voice opening without a caption still opens the thread", B.isOpening(B.conversation(voiceOnly)[0]));
  ok("a words opening without words is left out", !B.conversation({ ...d, opening: "" }).some(B.isOpening));
}

/* ── keys ── */
{
  ok("message key is the id", B.messageKey({ id: "m1", body: "x", mine: true, date: "2026-10-01T00:00:00Z" }) === "m1");
  ok("the opening's key", B.messageKey({ body: "x", mine: false, date: "" }) === "opening");
  ok("an unsent line keys by date and words", B.messageKey({ body: "hello there", mine: true, date: "2026-10-01T00:00:00Z" }) === "2026-10-01T00:00:00Z|hello there");
  ok("bare song", B.isBareSong(" https://open.spotify.com/track/abc ") && !B.isBareSong("listen https://open.spotify.com/track/abc") && !B.isBareSong("https://example.com/x"));
  ok("song host", B.songHost("https://open.spotify.com/track/x") === "open.spotify.com");
}

/* ── menus ── */
{
  const theirs: Msg = { id: "t1", body: "hola amigo", mine: false, date: "2026-10-15T10:00:00Z" };
  const c = menuCtx({ canTranslate: (b) => b.startsWith("hola") });
  ok("theirs: reply, copy, translate, keep, report", actKeys(B.lineMenu(theirs, "t1", c)) === "reply,copy,translate,keep,report");
  ok("theirs with the translation shown offers the original", actKeys(B.lineMenu(theirs, "t1", { ...c, trans: { t1: { text: "hi", shown: true } } })).includes("original"));
  ok("report needs someone on the other side", !actKeys(B.lineMenu(theirs, "t1", { ...c, otherExists: false })).includes("report"));
  ok("report never on a demo row", !actKeys(B.lineMenu(theirs, "t1", { ...c, isDemo: true })).includes("report"));
  ok("report is destructive", B.lineMenu(theirs, "t1", c).find((a) => a.key === "report")?.destructive === true);
  const opening: Msg = { body: "the opening", mine: false, date: "" };
  ok("the opening: copy and keep only (no id: no reply, no report)", actKeys(B.lineMenu(opening, "opening", menuCtx())) === "copy,keep");
  const fresh: Msg = { id: "m1", body: "mine", mine: true, date: new Date(NOW - 60_000).toISOString() };
  ok("mine inside two minutes: take back", actKeys(B.lineMenu(fresh, "m1", menuCtx())) === "reply,copy,takeBack");
  const old: Msg = { ...fresh, date: new Date(NOW - 3 * 60_000).toISOString() };
  ok("mine after two minutes: no take back", actKeys(B.lineMenu(old, "m1", menuCtx())) === "reply,copy");
  ok("the server's clock decides (skew)", actKeys(B.lineMenu(fresh, "m1", menuCtx({ skewMs: 90_000 }))) === "reply,copy");
  ok("an unsent line can't be taken back or replied to", actKeys(B.lineMenu({ ...fresh, id: undefined }, "k", menuCtx())) === "copy");
  ok("a line taken back has no menu", B.lineMenu({ ...theirs, recalledAt: "x" }, "t1", c).length === 0);
  ok("next take-back close is when the window ends", (() => {
    const n = B.nextTakeBackClose([fresh, old], NOW, 0);
    return n !== null && n >= 60_000 && n <= 60_100;
  })());
  ok("no open take-back: no timer", B.nextTakeBackClose([old], NOW, 0) === null);
  const photo: Msg = { id: "p1", body: "a tiny moment", mine: false, date: "2026-10-15T10:00:00Z", kind: "photo", mediaPath: "a/b.jpg" };
  ok("photo: reply, report", actKeys(B.photoMenu(photo, menuCtx())) === "reply,report");
  ok("my photo: reply only", actKeys(B.photoMenu({ ...photo, mine: true }, menuCtx())) === "reply");
  const song: Msg = { id: "s1", body: "x — https://youtu.be/a", mine: false, date: "2026-10-15T10:00:00Z", kind: "song", meta: { url: "https://youtu.be/a" } };
  ok("song: reply, copy link, shelf, report", actKeys(B.songMenu(song, menuCtx())) === "reply,copyLink,shelf,report");
  const half: Fold = { id: "f2", mine: false, kind: "note", prompt: null, parentId: "f1", body: "bonjour", date: "2026-10-15T10:00:00Z" };
  ok("their fold half: copy, translate, keep, report", actKeys(B.foldHalfMenu(half, menuCtx({ canTranslate: () => true }))) === "copy,translate,keep,report");
  ok("a fold half's translation is keyed by half:<id>", actKeys(B.foldHalfMenu(half, menuCtx({ trans: { "half:f2": { text: "hi", shown: true } } }))).includes("original"));
  ok("my fold half: copy only", actKeys(B.foldHalfMenu({ ...half, mine: true }, menuCtx())) === "copy");
  ok("letters theirs: copy, translate, report — no reply, no take back", actKeys(B.letterMenu(theirs, "t1", c)) === "copy,translate,report");
  ok("letters mine: copy", actKeys(B.letterMenu({ ...fresh }, "m1", menuCtx())) === "copy");
}

/* ── room rows (demo-juno has every kind) ── */
{
  const d = demoDetail("demo-juno")!;
  const conv = B.conversation(d);
  const stream = B.roomStream(conv, demoFolds("demo-juno"));
  const items = B.buildRoomItems(stream, roomCtx(d, { name: "Juno" }));
  const kinds = new Set(items.map((i) => i.kind));
  for (const k of ["line", "photo", "song", "fold", "recalled"]) ok(`demo-juno draws a ${k}`, kinds.has(k as never));
  ok("keys are unique", new Set(items.map((i) => i.key)).size === items.length);
  ok("the opening has no day rule", items[0].key === "opening" && items[0].dayLabel === "");
  const firstDated = items.find((i) => i.ownDay);
  ok("the first dated row carries its day rule", !!firstDated && firstDated.dayLabel === firstDated.ownDay);
  const q = items.find((i) => i.key === "demo-juno-4");
  ok("a reply carries its quote, speaker in capitals", q?.quote?.speaker === "JUNO" && q.quote.target === "demo-juno-1" && !q.quote.gone);
  const gone = items.find((i) => i.key === "demo-juno-11");
  ok("a quote of a line taken back reads 'taken back'", gone?.quote?.gone === true && gone.quote.excerpt === "mm.quoteGone");
  const mine = items.find((i) => i.key === "demo-juno-9");
  ok("a quote of my own line says You", mine?.quote?.speaker === "MM.YOU");
  const rec = items.filter((i) => i.kind === "recalled");
  ok("taken back: the note on its side", rec.length === 2 && rec.some((r) => r.mine && r.body === "rm.recall.mine") && rec.some((r) => !r.mine && r.body === "rm.recall.theirs(name=Juno)"));
  ok("a recalled row has no menu", rec.every((r) => r.menu.length === 0));
  const songs = items.filter((i) => i.kind === "song");
  ok("songs: title and host", songs[0]?.songTitle === "Pink Moon" && songs[0].songHost === "open.spotify.com");
  ok("the shelf link sits under the last message only when it is a song", songs.every((s) => s.shelfLink === ""));
  const photo = items.find((i) => i.kind === "photo");
  ok("a photo carries its picture and its menu", !!photo?.photo && photo.menu.some((a) => a.key === "reply"));
  const folds = items.filter((i) => i.kind === "fold");
  ok("folds: sealed, waiting, open", ["sealed", "waiting", "open"].every((s) => folds.some((f) => f.fold?.state === s)));
  const open = folds.find((f) => f.fold?.state === "open");
  ok("an opened fold has two halves keyed half:<id>", open?.fold?.halves.length === 2 && open.fold.halves.every((h) => h.key.startsWith("half:")));
  const sealedQ = folds.find((f) => f.fold?.state === "sealed" && f.fold.prompt);
  ok("their sealed question: the prompt, ANSWER TO OPEN", sealedQ?.fold?.answerKey === "rm.fold.answerKey" && sealedQ.fold.hint === "rm.fold.answerToOpen");
  ok("folds keep 14 above them", folds.every((f) => f.gap === 14));
  const line = items.find((i) => i.kind === "line" && i.key === "demo-juno-2");
  ok("VoiceOver hears whose, the words and the day", !!line && line.a11yLabel.startsWith("mm.you, let it in") && line.a11yLabel.endsWith(line.ownDay));

  // the shelf link moves to the last message when it is a song
  const withLastSong: Detail = { ...d, messages: [...d.messages, { id: "zz", body: "x — https://youtu.be/z", mine: true, date: "2026-10-16T11:00:00Z", kind: "song", meta: { url: "https://youtu.be/z", title: "Z" } }] };
  const conv2 = B.conversation(withLastSong);
  const items2 = B.buildRoomItems(B.roomStream(conv2, demoFolds("demo-juno")), roomCtx(withLastSong, { name: "Juno" }));
  ok("the shelf link under the last song", items2.find((i) => i.key === "zz")?.shelfLink === "rm.shelf.open(n=3)");
  // a translation in flight and shown
  const items3 = B.buildRoomItems(stream, roomCtx(d, { name: "Juno", trans: { "demo-juno-1": { shown: false, busy: true }, "demo-juno-12": { text: "the fridge", shown: true } } }));
  ok("translating…", items3.find((i) => i.key === "demo-juno-1")?.translation === "busy");
  ok("a translation shown", items3.find((i) => i.key === "demo-juno-12")?.translationText === "the fridge");
}

/* ── the voice opening (known bug 2) ── */
{
  const d = demoDetail("demo-voice")!;
  const conv = B.conversation(d);
  const voice = { key: "voice:opening", duration: "1:14" };
  const room = B.buildRoomItems(B.roomStream(conv, []), roomCtx(d, { voice }));
  ok("room: the opening is a voice card even with replies after it", room[0].kind === "voice" && room[0].voiceKey === "voice:opening" && room[0].voiceDuration === "1:14");
  const letters = B.buildLetterItems(conv, { ...roomCtx(d), time, voice });
  ok("letters: the opening is a voice card too", letters[0].kind === "voice" && letters[0].speakerLabel !== "");
  ok("words openings stay words", B.buildRoomItems(B.roomStream(conv, []), roomCtx(d))[0].kind === "line");
}

/* ── letters ── */
{
  const d = demoDetail("demo-north")!;
  const conv = B.conversation(d);
  const items = B.buildLetterItems(conv, { ...roomCtx(d, { name: "No. 4481" }), time });
  ok("every letter opens the reader", items.every((i) => i.kind !== "letter" || i.tappable));
  ok("the first letter is labelled", items[0].speakerLabel === "NO. 4481");
  ok("a label when the writer changes", items[1].speakerLabel.startsWith("ui.you"));
  ok("letters carry their time", items[1].timeLabel !== "" && items[0].timeLabel === "");
  ok("letters have no day rules (the label carries the day)", items.every((i) => i.dayLabel === ""));
  ok("letters menus never reply or take back", items.every((i) => !i.menu.some((a) => a.key === "reply" || a.key === "takeBack")));
}

/* ── the render window ── */
{
  const d = demoDetail("demo-long")!;
  const conv = B.conversation(d);
  const built = B.buildRoomItems(B.roomStream(conv, []), roomCtx(d, { name: "Tamsin" }));
  ok("the 300-message room builds 301 rows", built.length === 301);
  const w = B.windowItems(built, built.length - 80, built.length, "room");
  ok("a window of 80", w.length === 80);
  ok("the window's first row gets its day rule", w[0].dayLabel !== "" && w[0].gap === 0);
  ok("the rest keep theirs", w.slice(1).every((x, i) => x === (({ ownDay, ownLabel, ...r }) => r)(built[built.length - 79 + i]) || x.key === built[built.length - 79 + i].key));
  ok("window rows carry no builder fields", !("ownDay" in w[1]));
  const quoted = built.findIndex((b) => b.key === "demo-long-118");
  ok("a quote's target is found for the window to widen", B.indexOfKey(built, "demo-long-118") === quoted && quoted > 0);
  const juno = demoDetail("demo-juno")!;
  const jb = B.buildRoomItems(B.roomStream(B.conversation(juno), demoFolds("demo-juno")), roomCtx(juno));
  ok("a fold half's key finds its fold", jb[B.indexOfKey(jb, "half:dj-5")]?.key === "fold:dj-4");
  const letters = B.buildLetterItems(conv, { ...roomCtx(d), time });
  const lw = B.windowItems(letters, 100, 180, "letters");
  ok("a letters window labels its first block", lw[0].speakerLabel !== "");
}

/* ── the dock ── */
{
  const base: import("./build-items").RoomDockInput = {
    t,
    locale: "en-US",
    wren: "Wren",
    name: "Mira",
    closing: false,
    daysLeft: 9,
    mode: null,
    replyTo: null,
    notice: null,
    gone: false,
    expired: false,
    quietDays: 0,
  };
  const plain = B.buildRoomDock(base);
  ok("room dock: the composer, its tools and four traces", plain.terminal === "none" && plain.wrenToolLabel === "rm.seed.a11y(wren=Wren)" && plain.traces.length === 4);
  ok("room placeholder", plain.placeholder === "rm.ph" && plain.sendLabel === "ld.send");
  const closing = B.buildRoomDock({ ...base, closing: true, daysLeft: 3 });
  ok("closing soon: the line and its link", closing.closingText === "rm.closing.days(n=3)" && closing.closingLink === "rm.closing.fc");
  ok("closing on its last day", B.buildRoomDock({ ...base, closing: true, daysLeft: 1 }).closingText === "rm.closing.day");
  ok("no closing line while a fold is written", B.buildRoomDock({ ...base, closing: true, mode: { kind: "note" } }).closingText === "");
  ok("the closing line stays in song mode", B.buildRoomDock({ ...base, closing: true, mode: { kind: "song" } }).closingText !== "");
  const reply = B.buildRoomDock({ ...base, replyTo: { quote: { id: "x", excerpt: "the box", sender: "demo" }, mine: false } });
  ok("replying to them", reply.replyLabel === "MM.REPLYINGTO(NAME=MIRA)" && reply.replyExcerpt === "the box");
  ok("replying to myself", B.buildRoomDock({ ...base, replyTo: { quote: { id: "x", excerpt: "e" }, mine: true } }).replyLabel === "MM.REPLYINGSELF");
  ok("no reply quote while a mode is set", B.buildRoomDock({ ...base, mode: { kind: "note" }, replyTo: { quote: { id: "x", excerpt: "e" }, mine: true } }).replyLabel === "");
  const ask = B.buildRoomDock({ ...base, mode: { kind: "question", prompt: "" } });
  ok("ask: the prompt field and its placeholder", ask.mode?.showsPrompt === true && ask.mode.promptPlaceholder === "rm.mode.promptPh" && ask.placeholder === "rm.mode.answerPh");
  const fold: Fold = { id: "f", mine: false, kind: "question", prompt: "what at nine?", parentId: null, body: null, date: "x" };
  const answer = B.buildRoomDock({ ...base, mode: { kind: "answer", fold } });
  ok("answering: the prompt read-only", answer.mode?.showsPrompt === false && answer.mode.promptText === "what at nine?" && answer.mode.title === "rm.mode.answerQ");
  ok("song mode: no capitals", B.buildRoomDock({ ...base, mode: { kind: "song" } }).autocapitalize === false);
  const gone = B.buildRoomDock({ ...base, gone: true, mode: { kind: "note" } });
  ok("gone: the gone line, no tray, no mode", gone.terminal === "gone" && gone.traces.length === 0 && gone.mode === null && gone.goneText === "ch.gone");
  const expired = B.buildRoomDock({ ...base, expired: true, quietDays: 31 });
  ok("expired: REKINDLE", expired.terminal === "expired" && expired.expiredLabel === "kd.expiredRow(n=31)" && expired.expiredButton === "rm.rekindle" && expired.traces.length === 0);
  ok("gone beats expired", B.buildRoomDock({ ...base, gone: true, expired: true }).terminal === "gone");
  const missing = B.buildRoomDock({ ...base, missing: true });
  ok("missing: closed in place, the ambiguous words, no tray", missing.terminal === "gone" && missing.goneText === "fail.closed.body" && missing.traces.length === 0);
  const notice = B.buildRoomDock({ ...base, notice: { line: "you both said lantern", evidence: "2 · 1", word: "lantern" } });
  ok("Wren's notice: her name in capitals", notice.notice?.label === "rm.noticed(wren=WREN)" && notice.notice.word === "lantern");

  const letters: import("./build-items").LettersDockInput = { t, name: "No. 4481", revealed: false, gone: false, myCount: 2, iSigned: false, theirSigned: false };
  ok("no door before five", B.buildLettersDock(letters).signDoor === "none");
  ok("the door at five", B.buildLettersDock({ ...letters, myCount: 5 }).signDoor === "offer");
  ok("they went first: gold", B.buildLettersDock({ ...letters, myCount: 5, theirSigned: true }).signLabel === "ch.theyFirst");
  ok("I went first: waiting", B.buildLettersDock({ ...letters, myCount: 5, iSigned: true, theirSigned: true }).signDoor === "waiting");
  ok("no door on a gone thread", B.buildLettersDock({ ...letters, myCount: 5, gone: true }).signDoor === "none");
  ok("no door once revealed", B.buildLettersDock({ ...letters, myCount: 7, revealed: true }).signDoor === "none");
  ok("letters placeholder before and after names", B.buildLettersDock(letters).placeholder === "ch.ph" && B.buildLettersDock({ ...letters, revealed: true, name: "Mira" }).placeholder === "th.sayTo(name=Mira)");
  ok("letters: no tools, no tray", B.buildLettersDock(letters).wrenToolLabel === "" && B.buildLettersDock(letters).traces.length === 0);
  const lMissing = B.buildLettersDock({ ...letters, myCount: 5, missing: true });
  ok("letters missing: closed in place, no door", lMissing.terminal === "gone" && lMissing.goneText === "fail.closed.body" && lMissing.signDoor === "none");
  ok("letters gone: ch.gone", B.buildLettersDock({ ...letters, gone: true }).goneText === "ch.gone");
}

/* ── the composer ── */
{
  const c = (text: string, mode: import("./build-items").RoomMode | null = null, prompt = "", sending = false, slow = false) => B.roomComposer({ t, text, prompt, mode, sending, slow });
  ok("one letter can't go", !c("a").canSend);
  ok("'ok' goes, and clears itself", c("ok").canSend && c("ok").clearOnSend);
  ok("nothing goes while sending", !c("hello", null, "", true).canSend);
  const long = "word ".repeat(260);
  const over = c(long);
  ok("over the limit: refused, red, counted", !over.canSend && over.statusAlarm && over.status.startsWith("ui.overLimit"));
  ok("a bare song link doesn't clear itself (it waits for its title)", c("https://open.spotify.com/track/abc").canSend && !c("https://open.spotify.com/track/abc").clearOnSend);
  ok("a fold needs words", !c("  ", { kind: "note" }).canSend && c("i almost moved", { kind: "note" }).canSend);
  ok("a fold never clears itself", !c("i almost moved", { kind: "note" }).clearOnSend);
  const fold601 = "x".repeat(601);
  ok("a fold over 600 is refused visibly, not cut", !c(fold601, { kind: "note" }).canSend && c(fold601, { kind: "note" }).status === "ui.overLimit(n=1)");
  ok("a fold of exactly 600 goes", c("x".repeat(600), { kind: "note" }).canSend);
  ok("a question needs its prompt", !c("mine", { kind: "question", prompt: "" }, "").canSend && c("mine", { kind: "question", prompt: "" }, "why?").canSend);
  ok("song mode needs words", !c("", { kind: "song" }).canSend && c("x", { kind: "song" }).canSend);
  ok("a slow network says so, quietly", c("hello", null, "", true, true).status === "net.slow" && !c("hello", null, "", true, true).statusAlarm);
  ok("offline with nothing kept says so, quietly", B.roomComposer({ t, text: "", prompt: "", mode: null, sending: false, slow: false, offline: true }).status === "net.offline.title");
  ok("over the limit beats offline", B.roomComposer({ t, text: "word ".repeat(260), prompt: "", mode: null, sending: false, slow: false, offline: true }).statusAlarm);
  ok("slow beats offline", B.lettersComposer({ t, text: "x", sending: true, slow: true, offline: true }).status === "net.slow");
  const l = B.lettersComposer({ t, text: "dear stranger", sending: false, slow: false });
  ok("a letter goes and clears itself", l.canSend && l.clearOnSend && l.status === "");
}

/* ── band, road, clock ── */
{
  ok("band: both owe", B.bandFacts(2, 3, t).line === "ch.band.both(a=3,b=2)");
  ok("band: my five are in", B.bandFacts(5, 3, t).line === "ch.band.youDone(n=2)");
  ok("band: theirs are in", B.bandFacts(2, 7, t).line === "ch.band.theyDone(n=3)" && B.bandFacts(2, 7, t).them === 5);
  ok("band: names", B.bandFacts(5, 5, t).named && B.bandFacts(5, 5, t).line === "ch.band.names");
  const d = DEMO_DETAILS["demo-blackberry"];
  const road = B.roadOf(d.messages);
  ok("the road: five each way", road.filter((m) => m.mine).length === 5 && road.filter((m) => !m.mine).length === 5);
  ok("last word: the newest message", B.lastWordAt(d, NOW) === Math.max(...d.messages.map((m) => Date.parse(m.date))));
  ok("last word with no messages: the day it opened", B.lastWordAt({ ...d, messages: [] }, NOW) === Date.parse(d.since!));
  ok("last word with nothing known: now", B.lastWordAt(null, NOW) === NOW);
}

/* ── every demo thread builds ── */
{
  let all = true;
  for (const id of Object.keys(DEMO_DETAILS)) {
    try {
      const d = demoDetail(id)!;
      const conv = B.conversation(d);
      B.buildRoomItems(B.roomStream(conv, DEMO_FOLDS[id] ?? []), roomCtx(d));
      B.buildLetterItems(conv, { ...roomCtx(d), time });
    } catch (e) {
      all = false;
      console.log("  threw on", id, e);
    }
  }
  ok("every demo fixture builds in both variants", all);
  ok("the window constants follow the bench", B.CHAT_WINDOW.initial === 80 && B.CHAT_WINDOW.step === 80 && B.CHAT_WINDOW.max === 160);
}

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
