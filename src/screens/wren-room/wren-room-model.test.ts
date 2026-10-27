/* Behaviour lock for Wren's room (screens/wren-room/wren-room-model): the transcript's order, who
   speaks, and where the day rules and the speaker labels go, the same for both renderers.
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/screens/wren-room/wren-room-model.test.ts
   The model imports types only, so nothing needs stubbing. */

import { FIRST_CHIPS, buildWrenStream, guideSlugOf, wrenItemKey, wrenRoomRows, wrenSpeaker, type WrenSpeakerWords } from "./wren-room-model.ts";
import type { WrenLocal, WrenMail, WrenPost } from "../../lib/wren-desk";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const W: WrenSpeakerWords = { you: "YOU", wren: "WREN", bug: "A BUG", idea: "AN IDEA", event: "EVENT", note: "NOTE" };
const day = (at: string) => at.slice(0, 10);

const post = (id: number, at: string, o: Partial<WrenPost> = {}): WrenPost => ({ id, kind: "update", body: `post ${id}`, i18n: null, link: null, at, ...o });
const mail = (id: number, at: string, o: Partial<WrenMail> = {}): WrenMail => ({ id, kind: "note", body: `mail ${id}`, mediaPath: null, at, reply: null, repliedAt: null, ...o });
const local = (id: number, at: string, q: string | null): WrenLocal => ({ id, q, answer: { kind: "guide", guide: "letters" }, at });

/* ── the stream ── */
{
  const s = buildWrenStream(
    [post(1, "2026-10-01T10:00:00Z"), post(2, "2026-10-03T10:00:00Z")],
    [mail(5, "2026-10-02T09:00:00Z", { reply: "thanks", repliedAt: "2026-10-04T08:00:00Z" }), mail(6, "2026-10-02T11:00:00Z")],
    [local(9, "2026-10-02T10:00:00Z", "how?")],
  );
  ok("oldest first, every kind in", s.map(wrenItemKey).join(",") === "p-1,m-5,l-9,m-6,p-2,r-5");
  ok("a reply stands at the time it was written", s[s.length - 1].type === "reply" && s[s.length - 1].at === "2026-10-04T08:00:00Z");
  ok("a reply without its time stands at the mail's", buildWrenStream([], [mail(7, "2026-10-05T00:00:00Z", { reply: "ok", repliedAt: null })], []).map((x) => x.at).join() === "2026-10-05T00:00:00Z,2026-10-05T00:00:00Z");
  ok("mail with no reply has no reply row", buildWrenStream([], [mail(8, "2026-10-05T00:00:00Z")], []).length === 1);
  ok("nothing in, nothing out", buildWrenStream([], [], []).length === 0);
}

/* ── who speaks ── */
{
  const sp = (x: Parameters<typeof wrenSpeaker>[0]) => wrenSpeaker(x, W);
  ok("an update is WREN", sp({ type: "post", post: post(1, "x"), at: "x" }) === "WREN");
  ok("an event is WREN · EVENT", sp({ type: "post", post: post(1, "x", { kind: "event" }), at: "x" }) === "WREN · EVENT");
  ok("a note is WREN · NOTE", sp({ type: "post", post: post(1, "x", { kind: "note" }), at: "x" }) === "WREN · NOTE");
  ok("your note is YOU", sp({ type: "mail", mail: mail(1, "x"), at: "x" }) === "YOU");
  ok("your picture is YOU", sp({ type: "mail", mail: mail(1, "x", { kind: "photo" }), at: "x" }) === "YOU");
  ok("your bug is YOU · A BUG", sp({ type: "mail", mail: mail(1, "x", { kind: "bug" }), at: "x" }) === "YOU · A BUG");
  ok("your idea is YOU · AN IDEA", sp({ type: "mail", mail: mail(1, "x", { kind: "idea" }), at: "x" }) === "YOU · AN IDEA");
  ok("a reply is WREN", sp({ type: "reply", mail: mail(1, "x"), at: "x" }) === "WREN");
  ok("a question she answered is YOU", sp({ type: "local", local: local(1, "x", "q"), at: "x" }) === "YOU");
  ok("a guide from a chip is WREN", sp({ type: "local", local: local(1, "x", null), at: "x" }) === "WREN");
}

/* ── the rows ── */
{
  const s = buildWrenStream(
    [post(1, "2026-10-01T10:00:00Z"), post(2, "2026-10-01T11:00:00Z"), post(3, "2026-10-01T12:00:00Z", { kind: "event" }), post(4, "2026-10-02T09:00:00Z")],
    [mail(5, "2026-10-02T10:00:00Z"), mail(6, "2026-10-02T10:30:00Z", { kind: "bug" })],
    [local(7, "2026-10-02T11:00:00Z", "how?"), local(8, "2026-10-02T11:30:00Z", null), local(9, "2026-10-02T12:00:00Z", null)],
  );
  const r = wrenRoomRows(s, W, day);
  const at = (k: string) => r.find((x) => x.key === k)!;
  ok("a day rule over the first row, with no space above it", at("p-1").dayLabel === "2026-10-01" && at("p-1").first);
  ok("no day rule inside a day", at("p-2").dayLabel === "" && at("p-3").dayLabel === "");
  ok("a day rule over the next day's first row", at("p-4").dayLabel === "2026-10-02" && !at("p-4").first);
  ok("the first label sits under its day rule", at("p-1").label === "WREN" && at("p-1").labelUnderDay);
  ok("one label per run of the same voice", at("p-2").label === "");
  ok("a new voice gets its label, not under a day rule", at("p-3").label === "WREN · EVENT" && !at("p-3").labelUnderDay);
  ok("a new day labels again even for the same voice", (() => {
    const two = wrenRoomRows(buildWrenStream([post(1, "2026-10-01T10:00:00Z"), post(2, "2026-10-02T10:00:00Z")], [], []), W, day);
    return two[1].label === "WREN" && two[1].labelUnderDay;
  })());
  ok("your mail is labelled YOU, quiet, and its words are yours", at("m-5").label === "YOU" && at("m-5").labelMine && at("m-5").mine);
  ok("a bug after a note is a new voice", at("m-6").label === "YOU · A BUG" && at("m-6").mine);
  ok("a question she answered: YOU over it, then always her label", at("l-7").label === "YOU" && at("l-7").labelMine && at("l-7").question === "how?" && at("l-7").answerLabel === "WREN");
  ok("her answer's words are hers", !at("l-7").mine);
  ok("a guide from a chip after a question: her label (the voice changed)", at("l-8").label === "WREN" && !at("l-8").labelMine && at("l-8").question === "" && at("l-8").answerLabel === "");
  ok("a second guide from a chip: no label", at("l-9").label === "");
  ok("the post's words are hers", !at("p-1").mine && !at("p-1").labelMine);
}

/* ── links and chips ── */
ok("a guide link gives its id", guideSlugOf("kindredly:///guide/aura") === "aura" && guideSlugOf("kindredly://guide/letters") === "letters");
ok("anything else is no guide", guideSlugOf("https://kindredly.app/guide/aura") === null && guideSlugOf("kindredly:///news/1.0.5") === null && guideSlugOf("kindredly:///guide/Aura") === null);
ok("three chips until MORE", FIRST_CHIPS.join() === "letters,kindreds,aura");

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
