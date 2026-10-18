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
const { whoBook } = await import("../../lib/stranger-who.ts");
const { strangerName } = await import("../../lib/stranger-name.ts");
const { frostSpec } = await import("../../lib/frost.ts");
const { developFor, mosaicMask } = await import("../../lib/mosaic.ts");
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
  canWrite: true,
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

  // readable, not actionable (owner): a gone, missing or expired room offers nothing that writes
  const shut = menuCtx({ canWrite: false, canTranslate: (b) => b.startsWith("hola") });
  ok("a closed room: their line keeps copy, translate, keep, report — no reply", actKeys(B.lineMenu(theirs, "t1", shut)) === "copy,translate,keep,report");
  ok("a closed room: my fresh line keeps take back, loses reply", actKeys(B.lineMenu(fresh, "m1", { ...shut, canTranslate: () => false })) === "copy,takeBack");
  ok("a closed room: a photo keeps report, loses reply", actKeys(B.photoMenu(photo, shut)) === "report");
  ok("a closed room: a song keeps copy link and the shelf, loses reply", actKeys(B.songMenu(song, shut)) === "copyLink,shelf,report");
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
  const shutItems = B.buildRoomItems(stream, roomCtx(d, { name: "Juno", canWrite: false }));
  const shutSealed = shutItems.filter((i) => i.fold?.state === "sealed");
  ok("a closed room: sealed folds keep their prompt, lose the hint and ANSWER TO OPEN", shutSealed.length > 0 && shutSealed.every((f) => f.fold?.answerKey === "" && f.fold.hint === ""));
  ok("a closed room: no row offers reply", shutItems.every((i) => !i.menu.some((a) => a.key === "reply")));
  ok("a closed room: a waiting fold still says it waits", shutItems.some((i) => i.fold?.state === "waiting" && i.fold.hint !== ""));
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

  // the caption keeps what the opening letter had (copy, translate, keep; the reader in letters)
  const captioned: Detail = { ...d, opening: "hola, a voice from the bus", openingFromMe: false };
  const cConv = B.conversation(captioned);
  const tr = { canTranslate: (b: string) => b.startsWith("hola") };
  const roomVoice = B.buildRoomItems(B.roomStream(cConv, []), roomCtx(captioned, { voice, name: "Mira", ...tr }))[0];
  ok("room voice: the caption's menu is copy, translate, keep (no id: no reply, no report)", roomVoice.kind === "voice" && actKeys(roomVoice.menu) === "copy,translate,keep");
  ok("room voice: VoiceOver hears whose it is", roomVoice.a11yLabel.startsWith("Mira, hola"));
  const shown = B.buildRoomItems(B.roomStream(cConv, []), roomCtx(captioned, { voice, trans: { opening: { text: "hi, a voice", shown: true } } }))[0];
  ok("room voice: the caption's translation shows under it", shown.translation === "shown" && shown.translationText === "hi, a voice" && shown.menu.some((a) => a.key === "original"));
  const lettersVoice = B.buildLetterItems(cConv, { ...roomCtx(captioned, { name: "No. 4481", ...tr }), time, voice })[0];
  ok("letters voice: opens the reader, the letter's menu", lettersVoice.tappable && actKeys(lettersVoice.menu) === "copy,translate");
  ok("letters voice: VoiceOver hears whose it is", lettersVoice.a11yLabel.startsWith("No. 4481, hola"));
  const bare = B.buildRoomItems(B.roomStream(B.conversation({ ...d, opening: "" }), []), roomCtx(d, { voice }))[0];
  ok("a voice opening without a caption has no menu", bare.kind === "voice" && bare.menu.length === 0);
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
  ok("the React Native blocks have no head line", items.every((i) => i.head === ""));

  // the SwiftUI cards (chat composers A2)
  const cards = B.buildLetterItems(conv, { ...roomCtx(d, { name: "No. 4481" }), time, cards: true });
  ok("cards: same rows, same keys", cards.length === items.length && cards.every((c, i) => c.key === items[i].key));
  ok("cards: no label line", cards.every((c) => c.speakerLabel === ""));
  ok("cards: the opening is where it began", cards[0].head === "KD.WHEREBEGAN · NO. 4481");
  const own = (mine: boolean) => cards.filter((c, i) => i > 0 && conv[i].mine === mine);
  ok("cards: mine count 1, 2, 3… from the first after the opening", own(true).every((c, k) => c.head === `CH.CARD.HEAD(N=${k + 1},WHO=UI.YOU)`));
  ok("cards: theirs count on their own", own(false).every((c, k) => c.head === `CH.CARD.HEAD(N=${k + 1},WHO=NO. 4481)`));
  ok("cards: the last of five each way is LETTER 5", own(true).length === 5 && own(true)[4].head.includes("N=5") && own(false)[4].head.includes("N=5"));
  const days = cards.filter((c) => c.dayLabel !== "").map((c) => c.dayLabel);
  ok("cards: a day rule on the first letter of each day, never twice", days.length > 0 && new Set(days).size === days.length && cards[0].dayLabel === "");
  ok("cards: the time stays at the foot", cards.slice(1).every((c, i) => c.timeLabel === items[i + 1].timeLabel));
  const cw = B.windowItems(cards, 4, cards.length, "letters");
  ok("cards: a window's first letter says its day", cw[0].dayLabel !== "" && cw[0].speakerLabel === "");
  // identity on: the card heads name the courier name (the hook passes who.name), in capitals
  const named = B.buildLetterItems(conv, { ...roomCtx(d, { name: "Sunday Kite" }), time, cards: true });
  ok("identity on: the opening is WHERE IT BEGAN · the courier name", named[0].head === "KD.WHEREBEGAN · SUNDAY KITE");
  ok("identity on: their letters are LETTER n · the courier name", named.filter((c, i) => i > 0 && !conv[i].mine).every((c, k) => c.head === `CH.CARD.HEAD(N=${k + 1},WHO=SUNDAY KITE)`));
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
  const replying = { replyTo: { quote: { id: "x", excerpt: "the box" }, mine: false } };
  ok("no reply quote over the gone line", B.buildRoomDock({ ...base, ...replying, gone: true }).replyLabel === "" && B.buildRoomDock({ ...base, ...replying, gone: true }).replyExcerpt === "");
  ok("no reply quote over the expired card", B.buildRoomDock({ ...base, ...replying, expired: true }).replyLabel === "");
  ok("no reply quote in a missing room", B.buildRoomDock({ ...base, ...replying, missing: true }).replyLabel === "");
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
  ok("letters placeholder before and after names: write back…, then a person", B.buildLettersDock(letters).placeholder === "ld.writeBackPh" && B.buildLettersDock({ ...letters, revealed: true, name: "Mira" }).placeholder === "th.sayTo(name=Mira)");
  ok("identity off: the letters dock is exactly today's", JSON.stringify(B.buildLettersDock({ ...letters, identity: false })) === JSON.stringify(B.buildLettersDock(letters)));
  ok("identity on: the reply bar is addressed to the courier name, as the desk's is", B.buildLettersDock({ ...letters, identity: true, name: "Sunday Kite" }).placeholder === "id.writeBackTo(name=Sunday Kite)");
  ok("identity off: the reply bar keeps its own write back, whatever the language has", B.buildLettersDock({ ...letters, identity: false, name: "No. 4481", has: () => true }).placeholder === "ld.writeBackPh");
  ok("identity on: a gone or missing thread just says write back; names traded, a person", B.buildLettersDock({ ...letters, identity: true, name: "ld.unsigned", gone: true }).placeholder === "ld.writeBackPh" && B.buildLettersDock({ ...letters, identity: true, missing: true }).placeholder === "ld.writeBackPh" && B.buildLettersDock({ ...letters, identity: true, revealed: true, name: "Mira" }).placeholder === "th.sayTo(name=Mira)");
  ok("the reply bar's emoji key is named", B.buildLettersDock(letters).emojiLabel === "cmp.emoji" && B.buildRoomDock(base).emojiLabel === "cmp.emoji");
  // the reply bar's hint (A2): the letter being written
  const hint = (over: Partial<import("./build-items").LettersDockInput>) => B.buildLettersDock({ ...letters, locale: "en-US", ...over }).hint;
  ok("hint: the letter you are writing is your count + 1", hint({ myCount: 0 }) === "CH.HINT.LETTER(N=1)" && hint({ myCount: 2 }) === "CH.HINT.LETTER(N=3)");
  ok("hint: your fifth says one more and names", hint({ myCount: 4 }) === "CH.HINT.NAMES(N=5)");
  ok("hint: your five in, it says what still moves names, never a sixth of five", hint({ myCount: 5, otherCount: 3 }) === "CH.BAND.YOUDONE(N=2)" && hint({ myCount: 6, otherCount: 5 }) === "CH.BAND.NAMES");
  ok("hint: none once revealed, gone or missing", hint({ revealed: true }) === "" && hint({ gone: true }) === "" && hint({ missing: true }) === "");
  ok("a room has no reply-bar hint", B.buildRoomDock(base).hint === "");
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

/* ── the pen-pal header (A2) ── */
{
  const st = (kind: import("../../lib/thread-state").ThreadStateKind, toneKey: "ind" | "brass" | "mute" = "mute") => ({ kind, toneKey, label: `state.${kind}` });
  const base: import("./build-items").LettersHeaderInput = {
    t,
    locale: "en-US",
    name: "No. 4481",
    other: "user-4481",
    myCount: 3,
    otherCount: 2,
    theirSigned: false,
    state: st("theirTurn"),
    canOpenPage: false,
    canReport: true,
  };
  const h = B.lettersHeader(base);
  ok("header: their letter owed is theirs, counted on theirs", h.sub === "CH.HEAD.THEIRS(N=3)" && h.tone === "mute");
  ok("header: your letter owed is yours, counted on yours", B.lettersHeader({ ...base, state: st("yourTurn", "ind"), myCount: 2, otherCount: 3 }).sub === "CH.HEAD.YOURS(N=3)");
  ok("header: the dots are the exchanges both ways", h.dots === 2 && B.lettersHeader({ ...base, myCount: 7, otherCount: 9 }).dots === 5);
  ok("header: once their five are in, the band's line", B.lettersHeader({ ...base, myCount: 3, otherCount: 5 }).sub === "CH.BAND.THEYDONE(N=2)");
  ok("header: past the letters, the state in its tone", B.lettersHeader({ ...base, myCount: 5, otherCount: 5, state: st("theyWentFirst", "brass") }).sub === "STATE.THEYWENTFIRST" && B.lettersHeader({ ...base, state: st("theyWentFirst", "brass") }).tone === "brass");
  ok("header: a gone pen pal wears the veil and says so", (() => { const g = B.lettersHeader({ ...base, other: null, state: st("gone") }); return g.veil && g.mask === 0 && g.frame === "none" && g.sub === "STATE.GONE"; })());
  ok("header: the face is FACE v1 with their letters' develop", h.mask > 0 && !h.veil && h.frame === "none");
  ok("header: a face that came through is framed, brass once they went first", B.lettersHeader({ ...base, otherCount: 5 }).frame === "line" && B.lettersHeader({ ...base, otherCount: 5, theirSigned: true }).frame === "brass");
  ok("header: VoiceOver hears name, line and dots as one", h.a11yLabel === "No. 4481, CH.HEAD.THEIRS(N=3), mk.ofFive(n=2)");
  ok("header: the ⋯ only with someone to report; back is named", h.moreLabel === "rp.menu.a11y" && B.lettersHeader({ ...base, canReport: false }).moreLabel === "" && h.backLabel === "a11y.back");
  ok("header: loading says nothing under the name", B.lettersHeader({ ...base, state: null }).sub === "");
  ok("header: the pen-pal chat's is not the room's, and draws no picture face", !h.room && h.face.kind === "placeholder");

  /* who they are, from the shared book (lib/stranger-who). SWITCH OFF: today's header, exactly */
  const penPal = (u: string | null | undefined, o: { upper?: boolean; compact?: boolean }) => (u ? (o.upper ? "NO. 4481" : "No. 4481") : "ld.unsigned");
  const offBook = whoBook({ identity: false, t, lang: "en", penPal, marks: () => ({ mark: "he", sign: "leo" }) });
  const offWho = offBook.who("user-4481", { develop: developFor(2) });
  ok("identity off: the header with the book's who is exactly the header without", JSON.stringify(B.lettersHeader({ ...base, who: offWho })) === JSON.stringify(h));
  ok("identity off: no frost, no mark, no sign", h.frost === null && h.mark === null && h.sign === null && offWho.face.kind === "mosaic" && offWho.face.mask === h.mask);
  /* SWITCH ON */
  const onBook = whoBook({ identity: true, t, lang: "en", penPal, marks: (u) => (u === "user-4481" ? { mark: "he", sign: "leo" } : { mark: null, sign: null }) });
  const onWho = onBook.who("user-4481", { develop: developFor(2) });
  const courier = strangerName("user-4481", { lang: "en", unsigned: "" });
  const hOn = B.lettersHeader({ ...base, name: onWho.name, who: onWho });
  ok("identity on: the header names the courier name", hOn.name === courier && onWho.name === courier);
  ok("identity on: the frosted window in the face slot, the mark and the sign after the name", JSON.stringify(hOn.frost) === JSON.stringify(frostSpec("user-4481", false)) && hOn.mark === "he" && hOn.sign === "leo");
  ok("identity on: VoiceOver hears name, mark and sign, the line, the dots", hOn.a11yLabel === `${courier}, id.mark.he, zd.leo, CH.HEAD.THEIRS(N=3), mk.ofFive(n=2)`);
  ok("identity on: the line, the dots and the frame don't change", hOn.sub === h.sub && hOn.dots === h.dots && hOn.frame === h.frame && hOn.tone === h.tone);
  const gOn = B.lettersHeader({ ...base, other: null, name: onBook.name(null), who: onBook.who(null), state: st("gone") });
  ok("identity on: a gone pen pal is UNSIGNED behind the veil, no frost, no mark", gOn.veil && gOn.frost === null && gOn.mark === null && gOn.sign === null && gOn.name === "ld.unsigned");
  ok("identity on: the room's header has no window and no mark", (() => { const r = B.roomHeader({ t, locale: "en-US", name: "Mira", sub: "", face: B.NO_FACE, canReport: true }); return r.frost === null && r.mark === null && r.sign === null; })());
  ok("identity: mosaicMask is still today's face for the off header", h.mask === mosaicMask("user-4481", developFor(2)));
}

/* ── the kindreds chat (chat composers B) ── */
{
  const portrait = { kind: "image" as const, uri: "file:///f-cloud.png", key: "a:f-cloud", overscan: 0.05, mask: 0 };
  const rh = B.roomHeader({ t, locale: "en-US", name: "Mira", sub: "kindred since October 8", face: portrait, canReport: true });
  ok("room header: the round face and no dots", rh.room && rh.face === portrait && rh.dots === 0 && !rh.veil);
  ok("room header: the line under the name in capitals, in mute", rh.sub === "KINDRED SINCE OCTOBER 8" && rh.tone === "mute");
  ok("room header: VoiceOver hears name and line; the page opens", rh.a11yLabel === "Mira, KINDRED SINCE OCTOBER 8" && rh.canOpenPage);
  ok("room header: the ⋯ only with someone to report; back is named", rh.moreLabel === "rp.menu.a11y" && rh.backLabel === "a11y.back" && B.roomHeader({ t, locale: "en-US", name: "Mira", sub: "", face: B.NO_FACE, canReport: false }).moreLabel === "");
  ok("room header: no line, no line", B.roomHeader({ t, locale: "en-US", name: "Mira", sub: "", face: B.NO_FACE, canReport: true }).a11yLabel === "Mira");

  const base: import("./build-items").RoomDockInput = { t, locale: "en-US", wren: "Wren", name: "Mira", closing: false, daysLeft: 9, mode: null, replyTo: null, notice: null, gone: false, expired: false, quietDays: 0 };
  const dock = B.buildRoomDock(base);
  ok("Kindreds bar: the ideas key is named, so Swift draws the Kindreds bar", dock.ideasLabel === "rm.ideas.a11y");
  ok("Kindreds bar: the bubble's words in capitals, the tray's title as written", dock.ideaLabel === "RM.IDEA.LABEL" && dock.ideaAnother === "RM.IDEA.ANOTHER" && dock.ideaUse === "RM.IDEA.USE" && dock.trayTitle === "rm.tray.title");
  ok("Kindreds bar: the emoji key is named", dock.emojiLabel === "cmp.emoji");
  ok(
    "the + tray: the four, with the I1 icons and their mood fills",
    dock.traces.map((x) => `${x.key}:${x.glyph}:${x.tint}`).join() === "note:foldNote:calm,ask:askSomething:tired,moment:tinyMoment:low,song:leaveSong:happy" &&
      dock.traces[0].title === "rm.note.t" &&
      dock.traces[3].subtitle === "rm.song.s",
  );
  ok("the pen-pal chat has no Kindreds bar", B.buildLettersDock({ t, name: "No. 1", revealed: false, gone: false, myCount: 1, iSigned: false, theirSigned: false }).ideasLabel === "");
}

/* ── the ideas (B, Prompt 4) ── */
{
  const cats = ["confessions", "almosts", "latenights", "small", "becoming", "missing"];
  // six prompts in each of the six categories, as data/stamps has them
  const prompts = cats.flatMap((cat) => Array.from({ length: 6 }, (_, k) => ({ cat, text: `${cat} ${k}` })));
  const a = B.ideaOrder(prompts, [], "room-a");
  ok("ideas: every sentence once", a.length === 36 && new Set(a).size === 36);
  ok("ideas: the same room, the same order", B.ideaOrder(prompts, [], "room-a").join("|") === a.join("|"));
  ok("ideas: another room, another order", B.ideaOrder(prompts, [], "room-b").join("|") !== a.join("|"));
  ok("ideas: shuffled, not the stamps' own order", a.join("|") !== prompts.map((p) => p.text).join("|"));
  const theirs = B.ideaOrder(prompts, ["missing", "small"], "room-a");
  ok("ideas: theirs first", theirs.slice(0, 12).every((x) => x.startsWith("missing") || x.startsWith("small")) && theirs.slice(12).every((x) => !x.startsWith("missing") && !x.startsWith("small")));
  ok("ideas: theirs are shuffled among themselves", theirs.slice(0, 12).some((x, k) => k > 0 && x.split(" ")[0] !== theirs[k - 1].split(" ")[0]));
  ok("ideas: the rest keep the room's order", theirs.slice(12).join("|") === a.filter((x) => !x.startsWith("missing") && !x.startsWith("small")).join("|"));
  ok("ideas: a sentence twice (two stamps alike in a language) is offered once; blank ones never", B.ideaOrder([...prompts, { cat: "small", text: "small 0 " }, { cat: "small", text: "  " }], [], "x").length === 36);

  const catOf = (id: string) => (({ "never-told": "confessions", crush: "almosts", homesick: "missing", "old-friend": "missing", "tiny-win": "small" }) as Record<string, string>)[id];
  ok("their categories: by how many letters call one up", B.theirCategories({ openingStamp: null, heard: [["homesick", "old-friend"], ["homesick"], ["tiny-win"]], catOf }).join() === "missing,small");
  ok("their categories: one vote per letter, however many of its stamps", B.theirCategories({ openingStamp: null, heard: [["homesick", "old-friend"], ["tiny-win"], ["tiny-win"]], catOf }).join() === "small,missing");
  ok("their categories: the stamp they chose leads", B.theirCategories({ openingStamp: "crush", heard: [["homesick"], ["homesick"]], catOf }).join() === "almosts,missing");
  ok("their categories: ties go to the one heard first", B.theirCategories({ openingStamp: null, heard: [["tiny-win"], ["homesick"]], catOf }).join() === "small,missing");
  ok("their categories: three at most", B.theirCategories({ openingStamp: "crush", heard: [["homesick"], ["tiny-win"], ["never-told"]], catOf }).length === 3);
  ok("their categories: unknown stamps and silence count for nothing", B.theirCategories({ openingStamp: "nope", heard: [[], ["nope"]], catOf }).length === 0);

  // the walk: no repeat until the pool is used, whatever the order does under it
  const walkOf = (order: string[], steps: number, start = B.IDEA_WALK_START) => {
    const shown: string[] = [];
    let w = start;
    for (let k = 0; k < steps; k++) {
      shown.push(B.ideaNow(order, w));
      w = B.ideaPassed(order, w);
    }
    return { shown, walk: w };
  };
  const first = walkOf(a, 36);
  ok("walk: the room's order, every sentence once before any comes round", first.shown.join("|") === a.join("|"));
  const second = walkOf(a, 36, first.walk);
  ok("walk: then it starts over, every sentence once more", new Set(second.shown).size === 36);
  ok("walk: a new walk never opens on the sentence that closed the last", second.shown[0] !== first.shown[35]);
  // their categories move halfway (a new letter of theirs tips the count): the order changes
  const half = walkOf(a, 10);
  const moved = B.ideaOrder(prompts, ["latenights"], "room-a");
  const rest = walkOf(moved, 26, half.walk);
  ok("walk: an order that moves under it offers none of the ten again before the other 26", rest.shown.every((x) => !half.shown.includes(x)) && new Set([...half.shown, ...rest.shown]).size === 36);
  const lateLeft = 6 - half.shown.filter((x) => x.startsWith("latenights")).length;
  ok("walk: and what's left comes in the new order, theirs first", lateLeft > 0 && rest.shown.slice(0, lateLeft).every((x) => x.startsWith("latenights")) && !rest.shown[lateLeft].startsWith("latenights"));
  ok("walk: nothing to offer, nothing offered", B.ideaNow([], B.IDEA_WALK_START) === "" && B.ideaPassed([], B.IDEA_WALK_START) === B.IDEA_WALK_START);
  ok("walk: one sentence is always that one", walkOf(["only"], 3).shown.join() === "only,only,only");

  ok("USE IT: alone in an empty field", B.withIdea("", "What did your street smell like?") === "What did your street smell like?" && B.withIdea("  \n", "Q?") === "Q?");
  ok("USE IT: after the reader's own words, never over them", B.withIdea("hey you ", "Q?") === "hey you Q?" && B.withIdea("hi", "Q?") === "hi Q?");
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

/* ── store mode (the App Store screenshots) ── */
{
  const d = demoDetail("demo-mira")!;
  const folds = demoFolds("demo-mira");
  ok("demo-mira has folds outside store mode", B.roomFolds(folds, { id: "demo-mira", storeMode: false }).length === folds.length && folds.length > 0);
  const storeFolds = B.roomFolds(folds, { id: B.STORE_ROOM_ID, storeMode: true });
  ok("the store room draws no folds", storeFolds.length === 0);
  const items = B.buildRoomItems(B.roomStream(B.conversation(d), storeFolds), roomCtx(d));
  ok("the store room has no fold rows", items.every((i) => i.kind !== "fold"));
  ok("store mode leaves other rooms' folds alone", B.roomFolds(demoFolds("demo-juno"), { id: "demo-juno", storeMode: true }).length === demoFolds("demo-juno").length);
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
