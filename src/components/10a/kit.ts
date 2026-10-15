import type { TextStyle, ViewStyle } from "react-native";
import { MONO, PF, channelColors } from "../../theme/post";
import type { ThemeTokens } from "../../theme/themes";

/* THE 10a TWINS' RECIPES (10a step 5, React Native).
   ────────────────────────────────────────────────────────────────────────
   The React Native pieces in this folder draw the same 10a look as the
   SwiftUI kit (modules/kindredly-ui, Portable), for the screens that stay
   React Native and for every Swift screen's React Native fallback. What
   they paint — sizes, which token goes where, the contrast rules, the send
   key's states — is written down here once, as plain data and pure
   functions, so it can be checked under plain node (kit.test.ts) and so a
   screen that needs a number reads the same one the component uses.

   Nothing here imports React or React Native at runtime (the `import type`
   above is erased), and every colour comes from the theme passed in
   (useTheme().t — `tk` in files that also use i18n's t). Refs like H:124
   are lines of the 10a mock (.claude/mock/k10/Kindredly 10 Final.dc.html). */

/* ── the sticker material: an outline and a hard shadow ──────────────── */

/** How far a sticker's face moves when pressed: onto its hard shadow (the
    offset), or 1pt for a sticker without one — KStickerButtonStyle's rule. */
export function stickerPressOffset(shadowOffset: number, pressed: boolean): number {
  if (!pressed) return 0;
  return shadowOffset > 0 ? shadowOffset : 1;
}

/* ── InkPanel (H:32, H:72) ────────────────────────────────────────────── */

export type InkPanelVariant = "today" | "me";

/** The two InkCard materials: sf face, a 2.5 ln outline and a hard ln
    shadow. "today" is the letter card (radius 28, 6/6, padding 18 20 14;
    H:32); "me" is every Me card (radius 24, 5/5, padding 16; H:72). */
export const INK_PANEL: Readonly<Record<InkPanelVariant, { radius: number; shadow: number; border: number; padding: { top: number; right: number; bottom: number; left: number } }>> = {
  today: { radius: 28, shadow: 6, border: 2.5, padding: { top: 18, right: 20, bottom: 14, left: 20 } },
  me: { radius: 24, shadow: 5, border: 2.5, padding: { top: 16, right: 16, bottom: 16, left: 16 } },
};

/* ── ReplyStrip (H:124) ──────────────────────────────────────────────── */

/** The keyboard-state reply strip: sf, a 2.5 ln outline, corners 26, a 4/4
    ln shadow, min height 54, padding 0 8 0 20; the field is system 17 and
    grows to five lines (H:124; spec-chat "Reply strip"). */
export const REPLY_STRIP = {
  minHeight: 54,
  radius: 26,
  border: 2.5,
  shadow: 4,
  padLeft: 20,
  padRight: 8,
  fontSize: 17,
  lineHeight: 22,
  maxLines: 5,
  /** the space between the strip and a round tool beside it */
  gap: 8,
} as const;

/** the field's vertical padding: one line sits centred in the 54 resting height */
export const REPLY_FIELD_PAD = (REPLY_STRIP.minHeight - 2 * REPLY_STRIP.border - REPLY_STRIP.lineHeight) / 2;
/** the tallest the field grows: five lines and its padding */
export const REPLY_FIELD_MAX = REPLY_STRIP.maxLines * REPLY_STRIP.lineHeight + 2 * REPLY_FIELD_PAD;

/* ── the send key (owner question 3) ─────────────────────────────────── */

/** What the send key shows once there are words: "plane" is the black pill
    with the paper plane (the owner's 2026-09-20 key, Today's today), "word"
    the prompts' SEND turning ind. Owner question 3 is open; built with its
    recommended answer. Flip this one constant to change every send key. */
export type SendStyle = "plane" | "word";
export const SEND_STYLE: SendStyle = "plane";

/** The send key's three states, as KSendKey has them:
    - disabled: nothing to send yet (empty, too short, a send in flight) —
      SEND in faint on a soft2 pill (H:124), and not a button you can press;
    - enabled: the words can go — the plane pill (or the ind word);
    - dimmed: the words are ready but something outside them holds the
      letter (a full pouch) — it LOOKS disabled, yet stays tappable, so the
      tap can explain why. */
export type SendState = "disabled" | "enabled" | "dimmed";

/** The send key's state from the caller's facts. `canSend` is the caller's
    whole rule for the words (long enough, not over the limit, not already
    sending); `held` is the outside reason a ready letter can't go yet. */
export function sendKeyState({ hasWords, canSend, held = false }: { hasWords: boolean; canSend: boolean; held?: boolean }): SendState {
  if (!hasWords || !canSend) return "disabled";
  return held ? "dimmed" : "enabled";
}

/** whether a press reaches the caller (enabled and dimmed do; disabled doesn't) */
export const sendTakesPress = (state: SendState): boolean => state !== "disabled";

/** whether a strip clears itself after a press — only a send that went,
    never the dimmed tap that only explains */
export const sendClearsField = (state: SendState): boolean => state === "enabled";

/* ── contrast ────────────────────────────────────────────────────────── */

const rgb = (hex: string): [number, number, number] | null => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
};
const lin = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG contrast ratio of two #RRGGBB colours (1 when either can't be read) */
export function contrastRatio(a: string, b: string): number {
  const x = rgb(a);
  const y = rgb(b);
  if (!x || !y) return 1;
  const la = 0.2126 * lin(x[0]) + 0.7152 * lin(x[1]) + 0.0722 * lin(x[2]);
  const lb = 0.2126 * lin(y[0]) + 0.7152 * lin(y[1]) + 0.0722 * lin(y[2]);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ── the notice bar (KNoticeBar's twin) ──────────────────────────────── */

/** The notifications-off bar's colours: the theme's lav ground with ind
    type (KNoticeBar: themed, no longer the fixed #EEF5FD). lav, not lav2:
    lav2 all but vanishes into the Lavender and Paper pages. Where ind
    doesn't clear 4.5:1 on lav for its 14pt text — Midnight, at 4.38 — the
    type takes the theme's ink instead. */
export function noticeColors(tk: ThemeTokens): { ground: string; ink: string } {
  return { ground: tk.lav, ink: contrastRatio(tk.ind, tk.lav) >= 4.5 ? tk.ind : tk.ink };
}

/* ── the toast (spec-today "Send overlays") ──────────────────────────── */

/** the toast's colours: an ink fill with the page colour on it, as every ink fill in 10a */
export function toastColors(tk: ThemeTokens): { fill: string; text: string } {
  return { fill: tk.ink, text: tk.bg };
}

/* ── the topic tag (H:35, H:42, with the contrast-safe recipe) ─────────── */

/** The topic tag's look for a stamp on the surface it sits on: the stamp's
    wash for the fill, its walked ink for the text (≥ 4.5:1), the stamp's
    own colour for the 2pt outline where it clears 3:1 (else the ink), and
    the hard 3/3 shadow in ln. Never the full stamp fill with channelInk,
    which disappears on the dark stamps. `surfaceHex` is what the tag lies
    on — tk.sf on a card (the default), tk.bg on the page, tk.soft2 in a tray. */
export function topicTagLook(stampHex: string | null | undefined, tk: ThemeTokens, surfaceHex: string = tk.sf): { fill: string; text: string; border: string; shadow: string } {
  const c = channelColors(stampHex, surfaceHex);
  return { fill: c.wash, text: c.ink, border: c.line, shadow: tk.ln };
}

/** the topic tag's type: mono 600 at 11 (the 9/10/11 rule; the mock's 13) */
export const TOPIC_TAG_SIZE = MONO.title;

/* ── the translate capsule (H:42) ────────────────────────────────────── */

/** The capsule's language code: their language → yours while the original
    shows ("ES→EN"), turned round once it is in yours ("EN←ES"). Both as
    given (the callers pass upper-case two-letter tags). */
export function translateCode(from: string, to: string, translated: boolean): string {
  return translated ? `${to}←${from}` : `${from}→${to}`;
}

/* ── the bottom fade (H:108) ─────────────────────────────────────────── */

/** The fade above the tab bar: 176 tall, solid page colour from 42% down,
    never taking a touch. The mock starts it from white; it starts from the
    page colour at nothing, so it can't grey the page in another theme. */
export const BOTTOM_FADE = { height: 176, solidAt: 0.42 } as const;

/** the gradient's two colours: the page colour at alpha 0, then the page colour */
export function fadeColors(bg: string): [string, string] {
  return [/^#[0-9a-f]{6}$/i.test(bg) ? `${bg}00` : "transparent", bg];
}

/* ── the chat row (Kindreds; owner 2026-10-11 sizes, 10a colours) ─────── */

/** One row's metrics. The owner keeps the sizes (52 face, gap 14, name
    17/600, two-line 15/20 preview, badge 20); the inset is the mock's 22
    from the screen edge (H:63-65). */
export const ROW_METRICS = { face: 52, gap: 14, pad: 22, badge: 20 } as const;

export type RowStyle = {
  readonly face: number;
  readonly gap: number;
  readonly pad: number;
  /** the theme colours a row paints with, by role */
  readonly colors: {
    /** names, "You:", the dots */
    readonly ink: string;
    /** the preview, and a name drawn dim (a gone account) */
    readonly sub: string;
    /** the time, quiet labels */
    readonly mute: string;
    /** the hairline */
    readonly line: string;
    /** the badge, YOUR TURN, links */
    readonly ind: string;
    /** the type on an ind or ink fill */
    readonly onInd: string;
    /** the disc behind a mosaic or the official bird */
    readonly disc: string;
    /** the row's own ground, so a lifted context-menu copy isn't transparent */
    readonly ground: string;
  };
  /** the row: face, then the text column */
  readonly row: ViewStyle;
  /** the round disc a pen pal's mosaic (or Wren) sits on */
  readonly disc: ViewStyle;
  /** the text column (name line over the preview) */
  readonly text: ViewStyle;
  /** add to `text` for the 10a hairline under the words (H:65) */
  readonly hairline: ViewStyle;
  readonly name: TextStyle;
  /** always mute, mono 500 11 (H:65; the owner keeps blue for the kindred number and YOUR TURN) */
  readonly time: TextStyle;
  readonly preview: TextStyle;
  readonly you: TextStyle;
  readonly badge: ViewStyle;
  readonly badgeText: TextStyle;
};

/** The chat row's styles on a theme. Pure; ChatRowStyle's useRowStyle()
    keeps one per theme. */
export function rowStyleFor(tk: ThemeTokens): RowStyle {
  const { face, gap, pad, badge } = ROW_METRICS;
  return {
    face,
    gap,
    pad,
    colors: { ink: tk.ink, sub: tk.sub, mute: tk.mute, line: tk.line, ind: tk.ind, onInd: tk.bg, disc: tk.soft2, ground: tk.bg },
    row: { flexDirection: "row", alignItems: "center", gap, paddingHorizontal: pad, backgroundColor: tk.bg },
    disc: { width: face, height: face, borderRadius: face / 2, backgroundColor: tk.soft2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    text: { flex: 1, minWidth: 0, paddingVertical: 12, gap: 3 },
    hairline: { borderBottomWidth: 1, borderBottomColor: tk.line },
    name: { fontSize: 17, fontWeight: "600", color: tk.ink },
    time: { fontFamily: PF.monoMed, fontSize: MONO.title, color: tk.mute },
    preview: { fontSize: 15, lineHeight: 20, color: tk.sub },
    you: { color: tk.ink },
    badge: { minWidth: badge, height: badge, borderRadius: badge / 2, paddingHorizontal: 6, backgroundColor: tk.ind, alignItems: "center", justifyContent: "center", marginTop: 2 },
    badgeText: { fontSize: 12, fontWeight: "600", color: tk.bg },
  };
}

/** a badge's number: 1–9 as is, then "9+" */
export const badgeCount = (n: number): string => (n > 9 ? "9+" : String(Math.max(0, Math.floor(n))));

/* ── the notifications-off bar's rule (NotifyBanner) ─────────────────── */

/** × keeps the bar away this long on this phone, then it asks once more */
export const NOTIFY_QUIET_MS = 14 * 24 * 3600 * 1000;

/** Whether Kindreds' notifications-off bar shows: only once the phone's
    "closed at" has been read, not within two weeks of a ×, and only for
    an account whose notifications are known to be off (a guest has no
    correspondence to be knocked about; an unreadable permission says
    nothing rather than nag). `preview` (dev only, Kindreds?nb=1) stands in
    for "notifications are off"; × still closes it. */
export function notifyBannerShows({
  ready,
  closedAt,
  now,
  preview = false,
  isGuest,
  perm,
}: {
  ready: boolean;
  closedAt: number | null;
  now: number;
  preview?: boolean;
  isGuest: boolean;
  perm: "granted" | "ask" | "settings" | null;
}): boolean {
  if (!ready) return false;
  if (closedAt != null && now - closedAt < NOTIFY_QUIET_MS) return false;
  return preview || (!isGuest && perm != null && perm !== "granted");
}
