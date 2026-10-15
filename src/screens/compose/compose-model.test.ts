/* Behaviour lock for the compose page's model (screens/compose/compose-model):
   when a letter may go, what the key and the counts say, the quota and the
   cap panel, Wren's line, what goes out, the leave guard and the autosave,
   the stamp tray's sections — the rules both renderers draw, so a remote
   flip between SwiftUI and React Native never changes them.
   Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/compose/compose-model.test.ts
   The model imports lib/weighted-count without an extension (Metro's way),
   so a resolve hook adds ".ts" for this process. Every line prints ok/FAIL
   and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const M = await import("./compose-model.ts");
const W = await import("../../lib/weighted-count.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

// the words: the key itself, with any vars after a colon, so a test can read both
const fmt = { t: (k: string, v?: Record<string, string | number>) => (v ? `${k}:${Object.values(v).join(",")}` : k) };

const { OPENING_MIN, LETTER_MAX, COUNTER_FROM, REPLY_MIN } = W;

// ── wordsReadyFor ──
ok("write: under the floor is not ready", !M.wordsReadyFor({ mode: "write", weight: OPENING_MIN - 1, hasRecording: false }));
ok("write: the floor is ready", M.wordsReadyFor({ mode: "write", weight: OPENING_MIN, hasRecording: false }));
ok("write: the ceiling is still ready", M.wordsReadyFor({ mode: "write", weight: LETTER_MAX, hasRecording: false }));
ok("write: over the ceiling is not ready", !M.wordsReadyFor({ mode: "write", weight: LETTER_MAX + 1, hasRecording: false }));
ok("speak: a recording with no line is not ready", !M.wordsReadyFor({ mode: "speak", weight: 0, hasRecording: true }));
ok("speak: a line with no recording is not ready", !M.wordsReadyFor({ mode: "speak", weight: 50, hasRecording: false }));
ok("speak: a recording and its line is ready", M.wordsReadyFor({ mode: "speak", weight: REPLY_MIN, hasRecording: true }));

// ── keyFor ──
const key = (p: Partial<Parameters<typeof M.keyFor>[0]>) =>
  M.keyFor({ mode: "write", weight: 0, wordsReady: false, hasStamp: false, busy: false, tray: null, ...p }, fmt);

{
  const k = key({ weight: 5 });
  ok("filling: LET IT TRAVEL in mute", k.stage === "filling" && k.label === "cp.travel" && k.tone === "mute");
  ok("filling: not pressable", !k.enabled);
  ok("filling: the floor line is weight / floor, no digits anywhere", k.progress === 5 / OPENING_MIN && !/\d/.test(k.label));
  ok("filling: SEND where it doesn't fit", k.narrowLabel === "ld.send");
  ok("filling: no nudge", !k.nudge);
}
ok("empty page: the floor line starts at 0", key({ weight: 0 }).progress === 0);
ok("over the ceiling: filling with no floor line", (() => { const k = key({ weight: LETTER_MAX + 3 }); return k.stage === "filling" && k.progress === -1; })());
ok("speaking and not ready: no floor line", key({ mode: "speak", weight: 0 }).progress === -1);
{
  const k = key({ weight: OPENING_MIN, wordsReady: true });
  ok("needStamp: PICK A MOOD STAMP in ind, pressable", k.stage === "needStamp" && k.label === "cp.needStamp" && k.tone === "ind" && k.enabled);
  ok("needStamp: the nudge leans toward the stamp key", k.nudge);
  ok("needStamp: never squeezed to SEND", k.narrowLabel === "");
  ok("needStamp: no floor line", k.progress === -1);
}
ok("needStamp with the stamp tray open: no nudge", !key({ weight: OPENING_MIN, wordsReady: true, tray: "stamps" }).nudge);
ok("needStamp with the more tray open: still nudges", key({ weight: OPENING_MIN, wordsReady: true, tray: "more" }).nudge);
{
  const k = key({ weight: 40, wordsReady: true, hasStamp: true });
  ok("ready: LET IT TRAVEL in ind, pressable", k.stage === "ready" && k.label === "cp.travel" && k.tone === "ind" && k.enabled);
  ok("ready: SEND where it doesn't fit", k.narrowLabel === "ld.send");
  ok("ready: no nudge, no floor line", !k.nudge && k.progress === -1);
}
{
  const k = key({ weight: 40, wordsReady: true, hasStamp: true, busy: true });
  ok("sending: SENDING… in mute, not pressable", k.stage === "sending" && k.label === "cp.sending" && k.tone === "mute" && !k.enabled);
  ok("sending: never squeezed", k.narrowLabel === "");
}
ok("busy wins over needStamp", key({ weight: 40, wordsReady: true, busy: true }).stage === "sending");

// ── countFor ──
ok("count: nothing below the counter", M.countFor({ mode: "write", weight: COUNTER_FROM - 1 }, fmt) === null);
ok("count: nothing while speaking", M.countFor({ mode: "speak", weight: LETTER_MAX + 50 }, fmt) === null);
ok("count: N LEFT in mute far from the ceiling", (() => { const c = M.countFor({ mode: "write", weight: COUNTER_FROM }, fmt); return !!c && c.text === `cp.charsLeft:${LETTER_MAX - COUNTER_FROM}` && c.tone === "mute"; })());
ok("count: brass within 40 of the ceiling", M.countFor({ mode: "write", weight: LETTER_MAX - 39 }, fmt)?.tone === "amber");
ok("count: mute at exactly 40 left", M.countFor({ mode: "write", weight: LETTER_MAX - 40 }, fmt)?.tone === "mute");
ok("count: 0 LEFT at the ceiling, brass", (() => { const c = M.countFor({ mode: "write", weight: LETTER_MAX }, fmt); return c?.text === "cp.charsLeft:0" && c.tone === "amber"; })());
ok("count: over the ceiling in red, localized", (() => { const c = M.countFor({ mode: "write", weight: LETTER_MAX + 7 }, fmt); return c?.text === "ui.overLimit:7" && c.tone === "post"; })());

// ── quota ──
ok("leftFromCount: none used", M.leftFromCount(0, 5) === 5);
ok("leftFromCount: some used", M.leftFromCount(3, 5) === 2);
ok("leftFromCount: never below zero", M.leftFromCount(9, 5) === 0);
ok("leftFromCount: junk counts as none", M.leftFromCount(Number.NaN, 5) === 5);
const free = { signedIn: true, isGuest: false, premium: false, premiumSettled: true };
ok("free writer: signed in, real, settled, not First Class", M.isFreeWriter(free));
ok("not free: First Class", !M.isFreeWriter({ ...free, premium: true }));
ok("not free: First Class hasn't answered yet", !M.isFreeWriter({ ...free, premiumSettled: false }));
ok("not free: a guest", !M.isFreeWriter({ ...free, isGuest: true }));
ok("not free: signed out", !M.isFreeWriter({ ...free, signedIn: false }));
ok("quota: N LEFT TODAY", M.quotaFor({ free: true, left: 4 }, fmt) === "cp.left.n:4");
ok("quota: 1 LEFT TODAY", M.quotaFor({ free: true, left: 1 }, fmt) === "cp.left.one");
ok("quota: NONE LEFT TODAY", M.quotaFor({ free: true, left: 0 }, fmt) === "cp.left.none");
ok("quota: nothing for First Class", M.quotaFor({ free: false, left: 4 }, fmt) === "");
ok("quota: nothing while the count is unknown", M.quotaFor({ free: true, left: null }, fmt) === "");
ok("cap panel: after a 429", M.capVisible({ capHit: true, free: true, left: 2 }));
ok("cap panel: at once with none left", M.capVisible({ capHit: false, free: true, left: 0 }));
ok("cap panel: not with some left", !M.capVisible({ capHit: false, free: true, left: 1 }));
ok("cap panel: not at an unknown count", !M.capVisible({ capHit: false, free: true, left: null }));
ok("cap panel: not for First Class at a stale zero", !M.capVisible({ capHit: false, free: false, left: 0 }));

// ── Wren's line ──
const line = (p: Partial<Parameters<typeof M.wrenLineFor>[0]>) =>
  M.wrenLineFor({ langHello: false, mode: "write", hasRecording: false, weight: 0, hello: "HELLO", voicePrompt: "PROMPT", moodLine: "MOOD", ladderLine: "LADDER", ...p }, fmt);
ok("Wren: the ladder while writing, in quotes", line({}) === "cp.quote:LADDER");
ok("Wren: her language hello wins", line({ langHello: true }) === "cp.quote:HELLO");
ok("Wren: speaking with no recording, her mood", line({ mode: "speak" }) === "cp.quote:MOOD");
ok("Wren: a recording without its line, the prompt", line({ mode: "speak", hasRecording: true, weight: 0 }) === "cp.quote:PROMPT");
ok("Wren: a recording with its line, her mood", line({ mode: "speak", hasRecording: true, weight: REPLY_MIN }) === "cp.quote:MOOD");

// ── sendBody ──
ok("send: the letter, trimmed", M.sendBody("write", "  hello there  ", "") === "hello there");
ok("send: the question rides under it", M.sendBody("write", "hello", " what about you? ") === "hello\n\nwhat about you?");
ok("send: a blank question adds nothing", M.sendBody("write", "hello", "   ") === "hello");
ok("send: speaking sends the line alone (the question isn't asked of a recording)", M.sendBody("speak", " a line ", "q?") === "a line");

// ── leave guard ──
ok("guard: an empty page just goes", !M.leaveGuard({ text: "  ", ask: "", hasRecording: false }).guard);
ok("guard: words ask, and may be kept", (() => { const g = M.leaveGuard({ text: "hi", ask: "", hasRecording: false }); return g.guard && g.canSaveDraft; })());
ok("guard: a question alone asks too", M.leaveGuard({ text: "", ask: "why?", hasRecording: false }).guard);
ok("guard: a recording with no caption asks (it was lost on ✕)", (() => { const g = M.leaveGuard({ text: "", ask: "", hasRecording: true }); return g.guard && !g.canSaveDraft; })());

// ── autosave ──
const snap = { text: "a letter I was writing", ask: "", sel: "growing", mode: "write" as const, draftId: null };
ok("autosave: a page left without deciding is kept", M.autosaveDraft(snap, { kind: "open" })?.body === snap.text);
ok("autosave: never after DISCARD", M.autosaveDraft(snap, { kind: "discarded" }) === null);
ok("autosave: never after SAVE AS DRAFT (no second copy)", M.autosaveDraft(snap, { kind: "saved", id: "d-1" }) === null);
ok("autosave: never after a send", M.autosaveDraft(snap, { kind: "sent" }) === null);
ok("autosave: never a voice page", M.autosaveDraft({ ...snap, mode: "speak" }, { kind: "open" }) === null);
ok("autosave: not two characters", M.autosaveDraft({ ...snap, text: " ab " }, { kind: "open" }) === null);
ok("autosave: a resumed draft keeps its id", M.autosaveDraft({ ...snap, draftId: "d-9" }, { kind: "open" })?.id === "d-9");
ok("autosave: no stamp saves as ''", M.autosaveDraft({ ...snap, sel: null }, { kind: "open" })?.stamp === "");

// ── the + dot ──
ok("dot: nothing attached", !M.plusDot({ tray: null, askOn: false, ask: "", mode: "write" }));
ok("dot: a question open", M.plusDot({ tray: null, askOn: true, ask: "", mode: "write" }));
ok("dot: a question typed", M.plusDot({ tray: null, askOn: false, ask: "q", mode: "write" }));
ok("dot: speaking", M.plusDot({ tray: null, askOn: false, ask: "", mode: "speak" }));
ok("dot: hidden while its own tray is open", !M.plusDot({ tray: "more", askOn: true, ask: "q", mode: "speak" }));

// ── stamp sections ──
const known = new Set(["a", "b", "c", "d"]);
const item = (id: string) => (known.has(id) ? { id, name: id.toUpperCase(), inkHex: "#000000", a11yLabel: id } : null);
const sections = M.stampSections({
  suggested: { title: "FOR", ids: ["a", "zz", "b", "a"] },
  recent: { title: "RECENT", ids: ["gone"] },
  categories: [
    { title: "ONE", ids: ["c", "d"] },
    { title: "TWO", ids: [] },
  ],
  item,
});
ok("sections: unknown ids dropped", sections[0].items.map((i) => i.id).join() === "a,b");
ok("sections: a repeated id once", sections[0].items.length === 2);
ok("sections: an emptied section isn't sent", !sections.some((s) => s.title === "RECENT" || s.title === "TWO"));
ok("sections: in order", sections.map((s) => s.title).join() === "FOR,ONE");

if (fails) {
  console.log(`\n${fails} FAILED`);
  process.exit(1);
}
console.log("\nall ok");
