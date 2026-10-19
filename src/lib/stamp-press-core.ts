/* STAMP PRESS — THE EDIT PAGE'S RULES AND THE stamp-check CLIENT'S PARSING (2026-10-19). Pure;
   lib/stamp-press is the React Native glue (network, files, the signal Me listens to).
   ────────────────────────────────────────────────────────────────────────
   The server is the authority on everything here: web functions/api/stamp-check.js checks the
   picture and the #topic (Gemini + its own contact rules), the plan's filters and the quota
   (0038 stamp_check_begin). The phone only shapes what it sends and reads what comes back, so a
   rule below that disagrees with the server costs a round trip, never a wrong approval. There is
   NO moderation in the client (lead's correction 2): normalizeTopic only trims and counts.

   Tiers (owner, 2026-10-19): Free = 3 custom stamps in all (a deleted one is not given back),
   filters Original + Paper; First Class = unlimited (the server's silent 100 / 30 days), every
   filter but Gilt, and may edit filter / topic / colour later; Cofounder = all of that, every
   stamp gold-edged, and the Gilt filter. */

export type StampPlan = "free" | "first" | "cofounder";

export type PressFilter = "original" | "paper" | "riso" | "night" | "sun" | "sticker" | "gilt";

/** the six category ids (src/data/stamps.ts STAMP_CATEGORIES), in the colour row's order */
export const PRESS_CATEGORIES = ["confessions", "almosts", "latenights", "small", "becoming", "missing"] as const;
export type PressCategory = (typeof PRESS_CATEGORIES)[number];
/** the prototype's default colour: small things */
export const DEFAULT_CATEGORY: PressCategory = "small";

/** 0 = everyone, 1 = First Class (and Cofounder), 2 = Cofounder only */
export const PRESS_FILTERS: readonly { id: PressFilter; level: 0 | 1 | 2 }[] = [
  { id: "original", level: 0 },
  { id: "paper", level: 0 },
  { id: "riso", level: 1 },
  { id: "night", level: 1 },
  { id: "sun", level: 1 },
  { id: "sticker", level: 1 },
  { id: "gilt", level: 2 },
];

export const FREE_STAMPS = 3;
export const TOPIC_MAX = 24;

const levelOf = (p: StampPlan): number => (p === "cofounder" ? 2 : p === "first" ? 1 : 0);

export function isCategory(v: unknown): v is PressCategory {
  return typeof v === "string" && (PRESS_CATEGORIES as readonly string[]).includes(v);
}

export function isFilter(v: unknown): v is PressFilter {
  return typeof v === "string" && PRESS_FILTERS.some((f) => f.id === v);
}

/** The plan from the entitlement, unless the server's quota said otherwise (it decides). */
export function planOf(ent: { premium: boolean; cofounder: boolean }, server?: StampPlan | null): StampPlan {
  if (server === "free" || server === "first" || server === "cofounder") return server;
  return ent.cofounder ? "cofounder" : ent.premium ? "first" : "free";
}

/** May this plan finish a stamp with this filter (the server's private.stamp_filter_allowed). */
export function filterAllowed(plan: StampPlan, filter: PressFilter): boolean {
  const f = PRESS_FILTERS.find((x) => x.id === filter);
  return !!f && f.level <= levelOf(plan);
}

/** The filter row a plan sees: Gilt only for a Cofounder (the prototype hides it from everyone
    else); First Class filters stay visible to Free with locked: true (the gold "1ST" badge, and
    choosing one turns the button into "Keep it with First Class →"). */
export function filtersFor(plan: StampPlan): { id: PressFilter; level: 0 | 1 | 2; locked: boolean }[] {
  return PRESS_FILTERS.filter((f) => f.level < 2 || plan === "cofounder").map((f) => ({ ...f, locked: f.level > levelOf(plan) }));
}

const segmenter: { segment(s: string): Iterable<unknown> } | null = (() => {
  try {
    const S = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment(s: string): Iterable<unknown> } }).Segmenter;
    return S ? new S("und", { granularity: "grapheme" }) : null;
  } catch {
    return null;
  }
})();

/** grapheme clusters where the engine can count them, code points otherwise */
export function graphemes(s: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(s), (g) => (g as { segment: string }).segment);
  return Array.from(s);
}

/** The #topic as it is sent: no leading "#" (either width), spaces collapsed, trimmed, at most
    24 graphemes. "" when nothing is left. Shaping only: what may be said is the server's call. */
export function normalizeTopic(raw: string): string {
  const s = String(raw ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/^[#＃\s]+/u, "")
    .replace(/\s+/gu, " ")
    .trim();
  const g = graphemes(s);
  return (g.length > TOPIC_MAX ? g.slice(0, TOPIC_MAX).join("") : s).trim();
}

/** "THIS IS n OF 3 FREE" above the button: n, or null when the line isn't drawn (a paid plan, an
    edit, a quota not known yet, or none left — the quota sheet speaks then). */
export function freeOrdinal(plan: StampPlan, made: number | null, editing: boolean): number | null {
  if (plan !== "free" || editing || made == null || !Number.isFinite(made)) return null;
  const n = Math.max(0, Math.floor(made)) + 1;
  return n <= FREE_STAMPS ? n : null;
}

/* ── my_stamp_quota() ─────────────────────────────────────────────────────────────────────── */

export type StampQuota = {
  plan: StampPlan;
  /** every stamp made, deleted ones included */
  made: number;
  /** 3 for free, null otherwise (never print the silent cap) */
  cap: number | null;
  remaining: number | null;
  canMake: boolean;
  why: "quota" | "cap" | "account" | null;
  /** new stamps will be gold-edged (a Cofounder) */
  gold: boolean;
};

/** One row of my_stamp_quota() (an array of one, or the row) → the quota, or null when it can't
    be read (then the feature stays hidden: 0038 not run). */
export function parseQuota(data: unknown): StampQuota | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const plan = r.plan === "first" || r.plan === "cofounder" || r.plan === "free" ? r.plan : null;
  if (!plan) return null;
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
  const made = num(r.made) ?? 0;
  return {
    plan,
    made,
    cap: num(r.cap),
    remaining: num(r.remaining),
    canMake: r.can_make === true,
    why: r.why === "quota" || r.why === "cap" || r.why === "account" ? r.why : null,
    gold: r.gold === true || plan === "cofounder",
  };
}

/* ── POST /api/stamp-check ────────────────────────────────────────────────────────────────── */

export type PressedStamp = {
  id: string;
  topic: string;
  category: PressCategory;
  filter: PressFilter;
  gold: boolean;
  imagePath: string | null;
  version: number;
  createdAt: string | null;
};

export type RejectReason = "minors" | "nudity" | "violence" | "hate" | "contact" | "ad" | "words" | "unsafe";

export type CheckOutcome =
  | { kind: "approved"; stamp: PressedStamp; plan: StampPlan | null }
  | { kind: "rejected"; reason: RejectReason; field: "image" | "topic"; plan: StampPlan | null }
  /** 402: free has made its three / a First Class filter on Free / editing on Free */
  | { kind: "quota" | "filter" | "edit"; plan: StampPlan | null }
  /** 429: the silent monthly or hourly limit */
  | { kind: "cap" }
  | { kind: "suspended" }
  | { kind: "auth" }
  | { kind: "not_found" }
  /** 400 / 413: the phone sent something the server can't take (a bug here, not the person) */
  | { kind: "bad"; error: string }
  /** 503 (no key, the model or storage failed) or no answer at all: keep it as a draft */
  | { kind: "unavailable" };

const REASONS: readonly RejectReason[] = ["minors", "nudity", "violence", "hate", "contact", "ad", "words", "unsafe"];

function asPlan(v: unknown): StampPlan | null {
  return v === "free" || v === "first" || v === "cofounder" ? v : null;
}

/** The stamp as the server answered it, or null if it isn't one. */
export function parseStamp(v: unknown): PressedStamp | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>;
  if (typeof s.id !== "string" || !s.id) return null;
  if (!isCategory(s.category) || !isFilter(s.filter)) return null;
  return {
    id: s.id.toLowerCase(),
    topic: typeof s.topic === "string" ? s.topic : "",
    category: s.category,
    filter: s.filter,
    gold: s.gold === true,
    imagePath: typeof s.image_path === "string" && s.image_path ? s.image_path : null,
    version: typeof s.version === "number" && s.version >= 1 ? Math.floor(s.version) : 1,
    createdAt: typeof s.created_at === "string" ? s.created_at : null,
  };
}

/** An HTTP status and its parsed JSON body (null when there was none) → what the page shows.
    Anything unexpected is "unavailable": the stamp is kept as a draft, never lost, never
    approved by default. */
export function parseCheck(status: number, body: unknown): CheckOutcome {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const plan = asPlan(b.plan);
  if (status === 200) {
    if (b.ok === true) {
      const stamp = parseStamp(b.stamp);
      return stamp ? { kind: "approved", stamp, plan } : { kind: "unavailable" };
    }
    if (b.ok === false) {
      const reason = REASONS.includes(b.reason as RejectReason) ? (b.reason as RejectReason) : "unsafe";
      const field = b.field === "topic" ? "topic" : "image";
      return { kind: "rejected", reason, field, plan };
    }
    return { kind: "unavailable" };
  }
  const error = typeof b.error === "string" ? b.error : "";
  if (status === 402) {
    if (error === "filter" || error === "edit") return { kind: error, plan };
    return { kind: "quota", plan };
  }
  if (status === 429) return { kind: "cap" };
  if (status === 403 && error === "account") return { kind: "auth" }; // a guest (0039); the press page gates guests first
  if (status === 403) return { kind: "suspended" };
  if (status === 401) return { kind: "auth" };
  if (status === 404) return { kind: "not_found" };
  if (status === 400 || status === 413) return { kind: "bad", error: error || String(status) };
  return { kind: "unavailable" };
}

/** The request body (stamp-check's contract). image: base64 JPEG 640 × 704 (10:11), or null for a rename
    of an approved stamp (replace set). */
export function checkBody(input: { image: string | null; topic: string; category: PressCategory; filter: PressFilter; replace?: string | null }): string {
  const o: Record<string, string> = { topic: normalizeTopic(input.topic), category: input.category, filter: input.filter };
  if (input.image) o.image = input.image;
  if (input.replace) o.replace = input.replace;
  return JSON.stringify(o);
}

/* ── local drafts ─────────────────────────────────────────────────────────────────────────── */

/** A stamp the server couldn't check (503, offline), kept on this phone only: the filtered JPEG
    that would have been sent, and what it was to be called. Never uploaded until it is checked. */
export type PressDraft = {
  id: string;
  /** file:// of the filtered 640 × 704 JPEG, inside the app's documents */
  image: string;
  topic: string;
  category: PressCategory;
  filter: PressFilter;
  /** epoch ms */
  at: number;
};

export const MAX_DRAFTS = 12;

/** The index after adding one (newest first, at most MAX_DRAFTS: the oldest fall off and are
    returned so their files can be removed). */
export function addDraft(list: readonly PressDraft[], d: PressDraft): { list: PressDraft[]; dropped: PressDraft[] } {
  const next = [d, ...list.filter((x) => x.id !== d.id)];
  return { list: next.slice(0, MAX_DRAFTS), dropped: next.slice(MAX_DRAFTS) };
}

export function parseDrafts(raw: string | null): PressDraft[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter(
      (d): d is PressDraft =>
        !!d && typeof d.id === "string" && typeof d.image === "string" && typeof d.topic === "string" && isCategory(d.category) && isFilter(d.filter) && typeof d.at === "number",
    );
  } catch {
    return [];
  }
}

/* ── the page's state machine (what Swift is told to draw) ────────────────────────────────── */

export type PressPhase = "editing" | "checking" | "rejected" | "approved" | "unavailable" | "quota" | "cap" | "problem";

/** What a check's outcome turns the page into. "filter"/"edit" go back to editing with the
    First Class door (the plan the server named wins); auth/suspended/bad/not_found are a
    problem card (the stamp is still kept as a draft by the caller where it makes sense). */
export function phaseFor(o: CheckOutcome): PressPhase {
  switch (o.kind) {
    case "approved": return "approved";
    case "rejected": return "rejected";
    case "quota": return "quota";
    case "cap": return "cap";
    case "unavailable": return "unavailable";
    case "filter":
    case "edit": return "editing";
    default: return "problem";
  }
}

/** Whether an outcome should leave the stamp as a local draft (so nothing pressed is lost). */
export function keepsDraft(o: CheckOutcome): boolean {
  return o.kind === "unavailable" || o.kind === "cap" || o.kind === "auth";
}
