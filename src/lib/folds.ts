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

/*   · pick      This or That (web 0044): a question with two options on the
                 row (`choices`); the sender stakes their side at send, the
                 other side answers by picking. Written only through the
                 leave_pick / answer_pick RPCs (fold + body in one go); a body
                 is the chosen option's TEXT, so an older reader shows two
                 readable halves. */
export type FoldKind = "note" | "question" | "pick";

export interface Fold {
  id: string;
  mine: boolean;
  kind: FoldKind;
  prompt: string | null;
  /** pick openers only: the two options, in order; null/absent otherwise (and before 0044).
      Optional so the demo rooms and older kept copies need not spell it out. */
  choices?: [string, string] | null;
  parentId: string | null;
  body: string | null; // null = still sealed for me; pick: the chosen option's text
  date: string;
}

const choicesOf = (v: unknown): [string, string] | null =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === "string" && typeof v[1] === "string" ? [v[0], v[1]] : null;

/** the column is missing (before the owner runs 0044): PostgREST 42703 / "column … does not exist" */
const missingChoices = (e: any): boolean =>
  !!e && (e.code === "42703" || /choices/i.test(String(e.message ?? "")));

/** the kept folds of a thread (the last whole read), or null */
export async function readFoldsCache(threadId: string): Promise<Fold[] | null> {
  try {
    const raw = await scoped.getItem(foldsCacheKey(threadId));
    if (!raw) return null;
    // copies kept before 0044 have no `choices`: they read as null
    return (JSON.parse(raw) as Fold[]).map((f) => ({ ...f, choices: choicesOf((f as any).choices) }));
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
    const read = (cols: string) => supabase!.from("folds").select(cols).eq("thread_id", threadId).order("created_at");
    let { data: rows, error } = await read("id,author,kind,prompt,choices,parent_id,created_at");
    // before 0044 there is no `choices` column: read the old list once, or every room loses its folds
    if (error && missingChoices(error)) ({ data: rows, error } = await read("id,author,kind,prompt,parent_id,created_at"));
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
      choices: choicesOf(r.choices),
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
  // a pick is answered by picking (answerPick), never with free text
  if (parent.kind === "pick") return null;
  return insertFold(threadId, parent.kind, body, null, parent.id);
}

/** send a This or That: the question, its two options, and my side (sealed until they pick).
    "cap" = three of mine already wait in this room (0044's pick_waiting_cap). */
export async function leavePick(
  threadId: string,
  prompt: string,
  choices: [string, string],
  choice: 0 | 1,
): Promise<true | "cap" | null> {
  clearFail();
  if (!supabaseReady || !prompt.trim()) return null;
  try {
    const who = await whoAmI();
    if (!("id" in who)) return who.reason === "network" ? setFail("offline") : who.reason === "no-session" ? setFail("session") : null;
    const { data, error } = await supabase!.rpc("leave_pick", {
      p_thread: threadId,
      p_prompt: prompt,
      p_choices: choices,
      p_choice: choice,
    });
    if (error && /pick_waiting_cap/.test(String(error.message ?? ""))) return "cap";
    if (error || !data) return noteFail(error);
    return true;
  } catch (e) {
    return noteFail(e);
  }
}

/** pick my side of their This or That — the act that opens both.
    "done" = a pick is already there (another device, a double tap): just reload. */
export async function answerPick(threadId: string, parent: Fold, choice: 0 | 1): Promise<true | "done" | null> {
  clearFail();
  if (!supabaseReady || !threadId || parent.kind !== "pick") return null;
  try {
    const who = await whoAmI();
    if (!("id" in who)) return who.reason === "network" ? setFail("offline") : who.reason === "no-session" ? setFail("session") : null;
    const { data, error } = await supabase!.rpc("answer_pick", { p_parent: parent.id, p_choice: choice });
    if (error && (error as any).code === "23505") return "done";
    if (error || !data) return noteFail(error);
    return true;
  } catch (e) {
    return noteFail(e);
  }
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
      .insert({ fold_id: fold.id, body: Array.from(body.trim()).slice(0, FOLD_MAX).join("") });
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
