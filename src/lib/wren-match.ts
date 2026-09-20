import { GUIDES, type GuideId } from "../data/guides";
import type { Lang } from "./i18n";

/* THE MATCH — pure, so it can run under plain node (see tests/). */

export type Answer =
  | { kind: "guide"; guide: GuideId }
  | { kind: "text"; id: number; text: string; guide: GuideId | null };

export type AnswerRow = { id: number; triggers: Partial<Record<string, string[]>>; answer: Partial<Record<string, string>>; guide: string | null };

/* lower-case, one space, no punctuation — the shape both sides are
   compared in. Letters and digits of every script survive; apostrophes
   are folded so "what's" meets "what s" and "whats" alike. */
const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}#]+/gu, " ")
    .trim()} `;

const SPACED: Lang[] = ["en", "es", "pt", "id", "fr", "de", "it"];

/** how strongly the trigger list speaks to this question. A trigger
    written with a leading * is one of the product's own nouns — "aura",
    "kindred" — and is enough on its own; anything else needs company or
    length. Scripts without spaces get there on fewer characters. */
function score(q: string, triggers: string[], lang: Lang): number {
  let s = 0;
  const spaced = SPACED.includes(lang);
  for (const raw of triggers) {
    const strong = raw.startsWith("*");
    const tr = norm(strong ? raw.slice(1) : raw).trim();
    if (!tr) continue;
    /* a spaced language matches on word starts (so "matched" meets
       "matching" through "match"), a script without spaces anywhere */
    const hit = spaced ? q.includes(` ${tr}`) : q.includes(tr);
    if (!hit) continue;
    s += strong || tr.includes(" ") || tr.length >= (spaced ? 7 : 3) ? 2 : 1;
  }
  return s;
}

const THRESHOLD = 2;

/* SOMETHING IS BROKEN is never answered with a guide. A crash report that
   gets a cheerful "how letters travel" is worse than no answer, so these
   words veto the lookup and the line goes straight to people. */
const BROKEN: Partial<Record<Lang, string[]>> = {
  en: ["crash", "crashed", "crashes", "bug", "broken", "doesnt work", "does not work", "not working", "wont", "cant", "error", "freeze", "frozen", "stuck", "glitch", "wrong", "missing", "disappeared", "lost my", "refund", "charged", "subscription", "cancel"],
  es: ["falla", "fallo", "error", "se cierra", "no funciona", "no puedo", "no me deja", "bloquea", "congela", "desapareci", "reembolso", "cobr", "suscripci", "cancelar"],
  pt: ["trava", "travou", "erro", "bug", "não funciona", "nao funciona", "não consigo", "nao consigo", "fecha sozinho", "sumiu", "desapareceu", "reembolso", "cobr", "assinatura", "cancelar"],
  id: ["crash", "error", "rusak", "tidak bisa", "nggak bisa", "gak bisa", "ga bisa", "macet", "hilang", "refund", "ditagih", "langganan", "batal"],
  fr: ["bug", "plante", "planté", "erreur", "marche pas", "fonctionne pas", "peux pas", "bloqué", "figé", "disparu", "rembours", "prélev", "abonnement", "annuler"],
  de: ["absturz", "abgestürzt", "stürzt", "fehler", "bug", "funktioniert nicht", "geht nicht", "kann nicht", "hängt", "eingefroren", "verschwunden", "erstattung", "abgebucht", "abo", "kündigen"],
  it: ["crash", "si chiude", "si blocca", "errore", "bug", "non funziona", "non riesco", "bloccato", "sparito", "scomparso", "rimborso", "addebit", "abbonamento", "annullare"],
  ja: ["落ち", "クラッシュ", "バグ", "エラー", "動かな", "できない", "固まる", "フリーズ", "消えた", "返金", "課金", "サブスク", "解約"],
  ko: ["튕겨", "튕김", "크래시", "버그", "오류", "안 돼", "안돼", "안 됨", "안됨", "멈춰", "멈춤", "사라졌", "환불", "결제", "구독", "취소"],
};
/** true when the line reads as something broken — the desk tags it a bug
    and sends the phone's evidence along without being asked */
export function looksBroken(question: string, lang: Lang): boolean {
  const langs: Lang[] = lang === "en" ? ["en"] : [lang, "en"];
  return broken(norm(question), langs);
}

function broken(q: string, langs: Lang[]): boolean {
  for (const l of langs) for (const w of BROKEN[l] || []) if (q.includes(SPACED.includes(l) ? ` ${norm(w).trim()}` : norm(w).trim())) return true;
  return false;
}

/** the best answer for a typed question, or null when she has none */
export function answerFor(question: string, rows: AnswerRow[], lang: Lang): Answer | null {
  const q = norm(question);
  if (q.trim().length < 2) return null;
  const langs: Lang[] = lang === "en" ? ["en"] : [lang, "en"];
  if (broken(q, langs)) return null;
  let best: { s: number; a: Answer } | null = null;
  const consider = (s: number, a: Answer) => {
    if (s >= THRESHOLD && (!best || s > best.s)) best = { s, a };
  };
  for (const g of GUIDES) {
    let s = 0;
    for (const l of langs) s += score(q, g.triggers[l] || [], l);
    consider(s, { kind: "guide", guide: g.id });
  }
  for (const r of rows) {
    let s = 0;
    for (const l of langs) s += score(q, r.triggers[l] || [], l);
    const text = r.answer[lang] || r.answer.en;
    if (!text) continue;
    consider(s, { kind: "text", id: r.id, text, guide: GUIDES.some((g) => g.id === r.guide) ? (r.guide as GuideId) : null });
  }
  return best ? (best as { s: number; a: Answer }).a : null;
}
