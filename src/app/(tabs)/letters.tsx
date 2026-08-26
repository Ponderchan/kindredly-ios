import { useWrenName } from "../../lib/wren-name";
import { SignUpSheet, openSignUpSheet } from "../../components/SignUpSheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { P, PF, channelInk, channelWash, rule } from "../../theme/post";
import { StampTile } from "../../components/StampTile";
import { TranslateMark } from "../../components/TranslateMark";
import { MosaicId } from "../../components/MosaicId";
import { WrenBird } from "../../components/WrenBird";
import { AudioCard } from "../../components/AudioCard";
import { CloseOfDay } from "../../components/CloseOfDay";
import { Toast } from "../../components/ui";
import { DEMO_POOL, seedDemoThread } from "../../data/demo";
import { getStamp } from "../../data/stamps";
import { dShort, postNo, sinceShort } from "../../lib/format";
import { fetchMatches, fetchPool, replyToLetter, voiceLetterUrl, type PoolLetter } from "../../lib/db";
import { refreshFingerprint } from "../../lib/aura";
import { track } from "../../lib/track";
import { getLang, t, useLang } from "../../lib/i18n";
import { screen, translate } from "../../lib/wren";
import { getFlags, setFlag } from "../../lib/flags";
import { useAuth } from "../../lib/auth";
import { STARTER_STAMPS } from "../../data/stamps";
import { LETTER_MAX, REPLY_MIN, letterTier, weightedCount } from "../../lib/weighted-count";
import { fieldBox } from "../../lib/field";

/* Today — the post, as a stack of strangers you swipe through. Each letter fills
   the screen; if it moves you, write back and a thread opens (it moves to
   Kindreds). If it doesn't, swipe up to the next one — no guilt, no unread badge.
   Threads already going live in Kindreds now; Today is only what's fresh at your
   door. New users meet the post through a one-time ritual first (Wren's welcome),
   then land here forever. The lavender ground marks the strangers' space. */

const LAV = "#B9A8F0";
const CLOSE = "#EFE8D8"; // the close-of-day paper (CloseOfDay)
const PAPER = "#FBF7EC";
const W = Dimensions.get("window").width;
const WINDOW_H = Dimensions.get("window").height;
const WINDOW_W = Dimensions.get("window").width;
const RITUAL_FLAG = "today_ritual";

export default function LettersTab() {
  useLang(); // repaint when the reader changes language
  const router = useRouter();
  const [pool, setPool] = useState<PoolLetter[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ritualDone, setRitualDone] = useState<boolean | null>(null);

  useEffect(() => {
    getFlags().then((f) => setRitualDone(!!f[RITUAL_FLAG]));
  }, []);

  /* THE POOL IS NOW ACTUALLY MATCHED. fetchMatches() has existed since the
     first backend migration and nothing in the app had ever called it, so
     "matched by how you write" — the product's central claim, printed on the
     welcome carousel — was not happening in anything a reader saw: the feed
     was newest-first with yourself filtered out.

     compute_matches caches only the k=3 closest writers, nightly, by cosine
     over the signature vectors. So most letters have no score and that is
     correct, not a gap: a letter floats to the top only when the matcher
     genuinely named its author, and the docket line stays silent about
     closeness for every other one. */
  /* ONE POOL, EVERY LANGUAGE — owner's call, and the right one. Sorting
     a reader's own language to the top was tried and pulled: four
     languages would have split an already thin pool into four thinner
     ones, and the product's claim is that a stranger anywhere might
     write like you, not a stranger who shares your keyboard. Translation
     already exists on every letter; what was missing was somebody saying
     so, which is now her job at both ends — see WrenSaysOnce on the
     composer and the line beside TRANSLATE. */
  const load = useCallback(async () => {
    /* THE LETTERS DON'T WAIT ON THE MATCHER. Awaiting both together meant the
       feed appeared only once the nightly-matches lookup also came back — a
       query that adds nothing to the first paint and, for most readers, comes
       back empty anyway. The pool paints as soon as it lands; the closeness
       scores fold in a moment later and re-sort in place. */
    const p = (await fetchPool()) || [];
    setPool(p);
    setLoaded(true);
    const m = await fetchMatches();
    if (!m?.closest?.length) return;
    const score = new Map(m.closest.map((c) => [c.uid, c.score]));
    setPool((cur) =>
      cur
        .map((l) => ({ ...l, close: l.author ? score.get(l.author) : undefined }))
        // matched first; everything else keeps the server's newest-first order
        .sort((a, b) => (b.close ?? -1) - (a.close ?? -1)),
    );
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const demo = __DEV__ && loaded && pool.length === 0;
  const feed = demo ? DEMO_POOL : pool;

  // first run: the ritual gate hasn't resolved yet
  if (ritualDone === null) return <SafeAreaView style={{ flex: 1, backgroundColor: LAV }} />;

  // the one-time ceremony — open your first letter, then the post is yours
  if (!ritualDone) {
    // wait for the pool before deciding what she came back with
    if (!loaded) return <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} />;
    return (
      <Arrival
        first={feed[0] ?? null}
        onDone={async () => {
          await setFlag(RITUAL_FLAG);
          setRitualDone(true);
        }}
      />
    );
  }

  return (
    <Feed
      feed={feed}
      loaded={loaded}
      onReloaded={load}
      router={router}
      demo={demo}
      onAnswered={(id) => setPool((cur) => cur.filter((l) => l.id !== id))}
    />
  );
}

/* ── the everyday swipe feed ── */
function Feed({
  feed,
  loaded,
  onReloaded,
  router,
  demo,
  onAnswered,
}: {
  feed: PoolLetter[];
  loaded: boolean;
  onReloaded: () => void;
  router: ReturnType<typeof useRouter>;
  demo: boolean;
  /** an answered letter leaves this reader's desk */
  onAnswered: (letterId: string) => void;
}) {
  const wren = useWrenName();
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const tabH = 62 + Math.max(insets.bottom, 8); // matches the custom TabBar height
  // "did I close the post today" — one flag per date
  const sealKey = `sealed:${new Date().toISOString().slice(0, 10)}`;
  const [sealed, setSealed] = useState(false);
  useEffect(() => {
    getFlags().then((f) => setSealed(!!f[sealKey]));
  }, [sealKey]);
  const seal = () => {
    setSealed(true);
    void setFlag(sealKey);
  };
  const [idx, setIdx] = useState(0);
  const [vh, setVh] = useState(WINDOW_H - 250);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState(false);
  const [sending, setSending] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  /* REPLY ↓ WAS NEVER A BUTTON. It was a bare <Text> — no Pressable, no
     handler, nothing in this file ever called .focus() — so the one
     affordance pointing at the reply box did nothing at all, and the box
     itself is a thin strip near the fold that is easy to miss. The ref makes
     the affordance real. */
  const replyRef = useRef<TextInput>(null);
  const focusReply = () => replyRef.current?.focus();
  const { isGuest } = useAuth();
  const [needsAccount, setNeedsAccount] = useState(false);

  useEffect(() => {
    const s = Keyboard.addListener("keyboardWillShow", () => setKbOpen(true));
    const h = Keyboard.addListener("keyboardWillHide", () => setKbOpen(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  const quiet = loaded && feed.length === 0;
  const atEnd = idx >= feed.length;
  const current = feed[idx];

  const goto = (i: number) => {
    scrollRef.current?.scrollTo({ y: i * vh, animated: true });
    setIdx(i);
  };

  /* THE LETTER BEING ANSWERED IS PASSED IN, never read from the pager.
     It used to take `current` — feed[idx] — while the reader's draft was
     keyed on its OWN letter.id. Those agree only while the pager's index and
     the page you're looking at agree, and this pager demonstrably drifts. The
     failure isn't a no-op either: with a stale draft under the other key, a
     reply meant for one stranger would have been sent to a different one. */
  /* the letter a blocked send was aimed at, so signing in resumes THAT one */
  const pendingReply = useRef<PoolLetter | null>(null);

  const send = async (target?: PoolLetter) => {
    const to = target ?? current;
    if (!to || sending) return;
    const text = (drafts[to.id] || "").trim();
    const w = weightedCount(text);
    if (w < REPLY_MIN || w > LETTER_MAX) return;
    setSending(true);
    Keyboard.dismiss();
    if (demo || to.author?.startsWith("demo-")) {
      seedDemoThread(to, text);
    } else {
      /* Wren's gate ran on open letters (compose.tsx) and never on replies —
         so the one place you write to a named stranger was the one place
         nothing was screened. Same call, same copy. */
      const gate = await screen(text);
      if (!gate.ok) {
        setSending(false);
        Alert.alert(t("cp.gate.title", { wren }), t("cp.gate.body"));
        return; // the draft stays in the box
      }
      /* THIS RESULT USED TO BE THROWN AWAY. replyToLetter returns null for a
         reader with no session, and the screen cleared the box, popped the
         toast and moved to the next letter regardless — so a ghost watched
         their reply "send" and open a thread that never existed. Of every
         silent failure in the product this was the only one that actively
         lied about something the reader cares about. */
      const threadId = await replyToLetter(to, text);
      if (!threadId) {
        setSending(false);
        pendingReply.current = to;
        if (isGuest) openSignUpSheet(() => setNeedsAccount(true));
        else Alert.alert(t("cp.fail.title"), t("ld.replyFail"));
        return; // the draft stays in the box
      }
      /* the moment a stranger's letter becomes a correspondence — the
         single most important conversion in the product */
      track("reply_sent", { weight: weightedCount(text) });
    }
    setSending(false);
    setDrafts((d) => ({ ...d, [to.id]: "" }));
    void refreshFingerprint(); // the reply is part of your voice now
    setToast(true);
    setTimeout(() => setToast(false), 2200);
    /* AND IT LEAVES THE POOL. This only scrolled, so the letter you had just
       answered stayed in the pager behind you and came back at the top of
       Today on every visit — offering "write back…" to someone you were
       already corresponding with. Dropping it locally makes the pager land
       on the next letter by itself; the server-side pool is shared and
       tracks no reads, so this is the reader's own desk being cleared. */
    onAnswered(to.id);
  };

  if (quiet) {
    // nothing waiting — you're already at the close of the day
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
        <View style={{ flex: 1, paddingBottom: tabH }}>
          <CloseOfDay
            sealed={sealed}
            onSeal={seal}
            onWrite={() => router.push("/compose")}
            onSelf={() => router.push("/journal-entry")}
            onKept={() => router.push("/kept")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const replyW = current ? weightedCount(drafts[current.id] || "") : 0;
  const replyOk = replyW >= REPLY_MIN && replyW <= LETTER_MAX;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <Header count={feed.length} idx={Math.min(idx, feed.length - 1)} atEnd={loaded && atEnd} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1 }} onLayout={(e) => setVh(e.nativeEvent.layout.height)}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.y / vh))}
          >
            {feed.map((letter, i) => (
              <LetterPage
                key={letter.id}
                letter={letter}
                height={vh}
                first={i === 0 && idx === 0}
                onReply={focusReply}
                reply={{
                  value: drafts[letter.id] || "",
                  onChange: (t: string) => setDrafts((d) => ({ ...d, [letter.id]: t })),
                  // bound to THIS letter, not to whatever the pager thinks is current
                  onSend: () => send(letter),
                  canSend: (() => {
                    const w = weightedCount(drafts[letter.id] || "");
                    return w >= REPLY_MIN && w <= LETTER_MAX && !sending;
                  })(),
                  sending,
                }}
              />
            ))}
            {/* swipe past the last letter and the post closes: you stamp the
                day shut. The screen behind switches to the same paper so the
                page and the ground meet without a seam.

                GATED ON `loaded`. While the pool is still in flight the feed
                is empty, so this was the only page in the pager — every cold
                open flashed THE POST IS CLOSED with a countdown before the
                letters arrived and shoved it away. Saying the day is over
                while we are still asking is the worst thing this screen can
                get wrong, and slice 142 made the flash longer by putting the
                matches query in the same await. */}
            {loaded && (
            <View style={{ height: vh, backgroundColor: P.penWash }}>
              <CloseOfDay
                sealed={sealed}
                onSeal={seal}
                onWrite={() => router.push("/compose")}
                onSelf={() => router.push("/journal-entry")}
                onKept={() => router.push("/kept")}
              />
            </View>
            )}
          </ScrollView>
        </View>

        {/* one shared reply bar, bound to the letter you're on. Always rendered
            at a constant height (even on the caught-up page) so the pager's page
            height never shifts under it. */}
        <View style={{ paddingHorizontal: 26, paddingTop: 10, paddingBottom: kbOpen ? 10 : tabH + 6 }}>
          {!atEnd && current ? (
            /* THE REPLY IS NOT PAPER YET, and that is the point. Giving it
               its own sheet made a second letter on the desk and turned the
               screen into a form with an input stapled to it. On the bare wash
               with only its rule, it reads as a pen hovering — your words
               become a page when you send them, and that page lives in the
               thread that opens. */
            <Pressable onPress={focusReply} style={{ minHeight: 78 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, borderBottomWidth: 1, borderBottomColor: P.ink, paddingRight: 2, paddingVertical: 2 }}>
                <TextInput
                  ref={replyRef}
                  value={drafts[current.id] || ""}
                  onChangeText={(t) => setDrafts((d) => ({ ...d, [current.id]: t }))}
                  placeholder={t("ld.writeBackPh")}
                  placeholderTextColor={P.ink40}
                  multiline
                  style={{ flex: 1, ...fieldBox(drafts[current.id] || "", 23, 104), paddingTop: 10, paddingBottom: 10, color: P.ink, fontFamily: PF.letter, fontSize: 17, lineHeight: 23 }}
                />
                <Pressable
                  onPress={() => send(current)}
                  disabled={!replyOk || sending}
                  style={{ paddingHorizontal: 10, paddingVertical: 9, backgroundColor: replyOk && !sending ? P.pen : "transparent" }}
                >
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1, color: replyOk && !sending ? "#fff" : P.ink40 }}>
                    {sending ? "···" : t("ld.send")}
                  </Text>
                </Pressable>
              </View>
              <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.4, color: replyW > LETTER_MAX ? P.post : P.ink40, marginTop: 8 }}>
                {replyW > LETTER_MAX
                  ? `${replyW - LETTER_MAX} OVER THE LIMIT`
                  : replyOk
                    ? t("ld.threadOpensTwo")
                    : t("ld.replyThreadOpens")}
              </Text>
            </Pressable>
          ) : (
            <View style={{ minHeight: 78 }} />
          )}
        </View>
      </KeyboardAvoidingView>

      {toast && <Toast msg={t("ld.toast.thread")} bottom={150} />}

      <SignUpSheet
        open={needsAccount}
        reason={t("ld.signup.reason")}
        onClose={() => setNeedsAccount(false)}
        onSignedIn={() => {
          setNeedsAccount(false);
          // carry the letter that triggered the sheet: bare send() falls back
          // to `current`, and the pager may have drifted since — the exact
          // wrong-recipient hazard send(target) exists to close
          void send(pendingReply.current ?? undefined);
        }}
      />
    </SafeAreaView>
  );
}

function Header({ count, idx, atEnd }: { count: number; idx: number; atEnd?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: P.ink }}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.groundInk }}>{t("ld.today")}</Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 12.5, letterSpacing: 1.2, color: P.groundInk60 }}>
        {count === 0 ? t("ld.closed") : atEnd ? t("ld.allRead") : `${String(idx + 1).padStart(2, "0")}/${String(count).padStart(2, "0")}`}
      </Text>
    </View>
  );
}

/* THE UNFOLDED LETTER.
   ────────────────────────────────────────────────────────────────────────
   A Modal rather than a route, and that's the whole reason this works: the
   reader lives inside the page that opened it, so REPLY just dismisses and
   focuses the box that was already there — no route to push, no letter to
   re-fetch by id, no cold-start deep link into a letter that may have left
   the pool. Unfolding isn't a destination; it's a gesture on the page.

   It carries the docket so you never lose track of whose letter this is, and
   it scrolls the way any long document does — here there is no pager to
   argue with, so a swipe means one thing. */
function LetterReader({
  open,
  letter,
  shown,
  onClose,
  reply,
}: {
  open: boolean;
  letter: PoolLetter;
  shown: string;
  onClose: () => void;
  reply: ReplyBinding;
}) {
  const insets = useSafeAreaInsets();
  const st = getStamp(letter.stamp);
  const inputRef = useRef<TextInput>(null);
  const [writing, setWriting] = useState(false);
  if (!open) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: P.penWash }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 }}>
          <Pressable onPress={onClose} hitSlop={12} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.ink }}>✕</Text>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: P.ink60 }}>{t("ld.foldBack")}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: P.sheet, marginHorizontal: 12 }}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* the same docket the page carries, so the letter keeps its face */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 22 }}>
            <MosaicId seed={letter.author} />
            <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.6, color: P.ink60, marginLeft: 12, marginTop: 3 }}>
              {dShort(letter.created_at).toUpperCase().replace(" ", ".")} ·{" "}
              {letter.author ? `NO.${postNo(letter.author)}` : "UNSIGNED"}
            </Text>
            {st && (
              <View style={{ transform: [{ rotate: "3deg" }] }}>
                <StampTile id={letter.stamp} w={40} r={5} />
              </View>
            )}
          </View>

          <Text style={{ fontFamily: PF.letter, fontSize: 19, lineHeight: 31, color: P.ink }}>{shown}</Text>

          <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.5, color: P.ink40, marginTop: 26 }}>
            WRITTEN {sinceShort(letter.created_at)}
            {letter.close != null ? " · YOUR AURAS ARE CLOSE" : ""}
          </Text>
        </ScrollView>

        {/* YOU ANSWER WITHOUT LEAVING THE LETTER. WRITE BACK used to dismiss
            the sheet and focus the box on the page underneath — which worked,
            and was still wrong: you had just read a long letter and were then
            put somewhere you couldn't see it, sometimes not even on the same
            page. The field opens here instead, with the letter still above
            it. The draft is the same one the page holds, so a reply started
            here and finished there is one reply. */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
            {writing ? (
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, borderBottomWidth: 1, borderBottomColor: P.ink, paddingVertical: 2 }}>
                <TextInput
                  ref={inputRef}
                  value={reply.value}
                  onChangeText={reply.onChange}
                  placeholder={t("ld.writeBackPh")}
                  placeholderTextColor={P.ink40}
                  multiline
                  autoFocus
                  style={{ flex: 1, ...fieldBox(reply.value, 23, 104), paddingTop: 10, paddingBottom: 10, color: P.ink, fontFamily: PF.letter, fontSize: 17, lineHeight: 23 }}
                />
                <Pressable
                  onPress={reply.onSend}
                  disabled={!reply.canSend}
                  style={{ paddingHorizontal: 12, paddingVertical: 9, backgroundColor: reply.canSend ? P.pen : "transparent" }}
                >
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1, color: reply.canSend ? "#fff" : P.ink40 }}>
                    {reply.sending ? "···" : t("ld.send")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setWriting(true)}
                hitSlop={6}
                style={{ backgroundColor: P.pen, paddingVertical: 17, alignItems: "center" }}
              >
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: "#fff" }}>{t("ld.writeBack")}</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* One letter, and the paper IS the screen.

   Full bleed and white at the same time — those were never in conflict. The
   letter is not a card lying on the desk (that would demote it to a row in a
   feed, which is the opposite of what this tab is for); it's the sheet held up
   to your face. So the white runs edge to edge and the desk shows only as the
   strip above (the header) and below (where you write back).

   That keeps Today consistent with every other room — white is always where
   you read — without shrinking the one thing this screen exists to show. */
interface ReplyBinding {
  value: string;
  onChange: (t: string) => void;
  onSend: () => void;
  canSend: boolean;
  sending: boolean;
}

function LetterPage({
  letter,
  height,
  first,
  onReply,
  reply,
}: {
  letter: PoolLetter;
  height: number;
  first: boolean;
  onReply: () => void;
  reply: ReplyBinding;
}) {
  const wren = useWrenName();
  const st = getStamp(letter.stamp);
  const isVoice = letter.kind === "voice" && !!letter.media_path;
  const audioUrl = isVoice ? voiceLetterUrl(letter.media_path) : null;

  // Wren translating this letter. Kept per-letter — each page holds its own,
  // so translating one doesn't touch the others in the stack.
  const [frameH, setFrameH] = useState(0);
  const [textH, setTextH] = useState(0);
  const [open, setOpen] = useState(false);
  const [xl, setXl] = useState<string | null>(null);
  const [xlOn, setXlOn] = useState(false);
  const [xlBusy, setXlBusy] = useState(false);
  const shown = xlOn && xl ? xl : letter.body;
  const tier = letterTier(weightedCount(shown || ""));
  /* WHAT FITS IS A GEOMETRY QUESTION, so it's answered with geometry rather
     than a magic number. The frame reports its height, the tier fixes the
     line height, so the page holds `frameH / tier.line` lines; the tier's
     size also fixes roughly how many characters sit on one — and CJK packs
     about half as many per line as Latin at the same point size, which is the
     whole reason a fixed threshold failed here. The long Chinese letter in
     the pool weighs 325: nowhere near letterTier's >600 "long" tier, yet far
     past what one screen holds. A tuned constant would have been wrong for
     one script or the other.

     Measurement stays as the first signal — it's exact when the layout
     callback lands — and this estimate is the floor beneath it. */
  const weighted = weightedCount(shown || "");
  const cjkHeavy = ((shown || "").match(/[㐀-鿿]/g) || []).length > (shown || "").length * 0.3;
  const perLine = Math.max(8, Math.round((WINDOW_W - 52) / (tier.size * (cjkHeavy ? 1 : 0.52))));
  const linesThatFit = frameH > 0 ? Math.floor(frameH / tier.line) : 22;
  const measuredOverflow = frameH > 0 && textH > frameH + tier.line;
  const folded = !isVoice && (measuredOverflow || weighted > perLine * linesThatFit);


  const doTranslate = async () => {
    if (xl) {
      setXlOn((v) => !v);
      return;
    }
    if (xlBusy || !letter.body) return;
    setXlBusy(true);
    const out = await translate(letter.body, getLang());
    setXlBusy(false);
    if (out) {
      setXl(out);
      setXlOn(true);
    } else Alert.alert(t("ld.xlFail.title", { wren }), t("ld.xlFail.body"));
  };

  return (
    /* EXPERIMENT: the console's wash as a desk, the letter as paper on it.
       Tinting the whole screen would only have made a pale-lavender app; the
       wash earns its keep by being what the sheet is LYING ON. */
    /* ONE SHEET, ONE DESK. The wash is the app; the white is what a person
       wrote. That is the same split the type already makes — mono for what the
       machine says, the letter face for what someone wrote — now said in
       surface as well, which is why it settles: the two rules agree.

       No border on the sheet. A hairline round it makes a CARD; its absence
       leaves paper, and the colour step does all the separating a page needs.
       The moment this screen had a framed letter, a framed reply, a framed tag
       and a framed stamp, it had stopped being one letter on a desk. */
    <View style={{ height, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 }}>
      <View style={{ flex: 1, backgroundColor: P.sheet, paddingHorizontal: 22, paddingTop: 26 }}>
      <Animated.View entering={FadeIn.duration(240)} style={{ flex: 1 }}>
        {/* The docket row reads like the face of an envelope: who and when
            filed on the left by the machine, the stamp pasted on the right by
            the person who sent it.

            The rule this settles: the system's CHROME is mono and black, but
            the designed artefacts — Wren, the 44 stamps, the mood faces — are
            CONTENT, and content keeps its own colour. Same licence the letter
            body gets. Stripping the stamps to fit the palette was the mistake;
            they're the reason the tab has a world at all. */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <MosaicId seed={letter.author} />
            <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink60 }}>
              {dShort(letter.created_at).toUpperCase().replace(" ", ".")} ·{" "}
              {letter.author ? `NO.${postNo(letter.author)}` : "UNSIGNED"}
            </Text>
          </View>
          {st && (
            <View style={{ transform: [{ rotate: "3deg" }] }}>
              <StampTile id={letter.stamp} w={46} r={5} />
            </View>
          )}
        </View>

        {/* A PAGE IS ALWAYS ONE SCREEN. The previous attempt put a ScrollView
            inside the page so a long letter could scroll in place — which gave
            one gesture two meanings and left the reader unable to tell whether
            a swipe would scroll the text or turn the page.

            A long letter is FOLDED instead: the page shows what fits, and
            UNFOLD opens the whole thing in a reader. That keeps the pager's
            contract intact — one page, one screen, no exceptions — and it is
            the postal reading of the problem, which is usually the sign that
            it's the right one.

            Overflow is measured, not guessed from a character count — a count
            can't know how a given script wraps at a given size.

            THE TRAP, which cost three attempts: a Text laid out inside a frame
            of definite height is MEASURED AGAINST THAT HEIGHT, so onLayout
            reports the constrained value and can never exceed it — the visible
            copy simply cannot tell you it overflowed. (flexShrink: 0 doesn't
            help; RN flex items already default to it. onTextLayout doesn't
            either — it reports the lines actually laid out.)

            So the height is learned from an absolutely-positioned twin: out of
            the layout flow, it has no height constraint and reports the
            letter's true height. It's invisible and untouchable, and it exists
            only to answer one question. */}
        <View
          style={{ flex: 1, overflow: "hidden", justifyContent: "center" }}
          onLayout={(ev) => setFrameH(ev.nativeEvent.layout.height)}
        >
        {isVoice && audioUrl ? (
          <View>
            <Text style={{ fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 1.4, color: P.pen, marginBottom: 14 }}>{t("ld.voiceLetter")}</Text>
            <AudioCard url={audioUrl} durationS={letter.duration_s ?? null} system />
            {!!letter.body && letter.body !== "🎙 A voice letter" && (
              <Text style={{ fontFamily: PF.serifItalic, fontSize: 15, lineHeight: 24, color: P.ink60, marginTop: 16 }}>{letter.body}</Text>
            )}
          </View>
        ) : (
          <Text
            style={{
              fontFamily: PF.letter,
              fontSize: tier.size,
              lineHeight: tier.line,
              color: P.ink,
              textAlign: tier.center ? "center" : "auto",
            }}
          >
            {shown}
          </Text>
        )}

        {/* the twin — unconstrained, invisible, measured once per letter */}
        {!isVoice && (
          <Text
            pointerEvents="none"
            onLayout={(ev) => setTextH(ev.nativeEvent.layout.height)}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              opacity: 0,
              zIndex: -1,
              fontFamily: PF.letter,
              fontSize: tier.size,
              lineHeight: tier.line,
              textAlign: tier.center ? "center" : "auto",
            }}
          >
            {shown}
          </Text>
        )}
        </View>

        {/* the fold — only when there is genuinely more letter than screen */}
        {folded && (
          <Pressable onPress={() => setOpen(true)} hitSlop={8} style={{ paddingTop: 10 }}>
            <View style={{ borderTopWidth: 1, borderTopColor: P.ink12, paddingTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40 }}>{t("ld.more")}</Text>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>{t("ld.unfold")}</Text>
            </View>
          </Pressable>
        )}

        {/* The channel, in its stamp's own colour — the pasted tile and the
            readable word are the same thing said twice, so they can't be two
            different colours. Washed background so the hue is actually present
            on the page, true colour on the rule, word darkened to clear 4.5:1
            against its own wash.

            LOWERCASE, deliberately: the stamp is picked by the person writing,
            not assigned by the system, so it doesn't get the machine's
            all-caps voice. Everything the system itself says on this page is
            upper — this one thing isn't, because it isn't the system talking. */}
        {st && (
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            <View
              style={{
                backgroundColor: channelWash(st.color),
                borderWidth: 1,
                borderColor: st.color,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ fontFamily: PF.monoMed, fontSize: 12, letterSpacing: 0.2, color: channelInk(st.color) }}>
                #{st.name.en.toLowerCase()}
              </Text>
            </View>
          </View>
        )}

        {/* The line this replaced — SENT DOWN THREE STREETS · YOU OPENED IT
            FIRST — was a hardcoded string on every letter for every reader,
            and both halves were invented: there is no geo data anywhere in
            the product, and the pool is shared with no read tracking, so
            "you opened it first" was unverifiable and usually false. Its job
            was right though — provenance, the thing that stops a letter
            reading as a feed post — so it now says only what is true: when
            it was written, and, when the matcher actually named this author,
            why it reached you. */}
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.5, color: P.ink40, marginBottom: 10 }}>
          WRITTEN {sinceShort(letter.created_at)}
          {letter.close != null ? " · YOUR AURAS ARE CLOSE" : ""}
        </Text>

        {/* HER LINE GETS ITS OWN ROW. Sharing the actions row put three
            things on one line and pushed TRANSLATE off the screen — and
            it is a sentence, not a control; it belongs above them. */}
        {!isVoice && !!letter.body && (letter.lang || "en") !== getLang() && !xlOn && (
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 12.5, color: P.ink40, paddingTop: 10 }}>
            {t("lang.read")}
          </Text>
        )}

        {/* the two moves, on a rule */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: P.ink }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 1, color: P.ink60 }}>{first ? t("ld.swipePass") : t("ld.pass")}</Text>
          {!isVoice && !!letter.body && (
            <Pressable onPress={doTranslate} hitSlop={10} style={{ flexDirection: "row", alignItems: "center" }}>
              <TranslateMark on={xlOn} />
              <Text style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: xlOn ? P.pen : P.ink60 }}>
                {xlBusy ? t("read.translating") : xlOn ? t("read.original") : t("read.translate")}
              </Text>
            </Pressable>
          )}
          <Pressable onPress={onReply} hitSlop={14}>
            <Text style={{ fontFamily: PF.monoMed, fontSize: 11.5, letterSpacing: 1, color: P.pen }}>{t("ld.replyArrow")}</Text>
          </Pressable>
        </View>
      </Animated.View>

      <LetterReader
        open={open}
        letter={letter}
        shown={shown}
        onClose={() => setOpen(false)}
        reply={{
          ...reply,
          /* once it's gone the letter is answered, so the reader closes with
             it — otherwise you'd be left reading a letter whose thread has
             already opened, with a send key that can't fire again */
          onSend: () => {
            setOpen(false);
            reply.onSend();
          },
        }}
      />
      </View>
    </View>
  );
}

/* ── SHE COMES BACK ──────────────────────────────────────────────────────
   The hatch ends with her flying off carrying your letter. Nothing used to
   close that loop: you landed on a one-time "A LETTER FROM WREN" that
   explained the rules — a manual wearing a letter's clothes, arriving in a
   product whose whole premise is that letters come from strangers. It also
   re-taught what onboarding had just spent nine screens teaching.

   So the landing is her RETURN, in three beats, and every one of them is
   something that actually just happened:

     1. THE RECEIPT — your letter really did leave. The docket is built the
        same way the world will see it (postNo/MosaicId off your own id, the
        stamp onboarding posted it with), so this is a counterfoil, not a
        graphic.
     2. THE HONEST WAIT — nobody has replied, and nobody will for hours. Say
        so. Never fake a reply to fill a gap.
     3. WHAT SHE FOUND — the first real letter from the pool, framed as
        something she brought back. That's the core loop demonstrated in
        twenty seconds, handed over at the moment the reader is most open —
        and the rules the old welcome listed are printed on the letter page
        itself (^ SWIPE TO PASS · REPLY ↓), so they teach themselves.

   If the pool is genuinely empty, beat 3 says that plainly rather than
   inventing something to hand over. */
function Arrival({ first, onDone }: { first: PoolLetter | null; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  // the tab bar floats over this screen — clear it the way Feed does rather
  // than guessing a number, which clipped READ IT on a device with a home bar
  const tabH = 62 + Math.max(insets.bottom, 8);
  const { user, profile } = useAuth();
  const wren = useWrenName();
  const [beat, setBeat] = useState(0);
  const line = ((profile?.firstLine as string) || "").trim();
  const uid = user?.id || "you";

  useEffect(() => {
    const a = setTimeout(() => setBeat(1), 1500);
    const b = setTimeout(() => setBeat(2), 3200);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingBottom: 10 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2, color: P.ink, flex: 1 }}>{t("ld.today")}</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.4, color: P.ink40 }}>{t("ld.shesBack")}</Text>
      </View>
      <View style={{ ...rule }} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 26, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* she lands */}
        <Animated.View entering={FadeIn.duration(520)} style={{ alignItems: "center" }}>
          <WrenBird size={92} mood="delight" />
        </Animated.View>

        {/* 1 · the receipt — the same docket the world will see on it */}
        <Animated.View entering={FadeIn.delay(280).duration(560)} style={{ marginTop: 18 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 2, color: P.ink60, marginBottom: 10 }}>{t("ld.yourLetterLeft")}</Text>
          <View style={{ borderWidth: 1, borderColor: P.ink, padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <MosaicId seed={uid} />
              <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 11.5, letterSpacing: 0.6, color: P.ink60, marginLeft: 12, marginTop: 3 }}>
                {dShort(new Date().toISOString()).toUpperCase().replace(" ", ".")} · NO.{postNo(uid)}
              </Text>
              <View style={{ transform: [{ rotate: "-5deg" }] }}>
                <StampTile id={STARTER_STAMPS[0]} w={44} r={5} />
              </View>
            </View>
            {!!line && (
              <Text numberOfLines={3} style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink, marginTop: 14 }}>
                {line}
              </Text>
            )}
            <View style={{ marginTop: 14, alignSelf: "flex-start", borderWidth: 1.4, borderColor: P.post, paddingHorizontal: 9, paddingVertical: 3, transform: [{ rotate: "-1.5deg" }] }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: P.post }}>{t("ld.posted")}</Text>
            </View>
          </View>
        </Animated.View>

        {/* 2 · the honest wait */}
        {beat >= 1 && (
          <Animated.View entering={FadeInDown.duration(520)} style={{ marginTop: 26 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <WrenBird size={34} mood="listen" />
              <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 25, color: P.ink, marginLeft: 12, marginTop: 2 }}>
                {t("ld.wait")}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* 3 · what she found on the way, or the truth that she found nothing */}
        {beat >= 2 && (
          <Animated.View entering={FadeInDown.duration(560)} style={{ marginTop: 26 }}>
            <View style={{ ...rule, marginBottom: 18 }} />
            {first ? (
              <>
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 25, color: P.ink }}>
                  {t("ld.found", { wren })}
                </Text>
                <View style={{ borderWidth: 1, borderColor: P.ink12, padding: 14, marginTop: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MosaicId seed={first.author} cell={3} gap={1} />
                    <Text style={{ flex: 1, fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.ink40, marginLeft: 10 }}>
                      {first.author ? `NO.${postNo(first.author)}` : t("ld.unsigned")} · {t("ld.stranger")}
                    </Text>
                  </View>
                  <Text numberOfLines={2} style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 23, color: P.ink60, marginTop: 10 }}>
                    {(first.body || "").trim()}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 16.5, lineHeight: 25, color: P.ink }}>
                  {t("ld.empty", { wren })}
                </Text>
              </>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* THE KEY IS PINNED. Beats 1-3 together are taller than the screen, so
          inside the scroller the primary action sat below the fold — no amount
          of bottom padding fixes that, since padding only adds space after a
          button that was already off-screen. It appears with beat 3 and clears
          the floating tab bar. */}
      {beat >= 2 && (
        <Animated.View
          entering={FadeInDown.duration(420)}
          /* a rule and a paper ground: without them the pinned key looked like
             it had sliced the letter card in half rather than sitting under a
             scroller — the same hairline every onboarding step puts above its
             key, doing the same job */
          style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: tabH + 10, backgroundColor: P.paper, ...rule, borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: P.ink }}
        >
          <Pressable
            onPress={onDone}
            style={
              first
                ? { backgroundColor: P.pen, paddingVertical: 16, alignItems: "center" }
                : { borderWidth: 1, borderColor: P.ink, paddingVertical: 16, alignItems: "center" }
            }
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: first ? "#fff" : P.ink }}>
              {first ? t("ld.readIt") : t("ld.lookAround")}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

/* airmail striped border */
function Airmail() {
  const bars = Array.from({ length: 60 });
  const col = (i: number) => (i % 4 === 0 ? "#E0483C" : i % 4 === 2 ? "#3A4F9E" : "transparent");
  return (
    <View style={{ height: 12, flexDirection: "row", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
      {bars.map((_, i) => (
        <View key={i} style={{ width: 7, height: 30, marginTop: -8, backgroundColor: col(i), transform: [{ rotate: "30deg" }] }} />
      ))}
    </View>
  );
}

/* You've read everything that came, so the post closes for the night — and the
   screen goes with it. The lavender day drains into a night sky: stars come out
   in their own time, one drifts loose every so often, the moon hangs in the
   corner, Wren curls up asleep, and the countdown to the morning post glows like
   a lit window. It's the app saying goodnight, not an empty state.
   `compact` trims it to sit as the last page of the feed. */

