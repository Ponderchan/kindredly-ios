import { t, getLang } from "./i18n";
import { theyify } from "./correspondent";
import type { DimScore, DimKey } from "./hatch-engine";

/* THE AURA COPY LAYER.
   ────────────────────────────────────────────────────────────────────────
   The writing engine (hatch-engine, writing-engine/*) stays free of React and
   i18n so it can be unit-tested under plain node. It therefore emits STABLE
   IDS, never display strings. This module — on the RN side — turns those ids
   into the reader's language. "Localized strings are selected only at the
   presentation/copy layer," per the engine spec.

   Third-person forms (a correspondent's archetype/read, "they write…") use
   theyify, which is an English-only grammar swap. For es/pt/id it returns the
   base second-person line: person transformation across those languages is a
   separate concern, so this is a documented interim, not the final word. */

const third = (s: string) => (getLang() === "en" ? theyify(s) : s);

/* ── archetypes ── */
export function archName(id?: string | null): string {
  return id ? t(`arch.${id}.name`) : "";
}
export function archDesc(id?: string | null): string {
  return id ? t(`arch.${id}.desc`) : "";
}
export function archNameThird(id?: string | null): string {
  return third(archName(id));
}
export function archDescThird(id?: string | null): string {
  return third(archDesc(id));
}

/* ── the nine dimensions ──
   The engine tags each DimScore with lineId/chipId (stable, per branch) and a
   key (for label/sealed). English text lives in the catalog as the source, so
   English is unchanged; es/pt/id read native copy. Falls back to the engine's
   English literal if a key is somehow missing. */
export function dimLabel(key: DimKey): string {
  return t(`dim.label.${key}`);
}
export function dimSealed(key: DimKey): string {
  return t(`dim.sealed.${key}`);
}
export function dimLine(d: DimScore): string {
  return d.lineId ? t(d.lineId) : d.line;
}
export function dimChip(d: DimScore): string {
  return d.chipId ? t(d.chipId) : d.chip;
}
export function dimLineThird(d: DimScore): string {
  return third(dimLine(d));
}
export function dimSealedThird(key: DimKey): string {
  return third(dimSealed(key));
}
