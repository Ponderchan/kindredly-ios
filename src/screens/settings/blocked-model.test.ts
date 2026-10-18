/* Behaviour lock for the blocked list's rows (screens/settings/blocked-model): who a blocked
   writer was, with the identity switch off (exactly today's "NO. 4481" beside the full mosaic)
   and on (the courier name in capitals beside the frosted window).
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/screens/settings/blocked-model.test.ts
   A load hook adds ".ts" to the extensionless relative imports Metro wants. Every line prints
   ok/FAIL and the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const M = await import("./blocked-model.ts");
const { whoBook } = await import("../../lib/stranger-who.ts");
const { strangerName } = await import("../../lib/stranger-name.ts");
const { frostSpec } = await import("../../lib/frost.ts");
const { mosaicMask } = await import("../../lib/mosaic.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}(${Object.entries(v).map(([a, b]) => `${a}=${b}`).join(",")})` : k);
// the translated number the rest of the app uses — the blocked row never did
const penPal = (u: string | null | undefined, o: { upper?: boolean }) => (u ? (o.upper ? "N.º 1234" : "N.º 1234") : "ld.unsigned");
const base = { t, postNo: (u: string) => u.length * 100 + 7, day: (iso: string) => "Oct " + iso.slice(8, 10), upper: (s: string) => s.toUpperCase() };
const ROW = { blocked: "user-blocked", created_at: "2026-10-14T10:00:00Z" };

{
  const off = M.blockedRow(ROW, { ...base, who: whoBook({ identity: false, t, lang: "en", penPal, marks: () => ({ mark: "she", sign: "leo" }) }) });
  ok("identity off: NO. and the number, as the row always set it (not the translated N.º)", off.who.name === "NO. 1207");
  ok("identity off: the full FACE v1 mosaic", off.who.face.kind === "mosaic" && off.who.face.mask === mosaicMask("user-blocked", 1));
  ok("identity off: no mark, no sign; VoiceOver the number", off.who.mark === null && off.who.sign === null && off.who.spoken === "NO. 1207");
  ok("identity off: when, in capitals", off.since === "bl.blockedOn(day=OCT 14)" && off.id === "user-blocked");
}
{
  const on = M.blockedRow(ROW, { ...base, who: whoBook({ identity: true, t, lang: "en", penPal }) });
  const courier = strangerName("user-blocked", { lang: "en", unsigned: "" });
  ok("identity on: the courier name in capitals", on.who.name === courier.toLocaleUpperCase());
  ok("identity on: their frosted window", on.who.face.kind === "frost" && JSON.stringify(on.who.face.spec) === JSON.stringify(frostSpec("user-blocked", false)));
  ok("identity on: marks_for answers nothing across a block, so none", on.who.mark === null && on.who.sign === null && on.who.spoken === courier.toLocaleUpperCase());
  ok("rows keep the server's order", M.blockedRows([ROW, { ...ROW, blocked: "b2" }], { ...base, who: whoBook({ identity: true, t, lang: "en", penPal }) }).map((r) => r.id).join() === "user-blocked,b2");
}

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
