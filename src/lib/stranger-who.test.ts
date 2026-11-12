/* Behaviour lock for the book of who strangers are (lib/stranger-who), which every model asks:
   the Today card, the Kindreds rows / fold / orbit, the pen-pal chat's header, the readers, the
   blocked list and the courier's lines. Not wired to a runner; run by hand from the repo root
   with plain node (types stripped by Node itself; the hook below adds ".ts" to the app's
   extensionless imports):
     node src/lib/stranger-who.test.ts
   1. SWITCH OFF IS TODAY, EXACTLY: the caller's penPal with its options, the mosaic at the
      caller's develop, no mark, no sign, VoiceOver the name; no "was" line; nothing asked.
   2. SWITCH ON: the courier name (the reader's list, salt 0 without one), the FROST v1 spec of
      the uid in the theme, the marks with their VoiceOver words, "{name}, {mark}, {sign}".
   3. A deleted account is UNSIGNED behind the veil either way.
   4. "was No. 4481": on, before the switch's first day on this device, inside fourteen days. */

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const W = await import("./stranger-who.ts");
const { frostSpec } = await import("./frost.ts");
const { mosaicMask } = await import("./mosaic.ts");
const { strangerName, strangerNamer } = await import("./stranger-name.ts");
type Marks = import("./identity-core").Marks;

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  — " + extra));
  if (!cond) fails++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}(${Object.entries(v).map(([a, b]) => `${a}=${b}`).join(",")})` : k);
const penPal = (uid: string | null | undefined, o: { upper?: boolean; compact?: boolean }) => {
  if (!uid) return "ld.unsigned";
  const n = "No." + (o.compact ? "" : " ") + uid.length;
  return o.upper ? n.toUpperCase() : n;
};
const A = "7b3f1d2e-4c5a-4e8b-9f10-2a3b4c5d6e7f";
const B = "0f9e8d7c-6b5a-4493-8271-605f4e3d2c1b";
const asked: string[] = [];
const marks = (uid: string): Marks => {
  asked.push(uid);
  return uid === A ? { mark: "she", sign: "gemini" } : uid === B ? { mark: null, sign: "leo" } : { mark: null, sign: null };
};

/* ── 1. off is today ── */
{
  const off = W.whoBook({ identity: false, t, penPal, lang: "en", marks, dark: true, firstOnAt: Date.now() - 1000 });
  ok("off: the name is penPal with the caller's options", off.name(A) === "No. 36" && off.name(A, { upper: true, compact: true }) === "NO.36");
  const w = off.who(A, { develop: 0.4 });
  ok("off: the mosaic at the caller's develop", w.face.kind === "mosaic" && w.face.mask === mosaicMask(A, 0.4));
  ok("off: the mosaic fully in by default", off.face(A).kind === "mosaic" && (off.face(A) as { mask: number }).mask === mosaicMask(A, 1));
  ok("off: no mark, no sign, no words for them", w.mark === null && w.sign === null && w.markLabel === "" && w.signLabel === "");
  ok("off: VoiceOver hears the name alone", w.spoken === "No. 36" && off.spoken({ name: "x", markLabel: "she", signLabel: "Leo" }) === "x");
  ok("off: no frost", off.frost(A) === null);
  ok("off: nothing is asked of the identity client", asked.length === 0);
  ok("off: no 'was' line", off.was({ other: A, createdAt: 0 }) === "");
  ok("off: a kindred by their pen name, a pen pal by penPal", off.threadName({ other: A, revealed: true, otherName: "Mara" }) === "Mara" && off.threadName({ other: A, revealed: false }) === "No. 36");
  ok("off: identity reads false", off.identity === false);
}

/* ── 2. on ── */
{
  const on = W.whoBook({ identity: true, t, penPal, lang: "en", marks, dark: false });
  const name = strangerName(A, { lang: "en", unsigned: "ld.unsigned" });
  ok("on: the courier name, salt 0 without a list", on.name(A) === name && name.length > 2 && !name.startsWith("No."), name);
  ok("on: upper for mono labels; compact means nothing to a name", on.name(A, { upper: true, compact: true }) === name.toLocaleUpperCase());
  const w = on.who(A, { develop: 0.2 });
  ok("on: the frosted window, FROST v1 of the uid (light)", w.face.kind === "frost" && same(w.face.spec, frostSpec(A, false)));
  ok("on: the window never develops (develop ignored)", same(on.who(A, { develop: 1 }).face, w.face));
  ok("on: the same spec object for the same uid (memoised props stay put)", on.frost(A) === on.frost(A));
  const dark = W.whoBook({ identity: true, t, penPal, lang: "en", dark: true });
  ok("on: Midnight's tones on a dark theme", same(dark.frost(A), frostSpec(A, true)));
  // a stranger is never shown with the she/he mark: it is a kindred's to see (owner, 2026-11-12)
  ok("on: a stranger keeps the sign alone, never the mark", w.mark === null && w.markLabel === "" && w.sign === "gemini" && w.signLabel === "zd.gemini");
  ok("on: VoiceOver hears name and sign, never the mark", w.spoken === `${name}, zd.gemini`);
  const k = on.kindredMarks(A);
  ok("on: a kindred's marks carry the mark and the sign, with their VoiceOver words", k.mark === "she" && k.markLabel === "id.mark.she" && k.sign === "gemini" && k.signLabel === "zd.gemini");
  ok("on: a mark with no sign shows a stranger nothing at all", same(W.whoBook({ identity: true, t, penPal, lang: "en", marks: () => ({ mark: "he", sign: null }) }).marks(A), W.NO_WHO_MARKS));
  ok("off: no kindred's marks either", same(W.whoBook({ identity: false, t, penPal, lang: "en", marks }).kindredMarks(A), W.NO_WHO_MARKS));
  const b = on.who(B);
  ok("on: a sign without a mark sits where the mark would be (no empty comma)", b.mark === null && b.sign === "leo" && b.spoken === `${strangerName(B, { lang: "en", unsigned: "" })}, zd.leo`);
  ok("on: nothing to show is NO_WHO_MARKS", same(on.marks("someone-else"), W.NO_WHO_MARKS));
  const none = W.whoBook({ identity: true, t, penPal, lang: "en" });
  ok("on: no marks client yet → no marks (the model shows none until they arrive)", same(none.marks(A), W.NO_WHO_MARKS) && none.who(A).spoken === name);
  // the reader's list: an exact repeat moves the later pen pal, and the book follows it
  const namer = strangerNamer([{ id: "t1", createdAt: 1, other: A }], "ja");
  const ja = W.whoBook({ identity: true, t, penPal, lang: "ja", namer });
  ok("on: names come from the reader's list when given (its language)", ja.name(A) === namer.name(A, { unsigned: "ld.unsigned" }) && ja.name(A) === strangerName(A, { lang: "ja", unsigned: "" }));
  ok("on: a kindred by their pen name, a pen pal by the courier name", on.threadName({ other: A, revealed: true, otherName: "Mara" }) === "Mara" && on.threadName({ other: A }) === name);
}

/* ── 3. no one ── */
{
  for (const identity of [false, true]) {
    const bk = W.whoBook({ identity, t, penPal, lang: "en", marks });
    const g = bk.who(null);
    ok(`${identity ? "on" : "off"}: a deleted account is UNSIGNED behind the veil, no mark, no sign`, g.name === "ld.unsigned" && g.face.kind === "veil" && g.mark === null && g.sign === null && g.spoken === "ld.unsigned");
    ok(`${identity ? "on" : "off"}: a gone thread's line names nobody`, bk.threadName({ other: A, gone: true }) === "ld.unsigned");
  }
}

/* ── 4. was No. ── */
{
  const DAY = 864e5;
  const since = Date.parse("2026-11-01T09:00:00Z");
  const on = W.whoBook({ identity: true, t, penPal, lang: "en", firstOnAt: since });
  const old = { other: A, createdAt: since - 30 * DAY };
  ok("was: a pre-switch pen pal says their number", on.was(old, since + DAY) === "id.was(no=No. 36)");
  ok("was: a thread from a list kept before created_at counts as pre-switch", on.was({ other: A, createdAt: null }, since + DAY) === "id.was(no=No. 36)");
  ok("was: still there on day 13", on.was(old, since + 13.9 * DAY) !== "");
  ok("was: gone after fourteen days", on.was(old, since + 14 * DAY) === "");
  ok("was: a thread opened after the first day with names never had a number", on.was({ other: A, createdAt: since + 1000 }, since + DAY) === "");
  ok("was: never for a kindred or a closed account", on.was({ ...old, revealed: true }, since + DAY) === "" && on.was({ ...old, gone: true }, since + DAY) === "");
  ok("was: nothing while the first day isn't known", W.whoBook({ identity: true, t, penPal, lang: "en", firstOnAt: null }).was(old, since) === "");
}

console.log(fails ? `${fails} failed` : "all ok");
if (fails) process.exit(1);
