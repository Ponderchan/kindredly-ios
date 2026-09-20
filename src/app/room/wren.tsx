import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
    const r = await sendWrenMail(body);
    setSending(false);
    if (r === true) {
      setText("");
      setMail((m) => [...m, { id: -Date.now(), body, at: new Date().toISOString() }]);
      void fetchWrenMail().then((m) => m && setMail(m));
    } else if (r === "unauthorized") {
      openSignUpSheet(() => setNeedsAccount(true));
    } else {
      alertFail(t("wo.fail.title"), t("wo.fail.body"));
    }
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
            const sameSpeaker = !!prev && (prev.type === "mail") === mine && (mine || (prev.type === "post" && it.type === "post" && prev.post.kind === it.post.kind));
            const label = mine
              ? t("ui.you")
              : it.post.kind === "event"
                ? `${OFFICIAL_NAME.toUpperCase()} · ${t("wo.kind.event")}`
                : it.post.kind === "note"
                  ? `${OFFICIAL_NAME.toUpperCase()} · ${t("wo.kind.note")}`
                  : OFFICIAL_NAME.toUpperCase();
            return (
              <View key={it.type === "post" ? `p-${it.post.id}` : `m-${it.mail.id}`}>
                {dayRule}
                {(newDay || !sameSpeaker) && (
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: mine ? P.ink40 : P.pen, marginTop: newDay ? 0 : 16, marginBottom: 5 }}>
                    {label}
                  </Text>
                )}
                <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: mine ? P.ink60 : P.ink, marginBottom: 3 }}>
                  {mine ? it.mail.body : postText(it.post)}
                </Text>
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

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
          <View style={{ flex: 1, borderRadius: 20, backgroundColor: "#F3F2FA", paddingHorizontal: 14 }}>
            <GlyphInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={t("wo.ph")}
              placeholderTextColor={P.ink40}
              multiline
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => canSend && void send()}
              style={{ ...fieldBox(text, 24, 110), paddingTop: 9, paddingBottom: 9, fontFamily: PF.writing, fontSize: 16, lineHeight: 24, color: P.ink }}
            />
          </View>
        </View>
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
