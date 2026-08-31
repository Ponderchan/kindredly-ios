import { supabase, supabaseReady } from "./supabase";

/* THE FOLD — sealed until reciprocated.
   ────────────────────────────────────────────────────────────────────────
   A room dies of one fear: saying the true thing first and getting "haha
   nice" back. So a fold's body is invisible — server-enforced, not styled —
   until the other side has folded theirs. Disclosure is always mutual and
   always simultaneous. Two kinds share the mechanic:

   · note      you leave a folded line; they fold one; both open together.
   · question  you ask AND seal your own answer with it — no free
               interrogations; every question is a stake. They see the
               prompt, answer it, and both answers open side by side.

   The metadata (a fold exists, its kind, a question's prompt) is readable
   by both and rides realtime; bodies live in fold_bodies behind an RLS
   policy that only opens with the pair (migration 0015). This module never
   needs to hide anything client-side — an unopened body simply never
   arrives. */

export interface Fold {
  id: string;
  mine: boolean;
  kind: "note" | "question";
  prompt: string | null;
  parentId: string | null;
  body: string | null; // null = still sealed for me
  date: string;
}

export async function fetchFolds(threadId: string): Promise<Fold[] | null> {
  if (!supabaseReady) return null;
  try {
    const { data: u } = await supabase!.auth.getUser();
    const me = u.user?.id;
    if (!me) return null;
    const { data: rows, error } = await supabase!
      .from("folds")
      .select("id,author,kind,prompt,parent_id,created_at")
      .eq("thread_id", threadId)
      .order("created_at");
    if (error || !rows) return error ? null : [];
    const ids = rows.map((r: any) => r.id);
    const bodies = new Map<string, string>();
    if (ids.length) {
      // RLS returns only the bodies I'm allowed to read — own or opened
      const { data: bs } = await supabase!.from("fold_bodies").select("fold_id,body").in("fold_id", ids);
      for (const b of bs || []) bodies.set(b.fold_id as string, b.body as string);
    }
    return rows.map((r: any) => ({
      id: r.id,
      mine: r.author === me,
      kind: r.kind,
      prompt: r.prompt ?? null,
      parentId: r.parent_id ?? null,
      body: bodies.get(r.id) ?? null,
      date: r.created_at,
    }));
  } catch {
    return null;
  }
}

/** leave a folded note, or open a staked question (prompt + your sealed answer). */
export async function leaveFold(
  threadId: string,
  kind: "note" | "question",
  body: string,
  prompt?: string,
): Promise<true | null> {
  return insertFold(threadId, kind, body, prompt ?? null, null);
}

/** fold yours onto theirs — the act that opens both. */
export async function answerFold(threadId: string, parent: Fold, body: string): Promise<true | null> {
  return insertFold(threadId, parent.kind, body, null, parent.id);
}

async function insertFold(
  threadId: string,
  kind: "note" | "question",
  body: string,
  prompt: string | null,
  parentId: string | null,
): Promise<true | null> {
  if (!supabaseReady || !body.trim()) return null;
  try {
    const { data: u } = await supabase!.auth.getUser();
    const me = u.user?.id;
    if (!me) return null;
    const { data: fold, error } = await supabase!
      .from("folds")
      .insert({ thread_id: threadId, author: me, kind, prompt, parent_id: parentId })
      .select("id")
      .single();
    if (error || !fold?.id) return null;
    const { error: bErr } = await supabase!
      .from("fold_bodies")
      .insert({ fold_id: fold.id, body: body.trim().slice(0, 600) });
    if (bErr) {
      // a fold without a body is a lie on the table — take it back
      await supabase!.from("folds").delete().eq("id", fold.id);
      return null;
    }
    return true;
  } catch {
    return null;
  }
}
