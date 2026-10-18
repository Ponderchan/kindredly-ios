import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRouter, type Href } from "expo-router";
import { getLang, t, useLang } from "../../lib/i18n";
import { useLetterFamily, useTheme } from "../../lib/theme";
import { MONO, PF } from "../../theme/post";
import { archDescThird, archName, dimLabel, dimLineThird, dimSealedThird } from "../../lib/aura-copy";
import { dLong, localeTag } from "../../lib/format";
import { developFor } from "../../lib/mosaic";
import { theirLatest } from "../../lib/db";
import { useThreadDetail } from "../../lib/thread-detail";
import { readCorrespondent, resonance, type ResonanceRow } from "../../lib/correspondent";
import type { DimScore } from "../../lib/hatch-engine";
import { getStamp, sname } from "../../data/stamps";
import { STAMP_LADDER } from "../../lib/stamp-frame";
import { AvatarImage } from "../../components/AvatarImage";
import { MosaicId } from "../../components/MosaicId";
import { ReportMenu } from "../../components/ReportMenu";
import { Stamp, postmarkFitsCentred } from "../../components/Stamp";
import { InkPanel, SecondaryHeader } from "../../components/10a";
import { isVoiceLetter, largeType, readerLetters } from "./reader";
import { canTalk, faceKind, lettersValue, openingLetter, pageTitle, talkTo, whoBegan, writingOf, type RouteBelow } from "./kindred-page";
import { VoiceOpeningCard, useOpeningVoiceRN } from "./VoiceOpeningRN";

/* A KINDRED'S PAGE — the room behind the name (10a step 5, slice chat-rn).
   ────────────────────────────────────────────────────────────────────────
   Before reveal there is deliberately NO page: a stranger is their letters
   and nothing else, and No. 8434 having a profile would undo the whole
   point. It opens once you know their voice (RECOGNIZING) and is part of
   what two signatures buy.

   It only shows what is true and already ours: the face they gave (or the
   one you watched develop), what their letters have told you, how alike
   you write once you know each other, how long the correspondence has
   run, how many letters each way, the stamp it started under, and the
   letter that started it. No feeds, no fields, no empty shelves promising
   furniture. Report / block stays reachable on a person page — intimacy
   is exactly where safety tools must not disappear (owner).

   10a, on the theme: the secondary header (H:90: the 36pt chevron, the
   page's title in mono, the ⋯ on the right, no rule); the person on an
   InkCard (.me: 2.5 ln, corners 24, 5/5); what you've learned and how
   alike you write as soft groups (corners 16); the facts as grouped rows;
   the opening letter on an InkCard in the reader's Letter font (owner
   question 1: a kindred's opening letter is a letter being read), playing
   when it is a voice letter (known bug 2); TALK TO as the 10a secondary
   key (ink, the page colour on it, corners 14); mono on 9/10/11.

   Fixed (rules in ./kindred-page, node-tested): it is held offline-safe
   (useThreadDetail; it used to go blank offline); the read and the
   resonance skip lines taken back; TALK TO goes back when the room (or
   the chat) is the screen underneath instead of stacking a second copy
   (spec bug 12); a block lands on Kindreds, never back in the blocked
   room; a kindred is drawn round, face or not, and a deleted account wears
   the veil with no TALK TO. Looking at the page doesn't mark their lines
   read — that is entering the room (owner, 10-15). */

export function KindredPage({ id, topInset }: { id?: string; topInset?: number }) {
  useLang();
  const router = useRouter();
  const navigation = useNavigation();
  const { t: tk } = useTheme();
  const letterFace = useLetterFamily();
  const insets = useSafeAreaInsets();
  const isDemo = __DEV__ && !!id?.startsWith("demo-");
  const { detail, status } = useThreadDetail(id, { folds: false });
  const voice = useOpeningVoiceRN(detail, isDemo);
  const lang = getLang();

  const name = detail?.otherName || t("cm.kindred");
  /* THE READ, and it arrives BEFORE the name: what ten letters have earned you is a read of how
     they write, and this product's whole claim is that how you write is who you are. */
  const writing = useMemo(() => (detail ? writingOf(detail) : null), [detail]);
  const read = useMemo(() => (detail && writing ? readCorrespondent(writing.theirs, detail.revealed) : null), [detail, writing]);
  /* AFTER REVEAL — resonance is computed from both halves of THIS correspondence, so it belongs to
     the relationship; held back until you know each other (before, a verdict on a stranger). */
  const res = useMemo(() => (detail?.revealed && writing ? resonance(writing.mine, writing.theirs) : null), [detail, writing]);
  const st = detail ? getStamp(detail.stamp) : null;
  // the opening or no card: never the first reply standing in for an opening that was dropped
  const opening = useMemo(() => openingLetter(readerLetters(detail)), [detail]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const locale = useMemo(() => localeTag(), [lang]);

  const onTalk = () => {
    if (!id || !detail) return;
    const state = navigation.getState();
    const below: RouteBelow = state && state.index > 0 ? (state.routes[state.index - 1] as RouteBelow) : null;
    const go = talkTo(detail, id, below);
    if (go.kind === "back") router.back();
    else router.replace(go.href as Href);
  };

  const kind = detail ? faceKind(detail) : "veil";
  const label = { fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: MONO.label * 0.14, color: tk.mute } as const;

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: topInset ?? insets.top }}>
      <SecondaryHeader
        title={detail ? pageTitle(detail, t) : ""}
        fallbackHref="/(tabs)/kindreds"
        right={
          <ReportMenu
            targetUser={detail && kind !== "veil" ? detail.other : undefined}
            context="thread"
            refId={id}
            snapshot={theirLatest(detail?.messages, detail?.openingFromMe ? null : detail?.opening)}
            onBlocked={() => router.replace("/(tabs)/kindreds")}
          />
        }
      />

      {!detail && status === "offline" && (
        <View style={{ paddingTop: 48, paddingHorizontal: 32, alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: tk.ink }}>{t("net.offline.title")}</Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: tk.sub, textAlign: "center" }}>{t("net.offline.body")}</Text>
        </View>
      )}

      {/* the server calls it gone (or hidden by a block) and nothing is kept here: say so, as the
          reader does, instead of a header over a blank page */}
      {!detail && status === "missing" && (
        <View style={{ paddingTop: 48, paddingHorizontal: 32, alignItems: "center" }}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: tk.sub, textAlign: "center" }}>{t("fail.closed.body")}</Text>
        </View>
      )}

      {detail && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom, gap: 14 }} showsVerticalScrollIndicator={false}>
          {/* who they are — the face they gave, beside the one you watched develop */}
          <InkPanel variant="me" style={{ marginRight: 5, marginBottom: 5 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              {kind === "round" ? (
                <AvatarImage id={detail.otherFace ?? null} seed={detail.other} size={64} />
              ) : kind === "veil" ? (
                <MosaicId seed={null} cell={9} gap={2.4} />
              ) : (
                <MosaicId seed={detail.other} cell={9} gap={2.4} develop={developFor(detail.otherCount)} />
              )}
              <View style={{ flex: 1 }}>
                {detail.revealed ? (
                  <>
                    <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "600", color: tk.ink }}>
                      {name}
                    </Text>
                    {kind !== "veil" && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7 }}>
                        <MosaicId seed={detail.other} cell={3} gap={1} />
                        <Text style={{ ...label, flexShrink: 1 }}>{t("kd.faceArrive")}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    {/* no name yet, and that is the point: the archetype is what their writing has
                        told you, which is the part a name could never have said */}
                    <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: "600", color: tk.ink }}>
                      {read?.archetype ? archName(read.archetype.id) : t("kd.stillVoice")}
                    </Text>
                    <Text style={{ fontFamily: "Newsreader-Italic", fontStyle: "italic", fontSize: 14, lineHeight: 20, color: tk.sub, marginTop: 5 }}>
                      {read?.archetype ? archDescThird(read.archetype.id) : t("kd.notEnough")}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </InkPanel>

          {/* WHAT THEIR LETTERS HAVE TOLD YOU — a line per dimension that has come through, the rest
              sealed under KEEP WRITING. Built from THEIR letters, on this device, with no LLM: every
              line is a deterministic read of words they really wrote. */}
          {!!read?.found.length && (
            <SoftGroup>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={label}>{t("kd.learned")}</Text>
                <Text style={{ ...label, fontFamily: PF.monoSemi, color: tk.ind }}>{t(read.moments === 1 ? "kd.momentsOne" : "kd.momentsMany", { n: String(read.moments) })}</Text>
              </View>
              {read.found.map((d) => (
                <Moment key={d.key} d={d} />
              ))}
              {read.sealed.length > 0 && (
                <>
                  <View style={{ height: 1, backgroundColor: tk.line, marginTop: 14, marginBottom: 12 }} />
                  <Text style={label}>{t("kd.keepWriting")}</Text>
                  <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, lineHeight: 19, color: tk.sub, marginTop: 6 }}>
                    {read.sealed
                      .slice(0, 4)
                      .map((d) => `□ ${dimSealedThird(d.key).toLocaleLowerCase(locale)}`)
                      .join("   ")}
                  </Text>
                </>
              )}
            </SoftGroup>
          )}

          {/* THE RESONANCE MAP — where the two of you write alike, and where you don't. Hollow is
              you, solid is them; the number is a cosine over the nine dimensions, a measurement of
              overlap and NOT a compatibility verdict. */}
          {res && (
            <SoftGroup>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={label}>{t("kd.howAlike")}</Text>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.figure, letterSpacing: 0.5, color: tk.ind }}>{res.score}%</Text>
              </View>
              <View style={{ marginTop: 14 }}>
                {res.rows.map((r) => (
                  <ResonanceLine key={r.key} r={r} locale={locale} />
                ))}
              </View>
              <View style={{ height: 1, backgroundColor: tk.line, marginTop: 4, marginBottom: 12 }} />
              {!!res.closest && <Text style={{ fontSize: 15, lineHeight: 22, color: tk.ink }}>{t("kd.resClose", { label: dimLabel(res.closest.key).toLocaleLowerCase(locale) })}</Text>}
              {!!res.furthest && <Text style={{ fontSize: 15, lineHeight: 22, color: tk.sub, marginTop: 4 }}>{t("kd.resFar", { label: dimLabel(res.furthest.key) })}</Text>}
            </SoftGroup>
          )}

          {/* the correspondence, as facts */}
          <View style={{ borderRadius: 16, backgroundColor: tk.soft, paddingHorizontal: 16 }}>
            {detail.since ? <FactRow label={t("kd.since")} value={dLong(detail.since)} /> : null}
            <FactRow label={t("kd.letters")} value={lettersValue(detail, t)} />
            <FactRow
              label={t("kd.beganUnder")}
              last
              value={
                st ? (
                  <BeganUnder name={sname(st.name)} stamp={detail.stamp} letterId={detail.letterId || id || null} />
                ) : (
                  "—"
                )
              }
            />
          </View>

          {/* the letter that started it */}
          {opening && (
            <InkPanel variant="me" style={{ marginRight: 5, marginBottom: 5 }} contentStyle={{ gap: 10 }}>
              <Text style={label}>{t("kd.whereBegan")}</Text>
              {isVoiceLetter(opening, detail) && <VoiceOpeningCard voice={voice} />}
              {!!opening.body && (
                <Text numberOfLines={5} style={[{ fontSize: 16, lineHeight: 24, color: isVoiceLetter(opening, detail) ? tk.sub : tk.ink }, letterFace]}>
                  {opening.body}
                </Text>
              )}
              <Text style={label}>{whoBegan(detail, name, t, locale)}</Text>
            </InkPanel>
          )}

          {/* readable, not actionable: no door into a thread the server calls missing */}
          {canTalk(detail, status) && (
            <Pressable
              onPress={onTalk}
              accessibilityRole="button"
              style={({ pressed }) => ({ backgroundColor: tk.ink, borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", letterSpacing: 0.4, color: tk.bg }}>{t("kd.talkTo", { name: name.toLocaleUpperCase(locale) })}</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/** a soft group (H:92): soft, corners 16, no outline, no shadow */
function SoftGroup({ children }: { children: ReactNode }) {
  const { t: tk } = useTheme();
  return <View style={{ borderRadius: 16, backgroundColor: tk.soft, padding: 16 }}>{children}</View>;
}

/* THE STAMP IT BEGAN UNDER (stamps v2, 2026-10-18): its name, then the
   stamp at the ladder's kindredBeganUnder, 40×48, delivered — it came on
   the letter that opened the correspondence, so it tilts by that letter's
   id (threads.letter, the pool letter's own id: the same tilt the Today
   card gave it) and carries the postmark. A thread older than 0020 has no
   letter id; it tilts by the thread's id instead, stable all the same.
   The postmark runs under the name, so it is drawn only while the name
   ends above 0.72 of the stamp's height: a name that wraps, or a large
   type size, leaves it off rather than crossing the words. */
const BEGAN = STAMP_LADDER.kindredBeganUnder;

function BeganUnder({ name, stamp, letterId }: { name: string; stamp: string; letterId: string | null }) {
  const { t: tk } = useTheme();
  const [nameH, setNameH] = useState(0);
  return (
    <View style={{ flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text onLayout={(e) => setNameH(e.nativeEvent.layout.height)} style={{ flexShrink: 1, fontFamily: PF.monoMed, fontSize: MONO.title, color: tk.sub }}>
        {name}
      </Text>
      <Stamp id={stamp} width={BEGAN.w} delivered letterId={letterId} postmark={postmarkFitsCentred(BEGAN.w, nameH)} />
    </View>
  );
}

/** a fact as a grouped row (H:101): the label in the system face, the value quiet on the right;
    the value wraps rather than losing its numbers, and at accessibility sizes it stacks under the
    label (the system's grouped rows do the same) */
function FactRow({ label, value, last = false }: { label: string; value: ReactNode; last?: boolean }) {
  const { t: tk } = useTheme();
  const stack = largeType(useWindowDimensions().fontScale);
  return (
    <View
      accessible
      style={{
        flexDirection: stack ? "column" : "row",
        alignItems: stack ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: stack ? 4 : 12,
        minHeight: 48,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: tk.line,
      }}
    >
      <Text style={{ fontSize: 15, color: tk.ink }}>{label}</Text>
      {typeof value === "string" ? (
        <Text style={{ flexShrink: 1, fontFamily: PF.monoMed, fontSize: MONO.title, color: tk.sub, textAlign: stack ? "left" : "right" }}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

/* one dimension that has come through. The bar is the strength, the line is the read in warm
   words — hatch-engine writes both, and the line never speaks in metrics. */
function Moment({ d }: { d: DimScore }) {
  const { t: tk } = useTheme();
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: 1.2, color: tk.ink }}>{dimLabel(d.key).toUpperCase()}</Text>
        <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: tk.line }}>
          <View style={{ width: `${d.score}%`, height: 3, borderRadius: 2, backgroundColor: tk.ind }} />
        </View>
      </View>
      <Text style={{ fontSize: 15.5, lineHeight: 23, color: tk.ink, marginTop: 5 }}>{dimLineThird(d)}</Text>
    </View>
  );
}

/* one dimension, both of you on the same track. Hollow square is you, solid is them; when you land
   within a hair of each other the track under the pair goes ink, so agreement is visible without
   reading a number. */
function ResonanceLine({ r, locale }: { r: ResonanceRow; locale: string }) {
  const { t: tk } = useTheme();
  const lo = Math.min(r.mine, r.theirs);
  const hi = Math.max(r.mine, r.theirs);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 11 }} accessible accessibilityLabel={dimLabel(r.key)}>
      <Text numberOfLines={1} style={{ width: 86, fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 0.6, color: tk.sub }}>
        {dimLabel(r.key).toLocaleUpperCase(locale)}
      </Text>
      <View style={{ flex: 1, height: 12, justifyContent: "center" }}>
        <View style={{ height: 1, backgroundColor: tk.line }} />
        {/* the span between you */}
        <View style={{ position: "absolute", left: `${lo}%`, width: `${Math.max(hi - lo, 0.5)}%`, height: 1, backgroundColor: r.together ? tk.ink : tk.line }} />
        <View style={{ position: "absolute", left: `${r.theirs}%`, width: 7, height: 7, marginLeft: -3.5, backgroundColor: tk.ink }} />
        <View style={{ position: "absolute", left: `${r.mine}%`, width: 7, height: 7, marginLeft: -3.5, borderWidth: 1.5, borderColor: tk.ind, backgroundColor: tk.soft }} />
      </View>
    </View>
  );
}
