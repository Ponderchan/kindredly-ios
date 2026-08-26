import type { WrenMood } from "../components/WrenBird";
import { OPENING_MIN } from "./weighted-count";
import { t } from "./i18n";
import { courierRead } from "./writing-engine/courier-read/mood-signals";

/* How Wren reads a piece of writing — words, tone, and emoji, across all four
   languages. The mechanism moved into writing-engine/courier-read: the affect,
   laughter and question evidence now comes from the RESOLVED language's own
   resources (analyze locally), while the mood taxonomy and the tender-first
   decision order are unchanged (normalize globally). Chinese affect rides
   along as a language-neutral bonus so pool letters in zh don't regress.
   Still synchronous — this runs per keystroke in the composer. */

/** Read the drift of a piece of text into one of Wren's moods.
 *  `enough` = has the writer put down at least a line (controls listen→happy).
 *  Language resolves from the writer's app language (with a marker-detector
 *  fallback), so the same moods fire in en/es/pt/id. */
export function readMood(text: string, enough = true): WrenMood {
  return courierRead(text, enough).mood as WrenMood;
}

/** Wren's one-line voice for a mood (composer register). */
export function wrenLine(m: WrenMood): string {
  switch (m) {
    case "worry": return t("wr.mood.worry");
    case "delight": return t("wr.mood.delight");
    case "happy": return t("wr.mood.happy");
    case "curious": return t("wr.mood.curious");
    case "think": return t("wr.mood.think");
    case "listen":
    default: return t("wr.mood.listen");
  }
}

/** As you write a cold opening, Wren coaxes you past a real line — and the
 *  moment you clear it, the floor turns into the matching itself ("go meet your
 *  kindred"). She isn't a validator; she's getting to know you. Opening only —
 *  replies and letters to yourself never ask this. Buckets are weighted units
 *  ([[weighted-count]]), so one hanzi steps two rungs at a time; that's fine,
 *  four rungs is coarse on purpose. */
/* Wren's four rungs. The empty-page line used to be "I'm listening…", which
   opens a CHAT — the first feeling was "I'm about to talk to an AI" rather
   than "someone is waiting for me to write". At zero she just says she's
   present and unhurried; the coaxing only starts once there are words to
   coax. */
export function openingLadder(weighted: number): { line: string; ready: boolean } {
  if (weighted >= OPENING_MIN) return { line: t("wr.ladder.ready"), ready: true };
  if (weighted >= 30) return { line: t("wr.ladder.almost"), ready: false };
  if (weighted >= 15) return { line: t("wr.ladder.more"), ready: false };
  return { line: t("wr.ladder.start"), ready: false };
}

/** Wren's first words to a newly-written line at the hatch (warmer register). */
export function hatchLine(m: WrenMood): string {
  switch (m) {
    case "worry": return t("wr.hatch.worry");
    case "delight": return t("wr.hatch.delight");
    case "curious": return t("wr.hatch.curious");
    case "think": return t("wr.hatch.think");
    case "happy":
    case "listen":
    default: return t("wr.hatch.default");
  }
}

/* ── A thought's condition, and what Wren says about it ───────────────────
   The composer no longer asks where something is going before it exists. A
   thought has a STATE, and the state changes as the writing does — only the
   last two are the writer's to choose. The 40-character floor stops being a
   gate ("you can't send yet") and becomes the moment Wren notices the thing
   might belong to someone else, which is what it was really measuring. */

export type ThoughtState = "withMe" | "becoming" | "sealed" | "drifting";

export function thoughtState(weighted: number, chosen: "seal" | "drift" | null): ThoughtState {
  if (chosen === "seal") return "sealed";
  if (chosen === "drift") return "drifting";
  return weighted >= OPENING_MIN ? "becoming" : "withMe";
}

/** the label — a condition being reported, never an option being set */
export function thoughtLabel(s: ThoughtState): string {
  switch (s) {
    case "sealed": return t("wr.state.sealed");
    case "drifting": return t("wr.state.drifting");
    case "becoming": return t("wr.state.becoming");
    default: return t("wr.state.withMe");
  }
}

/* Wren's register changes with the state: encouragement while it's still
   yours, OBSERVATION at the moment it might not be, then settling either way.
   Under the floor she keeps using the existing ladder — that voice already
   works and shouldn't be replaced. */
export function thoughtLine(s: ThoughtState, weighted: number): string {
  switch (s) {
    case "becoming": return t("wr.line.becoming");
    case "sealed": return t("wr.line.sealed");
    case "drifting": return t("wr.line.drifting");
    default: return openingLadder(weighted).line;
  }
}

/* The two endings. Never "send" or "keep private" — a destination named as a
   fate. TRAVEL, because that's the word the flow already opened with: "where
   should this thought travel?" The button should answer the question it was
   asked. ("Drift" stays the word for a single line leaving a journal entry —
   a smaller, quieter departure.) "Seal it here" names the room it lands in,
   and "here" carries the promise: this phone. */
export const DRIFT_LABEL = "LET IT TRAVEL"; // legacy const; prefer t("wr.drift")
export function driftLabel(): string { return t("wr.drift"); }
export function sealLabel(): string { return t("wr.seal"); }

/* Releasing something you'd meant to keep is the one move that can cost the
   writer something, so Wren asks — in her own voice, on the page. Going the
   other way is free and silent: moving toward safety shouldn't need consent. */
export function driftConfirm() {
  return {
    note: t("wr.confirm.note"),
    question: t("wr.confirm.question"),
    go: t("wr.confirm.go"),
    stay: t("wr.confirm.stay"),
  };
}
