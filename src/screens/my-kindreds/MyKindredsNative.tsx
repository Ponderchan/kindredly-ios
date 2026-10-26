import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KMyKindredsView, type KMyKindredCard } from "../../../modules/kindredly-ui/src/MyKindreds";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { dShort, listWhen } from "../../lib/format";
import { fetchThreadsResult, readThreadsCache, type ThreadSummary } from "../../lib/db";
import { readRoomSeen } from "../../lib/room-seen";
import { faceRecord, useFaceSources, type FaceInput } from "../../lib/faces";
import { useMemberStamps } from "../../lib/member-marks";
import { useBirdImageRef } from "../../lib/bird-images";
import { buildMyKindredsView } from "./my-kindreds-model";
import "../../data/strings-my-kindreds"; // mk.empty
import "../../data/strings-a11y-chat"; // kd.unreadA11y
import "../../data/strings-step5-kitrn"; // a11y.back

/* MY KINDREDS IN SWIFTUI (owner, 2026-10-27: a new page that lists ONLY
   kindreds, as signed cards): one Host holding KMyKindredsView, behind the
   "mykindreds" switch (app/my-kindreds, NativeSurface in mount mode). The
   React Native fallback is the old numbered sheet, unchanged.

   The reads: the kept list at once, then the network (a failed read keeps
   what was shown; a guest's "no session" is a real, empty answer), and the
   room-seen ledger for the unread badges — again each time the page comes
   back into view, so a room just read loses its badge. The words are
   my-kindreds-model's; the faces are lib/faces' (a made face too), each
   member's in the gold stamp; Wren over the empty line is her own
   snapshot. A tap opens that kindred's room. */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function MyKindredsNative() {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);

  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [ledger, setLedger] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      readThreadsCache()
        .then((c) => alive && c && setThreads((cur) => cur ?? c))
        .catch((e) => console.warn("[my-kindreds] kept list:", e));
      fetchThreadsResult()
        .then((r) => {
          if (!alive) return;
          if (r.status === "ok") {
            setThreads(r.threads);
            setFailed(false);
          } else if (r.reason === "no-session") {
            // a real answer: nobody is signed in, so there is nobody to list
            setThreads([]);
            setFailed(false);
          } else {
            console.log(`[my-kindreds] the list couldn't be read (${r.reason}); keeping what's shown`);
            setFailed(true);
          }
        })
        .catch((e) => {
          console.warn("[my-kindreds] list:", e);
          if (alive) setFailed(true);
        });
      readRoomSeen()
        .then((l) => alive && setLedger(l))
        .catch((e) => console.warn("[my-kindreds] room-seen:", e));
      return () => {
        alive = false;
      };
    }, []),
  );

  const view = useMemo(
    () =>
      buildMyKindredsView(
        { threads, failed, ledger },
        // the chip's day as the ceremony stamps it; the time as the Kindreds tab's rows show it
        { t, chipDay: (ms) => dShort(ms).toUpperCase(), when: (ms) => listWhen(ms) },
      ),
    // lang: every word is t()'s, every date the locale's
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threads, failed, ledger, lang],
  );

  const faceInputs = useMemo(() => {
    const o: Record<string, FaceInput> = {};
    for (const c of view.cards) o[c.id] = c.face;
    return o;
  }, [view.cards]);
  const faces = useFaceSources(faceInputs);
  /* a member kindred's face is a gold perforated stamp (C2) */
  const stampOf = useMemberStamps(useMemo(() => view.cards.map((c) => c.other), [view.cards]));
  const bird = useBirdImageRef("content");

  const cards = useSameContent<KMyKindredCard[]>(
    useMemo(
      () =>
        view.cards.map((c) => {
          const f = faces[c.id];
          const r = f ? faceRecord(f) : null;
          return {
            id: c.id,
            name: c.name,
            // a kindred's face is never a frost: a frost record (none expected) draws the placeholder
            face: r && r.kind !== "frost" ? { kind: r.kind, uri: r.uri, key: r.key, overscan: r.overscan, mask: r.mask, stamp: stampOf(c.other) } : null,
            since: c.since,
            when: c.when,
            youPrefix: c.youPrefix,
            preview: c.preview,
            badge: c.badge,
            a11y: c.a11y,
          };
        }),
      [view.cards, faces, stampOf],
    ),
  );
  const strings = useSameContent(
    useMemo(
      () => ({
        title: view.strings.title,
        backLabel: t("a11y.back"),
        count: view.strings.count,
        lede: view.strings.lede,
        empty: view.strings.empty,
        failed: view.strings.failed,
      }),
      // lang: a11y.back is t()'s
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [view.strings, lang],
    ),
  );
  const rev = useRev(strings, cards, view.state, bird);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);
  const open = useCallback((id: string) => router.push(`/room/${id}` as Href), [router]);

  return (
    <SurfaceHost>
      <KMyKindredsView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        state={view.state}
        bird={bird}
        cards={cards}
        onBack={back}
        onOpen={open}
      />
    </SurfaceHost>
  );
}
