import { getLang, needsTranslating, type Lang } from "./i18n";

/* WHICH LANGUAGE IS THIS LINE IN — roughly (owner, 2026-10-10: long-press →
   Translate). A room's lines carry no language tag, and offering to translate
   English into English is noise. Japanese and Korean are told by their script
   (i18n.needsTranslating); the seven Latin-script languages by their most
   common small words. A guess is only made when one language clearly leads;
   otherwise the menu offers Translate, because a needless offer costs a tap
   and a missing one costs a conversation. */

const WORDS: Partial<Record<Lang, string[]>> = {
  en: ["the", "and", "is", "it", "to", "of", "you", "that", "i", "was", "for", "my", "but", "not", "what", "so", "we", "with", "this", "just"],
  es: ["el", "la", "que", "y", "es", "no", "lo", "un", "una", "por", "con", "mi", "pero", "para", "los", "las", "me", "yo", "muy", "está"],
  pt: ["que", "não", "e", "o", "é", "um", "uma", "eu", "você", "com", "mas", "para", "os", "meu", "isso", "muito", "está", "também", "minha", "tô"],
  id: ["yang", "dan", "aku", "kamu", "ini", "itu", "tidak", "di", "ke", "ada", "dengan", "juga", "saya", "apa", "untuk", "sudah", "aja", "banget", "gak", "nggak"],
  fr: ["le", "les", "et", "est", "je", "tu", "pas", "une", "des", "pour", "mais", "c'est", "avec", "mon", "ma", "suis", "j'ai", "très", "ça", "aussi"],
  de: ["der", "die", "das", "und", "ist", "ich", "du", "nicht", "ein", "eine", "zu", "mit", "aber", "es", "auch", "wie", "mein", "habe", "bin", "noch"],
  it: ["il", "che", "di", "è", "non", "per", "con", "ma", "mi", "io", "sono", "ho", "anche", "gli", "della", "molto", "questo", "perché", "ti", "cosa"],
};

export function guessLatin(text: string): Lang | null {
  const words = text.toLowerCase().match(/[\p{L}']+/gu) || [];
  if (words.length < 3) return null;
  const score = new Map<Lang, number>();
  for (const [lang, list] of Object.entries(WORDS) as [Lang, string[]][]) {
    const set = new Set(list);
    score.set(lang, words.filter((w) => set.has(w)).length);
  }
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (!best || best[1] < 2 || best[1] < second[1] * 1.5) return null;
  return best[0];
}

/** offer Translate on this line? not when it is plainly already in the reader's language */
export function offerTranslate(text: string): boolean {
  if (!needsTranslating(text, "xx")) return false; // a script the reader reads (ja to ja, ko to ko)
  return guessLatin(text) !== getLang();
}
