import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { MOOD_GROUPS, MOOD_GROUP_FACES, MOOD_GROUP_IDS, MOOD_GROUP_KEY, MOOD_IDS, moodGroup, moodName, type FaceId, type MoodGroup, type MoodId } from "../data/moods";
import { PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { t, useLang } from "../lib/i18n";
import { localeTag } from "../lib/format";
import { MoodFace, moodColors } from "../screens/notes/notes-glyphs";
import "../data/strings-step5-notes";

/* THE MOOD TRAY (owner, 2026-09-20) — the sealed page's answer to the
   letter's stamp tray. The round key on the bar shows a blank face until
   a mood is picked, then that mood's face; tapping it opens this under
   the bar, where the keyboard was. Same height and ground as the stamp
   tray so the two composers feel like one hand made them.

   10a step 5: FOUR COLOUR BLOCKS (owner, 2026-10-15: four groups, the
   thirty faces as the choices inside them). A row of Calm, Happy, Tired
   and Low, each the group's 10a colour with its group face over its name;
   below, the open group's faces.
   - Tapping a block stores THE GROUP ITSELF at once (group-calm …, owner
     2026-10-16 — no default face any more) and opens its faces, so a
     writer who only means "blue" is done in one tap;
   - tapping the open block again closes the tray;
   - tapping a face stores it and closes the tray;
   - tapping the chosen face again takes it back to the group alone (the
     tray stays open, the block still chosen);
   - reopening shows the stored mood's group open.
   Before any group is chosen the hint (sc.moodHint) sits under the blocks.
   The faces are the thirty art faces (MoodIcon), five to a row, each with
   its name in the reader's language — the old tray printed the English
   name in every language.

   MoodTrayFlat is the old tray, all thirty at once (names now localized).
   The composer keeps it for when the "notes" surface is switched off
   remotely: sealing needs a mood, so a fault in the new picker must never
   be able to stop every new page. */
export const MOOD_TRAY_H = 296;

export function MoodTray({ selected, onPick, onClose }: { selected: MoodId | null; onPick: (id: MoodId, close: boolean) => void; onClose: () => void }) {
  useLang();
  const P = useP();
  const { t: tk } = useTheme();
  const [open, setOpen] = useState<MoodGroup | null>(selected ? moodGroup(selected) : null);
  // a mood stored from elsewhere (the dev page, a reset) opens its group
  useEffect(() => {
    if (selected) setOpen(moodGroup(selected));
  }, [selected]);

  const pickGroup = (g: MoodGroup) => {
    if (open === g) {
      onClose();
      return;
    }
    setOpen(g);
    onPick(MOOD_GROUP_IDS[g], false);
  };
  // the chosen face tapped again: back to its group alone
  const pickFace = (g: MoodGroup, id: FaceId) => (selected === id ? onPick(MOOD_GROUP_IDS[g], false) : onPick(id, true));
  // the group the stored mood is in (a face's, or the group alone); none before a choice
  const chosen = selected ? moodGroup(selected) : null;

  return (
    <View style={{ height: MOOD_TRAY_H, backgroundColor: tk.soft, borderTopWidth: 1, borderTopColor: tk.line }}>
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
        {MOOD_GROUPS.map((g) => {
          const c = moodColors(g);
          const on = open === g;
          const name = t(MOOD_GROUP_KEY[g]);
          return (
            <View key={g} style={{ flex: 1 }}>
              {on && <View style={{ position: "absolute", left: 2, top: 2, right: -2, bottom: -2, borderRadius: 16, backgroundColor: tk.ln }} />}
              <Pressable
                onPress={() => pickGroup(g)}
                accessibilityRole="button"
                accessibilityLabel={name}
                accessibilityState={{ selected: chosen === g, expanded: on }}
                style={({ pressed }) => ({
                  height: 72,
                  borderRadius: 16,
                  backgroundColor: c.fill,
                  borderWidth: on ? 2 : 0,
                  borderColor: tk.ln,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  transform: on ? [{ translateX: -1 }, { translateY: -1 }] : pressed ? [{ translateX: 1 }, { translateY: 1 }] : [],
                })}
              >
                <MoodFace group={g} size={26} />
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 13, fontWeight: "600", color: c.ink, paddingHorizontal: 4 }}>
                  {name}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {open ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 6, paddingBottom: 20, flexDirection: "row", flexWrap: "wrap" }} showsVerticalScrollIndicator={false}>
          {MOOD_GROUP_FACES[open].map((id) => {
            const on = selected === id;
            const c = moodColors(open);
            const name = moodName(id);
            return (
              <Pressable
                key={id}
                onPress={() => pickFace(open, id)}
                accessibilityRole="button"
                accessibilityLabel={name}
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({ width: "20%", alignItems: "center", marginBottom: 12, opacity: pressed ? 0.6 : 1 })}
              >
                {/* the face on its group tile (48/r14, face 30); the chosen one wears the
                    blocks' 2pt ink ring */}
                <View style={{ width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.fill, borderWidth: on ? 2 : 0, borderColor: tk.ln }}>
                  <MoodFace group={open} icon={`mood-${id}`} size={30} />
                </View>
                {/* two lines, shrinking a little before cutting: a name like "CON EL CORAZÓN
                    ROTO" or "SELBSTGEFÄLLIG" is wider than the 20% column */}
                <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: PF.monoSemi, fontSize: 9, lineHeight: 11, letterSpacing: 0.6, textAlign: "center", color: on ? c.ink : P.ink60, marginTop: 5, paddingHorizontal: 2 }}>
                  {name.toLocaleUpperCase(localeTag())}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={{ fontSize: 13, lineHeight: 19, color: tk.sub, paddingHorizontal: 20, paddingTop: 8 }}>{t("sc.moodHint")}</Text>
      )}
    </View>
  );
}

/** The old tray: all thirty faces, five to a row (the remote fallback; see above). */
export function MoodTrayFlat({ selected, onPick }: { selected: MoodId | null; onPick: (id: MoodId) => void }) {
  useLang();
  const P = useP();
  const tk = useTheme().t;
  return (
    <View style={{ height: MOOD_TRAY_H, backgroundColor: tk.soft, borderTopWidth: 1, borderTopColor: P.ink12 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 16, paddingBottom: 20, flexDirection: "row", flexWrap: "wrap" }} showsVerticalScrollIndicator={false}>
        {MOOD_IDS.map((id) => {
          const on = selected === id;
          const name = moodName(id);
          return (
            <Pressable key={id} onPress={() => onPick(id)} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: on }} style={({ pressed }) => ({ width: "20%", alignItems: "center", marginBottom: 14, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: moodColors(moodGroup(id)).fill, borderWidth: on ? 2 : 0, borderColor: tk.ln }}>
                <MoodFace group={moodGroup(id)} icon={`mood-${id}`} size={30} />
              </View>
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: PF.monoSemi, fontSize: 9, lineHeight: 11, letterSpacing: 0.6, textAlign: "center", color: on ? moodColors(moodGroup(id)).ink : P.ink60, marginTop: 5, paddingHorizontal: 2 }}>
                {name.toLocaleUpperCase(localeTag())}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* the blank face on the key before a mood is chosen */
export function MoodKeyGlyph({ size = 26, color: given }: { size?: number; color?: string }) {
  const P = useP();
  const color = given ?? P.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Circle cx={9} cy={10} r={0.9} fill={color} stroke="none" />
      <Circle cx={15} cy={10} r={0.9} fill={color} stroke="none" />
      <Path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2" />
    </Svg>
  );
}
