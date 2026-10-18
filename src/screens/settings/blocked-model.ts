import type { StrangerWho, WhoBook } from "../../lib/stranger-who";

/* THE BLOCKED LIST'S ROWS, AS DATA (identity Phase 1).
   ────────────────────────────────────────────────────────────────────────
   app/(tabs)/me/blocked draws one row per person the reader shut out: a
   face, who they were, when, and UNBLOCK. Who they were comes from the
   screen's book (lib/stranger-who, lib/who useWhoBook), the same one every
   other screen asks, so a writer here wears the face and the name they
   wore on the reader's desk (plan §1, mismatch 11):

     switch off   exactly as before: "NO. 4481" (the literal NO., as the
                  row always set it) beside their full FACE v1 mosaic —
                  face AND number, always the pair, because faces alone
                  collide (~25k of them) and a twin face here would read as
                  "they're back";
     switch on    the courier name the reader's courier gave them, in
                  capitals for the mono line, beside their frosted window,
                  with the ♀/♂ mark and the star sign the identity client
                  answers (marks_for answers nothing across a block, so in
                  practice none). A blocked pair's thread has left the
                  reader's list, so the name is the plain one (salt 0): in
                  the rare exact-repeat case that is not quite the name the
                  list gave them, and that is the price of the list
                  forgetting them.

   Pure: words and the number come in through the caller, so
   `node src/screens/settings/blocked-model.test.ts` locks it. */

/** A block as lib/db fetchBlocks returns it. */
export type BlockInput = { blocked: string; created_at: string };

/** One row as the screen draws it. */
export type BlockedRowVM = {
  /** the blocked uid (the row's key; UNBLOCK's target) */
  id: string;
  /** who they were: name (mono, capitals), mark, sign, face, spoken (lib/stranger-who StrangerWho) */
  who: StrangerWho;
  /** "BLOCKED OCT 14, 2026" */
  since: string;
};

export type BlockedFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** who strangers are (the screen's book) */
  who: WhoBook;
  /** format.postNo: the four-digit number the row showed before names */
  postNo: (uid: string) => number;
  /** format.dLong: the day of the block in the reader's language */
  day: (iso: string) => string;
  /** upper case in the reader's locale */
  upper: (s: string) => string;
};

/** One blocked person's row. */
export function blockedRow(b: BlockInput, f: BlockedFormat): BlockedRowVM {
  const who = f.who.who(b.blocked, { upper: true, develop: 1 });
  // switch off the row kept its own literal "NO. 4481" (never the translated N.º), so it stays that way
  const named = f.who.identity ? who : { ...who, name: `NO. ${f.postNo(b.blocked)}`, spoken: `NO. ${f.postNo(b.blocked)}` };
  return { id: b.blocked, who: named, since: f.t("bl.blockedOn", { day: f.upper(f.day(b.created_at)) }) };
}

/** The rows, in the order the server sent them. */
export const blockedRows = (rows: readonly BlockInput[], f: BlockedFormat): BlockedRowVM[] => rows.map((b) => blockedRow(b, f));
