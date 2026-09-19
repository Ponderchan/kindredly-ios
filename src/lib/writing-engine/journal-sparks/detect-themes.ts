import type { JournalTheme, JournalThemeAnalysis, ReaderLanguage } from "../types";
import { resolveLanguage, type LanguageHints } from "../resolve-language";
import { resources, tokenize } from "../dictionaries";

/* JOURNAL THEME DETECTION — Step 8.
   ────────────────────────────────────────────────────────────────────────
   Themes are LANGUAGE-INDEPENDENT ids ("home", "missing_someone"). Each
   language's own lexicon (dictionaries/*.themes) votes for them, so
   "casa"/"rumah"/"home" all resolve to `home` and localization decides which
   spark text shows. Deterministic and synchronous; a semantic/LLM pass could
   later catch indirect themes ("I still know which floorboard squeaked" →
   home/memory) without the literal word, but that is off this path.

   Returns candidate themes sorted by evidence. The caller picks a spark for
   the strongest one it has copy for. */

export function detectThemes(text: string, hints?: LanguageHints): JournalThemeAnalysis {
  const lang: ReaderLanguage = resolveLanguage(text, hints);
  const res = resources(lang);
  const toks = tokenize(text);
  const counts = new Map<string, number>();
  for (const tk of toks) counts.set(tk, (counts.get(tk) ?? 0) + 1);

  const themes: { theme: JournalTheme; confidence: number; evidence: string[] }[] = [];
  for (const { theme, words } of res.themes) {
    let hits = 0;
    const evidence: string[] = [];
    for (const w of words) {
      // single-token words via the count map (fast); multi-word via substring.
      // A prefix / substring language (ko / ja) meets its words the way its
      // dictionary says, never by whole token.
      if (res.match && res.match !== "token") {
        const c = res.match === "prefix" ? toks.filter((tk) => tk === w || (w.length >= 2 && tk.startsWith(w))).length : (text.toLowerCase().split(w).length - 1);
        if (c > 0) {
          hits += c;
          evidence.push(w);
        }
      } else if (w.includes(" ")) {
        if (text.toLowerCase().includes(w)) {
          hits += 1;
          evidence.push(w);
        }
      } else {
        const c = counts.get(w) ?? 0;
        if (c > 0) {
          hits += c;
          evidence.push(w);
        }
      }
    }
    if (hits > 0) {
      // confidence saturates with evidence; two mentions already reads as "about this"
      themes.push({ theme, confidence: Math.min(1, 0.4 + 0.3 * hits), evidence });
    }
  }
  themes.sort((a, b) => b.confidence - a.confidence || b.evidence.length - a.evidence.length);
  return { language: lang, themes };
}
