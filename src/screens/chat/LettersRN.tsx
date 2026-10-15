import { useMemo, useRef } from "react";
import { GlyphInput } from "../../components/GlyphInput";
import { archNameThird } from "../../lib/aura-copy";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { t, useLang } from "../../lib/i18n";
import { MessageMenu, a11yActions, type MessageAction } from "../../components/MessageMenu";
import { P, PF } from "../../theme/post";
import { CorrespondentFace } from "../../components/CorrespondentFace";
import { Introduction } from "../../components/Introduction";
import { theirLatest, type ThreadMessage } from "../../lib/db";
import { LeaveSheet } from "../../components/LeaveSheet";
import { ReportMenu } from "../../components/ReportMenu";
import { dShort, postNo, localeTag } from "../../lib/format";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../../lib/weighted-count";
import { fieldBox } from "../../lib/field";
import { Toast } from "../../components/ui";
import type { KMenuAction } from "../../../modules/kindredly-ui/src/types";
import { REVEAL, letterMenu } from "./build-items";
import { useLettersModel } from "./useLettersModel";
import type { ChatUi } from "./useRoomModel";

/* THE PEN-PAL CHAT IN REACT NATIVE — the fallback behind the remote switch
   (10a step 5). This is chat/[id].tsx's screen as it was, moved here so the
   route can choose between it and the SwiftUI conversation
   (ConversationNative). Its JSX is unchanged but for three fixes the model
   carries (a tapped letter opens the reader by its id, a block lands on
   Kindreds, the introduction names the reader and the day properly); what
   it shows and does comes from the same model the Swift screen runs on
   (useLettersModel) and its menus from the same rules (build-items). The
   next slice moves it onto the theme and the 10a look. */

/* The correspondence, seen from Kindreds: a slow chat. The other person's
   mosaic develops in the header with every letter THEY send — coming into
   view — and a letter-writing field sits at the bottom. Tap any bubble to
   open THAT letter full-page in the reader (thread/[id]?i=N) — two lenses on
   one correspondence: this is the relationship, that is the letter.

   There used to be a milestone strip here (VOICE → RHYTHM → RESONANCE →
   NAME) and a 3/5 progress bar over the composer, cut because a counter can
   make intimacy transactional. The one threshold came back as the band under
   the header (both sides' five cells, 2026-10-10): it says who still owes
   what, and says plainly when more from you won't move it, so it never asks
   for filler. The developing face still carries the rest.

   Same surface as everywhere: white, rules doing the separation, mono for what
   the system says, the system font for what either of you wrote. The bubbles
   stay — they're the one place the two voices need telling apart at a glance —
   but they lose their tint and their rounding and become ruled blocks. */

const GROUND = P.paper;

export function LettersRN(props: { id?: string } = {}) {
  useLang();
  const params = useLocalSearchParams<{ id: string }>();
  const id = props.id ?? params.id;
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const shownCount = useRef(0);
  const atBottom = useRef(true);
  /* how the model reaches this screen's list (the field is controlled) */
  const ui = useMemo<ChatUi>(
    () => ({
      focus: () => {},
      seedText: () => {},
      scrollToEnd: (animated, delayMs) => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), delayMs);
      },
      jumpTo: () => {},
      thenModal: (fn) => fn(),
    }),
    [],
  );
  const {
    detail,
    name,
    read,
    state,
    conv,
    text,
    setText,
    trans,
    sending,
    slow,
    askSign,
    setAskSign,
    signing,
    onSign,
    onSend,
    menuCtx,
    keyOf,
    onItemAction,
    openLetter,
    goBack,
    onBlocked,
    auth,
    wren,
    ceremony,
    setCeremony,
    road,
    kindredNotice: notice,
    myName,
    since,
  } = useLettersModel(id, { ui });

  /* LONG-PRESS A LETTER (owner, 2026-10-10): the shared rules (build-items) */
  const { width: winW } = useWindowDimensions();
  const letterMax = Math.round((winW - 32) * 0.86); // the list pads 16 a side
  const letterKey = keyOf;
  const menuFor = (m: ThreadMessage): MessageAction[] =>
    letterMenu(m, letterKey(m), menuCtx).map((a: KMenuAction) => ({
      key: a.key,
      label: a.title,
      icon: a.icon,
      destructive: a.destructive,
      onPress: () => onItemAction(letterKey(m), a.key),
    }));

  const weight = weightedCount(text);
  const over = weight > LETTER_MAX;
  const canSend = weight >= REPLY_MIN && !over && !sending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GROUND }}>
      {/* header — back · who · report */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingTop: 2, paddingBottom: 8 }}>
        <Pressable onPress={goBack} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Pressable
          /* the room opens once you know their voice — not only after names.
             A stranger still has no page: at FOUND and FORMING they are
             their letters and nothing else, which is the whole point. */
          disabled={!detail?.revealed && read?.stage !== "recognizing"}
          onPress={() => router.push(`/kindred/${id}`)}
          hitSlop={6}
          style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, opacity: pressed ? 0.6 : 1 })}
        >
          <CorrespondentFace
            seed={detail?.other || "anon"}
            theirs={detail?.otherCount ?? 0}
            revealed={!!detail?.revealed}
            otherFace={detail?.otherFace}
            theirSigned={detail?.theirSigned}
            iSigned={detail?.iSigned}
            size="lg"
          />
          <View>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1, color: P.ink }}>{name.toUpperCase()}</Text>
            {!!state && (
              <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: state.tone, marginTop: 2, textAlign: "center" }}>
                {state.label}
              </Text>
            )}
          </View>
        </Pressable>
        <ReportMenu targetUser={detail?.other} context="thread" refId={id} snapshot={theirLatest(detail?.messages, detail?.openingFromMe ? null : detail?.opening)} onBlocked={onBlocked} />
      </View>

      {/* the rule the milestone strip used to carry */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: P.ink }} />

      {/* THE ONE THRESHOLD, SAID ON THE PAGE — both sides of it (owner,
          2026-10-10). It used to count min(yours, theirs): four from you and
          two from them read "3 MORE", as if you owed three. Now each side has
          its five cells and one line says who still owes what; once your five
          are in it says so, because more from you won't move it (the one
          thing a counter must never invite is filler). Ink until a side is
          full, pen blue when it is — no green. Not dismissable: it's the
          product's only gate, in two lines. */}
      {detail && !detail.revealed && (() => {
        const me = Math.min(detail.myCount, REVEAL);
        const them = Math.min(detail.otherCount, REVEAL);
        const a = REVEAL - me, b = REVEAL - them;
        const line = !a && !b ? t("ch.band.names") : !a ? t("ch.band.youDone", { n: b }) : !b ? t("ch.band.theyDone", { n: a }) : t("ch.band.both", { a, b });
        const cells = (n: number) => (
          <View style={{ flexDirection: "row", gap: 2 }}>
            {Array.from({ length: REVEAL }, (_, i) => (
              <View key={i} style={{ width: 8, height: 8, backgroundColor: n >= REVEAL ? P.pen : i < n ? P.ink : P.ink12 }} />
            ))}
          </View>
        );
        return (
          <View accessible accessibilityLabel={t("ch.band.a11y", { me, them })} style={{ paddingHorizontal: 16, paddingVertical: 9, backgroundColor: P.paper, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: P.ink60 }}>{t("ch.band.you")}</Text>
                {cells(me)}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: P.ink60 }}>NO. {postNo(detail.other)}</Text>
                {cells(them)}
              </View>
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: !a && !b ? P.pen : P.ink, marginTop: 7 }}>{line}</Text>
          </View>
        );
      })()}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* the correspondence */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            atBottom.current = contentSize.height - (contentOffset.y + layoutMeasurement.height) < 60;
          }}
          onContentSizeChange={() => {
            // to the end when a letter arrives; a translation opening mid-thread stays where it is
            const grew = conv.length !== shownCount.current;
            shownCount.current = conv.length;
            if (grew) scrollRef.current?.scrollToEnd({ animated: false });
            else if (atBottom.current) scrollRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {conv.map((m, i) => {
            const prev = conv[i - 1];
            const day = m.date ? dShort(m.date).toUpperCase() : "";
            const prevDay = prev?.date ? dShort(prev.date).toUpperCase() : "";
            const showLabel = !prev || prev.mine !== m.mine || day !== prevDay;
            const time = m.date
              ? new Date(m.date).toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit", hour12: false })
              : "";
            return (
              <Pressable
                key={i}
                onPress={() => openLetter(letterKey(m))}
                /* a long-press is the letter's menu, so lifting the finger must not also open it */
                onLongPress={() => {}}
                delayLongPress={350}
                {...a11yActions(menuFor(m))}
                /* no fade under the finger: it hid iOS's own press-and-lift of the menu */
                style={{ marginBottom: 10, alignItems: m.mine ? "flex-end" : "flex-start" }}
              >
                {showLabel && (
                  <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1, color: P.ink40, marginBottom: 6, marginHorizontal: 2 }}>
                    {m.mine ? t("ui.you") : name.toUpperCase()}
                    {day ? ` · ${day}` : ""}
                  </Text>
                )}
                <MessageMenu actions={menuFor(m)} radius={0}>
                <View
                  style={{
                    maxWidth: letterMax,
                    borderWidth: 1,
                    /* yours wash blue, theirs stay paper — the two hands were
                       one shade of grey apart (owner, 2026-09-20) */
                    borderColor: m.mine ? "#CFCBF5" : P.ink,
                    backgroundColor: m.mine ? P.penWash : P.paper,
                    paddingHorizontal: 13,
                    paddingVertical: 11,
                  }}
                >
                  <Text style={{ fontFamily: PF.letter, fontSize: 15.5, lineHeight: 23, color: P.ink }}>{m.body}</Text>
                  {!!time && (
                    <Text style={{ fontFamily: PF.mono, fontSize: 9, color: P.ink40, alignSelf: "flex-end", marginTop: 6 }}>{time}</Text>
                  )}
                </View>
                </MessageMenu>
                {trans[letterKey(m)]?.busy && (
                  <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40, marginTop: 4, marginHorizontal: 2 }}>{t("mm.translating")}</Text>
                )}
                {trans[letterKey(m)]?.shown && !!trans[letterKey(m)]?.text && (
                  <Text style={{ maxWidth: letterMax, fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: P.ink60, marginTop: 5, marginHorizontal: 2 }}>{trans[letterKey(m)]!.text}</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* the door — from the fifth letter, names can be enclosed. Three
            states: yours to offer, yours offered and waiting, or theirs
            waiting on you (brass — the one warm signal in the product). */}
        {detail && !detail.revealed && detail.myCount >= REVEAL && (
          <View style={{ alignItems: "center", paddingBottom: 10 }}>
            {detail.iSigned ? (
              <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40 }}>
{t("ch.wentFirst")}
              </Text>
            ) : (
              <Pressable
                /* no gate here any more: kindreds are unlimited (owner,
                   2026-09-20). The fare stands at the expired door instead —
                   lib/kindred-expiry. */
                onPress={() => setAskSign(true)}
                hitSlop={8}
                style={{ borderWidth: 1, borderColor: detail.theirSigned ? P.brassSeal : P.ink, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text
                  style={{
                    fontFamily: PF.monoSemi,
                    fontSize: 10.5,
                    letterSpacing: 1.2,
                    color: detail.theirSigned ? P.brassSeal : P.ink,
                  }}
                >
                  {detail.theirSigned ? t("ch.theyFirst") : t("ch.sendYours")}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* the only number left is the one that stops a letter going out */}
        {over && (
          <View style={{ alignItems: "center", paddingBottom: 8 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.post }}>
              {t("ui.overLimit", { n: String(weight - LETTER_MAX) })}
            </Text>
          </View>
        )}

        {/* write — unless there is no longer anyone at the other end. 0009
            nulls threads.a/b when an account is deleted instead of cascading,
            so the survivor keeps every letter. What it did NOT do is close
            the composer: RLS asks only that the sender be a participant, and
            you still are, so letters written to a deleted correspondent were
            accepted, stored, and read by no one, forever. The correspondence
            stays open to read. It stops being somewhere you can write. */}
        {detail?.gone ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20 }}>
            <Text
              style={{ fontFamily: PF.mono, fontSize: 11.5, lineHeight: 18, letterSpacing: 0.3, color: P.ink40, textAlign: "center" }}
            >
              {t("ch.gone")}
            </Text>
          </View>
        ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
          {/* the same bar as the room's (owner, 2026-09-20): a pill field,
              and the keyboard's own SEND sends — no send key of ours */}
          <View style={{ flex: 1, borderRadius: 20, backgroundColor: "#F3F2FA", paddingHorizontal: 14 }}>
            <GlyphInput
              value={text}
              onChangeText={setText}
              /* the register loosens once you know each other. Not a
                 different mechanic — REPLY_MIN has always been 2, so "ok."
                 was always a whole answer — but the product never admitted
                 it. Before names it is a letter you are composing; after,
                 it is a person you are talking to. */
              placeholder={detail?.revealed ? t("th.sayTo", { name }) : t("ch.ph")}
              placeholderTextColor={P.ink40}
              multiline
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => {
                if (canSend) void onSend();
              }}
              style={{ ...fieldBox(text, 23, 110), paddingTop: 9, paddingBottom: 9, fontFamily: PF.writing, fontSize: 16, lineHeight: 23, color: P.ink }}
            />
          </View>
        </View>
        )}
      </KeyboardAvoidingView>

      {/* The bubble is already on screen — this send is optimistic — so the
          only thing left to report is that it has not landed yet. Without
          it a stalled connection looks exactly like a delivered letter
          until the alert arrives and takes the words back. */}
      {slow && <Toast msg={t("net.slow")} bottom={96} />}

      <LeaveSheet
        open={askSign}
        title={t("ch.sign.title")}
        body={t("ch.sign.body", { name: auth.handle || t("ch.sign.fallback") })}
        actions={[{ label: signing ? "…" : t("ch.sign.confirm"), kind: "primary", onPress: onSign }]}
        cancelLabel={t("ch.sign.cancel")}
        onCancel={() => !signing && setAskSign(false)}
      />

      <Introduction
        open={ceremony}
        wren={wren}
        otherSeed={detail?.other || "anon"}
        otherFace={detail?.otherFace ?? null}
        otherName={detail?.otherName || t("cm.kindred")}
        otherArchetype={read?.archetype ? archNameThird(read.archetype.id) : null}
        myName={myName}
        road={road}
        mySeed={auth.user?.id || "me"}
        myFace={(auth.profile?.avatarId as string) || null}
        notice={notice}
        since={since}
        stamp={detail?.stamp ?? null}
        onClose={() => setCeremony(false)}
        onTalk={() => {
          setCeremony(false);
          router.replace(`/room/${id}`);
        }}
      />
    </SafeAreaView>
  );
}
