import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, supabaseReady } from "./supabase";
import { getLang } from "./i18n";
import { answerFor as match, type Answer, type AnswerRow } from "./wren-match";

/* WHAT SHE ANSWERS HERSELF — matched on the phone, no model.
   ────────────────────────────────────────────────────────────────────────
   A question typed at Wren's desk is looked up before it is sent: first
   against the six bundled guides, then against wren_answers (0023) — rows
   the makers can add without shipping a build. Both carry trigger
   phrases per language; the reader's language and English are tried, so
   a German who types "aura" still gets the aura guide.

   Scoring is deliberately crude (lib/wren-match): a phrase found in the
   question counts, a long phrase counts double, and the best candidate
   over the threshold wins. A miss costs nothing — the words go on to the
   makers as before — so this errs toward answering. */

export type { Answer };

const KEY = "kindredly_wren_answers"; // one set for everyone — unscoped
let mem: AnswerRow[] | null = null;

export async function readAnswersCache(): Promise<AnswerRow[]> {
  if (mem) return mem;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    mem = raw ? (JSON.parse(raw) as AnswerRow[]) : [];
  } catch {
    mem = [];
  }
  return mem;
}

export async function fetchAnswers(): Promise<AnswerRow[] | null> {
  if (!supabaseReady) return null;
  try {
    const { data, error } = await supabase!.from("wren_answers").select("id,triggers,answer,guide").limit(300);
    if (error || !data) return null;
    const rows = data.map((r: any): AnswerRow => ({ id: Number(r.id), triggers: r.triggers || {}, answer: r.answer || {}, guide: typeof r.guide === "string" ? r.guide : null }));
    mem = rows;
    void AsyncStorage.setItem(KEY, JSON.stringify(rows)).catch(() => {});
    return rows;
  } catch {
    return null;
  }
}

/** the best answer for a typed question, in the reader's language, or null */
export const answerFor = (question: string, rows: AnswerRow[]): Answer | null => match(question, rows, getLang());
