/* THE STAMP COLLECTION: Me › Stamps and the album (custom stamps, the owner's final Prompt 1 /
   Prompt 2 and the decisions of 2026-10-19 evening; contract .claude/custom-stamps/CONTRACT.md §7
   B2–B3). Pure: words, counts and colours for the Swift card (KStampsCard) and the album
   (KStampAlbumScreen); the facts come from useStampCollection (lib/custom-stamps, lib/stamp-press,
   lib/aura). Node-tested: stamp-collection.test.ts.

   Rules that are the owner's, not taste:
     · MADE BY YOU exists only when the press is in this binary AND my_stamp_quota answered (D10).
     · Free's quota line is "n OF 3 FREE" with n = stamps made (deleted ones count: the server says
       so); First Class / Cofounder read "UNLIMITED" in the gold ink. Free at 3/3 (why "quota")
       turns the blank stamp into the small First Class card.
     · FROM STRANGERS empty: one light line (cs2.me.strangersEmpty), never hidden.
     · YOUR STAMPS is the official stamps only (a "c:" id never counts there); empty: three dashed
       slots in three category colours + the owner's line + "Write a letter →".
     · "Open the album →" is hidden while all three areas are empty.
     · Numbers are real: no "×n" is printed (this phone doesn't know how many times an official
       stamp was used, only when last), no progress counts in the album. */

import type { KAlbumActionKey, KAlbumCell, KAlbumSection, KAlbumStrings, KMeStamps } from "../../../modules/kindredly-ui/src/Me";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

export type CollectionFormat = {
  t: TFn;
  /** "Oct 19", in the reader's language */
  dateShort: (iso: string) => string;
  upper: (s: string) => string;
  lower: (s: string) => string;
};

type Quota = { plan: "free" | "first" | "cofounder"; made: number; cap: number | null; why: "quota" | "cap" | null };

export type MineFact = {
  id: string;
  topic: string;
  hex: string;
  state: "ok" | "pending" | "rejected" | "removed" | "deleted" | "hidden" | "blank";
  letters: number;
  createdAt: string;
};

export type KeptFact = {
  id: string;
  topic: string;
  hex: string;
  state: MineFact["state"];
  keptAt: string;
  /** "SUNDAY KITE" / "No. 7273" (the who book, upper case) */
  from: string;
};

export type UsedFact = {
  id: string;
  /** the stamp's name in the reader's language */
  name: string;
  hex: string;
  /** the last letter under it (ISO), null when unknown */
  at: string | null;
};

export type CollectionFacts = {
  /** the press is in this binary (KStampPressView) */
  press: boolean;
  /** my_stamp_quota(); null = 0038 not run / offline / signed out */
  quota: Quota | null;
  /** my stamps, newest first */
  mine: readonly MineFact[];
  /** strangers' stamps I kept, newest first */
  kept: readonly KeptFact[];
  /** official stamps used, newest first ("c:" ids are dropped here) */
  used: readonly UsedFact[];
  /** uuids made in the last 24 hours */
  fresh: ReadonlySet<string>;
  /** the stamp the press just approved, once (its "c:<uuid>"), or null */
  ready: string | null;
  /** three category colours for the empty YOUR STAMPS */
  slots: readonly string[];
};

const isCustom = (id: string) => id.startsWith("c:");

/** The feature's doors are open (D10). */
export const madeOpen = (f: Pick<CollectionFacts, "press" | "quota">): boolean => f.press && !!f.quota;

const tag = (topic: string, fmt: CollectionFormat) => (topic ? `#${fmt.lower(topic)}` : "");

/** what shows under one of my stamps: its #topic, or why there is none */
function mineUnder(m: MineFact, fmt: CollectionFormat): { text: string; note: boolean } {
  if (m.state === "removed") return { text: fmt.t("cs2.me.takenDown"), note: true };
  if (m.state === "pending") return { text: fmt.t("cs2.col.checking"), note: true };
  return { text: tag(m.topic, fmt), note: false };
}

const mineA11y = (m: MineFact, fmt: CollectionFormat): string => {
  const base = m.topic && m.state !== "removed" ? fmt.t("cs2.use.a11yStamp", { topic: m.topic }) : fmt.t("cs2.use.a11yBlank");
  const u = mineUnder(m, fmt);
  return u.note ? `${base}, ${u.text}` : base;
};

/** Me › Stamps, as KMeView's `stamps` record. */
export function buildStampsCard(f: CollectionFacts, fmt: CollectionFormat): KMeStamps {
  const { t } = fmt;
  const open = madeOpen(f);
  const q = f.quota;
  const used = f.used.filter((u) => !isCustom(u.id));
  const yours = used.slice(0, 3);
  const madeAny = open && f.mine.length > 0;
  return {
    label: t("cs2.me.yours"),
    count: t("me.stamps.count", { n: used.length }),
    cells: yours.map((u) => {
      const date = u.at ? fmt.upper(fmt.dateShort(u.at)) : "";
      return { id: u.id, date: fmt.lower(u.name), a11y: [u.name, date].filter(Boolean).join(", "), hex: u.hex };
    }),
    emptyText: t("cs2.me.yoursEmpty"),
    emptyCta: t("cs2.me.writeLetter"),
    yoursSlots: [...f.slots].slice(0, 3),
    madeShow: open,
    madeLabel: t("cs2.me.made"),
    madeQuota: !q ? "" : q.plan === "free" ? t("cs2.me.quotaFree", { n: Math.max(0, q.made), cap: q.cap ?? 3 }) : t("cs2.me.unlimited"),
    madeQuotaGold: !!q && q.plan !== "free",
    seeAll: open && f.mine.length > 2 ? t("cs2.me.seeAll") : "",
    makeOne: t("cs2.me.makeOne"),
    emptyTitle: t("cs2.me.emptyTitle"),
    emptySub: t("cs2.me.emptySub"),
    makeA11y: t("cs2.use.a11yMake"),
    made: open
      ? f.mine.slice(0, 2).map((m) => {
          const u = mineUnder(m, fmt);
          return { id: m.id, topic: u.note ? "" : u.text, fresh: f.fresh.has(m.id.slice(2)), note: u.note ? u.text : "", a11y: mineA11y(m, fmt) };
        })
      : [],
    newLabel: t("cs2.me.new"),
    full: !!q && q.why === "quota",
    fullTitle: t("cs2.me.fullTitle", { cap: q?.cap ?? 3 }),
    fullSub: t("cs2.me.fullSub"),
    fullCta: t("cs2.me.fullCta"),
    notNow: t("cs2.me.notNow"),
    ready: open && f.ready ? t("cs2.done.toast") : "",
    readyCta: open && f.ready ? t("cs2.done.writeWith") : "",
    readyId: open && f.ready ? f.ready : "",
    strangersLabel: t("cs2.me.strangers"),
    strangersCount: String(f.kept.length),
    strangers: f.kept.slice(0, 3).map((k) => ({
      id: k.id,
      from: k.from ? t("cs2.me.fromName", { name: k.from }) : "",
      a11y: [k.topic && k.state === "ok" ? t("cs2.use.a11yStamp", { topic: k.topic }) : t("cs2.use.a11yBlank"), k.from ? t("cs2.me.fromName", { name: k.from }) : ""].filter(Boolean).join(", "),
    })),
    strangersEmpty: t("cs2.me.strangersEmpty"),
    album: madeAny || f.kept.length > 0 || used.length > 0 ? t("cs2.me.openAlbum") : "",
  };
}

/** The album's sections and words (KStampAlbumView). `hasOriginal(uuid)`: the unfiltered original
    is on this phone (the filter can change). `plan` decides whether editing opens the edit page or
    the First Class door (TS's job, not the sheet's). */
export function buildAlbum(
  f: CollectionFacts,
  fmt: CollectionFormat,
  o: { hasOriginal: (uuid: string) => boolean },
): { strings: KAlbumStrings; sections: KAlbumSection[]; full: boolean; yoursSlots: string[] } {
  const { t } = fmt;
  const open = madeOpen(f);
  const used = f.used.filter((u) => !isCustom(u.id));
  const sections: KAlbumSection[] = [];
  const act = (key: KAlbumActionKey, title: string, style: "ink" | "plain" | "danger" = "plain") => ({ key, title, style });

  if (open || f.mine.length > 0) {
    const cells: KAlbumCell[] = f.mine.map((m) => {
      const u = mineUnder(m, fmt);
      const date = m.createdAt ? fmt.dateShort(m.createdAt) : "";
      const info =
        m.state === "pending"
          ? t("cs2.col.pending", { date })
          : m.state === "removed"
            ? t("cs2.me.takenDown")
            : m.letters === 0
              ? t("cs2.al.madeOnNone", { date })
              : m.letters === 1
                ? t("cs2.al.madeOnOne", { date })
                : t("cs2.al.madeOn", { date, n: m.letters });
      const actions =
        m.state === "ok"
          ? [
              act("write", t("cs2.al.writeWith"), "ink"),
              act("rename", t("cs2.al.rename")),
              act("recolour", t("cs2.al.recolour")),
              ...(o.hasOriginal(m.id.slice(2)) ? [act("filter", t("cs2.al.editFilter"))] : []),
              act("delete", t("cs2.al.delete"), "danger"),
            ]
          : [act("delete", t("cs2.al.delete"), "danger")];
      return { id: m.id, under: u.text, tag: m.state === "ok" || m.state === "pending" ? tag(m.topic, fmt) : "", tagHex: m.hex, info, a11y: mineA11y(m, fmt), actions };
    });
    sections.push({ key: "made", title: `${t("cs2.me.made")} · ${f.mine.length}`, make: open, cells });
  }

  if (f.kept.length) {
    sections.push({
      key: "strangers",
      title: `${t("cs2.me.strangers")} · ${f.kept.length}`,
      make: false,
      cells: f.kept.map((k) => {
        const ok = k.state === "ok";
        const date = k.keptAt ? fmt.dateShort(k.keptAt) : "";
        const info = k.state === "deleted" ? t("cs2.me.tookBack") : k.from ? t("cs2.al.from", { name: k.from, date }) : date;
        return {
          id: k.id,
          under: k.from ? t("cs2.me.fromName", { name: k.from }) : "",
          tag: ok ? tag(k.topic, fmt) : "",
          tagHex: k.hex,
          info,
          a11y: ok && k.topic ? t("cs2.use.a11yStamp", { topic: k.topic }) : t("cs2.use.a11yBlank"),
          actions: [act("remove", t("cs2.al.remove")), ...(ok ? [act("report", t("cs2.al.report"), "danger")] : [])],
        };
      }),
    });
  }

  if (used.length) {
    sections.push({
      key: "yours",
      title: `${t("cs2.me.yours")} · ${used.length}`,
      make: false,
      cells: used.map((u) => ({
        id: u.id,
        under: fmt.lower(u.name),
        tag: u.name ? `#${fmt.lower(u.name)}` : "",
        tagHex: u.hex,
        info: u.at ? t("cs2.col.lastUsed", { date: fmt.dateShort(u.at) }) : "",
        a11y: u.name,
        actions: [act("write", t("cs2.al.writeWith"), "ink")],
      })),
    });
  }

  return {
    strings: {
      title: t("cs2.al.title"),
      back: t("a11y.back"),
      makeOne: t("cs2.me.makeOne"),
      makeA11y: t("cs2.use.a11yMake"),
      fullTitle: t("cs2.me.fullTitle", { cap: f.quota?.cap ?? 3 }),
      fullSub: t("cs2.me.fullSub"),
      fullCta: t("cs2.me.fullCta"),
      notNow: t("cs2.me.notNow"),
      yoursEmpty: used.length ? "" : t("cs2.me.yoursEmpty"),
      yoursCta: t("cs2.me.writeLetter"),
    },
    sections,
    full: !!f.quota && f.quota.why === "quota",
    yoursSlots: [...f.slots].slice(0, 3),
  };
}

/** May this plan change a stamp after it is made (rename, colour, filter)? Free: the First Class door. */
export const canEdit = (q: Quota | null): boolean => !!q && q.plan !== "free";
