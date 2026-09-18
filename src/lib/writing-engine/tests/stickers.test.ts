/* THE STICKER LAYER — acceptance checks from the spec (§11). Run:
     npx tsx src/lib/writing-engine/tests/stickers.test.ts
   Every check is deterministic: fixed pieces, fixed dates, no wall clock. */

import { readStickers, toPiece, EMPTY_STATE, type Piece, type StickerState } from "../stickers/index.ts";
import { extractPiece, splitSentences } from "../stickers/extract.ts";
import { buildShareSnapshot } from "../stickers/resolve.ts";
import { setEngineLanguage } from "../app-language.ts";

let fail = 0;
const ok = (cond: boolean, label: string) => {
  if (!cond) fail++;
  console.log(`${cond ? "ok  " : "FAIL"}  ${label}`);
};
const NOW = "2026-09-16T12:00:00.000Z";
const day = (i: number) => `2026-09-${String(1 + (i % 14)).padStart(2, "0")}T10:00:00.000Z`;

/* ── fixtures: one steady voice, written as separate letters ── */
const OBSERVER: string[] = [
  "The rain stopped around six. The sill still held a little water, and the cup from last night was where I left it. I did not rush to close the window. Someone across the street was hanging a coat on a hook. I watched for a while. What do you keep on your sill?",
  "The kitchen light was on when I got home. There was bread on the table and a plate nobody had used. I sat down without taking my jacket off. The clock ticked louder than usual. I stayed there until the tea went cold. Do you ever do that?",
  "There was a bird on the balcony this morning. It stayed on the rail for maybe ten minutes. The sky was grey and the street was wet. I had my coffee standing up. My hands were cold on the mug. Nothing happened, and it was enough. Does that make sense to you?",
  "The train was late again. A man on the platform was reading a paper book with a broken spine. The wind came through the door every time it opened. I counted the stairs on the way up. Forty-two. What do you count?",
  "My desk is a mess of paper and one pen that works. The lamp buzzes a little. The mirror across the room shows the window behind me. I keep looking at the plant instead of the screen. It has a new leaf. Have you noticed anything new lately?",
  "The market was loud this afternoon. Sand in my shoes from the beach, still. A dog waited outside the shop, tied to the bench. The smell of soap and rice from somewhere. I bought a candle I did not need. What did you buy this week?",
  "The bus was warm and the glass was fogged. I drew a small box on it with one finger. The road was long and the sun was low. My bag was on my knees the whole way. When I got off, the moon was already up. Where were you at that hour?",
  "The floor is cold in the morning. I put my socks on before my feet touch it. The shower takes a minute to get warm. The towel on the door is still damp from yesterday. The photo on the shelf has slipped again. Do you have a photo like that?",
];

const ANXIOUS_LONG: string[] = [
  "I think I keep coming back to the same thought, which is that maybe I have been treating the whole situation as if it were something that could be solved. Honestly it might just be something that has to be carried for a while, and I am not sure I know how to do that yet. I suppose nobody really does, though everyone I know seems to manage it somehow. Maybe that is the part I keep missing when I sit here going over it again.",
  "Maybe it's the season, or maybe it's just that I've been sleeping badly, but I've noticed that I probably read too much into small things lately. I guess that's a habit I somehow picked up somewhere along the way, though I can't say where or when it started. It makes the evenings feel longer than they actually are, which is probably not a good sign. Still, I keep thinking it will pass if I just wait it out.",
  "Honestly I don't know whether this is something I should be worried about or something I should just let sit for a while longer. I think the not knowing is probably the part that keeps me awake most nights, though I'm aware of how that sounds. It sounds like the kind of thing a person says when they've already decided to worry anyway. Maybe I have, and I just haven't admitted it to myself yet.",
  "I've been thinking that the thing I actually want is probably not the thing I keep asking for, which is sort of a strange realisation to have on a Tuesday. And yet here we are, and I suppose I could just say it out loud to someone who would listen. It seems that saying it makes it true in a way I'm still not quite ready for, though. Maybe next week I will feel differently about the whole thing.",
  "It's possible that I'm making this bigger than it is, and honestly that would be a relief if it turned out to be the case. But I somehow doubt it, and I guess the point is that I keep circling the same question without ever quite landing on it. That probably tells you more about me than the question itself ever could, if I'm being honest. Anyway, I think I've said enough about it for one evening.",
  "Maybe the thing to do is nothing, for once, and just let the week go by without deciding anything at all about any of it. I'm not sure I've ever actually managed that, though, and I suspect I'll be back here in a few days with the same thought. It will probably be wearing a slightly different coat, still not sure, still turning itself over. I guess that is just how my head works when it gets quiet.",
];

const pieces = (texts: string[], source: "letter" | "reply" | "sealed" = "letter", offset = 0): Piece[] =>
  texts.map((t, i) => toPiece(`${source}-${offset + i}`, source, t, day(offset + i), "en"));

setEngineLanguage("id"); // the UI language must not matter — every check below runs under a foreign UI language

/* ── 0 · sentence splitting keeps abbreviations and counts an ellipsis once ── */
{
  const s = splitSentences("I saw Mr. Lee at 3.5 pm... it was fine. Really!");
  ok(s.length === 3, `split: abbreviation + decimal kept, ellipsis once → ${s.length} sentences (${s.map((x) => x.ending).join(",")})`);
  ok(s[0].ending === "ellipsis" && s[1].ending === "period" && s[2].ending === "exclaim", "split: endings classified");
}

/* ── 1 · same pieces, opened at different times → same result ── */
{
  const a = readStickers(pieces(OBSERVER), null, { now: NOW });
  const b = readStickers(pieces(OBSERVER), null, { now: "2026-12-01T03:00:00.000Z" });
  ok(JSON.stringify(a.readout.home.map((s) => s.stickerId)) === JSON.stringify(b.readout.home.map((s) => s.stickerId)), "1: home stickers identical across opening times");
  ok(JSON.stringify(a.readout.title) === JSON.stringify(b.readout.title), "1: title identical across opening times");
  console.log("     observer →", a.phase, a.readout.title, a.readout.home.map((s) => `${s.stickerId}:${s.state} ${s.supporting}/${s.eligible}`).join("  "));
}

/* ── 2 · re-pasting the same letter is not new evidence ── */
{
  const once = readStickers(pieces(OBSERVER.slice(0, 2)), null, { now: NOW });
  const pasted = readStickers([...pieces(OBSERVER.slice(0, 2)), ...pieces([OBSERVER[0], OBSERVER[0], OBSERVER[1]], "letter", 10)], null, { now: NOW });
  ok(once.readout.windowPieces === pasted.readout.windowPieces, `2: duplicates dropped (${once.readout.windowPieces} = ${pasted.readout.windowPieces})`);
  const sup = (r: typeof once) => r.readout.observations.find((o) => o.traitId === "concrete_detail")!.supportingPieceCount;
  ok(sup(once) === sup(pasted), "2: supporting count unchanged by re-paste");
}

/* ── 3 · one long letter does not outvote the daily ones; one question mark is not Open ender ── */
{
  const long = OBSERVER.join(" ") + " " + ANXIOUS_LONG.join(" ");
  const mixed = [...pieces(ANXIOUS_LONG), toPiece("big", "letter", long, day(12), "en")];
  const r = readStickers(mixed, null, { now: NOW });
  const cd = r.readout.observations.find((o) => o.traitId === "concrete_detail")!;
  ok(cd.supportingPieceCount <= 1, `3: the one long letter counts once for concrete_detail (${cd.supportingPieceCount})`);
  ok(cd.state !== "established", `3: concrete_detail not established off one piece (${cd.state})`);
  const oneQ = readStickers(pieces(["It rained all day. The street was empty. Why does that feel like a relief? I made soup and went to bed early. The end of the week is always like this.", ...OBSERVER.slice(0, 1).map((t) => t.replace(/\?[^?]*$/, "."))]), null, { now: NOW });
  const oe = oneQ.readout.observations.find((o) => o.traitId === "open_ender")!;
  ok(oe.state === "unknown" || oe.state === "balanced", `3: a mid-letter question mark does not unlock open_ender (${oe.state}, ${oe.supportingPieceCount} support)`);
}

/* ── 4 · UI language never changes the analysis of an English piece; unsupported script gets no lexical read ── */
{
  setEngineLanguage("en");
  const en = readStickers(pieces(OBSERVER), null, { now: NOW });
  setEngineLanguage("es");
  const es = readStickers(pieces(OBSERVER), null, { now: NOW });
  ok(JSON.stringify(en.readout.observations.map((o) => [o.traitId, o.state])) === JSON.stringify(es.readout.observations.map((o) => [o.traitId, o.state])), "4: same observations under en and es UI");
  const zh = extractPiece(toPiece("zh", "letter", "今天下雨了。我没有关窗。桌上的杯子还在。你呢？", day(0), null));
  ok(zh.lang === null, "4: Chinese text resolves to no supported language");
  ok(zh.verdicts.concrete_detail === undefined && zh.verdicts.open_ender === undefined, "4: no lexical verdicts on unsupported script");
  setEngineLanguage("id");
}

/* ── 5 · evidence points at real words; deleting the piece removes it ── */
{
  const r = readStickers(pieces(OBSERVER), null, { now: NOW });
  const cd = r.readout.observations.find((o) => o.traitId === "concrete_detail")!;
  const sp = cd.evidence[0];
  const src = OBSERVER.find((_, i) => `letter-${i}` === sp.pieceId)!;
  const quote = src.slice(sp.start, sp.end);
  const marked = sp.mark ? src.slice(sp.mark[0], sp.mark[1]) : "";
  ok(quote.length > 0 && marked.length > 0 && quote.includes(marked), `5: evidence quote "${quote}" marks "${marked}"`);
  const without = readStickers(pieces(OBSERVER).filter((p) => p.id !== sp.pieceId), null, { now: NOW });
  const cd2 = without.readout.observations.find((o) => o.traitId === "concrete_detail")!;
  ok(!cd2.evidence.some((e) => e.pieceId === sp.pieceId), "5: evidence from a deleted piece is gone");
}

/* ── 6 · no feeling words in a non-emotional text ≠ Quiet type; unknown/balanced allowed ── */
{
  const dry = pieces([
    "The meeting moved to Thursday. The room on the second floor has a broken chair. Bring the paper copies. The bus leaves at eight.",
    "The printer on the third floor is out of paper again. The key for the drawer is on the shelf by the door. The clock in the hall is ten minutes fast.",
    "The market opens at seven. The bread is on the left table. The coffee is by the window. The bench outside is wet in the morning.",
  ]);
  const r = readStickers(dry, null, { now: NOW });
  const q = r.readout.observations.find((o) => o.traitId === "quiet_feeling")!;
  ok(q.supportingPieceCount === 0 && q.state === "unknown", `6: quiet_feeling stays unknown on non-emotional text (${q.state})`);
}

/* ── 7 · one odd letter does not change the seat; a sustained change does, after two batches ── */
{
  let state: StickerState | null = null;
  let r = readStickers(pieces(OBSERVER), state, { now: NOW });
  state = r.state;
  const seat0 = r.readout.byDimension.sentence?.stickerId;
  ok(seat0 === "straight_shooter", `7: observer's sentence seat is straight_shooter (${seat0})`);
  // one long, hedged letter arrives
  r = readStickers([...pieces(OBSERVER), ...pieces(ANXIOUS_LONG.slice(0, 1), "letter", 20)], state, { now: NOW });
  state = r.state;
  ok(r.readout.byDimension.sentence?.stickerId === "straight_shooter", "7: one odd letter leaves the seat alone");
  // the voice changes for good: six long letters, in two batches
  r = readStickers([...pieces(OBSERVER), ...pieces(ANXIOUS_LONG.slice(0, 3), "letter", 20)], state, { now: NOW });
  state = r.state;
  const afterOne = r.readout.byDimension.sentence?.stickerId;
  r = readStickers([...pieces(OBSERVER), ...pieces(ANXIOUS_LONG, "letter", 20)], state, { now: NOW });
  state = r.state;
  const afterTwo = r.readout.byDimension.sentence?.stickerId;
  console.log(`     seat after batch one: ${afterOne}, after batch two: ${afterTwo}; candidates: ${JSON.stringify(state.candidates)}`);
  ok(afterOne === "straight_shooter" || afterOne === undefined, "7: not replaced after a single batch");
  ok(afterTwo !== "straight_shooter", "7: replaced (or withdrawn) once the change is sustained");
}

/* ── 8 · the share snapshot carries no private text ── */
{
  const r = readStickers([...pieces(OBSERVER), ...pieces(["Nobody sees this page. The cup is still on the sill and I did not close the window."], "sealed", 30)], null, { now: NOW });
  const snap = buildShareSnapshot(r.readout.title, r.readout.home, r.phase, NOW);
  const json = JSON.stringify(snap);
  ok(!/sill|window|cup|sealed-30|letter-0/.test(json), "8: snapshot has no quote, no piece id");
  ok(Array.isArray(snap.stickerIds), "8: snapshot lists sticker ids only");
}

/* ── phase ladder ── */
{
  const e = readStickers([], null, { now: NOW });
  ok(e.phase === "empty", "phase: no pieces → empty");
  const f = readStickers(pieces(OBSERVER.slice(0, 1)), null, { now: NOW });
  ok(f.phase === "forming", `phase: one piece → forming (${f.phase})`);
  const all = readStickers(pieces(OBSERVER), null, { now: NOW });
  ok(["shaping", "clearing", "formed"].includes(all.phase), `phase: eight letters → ${all.phase}`);
  const ten = readStickers([...pieces(OBSERVER), ...pieces(OBSERVER.slice(0, 2).map((t) => t + " The door was open."), "letter", 40)], null, { now: NOW });
  console.log("     ten letters →", ten.phase, JSON.stringify(ten.readout.title), "established:", ten.readout.observations.filter((o) => o.state === "established").map((o) => o.traitId).join(","));
}

console.log(fail ? `\n${fail} FAILED` : "\nall ok");
process.exit(fail ? 1 : 0);
