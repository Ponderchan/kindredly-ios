/* The paper table (papers.ts): the seven papers in the strip's order, the owner's tiers, the
   prototype's values where they differ from its defaults, plain for anything unknown, and the
   gate the compose key reads. Not wired to a runner; run by hand from the repo root with plain
   node (Node 22.18+ strips the types; older: --experimental-strip-types):
     node src/data/papers.test.ts
   Every line prints ok/FAIL and the process exits non-zero if any fail. */

import { PAPERS, PAPER_IDS, paperOf, paperIdOf, isPaperId, paperGate, canUsePaper, paperForDb } from "./papers.ts";

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

ok("seven papers in the strip's order", PAPER_IDS.join(" ") === "plain grid kraft airmail receipt sticky riso", PAPER_IDS.join(" "));
const tiers = Object.fromEntries(PAPERS.map((p) => [p.id, p.tier]));
ok("tiers: plain grid free; airmail kindred; kraft receipt sticky riso First Class",
  tiers.plain === "free" && tiers.grid === "free" && tiers.airmail === "kindred" &&
  tiers.kraft === "first" && tiers.receipt === "first" && tiers.sticky === "first" && tiers.riso === "first", JSON.stringify(tiers));
ok("every paper names its key pp.name.<id>", PAPERS.every((p) => p.nameKey === `pp.name.${p.id}`));

// the prototype's values, a few that matter
ok("plain: 2.5 ink edge, 24 corners, Garamond", paperOf("plain").border === "2.5px solid #1E1B35" && paperOf("plain").radius === "24px" && paperOf("plain").font === "G");
ok("receipt: mono 17 on 1.6, torn", paperOf("receipt").font === "M" && paperOf("receipt").size === "17px" && paperOf("receipt").lh === "1.6" && paperOf("receipt").torn);
ok("sticky: lime, system 24, folded", paperOf("sticky").bg === "#D8F04A" && paperOf("sticky").font === "S" && paperOf("sticky").size === "24px" && paperOf("sticky").fold);
ok("airmail: 8 striped edge, red meta", paperOf("airmail").border === "8px solid transparent" && paperOf("airmail").meta === "#C8412E");
ok("riso: misregistered red text shadow", paperOf("riso").textShadow === "1.5px 1px 0 rgba(200,65,46,.55)");
ok("defaults filled: grid 29 on 1.3, no shadow on its text", paperOf("grid").size === "29px" && paperOf("grid").lh === "1.3" && paperOf("grid").textShadow === "none");
ok("only receipt is torn, only sticky folds", PAPERS.filter((p) => p.torn).map((p) => p.id).join() === "receipt" && PAPERS.filter((p) => p.fold).map((p) => p.id).join() === "sticky");

// unknown is plain
ok("null / undefined / unknown / non-string → plain", [null, undefined, "", "midnight", "ruled", 7, {}].every((x) => paperIdOf(x) === "plain" && paperOf(x).id === "plain"));
ok("isPaperId", isPaperId("riso") && !isPaperId("postcard") && !isPaperId(null));

// the gate
const free = { firstClass: false, hasKindred: false };
const kin = { firstClass: false, hasKindred: true };
const fc = { firstClass: true, hasKindred: false };
const both = { firstClass: true, hasKindred: true };
ok("free writer: plain grid ok", canUsePaper("plain", free) && canUsePaper("grid", free));
ok("free writer: airmail waits for a kindred", paperGate("airmail", free) === "kindred" && !canUsePaper("airmail", free));
ok("free writer: First Class papers go gold", ["kraft", "receipt", "sticky", "riso"].every((id) => paperGate(id, free) === "firstClass"));
ok("with a kindred: airmail ok, First Class still gold", canUsePaper("airmail", kin) && paperGate("riso", kin) === "firstClass");
ok("First Class without a kindred: riso ok, airmail still waits", canUsePaper("riso", fc) && paperGate("airmail", fc) === "kindred");
ok("both: everything", PAPER_IDS.every((id) => canUsePaper(id, both)));
ok("unknown id passes as plain", canUsePaper("midnight", free));

// the column
ok("paperForDb: plain and unknown → null, others their id", paperForDb("plain") === null && paperForDb("nope") === null && paperForDb(null) === null && paperForDb("riso") === "riso");

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
