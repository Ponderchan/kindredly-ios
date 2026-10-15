import { useMemo, useRef, useState } from "react";
import { GlyphInput } from "../../components/GlyphInput";
import { archNameThird } from "../../lib/aura-copy";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { t, useLang, t as tr } from "../../lib/i18n";
import { P, PF } from "../../theme/post";
import { CorrespondentFace } from "../../components/CorrespondentFace";
import { ReportMenu } from "../../components/ReportMenu";
import { dLong, dShort } from "../../lib/format";
import { theirLatest, type ThreadMessage } from "../../lib/db";
import type { Fold } from "../../lib/folds";
import { daysLeft, quietDays } from "../../lib/kindred-expiry";
import { MediaImage } from "../../lib/media";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { MessageMenu, a11yActions, type MessageAction } from "../../components/MessageMenu";
import { Linking, Modal } from "react-native";
import { TraceTray } from "../../components/LeaveATrace";
import { PlusGlyph } from "../../components/ComposeTray";
import { WrenBird } from "../../components/WrenBird";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../../lib/weighted-count";
import { fieldBox } from "../../lib/field";
import type { KMenuAction } from "../../../modules/kindredly-ui/src/types";
import { foldHalfMenu, halfKey, lineMenu, photoMenu as photoMenuOf, songMenu as songMenuOf } from "./build-items";
import { useRoomModel, type ChatUi } from "./useRoomModel";

/* THE ROOM IN REACT NATIVE — the fallback behind the remote switch (10a
   step 5). This is room/[id].tsx's screen as it was, moved here so the
   route can choose between it and the SwiftUI conversation
   (ConversationNative). Its JSX is unchanged; what it shows and does now
   comes from the same model the Swift screen runs on (useRoomModel: the
   thread offline-safe, every send, every action) and its long-press menus
   from the same rules (build-items), so the two can't drift. The next
   slice moves it onto the theme and the 10a look. */

/* THE ROOM — where you are once you know each other.
   ────────────────────────────────────────────────────────────────────────
   Before names are traded you are in a CORRESPONDENCE, and chat/[id] is
   built for that: a docket on every letter, a stamp, a count of how many
   have passed, and a tap that opens any one of them full-page like a
   document you might file. That grammar is right for a courtship.

   It is wrong for a friend. You do not archive someone's texts, or check
   which number this one was. So the reveal doesn't just change what things
   are called — it changes the room you are standing in, and TALK TO takes
   you here instead.

   What is deliberately absent, and why:
   · no dockets, no stamps, no letter numbers — the post office furniture
     belongs to the part where you were strangers
   · no minute timestamps. 18:12 is instant-messaging grammar and would
     quietly promise a speed this product does not offer; the day is as
     precise as a letter has ever been
   · bubbles, since 2026-09-20 (owner): yours right in pen blue, theirs
     left on grey. Two voices in one ink were too hard to tell apart

   What is always present: their mark at the top. You are in THEIR room.

   NOT AN INBOX. There is no typing indicator, no read receipt, no
   presence. Nothing here reports on the other person's attention. */
export function RoomRN(props: { id?: string; expired?: string; closing?: string } = {}) {
  useLang(); // repaint on language change
  const params = useLocalSearchParams<{ id: string; expired?: string; closing?: string }>();
  const id = props.id ?? params.id;
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  /* where each line sits (a quote scrolls to its original), and the original a tapped quote lit
     up for a moment */
  const msgY = useRef<Record<string, number>>({});
  const [lit, setLit] = useState<string | null>(null);
  const shownCount = useRef(0);
  const atBottom = useRef(true); // the room follows new lines and openings only while you're at the end
  /* a quote, tapped: back to the line it quotes, lit for a moment */
  const jumpTo = (msgId: string) => {
    const y = msgY.current[msgId];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 90), animated: true });
    setLit(msgId);
    setTimeout(() => setLit((cur) => (cur === msgId ? null : cur)), 1400);
  };
  const jumpRef = useRef(jumpTo);
  jumpRef.current = jumpTo;
  /* how the model reaches this screen's field and list */
  const ui = useMemo<ChatUi>(
    () => ({
      focus: (target, delayMs) => {
        if (target === "body") setTimeout(() => inputRef.current?.focus(), delayMs);
      },
      // the field shows the model's own text (controlled): nothing to seed
      seedText: () => {},
      scrollToEnd: (animated, delayMs) => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), delayMs);
      },
      jumpTo: (key) => jumpRef.current(key),
      thenModal: (fn) => fn(),
    }),
    [],
  );
  const {
    detail,
    name,
    read,
    wren,
    stream,
    conv,
    songs,
    songSays,
    notice,
    dismissNotice,
    text,
    setText,
    mode,
    setMode,
    replyTo,
    setReplyTo,
    trans,
    sending,
    tracing,
    setTracing,
    shelf,
    setShelf,
    photoFull,
    setPhotoFull,
    expired,
    closing,
    lastAt,
    TRACES,
    onTrace,
    seedQuestion,
    onSend,
    menuCtx,
    keyOf,
    onItemAction,
  } = useRoomModel(id, { ui, expiredParam: props.expired ?? params.expired, closingParam: props.closing ?? params.closing });

  const weight = weightedCount(text);
  const over = weight > LETTER_MAX;
  const canSend = weight >= REPLY_MIN && !over && !sending;

  /* LONG-PRESS (owner, 2026-10-10): the shared rules (build-items), each item running the
     model's action for its row */
  const rn = (acts: KMenuAction[], key: string): MessageAction[] =>
    acts.map((a) => ({ key: a.key, label: a.title, icon: a.icon, destructive: a.destructive, onPress: () => onItemAction(key, a.key) }));
  const lineKey = keyOf;
  const menuFor = (m: ThreadMessage): MessageAction[] => rn(lineMenu(m, lineKey(m), menuCtx), lineKey(m));
  const photoMenu = (m: ThreadMessage): MessageAction[] => rn(photoMenuOf(m, menuCtx), lineKey(m));
  const songMenu = (m: ThreadMessage): MessageAction[] => rn(songMenuOf(m, menuCtx), lineKey(m));
  const foldMenu = (half: Fold, _prompt: string | null): MessageAction[] => rn(foldHalfMenu(half, menuCtx), halfKey(half));

  const { width: winW } = useWindowDimensions();
  const bubbleMax = Math.round((winW - 44) * 0.84); // the list pads 22 a side
  /* what a long-press lifts is hosted natively and sized by its own
     content, so the photo, the song card and a fold's half get their widths
     in points rather than as a share of the row */
  const photoW = Math.round((winW - 44) * 0.7);
  const songMax = Math.round((winW - 44) * 0.86);
  const foldW = winW - 44 - 28; // a fold pads 13 and rules 1 a side

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      {/* their mark, always — you are in their room */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingTop: 2, paddingBottom: 10 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds"))}
          hitSlop={10}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/kindred/${id}`)}
          hitSlop={6}
          style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 11, opacity: pressed ? 0.6 : 1 })}
        >
          <CorrespondentFace
            seed={detail?.other || "anon"}
            theirs={detail?.otherCount ?? 5}
            revealed
            otherFace={detail?.otherFace}
            size="lg"
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: PF.letter, fontSize: 19, fontWeight: "600", color: P.ink }}>{name}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.1, color: P.ink40, marginTop: 2 }}>
              {detail?.since ? tr("rm.kindredSince", { date: dLong(detail.since).toUpperCase() }) : archNameThird(read?.archetype?.id)}
            </Text>
            {/* she carried every letter that got you here, and the room
                should say so once rather than her hovering in it */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}>
              <WrenBird size={13} mood="content" />
              <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 11.5, color: P.ink40 }}>{tr("rm.foundYouTwo", { wren })}</Text>
            </View>
          </View>
        </Pressable>
        <Pressable onPress={() => router.push("/lore")} hitSlop={8} style={{ width: 36, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.ink40 }}>❞</Text>
        </Pressable>
        <ReportMenu
          targetUser={detail?.other}
          context="thread"
          refId={id}
          snapshot={theirLatest(detail?.messages, detail?.openingFromMe ? null : detail?.opening)}
          onBlocked={() => router.replace("/(tabs)/kindreds")}
        />
      </View>
      <View style={{ height: 1, backgroundColor: P.ink12 }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            atBottom.current = contentSize.height - (contentOffset.y + layoutMeasurement.height) < 60;
          }}
          onContentSizeChange={() => {
            /* to the end when the room grows; when something opens under a line
               (a translation) only if you were already at the end — never a
               jump away from the line you were reading */
            const grew = stream.length !== shownCount.current;
            shownCount.current = stream.length;
            if (grew) scrollRef.current?.scrollToEnd({ animated: false });
            else if (atBottom.current) scrollRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {stream.map((it, i) => {
            const prev = stream[i - 1];
            const day = it.date ? dShort(it.date).toUpperCase() : "";
            const newDay = !!day && day !== (prev?.date ? dShort(prev.date).toUpperCase() : "");
            const dayRule = newDay && (
              <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.4, color: P.ink40, textAlign: "center", marginTop: i ? 22 : 0, marginBottom: 16 }}>
                {day}
              </Text>
            );

            if (it.type === "fold") {
              const f = it.fold;
              const a = it.answer;
              const open = !!a;
              return (
                <View key={`f-${f.id}`}>
                  {dayRule}
                  <View style={{ borderWidth: 1, borderColor: open ? P.ink : P.ink12, marginTop: 14, marginBottom: 6, padding: 13, backgroundColor: open ? P.paper : "#FAF9F3" }}>
                    <Text style={{ fontFamily: PF.monoMed, fontSize: 8.5, letterSpacing: 1.4, color: P.ink40 }}>
                      {f.kind === "question" ? t("rm.fold.q") : t("rm.fold.n")}
                    </Text>
                    {!!f.prompt && (
                      <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink, marginTop: 6 }}>{f.prompt}</Text>
                    )}
                    {open ? (
                      <>
                        {[f, a!].map((half) => {
                          const acts = foldMenu(half, f.prompt);
                          const ftx = trans[halfKey(half)];
                          return (
                            /* 8pt of the fold's own padding go into the half, so the lifted copy has a margin and the text doesn't move */
                            <View key={half.id} accessible {...a11yActions(acts)} style={{ marginHorizontal: -8 }}>
                              <MessageMenu actions={acts} radius={0}>
                                <View style={{ width: foldW + 16, paddingHorizontal: 8, paddingBottom: 4, backgroundColor: P.paper }}>
                                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.1, color: half.mine ? P.ink40 : P.pen, marginTop: 10 }}>
                                    {half.mine ? tr("ui.you") : name.toUpperCase()}
                                  </Text>
                                  <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: half.mine ? P.ink60 : P.ink, marginTop: 3 }}>
                                    {half.body ?? ""}
                                  </Text>
                                </View>
                              </MessageMenu>
                              {ftx?.busy && <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40, marginTop: 2, paddingHorizontal: 8 }}>{t("mm.translating")}</Text>}
                              {ftx?.shown && !!ftx.text && <Text style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: P.ink60, marginTop: 3, paddingHorizontal: 8 }}>{ftx.text}</Text>}
                            </View>
                          );
                        })}
                      </>
                    ) : f.mine ? (
                      <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 13.5, color: P.ink40, marginTop: 8 }}>{t("rm.fold.waiting", { name })}</Text>
                    ) : (
                      <Pressable
                        onPress={() => {
                          setMode({ kind: "answer", fold: f });
                          setTimeout(() => inputRef.current?.focus(), 120);
                        }}
                        hitSlop={6}
                        style={{ marginTop: 8 }}
                      >
                        <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 13.5, color: P.ink60 }}>
                          {f.kind === "question" ? t("rm.fold.answerToOpen") : t("rm.fold.foldToOpen")}
                        </Text>
                        <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1, color: P.pen, marginTop: 6 }}>
                          {f.kind === "question" ? t("rm.fold.answerKey") : t("rm.fold.foldKey")} ›
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }

            const m = it.msg;
            const photoPath = m.kind === "photo" ? m.mediaPath ?? null : null;
            const photoUri = m.kind === "photo" && !m.mediaPath ? m.meta?.url ?? null : null;
            const url = photoPath || photoUri;
            const song = m.kind === "song" && !!m.meta?.url;
            const card = !!url || song;
            /* BUBBLES, ONE SIDE EACH (owner, 2026-09-20). The room used to
               read as a transcript — a label, then the words, both sides
               flush left — and two voices in the same ink were hard to tell
               apart at a glance. Yours sit right in pen blue, theirs sit
               left on grey; no labels, the sides say it. */
            const prevMsg = prev?.type === "msg";
            /* TAKEN BACK (web 0031): the words are gone for both; a small note
               stays where they were, on the side they were said */
            if (m.recalledAt) {
              return (
                <View key={m.id ?? `m-${i}`}>
                  {dayRule}
                  <Text style={{ alignSelf: m.mine ? "flex-end" : "flex-start", fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.4, color: P.ink40, marginTop: prevMsg && !newDay ? 8 : 0, marginBottom: 4, paddingHorizontal: 6 }}>
                    {m.mine ? t("rm.recall.mine") : t("rm.recall.theirs", { name })}
                  </Text>
                </View>
              );
            }
            const k = lineKey(m);
            const tx = trans[k];
            const photoActs = url ? photoMenu(m) : [];
            const q = m.meta?.reply;
            const qGone = !!q && (!q.excerpt || !!detail?.messages.find((x) => x.id === q.id)?.recalledAt);
            return (
              <View key={m.id ?? `m-${i}`} onLayout={(e) => { if (m.id) msgY.current[m.id] = e.nativeEvent.layout.y; }}>
                {dayRule}
                <View style={{ alignItems: m.mine ? "flex-end" : "flex-start", marginTop: prevMsg && !newDay ? 6 : 0, marginBottom: 2, opacity: lit && lit === m.id ? 0.5 : 1 }}>
                  {url ? (
                    <Pressable
                      onPress={() => setPhotoFull({ path: photoPath, uri: photoUri })}
                      /* a long-press is the photo's menu, so lifting the finger must not also open it —
                         unless it has no menu (still sending), when a slow tap should still open it */
                      onLongPress={photoActs.length ? NOOP : undefined}
                      delayLongPress={350}
                      accessibilityRole="imagebutton"
                      accessibilityLabel={t("ph.open")}
                      {...a11yActions(photoActs)}
                      style={{ marginBottom: 4 }}
                    >
                      <MessageMenu actions={photoActs} radius={16}>
                        <MediaImage path={photoPath} uri={photoUri} style={{ width: photoW, height: photoW, borderRadius: 16, backgroundColor: "#EFEDE6" }} />
                      </MessageMenu>
                    </Pressable>
                  ) : song ? (
                    <Pressable
                      onPress={() => Linking.openURL(m.meta!.url!)}
                      onLongPress={NOOP} // the song menu always has the shelf
                      delayLongPress={350}
                      accessibilityRole="link"
                      accessibilityLabel={m.meta!.title || t("rm.song.card")}
                      {...a11yActions(songMenu(m))}
                      style={{ marginBottom: 4 }}
                    >
                      <MessageMenu actions={songMenu(m)} radius={16}>
                        <View style={{ maxWidth: songMax, borderWidth: 1, borderColor: m.mine ? P.pen : P.ink12, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: m.mine ? P.penWash : "#FFFFFF" }}>
                          <Text style={{ fontSize: 17 }}>🎵</Text>
                          <View style={{ flexShrink: 1 }}>
                            <Text numberOfLines={1} style={{ fontFamily: PF.monoMed, fontSize: 12.5, color: P.ink }}>
                              {m.meta!.title || t("rm.song.card")}
                            </Text>
                            <Text numberOfLines={1} style={{ fontFamily: PF.mono, fontSize: 9.5, color: P.ink40, marginTop: 2 }}>
                              {m.meta!.url!.replace(/^https?:\/\//, "").split("/")[0]}
                            </Text>
                          </View>
                          <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.pen }}>›</Text>
                        </View>
                      </MessageMenu>
                    </Pressable>
                  ) : null}
                  {!card && (
                    <MessageMenu actions={menuFor(m)}>
                      <View
                        style={{
                          maxWidth: bubbleMax,
                          backgroundColor: m.mine ? P.pen : "#F3F2FA",
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 18,
                          borderBottomRightRadius: m.mine ? 5 : 18,
                          borderBottomLeftRadius: m.mine ? 18 : 5,
                        }}
                      >
                        {q && (
                          /* the line this one answers: whose, and a few of its words; tap to go back to it */
                          <Pressable
                            onPress={() => jumpTo(q.id)}
                            onLongPress={() => {}}
                            delayLongPress={350}
                            accessibilityRole="button"
                            style={{ borderLeftWidth: 2, borderLeftColor: m.mine ? "rgba(255,255,255,0.7)" : P.pen, paddingLeft: 8, marginBottom: 6 }}
                          >
                            <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1, color: m.mine ? "rgba(255,255,255,0.85)" : P.pen }}>
                              {(m.replyMine ? t("mm.you") : name).toUpperCase()}
                            </Text>
                            <Text numberOfLines={2} style={{ fontFamily: PF.letter, fontSize: 13.5, lineHeight: 18, fontStyle: qGone ? "italic" : "normal", color: m.mine ? "rgba(255,255,255,0.85)" : P.ink60 }}>
                              {qGone ? t("mm.quoteGone") : q.excerpt}
                            </Text>
                          </Pressable>
                        )}
                        <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 23, color: m.mine ? "#FFFFFF" : P.ink }}>{m.body}</Text>
                      </View>
                    </MessageMenu>
                  )}
                  {!card && tx?.busy && (
                    <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40, marginTop: 4, paddingHorizontal: 6 }}>{t("mm.translating")}</Text>
                  )}
                  {!card && tx?.shown && !!tx.text && (
                    /* the translation, under the line it renders — "Show original" in the same menu folds it away */
                    <Text style={{ maxWidth: bubbleMax, fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: P.ink60, marginTop: 5, paddingHorizontal: 6 }}>{tx.text}</Text>
                  )}
                  {song && songs.length >= 2 && conv[conv.length - 1] === m && (
                    <Pressable onPress={() => setShelf(true)} hitSlop={6} style={{ marginTop: 4, marginBottom: 6 }}>
                      <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1, color: P.pen }}>
                        {t("rm.shelf.open", { n: String(songs.length) })} ›
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* a room in its last week says so once, as the room's own state —
            above whatever is being written, the link run into the sentence.
            Not while a fold is being written: a fold doesn't move the clock */}
        {closing && !(mode && mode.kind !== "song") && (
          <Text style={{ marginHorizontal: 22, marginBottom: 8, fontFamily: PF.mono, fontSize: 11, lineHeight: 16, letterSpacing: 0.2, color: P.ink60 }}>
            {daysLeft(lastAt) <= 1 ? t("rm.closing.day") : t("rm.closing.days", { n: daysLeft(lastAt) })}{" "}
            <Text onPress={() => router.push("/paywall?src=closing")} accessibilityRole="link" style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.2, color: P.pen }}>
              {t("rm.closing.fc")} ›
            </Text>
          </Text>
        )}

        {/* she leaves one thing on the table, at the foot of the room */}
        {!!notice && (
          <View style={{ marginHorizontal: 22, marginBottom: 10, borderWidth: 1, borderColor: P.ink12, padding: 13 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <WrenBird size={20} mood="curious" />
              <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.2, color: P.ink40 }}>
                {tr("rm.noticed", { wren: wren.toUpperCase() })}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontFamily: PF.mono, fontSize: 8.5, letterSpacing: 1, color: P.ink40, flexShrink: 1, textAlign: "right" }}>
                {notice.evidence}
              </Text>
              <Pressable onPress={dismissNotice} hitSlop={10} style={{ marginLeft: 4 }}>
                <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.ink40 }}>×</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 7 }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 15.5, lineHeight: 23, color: P.ink }}>{notice.line}</Text>
              {!!notice.word && (
                <View style={{ borderWidth: 1.5, borderColor: P.pen, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: P.penWash }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, color: P.pen }}>#{notice.word}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {over && (
          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.post, textAlign: "center", paddingBottom: 6 }}>
            {tr("ui.overLimit", { n: String(weight - LETTER_MAX) })}
          </Text>
        )}

        {replyTo && !mode && (
          <View style={{ marginHorizontal: 22, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10, borderLeftWidth: 2, borderLeftColor: P.pen, paddingLeft: 10, paddingVertical: 3, backgroundColor: P.paper }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.2, color: P.pen }}>
                {(replyTo.mine ? t("mm.replyingSelf") : t("mm.replyingTo", { name })).toUpperCase()}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: PF.letter, fontSize: 14, color: P.ink60, marginTop: 2 }}>{replyTo.quote.excerpt}</Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")}>
              <Text style={{ fontFamily: PF.mono, fontSize: 14, color: P.ink40 }}>✕</Text>
            </Pressable>
          </View>
        )}
        {mode && (
          <View style={{ marginHorizontal: 22, marginBottom: 8, borderWidth: 1, borderColor: P.pen, padding: 11, backgroundColor: P.penWash }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ flex: 1, fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.2, color: P.pen }}>
                {mode.kind === "note"
                  ? t("rm.mode.note")
                  : mode.kind === "question"
                    ? t("rm.mode.ask")
                    : mode.kind === "song"
                      ? t("rm.mode.song")
                      : mode.fold.kind === "question"
                        ? t("rm.mode.answerQ")
                        : t("rm.mode.answerN")}
              </Text>
              <Pressable onPress={() => setMode(null)} hitSlop={10}>
                <Text style={{ fontFamily: PF.mono, fontSize: 14, color: P.ink40 }}>✕</Text>
              </Pressable>
            </View>
            {mode.kind === "question" && (
              <TextInput
                value={mode.prompt}
                onChangeText={(v) => setMode({ kind: "question", prompt: v })}
                placeholder={t("rm.mode.promptPh")}
                placeholderTextColor={P.ink40}
                style={{ fontFamily: PF.letter, fontSize: 15.5, color: P.ink, marginTop: 7, paddingVertical: 2 }}
              />
            )}
            {mode.kind === "answer" && !!mode.fold.prompt && (
              <Text style={{ fontFamily: PF.letter, fontSize: 15.5, color: P.ink, marginTop: 7 }}>{mode.fold.prompt}</Text>
            )}
          </View>
        )}

        {/* NOBODY HOME — the same guard chat/[id] already had. A kindred can
            delete their account, and 0009 nulls their side of the thread
            rather than taking the letters with it. The room stayed fully
            operable: the tray opened, the composer accepted words, and only
            the send failed, with a dialog blaming the moment. It stays
            readable; it stops being somewhere you can leave things. */}
        {detail?.gone ? (
          <View style={{ paddingHorizontal: 26, paddingTop: 6, paddingBottom: 22 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 11.5, lineHeight: 18, letterSpacing: 0.3, color: P.ink40, textAlign: "center" }}>
              {t("ch.gone")}
            </Text>
          </View>
        ) : expired ? (
          <View style={{ marginHorizontal: 22, marginBottom: 16, borderWidth: 1, borderColor: P.ink12, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <WrenBird size={20} mood="think" />
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.2, color: P.ink40 }}>{t("kd.expiredRow", { n: quietDays(lastAt) })}</Text>
            </View>
            <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 22, color: P.ink, marginTop: 8 }}>{t("rm.expired.body")}</Text>
            <Pressable onPress={() => router.push("/paywall?src=rekindle")} style={({ pressed }) => ({ marginTop: 12, backgroundColor: P.ink, paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: "#FFFFFF" }}>{t("rm.rekindle")}</Text>
            </Pressable>
          </View>
        ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
          {/* THE BAR IS A MESSAGING BAR NOW (owner, 2026-09-20): the courier
              on the left — she brings a question when asked — the field as
              a pill, the ⊕ on the right where a send key used to sit. There
              is no send key: the keyboard's own blue SEND sends, the way
              every chat on the phone does. The ⊕ still opens the things to
              LEAVE (a note, a question, a moment, a song), not to attach. */}
          <Pressable
            onPress={seedQuestion}
            hitSlop={6}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: P.ink, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
          >
            <WrenBird size={24} mood="curious" />
          </Pressable>
          <View style={{ flex: 1, borderRadius: 20, backgroundColor: "#F3F2FA", paddingHorizontal: 14 }}>
            <GlyphInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              onFocus={() => setTracing(false)}
              placeholder={
                mode?.kind === "song"
                  ? t("rm.song.ph")
                  : mode?.kind === "question"
                    ? t("rm.mode.answerPh")
                    : mode
                      ? t("rm.mode.notePh")
                      : t("rm.ph")
              }
              placeholderTextColor={P.ink40}
              multiline
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => {
                if (sending) return;
                if (mode ? !text.trim() || (mode.kind === "question" && !mode.prompt.trim()) : !canSend) return;
                void onSend();
              }}
              autoCapitalize={mode?.kind === "song" ? "none" : "sentences"}
              style={{ ...fieldBox(text, 24, 110), paddingTop: 9, paddingBottom: 9, fontFamily: PF.writing, fontSize: 16, lineHeight: 24, color: P.ink }}
            />
          </View>
          <Pressable
            onPress={() => {
              /* the tray takes the keyboard's place: choosing something to
                 leave is not something you do mid-sentence */
              Keyboard.dismiss();
              setTracing((v) => !v);
            }}
            hitSlop={6}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: P.ink, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
          >
            <PlusGlyph size={24} open={tracing} color={tracing ? P.pen : P.ink} />
          </Pressable>
        </View>
        )}
        {tracing && !detail?.gone && !expired && <TraceTray actions={TRACES} onPick={onTrace} />}
      </KeyboardAvoidingView>


      {/* THE SHELF — every song either of you left, in order. A song in a
          scroll is gone by tomorrow; gathered, the same messages become
          what this product is for: accumulated evidence that you are
          alike, curated by nobody. */}
      <PhotoLightbox photo={photoFull} onClose={() => setPhotoFull(null)} />
      <Modal visible={shelf} transparent animationType="slide" onRequestClose={() => setShelf(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(17,17,19,0.32)", justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setShelf(false)} />
          <View style={{ backgroundColor: P.paper, maxHeight: "72%", paddingBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12 }}>
              <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1.6, color: P.ink }}>
                {t("rm.shelf.title", { name: name.toUpperCase() })}
              </Text>
              <Pressable onPress={() => setShelf(false)} hitSlop={10}>
                <Text style={{ fontFamily: PF.mono, fontSize: 16, color: P.ink40 }}>✕</Text>
              </Pressable>
            </View>
            {!!songSays && (
              <View style={{ marginHorizontal: 22, marginBottom: 12, borderWidth: 1, borderColor: P.ink12, padding: 11, flexDirection: "row", alignItems: "center", gap: 9 }}>
                <WrenBird size={18} mood="curious" />
                <Text style={{ flex: 1, fontFamily: PF.letter, fontSize: 14, lineHeight: 20, color: P.ink }}>
                  {t(songSays.line === "late" ? "rm.shelf.late" : "rm.shelf.both", { name })}
                </Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: P.ink40 }}>{songSays.evidence}</Text>
              </View>
            )}
            <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 8 }}>
              {songs.map((sg) => (
                <Pressable
                  key={sg.url}
                  onPress={() => Linking.openURL(sg.url)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: P.ink12 }}
                >
                  <Text style={{ fontSize: 15 }}>🎵</Text>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: PF.letter, fontSize: 15, color: P.ink }}>
                      {sg.title || sg.url.replace(/^https?:\/\//, "").split("/")[0]}
                    </Text>
                    <Text style={{ fontFamily: PF.mono, fontSize: 8.5, letterSpacing: 1, color: P.ink40, marginTop: 3 }}>
                      {(sg.mine ? tr("ui.you") : name).toUpperCase()} · {dShort(sg.at).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.pen }}>›</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const NOOP = () => {};
