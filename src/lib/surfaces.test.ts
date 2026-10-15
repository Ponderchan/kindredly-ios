/* Behaviour lock for which app_surfaces row wins (lib/surfaces-resolve).
   Not wired to a runner; run by hand from the repo root with plain node
   (it strips the types itself from Node 22.18 / 23.6 on):
     node src/lib/surfaces.test.ts */

import { resolveSurfaces, surfaceOn } from "./surfaces-resolve.ts";

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

console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
