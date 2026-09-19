import type { CourierReadResult, ReaderLanguage } from "../types";
import { resolveLanguage, type LanguageHints } from "../resolve-language";
import { resources, tokenize, countAny } from "../dictionaries";

/* COURIER-READ — multilingual mood, Step 7.
   ────────────────────────────────────────────────────────────────────────
   Wren's live read of a piece as it's written. This is called PER KEYSTROKE
   in the composer, so it must stay synchronous and cheap — deterministic
   signals only (Layer A). A semantic/LLM pass (Layer B) can enrich this
   later, off the live path; it is deliberately not here.

   The product taxonomy is preserved exactly (WrenMood: worry/delight/curious/
   think/happy/listen). What changed: the affect/laughter/question evidence is
   now drawn from the RESOLVED language's resources instead of an English-only
   regex, so a Spanish, Portuguese or Indonesian writer triggers the same
   moods an English one always did. English behaviour is continuous because
   the English resources were seeded from the old regex.

   A confidence gate keeps one weak keyword from forcing a strong mood. */

// language-neutral — emoji read the same in every language
const HEAVY_EMOJI = ["😢", "😭", "😔", "😞", "😟", "😥", "😩", "😫", "😰", "😨", "💔", "🥺", "😪", "😓", "🥀", "😖", "😣", "🙁", "☹️", "😿", "😮‍💨"];
const LIGHT_EMOJI = ["😊", "😄", "😁", "😆", "🥰", "😍", "🤗", "🎉", "✨", "💛", "💜", "❤️", "❤", "🧡", "💚", "💙", "🙌", "👍", "😌", "🥳", "😂", "🤣", "☺️", "🌈", "🌸", "💫", "⭐", "🌟"];
const CURIOUS_EMOJI = ["🤔", "❓", "❔", "👀", "🧐"];
const has = (t: string, arr: string[]) => arr.some((e) => t.includes(e));

// Chinese affect kept as a language-independent bonus: the pool carries every
// language, and letters may be written in zh even though the UI isn't. Losing
// the shipped zh mood read would be a regression, so it rides along.
const ZH_HEAVY = /(累|疲惫|难过|伤心|孤独|孤单|想哭|哭|崩溃|焦虑|害怕|痛苦|难受|恨|生气|压力|撑不住|无力|麻木|失眠|失去|分手|抑郁|绝望|委屈|想念|不想活|好难)/;
const ZH_LIGHT = /(开心|高兴|快乐|喜欢|爱你|感激|感恩|太好了|骄傲|激动|兴奋|放松|治愈|终于|希望|幸福|满足|超棒|美好|感谢)/;
const ZH_LAUGH = /(哈哈+|嘻嘻+|嘿嘿+|笑死|233+)/;
const EXCITED_PUNC = /[!！]{2,}/;
const ELLIPSIS = /(\.{3,}|。{2,}|…+|⋯)/;

/** the full read — mood + confidence + which signals fired + language. */
export function courierRead(text: string, enough: boolean, hints?: LanguageHints): CourierReadResult {
  const t = (text || "").trim();
  const lang: ReaderLanguage = resolveLanguage(t, hints);
  const res = resources(lang);
  const toks = tokenize(t);
  const signals: string[] = [];

  if (!t) return { mood: "listen", confidence: 1, signals: ["empty"], language: lang };

  // ── heavy / negative — checked first; when unsure, be tender ──
  const negHits = countAny(toks, res.affectNeg, res.match) + (ZH_HEAVY.test(t) ? 1 : 0);
  const heavyEmoji = has(t, HEAVY_EMOJI);
  if (negHits >= 1 || heavyEmoji) {
    if (negHits >= 1) signals.push(`affect-neg:${negHits}`);
    if (heavyEmoji) signals.push("heavy-emoji");
    // one bare word is a weak signal; two, or an emoji, is confident
    const confidence = Math.min(1, 0.5 + 0.2 * negHits + (heavyEmoji ? 0.3 : 0));
    return { mood: "worry", confidence, signals, language: lang };
  }

  // ── light / bright ──
  const posHits = countAny(toks, res.affectPos, res.match) + (ZH_LIGHT.test(t) ? 1 : 0);
  const lightEmoji = has(t, LIGHT_EMOJI);
  const laugh = res.laughter.test(t) || ZH_LAUGH.test(t);
  const excited = EXCITED_PUNC.test(t);
  if (posHits >= 1 || lightEmoji || laugh || excited) {
    if (posHits >= 1) signals.push(`affect-pos:${posHits}`);
    if (lightEmoji) signals.push("light-emoji");
    if (laugh) signals.push("laughter");
    if (excited) signals.push("excited-punct");
    const confidence = Math.min(1, 0.45 + 0.2 * posHits + (lightEmoji ? 0.25 : 0) + (laugh ? 0.2 : 0) + (excited ? 0.15 : 0));
    return { mood: "delight", confidence, signals, language: lang };
  }

  // ── curious ──
  if (has(t, CURIOUS_EMOJI) || res.question.test(t)) {
    signals.push("question");
    return { mood: "curious", confidence: 0.6, signals, language: lang };
  }

  // ── trailing off ──
  if (ELLIPSIS.test(t)) {
    signals.push("ellipsis");
    return { mood: "think", confidence: 0.55, signals, language: lang };
  }

  // ── neutral: she's present, unhurried ──
  return { mood: enough ? "happy" : "listen", confidence: 0.4, signals: ["neutral"], language: lang };
}
