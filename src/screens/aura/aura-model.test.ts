/* Behaviour lock for the Writing Aura room's and share card's model (screens/aura/aura-model):
   the nine in order and what each says (a sticker, no lean, still reading), the quote and its
   read sheet, the words you lean on and the sentence each came from, the pauses, the stickers
   without a seat, the counted ones by group with the private lock, the share card's name,
   scene, travelling stickers (never a private one) and its words — the rules both renderers
   draw, so a remote flip between SwiftUI and React Native never changes what the reader sees.
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/screens/aura/aura-model.test.ts
   The model imports nothing at runtime, so no stubs are needed. Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import {
  ORDER,
  auraRoomStrings,
  auraShareStrings,
  buildAuraRoom,
  buildDim,
  buildTicket,
  dearName,
  pad2,
  sceneKey,
  sentenceWith,
  shareMessage,
  stickerRecord,
  ticketScene,
  type AuraWords,
  type TicketWords,
} from "./aura-model.ts";
import type { Aura } from "../../lib/aura";

let failed = 0;
function ok(name: string, cond: boolean) {
  if (!cond) failed++;
  console.log(`${cond ? "ok  " : "FAIL"} ${name}`);
}

/* words that say which key and values they were asked for */
const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}${JSON.stringify(vars)}` : key);
const W: AuraWords = {
  t,
  dimLabel: (d) => `dim:${d}`,
  stickerName: (id) => `name:${id}`,
  stickerLine: (s) => `line:${s.stickerId}:${s.state}`,
  stickerCount: (s) => `count:${s.supporting}/${s.eligible}`,
  observationState: (st) => `state:${st}`,
  usageGroupLabel: (g) => `group:${g}`,
  usageLine: (u) => `usage:${u.id}:${u.n}`,
  stickerLook: (id, i) => ({ bg: "#5B55FF", fg: "#FFFFFF", border: "#5B55FF", radius: id.startsWith("pill") ? 999 : 8, tilt: ["-3deg", "2deg", "-2deg"][i % 3] }),
  dateShort: (iso) => `day:${iso.slice(5, 10)}`,
};
const TW: TicketWords = {
  ...W,
  titleName: (title) => (title?.noun ? `The ${title.adjective ?? "?"} ${title.noun}` : ""),
  titleDesc: (title) => `desc:${title?.noun ?? ""}`,
  phaseHeadline: (p) => `headline:${p}`,
  chipsFor: (home, usage, max, opts) => {
    const out = home.map((s) => ({ id: s.stickerId, kind: "writing" as const, line: `line:${s.stickerId}`, private: false }));
    for (const u of usage) {
      if (out.length >= max) break;
      if (opts?.publicOnly && u.private) continue;
      out.push({ id: u.id, kind: "usage" as const, line: `usage:${u.id}`, private: u.private });
    }
    return out.slice(0, max);
  },
  mosaicMask: (seed, develop) => (seed.length * 1000 + Math.round(develop * 10)) & ((1 << 25) - 1),
};

const span = (pieceId: string, start: number, end: number, source: "letter" | "reply" | "sealed" | "hatch" = "letter") => ({ pieceId, revision: "r1", start, end, source });
const sticker = (stickerId: string, dimension: string, state: "emerging" | "established", evidence: ReturnType<typeof span>[] = []) =>
  ({ stickerId, traitId: stickerId, dimension, state, supporting: 3, eligible: 5, evidence, since: "2026-10-01" }) as never;

const PIECE = "I walked home late. The rain stayed on the windows, and I watched it.";
const SECOND = PIECE.indexOf("The rain");
function makeAura(over: Partial<Aura> = {}): Aura {
  const sentence = sticker("long_breath", "sentence", "established", [span("gone", 0, 4), span("p1", SECOND, PIECE.length)]);
  const vocab = sticker("plain_words", "vocabulary", "emerging", [span("p1", 0, 18)]);
  const extra = sticker("pill_extra", "quirks", "established");
  return {
    phase: "forming",
    texts: [PIECE],
    pieceText: { p1: { text: PIECE, source: "letter", createdAt: "2026-10-12T10:00:00Z" } },
    stickers: {
      ruleVersion: "v",
      assessedAt: "2026-10-20",
      windowPieces: 7,
      writingDays: 4,
      observations: [{ dimension: "rhythm", state: "balanced" } as never, { dimension: "emotion", state: "unknown" } as never],
      byDimension: { sentence, vocabulary: vocab } as never,
      home: [sentence, vocab],
      board: [sentence, vocab, extra],
      title: { state: "partial", noun: "observer", adjective: null, basis: [] },
      nightShare: null,
    },
    lastWrittenAt: null,
    usage: [
      { id: "night_owl", group: "time", private: false, n: 4, of: 7 },
      { id: "diary_grief", group: "subject", private: true, n: 2 },
      { id: "pill_habit", group: "habit", private: false, n: 1 },
    ],
    formed: 0.3,
    pieces: 9,
    dims: [],
    locked: [],
    sealed: [],
    archetype: null,
    draft: null,
    sources: { letters: 5, conversations: 2 } as never,
    commonWords: [],
    nightOwl: false,
    ...over,
  } as Aura;
}

/* ── the nine ── */
{
  const a = makeAura();
  const room = buildAuraRoom(a, W, { words: [], pauses: [] }, 5);
  ok("nine dimensions, in the room's order", room.dims.length === 9 && room.dims.map((d) => d.key).join() === ORDER.join());
  ok("numbered 01…09", room.dims[0].number === "01" && room.dims[8].number === "09" && pad2(3) === "03");
  ok("the counter is wa.dimOf with the position", room.dims[4].counter === 'wa.dimOf{"i":5}');
  const s = room.dims[0];
  ok("a dimension with a sticker says its name", s.name === "name:long_breath" && s.label === "dim:sentence");
  ok("its line is the sticker's line then its count", s.line === "line:long_breath:established count:3/5");
  ok("its state is said, and green once established", s.state === "state:established" && s.established);
  ok("the quote is the first evidence still on the phone (not the gone piece)", s.quote === "The rain stayed on the windows, and I watched it.");
  ok("where it came from, by source and day", s.quoteFrom === 'wa.quoteFrom.letter{"d":"day:10-12"}');
  ok("the quote's lines follow the Letter font", s.quoteLines === 5);
  ok(
    "the read sheet splits the piece round the span",
    !!s.reading && s.reading.before === "I walked home late. " && s.reading.marked === s.quote && s.reading.after === "" && s.reading.name === "name:long_breath" && s.reading.line === "line:long_breath:established",
  );
  const v = room.dims[ORDER.indexOf("vocabulary")];
  ok("an emerging sticker is not established", !v.established && v.state === "state:emerging");
  const r = room.dims[ORDER.indexOf("rhythm")];
  ok("balanced signs: no lean, no state, no quote, no door", r.name === "wa.noLean" && r.line === "st.noLean" && r.state === "" && r.quote === "" && r.reading === null);
  const e = room.dims[ORDER.indexOf("emotion")];
  ok("nothing yet: still reading", e.name === "wa.stillReading" && e.line === "wa.fillsIn" && !e.established);
}
{
  // evidence whose piece is no longer on the phone: no quote and no door, the name stays
  const a = makeAura({ pieceText: {} });
  const d = buildDim(a, "sentence", 0, W);
  ok("no piece on the phone: no quote, no door", d.quote === "" && d.quoteFrom === "" && d.reading === null && d.name === "name:long_breath");
  ok("the quote's lines default to four", d.quoteLines === 4);
}
{
  // no stickers at all (an aura read before the observation layer)
  const a = makeAura({ stickers: null, usage: [] });
  const room = buildAuraRoom(a, W, { words: [], pauses: [] });
  ok("no readout: nine still-reading cards", room.dims.every((d) => d.name === "wa.stillReading" && d.reading === null));
  ok("no readout: no extras, no groups", room.extras.length === 0 && room.groups.length === 0);
}

/* ── habits ── */
{
  const a = makeAura();
  const room = buildAuraRoom(a, W, {
    words: [
      ["rain", 4],
      ["windows", 3],
      ["late", 2],
      ["home", 2],
      ["nowhere", 1],
    ],
    pauses: [
      [",", 6],
      ["—", 3],
      ["…", 0],
    ],
  });
  ok("FROM n PIECES counts the aura's pieces", room.fromPieces === 'wa.fromPieces{"n":9}');
  ok("the first two words are the largest, the next two middle, the rest small", room.words.map((w) => w.tier).join() === "0,0,1,1,2");
  ok("every other word is green", room.words.map((w) => w.green).join() === "false,true,false,true,false");
  ok("a word's sentence is the first one it appears in", room.words[0].hit === "The rain stayed on the windows, and I watched it.");
  ok("a word matches whole words only, any case", room.words[2].hit === "I walked home late.");
  ok("a word never written has no sentence", room.words[4].hit === "");
  ok("pauses are shares of the most counted", room.pauses[0].fraction === 1 && room.pauses[1].fraction === 0.5 && room.pauses[2].fraction === 0);
  ok("the extras are the board's stickers without a seat", room.extras.length === 1 && room.extras[0].sticker.id === "pill_extra" && room.extras[0].line === "count:3/5");
  ok("the groups follow the room's order and leave out empty ones", room.groups.map((g) => g.key).join() === "time,habit,subject");
  const subject = room.groups.find((g) => g.key === "subject")!;
  ok("a private counted sticker carries the lock's words", subject.items[0].privateLabel === "us.private");
  ok("a public one carries none", room.groups[0].items[0].privateLabel === "" && room.groups[0].items[0].line === "usage:night_owl:4");
  ok("a group is labelled by its name", room.groups[0].label === "group:time");
}
{
  ok("no pauses at all: no divide by zero", buildAuraRoom(makeAura(), W, { words: [], pauses: [[",", 0]] }).pauses[0].fraction === 0);
  ok("a word with regex characters is matched as written", sentenceWith({ p: { text: "abc. a.c here.", source: "letter", createdAt: "" } } as never, "a.c") === "a.c here.");
}

/* ── stickers ── */
{
  const s = stickerRecord(W, "pill_x", 1, "emerging");
  ok("a sticker's look comes from stickerLook", s.bg === "#5B55FF" && s.fg === "#FFFFFF" && s.name === "name:pill_x");
  ok("a 999 radius is a pill", s.pill && !stickerRecord(W, "tag_x", 0).pill);
  ok("the tilt is in degrees", s.tilt === 2 && stickerRecord(W, "x", 0).tilt === -3);
  ok("an emerging one is drawn trying on", s.trying && !stickerRecord(W, "x", 0).trying);
}

/* ── words of the room ── */
{
  const s = auraRoomStrings(t, (g) => `group:${g}`);
  ok("the room's three lenses", s.tabs.join() === "wa.tab.portrait,wa.tab.dims,wa.tab.habits");
  ok("the room's title, back and share are the React Native page's", s.title === "wa.title" && s.back === "a11y.back" && s.share === "ac.shareSm");
  ok("nothing counted reads as the habit group's", s.usageNoneLabel === "group:habit" && s.usageNone === "us.none");
  ok("every word is filled", Object.values(s).every((v) => (Array.isArray(v) ? v.every(Boolean) : !!v)));
}

/* ── the share card ── */
{
  const a = makeAura();
  const tk = buildTicket(a, TW, "@mira", "seed-1");
  ok("forming with a noun: the noun's name", tk.name === "The ? observer");
  ok("forming with a noun: its sketch, half developed", tk.scene.kind === "sketch" && tk.scene.set === "sketches" && tk.scene.id === "quiet-observer" && tk.scene.develop === 0.5);
  ok("the stickers that travel: writing first, never a private counted one", tk.stickers.map((s) => s.id).join() === "long_breath,plain_words,night_owl");
  ok("a noun known: the sentence is the title's", tk.desc === "desc:observer");
  ok("FORMED FROM the window's pieces", tk.formedFrom === 'ac.formedFrom{"n":7}');
  ok("me in words names the handle", tk.meInWords === 'ac.meInWords{"name":"@mira"}');
  ok("the face is the seed's, fully developed", tk.faceMask === TW.mosaicMask("seed-1", 1) && tk.artMask === TW.mosaicMask("seed-1", 0.5));
  ok("VoiceOver reads the card's words", tk.a11y.startsWith("ap.title. The ? observer. name:long_breath") && tk.a11y.endsWith('ac.formedFrom{"n":7}'));
  ok("never a quote on the card", !JSON.stringify(tk).includes("rain stayed"));
}
{
  const formed = makeAura({ phase: "formed" });
  formed.stickers!.title = { state: "formed", noun: "night_owl", adjective: "quiet", basis: [] };
  const tk = buildTicket(formed, TW, "me", "s");
  ok("formed: the title's name and its scene in colour", tk.name === "The quiet night_owl" && tk.scene.kind === "scene" && tk.scene.set === "scenes" && tk.scene.id === "quiet-night-owl");
  ok("formed: the face behind a missing scene is fully developed", tk.artMask === TW.mosaicMask("s", 1));
  ok("sceneKey turns underscores to hyphens", sceneKey(null, "night_owl") === "quiet-night-owl" && sceneKey("very_quick", "x") === "very-quick-x");
}
{
  const empty = makeAura({ phase: "empty", usage: [] });
  empty.stickers = null;
  const tk = buildTicket(empty, TW, "me", "s");
  ok("empty: the phase's headline and the faded quiet observer", tk.name === "headline:empty" && tk.scene.kind === "empty" && tk.scene.id === "quiet-observer" && tk.artMask === 0);
  ok("empty: no stickers, no sentence; pieces counted instead of the window", tk.stickers.length === 0 && tk.desc === "" && tk.formedFrom === 'ac.formedFrom{"n":9}');
  const signs = makeAura({ phase: "forming" });
  signs.stickers!.title = { state: "none", noun: null, adjective: null, basis: [] };
  ok("first signs with no noun: the first lines", ticketScene(signs).kind === "lines" && ticketScene(signs).id === null);
  ok("no noun: the sentence is the first sticker's line", buildTicket(signs, TW, "me", "s").desc === "line:long_breath");
}
{
  const formed = makeAura({ phase: "formed" });
  formed.stickers!.title = { state: "formed", noun: "observer", adjective: "quiet", basis: [] };
  ok("the words riding along a formed card: its title, without The", shareMessage(formed, TW, "Wren") === 'ac.shareTitle{"title":"quiet observer","name":"Wren"}');
  ok("before: the held stickers, lower-cased", shareMessage(makeAura(), TW, "Wren") === 'ac.shareStickers{"list":"name:long_breath, name:plain_words","name":"Wren"}');
  ok("dearName drops a leading The only", dearName("The Quiet Observer") === "Quiet Observer" && dearName("Theo") === "Theo");
  const s = auraShareStrings(t, "Wren");
  ok("the share page's words are the React Native page's", s.title === "ac.shareYourAura" && s.back === "sh.a11y.back" && s.share === "ac.shareCard" && s.save === "ac.saveImage" && s.readingFrom === 'ac.readingFrom{"name":"Wren"}');
}

console.log(failed ? `\n${failed} FAILED` : "\nall ok");
if (failed) process.exit(1);
