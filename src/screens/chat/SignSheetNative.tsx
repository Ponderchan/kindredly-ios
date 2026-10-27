import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Modal, Platform, Pressable, View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, SlideInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KSignSheetView, useKCommands, type KScreenHandle, type KSignSheetCommands, type KSignSheetFace, type KSignSheetStrings } from "../../../modules/kindredly-ui";
import { SurfaceHost } from "../../components/NativeSurface";
import { OverlaySurface } from "../../components/OverlayNativeSurface";
import { SignUpSheet } from "../../components/SignUpSheet";
import { getLang, t, useLang } from "../../lib/i18n";
import { scrimColor, useTheme } from "../../lib/theme";
import { BRAND } from "../../theme/themes";
import { screenNow } from "../../lib/wren";
import { strangerName } from "../../lib/stranger-name";
import { readYourPronoun } from "../../lib/pronouns";
import { getAvatarPhoto } from "../../lib/avatar-photo";
import { dismissKeyboard } from "../../lib/keyboard";
import { faceRecord, useFaceSources, type FaceInput } from "../../lib/faces";
import { penTypedUpright, type PadPoint } from "../../lib/pen-signature";
import { FACES } from "../../data/aura-avatar-lib";
import { dangerInk } from "../settings/settings-model";
import { PEN_NAME_MAX, resolvePronoun, type PronounId } from "../edit-profile/edit-profile-model";
import {
  canSign,
  checkPenName,
  defaultFace,
  drawingOf,
  faceA11y,
  faceChoices,
  nameErrorKey,
  padInkPath,
  padPointsOf,
  padSizeOf,
  padTakesStroke,
  padValue,
  sheetCopy,
  sigToSend,
} from "./sign-sheet";
import type { SignSheetViewProps } from "./SignSheet";
import "../../data/strings-identity2";
import "../../data/strings-a11y-chat"; // ch.a11y.nameLong

/* THE SIGNING SHEET IN SWIFTUI (2026-10-27, the "signsheet" switch, off until its simulator pass).
   ────────────────────────────────────────────────────────────────────────
   SignSheetView (screens/chat/SignSheet) picks this where it can. It is the React Native sheet's
   twin: the same window-level transparent Modal, the same dim fading in over 160 ms, the same
   sheet rising over 280 ms (fading in over 180 under Reduce Motion), 92% of the screen tall, sf
   with top corners 20 and the ln rule, and the same sign-in sheet over it for a guest (SignUpSheet,
   in the same window). Only the sheet's inside is SwiftUI's (modules/kindredly-ui KSignSheetView,
   ios/Portable/Chat/KSignSheet.swift): the title and ✕, the lead, the faces, the pen-name field,
   the pad or the typed preview, the guest line, SIGN AND SEND and the foot.

   Everything it decides stays here, as in SignSheetViewRN, on sign-sheet.ts's rules: what the
   reader has done on the sheet (the name, the face, typed or drawn, the strokes — kept while the
   chat is open, so a sheet closed with ✕ and opened again finds them still there), what the phone
   knows (the photo worn, this phone's pronoun), the name's check and its red line (announced to
   VoiceOver from here, as React Native does), the faces offered (drawn through lib/faces, as
   AvatarImage draws them), the drawing that counts, and the send (onSubmit).

   THE PAD. SwiftUI takes the finger and draws the live stroke (smoothed as penStrokePath smooths
   it); each finished stroke comes here as its points and joins `strokes` while the pad takes
   them (padTakesStroke), and goes back as one path (padInkPath) with the count. The published
   drawing is penFromPad on these same strokes, at the pad's size from padSizeOf — the same as
   React Native's.

   THE FIELD is uncontrolled (KField's contract): seeded with setText (target "name") when the
   sheet opens, when the profile's pen name arrives while nothing is typed, and on every new
   view; it reports each edit through onName and is never written back as a prop. */

export function SignSheetSwift(p: SignSheetViewProps & { onFallback: () => void }) {
  useLang();
  const lang = getLang();
  const { key: themeKey, letterFont, t: tk, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const reduce = useReducedMotion();
  const pad = padSizeOf(win.width);

  /* ── what the reader has done on the sheet (kept while the chat is open) ── */
  const [name, setName] = useState(p.handle);
  // the words in the field right now, for a view that attaches (the field is Swift's)
  const nameNow = useRef(p.handle);
  const touched = useRef(false);
  const [face, setFace] = useState<string | null | undefined>(undefined); // undefined = the default
  const [typed, setTyped] = useState(false);
  const [strokes, setStrokes] = useState<PadPoint[][]>([]);
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

  /* the Swift view: its field is seeded from here */
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands<KSignSheetCommands>(ref, {
    blurOnUnmount: true,
    // a sheet opened again (a new view) starts from the words kept here
    onViewAttach: () => commands.send("setText", { target: "name", value: nameNow.current }),
  });

  /* the profile's pen name, until something is typed: on every open (a pen name saved meanwhile,
     a later trade), and when the account's copy arrives after the sheet */
  useEffect(() => {
    if (!p.open || touched.current) return;
    setName(p.handle);
    nameNow.current = p.handle;
    commands.send("setText", { target: "name", value: p.handle });
  }, [p.open, p.handle, commands]);

  const onName = useCallback((v: string) => {
    touched.current = true;
    nameNow.current = v;
    setName(v);
  }, []);

  /* ── the facts and words ── */
  const myCourier = useMemo(() => (p.myUid ? strangerName(p.myUid, { lang: getLang(), unsigned: "" }) : ""), [p.myUid]);
  const check = checkPenName(name, myCourier, screenNow);
  /* no limit on the field (iOS would cut a composition); past the limit the red line says so and
     SIGN AND SEND stays off; nothing is cut */
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

  /* the faces as AvatarImage draws them (a portrait, a made face, the glyph for No face) */
  const seed = p.myUid || "me";
  const faceInputs = useMemo(() => Object.fromEntries(faces.map((id, i) => [String(i), { role: "kindred", seed, avatarId: id } satisfies FaceInput])), [faces, seed]);
  const sources = useFaceSources(faceInputs);
  const faceRows = useMemo<KSignSheetFace[]>(
    () =>
      faces.map((id, i) => {
        const r = faceRecord(sources[String(i)] ?? { kind: "placeholder" });
        return { kind: r.kind, uri: r.uri, key: r.key, overscan: r.overscan, mask: r.mask, label: faceA11y(id, i + 1, libraryCount, t), none: id === null };
      }),
    // the labels follow the language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [faces, sources, libraryCount, lang],
  );

  const drawing = useMemo(() => drawingOf(strokes, pad), [strokes, pad.width, pad.height]); // eslint-disable-line react-hooks/exhaustive-deps
  const ink = useMemo(() => padInkPath(strokes), [strokes]);
  const can = !tooLong && canSign({ name: check, typed, drawing, busy: p.busy });

  const reset = () => {
    touched.current = false;
    setFace(undefined);
    setTyped(false);
    setStrokes([]);
  };

  const submit = async () => {
    if (!can) return;
    dismissKeyboard();
    const out = await p.onSubmit({ name: check.value, face: chosen, sig: sigToSend(typed, drawing) });
    if (out === "signed") reset();
  };

  const onStroke = useCallback((points: number[]) => {
    const s = padPointsOf(points);
    if (!s.length) return;
    setStrokes((all) => (padTakesStroke(all.length) ? [...all, s] : all));
  }, []);

  /* the words, every one of them t()'s */
  const traceEmpty = t("id2.sheet.traceEmpty");
  const guide = check.value.trim() || traceEmpty;
  const strings = useMemo<KSignSheetStrings>(
    () => ({
      title: t("id2.sheet.title"),
      closeLabel: t("id2.sheet.close"),
      lead: copy.lead,
      faceLabel: t("id2.sheet.face"),
      faceNote: copy.faceNote,
      faceNone: t("id2.sheet.faceNone").toLocaleUpperCase(),
      nameLabel: t("id2.sheet.name"),
      namePlaceholder: copy.firstTrade ? t("id2.sheet.namePh") : "",
      nameNote: copy.nameNote,
      nameError: errorText,
      clearLabel: t("id2.sheet.clear"),
      signLabel: t("id2.sheet.sign"),
      typeToggle: t(typed ? "id2.sheet.drawIt" : "id2.sheet.typeIt"),
      typeHint: typed ? "" : t("id2.sheet.typeItHint"),
      legal: t("id2.sheet.legal"),
      undo: t("id2.sheet.undo"),
      clear: t("id2.sheet.clear"),
      guestText: copy.guest?.text ?? "",
      guestLink: copy.guest?.link ?? "",
      send: p.busy ? "…" : t("id2.sheet.send"),
      foot: t("id2.sheet.foot"),
      typedEmpty: traceEmpty,
      caption: t("id2.sheet.trace"),
      padLabel: t("id2.sheet.padA11y"),
      padValue: padValue(strokes.length, t) ?? "",
    }),
    // the words follow the language and the facts they're made of
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, copy.lead, copy.faceNote, copy.firstTrade, copy.nameNote, copy.guest?.text, copy.guest?.link, errorText, typed, p.busy, strokes.length, traceEmpty],
  );
  const viewInsets = useMemo(() => ({ top: 0, bottom: insets.bottom, tabBarRoom: 0 }), [insets.bottom]);

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
            <OverlaySurface
              surface="signsheet"
              view="KSignSheetView"
              onFallback={p.onFallback}
              native={() => (
                <SurfaceHost field>
                  <KSignSheetView
                    ref={commands.ref}
                    theme={themeKey}
                    letterFont={letterFont}
                    insets={viewInsets}
                    strings={strings}
                    // the field's red line: Edit profile's (the postal red toward the ink)
                    errorInk={dangerInk(tk.ink, BRAND.postRed)}
                    faces={faceRows}
                    chosen={faces.indexOf(chosen)}
                    typed={typed}
                    typedName={check.value}
                    typedUpright={penTypedUpright(check.value)}
                    typedEmptyUpright={penTypedUpright(traceEmpty)}
                    guide={guide}
                    guideUpright={penTypedUpright(guide)}
                    padWidth={pad.width}
                    padHeight={pad.height}
                    ink={ink}
                    strokeCount={strokes.length}
                    full={!padTakesStroke(strokes.length)}
                    canSend={can}
                    busy={p.busy}
                    onClose={p.onClose}
                    onName={onName}
                    onFace={(i) => {
                      if (i >= 0 && i < faces.length) setFace(faces[i]);
                    }}
                    onTypeToggle={() => setTyped((v) => !v)}
                    onStroke={onStroke}
                    onUndo={() => setStrokes((all) => all.slice(0, -1))}
                    onClear={() => setStrokes([])}
                    onGuest={() => {
                      dismissKeyboard();
                      setGuestOpen(true);
                    }}
                    onSend={() => void submit()}
                  />
                </SurfaceHost>
              )}
            />
          </Animated.View>
        </View>

        {/* linking a guest's account, over the sheet in the same window (two windows can't rise together) */}
        <SignUpSheet open={guestOpen} reason={t("id2.sheet.guestReason")} onClose={() => setGuestOpen(false)} onSignedIn={() => setGuestOpen(false)} />
      </GestureHandlerRootView>
    </Modal>
  );
}
