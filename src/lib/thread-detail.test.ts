/* Behaviour lock for the thread data rules (lib/thread-detail-core) and the
   demo fixtures every state check runs on (data/demo). Not wired to a
   runner; run by hand from the repo root with plain node (it strips the
   types itself from Node 22.18 / 23.6 on):
     node src/lib/thread-detail.test.ts */

import {
  FOLD_MAX,
  TAKEN_BACK,
  buildThreadDetail,
  chatSeenRule,
  confirmMissing,
  decideThreadFetch,
  emptyReadFail,
  foldOver,
  initialDetailState,
  isNetworkish,
  isRefusal,
  isSchemaError,
  mergePending,
  readReason,
  reduceDetail,
  seenCountAfter,
  signedOf,
  unconfirmedEmpty,
  writeFailOf,
  type DetailState,
  type ThreadRow,
} from "./thread-detail-core.ts";
import {
  DEMO_DETAILS,
  DEMO_FOLDS,
  DEMO_JOURNAL,
  DEMO_POOL,
  DEMO_ROOM_SEEN,
  DEMO_STATE_JOURNAL,
  DEMO_STATE_THREADS,
  DEMO_TAKEN_BACK,
  DEMO_THREADS,
  demoDetail,
  demoFolds,
  demoJournal,
  demoListMode,
  demoMediaUrl,
  demoThreads,
  seedDemoThread,
  setDemoListMode,
  withDemoRoomSeen,
} from "../data/demo.ts";
import type { ThreadDetail, ThreadMessage } from "./db";

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };
const DAY = 864e5;

/* ── what an error means ── */
const NET = { message: "TypeError: Network request failed", details: "", hint: "", code: "" };
ok("postgrest's network failure is networkish", isNetworkish(NET));
ok("status 0 is networkish", isNetworkish({ message: "whatever" }, 0));
ok("auth's retryable fetch error is networkish", isNetworkish({ name: "AuthRetryableFetchError", message: "x", status: 0 }));
ok("an abort (our deadline) is networkish", isNetworkish({ message: "AbortError: Aborted" }));
ok("a missing column is not networkish", !isNetworkish({ code: "42703", message: "column threads.revealed_at does not exist" }));
ok("nothing is not networkish", !isNetworkish(null));
ok("readReason: network vs error", readReason(NET) === "network" && readReason({ code: "500", message: "boom" }) === "error");
ok("schema: undefined column", isSchemaError({ code: "42703", message: "column threads.revealed_at does not exist" }));
ok("schema: unknown relationship for the embed", isSchemaError({ code: "PGRST200", message: "Could not find a relationship between 'threads' and 'letters' in the schema cache" }));
ok("schema: a policy refusal is not one", !isSchemaError({ code: "42501", message: "permission denied for table threads" }));
ok("schema: a dropped connection is not one", !isSchemaError(NET));
const REBUILDING = { code: "PGRST002", message: "Could not query the database for the schema cache. Retrying.", details: null, hint: null };
ok("schema: the schema cache being rebuilt (PGRST002) is not one", !isSchemaError(REBUILDING) && !isSchemaError(REBUILDING, 503));
ok("schema: no 5xx answer is one, whatever it says", !isSchemaError({ code: "", message: "Could not find the 'revealed_at' column of 'threads' in the schema cache" }, 503));
ok("schema: an unknown column (PGRST204) at 400 still is one", isSchemaError({ code: "PGRST204", message: "Could not find the 'revealed_at' column of 'threads' in the schema cache" }, 400));
ok("schema: an unknown column by its words alone still is one", isSchemaError({ message: "Could not find the 'revealed_at' column of 'threads' in the schema cache" }));

/* ── a thread fetch's verdict ── */
ok("thread query dropped → offline/network", (() => { const v = decideThreadFetch({ threadError: NET, hasRow: false, messagesError: null }); return v.status === "offline" && v.reason === "network"; })());
ok("thread query errored → offline/error, never missing", (() => { const v = decideThreadFetch({ threadError: { code: "500", message: "boom" }, hasRow: false, messagesError: null }); return v.status === "offline" && v.reason === "error"; })());
ok("no error and no row → missing", decideThreadFetch({ threadError: null, hasRow: false, messagesError: null }).status === "missing");
ok("no row wins over a failed messages query (hidden thread)", decideThreadFetch({ threadError: null, hasRow: false, messagesError: NET }).status === "missing");
ok("row but messages failed → offline, never an empty ok room", (() => { const v = decideThreadFetch({ threadError: null, hasRow: true, messagesError: NET }); return v.status === "offline" && v.reason === "network"; })());
ok("row and messages → ok", decideThreadFetch({ threadError: null, hasRow: true, messagesError: null }).status === "ok");

/* ── an empty answer counts only if it was asked as you ── */
const EMPTY_READ = decideThreadFetch({ threadError: null, hasRow: false, messagesError: null });
const LIVE = { uid: "me", error: null };
ok("missing with a live session for me stays missing", confirmMissing(EMPTY_READ, LIVE, "me").status === "missing");
ok("missing with no session (refresh rejected → anon read) → offline/no-session, nothing deleted", (() => { const v = confirmMissing(EMPTY_READ, { uid: null, error: { name: "AuthApiError", message: "Invalid Refresh Token: Refresh Token Not Found", status: 400 } }, "me"); return v.status === "offline" && v.reason === "no-session"; })());
ok("missing while auth's refresh couldn't reach the server → offline/network", (() => { const v = confirmMissing(EMPTY_READ, { uid: null, error: { name: "AuthRetryableFetchError", message: "Network request failed", status: 0 } }, "me"); return v.status === "offline" && v.reason === "network"; })());
ok("missing with someone else's session → offline", confirmMissing(EMPTY_READ, { uid: "other", error: null }, "me").status === "offline");
ok("confirmMissing passes ok and offline through", confirmMissing({ status: "ok" }, { uid: null }, "me").status === "ok" && (() => { const v = confirmMissing({ status: "offline", reason: "error" }, { uid: null }, "me"); return v.status === "offline" && v.reason === "error"; })());
ok("unconfirmedEmpty: believed only with my session", unconfirmedEmpty(LIVE, "me") === null && unconfirmedEmpty({ uid: undefined }, "me") === "no-session");
ok("a write's empty read: gone only with my session", emptyReadFail(LIVE, "me") === "gone");
ok("a write's empty read without a session → session, never a refusal", emptyReadFail({ uid: null, error: null }, "me") === "session" && !isRefusal(emptyReadFail({ uid: null, error: null }, "me")));
ok("a write's empty read while auth is unreachable → offline", emptyReadFail({ uid: null, error: { name: "AuthRetryableFetchError", message: "x", status: 0 } }, "me") === "offline");

/* ── a row, made into a detail ── */
const row = (o: Partial<ThreadRow> = {}): ThreadRow => ({
  a: "me", b: "them", stamp: "crush", revealed: true, a_count: 3, b_count: 4, a_name: "Ana", b_name: "Bo",
  a_face: "f-a", b_face: "f-b", opening: "the letter", opening_media: null, opening_duration_s: null,
  created_at: "2026-10-02T10:00:00Z", revealed_at: "2026-10-09T10:00:00Z", letter: "L1",
  opening_letter: { created_at: "2026-09-30T08:00:00Z" }, ...o,
});
const msgs = [
  { id: "m1", sender: "me", body: "hello", created_at: "2026-10-02T10:00:00Z", kind: null, media_path: null, meta: null, recalled_at: null },
  { id: "m2", sender: "them", body: "hi", created_at: "2026-10-03T10:00:00Z", meta: { reply: { id: "m1", excerpt: "hello", sender: "me" } } },
  { id: "m3", sender: "them", body: TAKEN_BACK, created_at: "2026-10-04T10:00:00Z", recalled_at: "2026-10-04T10:01:00Z" },
];
const dA = buildThreadDetail(row(), msgs, "me");
ok("as a: my count is a_count, theirs b_count", dA.myCount === 3 && dA.otherCount === 4);
ok("as a: their name and face are b's", dA.otherName === "Bo" && dA.otherFace === "f-b" && dA.other === "them");
ok("as a: the opening is theirs", dA.openingFromMe === false);
ok("signatures read from both sides", dA.iSigned === true && dA.theirSigned === true);
ok("revealedAt comes through", dA.revealedAt === "2026-10-09T10:00:00Z");
ok("openingAt is the LETTER's date, read through threads.letter", dA.openingAt === "2026-09-30T08:00:00Z");
ok("bug 3: since stays the first reply's date, not the opening's", dA.since === "2026-10-02T10:00:00Z" && dA.since !== dA.openingAt);
ok("letterId comes through", dA.letterId === "L1");
ok("an embed handed back as an array still reads", buildThreadDetail(row({ opening_letter: [{ created_at: "2026-09-01T00:00:00Z" }] }), [], "me").openingAt === "2026-09-01T00:00:00Z");
ok("an unreadable letter (RLS) → openingAt null", buildThreadDetail(row({ opening_letter: null }), [], "me").openingAt === null);
ok("a pre-0020 row → revealedAt / openingAt / letterId null", (() => { const d = buildThreadDetail(row({ revealed_at: undefined, letter: undefined, opening_letter: undefined }), [], "me"); return d.revealedAt === null && d.openingAt === null && d.letterId === null; })());
/* web 0035 (identity Phase 2): a sealed name isn't on the row, the flags say who signed */
{
  const sealedTheirs = buildThreadDetail(row({ revealed: false, a_name: null, b_name: null, a_face: null, b_face: null, a_signed: false, b_signed: true, a_sig: null, b_sig: null }), [], "me");
  ok("0035: they signed (sealed) — theirSigned from b_signed, no name, no face", sealedTheirs.theirSigned === true && sealedTheirs.iSigned === false && sealedTheirs.otherName === null && sealedTheirs.otherFace === null);
  const asB = buildThreadDetail(row({ revealed: false, a_name: null, b_name: null, a_signed: true, b_signed: false }), [], "them");
  ok("0035: read from b's side, the same flags swap", asB.iSigned === false && asB.theirSigned === true);
  const SIG = { v: 1 as const, w: 1000 as const, h: 320 as const, s: [[10, 20, 30, 40]] };
  const opened = buildThreadDetail(row({ a_signed: true, b_signed: true, a_sig: null, b_sig: SIG }), [], "me");
  ok("0035: revealed — their drawing, my typed one, my name and face as they got them", opened.otherSig === SIG && opened.mySig === null && opened.mySignedName === "Ana" && opened.mySignedFace === "f-a");
  ok("pre-0035: a name on the row is the signature", signedOf({ a_name: "Ana", b_name: null }, "a") && !signedOf({ a_name: "Ana", b_name: null }, "b"));
  ok("0035: the flag wins over a name (false stays false)", !signedOf({ a_name: "Ana", a_signed: false }, "a") && signedOf({ a_name: null, a_signed: true }, "a"));
  ok("pre-0035 row: no drawings", dA.otherSig === null && dA.mySig === null);
}
ok("messages: mine, kind defaults to text", dA.messages[0].mine === true && dA.messages[0].kind === "text");
ok("messages: a quote of my line is replyMine", dA.messages[1].replyMine === true);
ok("messages: no quote → replyMine undefined", dA.messages[0].replyMine === undefined);
ok("messages: taken back keeps recalledAt", dA.messages[2].recalledAt === "2026-10-04T10:01:00Z" && dA.messages[2].body === TAKEN_BACK);
const dB = buildThreadDetail(row(), msgs, "them");
ok("as b: counts swap, the opening is mine", dB.myCount === 4 && dB.otherCount === 3 && dB.openingFromMe === true && dB.otherName === "Ana");
const dGone = buildThreadDetail(row({ b: null }), [], "me");
ok("their side nulled (0009) → gone, other null", dGone.gone === true && dGone.other === null);
ok("a voice opening comes through (bug 2)", buildThreadDetail(row({ opening_media: "u/1.m4a", opening_duration_s: 74 }), [], "me").openingMedia === "u/1.m4a");
ok("null counts read as 0", buildThreadDetail(row({ a_count: null, b_count: null }), [], "me").myCount === 0);

/* ── the screen state, answer by answer (known bug 1) ── */
const D1 = { ...dA, opening: "fresh" } as ThreadDetail;
const DC = { ...dA, opening: "cached" } as ThreadDetail;
const F1 = [{ id: "f1", mine: true, kind: "note" as const, prompt: null, parentId: null, body: "x", date: "2026-10-05T00:00:00Z" }];
const FC = [{ id: "fc", mine: false, kind: "note" as const, prompt: null, parentId: null, body: null, date: "2026-10-01T00:00:00Z" }];
const OK = (detail: ThreadDetail) => ({ status: "ok" as const, detail });
const OFF = { status: "offline" as const, reason: "network" as const };
const MISSING = { status: "missing" as const };
let s: DetailState = initialDetailState(true);
ok("starts loading with an id, idle without", s.status === "loading" && initialDetailState(false).status === "idle");
s = reduceDetail(s, { type: "cache", detail: DC, folds: FC });
ok("the cache paints an empty screen", s.detail === DC && s.folds === FC && s.fromCache && s.status === "loading");
s = reduceDetail(s, { type: "result", result: OFF, folds: null });
ok("BUG 1: offline after the cache keeps the cache painted", s.detail === DC && s.folds === FC && s.status === "offline" && s.reason === "network");
s = reduceDetail(s, { type: "result", result: OK(D1), folds: F1 });
ok("ok replaces detail and folds", s.detail === D1 && s.folds === F1 && s.status === "ok" && !s.fromCache && s.reason === null);
s = reduceDetail(s, { type: "cache", detail: DC, folds: FC });
ok("a late storage read never beats a fresher read", s.detail === D1 && s.folds === F1);
s = reduceDetail(s, { type: "result", result: OFF, folds: null });
ok("a live poke that goes offline keeps the fresh read", s.detail === D1 && s.folds === F1 && s.status === "offline");
s = reduceDetail(s, { type: "result", result: OK(D1), folds: null });
ok("ok with folds unread keeps the folds", s.folds === F1);
s = reduceDetail(s, { type: "result", result: MISSING, folds: null });
ok("missing keeps what is painted and only reports", s.detail === D1 && s.status === "missing");
s = reduceDetail(s, { type: "reset", hasId: true });
ok("a new id starts over", s.detail === null && s.folds === null && s.status === "loading");
s = reduceDetail(s, { type: "result", result: OFF, folds: null });
ok("offline with nothing kept: no detail, status offline (an offline line, not a blank room)", s.detail === null && s.status === "offline");
s = reduceDetail(s, { type: "cache", detail: null, folds: null });
ok("an empty cache read changes nothing", s.detail === null && s.status === "offline");

/* ── which count marks the room seen ── */
const st = (status: DetailState["status"], detail: ThreadDetail | null): DetailState => ({ detail, folds: null, status, reason: null, fromCache: false });
ok("ok + room rule → otherCount", seenCountAfter(st("ok", D1), true) === D1.otherCount);
ok("offline + the cached copy painted → its otherCount (the badge agrees)", seenCountAfter(st("offline", DC), true) === DC.otherCount);
ok("missing marks nothing", seenCountAfter(st("missing", D1), true) === null);
ok("loading (cache painted, no answer yet) marks nothing", seenCountAfter(st("loading", DC), true) === null);
ok("no detail marks nothing", seenCountAfter(st("offline", null), true) === null);
ok("a rule may pick its own count", seenCountAfter(st("ok", D1), (d) => d.messages.filter((m) => !m.mine).length) === 2);
ok("a rule may skip (chat before names)", seenCountAfter(st("ok", D1), () => null) === null);
ok("chat's rule marks otherCount (the badge's counter) once names are traded, not the message list", seenCountAfter(st("ok", D1), chatSeenRule) === D1.otherCount && D1.otherCount !== D1.messages.filter((m) => !m.mine).length);
ok("chat's rule skips before names", seenCountAfter(st("ok", { ...D1, revealed: false } as ThreadDetail), chatSeenRule) === null);
ok("no rule marks nothing", seenCountAfter(st("ok", D1), false) === null && seenCountAfter(st("ok", D1), undefined) === null);

/* ── optimistic lines ── */
const base = { ...dA, messages: dA.messages.slice(0, 2), myCount: 1 } as ThreadDetail;
const at = (ms: number) => new Date(Date.parse("2026-10-05T12:00:00Z") + ms).toISOString();
const pend = (body: string, ms: number, id?: string): ThreadMessage => ({ id, body, mine: true, date: at(ms), kind: "text" });
ok("nothing pending → the same object", mergePending(base, []) === base && mergePending(base, undefined) === base);
ok("no detail → null", mergePending(null, [pend("x", 0)]) === null);
const m1 = mergePending(base, [pend("on its way", 0)])!;
ok("a line in flight rides on top and bumps myCount", m1.messages.length === 3 && m1.messages[2].body === "on its way" && m1.myCount === 2);
ok("a confirmed line whose id the server holds is dropped", mergePending(base, [pend("hello", 0, "m1")]) === base);
const echoed = { ...base, messages: [...base.messages, { id: "s9", body: "same words", mine: true, date: at(1000), kind: "text" }] } as ThreadDetail;
ok("a line in flight whose echo landed is dropped (no double)", mergePending(echoed, [pend("same words", 0)]) === echoed);
ok("one echo claims one pending line", mergePending(echoed, [pend("same words", 0), pend("same words", 500)])!.messages.length === echoed.messages.length + 1);
const oldTwin = { ...base, messages: [...base.messages, { id: "s1", body: "ok", mine: true, date: at(-10 * 60_000), kind: "text" }] } as ThreadDetail;
ok("an old identical line of mine is not taken for the echo", mergePending(oldTwin, [pend("ok", 0)])!.messages.length === oldTwin.messages.length + 1);
ok("their identical line is not my echo", mergePending({ ...base, messages: [...base.messages, { id: "t1", body: "yes", mine: false, date: at(1000) }] } as ThreadDetail, [pend("yes", 0)])!.messages.length === 4);

/* ── why a write didn't go ── */
ok("28000 no session → session", writeFailOf({ code: "28000", message: "no session" }, false) === "session");
ok("JWT expired → session", writeFailOf({ code: "PGRST301", message: "JWT expired" }, false) === "session");
ok("22023 unreachable letter → gone", writeFailOf({ code: "22023", message: "unreachable letter" }, false) === "gone");
ok("22023 for another reason is not gone", writeFailOf({ code: "22023", message: "a letter before names is posted" }, false) === "server");
ok("42501 suspended → suspended", writeFailOf({ code: "42501", message: "suspended" }, false) === "suspended");
ok("42501 blocked → blocked", writeFailOf({ code: "42501", message: "blocked" }, false) === "blocked");
ok("42501 RLS refusal → denied", writeFailOf({ code: "42501", message: 'new row violates row-level security policy for table "messages"' }, false) === "denied");
ok("our deadline → timeout", writeFailOf(new Error("timeout"), false) === "timeout");
ok("isOffline → offline", writeFailOf(new TypeError("Network request failed"), true) === "offline");
ok("postgrest's wrapped network failure → offline", writeFailOf(NET, false) === "offline");
ok("anything else → server", writeFailOf({ code: "500", message: "boom" }, false) === "server");
ok("refusals: gone, blocked, suspended — not offline or session", isRefusal("gone") && isRefusal("blocked") && isRefusal("suspended") && !isRefusal("offline") && !isRefusal("session") && !isRefusal(null));

/* ── folds ── */
ok("FOLD_MAX is 600", FOLD_MAX === 600);
ok("foldOver measures the trimmed text", foldOver("  " + "a".repeat(600) + "  ") === 0 && foldOver("a".repeat(612)) === 12);

/* ── the demo fixtures: every state the screens are checked against ── */
ok("the demo's taken-back text is the database's", DEMO_TAKEN_BACK === TAKEN_BACK);
const allRows = [...DEMO_THREADS, ...DEMO_STATE_THREADS];
ok("every demo row has a detail", allRows.every((r) => !!DEMO_DETAILS[r.id]));
ok("demo row ids are unique", new Set(allRows.map((r) => r.id)).size === allRows.length);
const mine = (d: ThreadDetail) => d.messages.filter((m) => m.mine).length;
const theirs = (d: ThreadDetail) => d.messages.filter((m) => !m.mine).length;
const consistent = [...DEMO_STATE_THREADS.map((r) => r.id), "demo-blackberry", "demo-north", "demo-answered"];
ok("state fixtures: counts match their messages", consistent.every((id) => { const d = DEMO_DETAILS[id]; return d.myCount === mine(d) && d.otherCount === theirs(d); }));
ok("state rows: the list's counts match the room's", DEMO_STATE_THREADS.every((r) => r.mine === DEMO_DETAILS[r.id].myCount && r.theirs === DEMO_DETAILS[r.id].otherCount));
ok("state rows: revealed and gone agree with the room", DEMO_STATE_THREADS.every((r) => r.revealed === DEMO_DETAILS[r.id].revealed && !!r.gone === !!DEMO_DETAILS[r.id].gone));
const band = (id: string) => DEMO_DETAILS[id];
ok("band: both owe (demo-quiet)", !band("demo-quiet").revealed && band("demo-quiet").myCount < 5 && band("demo-quiet").otherCount < 5);
ok("band: you done", band("demo-band-youdone").myCount >= 5 && band("demo-band-youdone").otherCount < 5);
ok("band: they done", band("demo-band-theydone").myCount < 5 && band("demo-band-theydone").otherCount >= 5);
ok("band: names offered, nobody signed", band("demo-band-names").myCount >= 5 && band("demo-band-names").otherCount >= 5 && !band("demo-band-names").iSigned && !band("demo-band-names").theirSigned);
ok("sign door: they went first (blackberry, 5/5)", band("demo-blackberry").theirSigned === true && !band("demo-blackberry").iSigned && band("demo-blackberry").myCount === 5);
ok("sign door: you went first (north, 5/5 — the door can produce it)", band("demo-north").iSigned === true && band("demo-north").myCount === 5 && band("demo-north").otherCount === 5);
ok("gone kindred: revealed, gone, no other", band("demo-gone-kindred").revealed && band("demo-gone-kindred").gone === true && band("demo-gone-kindred").other === null);
ok("gone pen pal: not revealed, gone, no other", !band("demo-gone-penpal").revealed && band("demo-gone-penpal").gone === true && band("demo-gone-penpal").other === null);
ok("voice opening with replies after it (bug 2)", !!band("demo-voice").openingMedia && band("demo-voice").messages.length >= 2 && !!demoMediaUrl(band("demo-voice").openingMedia));
ok("the voice opening matches its pool letter", DEMO_POOL.some((p) => p.id === band("demo-voice").letterId && p.media_path === band("demo-voice").openingMedia));
const juno = band("demo-juno").messages;
const quotes = juno.filter((m) => m.meta?.reply);
ok("quoted replies point at earlier lines of the same room", quotes.length >= 2 && quotes.every((q) => { const i = juno.findIndex((m) => m.id === q.meta!.reply!.id); return i >= 0 && i < juno.indexOf(q); }));
ok("a quote of mine and a quote of theirs", quotes.some((q) => q.replyMine === true) && quotes.some((q) => q.replyMine === false));
ok("a quote whose line was taken back has an empty excerpt", quotes.some((q) => q.meta!.reply!.excerpt === "" && juno.find((m) => m.id === q.meta!.reply!.id)?.recalledAt));
ok("taken-back lines, mine and theirs", juno.some((m) => m.recalledAt && m.mine && m.body === TAKEN_BACK) && juno.some((m) => m.recalledAt && !m.mine && m.body === TAKEN_BACK));
ok("songs and a photo in the same room", juno.some((m) => m.kind === "song" && m.meta?.url) && juno.some((m) => m.kind === "photo" && m.meta?.url));
const long = band("demo-long").messages;
ok("the long room has 300 lines", long.length === 300);
ok("the long room's ids are unique and its dates ascend", new Set(long.map((m) => m.id)).size === 300 && long.every((m, i) => i === 0 || m.date >= long[i - 1].date));
ok("the long room has quotes, a take-back, a song and a photo", long.some((m) => m.meta?.reply) && long.some((m) => m.recalledAt) && long.some((m) => m.kind === "song") && long.some((m) => m.kind === "photo"));
const quietDays = (id: string) => (Date.now() - Date.parse(band(id).messages[band(id).messages.length - 1].date)) / DAY;
ok("the quiet room is past 30 days", quietDays("demo-expired") > 30 && Date.now() - DEMO_STATE_THREADS.find((r) => r.id === "demo-expired")!.lastAt > 30 * DAY);
ok("the closing room is inside its last week (23–29 days)", quietDays("demo-closing") >= 23 && quietDays("demo-closing") < 30);
ok("revealed rooms carry revealedAt and openingAt", ["demo-mira", "demo-juno", "demo-long", "demo-expired", "demo-closing", "demo-gone-kindred"].every((id) => !!band(id).revealedAt && !!band(id).openingAt));
ok("a gone pen pal's letter has no readable date", band("demo-gone-penpal").openingAt === null);
ok("the seeded ledger leaves unread letters on each seeded room", Object.entries(DEMO_ROOM_SEEN).every(([id, n]) => { const r = allRows.find((x) => x.id === id); return !!r && r.theirs > n && n >= 0; }));
ok("the real ledger wins over the seeds", withDemoRoomSeen({ "demo-mira": 6 })["demo-mira"] === 6 && withDemoRoomSeen({})["demo-mira"] === DEMO_ROOM_SEEN["demo-mira"]);
ok("store mode keeps the original seven rows", demoThreads({ store: true }) === DEMO_THREADS && DEMO_THREADS.length === 7);
ok("dev mode adds every state row", demoThreads({ store: false }).length === DEMO_THREADS.length + DEMO_STATE_THREADS.length);
ok("the list switch flips and reads back", (() => { setDemoListMode("offline"); const a = demoListMode(); setDemoListMode("demo"); return a === "offline" && demoListMode() === "demo"; })());
const mira = demoDetail("demo-mira")!;
ok("demoDetail gives every message a stable id", mira.messages.every((m) => !!m.id) && demoDetail("demo-mira")!.messages[0].id === mira.messages[0].id);
ok("demoDetail keeps a fixture's own ids", demoDetail("demo-juno")!.messages[0].id === "demo-juno-1");
ok("an unknown demo id → null (useThreadDetail reads missing)", demoDetail("demo-nobody") === null);
ok("demo folds: parents exist in the same room", Object.values(DEMO_FOLDS).every((fs) => fs.every((f) => !f.parentId || fs.some((p) => p.id === f.parentId))));
ok("demo folds: theirs unanswered is sealed, mine always readable", demoFolds("demo-juno").some((f) => !f.mine && f.body === null) && demoFolds("demo-juno").every((f) => !f.mine || f.body !== null));
ok("demo folds: none for a room without them", demoFolds("demo-quiet").length === 0);
const devJournal = demoJournal({ store: false });
ok("journal: all four kinds", ["text", "photo", "voice", "video"].every((k) => devJournal.some((e) => e.type === k)));
ok("journal: a photo and a voice page with no words", devJournal.some((e) => e.type === "photo" && !e.body) && devJournal.some((e) => e.type === "voice" && !e.body));
ok("journal: one photo and many photos", devJournal.some((e) => e.media?.length === 1) && devJournal.some((e) => (e.media?.length ?? 0) > 4));
ok("journal: pages across two months", new Set(devJournal.map((e) => e.date.slice(0, 7))).size >= 2);
ok("journal: ids are unique and all demo-", new Set(devJournal.map((e) => e.id)).size === devJournal.length && devJournal.every((e) => e.id.startsWith("demo-")));
/* the App Store Notes shots: store mode shows every DEMO_JOURNAL page and
   translates exactly these six ids ((tabs)/journal.tsx STORE_BODY) */
const STORE_JOURNAL_IDS = ["demo-j-photo", "demo-j-text1", "demo-j-voice", "demo-j-text2", "demo-j-long", "demo-j-video"];
ok("store mode keeps the original six journal pages", demoJournal({ store: true }) === DEMO_JOURNAL && DEMO_JOURNAL.length === 6 && DEMO_JOURNAL.every((e, i) => e.id === STORE_JOURNAL_IDS[i]));
ok("dev mode adds every state page", devJournal.length === DEMO_JOURNAL.length + DEMO_STATE_JOURNAL.length && DEMO_STATE_JOURNAL.every((e) => !STORE_JOURNAL_IDS.includes(e.id)));
const seeded = demoDetail(seedDemoThread(DEMO_POOL[1], "my reply"))!;
ok("a seeded reply: counts match, the opening keeps its own date and voice", seeded.myCount === 1 && seeded.otherCount === 0 && seeded.openingAt === DEMO_POOL[1].created_at && seeded.openingMedia === DEMO_POOL[1].media_path);

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
