import { useRef } from "react";
import { ActionSheetIOS, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { MONO, PF, letterFamily } from "../../theme/post";
import { useTheme } from "../../lib/theme";
import { t } from "../../lib/i18n";
import { AvatarImage } from "../../components/AvatarImage";
import { useTabBarSpace } from "../../components/NativeTabBar";
import { BottomFade, SecondaryHeader } from "../../components/10a";
import { BOTTOM_FADE } from "../../components/10a/kit";
import { SoftPlainRowRN, SoftSection } from "../settings/SoftRN";
import type { EditProfileModel } from "./useEditProfileModel";

/* EDIT PROFILE IN REACT NATIVE — the remote switch's fallback (10a step 5),
   and since the sheet retired, the only other way the page is drawn. The
   same page the Swift one draws, from the same view (edit-profile-model)
   and the same actions (useEditProfileModel), on the theme: the sticky
   header, the avatar block with the camera button (its menu: the system's
   action sheet, Choose a photo / Random face), the one-time note, the face
   strip, YOU (pen name, pronouns as an action sheet, the birthday shown
   only), ep.privateNote, YOUR COURIER (her name). Clears the floating tab
   bar, under the bottom fade. */

/* the hints are Newsreader italic whatever the Letter font (they are not letters) */
const HINT = letterFamily("newsreader", true);

export function EditProfileRN({ model }: { model: EditProfileModel }) {
  const { t: tk } = useTheme();
  const safe = useSafeAreaInsets();
  const tabBar = useTabBarSpace();
  const { view, act, avatar } = model;
  const scroll = useRef<ScrollView>(null);
  const facesY = useRef(0);

  const cameraMenu = () =>
    ActionSheetIOS.showActionSheetWithOptions({ options: [view.photoLabel, view.randomLabel, t("set.neverMind")], cancelButtonIndex: 2 }, (i) => {
      if (i === 0) act.photo();
      else if (i === 1) act.random();
    });

  const pronounMenu = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      { title: view.pronoun.label, options: [...view.pronoun.options.map((o) => (o.id === view.pronoun.selected ? `✓ ${o.label}` : o.label)), t("set.neverMind")], cancelButtonIndex: view.pronoun.options.length },
      (i) => {
        const o = view.pronoun.options[i];
        if (o) act.pronoun(o.id);
      },
    );

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: safe.top }}>
      <SecondaryHeader title={view.title.toLocaleUpperCase()} backLabel={view.backLabel} onBack={act.back} />
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: Math.max(tabBar + 12, BOTTOM_FADE.height - 6), gap: 12 }} showsVerticalScrollIndicator={false}>
        {/* the avatar block (H:91) */}
        <View style={{ backgroundColor: tk.soft, borderRadius: 20, paddingTop: 30, paddingHorizontal: 16, paddingBottom: 24, alignItems: "center", gap: 14 }}>
          <View style={{ width: 112, height: 112 }}>
            <View accessible={false} style={{ width: 112, height: 112, borderRadius: 56, overflow: "hidden", backgroundColor: tk.lav }}>
              <AvatarImage id={avatar.id} photoUri={avatar.photo} seed={avatar.seed} size={112} />
            </View>
            <Pressable
              onPress={cameraMenu}
              accessibilityRole="button"
              accessibilityLabel={view.cameraLabel}
              hitSlop={4}
              style={({ pressed }) => ({ position: "absolute", right: -2, bottom: 2, width: 36, height: 36, borderRadius: 18, backgroundColor: tk.ink, borderWidth: 3, borderColor: tk.soft, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.94 : 1 }] })}
            >
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={tk.bg} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Rect x={3} y={5} width={18} height={14} rx={3} />
                <Circle cx={9} cy={10} r={2} />
                <Path d="M21 15l-5-4-9 8" />
              </Svg>
            </Pressable>
          </View>
          <Text style={[{ fontSize: 13, lineHeight: 18, color: tk.mute, textAlign: "center" }, HINT]}>{view.avatarHint}</Text>
        </View>

        {/* the one-time note for a legacy portrait */}
        {view.note && (
          <View style={{ backgroundColor: tk.lav2, borderRadius: 16, padding: 14, gap: 12 }}>
            <View style={{ gap: 4 }}>
              <Text accessibilityRole="header" style={{ fontSize: 15, fontWeight: "600", color: tk.ink }}>
                {view.note.title}
              </Text>
              <Text style={{ fontSize: 13, lineHeight: 19, color: tk.sub }}>{view.note.body}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable
                onPress={() => {
                  scroll.current?.scrollTo({ y: facesY.current, animated: true });
                  act.noteSee();
                }}
                accessibilityRole="button"
                style={({ pressed }) => ({ flex: 1, backgroundColor: tk.ink, borderRadius: 14, paddingVertical: 12, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: tk.bg }}>{view.note.see}</Text>
              </Pressable>
              <Pressable onPress={act.noteKeep} accessibilityRole="button" hitSlop={8} style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 8, opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: tk.ind }}>{view.note.keep}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* the face strip */}
        <View onLayout={(e) => (facesY.current = e.nativeEvent.layout.y)} style={{ gap: 10, paddingTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text accessibilityRole="header" style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: MONO.label, letterSpacing: MONO.label * 0.14, color: tk.mute, paddingHorizontal: 10 }}>
              {view.facesHeader}
            </Text>
            <Pressable onPress={act.random} accessibilityRole="button" style={({ pressed }) => ({ backgroundColor: tk.sf, borderWidth: 2, borderColor: tk.ln, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12, opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: tk.ink }}>{view.randomLabel}</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 5 }}>
            {view.faces.map((f) => {
              const on = f.id === view.selectedFace;
              return (
                <Pressable key={f.id} onPress={() => act.face(f.id)} accessibilityRole="button" accessibilityLabel={f.a11y} accessibilityState={{ selected: on }}>
                  <View style={{ borderRadius: 33, borderWidth: 3, borderColor: on ? tk.lav : "transparent", margin: -3 }}>
                    <View style={{ borderRadius: 29, borderWidth: 2, borderColor: on ? tk.ind : tk.line, overflow: "hidden" }}>
                      <AvatarImage id={f.id} seed={avatar.seed} size={54} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* YOU */}
        <SoftSection header={view.youHeader}>
          <SoftPlainRowRN label={view.pen.label} value={view.pen.value} onPress={act.pen} />
          <SoftPlainRowRN label={view.pronoun.label} value={view.pronoun.value} onPress={pronounMenu} />
          <SoftPlainRowRN label={view.birthday.label} value={view.birthday.value} chevron={false} last />
        </SoftSection>
        <Text style={[{ fontSize: 13, lineHeight: 19.5, color: tk.mute, textAlign: "center", paddingHorizontal: 20, marginTop: -2 }, HINT]}>{view.footer}</Text>

        {/* YOUR COURIER */}
        <SoftSection header={view.courierHeader}>
          <SoftPlainRowRN label={view.courier.label} value={view.courier.value} onPress={act.courierName} last />
        </SoftSection>
      </ScrollView>
      <BottomFade />
    </View>
  );
}
