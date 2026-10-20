/* LETTER PAPERS — THE TABLE (owner, 2026-10-20; contract .claude/papers/CONTRACT.md §1).
   ────────────────────────────────────────────────────────────────────────
   The writer picks a paper in the compose screen; the reader sees that letter on the Today card
   drawn on it. Seven papers ship. Their values are the prototype's ALL() list word for word
   (export 3/today-papers-final/src/Today Papers.dc.html), with its full() defaults filled in, so
   the web can use the CSS strings as they are and Swift's KPaper (Portable/InkCard.swift) carries
   the same numbers as SwiftUI data. Change a value in both places, never one.

   Tiers (the owner's, overriding the prompts): plain (the default) and grid are free; airmail
   opens with your first kindred (a pen-pal thread where names were traded: threads.revealed);
   kraft, receipt, sticky and riso are First Class. The server has the last word (web migration
   0041: a paper the author may not use is turned to null, plain), so canUsePaper here only decides
   what the compose key says.

   letters.paper is text, null = plain; an unknown or missing id reads as plain everywhere
   (paperOf). Pure data, no imports: node src/data/papers.test.ts. */

export type PaperId = "plain" | "grid" | "kraft" | "airmail" | "receipt" | "sticky" | "riso";
/** free: anyone; kindred: once you have a first kindred; first: First Class */
export type PaperTier = "free" | "kindred" | "first";
/** the prototype's faces — G: EB Garamond, M: IBM Plex Mono, S: the system face. The app no longer
    lets a paper pick its face: every paper draws the reader's Letter font (owner, 2026-10-20) */
export type PaperFace = "G" | "M" | "S";

export type Paper = {
  id: PaperId;
  tier: PaperTier;
  /** i18n key of its name (strings-papers.ts) */
  nameKey: string;
  /** the prototype's English name ("Plain") */
  name: string;
  // ── the card (Today letter card, compose body): CSS, as ALL() writes it ──
  bg: string;
  border: string;
  shadow: string;
  radius: string;
  ink: string;
  meta: string;
  line: string;
  font: PaperFace;
  /** the letter's size on the prototype's card (29px is its default) */
  size: string;
  lh: string;
  ls: string;
  padLeft: string;
  tagBg: string;
  tagC: string;
  stampBg: string;
  wrenBg: string;
  textShadow: string;
  /** receipt: torn (zigzag) edges top and bottom */
  torn: boolean;
  /** sticky: the folded corner at the bottom right */
  fold: boolean;
  // ── the strip's 48 × 60 swatch ──
  tBorder: string;
  tRadius: string;
  miniSize: string;
  miniPad: string;
};

/** the CSS font stacks the prototype names G, M and S */
export const PAPER_FONT_CSS: Record<PaperFace, string> = {
  G: "'EB Garamond',Georgia,serif",
  M: "'IBM Plex Mono',monospace",
  S: "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif",
};

/* the prototype's full() defaults, under every paper */
const D = { size: "29px", lh: "1.3", ls: "0", padLeft: "16px", miniPad: "12px", miniSize: "14px", textShadow: "none", torn: false, fold: false };

export const PAPERS: readonly Paper[] = [
  {
    ...D, id: "plain", tier: "free", nameKey: "pp.name.plain", name: "Plain",
    bg: "#fff", border: "2.5px solid #1E1B35", shadow: "0 6px 18px -8px rgba(30,27,53,.25)", radius: "24px",
    ink: "#1E1B35", meta: "#8A86A3", line: "#1E1B35", font: "G",
    tagBg: "#F5D547", tagC: "#1E1B35", stampBg: "#DDEFD6", wrenBg: "#F1F0EE", tBorder: "1.5px solid #1E1B35", tRadius: "8px",
  },
  {
    ...D, id: "grid", tier: "free", nameKey: "pp.name.grid", name: "Grid",
    bg: "repeating-linear-gradient(0deg,transparent 0 19px,#E4E2F4 19px 20px),repeating-linear-gradient(90deg,transparent 0 19px,#E4E2F4 19px 20px),#FBFBFF",
    border: "1.5px solid #1E1B35", shadow: "0 2px 0 #1E1B35", radius: "4px",
    ink: "#1E1B35", meta: "#55506E", line: "#1E1B35", font: "G",
    tagBg: "#1E1B35", tagC: "#fff", stampBg: "#fff", wrenBg: "#fff", tBorder: "1.5px solid #1E1B35", tRadius: "3px",
  },
  {
    ...D, id: "kraft", tier: "first", nameKey: "pp.name.kraft", name: "Kraft",
    bg: "repeating-linear-gradient(115deg,rgba(255,255,255,.08) 0 2px,transparent 2px 7px),#E3D5B8",
    border: "none", shadow: "0 14px 28px -14px rgba(60,40,10,.55)", radius: "18px",
    ink: "#3B2E1A", meta: "#5B4A2E", line: "#B99E72", font: "G",
    tagBg: "#3B2E1A", tagC: "#E3D5B8", stampBg: "#F1E7D2", wrenBg: "#F1E7D2", tBorder: "none", tRadius: "6px",
  },
  {
    ...D, id: "airmail", tier: "kindred", nameKey: "pp.name.airmail", name: "Airmail",
    bg: "linear-gradient(#fff,#fff) padding-box,repeating-linear-gradient(45deg,#C8412E 0 10px,#fff 10px 20px,#3A34D6 20px 30px) border-box",
    border: "8px solid transparent", shadow: "0 10px 24px -12px rgba(30,27,53,.45)", radius: "10px",
    ink: "#1E1B35", meta: "#C8412E", line: "#3A34D6", font: "G",
    tagBg: "#C8412E", tagC: "#fff", stampBg: "#fff", wrenBg: "#F1F0EE", tBorder: "4px solid transparent", tRadius: "4px",
  },
  {
    ...D, id: "receipt", tier: "first", nameKey: "pp.name.receipt", name: "Receipt",
    bg: "#FDFCF7", border: "1px solid #DDD9E8", shadow: "0 10px 22px -10px rgba(30,27,53,.45)", radius: "2px",
    ink: "#1E1B35", meta: "#55506E", line: "#1E1B35", font: "M",
    size: "17px", lh: "1.6", ls: "-.01em", miniSize: "12px", torn: true,
    tagBg: "#1E1B35", tagC: "#fff", stampBg: "#fff", wrenBg: "#F1F0EE", tBorder: "1px dashed #8A86A3", tRadius: "0",
  },
  {
    ...D, id: "sticky", tier: "first", nameKey: "pp.name.sticky", name: "Sticky",
    bg: "#D8F04A", border: "none", shadow: "3px 6px 0 rgba(30,27,53,.22)", radius: "2px",
    ink: "#1E1B35", meta: "#55506E", line: "#1E1B35", font: "S",
    size: "24px", lh: "1.3", ls: "-.01em", miniSize: "15px", fold: true,
    tagBg: "#1E1B35", tagC: "#D8F04A", stampBg: "#fff", wrenBg: "#fff", tBorder: "none", tRadius: "2px",
  },
  {
    ...D, id: "riso", tier: "first", nameKey: "pp.name.riso", name: "Riso",
    bg: "repeating-linear-gradient(0deg,rgba(58,52,214,.06) 0 2px,transparent 2px 4px),#F3C6D4",
    border: "none", shadow: "6px 6px 0 #3A34D6", radius: "0",
    ink: "#3A34D6", meta: "#3A34D6", line: "#3A34D6", font: "G", textShadow: "1.5px 1px 0 rgba(200,65,46,.55)",
    tagBg: "#3A34D6", tagC: "#F3C6D4", stampBg: "#F3C6D4", wrenBg: "#FBE3EA", tBorder: "none", tRadius: "0",
  },
];

/** the strip's order (the prototype's P() order) */
export const PAPER_IDS: readonly PaperId[] = PAPERS.map((p) => p.id);

export const DEFAULT_PAPER: PaperId = "plain";

/** the sticky note's folded flap (the prototype's #B5CC2E); the other half of the corner is the page */
export const PAPER_FOLD_FLAP = "#B5CC2E";

export function isPaperId(x: unknown): x is PaperId {
  return typeof x === "string" && (PAPER_IDS as readonly string[]).includes(x);
}

/** a stored or sent id as a paper id: anything unknown, null or missing is plain */
export function paperIdOf(id: unknown): PaperId {
  return isPaperId(id) ? id : DEFAULT_PAPER;
}

/** the paper for an id; anything unknown, null or missing is plain */
export function paperOf(id: unknown): Paper {
  const want = paperIdOf(id);
  return PAPERS.find((p) => p.id === want) ?? PAPERS[0];
}

/** what the writer is: a First Class member (cofounders too), and whether they have a first kindred */
export type PaperWriter = { firstClass: boolean; hasKindred: boolean };

/** why a paper can't be sent now: "ok", "firstClass" (buy it: the gold key) or "kindred" (earn it: the locked key) */
export type PaperGate = "ok" | "firstClass" | "kindred";

export function paperGate(id: unknown, w: PaperWriter): PaperGate {
  const p = paperOf(id);
  if (p.tier === "first") return w.firstClass ? "ok" : "firstClass";
  if (p.tier === "kindred") return w.hasKindred ? "ok" : "kindred";
  return "ok";
}

/** the writer may send on this paper (the server checks again: web 0041) */
export function canUsePaper(id: unknown, w: PaperWriter): boolean {
  return paperGate(id, w) === "ok";
}

/** the value letters.paper takes: null for plain (and for anything unknown) */
export function paperForDb(id: unknown): Exclude<PaperId, "plain"> | null {
  const p = paperIdOf(id);
  return p === "plain" ? null : p;
}
