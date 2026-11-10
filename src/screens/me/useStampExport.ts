import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Alert } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { t, useLang } from "../../lib/i18n";
import { useEntitlement } from "../../lib/entitlement";
import { exportSheet, exportSticker, myStamps, stampExportAvailable, type StampSource } from "../../lib/stamp-export";
import { STAMP_EXPORT_PAYWALL, exportIntent, exportable, withStampExport, type ExportStamp } from "../../lib/stamp-export-core";
import type { KAlbumSection, KAlbumStrings } from "../../../modules/kindredly-ui/src/Me";
import "../../data/strings-stamp-export"; // sx.*
import "../../data/strings-make-face"; // mf.result.lock (the "1ST" tag)
import "../../data/strings-papers"; // pp.a11y.fc ("First Class", for VoiceOver)

/* THE ALBUM'S TWO EXPORTS (stamp export, 2026-11-10; First Class): "Save as sticker" in a
   stamp's sheet and "Print a sheet" at the right of MADE BY YOU's head. The album's sections,
   words and every other tap stay useStampCollection's; this hook only adds to what that built
   (lib/stamp-export-core withStampExport, pure and tested) and runs the two exports
   (lib/stamp-export).

   - WHERE THEY SHOW. Only on a binary that can export (stampExportAvailable), and only for the
     reader's own stamps that passed the check; "Print a sheet" only while at least one does.
   - WHO MAY. A First Class member exports: the head's action turns into a small spinner and a
     line at the foot says what is being made, then the share sheet. Anyone else goes to
     /paywall?src=stamp_export, and both actions wear the small wax-gold "1ST" (only once the
     membership answer is in and it is no). Membership is the hook Settings reads
     (useEntitlement), refreshed whenever the album regains focus, so a reader who comes back
     from the paywall as a member can export at once. A tap before the answer is in waits for it
     instead of guessing.
   - ONE AT A TIME, and a failure is said: an alert titled with the action's own name
     (sx.sticker.fail / sx.sheet.fail), the reason in the log.

   `source` and `member` are for the dev page (app/dev/stamp-export): sample stamps, and a
   membership it can force either way. */

type Wanted = { kind: "sticker"; id: string } | { kind: "sheet" };

export function useStampExport(o: {
  /** the album as useStampCollection built it */
  album: { strings: KAlbumStrings; sections: KAlbumSection[] };
  /** the reader's own stamps (useStampCollection's `mine`) */
  stamps: readonly ExportStamp[];
  source?: StampSource;
  member?: boolean;
}) {
  const lang = useLang();
  const router = useRouter();
  const ent = useEntitlement();
  const on = stampExportAvailable();
  const premium = o.member ?? ent.premium;
  const settled = o.member !== undefined || ent.settled;
  const refreshEntitlement = ent.refresh;
  const forced = o.member !== undefined;

  const [busy, setBusy] = useState<"" | "sticker" | "sheet">("");
  /** the action tapped before the membership answer was in */
  const [waiting, setWaiting] = useState<Wanted | null>(null);
  const busyRef = useRef(false);

  const stampsRef = useRef(o.stamps);
  stampsRef.current = o.stamps;
  const own = useMemo(() => myStamps(() => stampsRef.current), []);
  const source = o.source ?? own;

  // First Class may have changed while the album was covered (the paywall)
  useFocusEffect(
    useCallback(() => {
      if (on && !forced) refreshEntitlement().catch((e) => console.warn("[stamp-export] entitlement refresh:", e));
    }, [on, forced, refreshEntitlement]),
  );

  const ids = useMemo(() => new Set(exportable(o.stamps).map((s) => s.id)), [o.stamps]);
  const album = useMemo(
    () => withStampExport(o.album, { on, ids, premium, settled }, t),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [o.album, on, ids, premium, settled, lang],
  );

  const run = useCallback(
    async (want: Wanted) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(want.kind);
      AccessibilityInfo.announceForAccessibility(t(want.kind === "sticker" ? "sx.sticker.making" : "sx.sheet.making"));
      try {
        // the file is made: stop saying so behind the share sheet (the export itself ends when it closes)
        const made = () => setBusy("");
        if (want.kind === "sticker") await exportSticker(want.id, source, made);
        else await exportSheet(source, made);
      } catch (e) {
        console.warn(`[stamp-export] the ${want.kind} wasn't exported:`, e);
        if (want.kind === "sticker") Alert.alert(t("sx.sticker"), t("sx.sticker.fail"));
        else Alert.alert(t("sx.sheet"), t("sx.sheet.fail"));
      } finally {
        busyRef.current = false;
        setBusy("");
      }
    },
    [source],
  );

  const tap = useCallback(
    (want: Wanted) => {
      if (!on) return;
      const intent = exportIntent({ settled, premium, busy: busyRef.current });
      if (intent === "export") void run(want);
      else if (intent === "paywall") router.push(STAMP_EXPORT_PAYWALL as Href);
      else if (intent === "wait") {
        setWaiting(want);
        refreshEntitlement().catch((e) => console.warn("[stamp-export] entitlement refresh:", e));
      }
    },
    [on, settled, premium, run, router, refreshEntitlement],
  );

  // the tap that waited: once the answer is in, do what it would have done
  useEffect(() => {
    if (!waiting || !settled) return;
    const want = waiting;
    setWaiting(null);
    if (premium) void run(want);
    else router.push(STAMP_EXPORT_PAYWALL as Href);
  }, [waiting, settled, premium, run, router]);

  const onSticker = useCallback((id: string) => tap({ kind: "sticker", id }), [tap]);
  const onSheet = useCallback(() => tap({ kind: "sheet" }), [tap]);

  const making = busy || waiting?.kind || "";
  return {
    /** this binary can export at all (false: nothing was added, and nothing new is sent to Swift) */
    on,
    /** the album's strings and sections with the two actions added (the same objects when there is nothing to add) */
    strings: album.strings,
    sections: album.sections,
    /** an export is being made (or its tap is waiting for the membership answer): the head's spinner */
    busy: !!making,
    /** the line at the foot while it is made ("" otherwise) */
    line: making === "sticker" ? t("sx.sticker.making") : making === "sheet" ? t("sx.sheet.making") : "",
    onSticker,
    onSheet,
  };
}
