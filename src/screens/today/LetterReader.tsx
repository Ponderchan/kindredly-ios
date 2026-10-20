import { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MONO, PFM } from "../../theme/post";
import { useLetterFamily, useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { localeTag, sinceShort } from "../../lib/format";
import { MosaicId } from "../../components/MosaicId";
import { WhoFaceView } from "../../components/Frost";
import { WhoName } from "../../components/WhoName";
import { useIdentityOn } from "../../lib/identity";
import { KeepableStamp } from "../../components/Stamp";
import { Toast } from "../../components/ui";
import { STAMP_LADDER } from "../../lib/stamp-frame";
import { LetterInFlight } from "../../components/LetterInFlight";
import { LeaveSheet } from "../../components/LeaveSheet";
import { InkPanel, ReplyBar } from "../../components/10a";
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

   YOU ANSWER WITHOUT LEAVING THE LETTER: WRITE BACK opens the reply bar
   here (chat composers, Prompt 1: the same bar as the desk's reply, its
   hint 6 above it in capitals, Return a new line, the paper plane sends),
   with the letter still above it. The draft is the desk's own (the
   model's drafts, the one source of truth), so a reply started here and
   finished on the desk is one reply; closing the reader hands the words
   back to the desk's field (the model bumps its draft epoch). Sending
   closes the reader: the letter is answered, and on the desk Wren takes
   it off the band and "Reply sent." shows. With the pouch full, SEND explains instead, in
   a sheet drawn inside this reader (a second window-level modal can't be
   presented over this one), and the reader stays.

   10a dress, from the theme: the page colour, the ink panel (corners 28, a
   hard 6/6 shadow), mono 11 for what the machine says (the docket, the
   date); the buttons (FOLD BACK, WRITE BACK) in System (owner, 10-20).

   THE STAMP in the docket is the reader head's (stamps v2, 2026-10-18):
   delivered, so it tilts by the letter's id exactly as it did on the card.
   No box round it, and no postmark (the owner took it off).

   WHO WROTE IT follows the card (identity Phase 1): with the identity
   switch off the docket is today's, the mosaic beside "SEP.23 · NO.7273";
   with it on it is the card's new head — their frosted window in the 40pt
   slot (the veil tile for a deleted account), the courier name in 600 17
   with the ♀/♂ mark and the star sign after it in sub, the date alone in
   mono under it — read from the card's own `who`, so the letter keeps the
   face and the name it had a moment ago on the desk. */
const READER_STAMP = STAMP_LADDER.readerHead;

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
  // the identity switch (the table's row, or the dev preview): the docket in its new shape
  const identity = useIdentityOn();
  /* THE SHEET'S TOP, for the keyboard. A page sheet starts below the status bar, and the
     KeyboardAvoidingView reckons the keyboard from its own frame, which is the sheet's, against
     the keyboard's screen y: without the sheet's offset it lifted the bar that much too little
     and the keyboard covered its lower half. measureInWindow inside the sheet answers 0, so the
     offset is the screen's height less the sheet's (the sheet runs to the screen's foot). */
  const screenH = useWindowDimensions().height;
  const [sheetH, setSheetH] = useState(0);
  const sheetTop = sheetH > 0 ? Math.max(0, screenH - sheetH) : 0;
  /* the keyboard is up: the bar sits 12 over it (Prompt 2), not over the home indicator's room */
  const [kbUp, setKbUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setKbUp(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKbUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    if (!id) setWriting(false);
  }, [id]);
  /* a stranger's photo stamp, held: kept or reported (KeepableStamp), said in a toast */
  const [stampLine, setStampLine] = useState("");
  useEffect(() => {
    if (!stampLine) return;
    const tm = setTimeout(() => setStampLine(""), 2600);
    return () => clearTimeout(tm);
  }, [stampLine]);
  if (!letter || !card) return null;

  const state = model.replyFor(letter.id);
  const s = view.strings;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={act.closeReader}>
      <View onLayout={(e) => setSheetH(e.nativeEvent.layout.height)} style={{ flex: 1, backgroundColor: tk.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 }}>
          <Pressable onPress={act.closeReader} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("ld.foldBack")} style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
            <Text maxFontSizeMultiplier={2} style={{ ...PFM.monoMed, fontSize: 15, color: tk.ink }}>✕</Text>
            <Text maxFontSizeMultiplier={2} style={{ flexShrink: 1, fontWeight: "500", fontSize: 15, color: tk.sub }}>{t("ld.foldBack")}</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <InkPanel variant="today" style={{ marginRight: 6, marginBottom: 6 }}>
            {/* the same docket the card carries, so the letter keeps its face */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22 }}>
              {identity ? (
                <View accessible accessibilityLabel={`${card.who.spoken}. ${card.when}`} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <WhoFaceView face={card.who.face} size={40} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <WhoName name={card.who.name} marks={card.who} style={{ fontSize: 17, fontWeight: "600", color: tk.ink }} />
                    <Text numberOfLines={1} style={{ ...PFM.monoMed, fontSize: MONO.title, letterSpacing: 0.88, color: tk.sub }}>
                      {card.when}
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <MosaicId seed={letter.author} cell={4.8} gap={1} />
                  <Text style={{ flex: 1, ...PFM.monoSemi, fontSize: MONO.title, letterSpacing: 0.88, color: tk.ink }}>{card.postmark}</Text>
                </>
              )}
              <KeepableStamp id={letter.stamp} width={READER_STAMP.w} delivered letterId={letter.id} dark={tk.dark} from={{ letter: letter.id }} onDone={card.demo ? undefined : setStampLine} />
            </View>

            <Text style={[{ fontSize: 19, lineHeight: 31, color: tk.ink }, face]}>{card.isVoice ? card.caption : card.body}</Text>

            <Text style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 0.6, color: tk.mute, marginTop: 26 }}>
              {t("ld.written")} {sinceShort(letter.created_at)}
            </Text>
          </InkPanel>
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={sheetTop}>
          <View style={{ paddingHorizontal: 12, paddingTop: 14, paddingBottom: kbUp ? 12 : Math.max(insets.bottom, 12) + 12 }}>
            {view.sending ? (
              <LetterInFlight to={view.flyTo} slow={view.slow} />
            ) : writing ? (
              <ReplyBar
                // the letter's own: "write back to No. 7273…" (or "write back…" unsigned), as on the desk
                placeholder={card.replyPlaceholder || s.placeholder}
                // the desk's reply hint in the bar's capitals (the headwind line, over the limit in red,
                // the full pouch, "a thread opens…"); the bar opens with the keyboard, so it shows
                hint={state.hint.toLocaleUpperCase(localeTag())}
                hintWarn={state.hintWarn}
                showsHint
                sendLabel={s.send}
                emojiLabel={s.emoji}
                initialText={model.draftFor(letter.id)}
                canSend={state.ok}
                held={state.pouchFull}
                returnSends={false}
                autoFocus
                onChangeText={(v) => act.changeDraft(letter.id, v)}
                onSend={(v) => {
                  /* once it's gone the letter is answered, so the reader closes with it
                     (Wren takes it and "Reply sent." shows on the desk). A full pouch only
                     explains, and the reader stays: the sheet that explains is drawn in
                     here, below */
                  if (!state.pouchFull) act.closeReader();
                  act.send(letter.id, v);
                  return false;
                }}
              />
            ) : (
              <Pressable
                onPress={() => setWriting(true)}
                hitSlop={6}
                accessibilityRole="button"
                style={({ pressed }) => ({ backgroundColor: tk.ink, paddingVertical: 16, alignItems: "center", borderRadius: 999, opacity: pressed ? 0.85 : 1 })}
              >
                <Text style={{ fontWeight: "600", fontSize: 16, color: tk.bg }}>{t("ld.writeBack")}</Text>
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
        {stampLine ? <Toast msg={stampLine} bottom={Math.max(insets.bottom, 12) + 90} /> : null}
      </View>
    </Modal>
  );
}
