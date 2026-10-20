import { useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn } from "react-native-reanimated";
import { getLang, hasString, t, useLang } from "../../lib/i18n";
import { useLetterFamily, useTheme } from "../../lib/theme";
import { MONO, PFM } from "../../theme/post";
import { BRAND } from "../../theme/themes";
import { developFor } from "../../lib/mosaic";
import { blurThen } from "../../lib/keyboard";
import { sname } from "../../data/stamps";
import { AvatarImage } from "../../components/AvatarImage";
import { MosaicId } from "../../components/MosaicId";
import { StampAvatar, StampMosaic } from "../../components/StampAvatar";
import { WhoFaceView } from "../../components/Frost";
import { WhoName } from "../../components/WhoName";
import { KeepableStamp } from "../../components/Stamp";
import { Toast } from "../../components/ui";
import { STAMP_LADDER } from "../../lib/stamp-frame";
import { ReportSheet } from "../../components/ReportMenu";
import { InkPanel, ReplyStrip, SecondaryHeader, TopicTag, TranslateCapsule, type ReplyStripHandle } from "../../components/10a";
import "../../data/strings-step5-platform"; // rp.menu.a11y, vo.play, vo.pause
import { capsuleCode, isUnsigned, largeType, isVoiceLetter, letterLinkKey, postmarkLine, replyCanSend, replyPlaceholder, signatureOf } from "./reader";
import { letterLang, useReaderModel } from "./useReaderModel";
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
     tone, the stamp (the reader head's 60×72, below), and the ··· (34pt circle) that opens Report /
     Block, always reachable while someone is behind the letter (owner) —
     with the identity switch on (identity Phase 1), a pen pal's head is
     their frosted window at 34 (never developing; the flat veil tile for a
     deleted account), the courier name in 600 17 with the ♀/♂ mark and the
     star sign after it in sub (reader correspondentWho), and under it the
     letter's date (· YOU on your own) and the state, so the name is said
     once and the postmark keeps the date;
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

/* THE STAMP IN THE HEAD (stamps v2, 2026-10-18) is the reader head's,
   60×72, the size the Today reader gives the same letter. The stamp is the
   correspondence's, so every letter here wears it, but whose letter it is
   decides how: theirs came to you, so it is delivered — tilted by that
   letter's id (a reply's own id; the opening's is the pool letter's,
   threads.letter, so it leans as it did on the Today card; the thread's id
   when neither is known); your own is flat. No postmark (the owner took
   it off on 2026-10-18). It used to be a 34 tile at 3°. */
const HEAD_STAMP = STAMP_LADDER.readerHead;

export function ReaderScreen({ id, m: mParam, i: iParam, topInset }: { id?: string; m?: string; i?: string; topInset?: number }) {
  useLang(); // repaint on language change
  const { t: tk } = useTheme();
  const letterFace = useLetterFamily();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardRN();
  // at accessibility sizes the head row's words wrap instead of truncating beside the fixed face,
  // stamp and ··· (a name or OCT.14 · NO.7273 cut to a few characters)
  const big = largeType(useWindowDimensions().fontScale);

  /* the thread, the hero, who wrote it, the translation, the report flow and the reply: the model
     both renderers share (./useReaderModel) */
  const r = useReaderModel({ id, m: mParam, i: iParam });
  const { detail, status, conv, hero, heroKey, earlier, who, fmt, state, stamp, customId, custom, customTag, setStampLine, stampLine, translated, shown, tier, offerXl, xlBusy, doTranslate, flow, text, setText, sending, canWrite, closed, hint, goBack, pal, memberStamp, heroDate } = r;
  const voice = useOpeningVoiceRN(detail, r.isDemo);
  const [expanded, setExpanded] = useState(false);
  const tone = state ? (state.toneKey === "ind" ? tk.ind : state.toneKey === "brass" ? BRAND.brassSeal : tk.mute) : tk.mute;

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
  // the reader's send is plain: the words stay until the letter went
  const onSend = (value: string): boolean => r.send(value, () => strip.current?.clear());

  const face = !detail ? null : pal ? (
    <WhoFaceView face={pal.face} size={34} denom={memberStamp} />
  ) : isUnsigned(detail) ? (
    <MosaicId seed={null} cell={4} gap={1} />
  ) : detail.revealed ? (
    memberStamp ? (
      <StampAvatar size={28} denom={memberStamp}>
        {({ size, radius }) => <AvatarImage id={detail.otherFace ?? null} seed={detail.other} size={size} radius={radius ?? undefined} />}
      </StampAvatar>
    ) : (
      <AvatarImage id={detail.otherFace ?? null} seed={detail.other} size={28} />
    )
  ) : memberStamp ? (
    <StampAvatar size={28} denom={memberStamp}>
      {({ size }) => <StampMosaic seed={detail.other} size={size} develop={developFor(detail.otherCount)} base={28} cell={4} gap={1} />}
    </StampAvatar>
  ) : (
    <MosaicId seed={detail.other} cell={4} gap={1} develop={developFor(detail.otherCount)} />
  );

  const mono = (size: number, spacing: number) => ({ ...PFM.monoSemi, fontSize: size, letterSpacing: size * spacing });

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: topInset ?? insets.top }}>
      <SecondaryHeader title={r.title} onBack={goBack} />

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
                  <View style={{ flex: 1, gap: 2 }} accessible={!!pal} accessibilityLabel={pal ? [pal.spoken, heroDate, hero.mine ? t("ui.you") : "", state?.label ?? ""].filter(Boolean).join(". ") : undefined}>
                    {pal ? (
                      <>
                        <WhoName name={pal.name} marks={pal} style={{ fontSize: 17, fontWeight: "600", color: tk.ink }} numberOfLines={big ? 0 : 2} />
                        {/* the postmark keeps the date; the name above is said once (YOU on your own letter) */}
                        {!!(heroDate || hero.mine) && (
                          <Text numberOfLines={big ? undefined : 1} style={[mono(MONO.title, 0.08), { ...PFM.monoMed, color: tk.sub }]}>
                            {[heroDate, hero.mine ? t("ui.you") : ""].filter(Boolean).join(" · ")}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text numberOfLines={big ? undefined : 1} style={[mono(MONO.title, 0.08), { color: tk.sub }]}>
                        {/* the number is what you call someone WITHOUT a name; once they have one it
                            replaces the number — printing both says the reveal only half happened */}
                        {postmarkLine(hero, detail, fmt)}
                      </Text>
                    )}
                    {!!state && (
                      <Text numberOfLines={big ? undefined : 1} style={[mono(MONO.label, 0.1), { color: tone }]}>
                        {state.label}
                      </Text>
                    )}
                  </View>
                  {(stamp || customId) && (
                    <KeepableStamp
                      id={detail.stamp}
                      width={HEAD_STAMP.w}
                      delivered={!hero.mine}
                      letterId={hero.id || detail.letterId || id || null}
                      dark={tk.dark}
                      from={{ thread: id ?? null }}
                      onDone={setStampLine}
                    />
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
                      {/* an icon, not words: it keeps its size inside the fixed 34pt ring */}
                      <Text allowFontScaling={false} style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1, color: tk.ink }}>
                        ···
                      </Text>
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
                {(!!stamp || !!customTag || offerXl) && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 18 }}>
                    {stamp ? (
                      <TopicTag name={`#${sname(stamp.name).toLowerCase()}`} colorHex={stamp.color} style={{ marginRight: 3, marginBottom: 3 }} />
                    ) : customTag && custom ? (
                      <TopicTag name={`#${customTag.toLowerCase()}`} colorHex={custom.hex} style={{ marginRight: 3, marginBottom: 3 }} />
                    ) : (
                      <View />
                    )}
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
                      <Text style={{ fontSize: 13, fontWeight: "600", color: tk.ink }}>{expanded ? t("th.hide") : t("th.between", { n: conv.length })}</Text>
                    </Pressable>
                  ) : (
                    <View />
                  )}
                  {canWrite && (
                    <Pressable onPress={() => strip.current?.focus()} hitSlop={8} accessibilityRole="button">
                      <Text style={{ fontSize: 13, fontWeight: "600", color: tk.ind }}>{t("ld.replyArrow")}</Text>
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
                <Text style={[mono(MONO.label, 0.08), { ...PFM.monoMed, color: tk.mute }]}>{signatureOf(m, detail, fmt)}</Text>
              </View>
            ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: keyboard.up ? 10 : Math.max(10, insets.bottom), backgroundColor: tk.bg }}>
          {closed ? (
            /* nobody home: the letters stay readable; there is no one to send to (known bug 4) */
            <Text style={{ fontSize: 13, lineHeight: 18, color: tk.mute, textAlign: "center", paddingHorizontal: 14, paddingTop: 4, paddingBottom: 6 }}>{closed}</Text>
          ) : detail ? (
            <>
              <ReplyStrip
                ref={strip}
                placeholder={replyPlaceholder(detail, t, who, hasString)}
                canSend={replyCanSend(text, sending)}
                onSend={onSend}
                onChangeText={setText}
                style={{ paddingRight: 4, paddingBottom: 4 }}
              />
              {/* the hint under the strip (H:125): over the limit in red, else where it goes */}
              <Text style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: MONO.label * 0.14, color: hint.alarm ? BRAND.postRed : tk.sub, marginTop: 6, marginLeft: 14 }}>{hint.text}</Text>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <ReportSheet flow={flow} top={reportTop} />
      {stampLine ? <Toast msg={stampLine} bottom={insets.bottom + 90} /> : null}
    </View>
  );
}
