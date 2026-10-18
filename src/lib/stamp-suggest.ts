import { detectThemes } from "./writing-engine/journal-sparks/detect-themes";
import type { JournalTheme } from "./writing-engine/types";
import { readMood } from "./wren-read";
import { STARTER_STAMPS } from "../data/stamps";

/* STAMPS READ OFF THE LETTER.
   ────────────────────────────────────────────────────────────────────────
   The album opens with six stamps for THIS letter, not the same six for
   everyone: what the writing engine hears in it — its themes, in its own
   language, then the courier's mood read — is turned into stamps by the
   two tables below. Nothing is scored; a theme names its stamps, the
   strongest theme goes first, and the starters fill whatever is left. */

const BY_THEME: Record<JournalTheme, string[]> = {
  missing_someone: ["miss-someone", "old-friend", "then-now"],
  tired: ["cant-sleep", "whats-the-point", "ordinary"],
  family: ["homesick", "then-now", "never-told"],
  work: ["ordinary", "tiny-win", "whats-the-point"],
  sleep: ["cant-sleep", "overthinking", "intrusive"],
  loneliness: ["miss-someone", "homesick", "whats-the-point"],
  friendship: ["old-friend", "made-my-day", "almost-texted"],
  love: ["crush", "situationship", "almost-texted", "not-over-it"],
  home: ["homesick", "comfort", "outside"],
  memory: ["then-now", "seasons", "old-friend"],
  future: ["what-if", "growing", "who-am-i"],
  small_win: ["tiny-win", "made-my-day", "growing"],
  uncertainty: ["overthinking", "what-if", "who-am-i", "lost"],
  something_unsaid: ["never-told", "off-chest", "unsent"],
};

const BY_MOOD: Record<string, string[]> = {
  worry: ["overthinking", "cant-sleep", "spiral"],
  delight: ["made-my-day", "tiny-win", "growing"],
  happy: ["ordinary", "comfort", "made-my-day"],
  curious: ["what-if", "who-am-i", "hot-take"],
  think: ["overthinking", "then-now", "changed"],
  listen: ["off-chest", "never-told", "pretending"],
};

/** The stamps the writing itself calls up, strongest reading first, with no starters to fill
    the gaps: its themes' stamps, then its mood's. Nothing for a text under 20 characters (too
    little to read). The room's ideas use it to hear which categories the other person writes in
    (build-items theirCategories). */
export function stampsHeard(text: string): string[] {
  const out: string[] = [];
  const add = (ids: string[]) => {
    for (const id of ids) if (!out.includes(id)) out.push(id);
  };
  const t = (text || "").trim();
  if (t.length >= 20) {
    for (const th of detectThemes(t).themes) add(BY_THEME[th.theme] ?? []);
    add(BY_MOOD[readMood(t)] ?? []);
  }
  return out;
}

/** six stamp ids for a letter, strongest reading first */
export function suggestStamps(text: string, n = 6): string[] {
  const out: string[] = [];
  const add = (ids: string[]) => {
    for (const id of ids) if (!out.includes(id) && out.length < n) out.push(id);
  };
  add(stampsHeard(text));
  add(STARTER_STAMPS);
  return out;
}
