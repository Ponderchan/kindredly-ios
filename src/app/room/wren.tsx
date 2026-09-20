import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { t, useLang } from "../../lib/i18n";
import { P, PF } from "../../theme/post";
import { GlyphInput } from "../../components/GlyphInput";
import { OfficialBird } from "../../components/WrenDesk";
import { SignUpSheet, openSignUpSheet } from "../../components/SignUpSheet";
import { dShort } from "../../lib/format";
import { fieldBox } from "../../lib/field";
import { alertFail } from "../../lib/fail";
import { useAuth } from "../../lib/auth";
import { markRoomSeen } from "../../lib/room-seen";
import { momentUrl, uploadMoment } from "../../lib/db";
import { TraceTray, type TraceAction } from "../../components/LeaveATrace";
import { PlusGlyph } from "../../components/ComposeTray";
import {
  OFFICIAL_NAME,
  WREN_ROOM,
  fetchWrenMail,
  fetchWrenPosts,
  postText,
  readMailCache,
  readPostsCache,
  sendWrenMail,
  type WrenMail,
  type WrenMailKind,
  type WrenPost,
} from "../../lib/wren-desk";
import { DEMO_WREN_POSTS } from "../../data/demo";

/* WREN'S DESK — the one room everybody has.
   ────────────────────────────────────────────────────────────────────────
   Same grammar as a kindred's room (no bubbles, no minute stamps, a day
   rule and a speaker label), because it is the same kind of place: a
   transcript, not an inbox. What is different is who is on the other
   side. It is the courier herself, speaking to everyone at once — product
   news, events, the odd note — and what you write back goes to the people
   who make Kindredly. Nothing here is a correspondence: no reveal, no
   count to five, no aura read of her. */

type Item = { type: "post"; post: WrenPost; at: string } | { type: "mail"; mail: WrenMail; at: string };

export default function WrenDeskScreen() {
  useLang();
  const router = useRouter();
  const { isGuest } = useAuth();
  const [posts, setPosts] = useState<WrenPost[]>([]);
  const [mail, setMail] = useState<WrenMail[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [needsAccount, setNeedsAccount] = useState(false);
  /* the ⊕ opens what you can hand the makers: a picture (a screenshot,
     usually), a bug, an idea. Bug and idea are a MODE on the field — the
     mail goes out tagged so it can be sorted before it is read. */
  const [tray, setTray] = useState(false);
  const [mode, setMode] = useState<Exclude<WrenMailKind, "note" | "photo"> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(() => {
    let alive = true;
    readPostsCache().then((c) => alive && c.length && setPosts(c));
    if (!isGuest) readMailCache().then((c) => alive && c.length && setMail(c));
    fetchWrenPosts().then((p) => {
      if (!alive) return;
      if (p) setPosts(p);
      else if (__DEV__) setPosts((cur) => (cur.length ? cur : DEMO_WREN_POSTS));
    });
    if (!isGuest) fetchWrenMail().then((m) => alive && m && setMail(m));
    return () => {
      alive = false;
    };
  }, [isGuest]);
  useFocusEffect(load);

  // what is in front of you is what you have seen
  useEffect(() => {
    if (posts.length) void markRoomSeen(WREN_ROOM, posts.length);
  }, [posts.length]);

  const stream = useMemo<Item[]>(() => {
    const all: Item[] = [
      ...posts.map((post) => ({ type: "post" as const, post, at: post.at })),
      ...mail.map((m) => ({ type: "mail" as const, mail: m, at: m.at })),
    ];
    return all.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [posts, mail]);

  const canSend = text.trim().length > 0 && !sending;

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    if (isGuest) {
      openSignUpSheet(() => setNeedsAccount(true));
      return;
    }
    setSending(true);
    const kind: WrenMailKind = mode ?? "note";
    const r = await sendWrenMail(body, kind);
    setSending(false);
    if (r === true) {
      setText("");
      setMode(null);
      setMail((m) => [...m, { id: -Date.now(), kind, body, mediaPath: null, at: new Date().toISOString() }]);
      void fetchWrenMail().then((m) => m && setMail(m));
    } else if (r === "unauthorized") {
      openSignUpSheet(() => setNeedsAccount(true));
    } else {
      alertFail(t("wo.fail.title"), t("wo.fail.body"));
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
    const r = path ? await sendWrenMail(t("wo.photo.fallback"), "photo", path) : "failed";
    setSending(false);
    if (r === true) {
      setMail((m) => [...m, { id: -Date.now(), kind: "photo", body: t("wo.photo.fallback"), mediaPath: path, at: new Date().toISOString() }]);
      void fetchWrenMail().then((m) => m && setMail(m));
    } else if (r === "unauthorized") {
      openSignUpSheet(() => setNeedsAccount(true));
    } else {
      alertFail(t("wo.fail.title"), t("wo.fail.body"));
    }
  };

  const HANDS: TraceAction[] = [
    { id: "photo", title: t("wo.photo.t"), sub: "" },
    { id: "bug", title: t("wo.bug.t"), sub: "" },
    { id: "idea", title: t("wo.idea.t"), sub: "" },
  ];
  const labelOf = (x: Item): string =>
    x.type === "mail"
      ? x.mail.kind === "bug"
        ? `${t("ui.you")} · ${t("wo.bug.t").toUpperCase()}`
        : x.mail.kind === "idea"
          ? `${t("ui.you")} · ${t("wo.idea.t").toUpperCase()}`
          : t("ui.you")
      : x.post.kind === "event"
        ? `${OFFICIAL_NAME.toUpperCase()} · ${t("wo.kind.event")}`
        : x.post.kind === "note"
          ? `${OFFICIAL_NAME.toUpperCase()} · ${t("wo.kind.note")}`
          : OFFICIAL_NAME.toUpperCase();

  const onHand = (kind: string) => {
    setTray(false);
    if (kind === "photo") {
      void sendPhoto();
      return;
    }
    if (kind === "bug" || kind === "idea") setMode(kind);
    setTimeout(() => inputRef.current?.focus(), 160);
  };

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
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 }}>
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
            const mine = it.type === "mail";
            const label = labelOf(it);
            // one label per run of the same voice — WREN, WREN · EVENT, YOU · BUG
            const sameSpeaker = !!prev && labelOf(prev) === label;
            const photo = it.type === "mail" && it.mail.mediaPath ? momentUrl(it.mail.mediaPath) : null;
            return (
              <View key={it.type === "post" ? `p-${it.post.id}` : `m-${it.mail.id}`}>
                {dayRule}
                {(newDay || !sameSpeaker) && (
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: mine ? P.ink40 : P.pen, marginTop: newDay ? 0 : 16, marginBottom: 5 }}>
                    {label}
                  </Text>
                )}
                {photo ? (
                  <Image source={{ uri: photo }} style={{ width: "62%", aspectRatio: 0.75, marginBottom: 6, backgroundColor: "#EFEDE6" }} resizeMode="cover" />
                ) : (
                  <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: mine ? P.ink60 : P.ink, marginBottom: 3 }}>
                    {mine ? it.mail.body : postText(it.post)}
                  </Text>
                )}
                {it.type === "post" && !!it.post.link && (
                  <Pressable onPress={() => Linking.openURL(it.post.link!)} hitSlop={6} style={{ alignSelf: "flex-start", marginTop: 4, marginBottom: 6 }}>
                    <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1, color: P.pen }}>{t("wo.open")} ›</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
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
          <View style={{ flex: 1, borderRadius: 20, backgroundColor: "#F3F2FA", paddingHorizontal: 14 }}>
            <GlyphInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              onFocus={() => setTray(false)}
              placeholder={mode === "bug" ? t("wo.bug.ph") : mode === "idea" ? t("wo.idea.ph") : t("wo.ph")}
              placeholderTextColor={P.ink40}
              multiline
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => canSend && void send()}
              style={{ ...fieldBox(text, 24, 110), paddingTop: 9, paddingBottom: 9, fontFamily: PF.writing, fontSize: 16, lineHeight: 24, color: P.ink }}
            />
          </View>
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
        </View>
        {tray && <TraceTray actions={HANDS} onPick={onHand} />}
      </KeyboardAvoidingView>

      <SignUpSheet
        open={needsAccount}
        reason={t("wo.signup.reason")}
        onClose={() => setNeedsAccount(false)}
        onSignedIn={() => {
          setNeedsAccount(false);
          void send();
        }}
      />
    </SafeAreaView>
  );
}
