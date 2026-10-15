/* Behaviour lock for the Today tab's model (screens/today/today-cards): the
   desk's rules, the card both renderers draw, the plate's label, the reply's
   send key and hint, what a refused reply does, and the desk's geometry (the
   same numbers Swift's KTodayGeometry uses).
   Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/today/today-cards.test.ts
   The model's own imports are pure; a load hook only adds ".ts" to the
   extensionless relative imports Metro wants. Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const M = await import("./today-cards.ts");
const { VEIL_MASK, mosaicMask } = await import("../../lib/mosaic.ts");
type Letter = import("../../lib/db").PoolLetter;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}(${Object.entries(v).map(([a, b]) => `${a}=${b}`).join(",")})` : k);
const fmt = {
  t,
  postmark: (iso: string) => "PM" + iso.slice(5, 7),
  postNo: (uid: string) => uid.length * 1000 + 7,
  clock: (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
  stamp: (id: string) => (id === "tiny-win" ? { color: "#2E7D4F", name: "Tiny Win" } : id === "dark" ? { color: "#1E1B33", name: "Dark" } : null),
  stickerName: (id: string) => "S:" + id,
};
const L = (p: Partial<Letter> & { id: string }): Letter => ({
  author: "author-" + p.id,
  stamp: "tiny-win",
  body: "I fixed the wobbly chair today.",
  lang: "en",
  created_at: "2026-09-23T10:00:00Z",
  kind: "text",
  media_path: null,
  duration_s: null,
  ...p,
});

/* ── keepDesk: a reload never reshuffles under the thumb ── */
{
  const cur = [L({ id: "a" }), L({ id: "b" }), L({ id: "c" })];
  const fresh = [L({ id: "d" }), L({ id: "a" })];
  const fullPage = Array.from({ length: M.POOL_PAGE }, (_, i) => L({ id: "p" + i }));
  const kept = M.keepDesk(cur, fullPage, fresh);
  ok("keepDesk: a full page can't say a letter is gone — the desk keeps its order", kept.map((l) => l.id).join() === "a,b,c,d");
  const short = [L({ id: "a" }), L({ id: "c" }), L({ id: "d" })];
  ok("keepDesk: a short page (the whole pool) drops what the server no longer has", M.keepDesk(cur, short, fresh).map((l) => l.id).join() === "a,c,d");
  const many = Array.from({ length: 20 }, (_, i) => L({ id: "n" + i }));
  ok("keepDesk: new letters join at the end, up to the fifteen", M.keepDesk(cur, fullPage, many).length === 15);
  const big = Array.from({ length: 16 }, (_, i) => L({ id: "k" + i }));
  ok("keepDesk: a desk already past fifteen isn't cut", M.keepDesk(big, fullPage, many).length === 16);
}

/* ── blocking an author ── */
{
  const feed = [L({ id: "1", author: "x" }), L({ id: "2", author: "y" }), L({ id: "3", author: "x" }), L({ id: "4", author: "z" })];
  const r = M.withoutAuthor(feed, "x", 2);
  ok("block: every letter by that author leaves", r.feed.map((l) => l.id).join() === "2,4");
  ok("block: the reader's page shifts down by the letters removed before it (lands on the next one)", r.idx === 1 && r.feed[r.idx].id === "4");
  const atEnd = M.withoutAuthor(feed, "z", 3);
  ok("block: blocking the last letter lands on the end page", atEnd.idx === atEnd.feed.length);
}

/* ── the day's facts (W33) ── */
{
  ok("facts: answered letters still count as read (15 desk, 3 answered → 15, not 12)", M.dayFacts({ onDesk: 12, seen: 0, replied: 3, waiting: 2 }).read === 15);
  ok("facts: the counter wins when it is ahead", M.dayFacts({ onDesk: 0, seen: 9, replied: 1, waiting: 0 }).read === 9);
  const f = M.dayFacts({ onDesk: 4, seen: 4, replied: 2, waiting: 3 });
  ok("facts: replied and waiting pass through as counted", f.replied === 2 && f.waiting === 3);
}

/* ── the arrival ── */
{
  ok("arrival: the first page has the first envelope open in your hand", M.envelopeStates(0).join() === "current,sealed,sealed");
  ok("arrival: paging opens them one by one", M.envelopeStates(2).join() === "opened,opened,current");
  ok("arrival: settles once the third is behind you", !M.arrivalSettled(2) && M.arrivalSettled(3));
}

/* ── the plate ── */
{
  ok("plate: nothing while the first load is in flight (no CLOSED flash)", M.plateLabel({ loaded: false, count: 0, atEnd: false }, t) === "");
  ok("plate: nothing while a kept desk shows and the load is in flight", M.plateLabel({ loaded: false, count: 5, atEnd: true }, t) === "");
  ok("plate: CLOSED on a quiet day", M.plateLabel({ loaded: true, count: 0, atEnd: true }, t) === "ld.closed");
  ok("plate: ALL READ on the end page", M.plateLabel({ loaded: true, count: 3, atEnd: true }, t) === "ld.allRead");
  ok("plate: no counter while reading", M.plateLabel({ loaded: true, count: 3, atEnd: false }, t) === "");
}

/* ── the card ── */
{
  const c = M.buildCard({ letter: L({ id: "a" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: docket is postmark · NO.xxxx", c.postmark === "PM09 · NO.8007");
  ok("card: the face is the author's FACE v1 mask", c.mask === mosaicMask("author-a", 1) && !c.ghost);
  ok("card: the topic tag is the stamp's name in lowercase with a #", c.topic === "#tiny win");
  ok("card: a short letter is a telegram (30/40, centred)", c.bodySize === 30 && c.bodyLine === 40 && c.bodyCenter);
  ok("card: the menu is Report then Block (destructive)", c.menu.map((m) => m.key).join() === "report,block" && c.menu[1].destructive === true);
  ok("card: VoiceOver reads the docket, the topic, then the letter", c.a11yLabel === "PM09 · NO.8007. #tiny win. I fixed the wobbly chair today.");

  const ghost = M.buildCard({ letter: L({ id: "g", author: null }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: a deleted account is UNSIGNED, the veil, and has nothing to report", ghost.postmark === "PM09 · ld.unsigned" && ghost.mask === VEIL_MASK && ghost.ghost && ghost.menu.length === 0);

  const unknown = M.buildCard({ letter: L({ id: "u", stamp: "nope" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: a stamp stamps.ts doesn't list has no tag and no VoiceOver name", unknown.topic === "" && unknown.stampName === "");

  const long = "word ".repeat(150);
  const lc = M.buildCard({ letter: L({ id: "l", body: long }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: a long letter steps down to 18/29, left", lc.bodySize === 18 && lc.bodyLine === 29 && !lc.bodyCenter);

  const light = M.buildCard({ letter: L({ id: "d", stamp: "dark" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  const dark = M.buildCard({ letter: L({ id: "d", stamp: "dark" }), offer: null, signal: null, voiceReady: false }, "#1A1830", fmt);
  ok("card: the topic colours are worked out on the card's own face (Midnight differs)", light.topicWash !== dark.topicWash && light.topicInk !== dark.topicInk);

  const demo = M.buildCard({ letter: L({ id: "demo-p1" }), offer: null, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: dev samples are marked demo", demo.demo && !c.demo);
}

/* ── voice letters ── */
{
  const v = M.buildCard({ letter: L({ id: "v", kind: "voice", media_path: "x/v.m4a", duration_s: 74, body: "About my grandmother's kitchen" }), offer: { code: "ES→EN" }, signal: null, voiceReady: false }, "#FFFFFF", fmt);
  ok("voice: the caption is kept, never drawn as the body", v.isVoice && v.body === "" && v.caption === "About my grandmother's kitchen");
  ok("voice: unavailable until its link is signed", v.voiceReady === false);
  ok("voice: the stored length as m:ss", v.durationLabel === "1:14");
  ok("voice: a voice letter is never offered a translation", v.capsule.kind === "none");
  const d = M.buildCard({ letter: L({ id: "v2", kind: "voice", media_path: "x/v.m4a", body: M.DEFAULT_VOICE_CAPTION }), offer: null, signal: null, voiceReady: true }, "#FFFFFF", fmt);
  ok("voice: the default caption is not shown", d.caption === "" && d.voiceReady);
  ok("voice: VoiceOver says it is a voice letter", d.a11yLabel.endsWith("ld.voiceLetter"));
}

/* ── the capsule slot ── */
{
  const offer = { code: "ES→EN" };
  const close = { kind: "close" } as const;
  const tr = M.capsuleFor(offer, null, close, fmt);
  ok("capsule: translation wins over auras close (owner)", tr.kind === "translate" && tr.code === "ES→EN" && tr.label === "read.invite" && tr.enabled);
  const busy = M.capsuleFor(offer, { text: null, on: false, busy: true }, null, fmt);
  ok("capsule: busy says translating and takes no tap", busy.kind === "translate" && busy.label === "mm.translating" && !busy.enabled);
  const on = M.capsuleFor(offer, { text: "Hello", on: true, busy: false }, null, fmt);
  ok("capsule: translated, the code turns round and offers the original", on.kind === "translate" && on.code === "EN←ES" && on.label === "mm.original");
  const off = M.capsuleFor(offer, { text: "Hello", on: false, busy: false }, null, fmt);
  ok("capsule: flipped back, it invites again", off.kind === "translate" && off.code === "ES→EN" && off.label === "read.invite");
  const rings = M.capsuleFor(null, null, close, fmt);
  ok("capsule: auras close draws the two rings", rings.kind === "signal" && rings.glyph === "rings" && rings.label === "ld.close");
  const hour = M.capsuleFor(null, null, { kind: "hour", stickerId: "night_writer" }, fmt);
  ok("capsule: the same hour draws the clock", hour.kind === "signal" && hour.glyph === "clock" && hour.label === "ld.both.label(name=S:night_writer)");
  const subj = M.capsuleFor(null, null, { kind: "subject", stickerId: "s1" }, fmt);
  ok("capsule: a shared subject or label draws the two stickers", subj.kind === "signal" && subj.glyph === "stickers");
  ok("capsule: a letter that shares nothing gets none", M.capsuleFor(null, null, null, fmt).kind === "none");

  const card = M.buildCard({ letter: L({ id: "x", body: "¿Alguien más siente que septiembre se va demasiado rápido?", lang: "es" }), offer, xl: { text: "Does anyone else feel September goes too fast?", on: true, busy: false }, signal: close, voiceReady: false }, "#FFFFFF", fmt);
  ok("card: the translation swaps the text in place", card.body === "Does anyone else feel September goes too fast?" && card.capsule.kind === "translate");
}

/* ── the fold estimate (React Native card) ── */
{
  ok("fold: a short letter doesn't fold", !M.overflows({ text: "Hello there.", size: 30, line: 40, width: 300, frameH: 400, textH: 80 }));
  ok("fold: the measured height folds it", M.overflows({ text: "Hello there.", size: 30, line: 40, width: 300, frameH: 200, textH: 400 }));
  const zh = "我".repeat(325);
  ok("fold: a 325-weight Chinese letter folds even before measuring (CJK floor)", M.overflows({ text: zh, size: 21, line: 33, width: 300, frameH: 260, textH: 0 }));
}

/* ── the reply ── */
{
  const empty = M.replyState({ text: "", flights: 0, demo: false }, t);
  ok("reply: empty is disabled with the resting hint", empty.sendState === "disabled" && empty.hint === "ld.replyThreadOpens" && !empty.hintWarn);
  const one = M.replyState({ text: " a ", flights: 0, demo: false }, t);
  ok("reply: one character (trimmed) is not enough", one.sendState === "disabled" && !one.ok);
  const fine = M.replyState({ text: "ok.", flights: 2, demo: false }, t);
  ok("reply: 'ok.' is a whole answer — enabled, a thread opens", fine.sendState === "enabled" && fine.hint === "ld.threadOpensTwo");
  const full = M.replyState({ text: "hello there", flights: 5, demo: false }, t);
  ok("reply: a full pouch dims the key but it still takes the tap, and the hint says why", full.sendState === "dimmed" && full.pouchFull && full.hint === "ld.flightFull");
  const demo = M.replyState({ text: "hello there", flights: 9, demo: true }, t);
  ok("reply: a dev letter never counts against the pouch", demo.sendState === "enabled" && !demo.pouchFull);
  const forced = M.replyState({ text: "hello there", flights: 0, demo: true, forceFull: true }, t);
  ok("reply: ?full=1 pretends the pouch is full", forced.sendState === "dimmed");
  const over = M.replyState({ text: "x".repeat(1003), flights: 0, demo: false }, t);
  ok("reply: over the limit is disabled, in red, with the count", over.sendState === "disabled" && over.hintWarn && over.hint === "ui.overLimit(n=3)");
  const sending = M.replyState({ text: "hello", flights: 0, demo: false, sending: true }, t);
  ok("reply: nothing sends twice while a send is in flight", sending.sendState === "disabled");
  ok("reply: the pill shows the draft's first line", M.draftPreview("  first line\nsecond") === "first line" && M.draftPreview("") === "");
}

/* ── refused replies ── */
{
  ok("refusal: a guest is asked to sign in", M.replyFailAction(null, true) === "signup");
  ok("refusal: a letter taken back leaves the desk", M.replyFailAction("gone", false) === "remove");
  ok("refusal: a block leaves the desk too (and says the same words)", M.replyFailAction("blocked", false) === "remove");
  ok("refusal: suspended, offline, an expired session or a server error keep the words", ["suspended", "offline", "session", "server", "timeout", null].every((k) => M.replyFailAction(k as never, false) === "keep"));
}

/* ── the geometry ── */
{
  const big = M.deskGeometry({ hostH: 852, safeTop: 59, tabBarRoom: 98 });
  ok("geometry: a 393×852 phone's card is about 559", big.cardH === 559 && big.bottomRoom === 104);
  ok("geometry: the stride is the card and H's 132", big.stride === big.cardH + 132);
  ok("geometry: the blind fits without scaling on a big phone", big.endScale === 1 && big.endH === 741 - 12 - 104);
  const se = M.deskGeometry({ hostH: 667, safeTop: 20, tabBarRoom: 84 });
  ok("geometry: an iPhone SE's card is 427 (the strip and arrival take nothing from it)", se.cardH === 427);
  ok("geometry: an SE's blind scales to fit", se.endScale < 1 && Math.abs(se.endScale - se.endH / 520) < 1e-9);
  const tiny = M.deskGeometry({ hostH: 500, safeTop: 20, tabBarRoom: 84 });
  ok("geometry: the card never goes under 360", tiny.cardH === 360);
}

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
