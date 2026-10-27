import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo, Keyboard, Modal, Platform, Pressable, ScrollView as RNScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, SlideInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t, useLang, getLang } from "../../lib/i18n";
import { scrimColor, useTheme } from "../../lib/theme";
import { BRAND } from "../../theme/themes";
import { MONO, PFM } from "../../theme/post";
import { screenNow } from "../../lib/wren";
import { strangerName } from "../../lib/stranger-name";
import { readYourPronoun } from "../../lib/pronouns";
import { getAvatarPhoto } from "../../lib/avatar-photo";
import { penTypedUpright, type PadPoint } from "../../lib/pen-signature";
import type { PenSignature } from "../../lib/db";
import { FACES } from "../../data/aura-avatar-lib";
import { AvatarImage } from "../../components/AvatarImage";
import { PenSignature as PenSignatureView } from "../../components/PenSignature";
import { SignaturePad } from "../../components/SignaturePad";
import { SignUpSheet } from "../../components/SignUpSheet";
import { useOverlayRenderer } from "../../components/OverlayNativeSurface";
import { SignSheetSwift } from "./SignSheetNative";
import { dangerInk } from "../settings/settings-model";
import { FIELD_SPECS, PEN_NAME_MAX, resolvePronoun, type PronounId } from "../edit-profile/edit-profile-model";
import {
  canSign,
  checkPenName,
  defaultFace,
  drawingOf,
  faceA11y,
  faceChoices,
  nameErrorKey,
  padSizeOf,
  padTakesStroke,
  padValue,
  sheetCopy,
  sigToSend,
  signDemo,
  subscribeSignDemo,
  type SignOutcome,
} from "./sign-sheet";
import type { LettersModel } from "./useLettersModel";
import "../../data/strings-identity2";
import "../../data/strings-a11y-chat"; // ch.a11y.nameLong; and the chat's and room's batch-3 words (rm.askNeedsPrompt), loaded with every conversation

/* THE SIGNING SHEET (identity Phase 2; .claude/identity-build/PHASE2.md §6).
   ────────────────────────────────────────────────────────────────────────
   What the sign door opens when the identity switch is on, in both
   renderers of the pen-pal chat (ConversationNative's KDock and LettersRN's
   dock route "sign" here through useLettersModel.onDock). Everything that
   will travel, in the order it travels, and nothing else:

     the lead line     whose courier name you're signing to, and when they
                       see it (System 16, sub: a description)
     THE FACE YOU SEND your library face first, then your pool's, then No
                       face (the glyph) — for this trade only, never saved
                       to the profile; a photo never leaves the phone
     YOUR PEN NAME     typed: empty at the first trade (it is asked for here,
                       not in onboarding), pre-filled from the profile at
                       every later one and still editable; Edit profile's
                       rules (20, trimmed, no capitals forced, no
                       autocorrect), never your own courier name, nothing the
                       safety screen calls off the page; saved to the profile
                       before it is sent
     YOUR SIGNATURE    the pad (components/SignaturePad) with Undo and
                       Clear, or "Type it instead": the pen name set in the
                       letter serif's italic (upright for CJK) — the way in
                       for VoiceOver, which lands on it first
     the guest line    a guest can sign; linking an account is offered
                       (SignUpSheet: Apple links the anonymous user, the
                       email path attaches an address to it — the same user
                       id, threads and seal either way), never required
     SIGN AND SEND     the 10a main action, on only when the name may go and
                       there is a signature
     the foot          they see it only once they've signed too

   THE CONTAINER is a window-level transparent Modal over the 10a dim with
   a bottom sheet of our own, top corners 20, about 92% of the screen tall —
   not iOS's pageSheet, whose drag-to-dismiss would take a downward stroke
   from the pad. Its content scrolls (react-native-gesture-handler's
   ScrollView, whose pan the pad blocks while a finger is on it, and which
   stops scrolling until the finger lifts) and moves clear of the keyboard
   (automaticallyAdjustKeyboardInsets). The chat's keyboard is put away
   before it opens (onDock → ui.thenModal).

   THE SEND is the model's (useLettersModel onSignSheet; the rules in
   sign-sheet.ts): "kept" leaves the sheet exactly as drawn after a failure
   it has already said; "signed" and "closed" close it ("signed" also
   empties it for whoever opens it next). It stays mounted with the chat,
   so closing it with ✕ and opening it again finds the drawing still there.

   VoiceOver: the sheet is modal, its escape closes it, Type it instead
   takes the focus once the sheet has risen, the faces are buttons with a
   selected state, the pad is one element, and a red line under the field is
   announced when it appears. Reduce Motion: the sheet fades in instead of
   rising. Dynamic Type: every word scales (mono labels to 1.6×), rows wrap,
   and the pad and the faces keep their size.

   DEMO MODE: on a demo thread the dev pages decide what the sheet believes
   about the reader (sign-sheet setSignDemo: the pen name held, guest or
   not); a demo never saves to the profile or reaches the server.

   SWIFT (2026-10-27, the "signsheet" switch, off until its simulator pass):
   SignSheetView picks between this React Native sheet (SignSheetViewRN) and
   SignSheetNative's, which keeps this same window, dim, slide and sign-in
   sheet and draws the sheet's inside in SwiftUI. Everything it decides is
   still here and in sign-sheet.ts: the strokes, the pen name and its check,
   the faces, the send. */

/** what the connected sheet reads from the letters model */
type SignSheetModel = Pick<LettersModel, "askSign" | "setAskSign" | "signing" | "onSignSheet" | "detail" | "auth" | "name" | "isDemo">;

/** The sheet over the pen-pal chat (identity on). */
export function SignSheet({ m }: { m: SignSheetModel }) {
  const demo = useSyncExternalStore(subscribeSignDemo, signDemo);
  const d = m.isDemo ? demo : null;
  const { askSign, signing, setAskSign } = m;
  const onClose = useCallback(() => {
    if (!signing) setAskSign(false);
  }, [signing, setAskSign]);
  return (
    <SignSheetView
      open={askSign}
      busy={signing}
      courier={m.name}
      theirSigned={!!m.detail?.theirSigned}
      handle={d ? d.handle : m.auth.handle}
      isGuest={d ? d.guest : m.auth.isGuest}
      myUid={m.auth.user?.id ?? null}
      profileFace={m.auth.profile?.avatarId ?? null}
      profilePronoun={m.auth.profile?.pronoun}
      onClose={onClose}
      onSubmit={m.onSignSheet}
    />
  );
}

export type SignSheetViewProps = {
  open: boolean;
  /** the send is out: the button reads "…" and nothing can close the sheet */
  busy: boolean;
  /** their courier name ("Sunday Kite") */
  courier: string;
  theirSigned: boolean;
  /** the pen name the profile holds ("" at the first trade) */
  handle: string;
  isGuest: boolean;
  /** for my own courier name (the name may not be it) and the No face glyph */
  myUid: string | null;
  /** user_metadata.avatarId (a library face, or nothing when a photo is worn) */
  profileFace: unknown;
  /** user_metadata.pronoun, for the face pool (this phone's copy is read when it is missing) */
  profilePronoun: unknown;
  onClose: () => void;
  onSubmit: (s: PenSignature) => Promise<SignOutcome>;
};

/* the sheet rises, then VoiceOver is sent to Type it instead */
const FOCUS_AFTER_MS = 450;
/* the face row's geometry: its 12pt lead spacer and the row's 4pt gap before the first face, then
   one 60pt ringed face and a 4pt gap per step */
const FACE_ROW_LEAD = 16;
const FACE_STEP = 64;

/** The sheet itself, from plain facts: the connected SignSheet above, or the dev page. Its inside
    is SwiftUI's (SignSheetNative, the "signsheet" switch) where it can be, else React Native's. */
export function SignSheetView(p: SignSheetViewProps) {
  const { native, toRN } = useOverlayRenderer("signsheet", "KSignSheetView", p.open);
  return native ? <SignSheetSwift {...p} onFallback={toRN} /> : <SignSheetViewRN {...p} />;
}

/** The React Native sheet. */
function SignSheetViewRN(p: SignSheetViewProps) {
  useLang();
  const { t: tk, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const reduce = useReducedMotion();

  const { width: padW, height: padH } = padSizeOf(win.width);

  /* ── what the reader has done on the sheet (kept while the chat is open) ── */
  const [name, setName] = useState(p.handle);
  const [seed, setSeed] = useState(0); // bumped to put words in the uncontrolled field
  const touched = useRef(false);
  const [face, setFace] = useState<string | null | undefined>(undefined); // undefined = the default
  const [typed, setTyped] = useState(false);
  const [strokes, setStrokes] = useState<PadPoint[][]>([]);
  const [drawingNow, setDrawingNow] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);

  /* ── what the phone knows: the photo worn, this phone's pronoun ── */
  const [photo, setPhoto] = useState(false);
  const [devicePronoun, setDevicePronoun] = useState<PronounId | null>(null);
  useEffect(() => {
    if (!p.open) return;
    let alive = true;
    getAvatarPhoto().then((uri) => alive && setPhoto(!!uri));
    readYourPronoun().then((v) => alive && setDevicePronoun(v));
    return () => {
      alive = false;
    };
  }, [p.open]);

  /* the profile's pen name, until something is typed: on every open (a pen name saved meanwhile,
     a later trade), and when the account's copy arrives after the sheet */
  useEffect(() => {
    if (!p.open || touched.current) return;
    setName(p.handle);
    setSeed((n) => n + 1);
  }, [p.open, p.handle]);

  /* VoiceOver lands on Type it instead once the sheet has risen (the pad is not the way in) */
  const typeRef = useRef<View>(null);
  useEffect(() => {
    if (!p.open) return;
    const h = setTimeout(() => {
      AccessibilityInfo.isScreenReaderEnabled()
        .then((on) => {
          if (on && typeRef.current) AccessibilityInfo.sendAccessibilityEvent(typeRef.current, "focus");
        })
        .catch(() => undefined);
    }, FOCUS_AFTER_MS);
    return () => clearTimeout(h);
  }, [p.open]);

  /* ── the facts and words ── */
  const myCourier = useMemo(() => (p.myUid ? strangerName(p.myUid, { lang: getLang(), unsigned: "" }) : ""), [p.myUid]);
  const check = checkPenName(name, myCourier, screenNow);
  /* no maxLength on the field: iOS applies it to marked text too, so a Japanese or Chinese name
     near the limit lost its romaji or pinyin mid-composition. Past the limit (the same count
     checkField holds it to) the red line says so and SIGN AND SEND stays off; nothing is cut */
  const tooLong = name.trim().length > PEN_NAME_MAX;
  const errorKey = tooLong ? "ch.a11y.nameLong" : nameErrorKey(check.problem);
  const errorText = errorKey ? t(errorKey, { n: PEN_NAME_MAX }) : "";
  useEffect(() => {
    if (errorText && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(errorText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorKey]);
  const copy = sheetCopy({ courier: p.courier, theirSigned: p.theirSigned, handle: p.handle, photo, isGuest: p.isGuest }, t);

  const pronoun = resolvePronoun(p.profilePronoun, devicePronoun);
  const faces = useMemo(() => faceChoices(p.profileFace, pronoun, FACES), [p.profileFace, pronoun]);
  const chosen = face === undefined ? defaultFace(p.profileFace) : face;
  const libraryCount = faces.length - 1;
  /* The chosen face is in sight as the sheet opens: No face is last in the row (no library face on
     the profile, or a photo), so the row starts at its end; a face picked further along before the
     sheet was closed (it keeps the choice) is brought to the middle. Only as it opens, never after
     a choice */
  const faceRow = useRef<RNScrollView>(null);
  useEffect(() => {
    if (!p.open) return;
    const at = faces.indexOf(chosen);
    if (at <= 0) return;
    const h = setTimeout(() => {
      if (chosen === null) faceRow.current?.scrollToEnd({ animated: false });
      else faceRow.current?.scrollTo({ x: Math.max(0, FACE_ROW_LEAD + at * FACE_STEP + FACE_STEP / 2 - win.width / 2), animated: false });
    }, 0);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.open]);

  const drawing = useMemo(() => drawingOf(strokes, { width: padW, height: padH }), [strokes, padW, padH]);
  const can = !tooLong && canSign({ name: check, typed, drawing, busy: p.busy });
  const scrollRef = useRef(null);

  const onStroke = useCallback((s: PadPoint[]) => setStrokes((all) => (padTakesStroke(all.length) ? [...all, s] : all)), []);

  const reset = () => {
    touched.current = false;
    setFace(undefined);
    setTyped(false);
    setStrokes([]);
  };

  const submit = async () => {
    if (!can) return;
    Keyboard.dismiss();
    const out = await p.onSubmit({ name: check.value, face: chosen, sig: sigToSend(typed, drawing) });
    if (out === "signed") reset();
  };

  /* the wells on the sheet (the field, the pad, the guest line): soft, except on Midnight, where soft
     is the sheet's own sf and a well would vanish into it — there it is soft2 */
  const well = dark ? tk.soft2 : tk.soft;
  // the field's red line: Edit profile's (the postal red toward the ink, readable on every theme)
  const err = dangerInk(tk.ink, BRAND.postRed);
  const label = (s: string) => (
    <Text accessibilityRole="header" maxFontSizeMultiplier={1.6} style={{ ...PFM.monoSemi, fontSize: MONO.label, letterSpacing: MONO.label * 0.14, color: tk.mute }}>
      {s}
    </Text>
  );
  const smallButton = (text: string, onPress: () => void, disabled: boolean) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({ paddingVertical: 4, paddingHorizontal: 2, opacity: disabled ? 0.35 : pressed ? 0.5 : 1 })}
    >
      <Text maxFontSizeMultiplier={1.8} style={{ fontSize: 14, fontWeight: "600", color: tk.ind }}>
        {text}
      </Text>
    </Pressable>
  );

  // the empty typed preview's faint words, upright for CJK as a pen name would be
  const uprightEmpty = penTypedUpright(t("id2.sheet.traceEmpty"));

  return (
    <Modal visible={p.open} transparent animationType="none" statusBarTranslucent onRequestClose={p.onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={p.onClose}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}
        >
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
            <Pressable onPress={p.onClose} accessible={false} style={{ flex: 1, backgroundColor: scrimColor(dark, 0.3) }} />
          </Animated.View>

          <Animated.View
            entering={reduce ? FadeIn.duration(180) : SlideInDown.duration(280)}
            style={{
              height: Math.round(win.height * 0.92),
              backgroundColor: tk.sf,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: 1,
              borderTopColor: tk.ln,
              overflow: "hidden",
            }}
          >
            {/* the title and the ✕ */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 8, paddingTop: 12, paddingBottom: 4 }}>
              {/* the sheet's title, System 500 17 centred (the ✕'s room mirrored on the left) */}
              <View style={{ width: 36 }} />
              <Text accessibilityRole="header" maxFontSizeMultiplier={1.6} style={{ flex: 1, fontSize: 17, fontWeight: "500", textAlign: "center", color: tk.ink }}>
                {t("id2.sheet.title")}
              </Text>
              <Pressable
                onPress={p.onClose}
                disabled={p.busy}
                accessibilityRole="button"
                accessibilityLabel={t("id2.sheet.close")}
                style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
              >
                <Text style={{ ...PFM.mono, fontSize: 16, color: tk.mute }} allowFontScaling={false}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              scrollEnabled={!drawingNow}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 12) + 20, gap: 22 }}
            >
              {/* 1. the lead line */}
              <Text style={{ fontSize: 16, lineHeight: 23, color: tk.sub }}>{copy.lead}</Text>

              {/* 2. THE FACE YOU SEND */}
              <View style={{ gap: 10 }}>
                {label(t("id2.sheet.face"))}
                <RNScrollView
                  ref={faceRow}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: 4, alignItems: "flex-start" }} style={{ marginHorizontal: -16 }}>
                  <View style={{ width: 12 }} />
                  {faces.map((id, i) => (
                    <FaceButton key={id ?? "none"} id={id} on={id === chosen} label={faceA11y(id, i + 1, libraryCount, t)} seed={p.myUid || "me"} onPick={setFace} />
                  ))}
                  <View style={{ width: 12 }} />
                </RNScrollView>
                <Text style={{ fontSize: 13, lineHeight: 18, color: tk.mute }}>{copy.faceNote}</Text>
              </View>

              {/* 3. YOUR PEN NAME */}
              <View style={{ gap: 8 }}>
                {label(t("id2.sheet.name"))}
                <View style={{ backgroundColor: well, borderRadius: 16, paddingHorizontal: 14 }}>
                  <TextInput
                    key={seed}
                    defaultValue={name}
                    onChangeText={(v) => {
                      touched.current = true;
                      setName(v);
                    }}
                    autoCapitalize={FIELD_SPECS.pen.autoCapitalize}
                    autoCorrect={FIELD_SPECS.pen.autoCorrect}
                    spellCheck={false}
                    autoComplete="off"
                    textContentType="none"
                    returnKeyType="done"
                    blurOnSubmit
                    clearButtonMode="while-editing"
                    placeholder={copy.firstTrade ? t("id2.sheet.namePh") : undefined}
                    placeholderTextColor={tk.faint}
                    selectionColor={tk.ind}
                    keyboardAppearance={dark ? "dark" : "light"}
                    accessibilityLabel={t("id2.sheet.name")}
                    accessibilityHint={errorKey ? errorText : copy.nameNote}
                    style={{ fontSize: 17, color: tk.ink, paddingVertical: 14 }}
                  />
                </View>
                {errorKey ? (
                  <Text style={{ fontSize: 13, lineHeight: 18, color: err, paddingHorizontal: 4 }}>
                    {errorText}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 13, lineHeight: 18, color: tk.mute, paddingHorizontal: 4 }}>{copy.nameNote}</Text>
                )}
              </View>

              {/* 4. YOUR SIGNATURE, and Type it instead (VoiceOver's way in) */}
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 12, rowGap: 4 }}>
                  {label(t("id2.sheet.sign"))}
                  <Pressable
                    ref={typeRef}
                    onPress={() => setTyped((v) => !v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityHint={typed ? undefined : t("id2.sheet.typeItHint")}
                    style={({ pressed }) => ({ paddingVertical: 4, opacity: pressed ? 0.5 : 1 })}
                  >
                    <Text maxFontSizeMultiplier={1.8} style={{ fontSize: 14, fontWeight: "600", color: tk.ind }}>
                      {t(typed ? "id2.sheet.drawIt" : "id2.sheet.typeIt")}
                    </Text>
                  </Pressable>
                </View>

                {typed ? (
                  <View
                    accessible
                    accessibilityLabel={check.value || t("id2.sheet.traceEmpty")}
                    style={{ width: padW, height: padH, borderRadius: 12, backgroundColor: well, alignItems: "center", justifyContent: "center", overflow: "hidden" }}
                  >
                    {check.value ? (
                      <PenSignatureView sig={null} name={check.value} width={padW * 0.86} fit="box" baseline />
                    ) : (
                      <Text
                        allowFontScaling={false}
                        style={{ fontStyle: uprightEmpty ? "normal" : "italic", fontSize: padH * 0.36, color: tk.ink, opacity: 0.1 }}
                      >
                        {t("id2.sheet.traceEmpty")}
                      </Text>
                    )}
                  </View>
                ) : (
                  <SignaturePad
                    width={padW}
                    strokes={strokes}
                    onStroke={onStroke}
                    onDrawing={setDrawingNow}
                    full={!padTakesStroke(strokes.length)}
                    guide={check.value}
                    emptyGuide={t("id2.sheet.traceEmpty")}
                    caption={t("id2.sheet.trace")}
                    accessibilityLabel={t("id2.sheet.padA11y")}
                    accessibilityValue={padValue(strokes.length, t)}
                    blocks={scrollRef}
                    surface={well}
                  />
                )}

                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 14, rowGap: 6 }}>
                  <Text style={{ flexGrow: 1, flexShrink: 1, flexBasis: 180, fontSize: 13, lineHeight: 18, color: tk.sub }}>{t("id2.sheet.legal")}</Text>
                  {typed ? null : (
                    <View style={{ flexDirection: "row", gap: 16, marginLeft: "auto" }}>
                      {smallButton(t("id2.sheet.undo"), () => setStrokes((all) => all.slice(0, -1)), !strokes.length)}
                      {smallButton(t("id2.sheet.clear"), () => setStrokes([]), !strokes.length)}
                    </View>
                  )}
                </View>
              </View>

              {/* 5. the guest line: signing never waits on it */}
              {copy.guest ? (
                <View style={{ backgroundColor: well, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 6 }}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tk.sub }}>{copy.guest.text}</Text>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setGuestOpen(true);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ alignSelf: "flex-start", paddingVertical: 2, opacity: pressed ? 0.5 : 1 })}
                  >
                    <Text maxFontSizeMultiplier={1.8} style={{ fontSize: 14, fontWeight: "600", color: tk.ind }}>
                      {copy.guest.link}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {/* 6. SIGN AND SEND, and 7. the foot */}
              <View style={{ gap: 12 }}>
                <Pressable
                  onPress={() => void submit()}
                  disabled={!can}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !can, busy: p.busy }}
                  style={({ pressed }) => ({
                    backgroundColor: tk.ind,
                    borderRadius: 14,
                    paddingVertical: 15,
                    paddingHorizontal: 16,
                    alignItems: "center",
                    opacity: !can && !p.busy ? 0.35 : pressed ? 0.85 : 1,
                  })}
                >
                  <Text maxFontSizeMultiplier={1.6} style={{ fontSize: 16, fontWeight: "600", letterSpacing: 0.4, color: tk.bg, textAlign: "center" }}>
                    {p.busy ? "…" : t("id2.sheet.send")}
                  </Text>
                </Pressable>
                <Text style={{ fontSize: 12.5, lineHeight: 18, color: tk.sub, textAlign: "center", paddingHorizontal: 8 }}>{t("id2.sheet.foot")}</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>

        {/* linking a guest's account, over the sheet in the same window (two windows can't rise together) */}
        <SignUpSheet open={guestOpen} reason={t("id2.sheet.guestReason")} onClose={() => setGuestOpen(false)} onSignedIn={() => setGuestOpen(false)} />
      </GestureHandlerRootView>
    </Modal>
  );
}

/** One face in THE FACE YOU SEND, memoised: a pick (or a letter typed in the pen-name field)
    re-renders the sheet, and only the two faces whose ring changes should follow it — the row
    holds every face in the reader's pool. */
const FaceButton = memo(function FaceButton({
  id,
  on,
  label,
  seed,
  onPick,
}: {
  id: string | null;
  on: boolean;
  label: string;
  seed: string;
  onPick: (id: string | null) => void;
}) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={() => onPick(id)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ alignItems: "center", gap: 4, opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: on ? tk.ind : "transparent", alignItems: "center", justifyContent: "center" }}>
        <AvatarImage id={id} seed={seed} size={52} />
      </View>
      {id === null ? (
        <Text maxFontSizeMultiplier={1.4} style={{ ...PFM.monoMed, fontSize: MONO.small, letterSpacing: MONO.small * 0.1, color: on ? tk.ind : tk.sub }}>
          {t("id2.sheet.faceNone").toLocaleUpperCase()}
        </Text>
      ) : null}
    </Pressable>
  );
});
