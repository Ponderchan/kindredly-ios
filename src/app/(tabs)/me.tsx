import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { C, F, cardStyle, shadow } from "../../theme/tokens";
import { AvatarImage } from "../../components/AvatarImage";
import { EditProfileSheet } from "../../components/EditProfileSheet";
import { PlushCelebration } from "../../components/PlushCelebration";
import { VoiceCard } from "../../components/VoiceCard";
import { WrenHome } from "../../components/WrenHome";
import type { WrenAccessory } from "../../components/WrenBird";
import { clearAvatarPhoto, getAvatarPhoto, setAvatarPhoto } from "../../lib/avatar-photo";
import { bumpStageFloor, getStageFloor, getWrenAccessory, setWrenAccessory, stageIndex, wrenStage } from "../../lib/wren-style";
import { getWrenType, type WrenType } from "../../lib/wren-type";
import type { WrenStage } from "../../components/WrenBird";
import type { GrowthStats } from "../../data/growth";
import { EMPTY_STATS, collectGrowthStats } from "../../lib/stats";
import { fingerprint } from "../../lib/signature";
import { analyzeVoice, auraName, gatherWriting, type VoiceRead } from "../../lib/voice";
import { journalHourBand } from "../../lib/report";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { DEMO_JOURNAL } from "../../data/demo";

/* Me — a mirror, not a profile: who you are here (pen name + day), how you
   sound (Your Voice — the hero), what you've kept (stats), and who's growing
   beside you (Wren). Settings behind the gear. */

export default function MeTab() {
  const auth = useAuth();
  const { user, handle, profile } = auth;
  const { premium } = useEntitlement();
  const router = useRouter();
  const name = handle || "You";

  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [room, setRoom] = useState<"you" | "wren">("you");
  const [voice, setVoice] = useState<VoiceRead | null>(null);
  const [units, setUnits] = useState<number[]>([]);
  const [hourBand, setHourBand] = useState<string | null>(null);
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

      // Your Voice — read every piece of real writing on this device
      (async () => {
        let texts = await gatherWriting((profile?.firstLine as string) || null);
        // dev preview: borrow the sample pages so the card has a shape
        if (__DEV__ && texts.length === 0) texts = DEMO_JOURNAL.map((e) => e.body).filter((b) => b.trim().length >= 3);
        if (!alive) return;
        setVoice(analyzeVoice(texts));
        setUnits(fingerprint(texts.join(" ")).units.slice(0, 24));
        journalHourBand().then((h) => alive && setHourBand(h));
      })();

      return () => {
        alive = false;
      };
    }, [user?.created_at, profile?.firstLine]),
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
            {/* the numbers live here now — one quiet line, not three cards */}
            <Text style={{ fontFamily: F.sansBold, fontSize: 10, letterSpacing: 1, color: C.muted, marginTop: 3 }}>
              DAY {stats.day} · {stats.lettersSent} LETTERS · {stats.journalN} SEALED · {stats.kindreds}{" "}
              {stats.kindreds === 1 ? "KINDRED" : "KINDREDS"}
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

        {/* two rooms: You (your voice) · Wren (your companion) */}
        <View style={{ flexDirection: "row", backgroundColor: "#E9E8F0", borderRadius: 22, padding: 3, marginTop: 16 }}>
          {(
            [
              ["you", "You"],
              ["wren", "Wren"],
            ] as const
          ).map(([id, label]) => {
            const on = room === id;
            return (
              <Pressable
                key={id}
                onPress={() => setRoom(id)}
                style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 19, backgroundColor: on ? "#fff" : "transparent", ...(on ? shadow.card : null) }}
              >
                <Text style={{ fontFamily: F.sansBold, fontSize: 13.5, color: on ? C.ink : C.muted }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {room === "you" ? (
          <>
            {/* the aura — the hero */}
            {voice && (
              <View style={{ marginTop: 14 }}>
                <VoiceCard
                  read={voice}
                  quote={voice.discovery}
                  units={units}
                  auraName={auraName(voice, wrenType?.name ?? null, hourBand)}
                  lettersSent={stats.lettersSent}
                  onOpen={() => router.push("/voice")}
                  onShare={() => router.push("/aura-card")}
                />
              </View>
            )}

            {/* one quiet row — Kindredly+ */}
            <Pressable onPress={() => router.push("/paywall")} style={[cardStyle, { marginTop: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }]}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 14.5, color: C.ink }}>Kindredly+</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontFamily: F.sansExtra, fontSize: 11.5, letterSpacing: 1, color: C.purple }}>
                {premium ? "ACTIVE" : "UNLIMITED"} ›
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={{ marginTop: 14 }}>
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
            <Pressable onPress={() => router.push("/paywall")} style={[cardStyle, { marginTop: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }]}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 14.5, color: C.ink }}>Kindredly+</Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontFamily: F.sansExtra, fontSize: 11.5, letterSpacing: 1, color: C.purple }}>
                {premium ? "ACTIVE" : "UNLIMITED"} ›
              </Text>
            </Pressable>
          </>
        )}
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
