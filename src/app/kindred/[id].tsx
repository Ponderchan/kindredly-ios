import { useCallback, useMemo, useState } from "react";
import { archName, archDescThird, dimLabel, dimLineThird, dimSealedThird } from "../../lib/aura-copy";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { t, useLang } from "../../lib/i18n";
import { P, PF, panel, rule, solidBtn } from "../../theme/post";
import { AvatarImage } from "../../components/AvatarImage";
import { MosaicId } from "../../components/MosaicId";
import { ReportMenu } from "../../components/ReportMenu";
import { StampTile } from "../../components/StampTile";
import { getStamp, sname } from "../../data/stamps";
import { dLong } from "../../lib/format";
import { fetchThreadMessages, type ThreadDetail } from "../../lib/db";
import { readCorrespondent, resonance, theyify, type CorrespondentRead, type ResonanceRow } from "../../lib/correspondent";
import type { DimScore } from "../../lib/hatch-engine";

/* A kindred's page — the room behind the name.
   ────────────────────────────────────────────────────────────────────────
   Before reveal there is deliberately NO page: a stranger is their letters
   and nothing else, and No. 8434 having a profile would undo the whole
   point. This screen is part of what two signatures buy.

   It only shows what is true and already ours: the face they gave (or the
   mosaic, if they gave their name only), how long the correspondence has
   run, how many letters each way, the stamp it started under, and the
   letter that started it. No feeds, no fields, no empty shelves promising
   furniture — when the shared play (crossed letters, the pair card) is
   built, it moves in HERE. Until then the room is small and honest.

   Report/block stays reachable on a person page — intimacy is exactly
   where safety tools must not disappear. */
export default function KindredScreen() {
  useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ThreadDetail | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!id) return;
        if (__DEV__ && id.startsWith("demo-")) {
          const { DEMO_DETAILS } = await import("../../data/demo");
          if (alive) setDetail(DEMO_DETAILS[id] ?? null);
          return;
        }
        const d = await fetchThreadMessages(id);
        if (alive) setDetail(d);
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  const name = detail?.otherName || t("cm.kindred");
  /* THE READ, and it arrives BEFORE the name. Five letters used to buy a
     pen name — a string, arbitrary, and knowable on day one. What ten
     letters have actually earned you is a read of how they write, and this
     product's whole claim is that how you write is who you are. So the room
     opens at RECOGNIZING, unnamed, with the read as its subject; the name
     lands later and changes only the title. */
  const read = useMemo<CorrespondentRead | null>(() => {
    if (!detail) return null;
    const theirs = detail.messages.filter((m) => !m.mine).map((m) => m.body);
    if (!detail.openingFromMe && detail.opening) theirs.unshift(detail.opening);
    return readCorrespondent(theirs, detail.revealed);
  }, [detail]);
  /* AFTER REVEAL — the beginning of the journey, not the end of one.
     Resonance is computed from both halves of THIS correspondence, so it
     belongs to the relationship and grows every time either of you writes.
     Held back until you know each other: before that it would be a verdict
     on a stranger, which is the opposite of what the slow part is for. */
  const res = useMemo(() => {
    if (!detail?.revealed) return null;
    const mine = detail.messages.filter((m) => m.mine).map((m) => m.body);
    const theirs = detail.messages.filter((m) => !m.mine).map((m) => m.body);
    if (detail.openingFromMe && detail.opening) mine.unshift(detail.opening);
    if (!detail.openingFromMe && detail.opening) theirs.unshift(detail.opening);
    return resonance(mine, theirs);
  }, [detail]);
  const letters = (detail?.myCount ?? 0) + (detail?.otherCount ?? 0);
  const st = detail ? getStamp(detail.stamp) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2, color: P.ink }}>
          {detail?.revealed ? t("kd.kindred") : t("kd.voiceKnown")}
        </Text>
        <ReportMenu targetUser={detail?.other} context="thread" refId={id} snapshot={detail?.opening} onBlocked={() => router.back()} />
      </View>
      <View style={{ ...rule }} />

      {detail && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* who they are — the face they gave, beside the one you watched develop */}
          <View style={{ backgroundColor: P.sheet, padding: 20, marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              {detail.otherFace ? (
                <AvatarImage id={detail.otherFace} seed={detail.other} size={64} />
              ) : (
                <MosaicId seed={detail.other} cell={9} gap={2.4} />
              )}
              <View style={{ flex: 1 }}>
                {detail.revealed ? (
                  <>
                    <Text style={{ fontFamily: PF.letter, fontSize: 28, fontWeight: "600", color: P.ink }}>{name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 7 }}>
                      <MosaicId seed={detail.other} cell={3} gap={1} />
                      <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1, color: P.ink40 }}>
                        {t("kd.faceArrive")}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    {/* no name yet, and that is the point: the archetype is
                        what their writing has told you, which is the part
                        a name could never have said */}
                    <Text style={{ fontFamily: PF.letter, fontSize: 26, fontWeight: "600", color: P.ink }}>
                      {read?.archetype ? archName(read.archetype.id) : t("kd.stillVoice")}
                    </Text>
                    <Text style={{ fontFamily: PF.serifItalic, fontSize: 13.5, lineHeight: 20, color: P.ink60, marginTop: 5 }}>
                      {read?.archetype ? archDescThird(read.archetype.id) : t("kd.notEnough")}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* WHAT THEIR LETTERS HAVE TOLD YOU. The same object onboarding
              shows you about yourself at the hatch — a line per dimension
              that has come through, and the rest still sealed under KEEP
              WRITING. Built here from THEIR letters, on this device: no
              server, no aura row, and no LLM, so every line is a
              deterministic read of words they really wrote rather than a
              paraphrase of them in someone else's voice. */}
          {!!read?.found.length && (
            <View style={{ backgroundColor: P.sheet, padding: 18, marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>
                  {t("kd.learned")}
                </Text>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: P.pen }}>
                  {read.moments} MOMENT{read.moments > 1 ? "S" : ""}
                </Text>
              </View>

              {read.found.map((d) => (
                <Moment key={d.key} d={d} />
              ))}

              {read.sealed.length > 0 && (
                <>
                  <View style={{ height: 1, backgroundColor: P.ink12, marginTop: 14, marginBottom: 12 }} />
                  <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40 }}>
                    {t("kd.keepWriting")}
                  </Text>
                  <Text style={{ fontFamily: PF.mono, fontSize: 10.5, lineHeight: 19, color: P.ink60, marginTop: 6 }}>
                    {read.sealed.slice(0, 4).map((d) => `□ ${dimSealedThird(d.key).toLowerCase()}`).join("   ")}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* THE RESONANCE MAP — where the two of you write alike, and where
              you don't. Nine rows, two marks each: hollow is you, solid is
              them, and the distance between them is the whole point. The
              number is a cosine over the nine dimensions, so it is a real
              measurement of overlap and NOT a compatibility verdict — the
              line under it says which it is. */}
          {res && (
            <View style={{ backgroundColor: P.sheet, padding: 18, marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>
                  {t("kd.howAlike")}
                </Text>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 15, letterSpacing: 0.5, color: P.pen }}>
                  {res.score}%
                </Text>
              </View>

              <View style={{ marginTop: 14 }}>
                {res.rows.map((r) => (
                  <ResonanceLine key={r.key} r={r} />
                ))}
              </View>

              <View style={{ height: 1, backgroundColor: P.ink12, marginTop: 14, marginBottom: 12 }} />
              {!!res.closest && (
                <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 22, color: P.ink }}>
                  {t("kd.resClose", { label: dimLabel(res.closest.key).toLowerCase() })}
                </Text>
              )}
              {!!res.furthest && (
                <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 22, color: P.ink60, marginTop: 4 }}>
                  {t("kd.resFar", { label: dimLabel(res.furthest.key) })}
                </Text>
              )}
            </View>
          )}

          {/* the correspondence, as facts */}
          <View style={[panel, { paddingHorizontal: 18, paddingVertical: 4, marginBottom: 14 }]}>
            {detail.since ? (
              <Row label={t("kd.since")} value={dLong(detail.since)} />
            ) : null}
            <Row label={t("kd.letters")} value={t("kd.lettersVal", { n: letters, mine: detail.myCount, theirs: detail.otherCount })} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11 }}>
              <Text style={{ fontFamily: PF.mono, fontSize: 14.5, color: P.ink }}>{t("kd.beganUnder")}</Text>
              {st ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.ink60 }}>{sname(st.name)}</Text>
                  <View style={{ transform: [{ rotate: "-4deg" }] }}>
                    <StampTile id={detail.stamp} w={30} r={4} />
                  </View>
                </View>
              ) : (
                <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.ink40 }}>—</Text>
              )}
            </View>
          </View>

          {/* the letter that started it */}
          {!!detail.opening && (
            <View style={{ backgroundColor: P.sheet, padding: 18, marginBottom: 18 }}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>{t("kd.whereBegan")}</Text>
              <Text numberOfLines={5} style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink, marginTop: 10 }}>
                {detail.opening}
              </Text>
              <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1, color: P.ink40, marginTop: 10 }}>
                {detail.openingFromMe ? t("kd.youFirst") : t("kd.theyFirst", { name: name.toUpperCase() })}
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => (detail.revealed ? router.replace(`/room/${id}`) : router.back())}
            style={({ pressed }) => ({ ...solidBtn, opacity: pressed ? 0.85 : 1 })}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.8, color: "#fff" }}>
TALK TO {name.toUpperCase()}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* one dimension that has come through. The bar is the strength, the line is
   the read in warm words — hatch-engine writes both, and the line never
   speaks in metrics. */
function Moment({ d }: { d: DimScore }) {
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: P.ink }}>
          {dimLabel(d.key).toUpperCase()}
        </Text>
        <View style={{ flex: 1, height: 3, backgroundColor: P.ink12 }}>
          <View style={{ width: `${d.score}%`, height: 3, backgroundColor: P.pen }} />
        </View>
      </View>
      <Text style={{ fontFamily: PF.letter, fontSize: 15.5, lineHeight: 23, color: P.ink, marginTop: 5 }}>
        {dimLineThird(d)}
      </Text>
    </View>
  );
}

/* one dimension, both of you on the same track. Hollow square is you,
   solid is them; when you land within a hair of each other the track under
   the pair goes ink, so agreement is visible without reading a number. */
function ResonanceLine({ r }: { r: ResonanceRow }) {
  const lo = Math.min(r.mine, r.theirs);
  const hi = Math.max(r.mine, r.theirs);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 11 }}>
      <Text style={{ width: 86, fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.6, color: P.ink60 }}>
        {dimLabel(r.key).toUpperCase()}
      </Text>
      <View style={{ flex: 1, height: 12, justifyContent: "center" }}>
        <View style={{ height: 1, backgroundColor: P.ink12 }} />
        {/* the span between you */}
        <View
          style={{
            position: "absolute",
            left: `${lo}%`,
            width: `${Math.max(hi - lo, 0.5)}%`,
            height: 1,
            backgroundColor: r.together ? P.ink : P.ink12,
          }}
        />
        <View style={{ position: "absolute", left: `${r.theirs}%`, width: 7, height: 7, marginLeft: -3.5, backgroundColor: P.ink }} />
        <View
          style={{
            position: "absolute",
            left: `${r.mine}%`,
            width: 7,
            height: 7,
            marginLeft: -3.5,
            borderWidth: 1.5,
            borderColor: P.pen,
            backgroundColor: P.sheet,
          }}
        />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: P.ink12 }}>
      <Text style={{ fontFamily: PF.mono, fontSize: 14.5, color: P.ink }}>{label}</Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 12, color: P.ink60 }}>{value}</Text>
    </View>
  );
}
