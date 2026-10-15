import { useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { getLang, sourceTag, t, useLang } from "../../lib/i18n";
import { useLetterFamily, useTheme } from "../../lib/theme";
import { MONO, PF } from "../../theme/post";
import { BRAND } from "../../theme/themes";
import { localeTag, penPalName, postmark } from "../../lib/format";
import { developFor } from "../../lib/mosaic";
import { sendThreadMessage, theirLatest } from "../../lib/db";
import { chatSeenRule, useThreadDetail } from "../../lib/thread-detail";
import { threadState } from "../../lib/thread-state";
import { guessLatin, offerTranslate } from "../../lib/lang-guess";
import { translate } from "../../lib/wren";
import { useWrenName } from "../../lib/wren-name";
import { alertFail } from "../../lib/fail";
import { blurThen } from "../../lib/keyboard";
import { useReportFlow } from "../../lib/report-flow";
import { refreshFingerprint } from "../../lib/aura";
import { noteWrote } from "../../lib/local-push";
import { getStamp, sname } from "../../data/stamps";
import { AvatarImage } from "../../components/AvatarImage";
import { MosaicId } from "../../components/MosaicId";
import { StampTile } from "../../components/StampTile";
import { ReportSheet } from "../../components/ReportMenu";
import { InkPanel, ReplyStrip, SecondaryHeader, TopicTag, TranslateCapsule, type ReplyStripHandle } from "../../components/10a";
import "../../data/strings-step5-platform"; // rp.menu.a11y, vo.play, vo.pause
import {
  canWriteHere,
  capsuleCode,
  closedLine,
  heroIndex,
  heroTier,
  isUnsigned,
  isVoiceLetter,
  letterLinkKey,
  offersTranslate,
  postmarkLine,
  readerLetters,
  readerTitle,
  replyCanSend,
  replyHint,
  replyPlaceholder,
  signatureOf,
  type ReaderFormat,
} from "./reader";
import { useKeyboardRN } from "./useKeyboardRN";
import { VoiceOpeningCard, useOpeningVoiceRN } from "./VoiceOpeningRN";

/* THE ONE-LETTER READER (thread/[id]) — 10a step 5, slice chat-rn.
   ────────────────────────────────────────────────────────────────────────
   Owner: the reader stays React Native. Two lenses on one correspondence:
   the chat is the relationship, this is the letter — one of them, full
   page, the way a letter is read.

   10a, on the theme:
   · the secondary header (H:90): the 36pt back chevron (named for
     VoiceOver; there was no way back but the edge swipe), the thread's
     count in mono, no rule;
   · the letter in the InkCard material (InkPanel "today": sf, 2.5 ln,
     corners 28, a hard 6/6 shadow): the head row — their face (a round
     portrait for a kindred, the mosaic developing for a pen pal, the veil
     for a deleted account), the postmark and the thread's state in its
     tone, the stamp at 34, and the ··· (34pt circle) that opens Report /
     Block, always reachable while someone is behind the letter (owner);
     the words in the reader's Letter font at the letter tiers (a telegram
     centred); the topic tag and the translate capsule; a 2pt rule; the
     thread toggle and REPLY ↓;
   · earlier letters on demand, as light-outline blocks;
   · the 10a reply strip (uncontrolled; the plane key; Return sends) with
     the hint under it (H:125) — or, where nothing can be sent, the line
     that says why.

   Fixed here (rules in ./reader, node-tested): the voice opening plays as
   the hero and among earlier letters (known bug 2); the opening wears its
   own date or none, never a hard-coded AUG 11 (known bug 3); a deleted
   correspondent is UNSIGNED under the veil, ACCOUNT CLOSED, with no
   composer (known bug 4); the hero is the letter tapped (?m=, ?i= kept);
   the thread is held offline-safe (useThreadDetail: cache first, an
   offline read keeps the letter, a thread the server calls missing closes
   in place); translate only on their words in another language; a block
   lands on Kindreds (the reader used to go back into the blocked chat); a
   reply refreshes the writing fingerprint and the local-push plan, as the
   chat's does (critic). The send stays plain: it goes, then the thread
   reloads (no new animation — owner kept the fly-by for Today). */

/** Their language for the capsule: a non-Latin script by its own name, else the Latin guess;
    null when neither is confident (the capsule shows its words alone). */
function letterLang(body: string): string | null {
  const script = sourceTag(body, "xx");
  if (script !== "XX") return script;
  const latin = guessLatin(body);
  return latin ? latin.toUpperCase() : null;
}

export function ReaderScreen({ id, m: mParam, i: iParam, topInset }: { id?: string; m?: string; i?: string; topInset?: number }) {
  useLang(); // repaint on language change
  const router = useRouter();
  const wren = useWrenName();
  const { t: tk } = useTheme();
  const letterFace = useLetterFamily();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardRN();
  const isDemo = __DEV__ && !!id?.startsWith("demo-");

  // the room marks seen when you enter it; a pen pal's letters are marked once names are traded
  const { detail, status, reload, mutate } = useThreadDetail(id, { folds: false, markSeen: chatSeenRule });
  const voice = useOpeningVoiceRN(detail, isDemo);
  const conv = useMemo(() => readerLetters(detail), [detail]);
  const heroIdx = heroIndex(conv, { m: mParam, i: iParam });
  const hero = heroIdx >= 0 ? conv[heroIdx] : null;
  const heroKey = hero ? letterLinkKey(hero) || `i:${heroIdx}` : "";
  const earlier = conv.filter((_, k) => k !== heroIdx);
  const [expanded, setExpanded] = useState(false);

  const fmt: ReaderFormat = useMemo(
    () => ({ t, locale: localeTag(), postmark, penPal: (other: string) => penPalName(other, { upper: true, compact: true }) }),
    // a language change re-renders (useLang); the locale and t() are read fresh with it
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getLang()],
  );
  const state = detail
    ? threadState({
        mine: detail.myCount,
        theirs: detail.otherCount,
        revealed: detail.revealed,
        lastSenderMe: !detail.messages.length || !!detail.messages[detail.messages.length - 1]?.mine,
        iSigned: detail.iSigned,
        theirSigned: detail.theirSigned,
        gone: isUnsigned(detail),
      })
    : null;
  const tone = state ? (state.toneKey === "ind" ? tk.ind : state.toneKey === "brass" ? BRAND.brassSeal : tk.mute) : tk.mute;
  const stamp = getStamp(detail?.stamp);

  /* ── translation of the hero: translated once, then toggled ── */
  const [xl, setXl] = useState<{ key: string; text: string } | null>(null);
  const [xlOn, setXlOn] = useState(false);
  const [xlBusy, setXlBusy] = useState(false);
  const translated = !!xl && xl.key === heroKey && xlOn;
  const shown = hero ? (translated && xl ? xl.text : hero.body) : "";
  const tier = heroTier(shown);
  const offerXl = offersTranslate(hero, detail, offerTranslate);
  const doTranslate = async () => {
    if (!hero) return;
    if (xl && xl.key === heroKey) {
      setXlOn((v) => !v);
      return;
    }
    if (xlBusy) return;
    setXlBusy(true);
    const out = await translate(hero.body, getLang());
    setXlBusy(false);
    if (out) {
      setXl({ key: heroKey, text: out });
      setXlOn(true);
    } else blurThen(() => Alert.alert(t("th.noTransTitle", { wren }), t("th.noTransBody")));
  };

  /* ── report / block: the ··· in the letter's head; a block lands on Kindreds ── */
  const flow = useReportFlow({
    context: "thread",
    targetUser: detail && !isUnsigned(detail) ? detail.other : undefined,
    refId: id,
    snapshot: theirLatest(detail?.messages, detail?.openingFromMe ? null : detail?.opening),
    onBlocked: () => router.replace("/(tabs)/kindreds"),
  });
  const dots = useRef<View>(null);
  const [reportTop, setReportTop] = useState<number | undefined>(undefined);
  const openReport = () =>
    blurThen(() => {
      // the card drops from the ··· itself
      dots.current?.measureInWindow((_x, y, _w, h) => {
        setReportTop(y + h + 6);
        flow.openMenu();
      });
    });

  /* ── the reply ── */
  const strip = useRef<ReplyStripHandle>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const canWrite = canWriteHere(detail, status);
  const closed = closedLine(detail, status, t);
  const hint = replyHint(text, !!detail?.revealed, t);
  const onSend = (value: string): boolean => {
    const body = value.trim();
    if (!id || !detail || sending || !canWrite || !replyCanSend(value, false)) return false;
    void (async () => {
      setSending(true);
      if (isDemo) {
        // a demo thread never reaches the database: the reply lands on the page only
        mutate((d) => ({ ...d, myCount: d.myCount + 1, messages: [...d.messages, { id: `demo-r${Date.now()}`, body, mine: true, date: new Date().toISOString() }] }));
        setSending(false);
        strip.current?.clear();
        return;
      }
      const res = await sendThreadMessage(id, body);
      setSending(false);
      if (!res) {
        // the words stay in the strip to send again
        blurThen(() => alertFail(t("th.fail.title"), t("th.fail.body"), { context: "thread" }));
        return;
      }
      strip.current?.clear();
      void refreshFingerprint();
      void noteWrote("letter");
      await reload();
    })();
    // the reader's send is plain: the words stay until the letter went
    return false;
  };

  const goBack = () => blurThen(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds")), undefined, { delayMs: 0 });

  const face = !detail ? null : isUnsigned(detail) ? (
    <MosaicId seed={null} cell={4} gap={1} />
  ) : detail.revealed ? (
    <AvatarImage id={detail.otherFace ?? null} seed={detail.other} size={28} />
  ) : (
    <MosaicId seed={detail.other} cell={4} gap={1} develop={developFor(detail.otherCount)} />
  );

  const mono = (size: number, spacing: number) => ({ fontFamily: PF.monoSemi, fontSize: size, letterSpacing: size * spacing });

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: topInset ?? insets.top }}>
      <SecondaryHeader title={detail ? readerTitle(conv.length, t) : ""} onBack={goBack} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {!detail && status === "offline" && (
            <View style={{ paddingTop: 48, alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: tk.ink }}>{t("net.offline.title")}</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: tk.sub, textAlign: "center", maxWidth: 280 }}>{t("net.offline.body")}</Text>
            </View>
          )}

          {hero && detail && (
            <Animated.View key={heroKey} entering={FadeIn.duration(300).easing(Easing.out(Easing.cubic))}>
              <InkPanel variant="today" style={{ marginRight: 6, marginBottom: 6 }}>
                {/* the head: who, when, the stamp it travelled under, and the ··· */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ minWidth: 28, alignItems: "center" }}>{face}</View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={1} style={[mono(MONO.title, 0.08), { color: tk.sub }]}>
                      {/* the number is what you call someone WITHOUT a name; once they have one it
                          replaces the number — printing both says the reveal only half happened */}
                      {postmarkLine(hero, detail, fmt)}
                    </Text>
                    {!!state && (
                      <Text numberOfLines={1} style={[mono(MONO.label, 0.1), { color: tone }]}>
                        {state.label}
                      </Text>
                    )}
                  </View>
                  {stamp && (
                    <View style={{ transform: [{ rotate: "3deg" }] }}>
                      <StampTile id={detail.stamp} w={34} r={4} />
                    </View>
                  )}
                  {!flow.nobody && (
                    <Pressable
                      ref={dots}
                      onPress={openReport}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={t("rp.menu.a11y")}
                      style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: tk.ln, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1, color: tk.ink }}>···</Text>
                    </Pressable>
                  )}
                </View>

                {/* the letter: a voice letter plays (known bug 2); words in the reader's Letter font */}
                {isVoiceLetter(hero, detail) ? (
                  <View style={{ marginTop: 18, gap: 12 }}>
                    <VoiceOpeningCard voice={voice} compact={false} />
                    {!!hero.body && <Text style={[{ fontSize: 17, lineHeight: 26, color: tk.sub }, letterFace]}>{hero.body}</Text>}
                  </View>
                ) : (
                  <Text
                    style={[
                      { fontSize: tier.size, lineHeight: tier.line, color: tk.ink, marginTop: tier.center ? 26 : 18, paddingBottom: tier.center ? 10 : 0, textAlign: tier.center ? "center" : "auto" },
                      letterFace,
                    ]}
                  >
                    {shown}
                  </Text>
                )}

                {/* its topic and, for their words in another language, the capsule */}
                {(!!stamp || offerXl) && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 18 }}>
                    {stamp ? <TopicTag name={`#${sname(stamp.name).toLowerCase()}`} colorHex={stamp.color} style={{ marginRight: 3, marginBottom: 3 }} /> : <View />}
                    {offerXl && (
                      <TranslateCapsule
                        code={capsuleCode(letterLang(hero.body), getLang().toUpperCase(), translated)}
                        label={xlBusy ? t("read.translating") : translated ? t("read.original") : t("read.invite")}
                        busy={xlBusy}
                        onPress={() => void doTranslate()}
                      />
                    )}
                  </View>
                )}

                <View style={{ height: 2, backgroundColor: tk.ln, marginTop: 14, marginBottom: 10 }} />

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 }}>
                  {earlier.length > 0 ? (
                    <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityState={{ expanded }}>
                      <Text style={[mono(MONO.title, 0.14), { color: tk.ink }]}>{expanded ? t("th.hide") : t("th.between", { n: conv.length })}</Text>
                    </Pressable>
                  ) : (
                    <View />
                  )}
                  {canWrite && (
                    <Pressable onPress={() => strip.current?.focus()} hitSlop={8} accessibilityRole="button">
                      <Text style={[mono(MONO.title, 0.14), { color: tk.ind }]}>{t("ld.replyArrow")}</Text>
                    </Pressable>
                  )}
                </View>
              </InkPanel>
            </Animated.View>
          )}

          {/* earlier letters, on demand — once they have a name, everything they ever wrote is
              signed with it (the letters didn't change, but who wrote them did) */}
          {expanded &&
            detail &&
            earlier.map((m) => (
              <View
                key={letterLinkKey(m) || m.date}
                style={{
                  marginTop: 10,
                  marginLeft: m.mine ? 28 : 0,
                  marginRight: m.mine ? 0 : 28,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: m.mine ? tk.lav : tk.ln,
                  backgroundColor: m.mine ? tk.lav2 : tk.sf,
                  gap: 8,
                }}
              >
                {isVoiceLetter(m, detail) && <VoiceOpeningCard voice={voice} />}
                {!!m.body && <Text style={[{ fontSize: 15.5, lineHeight: 24, color: isVoiceLetter(m, detail) ? tk.sub : tk.ink }, letterFace]}>{m.body}</Text>}
                <Text style={[mono(MONO.label, 0.08), { fontFamily: PF.monoMed, color: tk.mute }]}>{signatureOf(m, detail, fmt)}</Text>
              </View>
            ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: keyboard.up ? 10 : Math.max(10, insets.bottom), backgroundColor: tk.bg }}>
          {closed ? (
            /* nobody home: the letters stay readable; there is no one to send to (known bug 4) */
            <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, lineHeight: 17, letterSpacing: 0.3, color: tk.mute, textAlign: "center", paddingHorizontal: 14, paddingTop: 4, paddingBottom: 6 }}>{closed}</Text>
          ) : detail ? (
            <>
              <ReplyStrip
                ref={strip}
                placeholder={replyPlaceholder(detail, t)}
                canSend={replyCanSend(text, sending)}
                onSend={onSend}
                onChangeText={setText}
                style={{ paddingRight: 4, paddingBottom: 4 }}
              />
              {/* the hint under the strip (H:125): over the limit in red, else where it goes */}
              <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: MONO.label * 0.14, color: hint.alarm ? BRAND.postRed : tk.sub, marginTop: 6, marginLeft: 14 }}>{hint.text}</Text>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <ReportSheet flow={flow} top={reportTop} />
    </View>
  );
}
