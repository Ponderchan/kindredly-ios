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
  ok("filling: the wash is weight / floor", k.progress === 5 / OPENING_MIN);
  ok("filling: the count rides beside the label (the App Store key)", k.count === `5/${OPENING_MIN}` && !/\d/.test(k.label));
  ok("filling: SEND where it doesn't fit", k.narrowLabel === "ld.send");
  ok("filling: no nudge", !k.nudge);
}
ok("empty page: the wash starts at 0, the count at 0", key({ weight: 0 }).progress === 0 && key({ weight: 0 }).count === `0/${OPENING_MIN}`);
ok("over the ceiling: filling with no floor line", (() => { const k = key({ weight: LETTER_MAX + 3 }); return k.stage === "filling" && k.progress === -1 && k.count === ""; })());
ok("speaking and not ready: no floor line", key({ mode: "speak", weight: 0 }).progress === -1);
{
  const k = key({ weight: OPENING_MIN, wordsReady: true });
  ok("needStamp: PICK A MOOD STAMP in ind, pressable", k.stage === "needStamp" && k.label === "cp.needStamp" && k.tone === "ind" && k.enabled);
  ok("needStamp: the nudge leans toward the stamp key", k.nudge);
  ok("needStamp: never squeezed to SEND", k.narrowLabel === "");
  ok("needStamp: no wash, no count", k.progress === -1 && k.count === "");
}
ok("needStamp with the stamp tray open: no nudge", !key({ weight: OPENING_MIN, wordsReady: true, tray: "stamps" }).nudge);
ok("needStamp with the more tray open: still nudges", key({ weight: OPENING_MIN, wordsReady: true, tray: "more" }).nudge);
{
  const k = key({ weight: 40, wordsReady: true, hasStamp: true });
  ok("ready: LET IT TRAVEL in ind, pressable", k.stage === "ready" && k.label === "cp.travel" && k.tone === "ind" && k.enabled);
  ok("ready: SEND where it doesn't fit", k.narrowLabel === "ld.send");
  ok("ready: no nudge, no wash, no count", !k.nudge && k.progress === -1 && k.count === "");
}
{
  const k = key({ weight: 40, wordsReady: true, hasStamp: true, busy: true });
  ok("sending: SENDING… in mute, not pressable", k.stage === "sending" && k.label === "cp.sending" && k.tone === "mute" && !k.enabled);
  ok("sending: never squeezed", k.narrowLabel === "");
}
ok("busy wins over needStamp", key({ weight: 40, wordsReady: true, busy: true }).stage === "sending");

// ── keyFor: what VoiceOver hears beyond the label (a11y pass cm-8) ──
ok("a11y filling: the value says how many are still to go", key({ weight: 7 }).countA11y === `cp.a11y.keyLeft:${OPENING_MIN - 7}` && key({ weight: 7 }).hintA11y === "");
ok("a11y filling: one to go has its own key", key({ weight: OPENING_MIN - 1 }).countA11y === "cp.a11y.keyLeftOne");
ok("a11y empty page: the whole floor to go", key({ weight: 0 }).countA11y === `cp.a11y.keyLeft:${OPENING_MIN}`);
ok("a11y over the ceiling: how far over", key({ weight: LETTER_MAX + 3 }).countA11y === "ui.overLimit:3");
ok("a11y speaking: no value", key({ mode: "speak", weight: 0 }).countA11y === "");
ok("a11y needStamp: no value, the hint says why", (() => { const k = key({ weight: OPENING_MIN, wordsReady: true }); return k.countA11y === "" && k.hintA11y === "cp.a11y.needStampHint"; })());
ok("a11y ready and sending: nothing extra", (() => { const r = key({ weight: 40, wordsReady: true, hasStamp: true }), b = key({ weight: 40, wordsReady: true, hasStamp: true, busy: true }); return r.countA11y === "" && r.hintA11y === "" && b.countA11y === "" && b.hintA11y === ""; })());

// ── countFor ──
ok("count: nothing below the counter", M.countFor({ mode: "write", weight: COUNTER_FROM - 1 }, fmt) === null);
ok("count: nothing while speaking", M.countFor({ mode: "speak", weight: LETTER_MAX + 50 }, fmt) === null);
ok("count: N LEFT in mute far from the ceiling", (() => { const c = M.countFor({ mode: "write", weight: COUNTER_FROM }, fmt); return !!c && c.text === `cp.charsLeft:${LETTER_MAX - COUNTER_FROM}` && c.tone === "mute"; })());
ok("count: brass within 40 of the ceiling", M.countFor({ mode: "write", weight: LETTER_MAX - 39 }, fmt)?.tone === "amber");
ok("count: mute at exactly 40 left", M.countFor({ mode: "write", weight: LETTER_MAX - 40 }, fmt)?.tone === "mute");
ok("count: 0 LEFT at the ceiling, brass", (() => { const c = M.countFor({ mode: "write", weight: LETTER_MAX }, fmt); return c?.text === "cp.charsLeft:0" && c.tone === "amber"; })());
ok("count: 1 LEFT has its own key (singular)", M.countFor({ mode: "write", weight: LETTER_MAX - 1 }, fmt)?.text === "cp.charsLeftOne");
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

// ── the server decides at zero (the count only shows) ──
ok("bump first: a free writer at zero asks the server before the courier", M.bumpBeforeFlight({ free: true, left: 0 }));
ok("bump first: not with letters left (the bump runs after her gate)", !M.bumpBeforeFlight({ free: true, left: 2 }));
ok("bump first: not at an unknown count", !M.bumpBeforeFlight({ free: true, left: null }));
ok("bump first: not for First Class (or the demo)", !M.bumpBeforeFlight({ free: false, left: 0 }));
ok("after a bump: First Class clears the count (and with it the panel)", M.leftAfterBump({ premium: true, count: 7 }, 5) === null);
ok("after a bump: First Class at a stale zero shows no panel", (() => {
  const left = M.leftAfterBump({ premium: true, count: 6, cap: 5 }, 5);
  return left === null && !M.capVisible({ capHit: false, free: true, left }) && M.quotaFor({ free: true, left }, fmt) === "";
})());
ok("after a bump: a free writer's count against its cap", M.leftAfterBump({ premium: false, count: 3, cap: 5 }, 5) === 2);
ok("after a bump: no cap sent reads the fallback", M.leftAfterBump({ premium: false, count: 1 }, 5) === 4);
ok("after a bump: a day turned (UTC) lifts the zero", M.leftAfterBump({ premium: false, count: 1, cap: 5 }, 5) === 4 && !M.capVisible({ capHit: false, free: true, left: 4 }));
ok("after a bump: no count leaves the page as it is", M.leftAfterBump({ premium: false }, 5) === undefined);
ok("after a bump: junk count leaves the page as it is", M.leftAfterBump({ premium: false, count: "3" }, 5) === undefined);

// ── the count's colour ──
ok("count colour: past the ceiling, postmark red in every theme", M.countBrand("post", false) === "postRed" && M.countBrand("post", true) === "postRed");
ok("count colour: near it on a light page, brassSeal (goldText is under 3:1)", M.countBrand("amber", false) === "brassSeal");
ok("count colour: near it on Midnight, goldText", M.countBrand("amber", true) === "goldText");
ok("count colour: far from it, the theme's mute", M.countBrand("mute", false) === "mute" && M.countBrand("mute", true) === "mute");

// ── Wren's line ──
const line = (p: Partial<Parameters<typeof M.wrenLineFor>[0]>) =>
  M.wrenLineFor({ langHello: false, mode: "write", hasRecording: false, weight: 0, hello: "HELLO", voicePrompt: "PROMPT", moodLine: "MOOD", ladderLine: "LADDER", ...p }, fmt);
ok("Wren: the ladder while writing, in quotes", line({}) === "cp.quote:LADDER");
ok("Wren: her language hello wins", line({ langHello: true }) === "cp.quote:HELLO");
ok("Wren: speaking with no recording, her mood", line({ mode: "speak" }) === "cp.quote:MOOD");
ok("Wren: a recording without its line, the prompt", line({ mode: "speak", hasRecording: true, weight: 0 }) === "cp.quote:PROMPT");
ok("Wren: a recording with its line, her mood", line({ mode: "speak", hasRecording: true, weight: REPLY_MIN }) === "cp.quote:MOOD");

// ── sendBody ──
ok("send: the letter, trimmed", M.sendBody("write", "  hello there  ", "", true) === "hello there");
ok("send: the question rides under it", M.sendBody("write", "hello", " what about you? ", true) === "hello\n\nwhat about you?");
ok("send: a blank question adds nothing", M.sendBody("write", "hello", "   ", true) === "hello");
ok("send: speaking sends the line alone (the question isn't asked of a recording)", M.sendBody("speak", " a line ", "q?", true) === "a line");
ok("send: a question turned off stays off the letter (its words kept, not sent)", M.sendBody("write", "hello", "what about you?", false) === "hello");

// ── the question off and on again ──
{
  // typed, turned off: nothing of it rides; turned on again: the same words ride
  const ask = "What small kindness stayed with you?";
  const off = { text: "", ask, askOn: false, hasRecording: false };
  ok("question off: its words are not sent", M.sendBody("write", "a letter", ask, false) === "a letter");
  ok("question off: alone, it doesn't hold the page (it rides with nothing)", !M.leaveGuard(off).guard);
  ok("question off: a draft keeps the letter without it", M.draftToKeep({ text: " a letter ", ask, askOn: false, sel: null, draftId: null }).ask === "");
  ok("question off: the autosave keeps the letter without it", M.autosaveDraft({ text: "a letter", ask, askOn: false, sel: null, mode: "write", draftId: null }, { kind: "open" })?.ask === "");
  ok("question off: no dot on the +", !M.plusDot({ tray: null, askOn: false, mode: "write" }));
  ok("question on again: the same words ride under the letter", M.sendBody("write", "a letter", ask, true) === `a letter\n\n${ask}`);
  ok("question on again: it holds the page", M.leaveGuard({ ...off, askOn: true }).guard);
  ok("question on again: the draft carries it", M.draftToKeep({ text: "a letter", ask, askOn: true, sel: null, draftId: null }).ask === ask);
  ok("question on again: the autosave carries it", M.autosaveDraft({ text: "a letter", ask, askOn: true, sel: null, mode: "write", draftId: null }, { kind: "open" })?.ask === ask);
}

// ── SAVE AS DRAFT ──
ok("draft: the letter trimmed, its stamp and id", (() => {
  const d = M.draftToKeep({ text: "  dear you  ", ask: "q?", askOn: true, sel: "growing", draftId: "d-3" });
  return d.body === "dear you" && d.ask === "q?" && d.stamp === "growing" && d.id === "d-3";
})());
ok("draft: no stamp saves as ''", M.draftToKeep({ text: "x", ask: "", askOn: false, sel: null, draftId: null }).stamp === "");

// ── leave guard ──
ok("guard: an empty page just goes", !M.leaveGuard({ text: "  ", ask: "", askOn: false, hasRecording: false }).guard);
ok("guard: words ask, and may be kept", (() => { const g = M.leaveGuard({ text: "hi", ask: "", askOn: false, hasRecording: false }); return g.guard && g.canSaveDraft; })());
ok("guard: a question alone asks too", M.leaveGuard({ text: "", ask: "why?", askOn: true, hasRecording: false }).guard);
ok("guard: a recording with no caption asks (it was lost on ✕)", (() => { const g = M.leaveGuard({ text: "", ask: "", askOn: false, hasRecording: true }); return g.guard && !g.canSaveDraft; })());

// ── autosave ──
const snap = { text: "a letter I was writing", ask: "", askOn: false, sel: "growing", mode: "write" as const, draftId: null };
ok("autosave: a page left without deciding is kept", M.autosaveDraft(snap, { kind: "open" })?.body === snap.text);
ok("autosave: never after DISCARD", M.autosaveDraft(snap, { kind: "discarded" }) === null);
ok("autosave: never after SAVE AS DRAFT (no second copy)", M.autosaveDraft(snap, { kind: "saved", id: "d-1" }) === null);
ok("autosave: never after a send", M.autosaveDraft(snap, { kind: "sent" }) === null);
ok("autosave: never a voice page", M.autosaveDraft({ ...snap, mode: "speak" }, { kind: "open" }) === null);
ok("autosave: not two characters", M.autosaveDraft({ ...snap, text: " ab " }, { kind: "open" }) === null);
ok("autosave: a resumed draft keeps its id", M.autosaveDraft({ ...snap, draftId: "d-9" }, { kind: "open" })?.id === "d-9");
ok("autosave: no stamp saves as ''", M.autosaveDraft({ ...snap, sel: null }, { kind: "open" })?.stamp === "");

// ── the + dot ──
ok("dot: nothing attached", !M.plusDot({ tray: null, askOn: false, mode: "write" }));
ok("dot: a question open", M.plusDot({ tray: null, askOn: true, mode: "write" }));
ok("dot: speaking", M.plusDot({ tray: null, askOn: false, mode: "speak" }));
ok("dot: hidden while its own tray is open", !M.plusDot({ tray: "more", askOn: true, mode: "speak" }));

// ── the ASK cell ──
ok("ask cell: off and pressable while writing", (() => { const c = M.askCell({ askOpen: false, mode: "write" }); return !c.on && !c.disabled; })());
ok("ask cell: lit while the question shows", M.askCell({ askOpen: true, mode: "write" }).on);
ok("ask cell: disabled while speaking (no field to open, nothing to focus)", M.askCell({ askOpen: false, mode: "speak" }).disabled);
ok("ask cell: not lit while speaking, even with a question open underneath", (() => { const c = M.askCell({ askOpen: true, mode: "speak" }); return !c.on && c.disabled; })());

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

/* ── the tray's names: their colour (the bright palette, owner 2026-10-19) ── */
{
  const st = { nameLight: "#7443D1", nameDark: "#9774F0" };
  ok("tray name colour: nameLight on a light theme", M.trayNameHex(st, false, "#1E1B35") === "#7443D1");
  ok("tray name colour: nameDark on Midnight", M.trayNameHex(st, true, "#E8E5F6") === "#9774F0");
  ok("tray name colour: lower case comes back in capitals", M.trayNameHex({ nameLight: "#7443d1" }, false, "#1E1B35") === "#7443D1");
  ok("tray name colour: no stamp, the theme's ink", M.trayNameHex(null, false, "#1E1B35") === "#1E1B35" && M.trayNameHex(undefined, true, "#E8E5F6") === "#E8E5F6");
  ok("tray name colour: a missing or malformed shade, the theme's ink", M.trayNameHex({ nameDark: "#9774F0" }, false, "#1E1B35") === "#1E1B35" && M.trayNameHex({ nameLight: "#7443D1", nameDark: "purple" }, true, "#E8E5F6") === "#E8E5F6");

  // the 36 shades in data/stamps.ts (read as text: it imports i18n), on each theme's tray ground (soft)
  const { readFileSync } = await import("node:fs");
  const text = readFileSync(new URL("../../data/stamps.ts", import.meta.url), "utf8");
  const rows = [...text.matchAll(/\{ id: "([\w-]+)", cat: "\w+", emoji: "[^"]*", color: "(#[0-9A-F]{6})", nameLight: "(#[0-9A-F]{6})", nameDark: "(#[0-9A-F]{6})"/g)].map((m) => ({ id: m[1], color: m[2], nameLight: m[3], nameDark: m[4] }));
  const themes = JSON.parse(readFileSync(new URL("../../theme/themes.json", import.meta.url), "utf8")).themes as Record<string, { soft: string; ink: string; dark: boolean }>;
  const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
  const cr = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  ok("stamps.ts gives all 36 stamps a nameLight and a nameDark", rows.length === 36);
  ok("nameDark is the stamp colour itself (the palette's name_midnight)", rows.every((r) => r.nameDark === r.color));
  for (const [key, tk] of Object.entries(themes)) {
    const bad = rows.filter((r) => cr(M.trayNameHex(r, tk.dark, tk.ink), tk.soft) < 4.5).map((r) => r.id);
    ok(`${key}: every tray name clears 4.5:1 on the tray's ground (soft ${tk.soft})${bad.length ? " (" + bad.join(" ") + ")" : ""}`, bad.length === 0);
  }
}

/* ── the tray's names: one line wherever it fits (owner, 2026-10-18) ── */
{
  const room = 62; // a wide phone's column less its 3 + 3
  ok("tray name: a short name, one line at 9", JSON.stringify(M.trayNameFit("crush", room)) === JSON.stringify({ size: 9, lines: 1 }));
  ok("tray name: 11 glyphs fit at 9 (11 × 5.4 + 10 × .2 = 61.4)", M.trayNameFit("can't sleep", room).size === 9 && M.trayNameFit("can't sleep", room).lines === 1);
  ok("tray name: off my chest (12) drops to 8 rather than wrap", JSON.stringify(M.trayNameFit("off my chest", room)) === JSON.stringify({ size: 8, lines: 1 }));
  ok("tray name: never told anyone wraps to two lines at 9, never cut", JSON.stringify(M.trayNameFit("never told anyone", room)) === JSON.stringify({ size: 9, lines: 2 }));
  // a 375 phone (a11y pass cm-9): the column leaves (375 − 20) / 6 − 6 = 53.2, and "never told" needs 55.8 at 9
  const se = (375 - 20) / 6 - 6;
  ok("tray name on a 375 phone: never told anyone takes three lines at 9, not two cut short", JSON.stringify(M.trayNameFit("never told anyone", se)) === JSON.stringify({ size: 9, lines: 3 }));
  ok("tray name on a 375 phone: hat meinen tag gerettet steps down to 8 to stay in three lines", JSON.stringify(M.trayNameFit("hat meinen tag gerettet", se)) === JSON.stringify({ size: 8, lines: 3 }));
  ok("tray name lines: a word wider than the room takes lines of its own", M.trayNameLines("situationship", 9, se) === 2);
  ok("tray name: a CJK glyph is a whole em (6 at 9 fit, 7 don't at 9 but do at 8)",
    M.trayNameFit("眠れない夜だ", room).size === 9 && M.trayNameFit("眠れない夜だよ", room).size === 8 && M.trayNameFit("眠れない夜だよね", room).lines === 2);
}

if (fails) {
  console.log(`\n${fails} FAILED`);
  process.exit(1);
}
console.log("\nall ok");
