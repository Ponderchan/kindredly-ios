import { supabase, supabaseReady } from "./supabase";
import { scoped } from "./scoped-store";
import { clearFail, foldsCacheKey, noteFail, setFail, whoAmI } from "./db";
import { FOLD_MAX } from "./thread-detail-core";

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
   arrives.

   KEPT LIKE THE ROOM (10a step 5). Folds were never cached, so a room
   opened offline lost every fold, opened pairs included, even once its
   letters stayed (critic). A whole read is now kept per thread
   (kindredly_thread_folds:<id>, account-scoped) and handed back when the
   network can't answer. A read whose bodies query failed is not whole —
   every body would read as sealed — so it is neither returned nor kept. */

/** the longest fold body, in UTF-16 code units of the trimmed text (see thread-detail-core) */
export { FOLD_MAX, foldOver } from "./thread-detail-core";

export interface Fold {
  id: string;
  mine: boolean;
  kind: "note" | "question";
  prompt: string | null;
  parentId: string | null;
  body: string | null; // null = still sealed for me
  date: string;
}

/** the kept folds of a thread (the last whole read), or null */
export async function readFoldsCache(threadId: string): Promise<Fold[] | null> {
  try {
    const raw = await scoped.getItem(foldsCacheKey(threadId));
    return raw ? (JSON.parse(raw) as Fold[]) : null;
  } catch {
    return null;
  }
}

/**
 * A whole, fresh read of a thread's folds — written to the kept copy — or
 * null when it couldn't be read (no keys, no session, offline, an error in
 * either query). Never falls back to the cache: useThreadDetail uses this.
 */
export async function fetchFoldsFresh(threadId: string): Promise<Fold[] | null> {
  if (!supabaseReady || !threadId) return null;
  try {
    // the session on the phone, not getUser()'s round trip to the auth server
    const who = await whoAmI();
    if (!("id" in who)) return null;
    const me = who.id;
    const { data: rows, error } = await supabase!
      .from("folds")
      .select("id,author,kind,prompt,parent_id,created_at")
      .eq("thread_id", threadId)
      .order("created_at");
    if (error || !rows) return null;
    const ids = rows.map((r: any) => r.id);
    const bodies = new Map<string, string>();
    if (ids.length) {
      // RLS returns only the bodies I'm allowed to read — own or opened
      const { data: bs, error: bErr } = await supabase!.from("fold_bodies").select("fold_id,body").in("fold_id", ids);
      if (bErr) return null;
      for (const b of bs || []) bodies.set(b.fold_id as string, b.body as string);
    }
    const folds: Fold[] = rows.map((r: any) => ({
      id: r.id,
      mine: r.author === me,
      kind: r.kind,
      prompt: r.prompt ?? null,
      parentId: r.parent_id ?? null,
      body: bodies.get(r.id) ?? null,
      date: r.created_at,
    }));
    void scoped.setItem(foldsCacheKey(threadId), JSON.stringify(folds)).catch(() => {});
    return folds;
  } catch {
    return null;
  }
}

/** the thread's folds: a fresh read, or — when the network can't answer —
    the kept copy; null when neither exists. (A read never touches lastWriteFail.) */
export async function fetchFolds(threadId: string): Promise<Fold[] | null> {
  return (await fetchFoldsFresh(threadId)) ?? (await readFoldsCache(threadId));
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
  clearFail();
  if (!supabaseReady || !body.trim()) return null;
  try {
    const who = await whoAmI();
    if (!("id" in who)) return who.reason === "network" ? setFail("offline") : who.reason === "no-session" ? setFail("session") : null;
    const me = who.id;
    const { data: fold, error } = await supabase!
      .from("folds")
      .insert({ thread_id: threadId, author: me, kind, prompt, parent_id: parentId })
      .select("id")
      .single();
    if (error || !fold?.id) return noteFail(error);
    /* the screen refuses a body over FOLD_MAX before it gets here (it shows
       ui.overLimit); this cut is only the last guard, at the same measure */
    const { error: bErr } = await supabase!
      .from("fold_bodies")
      .insert({ fold_id: fold.id, body: body.trim().slice(0, FOLD_MAX) });
    if (bErr) {
      /* the reason first — this used to `return null` before noteFail ever
         ran, so alertFail read whatever the previous write had said */
      noteFail(bErr);
      // a fold without a body is a lie on the table — take it back
      await supabase!.from("folds").delete().eq("id", fold.id).then(() => {}, () => {});
      return null;
    }
    return true;
  } catch (e) {
    return noteFail(e);
  }
}
