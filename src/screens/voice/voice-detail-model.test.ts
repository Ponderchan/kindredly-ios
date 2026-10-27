/* Behaviour lock for Your Voice in Swift (screens/voice/voice-detail-model): the same lines and the
   same door as the React Native page (app/voice.tsx). Not wired to a runner; run by hand from the
   repo root with plain node:
     node src/screens/voice/voice-detail-model.test.ts
   The model imports types only, so nothing needs stubbing. */

import { voiceDetailGate, voiceDetailView, voiceGateHref, type VoiceDetailFormat } from "./voice-detail-model.ts";
import type { VoiceRead } from "../../lib/voice";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const fmt: VoiceDetailFormat = {
  t: (k, v) => (v ? `${k}:${Object.values(v).join("|")}` : k),
  speak: (s) => s.replace("Wren", "Pip"),
  wren: "Pip",
};

const read = (pieces: number): VoiceRead =>
  ({
    pieces,
    stage: { name: "Spark", line: "Wren is listening", zh: "" },
    rows: [
      { key: "rhythm", glyph: "~", title: "Rhythm", line: "Wren hears a long breath.", strength: 4, read: true },
      { key: "words", glyph: "Aa", title: "Word choice", line: "unused", strength: 2, read: false },
    ],
  }) as unknown as VoiceRead;

/* ── the header line and the rows ── */
ok("nothing read yet: an ellipsis and no rows", (() => { const v = voiceDetailView(null, fmt); return v.basedOn === "…" && v.rows.length === 0; })());
ok("one piece: vc.basedOnOne, her line in her name, lower case", voiceDetailView(read(1), fmt).basedOn === "vc.basedOnOne:1|pip is listening");
ok("many pieces: vc.basedOnMany", voiceDetailView(read(5), fmt).basedOn === "vc.basedOnMany:5|pip is listening");
{
  const rows = voiceDetailView(read(5), fmt).rows;
  ok("a read row says what it found, in her name", rows[0].line === "Pip hears a long breath." && rows[0].read && rows[0].strength === 4);
  ok("an unread row admits it", rows[1].line === "vc.notEnough" && !rows[1].read);
  ok("the glyph and title pass through", rows[1].glyph === "Aa" && rows[1].title === "Word choice");
}

/* ── the night letter's door ── */
{
  const first = voiceDetailGate({ state: "ready", kind: "first" }, fmt);
  ok("ready, the first: she wrote you a letter, tappable", first.title === "vc.gate.wrote:Pip" && first.sub === "vc.gate.readySub" && first.tappable && first.pct === null);
  ok("ready, a month on: vc.gate.here", voiceDetailGate({ state: "ready", kind: "monthly" }, fmt).title === "vc.gate.here");
  ok("ready wears the wrapped eyebrow", first.eyebrow === "🌙 YOUR AURA · WRAPPED");
}
{
  const p = voiceDetailGate({ state: "progress", have: 2, need: 3 }, fmt);
  ok("progress: one more, singular", p.sub === "vc.gate.progressOne:1" && !p.tappable);
  ok("progress: the page's own title, her name in it", p.title === "Pip is saving up a letter about you.");
  ok("progress: the bar, rounded", p.pct === 67);
  ok("progress: several more, plural", voiceDetailGate({ state: "progress", have: 1, need: 5 }, fmt).sub === "vc.gate.progressMany:4");
  ok("progress: the bar never past 100", voiceDetailGate({ state: "progress", have: 9, need: 5 }, fmt).pct === 100);
}
{
  const l = voiceDetailGate({ state: "locked" }, fmt);
  ok("locked: First Class, tappable", l.eyebrow === "👑 FIRST CLASS" && l.title === "vc.gate.locked" && l.tappable);
  ok("locked: the page's own line, her name in it", l.sub === "Your voice, your hours, your words — a wrapped read from Pip with First Class.");
}
{
  const d = voiceDetailGate({ state: "done" }, fmt);
  ok("done: read this month, not tappable", d.title === "vc.gate.read" && d.sub === "vc.gate.doneSub" && !d.tappable);
}
ok("a tap on ready opens the night letter", voiceGateHref({ state: "ready", kind: "first" }) === "/report");
ok("a tap on locked goes to First Class", voiceGateHref({ state: "locked" }) === "/paywall?src=report_lock");
ok("progress, done and no gate go nowhere", voiceGateHref({ state: "progress", have: 1, need: 3 }) === null && voiceGateHref({ state: "done" }) === null && voiceGateHref(null) === null);

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
