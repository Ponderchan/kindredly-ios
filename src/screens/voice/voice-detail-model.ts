import type { ReportGate } from "../../lib/report";
import type { VoiceRead } from "../../lib/voice";

/* YOUR VOICE, IN DETAIL, AS DATA (2026-10-27): the nine signals Wren reads
   (app/voice.tsx, dev only).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no i18n — every word comes in through
   `fmt`, so `node src/screens/voice/voice-detail-model.test.ts` locks the
   rules. VoiceDetailNative turns this into the Swift page
   (KVoiceDetailView); the React Native page, the "voice" switch's
   fallback, says the same things inline:

   - the line under the title: how many pieces and where on the growth
     ladder, in her voice and lower case; "…" until the writing is read;
   - a row that hasn't had enough writing to say anything says so
     (vc.notEnough) and is drawn faded, its dots all empty;
   - the night letter's door, by its gate: ready (open it), progress (how
     many more, and the bar), locked (First Class), done (read this month).
     Only ready and locked can be tapped. Its two English-only lines (the
     progress title, the locked line) and the eyebrows are the page's own
     words, unchanged. */

export type VoiceDetailFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** a line in her voice, her name in it (lib/wren-name speakAs) */
  speak: (line: string) => string;
  /** her name, as she is called */
  wren: string;
};

export type VoiceDetailRow = {
  key: string;
  glyph: string;
  title: string;
  /** what it found, or vc.notEnough */
  line: string;
  /** 1…5 */
  strength: number;
  read: boolean;
};

export type VoiceDetailGate = {
  state: ReportGate["state"];
  eyebrow: string;
  title: string;
  sub: string;
  /** progress only: 0…100 */
  pct: number | null;
  /** ready and locked open something; progress and done don't */
  tappable: boolean;
};

export type VoiceDetailView = {
  /** "Based on 4 pieces · a little spark appeared", or "…" before the read */
  basedOn: string;
  rows: VoiceDetailRow[];
};

export function voiceDetailView(read: VoiceRead | null, fmt: VoiceDetailFormat): VoiceDetailView {
  const { t, speak } = fmt;
  if (!read) return { basedOn: "…", rows: [] };
  const line = speak(read.stage.line).toLowerCase();
  return {
    basedOn: read.pieces === 1 ? t("vc.basedOnOne", { n: read.pieces, line }) : t("vc.basedOnMany", { n: read.pieces, line }),
    rows: read.rows.map((r) => ({
      key: r.key,
      glyph: r.glyph,
      title: r.title,
      line: r.read ? speak(r.line) : t("vc.notEnough"),
      strength: r.strength,
      read: r.read,
    })),
  };
}

export function voiceDetailGate(gate: ReportGate, fmt: VoiceDetailFormat): VoiceDetailGate {
  const { t, wren } = fmt;
  switch (gate.state) {
    case "ready":
      return {
        state: "ready",
        eyebrow: "🌙 YOUR AURA · WRAPPED",
        title: gate.kind === "first" ? t("vc.gate.wrote", { wren }) : t("vc.gate.here"),
        sub: t("vc.gate.readySub"),
        pct: null,
        tappable: true,
      };
    case "progress": {
      const n = gate.need - gate.have;
      return {
        state: "progress",
        eyebrow: "🌙 YOUR AURA · WRAPPED",
        title: `${wren} is saving up a letter about you.`,
        sub: n === 1 ? t("vc.gate.progressOne", { n }) : t("vc.gate.progressMany", { n }),
        pct: Math.min(100, Math.round((gate.have / gate.need) * 100)),
        tappable: false,
      };
    }
    case "locked":
      return {
        state: "locked",
        eyebrow: "👑 FIRST CLASS",
        title: t("vc.gate.locked"),
        sub: `Your voice, your hours, your words — a wrapped read from ${wren} with First Class.`,
        pct: null,
        tappable: true,
      };
    case "done":
      return { state: "done", eyebrow: "🌙 YOUR AURA · WRAPPED", title: t("vc.gate.read"), sub: t("vc.gate.doneSub"), pct: null, tappable: false };
  }
}

/** Where a tap on the door goes: the night letter, the paywall, or nowhere. */
export function voiceGateHref(gate: ReportGate | null): "/report" | "/paywall?src=report_lock" | null {
  if (gate?.state === "ready") return "/report";
  if (gate?.state === "locked") return "/paywall?src=report_lock";
  return null;
}
