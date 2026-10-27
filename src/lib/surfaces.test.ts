/* Behaviour lock for which app_surfaces row wins, and for the crash
   breadcrumb (lib/surfaces-resolve). Not wired to a runner; run by hand
   from the repo root with plain node (it strips the types itself from
   Node 22.18 / 23.6 on):
     node src/lib/surfaces.test.ts */

import { readFileSync } from "node:fs";
import {
  MAX_STRIKES,
  armSurface,
  clearSurface,
  disarmSurface,
  emptyArming,
  resolveSurfaces,
  settleArming,
  struckOut,
  surfaceOn,
  type ArmingRecord,
} from "./surfaces-resolve.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };
const row = (surface: string, app_version: string, native: boolean) => ({ surface, app_version, native });
const V = "1.3.0";

ok("no rows → nothing switched", Object.keys(resolveSurfaces([], V)).length === 0);
ok("a '*' row counts", resolveSurfaces([row("chat", "*", false)], V).chat === false);
ok("this version's row counts", resolveSurfaces([row("chat", V, false)], V).chat === false);
ok("exact beats '*' (star first)", resolveSurfaces([row("chat", "*", true), row("chat", V, false)], V).chat === false);
ok("exact beats '*' (star last)", resolveSurfaces([row("chat", V, false), row("chat", "*", true)], V).chat === false);
ok("exact can turn ON what '*' kills", resolveSurfaces([row("me", "*", false), row("me", V, true)], V).me === true);
ok("another version's row is ignored", resolveSurfaces([row("chat", "1.2.9", false)], V).chat === undefined);
ok("another version's row doesn't beat '*'", resolveSurfaces([row("chat", "*", true), row("chat", "1.3.1", false)], V).chat === true);
ok("no version known → only '*' rows", (() => { const m = resolveSurfaces([row("a", "*", true), row("b", V, false)], null); return m.a === true && m.b === undefined; })());
ok("surfaces don't bleed into each other", (() => { const m = resolveSurfaces([row("chat", V, false), row("today", "*", true)], V); return m.chat === false && m.today === true && m.me === undefined; })());
ok("stray spaces from the SQL editor still match", resolveSurfaces([row(" chat ", " 1.3.0 ", false)], V).chat === false);
ok("junk rows are skipped", Object.keys(resolveSurfaces([null, 7, {}, { surface: "x", app_version: "*", native: "false" }, { surface: "", app_version: "*", native: true }], V)).length === 0);

ok("table answer beats the default", surfaceOn({ chat: false }, { chat: true }, "chat") === false);
ok("no answer → the default", surfaceOn({}, { chat: true }, "chat") === true);
ok("nothing known yet → the default", surfaceOn(null, { chat: true }, "chat") === true);
ok("no answer, no default → React Native", surfaceOn(null, {}, "chat") === false);
ok("'constructor' is not a surface that is on", surfaceOn({}, {}, "constructor") === false);
ok("a cached map with junk values falls to the default", surfaceOn({ chat: "yes" as unknown as boolean }, { chat: true }, "chat") === true);

/* ── NATIVE_DEFAULTS (lib/surfaces imports React Native, so its table is
   read as text): the nine step-5 keys are there and on (turned on
   2026-10-16 after the simulator checks), and the tab bar stays on ── */
{
  const src = readFileSync(new URL("./surfaces.ts", import.meta.url), "utf8");
  const block = src.match(/export const NATIVE_DEFAULTS[^=]*=\s*\{([\s\S]*?)\};/)?.[1] ?? "";
  const entries = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*(true|false),/gm)].map((m) => [m[1], m[2] === "true"]));
  const NINE = ["room", "chat", "kindreds", "today", "compose", "me", "settings", "editprofile", "notes"];
  ok("NATIVE_DEFAULTS has all nine step-5 keys", NINE.every((k) => k in entries));
  ok("every step-5 key is on", NINE.every((k) => entries[k] === true));
  ok("the tab bar stays on", entries.tabbar === true);
  // Me 4a (2026-10-19): the First Class page and My letters
  const ME4A = ["paywall", "myletters"];
  ok("the two Me 4a keys are there and on", ME4A.every((k) => entries[k] === true));
  // the one-letter reader (2026-10-20)
  ok("the reader's key is there and on", entries.reader === true);
  // the Notes composer (1.0.7, 2026-10-26)
  ok("the Notes composer's key is there and on", entries.journalentry === true);
  // the name-trading ceremony's signed ritual (owner, 2026-10-26; 1.0.7)
  ok("the ceremony's key is there and on", entries.ceremony === true);
  // the Writing Aura room and its share card (2026-10-26)
  const AURA = ["aura", "auracard"];
  ok("the aura's two keys are there and on", AURA.every((k) => entries[k] === true));
  // Wren's Journey in Swift (2026-10-26)
  ok("the courier page's key is there and on", entries.courier === true);
  // Make your own face (2026-10-26): there, and OFF until a row turns it on (0047 and /api/face first)
  ok("the make-face key is there and off", "makeface" in entries && entries.makeface === false);
  // the onboarding in Swift (binary 1.2.6): DELIBERATELY OFF — it ships dark and a row turns it
  // on after device testing, so the React Native run stays what people see until then
  ok("the onboarding's key is there and off", "onboarding" in entries && entries.onboarding === false);
  // the last Me pages in Swift (owner, 2026-10-27: "make Me all Swift"), each on like the finished ports
  const ME_LAST = ["keepsakes", "keepsake", "mykindreds", "editfield", "blocked", "help", "writetous"];
  ok("the last Me pages' seven keys are there and on", ME_LAST.every((k) => entries[k] === true));
  // a kindred's page in Swift (2026-10-27): on after its simulator pass
  ok("the kindred page's key is there and on", entries.kindredpage === true);
  // Wren's room in Swift (2026-10-27): on after its simulator pass
  ok("Wren's room's key is there and on", entries.wrenroom === true);
  // five small pages in Swift (2026-10-27): on after their simulator pass
  const SMALL = ["report", "voice", "drafts", "stampbook", "lore"];
  ok("the five small pages' keys are there and on", SMALL.every((k) => entries[k] === true));
  // three Notes pages in Swift (2026-10-27): on after their simulator pass
  const NOTE_PAGES = ["noteentry", "noteday", "photoroll"];
  ok("the three Notes pages' keys are there and on", NOTE_PAGES.every((k) => entries[k] === true));
  // the sheets every screen shares (2026-10-27): there, and OFF until their simulator pass
  const SHEETS = ["leavesheet", "reportsheet", "signupsheet", "toast"];
  ok("the four shared sheets' keys are there and off", SHEETS.every((k) => k in entries && entries[k] === false));
  ok("nothing else is in the table", Object.keys(entries).length === NINE.length + ME4A.length + AURA.length + ME_LAST.length + SMALL.length + NOTE_PAGES.length + SHEETS.length + 9);
}

/* ── the crash breadcrumb ── */
const B = "1.3.0 (29)";
const raw = (r: ArmingRecord) => JSON.stringify(r);
const launch = (r: ArmingRecord) => settleArming(raw(r), B); // what the next process finds

ok("nothing stored → a clean record", (() => { const r = settleArming(null, B); return r.binary === B && !Object.keys(r.armed).length && !Object.keys(r.strikes).length; })());
ok("a fresh phone has struck out on nothing", !struckOut(settleArming(null, B), "chat"));
ok("a mark that cleared leaves no strike", (() => { let r = armSurface(emptyArming(B), "chat", 1); r = clearSurface(r, "chat"); return !("chat" in launch(r).strikes); })());
ok("a mark left armed is one strike at the next launch", launch(armSurface(emptyArming(B), "chat", 1)).strikes.chat === 1);
ok("one strike is not struck out", !struckOut(launch(armSurface(emptyArming(B), "chat", 1)), "chat"));
ok("settling spends the marks", Object.keys(launch(armSurface(emptyArming(B), "chat", 1)).armed).length === 0);
{
  // two launches in a row that died while chat was opening
  const first = launch(armSurface(emptyArming(B), "chat", 1));
  const second = launch(armSurface(first, "chat", 2));
  ok("two strikes in a row → struck out", second.strikes.chat === MAX_STRIKES && struckOut(second, "chat"));
  ok("struck out stays struck out across a quiet launch", struckOut(launch(second), "chat"));
  ok("strikes are per surface", !struckOut(second, "room") && !struckOut(second, "today"));
  // a clean open between the two forgives the first
  const cleanBetween = launch(clearSurface(armSurface(first, "chat", 2), "chat"));
  ok("a mount that clears forgives earlier strikes", !("chat" in cleanBetween.strikes) && !struckOut(launch(armSurface(cleanBetween, "chat", 3)), "chat"));
  // a new binary starts clean
  ok("another binary's strikes are dropped", !struckOut(settleArming(raw(second), "1.3.0 (30)"), "chat"));
  ok("another binary's marks are not strikes", !("chat" in settleArming(raw(armSurface(emptyArming(B), "chat", 1)), "1.3.1 (31)").strikes));
}
ok("two screens armed at once both strike", (() => { const r = launch(armSurface(armSurface(emptyArming(B), "today", 1), "kindreds", 2)); return r.strikes.today === 1 && r.strikes.kindreds === 1; })());
ok("clearing one leaves the other armed", (() => { const r = clearSurface(armSurface(armSurface(emptyArming(B), "today", 1), "kindreds", 2), "today"); return !("today" in r.armed) && r.armed.kindreds === 2; })());
{
  // armed, then never opened where anyone could see it: no strike, and no forgiveness either
  const once = launch(armSurface(emptyArming(B), "kindreds", 1)); // one strike carried in
  const disarmed = disarmSurface(armSurface(once, "kindreds", 2), "kindreds");
  ok("a disarmed mark is gone", !("kindreds" in disarmed.armed));
  ok("disarming keeps the strikes", disarmed.strikes.kindreds === 1);
  ok("a disarmed mark is no strike at the next launch", launch(disarmed).strikes.kindreds === 1);
  ok("disarming leaves other surfaces armed", (() => { const r = disarmSurface(armSurface(armSurface(emptyArming(B), "me", 1), "notes", 2), "me"); return !("me" in r.armed) && r.armed.notes === 2; })());
  ok("disarming doesn't touch the record it was given", (() => { const r = armSurface(emptyArming(B), "me", 1); disarmSurface(r, "me"); return r.armed.me === 1; })());
}
ok("arming doesn't touch the record it was given", (() => { const r = emptyArming(B); armSurface(r, "chat", 1); return !Object.keys(r.armed).length; })());
ok("a torn write is a clean start, not a strike", (() => { const r = settleArming('{"binary":"1.3.0 (29)","armed":{"ch', B); return !Object.keys(r.strikes).length; })());
ok("junk in the record is dropped", (() => { const r = settleArming(JSON.stringify({ binary: B, armed: { chat: "x", "": 1, room: -1 }, strikes: { me: "2", notes: Infinity, today: 1 } }), B); return Object.keys(r.strikes).join() === "today"; })());
ok("a record that is an array or a number is a clean start", !Object.keys(settleArming("[1,2]", B).strikes).length && !Object.keys(settleArming("7", B).strikes).length);
ok("no binary known still counts (null matches null)", launch({ binary: null, armed: { chat: 1 }, strikes: {} }).strikes.chat === undefined && settleArming(JSON.stringify({ binary: null, armed: { chat: 1 }, strikes: {} }), null).strikes.chat === 1);
ok("'constructor' has never struck out", !struckOut(emptyArming(B), "constructor"));
ok("no record → nothing struck out", !struckOut(null, "chat"));

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
