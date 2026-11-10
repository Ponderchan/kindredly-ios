/* Behaviour lock for the stamp export's rules (lib/stamp-export-core; stamp export, 2026-11-10):
   which of the reader's stamps may be exported (their own, approved, once each), that a stamp
   with no picture fails the export by name and is never left out quietly, the file names, the
   paging of the printable sheet and the count printed on it, who exports and who meets the
   paywall, and what the album gains (and that nothing else of it moves).
   Not wired to a runner; run by hand from the repo root with plain node (types stripped by Node
   itself; the core imports only types):
     node src/lib/stamp-export-core.test.ts */

import {
  NoStampPicture,
  SHEET_PER_PAGE,
  STAMP_EXPORT_PAYWALL,
  exportIntent,
  exportItem,
  exportLocked,
  exportable,
  needsFreshPictures,
  qualifies,
  sheetFileStem,
  sheetJob,
  sheetPages,
  stickerFileStem,
  stickerJob,
  topicSlug,
  withStampExport,
  type ExportStamp,
} from "./stamp-export-core.ts";

let failed = 0;
function ok(name: string, pass: boolean, detail = ""): void {
  if (!pass) failed++;
  console.log(`${pass ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function throws(run: () => unknown, check: (e: unknown) => boolean = () => true): boolean {
  try {
    run();
    return false;
  } catch (e) {
    return check(e);
  }
}

const id = (n: number) => `c:00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const stamp = (n: number, over: Partial<ExportStamp> = {}): ExportStamp => ({ id: id(n), state: "ok", topic: `topic ${n}`, url: `file:///stamps/${n}.jpg`, key: `local:${n}`, gold: false, ...over });
/** t() as the keys with their values filled in, so a test reads which key was asked */
const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}|${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(",")}` : key);
const fmt = { t, lower: (s: string) => s.toLowerCase() };
const NOW = new Date(2026, 10, 10, 9, 0, 0);

/* ── which stamps ── */
ok("an approved stamp of the reader's qualifies", qualifies(stamp(1)));
for (const state of ["pending", "rejected", "removed", "deleted", "hidden", "blank", ""]) {
  ok(`a ${state || "stateless"} stamp never does`, !qualifies(stamp(1, { state })));
}
ok("an official stamp id never does", !qualifies({ id: "tiny-win", state: "ok" }));
{
  const list = [stamp(3), stamp(2, { state: "pending" }), stamp(1), stamp(3), stamp(4, { state: "rejected" }), stamp(5, { state: "removed" })];
  ok("exportable keeps the order given, each stamp once, only the approved", same(exportable(list).map((s) => s.id), [id(3), id(1)]));
  ok("nothing qualifies: an empty list", exportable([stamp(1, { state: "pending" })]).length === 0);
}

/* ── pictures ── */
ok("files on this phone need no fresh links", !needsFreshPictures([stamp(1), stamp(2, { url: "/var/mobile/x.jpg" })]));
ok("a signed link does", needsFreshPictures([stamp(1), stamp(2, { url: "https://x.supabase.co/storage/v1/object/sign/stamps/a.jpg?token=t" })]));
ok("a stamp with no picture in hand does", needsFreshPictures([stamp(1, { url: null })]));
ok("no stamps: nothing to ask for", !needsFreshPictures([]));

/* ── file names ── */
ok("a topic becomes a readable slug", topicSlug("Tiny Win") === "tiny-win");
ok("punctuation and spaces are one dash, none at the ends", topicSlug("  can’t   sleep!! ") === "can-t-sleep");
ok("nothing that could leave the folder", topicSlug("../../etc/passwd") === "etc-passwd" && !/[\\/.:]/.test(topicSlug("a/b\\c:d.e")));
ok("other scripts are kept", topicSlug("お茶") === "お茶" && topicSlug("Café Olé") === "café-olé" && topicSlug("चाय") === "चाय");
ok("an emoji alone leaves nothing", topicSlug("🙂") === "" && topicSlug("") === "");
ok("at most 40 characters, never ending in a dash", [...topicSlug("a".repeat(39) + " bcdef")].length === 39 && [...topicSlug("x".repeat(80))].length === 40);
ok("the sticker's file", stickerFileStem("Tiny Win") === "kindredly-stamp-tiny-win");
ok("the sticker's file when nothing of the topic can be kept", stickerFileStem("🙂") === "kindredly-stamp" && stickerFileStem("") === "kindredly-stamp");
ok("the sticker's file takes the reader's own lower-casing", stickerFileStem("ISTANBUL", (s) => s.toLocaleLowerCase("tr")) === "kindredly-stamp-ıstanbul");
ok("the sheet's file", sheetFileStem(2026) === "kindredly-stamps-2026");

/* ── the jobs ── */
{
  const item = exportItem(stamp(7, { topic: "Tea", gold: true }), fmt);
  ok("a stamp as Swift takes it", same(item, { id: id(7), url: "file:///stamps/7.jpg", key: "local:7", gold: true, caption: "#tea" }));
  ok("no topic: no caption", exportItem(stamp(7, { topic: "" }), fmt).caption === "");
  ok("no cache key: the picture's own address", exportItem(stamp(7, { key: "" }), fmt).key === "file:///stamps/7.jpg");
  ok(
    "no picture: the export fails with the stamp's name",
    throws(
      () => exportItem(stamp(7, { url: null, topic: "tea" }), fmt),
      (e) => e instanceof NoStampPicture && e.stampId === id(7) && /#tea/.test(e.message),
    ),
  );
}
{
  const job = stickerJob(stamp(2, { topic: "Tiny Win" }), fmt);
  ok("the sticker job", job.fileStem === "kindredly-stamp-tiny-win" && job.stamp.id === id(2) && job.stamp.caption === "#tiny win");
  ok("a stamp that did not pass can't be a sticker", throws(() => stickerJob(stamp(2, { state: "rejected" }), fmt)) && throws(() => stickerJob(stamp(2, { state: "pending" }), fmt)));
  ok("a sticker of a stamp with no picture fails", throws(() => stickerJob(stamp(2, { url: null }), fmt), (e) => e instanceof NoStampPicture));
}

/* ── the sheet ── */
ok("25 to a sheet (Swift's 5 × 5 grid)", SHEET_PER_PAGE === 25);
ok("paging keeps the order and leaves no empty sheet", same(sheetPages([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]) && sheetPages([], 25).length === 0);
ok("exactly one sheet's worth is one sheet", sheetPages(Array.from({ length: 25 }, (_, i) => i)).length === 1 && sheetPages(Array.from({ length: 26 }, (_, i) => i)).map((p) => p.length).join() === "25,1");
ok("a silly sheet size is at least one", sheetPages([1, 2], 0).length === 2);
{
  const list = [stamp(1), stamp(2, { state: "rejected" }), stamp(3, { state: "pending" }), stamp(4, { state: "removed" }), stamp(5), stamp(6, { gold: true, topic: "Tea" })];
  const job = sheetJob(list, NOW, fmt);
  ok("only the approved are printed, in order", !!job && same(job.pages, [[exportItem(list[0], fmt), exportItem(list[4], fmt), exportItem(list[5], fmt)]]));
  ok("the top line counts the stamps printed and the year", job?.top === "sx.sheet.top|n=3,year=2026");
  ok("the foot and the file", job?.foot === "sx.sheet.foot" && job?.fileStem === "kindredly-stamps-2026");
  ok("one stamp has its own top line", sheetJob([stamp(1), stamp(2, { state: "pending" })], NOW, fmt)?.top === "sx.sheet.topOne|year=2026");
  ok("none approved: no sheet at all", sheetJob([stamp(1, { state: "pending" }), stamp(2, { state: "removed" })], NOW, fmt) === null && sheetJob([], NOW, fmt) === null);
  const many = sheetJob(Array.from({ length: 53 }, (_, i) => stamp(i + 1)), NOW, fmt);
  ok("53 stamps: three sheets of 25, 25 and 3, and the top line says 53", !!many && many.pages.map((p) => p.length).join() === "25,25,3" && many.top === "sx.sheet.top|n=53,year=2026");
  ok(
    "one approved stamp without a picture fails the whole sheet, by name",
    throws(
      () => sheetJob([stamp(1), stamp(2, { url: null, topic: "lost" })], NOW, fmt),
      (e) => e instanceof NoStampPicture && e.stampId === id(2),
    ),
  );
  ok("a refused stamp without a picture is no trouble: it was never going to print", sheetJob([stamp(1), stamp(2, { state: "rejected", url: null })], NOW, fmt)?.pages[0].length === 1);
}

/* ── who may ── */
ok("a member exports", exportIntent({ settled: true, premium: true, busy: false }) === "export");
ok("anyone else meets the paywall", exportIntent({ settled: true, premium: false, busy: false }) === "paywall");
ok("before the membership answer is in, the tap waits", exportIntent({ settled: false, premium: false, busy: false }) === "wait");
ok("while one is being made, a tap does nothing", exportIntent({ settled: true, premium: true, busy: true }) === "none" && exportIntent({ settled: true, premium: false, busy: true }) === "none");
ok("the mark shows only once the answer is in and it is no", exportLocked({ settled: true, premium: false }) && !exportLocked({ settled: false, premium: false }) && !exportLocked({ settled: true, premium: true }));
ok("the paywall knows where the tap came from", STAMP_EXPORT_PAYWALL === "/paywall?src=stamp_export");

/* ── the album ── */
{
  type Act = { key: string; title: string; style: string; lock?: string; lockA11y?: string };
  const act = (key: string): Act => ({ key, title: key, style: "plain" });
  const cell = (n: number, actions: Act[]) => ({ id: id(n), under: "", tag: "", tagHex: "", info: "", a11y: "", actions });
  const album = {
    strings: { title: "ALBUM", back: "", makeOne: "", makeA11y: "", fullTitle: "", fullSub: "", fullCta: "", notNow: "", yoursEmpty: "", yoursCta: "" },
    sections: [
      { key: "made", title: "MADE BY YOU · 3", make: true, cells: [cell(1, [act("write"), act("rename"), act("delete")]), cell(2, [act("retry"), act("delete")]), cell(3, [act("delete")])] },
      { key: "strangers", title: "FROM STRANGERS · 1", make: false, cells: [cell(9, [act("remove")])] },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  const before = JSON.stringify(album);
  const ids = new Set([id(1), id(3), id(9)]);

  const off = withStampExport(album, { on: false, ids, premium: true, settled: true }, t);
  ok("a binary that can't export: the very same album", off === album);

  const member = withStampExport(album, { on: true, ids, premium: true, settled: true }, t);
  const keys = (sec: number, c: number) => member.sections[sec].cells[c].actions.map((a) => a.key).join();
  ok("Save as sticker sits after Write with it", keys(0, 0) === "write,sticker,rename,delete");
  ok("a stamp that does not qualify gets none", keys(0, 1) === "retry,delete");
  ok("with no Write, it comes first", keys(0, 2) === "sticker,delete");
  ok("a stranger's stamp is never given one, whatever its id", member.sections[1] === album.sections[1]);
  ok("a member's actions wear no mark", !member.sections[0].cells[0].actions[1].lock && member.strings.sheetLock === "");
  ok("the head action's words", member.strings.sheet === "sx.sheet" && member.sections[0].cells[0].actions[1].title === "sx.sticker");
  ok("everything else is as it was", member.strings.title === "ALBUM" && member.sections[0].title === "MADE BY YOU · 3" && member.sections[0].make === true && member.sections.length === 2);
  ok("the album it was given is not changed", JSON.stringify(album) === before);

  const locked = withStampExport(album, { on: true, ids, premium: false, settled: true }, t);
  const a = locked.sections[0].cells[0].actions[1];
  ok("anyone else: both wear the app's own mark and VoiceOver's words for it", a.lock === "mf.result.lock" && a.lockA11y === "pp.a11y.fc" && locked.strings.sheetLock === "mf.result.lock" && locked.strings.sheetLockA11y === "pp.a11y.fc");

  const unsettled = withStampExport(album, { on: true, ids, premium: false, settled: false }, t);
  ok("before the answer is in: no mark yet", !unsettled.sections[0].cells[0].actions[1].lock && unsettled.strings.sheetLock === "");

  const none = withStampExport(album, { on: true, ids: new Set<string>(), premium: true, settled: true }, t);
  ok("no stamp qualifies: no sticker, no Print a sheet, the same album", none === album);

  const twice = withStampExport(member, { on: true, ids, premium: true, settled: true }, t);
  ok("adding twice adds once", twice.sections[0].cells[0].actions.filter((x) => x.key === "sticker").length === 1);
}

console.log(failed ? `${failed} FAILED` : "all ok");
if (failed) process.exit(1);
