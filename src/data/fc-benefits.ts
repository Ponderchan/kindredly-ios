/* FIRST CLASS, WHAT IT CARRIES — the paywall's benefit rows (Me 4a, Prompt 7).
   ────────────────────────────────────────────────────────────────────────
   Pure data, no imports, so a node test and the paywall model can both read
   it. The owner's rule (2026-10-19, O6): a row shows ONLY when the thing it
   sells can be reached in this build. Rooms, voice letters and the wardrobe
   exist; the monthly writing report has a door now (Me → Aura, the row under
   the aura card, lib/report-door), so its row is on. Custom stamps and letter
   paper are not built yet: each sits behind its own flag, off, and the day
   one ships its flag flips here and nowhere else.

   Titles and subs are i18n keys. The four shipped rows reuse the nine-language
   fc.* keys (fc.b3 says "writing report", never "reading": Apple 2.3.2, see
   me-model.ts); the two flagged rows are m4.pw.b.* in strings-me4a.ts.
   "Priority delivery" and "All 12 stamp frames" from the prototype are not
   here at all: nothing in the app does either. */

export const FC_FLAGS = {
  /** a photo of your own, framed as a stamp — not built */
  customStamps: false,
  /** letter paper to write on — not built */
  letterPaper: false,
} as const;

export type FcBenefitId = "rooms" | "voice" | "wardrobe" | "report" | "stamps" | "paper";
export type FcBenefit = { id: FcBenefitId; title: string; sub: string; on: boolean };

export const FC_BENEFITS: readonly FcBenefit[] = [
  { id: "rooms", title: "fc.b1", sub: "fc.b1s", on: true },
  { id: "voice", title: "fc.b2", sub: "fc.b2s", on: true },
  { id: "wardrobe", title: "fc.b4", sub: "fc.b4s", on: true },
  { id: "report", title: "fc.b3", sub: "fc.b3s", on: true }, // has a door now (Me → Aura)
  { id: "stamps", title: "m4.pw.b.stamps", sub: "m4.pw.b.stampsSub", on: FC_FLAGS.customStamps },
  { id: "paper", title: "m4.pw.b.paper", sub: "m4.pw.b.paperSub", on: FC_FLAGS.letterPaper },
];

/** The rows to show, in order. `override` (dev pages only) turns flags on or off by id. */
export function visibleBenefits(override?: Partial<Record<FcBenefitId, boolean>>): FcBenefit[] {
  return FC_BENEFITS.filter((b) => override?.[b.id] ?? b.on);
}
