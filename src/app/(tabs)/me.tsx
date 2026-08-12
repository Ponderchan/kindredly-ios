import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { C, F, cardStyle, shadow } from "../../theme/tokens";
import { Caps } from "../../components/ui";
import { AvatarImage } from "../../components/AvatarImage";
import { EditProfileSheet } from "../../components/EditProfileSheet";
import { PlushCelebration } from "../../components/PlushCelebration";
import { FingerprintHeat } from "../../components/FingerprintHeat";
import { GrowthStampTile } from "../../components/GrowthStamp";
import { TabIcon } from "../../components/TabIcon";
import { WrenHome } from "../../components/WrenHome";
import { WrenOnYou } from "../../components/WrenOnYou";
import type { WrenAccessory } from "../../components/WrenBird";
import { clearAvatarPhoto, getAvatarPhoto, setAvatarPhoto } from "../../lib/avatar-photo";
import { bumpStageFloor, getStageFloor, getWrenAccessory, setWrenAccessory, stageIndex, wrenStage } from "../../lib/wren-style";
import { getWrenType, type WrenType } from "../../lib/wren-type";
import type { WrenStage } from "../../components/WrenBird";
import { GROWTH_STAMPS, type GrowthStats } from "../../data/growth";
import { EMPTY_STATS, collectGrowthStats } from "../../lib/stats";
import { fingerprint } from "../../lib/signature";
import { portrait } from "../../lib/wren";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";

/* Me — a straightforward profile: avatar from our library + pen name,
   three stat cards, the growth-stamp shelf, then Kindredly's signature
   cards (Wren on you, writing fingerprint). Settings behind the gear. */

export default function MeTab() {
  const auth = useAuth();
  const { user, handle, profile } = auth;
  const { premium } = useEntitlement();
  const router = useRouter();
  const name = handle || "You";

  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [wrenLine, setWrenLine] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [accessory, setAccessory] = useState<WrenAccessory>("none");
  const [stageFloor, setStageFloor] = useState<WrenStage>("egg");
  const [wrenType, setWrenType] = useState<WrenType | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([collectGrowthStats(user?.created_at), getStageFloor()]).then(([s, floor]) => {
        if (!alive) return;
        setStats(s);
        const live = wrenStage(s);
        // stage only ever moves forward; remember the highest ever reached
        setStageFloor(stageIndex(live) >= stageIndex(floor) ? live : floor);
        if (stageIndex(live) > stageIndex(floor)) void bumpStageFloor(live);
      });
      getAvatarPhoto().then((p) => alive && setPhoto(p));
      getWrenAccessory().then((a) => alive && setAccessory(a));
      getWrenType().then((t) => alive && setWrenType(t));
      return () => {
        alive = false;
      };
    }, [user?.created_at]),
  );

  const equipWren = (a: WrenAccessory) => {
    setAccessory(a);
    void setWrenAccessory(a);
  };

  const avatarId = (profile?.avatarId as string) || null;
  const seed = user?.id || "you";

  const saveProfileEdits = async (newName: string, newAvatarId: string | null, newPhotoUri: string | null) => {
    setEditing(false);
    if (newPhotoUri) {
      if (newPhotoUri !== photo) {
        const persisted = await setAvatarPhoto(newPhotoUri);
        setPhoto(persisted);
      }
    } else {
      await clearAvatarPhoto();
      setPhoto(null);
    }
    await auth.saveProfile({ handle: newName, avatarId: newAvatarId });
  };

  /* the hand Wren reads */
  const written = (profile?.firstLine as string) || "";
  const hasText = written.trim().length > 0;
  const fp = fingerprint(written || "Slept badly. Made coffee. Sat with it until it went cold.");
  const bars = (fp.units.length ? fp.units : [0.4, 0.7, 0.3]).slice(0, 40);
  const long = fp.sig.sentenceLen > 13;
  const paused = fp.sig.pauses > 3;
  const fpRead = hasText
    ? `${long ? "Measured pace" : "Quick pace"} · ${long ? "long sentences" : "short sentences"} · ${paused ? "thoughtful pauses" : "few pauses"}`
    : "Wren hasn't read you yet";
  const fpDesc = hasText
    ? long
      ? "Closest to writers who take their time and let a thought run before stopping."
      : "Closest to writers who keep it short and write one thought at a time."
    : "Write a letter or two and Wren will start to read your hand.";

  const letWrenRead = async () => {
    if (!hasText) return;
    const l = await portrait(written, "en");
    if (l) setWrenLine(l);
  };
  useFocusEffect(
    useCallback(() => {
      if (hasText) letWrenRead();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [written]),
  );

  // time-of-day heatmap cells — deterministic per user from the writing
  // fingerprint (stable, personal-looking) until real write-times are logged
  const heatCells = (() => {
    const base = fp.units.length ? fp.units : [0.4, 0.7, 0.3, 0.6, 0.5];
    const out: number[] = [];
    for (let i = 0; i < 40; i++) {
      const s = `${seed}-${i}`;
      let h = 0;
      for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0;
      const v = base[i % base.length] * 0.55 + ((h % 100) / 100) * 0.55 - 0.12;
      out.push(Math.max(0, Math.min(1, v)));
    }
    return out;
  })();
  const chips = [long ? "measured pace" : "quick pace", long ? "long sentences" : "short sentences", paused ? "thoughtful pauses" : "few pauses"];
  const heatRead = hasText
    ? `${long ? "you let a thought run" : "one thought at a time"}. ${paused ? "you pause to be sure" : "sure of your line"}.`
    : "write a few letters and your rhythm shows up here.";

  const StatCard = ({ n, label, on }: { n: number; label: string; on?: boolean }) => (
    <View
      style={[
        cardStyle,
        { flex: 1, alignItems: "center", paddingVertical: 22, backgroundColor: on ? C.purpleLt : C.card, borderWidth: on ? 1.5 : 0, borderColor: C.purple },
      ]}
    >
      <Text style={{ fontFamily: F.serif, fontSize: 30, color: C.ink }}>{n}</Text>
      <Text style={{ fontFamily: F.sansBold, fontSize: 9.5, letterSpacing: 1.2, color: on ? C.purple : C.faint, marginTop: 6 }}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* header — avatar left, name + day/kindreds, gear right */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable onPress={() => setEditing(true)} hitSlop={6}>
            <View style={[{ borderRadius: 34, backgroundColor: C.card, padding: 4 }, shadow.card]}>
              <AvatarImage id={avatarId} photoUri={photo} seed={seed} size={60} round />
            </View>
          </Pressable>
          <Pressable onPress={() => setEditing(true)} style={{ flex: 1 }} hitSlop={6}>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 30, color: C.ink }}>{name}</Text>
            <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1.2, color: C.muted, marginTop: 3 }}>
              DAY {stats.day} · {stats.kindreds} {stats.kindreds === 1 ? "KINDRED" : "KINDREDS"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={8}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: "center", justifyContent: "center", ...shadow.card }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                fill="none"
                stroke={C.muted}
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>

        {/* writing fingerprint — the heatmap (hero) */}
        <View style={{ marginTop: 20 }}>
          <FingerprintHeat cells={heatCells} chips={chips} read={heatRead} />
        </View>

        {/* stat cards */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <StatCard n={stats.lettersSent} label="LETTERS" />
          <StatCard n={stats.journalN} label="SEALED" on />
          <StatCard n={stats.kindreds} label="KINDREDS" />
        </View>

        {/* Wren — companion card */}
        <View style={{ marginTop: 16 }}>
          <WrenHome
            stats={stats}
            accessory={accessory}
            premium={premium}
            stageFloor={stageFloor}
            typeName={wrenType?.name}
            bornWith={wrenType?.accessory}
            onEquip={equipWren}
            onLocked={() => router.push("/paywall")}
          />
        </View>

        {/* ✦ Wren on you */}
        <View style={{ marginTop: 16 }}>
          <WrenOnYou line={wrenLine} hasText={hasText} onReadAgain={letWrenRead} />
        </View>

        {/* Kindredly+ */}
        <Pressable
          onPress={() => router.push("/paywall")}
          style={({ pressed }) => [
            cardStyle,
            { marginTop: 16, padding: 18, backgroundColor: premium ? "#FBE7EE" : C.goldLt, flexDirection: "row", alignItems: "center", gap: 14, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={{ fontSize: 22 }}>👑</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 15.5, color: C.ink }}>
              {premium ? "Kindredly+ · active" : "Kindredly+"}
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.muted, marginTop: 2 }}>
              {premium ? "Manage your subscription" : "Unlimited letters & a closer read from Wren"}
            </Text>
          </View>
          <Text style={{ fontSize: 16, color: C.faint }}>›</Text>
        </Pressable>
      </ScrollView>

      <EditProfileSheet
        visible={editing}
        initialName={handle}
        initialAvatarId={avatarId}
        initialPhotoUri={photo}
        seed={seed}
        onSave={saveProfileEdits}
        onClose={() => setEditing(false)}
      />
      <PlushCelebration kindreds={stats.kindreds} />
    </SafeAreaView>
  );
}
