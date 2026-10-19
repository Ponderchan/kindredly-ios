import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KMyLettersView, type KMyLettersCard, type KMyLettersFace } from "../../../modules/kindredly-ui/src/MyLetters";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { fetchMyWriting, type WritingRow } from "../../lib/aura";
import { fetchThreads, withdrawLetter, type ThreadSummary } from "../../lib/db";
import { deleteDraft, loadDrafts, type Draft } from "../../lib/drafts";
import { faceRecord, useFaceSources, type FaceInput } from "../../lib/faces";
import { useMemberStamps } from "../../lib/member-marks";
import { getStamp, sname } from "../../data/stamps";
import { buildLetterCards, buildMyLettersView } from "./letters-model";
import "../../data/strings-me4a";
import "../../data/strings-step5-kitrn";

/* MY LETTERS IN SWIFTUI (Me 4a, Prompt 8): one Host, holding
   KMyLettersView. The reads are the React Native page's (fetchMyWriting,
   fetchThreads, loadDrafts; a failed read keeps what was shown), done again
   each time the page comes back into view so a draft saved meanwhile shows.
   The cards come from letters-model (the same rules as the React Native
   page and Me's letters peek), words and all (buildMyLettersView).

   Swift owns the filter and manage mode. A tap reports the card's id and
   this file opens its room, chat or draft; a × reports the id and this
   file asks first with the React Native page's own Alert before anything
   is withdrawn or deleted.

   `demo` (src/app/dev/me4a-fc.tsx only) draws the page from given rows
   and never reads or writes anything. */

export type MyLettersDemo = { letters: WritingRow[]; threads: ThreadSummary[]; drafts: Draft[] };

const NO_FACE: KMyLettersFace = { kind: "placeholder", uri: "", key: "", overscan: 0, mask: 0 };

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function MyLettersNative({ demo }: { demo?: MyLettersDemo }) {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);

  const [letters, setLetters] = useState<WritingRow[] | null>(demo ? demo.letters : null);
  const [threads, setThreads] = useState<ThreadSummary[]>(demo ? demo.threads : []);
  const [drafts, setDrafts] = useState<Draft[]>(demo ? demo.drafts : []);
  // (the dev page remounts this with a key to switch its demo rows)

  useFocusEffect(
    useCallback(() => {
      if (demo) return;
      let alive = true;
      fetchMyWriting()
        .then((m) => alive && setLetters((cur) => (m ? m.letters : (cur ?? []))))
        .catch((e) => console.warn("[my-letters] letters:", e));
      fetchThreads()
        .then((th) => alive && th && setThreads(th))
        .catch((e) => console.warn("[my-letters] threads:", e));
      loadDrafts()
        .then((d) => alive && setDrafts(d))
        .catch((e) => console.warn("[my-letters] drafts:", e));
      return () => {
        alive = false;
      };
    }, [demo]),
  );

  const facts = useMemo(() => buildLetterCards(letters, threads, drafts), [letters, threads, drafts]);
  const view = useMemo(
    () =>
      buildMyLettersView(facts, {
        t,
        upper: (s) => s.toLocaleUpperCase(),
        stamp: (id) => {
          const s = getStamp(id);
          return { hex: s?.color ?? "", name: s ? sname(s.name) : "" };
        },
      }),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [facts, lang],
  );

  const faceInputs = useMemo(() => {
    const o: Record<string, FaceInput> = {};
    for (const c of view.cards) if (c.face) o[c.id] = c.face;
    return o;
  }, [view.cards]);
  const faces = useFaceSources(faceInputs);
  // C2: the replier's stamp when they are a member (the small rule at 22; none once gone)
  const stampOf = useMemberStamps(useMemo(() => view.cards.map((c) => c.face?.seed), [view.cards]));

  const cards = useSameContent<KMyLettersCard[]>(
    useMemo(
      () =>
        view.cards.map((c) => {
          const f = faces[c.id];
          const r = f ? faceRecord(f) : null;
          const stamp = c.face && !c.face.gone ? stampOf(c.face.seed) : "";
          return { ...c, face: r ? { kind: r.kind, uri: r.uri, key: r.key, overscan: r.overscan, mask: r.mask, stamp } : NO_FACE };
        }),
      [view.cards, faces, stampOf],
    ),
  );
  const strings = useSameContent(view.strings);
  const filters = useSameContent(view.filters);
  const loaded = letters != null;
  const rev = useRev(strings, filters, cards, loaded);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);
  const write = useCallback(() => router.push("/compose"), [router]);
  const open = useCallback(
    (id: string) => {
      const c = facts.find((x) => x.id === id);
      if (c?.opens) router.push(c.opens as Href);
    },
    [facts, router],
  );
  const remove = useCallback(
    (id: string) => {
      const c = facts.find((x) => x.id === id);
      if (!c) return;
      Alert.alert(t(c.kind === "draft" ? "ml.rm.draftTitle" : "ml.rm.title"), t(c.kind === "draft" ? "ml.rm.draftBody" : "ml.rm.body"), [
        { text: t("ml.rm.keep"), style: "cancel" },
        {
          text: t("ml.rm.remove"),
          style: "destructive",
          onPress: async () => {
            if (demo) return; // the dev page never writes
            try {
              if (c.kind === "draft") setDrafts(await deleteDraft(c.id));
              else if (await withdrawLetter(c.id)) setLetters((ls) => (ls ?? []).filter((l) => l.id !== c.id));
              else Alert.alert(t("ml.rm.failTitle"), t("ml.rm.failBody"));
            } catch (e) {
              console.warn("[my-letters] remove:", e);
              Alert.alert(t("ml.rm.failTitle"), t("ml.rm.failBody"));
            }
          },
        },
      ]);
    },
    [facts, demo],
  );

  return (
    <SurfaceHost>
      <KMyLettersView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        filters={filters}
        cards={cards}
        loaded={loaded}
        onBack={back}
        onWrite={write}
        onOpen={open}
        onRemove={remove}
      />
    </SurfaceHost>
  );
}
