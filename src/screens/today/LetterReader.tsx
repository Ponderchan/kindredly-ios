import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MONO, PF } from "../../theme/post";
import { BRAND } from "../../theme/themes";
import { useLetterFamily, useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { sinceShort } from "../../lib/format";
import { MosaicId } from "../../components/MosaicId";
import { StampTile } from "../../components/StampTile";
import { LetterInFlight } from "../../components/LetterInFlight";
import { LeaveSheet } from "../../components/LeaveSheet";
import { InkPanel, ReplyStrip } from "../../components/10a";
import type { TodayModel } from "./useTodayDesk";

/* THE UNFOLDED LETTER (both renderers: SwiftUI's UNFOLD ↓ and the React
   Native card's open the same reader).
   ────────────────────────────────────────────────────────────────────────
   A Modal rather than a route, and that's the whole reason this works: the
   reader lives inside the page that opened it — no route to push, no letter
   to re-fetch by id, no cold-start deep link into a letter that may have
   left the pool. Unfolding isn't a destination; it's a gesture on the page.

   It carries the docket so you never lose track of whose letter this is,
   and it scrolls the way any long document does. The text is what the card
   showed (the translation, if it was turned on), in the reader's Letter
   font at 19/31.

   YOU ANSWER WITHOUT LEAVING THE LETTER: WRITE BACK opens the 10a strip
   here, with the letter still above it. The draft is the desk's own (the
   model's drafts, the one source of truth), so a reply started here and
   finished on the desk is one reply; closing the reader hands the words
   back to the desk's field (the model bumps its draft epoch). Sending
   closes the reader: the letter is answered, and the fly-by and "Reply
   sent." play on the desk. With the pouch full, SEND explains instead, in
   a sheet drawn inside this reader (a second window-level modal can't be
   presented over this one), and the reader stays.

   10a dress, from the theme: the page colour, the ink panel (corners 28, a
   hard 6/6 shadow), mono 11 for what the machine says. */
export function LetterReader({ model }: { model: TodayModel }) {
  useLang();
  const { t: tk } = useTheme();
  const face = useLetterFamily();
  const insets = useSafeAreaInsets();
  const { view, act } = model;
  const id = view.readerId;
  const letter = id ? view.feed.find((l) => l.id === id) ?? null : null;
  const card = id ? view.cards.find((c) => c.id === id) ?? null : null;
  const [writing, setWriting] = useState(false);
  useEffect(() => {
    if (!id) setWriting(false);
  }, [id]);
  if (!letter || !card) return null;

  const state = model.replyFor(letter.id);
  const s = view.strings;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={act.closeReader}>
      <View style={{ flex: 1, backgroundColor: tk.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 }}>
          <Pressable onPress={act.closeReader} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("ld.foldBack")} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontFamily: PF.monoMed, fontSize: 15, color: tk.ink }}>✕</Text>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 1.6, color: tk.sub }}>{t("ld.foldBack")}</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <InkPanel variant="today" style={{ marginRight: 6, marginBottom: 6 }}>
            {/* the same docket the card carries, so the letter keeps its face */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <MosaicId seed={letter.author} cell={4.8} gap={1} />
              <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 0.88, color: tk.ink }}>{card.postmark}</Text>
              <View style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 2, borderColor: tk.ln, backgroundColor: tk.sf, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                <StampTile id={letter.stamp} w={28} r={0} />
              </View>
            </View>

            <Text style={[{ fontSize: 19, lineHeight: 31, color: tk.ink }, face]}>{card.isVoice ? card.caption : card.body}</Text>

            <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 0.6, color: tk.mute, marginTop: 26 }}>
              {t("ld.written")} {sinceShort(letter.created_at)}
            </Text>
          </InkPanel>
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ paddingHorizontal: 12, paddingTop: 14, paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
            {view.sending ? (
              <LetterInFlight to={view.flyTo} slow={view.slow} />
            ) : writing ? (
              <>
                <ReplyStrip
                  placeholder={s.placeholder}
                  sendLabel={s.send}
                  initialText={model.draftFor(letter.id)}
                  canSend={state.ok}
                  held={state.pouchFull}
                  returnSends={false}
                  autoFocus
                  onChangeText={(v) => act.changeDraft(letter.id, v)}
                  onSend={(v) => {
                    /* once it's gone the letter is answered, so the reader closes with it
                       (the fly-by and "Reply sent." play on the desk). A full pouch only
                       explains, and the reader stays: the sheet that explains is drawn in
                       here, below */
                    if (!state.pouchFull) act.closeReader();
                    act.send(letter.id, v);
                    return false;
                  }}
                  style={{ marginRight: 4 }}
                />
                <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 1.4, color: state.hintWarn ? BRAND.postRed : tk.sub, marginTop: 8, marginLeft: 2 }}>{state.hint}</Text>
              </>
            ) : (
              <Pressable
                onPress={() => setWriting(true)}
                hitSlop={6}
                accessibilityRole="button"
                style={({ pressed }) => ({ backgroundColor: tk.ink, paddingVertical: 16, alignItems: "center", borderRadius: 999, opacity: pressed ? 0.85 : 1 })}
              >
                <Text style={{ fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: 2, color: tk.bg }}>{t("ld.writeBack")}</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>

        {/* THE POUCH IS FULL, said over the letter. It is drawn in the reader's
            own tree, not as the desk's window-level sheet: a React Native
            Modal presents from the screen's view controller, which is already
            presenting this page sheet, so UIKit would refuse the second one and
            SEND here would do nothing (TodayOverlays draws the desk's sheet only
            while no reader is open). Closing the reader takes this with it. */}
        <LeaveSheet
          open={model.sheets.flightFull}
          title={t("ld.flightFull.title")}
          body={t("ld.flightFull.body")}
          actions={[{ label: t("ld.flightFull.ok"), kind: "primary", onPress: act.closeFlightSheet }]}
          cancelLabel={null}
          onCancel={act.closeFlightSheet}
        />
      </View>
    </Modal>
  );
}
