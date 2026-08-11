import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { C, F, cardStyle, shadow } from "../../theme/tokens";
import { Caps } from "../../components/ui";
import { AvatarImage } from "../../components/AvatarImage";
import { EditProfileSheet } from "../../components/EditProfileSheet";
import { Fingerprint } from "../../components/Fingerprint";
import { GrowthStampTile } from "../../components/GrowthStamp";
import { TabIcon } from "../../components/TabIcon";
import { WrenHome } from "../../components/WrenHome";
import { WrenOnYou } from "../../components/WrenOnYou";
import type { WrenAccessory } from "../../components/WrenBird";
import { clearAvatarPhoto, getAvatarPhoto, setAvatarPhoto } from "../../lib/avatar-photo";
import { getWrenAccessory, setWrenAccessory } from "../../lib/wren-style";
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

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      collectGrowthStats(user?.created_at).then((s) => alive && setStats(s));
      getAvatarPhoto().then((p) => alive && setPhoto(p));
      getWrenAccessory().then((a) => alive && setAccessory(a));
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

  const earned = GROWTH_STAMPS.filter((s) => s.earned(stats));
  const shelf = [...earned, ...GROWTH_STAMPS.filter((s) => !s.earned(stats))].slice(0, 5);

  const StatCard = ({ icon, tint, n, label }: { icon: React.ReactNode; tint: string; n: number; label: string }) => (
    <View style={[cardStyle, { flex: 1, alignItems: "center", paddingVertical: 20 }]}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
        {icon}
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 26, color: C.ink, marginTop: 10 }}>{n}</Text>
      <Text style={{ fontFamily: F.sansBold, fontSize: 9.5, letterSpacing: 1.2, color: C.faint, marginTop: 4 }}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 6, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* top bar — settings gear */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
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

        {/* avatar + name */}
        <View style={{ alignItems: "center", marginTop: 2 }}>
          <View>
            <View style={[{ borderRadius: 60, backgroundColor: C.card, padding: 6 }, shadow.card]}>
              <AvatarImage id={avatarId} photoUri={photo} seed={seed} size={96} round />
            </View>
            <Pressable
              onPress={() => setEditing(true)}
              hitSlop={8}
              style={[{ position: "absolute", right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: C.purple, alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: C.cream }, shadow.card]}
            >
              <Text style={{ fontSize: 13, color: "#fff" }}>✎</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setEditing(true)} hitSlop={6}>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 27, color: C.ink, marginTop: 14 }}>{name}</Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
            <Text style={{ fontSize: 12 }}>✉️</Text>
            <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, letterSpacing: 1.2, color: C.muted }}>
              DAY {stats.day} · CARRYING LETTERS
            </Text>
          </View>
        </View>

        {/* Wren's home — companion, growth, dress-up */}
        <View style={{ marginTop: 22 }}>
          <WrenHome
            stats={stats}
            accessory={accessory}
            premium={premium}
            onEquip={equipWren}
            onLocked={() => router.push("/paywall")}
          />
        </View>

        {/* stat cards */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
          <StatCard icon={<TabIcon id="letters" color={C.purple} />} tint={C.purpleLt} n={stats.lettersSent} label="LETTERS" />
          <StatCard icon={<TabIcon id="journal" color={C.gold} />} tint={C.goldLt} n={stats.journalN} label="PAGES" />
          <StatCard icon={<TabIcon id="kindreds" color="#C86E7A" />} tint="#FBEEF1" n={stats.kindreds} label="KINDREDS" />
        </View>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.muted, textAlign: "center", marginTop: 12 }}>
          {stats.reached > 0
            ? `Your words have reached ${stats.reached} ${stats.reached === 1 ? "stranger's day" : "strangers' days"}.`
            : "Your words are still on their way to someone's day."}
        </Text>

        {/* growth stamps shelf */}
        <Pressable onPress={() => router.push("/stamps")} style={{ marginTop: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Text style={{ fontSize: 13 }}>🏅</Text>
              <Caps>STAMPS</Caps>
            </View>
            <Text style={{ fontFamily: F.sansBold, fontSize: 12, color: C.faint }}>
              {earned.length}/{GROWTH_STAMPS.length} ›
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {shelf.map((s) => (
              <GrowthStampTile key={s.id} stamp={s} earned={s.earned(stats)} size={62} />
            ))}
          </View>
        </Pressable>

        {/* ✦ Wren on you */}
        <View style={{ marginTop: 22 }}>
          <WrenOnYou line={wrenLine} hasText={hasText} onReadAgain={letWrenRead} />
        </View>

        {/* writing fingerprint */}
        <View style={{ marginTop: 12 }}>
          <Fingerprint bars={bars} hasText={hasText} read={fpRead} desc={fpDesc} />
        </View>

        {/* Kindredly+ */}
        {!premium && (
          <Pressable
            onPress={() => router.push("/paywall")}
            style={({ pressed }) => [cardStyle, { marginTop: 12, padding: 18, backgroundColor: C.goldLt, flexDirection: "row", alignItems: "center", gap: 14, opacity: pressed ? 0.9 : 1 }]}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(176,138,62,0.15)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 20 }}>👑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 15.5, color: C.ink }}>Kindredly+</Text>
              <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                Unlimited letters & a closer read from Wren
              </Text>
            </View>
          </Pressable>
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
    </SafeAreaView>
  );
}
