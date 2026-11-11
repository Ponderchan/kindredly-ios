/* Make your own face's words per screen (make-face-model.ts): every key it asks for is in
   strings-make-face.ts, the rejected screen speaks for its reason with the buttons its actions
   allow, the intro's second row and the done button follow the facts. Not wired to a runner; run
   by hand from the repo root with plain node (Node 22.18+ strips the types):
     node src/screens/make-face/make-face-model.test.ts */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "../lib/i18n") return { url: "data:text/javascript,export const strings=(...b)=>{globalThis.__blocks=b}", shortCircuit: true };
    return next(specifier, context);
  },
});

await import("../../data/strings-make-face.ts");
const { CHIP_GROUPS, faceChips, faceStrings, genLines } = await import("./make-face-model.ts");
const { rejectActions } = await import("../../lib/make-face-core.ts");

const en = ((globalThis as any).__blocks as Record<string, string>[])[0];
const asked = new Set<string>();
const t = (k: string) => {
  asked.add(k);
  return en[k] ?? `<<${k}>>`;
};

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) fails++;
};

const base = { quota: "free" as const, entry: "me" as const, reason: null, mode: "photo" as const, reject: rejectActions("no_face", "photo", false) };
const s = faceStrings(t, base);
ok("no word is missing", Object.values(s).every((v) => !v.includes("<<")), Object.entries(s).filter(([, v]) => v.includes("<<")).map(([k]) => k).join(" "));
ok("the intro's free row", s.introQuota === en["mf.intro.free"]);
ok("the intro's used and member rows", faceStrings(t, { ...base, quota: "used" }).introQuota === en["mf.intro.used"] && faceStrings(t, { ...base, quota: "member" }).introQuota === en["mf.intro.member"]);
ok("done: Done from Me, Continue in onboarding", s.doneButton === en["mf.done.done"] && faceStrings(t, { ...base, entry: "onboarding" }).doneButton === en["mf.done.continue"]);
{
  const r = faceStrings(t, { ...base, reason: "no_face", reject: rejectActions("no_face", "photo", false) });
  ok("no face: its line, Try another photo · Use words", r.rejectLine === en["mf.reject.noFace.line"] && r.rejectPrimary === en["mf.reject.tryPhoto"] && r.rejectSecondary === en["mf.reject.useWords"]);
  const m = faceStrings(t, { ...base, reason: "minor", reject: rejectActions("minor", "photo", false) });
  ok("a minor's photo: words only", m.rejectLine === en["mf.reject.minor.line"] && m.rejectPrimary === en["mf.reject.useWords"] && m.rejectSecondary === "");
  const w = faceStrings(t, { ...base, reason: "words", mode: "words", reject: rejectActions("words", "words", false) });
  ok("words refused: Try other words · Try another photo", w.rejectLine === en["mf.reject.words.line"] && w.rejectPrimary === en["mf.reject.tryWords"] && w.rejectSecondary === en["mf.reject.tryPhoto"]);
  const c = faceStrings(t, { ...base, reason: "many_faces", reject: rejectActions("many_faces", "photo", false) });
  ok("a crowd: its own line", c.rejectLine === en["mf.reject.many.line"]);
}
ok("thirteen chips in three groups, each with its words", faceChips(t).length === 3 && faceChips(t).flatMap((g) => g.chips).length === 13 && faceChips(t).every((g) => g.chips.every((c) => c.label && !c.label.includes("<<"))));
ok("the groups name the strings file's chips", CHIP_GROUPS.flatMap((g) => g.chips).every((c) => `mf.chip.${c}` in en));
ok("four painting lines", genLines(t).length === 4 && genLines(t).every((l) => !l.includes("<<")));
for (const reason of ["no_face", "many_faces", "minor", "unsafe", "words"] as const) faceStrings(t, { ...base, reason });
const unused = Object.keys(en).filter((k) => !asked.has(k) && !k.startsWith("mf.tag.") && !["mf.entry.a11y", "mf.notif", "mf.photoFail", "mf.ep.avatarNote", "mf.banner.title", "mf.banner.see"].includes(k));
ok("every flow word in the strings file is used (the doors' tags, the knock, the photo alert, Edit profile's note and the banner are the hosts')", unused.length === 0, unused.join(" "));

console.log(fails ? `\n${fails} failed` : "\nall passed");
if (fails) process.exit(1);
