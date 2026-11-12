import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { getLang, t, useLang } from "../../lib/i18n";
import { PFM } from "../../theme/post";
import { useLetterFamily, useP, useTheme } from "../../lib/theme";
import { ChatField } from "../../components/ChatField";
import { OfficialBird } from "../../components/WrenDesk";
import { GuideCard, GuideChips } from "../../components/GuideCard";
import { NewsCard, newsIdOf } from "../../components/news-reel";
import { SignUpSheet, openSignUpSheet } from "../../components/SignUpSheet";
import { PlayTray } from "../../components/LeaveATrace";
import type { KChatTrace } from "../../../modules/kindredly-ui/src/Conversation";
import { PlusGlyph } from "../../components/ComposeTray";
import { dShort } from "../../lib/format";
import { alertFail } from "../../lib/fail";
import { useAuth } from "../../lib/auth";
import { markRoomSeen } from "../../lib/room-seen";
import { setDeskWaiting } from "../../lib/waiting";
import { uploadMoment } from "../../lib/db";
import { MediaImage } from "../../lib/media";
import { PhotoLightbox, type LightboxPhoto } from "../../components/PhotoLightbox";
import { answerFor, fetchAnswers, readAnswersCache, type Answer } from "../../lib/wren-answers";
import { GUIDES, isGuideId } from "../../data/guides";
import { stallReport } from "../../lib/stall-probe";
import { looksBroken } from "../../lib/wren-match";
import {
  OFFICIAL_NAME,
  WREN_ROOM,
  fetchWrenMail,
  fetchWrenPosts,
  keepLocal,
  postText,
  readLocal,
  readMailCache,
  readPostsCache,
  sendWrenMail,
  type WrenLocal,
  type WrenMail,
  type WrenMailKind,
  type WrenPost,
} from "../../lib/wren-desk";
import { DEMO_WREN_POSTS } from "../../data/demo";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import { atBottomOf, follow, settlesAtEnd, spendsOwn, type FollowFacts } from "../../screens/chat/follow";
import { useKeyboardRN, useKeyboardSettle, useKeyboardTray } from "../../screens/chat/useKeyboardRN";
import { BackChevron } from "../../components/10a/BackChevron";
import { NativeSurface } from "../../components/NativeSurface";
import { WrenRoomNative } from "../../screens/wren-room/WrenRoomNative";
import { FIRST_CHIPS, buildWrenStream, guideSlugOf, wrenItemKey, wrenSpeaker, type WrenRoomItem, type WrenSpeakerWords } from "../../screens/wren-room/wren-room-model";
import { DeckInsets } from "../../components/DeckInsets";

/* WREN'S DESK — the one room everybody has.
   ────────────────────────────────────────────────────────────────────────
   Same grammar as a kindred's room (no bubbles, no minute stamps, a day
   rule and a speaker label), because it is the same kind of place: a
   transcript, not an inbox. What is different is who is on the other
   side. It is the courier herself — half of her is a lookup, half of her
   is people:

   · her POSTS go to everyone (0023 wren_posts)
   · a question typed here is matched ON THE PHONE against six bundled
     guides and the makers' own answers (lib/wren-answers); a hit is
     answered at once, with a guide that moves
   · a miss, a bug, an idea, a picture go to the makers (wren_mail), and
     what they write back appears here under her name and knocks once

   Nothing here is a correspondence: no reveal, no count to five, no aura
   read of her.

   10a step 5 (owner: this release fixes the desk's scroll and keyboard
   only; its reels, guides and ChatField stay as they are):
   · it follows its end only while you are at it (screens/chat/follow,
     the rule the room and chat fallbacks use): a guide reel or a picture
     finishing its layout, MORE chips opening, no longer yank someone
     reading further up back down (spec bug 10); the first content, your
     own mail, her answer on the phone, a guide asked for by link or by a
     chip are brought into view from anywhere (critic: they always were);
   · the keyboard, the tray and a growing field keep the newest line in
     sight when you are at the end (spec bug 9) — the list follows its own
     height, not only its content, and once more after the keyboard or the
     tray has finished moving (the avoiding view animates its padding, so
     the first scroll lands on the old height);
   · the tray and the keyboard swap in one commit, the tray rising with
     the keyboard's timing (or fading under Reduce Motion) instead of the
     field jumping a keyboard's height and back (useKeyboardTray);
   · a drag down the list takes the keyboard with it, and the field keeps
     its 14 above the keyboard instead of carrying the home indicator's
     inset up with it (the inset is the field's own padding only while the
     keyboard and the tray are down);
   · the tray is on the theme (LeaveATrace's 10a cards, in the keyboard's
     place). */

/* the transcript and its speakers are screens/wren-room/wren-room-model's, shared with the Swift room */
type Item = WrenRoomItem;

/* 2026-10-27: the room can be drawn in Swift (screens/wren-room/WrenRoomNative,
   KWrenRoomView), with the React Native room below as the remote switch's
   fallback ("wrenroom" in app_surfaces, NativeSurface in mount mode; off by
   default until it has been checked on the simulator). */
/* on a small laptop the page ends at the bend: its foot keeps the bend's gap, not the home
   indicator's inset (components/DeckInsets) */
export default function WrenDeskRoute() {
  return (
    <DeckInsets>
      <WrenDeskRoutePage />
    </DeckInsets>
  );
}

function WrenDeskRoutePage() {
  const T = useTheme().t;
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <NativeSurface surface="wrenroom" view="KWrenRoomView" mode="mount" native={() => <WrenRoomNative />} fallback={() => <WrenDeskScreen />} />
    </View>
  );
}

/* the React Native room */
function WrenDeskScreen() {
  useLang();
  // the theme's colours: P keyed like the static palette (useP), T the 10a tokens
  const P = useP();
  const T = useTheme().t;
  // what is said here (hers and yours, and what you type) is content: the reader's letter font
  const letter = useLetterFamily();
  const wrenLine = useLetterFamily(true);
  const router = useRouter();
  const params = useLocalSearchParams<{ guide?: string }>();
  const { isGuest } = useAuth();
  const [posts, setPosts] = useState<WrenPost[]>([]);
  const [mail, setMail] = useState<WrenMail[]>([]);
  const [local, setLocal] = useState<WrenLocal[]>([]);
  const [text, setText] = useState("");
  const [photoFull, setPhotoFull] = useState<LightboxPhoto>(null);
  const [sending, setSending] = useState(false);
  const [needsAccount, setNeedsAccount] = useState(false);
  const [allChips, setAllChips] = useState(false);
  /* the ⊕ opens what you can hand the makers: a picture (a screenshot,
     usually), a bug, an idea. Bug and idea are a MODE on the field — the
     mail goes out tagged so it can be sorted before it is read. */
  const [tray, setTray] = useState(false);
  const [mode, setMode] = useState<Exclude<WrenMailKind, "note" | "photo"> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const pendingSend = useRef<string | null>(null);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardRN();

  /* FOLLOW THE END ONLY WHILE AT IT (spec bugs 9 and 10; screens/chat/follow). `atBottom` is
     what the reader was at the last scroll; `ownPending` is set by anything of theirs that
     should be seen wherever they were (their mail, her answer, a linked guide, a chip). */
  const scroll = useRef({ atBottom: true, painted: false, ownPending: false, dragging: false, viewport: 0 });
  const wantEnd = () => {
    scroll.current.ownPending = true;
  };
  /* once the keyboard or the tray has finished moving: the end again, if it was where the reader
     was as the move began (KeyboardAvoidingView animates its padding, so onListLayout's scroll
     lands on the frame's old height) — never under a finger */
  const settle = () => {
    const s = scroll.current;
    if (!s.painted || s.dragging || !s.atBottom) return;
    scrollRef.current?.scrollToEnd({ animated: true });
  };
  useKeyboardSettle(() => ({ painted: scroll.current.painted, atEnd: scroll.current.atBottom, dragging: scroll.current.dragging }), settle);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);
  const settleAfter = (ms: number) => {
    const s = scroll.current;
    if (!settlesAtEnd({ painted: s.painted, atEndBefore: s.atBottom, dragging: s.dragging })) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(settle, ms + 30);
  };
  /* the ⊕'s tray in the keyboard's place: drawn only while the keyboard is down */
  const trayKit = useKeyboardTray(keyboard, tray, setTray, settleAfter);
  const decide = (facts: FollowFacts) => {
    const d = follow(facts);
    if (spendsOwn(facts, d)) scroll.current.ownPending = false;
    if (d === "none") return;
    scroll.current.painted = true;
    scroll.current.atBottom = true;
    scrollRef.current?.scrollToEnd({ animated: d === "glide" });
  };
  const onListScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    scroll.current.atBottom = atBottomOf({ contentHeight: contentSize.height, offsetY: contentOffset.y, viewportHeight: layoutMeasurement.height });
  };
  const onListContent = (_w: number, h: number) => {
    const s = scroll.current;
    // the first paint is the first time there is something in the stream (the chips and the empty
    // line alone don't count), so the posts open at the newest instead of gliding down to it
    decide({ event: "content", painted: s.painted, hasContent: h > 0 && stream.length > 0, atBottom: s.atBottom, ownPending: s.ownPending });
  };
  // the keyboard, the tray or a growing field took some of the list's height
  const onListLayout = (e: LayoutChangeEvent) => {
    const s = scroll.current;
    const h = e.nativeEvent.layout.height;
    if (h === s.viewport) return;
    s.viewport = h;
    decide({ event: "viewport", painted: s.painted, hasContent: s.painted, atBottom: s.atBottom, ownPending: false });
  };

  const load = useCallback(() => {
    let alive = true;
    if (!(__DEV__ && storeMode)) readPostsCache().then((c) => alive && c.length && setPosts(c));
    // merge, don't replace: a guide opened by link can land before this read returns
    readLocal().then((l) => alive && setLocal((cur) => [...l, ...cur.filter((c) => !l.some((x) => x.id === c.id))]));
    if (!isGuest) readMailCache().then((c) => alive && c.length && setMail(c));
    if (__DEV__ && storeMode) {
      setPosts([{ ...DEMO_WREN_POSTS[0], body: DEMO_TEXT[getLang()].welcome, at: new Date(Date.now() - 2 * 3600_000).toISOString() }]);
    } else
    fetchWrenPosts().then((p) => {
      if (!alive) return;
      if (p) setPosts(p);
      else if (__DEV__) setPosts((cur) => (cur.length ? cur : DEMO_WREN_POSTS));
    });
    if (!isGuest) fetchWrenMail().then((m) => alive && m && setMail(m));
    void fetchAnswers();
    return () => {
      alive = false;
    };
  }, [isGuest]);
  useFocusEffect(load);

  /* what is in front of you is what you have seen — and the tab's number
     stops counting her desk now, not the next time Kindreds is opened
     (reading her from Today's strip left a 1 on the Kindreds tab) */
  useEffect(() => {
    if (!posts.length) return;
    void markRoomSeen(WREN_ROOM, posts.length);
    setDeskWaiting(0);
  }, [posts.length]);

  /* a guide asked for by link — a post's "see how", or a push — opens
     itself at the foot of the room, once */
  const linked = useRef<string | null>(null);
  useEffect(() => {
    const g = params.guide;
    if (!isGuideId(g) || linked.current === g) return;
    linked.current = g;
    void show({ kind: "guide", guide: g }, __DEV__ && storeMode ? DEMO_TEXT[getLang()].ask : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.guide]);

  const stream = useMemo<Item[]>(() => buildWrenStream(posts, mail, local), [posts, mail, local]);

  const canSend = text.trim().length > 0 && !sending;

  /* her own answer, kept on this phone */
  const show = async (answer: Answer, q: string | null) => {
    const item: WrenLocal = { id: Date.now(), q, answer, at: new Date().toISOString() };
    wantEnd(); // her answer is brought into view wherever you were
    setLocal((l) => [...l, item]);
    await keepLocal(item);
  };

  const post = async (body: string, kind: WrenMailKind, mediaPath: string | null = null): Promise<boolean> => {
    if (isGuest) {
      pendingSend.current = body;
      openSignUpSheet(() => setNeedsAccount(true));
      return false;
    }
    setSending(true);
    const r = await sendWrenMail(body, kind, mediaPath);
    setSending(false);
    if (r === true) {
      wantEnd(); // your own mail is brought into view
      setMail((m) => [...m, { id: -Date.now(), kind, body, mediaPath, at: new Date().toISOString(), reply: null, repliedAt: null }]);
      void fetchWrenMail().then((m) => m && setMail(m));
      return true;
    }
    if (r === "unauthorized") {
      pendingSend.current = body;
      openSignUpSheet(() => setNeedsAccount(true));
    } else {
      alertFail(t("wo.fail.title"), t("wo.fail.body"));
    }
    return false;
  };

  const send = async (opts: { makers?: boolean; body?: string } = {}) => {
    const body = (opts.body ?? text).trim();
    if (!body || sending) return;
    /* a plain line is looked up first; a bug or an idea is for people */
    if (!mode && !opts.makers) {
      const hit = answerFor(body, await readAnswersCache());
      if (hit) {
        setText("");
        await show(hit, body);
        return;
      }
    }
    /* a bug brings the phone's own evidence with it: the last stalls,
       the build and the device (lib/stall-probe). A note that reads as
       something broken counts as a bug too — nobody should have to find
       the A BUG key first (owner sent "Hh" as a note, 2026-09-20). */
    const kind: WrenMailKind = mode ?? (looksBroken(body, getLang()) ? "bug" : "note");
    const full = kind === "bug" ? `${body}\n\n— diagnostics —\n${stallReport()}`.slice(0, 2000) : body;
    const ok = await post(full, kind);
    if (ok) {
      setText("");
      setMode(null);
    }
  };

  /* any picture, no ration: this is not a moment for a friend, it is a
     screenshot for the people who can fix what is in it */
  const sendPhoto = async () => {
    if (sending) return;
    if (isGuest) {
      openSignUpSheet(() => setNeedsAccount(true));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setSending(true);
    const path = await uploadMoment(res.assets[0].uri);
    setSending(false);
    if (!path) {
      alertFail(t("wo.fail.title"), t("wo.fail.body"));
      return;
    }
    await post(t("wo.photo.fallback"), "photo", path);
  };

  /* what you hand the makers, on the kindred room's coloured cards (owner, 2026-10-26: the black
     sticker cards out): a picture on low's blue, a bug on tired's lilac, an idea on happy's yellow */
  const HANDS: KChatTrace[] = [
    { key: "photo", glyph: "photo", title: t("wo.photo.t"), subtitle: "", tint: "low" },
    { key: "bug", glyph: "bug", title: t("wo.bug.t"), subtitle: "", tint: "tired" },
    { key: "idea", glyph: "idea", title: t("wo.idea.t"), subtitle: "", tint: "happy" },
  ];
  const onHand = (kind: string) => {
    // a bug, an idea or a note hands the keyboard to the field: the tray stays until it is up; a
    // picture opens the picker, the tray going down as it does
    if (kind === "photo") trayKit.close();
    else trayKit.handOff();
    setTray(false);
    if (kind === "photo") {
      void sendPhoto();
      return;
    }
    if (kind === "bug" || kind === "idea") setMode(kind);
    setTimeout(() => inputRef.current?.focus(), 160);
  };

  const words: WrenSpeakerWords = {
    you: t("ui.you"),
    wren: OFFICIAL_NAME.toUpperCase(),
    bug: t("wo.bug.t").toUpperCase(),
    idea: t("wo.idea.t").toUpperCase(),
    event: t("wo.kind.event"),
    note: t("wo.kind.note"),
  };
  const labelOf = (x: Item): string => wrenSpeaker(x, words);

  const openLink = (url: string) => {
    // a post may point back into the app — at a guide, most often
    const g = guideSlugOf(url);
    if (isGuideId(g)) {
      void show({ kind: "guide", guide: g }, null);
      return;
    }
    void Linking.openURL(url);
  };

  // the guess was wrong: the same words go on to people
  const notIt = (q: string) => () => void post(q, "note");

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: P.paper }}>
      {/* the one BackChevron at its place (centred 26 below the safe area); the 46 face row is centred on the same line */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 56, paddingRight: 10, paddingTop: 3, paddingBottom: 9 }}>
        <BackChevron onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds"))} color={P.ink} />
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 11 }}>
          <OfficialBird size={46} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: "600", color: P.ink }}>{OFFICIAL_NAME}</Text>
            <Text style={{ ...PFM.mono, fontSize: 9, letterSpacing: 1.1, color: P.ink40, marginTop: 2 }}>{t("wo.role").toUpperCase()}</Text>
          </View>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: P.ink12 }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 12, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEventThrottle={32}
          onScroll={onListScroll}
          onScrollBeginDrag={() => {
            scroll.current.dragging = true;
          }}
          onScrollEndDrag={() => {
            scroll.current.dragging = false;
          }}
          onContentSizeChange={onListContent}
          onLayout={onListLayout}
        >
          {stream.length === 0 && (
            <View style={{ alignItems: "center", paddingTop: 28, paddingBottom: 8 }}>
              <OfficialBird size={64} mood="curious" />
              <Text style={{ ...wrenLine, fontSize: 14.5, lineHeight: 22, color: P.ink60, textAlign: "center", marginTop: 16, maxWidth: 260 }}>
                {t("wo.empty")}
              </Text>
            </View>
          )}
          {stream.map((it, i) => {
            const prev = stream[i - 1];
            const day = dShort(it.at).toUpperCase();
            const newDay = !prev || day !== dShort(prev.at).toUpperCase();
            const dayRule = newDay && (
              <Text style={{ ...PFM.mono, fontSize: 9, letterSpacing: 1.4, color: P.ink40, textAlign: "center", marginTop: i ? 22 : 0, marginBottom: 16 }}>
                {day}
              </Text>
            );
            const label = labelOf(it);
            const mine = label.startsWith(t("ui.you"));
            // one label per run of the same voice — WREN, WREN · EVENT, YOU · BUG
            const sameSpeaker = !!prev && labelOf(prev) === label;
            const Label = (l: string, own: boolean, first: boolean) => (
              <Text style={{ ...PFM.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: own ? P.ink40 : P.pen, marginTop: first ? 0 : 16, marginBottom: 5 }}>{l}</Text>
            );
            const key = wrenItemKey(it);

            if (it.type === "local") {
              const a = it.local.answer;
              return (
                <View key={key}>
                  {dayRule}
                  {it.local.q ? (
                    <>
                      {(newDay || !sameSpeaker) && Label(t("ui.you"), true, newDay)}
                      <Text style={{ ...letter, fontSize: 16, lineHeight: 24, color: P.ink60, marginBottom: 3 }}>{it.local.q}</Text>
                      {Label(OFFICIAL_NAME.toUpperCase(), false, false)}
                    </>
                  ) : (
                    (newDay || !sameSpeaker) && Label(OFFICIAL_NAME.toUpperCase(), false, newDay)
                  )}
                  {a.kind === "text" && (
                    <Text style={{ ...letter, fontSize: 16, lineHeight: 24, color: P.ink, marginBottom: 3 }}>{a.text}</Text>
                  )}
                  {a.guide && <GuideCard guide={a.guide} onNotIt={it.local.q ? notIt(it.local.q) : undefined} />}
                </View>
              );
            }

            const photo = it.type === "mail" && it.mail.mediaPath ? it.mail.mediaPath : null;
            const body = it.type === "post" ? postText(it.post) : it.type === "reply" ? it.mail.reply || "" : it.mail.body;
            return (
              <View key={key}>
                {dayRule}
                {(newDay || !sameSpeaker) && Label(label, mine, newDay)}
                {photo ? (
                  <Pressable onPress={() => setPhotoFull({ path: photo })} accessibilityRole="imagebutton" accessibilityLabel={t("ph.open")} style={{ width: "62%", marginBottom: 6 }}>
                    <MediaImage path={photo} style={{ width: "100%", aspectRatio: 0.75, backgroundColor: T.soft2 }} />
                  </Pressable>
                ) : (
                  <Text style={{ ...letter, fontSize: 16, lineHeight: 24, color: mine ? P.ink60 : P.ink, marginBottom: 3 }}>{body}</Text>
                )}
                {/* a release's reel plays right under its post; a reel this build
                    doesn't ship leaves the words alone, with no dead button */}
                {it.type === "post" && newsIdOf(it.post.link) ? (
                  <NewsCard id={newsIdOf(it.post.link)!} label={body.split("\n")[0]} />
                ) : it.type === "post" && !!it.post.link && (
                  <Pressable onPress={() => openLink(it.post.link!)} hitSlop={6} style={{ alignSelf: "flex-start", marginTop: 4, marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", letterSpacing: 0.6, color: P.pen }}>{t("wo.open")} ›</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {/* the guides, findable without typing */}
          <GuideChips
            ids={allChips ? GUIDES.map((g) => g.id) : FIRST_CHIPS}
            onPick={(g) => void show({ kind: "guide", guide: g }, null)}
            more={!allChips}
            onMore={() => setAllChips(true)}
          />

          {/* the one honest line about where your words go */}
          {mail.length > 0 && (
            <Text style={{ ...PFM.mono, fontSize: 9.5, letterSpacing: 0.6, lineHeight: 15, color: P.ink40, marginTop: 18 }}>{t("wo.mailNote")}</Text>
          )}
        </ScrollView>

        {mode && (
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 8, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: P.pen, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: P.penWash }}>
              <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1, color: P.pen }}>{(mode === "bug" ? t("wo.bug.t") : t("wo.idea.t")).toUpperCase()}</Text>
              <Pressable onPress={() => setMode(null)} hitSlop={8}>
                <Text style={{ ...PFM.mono, fontSize: 12, color: P.pen }}>×</Text>
              </Pressable>
            </View>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 14, paddingBottom: keyboard.up || trayKit.shown ? 14 : 14 + insets.bottom }}>
          {/* ⊕ on the left, the arrow inside the pill (owner, 2026-09-20) */}
          <Pressable
            // with the keyboard up the tray rises as it goes down, in the same commit
            onPress={() => trayKit.toggle(Keyboard.dismiss)}
            hitSlop={6}
            // no ring (owner, 2026-10-26); open, the lilac disc the kindred room's × sits on
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: tray ? T.lav : "transparent", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
          >
            <PlusGlyph size={24} open={tray} color={tray ? P.pen : P.ink} />
          </Pressable>
          <ChatField
            ref={inputRef}
            text={text}
            canSend={canSend}
            onSend={() => void send()}
            onChangeText={setText}
            // the keyboard's rise closes the tray, in the same commit (not the focus, a frame early)
            onFocus={trayKit.onFieldFocus}
            style={letter}
            placeholder={mode === "bug" ? t("wo.bug.ph") : mode === "idea" ? t("wo.idea.ph") : t("wo.ph")}
          />
        </View>
        {trayKit.shown && (
          <View onAccessibilityEscape={trayKit.close}>
            <PlayTray traces={HANDS} title="" onPick={onHand} bottomInset={insets.bottom} />
          </View>
        )}
      </KeyboardAvoidingView>
      <PhotoLightbox photo={photoFull} onClose={() => setPhotoFull(null)} />

      <SignUpSheet
        open={needsAccount}
        reason={t("wo.signup.reason")}
        onClose={() => setNeedsAccount(false)}
        onSignedIn={() => {
          setNeedsAccount(false);
          const body = pendingSend.current;
          pendingSend.current = null;
          if (body) void send({ makers: true, body });
        }}
      />
    </SafeAreaView>
  );
}
