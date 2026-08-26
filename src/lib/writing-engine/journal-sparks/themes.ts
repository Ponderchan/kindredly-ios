import type { JournalTheme } from "../types";

/* THEME → SPARK KEY.
   ────────────────────────────────────────────────────────────────────────
   Stable theme ids map to the catalog spark keys the app already ships
   (src/data/strings.ts, js.*). Only the themes we have a dedicated, curated
   spark for appear here; others fall through to the general rotation, exactly
   as the shipped English regex did (it only ever had six theme lines). The
   spark TEXT is localized at the copy layer — this mapping is pure product
   logic and never holds display strings. */
export const THEME_SPARK: Partial<Record<JournalTheme, string>> = {
  missing_someone: "js.37", // "something you miss but never mention…"
  tired: "js.38", // "what's been taking it out of you…"
  family: "js.39", // "something about them you've never said…"
  work: "js.40", // "the part of it nobody sees…"
  sleep: "js.32", // "what keeps you up, plainly…"
  loneliness: "js.41", // "who you thought of today…"
};
