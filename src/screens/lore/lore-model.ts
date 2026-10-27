import type { LoreEntry } from "../../lib/lore";

/* LORE, AS DATA (2026-10-27): the shelf of kept moments (app/lore.tsx).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — every word and date comes in
   through `fmt`, so `node src/screens/lore/lore-model.test.ts` locks the
   rules. LoreNative turns this into the Swift page (KLoreView); the React
   Native page, the "lore" switch's fallback, does the same inline: each
   clipping in lib/lore's order, the question it answered when it was one,
   its words, and the small print "FROM <NAME>" with " · <DAY>" when the
   day it was written is known, both in the reader's capitals. */

export type LoreFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** the short date (lib/format dShort) */
  day: (iso: string) => string;
};

export type LoreCard = {
  id: string;
  /** the question it answered; "" for none */
  prompt: string;
  body: string;
  /** FROM ROBIN · OCT 27 */
  from: string;
};

export function loreCards(items: readonly LoreEntry[], fmt: LoreFormat): LoreCard[] {
  return items.map((e) => ({
    id: e.id,
    prompt: e.prompt ? e.prompt : "",
    body: e.body,
    from: fmt.t("lore.from", { name: e.who.toLocaleUpperCase() }) + (e.said ? ` · ${fmt.day(e.said).toLocaleUpperCase()}` : ""),
  }));
}
