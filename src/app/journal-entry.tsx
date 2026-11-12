import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { LeaveSheet, openLeaveSheet } from "../components/LeaveSheet";
import Svg, { Path, Rect } from "react-native-svg";
import { getLang, t, useLang } from "../lib/i18n";
import { useCornerKey } from "../lib/corner-key";
import { DEMO_TEXT, storeMode } from "../lib/dev-store";
import { PFM } from "../theme/post";
import { useP } from "../lib/theme";
import { SelfCompose, type SelfComposeState } from "../components/SelfCompose";
import { localeTag } from "../lib/format";
import "../data/strings-step5-notes";
import "../data/strings-audit-notes";
import { loadJournal, type JournalEntry } from "../lib/journal";
import { CloseGlyph } from "../components/10a/BackChevron";
import type { KScreenHandle } from "../../modules/kindredly-ui";
import { NativeSurface } from "../components/NativeSurface";
import { NoteComposeNative } from "../screens/journal-entry/NoteComposeNative";

/* The sealed room's desk — its own page again.

   Merging this with the letter desk was tried and pulled: a journal entry and
   a letter are genuinely different objects (this one has a date, a mood and up
   to nine photos; that one has a stamp, a channel and a floor), so a switch
   between them promised an interchangeability the data model can't honour.
   You'd attach three photos, flip to "drift", and they'd have nowhere to go.

   The ambiguous thought — the one that doesn't know yet where it belongs — is
   served instead by letting a finished entry drift LATER, from its own page in
   Sealed. Choosing up front stops being a verdict once you can change it
   afterwards, and a thought that sits for two days before you release it is
   more this product than one you toggled while typing.

   TWO RENDERERS (1.0.7, owner 2026-10-26). NativeSurface picks once, at mount ("journalentry" in
   app_surfaces, the binary having KNoteComposeView, no JS error, no crash strikes):
   - NoteComposeNative: SwiftUI, drawn to the Note Composer Bar design (the ＋ panel, the mood
     capsule and panel, SEAL IT HERE, the seal moment), its state in screens/journal-entry;
   - the React Native page below (this header and components/SelfCompose), as it shipped: the
     remote switch's fallback.
   Both hold their words in `text` here and report what the page holds to the same guard.

   EDITING A SEALED PAGE (owner's audit, 2026-11-10): /journal-entry?edit=<page id>, from the
   journal page's ⋯ (Edit). The page is read first — nothing is drawn but the paper until it is,
   so the composer mounts already holding its words, mood and media — and handed to the SwiftUI
   composer, whose save replaces it (lib/journal updateEntry). A page that isn't there (torn out
   meanwhile) or a sample just goes back. Only the SwiftUI composer can change a page: the React
   Native one would seal a NEW page, so the journal page offers Edit only where the SwiftUI
   composer will be drawn (note-page-model canEditPage), and if this route still lands on the
   fallback with `edit` it goes back rather than write a second page. The guard below asks only
   over real changes (the state reports what changed, not what the page holds), with its own
   sentence. */
export default function JournalEntryRoute() {
  useLang();
  const P = useP();
  const router = useRouter();
  const navigation = useNavigation();
  const { demo, edit } = useLocalSearchParams<{ demo?: string; edit?: string }>();
  const [text, setText] = useState(__DEV__ && storeMode && demo ? DEMO_TEXT[getLang()].line : "");
  const goBack = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal")), [router]);

  // the sealed page being changed, read once before anything is drawn
  const editId = typeof edit === "string" && edit.length > 0 ? edit : null;
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  useEffect(() => {
    if (!editId) return;
    let alive = true;
    void loadJournal().then((all) => {
      if (!alive) return;
      const page = editId.startsWith("demo-") ? null : all.find((e) => e.id === editId);
      if (!page) {
        console.warn("[journal-entry] the page to edit isn't in the journal; going back");
        goBack();
        return;
      }
      setText(page.body);
      setEditing(page);
    });
    return () => {
      alive = false;
    };
    // goBack: the router's, stable enough for a read made once per id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  /* Same guard as the letter desk, minus the draft. A sealed page has no
     draft shelf — and it shouldn't get one here: this room's whole promise is
     that nothing leaves it, so a half-written page either becomes an entry or
     it never existed.

     10a step 5: the guard covers everything a page can hold — words,
     pictures, a film, a finished recording (it used to look at the words
     only, so ✕ threw a recording away without asking) — and every way out:
     ✕, the edge swipe and anything else that removes the page all come
     through usePreventRemove, which also stops the native swipe while it
     holds. It lets the page go while it seals and once it is sealed (the
     send-off leaves by itself), and the sheet's DISCARD replays the very
     removal it caught, so it can't loop back into the guard. A recording
     still in progress isn't counted until it stops (Recorder says nothing
     before then). */
  const [page, setPage] = useState<SelfComposeState>({ hasSomething: false, busy: false, sealed: false });
  const guarded = page.hasSomething && !page.busy && !page.sealed;
  const [leaving, setLeaving] = useState(false);
  // the Swift page's view: told to let go of the keyboard before the leave sheet rises
  const viewRef = useRef<KScreenHandle>(null);
  const caught = useRef<Parameters<Parameters<typeof usePreventRemove>[1]>[0]["data"]["action"] | null>(null);
  usePreventRemove(guarded, ({ data }) => {
    caught.current = data.action;
    openLeaveSheet(() => setLeaving(true), viewRef);
  });
  const discard = () => {
    setLeaving(false);
    const action = caught.current;
    caught.current = null;
    if (action) navigation.dispatch(action);
    else goBack();
  };

  // a folding phone: the band's corner key is this page's ✕ (the leave guard above still asks)
  useCornerKey({ kind: "close", label: t("wren.trackClose"), onPress: goBack });
  const native = () => <NoteComposeNative text={text} setText={setText} onDone={goBack} onClose={goBack} onState={setPage} viewRef={viewRef} editing={editing} />;

  // an edit is waiting for its page: the paper only
  if (editId && !editing) return <View style={{ flex: 1, backgroundColor: P.paper }} />;

  const fallback = () =>
    editId ? (
      // the React Native composer can only seal a new page: an edit that lands here goes back
      <CannotEdit onLeave={goBack} />
    ) : (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      {/* One line, not two. The date was a headline of its own below the
          header, which gave the page two beginnings — and a date is a label,
          not a title. It sits with the close button; the promise sits opposite
          it. */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 20, paddingTop: 6, paddingBottom: 10 }}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")} style={{ width: 34, height: 38, alignItems: "center", justifyContent: "center" }}>
          <CloseGlyph color={P.ink} />
        </Pressable>
        {/* the modal's title, as every secondary page's: System 500 17, centred on the page */}
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 6, bottom: 10, alignItems: "center", justifyContent: "center" }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontSize: 17, fontWeight: "500", color: P.ink }}>
            {new Date().toLocaleString(localeTag(), { month: "short", day: "numeric" }).toLowerCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path d="M3.7 5.6V4.1a2.3 2.3 0 0 1 4.6 0v1.5" fill="none" stroke={P.ink40} strokeWidth={1.3} strokeLinecap="round" />
            <Rect x={2.5} y={5.6} width={7} height={5} fill={P.ink40} />
          </Svg>
          <Text style={{ ...PFM.mono, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>{t("je.justForMe")}</Text>
        </View>
      </View>
      <SelfCompose text={text} setText={setText} onDone={goBack} onState={setPage} />
    </SafeAreaView>
    );

  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <NativeSurface surface="journalentry" view="KNoteComposeView" mode="mount" native={native} fallback={fallback} />

      <LeaveSheet
        open={leaving}
        title={t("je.leaveTitle")}
        body={editId ? t("je.edit.leaveBody") : text.trim() ? t("je.leaveBody") : t("je.leaveBodyMedia")}
        actions={[{ label: t("cp.leave.discard"), kind: "destructive", onPress: discard }]}
        onCancel={() => {
          caught.current = null;
          setLeaving(false);
        }}
      />
    </View>
  );
}

/* An edit that reached the React Native composer (the "journalentry" switch off, or the SwiftUI
   page threw): that composer would seal a second page, so this leaves at once, said in the log. */
function CannotEdit({ onLeave }: { onLeave: () => void }) {
  useEffect(() => {
    console.warn("[journal-entry] a page can only be edited in the SwiftUI composer; going back");
    onLeave();
    // once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
