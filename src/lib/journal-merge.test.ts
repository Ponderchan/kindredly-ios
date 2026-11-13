/* node --import <ts loader> src/lib/journal-merge.test.ts */
import { mergeJournals, parseJournal } from "./journal-merge.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  if (!cond) fails++;
  console.log(`${cond ? "ok  " : "FAIL"} ${name}`);
};

const p = (id: string, date: string, body = id) => ({ id, date, body });
const ids = (l: unknown[]) => l.map((e) => (e as { id?: string }).id ?? "?").join(",");

{
  const account = [p("a2", "2026-11-13T18:01:00Z"), p("a1", "2026-11-10T09:00:00Z")];
  const guest = [p("g2", "2026-11-12T21:00:00Z"), p("g1", "2026-11-13T08:00:00Z")];
  const m = mergeJournals(account, guest);
  ok("every page of both is kept", m.length === 4);
  ok("newest first, whoever wrote it", ids(m) === "a2,g1,g2,a1");
}
{
  const account = [p("x", "2026-11-13T10:00:00Z", "edited on the account")];
  const guest = [p("x", "2026-11-13T10:00:00Z", "the guest's older copy"), p("y", "2026-11-11T10:00:00Z")];
  const m = mergeJournals(account, guest);
  ok("a page in both is kept once", m.length === 2);
  ok("…and it is the copy being written into", (m.find((e) => (e as { id: string }).id === "x") as { body: string }).body === "edited on the account");
}
{
  const m = mergeJournals([], [p("g", "2026-11-13T10:00:00Z")]);
  ok("into an empty journal: the guest's pages, as they were", ids(m) === "g");
  ok("nothing into nothing is nothing", mergeJournals([], []).length === 0);
}
{
  const noId = { date: "2026-11-01T00:00:00Z", body: "no id" };
  const m = mergeJournals([noId], [{ ...noId }]);
  ok("pages without an id are all kept", m.length === 2);
}
{
  const m = mergeJournals([p("a", "not a date"), p("b", "2026-11-13T10:00:00Z")], [p("c", "")]);
  ok("pages with no readable date go last, in the order they came", ids(m) === "b,a,c");
}
ok("parse: nothing stored is an empty journal", JSON.stringify(parseJournal(null)) === "[]" && JSON.stringify(parseJournal("")) === "[]");
ok("parse: a list is the list", parseJournal('[{"id":"a"}]')?.length === 1);
ok("parse: anything else is null (never merged over)", parseJournal("{}") === null && parseJournal("not json") === null);

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall ok");
