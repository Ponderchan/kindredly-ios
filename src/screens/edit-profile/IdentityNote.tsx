import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getLang, t, useLang } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { getFlags, setFlag } from "../../lib/flags";
import { postmark } from "../../lib/format";
import { readYourPronoun } from "../../lib/pronouns";
import { readSurfaces, remoteSurfaces, subscribeSurfaces, surfacesReady } from "../../lib/surfaces";
import { identitySwitch, type Mark } from "../../lib/identity-core";
import { frostSpec, type FrostSpec } from "../../lib/frost";
import { strangerName } from "../../lib/stranger-name";
import { zodiacFromDob, type Zodiac } from "../../lib/zodiac";
import { MONO, PFM } from "../../theme/post";
import { Frost } from "../../components/Frost";
import { WhoGlyphs } from "../../components/WhoName";
import { SoftSection, SoftSwitchRow } from "../settings/SoftRN";
import { IDENTITY_NOTE_FLAG, identityNote, identityNoteSave, markOffered, resolvePronoun, showIdentityNote, showsMark, showsSign, type IdentityNoteVM, type PronounId } from "./edit-profile-model";
import "../../data/strings-identity";

/* THE ONE-TIME NOTE AFTER THE IDENTITY SWITCH (identity Phase 1: identity-
   plan §4 and its zodiac addendum, the owner's 2026-10-18 decisions).
   ────────────────────────────────────────────────────────────────────────
   Someone who was here before the switch wakes up to letters that now
   carry a courier name, a frosted window and, unless they say otherwise,
   their star sign. They are told once, over the tabs, with both switches
   inside the note, so the choice is made where it is explained:

     WHAT STRANGERS SEE NOW
     Strangers now know you by a name their courier gives you…
     ┌ YOU, TO A STRANGER ───────────────┐
     │ [frost]  Sunday Kite ♀ ♊          │   a live preview: your own window,
     │          OCT.18                   │   the name a stranger's courier in
     └───────────────────────────────────┘   your language gives you, the glyphs
     ON YOUR LETTERS                           as the switches stand
     Show ♀ on your letters          ( )
     Star sign on your letters       (●)
     Change either any time in Edit profile.
     [ DONE ]

   THE TWO SWITCHES ARE EQUAL. Neither is a button that says yes louder
   than the other: each is a switch with its note, and Done is the only
   button. The mark's switch starts OFF (their pronoun was given as "only
   used in how the app talks about you", so showing it is theirs to choose)
   and is offered only to she and he; the sign's starts ON (the owner's
   option B). Each switch saves as it moves, the way Edit profile saves; Done
   saves both values once more, so the account always holds an answer and
   the note never comes back, on this phone (the flag) or any other (the
   two values: showIdentityNote only asks someone whose account has neither).

   WHO SEES IT (showIdentityNote): the TABLE's identity switch on — never the
   dev preview, which would write the real account's metadata from a dev
   page; the dev page shows the sheet itself, IdentityNoteSheet, with
   nothing saved — a session, onboarding done, neither value ever saved, and
   not seen on this phone. Once the new onboarding ships, new people choose
   both there (its screen 6 saves them); until then someone who signs up
   after the switch answers this note too, which is the same choice.

   NEVER A FILTER, NEVER THE LOCK SCREEN. The note only explains what
   strangers see; nothing here chooses or sorts anyone. */

/* the 10a dim, as LeaveSheet's and SignUpSheet's */
const DIM = "rgba(30,27,53,0.3)";

/** The sheet itself, drawn from a note view: the connected IdentityNote below, or the dev page. */
export function IdentityNoteSheet({
  note,
  frost,
  pronoun,
  sign,
  when,
  onMark,
  onSign,
  onDone,
}: {
  note: IdentityNoteVM;
  /** your own frosted window (lib/frost frostSpec of your id); null draws none */
  frost: FrostSpec | null;
  pronoun: PronounId;
  /** your own star sign; null with no birthday */
  sign: Zodiac | null;
  /** today's postmark date, under the preview's name, as a card's header has it */
  when: string;
  onMark: (on: boolean) => void;
  onSign: (on: boolean) => void;
  onDone: () => void;
}) {
  const { t: tk } = useTheme();
  const insets = useSafeAreaInsets();
  const { letters } = note;
  const mark: Mark | null = letters.mark?.on && markOffered(pronoun) ? (pronoun as Mark) : null;
  const shownSign = letters.sign.on ? sign : null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onDone}>
      <View accessibilityViewIsModal style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}>
        {/* the dim doesn't dismiss: Done is one tap, and it is what saves both answers */}
        <Animated.View entering={FadeIn.duration(160)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: DIM }} />
        <Animated.View entering={SlideInDown.duration(260)} style={{ maxHeight: "92%", backgroundColor: tk.sf, borderTopWidth: 1, borderTopColor: tk.ln, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: Math.max(insets.bottom, 12) + 8, gap: 14 }}>
            <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "700", color: tk.ink }}>
              {note.title}
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 21, color: tk.sub }}>{note.body}</Text>

            {/* YOU, TO A STRANGER: the card header a stranger's desk shows for you */}
            <View accessible accessibilityLabel={note.previewA11y} style={{ backgroundColor: tk.soft, borderRadius: 16, padding: 14, gap: 10 }}>
              <Text style={{ ...PFM.monoSemi, fontSize: MONO.label, letterSpacing: MONO.label * 0.14, color: tk.mute }}>{note.previewLabel}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {frost ? <Frost spec={frost} size={40} /> : <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: tk.soft2 }} />}
                <View style={{ flex: 1, gap: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 17, fontWeight: "600", color: tk.ink }}>
                      {note.previewName}
                    </Text>
                    <WhoGlyphs mark={mark} sign={shownSign} size={14} />
                  </View>
                  <Text style={{ ...PFM.monoMed, fontSize: 11, letterSpacing: 11 * 0.08, color: tk.sub }}>{when}</Text>
                </View>
              </View>
            </View>

            <SoftSection header={letters.header} headerInset={4}>
              {letters.mark && <SoftSwitchRow label={letters.mark.label} sub={letters.mark.note} on={letters.mark.on} onChange={onMark} />}
              <SoftSwitchRow label={letters.sign.label} sub={letters.sign.note} on={letters.sign.on} onChange={onSign} last />
            </SoftSection>

            <Text style={{ fontSize: 13, lineHeight: 18, color: tk.mute, textAlign: "center" }}>{note.foot}</Text>

            <Pressable
              onPress={onDone}
              accessibilityRole="button"
              style={({ pressed }) => ({ backgroundColor: tk.ink, borderRadius: 14, paddingVertical: 15, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: tk.bg }}>{note.done}</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* the table's switch alone (never the dev preview: see the header) */
const tableOn = () => identitySwitch(remoteSurfaces(), null);

/**
 * The note, connected: mounted once over the tabs ((tabs)/_layout). Draws
 * nothing unless showIdentityNote says so; then the sheet, until Done.
 */
export function IdentityNote() {
  useLang();
  const { dark } = useTheme();
  const auth = useAuth();
  const { user, profile, onboarded } = auth;
  const on = useSyncExternalStore(subscribeSurfaces, tableOn);
  useEffect(() => {
    void surfacesReady();
    void readSurfaces();
  }, []);

  // this phone's flag and pronoun, read once
  const [seen, setSeen] = useState<boolean | null>(null);
  const [devicePronoun, setDevicePronoun] = useState<PronounId | null>(null);
  useEffect(() => {
    let alive = true;
    getFlags().then((f) => alive && setSeen(!!f[IDENTITY_NOTE_FLAG]));
    readYourPronoun().then((p) => alive && setDevicePronoun(p));
    return () => {
      alive = false;
    };
  }, []);

  // opened once the rule says so, and kept open until Done (a switch saved meanwhile mustn't close it)
  const [open, setOpen] = useState(false);
  const due = seen === false && showIdentityNote({ identity: on, session: !!user, onboarded, showMark: profile?.showMark, showSign: profile?.showSign, seen: false });
  useEffect(() => {
    if (due) setOpen(true);
  }, [due]);

  const pronoun = resolvePronoun(profile?.pronoun, devicePronoun);
  const dob = typeof profile?.dob === "string" ? (profile.dob as string) : null;
  const sign = useMemo(() => zodiacFromDob(dob), [dob]);
  const [markOn, setMarkOn] = useState<boolean | null>(null);
  const [signOn, setSignOn] = useState<boolean | null>(null);
  const mark = markOn ?? showsMark(profile?.showMark);
  const signShown = signOn ?? showsSign(profile?.showSign);

  const uid = user?.id ?? null;
  const frost = useMemo(() => (uid ? frostSpec(uid, dark) : null), [uid, dark]);
  const previewName = uid ? strangerName(uid, { lang: getLang(), unsigned: "" }) : "";
  const note = identityNote({ pronoun, showMark: mark, showSign: signShown, sign, previewName }, t);

  const save = auth.saveProfile;
  const onMark = useCallback(
    (v: boolean) => {
      setMarkOn(v);
      void save({ showMark: markOffered(pronoun) && v }).catch((e) => console.warn("[identity-note] the mark's switch wasn't saved:", e));
    },
    [save, pronoun],
  );
  const onSign = useCallback(
    (v: boolean) => {
      setSignOn(v);
      void save({ showSign: v }).catch((e) => console.warn("[identity-note] the sign's switch wasn't saved:", e));
    },
    [save],
  );
  const onDone = useCallback(() => {
    setOpen(false);
    setSeen(true);
    void setFlag(IDENTITY_NOTE_FLAG);
    void save(identityNoteSave(pronoun, mark, signShown)).catch((e) => console.warn("[identity-note] the answers weren't saved (they stay on this phone):", e));
  }, [save, pronoun, mark, signShown]);

  if (!open || !uid) return null;
  return <IdentityNoteSheet note={note} frost={frost} pronoun={pronoun} sign={sign} when={postmark(new Date())} onMark={onMark} onSign={onSign} onDone={onDone} />;
}
