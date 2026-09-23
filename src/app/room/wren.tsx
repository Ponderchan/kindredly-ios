import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { getLang, t, useLang } from "../../lib/i18n";
import { P, PF } from "../../theme/post";
import { ChatField } from "../../components/ChatField";
import { OfficialBird } from "../../components/WrenDesk";
import { GuideCard, GuideChips } from "../../components/GuideCard";
import { SignUpSheet, openSignUpSheet } from "../../components/SignUpSheet";
import { TraceTray, type TraceAction } from "../../components/LeaveATrace";
import { PlusGlyph } from "../../components/ComposeTray";
import { dShort } from "../../lib/format";
import { alertFail } from "../../lib/fail";
import { useAuth } from "../../lib/auth";
import { markRoomSeen } from "../../lib/room-seen";
import { setDeskWaiting } from "../../lib/waiting";
import { momentUrl, uploadMoment } from "../../lib/db";
import { answerFor, fetchAnswers, readAnswersCache, type Answer } from "../../lib/wren-answers";
import { GUIDES, isGuideId, type GuideId } from "../../data/guides";
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
   read of her. */

type Item =
  | { type: "post"; post: WrenPost; at: string }
  | { type: "mail"; mail: WrenMail; at: string }
  | { type: "reply"; mail: WrenMail; at: string }
  | { type: "local"; local: WrenLocal; at: string };

const FIRST_CHIPS: GuideId[] = ["letters", "kindreds", "aura"];

export default function WrenDeskScreen() {
  useLang();
  const router = useRouter();
  const params = useLocalSearchParams<{ guide?: string }>();
  const { isGuest } = useAuth();
  const [posts, setPosts] = useState<WrenPost[]>([]);
  const [mail, setMail] = useState<WrenMail[]>([]);
  const [local, setLocal] = useState<WrenLocal[]>([]);
  const [text, setText] = useState("");
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

  const stream = useMemo<Item[]>(() => {
    const all: Item[] = [
      ...posts.map((post) => ({ type: "post" as const, post, at: post.at })),
      ...mail.map((m) => ({ type: "mail" as const, mail: m, at: m.at })),
      ...mail.filter((m) => m.reply).map((m) => ({ type: "reply" as const, mail: m, at: m.repliedAt || m.at })),
      ...local.map((l) => ({ type: "local" as const, local: l, at: l.at })),
    ];
    return all.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [posts, mail, local]);

  const canSend = text.trim().length > 0 && !sending;

  /* her own answer, kept on this phone */
  const show = async (answer: Answer, q: string | null) => {
    const item: WrenLocal = { id: Date.now(), q, answer, at: new Date().toISOString() };
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

  const HANDS: TraceAction[] = [
    { id: "photo", title: t("wo.photo.t"), sub: "" },
    { id: "bug", title: t("wo.bug.t"), sub: "" },
    { id: "idea", title: t("wo.idea.t"), sub: "" },
  ];
  const onHand = (kind: string) => {
    setTray(false);
    if (kind === "photo") {
      void sendPhoto();
      return;
    }
    if (kind === "bug" || kind === "idea") setMode(kind);
    setTimeout(() => inputRef.current?.focus(), 160);
  };

  const labelOf = (x: Item): string => {
    if (x.type === "mail")
      return x.mail.kind === "bug" ? `${t("ui.you")} · ${t("wo.bug.t").toUpperCase()}` : x.mail.kind === "idea" ? `${t("ui.you")} · ${t("wo.idea.t").toUpperCase()}` : t("ui.you");
    if (x.type === "local") return x.local.q ? t("ui.you") : OFFICIAL_NAME.toUpperCase();
    if (x.type === "reply") return OFFICIAL_NAME.toUpperCase();
    return x.post.kind === "event"
      ? `${OFFICIAL_NAME.toUpperCase()} · ${t("wo.kind.event")}`
      : x.post.kind === "note"
        ? `${OFFICIAL_NAME.toUpperCase()} · ${t("wo.kind.note")}`
        : OFFICIAL_NAME.toUpperCase();
  };

  const openLink = (url: string) => {
    // a post may point back into the app — at a guide, most often
    const m = url.match(/^kindredly:\/\/\/?guide\/([a-z]+)$/);
    if (m && isGuideId(m[1])) {
      void show({ kind: "guide", guide: m[1] }, null);
      return;
    }
    void Linking.openURL(url);
  };

  // the guess was wrong: the same words go on to people
  const notIt = (q: string) => () => void post(q, "note");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds"))}
          hitSlop={10}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 11 }}>
          <OfficialBird size={46} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: PF.letter, fontSize: 19, fontWeight: "600", color: P.ink }}>{OFFICIAL_NAME}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.1, color: P.ink40, marginTop: 2 }}>{t("wo.role").toUpperCase()}</Text>
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
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {stream.length === 0 && (
            <View style={{ alignItems: "center", paddingTop: 28, paddingBottom: 8 }}>
              <OfficialBird size={64} mood="curious" />
              <Text style={{ fontFamily: PF.serifItalic, fontSize: 14.5, lineHeight: 22, color: P.ink60, textAlign: "center", marginTop: 16, maxWidth: 260 }}>
                {t("wo.empty")}
              </Text>
            </View>
          )}
          {stream.map((it, i) => {
            const prev = stream[i - 1];
            const day = dShort(it.at).toUpperCase();
            const newDay = !prev || day !== dShort(prev.at).toUpperCase();
            const dayRule = newDay && (
              <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.4, color: P.ink40, textAlign: "center", marginTop: i ? 22 : 0, marginBottom: 16 }}>
                {day}
              </Text>
            );
            const label = labelOf(it);
            const mine = label.startsWith(t("ui.you"));
            // one label per run of the same voice — WREN, WREN · EVENT, YOU · BUG
            const sameSpeaker = !!prev && labelOf(prev) === label;
            const Label = (l: string, own: boolean, first: boolean) => (
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: own ? P.ink40 : P.pen, marginTop: first ? 0 : 16, marginBottom: 5 }}>{l}</Text>
            );
            const key = it.type === "post" ? `p-${it.post.id}` : it.type === "local" ? `l-${it.local.id}` : it.type === "reply" ? `r-${it.mail.id}` : `m-${it.mail.id}`;

            if (it.type === "local") {
              const a = it.local.answer;
              return (
                <View key={key}>
                  {dayRule}
                  {it.local.q ? (
                    <>
                      {(newDay || !sameSpeaker) && Label(t("ui.you"), true, newDay)}
                      <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink60, marginBottom: 3 }}>{it.local.q}</Text>
                      {Label(OFFICIAL_NAME.toUpperCase(), false, false)}
                    </>
                  ) : (
                    (newDay || !sameSpeaker) && Label(OFFICIAL_NAME.toUpperCase(), false, newDay)
                  )}
                  {a.kind === "text" && (
                    <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink, marginBottom: 3 }}>{a.text}</Text>
                  )}
                  {a.guide && <GuideCard guide={a.guide} onNotIt={it.local.q ? notIt(it.local.q) : undefined} />}
                </View>
              );
            }

            const photo = it.type === "mail" && it.mail.mediaPath ? momentUrl(it.mail.mediaPath) : null;
            const body = it.type === "post" ? postText(it.post) : it.type === "reply" ? it.mail.reply || "" : it.mail.body;
            return (
              <View key={key}>
                {dayRule}
                {(newDay || !sameSpeaker) && Label(label, mine, newDay)}
                {photo ? (
                  <Image source={{ uri: photo }} style={{ width: "62%", aspectRatio: 0.75, marginBottom: 6, backgroundColor: "#EFEDE6" }} resizeMode="cover" />
                ) : (
                  <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: mine ? P.ink60 : P.ink, marginBottom: 3 }}>{body}</Text>
                )}
                {it.type === "post" && !!it.post.link && (
                  <Pressable onPress={() => openLink(it.post.link!)} hitSlop={6} style={{ alignSelf: "flex-start", marginTop: 4, marginBottom: 6 }}>
                    <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1, color: P.pen }}>{t("wo.open")} ›</Text>
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
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.6, lineHeight: 15, color: P.ink40, marginTop: 18 }}>{t("wo.mailNote")}</Text>
          )}
        </ScrollView>

        {mode && (
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 8, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: P.pen, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: P.penWash }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1, color: P.pen }}>{(mode === "bug" ? t("wo.bug.t") : t("wo.idea.t")).toUpperCase()}</Text>
              <Pressable onPress={() => setMode(null)} hitSlop={8}>
                <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.pen }}>×</Text>
              </Pressable>
            </View>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
          {/* ⊕ on the left, the arrow inside the pill (owner, 2026-09-20) */}
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setTray((v) => !v);
            }}
            hitSlop={6}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: P.ink, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
          >
            <PlusGlyph size={24} open={tray} color={tray ? P.pen : P.ink} />
          </Pressable>
          <ChatField
            ref={inputRef}
            text={text}
            canSend={canSend}
            onSend={() => void send()}
            onChangeText={setText}
            onFocus={() => setTray(false)}
            placeholder={mode === "bug" ? t("wo.bug.ph") : mode === "idea" ? t("wo.idea.ph") : t("wo.ph")}
          />
        </View>
        {tray && <TraceTray actions={HANDS} onPick={onHand} />}
      </KeyboardAvoidingView>

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
