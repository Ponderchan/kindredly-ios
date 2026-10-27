import type { KLeaveSheetKey, KSheetDim } from "../../modules/kindredly-ui/src/SharedSheets";

/* THE SHARED SHEETS' NUMBERS AND RECORDS, for both renderers (2026-10-27).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n (the sentence-casing comes in as
   `words`), so `node src/components/shared-sheets-model.test.ts` locks them.
   The React Native pieces (LeaveSheet, SignUpSheet, ReportMenu's card, the
   Toast) keep their own inline arithmetic, unchanged; their SwiftUI twins
   (modules/kindredly-ui SharedSheets) are fed from here, by the same
   formulas, and the test pins the two to the same numbers. */

/** A scrim or wash as the React Native side writes it — "rgba(30,27,53,0.3)",
    "rgba(0,0,0,0.45)" (lib/theme scrimColor) or "#RRGGBB" — split for Swift,
    which takes "#RRGGBB" and an alpha. Anything else is the 10a dim. */
export function rgbaParts(css: string): KSheetDim {
  const hex = /^#([0-9a-f]{6})$/i.exec(css.trim());
  if (hex) return { hex: `#${hex[1].toUpperCase()}`, alpha: 1 };
  const m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([0-9.]+)\s*)?\)$/i.exec(css.trim());
  if (!m) return { hex: "#1E1B35", alpha: 0.3 };
  const byte = (v: string) => Math.max(0, Math.min(255, Number(v)));
  const h = [m[1], m[2], m[3]].map((v) => byte(v).toString(16).padStart(2, "0").toUpperCase()).join("");
  const a = m[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(m[4])));
  return { hex: `#${h}`, alpha: a };
}

/** Where the leave sheet's card may go, as LeaveSheet lays its React Native
    card out: never taller than the window less the status bar and 12, and
    over the tab bar's room (`bottomExtra`) unless it is in a Modal. */
export function leaveSheetFrame(o: { winH: number; top: number; bottom: number; bottomExtra: number; modal: boolean }): { maxHeight: number; bottomMargin: number } {
  const extra = o.modal ? 0 : o.bottomExtra;
  return { maxHeight: o.winH - o.top - 12 - extra, bottomMargin: Math.max(o.bottom - 26, 8) + extra };
}

/** The sign-up sheet's room under its card (always in a Modal's terms: no tab-bar room). */
export function signUpBottomMargin(bottom: number): number {
  return Math.max(bottom - 26, 8);
}

/** The fields of a LeaveAction Swift needs (LeaveSheet's own type, by shape). */
export type LeaveActionLike = {
  label: string;
  kind: "primary" | "destructive" | "quiet";
  lead?: string;
  selected?: boolean;
  accessibilityLabel?: string;
  accessibilityLanguage?: string;
  busy?: boolean;
};

/** The keys as Swift takes them: the label as the React Native key shows it
    (`words`, sheet-chrome sheetWords), the rest with its blanks filled. */
export function nativeLeaveKeys(actions: readonly LeaveActionLike[], words: (s: string) => string): KLeaveSheetKey[] {
  return actions.map((a) => ({
    label: words(a.label),
    kind: a.kind,
    lead: a.lead ?? "",
    selected: !!a.selected,
    voiceLabel: a.accessibilityLabel ?? "",
    voiceLanguage: a.accessibilityLanguage ?? "",
    busy: !!a.busy,
  }));
}

/** The room around the Swift report card inside its Host, for the card's
    soft shadow (22 blur, 8 down) to draw in; a tap there is the dim's. */
export const REPORT_CARD_ROOM = 32;

/** The card's own height from its Host's (what ReportSheet keeps on screen). */
export function reportCardHeight(hostHeight: number, room: number = REPORT_CARD_ROOM): number {
  return Math.max(0, hostHeight - 2 * room);
}
