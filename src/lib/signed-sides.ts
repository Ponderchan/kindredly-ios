import type { PenSignature, ThreadDetail } from "./db";
import type { FrostSpec } from "./frost";
import { penOrNull, type PenSig } from "./pen-signature";

/* WHAT EACH SIDE SIGNED, FOR THE CEREMONY (identity Phase 2).
   ────────────────────────────────────────────────────────────────────────
   The introduction ritual, with the identity switch on, wipes two frosted
   windows clear and draws in two signatures. This file decides what goes
   on each side (.claude/identity-build/PHASE2.md §4), so the pen-pal
   chat's ceremony (LettersIntroduction), the room's (RoomIntroduction) and
   the dev preview build it the same way, and plain node can check it:

     node src/lib/signed-sides.test.ts

   · THEIRS is what the published row says they sent: the name, the face
     (null = the glyph) and the drawing (null = typed). A demo thread never
     reaches the server: one with no drawing gets penDemo's scribble.
   · MINE is what they received, not today's profile: the row's
     mySignedName / mySignedFace / mySig. Before the reload brings it (or
     on a demo) it is what the sheet just signed with (signedNow), then the
     profile's pen name. One refinement over §4: once the row is published
     (revealed, not a demo) its drawing is the truth, so a drawing the
     server never got — the pre-0035 direct write drops it — is never
     drawn as if it had been sent; that side is typed.
   · The courier names are the ones each of you wore as a stranger: theirs
     from the reader's book (lib/who, name() directly after the reveal),
     mine as a stranger's courier in my language gives it (salt 0, the same
     as onboarding's preview). The frosts are the windows each wore, in
     this theme. The caller passes all four in, so this stays pure.

   Switch off, or no thread: null, and the ritual is today's exactly. */

/** One side of the signed pair, as the ritual draws it. */
export type SignedSide = {
  /** the courier name they wore as a stranger ("Sunday Kite"), as it is written; the ritual capitalises */
  courier: string;
  /** the pen name signed ("" only if none is known: the ritual says in.meFallback for mine) */
  name: string;
  /** the drawing (PEN v1), or null: the typed name in the italic */
  sig: PenSig | null;
  /** the library face sent, or null: the glyph */
  face: string | null;
  /** the frosted window they wore (FROST v1 in this theme); null = the veil */
  frost: FrostSpec | null;
  /** the uid the face and the glyph are seeded by */
  seed: string;
};

/** Both sides: theirs on the right, mine on the left. */
export type SignedPair = { theirs: SignedSide; mine: SignedSide };

export type SignedSidesInput = {
  detail: Pick<ThreadDetail, "other" | "otherName" | "otherFace" | "otherSig" | "mySig" | "mySignedName" | "mySignedFace" | "revealed"> | null | undefined;
  /** the identity switch, as the screen read it */
  identity: boolean;
  /** a demo thread (demo-*, dev only): nothing came from a server */
  demo: boolean;
  /** my user id (the seed of my window and my glyph) */
  myUid: string | null | undefined;
  /** the profile's pen name (auth.handle), "" when there is none */
  handle: string;
  /** what the signing sheet just sent from this phone, if it did */
  signedNow?: PenSignature | null;
  /** their courier name: the screen's book (book.name) */
  courierOf: (uid: string) => string;
  /** mine: strangerName(myUid, { lang }) */
  myCourier: string;
  /** a window's spec (frostSpec(uid, dark)); null for no one */
  frostOf: (uid: string) => FrostSpec | null;
  /** their pen name when the row has none (t("cm.kindred")) */
  fallbackName: string;
  /** a demo's drawing for a side that has none (penDemo) */
  demoSig: (seed: string) => PenSig;
};

/** What each side signed (see the header), or null with the switch off or no thread. */
export function signedSides(i: SignedSidesInput): SignedPair | null {
  const d = i.detail;
  if (!i.identity || !d) return null;
  const other = d.other || "";
  const published = !i.demo && d.revealed;
  const now = i.signedNow ?? null;

  const theirSig = penOrNull(d.otherSig) ?? (i.demo && other ? i.demoSig(other) : null);
  const mySig = published ? penOrNull(d.mySig) : (penOrNull(d.mySig) ?? penOrNull(now?.sig));
  const myUid = i.myUid || "";

  return {
    theirs: {
      courier: other ? i.courierOf(other) : "",
      name: (d.otherName || "").trim() || i.fallbackName,
      sig: theirSig,
      face: d.otherFace ?? null,
      frost: other ? i.frostOf(other) : null,
      seed: other || "anon",
    },
    mine: {
      courier: i.myCourier,
      name: (d.mySignedName || now?.name || i.handle || "").trim(),
      sig: mySig,
      face: d.mySignedFace ?? now?.face ?? null,
      frost: myUid ? i.frostOf(myUid) : null,
      seed: myUid || "me",
    },
  };
}
