import { t, getLang } from "./i18n";

/* dates format in the reader's locale, so JUL 29 becomes 29 de jul. / 29 jul */
export const localeTag = (): string => ({ en: "en-US", es: "es-ES", pt: "pt-BR", id: "id-ID" }[getLang()] || "en-US");
const LOCALE = localeTag;
/* Small pure formatters + deterministic identity helpers.
   shade/dLong/dShort/today ported from kindredly-v20.jsx; hashStr/postNo/
   avatarFor ported from the web system.js so anonymous "correspondent
   numbers" and glyph avatars match the web byte-for-byte. */

/** shift an #rrggbb hex by ±d per channel → "rgb(r,g,b)" (v20 shade). */
export function shade(hex: string, d: number): string {
  const h = hex.replace("#", "");
  const v = (i: number) =>
    Math.max(0, Math.min(255, parseInt(h.substr(i, 2), 16) + d));
  return `rgb(${v(0)},${v(2)},${v(4)})`;
}

export const dLong = (d: string | number | Date) =>
  new Date(d).toLocaleDateString(LOCALE(), {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export const dShort = (d: string | number | Date) =>
  new Date(d).toLocaleDateString(LOCALE(), { month: "short", day: "numeric" });

export const today = () => new Date().toISOString().slice(0, 10);

/** seconds → m:ss (v20 calls fmt() for voice/video durations but never defines it). */
export function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

/* ── deterministic identity (web system.js parity) ── */

/* How long ago a letter was written. The product's texture is slowness, so
   this is deliberately coarse — nobody needs "3h 41m", and a letter written
   at 2am reads differently from one written at noon whatever the gap. */
export function sinceShort(iso: string | number | Date): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 2) return t("fmt.justNow");
  if (min < 60) return t("fmt.minAgo", { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? t("fmt.hourAgo") : t("fmt.hoursAgo", { n: h });
  const d = Math.floor(h / 24);
  return d === 1 ? t("fmt.yesterday") : t("fmt.daysAgo", { n: d });
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** stable anonymous "No. 1000–9999" from a user id (shown before reveal). */
export function postNo(uid: string): number {
  return 1000 + (hashStr("post:" + uid) % 9000);
}

/* 12 abstract glyph avatars × 8 palettes = 96 stable identities (system.js). */
export const AVATAR_GLYPHS = [
  '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.6"/>',
  '<path d="M4 10c2.5-2.6 5 2.6 7.5 0s5-2.6 7.5 0"/><path d="M4 15c2.5-2.6 5 2.6 7.5 0s5-2.6 7.5 0"/>',
  '<path d="M12 3l2.4 5.8L21 9.4l-4.6 3.8L17.6 20 12 16.5 6.4 20l1.2-6.8L3 9.4l6.6-.6z"/>',
  '<circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M18.4 5.6l-2 2M7.6 16.4l-2 2"/>',
  '<path d="M20 13.5A7.5 7.5 0 1 1 10.5 4a5.8 5.8 0 0 0 9.5 9.5z"/>',
  '<circle cx="7" cy="7" r="1.6"/><circle cx="12" cy="7" r="1.6"/><circle cx="17" cy="7" r="1.6"/><circle cx="7" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="17" cy="12" r="1.6"/><circle cx="7" cy="17" r="1.6"/><circle cx="12" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
  '<path d="M12 21c-4-3-7-6-7-10a7 7 0 0 1 14 0c0 4-3 7-7 10z"/><circle cx="12" cy="11" r="2.2"/>',
  '<path d="M4 18l5-7 3.5 4.5L15 12l5 6z"/><circle cx="8" cy="7" r="1.6"/>',
  '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 8l8 6 8-6"/>',
  '<path d="M13 2L5 13h5l-1 9 8-12h-5z"/>',
  '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16" opacity=".6"/>',
  '<path d="M12 3c3 4 3 8 0 10s-3 6 0 8" /><path d="M8 8h8M8 16h8" opacity=".5"/>',
];
export const AVATAR_COLORS = [
  { fg: "#3A3AF5", bg: "#E6E6FB" },
  { fg: "#4E8641", bg: "#E3EFDF" },
  { fg: "#C86E7A", bg: "#F5E2E5" },
  { fg: "#D69A55", bg: "#F5E7D2" },
  { fg: "#A98CD9", bg: "#ECE4F6" },
  { fg: "#2E7BAA", bg: "#DCEAF3" },
  { fg: "#C6A21E", bg: "#F4EAC4" },
  { fg: "#4E5468", bg: "#E1E3E9" },
];
export function avatarFor(seed: string) {
  const h = hashStr("av:" + String(seed));
  const glyph = AVATAR_GLYPHS[h % AVATAR_GLYPHS.length];
  const col =
    AVATAR_COLORS[Math.floor(h / AVATAR_GLYPHS.length) % AVATAR_COLORS.length];
  return { glyph, fg: col.fg, bg: col.bg };
}
