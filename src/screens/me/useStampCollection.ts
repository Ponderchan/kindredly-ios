import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Alert } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { t, useLang } from "../../lib/i18n";
import { dShort } from "../../lib/format";
import { STAMP_CATEGORIES, getStamp, sname } from "../../data/stamps";
import "../../data/strings-stamps2";
import { readUsedStamps, type UsedStamp } from "../../lib/aura";
import { useWhoBook } from "../../lib/who";
import { deleteCustomStamp, pressInReview, reportStampFlow, reviewOf, unkeepCustomStamp, useKeptStamps, useMyCustomStamps } from "../../lib/custom-stamps";
import { isCustomStampId } from "../../lib/custom-stamps-core";
import { listDrafts, newStampIds, originalFor, retryDraft, takePressedToast, usePressedStamp } from "../../lib/stamp-press";
import { stampPressAvailable } from "../stamp-press/StampPressNative";
import { buildAlbum, buildStampsCard, canEdit, type CollectionFacts, type CollectionFormat } from "./stamp-collection";
import type { KAlbumActionKey, KMeStampsAction } from "../../../modules/kindredly-ui/src/Me";

/* THE STAMP COLLECTION'S FACTS AND TAPS (custom stamps, contract §7 B2–B5), for Me › Stamps
   (MeNative) and the album (app/album.tsx). The words are stamp-collection.ts's (pure, tested).

     · my stamps + quota (useMyCustomStamps), the strangers' I kept (useKeptStamps), the official
       ones I used (lib/aura readUsedStamps, on focus), the "new" ids (24 h), the ready bar (once:
       takePressedToast after an approval while this screen is in front)
     · DRAFTS (B5): on focus, with a live quota, each kept draft is sent again, one at a time,
       "in review" in the album while it is checked (lib/custom-stamps pressInReview; a draft
       from before 2026-10-20, without a uuid id, goes through lib/stamp-press retryDraft); an
       approval comes back through notePressed like any other.
     · IN REVIEW (owner, 2026-10-20): a stamp pressed here is in the album at once, labelled, until
       the check answers; refused ones say so, with Try another photo and Delete.
     · taps: the blank stamp → /stamp-press?from=me|album; First Class → the paywall; a stamp or
       See all → /album (focused on its section); the sheet's actions (write, rename, recolour,
       filter, delete, remove, report). Editing on Free opens the First Class door
       (cs2.al.editFc); Delete asks first (cs2.al.deleteTitle / deleteBody). */

const SLOTS = ["confessions", "latenights", "becoming"].map((id) => STAMP_CATEGORIES.find((c) => c.id === id)?.color ?? "#8A86A3");

let retrying = false;
async function retryDrafts(gold: boolean): Promise<void> {
  if (retrying) return;
  retrying = true;
  try {
    const drafts = await listDrafts();
    for (const d of drafts) {
      const out = isCustomStampId(`c:${d.id}`)
        ? await pressInReview({ uuid: d.id, image: d.image, topic: d.topic, category: d.category, filter: d.filter, gold, fromDraft: true }).done
        : await retryDraft(d);
      // the server still can't check: the rest would answer the same, so stop here for now
      if (out.kind === "unavailable" || out.kind === "auth") break;
    }
  } catch (e) {
    console.warn("[stamps] retrying the drafts failed", e);
  } finally {
    retrying = false;
  }
}

export function useStampCollection(o: { where: "me" | "album" }) {
  const lang = useLang();
  const router = useRouter();
  const press = stampPressAvailable();
  const my = useMyCustomStamps();
  const keptStore = useKeptStamps();
  const pressed = usePressedStamp();

  const [used, setUsed] = useState<UsedStamp[]>([]);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const [ready, setReady] = useState<string | null>(null);
  const [line, setLine] = useState("");
  const focused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      let alive = true;
      readUsedStamps()
        .then((u) => alive && setUsed(u))
        .catch((e) => console.warn("[stamps] the used stamps weren't read:", e));
      newStampIds().then((s) => alive && setFresh(s));
      // an approval that came while another screen was in front: its bar shows now, once
      if (o.where === "me") {
        const s = takePressedToast();
        if (s) setReady(`c:${s.id.toLowerCase()}`);
      }
      return () => {
        alive = false;
        focused.current = false;
      };
    }, [o.where]),
  );

  // the ready bar, once, after an approval, if Me is in front (Me only: the album shows the stamp
  // itself); otherwise the focus above takes it
  useEffect(() => {
    if (!pressed) return;
    newStampIds().then(setFresh);
    if (o.where !== "me" || !focused.current) return;
    const s = takePressedToast();
    if (s) setReady(`c:${s.id.toLowerCase()}`);
  }, [pressed?.at, o.where]); // eslint-disable-line react-hooks/exhaustive-deps

  // the drafts the server couldn't check, sent again once the quota answers (0038 is there)
  const quotaLive = !!my.quota;
  const gold = !!my.quota?.gold;
  useEffect(() => {
    if (quotaLive && press) void retryDrafts(gold);
  }, [quotaLive, press]); // eslint-disable-line react-hooks/exhaustive-deps

  // the toast line goes after a moment
  useEffect(() => {
    if (!line) return;
    AccessibilityInfo.announceForAccessibility(line);
    const tm = setTimeout(() => setLine(""), 2600);
    return () => clearTimeout(tm);
  }, [line]);

  const book = useWhoBook({ uids: keptStore.stamps.map((k) => k.owner) });

  const facts = useMemo<CollectionFacts>(
    () => ({
      press,
      quota: my.quota,
      mine: my.stamps.map((m) => ({ id: m.id, topic: m.topic, hex: m.hex, state: m.state, letters: m.letters, createdAt: m.createdAt, review: reviewOf(m.id) })),
      kept: keptStore.stamps.map((k) => ({ id: k.id, topic: k.topic, hex: k.hex, state: k.state, keptAt: k.keptAt, from: k.owner ? book.name(k.owner, { upper: true, compact: true }) : "" })),
      used: used.map((u) => {
        const st = getStamp(u.id);
        return { id: u.id, name: st ? sname(st.name) : "", hex: st?.color ?? "", at: u.at };
      }),
      fresh,
      ready,
      slots: SLOTS,
    }),
    // lang: the stamps' names
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [press, my.quota, my.stamps, keptStore.stamps, book, used, fresh, ready, lang],
  );

  const fmt = useMemo<CollectionFormat>(
    () => ({ t, dateShort: (iso) => dShort(iso), upper: (s) => s.toLocaleUpperCase(), lower: (s) => s.toLocaleLowerCase() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );

  const card = useMemo(() => buildStampsCard(facts, fmt), [facts, fmt]);
  const album = useMemo(() => buildAlbum(facts, fmt, { hasOriginal: (u) => !!originalFor(u) }), [facts, fmt]);

  const factsRef = useRef(facts);
  factsRef.current = facts;
  const myRef = useRef(my);
  myRef.current = my;

  const go = useCallback((href: Href) => router.push(href), [router]);
  const toPaywall = useCallback(() => go("/paywall?src=stamps" as Href), [go]);
  const toPress = useCallback(() => go(`/stamp-press?from=${o.where}` as Href), [go, o.where]);
  const write = useCallback((id?: string) => go((id ? { pathname: "/compose", params: { stamp: id } } : "/compose") as Href), [go]);
  const toAlbum = useCallback((focus = "") => go((focus ? { pathname: "/album", params: { focus } } : "/album") as Href), [go]);

  /** Me › Stamps' taps */
  const onCard = useCallback(
    (action: KMeStampsAction, id: string) => {
      switch (action) {
        case "make":
          toPress();
          return;
        case "fullCta":
          toPaywall();
          return;
        case "seeAll":
          toAlbum("made");
          return;
        case "album":
          toAlbum();
          return;
        case "ready":
          setReady(null);
          write(id || undefined);
          return;
        case "stamp": {
          const f = factsRef.current;
          toAlbum(f.mine.some((m) => m.id === id) ? "made" : f.kept.some((k) => k.id === id) ? "strangers" : "yours");
          return;
        }
      }
    },
    [toPress, toPaywall, toAlbum, write],
  );

  /** The album sheet's actions */
  const onAlbum = useCallback(
    (id: string, action: KAlbumActionKey) => {
      const m = myRef.current.stamps.find((x) => x.id === id);
      switch (action) {
        case "write":
          write(id);
          return;
        case "rename":
        case "recolour":
        case "filter": {
          if (!m) return;
          if (!canEdit(myRef.current.quota)) {
            Alert.alert(t("cs2.al.editFc"), undefined, [
              { text: t("cs2.me.notNow"), style: "cancel" },
              { text: t("cs2.me.fullCta"), onPress: toPaywall },
            ]);
            return;
          }
          go({ pathname: "/stamp-edit", params: { id: m.uuid, topic: m.topic, category: m.category, filter: m.filter, image: m.url ?? "" } } as Href);
          return;
        }
        case "retry":
          toPress();
          return;
        case "delete":
          // one still in review here never left this phone (no letter carries it): no question
          if (reviewOf(id)) {
            void deleteCustomStamp(id).then((done) => setLine(done ? t("cs2.col.deleted") : t("cs2.col.failed")));
            return;
          }
          Alert.alert(t("cs2.al.deleteTitle"), t("cs2.al.deleteBody"), [
            { text: t("cs2.al.cancel"), style: "cancel" },
            {
              text: t("cs2.al.delete"),
              style: "destructive",
              onPress: () => {
                void deleteCustomStamp(id).then((done) => {
                  setLine(done ? t("cs2.col.deleted") : t("cs2.col.failed"));
                  void myRef.current.refresh();
                });
              },
            },
          ]);
          return;
        case "remove":
          void unkeepCustomStamp(id).then((done) => setLine(done ? t("cs2.col.removed") : t("cs2.col.failed")));
          return;
        case "report":
          void reportStampFlow(id).then((l) => l && setLine(l));
          return;
      }
    },
    [go, write, toPaywall, toPress],
  );

  // mine: the reader's own stamps as they are (the album's export reads them: screens/me/useStampExport)
  return { card, album, line, onCard, onAlbum, toPress, toPaywall, write: () => write(), quota: my.quota, mine: my.stamps };
}
