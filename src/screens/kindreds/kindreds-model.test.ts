/* Behaviour lock for the Kindreds tab's model (screens/kindreds/kindreds-model):
   who is listed, the owner's order, the fold, the quiet group, closed
   accounts, the empty lines, the row words and menus, the orbit, and who a
   pen pal is with the identity switch off (exactly today's) and on (the
   courier name, the mark and the sign, the frost, "was No.") — the rules
   both renderers draw, so a remote flip between SwiftUI and React Native
   never changes what the reader sees.
   Not wired to a runner; run by hand from the repo root with plain node (it
   strips the types itself from Node 22.18 / 23.6 on):
     node src/screens/kindreds/kindreds-model.test.ts
   The model imports lib/thread-state (which imports lib/i18n → React
   Native) and lib/room-seen (→ AsyncStorage), so a load hook stands in a
   two-line i18n and storage for this process only, and adds ".ts" to the
   extensionless relative imports Metro wants. Every line prints ok/FAIL
   and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

const STUBS: Record<string, string> = {
  i18n: `export const t = (k) => k; export const getLang = () => "en"; export const strings = () => {};`,
  "scoped-store": `export const scoped = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };`,
};
registerHooks({
  resolve(specifier, context, next) {
    const m = /(?:^|\/)(i18n|scoped-store)$/.exec(specifier);
    if (m) return { url: "kd-stub:" + m[1], shortCircuit: true };
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("kd-stub:")) return { format: "module", source: STUBS[url.slice("kd-stub:".length)], shortCircuit: true };
    return next(url, context);
  },
});

const M = await import("./kindreds-model.ts");
const { whoBook } = await import("../../lib/stranger-who.ts");
const { strangerName, strangerNamer } = await import("../../lib/stranger-name.ts");
const { frostSpec } = await import("../../lib/frost.ts");
const { DEMO_THREADS, DEMO_STATE_THREADS, DEMO_ROOM_SEEN, DEMO_DETAILS } = await import("../../data/demo.ts");
const { threadStateKind } = await import("../../lib/thread-state.ts");
type Thread = import("../../lib/db").ThreadSummary;
type Facts = import("./kindreds-model").KindredsFacts;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const H = 3600_000;
const DAY = 24 * H;
const now = Date.now();

let seq = 0;
function th(p: Partial<Thread> & { id: string }): Thread {
  seq++;
  return {
    stamp: "growing",
    revealed: false,
    mine: 1,
    theirs: 1,
    otherName: null,
    other: "u-" + p.id,
    preview: "words " + p.id,
    lastSenderMe: false,
    lastAt: now - seq * H,
    ...p,
  } as Thread;
}

/* an English-ish fmt: keys come back as themselves, with their vars, so the tests can read them */
const fmt = {
  t: (k: string, v?: Record<string, string | number>) => (v ? `${k}(${Object.entries(v).map(([a, b]) => `${a}=${b}`).join(",")})` : k),
  when: (at: number | string) => `T${typeof at === "number" ? Math.round((now - at) / H) : "s"}`,
  penPal: (o: string | null | undefined) => (o ? `No. ${o}` : "UNSIGNED"),
  sentence: (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
  upper: (s: string) => s.toUpperCase(),
};

const base = (threads: Thread[], over: Partial<Facts> = {}): Facts => ({
  threads,
  ledger: {},
  premium: false,
  settled: true,
  tab: "all",
  show: null,
  loadState: "ready",
  desk: { unread: 0, lastLine: null, lastAt: null },
  wrenName: "Wren",
  notice: false,
  wrenLine: null,
  ...over,
});

const ids = (items: ReturnType<typeof M.buildKindredsView>["items"]) => items.map((i) => i.id);
const rowOf = (v: ReturnType<typeof M.buildKindredsView>, id: string) => {
  const it = v.items.find((i) => i.id === id);
  return it && (it.type === "row" || it.type === "wren") ? it.row : undefined;
};

/* ── who is listed ── */
{
  const v = M.buildKindredsView(base([th({ id: "a", mine: 0, theirs: 1 }), th({ id: "b", mine: 0, theirs: 0 }), th({ id: "c", mine: 1, theirs: 0, lastSenderMe: true })]), fmt);
  ok("a reply to your own letter is listed (mine 0, theirs 1)", ids(v.items).includes("a"));
  ok("a thread nobody wrote in isn't", !ids(v.items).includes("b"));
}

/* ── the owner's order: on you first, then the newest, no grouping ── */
{
  const kOld = th({ id: "k-old", revealed: true, otherName: "Old", theirs: 4, lastAt: now - 10 * H });
  const kOnMe = th({ id: "k-onme", revealed: true, otherName: "Ana", theirs: 4, lastAt: now - 9 * H });
  const pTurn = th({ id: "p-turn", lastSenderMe: false, lastAt: now - 1 * H });
  const pTheir = th({ id: "p-their", lastSenderMe: true, theirs: 2, mine: 3, lastAt: now - 30 * 60_000 });
  const kNew = th({ id: "k-new", revealed: true, otherName: "New", theirs: 2, lastAt: now - 20 * 60_000 });
  const ledger = { "k-old": 4, "k-onme": 2, "k-new": 2 };
  const c = M.classify(base([kOld, kOnMe, pTurn, pTheir, kNew], { ledger, tab: "penpals" }));
  ok("PEN PALS: your turn first, then theirs", c.main.map((t) => t.id).join() === "p-turn,p-their");
  const all = M.classify(base([kOld, kOnMe, pTurn, pTheir, kNew], { ledger }));
  ok("ALL: on-you rows (pen pal and kindred) by recency, then the rest by recency", all.main.map((t) => t.id).join() === "p-turn,k-onme,k-new,p-their,k-old");
  ok("ALL folds the pen pal whose last letter is yours", all.folded.map((t) => t.id).join() === "p-their" && !all.rows.some((t) => t.id === "p-their"));
  ok("kindreds never fold", !all.folded.some((t) => t.revealed));
  const pp = M.classify(base([kOld, kOnMe, pTurn, pTheir, kNew], { ledger, tab: "penpals" }));
  ok("PEN PALS doesn't fold", pp.folded.length === 0 && pp.rows.length === 2);
  const filt = M.classify(base([kOld, kOnMe, pTurn, pTheir, kNew], { ledger, show: "your" }));
  ok("the filter doesn't fold either", filt.folded.length === 0);
}

/* ── waiting (the tab's number and the title) ── */
{
  const ts = [
    th({ id: "k1", revealed: true, theirs: 5 }),
    th({ id: "p1", lastSenderMe: false }),
    th({ id: "p2", lastSenderMe: true }),
    th({ id: "g1", lastSenderMe: false, gone: true, other: null as unknown as string }),
    th({ id: "kq", revealed: true, theirs: 3, lastAt: now - 40 * DAY }),
  ];
  const ledger = { k1: 2, kq: 1 };
  ok("waiting: kindred unread letters each + one per pen pal on you; closed owe nothing; quiet rooms count", M.countOnYou(ts, ledger) === 3 + 1 + 2);
  ok("a room never opened claims nothing", M.countOnYou([th({ id: "k9", revealed: true, theirs: 5 })], {}) === 0);
  // the app icon (owner, 2026-10-21): every unread message, read is read
  ok("icon: a kindred's 3 unread + a never-opened pen pal on you (1); closed owe nothing", M.appBadgeCount(ts, ledger) === 3 + 1 + 2);
  ok("icon: a pen pal read but not answered no longer counts", M.appBadgeCount([th({ id: "p1", lastSenderMe: false, theirs: 2 })], { p1: 2 }) === 0);
  ok("icon: a pen pal's two unread letters are 2", M.appBadgeCount([th({ id: "p1", lastSenderMe: false, theirs: 3 })], { p1: 1 }) === 2);
  const v = M.buildKindredsView(base(ts, { ledger }), fmt);
  ok("status: N letters to answer, active", v.status === "kindreds.toAnswer(n=6)" && v.statusActive);
  const one = M.buildKindredsView(base([th({ id: "p1" })]), fmt);
  ok("status: one letter", one.status === "kindreds.toAnswerOne");
  const none = M.buildKindredsView(base([th({ id: "p2", lastSenderMe: true })]), fmt);
  ok("status: all answered, not a button", none.status === "kindreds.allAnswered" && !none.statusActive);
}

/* ── the entitlement: nothing expires (or closes) before it answers ── */
{
  const q = th({ id: "q", revealed: true, otherName: "Q", lastAt: now - 34 * DAY });
  const cl = th({ id: "cl", revealed: true, otherName: "C", lastAt: now - 25 * DAY });
  const unsettled = M.buildKindredsView(base([q, cl], { settled: false }), fmt);
  ok("unsettled: no Expired group", !ids(unsettled.items).includes("group-expired") && ids(unsettled.items).includes("q"));
  ok("unsettled: the quiet room is an ordinary row", rowOf(unsettled, "q")!.trailingLink === "" && !rowOf(unsettled, "q")!.dim && !rowOf(unsettled, "q")!.nameDim);
  ok("unsettled: no CLOSES IN tag", rowOf(unsettled, "cl")!.tags.length === 0);
  ok("unsettled: no Plush count", unsettled.named === 0);
  const settled = M.buildKindredsView(base([q, cl]), fmt);
  ok("settled: the quiet room is in Expired", ids(settled.items).join().endsWith("group-expired,q"));
  ok("settled: CLOSES IN, in postal red", rowOf(settled, "cl")!.tags[0]?.tone === "post" && rowOf(settled, "cl")!.tags[0]?.text.startsWith("KD.CLOSESIN(N="));
  ok("settled: the Plush count is the unexpired kindreds", settled.named === 1);
  const fc = M.buildKindredsView(base([q, cl], { premium: true }), fmt);
  ok("First Class: nothing quiet, nothing closing", !ids(fc.items).includes("group-expired") && rowOf(fc, "cl")!.tags.length === 0 && fc.named === 2);
  const last = M.buildKindredsView(base([th({ id: "cd", revealed: true, lastAt: now - 29.6 * DAY })]), fmt);
  ok("inside its last day: CLOSES WITHIN A DAY", rowOf(last, "cd")!.tags[0]?.text === "KD.CLOSESDAY");
}

/* ── the quiet room and the your-turn filter (critic: the title said N, the filter said none) ── */
{
  const q = th({ id: "q", revealed: true, otherName: "Q", theirs: 4, lastAt: now - 34 * DAY });
  const ledger = { q: 2 };
  const plain = M.buildKindredsView(base([q], { ledger }), fmt);
  const r = rowOf(plain, "q")!;
  ok("quiet row: Rekindle, no badge, expired words, no time, dim, name muted", r.trailingLink === "kd.menu.rekindle ›" && r.badge === "" && r.preview.startsWith("kd.expiredRow(n=") && r.time === "" && r.dim && r.nameDim);
  ok("quiet row's menu: rekindle, read, page, report, block (demo rows aside)", r.actions.map((a) => a.key).join() === "rekindle,read,page,report,block");
  const filtered = M.buildKindredsView(base([q], { ledger, show: "your" }), fmt);
  const f = rowOf(filtered, "q")!;
  ok("under the filter the quiet room with unread letters is shown", !!f);
  ok("…with its badge in Rekindle's place, the expired words kept", f.badge === "2" && f.trailingLink === "" && f.preview.startsWith("kd.expiredRow"));
  ok("the filter shows no Expired header and no Wren", !ids(filtered.items).includes("group-expired") && !ids(filtered.items).includes("wren"));
  ok("Showing line counts what it shows", filtered.items.some((i) => i.type === "showing" && i.text.includes("n=1")));
}

/* ── Wren: pinned first in ALL with no filter, nowhere else ── */
{
  const ts = [th({ id: "p1" }), th({ id: "k1", revealed: true })];
  const all = M.buildKindredsView(base(ts, { desk: { unread: 2, lastLine: "News", lastAt: new Date(now - H).toISOString() } }), fmt);
  const first = all.items.find((i) => i.type === "wren" || i.type === "row");
  ok("ALL: Wren is the first row", first?.id === "wren");
  const w = rowOf(all, "wren")!;
  ok("Wren: her name, the official mark, her last line, a badge, no menu", w.name === "Wren" && w.faceBadge && w.preview === "News" && w.badge === "2" && w.actions.length === 0);
  ok("Wren's VoiceOver label says OFFICIAL and the count", w.a11yLabel.startsWith("Wren, wo.tag, kd.unreadA11y(n=2)"));
  const quietDesk = M.buildKindredsView(base(ts), fmt);
  ok("Wren with no posts: no time, the desk's subline", rowOf(quietDesk, "wren")!.time === "" && rowOf(quietDesk, "wren")!.preview === "wo.row.sub");
  ok("KINDREDS: no Wren", !ids(M.buildKindredsView(base(ts, { tab: "kindreds" }), fmt).items).includes("wren"));
  ok("PEN PALS: no Wren", !ids(M.buildKindredsView(base(ts, { tab: "penpals" }), fmt).items).includes("wren"));
  ok("filtered: no Wren", !ids(M.buildKindredsView(base(ts, { show: "your" }), fmt).items).includes("wren"));
  ok("an unread desk lights ALL's dot", all.chips[0].dot);
}

/* ── the empty lines, exactly as kindreds.tsx:412 had them ── */
{
  const q = th({ id: "q", revealed: true, lastAt: now - 40 * DAY });
  const gonePal = th({ id: "gp", gone: true, other: null as unknown as string });
  const goneKin = th({ id: "gk", revealed: true, gone: true, other: null as unknown as string, otherName: "Sol" });
  const line = (threads: Thread[], over: Partial<Facts> = {}) => M.classify(base(threads, over)).emptyLine;
  ok("ALL with only a quiet room: no line", line([q]) === null);
  ok("ALL with nothing: no line (Wren is there)", line([]) === null);
  ok("KINDREDS with only a quiet room: no hint", line([q], { tab: "kindreds" }) === null);
  ok("KINDREDS empty: the hint", line([th({ id: "p" })], { tab: "kindreds" }) === "hintKindreds");
  ok("KINDREDS with only a closed kindred: no hint", line([goneKin], { tab: "kindreds" }) === null);
  ok("PEN PALS empty: the hint, even over a closed pen pal", line([gonePal], { tab: "penpals" }) === "hintPenpals");
  ok("filter with nothing on you: ALL ANSWERED, even over quiet and closed", line([q, gonePal, th({ id: "p", lastSenderMe: true })], { show: "your" }) === "allAnswered");
  const v = M.buildKindredsView(base([gonePal], { tab: "penpals" }), fmt);
  ok("the hint's words and link", v.items.some((i) => i.type === "hintPenpals" && i.text === "kd.penPalsEmpty" && i.link === "kd.toDesk"));
}

/* ── the rows' words ── */
{
  const ledger = { k: 1, k9: 0 };
  const ts = [
    th({ id: "k", revealed: true, otherName: "Mira", theirs: 4, lastSenderMe: true, preview: "see you" }),
    th({ id: "k9", revealed: true, otherName: null, theirs: 14 }),
    th({ id: "p-turn", mine: 2, theirs: 3, lastSenderMe: false }),
    th({ id: "p-their", mine: 3, theirs: 2, lastSenderMe: true }),
    th({ id: "p-names", mine: 5, theirs: 5 }),
    th({ id: "p-they", mine: 5, theirs: 5, theirSigned: true }),
    th({ id: "p-you", mine: 5, theirs: 5, iSigned: true }),
    th({ id: "g", mine: 2, theirs: 2, gone: true, other: null as unknown as string }),
  ];
  const v = M.buildKindredsView(base(ts, { ledger, tab: "penpals" }), fmt);
  const vk = M.buildKindredsView(base(ts, { ledger, tab: "kindreds" }), fmt);
  const k = rowOf(vk, "k")!;
  ok("kindred: the number, no turn words, no progress", k.badge === "3" && k.tags.length === 0 && k.progress === "");
  ok("kindred: You: when the last word was yours", k.youPrefix === "mm.you: " && k.preview === "see you");
  ok("kindred: their page and mark as read", k.actions.map((a) => a.key).join() === "read,page,report,block");
  ok("a kindred with no name reads A kindred; 9+ caps the badge", rowOf(vk, "k9")!.name === "kd.aKindred" && rowOf(vk, "k9")!.badge === "9+");
  const k0 = M.buildKindredsView(base([th({ id: "k0", revealed: true, theirs: 3 })], { ledger: { k0: 3 } }), fmt);
  ok("kindred all read: mark as unread", rowOf(k0, "k0")!.actions.map((a) => a.key).join() === "unread,page,report,block");
  const pt = rowOf(v, "p-turn")!;
  ok("pen pal: YOUR TURN in ind, no number", pt.tags.length === 1 && pt.tags[0].text === "STATE.YOURTURN" && pt.tags[0].tone === "ind" && pt.badge === "");
  ok("pen pal: n/5 is letters each way", pt.progress === "2/5" && rowOf(v, "p-names")!.progress === "5/5");
  ok("pen pal: their name is the postal number", pt.name === "No. u-p-turn");
  ok("pen pal: report and block only", pt.actions.map((a) => a.key).join() === "report,block" && pt.actions.every((a) => (a.key === "report" || a.key === "block") === !!a.destructive));
  ok("pen pal: THEIR TURN in mute", rowOf(v, "p-their")!.tags[0]?.text === "STATE.WAITINGTHEM" && rowOf(v, "p-their")!.tags[0]?.tone === "mute");
  ok("five each: SWAP NAMES? in brass replaces the turn", rowOf(v, "p-names")!.tags.map((x) => x.tone).join() === "brass" && rowOf(v, "p-names")!.tags[0].text === "STATE.SWAPNAMES");
  ok("they went first: brass", rowOf(v, "p-they")!.tags[0]?.text === "STATE.THEYWENTFIRST" && rowOf(v, "p-they")!.tags[0]?.tone === "brass");
  ok("you went first: a grey turn tag", rowOf(v, "p-you")!.tags[0]?.text === "STATE.YOUWENTFIRST" && rowOf(v, "p-you")!.tags[0]?.tone === "mute");
  ok("pen pal VoiceOver: name, state, n of 5, time", pt.a11yLabel === "No. u-p-turn, state.yourTurn, mk.ofFive(n=2), " + pt.time);
  const g = rowOf(v, "g")!;
  ok("closed account: ACCOUNT CLOSED, dim, name dim, time kept, no progress, no tags", g.preview === "kd.accountClosed" && g.dim && g.nameDim && g.time !== "" && g.progress === "" && g.tags.length === 0);
  ok("closed account: no menu, and a name that isn't a shared number", g.actions.length === 0 && g.name === "UNSIGNED");
  ok("closed accounts come last", ids(v.items)[ids(v.items).length - 1] === "g");
  ok("a closed pen pal is drawn as the veil (gone face input)", g.face?.role === "penpal" && g.face.gone === true);
  const demo = M.buildKindredsView(base([th({ id: "demo-x", revealed: true, theirs: 2 })], { ledger: { "demo-x": 1 } }), fmt);
  ok("demo rows have no menu", rowOf(demo, "demo-x")!.actions.length === 0);
  const demoOn = M.buildKindredsView(base([th({ id: "demo-x", revealed: true, theirs: 2 })], { ledger: { "demo-x": 1 }, demoMenus: true }), fmt);
  ok("…unless the dev page asks", rowOf(demoOn, "demo-x")!.actions.length === 4);
}

/* ── chips ── */
{
  const ts = [th({ id: "k", revealed: true, theirs: 2 }), th({ id: "p", lastSenderMe: true }), th({ id: "q", revealed: true, lastAt: now - 40 * DAY }), th({ id: "g", gone: true, other: null as unknown as string })];
  const v = M.buildKindredsView(base(ts, { ledger: { k: 1 }, tab: "kindreds" }), fmt);
  ok("chips: All / Kindreds n / Pen pals n, sentence-cased", v.chips.map((c) => `${c.label}${c.count}`).join("|") === "Kd.tab.all|Kd.tab.kindreds2|Kd.tab.penpals1");
  ok("chips: glyphs and the selected one", v.chips.map((c) => c.glyph).join() === "none,kindred,penPal" && v.chips[1].selected && !v.chips[0].selected);
  ok("chips: a dot where someone is on you", v.chips[0].dot && v.chips[1].dot && !v.chips[2].dot);
  ok("chips: VoiceOver reads the name and the count, and the dot on a chip not shown", v.chips[1].a11yLabel === "Kd.tab.kindreds, 2" && v.chips[0].a11yLabel === "Kd.tab.all, State.yourturn" && v.chips[2].a11yLabel === "Kd.tab.penpals, 1");
}

/* ── load states ── */
{
  const failed = M.buildKindredsView(base([], { loadState: "failed" }), fmt);
  ok("failed with nothing kept: an offline line under Wren, never the empty state", !failed.empty && failed.items.some((i) => i.type === "line" && i.text === "auth.err.offline") && ids(failed.items).includes("wren"));
  ok("none (no session, a guest) with nothing: the empty state", M.buildKindredsView(base([], { loadState: "none" }), fmt).empty);
  ok("ready with nothing: the empty state", M.buildKindredsView(base([], { loadState: "ready" }), fmt).empty);
  ok("loading: not the empty state yet", !M.buildKindredsView(base([], { loadState: "loading" }), fmt).empty);
  ok("a closed account alone still isn't empty", !M.buildKindredsView(base([th({ id: "g", gone: true, other: null as unknown as string })]), fmt).empty);

  // nothing read (failed, loading): claim nothing the screen can't back
  for (const state of ["failed", "loading"] as const) {
    for (const tab of ["all", "kindreds", "penpals"] as const) {
      const v = M.buildKindredsView(base([], { loadState: state, tab }), fmt);
      ok(`${state} on ${tab}: no title status (not ALL ANSWERED), not a button`, v.status === "" && v.statusA11y === "" && !v.statusActive);
      ok(`${state} on ${tab}: no chip counts (not "Pen pals 0")`, v.chips.every((c) => c.count === "") && v.chips[2].a11yLabel === "Kd.tab.penpals");
      ok(`${state} on ${tab}: no empty line or hint`, !v.items.some((i) => i.type === "emptyLine" || i.type === "hintKindreds" || i.type === "hintPenpals"));
      ok(`${state} on ${tab}: classify agrees`, M.classify(base([], { loadState: state, tab })).emptyLine === null);
    }
    const filtered = M.buildKindredsView(base([], { loadState: state, show: "your" }), fmt);
    ok(`${state} under the filter: no ALL ANSWERED line`, !filtered.items.some((i) => i.type === "emptyLine"));
  }
  const failedPen = M.buildKindredsView(base([], { loadState: "failed", tab: "penpals" }), fmt);
  ok("failed on PEN PALS: the offline line is all it says", failedPen.items.filter((i) => i.type !== "wrenLine" && i.type !== "notice").map((i) => i.id).join() === "offline");
  // a real answer still says everything
  const readyEmpty = M.buildKindredsView(base([th({ id: "p", lastSenderMe: true })], { loadState: "ready", tab: "kindreds" }), fmt);
  ok("ready: the status, the counts and the hint are back", readyEmpty.status === "kindreds.allAnswered" && readyEmpty.chips[1].count === "0" && readyEmpty.chips[2].count === "1" && readyEmpty.items.some((i) => i.type === "hintKindreds"));
  ok("none (a guest): the counts and status are real answers too", M.buildKindredsView(base([], { loadState: "none", tab: "penpals" }), fmt).chips[2].count === "0" && M.classify(base([], { loadState: "none", tab: "penpals" })).emptyLine === "hintPenpals");
}

/* ── the band's words, her line, the notice ── */
{
  const v = M.buildKindredsView(base([th({ id: "p" })], { notice: true, wrenLine: "Wren says hi" }), fmt);
  ok("her once-line comes first, then the notice", v.items[0].type === "wrenLine" && v.items[1].type === "notice");
  ok("the legend: closer, and state.yourTurn as a sentence (in nine languages already); the chip's name", v.legendCloser === "kd.legendCloser" && v.legendTurn === "State.yourturn" && v.orbitChipLabel === "kd.orbit");
  ok("title", v.title === "kindreds.title");
}

/* ── the orbit ── */
{
  const ts = [
    th({ id: "o3", theirs: 3, mine: 2 }),
    th({ id: "o1", theirs: 0, mine: 1, lastSenderMe: true }),
    th({ id: "o2", theirs: 7, mine: 6, lastSenderMe: true }),
    th({ id: "kin", revealed: true }),
    th({ id: "gone", gone: true, other: null as unknown as string }),
  ];
  const a = M.buildKindredsView(base(ts), fmt).orbit;
  ok("named people and closed accounts are never drawn", a.length === 3 && !a.some((o) => o.id === "kin" || o.id === "gone"));
  ok("in a stable order (thread id)", a.map((o) => o.id).join() === "o1,o2,o3");
  ok("ring = THEIR letters, capped at five; the void at 0", a.find((o) => o.id === "o1")!.ring === 0 && a.find((o) => o.id === "o2")!.ring === 5 && a.find((o) => o.id === "o3")!.ring === 3);
  ok("your turn is inked", a.find((o) => o.id === "o3")!.turn && !a.find((o) => o.id === "o1")!.turn);
  ok("drift: a direction and 150–270 s a circuit", a.every((o) => (o.dir === 1 || o.dir === -1) && o.period >= 150 && o.period < 270));
  ok("a face is the developed FACE v1 mask", a.every((o) => o.mask > 0 && o.mask < 1 << 25));
  // a reply re-sorts the list (o1 newest, now on you) — nobody moves
  const moved = ts.map((t) => (t.id === "o1" ? { ...t, lastSenderMe: false, lastAt: now } : t)).reverse();
  const b = M.buildKindredsView(base(moved), fmt).orbit;
  ok("a re-sort moves nobody on the orbit (same a0, dir, period)", a.every((o) => { const p = b.find((x) => x.id === o.id)!; return p.a0 === o.a0 && p.dir === o.dir && p.period === o.period; }));
}

/* ── the folded row ── */
{
  const theirs = Array.from({ length: 8 }, (_, i) => th({ id: `f${i}`, lastSenderMe: true, mine: 2, theirs: 1 }));
  const v = M.buildKindredsView(base(theirs), fmt);
  const fold = v.items.find((i) => i.type === "fold");
  ok("eight waiting on them: one folded row", !!fold && v.items.filter((i) => i.type === "row").length === 0);
  if (fold && fold.type === "fold") {
    ok("six faces, then +2", fold.fold.faces.length === 6 && fold.fold.more === "+2");
    ok("label and VoiceOver", fold.fold.label === "State.waitingthem · 8" && fold.fold.a11yLabel === "State.waitingthem · 8, Kd.tab.penpals");
    ok("each face is named for VoiceOver", fold.fold.faces.every((f) => f.a11yLabel.startsWith("No. ")));
  }
  ok("the fold sits after the rows and before the quiet group", (() => {
    const mix = M.buildKindredsView(base([...theirs.slice(0, 2), th({ id: "r", lastSenderMe: false }), th({ id: "q", revealed: true, lastAt: now - 40 * DAY })]), fmt);
    const order = ids(mix.items);
    return order.indexOf("r") < order.indexOf("fold") && order.indexOf("fold") < order.indexOf("group-expired");
  })());
}

/* ── the demo fixtures draw every state the sim checks ask for ── */
{
  const demo = [...DEMO_THREADS, ...DEMO_STATE_THREADS];
  const v = M.buildKindredsView(base(demo, { ledger: DEMO_ROOM_SEEN, demoMenus: true }), fmt);
  const order = ids(v.items);
  ok("demo: Ren's room is in Expired", order.indexOf("group-expired") >= 0 && order.indexOf("demo-expired") > order.indexOf("group-expired"));
  ok("demo: Pia's room closes soon", rowOf(v, "demo-closing")!.tags.some((t) => t.tone === "post"));
  ok("demo: the closed kindred and pen pal are at the foot", order.slice(-2).sort().join() === "demo-gone-kindred,demo-gone-penpal");
  ok("demo: the closed kindred keeps the face they gave", rowOf(v, "demo-gone-kindred")!.face?.avatarId === "f-honey");
  ok("demo: kindreds with a seeded ledger show numbers", rowOf(v, "demo-juno")!.badge !== "" && rowOf(v, "demo-mira")!.badge === "2");
  ok("demo: a brass moment and a fold", Object.values(v.items).some((i) => i.type === "row" && i.row.tags.some((t) => t.tone === "brass")) && order.includes("fold"));
  ok("demo: the orbit has no kindreds", !v.orbit.some((o) => o.id === "demo-mira" || o.id === "demo-juno"));
}

/* ── the demo list and the demo conversations say the same turn (owner's audit, 2026-11-10:
      "Starlit Doily" said YOUR TURN on its row and THEIR TURN in its chat header) ──
   The row reads its turn off the summary (lastSenderMe); the chat header and the reader read
   it off the conversation, with these very facts (useLettersModel, useReaderModel). Both go
   through lib/thread-state threadStateKind, and on real data lastSenderMe is the server's
   last_sender, the sender of the last message, so they are one fact. Only fixtures can split. */
{
  const rows = [...DEMO_THREADS, ...DEMO_STATE_THREADS];
  type Detail = (typeof DEMO_DETAILS)[string];
  const headerKind = (d: Detail) =>
    threadStateKind({
      mine: d.myCount,
      theirs: d.otherCount,
      revealed: d.revealed,
      lastSenderMe: !d.messages.length || !!d.messages[d.messages.length - 1]?.mine,
      iSigned: d.iSigned,
      theirSigned: d.theirSigned,
      gone: d.gone,
    });
  const split = rows.filter((r) => threadStateKind(r) !== headerKind(DEMO_DETAILS[r.id])).map((r) => r.id);
  ok(`demo: every row's turn is the one its conversation's header shows${split.length ? ` (not ${split.join(", ")})` : ""}`, split.length === 0);
  for (const id of ["demo-wren", "demo-quiet"]) {
    const row = rows.find((r) => r.id === id)!;
    const d = DEMO_DETAILS[id];
    const last = d.messages[d.messages.length - 1];
    ok(`demo: ${id}'s newest letter is theirs, and it is the line the row shows`, !last.mine && last.body.startsWith(row.preview) && row.lastSenderMe === false);
    ok(`demo: ${id}'s counts match its letters, on the row and in the conversation`, d.myCount === d.messages.filter((m) => m.mine).length && d.otherCount === d.messages.filter((m) => !m.mine).length && row.mine === d.myCount && row.theirs === d.otherCount);
    ok(`demo: ${id}'s newest letter is as old as the row says`, Math.abs(Date.parse(last.date) - row.lastAt) < 60_000);
  }
}

/* ── faces for the native list ── */
{
  const v = M.buildKindredsView(base([th({ id: "k", revealed: true, otherFace: "f-cloud" }), th({ id: "p", theirs: 2 })]), fmt);
  const f = M.faceInputs(v);
  ok("faces: one per thread row, keyed by id; Wren has none", Object.keys(f).sort().join() === "k,p" && f.k.role === "kindred" && f.k.avatarId === "f-cloud" && f.p.role === "penpal");
  ok("a pen pal's face develops with THEIR letters", f.p.develop === 0.15 + 0.85 * (2 / 5));
}

/* ── the identity switch (lib/stranger-who's book in fmt.who) ── */
{
  const DEMO = [...DEMO_THREADS, ...DEMO_STATE_THREADS];
  const theirs = Array.from({ length: 8 }, (_, i) => th({ id: `w${i}`, lastSenderMe: true, mine: 2, theirs: 1 }));
  const mixed = [
    th({ id: "k", revealed: true, otherName: "Mara", theirs: 2 }),
    th({ id: "p", theirs: 2, mine: 2 }),
    th({ id: "o3", theirs: 3, mine: 2 }),
    th({ id: "o1", theirs: 0, mine: 1, lastSenderMe: true }),
    th({ id: "g", gone: true, other: null as unknown as string }),
    ...theirs,
  ];
  const penPal = (u: string | null | undefined) => fmt.penPal(u);

  /* SWITCH OFF: a book made with the switch off gives exactly the view without one */
  const offBook = whoBook({ identity: false, t: fmt.t, lang: "en", penPal, marks: () => ({ mark: "he", sign: "leo" }), dark: true, firstOnAt: now - DAY });
  for (const [label, ts, over] of [
    ["mixed", mixed, {}],
    ["demo", DEMO, { ledger: DEMO_ROOM_SEEN, demoMenus: true }],
    ["pen pals tab", mixed, { tab: "penpals" as const }],
    ["your turn", mixed, { show: "your" as const }],
  ] as const) {
    const a = M.buildKindredsView(base(ts as Thread[], over as Partial<Facts>), fmt);
    const b = M.buildKindredsView(base(ts as Thread[], over as Partial<Facts>), { ...fmt, who: offBook });
    ok(`identity off (${label}): the view is exactly today's`, JSON.stringify(a) === JSON.stringify(b));
  }
  const off = M.buildKindredsView(base(mixed), fmt);
  ok("identity off: no marks, no 'was', no frost anywhere", (() => {
    const rows = off.items.flatMap((i) => (i.type === "row" || i.type === "wren" ? [i.row] : []));
    const fold = off.items.find((i) => i.type === "fold");
    return (
      rows.every((r) => r.mark === null && r.sign === null && r.markLabel === "" && r.signLabel === "" && r.was === "" && !r.face?.frost) &&
      off.orbit.every((o) => o.frost === null) &&
      !!fold && fold.type === "fold" && fold.fold.faces.every((f) => f.frost === null) &&
      off.legendFrost === null && off.identity === false
    );
  })());

  /* SWITCH ON */
  const since = now - 2 * DAY;
  const marks = (u: string) => (u === "u-p" ? { mark: "she" as const, sign: "gemini" as const } : u === "u-o3" ? { mark: null, sign: "leo" as const } : { mark: null, sign: null });
  const namer = strangerNamer(mixed.map((x) => ({ id: x.id, createdAt: x.createdAt ?? null, other: x.gone ? null : x.other })), "en");
  const onBook = whoBook({ identity: true, t: fmt.t, lang: "en", penPal, namer, marks, dark: false, firstOnAt: since });
  const on = M.buildKindredsView(base(mixed), { ...fmt, who: onBook });
  const p = rowOf(on, "p")!;
  const name = namer.name("u-p", { unsigned: "ld.unsigned" });
  ok("identity on: a pen pal is the courier name from the reader's list", p.name === name && name === strangerName("u-p", { lang: "en", unsigned: "" }) && !p.name.startsWith("No."));
  // a pen pal is still a stranger: the sign on the row, never the she/he mark (owner, 2026-11-12)
  ok("identity on: a pen pal's row has the sign alone, never the mark", p.mark === null && p.markLabel === "" && p.sign === "gemini" && p.signLabel === "zd.gemini");
  ok("identity on: a sign alone, no mark", rowOf(on, "o3")!.mark === null && rowOf(on, "o3")!.sign === "leo");
  ok("identity on: the row's face is their frosted window (FROST v1), never developing", p.face?.role === "penpal" && JSON.stringify(p.face.frost) === JSON.stringify(frostSpec("u-p", false)));
  ok("identity on: a pen pal from before the switch never says was No. (owner, 2026-10-21)", p.was === "");
  ok("identity on: VoiceOver says Pen pal, the name, the sign (never the mark), then the state", p.a11yLabel === `id.vo.penPal, ${name}, zd.gemini, state.yourTurn, mk.ofFive(n=2), ${p.time}`);
  const fresh = M.buildKindredsView(base([th({ id: "n", createdAt: now - DAY })]), { ...fmt, who: onBook });
  ok("identity on: a thread opened after the switch never had a number", rowOf(fresh, "n")!.was === "");
  const later = whoBook({ identity: true, t: fmt.t, lang: "en", penPal, namer, marks, firstOnAt: now - 15 * DAY });
  ok("identity on: after fourteen days the old number is gone", rowOf(M.buildKindredsView(base(mixed), { ...fmt, who: later }), "p")!.was === "");
  const k = rowOf(on, "k")!;
  ok("identity on: a kindred who shows neither keeps their name and face, no mark, no sign, no was", k.name === "Mara" && k.mark === null && k.sign === null && k.was === "" && k.face?.role === "kindred" && !k.face.frost);
  /* the she/he mark is a kindred's to see (owner, 2026-11-12): after their pen name, and spoken */
  {
    const km = (u: string) => (u === "u-km" ? { mark: "he" as const, sign: "leo" as const } : { mark: null, sign: null });
    const kBook = whoBook({ identity: true, t: fmt.t, lang: "en", penPal, namer, marks: km, dark: false, firstOnAt: since });
    const v = M.buildKindredsView(base([th({ id: "km", revealed: true, otherName: "Juniper", other: "u-km" }), th({ id: "kgm", revealed: true, gone: true, otherName: "Sol", other: "u-km" })]), { ...fmt, who: kBook });
    const r = rowOf(v, "km")!;
    ok("a kindred's row has their mark and sign after the pen name", r.name === "Juniper" && r.mark === "he" && r.markLabel === "id.mark.he" && r.sign === "leo" && r.signLabel === "zd.leo" && !r.face?.frost);
    ok("VoiceOver says the kindred's name, mark and sign", r.a11yLabel.startsWith("Juniper, id.mark.he, zd.leo"));
    ok("a kindred whose account is gone has no marks", rowOf(v, "kgm")!.mark === null && rowOf(v, "kgm")!.sign === null);
    const offV = M.buildKindredsView(base([th({ id: "km", revealed: true, otherName: "Juniper", other: "u-km" })]), { ...fmt, who: whoBook({ identity: false, t: fmt.t, lang: "en", penPal, marks: km }) });
    ok("switch off: a kindred has no marks", rowOf(offV, "km")!.mark === null && rowOf(offV, "km")!.sign === null);
  }
  /* Phase 2: a new kindred says the courier name they wore, for seven days after names were traded */
  {
    const fresh = th({ id: "kn", revealed: true, otherName: "Juniper", other: "u-kn", revealedAt: now - 2 * DAY });
    const old = th({ id: "ko", revealed: true, otherName: "Wren Ash", other: "u-ko", revealedAt: now - 8 * DAY });
    const ghost = th({ id: "kg", revealed: true, gone: true, otherName: "Sol", other: "u-kg", revealedAt: now - DAY });
    const v = M.buildKindredsView(base([fresh, old, ghost]), { ...fmt, who: onBook });
    const kn = rowOf(v, "kn")!;
    const courier = onBook.name("u-kn");
    // owner, 2026-10-31: no "was …" on the list; the kindred's page keeps it as FIRST MET AS
    ok("a new kindred's row has no was line", kn.was === "" && kn.name === "Juniper");
    ok("VoiceOver says no was line either", kn.a11yLabel.startsWith("Juniper") && !kn.a11yLabel.includes("id2.kd.was"));
    ok("Phase 2: after seven days the courier name is gone", rowOf(v, "ko")!.was === "");
    ok("Phase 2: a gone kindred has no was line", rowOf(v, "kg")!.was === "");
    const offV = M.buildKindredsView(base([fresh]), { ...fmt, who: offBook });
    ok("Phase 2: switch off, no was line on a kindred", rowOf(offV, "kn")!.was === "");
    ok("Phase 2: kindredWas edges — no date, the future, day seven exactly", M.kindredWas({ revealed: true, other: "u", revealedAt: null }, onBook, fmt.t, now) === "" && M.kindredWas({ revealed: true, other: "u", revealedAt: now + DAY }, onBook, fmt.t, now) === "" && M.kindredWas({ revealed: true, other: "u", revealedAt: now - 7 * DAY }, onBook, fmt.t, now) === "" && M.kindredWas({ revealed: true, other: "u", revealedAt: now - 7 * DAY + 1 }, onBook, fmt.t, now) !== "");
    ok("Phase 2: a pen pal is never given a kindred's was line", M.kindredWas({ revealed: false, other: "u", revealedAt: now - DAY }, onBook, fmt.t, now) === "");
  }
  const g = rowOf(on, "g")!;
  ok("identity on: a closed pen pal is UNSIGNED behind the veil", g.name === "ld.unsigned" && g.face?.gone === true && !g.face.frost && g.mark === null);
  const w = on.items.find((i) => i.type === "wren");
  ok("identity on: Wren's row has no mark", !!w && w.type === "wren" && w.row.mark === null && w.row.sign === null && w.row.was === "");
  ok("identity on: the orbit draws frosted windows", on.orbit.length === 11 && on.orbit.every((o) => o.frost !== null && JSON.stringify(o.frost) === JSON.stringify(frostSpec(o.seed, false))));
  ok("identity on: the window is the same on every ring (it never develops; the ring is the progress)", (() => {
    const moved = mixed.map((x) => (x.id === "o1" ? { ...x, theirs: 4 } : x));
    const a = on.orbit.find((o) => o.id === "o1")!;
    const b = M.buildKindredsView(base(moved), { ...fmt, who: onBook }).orbit.find((o) => o.id === "o1")!;
    return a.ring !== b.ring && JSON.stringify(a.frost) === JSON.stringify(b.frost);
  })());
  ok("identity on: the orbit's places and turns don't move with the switch", JSON.stringify(on.orbit.map((o) => [o.id, o.ring, o.a0, o.dir, o.period, o.turn])) === JSON.stringify(off.orbit.map((o) => [o.id, o.ring, o.a0, o.dir, o.period, o.turn])));
  const fold = on.items.find((i) => i.type === "fold");
  ok("identity on: the folded row's faces are frost, named by the courier", !!fold && fold.type === "fold" && fold.fold.faces.every((f) => f.frost !== null && f.a11yLabel === namer.name(f.seed, { unsigned: "" })));
  ok("identity on: the legend's PEN PALS glyph is a frosted square (a sample window, nobody's)", on.identity === true && JSON.stringify(on.legendFrost) === JSON.stringify(frostSpec(M.LEGEND_FROST_SEED, false)));
  ok("identity on: who is listed, the order and the counts don't change", JSON.stringify(ids(on.items)) === JSON.stringify(ids(off.items)) && on.status === off.status && JSON.stringify(on.chips) === JSON.stringify(off.chips));
  ok("identity on: the faces for the native list carry the frost", (() => {
    const f = M.faceInputs(on);
    return !!f.p.frost && !f.k.frost;
  })());
  ok("identity on, Midnight: the dark tones", (() => {
    const dark = whoBook({ identity: true, t: fmt.t, lang: "en", penPal, dark: true });
    const v = M.buildKindredsView(base(mixed), { ...fmt, who: dark });
    return JSON.stringify(rowOf(v, "p")!.face?.frost) === JSON.stringify(frostSpec("u-p", true)) && JSON.stringify(v.legendFrost) === JSON.stringify(frostSpec(M.LEGEND_FROST_SEED, true));
  })());
}

/* ── search (owner's audit, 2026-11-10) ── */
{
  const K = M.searchKey;
  ok("search key: case and Latin accents don't count", K("  ÉLODIE  Ñandú ") === "elodie nandu" && K("İstanbul") === "istanbul");
  ok("search key: full width folds, CJK stays whole", K("Ｋｉｔｅ") === "kite" && K("雨のランタン").includes(K("ランタン")) && K("ｶﾞ") === "ガ");
  ok("search key: a kana's voiced mark is part of the letter", K("が") !== K("か") && K("가을").includes(K("을")));
  ok("search hit: a plain substring of any field; nothing for an empty query", M.searchHit("kit", ["Sunday Kite", null]) && !M.searchHit("", ["Sunday Kite"]) && !M.searchHit("kite", [null, undefined, ""]));

  const list = [
    th({ id: "mara", revealed: true, otherName: "Mára Élodie", theirs: 2, preview: "the kettle is the only thing awake" }),
    th({ id: "pal", theirs: 2, mine: 2, preview: "Left law school in my last term" }),
    th({ id: "wait", theirs: 1, mine: 2, lastSenderMe: true, preview: "verse two is about you" }),
    th({ id: "old", revealed: true, otherName: "Otto", lastAt: now - 40 * DAY, preview: "the cherry tree did the thing" }),
    th({ id: "shut", revealed: true, otherName: "Sol", gone: true, other: null as unknown as string, preview: "keep writing to people" }),
    th({ id: "ghost", gone: true, other: null as unknown as string, preview: "light lit, sea calm" }),
  ];
  const penPal = (u: string | null | undefined) => fmt.penPal(u);
  const namer = strangerNamer(list, "en");
  const onBook = whoBook({ identity: true, t: fmt.t, lang: "en", penPal, namer });
  const onFmt = { ...fmt, who: onBook };
  const view = (search: string | null, over: Partial<Facts> = {}, f = fmt) => M.buildKindredsView(base(list, { desk: { unread: 0, lastLine: "A stamp is a small yes.", lastAt: null }, search, ...over }), f);
  const found = (search: string, over: Partial<Facts> = {}, f = fmt) => ids(view(search, over, f).items);

  const plain = view(null);
  ok("search: not searching, and an empty or blank field, leave the list as it was", JSON.stringify(view("")) === JSON.stringify(plain) && JSON.stringify(view("   ")) === JSON.stringify(plain) && JSON.stringify(M.buildKindredsView(base(list, { desk: { unread: 0, lastLine: "A stamp is a small yes.", lastAt: null } }), fmt)) === JSON.stringify(plain));
  ok("search: the list folds their-turn pen pals; a search doesn't", ids(plain.items).includes("fold") && !ids(plain.items).includes("wait") && found("verse").join() === "wait");
  ok("search: a kindred by the name they signed, whatever the case or accents", found("mara elo").join() === "mara" && found("ÉLODIE").join() === "mara");
  ok("search: a pen pal by the name the row shows (switch off: the number)", found("no. u-pal").join() === "pal");
  ok("search: a pen pal by their courier name (switch on)", found(namer.name("u-pal", { unsigned: "" }).toUpperCase(), {}, onFmt).join() === "pal");
  ok("search: a kindred by what they were first met as (the courier name, and the number before it)", found(namer.name("u-mara", { unsigned: "" }), {}, onFmt).includes("mara") && found("no. u-mara", {}, onFmt).join() === "mara");
  ok("search: anyone by the last line their row shows", found("kettle").join() === "mara" && found("LAW SCHOOL").join() === "pal");
  ok("search: a quiet room and a closed account by name only (their rows show a status, not the line)", found("otto").join() === "old" && found("cherry").join() === "search-none" && found("sol").join() === "shut" && found("keep writing").join() === "search-none" && found("sea calm").join() === "search-none");
  ok("search: a quiet room is drawn as one (Rekindle), a closed account dimmed", rowOf(view("otto"), "old")!.trailingLink !== "" && rowOf(view("sol"), "shut")!.dim === true);
  ok("search: Wren's row by her name, and by her last line", found("wren").join() === "wren" && found("small yes").join() === "wren");
  ok("search: the owner's order holds (on you first, then the newest), quiet and closed after", (() => {
    const all = found("o"); // every name or shown line with an o: pal (on you), mara, wait, then quiet Otto, then closed Sol
    return all.join() === "pal,mara,wait,old,shut" && all.indexOf("mara") < all.indexOf("wait") && all.indexOf("wait") < all.indexOf("old") && all.indexOf("old") < all.indexOf("shut");
  })());
  ok("search: nothing found is one quiet line, and nothing else", (() => {
    const v = view("zzzz");
    return v.items.length === 1 && v.items[0].type === "line" && v.items[0].id === "search-none" && v.items[0].text === "kd.search.none";
  })());
  ok("search: it reads everyone, whatever tab or filter is on", found("kettle", { tab: "penpals" }).join() === "mara" && found("verse", { show: "your" }).join() === "wait" && found("law", { tab: "kindreds" }).join() === "pal");
  ok("search: no once-line, notice, Showing line, fold or group header among the results", (() => {
    const v = view("e", { wrenLine: "hello", notice: true, show: "your" });
    return v.items.every((i) => i.type === "row" || i.type === "wren");
  })());
  ok("search: the chips, the title and the orbit don't change with the words", (() => {
    const v = view("kettle");
    return JSON.stringify(v.chips) === JSON.stringify(plain.chips) && v.status === plain.status && JSON.stringify(v.orbit) === JSON.stringify(plain.orbit) && v.waiting === plain.waiting;
  })());
  ok("search: with nothing read yet, no claim that nobody matches", (() => {
    const failed = M.buildKindredsView(base([], { loadState: "failed", search: "zzzz" }), fmt);
    const loading = M.buildKindredsView(base([], { loadState: "loading", search: "zzzz" }), fmt);
    return ids(failed.items).join() === "offline" && loading.items.length === 0;
  })());
  ok("search: the words for the chip and the field", plain.search.label === "kd.search" && plain.search.placeholder === "kd.search.ph" && plain.search.cancel === "ml.cancel" && plain.search.clear === "id2.sheet.clear");
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
if (fails) process.exit(1);
