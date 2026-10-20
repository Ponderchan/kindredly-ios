import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { THEME_KEYS, type ThemeKey } from "../../theme/themes";
import { PFM } from "../../theme/post";
import { frostSpec } from "../../lib/frost";
import { FACES } from "../../data/aura-avatar-lib";
import { devMemberState, setDevMemberPreview, setDevMyStamp, useMyStamp, stampSpoken } from "../../lib/member-marks";
import { stampGeometry } from "../../lib/stamp-avatar";
import { t } from "../../lib/i18n";
import { AvatarImage } from "../../components/AvatarImage";
import { Frost } from "../../components/Frost";
import { StampAvatar, StampMosaic } from "../../components/StampAvatar";
import { CorrespondentFace } from "../../components/CorrespondentFace";

/* dev only — THE MEMBER STAMP AVATAR (C2, 2026-10-19). kindredly:///dev/fc-stamps

   Made-up stamps so the verifier can see every placement before the owner runs 0037 (nothing
   reaches the server; nothing is saved):
   - OTHERS: on = lib/member-marks' dev fixture (devMemberFixture: a third none, a third 1ST, a
     third a Cofounder number) for every other face in the app, Swift and RN; off = the server.
   - MINE: your own stamp forced to none / 1ST / 007, or AUTO (your entitlement).
   - THEME: the dev theme override (Midnight shows the 15% gold ground).
   - The grid: StampAvatar at 72/56/52/44/40/34/22/18 with a portrait, a frosted window, a
     mosaic and a photo, then the non-member face beside it for the row-never-moves check.
   - Links to the real screens with the fixture on (Kindreds, Me, a chat via Kindreds), and to
     the Kindreds demo page (step5-kindreds: demo rows are stamped by the fixture too).
   The panel's words are English: a dev page. */

const SIZES = [72, 56, 52, 44, 40, 34, 22, 18] as const;
const SEED = "0b7c2a7e-4d1f-4c8e-9a51-6f0e3d2b9c11";
const PORTRAIT = FACES[0]?.id ?? null;
const PHOTO = Image.resolveAssetSource(require("../../../assets/icon.png")).uri;

export default function DevFcStamps() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t: tk, dark } = useTheme();
  const devTheme = useDevThemeOverride();
  const mine = useMyStamp();
  const [, force] = useState(0);
  const state = devMemberState(); // re-read on every render (force / useMyStamp re-render it)
  const [denom, setDenom] = useState<"1ST" | "007">("1ST");
  if (!__DEV__) return <Redirect href="/" />;

  const chip = (label: string, on: boolean, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: on ? tk.ind : tk.line, backgroundColor: on ? tk.lav : tk.sf }}>
      <Text style={{ ...PFM.monoSemi, fontSize: 11, color: on ? tk.ind : tk.ink }}>{label}</Text>
    </Pressable>
  );
  const head = (s: string) => <Text style={{ ...PFM.monoSemi, fontSize: 11, letterSpacing: 1.2, color: tk.mute, marginTop: 18, marginBottom: 8 }}>{s}</Text>;
  const frost = frostSpec(SEED, dark);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tk.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", color: tk.ink }}>Member stamps (C2)</Text>
      <Text style={{ fontSize: 13, color: tk.sub, marginTop: 4 }}>Made-up stamps for the look; nothing reaches the server.</Text>

      {head("OTHERS (FIXTURE)")}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {chip("ON", state.preview, () => {
          setDevMemberPreview(true);
          force((n) => n + 1);
        })}
        {chip("OFF (SERVER)", !state.preview, () => {
          setDevMemberPreview(false);
          force((n) => n + 1);
        })}
      </View>

      {head(`MINE · now "${mine || "none"}"${mine ? " · VoiceOver: " + stampSpoken(mine, t) : ""}`)}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {(
          [
            ["AUTO", null],
            ["NONE", ""],
            ["1ST", "1ST"],
            ["001", "001"],
            ["007", "007"],
          ] as const
        ).map(([label, v]) =>
          chip(label, state.mine === v, () => {
            setDevMyStamp(v);
            force((n) => n + 1);
          }),
        )}
      </View>

      {head("THEME")}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {chip("OFF", devTheme == null, () => setDevThemeOverride(null))}
        {THEME_KEYS.map((k: ThemeKey) => chip(k.toUpperCase(), devTheme === k, () => setDevThemeOverride(k)))}
      </View>

      {head("SAMPLE DENOMINATION")}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {chip("1ST", denom === "1ST", () => setDenom("1ST"))}
        {chip("007", denom === "007", () => setDenom("007"))}
      </View>

      {head("PORTRAIT · FROST · MOSAIC · PHOTO · (NOT A MEMBER)")}
      {SIZES.map((size) => {
        const g = stampGeometry(size);
        return (
          <View key={size} style={{ marginBottom: 14 }}>
            <Text style={{ ...PFM.mono, fontSize: 10, color: tk.mute, marginBottom: 8 }}>
              {size} → inner {g.inner} · edge {g.border} · {g.showDenom ? "denomination" : "small rule, no denomination"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingLeft: 4 }}>
              <StampAvatar size={size} denom={denom}>
                {({ size: s, radius }) => <AvatarImage id={PORTRAIT} seed={SEED} size={s} radius={radius ?? undefined} />}
              </StampAvatar>
              <StampAvatar size={size} denom={denom}>
                {({ size: s }) => (frost ? <Frost spec={frost} size={s} /> : null)}
              </StampAvatar>
              <StampAvatar size={size} denom={denom}>
                {({ size: s }) => <StampMosaic seed={SEED} size={s} base={52} cell={4.5} gap={1.2} />}
              </StampAvatar>
              <StampAvatar size={size} denom={denom}>
                {({ size: s, radius }) => <AvatarImage photoUri={PHOTO} seed={SEED} size={s} radius={radius ?? undefined} />}
              </StampAvatar>
              {/* the same box without a stamp: the row's height and the faces' x never move */}
              <View style={{ borderWidth: 0.5, borderColor: tk.faint }}>
                <AvatarImage id={PORTRAIT} seed={SEED} size={size} />
              </View>
            </View>
          </View>
        );
      })}

      {head("CHAT HEADER FACE (CorrespondentFace lg / md)")}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20, paddingLeft: 4 }}>
        <CorrespondentFace seed={SEED} theirs={5} revealed={false} theirSigned size="lg" denom={denom} />
        <CorrespondentFace seed={SEED} theirs={3} revealed size="lg" otherFace={PORTRAIT} denom={denom} />
        <CorrespondentFace seed={SEED} theirs={5} revealed={false} theirSigned size="lg" />
        <CorrespondentFace seed={SEED} theirs={2} revealed={false} size="md" denom={denom} />
      </View>

      {head("THE REAL SCREENS (turn OTHERS on first)")}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {chip("KINDREDS", false, () => router.push("/(tabs)/kindreds" as Href))}
        {chip("ME", false, () => router.push("/(tabs)/me" as Href))}
        {chip("KINDREDS DEMO", false, () => router.push("/dev/step5-kindreds" as Href))}
        {chip("CHAT DEMO", false, () => router.push("/dev/step5-chat-rn" as Href))}
        {chip("MY KINDREDS", false, () => router.push("/my-kindreds" as Href))}
        {chip("MY LETTERS", false, () => router.push("/my-letters" as Href))}
      </View>
      <Text style={{ fontSize: 12, color: tk.mute, marginTop: 10 }}>Looking only on the real account: never send, report, block or buy.</Text>
    </ScrollView>
  );
}
