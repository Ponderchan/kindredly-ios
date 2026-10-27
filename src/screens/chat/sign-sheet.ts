import { PEN_H, PEN_MAX_STROKES, PEN_W, penFaceOrNull, penFromPad, penInkBox, penStrokePath, type PadPoint, type PadSize, type PenSig } from "../../lib/pen-signature";
import { checkField, facePool, type FaceDefLite, type PronounId, type TFn } from "../edit-profile/edit-profile-model";

/* THE SIGNING SHEET, AS RULES (identity Phase 2; .claude/identity-build/PHASE2.md §6).
   ────────────────────────────────────────────────────────────────────────
   Everything SignSheet decides and nothing it draws, so it runs under plain
   node (sign-sheet.test.ts): which faces are offered and which is chosen
   first, whether the typed pen name may go (Edit profile's checkField
   rules, never the courier name strangers already call you, nothing the
   safety screen calls off the page), when a drawing counts as a signature
   (a stray tap is not one), what is sent, whether the profile is saved
   first, and what the sheet does after the answer.

   The order of a send (§6.3), I/O in useLettersModel:
     1. the pen name to the profile when it changed (nameToSave) — a failure
        stops here, the sheet stays as drawn;
     2. the drawing, or null for typed (sigToSend);
     3. sign_thread through signThreadV2 (a demo thread answers itself:
        demoSignResult);
     4. null → said plainly; the sheet keeps the name, the face and the
        drawing, unless it was a refusal (the thread is gone): it closes;
     5. signed → the ceremony when it was the second signature, else the
        door reads YOU SIGNED · WAITING (afterSign).

   Words come in through `t`, as every model here takes them. */

/* ── the faces ─────────────────────────────────────────────────────────── */

/**
 * The faces the sheet offers, in order: the profile's own library face
 * first (only when sign_thread would take it: penFaceOrNull), then the
 * pool for the reader's pronoun (Edit profile's facePool: she → f, he → m,
 * they → all; never a legacy portrait), without the duplicate, then null:
 * No face (the glyph). A photo is never among them: it never leaves the
 * phone.
 */
export function faceChoices<F extends FaceDefLite>(profileFace: unknown, pronoun: PronounId, faces: readonly F[]): (string | null)[] {
  const own = penFaceOrNull(profileFace);
  const pool = facePool(pronoun, faces)
    .map((f) => f.id)
    .filter((id) => id !== own && penFaceOrNull(id) !== null);
  return [...(own ? [own] : []), ...pool, null];
}

/** The face chosen when the sheet opens: the profile's library face, else No face. */
export const defaultFace = (profileFace: unknown): string | null => penFaceOrNull(profileFace);

/* ── the pen name ──────────────────────────────────────────────────────── */

export type NameProblem = "empty" | "courier" | "offpage";
export type NameCheck = { value: string; problem: NameProblem | null };

/**
 * The typed pen name as it would go: trimmed and held to Edit profile's 20
 * (checkField "pen"), then refused when empty (the button just stays off),
 * when it is the reader's own courier name ignoring case (plan §3.3: the
 * reveal must change something), or when the safety screen finds a link, a
 * handle or a long number in it (lib/wren screenNow, passed in).
 */
export function checkPenName(raw: string, myCourier: string, screen: (text: string) => { ok: boolean }): NameCheck {
  const { value } = checkField("pen", raw ?? "", "", () => false);
  if (!value) return { value, problem: "empty" };
  const courier = (myCourier || "").trim();
  if (courier && value.toLocaleLowerCase() === courier.toLocaleLowerCase()) return { value, problem: "courier" };
  if (!screen(value).ok) return { value, problem: "offpage" };
  return { value, problem: null };
}

/** The red line under the field, or null (empty has none: the button simply stays off). */
export const nameErrorKey = (p: NameProblem | null): string | null =>
  p === "courier" ? "id2.sheet.nameCourier" : p === "offpage" ? "id2.sheet.nameOffpage" : null;

/** The pen name to save to the profile before signing, or null when it hasn't changed. */
export function nameToSave(name: string, handle: string): string | null {
  const v = (name || "").trim();
  return v && v !== (handle || "").trim() ? v : null;
}

/* ── the drawing ───────────────────────────────────────────────────────── */

/** the least ink (its box's width + height, in box units) that counts as a signature */
export const DRAWING_MIN_INK = 40;

/** The pad stops taking strokes at PEN v1's cap. */
export const padTakesStroke = (strokes: number): boolean => strokes < PEN_MAX_STROKES;

/**
 * The pad's strokes as they would go (penFromPad: normalised into the box,
 * simplified to the caps), or null when they don't count: no ink, or so
 * little (w + h under DRAWING_MIN_INK) that it was a stray tap.
 */
export function drawingOf(strokes: readonly (readonly PadPoint[])[], pad: PadSize): PenSig | null {
  if (!strokes.length) return null;
  const sig = penFromPad(strokes, pad);
  const box = sig ? penInkBox(sig) : null;
  return sig && box && box.w + box.h >= DRAWING_MIN_INK ? sig : null;
}

/** What goes to sign_thread: null when typed ("Type it instead"), else the drawing. */
export const sigToSend = (typed: boolean, drawing: PenSig | null): PenSig | null => (typed ? null : drawing);

/* ── the pad, as both renderers size and ink it ────────────────────────── */

/** The pad for a window this wide: the sheet's content width (16 a side), 200 to 600, and the
    box's own aspect (components/SignaturePad padHeightOf), in whole points. */
export function padSizeOf(windowWidth: number): PadSize {
  const width = Math.min(600, Math.max(200, windowWidth - 32));
  return { width, height: Math.round(width * (PEN_H / PEN_W)) };
}

/** The pad's finished strokes as one SVG path in pad points, smoothed as the published drawing
    will be (penStrokePath, as components/SignaturePad inks them): what the SwiftUI pad draws. */
export function padInkPath(strokes: readonly (readonly PadPoint[])[]): string {
  return strokes
    .map((s) => {
      const flat: number[] = [];
      for (const p of s) flat.push(p.x, p.y);
      return penStrokePath(flat);
    })
    .join("");
}

/** A stroke the SwiftUI pad reported (x0, y0, x1, y1 …) as pad points; an odd tail or a value
    that isn't a finite number is dropped. */
export function padPointsOf(flat: readonly unknown[]): PadPoint[] {
  const out: PadPoint[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const x = flat[i];
    const y = flat[i + 1];
    if (typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y });
  }
  return out;
}

/** SIGN AND SEND is on: a name that may go, and a signature (typed, or a drawing that counts), and nothing going. */
export function canSign(i: { name: NameCheck; typed: boolean; drawing: PenSig | null; busy: boolean }): boolean {
  return !i.busy && i.name.problem === null && (i.typed || i.drawing !== null);
}

/* ── the words ─────────────────────────────────────────────────────────── */

export type SheetFacts = {
  /** their courier name, as the who book gives it ("Sunday Kite") */
  courier: string;
  theirSigned: boolean;
  /** the pen name the profile holds ("" at the first trade) */
  handle: string;
  /** the profile wears a photo (it stays on the phone) */
  photo: boolean;
  isGuest: boolean;
};

export type SheetCopy = {
  lead: string;
  faceNote: string;
  /** the note under the field (first trade or later) */
  nameNote: string;
  /** the field starts empty with a placeholder at the first trade */
  firstTrade: boolean;
  /** the guest line and its link, or null for an account */
  guest: { text: string; link: string } | null;
};

export function sheetCopy(f: SheetFacts, t: TFn): SheetCopy {
  const firstTrade = !(f.handle || "").trim();
  return {
    lead: t(f.theirSigned ? "id2.sheet.leadTheirs" : "id2.sheet.lead", { name: f.courier }),
    faceNote: t(f.photo ? "id2.sheet.facePhoto" : "id2.sheet.faceNote"),
    nameNote: t(firstTrade ? "id2.sheet.nameFirst" : "id2.sheet.nameLater"),
    firstTrade,
    guest: f.isGuest ? { text: t("id2.sheet.guest"), link: t("id2.sheet.guestLink") } : null,
  };
}

/** What VoiceOver says for a face in the row (1-based, of the library faces; No face says its own name). */
export const faceA11y = (id: string | null, n: number, m: number, t: TFn): string => (id ? t("id2.sheet.faceA11y", { n, m }) : t("id2.sheet.faceNone"));

/** The pad's VoiceOver value: how many strokes, once there are any. */
export const padValue = (strokes: number, t: TFn): string | undefined => (strokes > 0 ? t("id2.sheet.padDrawn", { n: strokes }) : undefined);

/* ── after the answer ──────────────────────────────────────────────────── */

export type SignAnswer = { revealed: boolean; via: "seal" | "direct" };

/** A demo thread never reaches the server: it opens when they signed first, else it waits. */
export const demoSignResult = (theirSigned: boolean): SignAnswer => ({ revealed: theirSigned, via: "seal" });

/** what the sheet does once the send has an answer: "signed" closes it (and resets it), "kept" leaves it as drawn, "closed" closes it as it is */
export type SignOutcome = "signed" | "kept" | "closed";

/**
 * After signThreadV2: null is a failure — the sheet stays as drawn unless
 * the server refused (gone, blocked, suspended: no retry can help, and the
 * thread is closing under it). A signature that landed closes the sheet;
 * the second one holds the ceremony, the first leaves the door at YOU
 * SIGNED · WAITING.
 */
export function afterSign(res: SignAnswer | null, refused: boolean): { outcome: SignOutcome; ceremony: boolean; waiting: boolean } {
  if (!res) return { outcome: refused ? "closed" : "kept", ceremony: false, waiting: false };
  return { outcome: "signed", ceremony: res.revealed, waiting: !res.revealed };
}

/* ── DEMO MODE (dev pages only) ────────────────────────────────────────────
   A demo thread (demo-*, __DEV__) never reaches the server, and neither may
   its signature reach the account: a demo trade never saves the pen name to
   the profile. The dev pages (/dev/step5-chat, /dev/step5-chat-rn,
   /dev/sign-sheet) set what the sheet believes about the reader instead —
   the pen name the profile holds ("" = the first trade) and whether they
   are a guest — and a demo signature writes its name here, the way a real
   one saves it, so the next demo trade opens pre-filled. Null (the
   default): the sheet reads the real account, as on any real thread. */

export type SignDemo = { handle: string; guest: boolean };

let demo: SignDemo | null = null;
const demoListeners = new Set<() => void>();

export function setSignDemo(d: SignDemo | null): void {
  demo = d;
  demoListeners.forEach((f) => f());
}
export const signDemo = (): SignDemo | null => demo;
export function subscribeSignDemo(f: () => void): () => void {
  demoListeners.add(f);
  return () => {
    demoListeners.delete(f);
  };
}
