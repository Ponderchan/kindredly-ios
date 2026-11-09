/* THE PURE PART OF HANDING REELS TO SWIFT (2026-11-09; swift-reel-data builds the rest). Nothing
   here imports React Native, so it runs under plain node (swift-reel-model.test.ts):
   - a paper of data/papers read from its CSS into numbers, as news-reel/v1-0-5's PaperSheet
     reads it (its ground, its line, a hard shadow or a soft one, Airmail's striped border, Grid's
     line ink, the torn and folded edges), so Swift draws the same sheet without parsing CSS;
   - the kindreds title split as guide-reel/kindreds' Title splits it: the word that names them in
     the pen (the one sharing the most of its stem with the Kindreds tab, else the longer of the
     last two; a run inside a line without spaces), and its size against BigType's. */

/** every #hex colour in a CSS value, in order */
export const hexes = (css: string): string[] => css.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? [];

/** "2.5px solid #1E1B35" → its width and colour; none, or Airmail's transparent one, → null */
export function lineOf(css: string): { w: number; color: string; dashed: boolean } | null {
  const m = css.match(/([\d.]+)px (solid|dashed) (#[0-9A-Fa-f]{3,8})/);
  return m ? { w: parseFloat(m[1]), color: m[3], dashed: m[2] === "dashed" } : null;
}

/** a hard shadow ("6px 6px 0 #3A34D6", "0 2px 0 #1E1B35"), or null for a soft one or none */
export function hardOf(css: string): { x: number; y: number; color: string } | null {
  const m = css.match(/^(-?[\d.]+)(?:px)? (-?[\d.]+)(?:px)? 0 (#[0-9A-Fa-f]{3,8}|rgba\([^)]*\))$/);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]), color: m[3] } : null;
}

/** what PaperSheet reads off a paper (data/papers Paper) */
export type PaperCss = { id: string; bg: string; border: string; shadow: string; radius: string; ink: string; line: string; textShadow: string; tBorder: string; tRadius: string; torn?: boolean; fold?: boolean };

/** KReelPaperJSON's drawing half (Portable/Reels/KReelNews105.swift); the words are added by the caller */
export function paperLook(p: PaperCss) {
  const hard = hardOf(p.shadow);
  const airmail = p.id === "airmail";
  return {
    id: p.id,
    // its ground is the last colour the CSS paints; Airmail's is the white inside its stripes
    ground: airmail ? "#FFFFFF" : (hexes(p.bg).pop() ?? "#FFFFFF"),
    ink: p.ink,
    lineColor: p.line,
    radius: parseFloat(p.radius) || 0,
    tRadius: parseFloat(p.tRadius) || 0,
    line: lineOf(p.border),
    tLine: lineOf(p.tBorder),
    hard,
    soft: !hard && p.shadow !== "none",
    glow: hardOf(p.textShadow),
    stripes: airmail ? parseFloat(p.border) || 0 : 0,
    tStripes: airmail ? parseFloat(p.tBorder) || 0 : 0,
    stripeColors: hexes(p.bg).slice(-3),
    gridInk: hexes(p.bg)[0] ?? null,
    torn: !!p.torn,
    fold: !!p.fold,
  };
}

/** guide-reel/kindreds Title: its parts (each carrying its own trailing space), the one in the pen (−1: none), and fs / (0.11 s) */
export function kindredsTitleParts(title: string, kin: string): { parts: string[]; accent: number; fit: number } {
  const ems = (w: string) => Array.from(w).reduce((a, ch) => a + ((ch.codePointAt(0) ?? 0) >= 0x2e80 ? 1 : 0.6), 0);
  const fold = (w: string) => w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();
  let parts: { text: string; accent: boolean }[];
  if (title.includes(" ")) {
    const words = title.split(" ").filter(Boolean);
    const n = words.length;
    const k = fold(kin);
    const stem = (w: string) => {
      const a = fold(w);
      let i = 0;
      while (i < a.length && i < k.length && a[i] === k[i]) i++;
      return i;
    };
    let best = -1;
    let most = 1;
    words.forEach((w, i) => {
      const m = stem(w);
      if (m > most) {
        best = i;
        most = m;
      }
    });
    if (best < 0 && n > 1) best = words[n - 2].length > words[n - 1].length ? n - 2 : n - 1;
    parts = words.map((w, i) => ({ text: w + (i < n - 1 ? " " : ""), accent: i === best }));
  } else {
    const at = kin ? title.indexOf(kin) : -1;
    parts = at < 0 ? [{ text: title, accent: false }] : [{ text: title.slice(0, at), accent: false }, { text: kin, accent: true }, { text: title.slice(at + kin.length), accent: false }].filter((p) => p.text);
  }
  // fs = min(.11 s, .82 s / the longest word's ems)
  const fit = Math.min(1, 0.82 / 0.11 / Math.max(1, ...title.split(/\s+/).map(ems)));
  return { parts: parts.map((p) => p.text), accent: parts.findIndex((p) => p.accent), fit };
}
